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

/**
 * useStockMovements - Cached stock movements with 2-minute stale time
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
