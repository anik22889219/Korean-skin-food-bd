import { initializeApp, getApps } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, firebaseConfig } from './firebase';
import { authFetch } from './apiClient';
import {
  GoogleBusinessLocationOption,
  GoogleBusinessProfileData,
  GoogleBusinessReview,
} from '../types';

export const GMB_SCOPES = ['https://www.googleapis.com/auth/business.manage'];

// Empty baseline — zero dummy reviews
export const EMPTY_GOOGLE_BUSINESS_DATA: GoogleBusinessProfileData = {
  businessName: 'Korean Skin Food BD',
  googleMapsUrl: 'https://share.google/lEQv5trQv88b0w8WT',
  writeReviewUrl: 'https://g.page/r/CaiTn1_7AA34EAE/review',
  shareUrl: 'https://share.google/lEQv5trQv88b0w8WT',
  kgmid: '/g/11zf4cyzwf',
  address: 'Banani Road 11, Dhaka 1213, Bangladesh',
  city: 'Dhaka',
  country: 'Bangladesh',
  phoneNumber: '+880 1755-837545',
  overallRating: 0,
  totalReviewsCount: 0,
  ratingBreakdown: {
    fiveStar: 0,
    fourStar: 0,
    threeStar: 0,
    twoStar: 0,
    oneStar: 0,
  },
  reviews: [],
  lastSyncedAt: '',
  status: 'disconnected',
  connectionMethod: 'none',
};

// Kept as alias for backward compatibility; contains zero dummy reviews
export const VERIFIED_GOOGLE_BUSINESS_DATA = EMPTY_GOOGLE_BUSINESS_DATA;

const CACHE_KEY = 'ksf_google_business_profile_cache_v2';
const LEGACY_CACHE_KEY = 'ksf_google_business_profile_cache';

const LEGACY_DUMMY_REVIEW_IDS = new Set([
  'g-rev-1',
  'g-rev-2',
  'g-rev-3',
  'g-rev-4',
  'g-rev-5',
  'g-rev-6',
]);

const LEGACY_DUMMY_AUTHORS = new Set([
  'Nusrat Jahan Chowdhury',
  'Tanvir Ahmed Shanto',
  'Sadia Rahman Mim',
  'Dr. Farhana Yasmin',
  'Mahmudul Hasan Rifat',
  'Samira Anjum',
]);

export function isRealGoogleReview(review: GoogleBusinessReview): boolean {
  if (!review) return false;
  if (review.source === 'google_business_api' || review.source === 'google_places_api') {
    return true;
  }
  if (LEGACY_DUMMY_REVIEW_IDS.has(review.id) || LEGACY_DUMMY_AUTHORS.has(review.authorName)) {
    return false;
  }
  // Only allow reviews fetched from Google APIs (must have reviewName or explicit Google source)
  return Boolean(review.reviewName);
}

export function sanitizeGoogleBusinessProfile(
  raw: Partial<GoogleBusinessProfileData> | null | undefined
): GoogleBusinessProfileData {
  const base: GoogleBusinessProfileData = {
    ...EMPTY_GOOGLE_BUSINESS_DATA,
    ...(raw || {}),
    ratingBreakdown: {
      ...EMPTY_GOOGLE_BUSINESS_DATA.ratingBreakdown,
      ...(raw?.ratingBreakdown || {}),
    },
  };

  const realReviews = Array.isArray(raw?.reviews)
    ? raw!.reviews.filter(isRealGoogleReview)
    : [];

  const hasValidPlacesSync =
    base.connectionMethod === 'google_places_api' &&
    (realReviews.length > 0 || (typeof base.placeId === 'string' && base.placeId.startsWith('ChIJ')));

  const isConnected =
    base.connectionMethod === 'google_business_oauth' ||
    hasValidPlacesSync ||
    realReviews.length > 0;

  if (!isConnected) {
    return {
      ...base,
      reviews: [],
      overallRating: 0,
      totalReviewsCount: 0,
      ratingBreakdown: {
        fiveStar: 0,
        fourStar: 0,
        threeStar: 0,
        twoStar: 0,
        oneStar: 0,
      },
      status: 'disconnected',
      connectionMethod: 'none',
    };
  }

  return {
    ...base,
    reviews: realReviews,
  };
}

