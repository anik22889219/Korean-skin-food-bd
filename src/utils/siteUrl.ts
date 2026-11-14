export const DEFAULT_SITE_URL = 'https://koreanskinfood.com';
export const DEFAULT_SITE_HOSTNAME = 'koreanskinfood.com';

const LEGACY_DEFAULT_HOSTS = new Set([
  'koreanskinfood.web.app',
  'koreanskinfood.firebaseapp.com',
]);

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

function isLocalHostname(hostname: string): boolean {
  const clean = hostname.toLowerCase();
  return (
    clean === 'localhost' ||
    clean === '127.0.0.1' ||
    clean === '0.0.0.0' ||
    clean === '::1' ||
    clean === '[::1]'
  );
}

/**
 * Returns the active browser origin when running on the client (including localhost in dev),
 * or falls back to VITE_SITE_URL / https://koreanskinfood.com.
 */
export function getRuntimeOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
    return stripTrailingSlashes(window.location.origin);
  }
  const envUrl = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_SITE_URL : '';
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return stripTrailingSlashes(envUrl.trim());
  }
  return DEFAULT_SITE_URL;
}

/**
 * Returns the canonical site URL dynamically for the deployed domain,
 * defaulting to https://koreanskinfood.com when running on localhost or SSR.
 */
export function getSiteUrl(): string {
  const envUrl = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_SITE_URL : '';
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return stripTrailingSlashes(envUrl.trim());
  }

  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
    const hostname = window.location.hostname || '';
    if (hostname && !isLocalHostname(hostname)) {
      return stripTrailingSlashes(window.location.origin);
    }
  }

  return DEFAULT_SITE_URL;
}

/**
 * Returns the active canonical hostname (e.g. koreanskinfood.com or deployed custom host).
 */
export function getSiteHostname(): string {
  try {
    return new URL(getSiteUrl()).hostname || DEFAULT_SITE_HOSTNAME;
  } catch {
    return DEFAULT_SITE_HOSTNAME;
  }
}

/**
 * Normalizes a configured domain URL: if blank or still pointing to the legacy
 * koreanskinfood.web.app default, returns the dynamic site URL (defaulting to https://koreanskinfood.com).
 */
export function resolveConfiguredDomainUrl(configuredUrl?: string | null): string {
  const trimmed = typeof configuredUrl === 'string' ? configuredUrl.trim() : '';
  if (!trimmed) {
    return getSiteUrl();
  }
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (LEGACY_DEFAULT_HOSTS.has(parsed.hostname.toLowerCase())) {
      return getSiteUrl();
    }
    return stripTrailingSlashes(parsed.origin);
  } catch {
    return getSiteUrl();
  }
}
