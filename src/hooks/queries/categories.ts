import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { productService } from '../../services/productService';

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
      const prods = await productService.fetchProducts();
      const productCategories = Array.from(new Set(prods.map((p) => p.category).filter(Boolean)));
      
      const customOnes = productCategories.filter(
        (c) => !CANONICAL_CATEGORIES.includes(c as any)
      );

      return ['All', ...CANONICAL_CATEGORIES.filter((c) => c !== 'All'), ...customOnes];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 60 minutes
    initialData: () => Array.from(CANONICAL_CATEGORIES),
  });
}
