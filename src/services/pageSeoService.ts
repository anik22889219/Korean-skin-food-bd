import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import {
  PageSeoConfig,
  PageSeoFaqItem,
  Product,
  SeoPageCategoryType,
} from '../types';
import { SkincareGuide } from '../data/skincareGuides';
import { BRAND_SEO_PROFILES } from '../data/brandProfiles';
import { INGREDIENT_LIBRARY, taxonomiesToIngredientGuideEntries } from '../data/ingredientLibrary';
import { SKIN_CONCERN_LIBRARY, taxonomiesToSkinConcernEntries } from '../data/skinConcerns';
import { taxonomyService } from './taxonomyService';
import {
  buildAuthenticitySeo,
  buildBrandSeo,
  buildCategorySeo,
  buildConcernSeo,
  buildGuideSeo,
  buildHomepageSeo,
  buildIngredientSeo,
  buildProductSeo,
  buildRoutineBuilderSeo,
  buildSkinQuizSeo,
  buildStaticPageSeo,
  DEFAULT_OG_IMAGE,
  SeoMetadata,
  buildCanonicalUrl,
} from './seoService';
import { encodeSeoPageDocId, normalizeSeoPath } from '../utils/seoPath';
import { getProductPath } from '../utils/productSlug';

export interface DiscoveredWebsitePage {
  id: string;
  path: string;
  pageType: SeoPageCategoryType;
  label: string;
  subtitle?: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultOgImage: string;
  defaultOgImageAlt: string;
  defaultOgType: 'website' | 'product' | 'article';
  defaultKeywords: string[];
  defaultFaqs: PageSeoFaqItem[];
  product?: Product;
}

let pagesCache: PageSeoConfig[] = [];
const subscribers = new Set<(pages: PageSeoConfig[]) => void>();
let listenerInitialized = false;

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try {
      cb(pagesCache);
    } catch (err) {
      console.error('[PageSeoService] Subscriber notification error:', err);
    }
  });
}

function ensureListener() {
  if (listenerInitialized || typeof window === 'undefined') return;
  listenerInitialized = true;
  try {
    onSnapshot(
      collection(db, 'seo_pages'),
      (snapshot) => {
        const items: PageSeoConfig[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as PageSeoConfig;
          if (data && data.path) {
            items.push({
              ...data,
              id: docSnap.id || data.id,
              path: normalizeSeoPath(data.path),
            });
          }
        });
        pagesCache = items;
        notifySubscribers();
      },
      (err) => {
        console.warn('[PageSeoService] seo_pages onSnapshot warning:', err);
        if (
          err?.code === 'permission-denied' ||
          err?.message?.includes('permission') ||
          err?.message?.includes('Permission')
        ) {
          handleFirestoreError(err, OperationType.GET, 'seo_pages', false);
        }
      }
    );
  } catch (err) {
    console.warn('[PageSeoService] Listener init warning:', err);
  }
}

ensureListener();

