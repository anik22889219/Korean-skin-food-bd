import { 
  WholesaleOrder, 
  WholesaleOrderStatus, 
  WholesaleOrderProduct, 
  WholesaleOrderCustomer, 
  WholesaleOrderCheckoutInfo 
} from '../types';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import { authFetch } from './apiClient';
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
  updateDoc,
  runTransaction
} from 'firebase/firestore';

export interface CreateWholesaleOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  customCodPrice?: number;
  CODUnitPrice?: number;
  codPrice?: number;
  barcode?: string;
  name?: string;
  sku?: string;
  image?: string;
}

export interface CreateAdminWholesaleOrderParams {
  customerId: string;
  orderDate?: string;
  customerName?: string;
  businessName?: string;
  phone?: string;
  items: CreateWholesaleOrderItemInput[];
  checkoutInfo?: {
    checkoutType: 'COD' | 'PARCEL' | 'COD_DIRECT' | 'PARCEL_COURIER';
    deliveryName?: string;
    deliveryPhone?: string;
    deliveryAddress?: string;
    parcelId?: string;
    velouriaId?: string;
    codPrice?: number | string;
    courier?: string;
    orderNote?: string;
  };
  shippingAddress: {
    deliveryName: string;
    deliveryPhone: string;
    deliveryAddress: string;
    courier?: string;
    orderNote?: string;
  };
  totalWholesaleCost?: number;
  totalCODValue?: number;
  totalProfit?: number;
  deliveryCharge?: number;
  discount?: number;
  paidAmount?: number;
  paymentMethod?: string;
  paymentReference?: string;
  status?: WholesaleOrderStatus;
  notes?: string;
  createdBy?: string;
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
   * Super Admin / Staff manual wholesale order creation.
   * Supports custom wholesale unit prices, immediate advance payments, automatic ledger sync, and stock decrement.
   */
  async createAdminWholesaleOrder(params: CreateAdminWholesaleOrderParams): Promise<WholesaleOrder> {
    if (!params.customerId) {
      throw new Error('Customer ID is required to create a wholesale order.');
    }

    if (!params.items || params.items.length === 0) {
      throw new Error('Please select at least one product for the order.');
    }

    // 1. Attempt server API first
    try {
      const response = await authFetch('/api/wholesale/orders/admin-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });

      if (response.ok) {
        const data: CreateWholesaleOrderResult = await response.json();
        if (data.success && data.order) {
          return data.order;
        }
      }
    } catch (apiErr: any) {
      console.warn('[WholesaleOrderService] Server admin-create API notice, executing direct authenticated client transaction:', apiErr?.message);
    }

    // 2. Direct Authenticated Client Transaction (Full Security Rules Compliant)
    const cleanCustomerId = params.customerId.trim();
    const wsCustomerRef = doc(db, 'wholesale_customers', cleanCustomerId);
    const now = new Date();
    const nowIso = now.toISOString();
    let orderDateIso = nowIso;
    if (params.orderDate && typeof params.orderDate === 'string' && params.orderDate.trim()) {
      try {
        const timeStr = now.toTimeString().split(' ')[0] || '12:00:00';
        const parsed = new Date(`${params.orderDate.trim()}T${timeStr}`);
        if (!isNaN(parsed.getTime())) {
          orderDateIso = parsed.toISOString();
        }
      } catch {
        orderDateIso = nowIso;
      }
    }
    const orderDateStr = params.orderDate?.trim() || nowIso.split('T')[0];
    const orderNumber = `WSO-${Date.now().toString().slice(-6)}`;
    const orderId = `ws-ord-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const committedOrder = await runTransaction(db, async (transaction) => {
      // a. Fetch customer document
      const wsCustSnap = await transaction.get(wsCustomerRef);
      const wsCustData = wsCustSnap.exists() ? wsCustSnap.data() : null;

      const customerDetails: WholesaleOrderCustomer = {
        wholesaleCustomerId: cleanCustomerId,
        userId: cleanCustomerId,
        customerName: params.customerName || wsCustData?.name || 'Wholesale Partner',
        businessName: params.businessName || wsCustData?.businessName || wsCustData?.storeName || '',
        pageName: wsCustData?.pageName || '',
        contactNumber: params.phone || wsCustData?.phone || ''
      };

      // b. Fetch all product documents
      const productDocMap = new Map<string, any>();
      for (const item of params.items) {
        const pRef = doc(db, 'products', item.productId);
        const pSnap = await transaction.get(pRef);
        if (!pSnap.exists()) {
          throw new Error(`Product not found in inventory: ${item.productId}`);
        }
        productDocMap.set(item.productId, { id: pSnap.id, ...pSnap.data() });
      }

      // c. Validate stock
      const aggregatedQuantities: Record<string, number> = {};
      for (const item of params.items) {
        const qty = Number(item.quantity) || 1;
        aggregatedQuantities[item.productId] = (aggregatedQuantities[item.productId] || 0) + qty;
      }
      for (const [pId, totalQty] of Object.entries(aggregatedQuantities)) {
        const prod = productDocMap.get(pId);
        const currentStock = Number(prod.stock ?? 0);
        if (currentStock < totalQty) {
          throw new Error(`Insufficient stock for "${prod.name}". Available: ${currentStock}, Requested: ${totalQty}.`);
        }
      }

      // d. Process items and calculate totals
      const processedItems: WholesaleOrderProduct[] = [];
      let totalWholesaleCost = 0;
      let calculatedTotalCOD = 0;
      let calculatedTotalProfit = 0;
      let totalUnits = 0;

      for (const item of params.items) {
        const prod = productDocMap.get(item.productId);
        const itemQty = Number(item.quantity) || 1;
        totalUnits += itemQty;

        let unitPrice = 0;
        if (item.unitPrice !== undefined && item.unitPrice !== null && !isNaN(Number(item.unitPrice)) && Number(item.unitPrice) >= 0) {
          unitPrice = Number(item.unitPrice);
        } else if (itemQty >= 50 && prod.wholesalePrice50Plus && Number(prod.wholesalePrice50Plus) > 0) {
          unitPrice = Number(prod.wholesalePrice50Plus);
        } else if (prod.wholesalePrice && Number(prod.wholesalePrice) > 0) {
          unitPrice = Number(prod.wholesalePrice);
        } else {
          unitPrice = Number(prod.retailPrice ?? prod.price ?? 0);
        }

        const itemTotal = Math.round(unitPrice * itemQty * 100) / 100;
        totalWholesaleCost += itemTotal;

        const codUnitPrice = (item.customCodPrice !== undefined && item.customCodPrice !== null && !isNaN(Number(item.customCodPrice)))
          ? Number(item.customCodPrice)
          : (item.CODUnitPrice !== undefined && item.CODUnitPrice !== null && !isNaN(Number(item.CODUnitPrice)))
          ? Number(item.CODUnitPrice)
          : (prod.retailPrice ?? prod.price ?? unitPrice);

        const itemCodValue = Math.round(codUnitPrice * itemQty * 100) / 100;
        const itemProfit = Math.round((codUnitPrice - unitPrice) * itemQty * 100) / 100;
        calculatedTotalCOD += itemCodValue;
        calculatedTotalProfit += itemProfit;

        processedItems.push({
          productId: prod.id,
          productName: prod.name || item.name || '',
          sku: prod.barcode || prod.sku || item.sku || '',
          barcode: prod.barcode || '',
          image: prod.image || item.image || '',
          quantity: itemQty,
          wholesaleTier: itemQty >= 50 ? 'tier50_plus' : 'tier1_49',
          wholesaleUnitPrice: unitPrice,
          CODUnitPrice: codUnitPrice,
          wholesaleCost: itemTotal,
          CODValue: itemCodValue,
          profit: itemProfit
        });
      }

      const validDeliveryCharge = Math.max(0, Number(params.deliveryCharge) || 0);
      const validDiscount = Math.max(0, Number(params.discount) || 0);
      const finalAmount = Math.max(0, Math.round((totalWholesaleCost + validDeliveryCharge - validDiscount) * 100) / 100);
      const validPaidAmount = Math.max(0, Math.min(finalAmount, Number(params.paidAmount) || 0));
      const dueAmount = Math.max(0, Math.round((finalAmount - validPaidAmount) * 100) / 100);

      const orderPaymentStatus: WholesaleOrder['paymentStatus'] = dueAmount === 0 && finalAmount > 0 ? 'paid' : (validPaidAmount > 0 ? 'partial' : 'unpaid');

      const incomingCheckoutInfo = params.checkoutInfo;
      const resolvedCheckoutType: 'COD' | 'PARCEL' = (incomingCheckoutInfo?.checkoutType === 'PARCEL_COURIER' || incomingCheckoutInfo?.checkoutType === 'PARCEL')
        ? 'PARCEL'
        : 'COD';

      const finalCodPrice = incomingCheckoutInfo?.codPrice !== undefined && incomingCheckoutInfo?.codPrice !== null
        ? Number(incomingCheckoutInfo.codPrice)
        : calculatedTotalCOD;

      const finalCheckoutInfo: WholesaleOrderCheckoutInfo = resolvedCheckoutType === 'PARCEL'
        ? {
            checkoutType: 'PARCEL',
            parcelId: incomingCheckoutInfo?.parcelId || '',
            velouriaId: incomingCheckoutInfo?.velouriaId || '',
            deliveryName: incomingCheckoutInfo?.deliveryName || params.shippingAddress?.deliveryName || customerDetails.customerName,
            codPrice: finalCodPrice,
            orderNote: incomingCheckoutInfo?.orderNote || params.shippingAddress?.orderNote || params.notes || ''
          }
        : {
            checkoutType: 'COD',
            deliveryName: incomingCheckoutInfo?.deliveryName || params.shippingAddress?.deliveryName || customerDetails.customerName,
            deliveryPhone: incomingCheckoutInfo?.deliveryPhone || params.shippingAddress?.deliveryPhone || customerDetails.contactNumber,
            deliveryAddress: incomingCheckoutInfo?.deliveryAddress || params.shippingAddress?.deliveryAddress || wsCustData?.businessAddress || wsCustData?.location || '',
            codPrice: finalCodPrice,
            orderNote: incomingCheckoutInfo?.orderNote || params.shippingAddress?.orderNote || params.notes || ''
          };

      const wholesaleOrderDoc: WholesaleOrder = {
        id: orderId,
        orderNumber,
        customer: customerDetails,
        items: processedItems,
        totalUnits,
        totalWholesaleCost,
        totalCODValue: finalCodPrice,
        totalProfit: calculatedTotalProfit,
        deliveryCharge: validDeliveryCharge,
        discount: validDiscount,
        finalAmount,
        paidAmount: validPaidAmount,
        dueAmount,
        checkoutInfo: finalCheckoutInfo,
        status: (params.status || 'confirmed') as WholesaleOrderStatus,
        paymentStatus: orderPaymentStatus,
        stock_deducted: true,
        stockDeducted: true,
        stock_restored: false,
        stockRestored: false,
        orderSource: 'admin_dashboard',
        createdBy: String(params.createdBy || 'Super Admin'),
        notes: params.notes ? String(params.notes).trim() : '',
        orderDate: orderDateStr,
        createdAt: orderDateIso,
        updatedAt: nowIso
      };

      // e. Update customer ledger & statistics
      if (wsCustSnap.exists()) {
        const cData = wsCustSnap.data();
        const curOrders = Number(cData.totalOrders || 0);
        const curPurchase = Number(cData.totalWholesalePurchase || 0);
        const curPaid = Number(cData.totalPaid || 0);
        const curDue = Number(cData.totalDue || 0);

        const newPurchase = curPurchase + finalAmount;
        const newPaid = curPaid + validPaidAmount;
        const newDue = curDue + dueAmount;

        transaction.update(wsCustomerRef, {
          totalOrders: curOrders + 1,
          totalWholesalePurchase: newPurchase,
          totalPaid: newPaid,
          totalDue: newDue,
          currentDue: newDue,
          updatedAt: nowIso
        });
      }

      // f. If advance paid amount > 0, record payment
      if (validPaidAmount > 0) {
        const paymentId = `wp-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const paymentRef = doc(db, 'wholesale_payments', paymentId);
        transaction.set(paymentRef, {
          id: paymentId,
          wholesaleCustomerId: cleanCustomerId,
          amount: validPaidAmount,
          paymentMethod: params.paymentMethod || 'Cash',
          reference: params.paymentReference || `Advance for Order #${orderNumber}`,
          note: `Admin order advance payment for Order #${orderNumber}`,
          createdBy: String(params.createdBy || 'Super Admin'),
          orderId: orderId,
          orderNumber: orderNumber,
          paymentDate: orderDateStr,
          previousDue: Number(wsCustData?.totalDue || 0),
          remainingDue: Math.max(0, Number(wsCustData?.totalDue || 0) + dueAmount),
          createdAt: orderDateIso
        });
      }

      // g. Deduct stock and record inventory logs
      for (const [pId, totalQty] of Object.entries(aggregatedQuantities)) {
        const prod = productDocMap.get(pId);
        const prevStock = Number(prod.stock ?? 0);
        const newStock = prevStock - totalQty;

        const pRef = doc(db, 'products', pId);
        transaction.update(pRef, {
          stock: newStock,
          updated_at: nowIso
        });

        // Inventory log
        const logDocRef = doc(collection(db, 'inventory_logs'));
        transaction.set(logDocRef, {
          id: logDocRef.id,
          productId: pId,
          productName: prod.name || '',
          type: 'sale',
          quantity: newStock,
          change: -totalQty,
          previousStock: prevStock,
          newStock: newStock,
          prevStock: prevStock,
          reason: `Super Admin Wholesale Order #${orderNumber} (${customerDetails.customerName})`,
          source: 'WHOLESALE_ADMIN',
          orderId: orderId,
          orderNumber: orderNumber,
          orderType: 'wholesale',
          customer: customerDetails.customerName,
          userId: cleanCustomerId,
          performedBy: String(params.createdBy || 'Super Admin'),
          createdAt: orderDateIso,
          timestamp: orderDateIso
        });

        // Stock movement
        const movementDocRef = doc(collection(db, 'stock_movements'));
        transaction.set(movementDocRef, {
          id: movementDocRef.id,
          productId: pId,
          productName: prod.name || '',
          orderId: orderId,
          wholesaleOrderId: orderId,
          orderType: 'wholesale',
          quantity: -totalQty,
          type: 'sale',
          source: 'WHOLESALE_ADMIN',
          performedBy: String(params.createdBy || 'Super Admin'),
          previousStock: prevStock,
          newStock: newStock,
          reason: `Super Admin Wholesale Order #${orderNumber}`,
          customer: customerDetails.customerName,
          userId: cleanCustomerId,
          createdAt: orderDateIso,
          timestamp: orderDateIso
        });
      }

      // h. Save wholesale order
      const wholesaleOrderRef = doc(db, 'wholesale_orders', orderId);
      transaction.set(wholesaleOrderRef, wholesaleOrderDoc);

      return wholesaleOrderDoc;
    });

    return committedOrder;
  },
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

    // 1. Attempt server API first
    try {
      const response = await authFetch('/api/wholesale/orders/create', {
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

      if (response.ok) {
        const data: CreateWholesaleOrderResult = await response.json();
        if (data.success && data.order) {
          return data.order;
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        console.warn('[WholesaleOrderService] Server create API returned error status:', response.status, errData);
      }
    } catch (apiErr: any) {
      console.warn('[WholesaleOrderService] Server create API notice, executing direct authenticated client transaction:', apiErr?.message);
    }

    // 2. Fallback to Direct Authenticated Client Transaction (Full Security Rules Compliant)
    const cleanUserId = params.userId.trim();
    const wsCustomerRef = doc(db, 'wholesale_customers', cleanUserId);
    const nowIso = new Date().toISOString();
    const orderNumber = `WSO-${Date.now().toString().slice(-6)}`;
    const orderId = `ws-ord-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const committedOrder = await runTransaction(db, async (transaction) => {
      // a. Fetch customer document
      const wsCustSnap = await transaction.get(wsCustomerRef);
      const wsCustData = wsCustSnap.exists() ? wsCustSnap.data() : null;

      const customerDetails: WholesaleOrderCustomer = {
        wholesaleCustomerId: cleanUserId,
        userId: cleanUserId,
        customerName: params.customer?.customerName || wsCustData?.name || 'Wholesale Partner',
        businessName: params.customer?.businessName || wsCustData?.businessName || wsCustData?.storeName || '',
        pageName: wsCustData?.pageName || '',
        contactNumber: params.customer?.contactNumber || wsCustData?.phone || ''
      };

      // b. Fetch all product documents
      const productDocMap = new Map<string, any>();
      for (const item of params.items) {
        const pRef = doc(db, 'products', item.productId);
        const pSnap = await transaction.get(pRef);
        if (!pSnap.exists()) {
          throw new Error(`Product not found in inventory: ${item.productId}`);
        }
        productDocMap.set(item.productId, { id: pSnap.id, ...pSnap.data() });
      }

      // c. Validate stock
      const aggregatedQuantities: Record<string, number> = {};
      for (const item of params.items) {
        const qty = Number(item.quantity) || 1;
        aggregatedQuantities[item.productId] = (aggregatedQuantities[item.productId] || 0) + qty;
      }
      for (const [pId, totalQty] of Object.entries(aggregatedQuantities)) {
        const prod = productDocMap.get(pId);
        const currentStock = Number(prod.stock ?? 0);
        if (currentStock < totalQty) {
          throw new Error(`Insufficient stock for "${prod.name}". Available: ${currentStock}, Requested: ${totalQty}.`);
        }
      }

      // d. Process items and calculate totals
      const processedItems: WholesaleOrderProduct[] = [];
      let totalWholesaleCost = 0;
      let calculatedTotalCOD = 0;
      let calculatedTotalProfit = 0;
      let totalUnits = 0;

      for (const item of params.items) {
        const prod = productDocMap.get(item.productId);
        const itemQty = Number(item.quantity) || 1;
        totalUnits += itemQty;

        const totalProductQty = aggregatedQuantities[item.productId];
        const wholesaleTier = totalProductQty >= 50 ? 'tier50_plus' : 'tier1_49';

        let unitPrice = 0;
        if (item.unitPrice !== undefined && item.unitPrice !== null && !isNaN(Number(item.unitPrice)) && Number(item.unitPrice) >= 0) {
          unitPrice = Number(item.unitPrice);
        } else if (itemQty >= 50 && prod.wholesalePrice50Plus && Number(prod.wholesalePrice50Plus) > 0) {
          unitPrice = Number(prod.wholesalePrice50Plus);
        } else if (prod.wholesalePrice && Number(prod.wholesalePrice) > 0) {
          unitPrice = Number(prod.wholesalePrice);
        } else {
          unitPrice = Number(prod.retailPrice ?? prod.price ?? 0);
        }

        const itemTotal = Math.round(unitPrice * itemQty * 100) / 100;
        totalWholesaleCost += itemTotal;

        const codUnitPrice = (item.customCodPrice !== undefined && item.customCodPrice !== null && !isNaN(Number(item.customCodPrice)))
          ? Number(item.customCodPrice)
          : (item.CODUnitPrice !== undefined && item.CODUnitPrice !== null && !isNaN(Number(item.CODUnitPrice)))
          ? Number(item.CODUnitPrice)
          : (prod.retailPrice ?? prod.price ?? unitPrice);

        const itemCodValue = Math.round(codUnitPrice * itemQty * 100) / 100;
        const itemProfit = Math.round((codUnitPrice - unitPrice) * itemQty * 100) / 100;
        calculatedTotalCOD += itemCodValue;
        calculatedTotalProfit += itemProfit;

        processedItems.push({
          productId: prod.id,
          productName: prod.name || '',
          sku: prod.barcode || prod.sku || '',
          barcode: prod.barcode || '',
          image: prod.image || '',
          quantity: itemQty,
          wholesaleTier,
          wholesaleUnitPrice: unitPrice,
          CODUnitPrice: codUnitPrice,
          wholesaleCost: itemTotal,
          CODValue: itemCodValue,
          profit: itemProfit
        });
      }

      const validDeliveryCharge = Number(params.deliveryCharge || 0);
      const validDiscount = 0;
      const finalAmount = Math.max(0, totalWholesaleCost + validDeliveryCharge - validDiscount);
      const validPaidAmount = 0;
      const dueAmount = Math.max(0, finalAmount - validPaidAmount);
      const orderPaymentStatus = validPaidAmount >= finalAmount ? 'paid' : (validPaidAmount > 0 ? 'partial' : 'unpaid');

      const incomingCheckoutInfo = params.checkoutInfo;
      const resolvedCheckoutType: 'COD' | 'PARCEL' = (incomingCheckoutInfo?.checkoutType === 'PARCEL_COURIER' || incomingCheckoutInfo?.checkoutType === 'PARCEL')
        ? 'PARCEL'
        : 'COD';

      const finalCodPrice = incomingCheckoutInfo?.codPrice !== undefined && incomingCheckoutInfo?.codPrice !== null
        ? Number(incomingCheckoutInfo.codPrice)
        : calculatedTotalCOD;

      const finalCheckoutInfo: WholesaleOrderCheckoutInfo = resolvedCheckoutType === 'PARCEL'
        ? {
            checkoutType: 'PARCEL',
            parcelId: incomingCheckoutInfo?.parcelId || '',
            velouriaId: incomingCheckoutInfo?.velouriaId || '',
            deliveryName: incomingCheckoutInfo?.deliveryName || customerDetails.customerName,
            codPrice: finalCodPrice,
            orderNote: incomingCheckoutInfo?.orderNote || params.notes || ''
          }
        : {
            checkoutType: 'COD',
            deliveryName: incomingCheckoutInfo?.deliveryName || customerDetails.customerName,
            deliveryPhone: incomingCheckoutInfo?.deliveryPhone || customerDetails.contactNumber,
            deliveryAddress: incomingCheckoutInfo?.deliveryAddress || wsCustData?.businessAddress || wsCustData?.location || '',
            codPrice: finalCodPrice,
            orderNote: incomingCheckoutInfo?.orderNote || params.notes || ''
          };

      const wholesaleOrderDoc: WholesaleOrder = {
        id: orderId,
        orderNumber,
        customer: customerDetails,
        items: processedItems,
        totalUnits,
        totalWholesaleCost,
        totalCODValue: finalCodPrice,
        totalProfit: calculatedTotalProfit,
        deliveryCharge: validDeliveryCharge,
        discount: validDiscount,
        finalAmount,
        paidAmount: validPaidAmount,
        dueAmount,
        checkoutInfo: finalCheckoutInfo,
        status: 'confirmed',
        paymentStatus: orderPaymentStatus,
        stock_deducted: true,
        stockDeducted: true,
        stock_restored: false,
        stockRestored: false,
        orderSource: params.orderSource || 'wholesale_portal',
        createdBy: 'Customer Portal',
        notes: params.notes ? String(params.notes).trim() : '',
        createdAt: nowIso,
        updatedAt: nowIso
      };

      // e. Update customer ledger & statistics if customer exists
      if (wsCustSnap.exists()) {
        const cData = wsCustSnap.data();
        const curOrders = Number(cData.totalOrders || 0);
        const curPurchase = Number(cData.totalWholesalePurchase || 0);
        const curDue = Number(cData.totalDue || 0);

        const newPurchase = curPurchase + finalAmount;
        const newDue = curDue + dueAmount;

        transaction.update(wsCustomerRef, {
          totalOrders: curOrders + 1,
          totalWholesalePurchase: newPurchase,
          totalDue: newDue,
          currentDue: newDue,
          updatedAt: nowIso
        });
      } else {
        // Auto-create customer record if missing
        transaction.set(wsCustomerRef, {
          id: cleanUserId,
          userId: cleanUserId,
          name: customerDetails.customerName,
          phone: customerDetails.contactNumber,
          businessName: customerDetails.businessName,
          wholesaleAccess: true,
          tier: 'tier1_49',
          status: 'active',
          totalOrders: 1,
          totalWholesalePurchase: finalAmount,
          totalDue: dueAmount,
          currentDue: dueAmount,
          createdAt: nowIso,
          updatedAt: nowIso
        }, { merge: true });
      }

      // f. Deduct stock and record inventory logs
      for (const [pId, totalQty] of Object.entries(aggregatedQuantities)) {
        const prod = productDocMap.get(pId);
        const prevStock = Number(prod.stock ?? 0);
        const newStock = prevStock - totalQty;

        const pRef = doc(db, 'products', pId);
        transaction.update(pRef, {
          stock: newStock,
          updated_at: nowIso
        });

        // Inventory log
        const logDocRef = doc(collection(db, 'inventory_logs'));
        transaction.set(logDocRef, {
          id: logDocRef.id,
          productId: pId,
          productName: prod.name || '',
          type: 'sale',
          quantity: newStock,
          change: -totalQty,
          previousStock: prevStock,
          newStock: newStock,
          prevStock: prevStock,
          reason: `Wholesale Portal Order #${orderNumber} (${customerDetails.customerName})`,
          source: 'WHOLESALE_PORTAL',
          orderId: orderId,
          orderNumber: orderNumber,
          orderType: 'wholesale',
          customer: customerDetails.customerName,
          userId: cleanUserId,
          performedBy: customerDetails.customerName,
          createdAt: nowIso,
          timestamp: nowIso
        });

        // Stock movement
        const movementDocRef = doc(collection(db, 'stock_movements'));
        transaction.set(movementDocRef, {
          id: movementDocRef.id,
          productId: pId,
          productName: prod.name || '',
          orderId: orderId,
          wholesaleOrderId: orderId,
          orderType: 'wholesale',
          quantity: -totalQty,
          type: 'sale',
          source: 'WHOLESALE_PORTAL',
          performedBy: customerDetails.customerName,
          previousStock: prevStock,
          newStock: newStock,
          reason: `Wholesale Portal Order #${orderNumber}`,
          customer: customerDetails.customerName,
          userId: cleanUserId,
          createdAt: nowIso,
          timestamp: nowIso
        });
      }

      // g. Save wholesale order
      const wholesaleOrderRef = doc(db, 'wholesale_orders', orderId);
      transaction.set(wholesaleOrderRef, wholesaleOrderDoc);

      return wholesaleOrderDoc;
    });

    return committedOrder;
  },

  /**
   * Fetch wholesale orders for a customer or all orders for staff
   */
  async getWholesaleOrders(userId?: string): Promise<WholesaleOrder[]> {
    try {
      const url = userId ? `/api/wholesale/orders?userId=${encodeURIComponent(userId)}` : '/api/wholesale/orders';
      const response = await authFetch(url);
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
      const response = await authFetch(`/api/wholesale/orders/${encodeURIComponent(orderId)}`);
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
      const response = await authFetch(`/api/wholesale/orders/${encodeURIComponent(orderId)}/status`, {
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

    const response = await authFetch(`/api/wholesale/orders/${encodeURIComponent(orderId)}/cancel`, {
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
