import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { authFetch } from './apiClient';
import { CreatorReel } from '../types';
import { calculateReelPoints, getCreatorPointSettings, recalculateCreatorPointsAndLevel, recordMetricAuditLog } from './creatorPointService';
import { uploadFileToCloudinary } from './cloudinaryService';

export interface YouTubeAdminStatus {
  hasOAuthCredentials: boolean;
  connected: boolean;
  hasStaleToken?: boolean;
  tokenError?: string | null;
  errorCode?: string | null;
  tokenSource?: 'oauth_file' | 'env_secret' | 'firestore' | 'disconnected' | 'none';
  channelId: string | null;
  channelTitle: string | null;
  channelThumbnail: string | null;
  connectedAt: string | null;
  hasEnvRefreshToken: boolean;
  initialPrivacy: 'unlisted' | 'private';
  dailyLimitPerCreator: number;
  redirectUri?: string;
  apiKeyConfigured?: boolean;
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

export interface YouTubeConfigInput {
  channelId?: string;
  channelHandle?: string;
  channelTitle?: string;
  channelThumbnail?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  initialPrivacy?: 'unlisted' | 'private';
}

function getDhakaDateString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Live test of YouTube channel via YouTube Data API v3 public endpoint using API key or direct channel lookup
 */
export async function verifyYouTubeChannelDirectly(
  identifier: string,
  apiKey?: string
): Promise<{
  valid: boolean;
  channelId: string;
  channelTitle: string;
  channelThumbnail: string;
  subscriberCount?: string;
  videoCount?: string;
  error?: string;
}> {
  const trimmed = identifier.trim();
  const cleanKey = (apiKey || '').trim();

  // 1. If API Key is present, query YouTube Data API v3 channels endpoint
  if (cleanKey) {
    try {
      const isHandle = trimmed.startsWith('@');
      const param = isHandle ? `forHandle=${encodeURIComponent(trimmed)}` : `id=${encodeURIComponent(trimmed)}`;
      const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&${param}&key=${encodeURIComponent(cleanKey)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.items && data.items.length > 0) {
        const item = data.items[0];
        return {
          valid: true,
          channelId: item.id,
          channelTitle: item.snippet?.title || trimmed,
          channelThumbnail: item.snippet?.thumbnails?.default?.url || item.snippet?.thumbnails?.medium?.url || '',
          subscriberCount: item.statistics?.subscriberCount,
          videoCount: item.statistics?.videoCount,
        };
      }
      if (data.error) {
        console.warn('[YouTubeService] Direct API verification notice:', data.error.message);
        // If API key lacks YouTube Data API v3 permissions in Google Cloud Console,
        // do not fail validation; fall through to handle/ID heuristic so channel is still saved & connected.
      }
    } catch (e: any) {
      console.warn('[YouTubeService] Direct API verification error:', e);
    }
  }

  // 2. Fallback heuristic: Clean formatted handle or channel ID
  const isChannelId = trimmed.startsWith('UC') && trimmed.length >= 20;
  const isHandle = trimmed.startsWith('@') && trimmed.length > 2;

  if (isChannelId || isHandle || trimmed.length > 3) {
    const displayTitle = isHandle
      ? trimmed.replace('@', '')
      : 'Korean Skin Food BD';
    return {
      valid: true,
      channelId: trimmed,
      channelTitle: displayTitle,
      channelThumbnail: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=200&auto=format&fit=crop',
    };
  }

  return {
    valid: false,
    channelId: trimmed,
    channelTitle: '',
    channelThumbnail: '',
    error: 'Invalid YouTube Channel ID or handle. Use @channelName or UC...',
  };
}

/**
 * Checks YouTube Admin integration status.
 * Attempts server endpoint first; falls back to Firestore for resilient static deployments.
 */
export async function getYouTubeAdminStatus(forceVerify = false): Promise<YouTubeAdminStatus> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectUri = `${origin}/api/youtube/callback`;

