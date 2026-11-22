import express from 'express';

export function normalizeBdPhone(raw: string): string {
  let clean = String(raw || '').replace(/[\s\-()]/g, '');
  if (clean.startsWith('+880')) clean = '0' + clean.slice(4);
  else if (clean.startsWith('880')) clean = '0' + clean.slice(3);
  return clean;
}

export function isValidBdPhone(raw: string): boolean {
  const normalized = normalizeBdPhone(raw);
  return /^(?:\+?88)?01[3-9]\d{8}$/.test(normalized);
}

export function getClientIp(req: express.Request): string {
  const fwd = req.headers['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd;
  return (first ? String(first).split(',')[0].trim() : '') || req.socket.remoteAddress || req.ip || 'unknown';
}

export function escapeXmlString(unsafe: string): string {
  if (!unsafe || typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function stripUndefinedFields<T>(val: T): T {
  if (Array.isArray(val)) {
    return val.map(stripUndefinedFields) as unknown as T;
  }
  if (val !== null && typeof val === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        out[k] = stripUndefinedFields(v);
      }
    }
    return out as T;
  }
  return val;
}

export interface ValidatedImagePayload {
  ext: 'jpg' | 'png' | 'webp' | 'gif';
  mime: string;
  buffer: Buffer;
}

/**
 * Validates base64 image data URLs by inspecting raw file magic bytes rather than trusting extension headers.
 */
export function validateImageBase64MagicBytes(
  dataUrl: string,
  maxBytes: number = 15 * 1024 * 1024
): { ok: true; data: ValidatedImagePayload } | { ok: false; status: number; error: string } {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return { ok: false, status: 400, error: 'Missing image dataUrl string.' };
  }

  const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!matches) {
    return { ok: false, status: 400, error: 'Invalid base64 image data URL format.' };
  }

  const buffer = Buffer.from(matches[2], 'base64');
  if (buffer.length === 0) {
    return { ok: false, status: 400, error: 'Image payload is empty.' };
  }
  if (buffer.length > maxBytes) {
    return { ok: false, status: 413, error: `Image file exceeds ${Math.round(maxBytes / (1024 * 1024))}MB limit.` };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { ok: true, data: { ext: 'png', mime: 'image/png', buffer } };
  }

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ok: true, data: { ext: 'jpg', mime: 'image/jpeg', buffer } };
  }

  // WEBP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ok: true, data: { ext: 'webp', mime: 'image/webp', buffer } };
  }

  // GIF: GIF87a or GIF89a
  if (buffer.length >= 6 && buffer.subarray(0, 3).toString('ascii') === 'GIF') {
    return { ok: true, data: { ext: 'gif', mime: 'image/gif', buffer } };
  }

  return {
    ok: false,
    status: 400,
    error: 'Unsupported image signature. Only genuine PNG, JPEG, WEBP, or GIF images are permitted.',
  };
}
