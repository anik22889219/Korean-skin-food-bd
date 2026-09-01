import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product } from '../../types';
import { productService } from '../../services/productService';
import { queryKeys } from '../../lib/queryKeys';

export interface ProductQueryFilters {
  category?: string;
  brand?: string;
  skinType?: string;
  concern?: string;
  search?: string;
  inStockOnly?: boolean;
}

/**
 * Filter product list in-memory based on provided filter criteria
 */
export function filterProducts(products: Product[], filters?: ProductQueryFilters): Product[] {
  if (!filters) return products;

  return products.filter((product) => {
    if (filters.category && filters.category !== 'All' && product.category !== filters.category) {
      return false;
    }
    if (filters.brand && filters.brand !== 'All' && product.brand !== filters.brand) {
      return false;
    }
    if (filters.skinType && filters.skinType !== 'All') {
      if (!product.skinTypes || !product.skinTypes.includes(filters.skinType)) {
        return false;
      }
    }
    if (filters.inStockOnly && product.stock <= 0) {
      return false;
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      const matchName = product.name?.toLowerCase().includes(q);
      const matchBN = product.nameBN?.toLowerCase().includes(q);
      const matchBrand = product.brand?.toLowerCase().includes(q);
      const matchCat = product.category?.toLowerCase().includes(q);
      const matchBarcode = product.barcode?.toLowerCase().includes(q) || product.barcodeNormalized?.toLowerCase().includes(q);
      const matchDesc = product.description?.toLowerCase().includes(q);
      if (!matchName && !matchBN && !matchBrand && !matchCat && !matchBarcode && !matchDesc) {
        return false;
      }
    }
    return true;
  });
}

/**
 * useProducts - Centralized product list query hook with request deduplication and 5-min stale cache
 */
export function useProducts(filters?: ProductQueryFilters) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: async () => {
      const allProducts = await productService.fetchProducts();
      return filterProducts(allProducts, filters);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    initialData: () => {
      const currentCache = productService.getProducts();
      if (currentCache && currentCache.length > 0) {
        return filterProducts(currentCache, filters);
      }
      return undefined;
    },
  });
}

/**
 * useProduct - Centralized single product detail query hook with request deduplication and 10-min stale cache
 */
export function useProduct(productId?: string | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.products.detail(productId || ''),
    queryFn: async () => {
      if (!productId) return null;
      return await productService.fetchProductById(productId);
    },
    enabled: Boolean(productId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    initialData: () => {
      if (!productId) return undefined;
      // 1. Check direct product in productService cache
      const local = productService.getProductById(productId);
      if (local) return local;

      // 2. Check if product exists in any cached product list query
      const cachedLists = queryClient.getQueriesData<Product[]>({ queryKey: queryKeys.products.lists() });
      for (const [, list] of cachedLists) {
        if (Array.isArray(list)) {
          const match = list.find((p) => p.id === productId);
          if (match) return match;
        }
      }
      return undefined;
    },
  });
}

/**
 * Custom hooks for product mutations with precise cache invalidation
 */
export function useProductMutations() {
  const queryClient = useQueryClient();

  const createProductMutation = useMutation({
    mutationFn: async (product: Omit<Product, 'qrCodeUrl'>) => {
      return productService.createProduct(product);
    },
    onSuccess: (newProduct) => {
      queryClient.setQueryData(queryKeys.products.detail(newProduct.id), newProduct);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (product: Product) => {
      return productService.updateProduct(product);
    },
    onSuccess: (updatedProduct) => {
      queryClient.setQueryData(queryKeys.products.detail(updatedProduct.id), updatedProduct);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      return productService.deleteProduct(productId);
    },
    onSuccess: (_, productId) => {
      queryClient.removeQueries({ queryKey: queryKeys.products.detail(productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });

  return {
    createProduct: createProductMutation.mutateAsync,
    updateProduct: updateProductMutation.mutateAsync,
    deleteProduct: deleteProductMutation.mutateAsync,
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
  };
}
