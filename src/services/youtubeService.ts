import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { authFetch } from './apiClient';
import { CreatorReel } from '../types';
import { calculateReelPoints, getCreatorPointSettings, recalculateCreatorPointsAndLevel, recordMetricAuditLog } from './creatorPointService';

export interface YouTubeAdminStatus {
  hasOAuthCredentials: boolean;
  connected: boolean;
  hasStaleToken?: boolean;
  tokenError?: string | null;
  errorCode?: string | null;
  tokenSource?: 'oauth_file' | 'env_secret' | 'disconnected' | 'none';
  channelId: string | null;
  channelTitle: string | null;
  channelThumbnail: string | null;
  connectedAt: string | null;
  hasEnvRefreshToken: boolean;
  initialPrivacy: 'unlisted' | 'private';
  dailyLimitPerCreator: number;
  redirectUri?: string;
}

export interface CreatorYouTubeQuota {
  youtubeConnected: boolean;
  channelTitle: string | null;
  tokenError?: string | null;
  usedToday: number;
  dailyLimit: number;
  remainingToday: number;
  dhakaDate: string;
  initialPrivacy: 'unlisted' | 'private';
}

export interface YouTubeUploadResult {
  youtubeVideoId: string;
  videoUrl: string;
  embedUrl: string;
  thumbnailUrl: string;
  privacyStatus: 'private' | 'unlisted' | 'public';
  channelId: string;
  channelTitle: string;
}

export async function getYouTubeAdminStatus(forceVerify = false): Promise<YouTubeAdminStatus> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams();
  if (origin) params.set('origin', origin);
  if (forceVerify) params.set('force', '1');
  const qs = params.toString();
  const res = await authFetch(`/api/admin/youtube/status${qs ? `?${qs}` : ''}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch YouTube integration status.');
  }
  return data;
}

export async function getYouTubeAuthUrl(): Promise<{ url: string; redirectUri: string }> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const res = await authFetch(`/api/admin/youtube/auth-url?origin=${encodeURIComponent(origin)}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to generate YouTube OAuth URL.');
  }
  return { url: data.url, redirectUri: data.redirectUri };
}

export async function saveManualYouTubeRefreshToken(refreshToken: string): Promise<{
  channelId: string;
  channelTitle: string;
  channelThumbnail: string;
}> {
  const res = await authFetch('/api/admin/youtube/save-refresh-token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to verify and save YouTube refresh token.');
  }
  return data;
}

export async function disconnectYouTubeChannel(): Promise<void> {
  const res = await authFetch('/api/admin/youtube/disconnect', { method: 'POST' });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to disconnect YouTube channel.');
  }
}

export async function getCreatorDailyUploadQuota(): Promise<CreatorYouTubeQuota> {
  const res = await authFetch('/api/youtube/upload-quota');
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to check daily upload quota.');
  }
  return data;
}

/**
 * Uploads a video file directly to the Admin's connected YouTube channel via server-managed resumable upload session.
 * Video starts as unpublished ('unlisted' or 'private') until Admin approves.
 */
export async function uploadVideoToYouTube(
  file: File,
  metadata: {
    title: string;
    description?: string;
    tags?: string[];
  },
  onProgress?: (percent: number, phase: 'initializing' | 'uploading' | 'processing') => void
): Promise<YouTubeUploadResult> {
  onProgress?.(0, 'initializing');

  // Step 1: Create resumable upload session on server (enforces approved creator + 1/day limit)
  const initRes = await authFetch('/api/youtube/upload-session', {
    method: 'POST',
    body: JSON.stringify({
      title: metadata.title,
      description: metadata.description || '',
      tags: metadata.tags || ['kbeauty', 'skincare', 'koreanskinfoodbd'],
      fileSize: file.size,
      mimeType: file.type || 'video/mp4',
    }),
  });

  const initData = await initRes.json();
  if (!initRes.ok || !initData.success || !initData.sessionId) {
    throw new Error(initData.error || 'Failed to initiate YouTube upload session.');
  }

  const sessionId: string = initData.sessionId;
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : '';

  // Step 2: Stream file binary via XHR PUT with accurate upload progress
  return new Promise<YouTubeUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `/api/youtube/upload-stream/${encodeURIComponent(sessionId)}`, true);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
        onProgress?.(pct, pct >= 99 ? 'processing' : 'uploading');
      }
    };

    xhr.upload.onload = () => {
      onProgress?.(99, 'processing');
    };

    xhr.onload = () => {
      try {
        const parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        if (xhr.status >= 200 && xhr.status < 300 && parsed.success && parsed.youtubeVideoId) {
          onProgress?.(100, 'processing');
          resolve({
            youtubeVideoId: parsed.youtubeVideoId,
            videoUrl: parsed.videoUrl,
            embedUrl: parsed.embedUrl,
            thumbnailUrl: parsed.thumbnailUrl,
            privacyStatus: parsed.privacyStatus,
            channelId: parsed.channelId || '',
            channelTitle: parsed.channelTitle || '',
          });
        } else {
          reject(new Error(parsed.error || `YouTube upload failed (${xhr.status})`));
        }
      } catch (err: any) {
        reject(new Error('Failed to parse server response after YouTube upload: ' + err.message));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading video to YouTube. Please check your connection and try again.'));
    };

    xhr.send(file);
  });
}

