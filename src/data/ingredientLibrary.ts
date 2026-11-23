import { Product, TaxonomyItem } from '../types';

export interface IngredientGuideEntry {
  slug: string;
  name: string;
  nameBN?: string;
  koreanName?: string;
  shortRole: string;
  shortRoleBN?: string;
  summary: string;
  summaryBN?: string;
  bestForSkinTypes: string[];
  pairsWellWith: string[];
  layeringCautions: string[];
  layeringCautionsBN?: string[];
  matchKeywords: string[];
  image?: string;
  isFeatured?: boolean;
}

export interface IngredientEnrichment {
  koreanName?: string;
  shortRole: string;
  shortRoleBN?: string;
  summary: string;
  summaryBN?: string;
  bestForSkinTypes: string[];
  pairsWellWith: string[];
  layeringCautions: string[];
  layeringCautionsBN?: string[];
  matchKeywords: string[];
}

export const INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG: Record<string, IngredientEnrichment> = {
  'centella-asiatica-cica': {
    koreanName: '병풀추출물',
    shortRole: 'Calming botanical extract for redness and sensitized skin',
    shortRoleBN: 'লালচে ভাব ও সংবেদনশীল ত্বক প্রশমিত করার প্রাকৃতিক উপাদান',
    summary:
      'Centella Asiatica (also labeled Madecassoside, Asiaticoside, or Cica) is widely used in Korean toners, serums, and soothing creams to calm visible redness and support a comfortable skin barrier in humid weather.',
    summaryBN:
      'সেন্টেলা এশিয়াটিকা (ম্যাডেক্যাসোসাইড বা সিকা নামেও পরিচিত) কোরিয়ান টোনার, সিরাম ও কামিং ক্রিমে লালচে ভাব কমাতে ও আর্দ্র আবহাওয়ায় স্কিন ব্যারিয়ার সুরক্ষিত রাখতে ব্যবহৃত হয়।',
    bestForSkinTypes: ['Sensitive', 'Acne-Prone', 'Oily', 'Combination', 'Normal'],
    pairsWellWith: ['Panthenol', 'Hyaluronic Acid', 'Ceramides', 'Niacinamide'],
    layeringCautions: [
      'Gentle for daily AM and PM use across most routines. Always patch test new botanical extracts on the jawline first.',
    ],
    layeringCautionsBN: [
      'সকাল ও রাতের রুটিনে প্রতিদিন ব্যবহারযোগ্য মৃদু উপাদান। নতুন প্রডাক্ট ব্যবহারের আগে চোয়ালের পাশে প্যাচ টেস্ট করে নিন।',
    ],
    matchKeywords: ['centella', 'cica', 'madecassoside', 'asiaticoside', 'asiatic acid'],
  },
  niacinamide: {
    koreanName: '나이아신아마이드',
    shortRole: 'Multi-tasking barrier support, tone balancing, and oil regulation',
    shortRoleBN: 'পোরস, অতিরিক্ত তেল ও অসম ত্বকের রঙ নিয়ন্ত্রণে বহুমুখী উপাদান',
    summary:
      'Niacinamide is a water-soluble form of Vitamin B3 featured in Korean essences and brightening serums to help balance excess sebum, support uneven tone, and strengthen moisture retention.',
    summaryBN:
      'নায়াসিনামাইড হলো ভিটামিন বি৩-এর পানিতে দ্রবণীয় রূপ, যা অতিরিক্ত সিবাম নিয়ন্ত্রণ, দাগ হালকা করা এবং স্কিন ব্যারিয়ার মজবুত করতে সাহায্য করে।',
    bestForSkinTypes: ['Oily', 'Combination', 'Blemish-Prone', 'Dull', 'Normal'],
    pairsWellWith: ['Centella Asiatica', 'Hyaluronic Acid', 'Zinc PCA', 'Rice Extract'],
    layeringCautions: [
      'Concentrations between 2% and 5% suit daily layering well. High-strength (10%+) serums may feel tingling on sensitized skin if combined with strong acids in the same routine.',
    ],
    layeringCautionsBN: [
      '২%–৫% ঘনত্ব প্রতিদিনের লেয়ারিংয়ের জন্য দারুণ। সংবেদনশীল ত্বকে ১০%+ সিরাম শক্তিশালী অ্যাসিডের সাথে একসাথে ব্যবহারে হালকা ঝিনঝিন অনুভূত হতে পারে।',
    ],
    matchKeywords: ['niacinamide', 'vitamin b3'],
  },
  'snail-mucin': {
    koreanName: '달팽이점액여과물',
    shortRole: 'Hydrating glycoprotein humectant for bounce and barrier comfort',
    shortRoleBN: 'গভীর আর্দ্রতা, বাউন্স ও ত্বক পুনরুদ্ধারের জন্য হিউমেকট্যান্ট',
    summary:
      'Purified snail secretion filtrate is a hallmark Korean skincare essence ingredient valued for lightweight slip, multi-hour hydration, and helping dry or post-blemish skin feel smoother.',
    summaryBN:
      'বিশুদ্ধ স্নেইল সিক্রেশন ফিলট্রেট কোরিয়ান এসেন্সের অন্যতম জনপ্রিয় উপাদান, যা হালকা অনুভূতিতে দীর্ঘস্থায়ী আর্দ্রতা দেয় এবং ব্রণ-পরবর্তী দাগ ও রুক্ষতা কমাতে সাহায্য করে।',
    bestForSkinTypes: ['Dry', 'Dehydrated', 'Combination', 'Sensitive', 'Normal'],
    pairsWellWith: ['Panthenol', 'Hyaluronic Acid', 'Centella Asiatica', 'Ceramides'],
    layeringCautions: [
      'Individuals with dust-mite or shellfish sensitivities occasionally react to mucin; perform a 24-hour inner-arm or jawline patch test before full application.',
    ],
    layeringCautionsBN: [
      'ডাস্ট-মাইট বা শেলফিশে অ্যালার্জি থাকলে পুরো মুখে ব্যবহারের আগে ২৪ ঘণ্টার প্যাচ টেস্ট করে নিন।',
    ],
    matchKeywords: ['snail', 'mucin', 'snail secretion'],
  },
  'hyaluronic-acid': {
    koreanName: '히알루론산',
    shortRole: 'Water-binding humectant for lightweight plumping hydration',
    shortRoleBN: 'হালকা ওয়েটলেস আর্দ্রতা ও প্লাম্প গ্লাস স্কিনের জন্য হিউমেকট্যান্ট',
    summary:
      'Multi-molecular hyaluronic acid draws surface moisture into the upper layers of the skin without heavy oils, making it ideal for hydrating toners and gel creams in Bangladesh humidity.',
    summaryBN:
      'মাল্টি-মলিকিউলার হায়ালুরনিক অ্যাসিড ভারী তেল ছাড়াই ত্বকের উপরিভাগে আর্দ্রতা টেনে ধরে রাখে, যা বাংলাদেশের আর্দ্র আবহাওয়ায় খুবই উপযোগী।',
    bestForSkinTypes: ['All Skin Types', 'Dehydrated', 'Dry', 'Oily', 'Sensitive'],
    pairsWellWith: ['Ceramides', 'Panthenol', 'Niacinamide', 'Centella Asiatica'],
    layeringCautions: [
      'Apply onto slightly damp skin and seal with a light moisturizer or sunscreen so hydration stays locked in.',
    ],
    layeringCautionsBN: [
      'হালকা ভেজা ত্বকে ব্যবহার করে উপরে ময়েশ্চারাইজার বা সানস্ক্রিন দিয়ে আর্দ্রতা লক করুন।',
    ],
    matchKeywords: ['hyaluronic', 'hyaluronate'],
  },
  'salicylic-acid-bha': {
    koreanName: '살리실릭애씨드',
    shortRole: 'Oil-soluble exfoliant for congested pores and blackheads',
    shortRoleBN: 'বন্ধ পোরস, ব্ল্যাকহেডস ও ব্রণ পরিষ্কার করার অয়েল-সলুবল এক্সফোলিয়েন্ট',
    summary:
      'Beta-hydroxy acid (BHA) dissolves inside oil-rich pores to loosen dead skin buildup and excess sebum, commonly formulated into Korean low-pH cleansers, toner pads, and spot care.',
    summaryBN:
      'বিটা-হাইড্রক্সি অ্যাসিড (BHA) পোরসের ভেতরের জমে থাকা তেল ও মৃত কোষ গলিয়ে ব্ল্যাকহেডস ও ব্রেকআউট কমাতে সাহায্য করে।',
    bestForSkinTypes: ['Oily', 'Acne-Prone', 'Combination', 'Congested Pores'],
    pairsWellWith: ['Centella Asiatica', 'Panthenol', 'Tea Tree'],
    layeringCautions: [
      'Avoid layering leave-on BHA in the exact same AM/PM step with Retinol, Retinal, AHA exfoliants, or high-strength Vitamin C. Start 2–3 nights per week and wear SPF daily.',
    ],
    layeringCautionsBN: [
      'লিভ-অন BHA একই রুটিনে রেটিনল, রেটিনাল, AHA বা উচ্চ ঘনত্বের ভিটামিন সি-এর সাথে ব্যবহার করবেন না। সপ্তাহে ২–৩ রাত দিয়ে শুরু করুন এবং দিনে সানস্ক্রিন ব্যবহার করুন।',
    ],
    matchKeywords: ['salicylic', 'bha', 'betaine salicylate'],
  },
  'retinol-retinal': {
    koreanName: '레티놀',
    shortRole: 'Vitamin A derivative for smoother texture and evening renewal',
    shortRoleBN: 'তারুণ্য ধরে রাখা, বলিরেখা মসৃণ ও পোরস রিফাইন করার ভিটামিন এ ডেরিভেটিভ',
    summary:
      'Encapsulated Korean retinol and retinaldehyde formulas support smoother-looking skin texture and refined pores when introduced gradually at night.',
    summaryBN:
      'এনক্যাপসুলেটেড কোরিয়ান রেটিনল ও রেটিনালডিহাইড রাতে ধীরে ধীরে ব্যবহারে ত্বকের টেক্সচার মসৃণ ও টানটান রাখতে সাহায্য করে।',
    bestForSkinTypes: ['Oily', 'Combination', 'Normal', 'Mature'],
    pairsWellWith: ['Ceramides', 'Panthenol', 'Hyaluronic Acid', 'Peptides'],
    layeringCautions: [
      'Use at PM only, start 1–2 nights per week, and avoid pairing in the same routine with AHA, BHA, Benzoyl Peroxide, or high-strength L-Ascorbic Acid. Always use broad-spectrum SPF during the day.',
    ],
    layeringCautionsBN: [
      'শুধুমাত্র রাতে ব্যবহার করুন, সপ্তাহে ১–২ রাত দিয়ে শুরু করুন এবং একই সময়ে AHA, BHA বা শক্তিশালী ভিটামিন সি-এর সাথে লাগাবেন না। দিনে অবশ্যই ব্রড-স্পেকট্রাম SPF ব্যবহার করুন।',
    ],
    matchKeywords: ['retinol', 'retinal', 'bakuchiol', 'retinoid'],
  },
  'rice-extract-ferments': {
    koreanName: '쌀추출물',
    shortRole: 'Traditional Korean brightening & softening grain extract',
    shortRoleBN: 'ঐতিহ্যবাহী কোরিয়ান উজ্জ্বলতা ও কোমলতা বৃদ্ধিকারী রাইস এক্সট্রাক্ট',
    summary:
      'Oryza Sativa (Rice) extract and fermented rice bran water deliver gentle amino acids and soothing hydration found in iconic Korean sunscreens, wash-off masks, and milky toners.',
    summaryBN:
      'অ্যামিনো অ্যাসিড ও খনিজে সমৃদ্ধ রাইস এক্সট্রাক্ট ও ফারমেন্টেড রাইস ব্র্যান ওয়াটার ত্বকে প্রাকৃতিক উজ্জ্বলতা ও মসৃণতা এনে দেয়।',
    bestForSkinTypes: ['Dry', 'Dull', 'Normal', 'Combination', 'Sensitive'],
    pairsWellWith: ['Niacinamide', 'Probiotics', 'Hyaluronic Acid', 'Ceramides'],
    layeringCautions: [
      'Very gentle for both morning and evening layering alongside active serums and SPF.',
    ],
    layeringCautionsBN: [
      'সকাল ও রাত উভয় রুটিনে অ্যাক্টিভ সিরাম ও সানস্ক্রিনের সাথে ব্যবহারের জন্য অত্যন্ত মৃদু।',
    ],
    matchKeywords: ['rice', 'oryza', 'galactomyces', 'ferment'],
  },
  heartleaf: {
    koreanName: '어성초 / 쑥',
    shortRole: 'Cooling Korean botanical for redness, heat, and acne-prone skin',
    shortRoleBN: 'তৈলাক্ত, লালচে ও ব্রণ-প্রবণ ত্বক ঠান্ডা রাখার কোরিয়ান হার্বাল উপাদান',
    summary:
      'Houttuynia Cordata (Heartleaf) and Artemisia (Mugwort) are signature Korean soothing botanicals used in calming toners, essences, and pads to cool flushed, acne-prone skin.',
    summaryBN:
      'হার্টলিফ (হউতুইনিয়া কর্ডাটা) ও মাগওয়ার্ট কোরিয়ান কামিং টোনার ও প্যাডে প্রদাহ, লালচে ভাব ও ব্রণের জ্বালাপোড়া কমাতে ব্যবহৃত হয়।',
    bestForSkinTypes: ['Sensitive', 'Oily', 'Acne-Prone', 'Redness-Prone'],
    pairsWellWith: ['Centella Asiatica', 'Panthenol', 'Tea Tree', 'Hyaluronic Acid'],
    layeringCautions: [
      'Gentle daily hydrator; can be layered cleanly under calming creams and sunscreens.',
    ],
    layeringCautionsBN: [
      'প্রতিদিন ব্যবহারের উপযোগী মৃদু উপাদান; কামিং ক্রিম ও সানস্ক্রিনের নিচে সহজে লেয়ার করা যায়।',
    ],
    matchKeywords: ['heartleaf', 'houttuynia', 'mugwort', 'artemisia', 'dokdo'],
  },
  ceramides: {
    koreanName: '세라마이드',
    shortRole: 'Skin-identical lipids that seal hydration and reinforce barrier',
    shortRoleBN: 'ত্বকের প্রাকৃতিক লিপিড ব্যারিয়ার পুনর্গঠন ও আর্দ্রতা লক করার উপাদান',
    summary:
      'Ceramides form the mortar between outer skin cells. Korean barrier creams use multi-ceramide blends with cholesterol and fatty acids to replenish stripped or air-conditioned skin.',
    summaryBN:
      'সিরামাইড ত্বকের কোষের মাঝে সুরক্ষা স্তর তৈরি করে পানিশূন্যতা রোধ করে ও দুর্বল স্কিন ব্যারিয়ার মেরামত করে।',
    bestForSkinTypes: ['Dry', 'Sensitive', 'Dehydrated', 'Barrier-Damaged'],
    pairsWellWith: ['Panthenol', 'Hyaluronic Acid', 'Retinol', 'Centella Asiatica'],
    layeringCautions: [
      'Safe morning and night; especially helpful on recovery nights when pausing exfoliants or retinoids.',
    ],
    layeringCautionsBN: [
      'সকাল ও রাতে প্রতিদিন নিরাপদে ব্যবহারযোগ্য; অ্যাক্টিভ থেকে বিরতির সময় রিকভারি রুটিনে দারুণ কার্যকর।',
    ],
    matchKeywords: ['ceramide'],
  },
  'vitamin-c': {
    koreanName: '비타민C',
    shortRole: 'Antioxidant support for brighter tone and morning UV defense',
    shortRoleBN: 'উজ্জ্বলতা, দাগ কমানো ও অ্যান্টি-অক্সিডেন্ট সুরক্ষার শক্তিশালী উপাদান',
    summary:
      'L-Ascorbic acid and gentler derivatives (Sodium Ascorbyl Phosphate, 3-O-Ethyl Ascorbic Acid) help visibly brighten dull skin and complement daily sunscreen.',
    summaryBN:
      'ভিটামিন সি ও এর মৃদু ডেরিভেটিভগুলো ফ্রি র‍্যাডিক্যাল থেকে ত্বককে রক্ষা করে, নিষ্প্রাণ ভাব দূর করে এবং সকালের সানস্ক্রিনের কার্যকারিতা বাড়ায়।',
    bestForSkinTypes: ['Dull', 'Normal', 'Combination', 'Hyperpigmented'],
    pairsWellWith: ['Sunscreen', 'Vitamin E', 'Ferulic Acid', 'Hyaluronic Acid'],
    layeringCautions: [
      'Pure L-Ascorbic Acid at low pH should not be stacked in the same slot as Retinol or strong AHA/BHA exfoliants to minimize stinging.',
    ],
    layeringCautionsBN: [
      'জ্বালাপোড়া এড়াতে পিওর এল-অ্যাসকরবিক অ্যাসিড একই রুটিনে রেটিনল বা কড়া AHA/BHA-এর সাথে একসাথে লাগাবেন না।',
    ],
    matchKeywords: ['vitamin c', 'ascorbic', 'ascorbyl', 'yuzu', 'yuja', 'glutathione'],
  },
  'propolis-honey': {
    koreanName: '프로폴리스',
    shortRole: 'Resinous bee-derived antioxidant & nourishing glow ingredient',
    shortRoleBN: 'অ্যান্টি-ব্যাকটেরিয়াল পুষ্টি ও স্বাস্থ্যকর হানি-গ্লো প্রদানকারী উপাদান',
    summary:
      'Propolis extract is prized in Korean ampoules and toners for nourishing fatigued skin, calming minor blemishes, and imparting a dewy glow.',
    summaryBN:
      'প্রোপোলিস ও রয়্যাল জেলি এক্সট্রাক্ট ক্লান্ত ত্বকে পুষ্টি জোগায়, হালকা ব্রণ প্রশমিত করে এবং প্রাকৃতিক গ্লো এনে দেয়।',
    bestForSkinTypes: ['Dry', 'Dull', 'Combination', 'Blemish-Prone'],
    pairsWellWith: ['Niacinamide', 'Centella Asiatica', 'Hyaluronic Acid'],
    layeringCautions: [
      'Patch test before use if you have known sensitivities to bee-derived cosmetic products.',
    ],
    layeringCautionsBN: [
      'মধু বা মৌমাছি-জাত উপাদানে সংবেদনশীলতা থাকলে ব্যবহারের আগে প্যাচ টেস্ট করে নিন।',
    ],
    matchKeywords: ['propolis', 'honey', 'royal jelly'],
  },
  'pdrn-salmon-dna': {
    koreanName: '피디알엔 (연어 DNA)',
    shortRole: 'Rejuvenating K-beauty active for barrier bounce and firming care',
    shortRoleBN: 'ত্বকের রিজুভিনেশন, ফার্মিং ও গভীর রিপেয়ারের আধুনিক কোরিয়ান অ্যাক্টিভ',
    summary:
      'Polydeoxyribonucleotide (PDRN) inspired by Korean aesthetic skincare helps support skin elasticity, smooth fatigued texture, and comfort post-stress skin barriers.',
    summaryBN:
      'পিডিআরএন বা সালমন ডিএনএ অনুপ্রাণিত কোরিয়ান অ্যাক্টিভ ত্বকের ইলাস্টিসিটি, গভীর মেরামত ও ক্লান্ত ত্বকের উজ্জ্বলতা ফেরাতে সাহায্য করে।',
    bestForSkinTypes: ['Mature', 'Dry', 'Dehydrated', 'Sensitive', 'Normal'],
    pairsWellWith: ['Hyaluronic Acid', 'Ceramides', 'Peptides', 'Niacinamide'],
    layeringCautions: [
      'Gentle enough for morning and evening serum steps; patch test first if you have fish-derived ingredient sensitivities.',
    ],
    layeringCautionsBN: [
      'সকাল ও রাতের সিরাম ধাপে ব্যবহারযোগ্য; সামুদ্রিক বা মাছ-জাত উপাদানে অ্যালার্জি থাকলে আগে প্যাচ টেস্ট করে নিন।',
    ],
    matchKeywords: ['pdrn', 'salmon', 'dna', 'polydeoxyribonucleotide'],
  },
  panthenol: {
    koreanName: '판테놀',
    shortRole: 'Soothing humectant and moisture-barrier cushion',
    shortRoleBN: 'প্রশমণকারী হিউমেকট্যান্ট ও ময়েশ্চার-ব্যারিয়ার কুশন',
    summary:
      'Panthenol converts to Vitamin B5 on the skin, attracting moisture and reducing feelings of tightness or dryness after cleansing or exfoliating.',
    summaryBN:
      'প্যান্থেনল ত্বকে ভিটামিন বি৫-এ রূপান্তরিত হয়ে আর্দ্রতা ধরে রাখে এবং ক্লিনজিং বা এক্সফোলিয়েশনের পর টানটান ভাব কমায়।',
    bestForSkinTypes: ['Sensitive', 'Dry', 'Dehydrated', 'Acne-Prone', 'All Skin Types'],
    pairsWellWith: ['Centella Asiatica', 'Ceramides', 'Snail Mucin', 'Salicylic Acid (BHA)'],
    layeringCautions: [
      'Non-irritating supportive ingredient suitable for buffering stronger actives at night.',
    ],
    layeringCautionsBN: [
      'জ্বালাপোড়াহীন সহায়ক উপাদান, যা রাতে শক্তিশালী অ্যাক্টিভ বাফার করতে চমৎকার কাজ করে।',
    ],
    matchKeywords: ['panthenol', 'b5', 'provitamin b5'],
  },
};

