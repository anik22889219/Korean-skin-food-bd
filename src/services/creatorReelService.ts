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
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { CreatorReel, CreatorReelStatus } from '../types';

export const CREATOR_REELS_COLLECTION = 'creator_reels';

/**
 * Create a new Creator Reel submission
 */
export async function createCreatorReel(params: {
  creatorId: string;
  creatorUserId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption: string;
  description?: string;
  facebookPostUrl: string;
  productIds?: string[];
  productNames?: string[];
}): Promise<CreatorReel> {
  const creatorReelId = `reel-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  // Basic Facebook URL validation
  const cleanFbUrl = params.facebookPostUrl.trim();
  const fbRegex = /^(https?:\/\/)?(www\.|m\.)?(facebook\.com|fb\.watch|fb\.gg)\/.+/i;
  if (!cleanFbUrl || !fbRegex.test(cleanFbUrl)) {
    throw new Error('Please enter a valid Facebook Reel or Post URL (e.g., https://facebook.com/reel/...)');
  }

  if (!params.videoUrl) {
    throw new Error('Video file or video URL is required.');
  }

  if (!params.caption || !params.caption.trim()) {
    throw new Error('Reel caption is required.');
  }

  // 1. Verify creator status (Must be approved)
  try {
    const creatorRef = doc(db, 'creators', params.creatorUserId);
    const creatorSnap = await getDoc(creatorRef);
    if (!creatorSnap.exists() || creatorSnap.data()?.status !== 'approved') {
      const currentStatus = creatorSnap.exists() ? creatorSnap.data()?.status : 'unregistered';
      throw new Error(`Only approved creators can submit reels. Your creator account status is: ${currentStatus}`);
    }
  } catch (err: any) {
    if (err.message.includes('Only approved creators')) throw err;
    console.warn('Could not verify creator status prior to reel creation:', err);
  }

  // 2. Check for duplicate Facebook Reel URL
  try {
    const dupQuery = query(
      collection(db, CREATOR_REELS_COLLECTION),
      where('facebookPostUrl', '==', cleanFbUrl)
    );
    const dupSnap = await getDocs(dupQuery);
    if (!dupSnap.empty) {
      throw new Error('This Facebook Reel/Post URL has already been submitted to the creator program.');
    }
  } catch (dupErr: any) {
    if (dupErr.message.includes('already been submitted')) throw dupErr;
    console.warn('Duplicate Facebook Reel URL check warning:', dupErr);
  }

  const newReel: CreatorReel = {
    creatorReelId,
    creatorId: params.creatorId,
    creatorUserId: params.creatorUserId,
    videoUrl: params.videoUrl,
    thumbnailUrl: params.thumbnailUrl || 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=60',
    caption: params.caption.trim(),
    description: params.description ? params.description.trim() : '',
    facebookPostUrl: params.facebookPostUrl.trim(),
    productIds: params.productIds || [],
    productNames: params.productNames || [],
    status: 'pending',
    adminNote: '',
    performance: {
      views: 0,
      likes: 0,
      comments: 0,
      points: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, CREATOR_REELS_COLLECTION, creatorReelId);
    await setDoc(docRef, newReel);
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

import { recalculateCreatorPointsAndLevel } from './creatorPointService';

/**
 * Admin action: Update status (approve, reject, publish) & admin note
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

    if (status === 'approved') {
      updatePayload.approvedAt = now;
    } else if (status === 'published') {
      updatePayload.publishedAt = now;
      if (!updatePayload.approvedAt) {
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
 * Delete a creator reel
 */
export async function deleteCreatorReel(creatorReelId: string): Promise<void> {
  try {
    const docRef = doc(db, CREATOR_REELS_COLLECTION, creatorReelId);
    await deleteDoc(docRef);
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