// In-memory cache ONLY for Google Business OAuth access token (never localStorage/sessionStorage)
let cachedGmbAccessToken: string | null = null;
let cachedGmbEmail: string | null = null;
let serverHasActiveSession = false;
let serverHasOAuthCredentials = false;

function getIsolatedGmbAuth() {
  const helperName = 'gmb-oauth-helper';
  const existing = getApps().find((a) => a.name === helperName);
  const helperApp = existing || initializeApp(firebaseConfig, helperName);
  return getAuth(helperApp);
}

function buildGoogleHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (cachedGmbAccessToken) {
    headers['X-Google-Access-Token'] = cachedGmbAccessToken;
  }
  return headers;
}

function formatGmbPopupError(err: any): Error {
  const code = err?.code || '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return new Error('Google sign-in popup was closed before completing authorization.');
  }
  if (code === 'auth/popup-blocked') {
    return new Error('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
  }
  if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
    return new Error(
      `This domain (${host}) is not listed under Firebase Authentication → Settings → Authorized domains. Please add it in Firebase Console or connect from an authorized domain.`
    );
  }
  return err instanceof Error ? err : new Error(err?.message || 'Google Business OAuth authorization failed.');
}

async function openServerOAuthPopup(authUrl: string): Promise<{ accessToken?: string; email?: string }> {
  return new Promise((resolve, reject) => {
    const width = 520;
    const height = 640;
    const left = Math.max(0, (window.screen?.width || 1024) / 2 - width / 2);
    const top = Math.max(0, (window.screen?.height || 768) / 2 - height / 2);
    const popup = window.open(
      authUrl,
      'gmb_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      reject(new Error('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.'));
      return;
    }

    let settled = false;
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearInterval(closedTimer);
      clearTimeout(timeoutTimer);
    };

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'GMB_OAUTH_SUCCESS' || data.type === 'GOOGLE_BUSINESS_OAUTH_SUCCESS') {
        settled = true;
        cleanup();
        resolve({ accessToken: data.accessToken, email: data.email });
      } else if (data.type === 'GMB_OAUTH_ERROR' || data.type === 'GOOGLE_BUSINESS_OAUTH_ERROR') {
        settled = true;
        cleanup();
        reject(new Error(data.error || 'Google Business authorization failed.'));
      }
    };

    const closedTimer = window.setInterval(() => {
      if (popup.closed && !settled) {
        settled = true;
        cleanup();
        reject(new Error('Google sign-in popup was closed before completing authorization.'));
      }
    }, 500);

    const timeoutTimer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        try {
          popup.close();
        } catch {
          // ignore
        }
        reject(new Error('Google Business authorization timed out. Please try again.'));
      }
    }, 3 * 60 * 1000);

    window.addEventListener('message', onMessage);
  });
}

if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(LEGACY_CACHE_KEY);
  } catch {
    // ignore
  }
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedGmbAccessToken = null;
      cachedGmbEmail = null;
      serverHasActiveSession = false;
    }
  });
}

function saveProfileToCache(data: GoogleBusinessProfileData) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    }
  } catch {
    // ignore
  }
}

