import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { CreatorProfile, CreatorReel } from '../types';
import { CREATORS_COLLECTION } from './creatorService';
import { CREATOR_REELS_COLLECTION } from './creatorReelService';

export type LeaderboardPeriod = 'all_time' | 'this_month' | 'this_week';

export interface PublicCreatorLeaderboardEntry {
  rank: number;
  creatorId: string;
  username: string;
  displayName: string;
  profileImage: string;
  bio?: string;
  level: number;
  levelName: string;
  totalPoints: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalReels: number;
  createdAt?: string;
}

/**
  Strip private fields (email, phone, userId, status, admin notes, etc.)
  Expose strictly public creator profile info.
 */
export function sanitizePublicCreatorProfile(
  creator: CreatorProfile,
  overrides?: {
    rank?: number;
    points?: number;
    views?: number;
    likes?: number;
    comments?: number;
    reels?: number;
  }
): PublicCreatorLeaderboardEntry {
  return {
    rank: overrides?.rank || 0,
    creatorId: creator.creatorId,
    username: creator.username,
    displayName: creator.displayName,
    profileImage: creator.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    bio: creator.bio || '',
    level: creator.level || 1,
    levelName: creator.levelName || 'K-Beauty Novice',
    totalPoints: overrides?.points !== undefined ? overrides.points : (creator.totalPoints || 0),
    totalViews: overrides?.views !== undefined ? overrides.views : (creator.totalViews || 0),
    totalLikes: overrides?.likes !== undefined ? overrides.likes : (creator.totalLikes || 0),
    totalComments: overrides?.comments !== undefined ? overrides.comments : (creator.totalComments || 0),
    totalReels: overrides?.reels !== undefined ? overrides.reels : (creator.totalReels || 0),
    createdAt: creator.createdAt
  };
}

/**
  Leaderboard Ranking Tie-Breaker:
  Primary: totalPoints DESC
  Secondary: totalViews DESC
  Third: totalLikes DESC
  Fourth: totalComments DESC
 */
export function sortLeaderboard<T extends { totalPoints: number; totalViews: number; totalLikes: number; totalComments: number }>(
  list: T[]
): T[] {
  return [...list].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    if (b.totalViews !== a.totalViews) {
      return b.totalViews - a.totalViews;
    }
    if (b.totalLikes !== a.totalLikes) {
      return b.totalLikes - a.totalLikes;
    }
    return b.totalComments - a.totalComments;
  });
}

/**
 * Fetch Leaderboard entries with period filtering and optimized Firestore queries
 */
export async function getLeaderboard(
  period: LeaderboardPeriod = 'all_time',
  limitCount: number = 100
): Promise<PublicCreatorLeaderboardEntry[]> {
  try {
    // 1. Fetch approved creators
    const creatorsQuery = query(
      collection(db, CREATORS_COLLECTION),
      where('status', '==', 'approved')
    );
    const creatorsSnap = await getDocs(creatorsQuery);
    const approvedCreators: CreatorProfile[] = [];
    creatorsSnap.forEach((docSnap) => {
      approvedCreators.push(docSnap.data() as CreatorProfile);
    });

    if (period === 'all_time') {
      const sorted = sortLeaderboard(approvedCreators);
      return sorted.slice(0, limitCount).map((creator, index) => 
        sanitizePublicCreatorProfile(creator, { rank: index + 1 })
      );
    }

    // Period calculations for 'this_month' or 'this_week' using actual stored reel data
    const now = new Date();
    let startDate: Date;

    if (period === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // this_week (last 7 days)
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Fetch approved or published reels
    const reelsQuery = query(
      collection(db, CREATOR_REELS_COLLECTION),
      where('status', 'in', ['approved', 'published'])
    );
    const reelsSnap = await getDocs(reelsQuery);
    const periodReelsByCreator: Record<string, { points: number; views: number; likes: number; comments: number; reels: number }> = {};

    reelsSnap.forEach((docSnap) => {
      const reel = docSnap.data() as CreatorReel;
      if (reel.status === 'approved' || reel.status === 'published') {
        const reelDate = new Date(reel.publishedAt || reel.approvedAt || reel.createdAt);
        if (reelDate >= startDate) {
          const key = reel.creatorUserId || reel.creatorId;
          if (!periodReelsByCreator[key]) {
            periodReelsByCreator[key] = { points: 0, views: 0, likes: 0, comments: 0, reels: 0 };
          }
          const perf = reel.performance || { views: 0, likes: 0, comments: 0, points: 0 };
          periodReelsByCreator[key].points += perf.points || 0;
          periodReelsByCreator[key].views += perf.views || 0;
          periodReelsByCreator[key].likes += perf.likes || 0;
          periodReelsByCreator[key].comments += perf.comments || 0;
          periodReelsByCreator[key].reels += 1;
        }
      }
    });

    // Map creator with period metrics
    const periodEntries = approvedCreators.map((creator) => {
      const key = creator.userId || creator.creatorId;
      const stats = periodReelsByCreator[key] || { points: 0, views: 0, likes: 0, comments: 0, reels: 0 };
      return sanitizePublicCreatorProfile(creator, {
        points: stats.points,
        views: stats.views,
        likes: stats.likes,
        comments: stats.comments,
        reels: stats.reels
      });
    });

    const sortedPeriod = sortLeaderboard(periodEntries);
    return sortedPeriod.slice(0, limitCount).map((entry, idx) => ({
      ...entry,
      rank: idx + 1
    }));

  } catch (error) {
    console.error('Error fetching creator leaderboard:', error);
    handleFirestoreError(error, OperationType.LIST, CREATORS_COLLECTION, false);
    return [];
  }
}

/**
 * Real-time subscription to the Creator Leaderboard
 */
export function subscribeToLeaderboard(
  period: LeaderboardPeriod,
  onUpdate: (entries: PublicCreatorLeaderboardEntry[]) => void
) {
  const creatorsQuery = query(
    collection(db, CREATORS_COLLECTION),
    where('status', '==', 'approved')
  );

  return onSnapshot(
    creatorsQuery,
    async () => {
      try {
        const entries = await getLeaderboard(period);
        onUpdate(entries);
      } catch (err) {
        console.warn('Leaderboard realtime snapshot error:', err);
      }
    },
    (err) => {
      console.warn('Leaderboard real-time query error:', err);
      onUpdate([]);
    }
  );
}

/**
 * Get public profile and calculated rank for a specific creator
 */
export async function getPublicCreatorWithRank(creatorIdOrUsername: string): Promise<PublicCreatorLeaderboardEntry | null> {
  try {
    const allLeaderboard = await getLeaderboard('all_time', 500);
    const target = allLeaderboard.find(
      c => c.creatorId === creatorIdOrUsername || c.username.toLowerCase() === creatorIdOrUsername.toLowerCase()
    );
    if (target) return target;

    // Fallback if not on top 500 approved leaderboard or still pending
    const creatorSnap = await getDocs(
      query(
        collection(db, CREATORS_COLLECTION), 
        where('creatorId', '==', creatorIdOrUsername),
        where('status', '==', 'approved')
      )
    );
    if (!creatorSnap.empty) {
      const creatorData = creatorSnap.docs[0].data() as CreatorProfile;
      return sanitizePublicCreatorProfile(creatorData, { rank: 999 });
    }

    return null;
  } catch (err) {
    console.error('Error fetching creator public profile:', err);
    return null;
  }
}
