import { PosSession, Order, Product, PosAllowedRole, PosDeviceType, PosSessionNotification } from '../types';
import { productService } from './productService';
import { auth, db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, query, where, orderBy, addDoc, getDocs, getDoc, arrayUnion } from 'firebase/firestore';
import { findProductByScannedCode } from '../utils/barcode';

export const ALLOWED_POS_ROLES: PosAllowedRole[] = ['admin', 'super_admin', 'inventory_manager'];

export function isAllowedPosRole(role?: string | null): boolean {
  if (!role) return false;
  return (ALLOWED_POS_ROLES as readonly string[]).includes(role);
}

/**
 * Check if a POS session is considered stale (e.g. heartbeat > 90 seconds)
 */
export function isSessionStale(lastSeenAt?: string, thresholdSeconds: number = 90): boolean {
  if (!lastSeenAt) return true;
  const lastTime = new Date(lastSeenAt).getTime();
  if (isNaN(lastTime)) return true;
  const diffSeconds = (Date.now() - lastTime) / 1000;
  return diffSeconds > thresholdSeconds;
}

/**
 * Format relative session activity time (e.g., "Just now", "20 seconds ago", "4 minutes ago")
 */
export function formatSessionActivityTime(timestamp?: string): string {
  if (!timestamp) return 'No activity yet';
  const time = new Date(timestamp).getTime();
  if (isNaN(time)) return 'Recently';
  const diffSeconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (diffSeconds < 10) return 'Just now';
  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
  const mins = Math.floor(diffSeconds / 60);
  if (mins === 1) return '1 minute ago';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function detectDeviceType(): PosDeviceType {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  // Tablets check (iPad or tablet user agents or screen size)
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  // Mobile check
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    return 'mobile';
  }
  if (window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    return 'mobile';
  }
  if (window.innerWidth <= 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    return 'tablet';
  }
  return 'desktop';
}

const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ORD-582910',
    customerName: 'Ayesha Rahman',
    customerPhone: '01712345678',
    customerEmail: 'koreanskinfood.bd@gmail.com',
    address: 'House 42, Road 11, Banani, Dhaka',
    items: [
      { productId: 'cosrx-snail-96', name: 'COSRX Advanced Snail 96 Mucin Power Essence', price: 1850, quantity: 1, scannedQuantity: 0, barcode: '8809598450123' },
      { productId: 'boj-sunscreen-rice', name: 'Beauty of Joseon Relief Sun : Rice + Probiotics SPF50+', price: 1650, quantity: 1, scannedQuantity: 0, barcode: '8809530040101' }
    ],
    totalAmount: 3500,
    status: 'pending',
    order_source: 'WEBSITE',
    stock_deducted: false,
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    paymentMethod: 'COD',
    sessionType: 'Online',
    isPaid: false
  },
  {
    id: 'ORD-912832',
    customerName: 'Sajid Islam',
    customerPhone: '01987654321',
    customerEmail: 'koreanskinfood.bd@gmail.com',
    address: 'Sector 4, Uttara, Dhaka',
    items: [
      { productId: 'cosrx-cleanser-goodmorning', name: 'COSRX Low pH Good Morning Gel Cleanser', price: 1050, quantity: 2, scannedQuantity: 2, barcode: '880980010101' }
    ],
    totalAmount: 2100,
    status: 'delivered',
    order_source: 'WEBSITE',
    stock_deducted: true,
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    paymentMethod: 'COD',
    sessionType: 'Online',
    isPaid: true
  },
  {
    id: 'POS-774012',
    customerName: 'Walk-In Customer',
    customerPhone: 'Walk-In',
    address: 'In-Store Checkout',
    items: [
      { productId: 'skin1004-[#E91E8C]-ampoule', name: 'SKIN1004 Madagascar Centella Ampoule', price: 1650, quantity: 1, scannedQuantity: 1, barcode: '8809530040101' }
    ],
    totalAmount: 1650,
    status: 'delivered',
    order_source: 'POS',
    stock_deducted: true,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    paymentMethod: 'POS_In_Person',
    sessionType: 'POS',
    isPaid: true
  }
];

let ordersCache: Order[] = [...DEFAULT_ORDERS];
// Pure in-memory cache synchronized from Firestore — NOT the source of truth, NO hardcoded singleton pos-main
let sessionsCache: PosSession[] = [];

// Firestore real-time subscriptions
let draftOrdersCache: Order[] = [];

// Subscribers for real-time order synchronization
const orderSubscribers = new Set<(orders: Order[]) => void>();

function notifyOrderSubscribers() {
  orderSubscribers.forEach(cb => {
    try {
      cb(ordersCache);
    } catch (e) {
      console.error('[posService] Order subscriber error:', e);
    }
  });
}

