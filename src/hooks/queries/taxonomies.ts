import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { taxonomyService } from '../../services/taxonomyService';
import { TaxonomyItem, TaxonomyDimensionType } from '../../types';

export function useTaxonomies(type?: TaxonomyDimensionType) {
  return useQuery({
    queryKey: queryKeys.taxonomies.byType(type),
    queryFn: async () => {
      return taxonomyService.fetchTaxonomies(type);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    initialData: () => {
      return taxonomyService.getTaxonomiesSync(type);
    },
  });
}

export function useAllTaxonomies() {
  return useQuery({
    queryKey: queryKeys.taxonomies.all,
    queryFn: async () => {
      return taxonomyService.fetchTaxonomies();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    initialData: () => {
      return taxonomyService.getTaxonomiesSync();
    },
  });
}

export function useCreateTaxonomyItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemData: Omit<TaxonomyItem, 'id' | 'createdAt' | 'updatedAt'>) => {
      return taxonomyService.createTaxonomyItem(itemData);
    },
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taxonomies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.taxonomies.byType(newItem.type) });
      if (newItem.type === 'brand') {
        queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      } else if (newItem.type === 'category') {
        queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      }
    },
  });
}

export function useUpdateTaxonomyItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TaxonomyItem> }) => {
      return taxonomyService.updateTaxonomyItem(id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taxonomies.all });
      if (variables.updates.type) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taxonomies.byType(variables.updates.type) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useDeleteTaxonomyItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, type }: { id: string; type?: TaxonomyDimensionType }) => {
      await taxonomyService.deleteTaxonomyItem(id);
      return { id, type };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taxonomies.all });
      if (result.type) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taxonomies.byType(result.type) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useReorderTaxonomies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      return taxonomyService.reorderTaxonomies(orderedIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taxonomies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useSeedDefaultTaxonomies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return taxonomyService.seedDefaultTaxonomies();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taxonomies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useBatchAssignTaxonomyToProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dimensionType,
      taxonomyName,
      productIds,
    }: {
      dimensionType: TaxonomyDimensionType;
      taxonomyName: string;
      productIds: string[];
    }) => {
      return taxonomyService.batchAssignTaxonomyToProducts(dimensionType, taxonomyName, productIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.taxonomies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useBatchUnassignTaxonomyFromProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dimensionType,
      taxonomyName,
      productIds,
    }: {
      dimensionType: TaxonomyDimensionType;
      taxonomyName: string;
      productIds: string[];
    }) => {
      return taxonomyService.batchUnassignTaxonomyFromProducts(dimensionType, taxonomyName, productIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.taxonomies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

