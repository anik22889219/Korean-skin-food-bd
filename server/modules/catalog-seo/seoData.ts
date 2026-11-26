import crypto from 'crypto';
import { collection, getDocs } from 'firebase/firestore';
import { DEFAULT_SITE_URL } from '../../config/env';
import { getServerDb, getServerFirebaseConfig } from '../../config/firebase';
import { INITIAL_PRODUCTS } from '../../../src/data/allProducts';
import { BRAND_SEO_PROFILES } from '../../../src/data/brandProfiles';
import { INITIAL_SKINCARE_GUIDES } from '../../../src/data/skincareGuides';
import { INGREDIENT_LIBRARY } from '../../../src/data/ingredientLibrary';
import { SKIN_CONCERN_LIBRARY } from '../../../src/data/skinConcerns';
import { getProductPath } from '../../../src/utils/productSlug';
import { encodeSeoPageDocId, normalizeSeoPath } from '../../../src/utils/seoPath';

const CANONICAL_CATEGORIES = [
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
  'Makeup & Tone-Up',
] as const;

export interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
  image?: {
    loc: string;
    title: string;
  };
}

export interface LiveSeoCatalog {
  siteBase: string;
  noindexPaths: Set<string>;
  seoPagesMap: Map<string, any>;
  pages: SitemapEntry[];
  products: SitemapEntry[];
  categories: SitemapEntry[];
  brands: SitemapEntry[];
  guides: SitemapEntry[];
  ingredients: SitemapEntry[];
  rawProducts: any[];
  rawGuides: any[];
  rawBrands: Array<{ name: string; slug: string; description?: string; updatedAt?: string }>;
  rawCategories: Array<{ name: string; slug: string; path: string; description?: string; updatedAt?: string }>;
  rawIngredients: Array<{ name: string; slug: string; shortRole?: string; summary?: string; updatedAt?: string }>;
  rawConcerns: Array<{ title: string; slug: string; summary?: string; updatedAt?: string }>;
}

const PRIVATE_OR_ADMIN_PREFIXES = [
  '/admin',
  '/login',
  '/profile',
  '/checkout',
  '/thank-you',
  '/wholesale',
  '/creator/dashboard',
  '/creator/profile',
  '/creator/reels',
  '/pos',
  '/api',
];

export function isPrivateOrAdminPath(rawPath: string): boolean {
  const norm = normalizeSeoPath(rawPath).toLowerCase();
  return PRIVATE_OR_ADMIN_PREFIXES.some(
    (prefix) => norm === prefix || norm.startsWith(`${prefix}/`)
  );
}

export function slugifySeoSegment(raw: string): string {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toIsoDate(raw?: any, fallback = '2026-11-26'): string {
  if (!raw) return fallback;
  try {
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString().split('T')[0];
    }
  } catch {
    // ignore invalid date
  }
  return fallback;
}

export function resolveIndexNowKey(): string {
  const configured = (process.env.INDEXNOW_KEY || '').trim();
  if (configured && /^[a-zA-Z0-9-]{8,128}$/.test(configured)) {
    return configured;
  }
  const fbCfg = getServerFirebaseConfig();
  const projectId = fbCfg?.projectId || 'koreanskinfood-bd';
  return crypto
    .createHash('sha256')
    .update(`ksf-indexnow-v1:${projectId}:${DEFAULT_SITE_URL}`)
    .digest('hex')
    .slice(0, 32);
}

export function resolveBingVerificationCode(): string {
  return (
    process.env.BING_SITE_VERIFICATION ||
    process.env.VITE_BING_SITE_VERIFICATION ||
    ''
  ).trim();
}

function normalizeUrlToSiteBase(urlOrPath: string, siteBase: string): string {
  const trimmed = String(urlOrPath || '').trim();
  const cleanBase = siteBase.replace(/\/+$/, '');
  if (!trimmed) return `${cleanBase}/`;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      let pathPart = parsed.pathname || '/';
      if (pathPart.length > 1 && pathPart.endsWith('/')) {
        pathPart = pathPart.slice(0, -1);
      }
      const query = parsed.searchParams.toString();
      return `${cleanBase}${pathPart}${query ? `?${query}` : ''}`;
    } catch {
      return `${cleanBase}/`;
    }
  }

  const normalizedPath = normalizeSeoPath(trimmed);
  return `${cleanBase}${normalizedPath === '/' ? '/' : normalizedPath}`;
}

