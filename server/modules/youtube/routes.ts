import express from 'express';
import fs from 'fs';
import path from 'path';
import { verifyAdminAuth } from '../../middleware/auth';
import {
  getIdTokenFromRequest,
  getFirestoreDocWithToken,
  getFirestoreCollectionWithToken,
  setFirestoreDocWithToken,
  queryFirestoreCollectionWithToken,
} from '../../config/firebase';
import { YouTubeShortItem } from '../../../src/types';

const YOUTUBE_CONFIG_FILE = path.join(process.cwd(), '.youtube-integration.json');
const YOUTUBE_SHORTS_CACHE_FILE = path.join(process.cwd(), '.youtube-shorts-cache.json');

interface YouTubeStoredConfig {
  refreshToken?: string;
  channelId?: string;
  channelHandle?: string;
  channelTitle?: string;
  channelThumbnail?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  initialPrivacy?: 'unlisted' | 'private';
  connected?: boolean;
  connectedAt?: string;
  connectedBy?: string;
  disconnected?: boolean;
  updatedAt?: string;
}

export interface YouTubeShortsRouterDeps {
  invalidateYouTubeHealthCache: () => void;
  getUnifiedGoogleApiKey: () => string | undefined;
}

export function parseYouTubeIsoDurationSeconds(isoDuration?: string | null): number {
  if (!isoDuration || typeof isoDuration !== 'string') return 0;
  const match = isoDuration.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return 0;
  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  const seconds = Number(match[4] || 0);
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

function readLocalYouTubeConfig(): YouTubeStoredConfig {
  try {
    if (fs.existsSync(YOUTUBE_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(YOUTUBE_CONFIG_FILE, 'utf-8')) || {};
    }
  } catch (err) {
    console.warn('[YouTubeSync] Could not read local config:', err);
  }
  return {};
}

function writeLocalYouTubeConfig(cfg: YouTubeStoredConfig) {
  try {
    fs.writeFileSync(YOUTUBE_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[YouTubeSync] Could not write local config:', err);
  }
}

function writeShortsCache(payload: {
  channelId: string;
  channelTitle: string;
  syncedAt: string;
  shorts: YouTubeShortItem[];
}) {
  try {
    fs.writeFileSync(YOUTUBE_SHORTS_CACHE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[YouTubeSync] Could not write shorts cache:', err);
  }
}

function readShortsCache(): {
  channelId?: string;
  channelTitle?: string;
  syncedAt?: string;
  shorts: YouTubeShortItem[];
} {
  try {
    if (fs.existsSync(YOUTUBE_SHORTS_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(YOUTUBE_SHORTS_CACHE_FILE, 'utf-8'));
      if (data && Array.isArray(data.shorts)) {
        return data;
      }
    }
  } catch {}
  return { shorts: [] };
}

function isValidYouTubeVideoId(id?: string | null): id is string {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{6,32}$/.test(id);
}

function sanitizeShortRecord(item: YouTubeShortItem): YouTubeShortItem {
  return {
    videoId: String(item.videoId).slice(0, 32),
    title: String(item.title || 'YouTube Short').slice(0, 295),
    ...(item.customTitle ? { customTitle: String(item.customTitle).slice(0, 295) } : {}),
    ...(item.description ? { description: String(item.description).slice(0, 4800) } : {}),
    thumbnailUrl: String(item.thumbnailUrl || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`).slice(0, 990),
    videoUrl: String(item.videoUrl || `https://www.youtube.com/shorts/${item.videoId}`).slice(0, 990),
    embedUrl: String(item.embedUrl || `https://www.youtube.com/embed/${item.videoId}`).slice(0, 990),
    channelId: String(item.channelId || 'official_channel').slice(0, 120),
    ...(item.channelTitle ? { channelTitle: String(item.channelTitle).slice(0, 190) } : {}),
    publishedAt: String(item.publishedAt || new Date().toISOString()).slice(0, 60),
    durationSeconds: Math.max(0, Math.round(Number(item.durationSeconds || 0))),
    viewsCount: Math.max(0, Math.round(Number(item.viewsCount || 0))),
    likesCount: Math.max(0, Math.round(Number(item.likesCount || 0))),
    commentsCount: Math.max(0, Math.round(Number(item.commentsCount || 0))),
    privacyStatus:
      item.privacyStatus === 'unlisted' || item.privacyStatus === 'private' ? item.privacyStatus : 'public',
    isVisible: typeof item.isVisible === 'boolean' ? item.isVisible : true,
    isPinned: typeof item.isPinned === 'boolean' ? item.isPinned : false,
    displayOrder: Number.isFinite(Number(item.displayOrder)) ? Number(item.displayOrder) : 0,
    taggedProductIds: Array.isArray(item.taggedProductIds)
      ? item.taggedProductIds.map((id) => String(id)).filter(Boolean).slice(0, 6)
      : [],
    metricsSyncedAt: String(item.metricsSyncedAt || new Date().toISOString()).slice(0, 60),
    createdAt: String(item.createdAt || item.metricsSyncedAt || new Date().toISOString()).slice(0, 60),
    updatedAt: String(item.updatedAt || new Date().toISOString()).slice(0, 60),
  };
}

interface RawFetchedShort {
  videoId: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  durationSeconds: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  privacyStatus: 'public' | 'unlisted' | 'private';
}

async function getOAuthAccessToken(
  clientId?: string,
  clientSecret?: string,
  refreshToken?: string
): Promise<string | null> {
  if (!clientId || !clientSecret || !refreshToken) return null;
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        refresh_token: refreshToken.trim(),
        grant_type: 'refresh_token',
      }).toString(),
    });
    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data?.access_token) {
      return String(data.access_token);
    }
  } catch (err) {
    console.warn('[YouTubeSync] OAuth token exchange warning:', err);
  }
  return null;
}

