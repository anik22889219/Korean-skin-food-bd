import { Product, TaxonomyItem } from '../types';

export interface SkinConcernEntry {
  slug: string;
  title: string;
  titleBN: string;
  summary: string;
  summaryBN?: string;
  keyFocusIngredients: string[];
  routineTips: string[];
  routineTipsBN?: string[];
  matchKeywords: string[];
  image?: string;
  isFeatured?: boolean;
}

export interface SkinConcernEnrichment {
  summary?: string;
  summaryBN?: string;
  keyFocusIngredients: string[];
  routineTips: string[];
  routineTipsBN?: string[];
  matchKeywords: string[];
}

export const CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG: Record<string, SkinConcernEnrichment> = {
  'acne-blemishes': {
    summary:
      'Bangladesh heat and humidity increase sweat and sebum buildup. Gentle pH-balanced cleansing, occasional BHA exfoliation, and non-comedogenic calming layers help keep pores clearer without stripping the barrier.',
    summaryBN:
      'বাংলাদেশের গরম ও আর্দ্র আবহাওয়ায় ঘাম ও সিবাম জমে ব্রণ হতে পারে। মৃদু pH-ব্যালেন্সড ক্লিনজিং, নিয়মিত BHA ও হালকা কামিং লেয়ার পোরস পরিষ্কার রাখতে সাহায্য করে।',
    keyFocusIngredients: ['Salicylic Acid (BHA)', 'Heartleaf', 'Centella Asiatica', 'Niacinamide'],
    routineTips: [
      'Cleanse gently morning and night with a low-pH gel cleanser rather than harsh scrubs.',
      'Introduce Salicylic Acid (BHA) 2–3 nights per week and pair with a calming essence or light gel cream.',
      'Always remove water-resistant sunscreen thoroughly at night.',
    ],
    routineTipsBN: [
      'সকাল ও রাতে কড়া স্ক্রাবের বদলে লো-pH জেল ক্লিনজার দিয়ে মুখ পরিষ্কার করুন।',
      'সপ্তাহে ২–৩ রাত স্যালিসিলিক অ্যাসিড (BHA) ব্যবহার করে হালকা কামিং এসেন্স বা জেল ক্রিম লাগান।',
      'রাতে ওয়াটার-রেজিস্ট্যান্ট সানস্ক্রিন ভালোভাবে ডাবল-ক্লিনজ করে তুলে ফেলুন।',
    ],
    matchKeywords: ['acne', 'blemish', 'pimple', 'pore', 'oil', 'sebum', 'blackhead', 'breakout'],
  },
  'hyperpigmentation-dark-spots': {
    summary:
      'Post-blemish marks and sun-induced dark spots fade gradually when consistent broad-spectrum UV protection is combined with brightening humectants like Niacinamide, Rice Extract, Alpha-Arbutin, or gentle Vitamin C.',
    summaryBN:
      'ব্রণের দাগ ও রোদের কারণে হওয়া কালো ছোপ কমাতে প্রতিদিন সানস্ক্রিনের পাশাপাশি নায়াসিনামাইড, রাইস এক্সট্রাক্ট, আলফা-আরবুটিন বা মৃদু ভিটামিন সি ব্যবহার করুন।',
    keyFocusIngredients: ['Niacinamide', 'Rice Extract', 'Vitamin C', 'Tranexamic Acid'],
    routineTips: [
      'Daily SPF 50+ PA++++ reapplication is essential because UV rays darken existing spots.',
      'Layer a gentle brightening serum (Niacinamide or Rice) under sunscreen in the morning.',
      'Avoid picking active blemishes to reduce new post-inflammatory marks.',
    ],
    routineTipsBN: [
      'প্রতিদিন SPF 50+ PA++++ সানস্ক্রিন ব্যবহার ও রি-অ্যাপ্লাই করুন, কারণ UV রশ্মি দাগ আরও গাঢ় করে।',
      'সকালে সানস্ক্রিনের নিচে মৃদু ব্রাইটেনিং সিরাম (নায়াসিনামাইড বা রাইস) ব্যবহার করুন।',
      'নতুন দাগ এড়াতে ব্রণ খুঁটবেন না বা চাপ দেবেন না।',
    ],
    matchKeywords: ['dark spot', 'hyperpigmentation', 'pigment', 'bright', 'glow', 'tone', 'mark', 'melasma'],
  },
  'sun-damage-tanning': {
    summary:
      'Korean sunscreens and calming post-sun layers are formulated for breathable daily wear without heavy grease or white cast, helping shield and recover skin from intense UVA/UVB exposure in Bangladesh.',
    summaryBN:
      'হোয়াইট কাস্ট ও ভারী চিটচিটে ভাব ছাড়াই প্রতিদিন ব্যবহারের উপযোগী কোরিয়ান সানস্ক্রিন ও কামিং লেয়ার বাংলাদেশের তীব্র রোদ ও UV রশ্মি থেকে ত্বককে সুরক্ষিত রাখে।',
    keyFocusIngredients: ['Rice Extract', 'Centella Asiatica', 'Hyaluronic Acid', 'Vitamin C'],
    routineTips: [
      'Apply roughly two finger-lengths across face and neck 15 minutes before stepping outdoors.',
      'Reapply every 2–3 hours when spending extended time outside or near bright windows.',
      'Soothe post-sun skin in the evening with Centella or Panthenol hydration before sleeping.',
    ],
    routineTipsBN: [
      'বাইরে যাওয়ার ১৫ মিনিট আগে মুখ ও গলায় প্রায় দুই আঙুল পরিমাণ SPF 50+ PA++++ সানস্ক্রিন লাগান।',
      'দীর্ঘ সময় রোদে বা জানালার পাশে থাকলে প্রতি ২–৩ ঘণ্টা পর সানস্ক্রিন রি-অ্যাপ্লাই করুন।',
      'সন্ধ্যায় রোদের পর ত্বক শান্ত করতে সেন্টেলা বা প্যান্থেনল হাইড্রেশন ব্যবহার করুন।',
    ],
    matchKeywords: ['sun', 'tan', 'spf', 'uv', 'sunscreen', 'sunblock', 'pa++++', 'sunburn'],
  },
  'redness-rosacea': {
    summary:
      'Cools flushed, reactive, and easily irritated skin using gentle anti-inflammatory Korean botanicals like Heartleaf, Mugwort, and Centella Asiatica while avoiding harsh alcohols and fragrances.',
    summaryBN:
      'সংবেদনশীল ও সহজে লাল হয়ে যাওয়া ত্বককে ঠান্ডা ও প্রশমিত রাখতে হার্টলিফ, মাগওয়ার্ট ও সেন্টেলা এশিয়াটিকার মতো কোমল কোরিয়ান উপাদান ব্যবহার করুন।',
    keyFocusIngredients: ['Centella Asiatica', 'Heartleaf', 'Mugwort', 'Panthenol'],
    routineTips: [
      'Use lukewarm or cool water rather than hot water when washing your face to avoid triggering flushing.',
      'Choose fragrance-free, alcohol-free soothing toners or ampoules with Cica, Heartleaf, or Mugwort.',
      'Protect reactive skin daily with a gentle, non-stinging broad-spectrum sunscreen.',
    ],
    routineTipsBN: [
      'মুখ ধোয়ার সময় গরম পানির বদলে কুসুম বা স্বাভাবিক তাপমাত্রার পানি ব্যবহার করুন।',
      'সুগন্ধিমুক্ত ও অ্যালকোহলমুক্ত সিকা, হার্টলিফ বা মাগওয়ার্ট সমৃদ্ধ কামিং টোনার ব্যবহার করুন।',
      'সংবেদনশীল ত্বকের জন্য জ্বালাপোড়াহীন ব্রড-স্পেকট্রাম সানস্ক্রিন প্রতিদিন ব্যবহার করুন।',
    ],
    matchKeywords: ['redness', 'rosacea', 'flush', 'sooth', 'calm', 'cica', 'heartleaf', 'mugwort', 'irritat'],
  },
  'damaged-skin-barrier': {
    summary:
      'Over-exfoliating or stacking too many actives at once often causes stinging, redness, and sudden texture. Simplify to a mild cleanser, Cica/Panthenol serum, ceramide cream, and mineral or gentle sunscreen.',
    summaryBN:
      'অতিরিক্ত এক্সফোলিয়েশন বা একসাথে অনেক অ্যাক্টিভ ব্যবহারে ত্বকে জ্বালাপোড়া ও রুক্ষতা দেখা দেয়। মৃদু ক্লিনজার, সিকা/প্যান্থেনল ও সিরামাইড ক্রিম দিয়ে ব্যারিয়ার পুনরুদ্ধার করুন।',
    keyFocusIngredients: ['Centella Asiatica', 'Panthenol', 'Ceramides', 'Mugwort'],
    routineTips: [
      'Pause AHA, BHA, Vitamin C, and Retinoids for 1–2 weeks until stinging subsides.',
      'Stick to fragrance-light soothing hydration and barrier lipids.',
      'Perform a 24-hour patch test before re-introducing active ingredients one at a time.',
    ],
    routineTipsBN: [
      'জ্বালাপোড়া না কমা পর্যন্ত ১–২ সপ্তাহ AHA, BHA, ভিটামিন সি ও রেটিনয়েড বন্ধ রাখুন।',
      'সিরামাইড ও প্যান্থেনল সমৃদ্ধ মৃদু হাইড্রেশন ও ব্যারিয়ার ক্রিম ব্যবহার করুন।',
      'নতুন কোনো অ্যাক্টিভ শুরু করার আগে ২৪ ঘণ্টার প্যাচ টেস্ট করে নিন।',
    ],
    matchKeywords: ['barrier', 'sensitiv', 'redness', 'irritat', 'sooth', 'calm', 'cica', 'ceramide', 'repair'],
  },
  'fine-lines-wrinkles': {
    summary:
      'Supports skin elasticity, bounce, and smoother-looking texture using gentle encapsulated Korean Retinol/Retinal, Peptides, Snail Mucin, and consistent daily UV defense.',
    summaryBN:
      'এনক্যাপসুলেটেড কোরিয়ান রেটিনল/রেটিনাল, পেপটাইড, স্নেইল মিউসিন এবং নিয়মিত সানস্ক্রিনের মাধ্যমে ত্বকের ইলাস্টিসিটি ও মসৃণতা বজায় রাখতে সাহায্য করে।',
    keyFocusIngredients: ['Retinol & Retinal', 'Snail Mucin', 'Ceramides', 'Hyaluronic Acid'],
    routineTips: [
      'Introduce Retinol or Retinal slowly at night (1–2 evenings per week) buffered with moisturizer.',
      'Pair evening renewal actives with barrier-supporting Peptides, Snail Mucin, and Ceramides.',
      'Never skip daytime SPF 50+, as UV exposure is the primary driver of premature fine lines.',
    ],
    routineTipsBN: [
      'রাতে সপ্তাহে ১–২ দিন অল্প পরিমাণে রেটিনল বা রেটিনাল দিয়ে শুরু করুন এবং ময়েশ্চারাইজার ব্যবহার করুন।',
      'পেপটাইড, স্নেইল মিউসিন ও সিরামাইড দিয়ে ত্বকের আর্দ্রতা ও ব্যারিয়ার সুরক্ষিত রাখুন।',
      'অকাল বলিরেখা রোধে প্রতিদিন সকালে SPF 50+ সানস্ক্রিন ব্যবহার কখনো বাদ দেবেন না।',
    ],
    matchKeywords: ['wrinkle', 'fine line', 'aging', 'anti-aging', 'firm', 'elastic', 'collagen', 'retinol', 'peptide'],
  },
  'dullness-uneven-texture': {
    summary:
      'Revives tired, uneven skin tone and rough texture with Korean Rice Ferments, gentle PHA/AHA smoothing toners, Snail Mucin, and Vitamin C for healthy translucent glass skin.',
    summaryBN:
      'রাইস ফারমেন্ট, মৃদু PHA/AHA এক্সফোলিয়েন্ট, স্নেইল মিউসিন ও ভিটামিন সি-এর মাধ্যমে নিষ্প্রাণ ও খসখসে ত্বকে প্রাকৃতিক উজ্জ্বলতা ও মসৃণতা ফিরিয়ে আনে।',
    keyFocusIngredients: ['Rice Extract', 'Niacinamide', 'Vitamin C', 'Snail Mucin'],
    routineTips: [
      'Use gentle chemical exfoliation (AHA or PHA) 1–2 nights per week instead of abrasive physical scrubs.',
      'Layer hydrating fermented essences or Rice toners onto damp skin for bouncy radiance.',
      'Seal moisture daily and protect glow gains with broad-spectrum sunscreen every morning.',
    ],
    routineTipsBN: [
      'কড়া স্ক্রাবের বদলে সপ্তাহে ১–২ রাতে মৃদু AHA বা PHA এক্সফোলিয়েটর ব্যবহার করুন।',
      'ভেজা ত্বকে রাইস টোনার বা ফারমেন্টেড এসেন্স ব্যবহার করে উজ্জ্বলতা বাড়ান।',
      'ত্বকের উজ্জ্বলতা ধরে রাখতে প্রতিদিন সকালে সানস্ক্রিন ব্যবহার করুন।',
    ],
    matchKeywords: ['dull', 'texture', 'rough', 'glow', 'glass skin', 'bright', 'radiance', 'uneven', 'rice'],
  },
  'large-clogged-pores': {
    summary:
      'Balanced hydration and lightweight oil-control serums help reduce midday shine and clear congested sebum without leaving the skin feeling tight or greasy in tropical humidity.',
    summaryBN:
      'আর্দ্র আবহাওয়ায় অতিরিক্ত তেল নিয়ন্ত্রণ ও বন্ধ পোরস পরিষ্কার রাখতে হালকা হাইড্রেশন ও অয়েল-ব্যালেন্সিং সিরাম কার্যকরভাবে কাজ করে।',
    keyFocusIngredients: ['Niacinamide', 'Heartleaf', 'Salicylic Acid (BHA)', 'Centella Asiatica'],
    routineTips: [
      'Swap heavy creams for oil-free gel moisturizers or watery soothing emulsions during daytime.',
      'Use Niacinamide (2–5%) consistently for balanced sebum appearance alongside occasional BHA.',
      'Choose fluid or water-fit Korean sunscreens with minimal white cast.',
    ],
    routineTipsBN: [
      'দিনের বেলা ভারী ক্রিমের বদলে অয়েল-ফ্রি জেল ময়েশ্চারাইজার বা হালকা ইমালশন ব্যবহার করুন।',
      'সিবাম ব্যালেন্স রাখতে নিয়মিত ২–৫% নায়াসিনামাইড এবং সপ্তাহে ২–৩ দিন BHA ব্যবহার করুন।',
      'পোরস বন্ধ না করে এমন হালকা ওয়াটার-ফিট কোরিয়ান সানস্ক্রিন বেছে নিন।',
    ],
    matchKeywords: ['oily', 'sebum', 'pore', 'shine', 'matte', 'combination', 'congest', 'blackhead'],
  },
  'dryness-dehydration': {
    summary:
      'Even oily skin can feel dehydrated under air conditioning or after strong cleansers. Layering humectant toners and snail or hyaluronic essences before sealing with a ceramide moisturizer restores supple bounce.',
    summaryBN:
      'এসি রুম বা কড়া ক্লিনজারের কারণে ত্বক পানিশূন্য ও টানটান হয়ে যেতে পারে। হায়ালুরনিক এসিড, স্নেইল মিউসিন ও সিরামাইড ক্রিমের লেয়ারিং ত্বকের আর্দ্রতা পুনরুদ্ধার করে।',
    keyFocusIngredients: ['Hyaluronic Acid', 'Snail Mucin', 'Panthenol', 'Ceramides'],
    routineTips: [
      'Apply hydrating toner or snail essence directly onto damp skin within 60 seconds of washing.',
      'Seal hydration with an emollient or ceramide cream at night.',
      'Skip alcohol-heavy astringent toners.',
    ],
    routineTipsBN: [
      'মুখ ধোয়ার ৬০ সেকেন্ডের মধ্যে হালকা ভেজা ত্বকে হাইড্রেটিং টোনার বা স্নেইল এসেন্স লাগান।',
      'রাতে আর্দ্রতা লক করতে সিরামাইড বা ইমোলিয়েন্ট সমৃদ্ধ ময়েশ্চারাইজার ক্রিম ব্যবহার করুন।',
      'ত্বক শুষ্ক করে এমন অ্যালকোহল-যুক্ত টোনার ও কড়া ফোমিং ক্লিনজার এড়িয়ে চলুন।',
    ],
    matchKeywords: ['dehydrat', 'dry', 'flak', 'tight', 'hydrat', 'moisture', 'plump', 'parched'],
  },
};