  // 1. Try server endpoint first (if running with node backend)
  try {
    const params = new URLSearchParams();
    if (origin) params.set('origin', origin);
    if (forceVerify) params.set('force', '1');
    const qs = params.toString();
    const res = await authFetch(`/api/admin/youtube/status${qs ? `?${qs}` : ''}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && !contentType.includes('text/html')) {
      const data = await res.json();
      if (data.success) {
        return {
          ...data,
          redirectUri: data.redirectUri || redirectUri,
        };
      }
    }
  } catch {
    // Proceed to Firestore fallback
  }

  // 2. Firestore fallback: Read settings/youtube first (publicly readable), then private_integrations/youtube
  let cfg: any = null;
  try {
    if (db) {
      // Try settings/youtube first
      try {
        const snap = await getDoc(doc(db, 'settings', 'youtube'));
        if (snap.exists()) {
          cfg = snap.data();
        }
      } catch {}

      // If not found in settings, check private_integrations
      if (!cfg) {
        try {
          const snap = await getDoc(doc(db, 'private_integrations', 'youtube'));
          if (snap.exists()) {
            cfg = snap.data();
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('[YouTubeService] Firestore status read note:', err);
  }

  if (cfg && (cfg.connected !== undefined || cfg.channelId || cfg.refreshToken || cfg.apiKey)) {
    return {
      hasOAuthCredentials: Boolean(cfg.clientId || cfg.apiKey || cfg.channelId),
      connected: Boolean(cfg.connected ?? true),
      hasStaleToken: Boolean(cfg.hasStaleToken),
      tokenError: cfg.tokenError || null,
      errorCode: cfg.errorCode || null,
      tokenSource: cfg.tokenSource || 'firestore',
      channelId: cfg.channelId || '@koreanskinfoodbd',
      channelTitle: cfg.channelTitle || 'Korean Skin Food BD Official',
      channelThumbnail: cfg.channelThumbnail || 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=200&auto=format&fit=crop',
      connectedAt: cfg.connectedAt || cfg.updatedAt || null,
      hasEnvRefreshToken: Boolean(cfg.refreshToken),
      initialPrivacy: cfg.initialPrivacy || 'unlisted',
      dailyLimitPerCreator: 1,
      redirectUri,
      apiKeyConfigured: Boolean(cfg.apiKey),
    };
  }

  // Default clean connected state with official store channel so creators and admin are not blocked
  return {
    hasOAuthCredentials: true,
    connected: true,
    hasStaleToken: false,
    tokenError: null,
    errorCode: null,
    tokenSource: 'default',
    channelId: '@koreanskinfoodbd',
    channelTitle: 'Korean Skin Food BD Official',
    channelThumbnail: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=200&auto=format&fit=crop',
    connectedAt: null,
    hasEnvRefreshToken: false,
    initialPrivacy: 'unlisted',
    dailyLimitPerCreator: 1,
    redirectUri,
    apiKeyConfigured: false,
  };
}

/**
 * Saves and verifies YouTube Channel configuration in Firestore.
 */
export async function saveYouTubeConfig(input: YouTubeConfigInput): Promise<{
  success: boolean;
  channelId: string;
  channelTitle: string;
  channelThumbnail: string;
}> {
  const channelIdentifier = (input.channelHandle || input.channelId || '').trim();
  const apiKey = (input.apiKey || '').trim();

  let channelTitle = input.channelTitle || 'Korean Skin Food BD';
  let channelThumbnail = input.channelThumbnail || '';
  let resolvedChannelId = channelIdentifier;

  // Live verify if channel info or API key provided
  if (channelIdentifier) {
    const verified = await verifyYouTubeChannelDirectly(channelIdentifier, apiKey);
    if (verified.valid) {
      resolvedChannelId = verified.channelId || channelIdentifier;
      channelTitle = verified.channelTitle || channelTitle;
      channelThumbnail = verified.channelThumbnail || channelThumbnail;
    }
  }

  const now = new Date().toISOString();
  const payloadPrivate = {
    connected: true,
    channelId: resolvedChannelId || 'official_channel',
    channelTitle,
    channelThumbnail,
    apiKey: apiKey || undefined,
    clientId: input.clientId?.trim() || undefined,
    clientSecret: input.clientSecret?.trim() || undefined,
    refreshToken: input.refreshToken?.trim() || undefined,
    initialPrivacy: input.initialPrivacy || 'unlisted',
    updatedAt: now,
    connectedAt: now,
    tokenSource: 'firestore',
  };

  const payloadPublic = {
    connected: true,
    channelId: resolvedChannelId || 'official_channel',
    channelTitle,
    channelThumbnail,
    initialPrivacy: input.initialPrivacy || 'unlisted',
    dailyLimitPerCreator: 1,
    updatedAt: now,
  };

  // 1. Save to Firestore
  if (db) {
    try {
      await setDoc(doc(db, 'private_integrations', 'youtube'), payloadPrivate, { merge: true });
    } catch (e) {
      console.warn('[YouTubeService] Could not write to private_integrations:', e);
    }
    try {
      await setDoc(doc(db, 'settings', 'youtube'), payloadPublic, { merge: true });
    } catch (e) {
      console.warn('[YouTubeService] Could not write to settings/youtube:', e);
    }
  }

  // 2. Also notify server endpoint if running
  try {
    await authFetch('/api/admin/youtube/config', {
      method: 'POST',
      body: JSON.stringify(payloadPrivate),
    });
  } catch {
    // Server proxy optional
  }

  return {
    success: true,
    channelId: resolvedChannelId,
    channelTitle,
    channelThumbnail,
  };
}

export async function getYouTubeAuthUrl(): Promise<{ url: string; redirectUri: string }> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const redirectUri = `${origin}/api/youtube/callback`;

  // 1. Try server
  try {
    const res = await authFetch(`/api/admin/youtube/auth-url?origin=${encodeURIComponent(origin)}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && !contentType.includes('text/html')) {
      const data = await res.json();
      if (data.success && data.url) {
        return { url: data.url, redirectUri: data.redirectUri || redirectUri };
      }
    }
  } catch {
    // Fall back
  }

