import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../services/firebase';
import { UserProfile, CreatorProfile, CreatorStatus } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  creatorProfile: CreatorProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCreator: boolean;
  isApprovedCreator: boolean;
  creatorStatus: CreatorStatus | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;
    let creatorUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }
      if (creatorUnsub) {
        creatorUnsub();
        creatorUnsub = null;
      }

      try {
        if (currentUser) {
          setUser(currentUser);
          
          const userDocRef = doc(db, 'users', currentUser.uid);
          const creatorDocRef = doc(db, 'creators', currentUser.uid);

          // Subscribe to live creator profile updates
          creatorUnsub = onSnapshot(creatorDocRef, (creatorSnap) => {
            if (creatorSnap.exists()) {
              setCreatorProfile(creatorSnap.data() as CreatorProfile);
            } else {
              setCreatorProfile(null);
            }
          }, (err) => {
            console.warn('[AuthContext] Creator profile listener notice:', err);
          });

          // Subscribe to live user document updates
          profileUnsub = onSnapshot(userDocRef, async (snap) => {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              if (currentUser.email === 'koreanskinfood.bd@gmail.com' && data.role !== 'super_admin') {
                data.role = 'super_admin';
                try {
                  await setDoc(userDocRef, { role: 'super_admin' }, { merge: true });
                } catch (err) {
                  console.error('[AuthContext] Failed to elevate existing admin:', err);
                }
              }
              setProfile(data);
            } else {
              // Create user profile on first login
              const newProfile: UserProfile & { photoURL: string; address: string; loyaltyPoints: number; createdAt: any } = {
                uid: currentUser.uid,
                name: currentUser.displayName || 'K-Beauty Lover',
                email: currentUser.email || '',
                phone: currentUser.phoneNumber || '',
                role: currentUser.email === 'koreanskinfood.bd@gmail.com' ? 'super_admin' : 'customer',
                photoURL: currentUser.photoURL || '',
                address: '',
                loyaltyPoints: 0,
                createdAt: serverTimestamp()
              };

              try {
                await setDoc(userDocRef, newProfile);
              } catch (err) {
                handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}`, false);
              }
              setProfile(newProfile);
            }
          }, (err) => {
            console.warn('[AuthContext] User snapshot notice:', err);
          });

        } else {
          setUser(null);
          setProfile(null);
          setCreatorProfile(null);
        }
      } catch (error) {
        console.error('[AuthContext] Error syncing auth state:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
      if (creatorUnsub) creatorUnsub();
    };
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('[AuthContext] Google sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await fbSignOut(auth);
      setUser(null);
      setProfile(null);
      setCreatorProfile(null);
    } catch (error) {
      console.error('[AuthContext] Sign-out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = profile 
    ? (profile.role === 'admin' || profile.role === 'super_admin' || profile.role === 'hr' || profile.role === 'inventory_manager' || profile.role === 'customer_support') 
    : false;

  const isSuperAdmin = profile?.role === 'super_admin' || user?.email === 'koreanskinfood.bd@gmail.com';

  const isCreator = !!creatorProfile || profile?.role === 'creator';
  const isApprovedCreator = creatorProfile?.status === 'approved';
  const creatorStatus = creatorProfile?.status || null;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      creatorProfile,
      loading,
      signInWithGoogle,
      signOut,
      isAdmin,
      isSuperAdmin,
      isCreator,
      isApprovedCreator,
      creatorStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