onSnapshot(query(collection(db, 'draft_orders'), orderBy('createdAt', 'desc')), (snapshot) => {
  const drafts: Order[] = [];
  snapshot.forEach((doc) => {
    drafts.push(doc.data() as Order);
  });
  draftOrdersCache = drafts;
}, (err) => {
  console.warn('[Firebase] draft_orders onSnapshot warning:', err);
});

onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
  const ords: Order[] = [];
  snapshot.forEach((docSnap) => {
    const raw = docSnap.data() as Order;
    const normOrder: Order = {
      ...raw,
      order_source: raw.order_source || (raw.sessionType === 'POS' ? 'POS' : 'WEBSITE'),
      stock_deducted: raw.stock_deducted ?? (raw.status === 'delivered' || raw.status === 'processing' || raw.status === 'shipped'),
      items: (raw.items || []).map(item => ({
        ...item,
        scannedQuantity: item.scannedQuantity ?? (raw.status === 'delivered' ? item.quantity : 0)
      }))
    };
    ords.push(normOrder);
  });
  if (ords.length > 0) {
    ordersCache = ords;
    notifyOrderSubscribers();
  }
}, (err) => {
  console.warn('[Firebase] orders onSnapshot warning:', err);
  if (err?.code === 'permission-denied' || err?.message?.includes('permission') || err?.message?.includes('Permission')) {
    handleFirestoreError(err, OperationType.GET, 'orders', false);
  }
});

onSnapshot(collection(db, 'pos_sessions'), (snapshot) => {
  const sess: PosSession[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as PosSession;
    sess.push({
      ...data,
      id: docSnap.id,
      sessionId: data.sessionId || docSnap.id,
      items: Array.isArray(data?.items) ? data.items : []
    });
  });
  sessionsCache = sess;
}, (err) => {
  console.warn('[Firebase] pos_sessions onSnapshot warning:', err);
  if (err?.code === 'permission-denied' || err?.message?.includes('permission') || err?.message?.includes('Permission')) {
    handleFirestoreError(err, OperationType.GET, 'pos_sessions', false);
  }
});

export async function addProductToSession(
  sessionId: string,
  productId: string,
  currentCartQuantity?: number
): Promise<{ success: boolean; message: string; product?: Product }> {
  if (!sessionId || !productId) {
    return { success: false, message: 'Invalid session or product ID' };
  }

  // Lookup product by barcode or by ID
  const product = productService.getProductByBarcode(productId) || productService.getProductById(productId);
  if (!product) {
    return { success: false, message: `Product not found in inventory for code "${productId}".` };
  }

  const canonicalProductId = product.id;

  if (product.stock <= 0) {
    return { success: false, message: `Product "${product.name}" is out of stock!` };
  }

  let currentQty = currentCartQuantity;
  if (currentQty === undefined) {
    try {
      const q = query(collection(db, 'pos_sessions', sessionId, 'scans'));
      const snapshot = await getDocs(q);
      let count = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.product_id === canonicalProductId || data.product_id === productId) {
          count++;
        }
      });
      currentQty = count;
    } catch (err) {
      console.warn('Error fetching current session scans count:', err);
      currentQty = 0;
    }
  }

  if (currentQty >= product.stock) {
    return {
      success: false,
      message: `Cannot add more. Available stock for "${product.name}" is ${product.stock} (Cart already has ${currentQty}).`
    };
  }

  try {
    const scansColRef = collection(db, 'pos_sessions', sessionId, 'scans');
    const nowIso = new Date().toISOString();
    await addDoc(scansColRef, {
      product_id: canonicalProductId,
      scanned_at: nowIso
    });

    setDoc(doc(db, 'pos_sessions', sessionId), {
      lastScanTime: nowIso,
      lastSeenAt: nowIso,
      updated_at: nowIso
    }, { merge: true }).catch(() => {});

    posService.scanProductIntoSession(sessionId, canonicalProductId);

    return {
      success: true,
      message: `"${product.name}" added to session!`,
      product
    };
  } catch (err: any) {
    console.error('Error adding product scan to session:', err);
    return { success: false, message: 'Failed to add product to session.' };
  }
}

