import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryLog, StockMovement, StockReceipt } from '../../types';
import { productService } from '../../services/productService';
import { queryKeys } from '../../lib/queryKeys';

export interface StockMovementFilters {
  productId?: string;
  type?: 'restock' | 'sale' | 'adjustment' | 'return';
  source?: 'MANUAL' | 'POS' | 'ORDER_FULFILLMENT' | 'RETURN';
  limit?: number;
}

export interface HistoricalStockMovementOptions {
  productId?: string;
  type?: string;
  source?: string;
  limitCount?: number;
  startDate?: string;
  endDate?: string;
}

export interface HistoricalInventoryLogOptions {
  productId?: string;
  limitCount?: number;
  startDate?: string;
  endDate?: string;
}

export interface HistoricalStockReceiptOptions {
  supplier?: string;
  limitCount?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * useRecentStockMovements - Realtime 200-item listener window for stock movements.
 */
export function useRecentStockMovements(filters?: StockMovementFilters) {
  return useQuery<StockMovement[]>({
    queryKey: queryKeys.inventory.movementsRecent(filters),
    queryFn: async () => {
      let movements = productService.getStockMovements();
      if (filters?.productId) {
        movements = movements.filter((m) => m.productId === filters.productId);
      }
      if (filters?.type) {
        movements = movements.filter((m) => m.type === filters.type);
      }
      if (filters?.source) {
        movements = movements.filter((m) => m.source === filters.source);
      }
      if (filters?.limit && filters.limit > 0) {
        movements = movements.slice(0, filters.limit);
      }
      return movements;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 15 * 60 * 1000,
    initialData: () => {
      let movements = productService.getStockMovements();
      if (filters?.productId) {
        movements = movements.filter((m) => m.productId === filters.productId);
      }
      if (filters?.type) {
        movements = movements.filter((m) => m.type === filters.type);
      }
      if (filters?.source) {
        movements = movements.filter((m) => m.source === filters.source);
      }
      if (filters?.limit && filters.limit > 0) {
        movements = movements.slice(0, filters.limit);
      }
      return movements;
    },
  });
}

/**
 * useHistoricalStockMovements / usePaginatedStockMovements - Queries historical records beyond the 200-item window.
 * Uses isolated cache keys (queryKeys.inventory.movementsPaginated) to prevent cache corruption with the realtime window.
 */
export function useHistoricalStockMovements(options?: HistoricalStockMovementOptions) {
  return useQuery<StockMovement[]>({
    queryKey: queryKeys.inventory.movementsPaginated(options),
    queryFn: async () => {
      return productService.fetchHistoricalStockMovements(options);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 60 * 60 * 1000, // 60 minutes
  });
}

export const usePaginatedStockMovements = useHistoricalStockMovements;

/**
 * useStockMovements - Filtered stock movements query
 */
export function useStockMovements(filters?: StockMovementFilters) {
  return useQuery({
    queryKey: queryKeys.inventory.movements(filters),
    queryFn: async () => {
      let movements = productService.getStockMovements();
      if (filters?.productId) {
        movements = movements.filter((m) => m.productId === filters.productId);
      }
      if (filters?.type) {
        movements = movements.filter((m) => m.type === filters.type);
      }
      if (filters?.source) {
        movements = movements.filter((m) => m.source === filters.source);
      }
      if (filters?.limit && filters.limit > 0) {
        movements = movements.slice(0, filters.limit);
      }
      return movements;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    initialData: () => {
      let movements = productService.getStockMovements();
      if (filters?.productId) {
        movements = movements.filter((m) => m.productId === filters.productId);
      }
      if (filters?.type) {
        movements = movements.filter((m) => m.type === filters.type);
      }
      if (filters?.source) {
        movements = movements.filter((m) => m.source === filters.source);
      }
      if (filters?.limit && filters.limit > 0) {
        movements = movements.slice(0, filters.limit);
      }
      return movements;
    },
  });
}

/**
 * useRecentInventoryLogs - Realtime 200-item listener window for inventory logs
 */
export function useRecentInventoryLogs(productId?: string) {
  return useQuery<InventoryLog[]>({
    queryKey: queryKeys.inventory.logsRecent(productId),
    queryFn: async () => {
      const logs = productService.getInventoryLogs();
      if (productId) {
        return logs.filter((log) => log.productId === productId);
      }
      return logs;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 15 * 60 * 1000,
    initialData: () => {
      const logs = productService.getInventoryLogs();
      if (productId) {
        return logs.filter((log) => log.productId === productId);
      }
      return logs;
    },
  });
}

/**
 * useHistoricalInventoryLogs / usePaginatedInventoryLogs - Historical logs queried independently from the realtime window
 */
export function useHistoricalInventoryLogs(options?: HistoricalInventoryLogOptions) {
  return useQuery<InventoryLog[]>({
    queryKey: queryKeys.inventory.logsPaginated(options),
    queryFn: async () => {
      return productService.fetchHistoricalInventoryLogs(options);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 60 * 60 * 1000,
  });
}

export const usePaginatedInventoryLogs = useHistoricalInventoryLogs;

/**
 * useInventoryLogs - Cached audit logs for inventory with 5-minute stale time
 */
export function useInventoryLogs(productId?: string) {
  return useQuery({
    queryKey: queryKeys.inventory.logs(productId),
    queryFn: async () => {
      const logs = productService.getInventoryLogs();
      if (productId) {
        return logs.filter((log) => log.productId === productId);
      }
      return logs;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    initialData: () => {
      const logs = productService.getInventoryLogs();
      if (productId) {
        return logs.filter((log) => log.productId === productId);
      }
      return logs;
    },
  });
}

/**
 * useRecentStockReceipts - Realtime 200-item listener window for stock receipts
 */
export function useRecentStockReceipts() {
  return useQuery<StockReceipt[]>({
    queryKey: queryKeys.inventory.receiptsRecent(),
    queryFn: async () => {
      return productService.getStockReceipts();
    },
    staleTime: 30 * 1000,
    gcTime: 15 * 60 * 1000,
    initialData: () => productService.getStockReceipts(),
  });
}

/**
 * useHistoricalStockReceipts / usePaginatedStockReceipts - Historical receipts queried without corrupting the realtime cache
 */
export function useHistoricalStockReceipts(options?: HistoricalStockReceiptOptions) {
  return useQuery<StockReceipt[]>({
    queryKey: queryKeys.inventory.receiptsPaginated(options),
    queryFn: async () => {
      return productService.fetchHistoricalStockReceipts(options);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export const usePaginatedStockReceipts = useHistoricalStockReceipts;

/**
 * useStockReceipts - Cached supplier batch receipts with 5-minute stale time
 */
export function useStockReceipts() {
  return useQuery({
    queryKey: queryKeys.inventory.receipts(),
    queryFn: async () => {
      return productService.getStockReceipts();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    initialData: () => productService.getStockReceipts(),
  });
}

/**
 * useProductStock - Short-lived cache for fast stock checks (15s staleTime)
 */
export function useProductStock(productId?: string) {
  return useQuery({
    queryKey: queryKeys.inventory.stock(productId),
    queryFn: async () => {
      if (!productId) return null;
      const product = await productService.fetchProductById(productId);
      return product ? product.stock : 0;
    },
    enabled: Boolean(productId),
    staleTime: 15 * 1000, // 15 seconds short-lived for active stock checks
    gcTime: 5 * 60 * 1000,
    initialData: () => {
      if (!productId) return undefined;
      const prod = productService.getProductById(productId);
      return prod ? prod.stock : undefined;
    },
  });
}

/**
 * Inventory mutation hooks ensuring precise cache invalidation across products & movements
 */
export function useInventoryMutations() {
  const queryClient = useQueryClient();

  const restockMutation = useMutation({
    mutationFn: async ({
      productId,
      quantity,
      reason,
      performedBy,
    }: {
      productId: string;
      quantity: number;
      reason?: string;
      performedBy?: string;
    }) => {
      return productService.restockProduct(productId, quantity, reason, performedBy);
    },
    onSuccess: (res, variables) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.productId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      }
    },
  });

  const batchStockInMutation = useMutation({
    mutationFn: async (payload: {
      items: { productId: string; quantity: number; importCost?: number }[];
      supplier?: string;
      batchNumber?: string;
      notes?: string;
      receivedBy: string;
      receiptId?: string;
    }) => {
      return productService.processStockInBatch(payload);
    },
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      }
    },
  });

  return {
    restockProduct: restockMutation.mutateAsync,
    processStockInBatch: batchStockInMutation.mutateAsync,
    isRestocking: restockMutation.isPending,
    isProcessingBatch: batchStockInMutation.isPending,
  };
}

