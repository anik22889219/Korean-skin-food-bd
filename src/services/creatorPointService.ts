import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { 
  CreatorPointSettings, 
  CreatorReel, 
  ReelMetricAuditLog,
  CreatorProfile 
} from '../types';
import { syncPublicCreatorProfile } from './creatorService';

export const SETTINGS_COLLECTION = 'settings';
export const CREATOR_POINT_SETTINGS_DOC = 'creator_points';
export const CREATOR_REELS_COLLECTION = 'creator_reels';
export const CREATORS_COLLECTION = 'creators';
export const REEL_METRIC_AUDITS_COLLECTION = 'reel_metric_audits';

export const DEFAULT_CREATOR_POINT_SETTINGS: CreatorPointSettings = {
  viewsPerPoint: 100,
  likesPerPoint: 10,
  pointsPerLikeBlock: 2,
  commentsPerPoint: 1,
  pointsPerComment: 3,
  levels: [
    { level: 1, name: 'K-Beauty Novice', minPoints: 0, maxPoints: 999 },
    { level: 2, name: 'Glow Influencer', minPoints: 1000, maxPoints: 4999 },
    { level: 3, name: 'Skincare Guru', minPoints: 5000, maxPoints: 14999 },
    { level: 4, name: 'Seoul Beauty Star', minPoints: 15000, maxPoints: 29999 },
    { level: 5, name: 'K-Beauty Elite Icon', minPoints: 30000, maxPoints: 999999999 },
  ],
};

/**
 * Deterministically calculates points earned for a specific reel.
 * Returns 0 points if reel status is not approved or published (e.g., pending or rejected).
 */
export function calculateReelPoints(
  performance: { views?: number; likes?: number; comments?: number },
  status: string,
  settings: CreatorPointSettings = DEFAULT_CREATOR_POINT_SETTINGS
): {
  viewPoints: number;
  likePoints: number;
  commentPoints: number;
  totalPoints: number;
} {
  // Pending or rejected reels strictly receive 0 points
  if (status !== 'approved' && status !== 'published') {
    return { viewPoints: 0, likePoints: 0, commentPoints: 0, totalPoints: 0 };
  }

  const views = Math.max(0, Math.floor(Number(performance?.views) || 0));
  const likes = Math.max(0, Math.floor(Number(performance?.likes) || 0));
  const comments = Math.max(0, Math.floor(Number(performance?.comments) || 0));

  const viewsPerPoint = settings.viewsPerPoint > 0 ? settings.viewsPerPoint : 100;
  const likesPerPoint = settings.likesPerPoint > 0 ? settings.likesPerPoint : 10;
  const pointsPerLikeBlock = settings.pointsPerLikeBlock >= 0 ? settings.pointsPerLikeBlock : 2;
  const commentsPerPoint = settings.commentsPerPoint > 0 ? settings.commentsPerPoint : 1;
  const pointsPerComment = settings.pointsPerComment >= 0 ? settings.pointsPerComment : 3;

  // 100 views = 1 point
  const viewPoints = Math.floor(views / viewsPerPoint);
  // 10 likes = 2 points
  const likePoints = Math.floor(likes / likesPerPoint) * pointsPerLikeBlock;
  // 1 comment = 3 points
  const commentPoints = Math.floor(comments / commentsPerPoint) * pointsPerComment;

  const totalPoints = viewPoints + likePoints + commentPoints;

  return { viewPoints, likePoints, commentPoints, totalPoints };
}

/**
 * Deterministically calculates creator level, level name, progress, and next level requirements.
 * Thresholds:
 * Level 1 = 0
 * Level 2 = 1,000
 * Level 3 = 5,000
 * Level 4 = 15,000
 * Level 5 = 30,000
 */
export function calculateCreatorLevel(
  totalPoints: number,
  settings: CreatorPointSettings = DEFAULT_CREATOR_POINT_SETTINGS
): {
  level: number;
  levelName: string;
  levelProgress: number; // Percentage (0 - 100)
  nextLevelPoints: number;
  pointsRemaining: number;
  nextLevelName: string | null;
} {
  const points = Math.max(0, Math.floor(Number(totalPoints) || 0));
  const rawLevels = (settings.levels && settings.levels.length > 0)
    ? settings.levels
    : DEFAULT_CREATOR_POINT_SETTINGS.levels;

  const sortedLevels = [...rawLevels].sort((a, b) => a.minPoints - b.minPoints);

  let currentLevelIdx = 0;
  for (let i = 0; i < sortedLevels.length; i++) {
    if (points >= sortedLevels[i].minPoints) {
      currentLevelIdx = i;
    }
  }

  const currentLevel = sortedLevels[currentLevelIdx] || sortedLevels[0];
  const hasNextLevel = currentLevelIdx < sortedLevels.length - 1;
  const nextLevel = hasNextLevel ? sortedLevels[currentLevelIdx + 1] : null;

  if (nextLevel) {
    const nextLevelPoints = nextLevel.minPoints;
    const pointsRemaining = Math.max(0, nextLevelPoints - points);
    
    // Progress calculation relative to current tier span
    const span = nextLevel.minPoints - currentLevel.minPoints;
    const earnedInSpan = points - currentLevel.minPoints;
    const levelProgress = span > 0 ? Math.min(100, Math.max(0, Math.round((earnedInSpan / span) * 100))) : 100;

    return {
      level: currentLevel.level,
      levelName: currentLevel.name,
      levelProgress,
      nextLevelPoints,
      pointsRemaining,
      nextLevelName: nextLevel.name,
    };
  } else {
    // Max Tier Reached (Level 5 / K-Beauty Elite Icon)
    return {
      level: currentLevel.level,
      levelName: currentLevel.name,
      levelProgress: 100,
      nextLevelPoints: currentLevel.minPoints,
      pointsRemaining: 0,
      nextLevelName: null,
    };
  }
}