export const posService = {
  getSessions(): PosSession[] {
    return sessionsCache;
  },

  saveSessions(sessions: PosSession[]) {
    sessionsCache = sessions;
    sessions.forEach(s => {
      setDoc(doc(db, 'pos_sessions', s.id), sanitizeForFirestore(s)).catch(console.error);
    });
  },

  /**
   * Get or create a user-specific POS session in Firestore.
   * Enforces:
   * 1. Only admin, super_admin, and inventory_manager can open a session.
   * 2. Exactly ONE active session per user (re-uses existing active session on page refresh/reopen).
   * 3. Multiple users have completely isolated sessions.
   * 4. Detects deviceType (mobile | tablet | desktop).
   */
  async getOrCreateUserPosSession(params: {
    userId: string;
    userName: string;
    userRole: string;
    operatorEmail?: string;
  }): Promise<PosSession> {
    const { userId, userName, userRole, operatorEmail } = params;

    if (!userId) {
      throw new Error('User ID is required to start a POS session.');
    }

    if (!isAllowedPosRole(userRole)) {
      throw new Error(`Access denied: Role "${userRole}" is not authorized to use the POS system. Allowed roles: ${ALLOWED_POS_ROLES.join(', ')}.`);
    }

    const deviceType = detectDeviceType();
    const nowIso = new Date().toISOString();
    const userSessionStorageKey = `ksf_pos_user_session_${userId}`;

    // 1. Check local storage cache for rapid session ID restoration
    try {
      const cachedSessionId = localStorage.getItem(userSessionStorageKey);
      if (cachedSessionId) {
        const sessionRef = doc(db, 'pos_sessions', cachedSessionId);
        const snap = await getDoc(sessionRef);
        if (snap.exists()) {
          const data = snap.data() as PosSession;
          const isActive = data.status === 'active' || data.status === 'open';
          if (data.userId === userId && isActive) {
            // Restore and update heartbeat & device
            const updatedFields: Partial<PosSession> = {
              lastSeenAt: nowIso,
              updated_at: nowIso,
              deviceType,
              userName: userName || data.userName,
              userRole: userRole || data.userRole
            };
            await updateDoc(sessionRef, sanitizeForFirestore(updatedFields)).catch(() => {});
            return {
              ...data,
              ...updatedFields,
              id: snap.id,
              sessionId: data.sessionId || snap.id,
              items: Array.isArray(data.items) ? data.items : []
            };
          }
        }
      }
    } catch (e) {
      console.warn('[posService] Error reading cached session:', e);
    }

    // 2. Query Firestore collection pos_sessions where userId == userId for existing active/open session
    try {
      const q = query(
        collection(db, 'pos_sessions'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const userActiveSessions: PosSession[] = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data() as PosSession;
        if (data.status === 'active' || data.status === 'open') {
          userActiveSessions.push({
            ...data,
            id: docSnap.id,
            sessionId: data.sessionId || docSnap.id,
            items: Array.isArray(data.items) ? data.items : []
          });
        }
      });

      if (userActiveSessions.length > 0) {
        // Sort by lastSeenAt / updated_at descending to grab the most active one
        userActiveSessions.sort((a, b) => {
          const timeA = new Date(a.lastSeenAt || a.updated_at || a.startedAt || a.created_at || 0).getTime();
          const timeB = new Date(b.lastSeenAt || b.updated_at || b.startedAt || b.created_at || 0).getTime();
          return timeB - timeA;
        });

        const activeSession = userActiveSessions[0];
        try {
          localStorage.setItem(userSessionStorageKey, activeSession.id);
        } catch {}

        // Update heartbeat and device
        const sessionRef = doc(db, 'pos_sessions', activeSession.id);
        await updateDoc(sessionRef, {
          lastSeenAt: nowIso,
          updated_at: nowIso,
          deviceType
        }).catch(() => {});

        return {
          ...activeSession,
          lastSeenAt: nowIso,
          updated_at: nowIso,
          deviceType
        };
      }
    } catch (err) {
      console.warn('[posService] Error querying active user POS sessions from Firestore:', err);
    }

    // 3. No active session found — Create a fresh user-based session
    const uniqueSuffix = Math.floor(100000 + Math.random() * 900000);
    const userPrefix = userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6) || 'usr';
    const newSessionId = `pos-${userPrefix}-${uniqueSuffix}`;

    const newSession: PosSession = {
      id: newSessionId,
      sessionId: newSessionId,
      userId,
      userName: userName || 'Store Staff',
      userRole: userRole as PosAllowedRole,
      deviceType,
      status: 'active',
      startedAt: nowIso,
      lastSeenAt: nowIso,
      name: `${userName || 'Staff'}'s POS Session`,
      created_at: nowIso,
      updated_at: nowIso,
      operatorName: userName,
      operatorEmail: operatorEmail || '',
      computerJoined: true,
      scannerConnected: false,
      mobileScannerId: null,
      mobileScannerName: null,
      items: []
    };

    try {
      await setDoc(doc(db, 'pos_sessions', newSessionId), sanitizeForFirestore(newSession));
      try {
        localStorage.setItem(userSessionStorageKey, newSessionId);
      } catch {}

      // Dispatch idempotent administrative realtime notification for new POS session
      const notifId = `pos-session-${newSessionId}`;
      const notificationPayload: PosSessionNotification = {
        id: notifId,
        notificationId: notifId,
        type: 'POS_SESSION_STARTED',
        sessionId: newSessionId,
        userId,
        userName: userName || 'Store Staff',
        userRole: (userRole as PosAllowedRole) || 'staff',
        deviceType,
        createdAt: nowIso,
        read: false,
        readBy: [],
        dismissedBy: []
      };

      try {
        await setDoc(doc(db, 'admin_notifications', notifId), sanitizeForFirestore(notificationPayload));
      } catch (notifErr) {
        console.warn('[posService] Non-blocking admin notification write note:', notifErr);
      }
    } catch (err) {
      console.error('[posService] Error creating new user POS session:', err);
    }

    return newSession;
  },

  /**
   * Realtime subscription to POS session administrative notifications (For admin and super_admin only)
   */
  subscribeAdminNotifications(
    callback: (notifications: PosSessionNotification[]) => void,
    onError?: (err: any) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'admin_notifications'),
        where('type', '==', 'POS_SESSION_STARTED')
      );
      return onSnapshot(q, (snapshot) => {
        const notifs: PosSessionNotification[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as PosSessionNotification;
          notifs.push({
            ...data,
            id: docSnap.id,
            notificationId: data.notificationId || docSnap.id,
            sessionId: data.sessionId || docSnap.id.replace('pos-session-', '')
          });
        });
        // Sort descending by creation timestamp
        notifs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        callback(notifs);
      }, (err) => {
        if (onError) onError(err);
        else console.warn('[posService] Realtime admin notifications notice:', err);
      });
    } catch (err) {
      if (onError) onError(err);
      return () => {};
    }
  },

  /**
   * Realtime subscription to all active/open POS sessions (For admin and super_admin monitoring)
   */
  subscribeActiveSessions(
    callback: (sessions: PosSession[]) => void,
    onError?: (err: any) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'pos_sessions'),
        where('status', 'in', ['active', 'open'])
      );
      return onSnapshot(q, (snapshot) => {
        const live: PosSession[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as PosSession;
          if (data.status === 'active' || data.status === 'open') {
            live.push({
              ...data,
              id: docSnap.id,
              sessionId: data.sessionId || docSnap.id,
              items: Array.isArray(data.items) ? data.items : []
            });
          }
        });
        // Sort descending: newest activity / lastSeenAt first
        live.sort((a, b) => {
          const timeA = new Date(a.lastSeenAt || a.updated_at || a.startedAt || 0).getTime();
          const timeB = new Date(b.lastSeenAt || b.updated_at || b.startedAt || 0).getTime();
          return timeB - timeA;
        });
        callback(live);
      }, (err) => {
        if (onError) onError(err);
        else console.warn('[posService] Active sessions subscription note:', err);
      });
    } catch (err) {
      if (onError) onError(err);
      return () => {};
    }
  },

  /**
   * Realtime subscription to a single POS session document by ID
   */
  subscribeSession(
    sessionId: string,
    callback: (session: PosSession | null) => void,
    onError?: (err: any) => void
  ): () => void {
    if (!sessionId) {
      callback(null);
      return () => {};
    }
    try {
      const sessionRef = doc(db, 'pos_sessions', sessionId);
      return onSnapshot(sessionRef, (docSnap) => {
        if (!docSnap.exists()) {
          callback(null);
          return;
        }
        const data = docSnap.data() as PosSession;
        callback({
          ...data,
          id: docSnap.id,
          sessionId: data.sessionId || docSnap.id,
          items: Array.isArray(data.items) ? data.items : []
        });
      }, (err) => {
        if (onError) onError(err);
        else console.warn(`[posService] Session ${sessionId} subscription note:`, err);
      });
    } catch (err) {
      if (onError) onError(err);
      return () => {};
    }
  },

  /**
   * Realtime subscription to the scans subcollection for a given session
   */
  subscribeSessionScans(
    sessionId: string,
    callback: (scans: any[]) => void,
    onError?: (err: any) => void
  ): () => void {
    if (!sessionId) {
      callback([]);
      return () => {};
    }
    try {
      const scansRef = collection(db, 'pos_sessions', sessionId, 'scans');
      return onSnapshot(scansRef, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort descending by scanned_at
        list.sort((a, b) => {
          const timeA = new Date(a.scanned_at || 0).getTime();
          const timeB = new Date(b.scanned_at || 0).getTime();
          return timeB - timeA;
        });
        callback(list);
      }, (err) => {
        if (onError) onError(err);
        else console.warn(`[posService] Scans subscription note for session ${sessionId}:`, err);
      });
    } catch (err) {
      if (onError) onError(err);
      return () => {};
    }
  },

  /**
   * Mark a POS session notification as read by an admin user
   */
  async markNotificationRead(notificationId: string, adminUserId?: string): Promise<void> {
    if (!notificationId) return;
    try {
      const notifRef = doc(db, 'admin_notifications', notificationId);
      if (adminUserId) {
        await updateDoc(notifRef, {
          readBy: arrayUnion(adminUserId)
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[posService] Error marking notification read:', err);
    }
  },

  /**
   * Mark a POS session notification as dismissed by an admin user
   */
  async markNotificationDismissed(notificationId: string, adminUserId?: string): Promise<void> {
    if (!notificationId) return;
    try {
      const notifRef = doc(db, 'admin_notifications', notificationId);
      if (adminUserId) {
        await updateDoc(notifRef, {
          dismissedBy: arrayUnion(adminUserId)
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[posService] Error marking notification dismissed:', err);
    }
  },

  /**
   * Close / complete a user's POS session in Firestore
   */
  async closeUserSession(sessionId: string, userId?: string): Promise<void> {
    if (!sessionId) return;
    try {
      const nowIso = new Date().toISOString();
      const sessionRef = doc(db, 'pos_sessions', sessionId);
      await updateDoc(sessionRef, {
        status: 'completed',
        closed_at: nowIso,
        lastSeenAt: nowIso,
        updated_at: nowIso
      });

      if (userId) {
        try {
          localStorage.removeItem(`ksf_pos_user_session_${userId}`);
        } catch {}
      }
    } catch (err) {
      console.error('[posService] Error closing user session:', err);
    }
  },

  /**
   * Look up active session for a specific user (NO global fallback)
   */
  getUserActiveSession(userId: string): PosSession | null {
    if (!userId) return null;
    const active = sessionsCache.find(s => s.userId === userId && (s.status === 'active' || s.status === 'open'));
    return active || null;
  },

  /**
   * Backwards-compatible session getter: looks up the caller's active session without hardcoded pos-main
   */
  getActiveSession(userId?: string): PosSession | null {
    const targetUid = userId || auth.currentUser?.uid;
    if (targetUid) {
      const userSession = sessionsCache.find(s => s.userId === targetUid && (s.status === 'active' || s.status === 'open'));
      if (userSession) return userSession;
    }
    // Return the first active session if available, otherwise null
    const firstActive = sessionsCache.find(s => s.status === 'active' || s.status === 'open');
    return firstActive || null;
  },

  scanProductIntoSession(sessionId: string, productId: string): { success: boolean; message: string; session?: PosSession } {
    const sessionIndex = sessionsCache.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) {
      return { success: false, message: 'POS session not found' };
    }

    const product = productService.getProductById(productId);
    if (!product) {
      return { success: false, message: 'Product not found', session: sessionsCache[sessionIndex] };
    }

    if (product.stock <= 0) {
      return { success: false, message: `Product out of stock! Only ${product.stock} available.`, session: sessionsCache[sessionIndex] };
    }

    const session = { ...sessionsCache[sessionIndex] };
    session.items = Array.isArray(session.items) ? [...session.items] : [];
    const existingItemIndex = session.items.findIndex(item => item.productId === productId);

    if (existingItemIndex !== -1) {
      session.items[existingItemIndex] = {
        ...session.items[existingItemIndex],
        quantity: session.items[existingItemIndex].quantity + 1
      };
    } else {
      session.items.push({
        productId: product.id,
        name: product.name,
        price: product.discountPrice || product.price,
        quantity: 1
      });
    }

    const nowIso = new Date().toISOString();
    session.lastScanTime = nowIso;
    session.lastSeenAt = nowIso;
    session.updated_at = nowIso;
    sessionsCache[sessionIndex] = session;
    this.saveSessions(sessionsCache);

    return { success: true, message: `${product.name} scanned successfully!`, session };
  },

  updateSessionItemQuantity(sessionId: string, productId: string, quantity: number): PosSession | null {
    const sIdx = sessionsCache.findIndex(s => s.id === sessionId);
    if (sIdx !== -1) {
      const session = { ...sessionsCache[sIdx] };
      const currentItems = Array.isArray(session.items) ? session.items : [];
      if (quantity <= 0) {
        session.items = currentItems.filter(item => item.productId !== productId);
      } else {
        session.items = currentItems.map(item => item.productId === productId ? { ...item, quantity } : item);
      }
      const nowIso = new Date().toISOString();
      session.lastScanTime = nowIso;
      session.lastSeenAt = nowIso;
      session.updated_at = nowIso;
      sessionsCache[sIdx] = session;
      this.saveSessions(sessionsCache);
      return session;
    }
    return null;
  },

  clearSessionCart(sessionId: string): PosSession | null {
    const sIdx = sessionsCache.findIndex(s => s.id === sessionId);
    if (sIdx !== -1) {
      const nowIso = new Date().toISOString();
      const session = { 
        ...sessionsCache[sIdx], 
        items: [],
        lastScanTime: nowIso,
        lastSeenAt: nowIso,
        updated_at: nowIso
      };
      sessionsCache[sIdx] = session;
      this.saveSessions(sessionsCache);
      return session;
    }
    return null;
  },

  checkoutSession(sessionId: string, customerName: string, customerPhone: string): { success: boolean; order?: Order; message: string } {
    const sIdx = sessionsCache.findIndex(s => s.id === sessionId);
    if (sIdx === -1) {
      return { success: false, message: 'POS session not found' };
    }

    const session = sessionsCache[sIdx];
    const sessionItems = Array.isArray(session?.items) ? session.items : [];
    if (sessionItems.length === 0) {
      return { success: false, message: 'Cart is empty' };
    }

    // Verify and decrement stock
    const products = productService.getProducts();
    for (const item of sessionItems) {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) {
        return { success: false, message: `Product ${item.name} not found in inventory` };
      }
      if (prod.stock < item.quantity) {
        return { success: false, message: `Insufficient stock for ${prod.name}. Available: ${prod.stock}` };
      }
    }

    // Decrement stock & log inventory & stock movement
    for (const item of sessionItems) {
      const prod = products.find(p => p.id === item.productId)!;
      const prevStock = prod.stock;
      prod.stock -= item.quantity;
      productService.updateProduct(prod);
      
      productService.logInventory(
        prod.id,
        'sale',
        item.quantity,
        prevStock,
        prod.stock,
        `POS Sale - Session ${session.id}`
      );
      productService.logStockMovement({
        productId: prod.id,
        productName: prod.name,
        quantity: -item.quantity,
        type: 'sale',
        source: 'POS',
        performedBy: session.userName || 'POS Operator',
        previousStock: prevStock,
        newStock: prod.stock,
        reason: `POS Sale - User Session Checkout`
      });
    }

    // Create Order
    const totalAmount = sessionItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderId = 'POS-' + Math.floor(100000 + Math.random() * 900000);
    const nowIso = new Date().toISOString();
    const newOrder: Order = {
      id: orderId,
      customerName: customerName || 'In-Person Customer',
      customerPhone: customerPhone || 'Walk-In',
      address: 'In-Store Checkout',
      items: sessionItems.map(item => ({
        ...item,
        scannedQuantity: item.quantity
      })),
      totalAmount,
      status: 'delivered',
      order_source: 'POS',
      stock_deducted: true,
      createdAt: nowIso,
      paymentMethod: 'POS_In_Person',
      sessionType: 'POS',
      isPaid: true
    };

    // Update cache and Firestore
    ordersCache = [newOrder, ...ordersCache];
    setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(newOrder)).catch(console.error);

    // Clear session cart
    const updatedSession = { 
      ...session, 
      items: [],
      lastScanTime: nowIso,
      lastSeenAt: nowIso,
      updated_at: nowIso
    };
    sessionsCache[sIdx] = updatedSession;
    this.saveSessions(sessionsCache);

    return { success: true, order: newOrder, message: 'POS Sale checkout complete!' };
  },

  getOrders(): Order[] {
    return ordersCache;
  },

  getDraftOrders(): Order[] {
    return draftOrdersCache;
  },

  createOnlineOrder(order: Omit<Order, 'id' | 'createdAt' | 'status' | 'isPaid' | 'sessionType' | 'order_source' | 'stock_deducted'>): Order {
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const formattedItems = (order.items || []).map(item => {
      const prod = productService.getProductById(item.productId);
      return {
        ...item,
        scannedQuantity: 0,
        barcode: item.barcode || (prod ? prod.barcode : '')
      };
    });

    const newOrder: Order = {
      ...order,
      items: formattedItems,
      id: orderId,
      createdAt: new Date().toISOString(),
      status: 'pending',
      order_source: 'WEBSITE',
      stock_deducted: false,
      sessionType: 'Online',
      isPaid: false,
      analytics: {
        purchaseEventId: `purchase_${orderId}`,
        purchaseTracked: true,
        purchaseTrackedAt: new Date().toISOString()
      }
    };

    // Note: Stock is NOT deducted on online order creation.
    // Stock is only deducted when staff scans and confirms fulfillment in Admin Order Management.

    // Update cache and Firestore
    ordersCache = [newOrder, ...ordersCache];
    setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(newOrder)).catch(console.error);
    notifyOrderSubscribers();

    // Trigger real-time Slack Notification
    import('./slackNotificationService').then(({ slackNotificationService }) => {
      slackNotificationService.notifyNewOrder(newOrder).catch(console.warn);
    });

    return newOrder;
  },

  startFulfillment(orderId: string): { success: boolean; message: string; order?: Order } {
    const cleanId = orderId?.trim();
    const idx = ordersCache.findIndex(o => o.id === cleanId || o.id.toLowerCase() === cleanId?.toLowerCase());
    if (idx === -1) {
      return { success: false, message: 'Order not found' };
    }
    const order = { ...ordersCache[idx] };
    if (order.status !== 'pending' && order.status !== 'packing') {
      return { success: false, message: `Cannot start fulfillment for order with status "${order.status}".` };
    }

    order.status = 'packing';
    // Ensure all items have scannedQuantity initialized
    order.items = order.items.map(item => ({
      ...item,
      scannedQuantity: item.scannedQuantity || 0
    }));

    ordersCache[idx] = order;
    setDoc(doc(db, 'orders', order.id), sanitizeForFirestore(order)).catch(console.error);
    notifyOrderSubscribers();

    return { success: true, message: 'Fulfillment started! Order status updated to PACKING.', order };
  },

  verifyItemScan(orderId: string, scannedCode: string): {
    success: boolean;
    message: string;
    order?: Order;
    matchedProduct?: Product;
    isComplete?: boolean;
  } {
    const cleanId = orderId?.trim();
    const idx = ordersCache.findIndex(o => o.id === cleanId || o.id.toLowerCase() === cleanId?.toLowerCase());
    if (idx === -1) {
      return { success: false, message: 'Order not found' };
    }

    const order = { ...ordersCache[idx] };
    const products = productService.getProducts();
    const searchResult = findProductByScannedCode(products, scannedCode);
    const matchedProd = searchResult.product;

    if (!matchedProd) {
      return {
        success: false,
        message: `This product is not included in this order. (Unrecognized code: "${scannedCode}")`,
        order
      };
    }

    // Find item in order by productId or normalized barcode
    const itemIndex = order.items.findIndex(item => {
      if (item.productId === matchedProd.id) return true;
      if (item.barcode && matchedProd.barcode && item.barcode.trim() === matchedProd.barcode.trim()) return true;
      const itemProd = productService.getProductById(item.productId);
      if (itemProd && itemProd.barcodeNormalized && matchedProd.barcodeNormalized && itemProd.barcodeNormalized === matchedProd.barcodeNormalized) return true;
      return false;
    });

    if (itemIndex === -1) {
      return {
        success: false,
        message: 'This product is not included in this order.',
        order,
        matchedProduct: matchedProd
      };
    }

    const item = { ...order.items[itemIndex] };
    const currentScanned = item.scannedQuantity || 0;

    if (currentScanned >= item.quantity) {
      return {
        success: false,
        message: 'Required quantity already scanned.',
        order,
        matchedProduct: matchedProd
      };
    }

    // Increment scanned quantity
    item.scannedQuantity = currentScanned + 1;
    order.items = order.items.map((it, i) => i === itemIndex ? item : it);

    // Check if entire order is fully verified
    const isComplete = order.items.every(it => (it.scannedQuantity || 0) === it.quantity);

    ordersCache[idx] = order;
    setDoc(doc(db, 'orders', order.id), sanitizeForFirestore(order)).catch(console.error);
    notifyOrderSubscribers();

    return {
      success: true,
      message: `Verified: ${item.name} (${item.scannedQuantity}/${item.quantity})`,
      order,
      matchedProduct: matchedProd,
      isComplete
    };
  },

  confirmOrderFulfillment(orderId: string, staffName: string = 'Admin Staff'): { success: boolean; message: string; order?: Order } {
    const cleanId = orderId?.trim();
    const idx = ordersCache.findIndex(o => o.id === cleanId || o.id.toLowerCase() === cleanId?.toLowerCase());
    if (idx === -1) {
      return { success: false, message: 'Order not found' };
    }

    const order = { ...ordersCache[idx] };

    // Strict safety check 1: Duplicate stock deduction prevention
    if (order.stock_deducted) {
      return { success: false, message: 'Stock has already been deducted for this order. Duplicate deduction prevented.' };
    }

    // Strict safety check 2: All items must be fully scanned
    const incompleteItem = order.items.find(item => (item.scannedQuantity || 0) < item.quantity);
    if (incompleteItem) {
      return {
        success: false,
        message: `Cannot confirm fulfillment. Product "${incompleteItem.name}" requires ${incompleteItem.quantity} scanned units, but only ${incompleteItem.scannedQuantity || 0} scanned.`
      };
    }

    // Strict safety check 3: Database stock availability re-verification
    const products = productService.getProducts();
    for (const item of order.items) {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) {
        return { success: false, message: `Product "${item.name}" not found in inventory catalog.` };
      }
      if (prod.stock < item.quantity) {
        return {
          success: false,
          message: `Insufficient stock for "${prod.name}". Available in stock: ${prod.stock}, Required: ${item.quantity}. Fulfillment blocked.`
        };
      }
    }

    // All checks passed! Deduct stock atomically and log movements
    for (const item of order.items) {
      const prod = products.find(p => p.id === item.productId)!;
      const prevStock = prod.stock;
      prod.stock -= item.quantity;
      productService.updateProduct(prod);

      productService.logInventory(
        prod.id,
        'sale',
        item.quantity,
        prevStock,
        prod.stock,
        `Website Order Fulfillment - Order #${order.id}`
      );

      productService.logStockMovement({
        productId: prod.id,
        productName: prod.name,
        orderId: order.id,
        quantity: -item.quantity,
        type: 'sale',
        source: 'WEBSITE',
        performedBy: staffName,
        previousStock: prevStock,
        newStock: prod.stock,
        reason: `Website Order Verification & Fulfillment`
      });
    }

    // Mark order as fulfilled & stock deducted
    order.stock_deducted = true;
    order.status = 'delivered';
    order.isPaid = true;

    ordersCache[idx] = order;
    setDoc(doc(db, 'orders', order.id), sanitizeForFirestore(order)).catch(console.error);
    notifyOrderSubscribers();

    return {
      success: true,
      message: `Order #${order.id} verified and fulfilled successfully! Stock deducted and logged.`,
      order
    };
  },

  cancelOrder(orderId: string, reason: string = 'Cancelled by Staff', staffName: string = 'Admin Staff'): { success: boolean; message: string; order?: Order } {
    const cleanId = orderId?.trim();
    const idx = ordersCache.findIndex(o => o.id === cleanId || o.id.toLowerCase() === cleanId?.toLowerCase());
    if (idx === -1) {
      return { success: false, message: `Order "${orderId}" not found.` };
    }

    const order = { ...ordersCache[idx] };

    if (order.status === 'cancelled') {
      return { success: false, message: `Order #${order.id} is already cancelled.` };
    }

    // Check if stock was previously deducted
    if (order.stock_deducted) {
      // Prevent duplicate stock restoration
      if (order.stock_restored) {
        return { success: false, message: `Stock for order #${order.id} was already restored previously. Duplicate restoration prevented.` };
      }

      // Restore stock for all items
      const products = productService.getProducts();
      for (const item of order.items) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const prevStock = prod.stock;
          prod.stock += item.quantity;
          productService.updateProduct(prod);

          productService.logInventory(
            prod.id,
            'stock_in',
            item.quantity,
            prevStock,
            prod.stock,
            `Cancelled Order Return - #${order.id} (${reason})`
          );

          productService.logStockMovement({
            productId: prod.id,
            productName: prod.name,
            orderId: order.id,
            quantity: item.quantity,
            type: 'return',
            source: order.order_source || 'WEBSITE',
            performedBy: staffName,
            previousStock: prevStock,
            newStock: prod.stock,
            reason: `Order Cancelled Return - ${reason}`
          });
        }
      }

      order.stock_deducted = false;
      order.stock_restored = true;
    }

    order.status = 'cancelled';
    order.cancelReason = reason;
    ordersCache[idx] = order;
    setDoc(doc(db, 'orders', order.id), sanitizeForFirestore(order)).catch(console.error);
    notifyOrderSubscribers();

    // Trigger Refund analytics only if website order and actually cancelled
    if (order.order_source === 'WEBSITE') {
      import('./analyticsService').then(({ analytics }) => {
        analytics.trackRefund(order);
      }).catch(console.warn);
    }

    import('./slackNotificationService').then(({ slackNotificationService }) => {
      slackNotificationService.notifyOrderStatusChange(order, 'packing').catch(console.warn);
    });

    return {
      success: true,
      message: order.stock_restored
        ? `Order #${order.id} cancelled. Stock of ${order.items.reduce((s, i) => s + i.quantity, 0)} items restored to inventory.`
        : `Order #${order.id} cancelled. Stock was not deducted previously.`,
      order
    };
  },

  updateOrderStatus(orderId: string, status: Order['status']): Order | undefined {
    const cleanId = orderId?.trim();
    const index = ordersCache.findIndex(o => o.id === cleanId || o.id.toLowerCase() === cleanId?.toLowerCase());
    if (index !== -1) {
      const previousStatus = ordersCache[index].status;
      const updatedOrder = { ...ordersCache[index], status };
      if (status === 'delivered') {
        updatedOrder.isPaid = true;
      }
      ordersCache[index] = updatedOrder;
      setDoc(doc(db, 'orders', updatedOrder.id), sanitizeForFirestore(updatedOrder)).catch(console.error);
      notifyOrderSubscribers();

      if (previousStatus !== status) {
        import('./slackNotificationService').then(({ slackNotificationService }) => {
          slackNotificationService.notifyOrderStatusChange(updatedOrder, previousStatus).catch(console.warn);
        });
      }

      return updatedOrder;
    }
    return undefined;
  },

  updateOrderCourier(orderId: string, courierData: Order['courier']): Order | undefined {
    const index = ordersCache.findIndex(o => o.id === orderId);
    if (index !== -1) {
      const updatedOrder = { ...ordersCache[index], courier: courierData };
      ordersCache[index] = updatedOrder;
      setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(updatedOrder)).catch(console.error);
      notifyOrderSubscribers();
      return updatedOrder;
    }
    return undefined;
  },

  subscribe(callback: (orders: Order[]) => void): () => void {
    orderSubscribers.add(callback);
    callback(ordersCache);
    return () => {
      orderSubscribers.delete(callback);
    };
  }
};
