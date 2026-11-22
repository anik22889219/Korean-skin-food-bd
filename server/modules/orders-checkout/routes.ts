import express from 'express';
import { collection, doc, getDoc, getDocs, runTransaction, setDoc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import {
  getFirestoreDocWithToken,
  getIdTokenFromRequest,
  getServerDb,
  setFirestoreDocWithToken,
} from '../../config/firebase';
import { verifyAdminAuth, verifyOptionalAuth } from '../../middleware/auth';
import { checkoutRateLimiter, publicFormRateLimiter } from '../../middleware/rateLimiter';
import { writeAuditLog } from '../../utils/auditLog';
import { logger } from '../../utils/logger';
import { isValidBdPhone, normalizeBdPhone, stripUndefinedFields } from '../../utils/validators';
import { awardDeliveredOrderLoyaltyPoints } from '../customers/loyaltyService';

const router = express.Router();

const placeOrderIdempotencyCache = new Map<string, { order: any; expiresAt: number }>();

const PlaceOrderItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().optional(),
  quantity: z.coerce.number().int().min(1).max(100),
  barcode: z.string().optional(),
  isCombo: z.boolean().optional(),
  comboType: z.string().optional(),
  comboComponents: z.array(z.any()).optional(),
});

const PlaceOrderSchema = z.object({
  items: z.array(PlaceOrderItemSchema).min(1, 'Cart cannot be empty').max(60),
  customerName: z.string().trim().min(2, 'Please provide your full name').max(120),
  customerPhone: z.string().trim().min(10, 'Valid Bangladesh phone number is required'),
  customerEmail: z.string().trim().email().optional().or(z.literal('')).nullable(),
  address: z.string().trim().min(4, 'Delivery address is required').max(400),
  deliveryArea: z.enum(['dhaka', 'outside']).optional().default('dhaka'),
  isFreeDelivery: z.boolean().optional(),
  customer_uid: z.string().nullable().optional(),
  couponCode: z.string().trim().max(40).optional(),
  couponDiscount: z.coerce.number().optional(),
  pointsDiscount: z.coerce.number().min(0).optional(),
  useLoyaltyPoints: z.boolean().optional(),
  idempotencyKey: z.string().trim().max(160).optional(),
  attribution: z.record(z.string(), z.any()).optional(),
});

function computeProductRetailPrice(productData: any): number {
  const retail = Number(productData.retailPrice ?? productData.price ?? 0);
  const discount =
    productData.discountRetailPrice !== undefined &&
    Number(productData.discountRetailPrice) > 0 &&
    Number(productData.discountRetailPrice) < retail
      ? Number(productData.discountRetailPrice)
      : productData.discountPrice !== undefined &&
        Number(productData.discountPrice) > 0 &&
        Number(productData.discountPrice) < retail
      ? Number(productData.discountPrice)
      : undefined;
  return discount ?? retail;
}

