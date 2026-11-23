/**
 * Lightweight development & opt-in performance instrumentation for POS Register & Scanner.
 * Enabled when running in Vite dev mode or when `localStorage.getItem('pos_perf_debug') === 'true'`.
 * Never logs sensitive user, customer, token, or barcode payload data.
 */

const PERF_ANCHORS: Record<string, number> = {};

export function isPosPerfEnabled(): boolean {
  try {
    const isDev = Boolean((import.meta as any)?.env?.DEV);
    if (isDev) return true;
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('pos_perf_debug') === 'true';
    }
  } catch {
    // ignore storage access issues
  }
  return false;
}

export function markPosPerfAnchor(name: string): number {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  PERF_ANCHORS[name] = now;
  return now;
}

export function getPosPerfAnchor(name: string): number | undefined {
  return PERF_ANCHORS[name];
}

export function getPosPerfElapsed(anchorName: string): number | undefined {
  const start = PERF_ANCHORS[anchorName];
  if (start === undefined) return undefined;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return Number((now - start).toFixed(2));
}

export function logPosPerf(
  event: string,
  metrics?: Record<string, string | number | boolean | undefined>
): void {
  if (!isPosPerfEnabled()) return;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const payload: Record<string, string | number | boolean> = {
    event,
    tMs: Number(now.toFixed(2))
  };
  if (metrics) {
    for (const [k, v] of Object.entries(metrics)) {
      if (v !== undefined) {
        payload[k] = typeof v === 'number' ? Number(v.toFixed(2)) : v;
      }
    }
  }
  console.debug('[POS_PERF]', payload);
}
