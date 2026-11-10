import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from './firebase';

export interface TrackingSettings {
  gtm: {
    enabled: boolean;
    containerId: string;
  };
  ga4: {
    enabled: boolean;
    measurementId: string;
  };
  metaPixel: {
    enabled: boolean;
    pixelId: string;
  };
  metaCapi: {
    enabled: boolean;
    accessToken?: string;
    testEventCode?: string;
  };
  customScripts?: {
    headerScript?: string;
    bodyScript?: string;
  };
  updatedAt?: string;
  updatedBy?: string;
}

const SETTINGS_STORAGE_KEY = 'ksf_tracking_settings_cache_v2';

export const DEFAULT_TRACKING_SETTINGS: TrackingSettings = {
  gtm: {
    enabled: true,
    containerId: 'GTM-T2SWSLZ8',
  },
  ga4: {
    enabled: true,
    measurementId: 'G-8DXKFYM3YQ',
  },
  metaPixel: {
    enabled: true,
    pixelId: '1181966473667367',
  },
  metaCapi: {
    enabled: true,
    accessToken: '',
    testEventCode: '',
  },
  customScripts: {
    headerScript: '',
    bodyScript: '',
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'system_default',
};

// Format Validators
export function validateGtmId(id: string): { isValid: boolean; message?: string } {
  const trimmed = id.trim().toUpperCase();
  if (!trimmed) {
    return { isValid: false, message: 'GTM Container ID is required' };
  }
  if (!/^GTM-[A-Z0-9]{5,12}$/.test(trimmed)) {
    return { isValid: false, message: 'Invalid format. Expected format: GTM-XXXXXXX' };
  }
  return { isValid: true };
}

export function validateGa4Id(id: string): { isValid: boolean; message?: string } {
  const trimmed = id.trim().toUpperCase();
  if (!trimmed) {
    return { isValid: false, message: 'GA4 Measurement ID is required' };
  }
  if (!/^G-[A-Z0-9]{6,14}$/.test(trimmed)) {
    return { isValid: false, message: 'Invalid format. Expected format: G-XXXXXXXXXX' };
  }
  return { isValid: true };
}

export function validatePixelId(id: string): { isValid: boolean; message?: string } {
  const trimmed = id.trim();
  if (!trimmed) {
    return { isValid: false, message: 'Meta Pixel ID is required' };
  }
  if (!/^\d{12,20}$/.test(trimmed)) {
    return { isValid: false, message: 'Invalid format. Pixel ID must be 12-20 numeric digits' };
  }
  return { isValid: true };
}

class TrackingSettingsService {
  private currentSettings: TrackingSettings = { ...DEFAULT_TRACKING_SETTINGS };
  private listeners: Set<(settings: TrackingSettings) => void> = new Set();
  private isSubscribed = false;
  private unsubscribeFirestore: (() => void) | null = null;

  constructor() {
    this.loadFromLocalStorage();
    this.initFirestoreListener();
  }

  private loadFromLocalStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.currentSettings = this.mergeWithDefaults(parsed);
      }
    } catch {
      // ignore
    }
  }

  private saveToLocalStorage(settings: TrackingSettings) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }

  private mergeWithDefaults(incoming: Partial<TrackingSettings>): TrackingSettings {
    return {
      gtm: {
        enabled: incoming.gtm?.enabled ?? DEFAULT_TRACKING_SETTINGS.gtm.enabled,
        containerId: (incoming.gtm?.containerId || DEFAULT_TRACKING_SETTINGS.gtm.containerId).trim().toUpperCase(),
      },
      ga4: {
        enabled: incoming.ga4?.enabled ?? DEFAULT_TRACKING_SETTINGS.ga4.enabled,
        measurementId: (incoming.ga4?.measurementId || DEFAULT_TRACKING_SETTINGS.ga4.measurementId).trim().toUpperCase(),
      },
      metaPixel: {
        enabled: incoming.metaPixel?.enabled ?? DEFAULT_TRACKING_SETTINGS.metaPixel.enabled,
        pixelId: (incoming.metaPixel?.pixelId || DEFAULT_TRACKING_SETTINGS.metaPixel.pixelId).trim(),
      },
      metaCapi: {
        enabled: incoming.metaCapi?.enabled ?? DEFAULT_TRACKING_SETTINGS.metaCapi.enabled,
        accessToken: incoming.metaCapi?.accessToken?.trim() || '',
        testEventCode: incoming.metaCapi?.testEventCode?.trim().toUpperCase() || '',
      },
      customScripts: {
        headerScript: incoming.customScripts?.headerScript || '',
        bodyScript: incoming.customScripts?.bodyScript || '',
      },
      updatedAt: incoming.updatedAt || new Date().toISOString(),
      updatedBy: incoming.updatedBy || 'admin',
    };
  }

  public initFirestoreListener() {
    if (typeof window === 'undefined' || this.isSubscribed) return;
    this.isSubscribed = true;

    try {
      const docRef = doc(db, 'settings', 'tracking');
      this.unsubscribeFirestore = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const merged = this.mergeWithDefaults(data as Partial<TrackingSettings>);
            this.currentSettings = merged;
            this.saveToLocalStorage(merged);
            this.notifyListeners();
          } else {
            // First time seeding if document does not exist
            this.saveSettings(DEFAULT_TRACKING_SETTINGS).catch(() => {});
          }
        },
        (error) => {
          console.warn('[TrackingSettingsService] Firestore snapshot error (using local cache):', error.message);
        }
      );
    } catch (e) {
      console.warn('[TrackingSettingsService] Failed to bind Firestore snapshot listener:', e);
    }
  }

  private notifyListeners() {
    const copy = { ...this.currentSettings };
    this.listeners.forEach((fn) => {
      try {
        fn(copy);
      } catch (err) {
        console.error('[TrackingSettingsService] Listener exception:', err);
      }
    });
  }

  public subscribe(callback: (settings: TrackingSettings) => void): () => void {
    this.listeners.add(callback);
    callback({ ...this.currentSettings });
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getCurrentSettings(): TrackingSettings {
    return { ...this.currentSettings };
  }

  public async getSettings(): Promise<TrackingSettings> {
    try {
      const docRef = doc(db, 'settings', 'tracking');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const merged = this.mergeWithDefaults(snap.data() as Partial<TrackingSettings>);
        this.currentSettings = merged;
        this.saveToLocalStorage(merged);
        return merged;
      }
    } catch (error) {
      console.warn('[TrackingSettingsService] Remote fetch failed, using local/cached values:', error);
    }
    return { ...this.currentSettings };
  }

  public async saveSettings(newSettings: Partial<TrackingSettings>): Promise<TrackingSettings> {
    const updatedBy = auth.currentUser?.email || auth.currentUser?.uid || 'admin';
    const merged = this.mergeWithDefaults({
      ...this.currentSettings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
      updatedBy,
    });

    const docPath = 'settings/tracking';
    try {
      const docRef = doc(db, 'settings', 'tracking');
      await setDoc(docRef, merged, { merge: true });
      this.currentSettings = merged;
      this.saveToLocalStorage(merged);
      this.notifyListeners();

      // Notify the server runtime proxy to update its CAPI credentials immediately
      try {
        await fetch('/api/tracking/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged),
        });
      } catch (syncErr) {
        console.warn('[TrackingSettingsService] Server proxy sync notification warning:', syncErr);
      }

      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
      throw error;
    }
  }
}

export const trackingSettingsService = new TrackingSettingsService();