export const pageSeoService = {
  getAll(): PageSeoConfig[] {
    ensureListener();
    return pagesCache;
  },

  subscribe(callback: (pages: PageSeoConfig[]) => void): () => void {
    ensureListener();
    subscribers.add(callback);
    callback(pagesCache);
    return () => {
      subscribers.delete(callback);
    };
  },

  getForPath(pathWithQuery?: string, pathnameFallback?: string): PageSeoConfig | null {
    ensureListener();
    if (!pathWithQuery && !pathnameFallback) return null;

    if (pathWithQuery) {
      const normalizedFull = normalizeSeoPath(pathWithQuery);
      const exactMatch = pagesCache.find((p) => p.path === normalizedFull);
      if (exactMatch) return exactMatch;
    }

    if (pathnameFallback && pathnameFallback !== pathWithQuery) {
      const normalizedPath = normalizeSeoPath(pathnameFallback);
      const pathMatch = pagesCache.find((p) => p.path === normalizedPath);
      if (pathMatch) return pathMatch;
    }

    return null;
  },

  async savePageSeo(
    input: Omit<PageSeoConfig, 'id' | 'updatedAt'> & { id?: string },
    updatedBy?: string
  ): Promise<PageSeoConfig> {
    const normalizedPath = normalizeSeoPath(input.path);
    const id = encodeSeoPageDocId(normalizedPath);

    const cleanedFaqs: PageSeoFaqItem[] = (input.faqs || [])
      .map((f) => ({
        question: (f.question || '').trim().slice(0, 300),
        answer: (f.answer || '').trim().slice(0, 2000),
      }))
      .filter((f) => f.question.length > 0 && f.answer.length > 0)
      .slice(0, 25);

    const cleanedKeywords = (input.keywords || [])
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 30);

    const payload: PageSeoConfig = {
      id,
      path: normalizedPath,
      pageType: input.pageType || 'custom',
      label: (input.label || normalizedPath).trim().slice(0, 200),
      metaTitle: (input.metaTitle || '').trim().slice(0, 200),
      metaDescription: (input.metaDescription || '').trim().slice(0, 500),
      ogImage: (input.ogImage || '').trim().slice(0, 1200) || undefined,
      ogImageAlt: (input.ogImageAlt || '').trim().slice(0, 300) || undefined,
      keywords: cleanedKeywords,
      canonicalUrl: (input.canonicalUrl || '').trim().slice(0, 600) || undefined,
      ogType: input.ogType || 'website',
      noindex: Boolean(input.noindex),
      faqs: cleanedFaqs,
      showFaqsOnPage: input.showFaqsOnPage !== false,
      customJsonLd: (input.customJsonLd || '').trim().slice(0, 16000) || undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy ? updatedBy.slice(0, 200) : undefined,
    };

    const sanitized = sanitizeForFirestore(payload);

    try {
      await setDoc(doc(db, 'seo_pages', id), sanitized);
      pagesCache = [...pagesCache.filter((p) => p.id !== id), sanitized];
      notifySubscribers();
      return sanitized;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `seo_pages/${id}`);
      throw err;
    }
  },

  async deletePageSeo(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'seo_pages', id));
      pagesCache = pagesCache.filter((p) => p.id !== id);
      notifySubscribers();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `seo_pages/${id}`);
      throw err;
    }
  },
};

export function mergePageSeoMetadata(
  base: SeoMetadata,
  override?: PageSeoConfig | null
): SeoMetadata {
  if (!override) return base;

  const baseSchemas = Array.isArray(base.jsonLd)
    ? [...base.jsonLd]
    : base.jsonLd
      ? [base.jsonLd]
      : [];

  let nextSchemas = [...baseSchemas];

  if (override.faqs && override.faqs.length > 0) {
    const validFaqs = override.faqs.filter((f) => f.question?.trim() && f.answer?.trim());
    if (validFaqs.length > 0) {
      nextSchemas = nextSchemas.filter((s) => s?.['@type'] !== 'FAQPage');
      nextSchemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: validFaqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question.trim(),
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer.trim(),
          },
        })),
      });
    }
  }

  if (override.customJsonLd && override.customJsonLd.trim()) {
    try {
      const parsed = JSON.parse(override.customJsonLd);
      if (Array.isArray(parsed)) {
        nextSchemas.push(...parsed);
      } else if (parsed && typeof parsed === 'object') {
        nextSchemas.push(parsed);
      }
    } catch {
      // Ignore invalid custom JSON-LD
    }
  }

  return {
    ...base,
    title: override.metaTitle?.trim() || base.title,
    description: override.metaDescription?.trim() || base.description,
    canonicalUrl: override.canonicalUrl?.trim()
      ? buildCanonicalUrl(override.canonicalUrl.trim())
      : base.canonicalUrl,
    keywords:
      override.keywords && override.keywords.length > 0 ? override.keywords : base.keywords,
    ogType: override.ogType || base.ogType,
    ogImage: override.ogImage?.trim() || base.ogImage,
    ogImageAlt: override.ogImageAlt?.trim() || base.ogImageAlt,
    noindex: typeof override.noindex === 'boolean' ? override.noindex : base.noindex,
    jsonLd: nextSchemas.length > 0 ? nextSchemas : base.jsonLd,
  };
}

