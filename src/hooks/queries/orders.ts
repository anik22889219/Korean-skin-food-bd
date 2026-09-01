import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Order, OrderStatus } from '../../types';
import { posService } from '../../services/posService';
import { queryKeys } from '../../lib/queryKeys';

export interface OrderFilters {
  status?: OrderStatus | 'all';
  searchQuery?: string;
  source?: 'WEBSITE' | 'POS' | 'all';
  limit?: number;
}

/**
 * useOrders - Historical order lists with 2-minute stale time and 30-minute gcTime.
 * Receives instant cache updates from the single shared Firestore listener in posService.
 */
export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: async () => {
      let orders = posService.getOrders();
      if (filters?.status && filters.status !== 'all') {
        orders = orders.filter((o) => o.status === filters.status);
      }
      if (filters?.source && filters.source !== 'all') {
        orders = orders.filter((o) => (o.order_source || (o.sessionType === 'POS' ? 'POS' : 'WEBSITE')) === filters.source);
      }
      if (filters?.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        orders = orders.filter(
          (o) =>
            o.id.toLowerCase().includes(q) ||
            (o.customerName && o.customerName.toLowerCase().includes(q)) ||
            (o.customerPhone && o.customerPhone.includes(q)) ||
            (o.courier?.consignmentId && o.courier.consignmentId.toLowerCase().includes(q))
        );
      }
      if (filters?.limit && filters.limit > 0) {
        orders = orders.slice(0, filters.limit);
      }
      return orders;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    initialData: () => {
      let orders = posService.getOrders();
      if (filters?.status && filters.status !== 'all') {
        orders = orders.filter((o) => o.status === filters.status);
      }
      if (filters?.source && filters.source !== 'all') {
        orders = orders.filter((o) => (o.order_source || (o.sessionType === 'POS' ? 'POS' : 'WEBSITE')) === filters.source);
      }
      if (filters?.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        orders = orders.filter(
          (o) =>
            o.id.toLowerCase().includes(q) ||
            (o.customerName && o.customerName.toLowerCase().includes(q)) ||
            (o.customerPhone && o.customerPhone.includes(q)) ||
            (o.courier?.consignmentId && o.courier.consignmentId.toLowerCase().includes(q))
        );
      }
      if (filters?.limit && filters.limit > 0) {
        orders = orders.slice(0, filters.limit);
      }
      return orders;
    },
  });
}

/**
 * useOrder - Individual order detail with 1-minute stale time
 */
export function useOrder(orderId?: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: async () => {
      if (!orderId) return null;
      const allOrders = posService.getOrders();
      return allOrders.find((o) => o.id === orderId || o.id.toLowerCase() === orderId.toLowerCase()) || null;
    },
    enabled: Boolean(orderId),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 15 * 60 * 1000,
    initialData: () => {
      if (!orderId) return undefined;
      // Search in all cached orders list first
      const allOrders = queryClient.getQueryData<Order[]>(queryKeys.orders.all) || posService.getOrders();
      return allOrders.find((o) => o.id === orderId || o.id.toLowerCase() === orderId.toLowerCase());
    },
  });
}

/**
 * useDraftOrders - Draft lead orders generated from WhatsApp chatbot / lead forms
 */
export function useDraftOrders() {
  return useQuery({
    queryKey: queryKeys.orders.drafts(),
    queryFn: async () => {
      return posService.getDraftOrders();
    },
    staleTime: 60 * 1000,
    gcTime: 15 * 60 * 1000,
    initialData: () => posService.getDraftOrders(),
  });
}

/**
 * Order mutations for status updates, fulfillment, cancellation and safe cache invalidation
 */
export function useOrderMutations() {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: Order['status'] }) => {
      return posService.updateOrderStatus(orderId, status);
    },
    onSuccess: (updatedOrder, variables) => {
      if (updatedOrder) {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
      }
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async ({
      orderId,
      reason,
      staffName,
    }: {
      orderId: string;
      reason?: string;
      staffName?: string;
    }) => {
      return posService.cancelOrder(orderId, reason, staffName);
    },
    onSuccess: (res, variables) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      }
    },
  });

  const fulfillOrderMutation = useMutation({
    mutationFn: async ({ orderId, staffName }: { orderId: string; staffName?: string }) => {
      return posService.confirmOrderFulfillment(orderId, staffName);
    },
    onSuccess: (res, variables) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      }
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (order: Omit<Order, 'id' | 'createdAt' | 'status' | 'isPaid' | 'sessionType' | 'order_source' | 'stock_deducted'>) => {
      return posService.createOnlineOrder(order);
    },
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  return {
    updateOrderStatus: updateStatusMutation.mutateAsync,
    cancelOrder: cancelOrderMutation.mutateAsync,
    fulfillOrder: fulfillOrderMutation.mutateAsync,
    createOrder: createOrderMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
    isCancelling: cancelOrderMutation.isPending,
    isFulfilling: fulfillOrderMutation.isPending,
    isCreating: createOrderMutation.isPending,
  };
}