/**
 * Retrieve admin creator point settings from Firestore or fallback to default
 */
export async function getCreatorPointSettings(): Promise<CreatorPointSettings> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, CREATOR_POINT_SETTINGS_DOC);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as CreatorPointSettings;
      return {
        viewsPerPoint: Number(data.viewsPerPoint) || DEFAULT_CREATOR_POINT_SETTINGS.viewsPerPoint,
        likesPerPoint: Number(data.likesPerPoint) || DEFAULT_CREATOR_POINT_SETTINGS.likesPerPoint,
        pointsPerLikeBlock: Number(data.pointsPerLikeBlock) ?? DEFAULT_CREATOR_POINT_SETTINGS.pointsPerLikeBlock,
        commentsPerPoint: Number(data.commentsPerPoint) || DEFAULT_CREATOR_POINT_SETTINGS.commentsPerPoint,
        pointsPerComment: Number(data.pointsPerComment) ?? DEFAULT_CREATOR_POINT_SETTINGS.pointsPerComment,
        levels: Array.isArray(data.levels) && data.levels.length > 0 ? data.levels : DEFAULT_CREATOR_POINT_SETTINGS.levels,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      };
    }
  } catch (err) {
    console.warn('Error fetching CreatorPointSettings from Firestore, using default:', err);
  }
  return DEFAULT_CREATOR_POINT_SETTINGS;
}

/**
 * Save creator point settings to Firestore and optionally recalculate all creators
 */
export async function saveCreatorPointSettings(
  newSettings: CreatorPointSettings,
  adminId: string = 'admin'
): Promise<void> {
  const now = new Date().toISOString();
  const settingsToSave: CreatorPointSettings = {
    ...newSettings,
    updatedAt: now,
    updatedBy: adminId,
  };

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, CREATOR_POINT_SETTINGS_DOC);
    await setDoc(docRef, settingsToSave, { merge: true });
  } catch (err) {
    console.error('Error saving CreatorPointSettings to Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, `${SETTINGS_COLLECTION}/${CREATOR_POINT_SETTINGS_DOC}`);
    throw err;
  }
}

/**
 * Record an audit log for manual metric updates by an admin
 */
export async function recordMetricAuditLog(audit: {
  creatorReelId: string;
  adminId: string;
  previousValues: { views: number; likes: number; comments: number; points: number };
  newValues: { views: number; likes: number; comments: number; points: number };
  reason?: string;
}): Promise<void> {
  const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const auditEntry: ReelMetricAuditLog = {
    auditLogId: id,
    creatorReelId: audit.creatorReelId,
    adminId: audit.adminId || 'admin',
    previousPerformance: audit.previousValues,
    newPerformance: audit.newValues,
    previousValues: audit.previousValues,
    newValues: audit.newValues,
    reason: audit.reason || 'Admin manual metric adjustment',
    timestamp: now,
  };

  try {
    const docRef = doc(db, REEL_METRIC_AUDITS_COLLECTION, id);
    await setDoc(docRef, auditEntry);
  } catch (err) {
    console.warn('Failed to record metric audit log:', err);
  }
}

/**
 * Fetch recent reel metric audit logs for Admin Audit Trail view
 */
export async function getReelMetricAuditLogs(limitCount: number = 50): Promise<ReelMetricAuditLog[]> {
  try {
    const q = query(
      collection(db, REEL_METRIC_AUDITS_COLLECTION)
    );
    const snap = await getDocs(q);
    const logs: ReelMetricAuditLog[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      logs.push({
        auditLogId: data.id || data.auditLogId || docSnap.id,
        creatorReelId: data.creatorReelId || '',
        adminId: data.adminId || 'admin',
        previousPerformance: data.previousPerformance || data.previousValues,
        newPerformance: data.newPerformance || data.newValues,
        reason: data.reason || 'Admin metric override',
        timestamp: data.timestamp || new Date().toISOString()
      });
    });
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs.slice(0, limitCount);
  } catch (err) {
    console.warn('Failed to fetch reel metric audit logs:', err);
    return [];
  }
}

