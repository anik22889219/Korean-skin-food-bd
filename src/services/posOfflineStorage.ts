/**
 * Persistent Browser Storage & Offline Sync Engine for Korean Skin Food POS System.
 * 
 * Provides resilient offline operations during temporary store internet outages:
 * 1. IndexedDB persistent caching of entire product catalog with barcodes and pricing.
 * 2. High-speed O(1) offline barcode lookups matching online behavior.
 * 3. Offline Scans Queue persisting all scanned products during internet drops.
 * 4. Active POS Session persistence so staff are never locked out when offline.
 * 5. Automatic bi-directional synchronization with Firestore when connectivity resumes.
 * 6. Non-intrusive reactive state hooks for real-time UI status and counters.
 */

import { Product, PosSession } from '../types';
import { normalizeBarcode } from '../utils/barcode';

export interface OfflineScanRecord {
  id: string; // e.g. "off_scan_1728648123456_xyz"
  sessionId: string;
  productId: string;
  productName: string;
  barcode?: string;
  price: number;
  quantity: number;
  scannedAt: string;
  staffUserId?: string;
  staffName?: string;
  synced: boolean;
  syncAttempts?: number;
  lastError?: string;
}

export interface OfflineSessionSnapshot {
  sessionId: string;
  userId: string;
  userName: string;
  userRole: string;
  operatorEmail?: string;
  deviceType: string;
  startedAt: string;
  lastSeenAt: string;
  cachedAt: string;
  isOfflineCreated?: boolean;
}

const DB_NAME = 'ksf_pos_offline_db';
const DB_VERSION = 1;

const STORE_PRODUCTS = 'products';
const STORE_OFFLINE_SCANS = 'offline_scans';
const STORE_SESSIONS = 'sessions';
const STORE_KEYVAL = 'keyval';

type OfflineScansListener = (pendingScans: OfflineScanRecord[]) => void;
type ConnectionStatusListener = (isOnline: boolean) => void;

