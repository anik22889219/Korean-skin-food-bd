import { 
  PosSession, 
  Order, 
  OrderItem,
  OrderStatus,
  Product, 
  PosAllowedRole, 
  PosDeviceType, 
  PosSessionNotification,
  PaymentTransaction,
  FinancialTransaction,
  PaymentMethodType,
  PaymentStatus
} from '../types';
import { productService } from './productService';
import { auth, db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, query, where, orderBy, limit, startAfter, addDoc, getDocs, getDoc, arrayUnion, runTransaction, writeBatch, deleteDoc } from 'firebase/firestore';
import { findProductByScannedCode } from '../utils/barcode';
import { getProductUnitPrice, aggregateProductQuantities } from '../utils/pricing';
import { queryClient } from '../lib/queryClient';
import { queryKeys } from '../lib/queryKeys';

export const ALLOWED_POS_ROLES: PosAllowedRole[] = ['admin', 'super_admin', 'inventory_manager'];

export interface PosCheckoutItemInput {
  productId: string;
  quantity: number;
  barcode?: string;
  name?: string;
  price?: number;
}

export interface PosCheckoutParams {
  sessionId: string;
  userId: string;
  userRole?: string;
  operatorName: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryArea?: 'inside' | 'outside' | 'pickup' | 'none';
  pricingMode?: 'retail' | 'wholesale' | 'cash';
  items: PosCheckoutItemInput[];
  orderId?: string;
  idempotencyKey?: string;
  paidAmount?: number;
  paymentMethod?: PaymentMethodType;
  accountCode?: string;
  notes?: string;
}

export interface PosCheckoutResult {
  success: boolean;
  order?: Order;
  message: string;
  orderId?: string;
  code?: 'INSUFFICIENT_STOCK' | 'PERMISSION_DENIED' | 'INVALID_SESSION' | 'EMPTY_CART' | 'PRODUCT_NOT_FOUND' | 'TRANSACTION_FAILED' | 'DUPLICATE_RESOLVED';
}

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

export function mapWholesaleOrderToOrder(ws: any): Order {
  const businessName = ws.customer?.businessName || '';
  const clientName = ws.customer?.customerName || ws.customer?.name || '';
  const deliveryName = ws.checkoutInfo?.deliveryName || '';
  
  let customerName = '';
  if (businessName && clientName && businessName.toLowerCase() !== clientName.toLowerCase()) {
    customerName = `${businessName} (${clientName})`;
  } else if (businessName) {
    customerName = businessName;
  } else if (clientName) {
    customerName = clientName;
  } else if (deliveryName) {
    customerName = `${deliveryName} (Wholesale)`;
  } else {
    customerName = 'Wholesale Customer';
  }

  const customerPhone = ws.customer?.contactNumber || ws.customer?.phone || ws.checkoutInfo?.deliveryPhone || '';
  const customerEmail = ws.customer?.email || '';
  const address = ws.checkoutInfo?.deliveryAddress || ws.customer?.businessAddress || ws.customer?.location || ws.customer?.address || 'Wholesale Delivery';

  const totalAmount = Number(ws.finalAmount ?? ((ws.totalWholesaleCost || 0) + (ws.deliveryCharge || 0)));
  const paidAmount = Number(ws.paidAmount ?? (ws.paymentStatus === 'paid' ? totalAmount : 0));
  const dueAmount = Number(ws.dueAmount ?? Math.max(0, totalAmount - paidAmount));
  const isPaid = dueAmount <= 0 || ws.paymentStatus === 'paid';

  const items: OrderItem[] = (ws.items || []).map((it: any) => {
    const qty = Math.max(1, Number(it.quantity || 1));
    const unitPrice = Number(
      it.wholesaleUnitPrice ?? 
      it.unitWholesalePrice ?? 
      it.wholesalePrice ?? 
      it.price ?? 
      (it.totalPrice ? it.totalPrice / qty : 0)
    );
    return {
      productId: it.productId,
      name: it.productName || it.name || 'Wholesale Item',
      price: unitPrice,
      quantity: qty,
      scannedQuantity: Number(it.scannedQuantity ?? (ws.status === 'delivered' ? qty : 0)),
      barcode: it.barcode || ''
    };
  });

  const rawStatus = String(ws.status || 'pending').toLowerCase();
  let normalizedStatus: OrderStatus = 'pending';
  if (rawStatus === 'confirmed' || rawStatus === 'processing') normalizedStatus = 'processing';
  else if (rawStatus === 'ready' || rawStatus === 'packing') normalizedStatus = 'packing';
  else if (rawStatus === 'shipped') normalizedStatus = 'shipped';
  else if (rawStatus === 'delivered') normalizedStatus = 'delivered';
  else if (rawStatus === 'cancelled') normalizedStatus = 'cancelled';
  else normalizedStatus = 'pending';

  return {
    id: ws.id || ws.orderNumber,
    customerName,
    customerPhone,
    customerEmail,
    customer_uid: ws.customer?.userId || ws.customer?.wholesaleCustomerId || ws.userId || '',
    address,
    items,
    totalAmount,
    discountAmount: 0,
    status: normalizedStatus,
    order_source: 'WHOLESALE',
    stock_deducted: ws.stock_deducted ?? ws.stockDeducted ?? true,
    stock_restored: ws.stock_restored ?? ws.stockRestored ?? false,
    cancelReason: ws.cancelReason,
    createdAt: ws.createdAt || new Date().toISOString(),
    paymentMethod: (ws.checkoutInfo?.checkoutType === 'COD' ? 'COD' : 'CREDIT_DUE') as any,
    sessionType: 'Online',
    isPaid,
    paymentStatus: isPaid ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
    totalPaid: paidAmount,
    dueAmount,
    paymentTransactions: ws.paymentTransactions || [],
    courier: ws.courier,
    notes: ws.notes || ws.checkoutInfo?.orderNote
  };
}

