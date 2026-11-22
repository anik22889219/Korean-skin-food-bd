import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { authFetch } from './apiClient';
import {
  YouTubeShortItem,
  YouTubeShortsDisplaySettings,
  YouTubeSyncResult,
} from '../types';

export const DEFAULT_YOUTUBE_SHORTS_DISPLAY_SETTINGS: YouTubeShortsDisplaySettings = {
  enabled: true,
  title: 'Community Live — YouTube Shorts',
  subtitle: 'SHORTS & SKINCARE IN ACTION',
  viewAllLinkText: 'View Channel',
  viewAllLinkUrl: 'https://www.youtube.com',
  maxDisplayCount: 12,
  autoPlayCarousel: true,
  carouselSlideIntervalSeconds: 6,
  autoSyncEnabled: true,
  autoSyncIntervalMinutes: 60,
  maxShortDurationSeconds: 180,
  lastSyncedAt: null,
  lastSyncCount: 0,
  lastSyncedChannelId: null,
  lastSyncedChannelTitle: null,
};

export function sortYouTubeShorts(items: YouTubeShortItem[]): YouTubeShortItem[] {
  return [...items].sort((a, b) => {
    const pinDiff = (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
    if (pinDiff !== 0) return pinDiff;

    const aOrder = Number(a.displayOrder || 0);
    const bOrder = Number(b.displayOrder || 0);
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });
}

function normalizeDocToShort(raw: any, docId?: string): YouTubeShortItem {
  const videoId = String(raw?.videoId || docId || '');
  return {
    videoId,
    title: String(raw?.title || 'YouTube Short'),
    customTitle: raw?.customTitle || undefined,
    description: raw?.description || undefined,
    thumbnailUrl: raw?.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    videoUrl: raw?.videoUrl || `https://www.youtube.com/shorts/${videoId}`,
    embedUrl: raw?.embedUrl || `https://www.youtube.com/embed/${videoId}`,
    channelId: String(raw?.channelId || ''),
    channelTitle: raw?.channelTitle || undefined,
    publishedAt: String(raw?.publishedAt || raw?.createdAt || new Date().toISOString()),
    durationSeconds: Number(raw?.durationSeconds || 0),
    viewsCount: Number(raw?.viewsCount || 0),
    likesCount: Number(raw?.likesCount || 0),
    commentsCount: Number(raw?.commentsCount || 0),
    privacyStatus: raw?.privacyStatus || 'public',
    isVisible: typeof raw?.isVisible === 'boolean' ? raw.isVisible : true,
    isPinned: Boolean(raw?.isPinned),
    displayOrder: Number(raw?.displayOrder || 0),
    taggedProductIds: Array.isArray(raw?.taggedProductIds) ? raw.taggedProductIds : [],
    metricsSyncedAt: String(raw?.metricsSyncedAt || raw?.updatedAt || new Date().toISOString()),
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

/**
 * Real-time subscription for public storefront Community Live section.
 * Strictly filters `isVisible == true` so Firestore security rules authorize list queries safely.
 */
export function subscribeVisibleYouTubeShorts(
  onUpdate: (shorts: YouTubeShortItem[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  const q = query(collection(db, 'youtube_shorts'), where('isVisible', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: YouTubeShortItem[] = [];
      snapshot.forEach((docSnap) => {
        const item = normalizeDocToShort(docSnap.data(), docSnap.id);
        if (item.privacyStatus !== 'private') {
          list.push(item);
        }
      });
      onUpdate(sortYouTubeShorts(list));
    },
    (error) => {
      console.warn('[YouTubeShortsService] Visible shorts subscription error:', error);
      onError?.(error);
    }
  );
}

/**
 * Real-time subscription for Admin Creators "YouTube Shorts & Storefront" tab.
 */
export function subscribeAllYouTubeShortsForAdmin(
  onUpdate: (shorts: YouTubeShortItem[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, 'youtube_shorts'),
    (snapshot) => {
      const list: YouTubeShortItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push(normalizeDocToShort(docSnap.data(), docSnap.id));
      });
      onUpdate(sortYouTubeShorts(list));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'youtube_shorts', false);
      onError?.(error);
    }
  );
}

/**
 * Real-time subscription for Homepage Section Display & Auto-Sync settings.
 */
export function subscribeYouTubeShortsDisplaySettings(
  onUpdate: (settings: YouTubeShortsDisplaySettings) => void
): () => void {
  if (!db) {
    onUpdate(DEFAULT_YOUTUBE_SHORTS_DISPLAY_SETTINGS);
    return () => {};
  }

  return onSnapshot(
    doc(db, 'settings', 'youtube_shorts_display'),
    (snap) => {
      if (snap.exists()) {
        onUpdate({
          ...DEFAULT_YOUTUBE_SHORTS_DISPLAY_SETTINGS,
          ...(snap.data() as Partial<YouTubeShortsDisplaySettings>),
        });
      } else {
        onUpdate(DEFAULT_YOUTUBE_SHORTS_DISPLAY_SETTINGS);
      }
    },
    (error) => {
      console.warn('[YouTubeShortsService] Display settings listener note:', error);
      onUpdate(DEFAULT_YOUTUBE_SHORTS_DISPLAY_SETTINGS);
    }
  );
}

export async function getYouTubeShortsDisplaySettings(): Promise<YouTubeShortsDisplaySettings> {
  if (!db) return DEFAULT_YOUTUBE_SHORTS_DISPLAY_SETTINGS;
  try {
    const snap = await getDoc(doc(db, 'settings', 'youtube_shorts_display'));
    if (snap.exists()) {
      return {
        ...DEFAULT_YOUTUBE_SHORTS_DISPLAY_SETTINGS,
        ...(snap.data() as Partial<YouTubeShortsDisplaySettings>),
      };
    }
  } catch (err) {
    console.warn('[YouTubeShortsService] Failed to read display settings:', err);
  }
  return DEFAULT_YOUTUBE_SHORTS_DISPLAY_SETTINGS;
}

export async function saveYouTubeShortsDisplaySettings(
  settings: Partial<YouTubeShortsDisplaySettings>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  const now = new Date().toISOString();
  const cleanPayload: Record<string, any> = { updatedAt: now };
  for (const [k, v] of Object.entries(settings)) {
    if (v !== undefined) {
      cleanPayload[k] = v;
    }
  }
  if (cleanPayload.carouselSlideIntervalSeconds !== undefined) {
    cleanPayload.carouselSlideIntervalSeconds = Math.max(
      2,
      Math.min(120, Math.round(Number(cleanPayload.carouselSlideIntervalSeconds) || 6))
    );
  }
  await setDoc(doc(db, 'settings', 'youtube_shorts_display'), cleanPayload, { merge: true });
}

export async function updateYouTubeShortAdminFields(
  videoId: string,
  patch: Partial<Pick<YouTubeShortItem, 'isVisible' | 'isPinned' | 'displayOrder' | 'customTitle' | 'taggedProductIds'>>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  const now = new Date().toISOString();
  const cleanPatch: Record<string, any> = {
    updatedAt: now,
  };
  if (typeof patch.isVisible === 'boolean') cleanPatch.isVisible = patch.isVisible;
  if (typeof patch.isPinned === 'boolean') cleanPatch.isPinned = patch.isPinned;
  if (typeof patch.displayOrder === 'number') cleanPatch.displayOrder = patch.displayOrder;
  if (patch.customTitle !== undefined) {
    cleanPatch.customTitle = patch.customTitle ? patch.customTitle.trim().slice(0, 295) : null;
  }
  if (Array.isArray(patch.taggedProductIds)) {
    cleanPatch.taggedProductIds = patch.taggedProductIds.slice(0, 6);
  }

  await updateDoc(doc(db, 'youtube_shorts', videoId), cleanPatch);
}

export async function reorderYouTubeShortsList(orderedVideoIds: string[]): Promise<void> {
  if (!db || orderedVideoIds.length === 0) return;
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  orderedVideoIds.forEach((videoId, idx) => {
    const ref = doc(db, 'youtube_shorts', videoId);
    batch.update(ref, {
      displayOrder: idx + 1,
      updatedAt: now,
    });
  });

  await batch.commit();
}

export async function deleteYouTubeShortRecord(videoId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  await deleteDoc(doc(db, 'youtube_shorts', videoId));
}

export async function syncYouTubeChannelShortsApi(options?: {
  channelId?: string;
  maxDurationSeconds?: number;
}): Promise<YouTubeSyncResult> {
  const res = await authFetch('/api/admin/youtube/sync-shorts', {
    method: 'POST',
    body: JSON.stringify(options || {}),
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error('Server sync endpoint unavailable.');
  }

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `YouTube Shorts sync failed (${res.status})`);
  }

  return data as YouTubeSyncResult;
}

let lastClientAutoSyncCheckMs = 0;

export async function triggerAutoSyncIfDue(): Promise<{
  synced: boolean;
  shorts?: YouTubeShortItem[];
}> {
  const now = Date.now();
  if (now - lastClientAutoSyncCheckMs < 60 * 1000) {
    return { synced: false };
  }
  lastClientAutoSyncCheckMs = now;

  try {
    const res = await authFetch('/api/youtube/shorts/auto-sync-check', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || contentType.includes('text/html')) {
      return { synced: false };
    }
    const data = await res.json();
    if (data?.success && data?.synced) {
      return {
        synced: true,
        shorts: Array.isArray(data.shorts) ? sortYouTubeShorts(data.shorts) : undefined,
      };
    }
  } catch {
    // Non-blocking background auto-sync
  }
  return { synced: false };
}

export async function fetchCachedYouTubeShortsFallback(): Promise<YouTubeShortItem[]> {
  try {
    const res = await fetch('/api/youtube/shorts/cached');
    if (!res.ok) return [];
    const data = await res.json();
    if (data?.success && Array.isArray(data.shorts)) {
      return sortYouTubeShorts(data.shorts);
    }
  } catch {}
  return [];
}
