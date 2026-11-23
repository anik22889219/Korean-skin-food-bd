import express from 'express';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { DEFAULT_FIRST_PARTY_OG_PATH, resolveSiteBaseUrl } from '../../config/env';
import { getServerDb } from '../../config/firebase';
import { verifyAdminAuth } from '../../middleware/auth';
import { escapeXmlString } from '../../utils/validators';
import { getProductPath } from '../../../src/utils/productSlug';
import { encodeSeoPageDocId, normalizeSeoPath } from '../../../src/utils/seoPath';

const router = express.Router();

export function isSearchEngineBot(userAgent?: string): boolean {
  if (!userAgent) return false;
  const botList = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'facebot',
    'facebookexternalhit',
    'twitterbot',
    'rogerbot',
    'linkedinbot',
    'embedly',
    'quora link preview',
    'showyoubot',
    'outbrain',
    'pinterest',
    'pinterestbot',
    'slackbot',
    'vkshare',
    'w3c_validator',
    'whatsapp',
    'applebot',
    'telegrambot',
    'discordbot',
  ];
  const ua = userAgent.toLowerCase();
  return botList.some((bot) => ua.includes(bot));
}

export function injectMetaIntoHtml(
  html: string,
  options: {
    title: string;
    description: string;
    canonicalUrl: string;
    ogImage?: string;
    ogImageAlt?: string;
    ogType?: string;
    jsonLd?: Record<string, any> | Array<Record<string, any>>;
    noindex?: boolean;
  }
): string {
  const { title, description, canonicalUrl, ogImage, ogImageAlt, ogType, jsonLd, noindex } = options;
  const fallbackBase = resolveSiteBaseUrl();
  const image = ogImage || `${fallbackBase}${DEFAULT_FIRST_PARTY_OG_PATH}`;
  const imageAlt = ogImageAlt || title;
  const type = ogType || 'website';
  const robots = noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  let tags = `\n    <!-- Server-Side SEO & OpenGraph Meta Injection (Crawler Optimized) -->\n`;
  tags += `    <title>${escapeXmlString(title)}</title>\n`;
  tags += `    <meta name="description" content="${escapeXmlString(description)}" />\n`;
  tags += `    <meta name="robots" content="${robots}" />\n`;
  tags += `    <link rel="canonical" href="${escapeXmlString(canonicalUrl)}" />\n`;
  tags += `    <meta property="og:title" content="${escapeXmlString(title)}" />\n`;
  tags += `    <meta property="og:description" content="${escapeXmlString(description)}" />\n`;
  tags += `    <meta property="og:url" content="${escapeXmlString(canonicalUrl)}" />\n`;
  tags += `    <meta property="og:site_name" content="Korean Skin Food BD" />\n`;
  tags += `    <meta property="og:type" content="${type}" />\n`;
  tags += `    <meta property="og:image" content="${escapeXmlString(image)}" />\n`;
  tags += `    <meta property="og:image:alt" content="${escapeXmlString(imageAlt)}" />\n`;
  tags += `    <meta name="twitter:card" content="summary_large_image" />\n`;
  tags += `    <meta name="twitter:title" content="${escapeXmlString(title)}" />\n`;
  tags += `    <meta name="twitter:description" content="${escapeXmlString(description)}" />\n`;
  tags += `    <meta name="twitter:image" content="${escapeXmlString(image)}" />\n`;

  if (jsonLd) {
    tags += `    <script id="seo-json-ld" type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n`;
  }

  let cleanHtml = html
    .replace(/<title>.*?<\/title>/gi, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']robots["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:title["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:description["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:url["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:site_name["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:type["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:image["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:image:alt["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:card["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:title["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:description["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:image["'][^>]*>/gi, '')
    .replace(/<script\s+id=["']seo-json-ld["'][^>]*>[\s\S]*?<\/script>/gi, '');

  cleanHtml = cleanHtml.replace('</head>', `${tags}  </head>`);
  return cleanHtml;
}

router.get('/robots.txt', (req, res) => {
  const siteBase = resolveSiteBaseUrl(req);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const defaultRobots = [
    `# robots.txt for Korean Skin Food BD (${siteBase}/)`,
    'User-agent: *',
    'Allow: /',
    'Allow: /shop',
    'Allow: /brand/',
    'Allow: /brands',
    'Allow: /guides',
    'Allow: /guide/',
    'Allow: /ingredients',
    'Allow: /ingredient/',
    'Allow: /concerns',
    'Allow: /concern/',
    'Allow: /authenticity',
    'Allow: /skin-quiz',
    'Allow: /routine-builder',
    'Allow: /about-us',
    'Allow: /contact-us',
    'Allow: /privacy-policy',
    'Allow: /terms-of-service',
    'Allow: /become-a-creator',
    '',
    '# Block administrative, private user, checkout, and internal POS paths',
    'Disallow: /admin/',
    'Disallow: /login',
    'Disallow: /profile',
    'Disallow: /checkout',
    'Disallow: /thank-you',
    'Disallow: /wholesale/profile',
    'Disallow: /wholesale/checkout',
    'Disallow: /wholesale/cart',
    'Disallow: /creator/dashboard',
    'Disallow: /creator/reels/upload',
    'Disallow: /pos/',
    'Disallow: /api/',
    '',
    `Sitemap: ${siteBase}/sitemap.xml`,
  ].join('\n');

  return res.send(defaultRobots);
});

router.get('/sitemap.xml', async (req, res) => {
  try {
    const siteBase = resolveSiteBaseUrl(req);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=14400');

    const db = getServerDb();
    let products: any[] = [];
    let seoPages: any[] = [];
    if (db) {
      try {
        const [prodSnap, seoSnap] = await Promise.all([
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'seo_pages')),
        ]);
        prodSnap.forEach((d) => {
          products.push({ id: d.id, ...d.data() });
        });
        seoSnap.forEach((d) => {
          seoPages.push({ id: d.id, ...d.data() });
        });
      } catch (err) {
        console.warn('[Sitemap] Firestore data load warning:', err);
      }
    }

    const staticRoutes = [
      { url: `${siteBase}/`, priority: '1.0', changefreq: 'daily', lastmod: '2026-10-15' },
      { url: `${siteBase}/shop`, priority: '0.9', changefreq: 'daily', lastmod: '2026-10-15' },
      { url: `${siteBase}/brands`, priority: '0.9', changefreq: 'weekly', lastmod: '2026-10-15' },
      { url: `${siteBase}/guides`, priority: '0.85', changefreq: 'weekly', lastmod: '2026-10-15' },
      { url: `${siteBase}/ingredients`, priority: '0.85', changefreq: 'weekly', lastmod: '2026-10-15' },
      { url: `${siteBase}/concerns`, priority: '0.85', changefreq: 'weekly', lastmod: '2026-10-15' },
      { url: `${siteBase}/authenticity`, priority: '0.8', changefreq: 'monthly', lastmod: '2026-10-15' },
      { url: `${siteBase}/skin-quiz`, priority: '0.75', changefreq: 'monthly', lastmod: '2026-10-15' },
      { url: `${siteBase}/routine-builder`, priority: '0.75', changefreq: 'monthly', lastmod: '2026-10-15' },
      { url: `${siteBase}/about-us`, priority: '0.6', changefreq: 'monthly', lastmod: '2026-10-15' },
      { url: `${siteBase}/contact-us`, priority: '0.6', changefreq: 'monthly', lastmod: '2026-10-15' },
      { url: `${siteBase}/become-a-creator`, priority: '0.7', changefreq: 'monthly', lastmod: '2026-10-15' },
      { url: `${siteBase}/privacy-policy`, priority: '0.3', changefreq: 'yearly', lastmod: '2026-10-15' },
      { url: `${siteBase}/terms-of-service`, priority: '0.3', changefreq: 'yearly', lastmod: '2026-10-15' },
    ];

    const brandSlugs = ['cosrx', 'beauty-of-joseon', 'skin1004', 'anua', 'some-by-mi', 'round-lab'];
    const brandRoutes = brandSlugs.map((slug) => ({
      url: `${siteBase}/brand/${slug}`,
      priority: '0.85',
      changefreq: 'weekly',
      lastmod: '2026-10-15',
    }));

    const guideSlugs = [
      'korean-skincare-routine-for-beginners-in-bangladesh',
      'best-korean-sunscreen-for-oily-skin',
      'korean-skincare-for-sensitive-skin',
      'how-to-build-a-skincare-routine-for-acne-prone-skin',
      'korean-moisturizer-for-dry-skin',
      'how-to-identify-authentic-korean-skincare-products',
      'understanding-centella-asiatica-in-skincare',
      'niacinamide-uses-and-precautions',
      'how-to-layer-korean-skincare-products',
      'choosing-skincare-products-according-to-skin-type',
    ];
    const guideRoutes = guideSlugs.map((slug) => ({
      url: `${siteBase}/guide/${slug}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: '2026-10-15',
    }));

    const ingredientSlugs = [
      'centella-asiatica',
      'niacinamide',
      'snail-mucin',
      'hyaluronic-acid',
      'salicylic-acid',
      'rice-extract',
      'panthenol',
      'ceramide',
      'retinol',
      'vitamin-c',
      'propolis',
      'mugwort',
    ];
    const ingredientRoutes = ingredientSlugs.map((slug) => ({
      url: `${siteBase}/ingredient/${slug}`,
      priority: '0.75',
      changefreq: 'monthly',
      lastmod: '2026-10-15',
    }));

    const concernSlugs = [
      'acne-blemishes',
      'dark-spots-hyperpigmentation',
      'dehydrated-dry-skin',
      'damaged-skin-barrier',
      'oily-enlarged-pores',
      'sun-protection-uv',
    ];
    const concernRoutes = concernSlugs.map((slug) => ({
      url: `${siteBase}/concern/${slug}`,
      priority: '0.75',
      changefreq: 'monthly',
      lastmod: '2026-10-15',
    }));

    const productRoutes = products
      .filter((p) => p.id && !p.noindex)
      .map((p) => {
        let lastmod = '2026-10-15';
        const rawDate = p.updatedAt || p.createdAt;
        if (rawDate) {
          try {
            lastmod = new Date(rawDate).toISOString().split('T')[0];
          } catch {
            // fallback date
          }
        }
        return {
          url: `${siteBase}${getProductPath(p)}`,
          priority: '0.8',
          changefreq: 'weekly',
          lastmod,
        };
      });

    const noindexPaths = new Set<string>();
    for (const sp of seoPages) {
      if (sp?.path && sp?.noindex) {
        noindexPaths.add(normalizeSeoPath(sp.path));
      }
    }

    const baseUrls = [
      ...staticRoutes,
      ...brandRoutes,
      ...guideRoutes,
      ...ingredientRoutes,
      ...concernRoutes,
      ...productRoutes,
    ].filter((entry) => {
      try {
        const parsed = new URL(entry.url);
        return !noindexPaths.has(normalizeSeoPath(`${parsed.pathname}${parsed.search}`));
      } catch {
        return true;
      }
    });

    const includedUrls = new Set(baseUrls.map((u) => u.url));
    const customSeoUrls = seoPages
      .filter((sp) => sp?.path && !sp.noindex && !sp.path.startsWith('/admin'))
      .map((sp) => {
        const normalizedPath = normalizeSeoPath(sp.path);
        const fullUrl = `${siteBase}${normalizedPath === '/' ? '/' : normalizedPath}`;
        let lastmod = '2026-10-15';
        if (sp.updatedAt) {
          try {
            lastmod = new Date(sp.updatedAt).toISOString().split('T')[0];
          } catch {
            // fallback
          }
        }
        return {
          url: fullUrl,
          priority: sp.pageType === 'shop_filter' ? '0.8' : '0.75',
          changefreq: 'weekly',
          lastmod,
        };
      })
      .filter((entry) => !includedUrls.has(entry.url));

    const allUrls = [...baseUrls, ...customSeoUrls];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const item of allUrls) {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXmlString(item.url)}</loc>\n`;
      xml += `    <lastmod>${item.lastmod}</lastmod>\n`;
      xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
      xml += `    <priority>${item.priority}</priority>\n`;
      xml += `  </url>\n`;
    }
    xml += `</urlset>`;
    return res.send(xml);
  } catch (err) {
    console.error('[Sitemap] Error building sitemap:', err);
    return res.status(500).send('<!-- Error building sitemap -->');
  }
});

router.get('/api/seo/overview', verifyAdminAuth, async (_req, res) => {
  try {
    const db = getServerDb();
    let products: any[] = [];
    if (db) {
      const snap = await getDocs(collection(db, 'products'));
      snap.forEach((d) => products.push({ id: d.id, ...d.data() }));
    }

    let missingSeoTitleCount = 0;
    let missingMetaDescriptionCount = 0;
    let missingAltTextCount = 0;
    let overlongTitleCount = 0;
    let overlongDescriptionCount = 0;
    let invalidSchemaCount = 0;
    const issuesList: Array<{ productId: string; name: string; issue: string; severity: 'warning' | 'error' }> = [];
    const seenTitles = new Map<string, string>();
    let duplicateTitlesCount = 0;

    for (const p of products) {
      const title = (p.seoTitle || p.metaTitle || '').trim();
      const desc = (p.metaDescription || '').trim();
      const alt = (p.imageAltText || p.altText || '').trim();

      if (!title) {
        missingSeoTitleCount++;
        issuesList.push({ productId: p.id, name: p.name, issue: 'Missing custom SEO title', severity: 'warning' });
      } else if (title.length > 60) {
        overlongTitleCount++;
        issuesList.push({
          productId: p.id,
          name: p.name,
          issue: `SEO title over 60 chars (${title.length} chars)`,
          severity: 'warning',
        });
      }

      if (title) {
        const lower = title.toLowerCase();
        if (seenTitles.has(lower)) {
          duplicateTitlesCount++;
          issuesList.push({
            productId: p.id,
            name: p.name,
            issue: `Duplicate title with product ID: ${seenTitles.get(lower)}`,
            severity: 'error',
          });
        } else {
          seenTitles.set(lower, p.id);
        }
      }

      if (!desc) {
        missingMetaDescriptionCount++;
        issuesList.push({ productId: p.id, name: p.name, issue: 'Missing meta description', severity: 'warning' });
      } else if (desc.length > 160) {
        overlongDescriptionCount++;
        issuesList.push({
          productId: p.id,
          name: p.name,
          issue: `Meta description exceeds 160 chars (${desc.length} chars)`,
          severity: 'warning',
        });
      }

      if (!alt) {
        missingAltTextCount++;
        issuesList.push({
          productId: p.id,
          name: p.name,
          issue: 'Missing image alt text for accessibility and Image SEO',
          severity: 'warning',
        });
      }

      if (p.generatedSeoContent) {
        try {
          const parsed = typeof p.generatedSeoContent === 'string' ? JSON.parse(p.generatedSeoContent) : p.generatedSeoContent;
          if (parsed.jsonLdSchema && typeof parsed.jsonLdSchema === 'string') {
            JSON.parse(parsed.jsonLdSchema);
          }
        } catch {
          invalidSchemaCount++;
          issuesList.push({
            productId: p.id,
            name: p.name,
            issue: 'Malformed JSON-LD schema syntax',
            severity: 'error',
          });
        }
      }
    }

    const sitemapProductCount = products.filter((p) => !p.noindex).length;

    return res.json({
      success: true,
      stats: {
        totalProducts: products.length,
        missingSeoTitleCount,
        missingMetaDescriptionCount,
        missingAltTextCount,
        overlongTitleCount,
        overlongDescriptionCount,
        duplicateTitlesCount,
        invalidSchemaCount,
        sitemapProductCount,
        lastAuditTimestamp: new Date().toISOString(),
      },
      issues: issuesList.slice(0, 50),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

export async function buildBotSsrMetadata(req: express.Request): Promise<{
  status: number;
  meta: {
    title: string;
    description: string;
    canonicalUrl: string;
    ogImage: string;
    ogImageAlt: string;
    ogType: string;
    jsonLd?: any;
    noindex: boolean;
  };
}> {
  const siteBase = resolveSiteBaseUrl(req);
  const defaultOgImage = `${siteBase}${DEFAULT_FIRST_PARTY_OG_PATH}`;
  const db = getServerDb();

  let meta = {
    title: 'Korean Skin Food BD | Authentic Korean Skincare in Bangladesh',
    description:
      'Shop authentic Korean skincare products in Bangladesh at Korean Skin Food BD. Explore trusted Korean beauty brands, skincare essentials, product information and nationwide delivery.',
    canonicalUrl: `${siteBase}${req.path === '/' ? '/' : req.path}`,
    ogImage: defaultOgImage,
    ogImageAlt: 'Korean Skin Food BD Authentic Korean Skincare in Bangladesh',
    ogType: 'website',
    jsonLd: undefined as any,
    noindex: false,
  };

  const resolvePageSeoOverride = async (): Promise<any | null> => {
    if (!db) return null;
    try {
      const fullNorm = normalizeSeoPath(req.originalUrl || req.path);
      const docId = encodeSeoPageDocId(fullNorm);
      const snap = await getDoc(doc(db, 'seo_pages', docId));
      if (snap.exists()) return snap.data();

      const pathNorm = normalizeSeoPath(req.path);
      if (pathNorm !== fullNorm) {
        const fallbackSnap = await getDoc(doc(db, 'seo_pages', encodeSeoPageDocId(pathNorm)));
        if (fallbackSnap.exists()) return fallbackSnap.data();
      }
    } catch {
      // ignore seo_pages lookup error
    }
    return null;
  };

  const applySeoOverride = (
    baseMeta: {
      title: string;
      description: string;
      canonicalUrl: string;
      ogImage: string;
      ogImageAlt: string;
      ogType: string;
      jsonLd?: any;
      noindex: boolean;
    },
    override: any | null
  ) => {
    if (!override) return baseMeta;
    let schemas: any[] = Array.isArray(baseMeta.jsonLd)
      ? [...baseMeta.jsonLd]
      : baseMeta.jsonLd
        ? [baseMeta.jsonLd]
        : [];

    if (Array.isArray(override.faqs) && override.faqs.length > 0) {
      const validFaqs = override.faqs.filter((f: any) => f?.question?.trim() && f?.answer?.trim());
      if (validFaqs.length > 0) {
        schemas = schemas.filter((s) => s?.['@type'] !== 'FAQPage');
        schemas.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: validFaqs.map((faq: any) => ({
            '@type': 'Question',
            name: String(faq.question).trim(),
            acceptedAnswer: {
              '@type': 'Answer',
              text: String(faq.answer).trim(),
            },
          })),
        });
      }
    }

    if (override.customJsonLd && typeof override.customJsonLd === 'string') {
      try {
        const parsed = JSON.parse(override.customJsonLd);
        if (Array.isArray(parsed)) schemas.push(...parsed);
        else if (parsed && typeof parsed === 'object') schemas.push(parsed);
      } catch {
        // ignore invalid custom JSON-LD
      }
    }

    let resolvedCanonical = baseMeta.canonicalUrl;
    if (override.canonicalUrl && typeof override.canonicalUrl === 'string' && override.canonicalUrl.trim()) {
      const c = override.canonicalUrl.trim();
      resolvedCanonical = /^https?:\/\//i.test(c)
        ? c
        : `${siteBase}${c.startsWith('/') ? c : `/${c}`}`;
    }

    let resolvedOgImage = baseMeta.ogImage;
    if (override.ogImage && typeof override.ogImage === 'string' && override.ogImage.trim()) {
      const img = override.ogImage.trim();
      resolvedOgImage = /^https?:\/\//i.test(img)
        ? img
        : `${siteBase}${img.startsWith('/') ? img : `/${img}`}`;
    }

    return {
      ...baseMeta,
      title: override.metaTitle?.trim() || baseMeta.title,
      description: override.metaDescription?.trim() || baseMeta.description,
      canonicalUrl: resolvedCanonical,
      ogImage: resolvedOgImage,
      ogImageAlt: override.ogImageAlt?.trim() || baseMeta.ogImageAlt,
      ogType: override.ogType || baseMeta.ogType,
      noindex: typeof override.noindex === 'boolean' ? override.noindex : baseMeta.noindex,
      jsonLd: schemas.length > 0 ? schemas : baseMeta.jsonLd,
    };
  };

  if (req.path.startsWith('/product/')) {
    const prodParam = decodeURIComponent(req.path.replace('/product/', '').trim());
    let product: any = null;
    if (db && prodParam) {
      try {
        const pDoc = await getDoc(doc(db, 'products', prodParam));
        if (pDoc.exists()) {
          product = { id: pDoc.id, ...pDoc.data() };
        } else {
          const slugSnap = await getDocs(
            query(collection(db, 'products'), where('seoSlug', '==', prodParam.toLowerCase()), limit(1))
          );
          if (!slugSnap.empty) {
            const matchedDoc = slugSnap.docs[0];
            product = { id: matchedDoc.id, ...matchedDoc.data() };
          }
        }
      } catch {
        // ignore fetch error
      }
    }

    if (product) {
      const sizeSuffix = product.ml && String(product.ml).trim() ? ` ${String(product.ml).trim()}` : '';
      const pTitle =
        (product.seoTitle || product.metaTitle)?.trim() ||
        `${product.name}${sizeSuffix} | Price in Bangladesh | Korean Skin Food BD`;
      const pDesc =
        product.metaDescription?.trim() ||
        `Discover ${product.name} at Korean Skin Food BD. Explore product details, ingredients, skin compatibility, directions for use, and current availability in Bangladesh.`;
      const regularPrice = typeof product.price === 'number' ? product.price : product.retailPrice || 0;
      const salePrice =
        typeof product.discountPrice === 'number' && product.discountPrice > 0 ? product.discountPrice : regularPrice;
      const activePrice = salePrice > 0 ? salePrice : regularPrice;
      const isAvail = (product.stock ?? 0) > 0;
      const productPath = getProductPath(product);
      const productUrl = `${siteBase}${productPath}`;

      const productSchema: any = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${productUrl}#product`,
        name: product.name,
        image: [product.ogImage, product.image, ...(product.images || [])].filter(Boolean),
        description: pDesc,
        sku: product.sku || product.barcode || product.id,
        brand: {
          '@type': 'Brand',
          name: product.brand || 'Korean Skin Food BD',
        },
        offers: {
          '@type': 'Offer',
          url: productUrl,
          priceCurrency: 'BDT',
          price: activePrice,
          availability: isAvail ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
      };

      const schemas: any[] = [productSchema];
      if (Array.isArray(product.faqs) && product.faqs.length > 0) {
        const validFaqs = product.faqs.filter((f: any) => f?.question?.trim() && f?.answer?.trim());
        if (validFaqs.length > 0) {
          schemas.push({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: validFaqs.map((faq: any) => ({
              '@type': 'Question',
              name: String(faq.question).trim(),
              acceptedAnswer: {
                '@type': 'Answer',
                text: String(faq.answer).trim(),
              },
            })),
          });
        }
      }

      meta = {
        title: pTitle,
        description: pDesc,
        canonicalUrl: productUrl,
        ogImage: product.ogImage || product.image || (Array.isArray(product.images) && product.images[0]) || defaultOgImage,
        ogImageAlt: product.ogImageAlt || product.imageAltText || `${product.name} ${product.brand || 'Korean Skin Food BD'}`,
        ogType: 'product',
        noindex: Boolean(product.noindex),
        jsonLd: schemas,
      };

      // Also check seo_pages override using both canonical product path & requested path
      let override: any = null;
      if (db) {
        try {
          const snap = await getDoc(doc(db, 'seo_pages', encodeSeoPageDocId(productPath)));
          if (snap.exists()) {
            override = snap.data();
          } else {
            override = await resolvePageSeoOverride();
          }
        } catch {
          override = null;
        }
      }

      return { status: 200, meta: applySeoOverride(meta, override) };
    }

    return {
      status: 404,
      meta: {
        ...meta,
        title: 'Product Not Found | Korean Skin Food BD',
        description: 'The requested Korean skincare product could not be found or is currently unavailable.',
        noindex: true,
      },
    };
  }

  if (req.path.startsWith('/brand/')) {
    const bSlug = req.path.replace('/brand/', '').trim();
    const brandName = bSlug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    meta.title = `${brandName} Bangladesh | Korean Skincare | Korean Skin Food BD`;
    meta.description = `Shop ${brandName} skincare in Bangladesh at Korean Skin Food BD with transparent product details and Cash on Delivery.`;
    meta.canonicalUrl = `${siteBase}/brand/${bSlug}`;
  } else if (req.path.startsWith('/guide/')) {
    const gSlug = req.path.replace('/guide/', '').trim();
    const guideTitle = gSlug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    meta.title = `${guideTitle} | Korean Skin Food BD`;
    meta.description = `Learn practical Korean skincare routines, key active ingredients, and skin barrier care adapted for Bangladesh.`;
    meta.canonicalUrl = `${siteBase}/guide/${gSlug}`;
    meta.ogType = 'article';
  } else if (req.path === '/authenticity') {
    meta.title = 'Authenticity & Sourcing Standards | Korean Skin Food BD';
    meta.description = 'Learn how Korean Skin Food BD checks batch codes, expiry dates, and supplier documentation for skincare in Bangladesh.';
  } else if (req.path === '/ingredients' || req.path.startsWith('/ingredient/')) {
    meta.title = 'Korean Skincare Ingredient Library | Korean Skin Food BD';
    meta.description = 'Explore key Korean skincare ingredients including Snail Mucin, Centella Asiatica, Niacinamide, Panthenol, and Ceramides.';
  } else if (req.path === '/concerns' || req.path.startsWith('/concern/')) {
    meta.title = 'Shop by Skin Concern | Korean Skin Food BD';
    meta.description = 'Explore gentle Korean skincare routines by concern: hydration, oil control, barrier support, soothing, and uneven tone.';
  } else if (req.path === '/skin-quiz') {
    meta.title = 'Skin Profile Quiz | Korean Skin Food BD';
    meta.description = 'Answer 5 quick questions to identify your skin type and explore tailored Korean skincare options.';
  } else if (req.path === '/routine-builder') {
    meta.title = 'AM & PM Skincare Routine Builder | Korean Skin Food BD';
    meta.description = 'Build a balanced morning and evening Korean skincare routine with layering notes and active compatibility tips.';
  } else if (
    req.path.startsWith('/admin') ||
    req.path === '/login' ||
    req.path.startsWith('/profile') ||
    req.path.startsWith('/checkout') ||
    req.path.startsWith('/thank-you') ||
    req.path.startsWith('/wholesale/profile')
  ) {
    meta.noindex = true;
  }

  const pageOverride = await resolvePageSeoOverride();
  return { status: 200, meta: applySeoOverride(meta, pageOverride) };
}

export default router;
