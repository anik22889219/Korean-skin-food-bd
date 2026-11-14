import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  runTransaction,
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import { CreatorReel, CreatorReelStatus } from '../types';
import { normalizeFacebookUrl, areFacebookUrlsEqual, extractFacebookPostId } from '../utils/facebookUrl';
import { recalculateCreatorPointsAndLevel } from './creatorPointService';
import { updateYouTubeVideoPrivacy, deleteYouTubeVideo } from './youtubeService';

export const CREATOR_REELS_COLLECTION = 'creator_reels';
export const DAILY_CREATOR_UPLOAD_LIMIT = 1;

export function getDhakaDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getCreatorUploadsTodayCount(reels: CreatorReel[]): number {
  const todayDhaka = getDhakaDateString();
  return reels.filter((r) => {
    if (!r.createdAt) return false;
    return getDhakaDateString(new Date(r.createdAt)) === todayDhaka;
  }).length;
}

/**
 * Create a new Creator Reel submission (YouTube primary, optional Facebook URL)
 */
export async function createCreatorReel(params: {
  creatorId: string;
  creatorUserId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  uploadProvider?: 'youtube' | 'cloudinary' | 'external';
  youtubeVideoId?: string;
  youtubePrivacyStatus?: 'private' | 'unlisted' | 'public';
  youtubeChannelId?: string;
  youtubeChannelTitle?: string;
  cloudinaryPublicId?: string;
  secureUrl?: string;
  resourceType?: 'video' | 'image';
  duration?: number;
  width?: number;
  height?: number;
  videoMetadata?: Record<string, any>;
  caption: string;
  description?: string;
  facebookPostUrl?: string;
  productIds?: string[];
  productNames?: string[];
}): Promise<CreatorReel> {
  const creatorReelId = `reel-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  if (!params.creatorUserId) {
    throw new Error('Creator User ID is required to submit a reel.');
  }

  if (!params.caption || !params.caption.trim()) {
    throw new Error('Reel caption is required.');
  }

  if (!params.videoUrl) {
    throw new Error('Video file or video URL is required.');
  }

  // Guard: Never store large base64 Data URLs in Firestore
  if (params.videoUrl.startsWith('data:')) {
    throw new Error('Direct video Data URLs cannot be saved to the database.');
  }

  // 1. Optional Facebook Post/Reel URL normalization
  const rawFbUrl = (params.facebookPostUrl || '').trim();
  let normalizedUrl = '';
  let facebookPostId = '';
  if (rawFbUrl) {
    const normResult = normalizeFacebookUrl(rawFbUrl);
    if (!normResult.isValid || !normResult.normalizedUrl) {
      throw new Error(normResult.error || 'Please enter a valid Facebook Reel or Post URL (e.g. https://facebook.com/reel/...)');
    }
    normalizedUrl = normResult.normalizedUrl;
    facebookPostId = normResult.postId || extractFacebookPostId(rawFbUrl) || '';
  }

  // 2. Verify creator profile & approval status
  try {
    const creatorRef = doc(db, 'creators', params.creatorUserId);
    const creatorSnap = await getDoc(creatorRef);

    if (!creatorSnap.exists()) {
      throw new Error('Creator profile not found. Please apply to become a creator first.');
    }

    const creatorData = creatorSnap.data();
    if (creatorData.status !== 'approved') {
      throw new Error(`Only approved creators can submit reels. Your current account status is: ${creatorData.status || 'pending'}`);
    }
  } catch (creatorErr: any) {
    if (creatorErr.message.includes('approved creators') || creatorErr.message.includes('not found')) {
      throw creatorErr;
    }
    console.warn('Could not verify creator status pre-check:', creatorErr);
  }

  // 3. Enforce 1 video/day limit & check duplicates for this creator
  try {
    const myReelsSnap = await getDocs(
      query(
        collection(db, CREATOR_REELS_COLLECTION),
        where('creatorUserId', '==', params.creatorUserId)
      )
    );
    const myReels: CreatorReel[] = [];
    myReelsSnap.forEach((d) => myReels.push(d.data() as CreatorReel));

    if (getCreatorUploadsTodayCount(myReels) >= DAILY_CREATOR_UPLOAD_LIMIT) {
      throw new Error('Daily upload limit reached: A creator can upload only 1 video per day.');
    }

    if (params.youtubeVideoId && myReels.some((r) => r.youtubeVideoId === params.youtubeVideoId)) {
      throw new Error('This YouTube video has already been submitted.');
    }

    if (normalizedUrl) {
      const allReelsSnap = await getDocs(collection(db, CREATOR_REELS_COLLECTION));
      for (const reelDoc of allReelsSnap.docs) {
        const existing = reelDoc.data() as CreatorReel;
        if (!existing) continue;

        if (existing.normalizedFacebookUrl || existing.facebookPostUrl) {
          const isDuplicate = areFacebookUrlsEqual(
            existing.normalizedFacebookUrl || existing.facebookPostUrl || '',
            normalizedUrl
          );
          if (isDuplicate) {
            throw new Error('This Facebook Reel/Post URL has already been submitted to the creator program.');
          }
        }

        if (facebookPostId && existing.facebookPostId && existing.facebookPostId === facebookPostId) {
          throw new Error('This Facebook Reel/Post ID has already been submitted to the creator program.');
        }
      }
    }
  } catch (dupErr: any) {
    if (
      dupErr.message.includes('already been submitted') ||
      dupErr.message.includes('Daily upload limit')
    ) {
      throw dupErr;
    }
    console.warn('Reel pre-check warning:', dupErr);
  }

  // 4. Construct Reel Document with initial pending status and 0 points
  const newReel: CreatorReel = {
    creatorReelId,
    creatorId: params.creatorId || params.creatorUserId,
    creatorUserId: params.creatorUserId,
    videoUrl: params.videoUrl,
    thumbnailUrl: params.thumbnailUrl || 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=60',
    uploadProvider: params.uploadProvider || (params.youtubeVideoId ? 'youtube' : 'external'),
    youtubeVideoId: params.youtubeVideoId || undefined,
    youtubePrivacyStatus: params.youtubePrivacyStatus || undefined,
    youtubeChannelId: params.youtubeChannelId || undefined,
    youtubeChannelTitle: params.youtubeChannelTitle || undefined,
    cloudinaryPublicId: params.cloudinaryPublicId || '',
    secureUrl: params.secureUrl || params.videoUrl,
    resourceType: params.resourceType || 'video',
    duration: params.duration || 0,
    width: params.width || 0,
    height: params.height || 0,
    videoMetadata: params.videoMetadata || {},
    caption: params.caption.trim(),
    description: params.description ? params.description.trim() : '',
    facebookPostUrl: rawFbUrl || undefined,
    normalizedFacebookUrl: normalizedUrl || undefined,
    facebookPostId: facebookPostId || undefined,
    productIds: params.productIds || [],
    productNames: params.productNames || [],
    status: 'pending', // Always initial pending status for moderation
    adminNote: '',
    performance: {
      views: 0,
      likes: 0,
      comments: 0,
      points: 0,
      viewPoints: 0,
      likePoints: 0,
      commentPoints: 0,
      metricsSource: 'none',
      metricsUpdatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, CREATOR_REELS_COLLECTION, creatorReelId);
    await setDoc(docRef, sanitizeForFirestore(newReel));
    return newReel;
  } catch (error) {
    console.error('Error creating creator reel:', error);
    handleFirestoreError(error, OperationType.CREATE, `${CREATOR_REELS_COLLECTION}/${creatorReelId}`);
    throw error;
  }
}

/**
 * Fetch reels uploaded by a specific creator
 */
export async function getCreatorReels(creatorUserId: string): Promise<CreatorReel[]> {
  try {
    const q = query(
      collection(db, CREATOR_REELS_COLLECTION),
      where('creatorUserId', '==', creatorUserId)
    );
    const querySnap = await getDocs(q);
    const reels: CreatorReel[] = [];
    querySnap.forEach((d) => {
      reels.push(d.data() as CreatorReel);
    });
    // Sort client-side newest first
    return reels.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error fetching creator reels:', error);
    handleFirestoreError(error, OperationType.LIST, CREATOR_REELS_COLLECTION, false);
    return [];
  }
}

/**
 * Fetch all creator reels for Admin moderation
 */
export async function getAllCreatorReelsForAdmin(): Promise<CreatorReel[]> {
  try {
    const querySnap = await getDocs(collection(db, CREATOR_REELS_COLLECTION));
    const reels: CreatorReel[] = [];
    querySnap.forEach((d) => {
      reels.push(d.data() as CreatorReel);
    });
    return reels.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error fetching all reels for admin:', error);
    handleFirestoreError(error, OperationType.LIST, CREATOR_REELS_COLLECTION, false);
    return [];
  }
}

/**
 * Admin action: Update status (approve, reject, publish) & admin note.
 * Automatically updates YouTube privacy status (public on approve/publish, private on reject).
 */
export async function updateReelStatusByAdmin(
  creatorReelId: string,
  status: CreatorReelStatus,
  adminNote?: string
): Promise<void> {
  const now = new Date().toISOString();
  try {
    const docRef = doc(db, CREATOR_REELS_COLLECTION, creatorReelId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`Reel ${creatorReelId} not found.`);
    }

    const reelData = docSnap.data() as CreatorReel;

    const updatePayload: Record<string, any> = {
      status,
      updatedAt: now,
    };

    if (adminNote !== undefined) {
      updatePayload.adminNote = adminNote;
    }

    // Sync YouTube privacy status if this reel is hosted on YouTube
    if (reelData.youtubeVideoId) {
      const targetPrivacy: 'public' | 'unlisted' | 'private' =
        status === 'approved' || status === 'published'
          ? 'public'
          : status === 'rejected'
          ? 'private'
          : 'unlisted';

      const ytRes = await updateYouTubeVideoPrivacy(reelData.youtubeVideoId, targetPrivacy);
      updatePayload.youtubePrivacyStatus = ytRes.privacyStatus;
    }

    if (status === 'approved') {
      updatePayload.approvedAt = now;
    } else if (status === 'published') {
      updatePayload.publishedAt = now;
      if (!reelData.approvedAt) {
        updatePayload.approvedAt = now;
      }
    }

    await updateDoc(docRef, updatePayload);

    // Recalculate creator points, totals, and level automatically
    if (reelData.creatorUserId) {
      await recalculateCreatorPointsAndLevel(reelData.creatorUserId);
    }
  } catch (error) {
    console.error('Error updating reel status by admin:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${CREATOR_REELS_COLLECTION}/${creatorReelId}`);
    throw error;
  }
}

