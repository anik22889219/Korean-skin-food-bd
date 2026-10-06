import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { productService } from '../../services/productService';
import { taxonomyService } from '../../services/taxonomyService';
import { getUniqueBrandList, getBrandProductCounts } from '../../data/brands';

export interface BrandsData {
  brands: string[];
  counts: Record<string, number>;
}

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: async () => {
      const [prods, taxonomyBrands] = await Promise.all([
        productService.fetchProducts(),
        taxonomyService.fetchTaxonomies('brand').catch(() => [])
      ]);

      const baseBrands = getUniqueBrandList(prods);
      const customBrands = taxonomyBrands.filter(b => b.isActive).map(b => b.name);
      const combinedBrands = Array.from(new Set([...baseBrands, ...customBrands])).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );

      const counts = getBrandProductCounts(prods);
      return { brands: combinedBrands, counts };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    initialData: () => {
      const prods = productService.getProducts();
      return {
        brands: getUniqueBrandList(prods),
        counts: getBrandProductCounts(prods),
      };
    },
  });
}