router.post('/api/functions/placeOrder', checkoutRateLimiter, verifyOptionalAuth, async (req, res) => {
  const parsed = PlaceOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || 'Invalid checkout payload';
    return res.status(400).json({ success: false, error: firstIssue });
  }

  const input = parsed.data;
  const normalizedPhone = normalizeBdPhone(input.customerPhone);
  if (!isValidBdPhone(normalizedPhone)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid 11-digit Bangladesh mobile number (e.g. 017XXXXXXXX).',
    });
  }

  const db = getServerDb();
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  // Only trust verified authenticated UID (never raw client customer_uid when unverified)
  const verifiedUid: string | null = (req as any).user?.uid || null;
  const idToken = getIdTokenFromRequest(req);

  const nowMs = Date.now();
  if (placeOrderIdempotencyCache.size > 200) {
    for (const [k, entry] of placeOrderIdempotencyCache.entries()) {
      if (nowMs > entry.expiresAt) {
        placeOrderIdempotencyCache.delete(k);
      }
    }
  }

  const cleanIdempotencyKey = input.idempotencyKey
    ? input.idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120)
    : undefined;

  if (cleanIdempotencyKey) {
    const cached = placeOrderIdempotencyCache.get(cleanIdempotencyKey);
    if (cached && nowMs <= cached.expiresAt && cached.order) {
      return res.json({
        success: true,
        orderId: cached.order.id,
        order: cached.order,
        idempotentReplay: true,
        message: `Successfully placed order ${cached.order.id}`,
      });
    }
  }

  const orderId = `ORD-${String(Date.now()).slice(-3)}${Math.floor(100 + Math.random() * 900)}`;
  const nowIso = new Date().toISOString();

  try {
    // Load verified user profile before transaction when authenticated (avoids unauthenticated SDK rule denial)
    let verifiedUserProfile: any = null;
    if (verifiedUid && (input.useLoyaltyPoints || Number(input.pointsDiscount || 0) > 0)) {
      if (idToken) {
        verifiedUserProfile = await getFirestoreDocWithToken('users', verifiedUid, idToken).catch(() => null);
      }
    }

    // Load coupons snapshot up front if couponCode provided (coupons is publicly readable)
    let matchedCouponDoc: { id: string; data: any } | null = null;
    if (input.couponCode) {
      const cleanCode = input.couponCode.trim().toUpperCase();
      const couponsSnap = await getDocs(collection(db, 'coupons'));
      couponsSnap.forEach((d) => {
        const cData = d.data();
        if (String(cData.code || '').trim().toUpperCase() === cleanCode) {
          matchedCouponDoc = { id: d.id, data: cData };
        }
      });
    }

    const committedOrder = await runTransaction(db, async (tx) => {
      // 1. Validate every product in transaction (stock & authoritative price)
      const validatedProducts: Array<{
        data: any;
        productId: string;
        quantity: number;
        name: string;
        unitPrice: number;
        barcode: string;
      }> = [];

      for (const item of input.items) {
        const productRef = doc(db, 'products', item.productId);
        const productDoc = await tx.get(productRef);

        if (!productDoc.exists()) {
          throw new Error(`Product "${item.name || item.productId}" does not exist.`);
        }

        const productData = productDoc.data() as any;
        const currentStock = Number(productData?.stock ?? 0);
        const qty = Math.max(1, Number(item.quantity || 1));

        if (currentStock < qty) {
          throw new Error(
            `Insufficient stock for "${productData?.name || item.name}". Requested: ${qty}, Available: ${currentStock}`
          );
        }

        const unitPrice = computeProductRetailPrice(productData);
        validatedProducts.push({
          productId: item.productId,
          quantity: qty,
          name: productData.name || item.name || 'Skincare Product',
          unitPrice,
          barcode: productData.barcode || item.barcode || '',
          data: productData,
        });
      }

      const itemsSubtotal = validatedProducts.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0);

      // 2. Authoritative server-side Coupon Validation & Usage Increment
      let verifiedCouponCode: string | undefined;
      let verifiedCouponDiscount = 0;
      let couponFreeDelivery = false;

      if (input.couponCode) {
        if (!matchedCouponDoc) {
          throw new Error(`Coupon code "${input.couponCode}" is invalid.`);
        }
        const couponRef = doc(db, 'coupons', matchedCouponDoc.id);
        const freshCouponSnap = await tx.get(couponRef);
        if (!freshCouponSnap.exists()) {
          throw new Error(`Coupon code "${input.couponCode}" is no longer available.`);
        }
        const coupon = freshCouponSnap.data() as any;

        if (!coupon.isActive) {
          throw new Error(`Coupon "${coupon.code}" is currently inactive.`);
        }
        const nowDate = new Date();
        if (coupon.startDate && new Date(coupon.startDate) > nowDate) {
          throw new Error(`Coupon "${coupon.code}" is not active yet.`);
        }
        if (coupon.endDate && new Date(coupon.endDate) < nowDate) {
          throw new Error(`Coupon "${coupon.code}" has expired.`);
        }
        if (coupon.usageLimit && Number(coupon.usageCount || 0) >= Number(coupon.usageLimit)) {
          throw new Error(`Coupon "${coupon.code}" has reached its maximum usage limit.`);
        }
        if (coupon.minOrderAmount && itemsSubtotal < Number(coupon.minOrderAmount)) {
          throw new Error(
            `Coupon "${coupon.code}" requires a minimum order of ৳${Number(coupon.minOrderAmount).toLocaleString()}.`
          );
        }

        if (coupon.discountType === 'free_delivery') {
          couponFreeDelivery = true;
        } else if (coupon.discountType === 'percentage') {
          let rawDiscount = Math.round((itemsSubtotal * Number(coupon.discountValue || 0)) / 100);
          if (coupon.maxDiscountCap && Number(coupon.maxDiscountCap) > 0) {
            rawDiscount = Math.min(rawDiscount, Number(coupon.maxDiscountCap));
          }
          verifiedCouponDiscount = Math.min(itemsSubtotal, Math.max(0, rawDiscount));
        } else if (coupon.discountType === 'fixed_amount') {
          verifiedCouponDiscount = Math.min(itemsSubtotal, Math.max(0, Number(coupon.discountValue || 0)));
        }

        verifiedCouponCode = coupon.code;
      }

      // 3. Authoritative Delivery Charge (free >= 2000 or free_delivery coupon)
      const isFreeDeliv = couponFreeDelivery || itemsSubtotal >= 2000;
      const deliveryCharge = isFreeDeliv ? 0 : input.deliveryArea === 'outside' ? 150 : 80;

      // 4. Authoritative Loyalty Points Redemption (signed-in users only)
      let redeemedPoints = 0;
      const requestedPoints = Number(input.pointsDiscount || 0);
      if (verifiedUid && (input.useLoyaltyPoints || requestedPoints > 0)) {
        const availablePoints = verifiedUserProfile ? Number(verifiedUserProfile.loyaltyPoints || 0) : 0;
        const maxRedeemable = Math.max(0, itemsSubtotal - verifiedCouponDiscount);
        const targetRedeem = requestedPoints > 0 ? requestedPoints : availablePoints;
        redeemedPoints = Math.min(Math.floor(availablePoints), Math.floor(targetRedeem), Math.floor(maxRedeemable));
      }

      const totalDiscount = verifiedCouponDiscount + redeemedPoints;
      const totalAmount = Math.max(0, itemsSubtotal + deliveryCharge - totalDiscount);
      const cogsAmount = validatedProducts.reduce((sum, p) => {
        const cost = Number(p.data.wholesalePrice || p.data.costPrice || Math.round(p.unitPrice * 0.58));
        return sum + cost * p.quantity;
      }, 0);
      const grossProfit = Math.max(0, totalAmount - cogsAmount);
      const pendingEarnPoints = verifiedUid ? Math.floor(totalAmount / 10) : 0;

      // Stock stays un-deducted until fulfillment scan in Admin Orders
      const rawOrder = {
        id: orderId,
        customerName: input.customerName,
        customerPhone: normalizedPhone,
        customerEmail: input.customerEmail || (req as any).user?.email || '',
        customer_uid: verifiedUid,
        address: input.address,
        deliveryArea: input.deliveryArea,
        items: validatedProducts.map((p, idx) => {
          const orig: any = input.items[idx] || {};
          return {
            productId: p.productId,
            name: p.name,
            price: p.unitPrice,
            quantity: p.quantity,
            scannedQuantity: 0,
            barcode: p.barcode,
            ...(orig.isCombo ? { isCombo: true, comboType: orig.comboType } : {}),
            ...(Array.isArray(orig.comboComponents) && orig.comboComponents.length > 0
              ? { comboComponents: orig.comboComponents }
              : {}),
          };
        }),
        subtotal: itemsSubtotal,
        totalAmount,
        discountAmount: totalDiscount,
        totalPaid: 0,
        dueAmount: totalAmount,
        paymentStatus: 'UNPAID',
        status: 'pending',
        order_source: 'WEBSITE',
        stock_deducted: false,
        createdAt: nowIso,
        updatedAt: nowIso,
        paymentMethod: 'COD',
        sessionType: 'Online',
        isPaid: false,
        ...(verifiedCouponCode ? { couponCode: verifiedCouponCode } : {}),
        ...(verifiedCouponDiscount > 0 ? { couponDiscount: verifiedCouponDiscount } : {}),
        ...(isFreeDeliv ? { isFreeDelivery: true } : {}),
        ...(redeemedPoints > 0 ? { pointsDiscount: redeemedPoints } : {}),
        pointsEarned: pendingEarnPoints,
        pointsRedeemed: redeemedPoints,
        pointsAwarded: false,
        shippingCharge: deliveryCharge,
        cogsAmount,
        grossProfit,
        attribution: input.attribution || {},
        ...(cleanIdempotencyKey ? { idempotencyKey: cleanIdempotencyKey } : {}),
        analytics: {
          purchaseEventId: `purchase_${orderId}`,
          capiStatus: 'pending',
        },
        paymentTransactions: [],
      };

      const cleaned = stripUndefinedFields(rawOrder);
      tx.set(doc(db, 'orders', orderId), cleaned);

      return cleaned;
    });

    if (cleanIdempotencyKey) {
      placeOrderIdempotencyCache.set(cleanIdempotencyKey, {
        order: committedOrder,
        expiresAt: nowMs + 15 * 60 * 1000,
      });
    }

    // Best-effort staff-authenticated post-commit updates (non-blocking for customer checkouts)
    if (idToken && matchedCouponDoc) {
      setFirestoreDocWithToken(
        'coupons',
        matchedCouponDoc.id,
        {
          usageCount: Number(matchedCouponDoc.data?.usageCount || 0) + 1,
          updatedAt: nowIso,
        },
        idToken,
        true
      ).catch(() => {});
    }

    import('../../../src/services/slackNotificationService')
      .then(({ slackNotificationService }) => {
        slackNotificationService.notifyNewOrder(committedOrder as any).catch(() => {});
      })
      .catch(() => {});

    await writeAuditLog(
      {
        action: 'ORDER_CREATED',
        entityType: 'order',
        entityId: orderId,
        actorUid: verifiedUid || 'guest',
        actorRole: verifiedUid ? 'customer' : 'guest',
        details: {
          totalAmount: committedOrder.totalAmount,
          itemCount: committedOrder.items.length,
          couponCode: committedOrder.couponCode || null,
          pointsRedeemed: committedOrder.pointsRedeemed || 0,
        },
      },
      idToken
    );

    return res.json({
      success: true,
      orderId,
      order: committedOrder,
      message: `Successfully placed order ${orderId}`,
    });
  } catch (error: any) {
    logger.warn('orders-checkout', 'placeOrder validation/transaction failed', {
      error: error?.message,
    });
    const status = /insufficient stock|does not exist|coupon|minimum order|expired|limit/i.test(
      error?.message || ''
    )
      ? 400
      : 500;
    return res.status(status).json({ error: error.message || 'Could not create order' });
  }
});

