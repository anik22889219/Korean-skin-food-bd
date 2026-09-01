import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { productService } from '../../services/productService';
import { getUniqueBrandList, getBrandProductCounts } from '../../data/brands';

export interface BrandsData {
  brands: string[];
  counts: Record<string, number>;
}

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: async () => {
      const prods = await productService.fetchProducts();
      const brands = getUniqueBrandList(prods);
      const counts = getBrandProductCounts(prods);
      return { brands, counts };
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 60 minutes
    initialData: () => {
      const prods = productService.getProducts();
      return {
        brands: getUniqueBrandList(prods),
        counts: getBrandProductCounts(prods),
      };
    },
  });
}
