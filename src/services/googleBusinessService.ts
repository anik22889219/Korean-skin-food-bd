import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
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

  const isConnected =
    base.connectionMethod === 'google_business_oauth' ||
    base.connectionMethod === 'google_places_api' ||
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
    return Boolean(cachedGmbAccessToken);
  },

  getConnectedEmail(): string | null {
    return cachedGmbEmail;
  },

  clearOAuthToken() {
    cachedGmbAccessToken = null;
    cachedGmbEmail = null;
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
    const provider = new GoogleAuthProvider();
    GMB_SCOPES.forEach((scope) => provider.addScope(scope));
    provider.setCustomParameters({
      prompt: 'consent select_account',
      include_granted_scopes: 'true',
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error(
        'Google OAuth access token could not be obtained. Please allow Google Business Profile permissions and try again.'
      );
    }

    cachedGmbAccessToken = accessToken;
    cachedGmbEmail = result.user?.email || null;

    return this.fetchOAuthLocations();
  },

  /**
   * Fetch Google Business Profile accounts & locations using the in-memory OAuth access token.
   */
  async fetchOAuthLocations(): Promise<{
    email: string;
    locations: GoogleBusinessLocationOption[];
    needsApiAccess?: boolean;
    message?: string;
  }> {
    if (!cachedGmbAccessToken) {
      throw new Error('Please connect your Google Business account first.');
    }

    const response = await authFetch('/api/google-business/oauth/locations', {
      method: 'POST',
      headers: {
        'X-Google-Access-Token': cachedGmbAccessToken,
      },
      body: JSON.stringify({
        email: cachedGmbEmail || '',
      }),
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      if (response.status === 401) {
        cachedGmbAccessToken = null;
      }
      const err: any = new Error(json.error || 'Failed to load Google Business Profile locations.');
      err.needsApiAccess = json.needsApiAccess;
      throw err;
    }

    return {
      email: cachedGmbEmail || json.email || '',
      locations: json.locations || [],
      needsApiAccess: json.needsApiAccess,
      message: json.message,
    };
  },

  /**
   * Sync ALL genuine reviews for a specific Google Business Profile location.
   */
  async syncOAuthLocationReviews(location: GoogleBusinessLocationOption): Promise<{
    success: boolean;
    data: GoogleBusinessProfileData;
    message?: string;
  }> {
    if (!cachedGmbAccessToken) {
      throw new Error('Google Business session expired. Please reconnect your Google Business account.');
    }

    const response = await authFetch('/api/google-business/oauth/sync-reviews', {
      method: 'POST',
      headers: {
        'X-Google-Access-Token': cachedGmbAccessToken,
      },
      body: JSON.stringify({
        location,
        connectedEmail: cachedGmbEmail || auth.currentUser?.email || '',
      }),
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      if (response.status === 401) {
        cachedGmbAccessToken = null;
      }
      throw new Error(json.error || 'Failed to sync reviews from Google Business Profile.');
    }

    const clean = sanitizeGoogleBusinessProfile(json.data);
    saveProfileToCache(clean);
    return { success: true, data: clean, message: json.message };
  },

  /**
   * Reply to (or update reply on) a real Google Business review via GMB API.
   */
  async replyToGmbReview(
    reviewName: string,
    replyText: string
  ): Promise<{ success: boolean; data: GoogleBusinessProfileData; message?: string }> {
    if (!cachedGmbAccessToken) {
      throw new Error('Please connect your Google Business account first to post a reply on Google.');
    }

    const response = await authFetch('/api/google-business/oauth/reply', {
      method: 'POST',
      headers: {
        'X-Google-Access-Token': cachedGmbAccessToken,
      },
      body: JSON.stringify({ reviewName, comment: replyText }),
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
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
    if (!cachedGmbAccessToken) {
      throw new Error('Please connect your Google Business account first.');
    }

    const response = await authFetch('/api/google-business/oauth/reply', {
      method: 'DELETE',
      headers: {
        'X-Google-Access-Token': cachedGmbAccessToken,
      },
      body: JSON.stringify({ reviewName }),
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete reply on Google Business Profile.');
    }

    const clean = sanitizeGoogleBusinessProfile(json.data);
    saveProfileToCache(clean);
    return { success: true, data: clean, message: json.message };
  },

  /**
   * Sync real Google reviews via Place ID / business search using server Places API (if configured).
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
    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error || 'Failed to sync reviews via Google Places.');
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
    this.clearCache();

    try {
      const response = await authFetch('/api/google-business/disconnect', {
        method: 'POST',
      });
      if (response.ok) {
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

    return EMPTY_GOOGLE_BUSINESS_DATA;
  },

  /**
   * Fetch current Google Business reviews and profile data.
   * Reads from server API or Firestore directly, strictly stripping any legacy dummy reviews.
   */
  async getProfile(): Promise<GoogleBusinessProfileData> {
    try {
      const response = await fetch('/api/google-business/reviews');
      if (response.ok) {
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
      const snap = await getDoc(doc(db, 'settings', 'google_business_profile'));
      if (snap.exists()) {
        const clean = sanitizeGoogleBusinessProfile(snap.data() as Partial<GoogleBusinessProfileData>);
        saveProfileToCache(clean);
        return clean;
      }
    } catch {
      // ignore
    }

    return this.getProfileData();
  },

  /**
   * Refresh reviews using active connection (Places sync if configured, or OAuth if connected).
   */
  async syncWithMaps(): Promise<{ success: boolean; data: GoogleBusinessProfileData; message?: string }> {
    const current = await this.getProfile();
    if (cachedGmbAccessToken && current.connectedAccountName && current.connectedLocationName) {
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
      });
      const result = await response.json();
      if (result.success && result.data) {
        const clean = sanitizeGoogleBusinessProfile(result.data);
        saveProfileToCache(clean);
        return { success: true, data: clean, message: result.message };
      }
      return {
        success: false,
        data: current,
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
