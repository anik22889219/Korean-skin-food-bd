import { UserProfile } from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';

let usersCache: UserProfile[] = [];

// Subscribe to users collection in Firestore
onSnapshot(collection(db, 'users'), (snapshot) => {
  const us: UserProfile[] = [];
  snapshot.forEach((doc) => {
    us.push(doc.data() as UserProfile);
  });
  usersCache = us;
}, (err) => {
  console.warn('[Firebase] users onSnapshot warning:', err);
  if (err?.code === 'permission-denied' || err?.message?.includes('permission') || err?.message?.includes('Permission')) {
    handleFirestoreError(err, OperationType.GET, 'users', false);
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
    await setDoc(doc(db, 'users', user.uid), user);
  },

  async updateUser(user: UserProfile): Promise<void> {
    usersCache = usersCache.map(u => u.uid === user.uid ? user : u);
    await setDoc(doc(db, 'users', user.uid), user);
  }
};
