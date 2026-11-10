export interface SkincareGuide {
  id: string;
  slug: string;
  title: string;
  titleBN: string;
  excerpt: string;
  excerptBN: string;
  category: 'routine' | 'sun_care' | 'sensitive' | 'acne' | 'dry_skin' | 'authentication' | 'ingredients' | 'layering';
  readingTimeMinutes: number;
  publishedDate: string;
  lastUpdatedDate: string;
  heroImage: string;
  imageAltText: string;
  targetSkinTypes: string[];
  keyIngredients: string[];
  recommendedBrandSlugs: string[];
  content: string;
  contentBN: string;
  faqs: Array<{ question: string; questionBN?: string; answer: string; answerBN?: string }>;
  author?: {
    name: string;
    role: string;
  };
}

export const INITIAL_SKINCARE_GUIDES: SkincareGuide[] = [
  {
    id: 'guide-1',
    slug: 'korean-skincare-routine-for-beginners-in-bangladesh',
    title: 'Korean Skincare Routine for Beginners in Bangladesh',
    titleBN: 'বাংলাদেশে নতুনদের জন্য সহজ কোরিয়ান স্কিন কেয়ার রুটিন',
    excerpt: 'A practical, climate-adapted guide to starting a simplified 4-to-5 step Korean skincare routine suited for Bangladesh’s humid and seasonal weather.',
    excerptBN: 'বাংলাদেশের আবহাওয়া ও আর্দ্রতার সাথে মানানসই সহজ ৪-৫ ধাপের কোরিয়ান রূপচর্চা নির্দেশিকা।',
    category: 'routine',
    readingTimeMinutes: 6,
    publishedDate: '2026-01-15T09:00:00Z',
    lastUpdatedDate: '2026-03-20T11:30:00Z',
    heroImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80',
    imageAltText: 'Korean skincare routine essentials flatlay for beginners in Bangladesh',
    targetSkinTypes: ['All Skin Types', 'Combination', 'Oily'],
    keyIngredients: ['Centella Asiatica', 'Hyaluronic Acid', 'Ceramides', 'Niacinamide'],
    recommendedBrandSlugs: ['cosrx', 'beauty-of-joseon', 'skin1004'],
    author: {
      name: 'Korean Skin Food BD Editorial Team',
      role: 'K-Beauty Cosmeceutical Research'
    },
    content: `
### Starting Your K-Beauty Journey in Bangladesh

While the traditional Korean beauty regimen is famous for its multi-step approach, adopting it in Bangladesh requires thoughtful adaptation. High relative humidity, seasonal monsoons, and urban dust mean that layering heavy, occlusive creams can sometimes cause congested pores. A beginner routine should focus on the essential pillars: gentle cleansing, balancing hydration, barrier repair, and non-negotiable daytime sun protection.

#### The Core 4-Step Simplified Routine

1. **Gentle Low-pH Cleanser (Morning & Night)**:
   Avoid harsh bar soaps or stripping foaming washes that leave the face feeling tight. A balanced cleanser with a pH between 5.0 and 6.0 keeps your acid mantle intact while washing away excess sebum and city grime.

2. **Hydrating Essence or Soothing Toner**:
   Unlike old-school astringent toners containing drying alcohol, Korean toners deliver water-based hydration. Ingredients like Centella Asiatica, Birch Juice, or Heartleaf calm environmental irritation without greasiness.

3. **Lightweight Gel-Cream or Barrier Moisturizer**:
   During Dhaka summers and monsoon months, look for oil-free gel or water-cream formulations containing ceramides or beta-glucan to strengthen barrier resilience. In winter, transition to a slightly richer cream if dryness occurs.

4. **Broad-Spectrum Sunscreen (Morning Routine Only)**:
   Sunscreen is the cornerstone of Korean skin health. Daily exposure to intense UVA/UVB rays in South Asia triggers hyperpigmentation and premature collagen breakdown. Choose lightweight chemical or mineral SPF50+ PA++++ sunscreens that leave zero white cast.

*Disclaimer: Cosmetic products support skin hygiene, hydration, and cosmetic appearance; they are not intended to diagnose, treat, cure, or prevent dermatological medical conditions.*
    `,
    contentBN: `
### বাংলাদেশে কোরিয়ান স্কিন কেয়ার শুরুর প্রাথমিক নিয়ম

কোরিয়ান রূপচর্চায় ত্বকের প্রাকৃতিক আর্দ্রতা রক্ষা এবং ব্যারিয়ার শক্তিশালী রাখাকে সর্বোচ্চ গুরুত্ব দেওয়া হয়। বাংলাদেশের আর্দ্র আবহাওয়ায় অতিরিক্ত ভারী ক্রিম ব্যবহারের চেয়ে হালকা ও কার্যকর ৪-ধাপের রুটিন অনুসরণ করা সবচেয়ে ফলপ্রসূ:

১. **মৃদু লো-পিএইচ ক্লিনজার**: ত্বকের স্বাভাবিক তেল ও পিএইচ ব্যালান্স অক্ষুণ্ণ রেখে পরিষ্কার করে।
২. **হাইড্রেটিং টোনার বা এসেন্স**: অ্যালকোহলমুক্ত টোনার ত্বকের গভীরে পানির সমতা ফিরিয়ে আনে।
৩. **হালকা ময়েশ্চারাইজার**: ত্বকের সুরক্ষাবলয় বা ব্যারিয়ার মজবুত রাখতে সিরামাইড বা সেন্টেলাযুক্ত ময়েশ্চারাইজার।
৪. **সানস্ক্রিন (এসপিএফ ৫০+)**: দিনের বেলা ক্ষতিকর অতিবেগুনী রশ্মি থেকে ত্বককে সুরক্ষিত রাখতে সানস্ক্রিন অপরিহার্য।
    `,
    faqs: [
      {
        question: 'Do I really need all 10 steps of a Korean routine in Bangladesh?',
        answer: 'No. The 10-step routine is a concept rather than a strict requirement. In Bangladesh’s humid tropical climate, a streamlined 4 to 5 step routine focused on cleansing, light hydration, and sunscreen is typically far more effective.'
      },
      {
        question: 'How long before I see visible results from a Korean skincare routine?',
        answer: 'Skin cellular turnover takes approximately 28 days. Hydration and soothing benefits are often noticeable within days, while improvements in texture and tone generally become visible after 4 to 8 weeks of consistent use.'
      }
    ]
  },
  {
    id: 'guide-2',
    slug: 'best-korean-sunscreen-for-oily-skin',
    title: 'Best Korean Sunscreen for Oily Skin in Bangladesh',
    titleBN: 'তৈলাক্ত ত্বকের জন্য সেরা কোরিয়ান সানস্ক্রিন নির্বাচন নির্দেশিকা',
    excerpt: 'How to choose lightweight, sebum-controlling, non-greasy Korean SPF50+ PA++++ sunscreens that stay matte in hot and humid weather.',
    excerptBN: 'গরম ও আর্দ্র আবহাওয়ায় অতিরিক্ত তেল ও চটচটে ভাব ছাড়াই সানস্ক্রিন ব্যবহারের সঠিক কৌশল।',
    category: 'sun_care',
    readingTimeMinutes: 5,
    publishedDate: '2026-01-22T08:00:00Z',
    lastUpdatedDate: '2026-03-18T10:00:00Z',
    heroImage: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=1200&q=80',
    imageAltText: 'Korean sunscreens formulated for oily and combination skin types',
    targetSkinTypes: ['Oily', 'Combination', 'Acne-Prone'],
    keyIngredients: ['Centella Asiatica', 'Silica', 'Niacinamide', 'Tocopherol'],
    recommendedBrandSlugs: ['skin1004', 'beauty-of-joseon', 'anua', 'round-lab'],
    content: `
### Navigating Sun Protection for Oily Skin

One of the most common complaints among skincare users in Bangladesh is that sunscreens feel greasy, cause excessive sweating, or lead to clogged pores. South Korean cosmetic laboratories have pioneered advanced filter stabilization and sebum-absorbing textures specifically designed to offer SPF50+ PA++++ protection with a natural or semi-matte finish.

#### Key Criteria for Oily Skin Formulations

- **Fluid or Serum Textures**: Look for water-fit or chemical filter serum sunscreens (such as the SKIN1004 Madagascar Centella Hyalu-Cica Water-Fit Sun Serum) that absorb instantly without leaving an oily residue.
- **Sebum-Regulating Actives**: Formulations that include silica micro-powders or gentle concentrations of Niacinamide (2-3%) help manage midday shine.
- **Physical (Mineral) vs. Chemical Filters**: If your oily skin is also sensitive or prone to redness, non-nano Zinc Oxide mineral sunscreens provide gentle, heat-reducing surface protection. For seamless daily wear under makeup or high humidity, modern Korean chemical filters offer completely invisible wear.

#### Proper Application Technique
Apply approximately two finger-lengths (1/4 teaspoon) of sunscreen as the final step of your morning skincare routine, 15 minutes prior to sun exposure. Reapply every two to three hours if engaging in outdoor activities or experiencing heavy perspiration.
    `,
    contentBN: `
### তৈলাক্ত ত্বকের জন্য সানস্ক্রিন বাছাইয়ের নিয়মাবলী

তৈলাক্ত ত্বকে ভারী সানস্ক্রিন লাগালে ঘাম ও তেল বেড়ে গিয়ে লোমকূপ বন্ধ হতে পারে। তাই বাংলাদেশের আবহাওয়ায় ওয়াটার-বেসড বা সেরাম টেক্সচারের সানস্ক্রিন সবচেয়ে আরামদায়ক। সেন্টেলা এশিয়াটিকা এবং নিয়াসিনামাইডযুক্ত সানস্ক্রিন অতিরিক্ত তেল নিয়ন্ত্রণ করতে এবং ত্বককে শান্ত রাখতে সাহায্য করে।
    `,
    faqs: [
      {
        question: 'Will Korean sunscreen make my face look greasy in humid Bangladeshi weather?',
        answer: 'Modern Korean chemical and hybrid sunscreens are specifically formulated with quick-absorbing aqueous polymers and hydrating bases that do not leave a heavy or greasy film when applied in recommended amounts.'
      },
      {
        question: 'Can sunscreen replace morning moisturizer for oily skin?',
        answer: 'Yes. In humid weather, individuals with oily skin often find that a hydrating Korean SPF provides sufficient moisture on its own after cleansing and toning.'
      }
    ]
  },
  {
    id: 'guide-3',
    slug: 'korean-skincare-for-sensitive-skin',
    title: 'Korean Skincare for Sensitive Skin: Soothing & Barrier Repair',
    titleBN: 'সংবেদনশীল ত্বকের জন্য কোরিয়ান স্কিন কেয়ার ও স্কিন ব্যারিয়ার নিরাময়',
    excerpt: 'Calm irritation, redness, and environmental sensitivity using gentle, fragrance-free Korean cosmeceuticals rich in Centella and Panthenol.',
    excerptBN: 'লালচে ভাব, চুলকানি ও ত্বকের সংবেদনশীলতা কমাতে কার্যকরী কোরিয়ান রূপচর্চা টিপস।',
    category: 'sensitive',
    readingTimeMinutes: 7,
    publishedDate: '2026-02-01T10:00:00Z',
    lastUpdatedDate: '2026-03-22T09:00:00Z',
    heroImage: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80',
    imageAltText: 'Soothing Korean skincare products for sensitive skin and barrier healing',
    targetSkinTypes: ['Sensitive', 'Reactive', 'Dry'],
    keyIngredients: ['Madecassoside', 'Panthenol', 'Ceramide NP', 'Allantoin'],
    recommendedBrandSlugs: ['skin1004', 'cosrx', 'anua', 'some-by-mi'],
    content: `
### Understanding Sensitive Skin Triggers in Bangladesh

Sensitive and reactive skin in urban Bangladeshi environments is frequently aggravated by vehicle emissions, hard tap water, rapid shifts between air-conditioned indoor spaces and outdoor heat, and over-exfoliation. When the skin's lipid barrier becomes compromised, microscopic gaps permit moisture loss (transepidermal water loss) and allow irritants to penetrate.

#### Golden Rules for Sensitive Skin

1. **Eliminate Artificial Fragrance and Essential Oils**: Choose hypoallergenic formulations that pass clinical patch tests.
2. **Prioritize Barrier Replenishing Lipids**: The stratum corneum requires a physiological ratio of ceramides, cholesterol, and free fatty acids.
3. **Soothing Botanical Actives**:
   - **Centella Asiatica & Madecassoside**: Documented for calming localized erythema (redness).
   - **Panthenol (Pro-Vitamin B5)**: Attracts and binds moisture while accelerating epidermal comfort.
   - **Heartleaf (Houttuynia Cordata)**: Flavonoid-rich plant extract widely used in Seoul clinics for reactive complexions.

Always conduct a 24-hour patch test on your inner arm or jawline before introducing any new formulation into your routine.
    `,
    contentBN: `
### সংবেদনশীল ত্বকের যত্ন ও সতর্কতা

ধুলোবালি, কড়া রোদ এবং অতিরিক্ত ক্ষারযুক্ত প্রসাধনী ব্যবহারের কারণে ত্বকের প্রতিরোধ ক্ষমতা (ব্যারিয়ার) ক্ষতিগ্রস্ত হতে পারে। সংবেদনশীল ত্বকের জন্য সুবাসমুক্ত (Fragrance-free) এবং অ্যালকোহলমুক্ত প্রডাক্ট ব্যবহার করা অত্যন্ত জরুরি। সেন্টেলা, প্যান্থেনল ও সিরামাইডযুক্ত উপাদান ত্বকের লালচে ভাব কমাতে সহায়ক।
    `,
    faqs: [
      {
        question: 'What is the first step to take if my skin barrier is damaged?',
        answer: 'Immediately pause all active chemical exfoliants (AHA, BHA) and retinoids. Strip your routine down to a gentle cleanser, a ceramide/panthenol barrier cream, and mineral sunscreen until sensitivity subsides.'
      }
    ]
  },
  {
    id: 'guide-4',
    slug: 'how-to-build-a-skincare-routine-for-acne-prone-skin',
    title: 'How to Build a Korean Skincare Routine for Acne-Prone Skin',
    titleBN: 'ব্রণ প্রবণ ত্বকের জন্য কার্যকরী কোরিয়ান স্কিন কেয়ার রুটিন',
    excerpt: 'Address clogged pores and breakouts gently without stripping moisture, using gentle BHA, tea tree, and calming propolis.',
    excerptBN: 'ব্রণের সমস্যা নিয়ন্ত্রণ ও লোমকূপ পরিষ্কার রাখার নিরাপদ কোরিয়ান উপায়।',
    category: 'acne',
    readingTimeMinutes: 6,
    publishedDate: '2026-02-08T11:00:00Z',
    lastUpdatedDate: '2026-03-25T14:00:00Z',
    heroImage: 'https://images.unsplash.com/photo-1512290900672-1f02214644a9?auto=format&fit=crop&w=1200&q=80',
    imageAltText: 'Korean skincare for acne-prone skin with gentle calming toners',
    targetSkinTypes: ['Acne-Prone', 'Oily', 'Combination'],
    keyIngredients: ['Betaine Salicylate', 'Tea Tree', 'Propolis', 'Heartleaf'],
    recommendedBrandSlugs: ['cosrx', 'anua', 'some-by-mi'],
    content: `
### Managing Breakouts Without Skin Stripping

Traditional Western acne regimens often rely on high concentrations of benzoyl peroxide or alcohol, which can leave the skin parched and peel-prone. Korean dermatology takes a distinct, holistic approach: clear pores gently with lipophilic beta-hydroxy acids while concurrently flooding the skin with antibacterial, soothing botanical hydration.

#### Structured Anti-Breakout Steps

- **Step 1: Double Cleanse in the Evening**: Start with a lightweight, non-comedogenic cleansing oil or micellar water to dissolve stubborn sunscreen and sebum, followed by a gentle foaming wash.
- **Step 2: Mild Exfoliation (2-3 Times Weekly)**: Use Betaine Salicylate (a gentler alternative to pure salicylic acid favored in Korean regulations) to dissolve dead skin cells within follicular walls.
- **Step 3: Antibacterial Hydration**: Propolis and Tea Tree extracts soothe inflammation without drying out the surrounding skin.
- **Step 4: Hydrocolloid Pimple Patches**: A hallmark K-Beauty innovation. These protective stickers draw out exudate from active blemishes while protecting them from dust and picking.
    `,
    contentBN: `
### ব্রণ নিয়ন্ত্রণে কোরিয়ান পদ্ধতির বৈশিষ্ট্য

অতিরিক্ত কড়া উপাদান দিয়ে মুখ শুষ্ক করার বদলে কোরিয়ান পদ্ধতিতে ত্বকের গভীরে ময়লা দূর করার পাশাপাশি পর্যাপ্ত আর্দ্রতা ধরে রাখা হয়। সপ্তাহে ২-৩ দিন মাইল্ড বিএইচএ এক্সফোলিয়েটর এবং প্রতিদিন টি-ট্রি বা প্রোপোলিসযুক্ত হালকা সেরাম ব্যবহারে ত্বক পরিচ্ছন্ন থাকে।
    `,
    faqs: [
      {
        question: 'Can double cleansing cause acne or breakouts?',
        answer: 'When performed with a properly formulating emulsifying cleansing oil that completely rinses off with warm water followed by a water-based wash, double cleansing thoroughly clears pores and prevents breakout-causing sunscreen build-up.'
      }
    ]
  },
  {
    id: 'guide-5',
    slug: 'korean-moisturizer-for-dry-skin',
    title: 'Choosing the Best Korean Moisturizer for Dry Skin',
    titleBN: 'শুষ্ক ত্বকের জন্য সঠিক কোরিয়ান ময়েশ্চারাইজার নির্বাচন',
    excerpt: 'Replenish lost lipids and achieve lasting hydration with deeply nourishing Korean creams featuring ceramides and snail mucin.',
    excerptBN: 'রুক্ষ ও শুষ্ক ত্বককে কোমল এবং দীপ্তিময় রাখার সেরা উপায়।',
    category: 'dry_skin',
    readingTimeMinutes: 5,
    publishedDate: '2026-02-14T09:30:00Z',
    lastUpdatedDate: '2026-03-24T12:00:00Z',
    heroImage: 'https://images.unsplash.com/photo-1556228722-d0b73c24dfa8?auto=format&fit=crop&w=1200&q=80',
    imageAltText: 'Korean moisturizing creams and hydrating barrier lotions',
    targetSkinTypes: ['Dry', 'Very Dry', 'Normal'],
    keyIngredients: ['Snail Secretion Filtrate', 'Ceramides', 'Glycerin', 'Squalane'],
    recommendedBrandSlugs: ['cosrx', 'beauty-of-joseon', 'round-lab'],
    content: `
### Overcoming Dry and Dehydrated Skin

Dry skin lacks natural sebum (lipids), while dehydrated skin lacks water. Many individuals in Bangladesh experience both—especially during cool winter months or due to continuous air conditioner exposure. Korean moisturizers excel because they master the science of combining **humectants** (which draw water into the skin), **emollients** (which smooth rough flakes), and **occlusives** (which seal moisture in).

#### Key Ingredients for Deep Moisture
- **Snail Secretion Filtrate (e.g., COSRX Snail 92 All in One Cream)**: Rich in mucopolysaccharides and glycoproteins that support elasticity and comfort.
- **Multi-Weight Hyaluronic Acid**: Ensures moisture reaches different strata of the epidermis.
- **Plant-Derived Squalane**: Mimics natural human sebum without feeling greasy or heavy.
    `,
    contentBN: `
### শুষ্ক ত্বকের আর্দ্রতা নিশ্চিতকরণ

শুষ্ক ত্বকে প্রাকৃতিক তেলের ঘাটতি থাকে, ফলে ত্বক খসখসে হয়ে পড়ে। কোরিয়ান স্নাইল মিউসিন এবং সিরামাইডযুক্ত ক্রিম ত্বকের আর্দ্রতা ধরে রেখে দীর্ঘক্ষণ নরম ও মসৃণ রাখতে সাহায্য করে।
    `,
    faqs: [
      {
        question: 'Should I apply moisturizer to damp or dry skin?',
        answer: 'Always apply your moisturizer onto slightly damp skin immediately after your toner or essence. This traps water molecules inside the outer skin layer.'
      }
    ]
  },
  {
    id: 'guide-6',
    slug: 'how-to-identify-authentic-korean-skincare-products',
    title: 'How to Identify Authentic Korean Skincare Products in Bangladesh',
    titleBN: 'বাংলাদেশে আসল কোরিয়ান কসমেটিকস চেনার নির্ভুল উপায়',
    excerpt: 'A comprehensive consumer guide to verifying genuine Korean beauty products, barcode checks, packaging details, and avoiding counterfeit goods.',
    excerptBN: 'নকল কসমেটিকস থেকে সাবধান: আসল কোরিয়ান প্রডাক্ট চেনার বাস্তবসম্মত পরামর্শ।',
    category: 'authentication',
    readingTimeMinutes: 7,
    publishedDate: '2026-02-20T10:00:00Z',
    lastUpdatedDate: '2026-03-26T16:00:00Z',
    heroImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
    imageAltText: 'Korean skincare barcode authentication and verification guide',
    targetSkinTypes: ['All Skin Types'],
    keyIngredients: ['Barcode Standards', 'Korean Labeling (Hangul)', 'Batch Codes'],
    recommendedBrandSlugs: ['cosrx', 'beauty-of-joseon', 'skin1004'],
    content: `
### Protecting Your Skin from Counterfeit Products

Due to the skyrocketing popularity of K-Beauty in Bangladesh, unauthorized copies and counterfeit batches have proliferated across social media marketplaces. Applying counterfeit skincare can lead to contact dermatitis, chemical burns, or bacterial infections due to substandard formulation conditions.

#### Real Ways to Verify Authenticity

1. **Check EAN-13 Barcodes (880 Prefix)**:
   South Korean manufactured goods utilize the GS1 country code prefix **880**. While a barcode alone can be photocopied, valid verification apps will resolve to the legitimate manufacturer record.

2. **Inspect Packaging Typography & Hangul Text**:
   Authentic Korean brands maintain strict packaging standards. Look for crisp, precise printing without typos, misalignment, or faded inks. Korean regulatory text (화장품제조업자 / 제조판매업자) must be cleanly legible.

3. **Batch Codes & Expiration Stamping**:
   Genuine products display lot codes and standard Korean expiry formats like "EXP YYYYMMDD" or "까지" (until).

4. **Source Reliability**:
   Purchase only through vendors with transparent business registrations, verified customer feedback, and climate-controlled storage facilities in Bangladesh.
    `,
    contentBN: `
### নকল প্রসাধনী থেকে সতর্ক থাকুন

বাজারে জনপ্রিয় কোরিয়ান প্রডাক্টের অনেক নকল সংস্করণ পাওয়া যায়। আসল প্রডাক্ট চেনার জন্য পণ্যের বারকোড (কোরিয়ান পণ্যের বারকোড সাধারণত ৮৮০ দিয়ে শুরু হয়), প্যাকেজিংয়ের লেখার স্পষ্টতা, ব্যাচ কোড এবং মেয়াদের তারিখ (EXP) সতর্কতার সাথে যাচাই করুন।
    `,
    faqs: [
      {
        question: 'Does an 880 barcode guarantee 100% authenticity?',
        answer: 'Not on its own, because counterfeiters can copy a barcode number. It must be paired with genuine packaging textures, correct batch stamp formats, and verified supply chains.'
      }
    ]
  },
  {
    id: 'guide-7',
    slug: 'understanding-centella-asiatica-in-skincare',
    title: 'Understanding Centella Asiatica in Skincare: The Cica Miracle',
    titleBN: 'ত্বকের রূপচর্চায় সেন্টেলা এশিয়াটিকা (সিকা) এর ভূমিকা ও কার্যকারিতা',
    excerpt: 'Explore the dermatological science behind Centella Asiatica (Gotu Kola) and its four active triterpenoids for redness reduction and barrier repair.',
    excerptBN: 'সংবেদনশীল ত্বকের মহৌষধ সেন্টেলা এশিয়াটিকার বৈজ্ঞানিক গুণাবলী।',
    category: 'ingredients',
    readingTimeMinutes: 5,
    publishedDate: '2026-02-27T08:30:00Z',
    lastUpdatedDate: '2026-03-25T11:00:00Z',
    heroImage: 'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=1200&q=80',
    imageAltText: 'Fresh Centella Asiatica leaf botanical ingredient in K-Beauty',
    targetSkinTypes: ['Sensitive', 'Irritated', 'All Skin Types'],
    keyIngredients: ['Madecassoside', 'Asiaticoside', 'Madecassic Acid', 'Asiatic Acid'],
    recommendedBrandSlugs: ['skin1004', 'cosrx', 'purito-seoul'],
    content: `
### The Science of "Cica"

Centella Asiatica, known locally in South Asia as Gotu Kola or Thankuni, has been utilized for centuries in traditional healing. In Korean cosmeceuticals, purified Centella extract has become the gold standard ingredient for soothing compromised, stressed, or sun-damaged skin.

#### The Four Key Phytochemicals
- **Madecassoside**: Known for calming redness and supporting skin renewal.
- **Asiaticoside**: Promotes hydration and structural balance.
- **Madecassic Acid & Asiatic Acid**: Aid in reducing irritation caused by environmental aggressors.

Centella is safe for daily, long-term use across morning and evening routines and pairs harmoniously with most other active skincare ingredients.
    `,
    contentBN: `
### সেন্টেলা এশিয়াটিকা বা থানকুনি পাতার শক্তি

কোরিয়ান রূপচর্চায় 'সিকা' (Cica) নামেই এটি সর্বাধিক পরিচিত। এটি ত্বকের পোড়া ভাব, লালচে দাগ এবং অতি সংবেদনশীলতা দ্রুত প্রশমিত করতে আন্তর্জাতিকভাবে সমাদৃত।
    `,
    faqs: [
      {
        question: 'Can Centella Asiatica be used together with Vitamin C or Retinol?',
        answer: 'Yes. Centella is an ideal soothing partner when using stronger actives like Vitamin C or Retinol, as it mitigates potential stinging and barrier irritation.'
      }
    ]
  },
  {
    id: 'guide-8',
    slug: 'niacinamide-uses-and-precautions',
    title: 'Niacinamide in Skincare: Benefits, Optimal Concentrations & Precautions',
    titleBN: 'নিয়াসিনামাইড ব্যবহারের সঠিক নিয়ম ও প্রয়োজনীয় সতর্কতা',
    excerpt: 'How Vitamin B3 refines enlarged pores, evens skin tone, and regulates excess oil without irritating your skin barrier.',
    excerptBN: 'উজ্জ্বল ও তেলমুক্ত ত্বকের জন্য ভিটামিন বি৩ ব্যবহারের বৈজ্ঞানিক দিকনির্দেশনা।',
    category: 'ingredients',
    readingTimeMinutes: 6,
    publishedDate: '2026-03-05T09:00:00Z',
    lastUpdatedDate: '2026-03-24T15:00:00Z',
    heroImage: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1200&q=80',
    imageAltText: 'Niacinamide serum dropper bottle and pure cosmetic actives',
    targetSkinTypes: ['Oily', 'Combination', 'Hyperpigmented'],
    keyIngredients: ['Niacinamide (Vitamin B3)', 'Zinc PCA', 'Hyaluronic Acid'],
    recommendedBrandSlugs: ['beauty-of-joseon', 'anua', 'cosrx'],
    content: `
### Demystifying Niacinamide (Vitamin B3)

Niacinamide is one of dermatology's most versatile, multi-tasking cosmeceutical ingredients. It supports the synthesis of epidermal ceramides, helps inhibit the transfer of melanin to surface skin cells (brightening stubborn post-acne dark marks), and moderates sebum production.

#### The Concentration Sweet Spot: 2% to 5%
While marketing often promotes ultra-high 10% to 20% formulations, dermatological clinical trials demonstrate that **2% to 5% Niacinamide** achieves peak clinical efficacy with minimal risk of flushing or contact irritation. Most Korean toners and serums deliberately formulate within this balanced 2-5% window.
    `,
    contentBN: `
### নিয়াসিনামাইড ব্যবহারের সঠিক মাত্রা

অনেকে মনে করেন বেশি পার্সেন্টেজ মানেই দ্রুত কাজ হবে, তবে নিয়াসিনামাইডের ক্ষেত্রে ২% থেকে ৫% ঘনত্ব ত্বকের জন্য সবচেয়ে নিরাপদ ও কার্যকর। এটি অতিরিক্ত তেল কমায় এবং ব্রণের পরবর্তী কালো দাগ দূর করতে সাহায্য করে।
    `,
    faqs: [
      {
        question: 'Can Niacinamide cause skin purging?',
        answer: 'True cell-turnover purging does not occur with Niacinamide. If bumps or redness appear, it is typically irritation caused by an overly high concentration (e.g., 10%+) or an allergic sensitivity to a specific formula.'
      }
    ]
  },
  {
    id: 'guide-9',
    slug: 'how-to-layer-korean-skincare-products',
    title: 'How to Layer Korean Skincare Products Correctly',
    titleBN: 'কোরিয়ান স্কিন কেয়ার প্রডাক্ট লেয়ারিং করার সঠিক নিয়ম',
    excerpt: 'Master the order of application: from thinnest water-like textures to rich protective moisturizers and SPF for maximum absorption.',
    excerptBN: 'কোন প্রডাক্টের পর কোনটা লাগাবেন? লেয়ারিংয়ের সহজ বিজ্ঞানসম্মত নিয়ম।',
    category: 'layering',
    readingTimeMinutes: 5,
    publishedDate: '2026-03-12T10:30:00Z',
    lastUpdatedDate: '2026-03-26T12:00:00Z',
    heroImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80',
    imageAltText: 'Correct layering order of Korean skincare toners serums and creams',
    targetSkinTypes: ['All Skin Types'],
    keyIngredients: ['Viscosity Rules', 'Humectants', 'Emollients', 'Occlusives'],
    recommendedBrandSlugs: ['cosrx', 'beauty-of-joseon', 'skin1004', 'round-lab'],
    content: `
### The Golden Rule of Skincare Layering

The scientific principle behind cosmetic layering is straightforward: **Apply formulas from thinnest (most aqueous) viscosity to thickest (most occlusive) texture.**

#### Standard Order of Application:
1. **Oil Cleanser** (PM only, on dry skin)
2. **Water-based Cleanser** (AM & PM)
3. **Wash-off or Chemical Exfoliant** (2x weekly)
4. **Hydrating Toner / First Essence**
5. **Serum / Ampoule**
6. **Eye Cream** (Optional)
7. **Emulsion or Moisturizer**
8. **Sunscreen (AM only, non-negotiable)**
    `,
    contentBN: `
### প্রডাক্ট ব্যবহারের ধারাবাহিকতা

স্কিন কেয়ারের মূল নিয়ম হলো: সবচেয়ে পাতলা বা তরল উপাদান আগে লাগানো এবং ক্রমান্বয়ে ঘন উপাদান লাগানো। পানি জাতীয় টোনার আগে, তারপর সিরাম, তারপর ময়েশ্চারাইজার এবং দিনের বেলা সবশেষে সানস্ক্রিন।
    `,
    faqs: [
      {
        question: 'How long should I wait between each step?',
        answer: 'You do not need to wait long intervals. 30 to 60 seconds until the previous layer feels mostly absorbed is optimal, except for sunscreen which should set for 5-10 minutes before applying makeup.'
      }
    ]
  },
  {
    id: 'guide-10',
    slug: 'choosing-skincare-products-according-to-skin-type',
    title: 'Choosing Korean Skincare According to Your Skin Type',
    titleBN: 'আপনার ত্বকের ধরন অনুযায়ী সঠিক কোরিয়ান প্রডাক্ট নির্বাচন',
    excerpt: 'How to accurately test your skin type at home and select targeted K-Beauty formulations for oily, dry, combination, or sensitive skin in Bangladesh.',
    excerptBN: 'নিজের ত্বকের ধরন চেনার উপায় এবং সঠিক প্রডাক্ট নির্বাচনের পূর্ণাঙ্গ গাইড।',
    category: 'routine',
    readingTimeMinutes: 6,
    publishedDate: '2026-03-16T11:00:00Z',
    lastUpdatedDate: '2026-03-27T10:00:00Z',
    heroImage: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80',
    imageAltText: 'Skin type analysis and matching Korean skincare bottles',
    targetSkinTypes: ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive'],
    keyIngredients: ['Skin Typology', 'Sebum Mapping', 'Transepidermal Water Loss'],
    recommendedBrandSlugs: ['cosrx', 'beauty-of-joseon', 'skin1004', 'anua'],
    content: `
### The Bare-Faced Skin Type Test

Before purchasing any skincare product, you must accurately determine your current skin state:
1. Wash your face with a mild, non-stripping cleanser.
2. Gently pat dry with a clean towel.
3. **Do not apply any toners, serums, or creams for 60 minutes.**
4. Observe your skin under natural light:
   - **Oily**: Noticeable shine across your entire face (forehead, nose, cheeks, chin).
   - **Combination**: Oily sheen on the T-zone (forehead, nose), but normal or tight on the cheeks.
   - **Dry**: Tightness, dullness, or fine flaking; no visible shine.
   - **Normal**: Comfortable and balanced without excess oil or tightness.
    `,
    contentBN: `
### ঘরে বসে ত্বকের ধরন বোঝার পরীক্ষা

মুখ হালকা ক্লিনজার দিয়ে ধুয়ে ১ ঘণ্টা কোনো প্রডাক্ট না লাগিয়ে রেখে দিন। পুরো মুখ চকচক করলে তা তৈলাক্ত ত্বক; শুধু কপাল ও নাক তৈলাক্ত কিন্তু গাল স্বাভাবিক হলে তা কম্বিনেশন ত্বক; আর ত্বক টানটান বা খসখসে লাগলে তা শুষ্ক ত্বক।
    `,
    faqs: [
      {
        question: 'Can my skin type change over time?',
        answer: 'Yes. Skin state shifts with climate variations (summer humidity vs. winter dryness in Bangladesh), hormonal changes, age, and lifestyle.'
      }
    ]
  }
];
