import { UserProfile } from '../types';
import { auth, db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { queryClient } from '../lib/queryClient';
import { queryKeys } from '../lib/queryKeys';

let usersCache: UserProfile[] = [];
let userSubUnsubscribe: (() => void) | null = null;

// Only attach users collection listener when user is authenticated
onAuthStateChanged(auth, (currentUser) => {
  if (userSubUnsubscribe) {
    userSubUnsubscribe();
    userSubUnsubscribe = null;
  }

  if (currentUser) {
    userSubUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const us: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Partial<UserProfile>;
        us.push({
          uid: docSnap.id || data.uid || '',
          name: data.name || 'Unnamed User',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || 'customer',
          loyaltyPoints: data.loyaltyPoints || 0,
          photoURL: data.photoURL || '',
          address: data.address || '',
          createdAt: data.createdAt,
          department: data.department || '',
          status: data.status || 'active',
          wholesaleAccess: data.wholesaleAccess === true,
          ...data,
          id: docSnap.id
        } as UserProfile);
      });
      usersCache = us;
      try {
        queryClient.setQueryData(queryKeys.users.all, us);
        queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
      } catch {
        // Graceful fallback
      }
    }, (err) => {
      if (err?.code !== 'permission-denied') {
        console.warn('[Firebase] users onSnapshot notice:', err);
      }
    });
  } else {
    usersCache = [];
  }
});

export const userService = {
  getUsers(): UserProfile[] {
    return usersCache;
  },

  getUserById(uid: string): UserProfile | undefined {
    return usersCache.find(u => u.uid === uid);
  },

  async createUser(user: UserProfile): Promise<void> {
    usersCache = [...usersCache.filter(u => u.uid !== user.uid), user];
    await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore(user));
  },

  async updateUser(user: UserProfile): Promise<void> {
    usersCache = usersCache.map(u => u.uid === user.uid ? user : u);
    await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore(user));
  }
};
