export function extractYouTubeVideoId(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    // Handle raw 11-char ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtu.be')) {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }

    if (host.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/shorts/')[1]?.split('/')[0] || null;
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/embed/')[1]?.split('/')[0] || null;
      }
      const v = parsed.searchParams.get('v');
      if (v) return v;
    }
  } catch {
    // Fallback string parsing
    if (trimmed.includes('youtu.be/')) {
      return trimmed.split('youtu.be/')[1]?.split(/[?&/]/)[0] || null;
    }
    if (trimmed.includes('youtube.com/shorts/')) {
      return trimmed.split('youtube.com/shorts/')[1]?.split(/[?&/]/)[0] || null;
    }
    if (trimmed.includes('watch?v=')) {
      return trimmed.split('watch?v=')[1]?.split('&')[0] || null;
    }
  }

  return null;
}

export function isYouTubeUrl(url?: string | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('youtube.com') || lower.includes('youtu.be');
}

export function getYouTubeEmbedUrl(
  urlOrId: string,
  options: { autoplay?: boolean; mute?: boolean; controls?: boolean; loop?: boolean; playsinline?: boolean } = {}
): string {
  const videoId = extractYouTubeVideoId(urlOrId) || urlOrId;
  const params = new URLSearchParams();
  if (options.autoplay) params.set('autoplay', '1');
  if (options.mute) params.set('mute', '1');
  if (options.controls === false) params.set('controls', '0');
  if (options.loop) {
    params.set('loop', '1');
    params.set('playlist', videoId);
  }
  if (options.playsinline !== false) {
    params.set('playsinline', '1');
  }
  params.set('rel', '0');
  params.set('modestbranding', '1');
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}
