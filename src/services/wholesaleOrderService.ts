import { 
  WholesaleOrder, 
  WholesaleOrderStatus, 
  WholesaleOrderProduct, 
  WholesaleOrderCustomer, 
  WholesaleOrderCheckoutInfo 
} from '../types';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  setDoc,
  updateDoc 
} from 'firebase/firestore';

export interface CreateWholesaleOrderItemInput {
  productId: string;
  quantity: number;
  customCodPrice?: number;
  CODUnitPrice?: number;
  codPrice?: number;
  barcode?: string;
  name?: string;
}

export interface CreateWholesaleOrderParams {
  userId: string;
  customer?: Partial<WholesaleOrderCustomer>;
  items: CreateWholesaleOrderItemInput[];
  checkoutInfo: {
    checkoutType: 'COD' | 'PARCEL' | 'COD_DIRECT' | 'PARCEL_COURIER';
    deliveryName?: string;
    deliveryPhone?: string;
    deliveryAddress?: string;
    parcelId?: string;
    velouriaId?: string;
    codPrice?: number | string;
    orderNote?: string;
  };
  deliveryCharge?: number;
  idempotencyKey?: string;
  notes?: string;
  orderSource?: string;
}

export interface CreateWholesaleOrderResult {
  success: boolean;
  order?: WholesaleOrder;
  orderId?: string;
  orderNumber?: string;
  message?: string;
  error?: string;
}

