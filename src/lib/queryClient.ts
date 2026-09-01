import { QueryClient } from '@tanstack/react-query';
import { hydratePersistentQueryCache, schedulePersistentQueryCacheSave, CACHE_TTL } from './cacheConfig';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_TTL.PRODUCTS_STALE, // 5 minutes default
      gcTime: CACHE_TTL.PRODUCTS_GC, // 30 minutes garbage collection time
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
    },
  },
});

// Hydrate persisted non-sensitive cache on initial script execution
if (typeof window !== 'undefined') {
  hydratePersistentQueryCache(queryClient);

  // Subscribe to query cache changes to schedule debounced persistence for allowlisted roots
  queryClient.getQueryCache().subscribe((event) => {
    if (event?.type === 'updated' && event.action?.type === 'success') {
      schedulePersistentQueryCacheSave(queryClient);
    }
  });
}