const INGREDIENT_SLUG_ALIASES: Record<string, string> = {
  'centella-asiatica': 'centella-asiatica-cica',
  'salicylic-acid': 'salicylic-acid-bha',
  retinol: 'retinol-retinal',
  'rice-extract': 'rice-extract-ferments',
  ceramide: 'ceramides',
  propolis: 'propolis-honey',
  mugwort: 'heartleaf',
};

export const INGREDIENT_LIBRARY: IngredientGuideEntry[] = [
  {
    slug: 'centella-asiatica',
    name: 'Centella Asiatica (Cica)',
    ...INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG['centella-asiatica-cica'],
  },
  {
    slug: 'niacinamide',
    name: 'Niacinamide (Vitamin B3)',
    ...INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG['niacinamide'],
  },
  {
    slug: 'snail-mucin',
    name: 'Snail Secretion Filtrate (Snail Mucin)',
    ...INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG['snail-mucin'],
  },
  {
    slug: 'hyaluronic-acid',
    name: 'Hyaluronic Acid & Sodium Hyaluronate',
    ...INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG['hyaluronic-acid'],
  },
  {
    slug: 'salicylic-acid',
    name: 'Salicylic Acid (BHA)',
    ...INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG['salicylic-acid-bha'],
  },
  {
    slug: 'rice-extract',
    name: 'Rice Extract & Rice Ferment',
    ...INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG['rice-extract-ferments'],
  },
  {
    slug: 'panthenol',
    name: 'Panthenol (Pro-Vitamin B5)',
    ...INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG['panthenol'],
  },
  {
    slug: 'ceramide',
    name: 'Ceramides (NP / EOP / AP)',
    ...INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG['ceramides'],
  },
  {
    slug: 'retinol',
    name: 'Retinol & Retinaldehyde',
    ...INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG['retinol-retinal'],
  },
  {
    slug: 'vitamin-c',
    name: 'Vitamin C & Derivatives',
    ...INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG['vitamin-c'],
  },
  {
    slug: 'propolis',
    name: 'Propolis & Royal Jelly Extract',
    ...INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG['propolis-honey'],
  },
  {
    slug: 'mugwort',
    name: 'Mugwort (Artemisia) & Heartleaf',
    ...INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG['heartleaf'],
  },
];