async function fetchYouTubeJson(url: string, accessToken?: string | null): Promise<{ ok: boolean; status: number; data: any }> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function buildApiAuthSuffix(accessToken?: string | null, apiKey?: string | null): string {
  if (accessToken) return '';
  if (apiKey) return `&key=${encodeURIComponent(apiKey)}`;
  return '';
}

async function resolveChannelDetails(options: {
  channelIdentifier?: string;
  accessToken?: string | null;
  apiKey?: string | null;
}): Promise<{
  channelId: string;
  channelTitle: string;
  channelThumbnail: string;
  uploadsPlaylistId?: string;
} | null> {
  const { channelIdentifier, accessToken, apiKey } = options;
  const authSuffix = buildApiAuthSuffix(accessToken, apiKey);

  // If OAuth token present and no explicit override or identifier matches
  if (accessToken && (!channelIdentifier || channelIdentifier === 'official_channel' || channelIdentifier === 'connected_channel')) {
    const res = await fetchYouTubeJson(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true',
      accessToken
    );
    const ch = res.data?.items?.[0];
    if (res.ok && ch?.id) {
      return {
        channelId: ch.id,
        channelTitle: ch.snippet?.title || 'Connected YouTube Channel',
        channelThumbnail:
          ch.snippet?.thumbnails?.high?.url ||
          ch.snippet?.thumbnails?.medium?.url ||
          ch.snippet?.thumbnails?.default?.url ||
          '',
        uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads,
      };
    }
  }

  const trimmed = (channelIdentifier || '').trim();
  if (!trimmed || (!accessToken && !apiKey)) {
    return null;
  }

  const queryAttempts: string[] = [];
  if (trimmed.startsWith('UC') && trimmed.length >= 20) {
    queryAttempts.push(`id=${encodeURIComponent(trimmed)}`);
  } else if (trimmed.startsWith('@')) {
    queryAttempts.push(`forHandle=${encodeURIComponent(trimmed)}`);
  } else {
    queryAttempts.push(`forHandle=${encodeURIComponent(`@${trimmed}`)}`);
    queryAttempts.push(`id=${encodeURIComponent(trimmed)}`);
    queryAttempts.push(`forUsername=${encodeURIComponent(trimmed)}`);
  }

  for (const param of queryAttempts) {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&${param}${authSuffix}`;
    const res = await fetchYouTubeJson(url, accessToken);
    const ch = res.data?.items?.[0];
    if (res.ok && ch?.id) {
      return {
        channelId: ch.id,
        channelTitle: ch.snippet?.title || trimmed,
        channelThumbnail:
          ch.snippet?.thumbnails?.high?.url ||
          ch.snippet?.thumbnails?.medium?.url ||
          ch.snippet?.thumbnails?.default?.url ||
          '',
        uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads,
      };
    }
  }

  // Fallback to mine=true if OAuth token exists and handle lookup returned empty
  if (accessToken) {
    const res = await fetchYouTubeJson(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true',
      accessToken
    );
    const ch = res.data?.items?.[0];
    if (res.ok && ch?.id) {
      return {
        channelId: ch.id,
        channelTitle: ch.snippet?.title || 'Connected YouTube Channel',
        channelThumbnail:
          ch.snippet?.thumbnails?.high?.url ||
          ch.snippet?.thumbnails?.medium?.url ||
          ch.snippet?.thumbnails?.default?.url ||
          '',
        uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads,
      };
    }
  }

  return null;
}

async function fetchPlaylistVideoIds(options: {
  playlistId: string;
  accessToken?: string | null;
  apiKey?: string | null;
  maxPages?: number;
}): Promise<{ ok: boolean; videoIds: string[]; error?: string }> {
  const { playlistId, accessToken, apiKey, maxPages = 5 } = options;
  const authSuffix = buildApiAuthSuffix(accessToken, apiKey);
  const videoIds: string[] = [];
  const seen = new Set<string>();
  let pageToken = '';

  for (let page = 0; page < maxPages; page++) {
    const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,snippet&maxResults=50&playlistId=${encodeURIComponent(
      playlistId
    )}${pageParam}${authSuffix}`;

    const res = await fetchYouTubeJson(url, accessToken);
    if (!res.ok) {
      return {
        ok: false,
        videoIds: [],
        error: res.data?.error?.message || `YouTube playlist error (${res.status})`,
      };
    }

    const items = Array.isArray(res.data?.items) ? res.data.items : [];
    for (const item of items) {
      const vid = item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId;
      if (isValidYouTubeVideoId(vid) && !seen.has(vid)) {
        seen.add(vid);
        videoIds.push(vid);
      }
    }

    if (!res.data?.nextPageToken) break;
    pageToken = res.data.nextPageToken;
  }

  return { ok: true, videoIds };
}

