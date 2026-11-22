import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { ProductReview } from '../types';
import { cloudinaryService } from './cloudinaryService';
import { authFetch } from './apiClient';
import { auth } from './firebase';

let reviewsCache: ProductReview[] = [];

const sortByLatest = (list: ProductReview[]) =>
  [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export const reviewService = {
  // Get cached approved reviews for a product
  getProductReviews(productId: string, currentUserId?: string): ProductReview[] {
    return reviewsCache.filter((r) => {
      if (r.productId !== productId) return false;
      const status = r.status || 'approved';
      if (status === 'approved') return true;
      if (currentUserId && r.userId === currentUserId) return true;
      return false;
    });
  },

  // Subscribe to approved product reviews (+ user's own pending/rejected reviews if signed in)
  subscribeReviews(
    productId: string,
    callback: (reviews: ProductReview[]) => void,
    currentUserId?: string
  ) {
    callback(this.getProductReviews(productId, currentUserId));

    let approvedList: ProductReview[] = [];
    let ownList: ProductReview[] = [];

    const emitMerged = () => {
      const mergedMap = new Map<string, ProductReview>();
      for (const r of approvedList) {
        if (!r.status || r.status === 'approved') {
          mergedMap.set(r.id, r);
        }
      }
      if (currentUserId) {
        for (const r of ownList) {
          if (r.userId === currentUserId) {
            mergedMap.set(r.id, r);
          }
        }
      }

      const merged = sortByLatest(Array.from(mergedMap.values()));
      reviewsCache = sortByLatest([
        ...reviewsCache.filter((r) => r.productId !== productId),
        ...merged,
      ]);
      callback(merged);
    };

    // Approved reviews query (safe against hardened Firestore security rules)
    const approvedQuery = query(
      collection(db, 'product_reviews'),
      where('productId', '==', productId),
      where('status', '==', 'approved')
    );

    const unsubApproved = onSnapshot(
      approvedQuery,
      (snapshot) => {
        const loaded: ProductReview[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as ProductReview);
        });
        approvedList = loaded;
        emitMerged();
      },
      (err) => {
        console.warn('[ReviewService] Approved reviews snapshot warning:', err?.message || err);
        callback(this.getProductReviews(productId, currentUserId));
      }
    );

    let unsubOwn: (() => void) | null = null;
    if (currentUserId) {
      const ownQuery = query(
        collection(db, 'product_reviews'),
        where('productId', '==', productId),
        where('userId', '==', currentUserId)
      );
      unsubOwn = onSnapshot(
        ownQuery,
        (snapshot) => {
          const loaded: ProductReview[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push({ id: docSnap.id, ...docSnap.data() } as ProductReview);
          });
          ownList = loaded;
          emitMerged();
        },
        (err) => {
          console.warn('[ReviewService] Own reviews snapshot warning:', err?.message || err);
        }
      );
    }

    return () => {
      unsubApproved();
      if (unsubOwn) unsubOwn();
    };
  },

  // Submit a new review through the server-verified moderation endpoint
  async addReview(reviewData: {
    productId: string;
    userId?: string;
    userName: string;
    userEmail?: string;
    rating: number;
    title?: string;
    comment: string;
    photos?: string[];
    isVerifiedPurchaser: boolean;
  }): Promise<{ review: ProductReview; message: string }> {
    const processedPhotos: string[] = [];
    if (reviewData.photos && reviewData.photos.length > 0) {
      for (const [idx, photoStr] of reviewData.photos.slice(0, 3).entries()) {
        if (photoStr.startsWith('data:image')) {
          try {
            const uploaded = await cloudinaryService.uploadImage(
              `Review photo ${idx + 1} for ${reviewData.productId}`,
              photoStr
            );
            processedPhotos.push(uploaded.url);
          } catch (err) {
            console.warn('[ReviewService] Photo upload fallback:', err);
            processedPhotos.push(photoStr);
          }
        } else {
          processedPhotos.push(photoStr);
        }
      }
    }

    const res = await authFetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: reviewData.productId,
        rating: reviewData.rating,
        title: reviewData.title || '',
        comment: reviewData.comment,
        userName: reviewData.userName,
        photos: processedPhotos,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success || !json.review) {
      throw new Error(json.error || 'Could not submit your review. Please sign in and try again.');
    }

    const created: ProductReview = json.review;
    reviewsCache = sortByLatest([created, ...reviewsCache.filter((r) => r.id !== created.id)]);

    return {
      review: created,
      message: json.message || 'Review submitted and awaiting moderation.',
    };
  },

  // Toggle helpful vote via server endpoint
  async toggleHelpful(reviewId: string): Promise<{ helpfulCount: number; voted: boolean } | null> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const res = auth.currentUser
        ? await authFetch(`/api/reviews/${encodeURIComponent(reviewId)}/helpful`, {
            method: 'POST',
            headers,
          })
        : await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/helpful`, {
            method: 'POST',
            headers,
          });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        return null;
      }

      const idx = reviewsCache.findIndex((r) => r.id === reviewId);
      if (idx !== -1) {
        reviewsCache[idx] = {
          ...reviewsCache[idx],
          helpfulCount: json.helpfulCount,
        };
      }
      return { helpfulCount: json.helpfulCount, voted: Boolean(json.voted) };
    } catch (err) {
      console.warn('[ReviewService] Update helpful vote error:', err);
      return null;
    }
  },

  // Admin: fetch all product reviews (pending, approved, rejected)
  async getAdminReviews(): Promise<ProductReview[]> {
    const res = await authFetch('/api/admin/reviews');
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to fetch product reviews for moderation.');
    }
    return Array.isArray(json.reviews) ? json.reviews : [];
  },

  // Admin: approve or reject a review (server recomputes product rating/reviewsCount)
  async moderateReview(
    reviewId: string,
    status: 'approved' | 'rejected' | 'pending',
    moderationNote?: string
  ): Promise<{ review: ProductReview; aggregate?: { rating: number; reviewsCount: number } }> {
    const res = await authFetch(`/api/admin/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, moderationNote: moderationNote || '' }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update review moderation status.');
    }
    return { review: json.review, aggregate: json.aggregate };
  },
};
