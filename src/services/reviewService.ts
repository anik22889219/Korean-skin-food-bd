import { collection, doc, setDoc, onSnapshot, query, where, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import { ProductReview } from '../types';
import { productService } from './productService';
import { cloudinaryService } from './cloudinaryService';

// Seeded reviews for immediate authentic display across products
const SEEDED_REVIEWS: ProductReview[] = [
  {
    id: 'rev-seed-101',
    productId: 'cosrx-snail-96',
    userId: 'user-seed-1',
    userName: 'Anika Rahman',
    userEmail: 'anika.rahman@gmail.com',
    rating: 5,
    title: 'Holy grail for glass skin in Dhaka weather!',
    comment: 'Truly game-changing. Under Dhaka\'s extreme summer heat, most heavy moisturizers feel so sticky, but this snail mucin essence is incredibly lightweight! My skin texture feels so smooth and hydrated.',
    photos: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=60'
    ],
    isVerifiedPurchaser: true,
    createdAt: '2026-07-02T10:15:00Z',
    helpfulCount: 12,
    helpfulVoters: []
  },
  {
    id: 'rev-seed-102',
    productId: 'cosrx-snail-96',
    userId: 'user-seed-2',
    userName: 'Sajid Hasan',
    userEmail: 'sajid.hasan@yahoo.com',
    rating: 5,
    title: '100% Authentic import quality',
    comment: 'Bought this for my combination skin. Very soothing after shaving and sun exposure. Highly recommend Korean Skin Food BD for genuine authentic items.',
    photos: [],
    isVerifiedPurchaser: true,
    createdAt: '2026-06-18T14:20:00Z',
    helpfulCount: 8,
    helpfulVoters: []
  },
  {
    id: 'rev-seed-103',
    productId: 'beauty-of-joseon-relief-sun',
    userId: 'user-seed-3',
    userName: 'Nusrat Jahan',
    userEmail: 'nusrat.jahan@gmail.com',
    rating: 5,
    title: 'Zero white cast and no greasy shine',
    comment: 'Best sunscreen I have ever used in Bangladesh! Absorbs within 30 seconds with no white cast at all. Perfect under makeup too.',
    photos: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=60'
    ],
    isVerifiedPurchaser: true,
    createdAt: '2026-07-10T09:40:00Z',
    helpfulCount: 15,
    helpfulVoters: []
  },
  {
    id: 'rev-seed-104',
    productId: 'some-by-mi-miracle-toner',
    userId: 'user-seed-4',
    userName: 'Tanvir Ahmed',
    userEmail: 'tanvir.bd@gmail.com',
    rating: 4,
    title: 'Noticeable breakout control in 2 weeks',
    comment: 'Cleared up my acne flare-ups significantly. Gentle exfoliation without stripping humidity barrier.',
    photos: [],
    isVerifiedPurchaser: true,
    createdAt: '2026-07-05T16:00:00Z',
    helpfulCount: 6,
    helpfulVoters: []
  }
];

let reviewsCache: ProductReview[] = [...SEEDED_REVIEWS];

// Live Firestore Listener for product_reviews
onSnapshot(
  collection(db, 'product_reviews'),
  (snapshot) => {
    const firestoreReviews: ProductReview[] = [];
    snapshot.forEach((docSnap) => {
      firestoreReviews.push({ id: docSnap.id, ...docSnap.data() } as ProductReview);
    });

    // Combine Firestore reviews with seeded reviews (avoid duplicates)
    const existingIds = new Set(firestoreReviews.map(r => r.id));
    const uniqueSeeded = SEEDED_REVIEWS.filter(r => !existingIds.has(r.id));
    
    reviewsCache = [...firestoreReviews, ...uniqueSeeded].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
  (err) => {
    console.warn('[Firebase] product_reviews snapshot warning:', err);
    if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
      handleFirestoreError(err, OperationType.GET, 'product_reviews', false);
    }
  }
);

