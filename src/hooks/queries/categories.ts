import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { productService } from '../../services/productService';
import { taxonomyService } from '../../services/taxonomyService';

export const CANONICAL_CATEGORIES = [
  'All', 
  'Cleanser', 
  'Toner', 
  'Serum & Essence', 
  'Cream & Moisturizer', 
  'Sunscreen', 
  'Lip Care', 
  'Eye Care', 
  'Mask & Pack', 
  'Exfoliator', 
  'Body & Hair Care', 
  'Oral Care', 
  'Supplements', 
  'Spot Treatment',
  'Makeup & Tone-Up'
] as const;

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async () => {
      const [prods, taxonomyCats] = await Promise.all([
        productService.fetchProducts(),
        taxonomyService.fetchTaxonomies('category').catch(() => [])
      ]);

      const productCategories = Array.from(new Set(prods.map((p) => p.category).filter(Boolean)));
      const customTaxonomyCategories = taxonomyCats.filter(c => c.isActive).map(c => c.name);

      const allMerged = Array.from(new Set([
        ...CANONICAL_CATEGORIES.filter((c) => c !== 'All'),
        ...customTaxonomyCategories,
        ...productCategories
      ]));

      return ['All', ...allMerged];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    initialData: () => Array.from(CANONICAL_CATEGORIES),
  });
}
