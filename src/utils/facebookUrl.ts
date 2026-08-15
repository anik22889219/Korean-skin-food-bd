/**
 * Facebook URL Normalization & Validation Utility
 *
 * Normalizes Facebook Reel and Post URLs to canonical forms,
 * strips tracking parameters, extracts unique Post/Reel IDs,
 * and enables robust duplicate detection across all variations.
 */

// Tracking & irrelevant query parameters to remove
const TRACKING_PARAMS = new Set([
  'fbclid',
  'ref',
  'sfnsn',
  'mibextid',
  'rdid',
  'extid',
  'refid',
  '__tn__',
  '__cft__',
  '__cft__[0]',
  'fref',
  'hrc',
  '_rdr',
  'checkpoint_src',
  'source',
  'acontext',
  'epa',
  'notif_t',
  'notif_id',
  'locale',
  'paipv',
  'eav',
  'app',
  'set',
  'type',
  'theater',
  'comment_id',
  'reply_comment_id',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fs',
  's',
]);

export interface NormalizedFacebookUrlResult {
  isValid: boolean;
  rawUrl: string;
  normalizedUrl: string;
  postId: string | null;
  canonicalReelUrl?: string | null;
  error?: string;
}

/**
 * Extracts the primary Facebook Post / Reel ID from various URL patterns
 */
export function extractFacebookPostId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim();

  // 1. Reel URL: e.g. /reel/123456789012345 or /reels/123456789012345
  const reelMatch = cleanUrl.match(/\/(?:reel|reels)\/([0-9a-zA-Z_-]+)/i);
  if (reelMatch && reelMatch[1]) return reelMatch[1];

  // 2. Share Reel / Video / Post URL: e.g. /share/r/1234567890 or /share/v/... or /share/p/...
  const shareMatch = cleanUrl.match(/\/share\/[rvp]\/([0-9a-zA-Z_-]+)/i);
  if (shareMatch && shareMatch[1]) return shareMatch[1];

  // 3. fb.watch shortlink: e.g. fb.watch/abcdef1234/
  const fbWatchMatch = cleanUrl.match(/fb\.(?:watch|gg)\/([0-9a-zA-Z_-]+)/i);
  if (fbWatchMatch && fbWatchMatch[1]) return fbWatchMatch[1];

  // 4. Watch URL: e.g. /watch/?v=123456789012345
  const watchMatch = cleanUrl.match(/[?&]v=([0-9a-zA-Z_-]+)/i);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  // 5. Video URL: e.g. /videos/123456789012345 or /{user}/videos/123456789012345
  const videoMatch = cleanUrl.match(/\/videos\/([0-9a-zA-Z_-]+)/i);
  if (videoMatch && videoMatch[1]) return videoMatch[1];

  // 6. Permalink / Story FBID: e.g. story_fbid=123456789012345 or fbid=123456789012345
  const fbidMatch = cleanUrl.match(/[?&](?:story_fbid|fbid)=([0-9a-zA-Z_-]+)/i);
  if (fbidMatch && fbidMatch[1]) return fbidMatch[1];

  // 7. Posts match: e.g. /posts/123456789012345 or /posts/pfbid0abc123xyz
  const postsMatch = cleanUrl.match(/\/posts\/([0-9a-zA-Z_-]+)/i);
  if (postsMatch && postsMatch[1]) return postsMatch[1];

  // 8. Photos match: e.g. /photos/.../123456789012345
  const photoMatch = cleanUrl.match(/\/photos\/[^/]+\/([0-9a-zA-Z_-]+)/i);
  if (photoMatch && photoMatch[1]) return photoMatch[1];

  return null;
}

/**
 * Normalizes any valid Facebook Post/Reel URL into a consistent canonical URL.
 * Handles tracking parameter stripping, subdomain normalization (m., web., etc.),
 * and canonical paths.
 */