async function hydrateVideosMetadata(options: {
  videoIds: string[];
  accessToken?: string | null;
  apiKey?: string | null;
}): Promise<RawFetchedShort[]> {
  const { videoIds, accessToken, apiKey } = options;
  const authSuffix = buildApiAuthSuffix(accessToken, apiKey);
  const results: RawFetchedShort[] = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,status&id=${encodeURIComponent(
      batch.join(',')
    )}${authSuffix}`;

    const res = await fetchYouTubeJson(url, accessToken);
    if (!res.ok) {
      throw new Error(res.data?.error?.message || `Failed to load video metadata (${res.status})`);
    }

    const items = Array.isArray(res.data?.items) ? res.data.items : [];
    for (const item of items) {
      if (!isValidYouTubeVideoId(item?.id)) continue;
      const thumbs = item?.snippet?.thumbnails || {};
      const thumbnailUrl =
        thumbs.maxres?.url ||
        thumbs.standard?.url ||
        thumbs.high?.url ||
        thumbs.medium?.url ||
        thumbs.default?.url ||
        `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;

      const privacyStatus = item?.status?.privacyStatus;
      results.push({
        videoId: item.id,
        title: item?.snippet?.title || 'YouTube Short',
        description: item?.snippet?.description || '',
        thumbnailUrl,
        channelId: item?.snippet?.channelId || '',
        channelTitle: item?.snippet?.channelTitle || '',
        publishedAt: item?.snippet?.publishedAt || new Date().toISOString(),
        durationSeconds: parseYouTubeIsoDurationSeconds(item?.contentDetails?.duration),
        viewsCount: Math.max(0, Number(item?.statistics?.viewCount || 0)),
        likesCount: Math.max(0, Number(item?.statistics?.likeCount || 0)),
        commentsCount: Math.max(0, Number(item?.statistics?.commentCount || 0)),
        privacyStatus:
          privacyStatus === 'private' || privacyStatus === 'unlisted' ? privacyStatus : 'public',
      });
    }
  }

  return results;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function resolveChannelIdFromWebPage(identifier: string): Promise<{
  channelId: string;
  channelTitle?: string;
} | null> {
  const trimmed = identifier.trim();
  if (trimmed.startsWith('UC') && trimmed.length >= 20) {
    return { channelId: trimmed };
  }
  const handle = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
  try {
    const res = await fetch(`https://www.youtube.com/${encodeURIComponent(handle)}/shorts`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KoreanSkinFoodBot/1.0)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const idMatch =
      html.match(/"externalId":"(UC[a-zA-Z0-9_-]{20,})"/) ||
      html.match(/"channelId":"(UC[a-zA-Z0-9_-]{20,})"/) ||
      html.match(/channel\/(UC[a-zA-Z0-9_-]{20,})/);
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    if (idMatch?.[1]) {
      return {
        channelId: idMatch[1],
        channelTitle: titleMatch?.[1] ? decodeXmlEntities(titleMatch[1]) : undefined,
      };
    }
  } catch (err) {
    console.warn('[YouTubeSync] Channel page lookup warning:', err);
  }
  return null;
}