let retailOrdersCache: Order[] = [...DEFAULT_ORDERS];
let wholesaleOrdersCache: Order[] = [];
let ordersCache: Order[] = [...DEFAULT_ORDERS];
// Pure in-memory cache synchronized from Firestore — NOT the source of truth, NO hardcoded singleton pos-main
let sessionsCache: PosSession[] = [];

// Firestore real-time subscriptions
let draftOrdersCache: Order[] = [];

// Subscribers for real-time order synchronization
const orderSubscribers = new Set<(orders: Order[]) => void>();

function rebuildAndPublishOrders() {
  const merged = [...retailOrdersCache, ...wholesaleOrdersCache];
  merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  ordersCache = merged;
  notifyOrderSubscribers();
  try {
    queryClient.setQueryData(queryKeys.orders.recent(), merged);
    queryClient.setQueryData(queryKeys.orders.realtime(), merged);
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
  } catch {
    // Safe guard
  }
}

function notifyOrderSubscribers() {
  orderSubscribers.forEach(cb => {
    try {
      cb(ordersCache);
    } catch (e) {
      console.error('[posService] Order subscriber error:', e);
    }
  });
}

onSnapshot(query(collection(db, 'draft_orders'), orderBy('createdAt', 'desc'), limit(200)), (snapshot) => {
  const drafts: Order[] = [];
  snapshot.forEach((doc) => {
    drafts.push(doc.data() as Order);
  });
  draftOrdersCache = drafts;
  try {
    queryClient.setQueryData(queryKeys.orders.draftsRecent(), drafts);
    queryClient.setQueryData(queryKeys.orders.drafts(), drafts);
  } catch {
    // Safe guard
  }
}, (err) => {
  console.warn('[Firebase] draft_orders onSnapshot warning:', err);
});

onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(200)), (snapshot) => {
  const ords: Order[] = [];
  snapshot.forEach((docSnap) => {
    const raw = docSnap.data() as Order;
    const normOrder: Order = {
      ...raw,
      id: docSnap.id || raw.id,
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
    retailOrdersCache = ords;
    rebuildAndPublishOrders();
  }
}, (err) => {
  console.warn('[Firebase] orders onSnapshot warning:', err);
  if (err?.code === 'permission-denied' || err?.message?.includes('permission') || err?.message?.includes('Permission')) {
    handleFirestoreError(err, OperationType.GET, 'orders', false);
  }
});

// Real-time synchronization for Wholesale Orders
onSnapshot(query(collection(db, 'wholesale_orders'), orderBy('createdAt', 'desc'), limit(200)), (snapshot) => {
  const wsOrds: Order[] = [];
  snapshot.forEach((docSnap) => {
    const raw = { id: docSnap.id, ...docSnap.data() };
    const normOrder = mapWholesaleOrderToOrder(raw);
    wsOrds.push(normOrder);
  });
  wholesaleOrdersCache = wsOrds;
  rebuildAndPublishOrders();
}, (err) => {
  console.warn('[Firebase] wholesale_orders onSnapshot warning:', err);
  if (err?.code === 'permission-denied' || err?.message?.includes('permission') || err?.message?.includes('Permission')) {
    handleFirestoreError(err, OperationType.GET, 'wholesale_orders', false);
  }
});

// Initial fast bootstrap of wholesale orders
getDocs(query(collection(db, 'wholesale_orders'), orderBy('createdAt', 'desc'), limit(100))).then((snapshot) => {
  if (!snapshot.empty) {
    const wsOrds: Order[] = [];
    snapshot.forEach(docSnap => {
      wsOrds.push(mapWholesaleOrderToOrder({ id: docSnap.id, ...docSnap.data() }));
    });
    wholesaleOrdersCache = wsOrds;
    rebuildAndPublishOrders();
  }
}).catch((err) => {
  console.warn('[posService] Initial wholesale_orders fetch warning:', err);
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

        // Dispatch or refresh administrative realtime notification for this session
        const notifId = `pos-session-${activeSession.id}`;
        const notificationPayload: PosSessionNotification = {
          id: notifId,
          notificationId: notifId,
          type: 'POS_SESSION_STARTED',
          sessionId: activeSession.id,
          userId: activeSession.userId || userId,
          userName: activeSession.userName || userName || 'Store Staff',
          userRole: (activeSession.userRole || userRole || 'staff') as PosAllowedRole,
          deviceType: activeSession.deviceType || deviceType,
          createdAt: activeSession.startedAt || activeSession.created_at || nowIso,
          read: false,
          readBy: [],
          dismissedBy: []
        };
        setDoc(doc(db, 'admin_notifications', notifId), sanitizeForFirestore(notificationPayload), { merge: true }).catch(() => {});

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
   * Realtime subscription to POS session administrative notifications (For admin, super_admin, and inventory managers)
   */
  subscribeAdminNotifications(
    callback: (notifications: PosSessionNotification[]) => void,
    onError?: (err: any) => void
  ): () => void {
    try {
      let notifsFromAdminNotifs: PosSessionNotification[] = [];
      let notifsFromPosSessions: PosSessionNotification[] = [];

      const emitCombined = () => {
        const combinedMap = new Map<string, PosSessionNotification>();

        // First add pos_sessions as notifications
        notifsFromPosSessions.forEach(n => {
          combinedMap.set(n.sessionId, n);
        });

        // Overlay explicit admin_notifications
        notifsFromAdminNotifs.forEach(n => {
          combinedMap.set(n.sessionId, n);
        });

        const list = Array.from(combinedMap.values());
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        callback(list);
      };

      const unsubAdminNotifs = onSnapshot(collection(db, 'admin_notifications'), (snapshot) => {
        const notifs: PosSessionNotification[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as PosSessionNotification;
          if (data.type === 'POS_SESSION_STARTED' || !data.type) {
            notifs.push({
              ...data,
              id: docSnap.id,
              notificationId: data.notificationId || docSnap.id,
              sessionId: data.sessionId || docSnap.id.replace('pos-session-', '')
            });
          }
        });
        notifsFromAdminNotifs = notifs;
        emitCombined();
      }, (err) => {
        if (onError) onError(err);
        else console.warn('[posService] Realtime admin notifications notice:', err);
      });

      const unsubPosSessions = onSnapshot(collection(db, 'pos_sessions'), (snapshot) => {
        const notifs: PosSessionNotification[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as PosSession;
          if (data.status === 'active' || data.status === 'open' || !data.status) {
            const notifId = `pos-session-${docSnap.id}`;
            notifs.push({
              id: notifId,
              notificationId: notifId,
              type: 'POS_SESSION_STARTED',
              sessionId: docSnap.id,
              userId: data.userId || '',
              userName: data.userName || data.operatorName || 'Store Staff',
              userRole: data.userRole || 'staff',
              deviceType: data.deviceType || 'desktop',
              createdAt: data.startedAt || data.created_at || new Date().toISOString(),
              read: false,
              readBy: [],
              dismissedBy: []
            });
          }
        });
        notifsFromPosSessions = notifs;
        emitCombined();
      }, (err) => {
        if (onError) onError(err);
        else console.warn('[posService] Realtime pos_sessions notification fallback notice:', err);
      });

      return () => {
        unsubAdminNotifs();
        unsubPosSessions();
      };
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

  /**
   * Process POS Checkout using an Atomic Firestore Transaction.
   * Ensures stock re-validation, idempotent order creation, atomic stock deduction,
   * single inventory log, single stock movement, and post-commit cart finalization.
   */
  async processPosCheckout(params: PosCheckoutParams): Promise<PosCheckoutResult> {
    const {
      sessionId,
      userId,
      userRole,
      operatorName,
      customerName,
      customerPhone,
      customerAddress,
      deliveryArea = 'none',
      pricingMode = 'retail',
      items,
      idempotencyKey
    } = params;

    // 1. Basic validation
    if (!sessionId) {
      return { success: false, message: 'POS session ID is required.', code: 'INVALID_SESSION' };
    }
    if (!userId) {
      return { success: false, message: 'Authenticated user ID is required.', code: 'PERMISSION_DENIED' };
    }
    if (!items || items.length === 0) {
      return { success: false, message: 'Cart cannot be empty for checkout.', code: 'EMPTY_CART' };
    }

    // Role validation
    if (userRole && !isAllowedPosRole(userRole)) {
      return { success: false, message: 'User does not possess an authorized POS checkout role.', code: 'PERMISSION_DENIED' };
    }

    // Deterministic or stable Order ID & Idempotency Key
    const orderId = params.orderId || ('POS-' + Math.floor(100000 + Math.random() * 900000));
    const effectiveIdempotencyKey = idempotencyKey || `pos_${orderId}_${Date.now()}`;

    // 2. Try Authoritative Server-Side Checkout Endpoint First
    try {
      const response = await fetch('/api/functions/posCheckout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          userRole,
          operatorName,
          customerName: customerName ? customerName.trim() : undefined,
          customerPhone: customerPhone ? customerPhone.trim() : undefined,
          customerAddress: customerAddress ? customerAddress.trim() : undefined,
          deliveryArea,
          pricingMode,
          items,
          orderId,
          idempotencyKey: effectiveIdempotencyKey,
          paidAmount: params.paidAmount !== undefined ? Number(params.paidAmount) : undefined,
          paymentMethod: params.paymentMethod,
          accountCode: params.accountCode,
          notes: params.notes
        })
      });

      const data = await response.json();
      if (response.ok && data.success && data.order) {
        const committedOrder = data.order as Order;

        // Post-Checkout Cart Cleanup & Cache Sync
        try {
          const sessionRef = doc(db, 'pos_sessions', sessionId);
          updateDoc(sessionRef, {
            items: [],
            totalScannedItems: 0,
            lastSeenAt: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).catch(() => {});

          const scansColRef = collection(db, 'pos_sessions', sessionId, 'scans');
          const scansSnapshot = await getDocs(scansColRef);
          if (!scansSnapshot.empty) {
            const batch = writeBatch(db);
            scansSnapshot.forEach((docSnap) => batch.delete(docSnap.ref));
            await batch.commit();
          }
        } catch (cleanupErr) {
          console.warn('[posService] Non-critical warning clearing session scans after checkout:', cleanupErr);
        }

        if (!ordersCache.some(o => o.id === committedOrder.id)) {
          ordersCache = [committedOrder, ...ordersCache];
          notifyOrderSubscribers();
        }

        import('./slackNotificationService').then(({ slackNotificationService }) => {
          slackNotificationService.notifyNewOrder(committedOrder).catch(console.warn);
        }).catch(() => {});

        return {
          success: true,
          order: committedOrder,
          orderId: committedOrder.id,
          message: data.message || `Order #${committedOrder.id} completed successfully!`
        };
      } else if (response.status === 400 && data.error && !data.error.includes('fetch')) {
        // Explicit business logic rejection from server
        let code: PosCheckoutResult['code'] = 'TRANSACTION_FAILED';
        if (data.error.includes('Insufficient stock')) code = 'INSUFFICIENT_STOCK';
        else if (data.error.includes('Unauthorized') || data.error.includes('permission')) code = 'PERMISSION_DENIED';
        else if (data.error.includes('not found') || data.error.includes('does not exist')) code = 'PRODUCT_NOT_FOUND';
        else if (data.error.includes('session')) code = 'INVALID_SESSION';

        return {
          success: false,
          message: data.error,
          code
        };
      }
    } catch (apiErr) {
      console.warn('[posService] Server API unavailable, executing strict atomic client transaction:', apiErr);
    }

    try {
      // 3. Strict Multi-Document Atomic Firestore Transaction Fallback
      // Guarantees simultaneous Order creation, Stock deduction, Inventory log, Stock movement,
      // and Financial ledger records with zero partial writes on failure.
      const committedOrder = await runTransaction(db, async (transaction) => {
        // =========================================================================
        // --- STEP A: STRICT READS (All reads MUST occur before ANY writes) ---
        // =========================================================================
        
        // A.1 Verify Session & Ownership (Auto-provision missing session document)
        const sessionRef = doc(db, 'pos_sessions', sessionId);
        const sessionDoc = await transaction.get(sessionRef);
        if (!sessionDoc.exists()) {
          transaction.set(sessionRef, sanitizeForFirestore({
            id: sessionId,
            sessionId: sessionId,
            userId: userId || 'pos-operator',
            userName: operatorName || 'Store Staff',
            userRole: userRole || 'inventory_manager',
            status: 'active',
            items: [],
            totalScannedItems: 0,
            created_at: new Date().toISOString(),
            lastSeenAt: new Date().toISOString()
          }));
        } else {
          const sessionData = sessionDoc.data();
          if (sessionData.userId && sessionData.userId !== userId && (!userRole || !isAllowedPosRole(userRole))) {
            throw new Error('Unauthorized: POS session does not belong to the authenticated user.');
          }
        }

        // A.2 Idempotency Check (Check if order or idempotency lock already committed)
        const orderRef = doc(db, 'orders', orderId);
        const existingOrderDoc = await transaction.get(orderRef);
        if (existingOrderDoc.exists()) {
          return existingOrderDoc.data() as Order;
        }

        const idempRef = doc(db, 'payment_idempotency', effectiveIdempotencyKey);
        const existingIdempDoc = await transaction.get(idempRef);
        if (existingIdempDoc.exists()) {
          const idempData = existingIdempDoc.data();
          if (idempData?.orderId && idempData.orderId !== orderId) {
            const priorOrderRef = doc(db, 'orders', idempData.orderId);
            const priorOrderDoc = await transaction.get(priorOrderRef);
            if (priorOrderDoc.exists()) {
              return priorOrderDoc.data() as Order;
            }
          }
        }

        // A.3 Fetch and Validate all Products & Current Stocks from Firestore Snapshots
        interface ValidatedProductSnapshot {
          ref: any;
          data: Product;
          currentStock: number;
          newStock: number;
          quantity: number;
          unitPrice: number;
          barcode?: string;
        }

        const validatedProducts: ValidatedProductSnapshot[] = [];

        // Aggregate item quantities per product to prevent line-splitting bypass and validate aggregate stock
        const aggregatedQuantities = aggregateProductQuantities(items);

        for (const item of items) {
          if (!item.productId) {
            throw new Error('Invalid cart item: missing product ID.');
          }
          if (!item.quantity || item.quantity <= 0) {
            throw new Error(`Invalid item quantity (${item.quantity}) for product "${item.name || item.productId}".`);
          }

          const rawPId = String(item.productId).trim();
          const resolvedProd = productService.getProductByBarcode(rawPId) || productService.getProductById(rawPId);
          const canonicalProductId = resolvedProd ? resolvedProd.id : rawPId;

          const prodRef = doc(db, 'products', canonicalProductId);
          const prodDoc = await transaction.get(prodRef);

          if (!prodDoc.exists()) {
            throw new Error(`Product "${item.name || item.productId}" does not exist in store catalog.`);
          }

          const prodData = { id: prodDoc.id, ...prodDoc.data() } as Product;
          const currentStock = Number(prodData.stock ?? 0);
          const totalRequestedQtyForProd = aggregatedQuantities[item.productId] || aggregatedQuantities[canonicalProductId] || item.quantity;

          // Atomic stock ceiling guard against aggregate requested quantity
          if (currentStock < totalRequestedQtyForProd) {
            throw new Error(
              `Insufficient stock for "${prodData.name}". Available in stock: ${currentStock}, Total Requested: ${totalRequestedQtyForProd}.`
            );
          }

          // Authoritative price calculation using total aggregated quantity for tier calculation and strict wholesale check
          const unitPrice = getProductUnitPrice(prodData, pricingMode, totalRequestedQtyForProd, pricingMode === 'wholesale');

          validatedProducts.push({
            ref: prodRef,
            data: prodData,
            currentStock,
            newStock: currentStock - item.quantity,
            quantity: item.quantity,
            unitPrice,
            barcode: item.barcode || prodData.barcode
          });
        }

        // =========================================================================
        // --- STEP B: ATOMIC WRITES (Order, Stock Deductions, and Ledgers) ---
        // =========================================================================
        
        // B.1 Calculate final billing totals
        const itemsSubtotal = validatedProducts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0);
        const deliveryCharge = deliveryArea === 'inside' ? 60 : deliveryArea === 'outside' ? 120 : 0;
        const totalAmount = itemsSubtotal + (validatedProducts.length > 0 ? deliveryCharge : 0);
        const nowIso = new Date().toISOString();

        // Calculate payment, due, and change
        const tendered = params.paidAmount !== undefined ? Number(params.paidAmount) : totalAmount;
        const totalPaid = Math.max(0, Math.min(tendered, totalAmount));
        const dueAmount = Math.max(0, totalAmount - totalPaid);
        const changeAmount = Math.max(0, tendered - totalAmount);
        const paymentStatus: PaymentStatus = dueAmount === 0 ? 'PAID' : totalPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
        const method: PaymentMethodType = params.paymentMethod || (dueAmount === totalAmount ? 'CREDIT_DUE' : 'CASH');
        
        const accountCode = params.accountCode || (
          method === 'BKASH' ? 'BKASH_MERCHANT' :
          method === 'NAGAD' ? 'NAGAD_MERCHANT' :
          method === 'CARD' || method === 'BANK_TRANSFER' ? 'BRAC_BANK' :
          'CASH_REGISTER'
        );

        // Estimate COGS
        const cogsAmount = validatedProducts.reduce((sum, p) => {
          const unitCost = Number(p.data.wholesalePrice || p.data.costPrice || Math.round(p.unitPrice * 0.58));
          return sum + (unitCost * p.quantity);
        }, 0);
        const grossProfit = Math.max(0, totalAmount - cogsAmount);

        const paymentTxs: PaymentTransaction[] = [];
        let payTxId = '';

        if (totalPaid > 0) {
          payTxId = 'PAY-' + Math.floor(100000 + Math.random() * 900000);
          const payTx: PaymentTransaction = {
            id: payTxId,
            orderId,
            type: 'POS_PAYMENT',
            method,
            amount: totalPaid,
            note: params.notes || `POS Checkout tender ৳${totalPaid} (${method})`,
            receivedBy: operatorName,
            receivedAt: nowIso,
            source: 'POS',
            idempotencyKey: effectiveIdempotencyKey,
            accountCode,
            customerPhone: customerPhone || 'Walk-In',
            customerName: customerName || 'In-Person Customer'
          };
          paymentTxs.push(payTx);

          // Write Payment Transaction document
          const payDocRef = doc(db, 'payment_transactions', payTxId);
          transaction.set(payDocRef, sanitizeForFirestore(payTx));

          // Write Financial Transaction (Revenue Ledger)
          const finTxId = 'FIN-REV-' + Math.floor(100000 + Math.random() * 900000);
          const finDocRef = doc(db, 'financial_transactions', finTxId);
          const finTx: FinancialTransaction = {
            id: finTxId,
            transactionType: 'MONEY_IN',
            category: 'REVENUE',
            amount: totalPaid,
            date: nowIso.split('T')[0],
            accountCode: accountCode as any,
            description: `POS Checkout Revenue - Order #${orderId} (${method})`,
            performedBy: operatorName,
            referenceType: 'ORDER',
            referenceId: orderId,
            createdAt: nowIso
          };
          transaction.set(finDocRef, sanitizeForFirestore(finTx));

          // Write Idempotency Lock
          transaction.set(idempRef, sanitizeForFirestore({
            idempotencyKey: effectiveIdempotencyKey,
            orderId,
            amount: totalPaid,
            payTxId,
            createdAt: nowIso
          }));
        }

        // B.2 Construct Authoritative Order
        const newOrder: Order = {
          id: orderId,
          customerName: (customerName || '').trim() || 'In-Person Customer',
          customerPhone: (customerPhone || '').trim() || 'Walk-In',
          address: (customerAddress || '').trim()
            ? `${customerAddress!.trim()} (${deliveryArea === 'inside' ? 'Inside Dhaka' : deliveryArea === 'outside' ? 'Outside Dhaka' : 'In-Store Checkout'})`
            : 'In-Store Checkout Counter',
          items: validatedProducts.map((p) => ({
            productId: p.data.id,
            name: p.data.name,
            price: p.unitPrice,
            quantity: p.quantity,
            scannedQuantity: p.quantity,
            barcode: p.barcode
          })),
          totalAmount,
          status: 'delivered',
          order_source: 'POS',
          stock_deducted: true,
          createdAt: nowIso,
          paymentMethod: method,
          sessionType: 'POS',
          isPaid: paymentStatus === 'PAID',
          paymentStatus,
          totalPaid,
          dueAmount,
          changeAmount,
          cogsAmount,
          grossProfit,
          paymentTransactions: paymentTxs
        };

        // B.3 Commit Order Document
        transaction.set(orderRef, sanitizeForFirestore(newOrder));

        // B.4 Commit Stock Deductions, Inventory Logs, and Stock Movements
        for (const p of validatedProducts) {
          // 1. Decrement product stock in Firestore
          transaction.update(p.ref, {
            stock: p.newStock,
            updated_at: nowIso
          });

          // 2. Add inventory log document
          const logRef = doc(collection(db, 'inventory_logs'));
          transaction.set(logRef, sanitizeForFirestore({
            id: logRef.id,
            productId: p.data.id,
            productName: p.data.name,
            type: 'sale',
            quantity: p.newStock,
            change: -p.quantity,
            prevStock: p.currentStock,
            newStock: p.newStock,
            note: `POS Checkout - Order #${orderId}`,
            source: 'POS',
            orderId,
            sessionId,
            userId,
            performedBy: operatorName,
            timestamp: nowIso,
            createdAt: nowIso
          }));

          // 3. Add stock movement document
          const movementRef = doc(collection(db, 'stock_movements'));
          transaction.set(movementRef, sanitizeForFirestore({
            id: movementRef.id,
            productId: p.data.id,
            productName: p.data.name,
            orderId,
            quantity: -p.quantity,
            type: 'sale',
            source: 'POS',
            performedBy: operatorName,
            previousStock: p.currentStock,
            newStock: p.newStock,
            reason: 'POS In-Store Checkout',
            sessionId,
            timestamp: nowIso,
            createdAt: nowIso
          }));
        }

        return newOrder;
      });

      // 3. Post-Transaction Cart Cleanup & Local Cache Update
      try {
        const sessionRef = doc(db, 'pos_sessions', sessionId);
        updateDoc(sessionRef, {
          items: [],
          totalScannedItems: 0,
          lastSeenAt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }).catch(() => {});

        // Clear scans subcollection for this POS session in Firestore
        const scansColRef = collection(db, 'pos_sessions', sessionId, 'scans');
        const scansSnapshot = await getDocs(scansColRef);
        if (!scansSnapshot.empty) {
          const batch = writeBatch(db);
          scansSnapshot.forEach((docSnap) => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
        }
      } catch (cleanupErr) {
        console.warn('[posService] Non-critical warning clearing session scans after checkout:', cleanupErr);
      }

      // Update local orders cache
      if (!ordersCache.some(o => o.id === committedOrder.id)) {
        ordersCache = [committedOrder, ...ordersCache];
        notifyOrderSubscribers();
      }

      // Trigger Slack notification asynchronously
      import('./slackNotificationService').then(({ slackNotificationService }) => {
        slackNotificationService.notifyNewOrder(committedOrder).catch(console.warn);
      }).catch(() => {});

      return {
        success: true,
        order: committedOrder,
        orderId: committedOrder.id,
        message: `Order #${committedOrder.id} completed successfully!`
      };
    } catch (err: any) {
      console.error('[posService] processPosCheckout transaction failed:', err);
      const errMsg = err?.message || 'Checkout failed due to transaction conflict or error.';
      let code: PosCheckoutResult['code'] = 'TRANSACTION_FAILED';
      if (errMsg.includes('Insufficient stock')) {
        code = 'INSUFFICIENT_STOCK';
      } else if (errMsg.includes('Unauthorized') || errMsg.includes('permission')) {
        code = 'PERMISSION_DENIED';
      } else if (errMsg.includes('not found') || errMsg.includes('does not exist')) {
        code = 'PRODUCT_NOT_FOUND';
      } else if (errMsg.includes('session')) {
        code = 'INVALID_SESSION';
      }

      return {
        success: false,
        message: errMsg,
        code
      };
    }
  },

  /**
   * Backwards-compatible session checkout wrapper
   */
  async checkoutSession(sessionId: string, customerName: string, customerPhone: string): Promise<{ success: boolean; order?: Order; message: string }> {
    const sIdx = sessionsCache.findIndex(s => s.id === sessionId);
    if (sIdx === -1) {
      return { success: false, message: 'POS session not found' };
    }
    const session = sessionsCache[sIdx];
    const sessionItems = Array.isArray(session?.items) ? session.items : [];
    if (sessionItems.length === 0) {
      return { success: false, message: 'Cart is empty' };
    }

    const res = await this.processPosCheckout({
      sessionId,
      userId: session.userId || auth.currentUser?.uid || '',
      userRole: session.userRole,
      operatorName: session.userName || 'POS Operator',
      customerName,
      customerPhone,
      items: sessionItems.map(it => ({
        productId: it.productId,
        quantity: it.quantity,
        name: it.name,
        price: it.price
      }))
    });

    return {
      success: res.success,
      order: res.order,
      message: res.message
    };
  },

  getOrders(): Order[] {
    return ordersCache;
  },

  async fetchHistoricalOrders(options: {
    limitCount?: number;
    startAfterCreatedAt?: string;
    status?: string;
    sessionType?: 'POS' | 'ONLINE';
    source?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<Order[]> {
    const { limitCount = 50, startAfterCreatedAt, status, sessionType, source, startDate, endDate } = options;
    try {
      let q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      if (status && status !== 'all') {
        q = query(q, where('status', '==', status));
      }
      const resolvedSessionType = sessionType || (source === 'POS' ? 'POS' : (source === 'WEBSITE' || source === 'ONLINE' ? 'ONLINE' : undefined));
      if (resolvedSessionType) {
        q = query(q, where('sessionType', '==', resolvedSessionType));
      }
      if (startAfterCreatedAt) {
        q = query(q, startAfter(startAfterCreatedAt));
      }
      q = query(q, limit(limitCount));
      const snap = await getDocs(q);
      const list: Order[] = [];
      snap.forEach((d) => {
        const raw = d.data() as Order;
        let match = true;
        if (startDate && new Date(raw.createdAt).getTime() < new Date(startDate).getTime()) match = false;
        if (endDate && new Date(raw.createdAt).getTime() > new Date(endDate).getTime()) match = false;
        if (match) {
          list.push({
            ...raw,
            id: d.id || raw.id,
            order_source: raw.order_source || (raw.sessionType === 'POS' ? 'POS' : 'WEBSITE'),
            stock_deducted: raw.stock_deducted ?? (raw.status === 'delivered' || raw.status === 'processing' || raw.status === 'shipped'),
            items: (raw.items || []).map(item => ({
              ...item,
              scannedQuantity: item.scannedQuantity ?? (raw.status === 'delivered' ? item.quantity : 0)
            }))
          });
        }
      });
      return list;
    } catch (err) {
      console.warn('[posService] fetchHistoricalOrders error:', err);
      return [];
    }
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

    const totalAmt = Number(order.totalAmount || 0);
    const estimatedCogs = formattedItems.reduce((sum, it) => {
      const p = productService.getProductById(it.productId);
      const unitCost = Number(p?.wholesalePrice || p?.costPrice || Math.round((it.price || 0) * 0.58));
      return sum + (unitCost * it.quantity);
    }, 0);

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
      paymentStatus: 'UNPAID',
      totalPaid: 0,
      dueAmount: totalAmt,
      cogsAmount: estimatedCogs,
      grossProfit: Math.max(0, totalAmt - estimatedCogs),
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
    if (order.order_source === 'WHOLESALE') {
      updateDoc(doc(db, 'wholesale_orders', order.id), {
        status: 'packing',
        items: order.items,
        updatedAt: new Date().toISOString()
      }).catch(console.error);
    } else {
      setDoc(doc(db, 'orders', order.id), sanitizeForFirestore(order)).catch(console.error);
    }
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
    if (order.order_source === 'WHOLESALE') {
      updateDoc(doc(db, 'wholesale_orders', order.id), {
        items: order.items,
        updatedAt: new Date().toISOString()
      }).catch(console.error);
    } else {
      setDoc(doc(db, 'orders', order.id), sanitizeForFirestore(order)).catch(console.error);
    }
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
    const isWholesale = order.order_source === 'WHOLESALE';

    // Strict safety check 1: Duplicate stock deduction prevention
    if (order.stock_deducted && !isWholesale) {
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

    if (!isWholesale) {
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
    } else {
      // For wholesale orders, stock was already deducted at order creation.
      // Log fulfillment confirmation
      productService.logStockMovement({
        productId: order.items[0]?.productId || 'WHOLESALE',
        productName: order.items[0]?.name || 'Wholesale Package',
        orderId: order.id,
        quantity: 0,
        type: 'adjustment',
        source: 'WHOLESALE',
        performedBy: staffName,
        previousStock: 0,
        newStock: 0,
        reason: `Wholesale Order Verification & Fulfillment Confirmed`
      });
    }

    // Mark order as fulfilled & verified
    order.stock_deducted = true;
    order.status = 'delivered';
    if (!isWholesale) {
      order.isPaid = true;
    }

    ordersCache[idx] = order;
    if (isWholesale) {
      updateDoc(doc(db, 'wholesale_orders', order.id), {
        status: 'delivered',
        stock_deducted: true,
        items: order.items,
        fulfilledAt: new Date().toISOString(),
        fulfilledBy: staffName,
        updatedAt: new Date().toISOString()
      }).catch(console.error);
    } else {
      setDoc(doc(db, 'orders', order.id), sanitizeForFirestore(order)).catch(console.error);
    }
    notifyOrderSubscribers();

    return {
      success: true,
      message: isWholesale
        ? `Wholesale Order #${order.id} verified and fulfilled successfully!`
        : `Order #${order.id} verified and fulfilled successfully! Stock deducted and logged.`,
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

    if (order.order_source === 'WHOLESALE') {
      updateDoc(doc(db, 'wholesale_orders', order.id), {
        status: 'cancelled',
        cancelReason: reason,
        cancelledAt: new Date().toISOString(),
        cancelledBy: staffName,
        stock_restored: true,
        stock_deducted: false,
        updatedAt: new Date().toISOString()
      }).catch(console.error);

      const custId = order.customer_uid;
      if (custId) {
        getDoc(doc(db, 'wholesale_customers', custId)).then(snap => {
          if (snap.exists()) {
            const cData = snap.data();
            const newPurchase = Math.max(0, Number(cData.totalWholesalePurchase || 0) - order.totalAmount);
            const newDue = Math.max(0, newPurchase - Number(cData.totalPaid || 0));
            updateDoc(doc(db, 'wholesale_customers', custId), {
              totalWholesalePurchase: newPurchase,
              totalDue: newDue,
              updatedAt: new Date().toISOString()
            }).catch(console.error);
          }
        }).catch(console.error);
      }
    } else {
      setDoc(doc(db, 'orders', order.id), sanitizeForFirestore(order)).catch(console.error);
    }
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

      if (updatedOrder.order_source === 'WHOLESALE') {
        updateDoc(doc(db, 'wholesale_orders', cleanId), {
          status,
          updatedAt: new Date().toISOString()
        }).catch(console.error);
      } else {
        setDoc(doc(db, 'orders', updatedOrder.id), sanitizeForFirestore(updatedOrder)).catch(console.error);
      }
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

      if (updatedOrder.order_source === 'WHOLESALE') {
        updateDoc(doc(db, 'wholesale_orders', orderId), {
          courier: courierData,
          updatedAt: new Date().toISOString()
        }).catch(console.error);
      } else {
        setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(updatedOrder)).catch(console.error);
      }
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