/**
 * Recalculates reel points, total creator points, level, and next-level progress for a given creator.
 * Triggered automatically whenever metrics or reel statuses change.
 */
export async function recalculateCreatorPointsAndLevel(
  creatorUserId: string,
  settingsInput?: CreatorPointSettings
): Promise<{
  totalPoints: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalReels: number;
  levelInfo: ReturnType<typeof calculateCreatorLevel>;
}> {
  const settings = settingsInput || (await getCreatorPointSettings());
  const now = new Date().toISOString();

  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalReels = 0;
  let totalPoints = 0;

  try {
    const q = query(
      collection(db, CREATOR_REELS_COLLECTION),
      where('creatorUserId', '==', String(creatorUserId))
    );
    const querySnap = await getDocs(q);

    for (const docSnap of querySnap.docs) {
      const reel = docSnap.data() as CreatorReel;
      const isEligible = reel.status === 'approved' || reel.status === 'published';

      const pointCalc = calculateReelPoints(reel.performance || { views: 0, likes: 0, comments: 0 }, reel.status, settings);

      if (isEligible) {
        totalReels += 1;
        totalViews += Number(reel.performance?.views || 0);
        totalLikes += Number(reel.performance?.likes || 0);
        totalComments += Number(reel.performance?.comments || 0);
        totalPoints += pointCalc.totalPoints;
      }

      // Update reel document with precise calculated points
      if (reel.performance?.points !== pointCalc.totalPoints || reel.performance?.viewPoints !== pointCalc.viewPoints) {
        const updatedPerformance = {
          ...reel.performance,
          views: Number(reel.performance?.views || 0),
          likes: Number(reel.performance?.likes || 0),
          comments: Number(reel.performance?.comments || 0),
          points: pointCalc.totalPoints,
          viewPoints: pointCalc.viewPoints,
          likePoints: pointCalc.likePoints,
          commentPoints: pointCalc.commentPoints,
        };

        await updateDoc(docSnap.ref, {
          performance: updatedPerformance,
          updatedAt: now,
        });
      }
    }

    const levelInfo = calculateCreatorLevel(totalPoints, settings);

    // Update creator profile
    const creatorRef = doc(db, CREATORS_COLLECTION, String(creatorUserId));
    const creatorSnap = await getDoc(creatorRef);

    if (creatorSnap.exists()) {
      const creatorData = creatorSnap.data() as CreatorProfile;
      await updateDoc(creatorRef, {
        totalViews,
        totalLikes,
        totalComments,
        totalReels,
        totalPoints,
        level: levelInfo.level,
        levelName: levelInfo.levelName,
        levelProgress: levelInfo.levelProgress,
        nextLevelPoints: levelInfo.nextLevelPoints,
        pointsRemaining: levelInfo.pointsRemaining,
        nextLevelName: levelInfo.nextLevelName,
        updatedAt: now,
      });

      // Sync public_creators
      syncPublicCreatorProfile({
        creatorId: String(creatorUserId),
        username: creatorData.username,
        displayName: creatorData.displayName,
        profileImage: creatorData.profileImage,
        bio: creatorData.bio,
        level: levelInfo.level,
        levelName: levelInfo.levelName,
        totalPoints,
        totalViews,
        totalLikes,
        totalComments,
        totalReels,
        status: creatorData.status,
      }).catch(err => console.warn('Could not sync public creator points:', err));
    }

    return {
      totalPoints,
      totalViews,
      totalLikes,
      totalComments,
      totalReels,
      levelInfo,
    };
  } catch (err) {
    console.error('Error recalculating creator points and level:', err);
    const levelInfo = calculateCreatorLevel(0, settings);
    return {
      totalPoints: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalReels: 0,
      levelInfo,
    };
  }
}

/**
 * Global Admin function: Recalculate points and levels for all creators in system
 */
export async function recalculateAllCreatorsPointsAndLevels(
  adminId: string = 'admin'
): Promise<{ updatedCreators: number; settings: CreatorPointSettings }> {
  const settings = await getCreatorPointSettings();
  try {
    const querySnap = await getDocs(collection(db, CREATORS_COLLECTION));
    let updatedCreators = 0;

    for (const docSnap of querySnap.docs) {
      const creatorData = docSnap.data() as CreatorProfile;
      if (creatorData.userId) {
        await recalculateCreatorPointsAndLevel(creatorData.userId, settings);
        updatedCreators++;
      }
    }

    return { updatedCreators, settings };
  } catch (err) {
    console.error('Error in recalculateAllCreatorsPointsAndLevels:', err);
    throw err;
  }
}