export const wholesaleOrderService = {
  /**
   * Authoritative server-side creation of wholesale orders.
   * Invokes /api/wholesale/orders/create with full stock validation and server pricing.
   */
  async createWholesaleOrder(params: CreateWholesaleOrderParams): Promise<WholesaleOrder> {
    if (!params.userId) {
      throw new Error('User ID is required to create a wholesale order.');
    }

    if (!params.items || params.items.length === 0) {
      throw new Error('Cannot submit an empty wholesale cart.');
    }

    // Call server API for authoritative calculation and persistence
    const response = await fetch('/api/wholesale/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: params.userId,
        customer: params.customer,
        items: params.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          customCodPrice: item.customCodPrice !== undefined ? Number(item.customCodPrice) : undefined,
          CODUnitPrice: item.CODUnitPrice !== undefined ? Number(item.CODUnitPrice) : undefined,
          codPrice: item.codPrice !== undefined ? Number(item.codPrice) : undefined
        })),
        checkoutInfo: {
          ...params.checkoutInfo,
          checkoutType: params.checkoutInfo.checkoutType === 'COD_DIRECT' ? 'COD' : (params.checkoutInfo.checkoutType === 'PARCEL_COURIER' ? 'PARCEL' : params.checkoutInfo.checkoutType),
          codPrice: params.checkoutInfo.codPrice !== undefined ? Number(params.checkoutInfo.codPrice) : 0
        },
        deliveryCharge: params.deliveryCharge || 0,
        idempotencyKey: params.idempotencyKey || `ws-idem-${params.userId}-${Date.now()}`,
        notes: params.notes,
        orderSource: params.orderSource || 'wholesale_portal'
      })
    });

    const data: CreateWholesaleOrderResult = await response.json();

    if (!response.ok || !data.success || !data.order) {
      const errorMsg = data.error || data.message || `Server responded with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data.order;
  },

  /**
   * Fetch wholesale orders for a customer or all orders for staff
   */
  async getWholesaleOrders(userId?: string): Promise<WholesaleOrder[]> {
    try {
      const url = userId ? `/api/wholesale/orders?userId=${encodeURIComponent(userId)}` : '/api/wholesale/orders';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.orders)) {
          return data.orders as WholesaleOrder[];
        }
      }
    } catch (err) {
      console.warn('[WholesaleOrderService] Server API fetch failed, falling back to direct Firestore query:', err);
    }

    // Direct Firestore fallback
    try {
      const ordersCol = collection(db, 'wholesale_orders');
      let q = query(ordersCol, orderBy('createdAt', 'desc'));
      if (userId) {
        q = query(ordersCol, where('customer.userId', '==', userId), orderBy('createdAt', 'desc'));
      }
      const snap = await getDocs(q);
      const orders: WholesaleOrder[] = [];
      snap.forEach(docSnap => {
        orders.push({ id: docSnap.id, ...docSnap.data() } as WholesaleOrder);
      });
      return orders;
    } catch (firestoreErr) {
      console.error('[WholesaleOrderService] Firestore query error:', firestoreErr);
      handleFirestoreError(firestoreErr, OperationType.GET, 'wholesale_orders', false);
      return [];
    }
  },

  /**
   * Fetch single wholesale order detail
   */
  async getWholesaleOrder(orderId: string): Promise<WholesaleOrder | null> {
    if (!orderId) return null;
    try {
      const response = await fetch(`/api/wholesale/orders/${encodeURIComponent(orderId)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.order) {
          return data.order as WholesaleOrder;
        }
      }
    } catch (err) {
      console.warn('[WholesaleOrderService] Server API get failed, falling back to Firestore doc:', err);
    }

    try {
      const docRef = doc(db, 'wholesale_orders', orderId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as WholesaleOrder;
      }
      return null;
    } catch (err) {
      console.error('[WholesaleOrderService] Error fetching wholesale order document:', err);
      handleFirestoreError(err, OperationType.GET, `wholesale_orders/${orderId}`, false);
      return null;
    }
  },

  /**
   * Live real-time subscription to wholesale orders
   */
  subscribeWholesaleOrders(
    userId?: string, 
    callback?: (orders: WholesaleOrder[]) => void
  ): () => void {
    if (!callback) return () => {};

    try {
      const ordersCol = collection(db, 'wholesale_orders');
      const q = userId 
        ? query(ordersCol, where('customer.userId', '==', userId), orderBy('createdAt', 'desc'))
        : query(ordersCol, orderBy('createdAt', 'desc'));

      return onSnapshot(q, (snap) => {
        const orders: WholesaleOrder[] = [];
        snap.forEach(docSnap => {
          orders.push({ id: docSnap.id, ...docSnap.data() } as WholesaleOrder);
        });
        callback(orders);
      }, (err) => {
        console.warn('[WholesaleOrderService] onSnapshot subscription warning:', err);
        handleFirestoreError(err, OperationType.GET, 'wholesale_orders', false);
      });
    } catch (err) {
      console.warn('[WholesaleOrderService] Subscription setup error:', err);
      return () => {};
    }
  },

  /**
   * Update wholesale order status with administrative notes
   */
  async updateOrderStatus(
    orderId: string, 
    status: WholesaleOrderStatus, 
    notes?: string, 
    updatedBy?: string
  ): Promise<void> {
    if (!orderId) throw new Error('Order ID is required.');

    try {
      const response = await fetch(`/api/wholesale/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes, updatedBy })
      });

      if (response.ok) {
        return;
      }
    } catch (err) {
      console.warn('[WholesaleOrderService] Status patch API failed, fallback to Firestore update:', err);
    }

    // Direct Firestore update fallback
    const docRef = doc(db, 'wholesale_orders', orderId);
    const updates: any = {
      status,
      updatedAt: new Date().toISOString()
    };
    if (notes) updates.notes = notes;
    if (updatedBy) updates.lastUpdatedBy = updatedBy;

    await updateDoc(docRef, sanitizeForFirestore(updates));
  },

  /**
   * Cancel wholesale order and trigger atomic inventory restoration
   */
  async cancelWholesaleOrder(
    orderId: string, 
    reason?: string, 
    cancelledBy?: string
  ): Promise<WholesaleOrder> {
    if (!orderId) throw new Error('Order ID is required.');

    const response = await fetch(`/api/wholesale/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, cancelledBy })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || 'Failed to cancel wholesale order.');
    }

    return data.order as WholesaleOrder;
  }
};
