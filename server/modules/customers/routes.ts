import express from 'express';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { z } from 'zod';
import { getIdTokenFromRequest, getServerDb } from '../../config/firebase';
import { verifyAdminAuth, verifyOptionalAuth, verifyUserOrStaffAuth } from '../../middleware/auth';
import { publicFormRateLimiter } from '../../middleware/rateLimiter';
import { writeAuditLog } from '../../utils/auditLog';
import { logger } from '../../utils/logger';
import { getClientIp, normalizeBdPhone, stripUndefinedFields } from '../../utils/validators';
import { adjustCustomerLoyaltyPoints, getUserLoyaltyLedger } from './loyaltyService';

const router = express.Router();

const CreateReviewSchema = z.object({
  productId: z.string().trim().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().default(''),
  comment: z.string().trim().min(4, 'Please write a short review comment').max(2000),
  userName: z.string().trim().max(80).optional(),
  photos: z.array(z.string().max(4_000_000)).max(3).optional().default([]),
});

async function checkVerifiedPurchase(uid: string, email: string | undefined, productId: string): Promise<boolean> {
  const db = getServerDb();
  if (!db) return false;

  try {
    const qUid = query(collection(db, 'orders'), where('customer_uid', '==', uid));
    const snap = await getDocs(qUid);
    for (const d of snap.docs) {
      const ord = d.data() as any;
      if (String(ord.status || '').toLowerCase() === 'delivered' && Array.isArray(ord.items)) {
        if (ord.items.some((item: any) => String(item.productId) === productId)) {
          return true;
        }
      }
    }

    if (email) {
      const qEmail = query(collection(db, 'orders'), where('customerEmail', '==', email));
      const snapEmail = await getDocs(qEmail);
      for (const d of snapEmail.docs) {
        const ord = d.data() as any;
        if (String(ord.status || '').toLowerCase() === 'delivered' && Array.isArray(ord.items)) {
          if (ord.items.some((item: any) => String(item.productId) === productId)) {
            return true;
          }
        }
      }
    }
  } catch (err: any) {
    logger.warn('customers', 'Verified purchase lookup warning', { error: err?.message });
  }
  return false;
}

