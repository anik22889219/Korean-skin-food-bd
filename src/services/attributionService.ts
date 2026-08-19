/**
 * Attribution & Campaign Tracking Service
 * Captures and persists first-touch and last-touch UTM parameters, Google/Facebook Click IDs,
 * Meta browser identifiers (_fbp, _fbc), and Creator Referral codes.
 */

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  creator_id?: string;
  ref?: string;
  referral_code?: string;
  landing_page?: string;
  referrer?: string;
  captured_at?: string;
}

const STORAGE_KEY_FIRST_TOUCH = 'ksf_attribution_first_touch_v1';
const STORAGE_KEY_LAST_TOUCH = 'ksf_attribution_last_touch_v1';
const STORAGE_KEY_CREATOR = 'ksf_creator_referral_v1';

/**
 * Get cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Set cookie safely
 */
function setCookie(name: string, value: string, days = 90): void {
  if (typeof document === 'undefined') return;
  try {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = '; expires=' + date.toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
  } catch (e) {
    console.warn('[Attribution] Cookie set failed:', e);
  }
}

/**
 * Parse URL parameters and build or retrieve Meta _fbp and _fbc
 */
export function captureAndPersistAttribution(): AttributionData {
  if (typeof window === 'undefined') return {};

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const currentUrl = window.location.href;
    const referrer = document.referrer || '';

    // 1. Capture UTMs and Click IDs from Query Params
    const utm_source = urlParams.get('utm_source') || undefined;
    const utm_medium = urlParams.get('utm_medium') || undefined;
    const utm_campaign = urlParams.get('utm_campaign') || undefined;
    const utm_content = urlParams.get('utm_content') || undefined;
    const utm_term = urlParams.get('utm_term') || undefined;
    const gclid = urlParams.get('gclid') || undefined;
    const fbclid = urlParams.get('fbclid') || undefined;

    // 2. Capture Creator / Referral Parameters
    const creator_id = urlParams.get('creator_id') || urlParams.get('creator') || undefined;
    const ref = urlParams.get('ref') || undefined;
    const referral_code = urlParams.get('referral_code') || urlParams.get('code') || undefined;

    // 3. Handle Meta _fbp (Browser ID)
    let fbp = getCookie('_fbp') || undefined;
    if (!fbp) {
      // Generate standard fallback _fbp format: fb.1.<creation_time>.<random_number>
      const randomId = Math.floor(1000000000 + Math.random() * 9000000000);
      fbp = `fb.1.${Date.now()}.${randomId}`;
      setCookie('_fbp', fbp, 90);
    }

    // 4. Handle Meta _fbc (Click ID)
    let fbc = getCookie('_fbc') || undefined;
    if (fbclid) {
      // Format: fb.1.<creation_time>.<fbclid>
      fbc = `fb.1.${Date.now()}.${fbclid}`;
      setCookie('_fbc', fbc, 90);
    }

    const hasNewAttribution = Boolean(
      utm_source || utm_medium || utm_campaign || utm_content || utm_term ||
      gclid || fbclid || creator_id || ref || referral_code
    );

    const nowIso = new Date().toISOString();

    const currentTouch: AttributionData = {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      gclid,
      fbclid,
      fbp,
      fbc,
      creator_id,
      ref,
      referral_code,
      landing_page: currentUrl,
      referrer,
      captured_at: nowIso
    };

    // Save creator referral independently so it persists through session
    if (creator_id || ref || referral_code) {
      const creatorPayload = {
        creator_id: creator_id || ref || referral_code,
        ref: ref || creator_id,
        referral_code: referral_code || ref,
        updated_at: nowIso
      };
      localStorage.setItem(STORAGE_KEY_CREATOR, JSON.stringify(creatorPayload));
    }

    // First Touch: Set only once if not present
    const existingFirstTouch = localStorage.getItem(STORAGE_KEY_FIRST_TOUCH);
    if (!existingFirstTouch && hasNewAttribution) {
      localStorage.setItem(STORAGE_KEY_FIRST_TOUCH, JSON.stringify(currentTouch));
    }

    // Last Touch: Update whenever new attribution parameters are present
    if (hasNewAttribution) {
      localStorage.setItem(STORAGE_KEY_LAST_TOUCH, JSON.stringify(currentTouch));
    }

    return currentTouch;
  } catch (err) {
    console.warn('[Attribution] Capture error:', err);
    return {};
  }
}

/**
 * Get comprehensive consolidated attribution to attach to order
 */
export function getStoredAttribution(): {
  first_touch?: AttributionData;
  last_touch?: AttributionData;
  creator?: { creator_id?: string; ref?: string; referral_code?: string };
  fbp?: string;
  fbc?: string;
  fbclid?: string;
  gclid?: string;
} {
  try {
    const firstTouchRaw = localStorage.getItem(STORAGE_KEY_FIRST_TOUCH);
    const lastTouchRaw = localStorage.getItem(STORAGE_KEY_LAST_TOUCH);
    const creatorRaw = localStorage.getItem(STORAGE_KEY_CREATOR);

    const first_touch = firstTouchRaw ? JSON.parse(firstTouchRaw) : undefined;
    const last_touch = lastTouchRaw ? JSON.parse(lastTouchRaw) : undefined;
    const creator = creatorRaw ? JSON.parse(creatorRaw) : undefined;

    const fbp = getCookie('_fbp') || last_touch?.fbp || first_touch?.fbp || undefined;
    const fbc = getCookie('_fbc') || last_touch?.fbc || first_touch?.fbc || undefined;
    const fbclid = last_touch?.fbclid || first_touch?.fbclid || undefined;
    const gclid = last_touch?.gclid || first_touch?.gclid || undefined;

    return {
      first_touch,
      last_touch,
      creator,
      fbp,
      fbc,
      fbclid,
      gclid
    };
  } catch {
    return {};
  }
}
