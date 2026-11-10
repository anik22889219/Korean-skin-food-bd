export interface BrandSeoProfile {
  name: string;
  slug: string;
  countryOfOrigin: string;
  city: string;
  tagline: string;
  taglineBN: string;
  description: string;
  descriptionBN: string;
  philosophy: string;
  keyIngredients: string[];
  heroImage: string;
  faqs: Array<{ question: string; answer: string }>;
}

export const BRAND_SEO_PROFILES: Record<string, BrandSeoProfile> = {
  'cosrx': {
    name: 'COSRX',
    slug: 'cosrx',
    countryOfOrigin: 'South Korea',
    city: 'Seoul',
    tagline: 'Expecting Tomorrow | Dermatological Solutions for Problematic Skin',
    taglineBN: 'সমস্যাযুক্ত ত্বকের জন্য প্রমাণিত ডার্মাটোলজিক্যাল সমাধান',
    description: 'COSRX is one of South Korea’s most globally renowned skincare brands, celebrated for minimalist ingredient formulations and targeted treatment products. Known for hero formulations such as the Advanced Snail 96 Mucin Power Essence, Low pH Good Morning Gel Cleanser, and gentle BHA Blackhead Power Liquid, COSRX focuses on high concentrations of active ingredients with minimal additives.',
    descriptionBN: 'কসআরএক্স দক্ষিণ কোরিয়ার বিশ্বখ্যাত স্কিন কেয়ার ব্র্যান্ড যা কার্যকর উপাদান ও ন্যূনতম রাসায়নিক ব্যবহারের জন্য সুপরিচিত। বিশেষ করে এদের স্নাইল ৯৬ মিউসিন এসেন্স এবং লো-পিএইচ ক্লিনজার বিশ্বজুড়ে সমাদৃত।',
    philosophy: 'Minimalist active formulations designed to address skin concerns transparently without unnecessary fillers.',
    keyIngredients: ['Snail Secretion Filtrate', 'Betaine Salicylate', 'Propolis', 'Centella Asiatica', 'Niacinamide'],
    heroImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80',
    faqs: [
      {
        question: 'Are COSRX products sold by Korean Skin Food BD 100% authentic?',
        answer: 'Yes. All COSRX products at Korean Skin Food BD are directly imported from Seoul, South Korea with verified Korean manufacturer barcode standards and climate-controlled storage in Dhaka.'
      },
      {
        question: 'What is the most popular COSRX product for beginners in Bangladesh?',
        answer: 'The COSRX Advanced Snail 96 Mucin Power Essence and Low pH Good Morning Gel Cleanser are the most popular starting choices due to their gentle hydrating and barrier-strengthening properties.'
      },
      {
        question: 'Is COSRX Snail Mucin suitable for acne-prone skin?',
        answer: 'Yes. Genuine snail secretion filtrate is naturally lightweight, non-comedogenic, and deeply soothing, making it well tolerated by most acne-prone individuals.'
      }
    ]
  },
  'beauty-of-joseon': {
    name: 'Beauty of Joseon',
    slug: 'beauty-of-joseon',
    countryOfOrigin: 'South Korea',
    city: 'Seoul',
    tagline: 'Hanbang Skincare Inspired by the Royal Court of the Joseon Dynasty',
    taglineBN: 'জোসেওন রাজবংশের ঐতিহ্যবাহী হার্বাল বা হানবাং ফর্মুলা',
    description: 'Beauty of Joseon reinterprets traditional Korean Hanbang herbal medicine using modern cosmetic science. Featuring fermented rice water, ginseng, green tea, and propolis, the brand is world-famous for its Relief Sun: Rice + Probiotics SPF50+ sunscreen and targeted skin serums.',
    descriptionBN: 'বিউটি অফ জোসেওন ঐতিহ্যবাহী কোরিয়ান হার্বাল মেডিসিন ও আধুনিক বিজ্ঞানের সংমিশ্রণ। এদের রাইস প্লাস প্রোবায়োটিক সানস্ক্রিন বিশ্বজুড়ে সর্বাধিক বিক্রিত সানস্ক্রিনগুলোর অন্যতম।',
    philosophy: 'Harmonious beauty rooted in traditional Korean herbal wisdom for naturally radiant, luminous skin.',
    keyIngredients: ['Rice Bran Water', 'Ginseng Root', 'Propolis', 'Niacinamide', 'Green Tea'],
    heroImage: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=1200&q=80',
    faqs: [
      {
        question: 'Why is Beauty of Joseon Relief Sun sunscreen so popular in Bangladesh?',
        answer: 'It combines high SPF50+ PA++++ broad-spectrum sun protection with a weightless, lotion-like texture that absorbs cleanly without leaving a greasy sheen or white cast in humid weather.'
      },
      {
        question: 'Is Beauty of Joseon suitable for sensitive skin?',
        answer: 'Yes. Formulations avoid harsh artificial fragrances and emphasize calming botanical antioxidants such as rice extract and ginseng.'
      }
    ]
  },
  'skin1004': {
    name: 'SKIN1004',
    slug: 'skin1004',
    countryOfOrigin: 'South Korea',
    city: 'Seoul',
    tagline: 'Untouched Nature | Pure Madagascar Centella Asiatica',
    taglineBN: 'মাদাগাস্কারের বিশুদ্ধ সেন্টেলা এশিয়াটিকা দিয়ে তৈরি ত্বকের সুরক্ষা',
    description: 'SKIN1004 is dedicated to raw, clean skincare centered on 100% pure Centella Asiatica harvested from the pristine biodiversity of Madagascar. Celebrated for its golden Centella Ampoule, Hyalu-Cica Water-Fit Sun Serum, and pore-clearing cleansing oils.',
    descriptionBN: 'স্কিন১০০৪ মাদাগাস্কারের প্রাকৃতিক সেন্টেলা এশিয়াটিকা দ্বারা তৈরি অত্যন্ত নিরাপদ ও কার্যকর প্রডাক্টের জন্য পরিচিত, যা সংবেদনশীল ত্বকের লালচে ভাব দূর করতে বিশেষ ভূমিকা রাখে।',
    philosophy: 'Pure botanical preservation delivering untamed natural resilience to stressed urban skin.',
    keyIngredients: ['Madagascar Centella Asiatica', 'Hyaluronic Acid', 'Tea-Trica', 'Niacinamide'],
    heroImage: 'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=1200&q=80',
    faqs: [
      {
        question: 'What makes SKIN1004 Madagascar Centella unique?',
        answer: 'SKIN1004 ethically sources its Centella Asiatica exclusively from Madagascar, recognized for high concentrations of active soothing triterpenoids (Madecassoside and Asiaticoside).'
      },
      {
        question: 'Which SKIN1004 product is best for oily and acne-prone skin?',
        answer: 'The Madagascar Centella Ampoule and the Hyalu-Cica Water-Fit Sun Serum are both ultralight, non-greasy, and excellent for oily or redness-prone skin in Bangladesh.'
      }
    ]
  },
  'anua': {
    name: 'Anua',
    slug: 'anua',
    countryOfOrigin: 'South Korea',
    city: 'Seoul',
    tagline: 'Keep Things Simple | Heartleaf Soothing Comfort',
    taglineBN: 'হার্টলিফ এক্সট্রাক্ট সমৃদ্ধ প্রশান্তিদায়ক সাধারণ স্কিন কেয়ার',
    description: 'Anua champions simple, relaxing skincare formulations with minimal irritants. Its flagship Heartleaf 77% Soothing Toner is a multiple-award winner in Korean beauty rankings for instantly calming redness, clearing micro-blemishes, and balancing hydration.',
    descriptionBN: 'আনুয়া একটি জনপ্রিয় ক্লিন কে-বিউটি ব্র্যান্ড যার ৭৭% হার্টলিফ টোনার ত্বকের অস্বস্তি ও ব্রণের লালচে ভাব শান্ত করতে অত্যন্ত কার্যকর।',
    philosophy: 'Relaxing beauty that prioritizes natural comfort and clean, gentle soothing.',
    keyIngredients: ['Heartleaf (Houttuynia Cordata)', 'Centella', 'Ceramides', 'BHA'],
    heroImage: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80',
    faqs: [
      {
        question: 'What skin concerns does the Anua Heartleaf 77% Toner target?',
        answer: 'It is formulated specifically to calm environmental irritation, reduce skin surface heat, and restore oil-water balance without pore congestion.'
      }
    ]
  },
  'some-by-mi': {
    name: 'SOME BY MI',
    slug: 'some-by-mi',
    countryOfOrigin: 'South Korea',
    city: 'Seoul',
    tagline: 'Miracle of Clean Skin | AHA BHA PHA Dermatology',
    taglineBN: 'আহা বিএইচএ পিএইচএ যুক্ত মিরাকল স্কিন কেয়ার সমাধান',
    description: 'SOME BY MI offers clinical solutions focused on mild exfoliation, skin renewal, and targeted brightening. Famous for its AHA-BHA-PHA 30 Days Miracle line, Yuja Niacin brightening line, and Retinol Intense eye treatments.',
    descriptionBN: 'সাম বাই মি ত্বকের মৃত কোষ দূরীকরণ এবং দাগ নিরাময়ের জন্য বিশ্বখ্যাত। এদের মিরাকল টোনার এবং সিরাম দ্রুত ত্বকের টেক্সচার উন্নত করে।',
    philosophy: 'Clinical grade skin transformation powered by balanced natural exfoliating acids and vitamin botanicals.',
    keyIngredients: ['AHA', 'BHA', 'PHA', 'Tea Tree Leaf Water', 'Yuja Extract', 'Retinol'],
    heroImage: 'https://images.unsplash.com/photo-1512290900672-1f02214644a9?auto=format&fit=crop&w=1200&q=80',
    faqs: [
      {
        question: 'Can I use SOME BY MI AHA BHA PHA toner every day in Bangladesh?',
        answer: 'While gentle enough for daily use on resilient oily skin, beginners or those with sensitive skin should start 2-3 times per week at night, gradually increasing frequency.'
      }
    ]
  },
  'round-lab': {
    name: 'Round Lab',
    slug: 'round-lab',
    countryOfOrigin: 'South Korea',
    city: 'Seoul',
    tagline: 'Pure Waters of Inje and Dokdo | Deep Sea Mineral Hydration',
    taglineBN: 'কোরিয়ার গভীর সমুদ্রের মিনারেল ও বার্চ জুস সমৃদ্ধ ত্বকের আর্দ্রতা',
    description: 'Round Lab sources clean natural ingredients from South Korea’s purest natural reserves: deep sea water from Ulleungdo Dokdo Island and nutrient-rich Birch Juice from Inje. Renowned for its 1025 Dokdo Toner and Birch Juice Moisturizing Sun Cream.',
    descriptionBN: 'রাউন্ড ল্যাব গভীর সমুদ্রের পানি ও বার্চ জুস ব্যবহারের জন্য পুরস্কৃত একটি জনপ্রিয় কোরিয়ান ব্র্যান্ড যা ত্বকে পানির ঘাটতি দূর করে।',
    philosophy: 'Fresh, mineral-rich regional Korean botanicals formulated for everyday barrier nourishment.',
    keyIngredients: ['Dokdo Deep Sea Water', 'Birch Sap (Inje)', 'Hyaluronic Acid', 'Panthenol'],
    heroImage: 'https://images.unsplash.com/photo-1556228722-d0b73c24dfa8?auto=format&fit=crop&w=1200&q=80',
    faqs: [
      {
        question: 'Why is Dokdo 1025 Toner consistently ranked #1 in South Korea?',
        answer: 'Its mineral-rich Hatching EX-07 enzyme technology gently exfoliates dead skin without any friction or harsh acids, making it a cult favorite across Asia.'
      }
    ]
  }
};

/**
 * Normalizes brand name or slug to match BrandSeoProfile
 */
export function getBrandProfileBySlug(slugOrName: string): BrandSeoProfile | null {
  if (!slugOrName) return null;
  const clean = slugOrName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (BRAND_SEO_PROFILES[clean]) {
    return BRAND_SEO_PROFILES[clean];
  }

  // Search by brand name
  const foundKey = Object.keys(BRAND_SEO_PROFILES).find(key => {
    return BRAND_SEO_PROFILES[key].name.toLowerCase() === slugOrName.toLowerCase().trim();
  });

  return foundKey ? BRAND_SEO_PROFILES[foundKey] : null;
}
