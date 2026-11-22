import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from './firebase';
import { authFetch } from './apiClient';

export interface SavedAddress {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  area: 'dhaka' | 'outside';
  addressLine: string;
  isDefault?: boolean;
  updatedAt: string;
}

export interface SkinProfileRecord {
  skinType: 'Oily' | 'Dry' | 'Combination' | 'Sensitive' | 'Normal';
  concerns: string[];
  sensitivity: 'low' | 'moderate' | 'high';
  sunExposure: 'indoor' | 'moderate' | 'high';
  budgetTier: 'budget' | 'mid' | 'premium';
  recommendedProductIds: string[];
  updatedAt: string;
}

export interface SavedRoutineStep {
  slot: string;
  productId: string;
  productName: string;
  brand?: string;
}

export interface SavedRoutineRecord {
  id: string;
  name: string;
  amSteps: SavedRoutineStep[];
  pmSteps: SavedRoutineStep[];
  updatedAt: string;
}

export interface CustomerSupportTicket {
  id: string;
  ticketNumber: string;
  userId?: string | null;
  orderId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  replies?: Array<{
    id: string;
    author: string;
    authorRole: string;
    message: string;
    timestamp: string;
  }>;
}

export interface LoyaltyLedgerEntry {
  id: string;
  userId: string;
  orderId?: string;
  type: 'ORDER_EARN' | 'REDEMPTION' | 'ADMIN_ADJUSTMENT' | 'REFUND_REVERSAL' | string;
  pointsDelta: number;
  balanceAfter: number;
  description: string;
  actor?: string;
  createdAt: string;
}

const WISHLIST_STORAGE_KEY = 'ksf_wishlist';
const RECENTLY_VIEWED_KEY = 'ksf_recently_viewed';
const SKIN_PROFILE_KEY = 'ksf_skin_profile';
const ROUTINES_KEY = 'ksf_saved_routines';
const WISHLIST_EVENT = 'ksf-wishlist-updated';

function readJsonStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export const userPortalService = {
  // ================= WISHLIST =================
  getLocalWishlistIds(): string[] {
    const parsed = readJsonStorage<unknown>(WISHLIST_STORAGE_KEY, []);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  },

  setLocalWishlistIds(ids: string[]): void {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    writeJsonStorage(WISHLIST_STORAGE_KEY, unique);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(WISHLIST_EVENT, { detail: unique }));
    }
  },

  async syncLocalWishlistToCloud(uid: string): Promise<string[]> {
    const localIds = this.getLocalWishlistIds();
    try {
      const colRef = collection(db, 'users', uid, 'wishlist');
      const snap = await getDocs(colRef);
      const cloudIds = new Set<string>();
      snap.forEach((d) => cloudIds.add(d.id));

      for (const pid of localIds) {
        if (!cloudIds.has(pid)) {
          await setDoc(doc(db, 'users', uid, 'wishlist', pid), {
            productId: pid,
            addedAt: new Date().toISOString(),
          });
          cloudIds.add(pid);
        }
      }

      const merged = Array.from(cloudIds);
      this.setLocalWishlistIds(merged);
      return merged;
    } catch {
      return localIds;
    }
  },

  subscribeWishlist(uid: string | undefined, callback: (ids: string[]) => void): () => void {
    callback(this.getLocalWishlistIds());

    const onLocalChange = (e: Event) => {
      const custom = e as CustomEvent<string[]>;
      callback(Array.isArray(custom.detail) ? custom.detail : this.getLocalWishlistIds());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(WISHLIST_EVENT, onLocalChange);
    }

    if (!uid) {
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener(WISHLIST_EVENT, onLocalChange);
        }
      };
    }

    const colRef = collection(db, 'users', uid, 'wishlist');
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const ids: string[] = [];
        snap.forEach((d) => ids.push(d.id));
        writeJsonStorage(WISHLIST_STORAGE_KEY, ids);
        callback(ids);
      },
      () => {
        callback(this.getLocalWishlistIds());
      }
    );

    return () => {
      unsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener(WISHLIST_EVENT, onLocalChange);
      }
    };
  },

  async toggleWishlist(productId: string, uid?: string): Promise<boolean> {
    const current = this.getLocalWishlistIds();
    const exists = current.includes(productId);
    const next = exists ? current.filter((id) => id !== productId) : [...current, productId];
    this.setLocalWishlistIds(next);

    if (uid) {
      try {
        const ref = doc(db, 'users', uid, 'wishlist', productId);
        if (exists) {
          await deleteDoc(ref);
        } else {
          await setDoc(ref, {
            productId,
            addedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('[UserPortal] Wishlist cloud sync warning:', err);
      }
    }

    return !exists;
  },

  // ================= RECENTLY VIEWED =================
  getRecentlyViewedIds(): string[] {
    const parsed = readJsonStorage<unknown>(RECENTLY_VIEWED_KEY, []);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  },

  addRecentlyViewed(productId: string): void {
    if (!productId) return;
    const current = this.getRecentlyViewedIds().filter((id) => id !== productId);
    const next = [productId, ...current].slice(0, 12);
    writeJsonStorage(RECENTLY_VIEWED_KEY, next);
  },

  // ================= SAVED ADDRESSES =================
  async getSavedAddresses(uid: string): Promise<SavedAddress[]> {
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'addresses'));
      const list: SavedAddress[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<SavedAddress, 'id'>) });
      });
      return list.sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)));
    } catch {
      return [];
    }
  },

  async saveAddress(uid: string, addr: Omit<SavedAddress, 'id' | 'updatedAt'> & { id?: string }): Promise<SavedAddress> {
    const id = addr.id || `addr-${Date.now()}`;
    const payload: SavedAddress = {
      id,
      label: addr.label.trim() || 'Home',
      recipientName: addr.recipientName.trim(),
      phone: addr.phone.trim(),
      area: addr.area === 'outside' ? 'outside' : 'dhaka',
      addressLine: addr.addressLine.trim(),
      isDefault: Boolean(addr.isDefault),
      updatedAt: new Date().toISOString(),
    };

    if (payload.isDefault) {
      const existing = await this.getSavedAddresses(uid);
      for (const item of existing) {
        if (item.id !== id && item.isDefault) {
          await setDoc(doc(db, 'users', uid, 'addresses', item.id), { ...item, isDefault: false });
        }
      }
    }

    await setDoc(doc(db, 'users', uid, 'addresses', id), sanitizeForFirestore(payload));
    return payload;
  },

  async deleteAddress(uid: string, addressId: string): Promise<void> {
    await deleteDoc(doc(db, 'users', uid, 'addresses', addressId));
  },

  // ================= SKIN PROFILE =================
  async getSkinProfile(uid?: string): Promise<SkinProfileRecord | null> {
    if (uid) {
      try {
        const snap = await getDoc(doc(db, 'users', uid, 'skin_profile', 'current'));
        if (snap.exists()) {
          const data = snap.data() as SkinProfileRecord;
          writeJsonStorage(SKIN_PROFILE_KEY, data);
          return data;
        }
      } catch {
        // fallback to localStorage
      }
    }
    return readJsonStorage<SkinProfileRecord | null>(SKIN_PROFILE_KEY, null);
  },

  async saveSkinProfile(profileData: SkinProfileRecord, uid?: string): Promise<SkinProfileRecord> {
    const record: SkinProfileRecord = {
      ...profileData,
      updatedAt: new Date().toISOString(),
    };
    writeJsonStorage(SKIN_PROFILE_KEY, record);
    if (uid) {
      try {
        await setDoc(doc(db, 'users', uid, 'skin_profile', 'current'), sanitizeForFirestore(record));
      } catch (err) {
        console.warn('[UserPortal] Skin profile cloud save warning:', err);
      }
    }
    return record;
  },

  // ================= SAVED ROUTINES =================
  async getSavedRoutines(uid?: string): Promise<SavedRoutineRecord[]> {
    const local = readJsonStorage<SavedRoutineRecord[]>(ROUTINES_KEY, []);
    if (!uid) return local;

    try {
      const snap = await getDocs(collection(db, 'users', uid, 'routines'));
      const cloud: SavedRoutineRecord[] = [];
      snap.forEach((d) => cloud.push({ id: d.id, ...(d.data() as Omit<SavedRoutineRecord, 'id'>) }));
      if (cloud.length > 0) {
        cloud.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        writeJsonStorage(ROUTINES_KEY, cloud);
        return cloud;
      }
    } catch {
      // fallback to local
    }
    return local;
  },

  async saveRoutine(
    routine: Omit<SavedRoutineRecord, 'id' | 'updatedAt'> & { id?: string },
    uid?: string
  ): Promise<SavedRoutineRecord> {
    const id = routine.id || `rtn-${Date.now()}`;
    const record: SavedRoutineRecord = {
      id,
      name: routine.name.trim() || 'My K-Beauty Routine',
      amSteps: routine.amSteps || [],
      pmSteps: routine.pmSteps || [],
      updatedAt: new Date().toISOString(),
    };

    const current = readJsonStorage<SavedRoutineRecord[]>(ROUTINES_KEY, []);
    const next = [record, ...current.filter((r) => r.id !== id)].slice(0, 10);
    writeJsonStorage(ROUTINES_KEY, next);

    if (uid) {
      try {
        await setDoc(doc(db, 'users', uid, 'routines', id), sanitizeForFirestore(record));
      } catch (err) {
        console.warn('[UserPortal] Routine cloud save warning:', err);
      }
    }
    return record;
  },

  async deleteRoutine(routineId: string, uid?: string): Promise<void> {
    const current = readJsonStorage<SavedRoutineRecord[]>(ROUTINES_KEY, []);
    writeJsonStorage(ROUTINES_KEY, current.filter((r) => r.id !== routineId));
    if (uid) {
      try {
        await deleteDoc(doc(db, 'users', uid, 'routines', routineId));
      } catch (err) {
        console.warn('[UserPortal] Routine cloud delete warning:', err);
      }
    }
  },

  // ================= LOYALTY & SUPPORT =================
  async getMyLoyaltyLedger(userId?: string): Promise<LoyaltyLedgerEntry[]> {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await authFetch(`/api/loyalty/ledger${qs}`);
    if (!res.ok) {
      throw new Error('Could not load loyalty points history.');
    }
    const json = await res.json();
    return Array.isArray(json.entries) ? json.entries : [];
  },

  async getMySupportTickets(): Promise<CustomerSupportTicket[]> {
    const res = await authFetch('/api/support-tickets/mine');
    if (!res.ok) {
      throw new Error('Could not load support tickets.');
    }
    const json = await res.json();
    return Array.isArray(json.tickets) ? json.tickets : [];
  },

  async createSupportTicket(payload: {
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    orderId?: string;
    subject: string;
    description: string;
    priority?: 'low' | 'medium' | 'high';
  }): Promise<CustomerSupportTicket> {
    const res = await authFetch('/api/support-tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Could not submit support request.');
    }
    return json.ticket;
  },
};
