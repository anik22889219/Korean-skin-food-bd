import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { CreatorProfile, CreatorStatus } from '../types';

export const CREATORS_COLLECTION = 'creators';

/**
 * Get a creator profile by user ID or creator ID
 */
export async function getCreatorProfile(id: string): Promise<CreatorProfile | null> {
  try {
    // First try direct document lookup (creatorId === userId)
    const docRef = doc(db, CREATORS_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as CreatorProfile;
    }

    // Fallback query by userId
    const q = query(collection(db, CREATORS_COLLECTION), where('userId', '==', id));
    const querySnap = await getDocs(q);

    if (!querySnap.empty) {
      return querySnap.docs[0].data() as CreatorProfile;
    }

    return null;
  } catch (error) {
    console.error('Error fetching creator profile:', error);
    handleFirestoreError(error, OperationType.GET, `${CREATORS_COLLECTION}/${id}`, false);
    return null;
  }
}

/**
 * Apply or register to become a Creator
 */
export async function applyForCreatorProfile(params: {
  userId: string;
  email: string;
  phone: string;
  username: string;
  displayName: string;
  bio: string;
  profileImage?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  niche?: string;
}): Promise<CreatorProfile> {
  const creatorId = params.userId; // Use userId as creatorId for 1:1 mapping
  const now = new Date().toISOString();

  const newProfile: CreatorProfile = {
    creatorId,
    userId: params.userId,
    username: params.username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
    displayName: params.displayName,
    profileImage: params.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    bio: params.bio,
    email: params.email,
    phone: params.phone,
    facebookUrl: params.facebookUrl || '',
    instagramUrl: params.instagramUrl || '',
    niche: params.niche || 'K-Beauty & Skincare Reviews',
    status: 'pending',
    role: 'creator',

    // Statistics (Initial values 0)
    totalReels: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalPoints: 0,

    // Initial Level
    level: 1,
    levelName: 'K-Beauty Novice',
    levelProgress: 0,
    nextLevelPoints: 100,

    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, CREATORS_COLLECTION, creatorId);
    await setDoc(docRef, newProfile);

    // Also update role in user document safely
    try {
      const userRef = doc(db, 'users', params.userId);
      await updateDoc(userRef, {
        role: 'creator',
        creatorId,
        updatedAt: now,
      });
    } catch (e) {
      console.warn('Could not update role in user doc directly (may not exist yet):', e);
    }

    return newProfile;
  } catch (error) {
    console.error('Error creating creator profile:', error);
    handleFirestoreError(error, OperationType.CREATE, `${CREATORS_COLLECTION}/${creatorId}`);
    throw error;
  }
}

/**
 * Update creator editable profile fields (displayName, username, profileImage, bio, phone)
 */
export async function updateCreatorProfileData(
  creatorId: string,
  data: Partial<Pick<CreatorProfile, 'displayName' | 'username' | 'profileImage' | 'bio' | 'phone' | 'facebookUrl' | 'instagramUrl' | 'niche' | 'shippingAddress' | 'socialLinks'>>
): Promise<void> {
  try {
    const docRef = doc(db, CREATORS_COLLECTION, creatorId);
    const updatePayload = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(docRef, updatePayload);
  } catch (error) {
    console.error('Error updating creator profile:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${CREATORS_COLLECTION}/${creatorId}`);
    throw error;
  }
}

/**
 * Admin action: Update creator approval status (pending | approved | suspended)
 */
export async function updateCreatorStatusByAdmin(
  creatorId: string,
  status: CreatorStatus
): Promise<void> {
  try {
    const docRef = doc(db, CREATORS_COLLECTION, creatorId);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating creator status by admin:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${CREATORS_COLLECTION}/${creatorId}`);
    throw error;
  }
}

/**
 * Fetch all creators for admin management
 */
export async function getAllCreatorsForAdmin(): Promise<CreatorProfile[]> {
  try {
    const querySnap = await getDocs(collection(db, CREATORS_COLLECTION));
    const creators: CreatorProfile[] = [];
    querySnap.forEach((d) => {
      creators.push(d.data() as CreatorProfile);
    });
    return creators;
  } catch (error) {
    console.error('Error getting all creators:', error);
    handleFirestoreError(error, OperationType.LIST, CREATORS_COLLECTION, false);
    return [];
  }
}

/**
 * Subscribe to creator profile real-time updates
 */
export function subscribeToCreatorProfile(
  userId: string,
  onUpdate: (profile: CreatorProfile | null) => void
) {
  const docRef = doc(db, CREATORS_COLLECTION, userId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as CreatorProfile);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn('Creator profile snapshot listener error:', err);
      onUpdate(null);
    }
  );
}
