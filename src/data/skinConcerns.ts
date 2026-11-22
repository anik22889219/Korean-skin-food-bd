import { Product } from '../types';

export interface SkinConcernEntry {
  slug: string;
  title: string;
  titleBN: string;
  summary: string;
  keyFocusIngredients: string[];
  routineTips: string[];
  matchKeywords: string[];
}

export const SKIN_CONCERN_LIBRARY: SkinConcernEntry[] = [
  {
    slug: 'acne-blemishes',
    title: 'Acne, Breakouts & Clogged Pores',
    titleBN: 'ব্রণ ও পোরস ক্লগিং',
    summary:
      'Bangladesh heat and humidity increase sweat and sebum buildup. Gentle pH-balanced cleansing, occasional BHA exfoliation, and non-comedogenic calming layers help keep pores clearer without stripping the barrier.',
    keyFocusIngredients: ['Salicylic Acid (BHA)', 'Heartleaf', 'Centella Asiatica', 'Niacinamide'],
    routineTips: [
      'Cleanse gently morning and night with a low-pH gel cleanser rather than harsh scrubs.',
      'Introduce Salicylic Acid (BHA) 2–3 nights per week and pair with a calming essence or light gel cream.',
      'Always remove water-resistant sunscreen thoroughly at night.',
    ],
    matchKeywords: ['acne', 'blemish', 'pimple', 'pore', 'oil', 'sebum', 'blackhead', 'breakout'],
  },
  {
    slug: 'dark-spots-hyperpigmentation',
    title: 'Dark Spots & Uneven Tone',
    titleBN: 'দাগ ও অসম ত্বকের রঙ',
    summary:
      'Post-blemish marks and sun-induced dark spots fade gradually when consistent broad-spectrum UV protection is combined with brightening humectants like Niacinamide, Rice Extract, Alpha-Arbutin, or gentle Vitamin C.',
    keyFocusIngredients: ['Niacinamide', 'Rice Extract', 'Vitamin C', 'Tranexamic Acid'],
    routineTips: [
      'Daily SPF 50+ PA++++ reapplication is essential because UV rays darken existing spots.',
      'Layer a gentle brightening serum (Niacinamide or Rice) under sunscreen in the morning.',
      'Avoid picking active blemishes to reduce new post-inflammatory marks.',
    ],
    matchKeywords: ['dark spot', 'hyperpigmentation', 'pigment', 'bright', 'glow', 'tone', 'mark', 'melasma'],
  },
  {
    slug: 'dehydrated-dry-skin',
    title: 'Dehydration & Tightness',
    titleBN: 'শুষ্কতা ও আর্দ্রতার অভাব',
    summary:
      'Even oily skin can feel dehydrated under air conditioning or after strong cleansers. Layering humectant toners and snail or hyaluronic essences before sealing with a ceramide moisturizer restores supple bounce.',
    keyFocusIngredients: ['Hyaluronic Acid', 'Snail Mucin', 'Panthenol', 'Ceramides'],
    routineTips: [
      'Apply hydrating toner or snail essence directly onto damp skin within 60 seconds of washing.',
      'Seal hydration with an emollient or ceramide cream at night.',
      'Skip alcohol-heavy astringent toners.',
    ],
    matchKeywords: ['dehydrat', 'dry', 'flak', 'tight', 'hydrat', 'moisture', 'plump'],
  },
  {
    slug: 'damaged-skin-barrier',
    title: 'Sensitized & Compromised Barrier',
    titleBN: 'সেন্সিটিভ ও ড্যামেজড স্কিন ব্যারিয়ার',
    summary:
      'Over-exfoliating or stacking too many actives at once often causes stinging, redness, and sudden texture. Simplify to a mild cleanser, Cica/Panthenol serum, ceramide cream, and mineral or gentle sunscreen.',
    keyFocusIngredients: ['Centella Asiatica', 'Panthenol', 'Ceramides', 'Mugwort'],
    routineTips: [
      'Pause AHA, BHA, Vitamin C, and Retinoids for 1–2 weeks until stinging subsides.',
      'Stick to fragrance-light soothing hydration and barrier lipids.',
      'Perform a 24-hour patch test before re-introducing active ingredients one at a time.',
    ],
    matchKeywords: ['barrier', 'sensitiv', 'redness', 'irritat', 'sooth', 'calm', 'cica'],
  },
  {
    slug: 'oily-enlarged-pores',
    title: 'Excess Shine & Visible Pores',
    titleBN: 'অতিরিক্ত তৈলাক্তভাব ও পোরস',
    summary:
      'Balanced hydration and lightweight oil-control serums help reduce midday shine without leaving the skin feeling tight or greasy in tropical humidity.',
    keyFocusIngredients: ['Niacinamide', 'Heartleaf', 'Green Tea', 'Salicylic Acid (BHA)'],
    routineTips: [
      'Swap heavy creams for oil-free gel moisturizers or watery soothing emulsions during daytime.',
      'Use Niacinamide (2–5%) consistently for balanced sebum appearance.',
      'Choose fluid or water-fit Korean sunscreens with minimal white cast.',
    ],
    matchKeywords: ['oily', 'sebum', 'pore', 'shine', 'matte', 'combination', 'congest'],
  },
  {
    slug: 'sun-protection-uv',
    title: 'Daily Sun Protection (UV Defense)',
    titleBN: 'রোদ ও ইউভি সুরক্ষা',
    summary:
      'Korean sunscreens are formulated for breathable daily wear without heavy grease or chalkiness, helping shield skin against UVA/UVB exposure in Bangladesh.',
    keyFocusIngredients: ['Rice Extract', 'Centella Asiatica', 'Hyaluronic Acid', 'UV Filters'],
    routineTips: [
      'Apply roughly two finger-lengths across face and neck 15 minutes before stepping outdoors.',
      'Reapply every 2–3 hours when spending extended time outside or near bright windows.',
      'Use a gel cleanser or oil cleanser at night to wash sunscreen away cleanly.',
    ],
    matchKeywords: ['sun', 'spf', 'uv', 'sunscreen', 'sunblock', 'pa++++'],
  },
];

export function findConcernBySlug(slug?: string): SkinConcernEntry | undefined {
  if (!slug) return undefined;
  const clean = slug.toLowerCase().trim();
  return SKIN_CONCERN_LIBRARY.find((item) => item.slug === clean);
}

export function findConcernSlug(concernName: string): string | null {
  const lower = concernName.toLowerCase().trim();
  if (!lower) return null;
  for (const item of SKIN_CONCERN_LIBRARY) {
    if (
      item.slug === lower ||
      item.title.toLowerCase().includes(lower) ||
      item.matchKeywords.some((kw) => lower.includes(kw))
    ) {
      return item.slug;
    }
  }
  return null;
}

export function matchesConcern(product: Product, concern: SkinConcernEntry): boolean {
  const haystack = [
    ...(Array.isArray(product.concerns) ? product.concerns : []),
    ...(Array.isArray(product.benefits) ? product.benefits : []),
    product.category || '',
    product.name || '',
    product.description || '',
  ]
    .join(' ')
    .toLowerCase();

  return concern.matchKeywords.some((kw) => haystack.includes(kw));
}