export const reviewService = {
  // Get all reviews for a specific product
  getProductReviews(productId: string): ProductReview[] {
    return reviewsCache.filter(r => r.productId === productId);
  },

  // Subscribe to reviews for a specific product
  subscribeReviews(productId: string, callback: (reviews: ProductReview[]) => void) {
    callback(this.getProductReviews(productId));

    // Listen to firestore updates
    const q = query(collection(db, 'product_reviews'), where('productId', '==', productId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firestoreReviews: ProductReview[] = [];
        snapshot.forEach((docSnap) => {
          firestoreReviews.push({ id: docSnap.id, ...docSnap.data() } as ProductReview);
        });

        const seedForProd = SEEDED_REVIEWS.filter(r => r.productId === productId);
        const existingIds = new Set(firestoreReviews.map(r => r.id));
        const uniqueSeeded = seedForProd.filter(r => !existingIds.has(r.id));

        const combined = [...firestoreReviews, ...uniqueSeeded].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        callback(combined);
      },
      (err) => {
        console.warn('[Firebase] product_reviews query warning:', err);
        callback(this.getProductReviews(productId));
      }
    );

    return unsubscribe;
  },

  // Submit a new review
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
  }): Promise<ProductReview> {
    const reviewId = 'rev-' + Math.random().toString(36).substring(2, 11);

    // If photos are base64 string, optionally store via cloudinaryService
    const processedPhotos: string[] = [];
    if (reviewData.photos && reviewData.photos.length > 0) {
      for (const [idx, photoStr] of reviewData.photos.entries()) {
        if (photoStr.startsWith('data:image')) {
          try {
            const uploaded = await cloudinaryService.uploadImage(
              `Review photo ${idx + 1} for ${reviewData.productId}`,
              photoStr
            );
            processedPhotos.push(uploaded.url);
          } catch (err) {
            console.warn('[ReviewService] Photo upload fallback to raw data string:', err);
            processedPhotos.push(photoStr);
          }
        } else {
          processedPhotos.push(photoStr);
        }
      }
    }

    const newReview: ProductReview = {
      id: reviewId,
      productId: reviewData.productId,
      userId: reviewData.userId || '',
      userName: reviewData.userName,
      userEmail: reviewData.userEmail || '',
      rating: reviewData.rating,
      title: reviewData.title || '',
      comment: reviewData.comment,
      photos: processedPhotos,
      isVerifiedPurchaser: reviewData.isVerifiedPurchaser,
      createdAt: new Date().toISOString(),
      helpfulCount: 0,
      helpfulVoters: []
    };

    // Update local cache synchronously
    reviewsCache = [newReview, ...reviewsCache];

    try {
      await setDoc(doc(db, 'product_reviews', reviewId), sanitizeForFirestore(newReview));
    } catch (err) {
      console.warn('[ReviewService] Firestore save error (cache updated):', err);
      handleFirestoreError(err, OperationType.WRITE, 'product_reviews', false);
    }

    // Recalculate and update the product's overall rating & reviewsCount in catalog
    this.updateAggregateProductRating(reviewData.productId);

    return newReview;
  },

  // Toggle helpful vote for a review
  async toggleHelpful(reviewId: string, userKey: string) {
    const revIndex = reviewsCache.findIndex(r => r.id === reviewId);
    if (revIndex === -1) return;

    const rev = reviewsCache[revIndex];
    const voters = rev.helpfulVoters || [];
    const hasVoted = voters.includes(userKey);

    const updatedVoters = hasVoted 
      ? voters.filter(k => k !== userKey) 
      : [...voters, userKey];
    
    const updatedCount = updatedVoters.length;

    const updatedReview: ProductReview = {
      ...rev,
      helpfulCount: updatedCount,
      helpfulVoters: updatedVoters
    };

    reviewsCache[revIndex] = updatedReview;

    try {
      await updateDoc(doc(db, 'product_reviews', reviewId), {
        helpfulCount: updatedCount,
        helpfulVoters: updatedVoters
      });
    } catch (err) {
      console.warn('[ReviewService] Update helpful vote error:', err);
    }
  },

  // Recalculate average rating & reviewsCount for a product and save to productService
  updateAggregateProductRating(productId: string) {
    const prod = productService.getProductById(productId);
    if (!prod) return;

    const allProdReviews = this.getProductReviews(productId);
    if (allProdReviews.length === 0) return;

    const totalScore = allProdReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = Number((totalScore / allProdReviews.length).toFixed(1));
    const totalCount = allProdReviews.length;

    const updatedProd = {
      ...prod,
      rating: avgRating,
      reviewsCount: totalCount
    };

    productService.updateProduct(updatedProd);
  }
};