export async function loadLiveSeoCatalog(siteBase: string): Promise<LiveSeoCatalog> {
  const cleanBase = siteBase.replace(/\/+$/, '');
  const todayIso = new Date().toISOString().split('T')[0];
  const db = getServerDb();

  let firestoreProducts: any[] = [];
  let firestoreTaxonomies: any[] = [];
  let firestoreArticles: any[] = [];
  let firestoreSeoPages: any[] = [];
  let productsCollectionLoaded = false;

  if (db) {
    try {
      const [prodSnap, taxSnap, artSnap, seoSnap] = await Promise.all([
        getDocs(collection(db, 'products')).catch(() => null),
        getDocs(collection(db, 'taxonomies')).catch(() => null),
        getDocs(collection(db, 'educational_articles')).catch(() => null),
        getDocs(collection(db, 'seo_pages')).catch(() => null),
      ]);

      if (prodSnap) {
        productsCollectionLoaded = true;
        prodSnap.forEach((d) => firestoreProducts.push({ id: d.id, ...d.data() }));
      }
      if (taxSnap) {
        taxSnap.forEach((d) => firestoreTaxonomies.push({ id: d.id, ...d.data() }));
      }
      if (artSnap) {
        artSnap.forEach((d) => firestoreArticles.push({ id: d.id, ...d.data() }));
      }
      if (seoSnap) {
        seoSnap.forEach((d) => firestoreSeoPages.push({ id: d.id, ...d.data() }));
      }
    } catch (err) {
      console.warn('[SeoData] Firestore fetch warning:', err);
    }
  }

  // Fallback to INITIAL_PRODUCTS only when Firestore products collection hasn't been loaded or is completely empty
  const sourceProducts =
    productsCollectionLoaded && firestoreProducts.length > 0
      ? firestoreProducts
      : INITIAL_PRODUCTS;

  const seoPagesMap = new Map<string, any>();
  const noindexPaths = new Set<string>();

  for (const sp of firestoreSeoPages) {
    if (!sp?.path) continue;
    const norm = normalizeSeoPath(sp.path);
    seoPagesMap.set(norm, sp);
    seoPagesMap.set(encodeSeoPageDocId(norm), sp);
    if (sp.noindex === true) {
      noindexPaths.add(norm);
    }
  }

  const isNoindexOrPrivate = (pathOrUrl: string): boolean => {
    try {
      const urlObj = /^https?:\/\//i.test(pathOrUrl)
        ? new URL(pathOrUrl)
        : new URL(`${cleanBase}${pathOrPathWithSlash(pathOrUrl)}`);
      const norm = normalizeSeoPath(`${urlObj.pathname}${urlObj.search}`);
      if (isPrivateOrAdminPath(norm)) return true;
      if (noindexPaths.has(norm)) return true;
      const pathOnly = normalizeSeoPath(urlObj.pathname);
      if (noindexPaths.has(pathOnly)) return true;
      return false;
    } catch {
      return true;
    }
  };

  function pathOrPathWithSlash(val: string): string {
    return val.startsWith('/') ? val : `/${val}`;
  }

  // Track deleted/noindex product paths so robots & sitemaps exclude them cleanly
  const rawProducts: any[] = [];
  const productEntries: SitemapEntry[] = [];
  const seenProductUrls = new Set<string>();

  for (const p of sourceProducts) {
    if (!p?.id) continue;
    const pPath = getProductPath(p);
    const normProductPath = normalizeSeoPath(pPath);
    const seoOverride = seoPagesMap.get(normProductPath);
    const isRemoved = Boolean(p.isDeleted || p.deleted || p.status === 'deleted');
    const isHidden = Boolean(p.noindex || seoOverride?.noindex || isRemoved);

    if (isHidden) {
      noindexPaths.add(normProductPath);
      continue;
    }

    const targetLoc = seoOverride?.canonicalUrl
      ? normalizeUrlToSiteBase(seoOverride.canonicalUrl, cleanBase)
      : normalizeUrlToSiteBase(pPath, cleanBase);

    if (isNoindexOrPrivate(targetLoc) || seenProductUrls.has(targetLoc)) {
      continue;
    }
    seenProductUrls.add(targetLoc);

    const imgCandidate = p.ogImage || p.image || (Array.isArray(p.images) ? p.images[0] : '');
    const imgLoc =
      imgCandidate && /^https?:\/\//i.test(String(imgCandidate))
        ? String(imgCandidate)
        : imgCandidate
          ? normalizeUrlToSiteBase(String(imgCandidate), cleanBase)
          : '';

    rawProducts.push({ ...p, canonicalPath: normProductPath, canonicalUrl: targetLoc });
    productEntries.push({
      loc: targetLoc,
      lastmod: toIsoDate(p.updatedAt || p.createdAt, todayIso),
      changefreq: 'weekly',
      priority: '0.85',
      ...(imgLoc
        ? {
            image: {
              loc: imgLoc,
              title: String(p.imageAltText || p.name || 'Korean Skincare Product'),
            },
          }
        : {}),
    });
  }

  // Merge Guides / Blogs (Firestore educational_articles overrides INITIAL_SKINCARE_GUIDES)
  const guideMap = new Map<string, any>();
  for (const g of INITIAL_SKINCARE_GUIDES) {
    if (g?.slug) {
      guideMap.set(g.slug.toLowerCase(), { ...g, status: g.status || 'published', isDeleted: Boolean(g.isDeleted) });
    }
  }
  for (const docItem of firestoreArticles) {
    const slugKey = String(docItem.slug || docItem.id || '').trim().toLowerCase();
    if (!slugKey) continue;
    guideMap.set(slugKey, docItem);
  }

  const rawGuides: any[] = [];
  const guideEntries: SitemapEntry[] = [];
  const seenGuideUrls = new Set<string>();

  for (const g of guideMap.values()) {
    const slug = String(g.slug || '').trim();
    if (!slug) continue;
    const gPath = normalizeSeoPath(`/guide/${slug}`);
    const seoOverride = seoPagesMap.get(gPath);
    const isExcluded = Boolean(g.isDeleted || g.deleted || g.status === 'draft' || g.noindex || seoOverride?.noindex);

    if (isExcluded) {
      noindexPaths.add(gPath);
      continue;
    }

    const loc = seoOverride?.canonicalUrl
      ? normalizeUrlToSiteBase(seoOverride.canonicalUrl, cleanBase)
      : normalizeUrlToSiteBase(gPath, cleanBase);

    if (isNoindexOrPrivate(loc) || seenGuideUrls.has(loc)) {
      continue;
    }
    seenGuideUrls.add(loc);
    rawGuides.push({ ...g, canonicalPath: gPath, canonicalUrl: loc });
    guideEntries.push({
      loc,
      lastmod: toIsoDate(g.lastUpdatedDate || g.publishedDate, todayIso),
      changefreq: 'weekly',
      priority: '0.8',
    });
  }

  // Merge Brands (BRAND_SEO_PROFILES + Firestore taxonomies type='brand' + active product brands)
  const brandMap = new Map<string, { name: string; slug: string; description?: string; updatedAt?: string; inactive?: boolean }>();
  for (const [slug, profile] of Object.entries(BRAND_SEO_PROFILES)) {
    brandMap.set(slug.toLowerCase(), {
      name: profile.name,
      slug: slug.toLowerCase(),
      description: profile.description,
    });
  }
  for (const tax of firestoreTaxonomies) {
    if (tax?.type !== 'brand') continue;
    const slug = slugifySeoSegment(tax.slug || tax.name || '');
    if (!slug) continue;
    if (tax.isActive === false || tax.isDeleted) {
      brandMap.set(slug, { name: tax.name || slug, slug, inactive: true });
      continue;
    }
    const existing = brandMap.get(slug);
    brandMap.set(slug, {
      name: tax.name || existing?.name || slug,
      slug,
      description: tax.description || existing?.description,
      updatedAt: tax.updatedAt || existing?.updatedAt,
      inactive: false,
    });
  }
  for (const p of rawProducts) {
    if (!p?.brand) continue;
    const slug = slugifySeoSegment(p.brand);
    if (!slug || brandMap.has(slug)) continue;
    brandMap.set(slug, {
      name: String(p.brand).trim(),
      slug,
      description: `Authentic ${String(p.brand).trim()} Korean skincare products at Korean Skin Food BD.`,
    });
  }

  const rawBrands: Array<{ name: string; slug: string; description?: string; updatedAt?: string }> = [];
  const brandEntries: SitemapEntry[] = [];
  const seenBrandUrls = new Set<string>();

  for (const b of brandMap.values()) {
    const bPath = normalizeSeoPath(`/brand/${b.slug}`);
    const seoOverride = seoPagesMap.get(bPath);
    if (b.inactive || seoOverride?.noindex) {
      noindexPaths.add(bPath);
      continue;
    }
    const loc = seoOverride?.canonicalUrl
      ? normalizeUrlToSiteBase(seoOverride.canonicalUrl, cleanBase)
      : normalizeUrlToSiteBase(bPath, cleanBase);
    if (isNoindexOrPrivate(loc) || seenBrandUrls.has(loc)) continue;
    seenBrandUrls.add(loc);
    rawBrands.push({ name: b.name, slug: b.slug, description: b.description, updatedAt: b.updatedAt });
    brandEntries.push({
      loc,
      lastmod: toIsoDate(b.updatedAt, todayIso),
      changefreq: 'weekly',
      priority: '0.85',
    });
  }

  // Merge Categories + Concerns + Shop Filters for /sitemap-categories.xml
  const categoryMap = new Map<string, { name: string; slug: string; path: string; description?: string; updatedAt?: string; inactive?: boolean }>();
  for (const cat of CANONICAL_CATEGORIES) {
    if (!cat || cat === 'All') continue;
    const slug = slugifySeoSegment(cat);
    const cPath = `/shop?category=${encodeURIComponent(cat)}`;
    categoryMap.set(slug, {
      name: cat,
      slug,
      path: cPath,
      description: `Shop authentic Korean ${cat} products in Bangladesh.`,
    });
  }
  for (const tax of firestoreTaxonomies) {
    if (tax?.type !== 'category') continue;
    const slug = slugifySeoSegment(tax.slug || tax.name || '');
    if (!slug) continue;
    if (tax.isActive === false || tax.isDeleted) {
      categoryMap.set(slug, { name: tax.name || slug, slug, path: `/shop?category=${encodeURIComponent(tax.name || slug)}`, inactive: true });
      continue;
    }
    const catName = String(tax.name || slug).trim();
    categoryMap.set(slug, {
      name: catName,
      slug,
      path: `/shop?category=${encodeURIComponent(catName)}`,
      description: tax.description || `Shop authentic Korean ${catName} skincare in Bangladesh.`,
      updatedAt: tax.updatedAt,
      inactive: false,
    });
  }
  for (const p of rawProducts) {
    if (!p?.category) continue;
    const catName = String(p.category).trim();
    const slug = slugifySeoSegment(catName);
    if (!slug || categoryMap.has(slug)) continue;
    categoryMap.set(slug, {
      name: catName,
      slug,
      path: `/shop?category=${encodeURIComponent(catName)}`,
      description: `Shop authentic Korean ${catName} skincare in Bangladesh.`,
    });
  }

  const concernMap = new Map<string, { title: string; slug: string; summary?: string; updatedAt?: string; inactive?: boolean }>();
  for (const c of SKIN_CONCERN_LIBRARY) {
    concernMap.set(c.slug.toLowerCase(), {
      title: c.title,
      slug: c.slug.toLowerCase(),
      summary: c.summary,
    });
  }
  for (const tax of firestoreTaxonomies) {
    if (tax?.type !== 'skin_concern') continue;
    const slug = slugifySeoSegment(tax.slug || tax.name || '');
    if (!slug) continue;
    if (tax.isActive === false || tax.isDeleted) {
      concernMap.set(slug, { title: tax.name || slug, slug, inactive: true });
      continue;
    }
    const existing = concernMap.get(slug);
    concernMap.set(slug, {
      title: tax.name || existing?.title || slug,
      slug,
      summary: tax.description || existing?.summary,
      updatedAt: tax.updatedAt || existing?.updatedAt,
      inactive: false,
    });
  }

  const rawCategories: Array<{ name: string; slug: string; path: string; description?: string; updatedAt?: string }> = [];
  const rawConcerns: Array<{ title: string; slug: string; summary?: string; updatedAt?: string }> = [];
  const categoryEntries: SitemapEntry[] = [];
  const seenCategoryUrls = new Set<string>();

  for (const cat of categoryMap.values()) {
    const normPath = normalizeSeoPath(cat.path);
    const seoOverride = seoPagesMap.get(normPath);
    if (cat.inactive || seoOverride?.noindex) {
      noindexPaths.add(normPath);
      continue;
    }
    const loc = seoOverride?.canonicalUrl
      ? normalizeUrlToSiteBase(seoOverride.canonicalUrl, cleanBase)
      : normalizeUrlToSiteBase(cat.path, cleanBase);
    if (isNoindexOrPrivate(loc) || seenCategoryUrls.has(loc)) continue;
    seenCategoryUrls.add(loc);
    rawCategories.push({
      name: cat.name,
      slug: cat.slug,
      path: normPath,
      description: cat.description,
      updatedAt: cat.updatedAt,
    });
    categoryEntries.push({
      loc,
      lastmod: toIsoDate(cat.updatedAt, todayIso),
      changefreq: 'weekly',
      priority: '0.8',
    });
  }

  for (const con of concernMap.values()) {
    const conPath = normalizeSeoPath(`/concern/${con.slug}`);
    const seoOverride = seoPagesMap.get(conPath);
    if (con.inactive || seoOverride?.noindex) {
      noindexPaths.add(conPath);
      continue;
    }
    const loc = seoOverride?.canonicalUrl
      ? normalizeUrlToSiteBase(seoOverride.canonicalUrl, cleanBase)
      : normalizeUrlToSiteBase(conPath, cleanBase);
    if (isNoindexOrPrivate(loc) || seenCategoryUrls.has(loc)) continue;
    seenCategoryUrls.add(loc);
    rawConcerns.push({ title: con.title, slug: con.slug, summary: con.summary, updatedAt: con.updatedAt });
    categoryEntries.push({
      loc,
      lastmod: toIsoDate(con.updatedAt, todayIso),
      changefreq: 'monthly',
      priority: '0.75',
    });
  }

  // Also include custom shop_filter entries from seo_pages
  for (const sp of firestoreSeoPages) {
    if (sp?.pageType !== 'shop_filter' || !sp.path || sp.noindex) continue;
    const loc = sp.canonicalUrl
      ? normalizeUrlToSiteBase(sp.canonicalUrl, cleanBase)
      : normalizeUrlToSiteBase(sp.path, cleanBase);
    if (isNoindexOrPrivate(loc) || seenCategoryUrls.has(loc)) continue;
    seenCategoryUrls.add(loc);
    categoryEntries.push({
      loc,
      lastmod: toIsoDate(sp.updatedAt, todayIso),
      changefreq: 'weekly',
      priority: '0.8',
    });
  }

  // Merge Ingredients (INGREDIENT_LIBRARY + Firestore taxonomies type='ingredient')
  const ingredientMap = new Map<string, { name: string; slug: string; shortRole?: string; summary?: string; updatedAt?: string; inactive?: boolean }>();
  for (const ing of INGREDIENT_LIBRARY) {
    ingredientMap.set(ing.slug.toLowerCase(), {
      name: ing.name,
      slug: ing.slug.toLowerCase(),
      shortRole: ing.shortRole,
      summary: ing.summary,
    });
  }
  for (const tax of firestoreTaxonomies) {
    if (tax?.type !== 'ingredient') continue;
    const slug = slugifySeoSegment(tax.slug || tax.name || '');
    if (!slug) continue;
    if (tax.isActive === false || tax.isDeleted) {
      ingredientMap.set(slug, { name: tax.name || slug, slug, inactive: true });
      continue;
    }
    const existing = ingredientMap.get(slug);
    ingredientMap.set(slug, {
      name: tax.name || existing?.name || slug,
      slug,
      shortRole: tax.shortRole || existing?.shortRole,
      summary: tax.description || existing?.summary,
      updatedAt: tax.updatedAt || existing?.updatedAt,
      inactive: false,
    });
  }

  const rawIngredients: Array<{ name: string; slug: string; shortRole?: string; summary?: string; updatedAt?: string }> = [];
  const ingredientEntries: SitemapEntry[] = [];
  const seenIngredientUrls = new Set<string>();

  for (const ing of ingredientMap.values()) {
    const iPath = normalizeSeoPath(`/ingredient/${ing.slug}`);
    const seoOverride = seoPagesMap.get(iPath);
    if (ing.inactive || seoOverride?.noindex) {
      noindexPaths.add(iPath);
      continue;
    }
    const loc = seoOverride?.canonicalUrl
      ? normalizeUrlToSiteBase(seoOverride.canonicalUrl, cleanBase)
      : normalizeUrlToSiteBase(iPath, cleanBase);
    if (isNoindexOrPrivate(loc) || seenIngredientUrls.has(loc)) continue;
    seenIngredientUrls.add(loc);
    rawIngredients.push({
      name: ing.name,
      slug: ing.slug,
      shortRole: ing.shortRole,
      summary: ing.summary,
      updatedAt: ing.updatedAt,
    });
    ingredientEntries.push({
      loc,
      lastmod: toIsoDate(ing.updatedAt, todayIso),
      changefreq: 'monthly',
      priority: '0.75',
    });
  }

  // Core & Custom Pages (/sitemap-pages.xml)
  const corePageDefinitions: Array<{ path: string; priority: string; changefreq: SitemapEntry['changefreq'] }> = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/shop', priority: '0.9', changefreq: 'daily' },
    { path: '/brands', priority: '0.9', changefreq: 'weekly' },
    { path: '/guides', priority: '0.85', changefreq: 'weekly' },
    { path: '/ingredients', priority: '0.85', changefreq: 'weekly' },
    { path: '/concerns', priority: '0.85', changefreq: 'weekly' },
    { path: '/authenticity', priority: '0.8', changefreq: 'monthly' },
    { path: '/skin-quiz', priority: '0.75', changefreq: 'monthly' },
    { path: '/routine-builder', priority: '0.75', changefreq: 'monthly' },
    { path: '/about-us', priority: '0.6', changefreq: 'monthly' },
    { path: '/contact-us', priority: '0.6', changefreq: 'monthly' },
    { path: '/become-a-creator', priority: '0.7', changefreq: 'monthly' },
    { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
    { path: '/terms-of-service', priority: '0.3', changefreq: 'yearly' },
    { path: '/data-deletion', priority: '0.3', changefreq: 'yearly' },
  ];

  const pageEntries: SitemapEntry[] = [];
  const seenPageUrls = new Set<string>();

  for (const cp of corePageDefinitions) {
    const normPath = normalizeSeoPath(cp.path);
    const seoOverride = seoPagesMap.get(normPath);
    if (seoOverride?.noindex) {
      noindexPaths.add(normPath);
      continue;
    }
    const loc = seoOverride?.canonicalUrl
      ? normalizeUrlToSiteBase(seoOverride.canonicalUrl, cleanBase)
      : normalizeUrlToSiteBase(cp.path, cleanBase);
    if (isNoindexOrPrivate(loc) || seenPageUrls.has(loc)) continue;
    seenPageUrls.add(loc);
    pageEntries.push({
      loc,
      lastmod: toIsoDate(seoOverride?.updatedAt, todayIso),
      changefreq: cp.changefreq,
      priority: cp.priority,
    });
  }

  for (const sp of firestoreSeoPages) {
    if (!sp?.path || sp.noindex) continue;
    if (!['core', 'custom'].includes(sp.pageType)) continue;
    const normPath = normalizeSeoPath(sp.path);
    if (isPrivateOrAdminPath(normPath)) continue;
    const loc = sp.canonicalUrl
      ? normalizeUrlToSiteBase(sp.canonicalUrl, cleanBase)
      : normalizeUrlToSiteBase(normPath, cleanBase);
    if (isNoindexOrPrivate(loc) || seenPageUrls.has(loc)) continue;
    seenPageUrls.add(loc);
    pageEntries.push({
      loc,
      lastmod: toIsoDate(sp.updatedAt, todayIso),
      changefreq: 'weekly',
      priority: '0.75',
    });
  }

  return {
    siteBase: cleanBase,
    noindexPaths,
    seoPagesMap,
    pages: pageEntries,
    products: productEntries,
    categories: categoryEntries,
    brands: brandEntries,
    guides: guideEntries,
    ingredients: ingredientEntries,
    rawProducts,
    rawGuides,
    rawBrands,
    rawCategories,
    rawIngredients,
    rawConcerns,
  };
}