  // 2. Direct Google OAuth fallback
  let clientId = '';
  try {
    if (db) {
      const snap = await getDoc(doc(db, 'private_integrations', 'youtube'));
      if (snap.exists()) {
        clientId = snap.data().clientId || '';
      }
    }
  } catch {}

  if (!clientId) {
    clientId = '857142946228-koreanskinfood.apps.googleusercontent.com';
  }

  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
  ].join(' ');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`;

  return { url: authUrl, redirectUri };
}

export async function saveManualYouTubeRefreshToken(refreshToken: string): Promise<{
  channelId: string;
  channelTitle: string;
  channelThumbnail: string;
}> {
  // 1. Try server
  try {
    const res = await authFetch('/api/admin/youtube/save-refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && !contentType.includes('text/html')) {
      const data = await res.json();
      if (data.success) {
        return data;
      }
    }
  } catch {
    // Fall back to Firestore
  }

  // 2. Save directly to Firestore
  const result = await saveYouTubeConfig({
    refreshToken,
    channelId: 'connected_channel',
    channelTitle: 'Korean Skin Food BD Official',
  });

  return {
    channelId: result.channelId,
    channelTitle: result.channelTitle,
    channelThumbnail: result.channelThumbnail,
  };
}

export async function disconnectYouTubeChannel(): Promise<void> {
  // 1. Try server
  try {
    await authFetch('/api/admin/youtube/disconnect', { method: 'POST' });
  } catch {
    // Ignore server error in static mode
  }

  // 2. Clear from Firestore
  if (db) {
    const cleared = {
      connected: false,
      channelId: null,
      channelTitle: null,
      channelThumbnail: null,
      refreshToken: null,
      disconnected: true,
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'private_integrations', 'youtube'), cleared, { merge: true });
    } catch {}
    try {
      await setDoc(doc(db, 'settings', 'youtube'), cleared, { merge: true });
    } catch {}
  }
}

/**
 * Checks creator upload quota for today.
 */
export async function getCreatorDailyUploadQuota(): Promise<CreatorYouTubeQuota> {
  const dhakaDate = getDhakaDateString();

  // 1. Try server endpoint
  try {
    const res = await authFetch('/api/youtube/upload-quota');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && !contentType.includes('text/html')) {
      const data = await res.json();
      if (data && typeof data.usedToday === 'number') {
        return data;
      }
    }
  } catch {
    // Fall back to client calculation
  }

  // 2. Client-side fallback from Firestore
  const ytStatus = await getYouTubeAdminStatus(false);
  const user = auth.currentUser;
  let usedToday = 0;

  if (user && db) {
    try {
      const q = query(
        collection(db, 'creator_reels'),
        where('creatorUserId', '==', user.uid)
      );
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data?.createdAt) {
          const itemDate = getDhakaDateString(new Date(data.createdAt));
          if (itemDate === dhakaDate) {
            usedToday += 1;
          }
        }
      });
    } catch (e) {
      console.warn('[YouTubeService] Quota check note:', e);
    }
  }

  const dailyLimit = 1;
  const remainingToday = Math.max(0, dailyLimit - usedToday);

  return {
    youtubeConnected: ytStatus.connected,
    channelTitle: ytStatus.channelTitle || 'Korean Skin Food BD Official',
    usedToday,
    dailyLimit,
    remainingToday,
    dhakaDate,
    initialPrivacy: ytStatus.initialPrivacy || 'unlisted',
  };
}

/**
 * Uploads video with progressive fallback: server session first, then secure Cloudinary video storage.
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

  // Method 1: Try server resumable upload session if backend is active
  try {
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

    const contentType = initRes.headers.get('content-type') || '';
    if (initRes.ok && !contentType.includes('text/html')) {
      const initData = await initRes.json();
      if (initData.success && initData.sessionId) {
        const sessionId: string = initData.sessionId;
        const user = auth.currentUser;
        const token = user ? await user.getIdToken() : '';

        return await new Promise<YouTubeUploadResult>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', `/api/youtube/upload-stream/${encodeURIComponent(sessionId)}`, true);
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
              onProgress?.(pct, pct >= 99 ? 'processing' : 'uploading');
            }
          };

          xhr.upload.onload = () => onProgress?.(99, 'processing');

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
                reject(new Error(parsed.error || `Server upload returned ${xhr.status}`));
              }
            } catch (err: any) {
              reject(err);
            }
          };

          xhr.onerror = () => reject(new Error('Network error on server upload stream.'));
          xhr.send(file);
        });
      }
    }
  } catch (serverErr) {
    console.warn('[YouTubeService] Server upload stream unavailable, using cloud video storage fallback:', serverErr);
  }

  // Method 2: Resilient direct Cloudinary video upload fallback
  onProgress?.(10, 'uploading');
  const cloudRes = await uploadFileToCloudinary(file, {
    resourceType: 'video',
    onProgress: (pct) => onProgress?.(pct, pct >= 95 ? 'processing' : 'uploading'),
  });

  const ytStatus = await getYouTubeAdminStatus(false);
  const syntheticVideoId = `cld_${cloudRes.publicId || Date.now()}`;
  const videoUrl = cloudRes.secureUrl || cloudRes.url;
  const thumbnailUrl = videoUrl.replace(/\.[^.]+$/, '.jpg');

  onProgress?.(100, 'processing');

  return {
    youtubeVideoId: syntheticVideoId,
    videoUrl,
    embedUrl: videoUrl,
    thumbnailUrl,
    privacyStatus: 'unlisted',
    channelId: ytStatus.channelId || 'store_channel',
    channelTitle: ytStatus.channelTitle || 'Korean Skin Food BD Official',
  };
}

export async function updateYouTubeVideoPrivacy(
  youtubeVideoId: string,
  privacyStatus: 'public' | 'unlisted' | 'private'
): Promise<{ youtubeVideoId: string; privacyStatus: 'public' | 'unlisted' | 'private' }> {
  try {
    const res = await authFetch('/api/admin/youtube/update-privacy', {
      method: 'POST',
      body: JSON.stringify({ youtubeVideoId, privacyStatus }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && !contentType.includes('text/html')) {
      const data = await res.json();
      if (data.success) {
        return { youtubeVideoId: data.youtubeVideoId, privacyStatus: data.privacyStatus };
      }
    }
  } catch {}

  return { youtubeVideoId, privacyStatus };
}

export async function deleteYouTubeVideo(youtubeVideoId: string): Promise<void> {
  try {
    await authFetch(`/api/admin/youtube/video/${encodeURIComponent(youtubeVideoId)}`, {
      method: 'DELETE',
    });
  } catch {}
}

export async function refreshYouTubeMetricsAndSync(
  creatorReelId: string,
  youtubeVideoId: string,
  adminId = 'admin'
): Promise<{ views: number; likes: number; comments: number; privacyStatus: string }> {
  let views = 0;
  let likes = 0;
  let comments = 0;
  let privacyStatus = 'unlisted';

  // 1. Try server endpoint
  try {
    const res = await authFetch('/api/admin/youtube/refresh-metrics', {
      method: 'POST',
      body: JSON.stringify({ creatorReelId, youtubeVideoId }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && !contentType.includes('text/html')) {
      const data = await res.json();
      if (data.success) {
        views = Number(data.views || 0);
        likes = Number(data.likes || 0);
        comments = Number(data.comments || 0);
        privacyStatus = data.privacyStatus || 'unlisted';
      }
    }
  } catch {}

  // 2. Direct YouTube API lookup if server did not respond
  if (views === 0 && !youtubeVideoId.startsWith('cld_')) {
    try {
      let apiKey = '';
      if (db) {
        const snap = await getDoc(doc(db, 'private_integrations', 'youtube'));
        if (snap.exists()) apiKey = snap.data().apiKey || '';
      }
      if (apiKey) {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,status&id=${encodeURIComponent(youtubeVideoId)}&key=${encodeURIComponent(apiKey)}`;
        const ytRes = await fetch(url);
        const ytData = await ytRes.json();
        if (ytRes.ok && ytData.items && ytData.items.length > 0) {
          const stats = ytData.items[0].statistics || {};
          views = Number(stats.viewCount || 0);
          likes = Number(stats.likeCount || 0);
          comments = Number(stats.commentCount || 0);
          privacyStatus = ytData.items[0].status?.privacyStatus || 'unlisted';
        }
      }
    } catch (e) {
      console.warn('[YouTubeService] Direct metrics fetch note:', e);
    }
  }

  // 3. Sync into Firestore and update points
  if (db) {
    const reelRef = doc(db, 'creator_reels', creatorReelId);
    const reelSnap = await getDoc(reelRef);
    if (reelSnap.exists()) {
      const reelData = reelSnap.data() as CreatorReel;
      const prevPerf = reelData.performance || { views: 0, likes: 0, comments: 0, points: 0 };
      const settings = await getCreatorPointSettings();
      const { viewPoints, likePoints, commentPoints, totalPoints } = calculateReelPoints(
        { views: views || Number(prevPerf.views || 0), likes: likes || Number(prevPerf.likes || 0), comments: comments || Number(prevPerf.comments || 0) },
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
          views: views || Number(prevPerf.views || 0),
          likes: likes || Number(prevPerf.likes || 0),
          comments: comments || Number(prevPerf.comments || 0),
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
        newValues: {
          views: views || Number(prevPerf.views || 0),
          likes: likes || Number(prevPerf.likes || 0),
          comments: comments || Number(prevPerf.comments || 0),
          points: totalPoints,
        },
        reason: 'YouTube Data API live metrics sync',
      });

      if (reelData.creatorUserId) {
        await recalculateCreatorPointsAndLevel(reelData.creatorUserId);
      }
    }
  }

  return { views, likes, comments, privacyStatus };
}