export async function recomputeProductRatingFromApprovedReviews(productId: string): Promise<{
  rating: number;
  reviewsCount: number;
}> {
  const db = getServerDb();
  if (!db || !productId) return { rating: 0, reviewsCount: 0 };

  const q = query(collection(db, 'product_reviews'), where('productId', '==', productId));
  const snap = await getDocs(q);
  const approved: number[] = [];
  snap.forEach((d) => {
    const data = d.data() as any;
    const status = data.status || 'approved'; // preserve legacy reviews unless explicitly pending/rejected
    if (status === 'approved' && typeof data.rating === 'number' && data.rating >= 1 && data.rating <= 5) {
      approved.push(data.rating);
    }
  });

  const reviewsCount = approved.length;
  const rating =
    reviewsCount > 0 ? Number((approved.reduce((s, v) => s + v, 0) / reviewsCount).toFixed(1)) : 0;

  try {
    const prodRef = doc(db, 'products', productId);
    const prodSnap = await getDoc(prodRef);
    if (prodSnap.exists()) {
      await updateDoc(prodRef, {
        rating,
        reviewsCount,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    logger.warn('customers', `Failed updating aggregate rating for ${productId}`, { error: err?.message });
  }

  return { rating, reviewsCount };
}

router.post('/api/reviews', verifyUserOrStaffAuth, publicFormRateLimiter, async (req, res) => {
  const db = getServerDb();
  if (!db) return res.status(503).json({ success: false, error: 'Database unavailable' });

  const parsed = CreateReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid review input',
    });
  }

  const user = (req as any).user;
  const { productId, rating, title, comment, photos } = parsed.data;
  const nowIso = new Date().toISOString();

  try {
    const prodSnap = await getDoc(doc(db, 'products', productId));
    if (!prodSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const userSnap = await getDoc(doc(db, 'users', user.uid));
    const displayName =
      parsed.data.userName ||
      (userSnap.exists() ? userSnap.data()?.name : '') ||
      (user.email ? user.email.split('@')[0] : 'Customer');

    const isVerifiedPurchaser = await checkVerifiedPurchase(user.uid, user.email, productId);

    const sanitizedPhotos = photos.filter(
      (p) => typeof p === 'string' && (p.startsWith('https://') || p.startsWith('data:image/'))
    );

    const reviewId = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const reviewDoc = stripUndefinedFields({
      id: reviewId,
      productId,
      userId: user.uid,
      userName: displayName,
      userEmail: user.email || '',
      rating,
      title,
      comment,
      photos: sanitizedPhotos,
      isVerifiedPurchaser,
      status: 'pending',
      helpfulCount: 0,
      helpfulVoters: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    await setDoc(doc(db, 'product_reviews', reviewId), reviewDoc);

    await writeAuditLog({
      action: 'REVIEW_SUBMITTED',
      entityType: 'product_review',
      entityId: reviewId,
      actorUid: user.uid,
      actorEmail: user.email,
      actorRole: user.role,
      details: { productId, rating, isVerifiedPurchaser, status: 'pending' },
    });

    return res.json({
      success: true,
      review: reviewDoc,
      message: 'Review submitted and awaiting moderation.',
    });
  } catch (err: any) {
    logger.error('customers', 'Failed creating review', { error: err?.message });
    return res.status(500).json({ success: false, error: err?.message || 'Failed to submit review' });
  }
});

router.get('/api/admin/reviews', verifyAdminAuth, async (_req, res) => {
  const db = getServerDb();
  if (!db) return res.status(503).json({ success: false, error: 'Database unavailable' });

  try {
    const snap = await getDocs(collection(db, 'product_reviews'));
    const reviews: any[] = [];
    snap.forEach((d) => {
      reviews.push({ id: d.id, ...d.data() });
    });
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({ success: true, reviews });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to load reviews' });
  }
});

const ModerateReviewSchema = z.object({
  status: z.enum(['approved', 'rejected', 'pending']),
  moderationNote: z.string().max(400).optional(),
});

router.patch('/api/admin/reviews/:id', verifyAdminAuth, async (req, res) => {
  const db = getServerDb();
  if (!db) return res.status(503).json({ success: false, error: 'Database unavailable' });

  const parsed = ModerateReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid review moderation payload' });
  }

  const reviewId = String(req.params.id || '').trim();
  const actor = (req as any).user;

  try {
    const revRef = doc(db, 'product_reviews', reviewId);
    const revSnap = await getDoc(revRef);
    if (!revSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    const revData = revSnap.data() as any;
    const nowIso = new Date().toISOString();
    const updates = stripUndefinedFields({
      status: parsed.data.status,
      moderationNote: parsed.data.moderationNote || '',
      moderatedBy: actor?.email || actor?.uid || 'admin',
      moderatedAt: nowIso,
      updatedAt: nowIso,
    });

    await updateDoc(revRef, updates);
    const aggregate = await recomputeProductRatingFromApprovedReviews(revData.productId);

    await writeAuditLog({
      action: 'REVIEW_MODERATED',
      entityType: 'product_review',
      entityId: reviewId,
      actorUid: actor?.uid,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      details: {
        productId: revData.productId,
        status: parsed.data.status,
        aggregate,
      },
    });

    return res.json({
      success: true,
      review: { id: reviewId, ...revData, ...updates },
      aggregate,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to moderate review' });
  }
});

router.post('/api/reviews/:id/helpful', publicFormRateLimiter, verifyOptionalAuth, async (req, res) => {
  const db = getServerDb();
  if (!db) return res.status(503).json({ success: false, error: 'Database unavailable' });

  const reviewId = String(req.params.id || '').trim();
  const voterKey = (req as any).user?.uid || `ip_${getClientIp(req)}`;

  try {
    const revRef = doc(db, 'product_reviews', reviewId);
    const revSnap = await getDoc(revRef);
    if (!revSnap.exists()) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    const data = revSnap.data() as any;
    const voters: string[] = Array.isArray(data.helpfulVoters) ? data.helpfulVoters : [];
    const hasVoted = voters.includes(voterKey);
    const nextVoters = hasVoted ? voters.filter((k) => k !== voterKey) : [...voters, voterKey];

    await updateDoc(revRef, {
      helpfulVoters: nextVoters,
      helpfulCount: nextVoters.length,
    });

    return res.json({
      success: true,
      helpfulCount: nextVoters.length,
      voted: !hasVoted,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed updating vote' });
  }
});

router.get('/api/loyalty/ledger', verifyUserOrStaffAuth, async (req, res) => {
  const actor = (req as any).user;
  const idToken = getIdTokenFromRequest(req);
  const requestedUserId =
    actor?.isStaff && typeof req.query.userId === 'string' && req.query.userId.trim()
      ? req.query.userId.trim()
      : actor.uid;

  try {
    const entries = await getUserLoyaltyLedger(requestedUserId, idToken);
    return res.json({ success: true, userId: requestedUserId, entries });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to load loyalty ledger' });
  }
});

const AdminLoyaltyAdjustSchema = z
  .object({
    userId: z.string().trim().min(1),
    newBalance: z.coerce.number().int().min(0).max(1_000_000).optional(),
    delta: z.coerce.number().int().min(-1_000_000).max(1_000_000).optional(),
    reason: z.string().trim().min(2).max(240).optional(),
  })
  .refine((d) => typeof d.newBalance === 'number' || typeof d.delta === 'number', {
    message: 'Provide either newBalance or delta.',
  });

router.post('/api/admin/loyalty/adjust', verifyAdminAuth, async (req, res) => {
  const actor = (req as any).user;
  if (!['super_admin', 'admin', 'hr'].includes(actor?.role || '')) {
    return res.status(403).json({
      success: false,
      error: 'Only Super Admin, Store Admin, or HR Manager can adjust loyalty balances.',
    });
  }

  const parsed = AdminLoyaltyAdjustSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid loyalty adjustment request',
    });
  }

  try {
    const result = await adjustCustomerLoyaltyPoints({
      userId: parsed.data.userId,
      newBalance: parsed.data.newBalance,
      delta: parsed.data.delta,
      reason: parsed.data.reason,
      actorUid: actor?.uid,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      idToken: getIdTokenFromRequest(req),
    });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed adjusting loyalty points' });
  }
});

const SupportTicketSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(8).max(25).optional(),
  customerEmail: z.string().trim().email().optional().or(z.literal('')),
  orderId: z.string().trim().max(60).optional(),
  subject: z.string().trim().min(3).max(180),
  description: z.string().trim().min(5).max(3000),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

router.post('/api/support-tickets', publicFormRateLimiter, verifyOptionalAuth, async (req, res) => {
  const db = getServerDb();
  if (!db) return res.status(503).json({ success: false, error: 'Database unavailable' });

  const parsed = SupportTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid support ticket payload',
    });
  }

  const user = (req as any).user;
  const nowIso = new Date().toISOString();
  const ticketId = `tkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

  const ticket = stripUndefinedFields({
    id: ticketId,
    ticketNumber,
    userId: user?.uid || null,
    orderId: parsed.data.orderId || '',
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone ? normalizeBdPhone(parsed.data.customerPhone) : '',
    customerEmail: parsed.data.customerEmail || user?.email || '',
    subject: parsed.data.subject,
    description: parsed.data.description,
    status: 'open',
    priority: parsed.data.priority,
    createdAt: nowIso,
    updatedAt: nowIso,
    channelName: '#customer-support',
    replies: [
      {
        id: 'rep-0',
        author: parsed.data.customerName,
        authorRole: 'customer',
        message: parsed.data.description,
        timestamp: nowIso,
      },
    ],
  });

  try {
    await setDoc(doc(db, 'support_tickets', ticketId), ticket);
    import('../../../src/services/slackNotificationService')
      .then(({ slackNotificationService }) => {
        slackNotificationService.notifySupportTicket(ticket as any).catch(() => {});
      })
      .catch(() => {});

    return res.json({ success: true, ticket });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to create support ticket' });
  }
});

router.get('/api/support-tickets/mine', verifyUserOrStaffAuth, async (req, res) => {
  const db = getServerDb();
  if (!db) return res.status(503).json({ success: false, error: 'Database unavailable' });

  const user = (req as any).user;
  try {
    const q = query(collection(db, 'support_tickets'), where('userId', '==', user.uid));
    const snap = await getDocs(q);
    const tickets: any[] = [];
    snap.forEach((d) => tickets.push({ id: d.id, ...d.data() }));
    tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({ success: true, tickets });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed loading support tickets' });
  }
});

export default router;
