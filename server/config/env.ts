import express from 'express';

const rawSiteUrl = (process.env.SITE_URL || process.env.APP_URL || 'https://koreanskinfood.com')
  .trim()
  .replace(/\/+$/, '');

export const DEFAULT_SITE_URL = /^https?:\/\//i.test(rawSiteUrl) ? rawSiteUrl : `https://${rawSiteUrl}`;
export const LEGACY_SITE_HOSTS = new Set(['koreanskinfood.web.app', 'koreanskinfood.firebaseapp.com']);

export const DEFAULT_FIRST_PARTY_OG_PATH = '/og-banner.jpg';

export function isLocalHostHeader(host: string): boolean {
  const cleanHost = host.split(':')[0].toLowerCase();
  return (
    cleanHost === 'localhost' ||
    cleanHost === '127.0.0.1' ||
    cleanHost === '0.0.0.0' ||
    cleanHost === '::1' ||
    cleanHost === '[::1]'
  );
}

export function resolveRequestOrigin(req?: express.Request): string | null {
  if (!req) return null;
  const rawForwardedHost = req.headers['x-forwarded-host'];
  const hostHeader = (Array.isArray(rawForwardedHost) ? rawForwardedHost[0] : rawForwardedHost) || req.headers.host || '';
  const host = String(hostHeader).split(',')[0].trim();
  if (!host) return null;

  const rawProto = req.headers['x-forwarded-proto'];
  const protoHeader = (Array.isArray(rawProto) ? rawProto[0] : rawProto) || req.protocol || '';
  let proto = String(protoHeader).split(',')[0].trim().toLowerCase();
  if (!proto) {
    proto = isLocalHostHeader(host) ? 'http' : 'https';
  } else if (!isLocalHostHeader(host) && proto === 'http' && !req.headers['x-forwarded-proto']) {
    proto = 'https';
  }
  return `${proto}://${host}`.replace(/\/+$/, '');
}

export function resolveSiteBaseUrl(req?: express.Request): string {
  const rawEnv = (process.env.SITE_URL || process.env.APP_URL || '').trim().replace(/\/+$/, '');
  const envConfigured = rawEnv ? (/^https?:\/\//i.test(rawEnv) ? rawEnv : `https://${rawEnv}`) : '';
  const reqOrigin = resolveRequestOrigin(req);
  if (reqOrigin) {
    try {
      const hostname = new URL(reqOrigin).hostname;
      if (!isLocalHostHeader(hostname)) {
        return reqOrigin;
      }
    } catch {
      // ignore invalid origin header
    }
  }
  return envConfigured || DEFAULT_SITE_URL;
}

export function normalizeConfiguredDomainUrl(configuredUrl: any, req?: express.Request): string {
  const trimmed = typeof configuredUrl === 'string' ? configuredUrl.trim() : '';
  if (!trimmed) return resolveSiteBaseUrl(req);
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (LEGACY_SITE_HOSTS.has(parsed.hostname.toLowerCase())) {
      return resolveSiteBaseUrl(req);
    }
    return parsed.origin.replace(/\/+$/, '');
  } catch {
    return resolveSiteBaseUrl(req);
  }
}

export function isAllowedCorsOrigin(origin?: string): boolean {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'koreanskinfood.com' ||
      host === 'www.koreanskinfood.com' ||
      host.endsWith('.koreanskinfood.com') ||
      host.endsWith('.run.app') ||
      host === 'localhost' ||
      host === '127.0.0.1'
    );
  } catch {
    return false;
  }
}

export function getGeminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ''
  ).trim();
}