// Abandoned Checkout Capture (Telemetry for Storefront Recovery)
router.post('/api/checkout/abandoned', publicFormRateLimiter, verifyOptionalAuth, async (req, res) => {
  const db = getServerDb();
  if (!db) return res.json({ success: true, stored: false });

  try {
    const sessionKey = String(req.body?.sessionKey || '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 80);
    if (!sessionKey) {
      return res.status(400).json({ success: false, error: 'sessionKey required' });
    }

    const rawPhone = String(req.body?.customerPhone || '').trim();
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 20) : [];
    if (items.length === 0) {
      return res.json({ success: true, skipped: true });
    }

    const docData = stripUndefinedFields({
      id: sessionKey,
      userId: (req as any).user?.uid || null,
      customerName: String(req.body?.customerName || '').trim().slice(0, 120),
      customerPhone: rawPhone ? normalizeBdPhone(rawPhone) : '',
      area: req.body?.area === 'outside' ? 'outside' : 'dhaka',
      subtotal: Number(req.body?.subtotal || 0),
      itemsCount: items.length,
      items: items.map((i: any) => ({
        productId: String(i.productId || ''),
        name: String(i.name || ''),
        quantity: Number(i.quantity || 1),
        price: Number(i.price || 0),
      })),
      status: 'abandoned',
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, 'abandoned_carts', sessionKey), docData, { merge: true });
    return res.json({ success: true });
  } catch (err: any) {
    logger.warn('orders-checkout', 'Failed to store abandoned checkout beacon', { error: err?.message });
    return res.json({ success: true, stored: false });
  }
});

