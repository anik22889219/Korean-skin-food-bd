/**
 * Centralized Cache TTL Policy & Persistent Query Cache Configuration
 *
 * Safe persistence for public catalog and layout data (products, categories, brands, themes).
 * Strictly excludes authentication tokens, sensitive admin data, payment information,
 * and restricted wholesale pricing from persistent storage.
 */
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

export const CACHE_TTL = {
  // Public catalog - long cache
  PRODUCTS_STALE: 5 * 60 * 1000, // 5 minutes
  PRODUCTS_GC: 30 * 60 * 1000, // 30 minutes
  CATEGORIES_STALE: 30 * 60 * 1000, // 30 minutes
  CATEGORIES_GC: 60 * 60 * 1000, // 60 minutes
  BRANDS_STALE: 30 * 60 * 1000, // 30 minutes
  BRANDS_GC: 60 * 60 * 1000, // 60 minutes

  // Settings & Themes - long cache
  SETTINGS_STALE: 30 * 60 * 1000, // 30 minutes
  SETTINGS_GC: 60 * 60 * 1000, // 60 minutes

  // Realtime listener windows (200-item stream)
  REALTIME_ORDERS_STALE: 30 * 1000, // 30 seconds
  REALTIME_ORDERS_GC: 15 * 60 * 1000, // 15 minutes
  RECENT_MOVEMENTS_STALE: 30 * 1000, // 30 seconds
  RECENT_LOGS_STALE: 30 * 1000, // 30 seconds
  RECENT_RECEIPTS_STALE: 30 * 1000, // 30 seconds

  // Historical & Paginated records (beyond 200-item window)
  HISTORICAL_ORDERS_STALE: 5 * 60 * 1000, // 5 minutes
  HISTORICAL_ORDERS_GC: 60 * 60 * 1000, // 60 minutes
  HISTORICAL_MOVEMENTS_STALE: 5 * 60 * 1000, // 5 minutes
  HISTORICAL_LOGS_STALE: 5 * 60 * 1000, // 5 minutes
  HISTORICAL_RECEIPTS_STALE: 5 * 60 * 1000, // 5 minutes

  // Filtered lists & details
  ORDER_DETAIL_STALE: 60 * 1000, // 1 minute
  ORDER_DETAIL_GC: 15 * 60 * 1000, // 15 minutes
  INVENTORY_LOGS_STALE: 5 * 60 * 1000, // 5 minutes
  INVENTORY_MOVEMENTS_STALE: 2 * 60 * 1000, // 2 minutes

  // Realtime & Short-lived
  STOCK_SHORT_STALE: 15 * 1000, // 15 seconds for active stock checks
  AGENT_RUNS_STALE: 60 * 1000, // 1 minute
  USER_PROFILE_STALE: 5 * 60 * 1000, // 5 minutes (permissions enforced server-side)
} as const;

const PERSISTENCE_STORAGE_KEY = 'ksf_react_query_cache_v1';
const PERSISTENCE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// Allowed query keys for browser localStorage persistence
const PERSIST_ALLOWLIST_ROOTS = ['products', 'categories', 'brands', 'settings'];

// Helper to sanitize any sensitive fields before writing to persistent storage
function sanitizeDataForPersistence(key: string, data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeDataForPersistence(key, item));
  }
  if (typeof data === 'object') {
    const sanitized = { ...data };
    // Strip sensitive internal accounting & wholesale fields
    delete sanitized.importCost;
    delete sanitized.costPrice;
    delete sanitized.supplierCost;
    delete sanitized.internalNotes;
    delete sanitized.wholesalePrice;
    delete sanitized.wholesalePrice50Plus;
    return sanitized;
  }
  return data;
}

/**
 * Hydrates query cache from local storage on browser startup
 */
export function hydratePersistentQueryCache(client: QueryClient) {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem(PERSISTENCE_STORAGE_KEY);
    if (!raw) return;

    const payload = JSON.parse(raw);
    if (!payload || !payload.timestamp || !payload.queries) return;

    // Check expiration
    if (Date.now() - payload.timestamp > PERSISTENCE_MAX_AGE_MS) {
      localStorage.removeItem(PERSISTENCE_STORAGE_KEY);
      return;
    }

    // Hydrate allowed queries into React Query cache
    for (const entry of payload.queries) {
      if (entry && entry.queryKey && Array.isArray(entry.queryKey)) {
        const root = entry.queryKey[0];
        if (PERSIST_ALLOWLIST_ROOTS.includes(root)) {
          // Set query data if not already present in memory
          const existing = client.getQueryData(entry.queryKey);
          if (!existing && entry.state?.data) {
            client.setQueryData(entry.queryKey, entry.state.data);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Cache Persist] hydration failed gracefully:', err);
  }
}

/**
 * Persists allowed non-sensitive query cache entries to localStorage with debouncing
 */
let persistTimeout: any = null;

export function schedulePersistentQueryCacheSave(client: QueryClient) {
  if (typeof window === 'undefined') return;

  if (persistTimeout) {
    clearTimeout(persistTimeout);
  }

  persistTimeout = setTimeout(() => {
    try {
      const cache = client.getQueryCache();
      const queriesToPersist: any[] = [];

      for (const query of cache.getAll()) {
        const key = query.queryKey;
        if (!key || !Array.isArray(key) || key.length === 0) continue;
        const root = String(key[0]);

        if (PERSIST_ALLOWLIST_ROOTS.includes(root) && query.state.data) {
          // Exclude any detail keys that might contain specific role queries
          const sanitizedData = sanitizeDataForPersistence(root, query.state.data);
          queriesToPersist.push({
            queryKey: key,
            state: {
              data: sanitizedData,
              dataUpdatedAt: query.state.dataUpdatedAt,
            },
          });
        }
      }

      if (queriesToPersist.length > 0) {
        const payload = {
          timestamp: Date.now(),
          queries: queriesToPersist,
        };
        localStorage.setItem(PERSISTENCE_STORAGE_KEY, JSON.stringify(payload));
      }
    } catch (err) {
      // Storage quota or parsing error handled gracefully
      console.warn('[Cache Persist] save warning:', err);
    }
  }, 1000); // 1 second debounce
}
