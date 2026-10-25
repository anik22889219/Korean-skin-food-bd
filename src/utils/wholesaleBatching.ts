import { Order, OrderStatus, WholesaleOrderBatch, WholesaleOrderBatchItem, CourierData } from '../types';
import { posService } from '../services/posService';
import { db, sanitizeForFirestore } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export interface BatchFilterOptions {
  searchQuery?: string;
  statusFilter?: 'ALL' | 'NEEDS_DISPATCH' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  startDate?: string;
  endDate?: string;
}

export interface DispatchBatchConfig {
  courierProvider: string;
  trackingCode?: string;
  targetStatus?: OrderStatus;
  notes?: string;
  dispatchedBy?: string;
}

/**
 * Formats YYYY-MM-DD or ISO date string into readable Bengali / English commercial date
 */
export function formatBatchDate(dateStr?: string): string {
  if (!dateStr || dateStr === 'undated') return 'Undated Orders';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00Z`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Batches wholesale orders by customer or by order date for consolidated dispatch tracking,
 * picking lists, and manifest generation.
 */
export function batchWholesaleOrders(
  orders: Order[],
  groupBy: 'customer' | 'date',
  options: BatchFilterOptions = {}
): WholesaleOrderBatch[] {
  // 1. Filter wholesale orders only
  const wholesaleOrders = orders.filter(o => o.order_source === 'WHOLESALE');

  // 2. Apply search query filter if provided
  const query = options.searchQuery?.trim().toLowerCase() || '';
  const filteredOrders = wholesaleOrders.filter(order => {
    // Search query check
    if (query) {
      const matchId = order.id.toLowerCase().includes(query) || (order.orderNumber && order.orderNumber.toLowerCase().includes(query));
      const matchCustomer = order.customerName.toLowerCase().includes(query) || order.customerPhone.includes(query);
      const matchAddress = (order.address || '').toLowerCase().includes(query);
      const matchItems = order.items.some(it => 
        it.name.toLowerCase().includes(query) || (it.barcode && it.barcode.toLowerCase().includes(query))
      );
      const matchCourier = order.courier && (
        order.courier.consignmentId.toLowerCase().includes(query) || 
        order.courier.trackingCode.toLowerCase().includes(query)
      );

      if (!matchId && !matchCustomer && !matchAddress && !matchItems && !matchCourier) {
        return false;
      }
    }

    // Date range filter
    const orderDateKey = order.orderDate || (order.createdAt ? order.createdAt.split('T')[0] : '');
    if (options.startDate && orderDateKey && orderDateKey < options.startDate) return false;
    if (options.endDate && orderDateKey && orderDateKey > options.endDate) return false;

    // Status filter
    if (options.statusFilter && options.statusFilter !== 'ALL') {
      if (options.statusFilter === 'NEEDS_DISPATCH') {
        const isDispatched = order.status === 'shipped' || order.status === 'delivered' || !!order.courier;
        if (order.status === 'cancelled' || isDispatched) return false;
      } else if (options.statusFilter === 'DISPATCHED') {
        const isDispatched = order.status === 'shipped' || !!order.courier;
        if (order.status === 'cancelled' || !isDispatched) return false;
      } else if (options.statusFilter === 'DELIVERED') {
        if (order.status !== 'delivered') return false;
      } else if (options.statusFilter === 'CANCELLED') {
        if (order.status !== 'cancelled') return false;
      }
    }

    return true;
  });

  // 3. Grouping Map
  const groupsMap = new Map<string, Order[]>();

  for (const order of filteredOrders) {
    let key = '';
    if (groupBy === 'customer') {
      // Group by customer identity: uid > phone > clean name
      key = order.customer_uid?.trim() || order.customerPhone?.replace(/\D/g, '') || order.customerName.trim().toLowerCase();
      if (!key) key = 'unknown_customer';
    } else {
      // Group by order date
      key = order.orderDate || (order.createdAt ? order.createdAt.split('T')[0] : 'undated');
    }

    const existing = groupsMap.get(key) || [];
    existing.push(order);
    groupsMap.set(key, existing);
  }

  // 4. Construct WholesaleOrderBatch objects
  const batches: WholesaleOrderBatch[] = [];

  groupsMap.forEach((batchOrders, key) => {
    if (batchOrders.length === 0) return;

    // Sort orders inside batch by commercial orderDate / createdAt desc
    batchOrders.sort((a, b) => {
      const timeA = new Date(a.orderDate ? (a.orderDate.includes('T') ? a.orderDate : `${a.orderDate}T12:00:00Z`) : (a.createdAt || 0)).getTime();
      const timeB = new Date(b.orderDate ? (b.orderDate.includes('T') ? b.orderDate : `${b.orderDate}T12:00:00Z`) : (b.createdAt || 0)).getTime();
      return timeB - timeA;
    });

    let groupTitle = '';
    let customerDetails: WholesaleOrderBatch['customerDetails'] = undefined;
    let batchDate: string | undefined = undefined;

    if (groupBy === 'customer') {
      const repOrder = batchOrders[0];
      groupTitle = repOrder.customerName || 'Wholesale Partner';
      customerDetails = {
        customerName: repOrder.customerName,
        customerPhone: repOrder.customerPhone,
        customerEmail: repOrder.customerEmail,
        businessAddress: repOrder.address,
        customer_uid: repOrder.customer_uid
      };
    } else {
      batchDate = key !== 'undated' ? key : undefined;
      groupTitle = formatBatchDate(key);
    }

    // Consolidated picking items
    const itemMap = new Map<string, WholesaleOrderBatchItem>();
    let totalUnits = 0;
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;

    const statusSummary = {
      pending: 0,
      packing: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };

    const courierConsignmentsSet = new Set<string>();

    for (const order of batchOrders) {
      totalAmount += Number(order.totalAmount || 0);
      totalPaid += Number(order.totalPaid || (order.isPaid ? order.totalAmount : 0));
      totalDue += Number(order.dueAmount || Math.max(0, order.totalAmount - (order.totalPaid || 0)));

      const st = order.status as keyof typeof statusSummary;
      if (statusSummary[st] !== undefined) {
        statusSummary[st]++;
      } else {
        statusSummary.pending++;
      }

      if (order.courier?.consignmentId) {
        courierConsignmentsSet.add(order.courier.consignmentId);
      }
      if (order.courier?.trackingCode && order.courier.trackingCode !== order.courier.consignmentId) {
        courierConsignmentsSet.add(order.courier.trackingCode);
      }

      // Aggregate items for picking list
      for (const item of order.items || []) {
        const qty = Number(item.quantity || 1);
        totalUnits += qty;
        const pId = item.productId || item.name;
        const existingItem = itemMap.get(pId);
        const itemVal = (Number(item.price) || 0) * qty;

        if (existingItem) {
          existingItem.totalQuantity += qty;
          existingItem.totalValue += itemVal;
          if (!existingItem.barcode && item.barcode) {
            existingItem.barcode = item.barcode;
          }
        } else {
          itemMap.set(pId, {
            productId: item.productId,
            productName: item.name,
            totalQuantity: qty,
            barcode: item.barcode,
            unitPrice: item.price,
            totalValue: itemVal
          });
        }
      }
    }

    const consolidatedItems = Array.from(itemMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
    const activeOrders = batchOrders.filter(o => o.status !== 'cancelled');
    const isFullyDispatched = activeOrders.length > 0 && activeOrders.every(
      o => o.status === 'shipped' || o.status === 'delivered' || !!o.courier
    );

    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
    const batchId = groupBy === 'customer'
      ? `BATCH-CUST-${safeKey}`
      : `BATCH-DATE-${safeKey}`;

    batches.push({
      id: batchId,
      groupBy,
      groupKey: key,
      groupTitle,
      customerDetails,
      date: batchDate,
      orderIds: batchOrders.map(o => o.id),
      orders: batchOrders,
      totalOrders: batchOrders.length,
      totalUnits,
      totalAmount,
      totalPaid,
      totalDue,
      consolidatedItems,
      statusSummary,
      isFullyDispatched,
      courierConsignments: Array.from(courierConsignmentsSet),
      createdAt: batchOrders[0]?.createdAt || new Date().toISOString()
    });
  });

  // 5. Sort Batches
  batches.sort((a, b) => {
    if (groupBy === 'date') {
      // Sort newest dates first
      const dateA = a.date || a.orders[0]?.orderDate || a.createdAt;
      const dateB = b.date || b.orders[0]?.orderDate || b.createdAt;
      return dateB.localeCompare(dateA);
    }
    // By customer: Batches with pending orders first, then highest total value
    const pendingDiff = (b.statusSummary.pending + b.statusSummary.packing) - (a.statusSummary.pending + a.statusSummary.packing);
    if (pendingDiff !== 0) return pendingDiff;
    return b.totalAmount - a.totalAmount;
  });

  return batches;
}

/**
 * Dispatches multiple wholesale orders belonging to a batch simultaneously:
 * updates order status to 'shipped' (or targetStatus), generates courier tracking
 * consignments, and persists to Firestore.
 */
export async function dispatchBatchOrders(
  batch: WholesaleOrderBatch,
  config: DispatchBatchConfig
): Promise<{
  success: boolean;
  updatedCount: number;
  message: string;
  trackingCodes: Record<string, string>;
}> {
  if (!batch || !batch.orders || batch.orders.length === 0) {
    return { success: false, updatedCount: 0, message: 'No orders in this batch to dispatch.', trackingCodes: {} };
  }

  const targetStatus: OrderStatus = config.targetStatus || 'shipped';
  const provider = config.courierProvider || 'steadfast';
  const timestamp = new Date().toISOString();
  const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const trackingCodes: Record<string, string> = {};

  let updatedCount = 0;

  for (let i = 0; i < batch.orders.length; i++) {
    const order = batch.orders[i];
    // Skip cancelled orders
    if (order.status === 'cancelled') continue;

    // Build tracking code
    const orderShortCode = order.orderNumber || order.id.slice(-6);
    let trackingCode = '';
    if (config.trackingCode && config.trackingCode.trim() !== '') {
      trackingCode = batch.orders.length > 1
        ? `${config.trackingCode.trim()}-${i + 1}`
        : config.trackingCode.trim();
    } else {
      trackingCode = `WS-${provider.toUpperCase()}-${dateTag}-${orderShortCode}`;
    }

    trackingCodes[order.id] = trackingCode;

    const courierData: CourierData = {
      provider: 'steadfast', // compatible CourierData provider enum
      consignmentId: trackingCode,
      trackingCode: trackingCode,
      status: targetStatus === 'delivered' ? 'delivered' : 'in_transit',
      codAmount: order.dueAmount || 0,
      deliveryFee: order.shippingCharge || 0,
      trackingUrl: provider.toLowerCase() === 'steadfast' 
        ? `https://steadfast.com.bd/t/${trackingCode}`
        : '',
      createdAt: timestamp
    };

    // Update posService memory & Firestore
    try {
      posService.updateOrderCourier(order.id, courierData);
      posService.updateOrderStatus(order.id, targetStatus);

      // Explicitly update wholesale_orders collection in Firestore
      if (order.order_source === 'WHOLESALE') {
        const wsRef = doc(db, 'wholesale_orders', order.id);
        await updateDoc(wsRef, sanitizeForFirestore({
          status: targetStatus,
          courier: {
            ...courierData,
            courierProviderName: provider
          },
          dispatchedAt: timestamp,
          dispatchedBy: config.dispatchedBy || 'Admin Staff',
          dispatchNotes: config.notes || '',
          updatedAt: timestamp
        })).catch(err => {
          console.warn(`[dispatchBatchOrders] Firestore update error on ${order.id}:`, err);
        });
      }

      updatedCount++;
    } catch (err) {
      console.error(`[dispatchBatchOrders] Error updating order ${order.id}:`, err);
    }
  }

  return {
    success: true,
    updatedCount,
    message: `Successfully dispatched ${updatedCount} orders in batch "${batch.groupTitle}" via ${provider.toUpperCase()}.`,
    trackingCodes
  };
}