const CONCERN_SLUG_ALIASES: Record<string, string> = {
  'dark-spots-hyperpigmentation': 'hyperpigmentation-dark-spots',
  'dehydrated-dry-skin': 'dryness-dehydration',
  'oily-enlarged-pores': 'large-clogged-pores',
  'sun-protection-uv': 'sun-damage-tanning',
};

export const SKIN_CONCERN_LIBRARY: SkinConcernEntry[] = [
  {
    slug: 'acne-blemishes',
    title: 'Acne, Breakouts & Clogged Pores',
    titleBN: 'ব্রণ ও পোরস ক্লগিং',
    summary: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['acne-blemishes'].summary || '',
    summaryBN: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['acne-blemishes'].summaryBN,
    keyFocusIngredients: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['acne-blemishes'].keyFocusIngredients,
    routineTips: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['acne-blemishes'].routineTips,
    routineTipsBN: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['acne-blemishes'].routineTipsBN,
    matchKeywords: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['acne-blemishes'].matchKeywords,
  },
  {
    slug: 'dark-spots-hyperpigmentation',
    title: 'Dark Spots & Uneven Tone',
    titleBN: 'দাগ ও অসম ত্বকের রঙ',
    summary: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['hyperpigmentation-dark-spots'].summary || '',
    summaryBN: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['hyperpigmentation-dark-spots'].summaryBN,
    keyFocusIngredients: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['hyperpigmentation-dark-spots'].keyFocusIngredients,
    routineTips: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['hyperpigmentation-dark-spots'].routineTips,
    routineTipsBN: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['hyperpigmentation-dark-spots'].routineTipsBN,
    matchKeywords: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['hyperpigmentation-dark-spots'].matchKeywords,
  },
  {
    slug: 'dehydrated-dry-skin',
    title: 'Dehydration & Tightness',
    titleBN: 'শুষ্কতা ও আর্দ্রতার অভাব',
    summary: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['dryness-dehydration'].summary || '',
    summaryBN: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['dryness-dehydration'].summaryBN,
    keyFocusIngredients: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['dryness-dehydration'].keyFocusIngredients,
    routineTips: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['dryness-dehydration'].routineTips,
    routineTipsBN: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['dryness-dehydration'].routineTipsBN,
    matchKeywords: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['dryness-dehydration'].matchKeywords,
  },
  {
    slug: 'damaged-skin-barrier',
    title: 'Sensitized & Compromised Barrier',
    titleBN: 'সেন্সিটিভ ও ড্যামেজড স্কিন ব্যারিয়ার',
    summary: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['damaged-skin-barrier'].summary || '',
    summaryBN: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['damaged-skin-barrier'].summaryBN,
    keyFocusIngredients: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['damaged-skin-barrier'].keyFocusIngredients,
    routineTips: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['damaged-skin-barrier'].routineTips,
    routineTipsBN: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['damaged-skin-barrier'].routineTipsBN,
    matchKeywords: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['damaged-skin-barrier'].matchKeywords,
  },
  {
    slug: 'oily-enlarged-pores',
    title: 'Excess Shine & Visible Pores',
    titleBN: 'অতিরিক্ত তৈলাক্তভাব ও পোরস',
    summary: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['large-clogged-pores'].summary || '',
    summaryBN: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['large-clogged-pores'].summaryBN,
    keyFocusIngredients: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['large-clogged-pores'].keyFocusIngredients,
    routineTips: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['large-clogged-pores'].routineTips,
    routineTipsBN: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['large-clogged-pores'].routineTipsBN,
    matchKeywords: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['large-clogged-pores'].matchKeywords,
  },
  {
    slug: 'sun-protection-uv',
    title: 'Daily Sun Protection (UV Defense)',
    titleBN: 'রোদ ও ইউভি সুরক্ষা',
    summary: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['sun-damage-tanning'].summary || '',
    summaryBN: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['sun-damage-tanning'].summaryBN,
    keyFocusIngredients: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['sun-damage-tanning'].keyFocusIngredients,
    routineTips: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['sun-damage-tanning'].routineTips,
    routineTipsBN: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['sun-damage-tanning'].routineTipsBN,
    matchKeywords: CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG['sun-damage-tanning'].matchKeywords,
  },
];

