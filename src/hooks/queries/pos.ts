import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product } from '../../types';
import { productService } from '../../services/productService';
import { posService, PosCheckoutParams, PosCheckoutResult, isAllowedPosRole } from '../../services/posService';
import { findProductByScannedCode } from '../../utils/barcode';
import { queryKeys } from '../../lib/queryKeys';

export interface PosCatalogItem {
  id: string;
  name: string;
  nameBN?: string;
  price: number;
  wholesalePrice?: number;
  wholesalePrice50Plus?: number;
  stock: number;
  category: string;
  brand: string;
  barcode?: string;
  barcodeNormalized?: string;
  image: string;
}

/**
 * usePosCatalog - Optimized, secure catalog for POS terminals.
 * Automatically masks sensitive wholesale pricing if user is not authorized.
 */
export function usePosCatalog(userRole?: string) {
  const queryClient = useQueryClient();
  const canViewWholesale = isAllowedPosRole(userRole);

  return useQuery<PosCatalogItem[]>({
    queryKey: [...queryKeys.pos.catalog(), userRole || 'guest'],
    queryFn: async () => {
      const products = await productService.fetchProducts();
      return products.map((p) => ({
        id: p.id,
        name: p.name,
        nameBN: p.nameBN,
        price: p.price,
        wholesalePrice: canViewWholesale ? p.wholesalePrice : undefined,
        wholesalePrice50Plus: canViewWholesale ? p.wholesalePrice50Plus : undefined,
        stock: p.stock,
        category: p.category,
        brand: p.brand,
        barcode: p.barcode,
        barcodeNormalized: p.barcodeNormalized,
        image: p.image,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
    initialData: () => {
      const cached = queryClient.getQueryData<Product[]>(queryKeys.products.all) || productService.getProducts();
      return cached.map((p) => ({
        id: p.id,
        name: p.name,
        nameBN: p.nameBN,
        price: p.price,
        wholesalePrice: canViewWholesale ? p.wholesalePrice : undefined,
        wholesalePrice50Plus: canViewWholesale ? p.wholesalePrice50Plus : undefined,
        stock: p.stock,
        category: p.category,
        brand: p.brand,
        barcode: p.barcode,
        barcodeNormalized: p.barcodeNormalized,
        image: p.image,
      }));
    },
  });
}

/**
 * useBarcodeLookup - Instant barcode lookup from query cache with fallback to service
 */
export function useBarcodeLookup(scannedCode?: string) {
  const queryClient = useQueryClient();

  return useQuery<{ product: Product | null; matchStrategy: string; isMatch: boolean }>({
    queryKey: queryKeys.pos.barcode(scannedCode),
    queryFn: async () => {
      if (!scannedCode || !scannedCode.trim()) {
        return { product: null, matchStrategy: 'none', isMatch: false };
      }
      const products = queryClient.getQueryData<Product[]>(queryKeys.products.all) || productService.getProducts();
      const match = findProductByScannedCode(products, scannedCode);
      if (match.product) {
        return { product: match.product, matchStrategy: match.debugInfo.matchStrategy || 'barcodeNormalized', isMatch: true };
      }
      // Direct barcode query fallback
      const directMatch = productService.getProductByBarcode(scannedCode);
      if (directMatch) {
        return { product: directMatch, matchStrategy: 'legacyBarcode', isMatch: true };
      }
      return { product: null, matchStrategy: 'none', isMatch: false };
    },
    enabled: Boolean(scannedCode && scannedCode.trim()),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    initialData: () => {
      if (!scannedCode || !scannedCode.trim()) return undefined;
      const products = queryClient.getQueryData<Product[]>(queryKeys.products.all) || productService.getProducts();
      const match = findProductByScannedCode(products, scannedCode);
      if (match.product) {
        return { product: match.product, matchStrategy: match.debugInfo.matchStrategy || 'barcodeNormalized', isMatch: true };
      }
      return undefined;
    },
  });
}

/**
 * usePosTransactionMutation - Protected authoritative POS Checkout mutation.
 * Executes server/Firestore atomic transaction and synchronizes all affected caches.
 */
export function usePosTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation<PosCheckoutResult, Error, PosCheckoutParams>({
    mutationFn: async (params: PosCheckoutParams) => {
      // Direct execution of authoritative atomic transaction (never cached calculations)
      return posService.processPosCheckout(params);
    },
    onSuccess: (result) => {
      if (result.success) {
        // Authoritative stock and order cache invalidation
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.pos.catalog() });
      }
    },
  });
}