/**
 * Delete a creator reel and recalculate creator totals.
 * If deleteFromYouTube is true and the reel has a youtubeVideoId, removes it from YouTube as well.
 */
export async function deleteCreatorReel(
  creatorReelId: string,
  options: { deleteFromYouTube?: boolean } = {}
): Promise<void> {
  try {
    const docRef = doc(db, CREATOR_REELS_COLLECTION, creatorReelId);
    const snap = await getDoc(docRef);
    const reelData = snap.exists() ? (snap.data() as CreatorReel) : null;
    const creatorUserId = reelData?.creatorUserId || null;

    if (options.deleteFromYouTube && reelData?.youtubeVideoId) {
      await deleteYouTubeVideo(reelData.youtubeVideoId).catch((err) => {
        console.warn('Could not delete YouTube video during reel deletion:', err);
      });
    }

    await deleteDoc(docRef);

    if (creatorUserId) {
      await recalculateCreatorPointsAndLevel(creatorUserId);
    }
  } catch (error) {
    console.error('Error deleting creator reel:', error);
    handleFirestoreError(error, OperationType.DELETE, `${CREATOR_REELS_COLLECTION}/${creatorReelId}`);
    throw error;
  }
}

/**
 * Real-time subscription to a specific creator's reels
 */
export function subscribeToCreatorReels(
  creatorUserId: string,
  onUpdate: (reels: CreatorReel[]) => void
) {
  const q = query(
    collection(db, CREATOR_REELS_COLLECTION),
    where('creatorUserId', '==', creatorUserId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: CreatorReel[] = [];
      snap.forEach((d) => {
        list.push(d.data() as CreatorReel);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.warn('Creator reels snapshot listener warning:', err);
      onUpdate([]);
    }
  );
}

/**
 * Real-time subscription to ALL creator reels for Admin panel
 */
export function subscribeToAllReelsForAdmin(onUpdate: (reels: CreatorReel[]) => void) {
  const colRef = collection(db, CREATOR_REELS_COLLECTION);
  return onSnapshot(
    colRef,
    (snap) => {
      const list: CreatorReel[] = [];
      snap.forEach((d) => {
        list.push(d.data() as CreatorReel);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.warn('Admin creator reels snapshot listener warning:', err);
      onUpdate([]);
    }
  );
}