class PosOfflineStorageService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryProducts: Map<string, Product> = new Map();
  private memoryBarcodeIndex: Map<string, Product> = new Map();
  private memoryScansQueue: OfflineScanRecord[] = [];
  private scansListeners: Set<OfflineScansListener> = new Set();
  private connectionListeners: Set<ConnectionStatusListener> = new Set();
  private isOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private syncTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initListeners();
      // Asynchronously bootstrap in-memory cache from IndexedDB / LocalStorage
      this.bootstrapCache().catch((err) => {
        console.warn('[PosOfflineStorage] Bootstrap notice:', err);
      });
    }
  }

  // ================= 1. INDEXEDDB INITIALIZATION =================
  private getDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
          const db = (e.target as IDBOpenDBRequest).result;
          
          // Products Store
          if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
            const prodStore = db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
            prodStore.createIndex('barcode', 'barcode', { unique: false });
            prodStore.createIndex('barcodeNormalized', 'barcodeNormalized', { unique: false });
          }

          // Offline Scans Queue Store
          if (!db.objectStoreNames.contains(STORE_OFFLINE_SCANS)) {
            const scanStore = db.createObjectStore(STORE_OFFLINE_SCANS, { keyPath: 'id' });
            scanStore.createIndex('sessionId', 'sessionId', { unique: false });
            scanStore.createIndex('synced', 'synced', { unique: false });
          }

          // Sessions Store
          if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
            db.createObjectStore(STORE_SESSIONS, { keyPath: 'userId' });
          }

          // Key-Val Store
          if (!db.objectStoreNames.contains(STORE_KEYVAL)) {
            db.createObjectStore(STORE_KEYVAL, { keyPath: 'key' });
          }
        };

        req.onsuccess = () => {
          resolve(req.result);
        };

        req.onerror = (err) => {
          console.warn('[PosOfflineStorage] IndexedDB open error (falling back to localStorage):', err);
          resolve(null);
        };
      } catch (e) {
        console.warn('[PosOfflineStorage] IndexedDB exception (using fallback):', e);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  // ================= 2. ONLINE / OFFLINE CONNECTIVITY MONITOR =================
  private initListeners() {
    window.addEventListener('online', () => {
      this.isOnlineStatus = true;
      this.notifyConnectionListeners(true);
      // Automatically attempt to drain pending offline scans queue
      this.scheduleAutoSync(1500);
    });

    window.addEventListener('offline', () => {
      this.isOnlineStatus = false;
      this.notifyConnectionListeners(false);
    });

    // Periodic soft heartbeat check every 30s to detect captive portals or transparent drops
    setInterval(() => {
      const current = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (current !== this.isOnlineStatus) {
        this.isOnlineStatus = current;
        this.notifyConnectionListeners(current);
        if (current) this.scheduleAutoSync(1000);
      }
    }, 30000);
  }

  public isOnline(): boolean {
    return this.isOnlineStatus;
  }

  public subscribeConnection(callback: ConnectionStatusListener): () => void {
    this.connectionListeners.add(callback);
    callback(this.isOnlineStatus);
    return () => this.connectionListeners.delete(callback);
  }

  private notifyConnectionListeners(status: boolean) {
    this.connectionListeners.forEach((cb) => {
      try {
        cb(status);
      } catch (e) {
        console.error('[PosOfflineStorage] Connection listener error:', e);
      }
    });
  }

  // ================= 3. CACHE BOOTSTRAPPING =================
  private async bootstrapCache(): Promise<void> {
    try {
      // 1. Load cached products from IndexedDB or localStorage
      const cachedProducts = await this.getCachedProducts();
      if (cachedProducts.length > 0) {
        this.rebuildInMemoryProductIndex(cachedProducts);
      }

      // 2. Load pending offline scans
      const pendingScans = await this.getPendingOfflineScans();
      this.memoryScansQueue = pendingScans;
      this.notifyScansListeners();
    } catch (e) {
      console.warn('[PosOfflineStorage] Cache bootstrap notice:', e);
    }
  }

  private rebuildInMemoryProductIndex(products: Product[]) {
    this.memoryProducts.clear();
    this.memoryBarcodeIndex.clear();

    for (const p of products) {
      this.memoryProducts.set(p.id, p);

      const normBarcode = p.barcodeNormalized || normalizeBarcode(p.barcode);
      if (normBarcode) {
        this.memoryBarcodeIndex.set(normBarcode, p);
      }
      if (p.barcode) {
        const rawNorm = normalizeBarcode(p.barcode);
        if (rawNorm) this.memoryBarcodeIndex.set(rawNorm, p);
        this.memoryBarcodeIndex.set(p.barcode.trim(), p);
      }
      if (p.id) {
        this.memoryBarcodeIndex.set(p.id, p);
        this.memoryBarcodeIndex.set(p.id.toLowerCase(), p);
        const normId = normalizeBarcode(p.id);
        if (normId) this.memoryBarcodeIndex.set(normId, p);
      }
    }
  }

  // ================= 4. PRODUCT CATALOG PERSISTENCE =================
  /**
   * Persists product catalog to IndexedDB with localStorage fallback.
   * Called whenever products are loaded or synchronized from Firestore.
   */
  public async cacheProducts(products: Product[]): Promise<void> {
    if (!products || products.length === 0) return;

    this.rebuildInMemoryProductIndex(products);

    // Save to IndexedDB
    const db = await this.getDB();
    if (db) {
      try {
        const tx = db.transaction([STORE_PRODUCTS, STORE_KEYVAL], 'readwrite');
        const prodStore = tx.objectStore(STORE_PRODUCTS);
        
        // Put all products
        for (const p of products) {
          prodStore.put(p);
        }

        const metaStore = tx.objectStore(STORE_KEYVAL);
        metaStore.put({
          key: 'catalog_metadata',
          totalCount: products.length,
          lastCachedAt: new Date().toISOString()
        });

        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        return;
      } catch (err) {
        console.warn('[PosOfflineStorage] IndexedDB put products error:', err);
      }
    }

    // Fallback: localStorage (compress essential fields)
    try {
      const slim = products.map((p) => ({
        id: p.id,
        name: p.name,
        nameBN: p.nameBN,
        brand: p.brand,
        barcode: p.barcode,
        barcodeNormalized: p.barcodeNormalized || normalizeBarcode(p.barcode),
        price: p.price,
        discountPrice: p.discountPrice,
        wholesalePrice: p.wholesalePrice,
        wholesaleTiers: (p as any).wholesaleTiers,
        stock: p.stock,
        image: p.image,
        category: p.category,
        isCombo: p.isCombo,
        comboComponents: (p as any).comboComponents
      }));
      localStorage.setItem('ksf_pos_offline_products', JSON.stringify(slim));
      localStorage.setItem('ksf_pos_offline_products_time', new Date().toISOString());
    } catch (e) {
      console.warn('[PosOfflineStorage] localStorage product caching note:', e);
    }
  }

  /**
   * Retrieves full product catalog from persistent storage.
   */
  public async getCachedProducts(): Promise<Product[]> {
    // Check IndexedDB
    const db = await this.getDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_PRODUCTS, 'readonly');
        const store = tx.objectStore(STORE_PRODUCTS);
        const req = store.getAll();

        const prods = await new Promise<Product[]>((resolve, reject) => {
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });

        if (prods.length > 0) {
          return prods;
        }
      } catch (err) {
        console.warn('[PosOfflineStorage] IndexedDB read error:', err);
      }
    }

    // Check localStorage fallback
    try {
      const raw = localStorage.getItem('ksf_pos_offline_products');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as Product[];
        }
      }
    } catch {}

    // Fallback to memory
    return Array.from(this.memoryProducts.values());
  }

  /**
   * Instant O(1) offline barcode / ID lookup.
   */
  public lookupProductOffline(code: string): Product | undefined {
    if (!code) return undefined;
    const clean = String(code).trim();
    const norm = normalizeBarcode(clean);

    return (
      this.memoryBarcodeIndex.get(norm) ||
      this.memoryBarcodeIndex.get(clean) ||
      this.memoryBarcodeIndex.get(clean.toLowerCase()) ||
      this.memoryProducts.get(clean)
    );
  }

  // ================= 5. OFFLINE SCANS QUEUE =================
  /**
   * Record a scan performed while offline or during Firestore temporary network timeout.
   */
  public async recordOfflineScan(entry: {
    sessionId: string;
    productId: string;
    productName: string;
    barcode?: string;
    price: number;
    quantity: number;
    staffUserId?: string;
    staffName?: string;
  }): Promise<OfflineScanRecord> {
    const scanId = `off_scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record: OfflineScanRecord = {
      id: scanId,
      sessionId: entry.sessionId,
      productId: entry.productId,
      productName: entry.productName,
      barcode: entry.barcode,
      price: entry.price,
      quantity: entry.quantity,
      scannedAt: new Date().toISOString(),
      staffUserId: entry.staffUserId,
      staffName: entry.staffName,
      synced: false,
      syncAttempts: 0
    };

    // Update in-memory queue
    this.memoryScansQueue = [...this.memoryScansQueue, record];
    this.notifyScansListeners();

    // Persist to IndexedDB
    const db = await this.getDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_OFFLINE_SCANS, 'readwrite');
        tx.objectStore(STORE_OFFLINE_SCANS).put(record);
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (err) {
        console.warn('[PosOfflineStorage] IndexedDB put offline scan error:', err);
      }
    }

    // Persist to localStorage fallback
    try {
      const currentListRaw = localStorage.getItem('ksf_pos_offline_scans_queue');
      const currentList: OfflineScanRecord[] = currentListRaw ? JSON.parse(currentListRaw) : [];
      currentList.push(record);
      localStorage.setItem('ksf_pos_offline_scans_queue', JSON.stringify(currentList));
    } catch {}

    // If online returns shortly after, schedule auto-sync
    if (this.isOnline()) {
      this.scheduleAutoSync(2000);
    }

    return record;
  }

  /**
   * Retrieve all pending offline scans (optionally filtered by active sessionId).
   */
  public async getPendingOfflineScans(sessionId?: string): Promise<OfflineScanRecord[]> {
    let list: OfflineScanRecord[] = [];

    const db = await this.getDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_OFFLINE_SCANS, 'readonly');
        const store = tx.objectStore(STORE_OFFLINE_SCANS);
        const req = store.getAll();

        const all = await new Promise<OfflineScanRecord[]>((resolve, reject) => {
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });

        list = all.filter((s) => !s.synced);
      } catch (err) {
        console.warn('[PosOfflineStorage] IndexedDB read scans error:', err);
      }
    }

    if (list.length === 0) {
      try {
        const raw = localStorage.getItem('ksf_pos_offline_scans_queue');
        if (raw) {
          const parsed: OfflineScanRecord[] = JSON.parse(raw);
          list = parsed.filter((s) => !s.synced);
        }
      } catch {}
    }

    if (list.length === 0 && this.memoryScansQueue.length > 0) {
      list = this.memoryScansQueue.filter((s) => !s.synced);
    }

    if (sessionId) {
      return list.filter((s) => s.sessionId === sessionId || s.sessionId.startsWith('offline-'));
    }
    return list;
  }

  public getPendingCount(sessionId?: string): number {
    const list = sessionId 
      ? this.memoryScansQueue.filter((s) => !s.synced && (s.sessionId === sessionId || s.sessionId.startsWith('offline-')))
      : this.memoryScansQueue.filter((s) => !s.synced);
    return list.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }

  public subscribeScans(callback: OfflineScansListener): () => void {
    this.scansListeners.add(callback);
    callback(this.memoryScansQueue.filter((s) => !s.synced));
    return () => this.scansListeners.delete(callback);
  }

  private notifyScansListeners() {
    const pending = this.memoryScansQueue.filter((s) => !s.synced);
    this.scansListeners.forEach((cb) => {
      try {
        cb(pending);
      } catch (e) {
        console.error('[PosOfflineStorage] Scans listener error:', e);
      }
    });
  }

  /**
   * Remove or mark scan synced in IndexedDB & localStorage.
   */
  public async markScanSynced(scanId: string): Promise<void> {
    this.memoryScansQueue = this.memoryScansQueue.filter((s) => s.id !== scanId);
    this.notifyScansListeners();

    const db = await this.getDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_OFFLINE_SCANS, 'readwrite');
        tx.objectStore(STORE_OFFLINE_SCANS).delete(scanId);
        await new Promise<void>((resolve) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      } catch {}
    }

    try {
      const raw = localStorage.getItem('ksf_pos_offline_scans_queue');
      if (raw) {
        const list: OfflineScanRecord[] = JSON.parse(raw);
        const filtered = list.filter((s) => s.id !== scanId);
        localStorage.setItem('ksf_pos_offline_scans_queue', JSON.stringify(filtered));
      }
    } catch {}
  }

  /**
   * Clear offline scans queue for a given session.
   */
  public async clearOfflineScans(sessionId?: string): Promise<void> {
    if (sessionId) {
      this.memoryScansQueue = this.memoryScansQueue.filter((s) => s.sessionId !== sessionId);
    } else {
      this.memoryScansQueue = [];
    }
    this.notifyScansListeners();

    const db = await this.getDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_OFFLINE_SCANS, 'readwrite');
        const store = tx.objectStore(STORE_OFFLINE_SCANS);
        if (!sessionId) {
          store.clear();
        } else {
          const req = store.getAll();
          req.onsuccess = () => {
            const all: OfflineScanRecord[] = req.result || [];
            all.forEach((rec) => {
              if (rec.sessionId === sessionId) store.delete(rec.id);
            });
          };
        }
      } catch {}
    }

    try {
      if (!sessionId) {
        localStorage.removeItem('ksf_pos_offline_scans_queue');
      } else {
        const raw = localStorage.getItem('ksf_pos_offline_scans_queue');
        if (raw) {
          const list: OfflineScanRecord[] = JSON.parse(raw);
          const filtered = list.filter((s) => s.sessionId !== sessionId);
          localStorage.setItem('ksf_pos_offline_scans_queue', JSON.stringify(filtered));
        }
      }
    } catch {}
  }

  // ================= 6. ACTIVE POS SESSION SNAPSHOT =================
  /**
   * Persists active session so staff can continue scanning if connection drops or page refreshes.
   */
  public async cacheActiveSession(session: PosSession | OfflineSessionSnapshot): Promise<void> {
    if (!session || !session.userId) return;

    const snapshot: OfflineSessionSnapshot = {
      sessionId: session.sessionId || (session as any).id,
      userId: session.userId,
      userName: session.userName,
      userRole: session.userRole,
      operatorEmail: (session as any).operatorEmail || '',
      deviceType: session.deviceType || 'desktop',
      startedAt: session.startedAt || new Date().toISOString(),
      lastSeenAt: session.lastSeenAt || new Date().toISOString(),
      cachedAt: new Date().toISOString(),
      isOfflineCreated: Boolean((session as any).isOfflineCreated)
    };

    const db = await this.getDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_SESSIONS, 'readwrite');
        tx.objectStore(STORE_SESSIONS).put(snapshot);
      } catch {}
    }

    try {
      localStorage.setItem(`ksf_pos_offline_session_${session.userId}`, JSON.stringify(snapshot));
      localStorage.setItem('ksf_pos_last_active_session', JSON.stringify(snapshot));
    } catch {}
  }

  /**
   * Restores offline session snapshot when offline or during Firestore errors.
   */
  public async getCachedActiveSession(userId?: string): Promise<OfflineSessionSnapshot | null> {
    const db = await this.getDB();
    if (db && userId) {
      try {
        const tx = db.transaction(STORE_SESSIONS, 'readonly');
        const req = tx.objectStore(STORE_SESSIONS).get(userId);
        const res = await new Promise<OfflineSessionSnapshot | null>((resolve) => {
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
        if (res) return res;
      } catch {}
    }

    try {
      if (userId) {
        const raw = localStorage.getItem(`ksf_pos_offline_session_${userId}`);
        if (raw) return JSON.parse(raw);
      }
      const lastRaw = localStorage.getItem('ksf_pos_last_active_session');
      if (lastRaw) return JSON.parse(lastRaw);
    } catch {}

    return null;
  }

  // ================= 7. AUTOMATIC & MANUAL OFFLINE SYNC ENGINE =================
  private scheduleAutoSync(delayMs: number = 1000) {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.syncPendingScans().catch((err) => {
        console.warn('[PosOfflineStorage] Auto sync notice:', err);
      });
    }, delayMs);
  }

  /**
   * Drain pending offline scans into the active POS session in Firestore.
   */
  public async syncPendingScans(targetSessionId?: string): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) {
      return { synced: 0, failed: 0 };
    }
    if (!this.isOnline()) {
      return { synced: 0, failed: 0 };
    }

    const pending = await this.getPendingOfflineScans();
    if (pending.length === 0) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let syncedCount = 0;
    let failedCount = 0;

    try {
      // Lazy load Firestore & POS service to prevent circular imports
      const { db } = await import('./firebase');
      const { collection, doc, writeBatch, updateDoc } = await import('firebase/firestore');

      // Group scans by session
      const bySession = new Map<string, OfflineScanRecord[]>();
      for (const scan of pending) {
        const effectiveSid = targetSessionId || (scan.sessionId.startsWith('offline-') ? targetSessionId || scan.sessionId : scan.sessionId);
        if (!effectiveSid) continue;
        const current = bySession.get(effectiveSid) || [];
        current.push(scan);
        bySession.set(effectiveSid, current);
      }

      for (const [sid, scans] of bySession.entries()) {
        try {
          const scansColRef = collection(db, 'pos_sessions', sid, 'scans');
          const batch = writeBatch(db);

          for (const scan of scans) {
            const qty = Math.max(1, scan.quantity || 1);
            for (let i = 0; i < qty; i++) {
              const newDocRef = doc(scansColRef);
              batch.set(newDocRef, {
                product_id: scan.productId,
                product_name: scan.productName,
                scanned_at: scan.scannedAt || new Date().toISOString(),
                offline_synced: true,
                synced_at: new Date().toISOString()
              });
            }
          }

          // Commit batch
          await batch.commit();

          // Update session timestamp
          updateDoc(doc(db, 'pos_sessions', sid), {
            lastSeenAt: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).catch(() => {});

          // Mark scans as synced
          for (const scan of scans) {
            await this.markScanSynced(scan.id);
            syncedCount += scan.quantity;
          }
        } catch (err: any) {
          console.warn(`[PosOfflineStorage] Error syncing scans for session ${sid}:`, err);
          failedCount += scans.length;
        }
      }
    } catch (err) {
      console.warn('[PosOfflineStorage] General sync error:', err);
    } finally {
      this.isSyncing = false;
      this.notifyScansListeners();
    }

    return { synced: syncedCount, failed: failedCount };
  }
}

export const posOfflineStorage = new PosOfflineStorageService();