export async function updateYouTubeVideoPrivacy(
  youtubeVideoId: string,
  privacyStatus: 'public' | 'unlisted' | 'private'
): Promise<{ youtubeVideoId: string; privacyStatus: 'public' | 'unlisted' | 'private' }> {
  const res = await authFetch('/api/admin/youtube/update-privacy', {
    method: 'POST',
    body: JSON.stringify({ youtubeVideoId, privacyStatus }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update YouTube video privacy status.');
  }
  return { youtubeVideoId: data.youtubeVideoId, privacyStatus: data.privacyStatus };
}

export async function deleteYouTubeVideo(youtubeVideoId: string): Promise<void> {
  const res = await authFetch(`/api/admin/youtube/video/${encodeURIComponent(youtubeVideoId)}`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 404) {
    throw new Error(data.error || 'Failed to delete video from YouTube.');
  }
}

export async function refreshYouTubeMetricsAndSync(
  creatorReelId: string,
  youtubeVideoId: string,
  adminId = 'admin'
): Promise<{ views: number; likes: number; comments: number; privacyStatus: string }> {
  const res = await authFetch('/api/admin/youtube/refresh-metrics', {
    method: 'POST',
    body: JSON.stringify({ creatorReelId, youtubeVideoId }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch YouTube video statistics.');
  }

  const views = Number(data.views || 0);
  const likes = Number(data.likes || 0);
  const comments = Number(data.comments || 0);
  const privacyStatus = data.privacyStatus || 'unlisted';

  // Sync fetched metrics into Firestore and recalculate creator points
  const reelRef = doc(db, 'creator_reels', creatorReelId);
  const reelSnap = await getDoc(reelRef);
  if (reelSnap.exists()) {
    const reelData = reelSnap.data() as CreatorReel;
    const prevPerf = reelData.performance || { views: 0, likes: 0, comments: 0, points: 0 };
    const settings = await getCreatorPointSettings();
    const { viewPoints, likePoints, commentPoints, totalPoints } = calculateReelPoints(
      { views, likes, comments },
      reelData.status,
      settings
    );

    const now = new Date().toISOString();
    await updateDoc(reelRef, {
      youtubePrivacyStatus: privacyStatus,
      metricsSource: 'admin_verified',
      metricsUpdatedAt: now,
      performance: {
        ...prevPerf,
        views,
        likes,
        comments,
        points: totalPoints,
        viewPoints,
        likePoints,
        commentPoints,
        metricsSource: 'admin_verified',
        metricsUpdatedAt: now,
      },
      updatedAt: now,
    });

    await recordMetricAuditLog({
      creatorReelId,
      adminId,
      previousValues: {
        views: Number(prevPerf.views || 0),
        likes: Number(prevPerf.likes || 0),
        comments: Number(prevPerf.comments || 0),
        points: Number(prevPerf.points || 0),
      },
      newValues: { views, likes, comments, points: totalPoints },
      reason: 'YouTube Data API v3 live metrics sync',
    });

    if (reelData.creatorUserId) {
      await recalculateCreatorPointsAndLevel(reelData.creatorUserId);
    }
  }

  return { views, likes, comments, privacyStatus };
}
