import { PosSession, Order, Product } from '../types';
import { productService } from './productService';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import { collection, onSnapshot, doc, setDoc, query, orderBy, addDoc, getDocs } from 'firebase/firestore';
import { findProductByScannedCode } from '../utils/barcode';

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
    await addDoc(scansColRef, {
      product_id: canonicalProductId,
      scanned_at: new Date().toISOString()
    });

    setDoc(doc(db, 'pos_sessions', sessionId), {
      lastScanTime: new Date().toISOString()
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
        performedBy: 'POS Register Operator',
        previousStock: prevStock,
        newStock: prod.stock,
        reason: `POS Sale - Register Checkout`
      });
    }

    // Create Order
    const totalAmount = sessionItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderId = 'POS-' + Math.floor(100000 + Math.random() * 900000);
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
      createdAt: new Date().toISOString(),
      paymentMethod: 'POS_In_Person',
      sessionType: 'POS',
      isPaid: true
    };

    // Update cache and Firestore
    ordersCache = [newOrder, ...ordersCache];
    setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(newOrder)).catch(console.error);

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

    // Trigger real-time Slack Notification
    import('./slackNotificationService').then(({ slackNotificationService }) => {
      slackNotificationService.notifyNewOrder(newOrder).catch(console.warn);
    });

    return newOrder;
  },

  startFulfillment(orderId: string): { success: boolean; message: string; order?: Order } {
    const idx = ordersCache.findIndex(o => o.id === orderId);
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
    setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(order)).catch(console.error);

    return { success: true, message: 'Fulfillment started! Order status updated to PACKING.', order };
  },

  verifyItemScan(orderId: string, scannedCode: string): {
    success: boolean;
    message: string;
    order?: Order;
    matchedProduct?: Product;
    isComplete?: boolean;
  } {
    const idx = ordersCache.findIndex(o => o.id === orderId);
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
    setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(order)).catch(console.error);

    return {
      success: true,
      message: `Verified: ${item.name} (${item.scannedQuantity}/${item.quantity})`,
      order,
      matchedProduct: matchedProd,
      isComplete
    };
  },

  confirmOrderFulfillment(orderId: string, staffName: string = 'Admin Staff'): { success: boolean; message: string; order?: Order } {
    const idx = ordersCache.findIndex(o => o.id === orderId);
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
    setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(order)).catch(console.error);

    return {
      success: true,
      message: `Order #${order.id} verified and fulfilled successfully! Stock deducted and logged.`,
      order
    };
  },

  cancelOrder(orderId: string, reason: string = 'Cancelled by Staff', staffName: string = 'Admin Staff'): { success: boolean; message: string; order?: Order } {
    const idx = ordersCache.findIndex(o => o.id === orderId);
    if (idx === -1) {
      return { success: false, message: 'Order not found' };
    }

    const order = { ...ordersCache[idx] };

    if (order.status === 'cancelled') {
      return { success: false, message: 'Order is already cancelled.' };
    }

    // Check if stock was previously deducted
    if (order.stock_deducted) {
      // Prevent duplicate stock restoration
      if (order.stock_restored) {
        return { success: false, message: 'Stock for this order was already restored previously. Duplicate restoration prevented.' };
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
    ordersCache[idx] = order;
    setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(order)).catch(console.error);

    import('./slackNotificationService').then(({ slackNotificationService }) => {
      slackNotificationService.notifyOrderStatusChange(order, 'packing').catch(console.warn);
    });

    return {
      success: true,
      message: order.stock_restored
        ? `Order #${order.id} cancelled. Stock restored to inventory.`
        : `Order #${order.id} cancelled. Stock was not deducted previously.`,
      order
    };
  },

  updateOrderStatus(orderId: string, status: Order['status']): Order | undefined {
    const index = ordersCache.findIndex(o => o.id === orderId);
    if (index !== -1) {
      const previousStatus = ordersCache[index].status;
      const updatedOrder = { ...ordersCache[index], status };
      if (status === 'delivered') {
        updatedOrder.isPaid = true;
      }
      ordersCache[index] = updatedOrder;
      setDoc(doc(db, 'orders', orderId), sanitizeForFirestore(updatedOrder)).catch(console.error);

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