export function getConcernDefaultEnrichment(slug?: string): SkinConcernEnrichment | undefined {
  if (!slug) return undefined;
  const clean = slug.toLowerCase().trim();
  if (CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG[clean]) {
    return CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG[clean];
  }
  const alias = CONCERN_SLUG_ALIASES[clean];
  if (alias && CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG[alias]) {
    return CONCERN_DEFAULT_ENRICHMENTS_BY_SLUG[alias];
  }
  return undefined;
}

function deriveKeywordsFromConcern(name: string, slug: string): string[] {
  const tokens = `${name} ${slug.replace(/-/g, ' ')}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !['and', 'the', 'for', 'with', 'skin'].includes(t));
  return Array.from(new Set(tokens));
}

export function taxonomyToSkinConcernEntry(item: TaxonomyItem): SkinConcernEntry {
  const enrichment = getConcernDefaultEnrichment(item.slug);

  const keyFocusIngredients =
    item.keyFocusIngredients !== undefined
      ? Array.from(new Set<string>(item.keyFocusIngredients.map((s) => s.trim()).filter(Boolean)))
      : enrichment?.keyFocusIngredients || [];

  const routineTips =
    item.routineTips !== undefined
      ? Array.from(new Set<string>(item.routineTips.map((s) => s.trim()).filter(Boolean)))
      : enrichment?.routineTips || [];

  const routineTipsBN =
    item.routineTipsBN !== undefined
      ? Array.from(new Set<string>(item.routineTipsBN.map((s) => s.trim()).filter(Boolean)))
      : enrichment?.routineTipsBN || [];

  const matchKeywords =
    item.matchKeywords !== undefined
      ? Array.from(new Set<string>(item.matchKeywords.map((s) => s.trim().toLowerCase()).filter(Boolean)))
      : enrichment?.matchKeywords || deriveKeywordsFromConcern(item.name, item.slug);

  return {
    slug: (item.slug || '').trim().toLowerCase(),
    title: item.name,
    titleBN: item.nameBN?.trim() || '',
    summary: item.description?.trim() || enrichment?.summary || '',
    summaryBN: item.descriptionBN?.trim() || enrichment?.summaryBN || '',
    keyFocusIngredients,
    routineTips,
    routineTipsBN,
    matchKeywords,
    image: item.image || undefined,
    isFeatured: item.isFeatured,
  };
}

export function taxonomiesToSkinConcernEntries(taxonomies: TaxonomyItem[]): SkinConcernEntry[] {
  const sorted = taxonomies
    .filter((item) => item.type === 'skin_concern' && item.isActive !== false && Boolean(item.slug?.trim()))
    .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));

  const bySlug = new Map<string, SkinConcernEntry>();
  for (const item of sorted) {
    const entry = taxonomyToSkinConcernEntry(item);
    const key = entry.slug.toLowerCase();
    const existing = bySlug.get(key);
    if (!existing) {
      bySlug.set(key, entry);
      continue;
    }
    bySlug.set(key, {
      ...existing,
      titleBN: existing.titleBN || entry.titleBN,
      summary: existing.summary || entry.summary,
      summaryBN: existing.summaryBN || entry.summaryBN,
      image: existing.image || entry.image,
      isFeatured: existing.isFeatured || entry.isFeatured,
      keyFocusIngredients: Array.from(
        new Set<string>([...existing.keyFocusIngredients, ...entry.keyFocusIngredients])
      ),
      routineTips: existing.routineTips.length > 0 ? existing.routineTips : entry.routineTips,
      routineTipsBN:
        existing.routineTipsBN && existing.routineTipsBN.length > 0
          ? existing.routineTipsBN
          : entry.routineTipsBN,
      matchKeywords: Array.from(new Set<string>([...existing.matchKeywords, ...entry.matchKeywords])),
    });
  }

  return Array.from(bySlug.values());
}

export function findConcernBySlug(
  slug?: string,
  concernsList?: SkinConcernEntry[]
): SkinConcernEntry | undefined {
  if (!slug) return undefined;
  const clean = slug.toLowerCase().trim();
  const list = concernsList && concernsList.length > 0 ? concernsList : SKIN_CONCERN_LIBRARY;

  const direct = list.find((item) => item.slug.toLowerCase() === clean);
  if (direct) return direct;

  const aliasTarget = CONCERN_SLUG_ALIASES[clean];
  if (aliasTarget) {
    const aliased = list.find((item) => item.slug.toLowerCase() === aliasTarget);
    if (aliased) return aliased;
  }

  return SKIN_CONCERN_LIBRARY.find((item) => item.slug.toLowerCase() === clean);
}

export function findConcernSlug(
  concernName: string,
  concernsList?: SkinConcernEntry[]
): string | null {
  const lower = concernName.toLowerCase().trim();
  if (!lower) return null;
  const list = concernsList && concernsList.length > 0 ? concernsList : SKIN_CONCERN_LIBRARY;

  for (const item of list) {
    if (
      item.slug.toLowerCase() === lower ||
      item.title.toLowerCase() === lower ||
      (item.titleBN && item.titleBN.toLowerCase() === lower) ||
      item.title.toLowerCase().includes(lower) ||
      lower.includes(item.title.toLowerCase()) ||
      item.matchKeywords.some((kw) => kw && lower.includes(kw.toLowerCase()))
    ) {
      return item.slug;
    }
  }

  if (concernsList && concernsList.length > 0) {
    for (const item of SKIN_CONCERN_LIBRARY) {
      if (
        item.slug === lower ||
        item.title.toLowerCase().includes(lower) ||
        item.matchKeywords.some((kw) => lower.includes(kw))
      ) {
        return item.slug;
      }
    }
  }

  return null;
}

export function matchesConcern(product: Product, concern: SkinConcernEntry): boolean {
  const productConcerns = Array.isArray(product.concerns) ? product.concerns : [];
  const lowerTitle = concern.title.toLowerCase().trim();
  const lowerSlug = concern.slug.toLowerCase().trim();

  // Direct taxonomy assignment match (when assigned via Admin -> Assign Products or Product editor)
  const hasDirectConcernMatch = productConcerns.some((c) => {
    const lc = (c || '').toLowerCase().trim();
    if (!lc) return false;
    return lc === lowerTitle || lc === lowerSlug || lc.includes(lowerTitle) || lowerTitle.includes(lc);
  });
  if (hasDirectConcernMatch) return true;

  const haystack = [
    ...productConcerns,
    ...(Array.isArray(product.benefits) ? product.benefits : []),
    ...(Array.isArray(product.keyIngredients) ? product.keyIngredients : []),
    product.category || '',
    product.name || '',
    product.description || '',
  ]
    .join(' ')
    .toLowerCase();

  const keywords =
    concern.matchKeywords && concern.matchKeywords.length > 0
      ? concern.matchKeywords
      : deriveKeywordsFromConcern(concern.title, concern.slug);

  return keywords.some((kw) => {
    const cleanKw = kw.toLowerCase().trim();
    return cleanKw.length > 0 && haystack.includes(cleanKw);
  });
}
