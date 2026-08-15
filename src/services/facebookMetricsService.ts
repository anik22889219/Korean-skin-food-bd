import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { CreatorReel, MetricsSource } from '../types';
import { 
  getCreatorPointSettings,
  calculateReelPoints,
  recalculateCreatorPointsAndLevel,
  recordMetricAuditLog
} from './creatorPointService';
import { extractFacebookPostId, normalizeFacebookUrl } from '../utils/facebookUrl';

export const CREATOR_REELS_COLLECTION = 'creator_reels';
export const CREATORS_COLLECTION = 'creators';

export { extractFacebookPostId };

/**
 * Recalculates and updates totalViews, totalLikes, totalComments, and totalReels for a creator
 * based solely on approved and published reels.
 */
export async function recalculateCreatorTotals(creatorUserId: string): Promise<{
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalReels: number;
}> {
  try {
    const q = query(
      collection(db, CREATOR_REELS_COLLECTION),
      where('creatorUserId', '==', String(creatorUserId))
    );
    const querySnap = await getDocs(q);

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalReels = 0;

    querySnap.forEach((docSnap) => {
      const reel = docSnap.data() as CreatorReel;
      if (reel.status === 'approved' || reel.status === 'published') {
        totalReels += 1;
        totalViews += Number(reel.performance?.views || 0);
        totalLikes += Number(reel.performance?.likes || 0);
        totalComments += Number(reel.performance?.comments || 0);
      }
    });

    // Update Creator profile doc
    const now = new Date().toISOString();
    const creatorRef = doc(db, CREATORS_COLLECTION, String(creatorUserId));
    const creatorSnap = await getDoc(creatorRef);

    if (creatorSnap.exists()) {
      await updateDoc(creatorRef, {
        totalViews,
        totalLikes,
        totalComments,
        totalReels,
        updatedAt: now,
      });
    }

    return { totalViews, totalLikes, totalComments, totalReels };
  } catch (error) {
    console.error('Error recalculating creator totals:', error);
    return { totalViews: 0, totalLikes: 0, totalComments: 0, totalReels: 0 };
  }
}

/**
 * Admin action: Manually set verified Facebook metrics (views, likes, comments)
 * Sets metricsSource to 'admin_verified' and recalculates points server-authoritatively.
 */
export async function updateAdminVerifiedMetrics(params: {
  creatorReelId: string;
  views: number;
  likes: number;
  comments: number;
  metricsSource?: MetricsSource;
  adminId?: string;
  reason?: string;
}): Promise<void> {
  const { 
    creatorReelId, 
    views, 
    likes, 
    comments, 
    metricsSource = 'admin_verified',
    adminId = 'admin',
    reason = 'Admin verified manual metric update'
  } = params;
  const now = new Date().toISOString();

  try {
    const reelRef = doc(db, CREATOR_REELS_COLLECTION, creatorReelId);
    const reelSnap = await getDoc(reelRef);

    if (!reelSnap.exists()) {
      throw new Error(`Reel ${creatorReelId} not found.`);
    }

    const reelData = reelSnap.data() as CreatorReel;
    const postId = reelData.facebookPostId || extractFacebookPostId(reelData.facebookPostUrl) || '';

    const previousValues = {
      views: Number(reelData.performance?.views || 0),
      likes: Number(reelData.performance?.likes || 0),
      comments: Number(reelData.performance?.comments || 0),
      points: Number(reelData.performance?.points || 0),
    };

    const parsedViews = Math.max(0, Math.floor(Number(views) || 0));
    const parsedLikes = Math.max(0, Math.floor(Number(likes) || 0));
    const parsedComments = Math.max(0, Math.floor(Number(comments) || 0));

    const settings = await getCreatorPointSettings();
    const pointCalc = calculateReelPoints(
      { views: parsedViews, likes: parsedLikes, comments: parsedComments },
      reelData.status,
      settings
    );

    const newValues = {
      views: parsedViews,
      likes: parsedLikes,
      comments: parsedComments,
      points: pointCalc.totalPoints,
    };

    const updatedPerformance = {
      ...reelData.performance,
      views: parsedViews,
      likes: parsedLikes,
      comments: parsedComments,
      points: pointCalc.totalPoints,
      viewPoints: pointCalc.viewPoints,
      likePoints: pointCalc.likePoints,
      commentPoints: pointCalc.commentPoints,
      metricsSource,
      metricsUpdatedAt: now,
      facebookPostId: postId,
    };

    await updateDoc(reelRef, {
      performance: updatedPerformance,
      facebookPostId: postId,
      metricsSource,
      metricsUpdatedAt: now,
      lastSyncError: null,
      syncStatus: 'synced',
      updatedAt: now,
    });

    // Record Audit Log for manual update
    await recordMetricAuditLog({
      creatorReelId,
      adminId,
      previousValues,
      newValues,
      reason,
    });

    // Automatically recalculate creator points, totals, and level
    if (reelData.creatorUserId) {
      await recalculateCreatorPointsAndLevel(reelData.creatorUserId, settings);
    }
  } catch (error) {
    console.error('Error updating admin verified metrics:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${CREATOR_REELS_COLLECTION}/${creatorReelId}`);
    throw error;
  }
}

/**
 * Fetch reel metrics via Express API (Public or Creator view)
 */
export async function fetchReelMetricsFromApi(creatorReelId: string): Promise<{
  success: boolean;
  performance?: any;
  facebookApiConfigured?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`/api/creator/reels/${creatorReelId}/metrics`);
    const data = await response.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error fetching metrics' };
  }
}

/**
 * Trigger Facebook API refresh or Admin metrics update via Express API
 */
export async function postAdminReelMetricsApi(creatorReelId: string, payload: {
  views?: number;
  likes?: number;
  comments?: number;
  metricsSource?: MetricsSource;
  reason?: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  performance?: any;
  creatorResult?: any;
}> {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/admin/creator-reels/${creatorReelId}/metrics`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating metrics' };
  }
}

/**
 * Trigger Facebook Graph API live metrics fetch via Express API
 * Passes Firebase authorization header and handles graceful metric preservation on error.
 */
export async function refreshFacebookApiMetricsApi(creatorReelId: string): Promise<{
  success: boolean;
  apiAvailable?: boolean;
  performance?: any;
  creatorResult?: any;
  message?: string;
  error?: string;
  preservedPerformance?: any;
}> {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/admin/creator-reels/${creatorReelId}/refresh-facebook`, {
      method: 'POST',
      headers,
    });
    return await response.json();
  } catch (err: any) {
    return { 
      success: false, 
      apiAvailable: false, 
      error: err.message || 'Network error executing Facebook API request' 
    };
  }
}
