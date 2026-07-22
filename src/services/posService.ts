import { PosSession, Order, Product } from '../types';
import { productService } from './productService';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, doc, setDoc, query, orderBy, addDoc, getDocs } from 'firebase/firestore';

const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ORD-582910',
    customerName: 'Ayesha Rahman',
    customerPhone: '01712345678',
    customerEmail: 'koreanskinfood.bd@gmail.com',
    address: 'House 42, Road 11, Banani, Dhaka',
    items: [
      { productId: 'cosrx-snail-96', name: 'COSRX Advanced Snail 96 Mucin Power Essence', price: 1850, quantity: 1 },
      { productId: 'boj-sunscreen-rice', name: 'Beauty of Joseon Relief Sun : Rice + Probiotics SPF50+', price: 1650, quantity: 1 }
    ],
    totalAmount: 3500,
    status: 'pending',
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
      { productId: 'cosrx-cleanser-goodmorning', name: 'COSRX Low pH Good Morning Gel Cleanser', price: 1050, quantity: 2 }
    ],
    totalAmount: 2100,
    status: 'delivered',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    paymentMethod: 'COD',
    sessionType: 'Online',
    isPaid: true
  }
];

let ordersCache: Order[] = [...DEFAULT_ORDERS];
let sessionsCache: PosSession[] = [
  {
    id: 'pos-main',
    name: 'Register #1 (Ground Floor)',
    status: 'active',
    computerJoined: true,
    lastScanTime: new Date().toISOString(),
    items: []
  }
];

// Firestore real-time subscriptions
let draftOrdersCache: Order[] = [];

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
  snapshot.forEach((doc) => {
    ords.push(doc.data() as Order);
  });
  if (ords.length > 0) {
    ordersCache = ords;
  }
}, (err) => {
  console.warn('[Firebase] orders onSnapshot warning:', err);
  if (err?.code === 'permission-denied' || err?.message?.includes('permission') || err?.message?.includes('Permission')) {
    handleFirestoreError(err, OperationType.GET, 'orders', false);
  }
});

onSnapshot(collection(db, 'pos_sessions'), (snapshot) => {
  const sess: PosSession[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data() as PosSession;
    sess.push({
      ...data,
      items: Array.isArray(data?.items) ? data.items : []
    });
  });
  if (sess.length > 0) {
    sessionsCache = sess;
  }
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

  const product = productService.getProductById(productId);
  if (!product) {
    return { success: false, message: 'Product not found in inventory.' };
  }

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
        if (docSnap.data().product_id === productId) {
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
    await addDoc(scansColRef, {
      product_id: productId,
      scanned_at: new Date().toISOString()
    });

    setDoc(doc(db, 'pos_sessions', sessionId), {
      lastScanTime: new Date().toISOString()
    }, { merge: true }).catch(() => {});

    posService.scanProductIntoSession(sessionId, productId);

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
      setDoc(doc(db, 'pos_sessions', s.id), s).catch(console.error);
    });
  },

  getActiveSession(): PosSession {
    let active = sessionsCache.find(s => s.status === 'active');
    if (!active) {
      active = {
        id: 'pos-main',
        name: 'Register #1 (Ground Floor)',
        status: 'active',
        computerJoined: true,
        lastScanTime: new Date().toISOString(),
        items: []
      };
      sessionsCache.push(active);
      this.saveSessions(sessionsCache);
    }
    return active;
  },

  scanProductIntoSession(sessionId: string, productId: string): { success: boolean; message: string; session: PosSession } {
    const sessionIndex = sessionsCache.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) {
      return { success: false, message: 'Session not found', session: this.getActiveSession() };
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

    session.lastScanTime = new Date().toISOString();
    sessionsCache[sessionIndex] = session;
    this.saveSessions(sessionsCache);

    return { success: true, message: `${product.name} scanned successfully!`, session };
  },

  updateSessionItemQuantity(sessionId: string, productId: string, quantity: number): PosSession {
    const sIdx = sessionsCache.findIndex(s => s.id === sessionId);
    if (sIdx !== -1) {
      const session = { ...sessionsCache[sIdx] };
      const currentItems = Array.isArray(session.items) ? session.items : [];
      if (quantity <= 0) {
        session.items = currentItems.filter(item => item.productId !== productId);
      } else {
        session.items = currentItems.map(item => item.productId === productId ? { ...item, quantity } : item);
      }
      session.lastScanTime = new Date().toISOString();
      sessionsCache[sIdx] = session;
      this.saveSessions(sessionsCache);
      return session;
    }
    return this.getActiveSession();
  },

  clearSessionCart(sessionId: string): PosSession {
    const sIdx = sessionsCache.findIndex(s => s.id === sessionId);
    if (sIdx !== -1) {
      const session = { ...sessionsCache[sIdx], items: [] };
      session.lastScanTime = new Date().toISOString();
      sessionsCache[sIdx] = session;
      this.saveSessions(sessionsCache);
      return session;
    }
    return this.getActiveSession();
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

    // Decrement stock & log inventory
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
    }

    // Create Order
    const totalAmount = sessionItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderId = 'POS-' + Math.floor(100000 + Math.random() * 900000);
    const newOrder: Order = {
      id: orderId,
      customerName: customerName || 'In-Person Customer',
      customerPhone: customerPhone || 'Walk-In',
      address: 'In-Store Checkout',
      items: sessionItems,
      totalAmount,
      status: 'delivered',
      createdAt: new Date().toISOString(),
      paymentMethod: 'POS_In_Person',
      sessionType: 'POS',
      isPaid: true
    };

    // Update cache and Firestore
    ordersCache = [newOrder, ...ordersCache];
    setDoc(doc(db, 'orders', orderId), newOrder).catch(console.error);

    // Clear session cart
    const updatedSession = { ...session, items: [] };
    updatedSession.lastScanTime = new Date().toISOString();
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

  createOnlineOrder(order: Omit<Order, 'id' | 'createdAt' | 'status' | 'isPaid' | 'sessionType'>): Order {
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const newOrder: Order = {
      ...order,
      id: orderId,
      createdAt: new Date().toISOString(),
      status: 'pending',
      sessionType: 'Online',
      isPaid: false
    };

    // Decrement stock for online orders
    const products = productService.getProducts();
    for (const item of order.items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        const prevStock = prod.stock;
        prod.stock = Math.max(0, prod.stock - item.quantity);
        productService.updateProduct(prod);
        
        productService.logInventory(
          prod.id,
          'sale',
          item.quantity,
          prevStock,
          prod.stock,
          `Online Order - ${newOrder.id}`
        );
      }
    }

    // Update cache and Firestore
    ordersCache = [newOrder, ...ordersCache];
    setDoc(doc(db, 'orders', orderId), newOrder).catch(console.error);

    return newOrder;
  },

  updateOrderStatus(orderId: string, status: Order['status']): Order | undefined {
    const index = ordersCache.findIndex(o => o.id === orderId);
    if (index !== -1) {
      const updatedOrder = { ...ordersCache[index], status };
      if (status === 'delivered') {
        updatedOrder.isPaid = true;
      }
      ordersCache[index] = updatedOrder;
      setDoc(doc(db, 'orders', orderId), updatedOrder).catch(console.error);
      return updatedOrder;
    }
    return undefined;
  }
};
