const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|api_?key|cookie|session)/i;

function maskPhone(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (digits.length < 7) return val;
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
}

function maskEmail(val: string): string {
  const [local, domain] = val.split('@');
  if (!domain) return val;
  const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function redactPii(value: unknown, keyName?: string): unknown {
  if (keyName && SENSITIVE_KEY_PATTERN.test(keyName)) {
    return '[REDACTED]';
  }
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (keyName && /phone|mobile/i.test(keyName)) return maskPhone(value);
    if (keyName && /email/i.test(keyName)) return maskEmail(value);
    if (/^Bearer\s+/i.test(value)) return 'Bearer [REDACTED]';
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactPii(item));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactPii(v, k);
    }
    return out;
  }
  return value;
}

export const logger = {
  info(scope: string, message: string, meta?: Record<string, unknown>) {
    console.log(
      JSON.stringify({
        level: 'info',
        ts: new Date().toISOString(),
        scope,
        message,
        ...(meta ? { meta: redactPii(meta) } : {}),
      })
    );
  },
  warn(scope: string, message: string, meta?: Record<string, unknown>) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        ts: new Date().toISOString(),
        scope,
        message,
        ...(meta ? { meta: redactPii(meta) } : {}),
      })
    );
  },
  error(scope: string, message: string, meta?: Record<string, unknown>) {
    console.error(
      JSON.stringify({
        level: 'error',
        ts: new Date().toISOString(),
        scope,
        message,
        ...(meta ? { meta: redactPii(meta) } : {}),
      })
    );
  },
};
