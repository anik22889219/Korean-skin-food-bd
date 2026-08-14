import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { CreatorReel, MetricsSource } from '../types';

export const CREATOR_REELS_COLLECTION = 'creator_reels';
export const CREATORS_COLLECTION = 'creators';

/**
 * Extract Facebook Post/Reel ID from various Facebook URL formats
 */
export function extractFacebookPostId(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();

  // Reel URL e.g. /reel/123456789/
  const reelMatch = cleanUrl.match(/\/reel\/([0-9a-zA-Z_-]+)/i);
  if (reelMatch && reelMatch[1]) return reelMatch[1];

  // Watch URL e.g. /watch/?v=123456789
  const watchMatch = cleanUrl.match(/[?&]v=([0-9a-zA-Z_-]+)/i);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  // Video URL e.g. /videos/123456789/
  const videoMatch = cleanUrl.match(/\/videos\/([0-9a-zA-Z_-]+)/i);
  if (videoMatch && videoMatch[1]) return videoMatch[1];

  // Post / permalink fbid e.g. story_fbid=123456789
  const fbidMatch = cleanUrl.match(/[?&]story_fbid=([0-9a-zA-Z_-]+)/i);
  if (fbidMatch && fbidMatch[1]) return fbidMatch[1];

  // Posts match e.g. /posts/123456789 or /posts/pfbid...
  const postsMatch = cleanUrl.match(/\/posts\/([0-9a-zA-Z_-]+)/i);
  if (postsMatch && postsMatch[1]) return postsMatch[1];

  return null;
}

/**
 * Recalculates and updates totalViews, totalLikes, totalComments for a creator
 * based solely on approved and published reels.
 */
export async function recalculateCreatorTotals(creatorUserId: string | string): Promise<{
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalReels: number;
}> {
  try {
    const q = query(
      collection(db, CREATOR_REELS_COLLECTION),
      where('creatorUserId', '==', creatorUserId)
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
    const creatorRef = doc(db, CREATORS_COLLECTION, creatorUserId);
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

import { 
  getCreatorPointSettings,
  calculateReelPoints,
  recalculateCreatorPointsAndLevel,
  recordMetricAuditLog
} from './creatorPointService';

/**
 * Admin action: Manually set verified Facebook metrics (views, likes, comments)
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

    const parsedViews = Math.max(0, Math.floor(views));
    const parsedLikes = Math.max(0, Math.floor(likes));
    const parsedComments = Math.max(0, Math.floor(comments));

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
 * Fetch reel metrics via Express API
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
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  performance?: any;
}> {
  try {
    const response = await fetch(`/api/admin/creator-reels/${creatorReelId}/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating metrics' };
  }
}

/**
 * Trigger Facebook Graph API live metrics fetch via Express API
 */
export async function refreshFacebookApiMetricsApi(creatorReelId: string): Promise<{
  success: boolean;
  apiAvailable?: boolean;
  performance?: any;
  message?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`/api/admin/creator-reels/${creatorReelId}/refresh-facebook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await response.json();
  } catch (err: any) {
    return { success: false, apiAvailable: false, error: err.message || 'Network error executing Facebook API request' };
  }
}