export function normalizeFacebookUrl(rawUrl: string): NormalizedFacebookUrlResult {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      isValid: false,
      rawUrl: rawUrl || '',
      normalizedUrl: '',
      postId: null,
      error: 'URL cannot be empty',
    };
  }

  const trimmed = rawUrl.trim();

  // Basic regex check to verify it points to Facebook / fb.watch / fb.gg
  const fbDomainRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)?(facebook\.com|fb\.watch|fb\.gg|fb\.com)(\/.*)?$/i;
  if (!fbDomainRegex.test(trimmed)) {
    return {
      isValid: false,
      rawUrl: trimmed,
      normalizedUrl: '',
      postId: null,
      error: 'Invalid Facebook URL. Must start with facebook.com, fb.watch, or fb.gg',
    };
  }

  // Ensure protocol is https://
  let urlString = trimmed;
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = 'https://' + urlString;
  }

  try {
    const parsed = new URL(urlString);
    let hostname = parsed.hostname.toLowerCase();

    // Standardize subdomains (m.facebook.com, web.facebook.com, touch., etc.)
    if (hostname.endsWith('facebook.com') || hostname.endsWith('fb.com')) {
      hostname = 'www.facebook.com';
    } else if (hostname.endsWith('fb.watch')) {
      hostname = 'fb.watch';
    } else if (hostname.endsWith('fb.gg')) {
      hostname = 'fb.gg';
    }

    // Clean pathname
    let pathname = parsed.pathname.replace(/\/+/g, '/'); // collapse duplicate slashes
    if (pathname.endsWith('/') && pathname.length > 1) {
      pathname = pathname.slice(0, -1);
    }

    const postId = extractFacebookPostId(urlString);

    // If it's a direct reel URL, canonicalize to https://www.facebook.com/reel/{postId}
    if (pathname.toLowerCase().includes('/reel/') || pathname.toLowerCase().includes('/reels/') || pathname.toLowerCase().startsWith('/share/r/')) {
      if (postId) {
        const canonicalReel = `https://www.facebook.com/reel/${postId}`;
        return {
          isValid: true,
          rawUrl: trimmed,
          normalizedUrl: canonicalReel,
          postId,
          canonicalReelUrl: canonicalReel,
        };
      }
    }

    // Clean query parameters by removing tracking/irrelevant params
    const cleanParams = new URLSearchParams();
    parsed.searchParams.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      if (!TRACKING_PARAMS.has(lowerKey) && !lowerKey.startsWith('utm_') && !lowerKey.startsWith('__cft__')) {
        cleanParams.append(key, val);
      }
    });

    // Sort query keys for deterministic consistency
    cleanParams.sort();

    const queryString = cleanParams.toString() ? `?${cleanParams.toString()}` : '';
    let normalized = `https://${hostname}${pathname}${queryString}`;

    // Normalize trailing slash if no query params
    if (normalized.endsWith('/') && !queryString) {
      normalized = normalized.slice(0, -1);
    }

    const canonicalReelUrl = postId ? `https://www.facebook.com/reel/${postId}` : null;

    return {
      isValid: true,
      rawUrl: trimmed,
      normalizedUrl: normalized,
      postId,
      canonicalReelUrl,
    };
  } catch (err: any) {
    return {
      isValid: false,
      rawUrl: trimmed,
      normalizedUrl: '',
      postId: null,
      error: err?.message || 'Failed to parse Facebook URL',
    };
  }
}

/**
 * Checks if two Facebook URLs refer to the same post/reel
 */
export function areFacebookUrlsEqual(urlA: string, urlB: string): boolean {
  if (!urlA || !urlB) return false;
  const resA = normalizeFacebookUrl(urlA);
  const resB = normalizeFacebookUrl(urlB);

  if (!resA.isValid || !resB.isValid) return false;

  // Direct normalized URL match
  if (resA.normalizedUrl === resB.normalizedUrl) return true;

  // If both have post IDs and they match, they are the same post
  if (resA.postId && resB.postId && resA.postId === resB.postId) return true;

  return false;
}
