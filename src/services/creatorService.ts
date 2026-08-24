import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  runTransaction,
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import { CreatorProfile, CreatorStatus } from '../types';

export const CREATORS_COLLECTION = 'creators';
export const PUBLIC_CREATORS_COLLECTION = 'public_creators';

/**
 * Synchronizes public fields to public_creators/{creatorId}
 */
export async function syncPublicCreatorProfile(creator: Partial<CreatorProfile> & { creatorId: string }): Promise<void> {
  try {
    const publicRef = doc(db, PUBLIC_CREATORS_COLLECTION, creator.creatorId);
    const publicPayload = {
      creatorId: creator.creatorId,
      username: creator.username || '',
      displayName: creator.displayName || '',
      profileImage: creator.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      bio: creator.bio || '',
      level: creator.level !== undefined ? creator.level : 1,
      levelName: creator.levelName || 'K-Beauty Novice',
      totalPoints: creator.totalPoints !== undefined ? creator.totalPoints : 0,
      totalViews: creator.totalViews !== undefined ? creator.totalViews : 0,
      totalLikes: creator.totalLikes !== undefined ? creator.totalLikes : 0,
      totalComments: creator.totalComments !== undefined ? creator.totalComments : 0,
      totalReels: creator.totalReels !== undefined ? creator.totalReels : 0,
      status: creator.status || 'pending',
      updatedAt: new Date().toISOString(),
    };
    await setDoc(publicRef, sanitizeForFirestore(publicPayload), { merge: true });
  } catch (err) {
    console.warn('Could not sync to public_creators collection:', err);
  }
}

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
 * Apply or register to become a Creator.
 * Uses a Firestore transaction to guarantee atomic creation and prevent duplicate applications or partial registration.
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
  if (!params.userId) {
    throw new Error('User ID is required to apply for the creator program.');
  }

  const cleanUsername = params.username.toLowerCase().replace(/[^a-z0-9_]/g, '').trim();
  if (!cleanUsername) {
    throw new Error('Please provide a valid creator username (letters, numbers, underscores).');
  }

  if (!params.displayName || !params.displayName.trim()) {
    throw new Error('Display Name is required.');
  }

  // Pre-check for username uniqueness across other accounts
  try {
    const userQuery = query(
      collection(db, CREATORS_COLLECTION),
      where('username', '==', cleanUsername)
    );
    const userSnap = await getDocs(userQuery);
    if (!userSnap.empty) {
      const existingCreator = userSnap.docs[0].data() as CreatorProfile;
      if (existingCreator.userId !== params.userId && existingCreator.creatorId !== params.userId) {
        throw new Error(`The handle @${cleanUsername} is already registered by another creator. Please choose a different username.`);
      }
    }
  } catch (err: any) {
    if (err.message.includes('already registered')) throw err;
    console.warn('Username uniqueness pre-check warning:', err);
  }

  const creatorId = params.userId; // 1:1 mapping between userId and creatorId
  const now = new Date().toISOString();

  const newProfile: CreatorProfile = {
    creatorId,
    userId: params.userId,
    username: cleanUsername,
    displayName: params.displayName.trim(),
    profileImage: params.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    bio: params.bio ? params.bio.trim() : `Passionate K-Beauty creator focusing on ${params.niche || 'skincare'}.`,
    email: params.email ? params.email.trim() : '',
    phone: params.phone ? params.phone.trim() : '',
    facebookUrl: params.facebookUrl ? params.facebookUrl.trim() : '',
    instagramUrl: params.instagramUrl ? params.instagramUrl.trim() : '',
    niche: params.niche ? params.niche.trim() : 'K-Beauty & Skincare Reviews',
    status: 'pending',
    role: 'creator',

    // Initial Performance Metrics
    totalReels: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalPoints: 0,

    // Initial Level Progression
    level: 1,
    levelName: 'K-Beauty Novice',
    levelProgress: 0,
    nextLevelPoints: 100,

    createdAt: now,
    updatedAt: now,
  };

  const publicPayload = {
    creatorId,
    username: newProfile.username,
    displayName: newProfile.displayName,
    profileImage: newProfile.profileImage,
    bio: newProfile.bio,
    level: newProfile.level,
    levelName: newProfile.levelName,
    totalPoints: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalReels: 0,
    status: 'pending',
    updatedAt: now,
  };

  try {
    await runTransaction(db, async (transaction) => {
      const creatorRef = doc(db, CREATORS_COLLECTION, creatorId);
      const existingDoc = await transaction.get(creatorRef);

      if (existingDoc.exists()) {
        const existingData = existingDoc.data() as CreatorProfile;
        if (existingData.status === 'pending') {
          throw new Error('You already have a creator application under review. Please wait for administrator approval.');
        } else if (existingData.status === 'approved') {
          throw new Error('You are already an approved creator.');
        } else if (existingData.status === 'suspended') {
          throw new Error('Your creator account is suspended. Please contact support.');
        } else {
          throw new Error('A creator profile already exists for your account.');
        }
      }

      // Atomic write to creators collection
      transaction.set(creatorRef, sanitizeForFirestore(newProfile));

      // Atomic write to users collection to assign role
      const userRef = doc(db, 'users', params.userId);
      transaction.set(userRef, sanitizeForFirestore({
        role: 'creator',
        creatorId,
        updatedAt: now,
      }), { merge: true });

      // Atomic write to public_creators
      const publicRef = doc(db, PUBLIC_CREATORS_COLLECTION, creatorId);
      transaction.set(publicRef, sanitizeForFirestore(publicPayload), { merge: true });
    });

    return newProfile;
  } catch (error: any) {
    console.error('Error in applyForCreatorProfile transaction:', error);
    if (
      error.message?.includes('under review') ||
      error.message?.includes('already an approved') ||
      error.message?.includes('is suspended') ||
      error.message?.includes('already exists') ||
      error.message?.includes('already registered')
    ) {
      throw error;
    }
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

    // Keep public_creators synchronized
    syncPublicCreatorProfile({
      creatorId,
      displayName: data.displayName,
      username: data.username,
      profileImage: data.profileImage,
      bio: data.bio,
    }).catch(err => console.warn('Could not sync public profile:', err));
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
  status: CreatorStatus,
  reason?: string
): Promise<void> {
  const now = new Date().toISOString();
  try {
    const docRef = doc(db, CREATORS_COLLECTION, creatorId);
    const updatePayload: Record<string, any> = {
      status,
      updatedAt: now,
    };
    if (reason !== undefined) {
      updatePayload.statusReason = reason;
    }
    await updateDoc(docRef, updatePayload);

    // Sync status to public_creators
    syncPublicCreatorProfile({
      creatorId,
      status,
    }).catch(err => console.warn('Could not sync status to public_creators:', err));

    // Sync user role
    try {
      const userRef = doc(db, 'users', creatorId);
      await updateDoc(userRef, {
        role: status === 'approved' ? 'creator' : 'customer',
        updatedAt: now,
      });
    } catch (e) {
      console.warn('Could not update role in user doc:', e);
    }
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
