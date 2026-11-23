const STRIP_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'msclkid',
  'ref',
  'source',
]);

/**
 * Normalizes any URL or path string into a clean relative path + sorted query string
 * (e.g. "https://koreanskinfood.com/brand/cosrx/" -> "/brand/cosrx", "" -> "/").
 */
export function normalizeSeoPath(rawInput?: string | null): string {
  const trimmed = (rawInput || '').trim();
  if (!trimmed || trimmed === '/') return '/';

  try {
    const dummyBase = 'https://koreanskinfood.com';
    const full = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `${dummyBase}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    const parsed = new URL(full);

    STRIP_QUERY_PARAMS.forEach((param) => parsed.searchParams.delete(param));

    let cleanPath = parsed.pathname || '/';
    cleanPath = cleanPath.replace(/\/{2,}/g, '/');
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }

    // Sort query params deterministically
    const entries = Array.from(parsed.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
    const search = new URLSearchParams(entries).toString();
    return search ? `${cleanPath}?${search}` : cleanPath;
  } catch {
    const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : '/';
  }
}

/**
 * Generates a deterministic, Firestore-safe document ID (matching ^[a-zA-Z0-9_\-]+$)
 * from any normalized SEO path, usable identically on both client and server.
 */
export function encodeSeoPageDocId(rawPath: string): string {
  const normalized = normalizeSeoPath(rawPath);
  if (normalized === '/') return 'page_root';

  // FNV-1a 32-bit hash for collision-free uniqueness across query strings & slashes
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hexHash = (hash >>> 0).toString(16).padStart(8, '0');

  const readable = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);

  return `page_${readable || 'route'}_${hexHash}`;
}
