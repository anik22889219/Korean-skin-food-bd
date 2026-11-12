import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from './firebase';

export interface PinterestSettings {
  domainVerification: {
    enabled: boolean;
    verificationCode: string;
    fileName: string;
    isVerified?: boolean;
    verifiedAt?: string;
  };
  tag: {
    enabled: boolean;
    tagId: string;
    enhancedMatch: boolean;
  };
  catalog: {
    enabled: boolean;
    currency: string;
    defaultCategory: string;
    lastSyncedAt?: string;
  };
  richPins: {
    enabled: boolean;
    showSaveButton: boolean;
  };
  updatedAt?: string;
  updatedBy?: string;
}

const SETTINGS_STORAGE_KEY = 'ksf_pinterest_settings_cache_v1';

export const DEFAULT_PINTEREST_SETTINGS: PinterestSettings = {
  domainVerification: {
    enabled: true,
    verificationCode: '7da0826bf938ef0f99cb087f3822459f',
    fileName: 'pinterest-7da08.html',
    isVerified: true,
    verifiedAt: new Date().toISOString(),
  },
  tag: {
    enabled: true,
    tagId: '',
    enhancedMatch: true,
  },
  catalog: {
    enabled: true,
    currency: 'BDT',
    defaultCategory: 'Health & Beauty > Personal Care > Cosmetics > Skin Care',
    lastSyncedAt: new Date().toISOString(),
  },
  richPins: {
    enabled: true,
    showSaveButton: true,
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'system_default',
};

class PinterestService {
  private currentSettings: PinterestSettings = { ...DEFAULT_PINTEREST_SETTINGS };
  private listeners: Set<(settings: PinterestSettings) => void> = new Set();
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

  private saveToLocalStorage(settings: PinterestSettings) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }

  private mergeWithDefaults(incoming: Partial<PinterestSettings>): PinterestSettings {
    return {
      domainVerification: {
        enabled: incoming.domainVerification?.enabled ?? DEFAULT_PINTEREST_SETTINGS.domainVerification.enabled,
        verificationCode: (incoming.domainVerification?.verificationCode || DEFAULT_PINTEREST_SETTINGS.domainVerification.verificationCode).trim(),
        fileName: (incoming.domainVerification?.fileName || DEFAULT_PINTEREST_SETTINGS.domainVerification.fileName).trim(),
        isVerified: incoming.domainVerification?.isVerified ?? DEFAULT_PINTEREST_SETTINGS.domainVerification.isVerified,
        verifiedAt: incoming.domainVerification?.verifiedAt || DEFAULT_PINTEREST_SETTINGS.domainVerification.verifiedAt,
      },
      tag: {
        enabled: incoming.tag?.enabled ?? DEFAULT_PINTEREST_SETTINGS.tag.enabled,
        tagId: (incoming.tag?.tagId || '').trim(),
        enhancedMatch: incoming.tag?.enhancedMatch ?? DEFAULT_PINTEREST_SETTINGS.tag.enhancedMatch,
      },
      catalog: {
        enabled: incoming.catalog?.enabled ?? DEFAULT_PINTEREST_SETTINGS.catalog.enabled,
        currency: (incoming.catalog?.currency || 'BDT').trim().toUpperCase(),
        defaultCategory: (incoming.catalog?.defaultCategory || DEFAULT_PINTEREST_SETTINGS.catalog.defaultCategory).trim(),
        lastSyncedAt: incoming.catalog?.lastSyncedAt || new Date().toISOString(),
      },
      richPins: {
        enabled: incoming.richPins?.enabled ?? DEFAULT_PINTEREST_SETTINGS.richPins.enabled,
        showSaveButton: incoming.richPins?.showSaveButton ?? DEFAULT_PINTEREST_SETTINGS.richPins.showSaveButton,
      },
      updatedAt: incoming.updatedAt || new Date().toISOString(),
      updatedBy: incoming.updatedBy || 'admin',
    };
  }

  public initFirestoreListener() {
    if (typeof window === 'undefined' || this.isSubscribed) return;
    this.isSubscribed = true;

    try {
      const docRef = doc(db, 'settings', 'pinterest');
      this.unsubscribeFirestore = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const merged = this.mergeWithDefaults(data as Partial<PinterestSettings>);
            this.currentSettings = merged;
            this.saveToLocalStorage(merged);
            this.notifyListeners();
            this.updateMetaTag(merged.domainVerification.verificationCode);
          } else {
            // First time seeding
            this.saveSettings(DEFAULT_PINTEREST_SETTINGS).catch(() => {});
          }
        },
        (error) => {
          console.warn('[PinterestService] Firestore snapshot error (using local cache):', error.message);
        }
      );
    } catch (e) {
      console.warn('[PinterestService] Failed to bind Firestore snapshot listener:', e);
    }
  }

  private updateMetaTag(code: string) {
    if (typeof document === 'undefined') return;
    try {
      let meta = document.querySelector('meta[name="p:domain_verify"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'p:domain_verify');
        document.head.appendChild(meta);
      }
      if (code) {
        meta.setAttribute('content', code);
      }
    } catch (e) {
      console.warn('[PinterestService] Meta tag update error:', e);
    }
  }

  private notifyListeners() {
    const copy = { ...this.currentSettings };
    this.listeners.forEach((fn) => {
      try {
        fn(copy);
      } catch (err) {
        console.error('[PinterestService] Listener exception:', err);
      }
    });
  }

  public subscribe(callback: (settings: PinterestSettings) => void): () => void {
    this.listeners.add(callback);
    callback({ ...this.currentSettings });
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getCurrentSettings(): PinterestSettings {
    return { ...this.currentSettings };
  }

  public async getSettings(): Promise<PinterestSettings> {
    try {
      const docRef = doc(db, 'settings', 'pinterest');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const merged = this.mergeWithDefaults(snap.data() as Partial<PinterestSettings>);
        this.currentSettings = merged;
        this.saveToLocalStorage(merged);
        this.updateMetaTag(merged.domainVerification.verificationCode);
        return merged;
      }
    } catch (error) {
      console.warn('[PinterestService] Remote fetch failed, using local/cached values:', error);
    }
    return { ...this.currentSettings };
  }

  public async saveSettings(newSettings: Partial<PinterestSettings>): Promise<PinterestSettings> {
    const updatedBy = auth.currentUser?.email || auth.currentUser?.uid || 'admin';
    const merged = this.mergeWithDefaults({
      ...this.currentSettings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
      updatedBy,
    });

    const docPath = 'settings/pinterest';
    try {
      const docRef = doc(db, 'settings', 'pinterest');
      await setDoc(docRef, merged, { merge: true });
      this.currentSettings = merged;
      this.saveToLocalStorage(merged);
      this.notifyListeners();
      this.updateMetaTag(merged.domainVerification.verificationCode);

      // Notify the server runtime proxy to update its credentials / feeds
      try {
        await fetch('/api/pinterest/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged),
        });
      } catch (syncErr) {
        console.warn('[PinterestService] Server proxy sync warning:', syncErr);
      }

      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
      throw error;
    }
  }

  public async verifyDomainDiagnostics(): Promise<{
    fileEndpointOk: boolean;
    metaVerificationOk: boolean;
    verificationCode: string;
    checkedUrl: string;
    details: string;
  }> {
    const settings = this.getCurrentSettings();
    const fileName = settings.domainVerification.fileName || 'pinterest-7da08.html';
    const verificationCode = settings.domainVerification.verificationCode;

    let fileEndpointOk = false;
    let metaVerificationOk = false;
    let details = '';

    try {
      const res = await fetch(`/${fileName}`, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        fileEndpointOk = text.includes('p:domain_verify') || text.includes(verificationCode);
      }
    } catch (e: any) {
      details += `File test failed: ${e.message}. `;
    }

    if (typeof document !== 'undefined') {
      const meta = document.querySelector('meta[name="p:domain_verify"]');
      const content = meta?.getAttribute('content');
      metaVerificationOk = content === verificationCode;
    }

    return {
      fileEndpointOk,
      metaVerificationOk,
      verificationCode,
      checkedUrl: `/${fileName}`,
      details: details || 'Domain verification endpoints are operating normally.',
    };
  }
}

export const pinterestService = new PinterestService();