/**
 * Discovers every route across the entire Korean Skin Food BD website
 * so admins can edit Meta Title, Meta Description, Meta Image, FAQs, and Product Links from one place.
 */
export function discoverWebsitePages(
  products: Product[],
  guides: SkincareGuide[],
  savedOverrides: PageSeoConfig[]
): DiscoveredWebsitePage[] {
  const discovered: DiscoveredWebsitePage[] = [];
  const seenPaths = new Set<string>();

  const pushEntry = (entry: DiscoveredWebsitePage) => {
    const normalized = normalizeSeoPath(entry.path);
    if (seenPaths.has(normalized)) return;
    seenPaths.add(normalized);
    discovered.push({
      ...entry,
      id: encodeSeoPageDocId(normalized),
      path: normalized,
    });
  };

  // 1. Core & Informational Pages
  const homeSeo = buildHomepageSeo();
  pushEntry({
    id: '',
    path: '/',
    pageType: 'core',
    label: 'Homepage',
    subtitle: 'Storefront landing page',
    defaultTitle: homeSeo.title,
    defaultDescription: homeSeo.description,
    defaultOgImage: homeSeo.ogImage || DEFAULT_OG_IMAGE,
    defaultOgImageAlt: homeSeo.ogImageAlt || homeSeo.title,
    defaultOgType: 'website',
    defaultKeywords: homeSeo.keywords || [],
    defaultFaqs: [],
  });

  const shopSeo = buildCategorySeo('All');
  pushEntry({
    id: '',
    path: '/shop',
    pageType: 'core',
    label: 'Shop All Products',
    subtitle: 'Full catalog & filters',
    defaultTitle: shopSeo.title,
    defaultDescription: shopSeo.description,
    defaultOgImage: shopSeo.ogImage || DEFAULT_OG_IMAGE,
    defaultOgImageAlt: shopSeo.ogImageAlt || shopSeo.title,
    defaultOgType: 'website',
    defaultKeywords: shopSeo.keywords || [],
    defaultFaqs: [],
  });

  const brandsIndexSeo = buildStaticPageSeo(
    'Korean Skincare Brands in Bangladesh',
    'Explore official Korean skincare brands available at Korean Skin Food BD including COSRX, Beauty of Joseon, SKIN1004, Anua, Some By Mi, and Round Lab.',
    '/brands',
    ['Korean skincare brands Bangladesh', 'COSRX BD', 'Beauty of Joseon BD']
  );
  pushEntry({
    id: '',
    path: '/brands',
    pageType: 'core',
    label: 'Brands Directory',
    subtitle: 'All Korean skincare brands',
    defaultTitle: brandsIndexSeo.title,
    defaultDescription: brandsIndexSeo.description,
    defaultOgImage: brandsIndexSeo.ogImage || DEFAULT_OG_IMAGE,
    defaultOgImageAlt: brandsIndexSeo.ogImageAlt || brandsIndexSeo.title,
    defaultOgType: 'website',
    defaultKeywords: brandsIndexSeo.keywords || [],
    defaultFaqs: [],
  });

  const guidesIndexSeo = buildStaticPageSeo(
    'Korean Skincare Guides & Routines',
    'Evidence-conscious Korean skincare guides tailored for Bangladesh weather and skin concerns.',
    '/guides',
    ['Korean skincare guides BD', 'Skincare routine Bangladesh']
  );
  pushEntry({
    id: '',
    path: '/guides',
    pageType: 'core',
    label: 'Skincare Guides Hub',
    subtitle: 'Editorial knowledge base',
    defaultTitle: guidesIndexSeo.title,
    defaultDescription: guidesIndexSeo.description,
    defaultOgImage: guidesIndexSeo.ogImage || DEFAULT_OG_IMAGE,
    defaultOgImageAlt: guidesIndexSeo.ogImageAlt || guidesIndexSeo.title,
    defaultOgType: 'website',
    defaultKeywords: guidesIndexSeo.keywords || [],
    defaultFaqs: [],
  });

  const ingredientsIndexSeo = buildIngredientSeo();
  pushEntry({
    id: '',
    path: '/ingredients',
    pageType: 'core',
    label: 'Ingredients Library',
    subtitle: 'Active & soothing ingredients guide',
    defaultTitle: ingredientsIndexSeo.title,
    defaultDescription: ingredientsIndexSeo.description,
    defaultOgImage: ingredientsIndexSeo.ogImage || DEFAULT_OG_IMAGE,
    defaultOgImageAlt: ingredientsIndexSeo.ogImageAlt || ingredientsIndexSeo.title,
    defaultOgType: 'website',
    defaultKeywords: ingredientsIndexSeo.keywords || [],
    defaultFaqs: [],
  });

  const concernsIndexSeo = buildConcernSeo();
  pushEntry({
    id: '',
    path: '/concerns',
    pageType: 'core',
    label: 'Skin Concerns Library',
    subtitle: 'Acne, dark spots, barrier & SPF',
    defaultTitle: concernsIndexSeo.title,
    defaultDescription: concernsIndexSeo.description,
    defaultOgImage: concernsIndexSeo.ogImage || DEFAULT_OG_IMAGE,
    defaultOgImageAlt: concernsIndexSeo.ogImageAlt || concernsIndexSeo.title,
    defaultOgType: 'website',
    defaultKeywords: concernsIndexSeo.keywords || [],
    defaultFaqs: [],
  });

  const authSeo = buildAuthenticitySeo();
  pushEntry({
    id: '',
    path: '/authenticity',
    pageType: 'core',
    label: 'Authenticity & Inspection',
    subtitle: 'Batch code & return policy',
    defaultTitle: authSeo.title,
    defaultDescription: authSeo.description,
    defaultOgImage: authSeo.ogImage || DEFAULT_OG_IMAGE,
    defaultOgImageAlt: authSeo.ogImageAlt || authSeo.title,
    defaultOgType: 'website',
    defaultKeywords: authSeo.keywords || [],
    defaultFaqs: [],
  });

  const quizSeo = buildSkinQuizSeo();
  pushEntry({
    id: '',
    path: '/skin-quiz',
    pageType: 'core',
    label: 'Skin Profile Quiz',
    subtitle: 'Interactive skin type matcher',
    defaultTitle: quizSeo.title,
    defaultDescription: quizSeo.description,
    defaultOgImage: quizSeo.ogImage || DEFAULT_OG_IMAGE,
    defaultOgImageAlt: quizSeo.ogImageAlt || quizSeo.title,
    defaultOgType: 'website',
    defaultKeywords: quizSeo.keywords || [],
    defaultFaqs: [],
  });

  const routineSeo = buildRoutineBuilderSeo();
  pushEntry({
    id: '',
    path: '/routine-builder',
    pageType: 'core',
    label: 'AM & PM Routine Builder',
    subtitle: 'Step-by-step routine planner',
    defaultTitle: routineSeo.title,
    defaultDescription: routineSeo.description,
    defaultOgImage: routineSeo.ogImage || DEFAULT_OG_IMAGE,
    defaultOgImageAlt: routineSeo.ogImageAlt || routineSeo.title,
    defaultOgType: 'website',
    defaultKeywords: routineSeo.keywords || [],
    defaultFaqs: [],
  });

  const staticPages: Array<{
    path: string;
    label: string;
    subtitle: string;
    title: string;
    description: string;
    keywords: string[];
  }> = [
    {
      path: '/about-us',
      label: 'About Us',
      subtitle: 'Store story & Seoul sourcing',
      title: 'About Korean Skin Food BD',
      description:
        'Learn about Korean Skin Food BD, our authentic Seoul sourcing standards, climate-controlled Dhaka storage, and customer care across Bangladesh.',
      keywords: ['About Korean Skin Food BD', 'Authentic Korean skincare Dhaka'],
    },
    {
      path: '/contact-us',
      label: 'Contact Us',
      subtitle: 'Support, Dhaka store & WhatsApp',
      title: 'Contact Us',
      description:
        'Get in touch with Korean Skin Food BD for skincare consultations, order tracking, wholesale inquiries, and Dhaka support.',
      keywords: ['Contact Korean Skin Food BD', 'Korean skincare support Dhaka'],
    },
    {
      path: '/become-a-creator',
      label: 'Become a Creator',
      subtitle: 'K-Beauty creator affiliate program',
      title: 'Become a K-Beauty Creator',
      description:
        'Join the Korean Skin Food BD Creator Hub to review authentic Korean skincare, earn points, and unlock exclusive rewards.',
      keywords: ['Korean Skin Food BD creators', 'K-Beauty affiliate Bangladesh'],
    },
    {
      path: '/privacy-policy',
      label: 'Privacy Policy',
      subtitle: 'Customer data & privacy terms',
      title: 'Privacy Policy',
      description:
        'Read the Korean Skin Food BD Privacy Policy covering order details, account security, and customer information protection.',
      keywords: ['Korean Skin Food BD privacy policy'],
    },
    {
      path: '/terms-of-service',
      label: 'Terms of Service',
      subtitle: 'Ordering, delivery & inspection terms',
      title: 'Terms of Service',
      description:
        'Review Korean Skin Food BD Terms of Service, Cash on Delivery conditions, and our 48-hour damaged or wrong-item inspection policy.',
      keywords: ['Korean Skin Food BD terms of service'],
    },
  ];

  staticPages.forEach((sp) => {
    const built = buildStaticPageSeo(sp.title, sp.description, sp.path, sp.keywords);
    pushEntry({
      id: '',
      path: sp.path,
      pageType: 'core',
      label: sp.label,
      subtitle: sp.subtitle,
      defaultTitle: built.title,
      defaultDescription: built.description,
      defaultOgImage: built.ogImage || DEFAULT_OG_IMAGE,
      defaultOgImageAlt: built.ogImageAlt || built.title,
      defaultOgType: 'website',
      defaultKeywords: built.keywords || [],
      defaultFaqs: [],
    });
  });

  // 2. Shop Category Filter Pages (derived from live catalog categories)
  const uniqueCategories = Array.from(
    new Set(
      products
        .map((p) => (p.category || '').trim())
        .filter((cat) => cat.length > 0 && cat.toLowerCase() !== 'all')
    )
  ).sort((a, b) => a.localeCompare(b));

  uniqueCategories.forEach((cat) => {
    const catSeo = buildCategorySeo({ category: cat });
    pushEntry({
      id: '',
      path: `/shop?category=${encodeURIComponent(cat)}`,
      pageType: 'shop_filter',
      label: `Category: ${cat}`,
      subtitle: 'Filtered shop category page',
      defaultTitle: catSeo.title,
      defaultDescription: catSeo.description,
      defaultOgImage: catSeo.ogImage || DEFAULT_OG_IMAGE,
      defaultOgImageAlt: catSeo.ogImageAlt || catSeo.title,
      defaultOgType: 'website',
      defaultKeywords: catSeo.keywords || [],
      defaultFaqs: [],
    });
  });

  // 3. Brand Landing Hubs
  Object.values(BRAND_SEO_PROFILES).forEach((profile) => {
    const brandSeo = buildBrandSeo(profile);
    pushEntry({
      id: '',
      path: `/brand/${profile.slug}`,
      pageType: 'brand',
      label: `Brand: ${profile.name}`,
      subtitle: `${profile.countryOfOrigin} · Brand Landing Hub`,
      defaultTitle: brandSeo.title,
      defaultDescription: brandSeo.description,
      defaultOgImage: brandSeo.ogImage || DEFAULT_OG_IMAGE,
      defaultOgImageAlt: brandSeo.ogImageAlt || brandSeo.title,
      defaultOgType: 'website',
      defaultKeywords: brandSeo.keywords || [],
      defaultFaqs: profile.faqs || [],
    });
  });

  // 4. Skincare Guides
  guides.forEach((guide) => {
    const guideSeo = buildGuideSeo(guide);
    pushEntry({
      id: '',
      path: `/guide/${guide.slug}`,
      pageType: 'guide',
      label: guide.title,
      subtitle: `Guide · ${guide.category}`,
      defaultTitle: guideSeo.title,
      defaultDescription: guideSeo.description,
      defaultOgImage: guideSeo.ogImage || DEFAULT_OG_IMAGE,
      defaultOgImageAlt: guideSeo.ogImageAlt || guideSeo.title,
      defaultOgType: 'article',
      defaultKeywords: guideSeo.keywords || [],
      defaultFaqs: guide.faqs || [],
    });
  });

  // 5. Ingredients Library Pages (Dynamic Admin Taxonomies + Static Defaults)
  const dynamicIngredients = taxonomiesToIngredientGuideEntries(
    taxonomyService.getTaxonomiesSync('ingredient')
  );
  const seoIngredientList = dynamicIngredients.length > 0 ? dynamicIngredients : INGREDIENT_LIBRARY;
  seoIngredientList.forEach((ing) => {
    const ingSeo = buildIngredientSeo(ing);
    pushEntry({
      id: '',
      path: `/ingredient/${ing.slug}`,
      pageType: 'ingredient',
      label: `Ingredient: ${ing.name}`,
      subtitle: ing.shortRole || 'Korean skincare ingredient guide',
      defaultTitle: ingSeo.title,
      defaultDescription: ingSeo.description,
      defaultOgImage: ingSeo.ogImage || DEFAULT_OG_IMAGE,
      defaultOgImageAlt: ingSeo.ogImageAlt || ingSeo.title,
      defaultOgType: 'website',
      defaultKeywords: ingSeo.keywords || [],
      defaultFaqs: [],
    });
  });

  // 6. Skin Concerns Pages (Dynamic Admin Taxonomies + Static Defaults)
  const dynamicConcerns = taxonomiesToSkinConcernEntries(
    taxonomyService.getTaxonomiesSync('skin_concern')
  );
  const seoConcernList = dynamicConcerns.length > 0 ? dynamicConcerns : SKIN_CONCERN_LIBRARY;
  seoConcernList.forEach((concern) => {
    const concernSeo = buildConcernSeo(concern);
    pushEntry({
      id: '',
      path: `/concern/${concern.slug}`,
      pageType: 'concern',
      label: `Concern: ${concern.title}`,
      subtitle: 'Skin concern education & catalog match',
      defaultTitle: concernSeo.title,
      defaultDescription: concernSeo.description,
      defaultOgImage: concernSeo.ogImage || DEFAULT_OG_IMAGE,
      defaultOgImageAlt: concernSeo.ogImageAlt || concernSeo.title,
      defaultOgType: 'website',
      defaultKeywords: concernSeo.keywords || [],
      defaultFaqs: [],
    });
  });

  // 7. Product Detail Pages
  products.forEach((product) => {
    const pSeo = buildProductSeo(product);
    const productPath = getProductPath(product);
    pushEntry({
      id: '',
      path: productPath,
      pageType: 'product',
      label: product.name,
      subtitle: `${product.brand || 'K-Beauty'} · ${product.category || 'Skincare'}`,
      defaultTitle: pSeo.title,
      defaultDescription: pSeo.description,
      defaultOgImage: pSeo.ogImage || DEFAULT_OG_IMAGE,
      defaultOgImageAlt: pSeo.ogImageAlt || pSeo.title,
      defaultOgType: 'product',
      defaultKeywords: pSeo.keywords || [],
      defaultFaqs: product.faqs || [],
      product,
    });
  });

  // 8. Any Custom / Additional Saved Paths in seo_pages
  savedOverrides.forEach((saved) => {
    const normalized = normalizeSeoPath(saved.path);
    if (!seenPaths.has(normalized)) {
      pushEntry({
        id: saved.id,
        path: normalized,
        pageType: saved.pageType || 'custom',
        label: saved.label || normalized,
        subtitle: 'Custom URL rule',
        defaultTitle: saved.metaTitle || `${saved.label || normalized} | Korean Skin Food BD`,
        defaultDescription: saved.metaDescription || '',
        defaultOgImage: saved.ogImage || DEFAULT_OG_IMAGE,
        defaultOgImageAlt: saved.ogImageAlt || saved.metaTitle || '',
        defaultOgType: saved.ogType || 'website',
        defaultKeywords: saved.keywords || [],
        defaultFaqs: saved.faqs || [],
      });
    }
  });

  return discovered;
}
