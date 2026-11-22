import express from 'express';
import { getClientIp } from '../utils/validators';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  prefix?: string;
}) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const clientIp = getClientIp(req);
    const key = `${options.prefix || 'rl'}:${clientIp}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);
    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (record.count >= options.max) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: options.message,
        retryAfter: retryAfterSec,
      });
    }

    record.count++;
    return next();
  };
}

export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many AI requests. Please slow down.',
  prefix: 'ai',
});

export const checkoutRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many checkout attempts. Please wait a minute.',
  prefix: 'checkout',
});

export const publicFormRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: 'Too many submissions. Please wait a moment and try again.',
  prefix: 'form',
});

export const generalApiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 240,
  message: 'Too many API requests. Please slow down.',
  prefix: 'api',
});