// Authoritative Admin Order Status Update (triggers idempotent delivery loyalty award + audit log)
const OrderStatusSchema = z.object({
  status: z.enum(['pending', 'packing', 'shipped', 'delivered', 'cancelled', 'unpaid']),
  reason: z.string().max(300).optional(),
});

router.patch('/api/admin/orders/:orderId/status', verifyAdminAuth, async (req, res) => {
  const db = getServerDb();
  const idToken = getIdTokenFromRequest(req);
  if (!db && !idToken) {
    return res.status(500).json({ success: false, error: 'Database not initialized' });
  }

  const parsed = OrderStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid order status' });
  }

  const orderId = String(req.params.orderId || '').trim();
  const { status, reason } = parsed.data;
  const actor = (req as any).user;

  try {
    let existing: any = null;
    if (idToken) {
      existing = await getFirestoreDocWithToken('orders', orderId, idToken);
    } else if (db) {
      const snap = await getDoc(doc(db, 'orders', orderId));
      if (snap.exists()) existing = { id: snap.id, ...snap.data() };
    }

    if (!existing) {
      return res.status(404).json({ success: false, error: `Order #${orderId} not found` });
    }

    const previousStatus = existing.status;
    const nowIso = new Date().toISOString();

    const updates: Record<string, any> = {
      status,
      updatedAt: nowIso,
      lastUpdatedBy: actor?.email || actor?.uid || 'admin',
    };
    if (status === 'delivered') {
      updates.isPaid = true;
      updates.deliveredAt = existing.deliveredAt || nowIso;
      if (existing.paymentStatus !== 'PAID') {
        updates.paymentStatus = 'PAID';
        updates.totalPaid = Number(existing.totalAmount || existing.totalPaid || 0);
        updates.dueAmount = 0;
      }
    }
    if (reason) updates.statusReason = reason;

    if (idToken) {
      await setFirestoreDocWithToken('orders', orderId, updates, idToken, true);
    } else if (db) {
      await updateDoc(doc(db, 'orders', orderId), updates);
    }

    let loyaltyResult: { awarded: boolean; points: number } = { awarded: false, points: 0 };
    if (status === 'delivered') {
      loyaltyResult = await awardDeliveredOrderLoyaltyPoints(
        orderId,
        actor?.email || actor?.uid || 'admin',
        idToken
      );
    }

    await writeAuditLog(
      {
        action: 'ORDER_STATUS_UPDATED',
        entityType: 'order',
        entityId: orderId,
        actorUid: actor?.uid,
        actorEmail: actor?.email,
        actorRole: actor?.role,
        details: { previousStatus, nextStatus: status, loyaltyAwarded: loyaltyResult },
      },
      idToken
    );

    if (previousStatus !== status) {
      import('../../../src/services/slackNotificationService')
        .then(({ slackNotificationService }) => {
          slackNotificationService
            .notifyOrderStatusChange({ ...existing, ...updates, id: orderId } as any, previousStatus)
            .catch(() => {});
        })
        .catch(() => {});
    }

    return res.json({
      success: true,
      orderId,
      status,
      loyaltyAwarded: loyaltyResult,
    });
  } catch (err: any) {
    logger.error('orders-checkout', `Failed updating order ${orderId}`, { error: err?.message });
    return res.status(500).json({ success: false, error: err?.message || 'Failed to update order status' });
  }
});

export default router;