export function getIngredientDefaultEnrichment(slug?: string): IngredientEnrichment | undefined {
  if (!slug) return undefined;
  const clean = slug.toLowerCase().trim();
  if (INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG[clean]) {
    return INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG[clean];
  }
  const alias = INGREDIENT_SLUG_ALIASES[clean];
  if (alias && INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG[alias]) {
    return INGREDIENT_DEFAULT_ENRICHMENTS_BY_SLUG[alias];
  }
  return undefined;
}

function deriveKeywordsFromIngredient(name: string, slug: string): string[] {
  const baseName = name.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const tokens = `${baseName} ${slug.replace(/-/g, ' ')}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !['and', 'the', 'for', 'with', 'extract', 'acid'].includes(t));
  return Array.from(new Set<string>([baseName.toLowerCase(), ...tokens].filter(Boolean)));
}

export function taxonomyToIngredientGuideEntry(item: TaxonomyItem): IngredientGuideEntry {
  const enrichment = getIngredientDefaultEnrichment(item.slug);

  const dedupeStrings = (arr: string[]): string[] =>
    Array.from(new Set<string>(arr.map((s) => s.trim()).filter(Boolean)));

  const bestForSkinTypes =
    item.bestForSkinTypes !== undefined
      ? dedupeStrings(item.bestForSkinTypes)
      : enrichment?.bestForSkinTypes || [];

  const pairsWellWith =
    item.pairsWellWith !== undefined
      ? dedupeStrings(item.pairsWellWith)
      : enrichment?.pairsWellWith || [];

  const layeringCautions =
    item.layeringCautions !== undefined
      ? dedupeStrings(item.layeringCautions)
      : enrichment?.layeringCautions || [];

  const layeringCautionsBN =
    item.layeringCautionsBN !== undefined
      ? dedupeStrings(item.layeringCautionsBN)
      : enrichment?.layeringCautionsBN || [];

  const matchKeywords =
    item.matchKeywords !== undefined
      ? Array.from(new Set<string>(item.matchKeywords.map((s) => s.trim().toLowerCase()).filter(Boolean)))
      : enrichment?.matchKeywords || deriveKeywordsFromIngredient(item.name, item.slug);

  return {
    slug: (item.slug || '').trim().toLowerCase(),
    name: item.name,
    nameBN: item.nameBN?.trim() || '',
    koreanName: item.koreanName !== undefined ? item.koreanName.trim() : enrichment?.koreanName || '',
    shortRole: item.shortRole !== undefined ? item.shortRole.trim() : enrichment?.shortRole || '',
    shortRoleBN: item.shortRoleBN !== undefined ? item.shortRoleBN.trim() : enrichment?.shortRoleBN || '',
    summary: item.description?.trim() || enrichment?.summary || '',
    summaryBN: item.descriptionBN?.trim() || enrichment?.summaryBN || '',
    bestForSkinTypes,
    pairsWellWith,
    layeringCautions,
    layeringCautionsBN,
    matchKeywords,
    image: item.image || undefined,
    isFeatured: item.isFeatured,
  };
}

export function taxonomiesToIngredientGuideEntries(taxonomies: TaxonomyItem[]): IngredientGuideEntry[] {
  const sorted = taxonomies
    .filter((item) => item.type === 'ingredient' && item.isActive !== false && Boolean(item.slug?.trim()))
    .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));

  const bySlug = new Map<string, IngredientGuideEntry>();

  for (const item of sorted) {
    const entry = taxonomyToIngredientGuideEntry(item);
    const key = entry.slug.toLowerCase();
    const existing = bySlug.get(key);
    if (!existing) {
      bySlug.set(key, entry);
      continue;
    }

    // Merge richer fields if duplicate slug records exist in Firestore
    bySlug.set(key, {
      ...existing,
      nameBN: existing.nameBN || entry.nameBN,
      koreanName: existing.koreanName || entry.koreanName,
      shortRole: existing.shortRole || entry.shortRole,
      shortRoleBN: existing.shortRoleBN || entry.shortRoleBN,
      summary: existing.summary || entry.summary,
      summaryBN: existing.summaryBN || entry.summaryBN,
      image: existing.image || entry.image,
      isFeatured: existing.isFeatured || entry.isFeatured,
      bestForSkinTypes: Array.from(new Set<string>([...existing.bestForSkinTypes, ...entry.bestForSkinTypes])),
      pairsWellWith: Array.from(new Set<string>([...existing.pairsWellWith, ...entry.pairsWellWith])),
      layeringCautions: existing.layeringCautions.length > 0 ? existing.layeringCautions : entry.layeringCautions,
      layeringCautionsBN:
        existing.layeringCautionsBN && existing.layeringCautionsBN.length > 0
          ? existing.layeringCautionsBN
          : entry.layeringCautionsBN,
      matchKeywords: Array.from(new Set<string>([...existing.matchKeywords, ...entry.matchKeywords])),
    });
  }

  return Array.from(bySlug.values());
}

export function findIngredientBySlug(
  slug?: string,
  ingredientsList?: IngredientGuideEntry[]
): IngredientGuideEntry | undefined {
  if (!slug) return undefined;
  const clean = slug.toLowerCase().trim();
  const list =
    ingredientsList && ingredientsList.length > 0 ? ingredientsList : INGREDIENT_LIBRARY;

  const direct = list.find((item) => item.slug.toLowerCase() === clean);
  if (direct) return direct;

  const aliasTarget = INGREDIENT_SLUG_ALIASES[clean];
  if (aliasTarget) {
    const aliased = list.find((item) => item.slug.toLowerCase() === aliasTarget);
    if (aliased) return aliased;
  }

  // Reverse alias check (e.g. if navigating to taxonomy slug while fallback list only has legacy slug)
  const reverseAlias = Object.entries(INGREDIENT_SLUG_ALIASES).find(
    ([legacySlug, taxSlug]) => taxSlug === clean && list.some((item) => item.slug === legacySlug)
  );
  if (reverseAlias) {
    return list.find((item) => item.slug === reverseAlias[0]);
  }

  return INGREDIENT_LIBRARY.find((item) => item.slug.toLowerCase() === clean);
}

export function findIngredientSlug(
  ingredientName: string,
  ingredientsList?: IngredientGuideEntry[]
): string | null {
  const lower = ingredientName.toLowerCase().trim();
  if (!lower) return null;
  const cleanBase = lower.replace(/\s*\([^)]*\)\s*/g, '').trim();
  const list =
    ingredientsList && ingredientsList.length > 0 ? ingredientsList : INGREDIENT_LIBRARY;

  for (const item of list) {
    const itemLower = item.name.toLowerCase().trim();
    const itemBase = itemLower.replace(/\s*\([^)]*\)\s*/g, '').trim();
    if (
      item.slug.toLowerCase() === lower ||
      itemLower === lower ||
      (itemBase && cleanBase && (itemBase === cleanBase || itemBase.includes(cleanBase) || cleanBase.includes(itemBase))) ||
      itemLower.includes(lower) ||
      lower.includes(itemLower) ||
      (item.nameBN && item.nameBN.toLowerCase() === lower) ||
      item.matchKeywords.some((kw) => kw && (lower.includes(kw.toLowerCase()) || kw.toLowerCase() === cleanBase))
    ) {
      return item.slug;
    }
  }

  if (ingredientsList && ingredientsList.length > 0) {
    for (const item of INGREDIENT_LIBRARY) {
      if (
        item.slug === lower ||
        item.name.toLowerCase().includes(lower) ||
        item.matchKeywords.some((kw) => lower.includes(kw))
      ) {
        return item.slug;
      }
    }
  }

  return null;
}

export function matchesIngredient(product: Product, ingredient: IngredientGuideEntry): boolean {
  const productIngredients = Array.isArray(product.keyIngredients) ? product.keyIngredients : [];
  const lowerName = ingredient.name.toLowerCase().trim();
  const baseName = lowerName.replace(/\s*\([^)]*\)\s*/g, '').trim();
  const lowerSlug = ingredient.slug.toLowerCase().trim();

  // Direct taxonomy assignment match (Admin -> Assign Products or Product editor)
  const hasDirectMatch = productIngredients.some((pi) => {
    const lpi = (pi || '').toLowerCase().trim();
    if (!lpi) return false;
    const piBase = lpi.replace(/\s*\([^)]*\)\s*/g, '').trim();
    return (
      lpi === lowerName ||
      lpi === lowerSlug ||
      (baseName && piBase && (piBase.includes(baseName) || baseName.includes(piBase)))
    );
  });
  if (hasDirectMatch) return true;

  const haystack = [
    ...productIngredients,
    product.name || '',
    product.description || '',
    ...(Array.isArray(product.benefits) ? product.benefits : []),
  ]
    .join(' ')
    .toLowerCase();

  const keywords =
    ingredient.matchKeywords && ingredient.matchKeywords.length > 0
      ? ingredient.matchKeywords
      : deriveKeywordsFromIngredient(ingredient.name, ingredient.slug);

  return keywords.some((kw) => {
    const cleanKw = kw.toLowerCase().trim();
    return cleanKw.length > 0 && haystack.includes(cleanKw);
  });
}