async function fetchPublicRssShortsFallback(channelIdentifier: string): Promise<{
  channelId: string;
  channelTitle: string;
  shorts: RawFetchedShort[];
} | null> {
  const resolved = await resolveChannelIdFromWebPage(channelIdentifier);
  if (!resolved?.channelId) return null;

  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(resolved.channelId)}`;
  const res = await fetch(rssUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KoreanSkinFoodBot/1.0)' },
  });
  if (!res.ok) return null;

  const xml = await res.text();
  const channelTitleMatch = xml.match(/<author>\s*<name>([^<]+)<\/name>/);
  const channelTitle = channelTitleMatch?.[1]
    ? decodeXmlEntities(channelTitleMatch[1])
    : resolved.channelTitle || 'YouTube Channel';

  const entryMatches = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  const shorts: RawFetchedShort[] = [];

  for (const entry of entryMatches) {
    const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/);
    const href = linkMatch?.[1] || '';
    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const videoId = videoIdMatch?.[1]?.trim();

    if (!isValidYouTubeVideoId(videoId)) continue;
    // YouTube RSS feed uses /shorts/ in the alternate link for Shorts!
    if (!href.includes('/shorts/')) continue;

    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const thumbMatch = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/);
    const viewsMatch = entry.match(/<media:statistics[^>]*views="(\d+)"/);
    const likesMatch = entry.match(/<media:starRating[^>]*count="(\d+)"/);
    const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/);

    shorts.push({
      videoId,
      title: titleMatch?.[1] ? decodeXmlEntities(titleMatch[1].trim()) : 'YouTube Short',
      description: descMatch?.[1] ? decodeXmlEntities(descMatch[1].trim()) : '',
      thumbnailUrl: thumbMatch?.[1] || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      channelId: resolved.channelId,
      channelTitle,
      publishedAt: publishedMatch?.[1] || new Date().toISOString(),
      durationSeconds: 60,
      viewsCount: Number(viewsMatch?.[1] || 0),
      likesCount: Number(likesMatch?.[1] || 0),
      commentsCount: 0,
      privacyStatus: 'public',
    });
  }

  return {
    channelId: resolved.channelId,
    channelTitle,
    shorts,
  };
}

export function createYouTubeShortsRouter(deps: YouTubeShortsRouterDeps): express.Router {
  const router = express.Router();

  let inFlightAutoSync: Promise<any> | null = null;
  let lastAutoSyncAttemptAt = 0;

  async function resolveAllCredentials(idToken?: string, overrideChannel?: string) {
    const localCfg = readLocalYouTubeConfig();
    let privateCfg: any = null;
    let publicCfg: any = null;

    if (idToken) {
      privateCfg = await getFirestoreDocWithToken('private_integrations', 'youtube', idToken);
    }
    publicCfg = await getFirestoreDocWithToken('settings', 'youtube', idToken);

    const clientId =
      process.env.YOUTUBE_CLIENT_ID?.trim() ||
      localCfg.clientId?.trim() ||
      privateCfg?.clientId?.trim() ||
      undefined;
    const clientSecret =
      process.env.YOUTUBE_CLIENT_SECRET?.trim() ||
      localCfg.clientSecret?.trim() ||
      privateCfg?.clientSecret?.trim() ||
      undefined;
    const refreshToken =
      (!localCfg.disconnected ? localCfg.refreshToken?.trim() : undefined) ||
      (!localCfg.disconnected ? process.env.YOUTUBE_REFRESH_TOKEN?.trim() : undefined) ||
      (!localCfg.disconnected ? privateCfg?.refreshToken?.trim() : undefined) ||
      undefined;

    const apiKey =
      localCfg.apiKey?.trim() ||
      privateCfg?.apiKey?.trim() ||
      process.env.YOUTUBE_API_KEY?.trim() ||
      deps.getUnifiedGoogleApiKey() ||
      undefined;

    const channelIdentifier =
      overrideChannel?.trim() ||
      localCfg.channelId?.trim() ||
      localCfg.channelHandle?.trim() ||
      privateCfg?.channelId?.trim() ||
      publicCfg?.channelId?.trim() ||
      undefined;

    const accessToken = await getOAuthAccessToken(clientId, clientSecret, refreshToken);

    return {
      accessToken,
      apiKey,
      channelIdentifier,
      localCfg,
      publicCfg,
    };
  }

  async function fetchChannelShortsFromYouTube(options: {
    idToken?: string;
    overrideChannel?: string;
    maxDurationSeconds?: number;
  }): Promise<{
    channelId: string;
    channelTitle: string;
    channelThumbnail: string;
    shorts: RawFetchedShort[];
    sourceMethod: 'oauth_uush' | 'oauth_uploads' | 'apikey_uush' | 'apikey_uploads' | 'rss_shorts';
  }> {
    const maxDurationSeconds = Math.max(30, Math.min(300, Number(options.maxDurationSeconds || 180)));
    const creds = await resolveAllCredentials(options.idToken, options.overrideChannel);

    let channelInfo: {
      channelId: string;
      channelTitle: string;
      channelThumbnail: string;
      uploadsPlaylistId?: string;
    } | null = null;

    if (creds.accessToken || creds.apiKey) {
      channelInfo = await resolveChannelDetails({
        channelIdentifier: creds.channelIdentifier,
        accessToken: creds.accessToken,
        apiKey: creds.apiKey,
      });
    }

    if (channelInfo?.channelId && (creds.accessToken || creds.apiKey)) {
      const authMode = creds.accessToken ? 'oauth' : 'apikey';
      let usedUush = false;
      let rawVideoIds: string[] = [];

      // 1. Primary low-quota Shorts playlist: UUSH + channelId without 'UC'
      if (channelInfo.channelId.startsWith('UC')) {
        const uushPlaylistId = `UUSH${channelInfo.channelId.slice(2)}`;
        const uushRes = await fetchPlaylistVideoIds({
          playlistId: uushPlaylistId,
          accessToken: creds.accessToken,
          apiKey: creds.apiKey,
          maxPages: 5,
        });
        if (uushRes.ok && uushRes.videoIds.length > 0) {
          usedUush = true;
          rawVideoIds = uushRes.videoIds;
        }
      }

      // 2. Fallback to channel uploads playlist (UU...) if UUSH is empty/unavailable
      if (rawVideoIds.length === 0) {
        const uploadsId =
          channelInfo.uploadsPlaylistId ||
          (channelInfo.channelId.startsWith('UC') ? `UU${channelInfo.channelId.slice(2)}` : '');
        if (uploadsId) {
          const uploadsRes = await fetchPlaylistVideoIds({
            playlistId: uploadsId,
            accessToken: creds.accessToken,
            apiKey: creds.apiKey,
            maxPages: 5,
          });
          if (uploadsRes.ok && uploadsRes.videoIds.length > 0) {
            rawVideoIds = uploadsRes.videoIds;
          }
        }
      }

      if (rawVideoIds.length > 0) {
        const hydrated = await hydrateVideosMetadata({
          videoIds: rawVideoIds,
          accessToken: creds.accessToken,
          apiKey: creds.apiKey,
        });

        const filtered = hydrated.filter((v) => {
          if (v.privacyStatus === 'private') return false;
          if (!usedUush) {
            // Uploads playlist mixes long-form + Shorts: filter strictly by Shorts duration
            return v.durationSeconds > 0 && v.durationSeconds <= maxDurationSeconds;
          }
          // Even in UUSH, respect strict duration cap if admin selected 60s
          return v.durationSeconds === 0 || v.durationSeconds <= maxDurationSeconds;
        });

        return {
          channelId: channelInfo.channelId,
          channelTitle: channelInfo.channelTitle,
          channelThumbnail: channelInfo.channelThumbnail,
          shorts: filtered,
          sourceMethod: usedUush
            ? authMode === 'oauth'
              ? 'oauth_uush'
              : 'apikey_uush'
            : authMode === 'oauth'
            ? 'oauth_uploads'
            : 'apikey_uploads',
        };
      }
    }

    // 3. Public RSS Shorts Fallback if OAuth / Data API v3 Key unavailable
    if (creds.channelIdentifier && creds.channelIdentifier !== 'official_channel' && creds.channelIdentifier !== 'connected_channel') {
      const rssResult = await fetchPublicRssShortsFallback(creds.channelIdentifier);
      if (rssResult) {
        return {
          channelId: rssResult.channelId,
          channelTitle: rssResult.channelTitle,
          channelThumbnail: creds.publicCfg?.channelThumbnail || '',
          shorts: rssResult.shorts,
          sourceMethod: 'rss_shorts',
        };
      }
    }

    throw new Error(
      'Unable to connect to your YouTube Channel via OAuth or YouTube Data API v3. Please connect your channel via OAuth or enter a valid Channel Handle (@...) and YouTube Data API Key in Configure Channel.'
    );
  }

  function mergeShortsWithExisting(
    fetched: RawFetchedShort[],
    existingDocs: any[],
    syncedAt: string
  ): {
    merged: YouTubeShortItem[];
    createdCount: number;
    updatedCount: number;
  } {
    const existingById = new Map<string, any>();
    for (const docItem of existingDocs) {
      const vid = docItem?.videoId || docItem?.id;
      if (vid) existingById.set(String(vid), docItem);
    }

    let createdCount = 0;
    let updatedCount = 0;
    const merged: YouTubeShortItem[] = [];

    for (const raw of fetched) {
      const existing = existingById.get(raw.videoId);
      if (existing) {
        updatedCount += 1;
      } else {
        createdCount += 1;
      }

      const item = sanitizeShortRecord({
        videoId: raw.videoId,
        title: raw.title,
        customTitle: existing?.customTitle || undefined,
        description: raw.description || existing?.description || undefined,
        thumbnailUrl: raw.thumbnailUrl,
        videoUrl: `https://www.youtube.com/shorts/${raw.videoId}`,
        embedUrl: `https://www.youtube.com/embed/${raw.videoId}`,
        channelId: raw.channelId,
        channelTitle: raw.channelTitle || existing?.channelTitle,
        publishedAt: raw.publishedAt,
        durationSeconds: raw.durationSeconds,
        viewsCount: raw.viewsCount,
        likesCount: raw.likesCount,
        commentsCount: raw.commentsCount,
        privacyStatus: raw.privacyStatus,
        isVisible: typeof existing?.isVisible === 'boolean' ? existing.isVisible : true,
        isPinned: typeof existing?.isPinned === 'boolean' ? existing.isPinned : false,
        displayOrder: Number.isFinite(Number(existing?.displayOrder)) ? Number(existing.displayOrder) : 0,
        taggedProductIds: Array.isArray(existing?.taggedProductIds) ? existing.taggedProductIds : [],
        metricsSyncedAt: syncedAt,
        createdAt: existing?.createdAt || syncedAt,
        updatedAt: syncedAt,
      });

      merged.push(item);
    }

    return { merged, createdCount, updatedCount };
  }

  // POST /api/admin/youtube/config — persist Channel Handle/ID & API Key cleanly on server
  router.post('/api/admin/youtube/config', verifyAdminAuth, async (req, res) => {
    try {
      const {
        channelId,
        channelHandle,
        channelTitle,
        channelThumbnail,
        apiKey,
        clientId,
        clientSecret,
        refreshToken,
        initialPrivacy,
      } = req.body || {};

      const existing = readLocalYouTubeConfig();
      const updated: YouTubeStoredConfig = {
        ...existing,
        ...(channelId ? { channelId: String(channelId).trim() } : {}),
        ...(channelHandle ? { channelHandle: String(channelHandle).trim() } : {}),
        ...(channelTitle ? { channelTitle: String(channelTitle).trim() } : {}),
        ...(channelThumbnail ? { channelThumbnail: String(channelThumbnail).trim() } : {}),
        ...(apiKey !== undefined ? { apiKey: String(apiKey).trim() || undefined } : {}),
        ...(clientId ? { clientId: String(clientId).trim() } : {}),
        ...(clientSecret ? { clientSecret: String(clientSecret).trim() } : {}),
        ...(refreshToken ? { refreshToken: String(refreshToken).trim() } : {}),
        ...(initialPrivacy ? { initialPrivacy } : {}),
        connected: true,
        disconnected: false,
        updatedAt: new Date().toISOString(),
      };

      writeLocalYouTubeConfig(updated);
      deps.invalidateYouTubeHealthCache();

      return res.json({
        success: true,
        channelId: updated.channelId || updated.channelHandle || '',
        channelTitle: updated.channelTitle || '',
        apiKeyConfigured: Boolean(updated.apiKey),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to save server YouTube config' });
    }
  });

  // POST /api/admin/youtube/sync-shorts — Manual or Admin-Triggered Sync
  router.post('/api/admin/youtube/sync-shorts', verifyAdminAuth, async (req, res) => {
    const idToken = getIdTokenFromRequest(req);
    const { channelId: overrideChannel, maxDurationSeconds } = req.body || {};

    try {
      const displaySettings = await getFirestoreDocWithToken('settings', 'youtube_shorts_display', idToken);
      const effectiveMaxDur = Number(
        maxDurationSeconds || displaySettings?.maxShortDurationSeconds || 180
      );

      const fetchedResult = await fetchChannelShortsFromYouTube({
        idToken,
        overrideChannel,
        maxDurationSeconds: effectiveMaxDur,
      });

      const syncedAt = new Date().toISOString();
      const existingDocs = await getFirestoreCollectionWithToken('youtube_shorts', idToken);
      const { merged, createdCount, updatedCount } = mergeShortsWithExisting(
        fetchedResult.shorts,
        existingDocs,
        syncedAt
      );

      // Persist each merged Short back to Firestore (non-destructive merge already applied)
      const writeBatchSize = 10;
      for (let i = 0; i < merged.length; i += writeBatchSize) {
        const chunk = merged.slice(i, i + writeBatchSize);
        await Promise.all(
          chunk.map((item) =>
            setFirestoreDocWithToken('youtube_shorts', item.videoId, item, idToken, false)
          )
        );
      }

      // Update sync telemetry in settings/youtube_shorts_display
      const existingSettingPayload = displaySettings || {};
      await setFirestoreDocWithToken(
        'settings',
        'youtube_shorts_display',
        {
          enabled: typeof existingSettingPayload.enabled === 'boolean' ? existingSettingPayload.enabled : true,
          title: existingSettingPayload.title || 'Community Live — YouTube Shorts',
          subtitle: existingSettingPayload.subtitle || 'SHORTS & SKINCARE IN ACTION',
          viewAllLinkText: existingSettingPayload.viewAllLinkText || 'View Channel',
          viewAllLinkUrl:
            existingSettingPayload.viewAllLinkUrl ||
            `https://www.youtube.com/channel/${fetchedResult.channelId}/shorts`,
          maxDisplayCount: Number(existingSettingPayload.maxDisplayCount || 12),
          autoPlayCarousel:
            typeof existingSettingPayload.autoPlayCarousel === 'boolean'
              ? existingSettingPayload.autoPlayCarousel
              : true,
          carouselSlideIntervalSeconds: Math.max(
            2,
            Math.min(120, Math.round(Number(existingSettingPayload.carouselSlideIntervalSeconds || 6)))
          ),
          autoSyncEnabled:
            typeof existingSettingPayload.autoSyncEnabled === 'boolean'
              ? existingSettingPayload.autoSyncEnabled
              : true,
          autoSyncIntervalMinutes: Number(existingSettingPayload.autoSyncIntervalMinutes || 60),
          maxShortDurationSeconds: effectiveMaxDur,
          lastSyncedAt: syncedAt,
          lastSyncCount: merged.length,
          lastSyncedChannelId: fetchedResult.channelId,
          lastSyncedChannelTitle: fetchedResult.channelTitle,
          updatedAt: syncedAt,
        },
        idToken,
        true
      );

      // Also persist resolved UC... channelId in local config & settings/youtube
      const localCfg = readLocalYouTubeConfig();
      writeLocalYouTubeConfig({
        ...localCfg,
        channelId: fetchedResult.channelId,
        channelTitle: fetchedResult.channelTitle,
        ...(fetchedResult.channelThumbnail ? { channelThumbnail: fetchedResult.channelThumbnail } : {}),
        connected: true,
        disconnected: false,
        updatedAt: syncedAt,
      });

      writeShortsCache({
        channelId: fetchedResult.channelId,
        channelTitle: fetchedResult.channelTitle,
        syncedAt,
        shorts: merged,
      });

      return res.json({
        success: true,
        channelId: fetchedResult.channelId,
        channelTitle: fetchedResult.channelTitle,
        channelThumbnail: fetchedResult.channelThumbnail,
        fetchedCount: fetchedResult.shorts.length,
        createdCount,
        updatedCount,
        totalStored: existingDocs.length + createdCount,
        syncedAt,
        sourceMethod: fetchedResult.sourceMethod,
        shorts: merged,
      });
    } catch (err: any) {
      console.error('[YouTubeSync] Sync error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to sync YouTube Channel Shorts.',
      });
    }
  });

  // POST /api/youtube/shorts/auto-sync-check — Throttled background auto-sync
  router.post('/api/youtube/shorts/auto-sync-check', async (req, res) => {
    try {
      const idToken = getIdTokenFromRequest(req);
      const nowMs = Date.now();

      // Throttle repeated calls from concurrent storefront visitors (min 5 min cooldown)
      if (inFlightAutoSync) {
        const result = await inFlightAutoSync;
        return res.json(result);
      }

      if (nowMs - lastAutoSyncAttemptAt < 5 * 60 * 1000) {
        return res.json({ success: true, synced: false, skippedReason: 'cooldown_active' });
      }

      const displaySettings = await getFirestoreDocWithToken('settings', 'youtube_shorts_display', idToken);
      if (!displaySettings?.autoSyncEnabled) {
        return res.json({ success: true, synced: false, skippedReason: 'auto_sync_disabled' });
      }

      const intervalMinutes = Math.max(15, Number(displaySettings.autoSyncIntervalMinutes || 60));
      const lastSyncedMs = displaySettings.lastSyncedAt ? new Date(displaySettings.lastSyncedAt).getTime() : 0;
      if (lastSyncedMs && nowMs - lastSyncedMs < intervalMinutes * 60 * 1000) {
        return res.json({ success: true, synced: false, skippedReason: 'interval_not_elapsed' });
      }

      lastAutoSyncAttemptAt = nowMs;

      inFlightAutoSync = (async () => {
        try {
          const maxDur = Number(displaySettings.maxShortDurationSeconds || 180);
          const fetchedResult = await fetchChannelShortsFromYouTube({
            idToken,
            maxDurationSeconds: maxDur,
          });
          const syncedAt = new Date().toISOString();

          const existingDocs = idToken
            ? await getFirestoreCollectionWithToken('youtube_shorts', idToken)
            : await queryFirestoreCollectionWithToken('youtube_shorts', [{ field: 'isVisible', value: true }]);

          const { merged, createdCount, updatedCount } = mergeShortsWithExisting(
            fetchedResult.shorts,
            existingDocs,
            syncedAt
          );

          writeShortsCache({
            channelId: fetchedResult.channelId,
            channelTitle: fetchedResult.channelTitle,
            syncedAt,
            shorts: merged,
          });

          // If caller passed a staff/admin token, persist updates cleanly into Firestore
          let persistedToFirestore = false;
          if (idToken) {
            try {
              for (let i = 0; i < merged.length; i += 10) {
                const chunk = merged.slice(i, i + 10);
                await Promise.all(
                  chunk.map((item) =>
                    setFirestoreDocWithToken('youtube_shorts', item.videoId, item, idToken, false)
                  )
                );
              }
              await setFirestoreDocWithToken(
                'settings',
                'youtube_shorts_display',
                {
                  lastSyncedAt: syncedAt,
                  lastSyncCount: merged.length,
                  lastSyncedChannelId: fetchedResult.channelId,
                  lastSyncedChannelTitle: fetchedResult.channelTitle,
                  updatedAt: syncedAt,
                },
                idToken,
                true
              );
              persistedToFirestore = true;
            } catch {
              persistedToFirestore = false;
            }
          }

          return {
            success: true,
            synced: true,
            persistedToFirestore,
            channelId: fetchedResult.channelId,
            channelTitle: fetchedResult.channelTitle,
            fetchedCount: fetchedResult.shorts.length,
            createdCount,
            updatedCount,
            syncedAt,
            shorts: merged,
          };
        } catch (err: any) {
          return {
            success: false,
            synced: false,
            error: err?.message || 'Background sync failed',
          };
        } finally {
          inFlightAutoSync = null;
        }
      })();

      const result = await inFlightAutoSync;
      return res.json(result);
    } catch (err: any) {
      inFlightAutoSync = null;
      return res.status(500).json({ success: false, synced: false, error: err?.message });
    }
  });

  // GET /api/youtube/shorts/cached — Fallback cache endpoint (contains no secrets)
  router.get('/api/youtube/shorts/cached', (_req, res) => {
    const cached = readShortsCache();
    return res.json({
      success: true,
      syncedAt: cached.syncedAt || null,
      channelId: cached.channelId || null,
      channelTitle: cached.channelTitle || null,
      shorts: cached.shorts.filter((s) => s.isVisible !== false && s.privacyStatus !== 'private'),
    });
  });

  return router;
}
