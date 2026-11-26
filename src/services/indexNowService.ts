import { auth } from './firebase';

export interface IndexNowSubmitResult {
  success: boolean;
  submittedCount?: number;
  upstreamStatus?: number;
  upstreamMessage?: string;
  keyLocation?: string;
  error?: string;
}

export async function notifyIndexNowUrls(
  pathsOrUrls: string[],
  submitSitemap = false
): Promise<IndexNowSubmitResult | null> {
  if (typeof window === 'undefined') return null;

  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    const cleanPaths = Array.from(
      new Set(
        (pathsOrUrls || [])
          .map((p) => String(p || '').trim())
          .filter(Boolean)
      )
    );
    if (!submitSitemap && cleanPaths.length === 0) return null;

    const token = await currentUser.getIdToken();
    const res = await fetch('/api/seo/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        urls: cleanPaths,
        submitSitemap,
      }),
    });

    const data = (await res.json().catch(() => null)) as IndexNowSubmitResult | null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchSeoOverviewStats(): Promise<any | null> {
  if (typeof window === 'undefined') return null;

  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    const token = await currentUser.getIdToken();
    const res = await fetch('/api/seo/overview', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
