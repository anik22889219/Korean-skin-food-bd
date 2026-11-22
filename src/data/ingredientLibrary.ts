import { Product } from '../types';

export interface IngredientGuideEntry {
  slug: string;
  name: string;
  koreanName?: string;
  shortRole: string;
  summary: string;
  bestForSkinTypes: string[];
  pairsWellWith: string[];
  layeringCautions: string[];
  matchKeywords: string[];
}

export const INGREDIENT_LIBRARY: IngredientGuideEntry[] = [
  {
    slug: 'centella-asiatica',
    name: 'Centella Asiatica (Cica)',
    koreanName: '병풀추출물',
    shortRole: 'Calming botanical extract for redness and sensitized skin',
    summary:
      'Centella Asiatica (also labeled Madecassoside, Asiaticoside, or Cica) is widely used in Korean toners, serums, and soothing creams to calm visible redness and support a comfortable skin barrier in humid weather.',
    bestForSkinTypes: ['Sensitive', 'Acne-Prone', 'Oily', 'Combination', 'Normal'],
    pairsWellWith: ['Panthenol', 'Hyaluronic Acid', 'Ceramides', 'Niacinamide'],
    layeringCautions: ['Gentle for daily AM and PM use across most routines. Always patch test new botanical extracts on the jawline first.'],
    matchKeywords: ['centella', 'cica', 'madecassoside', 'asiaticoside', 'asiatic acid'],
  },
  {
    slug: 'niacinamide',
    name: 'Niacinamide (Vitamin B3)',
    koreanName: '나이아신아마이드',
    shortRole: 'Multi-tasking barrier support, tone balancing, and oil regulation',
    summary:
      'Niacinamide is a water-soluble form of Vitamin B3 featured in Korean essences and brightening serums to help balance excess sebum, support uneven tone, and strengthen moisture retention.',
    bestForSkinTypes: ['Oily', 'Combination', 'Blemish-Prone', 'Dull', 'Normal'],
    pairsWellWith: ['Centella Asiatica', 'Hyaluronic Acid', 'Zinc PCA', 'Rice Extract'],
    layeringCautions: ['Concentrations between 2% and 5% suit daily layering well. High-strength (10%+) serums may feel tingling on sensitized skin if combined with strong acids in the same routine.'],
    matchKeywords: ['niacinamide', 'vitamin b3'],
  },
  {
    slug: 'snail-mucin',
    name: 'Snail Secretion Filtrate (Snail Mucin)',
    koreanName: '달팽이점액여과물',
    shortRole: 'Hydrating glycoprotein humectant for bounce and barrier comfort',
    summary:
      'Purified snail secretion filtrate is a hallmark Korean skincare essence ingredient valued for lightweight slip, multi-hour hydration, and helping dry or post-blemish skin feel smoother.',
    bestForSkinTypes: ['Dry', 'Dehydrated', 'Combination', 'Sensitive', 'Normal'],
    pairsWellWith: ['Panthenol', 'Hyaluronic Acid', 'Centella Asiatica', 'Ceramides'],
    layeringCautions: ['Individuals with dust-mite or shellfish sensitivities occasionally react to mucin; perform a 24-hour inner-arm or jawline patch test before full application.'],
    matchKeywords: ['snail', 'mucin', 'snail secretion'],
  },
  {
    slug: 'hyaluronic-acid',
    name: 'Hyaluronic Acid & Sodium Hyaluronate',
    koreanName: '히알루론산',
    shortRole: 'Water-binding humectant for lightweight plumping hydration',
    summary:
      'Multi-molecular hyaluronic acid draws surface moisture into the upper layers of the skin without heavy oils, making it ideal for hydrating toners and gel creams in Bangladesh humidity.',
    bestForSkinTypes: ['All Skin Types', 'Dehydrated', 'Dry', 'Oily', 'Sensitive'],
    pairsWellWith: ['Ceramides', 'Panthenol', 'Niacinamide', 'Centella Asiatica'],
    layeringCautions: ['Apply onto slightly damp skin and seal with a light moisturizer or sunscreen so hydration stays locked in.'],
    matchKeywords: ['hyaluronic', 'hyaluronate'],
  },
  {
    slug: 'salicylic-acid',
    name: 'Salicylic Acid (BHA)',
    koreanName: '살리실릭애씨드',
    shortRole: 'Oil-soluble exfoliant for congested pores and blackheads',
    summary:
      'Beta-hydroxy acid (BHA) dissolves inside oil-rich pores to loosen dead skin buildup and excess sebum, commonly formulated into Korean low-pH cleansers, toner pads, and spot care.',
    bestForSkinTypes: ['Oily', 'Acne-Prone', 'Combination', 'Congested Pores'],
    pairsWellWith: ['Centella Asiatica', 'Panthenol', 'Tea Tree'],
    layeringCautions: ['Avoid layering leave-on BHA in the exact same AM/PM step with Retinol, Retinal, AHA exfoliants, or high-strength Vitamin C. Start 2–3 nights per week and wear SPF daily.'],
    matchKeywords: ['salicylic', 'bha', 'betaine salicylate'],
  },
  {
    slug: 'rice-extract',
    name: 'Rice Extract & Rice Ferment',
    koreanName: '쌀추출물',
    shortRole: 'Traditional Korean brightening & softening grain extract',
    summary:
      'Oryza Sativa (Rice) extract and fermented rice bran water deliver gentle amino acids and soothing hydration found in iconic Korean sunscreens, wash-off masks, and milky toners.',
    bestForSkinTypes: ['Dry', 'Dull', 'Normal', 'Combination', 'Sensitive'],
    pairsWellWith: ['Niacinamide', 'Probiotics', 'Hyaluronic Acid', 'Ceramides'],
    layeringCautions: ['Very gentle for both morning and evening layering alongside active serums and SPF.'],
    matchKeywords: ['rice', 'oryza'],
  },
  {
    slug: 'panthenol',
    name: 'Panthenol (Pro-Vitamin B5)',
    koreanName: '판테놀',
    shortRole: 'Soothing humectant and moisture-barrier cushion',
    summary:
      'Panthenol converts to Vitamin B5 on the skin, attracting moisture and reducing feelings of tightness or dryness after cleansing or exfoliating.',
    bestForSkinTypes: ['Sensitive', 'Dry', 'Dehydrated', 'Acne-Prone', 'All Skin Types'],
    pairsWellWith: ['Centella Asiatica', 'Ceramides', 'Snail Mucin', 'BHA'],
    layeringCautions: ['Non-irritating supportive ingredient suitable for buffering stronger actives at night.'],
    matchKeywords: ['panthenol', 'b5', 'provitamin b5'],
  },
  {
    slug: 'ceramide',
    name: 'Ceramides (NP / EOP / AP)',
    koreanName: '세라마이드',
    shortRole: 'Skin-identical lipids that seal hydration and reinforce barrier',
    summary:
      'Ceramides form the mortar between outer skin cells. Korean barrier creams use multi-ceramide blends with cholesterol and fatty acids to replenish stripped or air-conditioned skin.',
    bestForSkinTypes: ['Dry', 'Sensitive', 'Dehydrated', 'Barrier-Damaged'],
    pairsWellWith: ['Panthenol', 'Hyaluronic Acid', 'Retinol', 'Centella Asiatica'],
    layeringCautions: ['Safe morning and night; especially helpful on recovery nights when pausing exfoliants or retinoids.'],
    matchKeywords: ['ceramide'],
  },
  {
    slug: 'retinol',
    name: 'Retinol & Retinaldehyde',
    koreanName: '레티놀',
    shortRole: 'Vitamin A derivative for smoother texture and evening renewal',
    summary:
      'Encapsulated Korean retinol and retinaldehyde formulas support smoother-looking skin texture and refined pores when introduced gradually at night.',
    bestForSkinTypes: ['Oily', 'Combination', 'Normal', 'Mature'],
    pairsWellWith: ['Ceramides', 'Panthenol', 'Hyaluronic Acid', 'Peptides'],
    layeringCautions: ['Use at PM only, start 1–2 nights per week, and avoid pairing in the same routine with AHA, BHA, Benzoyl Peroxide, or high-strength L-Ascorbic Acid. Always use broad-spectrum SPF during the day.'],
    matchKeywords: ['retinol', 'retinal', 'bakuchiol', 'retinoid'],
  },
  {
    slug: 'vitamin-c',
    name: 'Vitamin C & Derivatives',
    koreanName: '비타민C',
    shortRole: 'Antioxidant support for brighter tone and morning UV defense',
    summary:
      'L-Ascorbic acid and gentler derivatives (Sodium Ascorbyl Phosphate, 3-O-Ethyl Ascorbic Acid) help visibly brighten dull skin and complement daily sunscreen.',
    bestForSkinTypes: ['Dull', 'Normal', 'Combination', 'Hyperpigmented'],
    pairsWellWith: ['Sunscreen', 'Vitamin E', 'Ferulic Acid', 'Hyaluronic Acid'],
    layeringCautions: ['Pure L-Ascorbic Acid at low pH should not be stacked in the same slot as Retinol or strong AHA/BHA exfoliants to minimize stinging.'],
    matchKeywords: ['vitamin c', 'ascorbic', 'ascorbyl', 'yuzu', 'yuja', 'glutathione'],
  },
  {
    slug: 'propolis',
    name: 'Propolis & Royal Jelly Extract',
    koreanName: '프로폴리스',
    shortRole: 'Resinous bee-derived antioxidant & nourishing glow ingredient',
    summary:
      'Propolis extract is prized in Korean ampoules and toners for nourishing fatigued skin, calming minor blemishes, and imparting a dewy glow.',
    bestForSkinTypes: ['Dry', 'Dull', 'Combination', 'Blemish-Prone'],
    pairsWellWith: ['Niacinamide', 'Centella Asiatica', 'Hyaluronic Acid'],
    layeringCautions: ['Patch test before use if you have known sensitivities to bee-derived cosmetic products.'],
    matchKeywords: ['propolis', 'honey', 'royal jelly'],
  },
  {
    slug: 'mugwort',
    name: 'Mugwort (Artemisia) & Heartleaf',
    koreanName: '쑥 / 어성초',
    shortRole: 'Traditional Korean soothing herbs for redness and heated skin',
    summary:
      'Artemisia (Mugwort) and Houttuynia Cordata (Heartleaf) are signature Korean soothing botanicals used in calming essences and toner pads to cool flushed, acne-prone skin.',
    bestForSkinTypes: ['Sensitive', 'Oily', 'Acne-Prone', 'Redness-Prone'],
    pairsWellWith: ['Centella Asiatica', 'Panthenol', 'Tea Tree', 'Hyaluronic Acid'],
    layeringCautions: ['Gentle daily hydrator; can be layered cleanly under calming creams and sunscreens.'],
    matchKeywords: ['mugwort', 'artemisia', 'heartleaf', 'houttuynia', 'dokdo'],
  },
];

export function findIngredientBySlug(slug?: string): IngredientGuideEntry | undefined {
  if (!slug) return undefined;
  const clean = slug.toLowerCase().trim();
  return INGREDIENT_LIBRARY.find((item) => item.slug === clean);
}

export function findIngredientSlug(ingredientName: string): string | null {
  const lower = ingredientName.toLowerCase().trim();
  if (!lower) return null;
  for (const item of INGREDIENT_LIBRARY) {
    if (
      item.slug === lower ||
      item.name.toLowerCase().includes(lower) ||
      item.matchKeywords.some((kw) => lower.includes(kw))
    ) {
      return item.slug;
    }
  }
  return null;
}

export function matchesIngredient(product: Product, ingredient: IngredientGuideEntry): boolean {
  const haystack = [
    ...(Array.isArray(product.keyIngredients) ? product.keyIngredients : []),
    product.name || '',
    product.description || '',
    ...(Array.isArray(product.benefits) ? product.benefits : []),
  ]
    .join(' ')
    .toLowerCase();

  return ingredient.matchKeywords.some((kw) => haystack.includes(kw));
}