export const googleBusinessService = {
  hasOAuthToken(): boolean {
    return Boolean(cachedGmbAccessToken || serverHasActiveSession);
  },

  getConnectedEmail(): string | null {
    return cachedGmbEmail;
  },

  setOAuthAccessToken(token: string, email?: string | null) {
    cachedGmbAccessToken = token;
    if (email) cachedGmbEmail = email;
    if (token) serverHasActiveSession = true;
  },

  clearOAuthToken() {
    cachedGmbAccessToken = null;
    cachedGmbEmail = null;
    serverHasActiveSession = false;
  },

  /**
   * Check whether the backend has an active GMB OAuth session or server OAuth client credentials.
   * Gracefully falls back for static hosting deployments where /api/* returns HTML.
   */
  async checkOAuthSession(): Promise<{
    hasActiveSession: boolean;
    connectedEmail: string | null;
    hasServerOAuthCredentials: boolean;
  }> {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const qs = origin ? `?origin=${encodeURIComponent(origin)}` : '';
      const response = await authFetch(`/api/google-business/oauth/status${qs}`);
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && !contentType.includes('text/html')) {
        const json = await response.json();
        if (json.success) {
          serverHasActiveSession = Boolean(json.hasActiveSession);
          serverHasOAuthCredentials = Boolean(json.hasServerOAuthCredentials);
          if (json.connectedEmail && !cachedGmbEmail) {
            cachedGmbEmail = json.connectedEmail;
          }
          return {
            hasActiveSession: Boolean(cachedGmbAccessToken || serverHasActiveSession),
            connectedEmail: cachedGmbEmail || json.connectedEmail || null,
            hasServerOAuthCredentials: serverHasOAuthCredentials,
          };
        }
      }
    } catch {
      // Static hosting or offline fallback
    }

    return {
      hasActiveSession: Boolean(cachedGmbAccessToken || serverHasActiveSession),
      connectedEmail: cachedGmbEmail,
      hasServerOAuthCredentials: false,
    };
  },

  /**
   * Obtain a fresh Google Business OAuth access token via server OAuth flow (if configured)
   * or isolated Firebase GoogleAuthProvider popup, then persist to backend session cache if available.
   */
  async obtainOAuthToken(): Promise<{ accessToken: string; email: string }> {
    let accessToken = '';
    let email = '';

    // 1. If server OAuth client credentials are configured, try server-side OAuth popup first
    if (serverHasOAuthCredentials && typeof window !== 'undefined') {
      try {
        const origin = window.location.origin;
        const res = await authFetch(`/api/google-business/oauth/auth-url?origin=${encodeURIComponent(origin)}`);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && !contentType.includes('text/html')) {
          const json = await res.json();
          if (json.success && json.url) {
            const popupRes = await openServerOAuthPopup(json.url);
            if (popupRes.accessToken) {
              accessToken = popupRes.accessToken;
              email = popupRes.email || '';
            }
          }
        }
      } catch (err: any) {
        // Re-throw if the user explicitly closed/cancelled or blocked the popup
        const msg = err?.message || '';
        if (msg.includes('closed') || msg.includes('blocked')) {
          throw err;
        }
        // Otherwise fall back to Firebase popup
      }
    }

    // 2. Firebase GoogleAuthProvider popup using isolated auth instance so admin session isn't overwritten
    if (!accessToken) {
      const provider = new GoogleAuthProvider();
      GMB_SCOPES.forEach((scope) => provider.addScope(scope));
      provider.setCustomParameters({
        prompt: 'consent select_account',
        include_granted_scopes: 'true',
      });

      try {
        const helperAuth = getIsolatedGmbAuth();
        const result = await signInWithPopup(helperAuth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        accessToken =
          credential?.accessToken ||
          (result as any)?._tokenResponse?.oauthAccessToken ||
          '';
        email = result.user?.email || (result as any)?._tokenResponse?.email || '';
      } catch (err: any) {
        throw formatGmbPopupError(err);
      }
    }

    if (!accessToken) {
      throw new Error(
        'Google OAuth access token could not be obtained. Please allow Google Business Profile permissions and try again.'
      );
    }

    cachedGmbAccessToken = accessToken;
    cachedGmbEmail = email || cachedGmbEmail;
    serverHasActiveSession = true;

    // Best-effort sync to backend session cache (non-blocking on static hosting)
    try {
      await authFetch('/api/google-business/oauth/session', {
        method: 'POST',
        headers: {
          'X-Google-Access-Token': accessToken,
        },
        body: JSON.stringify({
          email: cachedGmbEmail || '',
          googleAccessToken: accessToken,
        }),
      });
    } catch {
      // Safe to ignore on static hosting
    }

    return {
      accessToken,
      email: cachedGmbEmail || '',
    };
  },

  /**
   * Synchronous getter for immediate state initialization (strictly sanitized, no dummy data)
   */
  getProfileData(): GoogleBusinessProfileData {
    try {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          return sanitizeGoogleBusinessProfile(JSON.parse(cached));
        }
      }
    } catch {
      // ignore
    }
    return EMPTY_GOOGLE_BUSINESS_DATA;
  },

  /**
   * Connect admin's Google Business Profile via Google OAuth popup (in-memory token only)
   * and discover their GMB accounts & locations.
   */
  async connectWithGoogleOAuth(): Promise<{
    email: string;
    locations: GoogleBusinessLocationOption[];
    needsApiAccess?: boolean;
    message?: string;
  }> {
    await this.obtainOAuthToken();
    return this.fetchOAuthLocations();
  },

  /**
   * Fetch Google Business Profile accounts & locations using the active OAuth access token.
   */
  async fetchOAuthLocations(): Promise<{
    email: string;
    locations: GoogleBusinessLocationOption[];
    needsApiAccess?: boolean;
    message?: string;
  }> {
    if (!cachedGmbAccessToken && !serverHasActiveSession) {
      throw new Error('Please connect your Google Business account first.');
    }

    try {
      const response = await authFetch('/api/google-business/oauth/locations', {
        method: 'POST',
        headers: buildGoogleHeaders(),
        body: JSON.stringify({
          email: cachedGmbEmail || '',
          googleAccessToken: cachedGmbAccessToken || undefined,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        const json = await response.json().catch(() => ({}));
        if (response.ok && json.success) {
          return {
            email: cachedGmbEmail || json.email || '',
            locations: json.locations || [],
            needsApiAccess: json.needsApiAccess,
            message: json.message,
          };
        }
        if (response.status === 401) {
          serverHasActiveSession = false;
          if (!cachedGmbAccessToken) {
            throw new Error(json.error || 'Google Business session expired. Please reconnect your Google Business account.');
          }
        }
        if (json.needsApiAccess) {
          const err: any = new Error(json.error || 'Google Business Profile API access is pending.');
          err.needsApiAccess = true;
          throw err;
        }
      }
    } catch (err: any) {
      if (err?.needsApiAccess) throw err;
      if (!cachedGmbAccessToken) throw err;
      // Proceed to direct browser API call when backend is unavailable or static-hosted
    }

    if (!cachedGmbAccessToken) {
      throw new Error('Missing Google Business OAuth access token. Please connect your Google Business account.');
    }

    // Direct Google Business Profile API lookup from browser
    try {
      const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${cachedGmbAccessToken}` },
      });
      const accountsJson = await accountsRes.json().catch(() => ({}));

      if (!accountsRes.ok) {
        const apiMsg = accountsJson?.error?.message || `Google API returned HTTP ${accountsRes.status}`;
        const isApiDisabledOrQuota =
          accountsRes.status === 403 ||
          accountsRes.status === 429 ||
          apiMsg.toLowerCase().includes('not been used') ||
          apiMsg.toLowerCase().includes('disabled') ||
          apiMsg.toLowerCase().includes('quota');
        const err: any = new Error(
          isApiDisabledOrQuota
            ? `Google Business API quota temporarily exceeded. Auto-syncing via Place ID instead...`
            : apiMsg
        );
        err.needsApiAccess = isApiDisabledOrQuota;
        throw err;
      }

      const accounts = Array.isArray(accountsJson.accounts) ? accountsJson.accounts : [];
      const locations: GoogleBusinessLocationOption[] = [];
      for (const acc of accounts) {
        const locRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storefrontAddress,metadata,phoneNumbers&pageSize=100`,
          { headers: { Authorization: `Bearer ${cachedGmbAccessToken}` } }
        );
        if (!locRes.ok) continue;
        const locJson = await locRes.json().catch(() => ({}));
        const locs = Array.isArray(locJson.locations) ? locJson.locations : [];
        for (const loc of locs) {
          locations.push({
            accountName: acc.name,
            accountDisplayName: acc.accountName || acc.name,
            locationName: loc.name,
            title: loc.title || acc.accountName || 'Korean Skin Food BD',
            address: loc.storefrontAddress?.addressLines?.join(', ') || '',
            placeId: loc.metadata?.placeId || '',
            mapsUri: loc.metadata?.mapsUri || '',
            newReviewUri: loc.metadata?.newReviewUri || '',
            phoneNumber: loc.phoneNumbers?.primaryPhone || '',
          });
        }
      }

      return {
        email: cachedGmbEmail || '',
        locations,
        message: locations.length > 0 ? `Found ${locations.length} Google Business Profile location(s).` : 'No verified locations found.',
      };
    } catch (err: any) {
      if (err?.needsApiAccess) throw err;
      throw err instanceof Error
        ? err
        : new Error('Unable to fetch Google Business Profile locations. Please check your permissions and try again.');
    }
  },

  /**
   * Sync ALL genuine reviews for a specific Google Business Profile location.
   */
  async syncOAuthLocationReviews(location: GoogleBusinessLocationOption): Promise<{
    success: boolean;
    data: GoogleBusinessProfileData;
    message?: string;
  }> {
    if (!cachedGmbAccessToken && !serverHasActiveSession) {
      throw new Error('Google Business session expired. Please reconnect your Google Business account.');
    }

    let serverUnavailable = false;
    try {
      const response = await authFetch('/api/google-business/oauth/sync-reviews', {
        method: 'POST',
        headers: buildGoogleHeaders(),
        body: JSON.stringify({
          location,
          connectedEmail: cachedGmbEmail || auth.currentUser?.email || '',
          googleAccessToken: cachedGmbAccessToken || undefined,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        serverUnavailable = true;
      } else {
        const json = await response.json().catch(() => ({}));
        if (response.ok && json.success && json.data) {
          const clean = sanitizeGoogleBusinessProfile(json.data);
          saveProfileToCache(clean);
          return { success: true, data: clean, message: json.message };
        }
        if (response.status === 401) {
          serverHasActiveSession = false;
          throw new Error(json.error || 'Google Business OAuth session expired. Please reconnect your Google Business account.');
        }
        const errMsg = json.error || `Failed to sync reviews from Google Business Profile (HTTP ${response.status}).`;
        const err: any = new Error(errMsg);
        if (
          json.needsApiAccess ||
          response.status === 403 ||
          response.status === 429 ||
          errMsg.toLowerCase().includes('quota') ||
          errMsg.toLowerCase().includes('disabled')
        ) {
          err.needsApiAccess = true;
        }
        throw err;
      }
    } catch (err: any) {
      if (!serverUnavailable && err instanceof Error && !err.message.includes('Failed to fetch')) {
        throw err;
      }
      // Network error or static hosting (HTML response) — proceed to direct browser GMB v4 fetch
    }

    if (!cachedGmbAccessToken) {
      throw new Error('Missing Google Business OAuth access token. Please reconnect your Google Business account.');
    }

    // Direct browser GMB v4 Reviews API fetch (for static hosting like Firebase Hosting)
    const cleanAccount = String(location.accountName || '').replace(/^\/+/, '');
    const cleanLocation = String(location.locationName || '').replace(/^\/+/, '');
    const parentPath = cleanLocation.startsWith('accounts/')
      ? cleanLocation
      : `${cleanAccount}/${cleanLocation}`;

    const allReviews: GoogleBusinessReview[] = [];
    let pageToken: string | undefined;
    let averageRating = 0;
    let totalReviewCount = 0;

    for (let page = 0; page < 10; page++) {
      const qs = new URLSearchParams({ pageSize: '50' });
      if (pageToken) qs.set('pageToken', pageToken);
      const reviewsRes = await fetch(
        `https://mybusiness.googleapis.com/v4/${parentPath}/reviews?${qs.toString()}`,
        { headers: { Authorization: `Bearer ${cachedGmbAccessToken}` } }
      );
      const reviewsJson = await reviewsRes.json().catch(() => ({}));

      if (!reviewsRes.ok) {
        const apiMsg = reviewsJson?.error?.message || `Google Reviews API returned HTTP ${reviewsRes.status}`;
        const err: any = new Error(apiMsg);
        if (
          reviewsRes.status === 403 ||
          reviewsRes.status === 429 ||
          apiMsg.toLowerCase().includes('quota') ||
          apiMsg.toLowerCase().includes('disabled') ||
          apiMsg.toLowerCase().includes('not been used')
        ) {
          err.needsApiAccess = true;
        }
        throw err;
      }

      if (typeof reviewsJson.averageRating === 'number') {
        averageRating = reviewsJson.averageRating;
      }
      if (typeof reviewsJson.totalReviewCount === 'number') {
        totalReviewCount = reviewsJson.totalReviewCount;
      }

      const items = Array.isArray(reviewsJson.reviews) ? reviewsJson.reviews : [];
      for (const item of items) {
        const starUpper = String(item.starRating || '').toUpperCase();
        const rating =
          typeof item.starRating === 'number'
            ? Math.min(5, Math.max(1, item.starRating))
            : starUpper === 'FIVE'
              ? 5
              : starUpper === 'FOUR'
                ? 4
                : starUpper === 'THREE'
                  ? 3
                  : starUpper === 'TWO'
                    ? 2
                    : starUpper === 'ONE'
                      ? 1
                      : 5;
        const publishTime = item.createTime || item.updateTime || new Date().toISOString();
        allReviews.push({
          id: item.reviewId || item.name || `gmb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          reviewName: item.name || '',
          source: 'google_business_api',
          authorName: item.reviewer?.displayName || 'Google Customer',
          authorPhotoUrl: item.reviewer?.profilePhotoUrl || '',
          rating,
          relativeTimeDescription: new Date(publishTime).toLocaleDateString(),
          publishTime,
          updateTime: item.updateTime || publishTime,
          isVerifiedCustomer: true,
          isLocalGuide: false,
          text: item.comment || '',
          reply: item.reviewReply?.comment
            ? {
                text: item.reviewReply.comment,
                replyDate: item.reviewReply.updateTime
                  ? new Date(item.reviewReply.updateTime).toLocaleDateString()
                  : 'Recently',
              }
            : undefined,
        });
      }

      if (!reviewsJson.nextPageToken) break;
      pageToken = reviewsJson.nextPageToken;
    }

    const breakdown = {
      fiveStar: allReviews.filter((r) => Math.round(r.rating) === 5).length,
      fourStar: allReviews.filter((r) => Math.round(r.rating) === 4).length,
      threeStar: allReviews.filter((r) => Math.round(r.rating) === 3).length,
      twoStar: allReviews.filter((r) => Math.round(r.rating) === 2).length,
      oneStar: allReviews.filter((r) => Math.round(r.rating) === 1).length,
    };

    const computedAvg =
      averageRating > 0
        ? Number(averageRating.toFixed(1))
        : allReviews.length > 0
          ? Number((allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1))
          : 0;

    const current = this.getProfileData();
    const updated: GoogleBusinessProfileData = {
      ...current,
      businessName: location.title || current.businessName,
      address: location.address || current.address,
      placeId: location.placeId || current.placeId,
      googleMapsUrl: location.mapsUri || current.googleMapsUrl,
      writeReviewUrl: location.newReviewUri || current.writeReviewUrl,
      phoneNumber: location.phoneNumber || current.phoneNumber,
      overallRating: computedAvg,
      totalReviewsCount: totalReviewCount || allReviews.length,
      ratingBreakdown: breakdown,
      reviews: allReviews,
      connectedAccountName: cleanAccount,
      connectedLocationName: cleanLocation,
      connectedEmail: cachedGmbEmail || current.connectedEmail || '',
      status: 'verified',
      connectionMethod: 'google_business_oauth',
      lastSyncedAt: new Date().toISOString(),
    };

    if (db) {
      try {
        await setDoc(doc(db, 'settings', 'google_business_profile'), updated, { merge: true });
      } catch (e) {
        console.warn('[GoogleBusinessService] Could not write to settings/google_business_profile:', e);
      }
    }

    const clean = sanitizeGoogleBusinessProfile(updated);
    saveProfileToCache(clean);
    return {
      success: true,
      data: clean,
      message: `Synced ${allReviews.length} genuine review(s) from ${location.title}!`,
    };
  },

  /**
   * Reply to (or update reply on) a real Google Business review via GMB API.
   */
  async replyToGmbReview(
    reviewName: string,
    replyText: string
  ): Promise<{ success: boolean; data: GoogleBusinessProfileData; message?: string }> {
    if (!cachedGmbAccessToken && !serverHasActiveSession) {
      throw new Error('Please connect your Google Business account first to post a reply on Google.');
    }

    const response = await authFetch('/api/google-business/oauth/reply', {
      method: 'POST',
      headers: buildGoogleHeaders(),
      body: JSON.stringify({
        reviewName,
        comment: replyText,
        googleAccessToken: cachedGmbAccessToken || undefined,
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error('Google Business reply API is unavailable on static hosting.');
    }

    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.success) {
      if (response.status === 401) {
        serverHasActiveSession = false;
      }
      throw new Error(json.error || 'Failed to post reply to Google Business Profile.');
    }

    const clean = sanitizeGoogleBusinessProfile(json.data);
    saveProfileToCache(clean);
    return { success: true, data: clean, message: json.message };
  },

  /**
   * Delete an owner reply from a real Google Business review via GMB API.
   */
  async deleteGmbReply(
    reviewName: string
  ): Promise<{ success: boolean; data: GoogleBusinessProfileData; message?: string }> {
    if (!cachedGmbAccessToken && !serverHasActiveSession) {
      throw new Error('Please connect your Google Business account first.');
    }

    const response = await authFetch('/api/google-business/oauth/reply', {
      method: 'DELETE',
      headers: buildGoogleHeaders(),
      body: JSON.stringify({
        reviewName,
        googleAccessToken: cachedGmbAccessToken || undefined,
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error('Google Business reply API is unavailable on static hosting.');
    }

    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.success) {
      if (response.status === 401) {
        serverHasActiveSession = false;
      }
      throw new Error(json.error || 'Failed to delete reply on Google Business Profile.');
    }

    const clean = sanitizeGoogleBusinessProfile(json.data);
    saveProfileToCache(clean);
    return { success: true, data: clean, message: json.message };
  },

  /**
   * Sync real Google reviews via Place ID / business search using server Places API (if configured)
   * with seamless client-side Places fallback.
   */
  async syncByPlaceIdOrSearch(queryOrPlaceId: string): Promise<{
    success: boolean;
    data: GoogleBusinessProfileData;
    message?: string;
  }> {
    const response = await authFetch('/api/google-business/places/sync', {
      method: 'POST',
      body: JSON.stringify({ queryOrPlaceId }),
    });
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error(
        'Google Places sync server endpoint is unavailable on static hosting. Please connect from the Node server or enable Places API (New) on your server.'
      );
    }

    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.success || !json.data) {
      throw new Error(json.error || `Google Places API sync failed (HTTP ${response.status}).`);
    }

    const clean = sanitizeGoogleBusinessProfile(json.data);
    saveProfileToCache(clean);
    return { success: true, data: clean, message: json.message };
  },

  /**
   * Disconnect Google Business Profile and remove all stored reviews.
   */
  async disconnectAndClearReviews(): Promise<GoogleBusinessProfileData> {
    cachedGmbAccessToken = null;
    cachedGmbEmail = null;
    serverHasActiveSession = false;
    this.clearCache();

    try {
      const response = await authFetch('/api/google-business/disconnect', {
        method: 'POST',
      });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && !contentType.includes('text/html')) {
        const json = await response.json();
        if (json.data) {
          const clean = sanitizeGoogleBusinessProfile(json.data);
          saveProfileToCache(clean);
          return clean;
        }
      }
    } catch (err) {
      console.warn('[GoogleBusinessService] Disconnect error:', err);
    }

    if (db) {
      try {
        await setDoc(doc(db, 'settings', 'google_business_profile'), EMPTY_GOOGLE_BUSINESS_DATA, { merge: true });
      } catch {}
    }

    return EMPTY_GOOGLE_BUSINESS_DATA;
  },

  /**
   * Fetch current Google Business reviews and profile data.
   * Reads from server API or Firestore directly, strictly stripping any legacy dummy reviews.
   */
  async getProfile(): Promise<GoogleBusinessProfileData> {
    try {
      const response = await fetch('/api/google-business/reviews');
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && !contentType.includes('text/html')) {
        const json = await response.json();
        if (json.success && json.data) {
          const clean = sanitizeGoogleBusinessProfile(json.data);
          saveProfileToCache(clean);
          return clean;
        }
      }
    } catch (err) {
      console.warn('[GoogleBusinessService] Server fetch failed, checking Firestore:', err);
    }

    try {
      if (db) {
        const snap = await getDoc(doc(db, 'settings', 'google_business_profile'));
        if (snap.exists()) {
          const clean = sanitizeGoogleBusinessProfile(snap.data() as Partial<GoogleBusinessProfileData>);
          saveProfileToCache(clean);
          return clean;
        }
      }
    } catch {
      // ignore
    }

    return this.getProfileData();
  },

  /**
   * Refresh reviews using active connection (Places sync if configured, or OAuth if connected).
   */
  async syncWithMaps(): Promise<{
    success: boolean;
    data: GoogleBusinessProfileData;
    message?: string;
    needsReconnect?: boolean;
  }> {
    const current = await this.getProfile();
    if ((cachedGmbAccessToken || serverHasActiveSession) && current.connectedAccountName && current.connectedLocationName) {
      return this.syncOAuthLocationReviews({
        accountName: current.connectedAccountName,
        accountDisplayName: current.businessName,
        locationName: current.connectedLocationName,
        title: current.businessName,
        address: current.address,
        placeId: current.placeId,
        mapsUri: current.googleMapsUrl,
        newReviewUri: current.writeReviewUrl,
        phoneNumber: current.phoneNumber,
      });
    }

    try {
      const response = await authFetch('/api/google-business/sync', {
        method: 'POST',
        headers: buildGoogleHeaders(),
        body: JSON.stringify({
          googleAccessToken: cachedGmbAccessToken || undefined,
        }),
      });
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        if (current.placeId) {
          return this.syncByPlaceIdOrSearch(current.placeId);
        }
        return {
          success: false,
          needsReconnect: true,
          data: current,
          message: 'Please connect your Google Business Profile to sync live reviews.',
        };
      }
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.success && result.data) {
        const clean = sanitizeGoogleBusinessProfile(result.data);
        saveProfileToCache(clean);
        return { success: true, data: clean, message: result.message };
      }
      return {
        success: false,
        needsReconnect: Boolean(result.needsReconnect),
        data: result.data ? sanitizeGoogleBusinessProfile(result.data) : current,
        message: result.error || result.message || 'Please connect your Google Business Profile to sync live reviews.',
      };
    } catch (err: any) {
      return {
        success: false,
        data: current,
        message: err?.message || 'Unable to sync. Please connect your Google Business Profile.',
      };
    }
  },

  clearCache() {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(LEGACY_CACHE_KEY);
    } catch {
      // ignore
    }
  },
};
