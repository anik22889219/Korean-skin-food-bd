import express from 'express';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { DEFAULT_FIRST_PARTY_OG_PATH, DEFAULT_SITE_URL, resolveSiteBaseUrl } from '../../config/env';
import { getServerDb } from '../../config/firebase';
import { verifyAdminAuth } from '../../middleware/auth';
import { escapeXmlString } from '../../utils/validators';
import { INITIAL_PRODUCTS } from '../../../src/data/allProducts';
import { BRAND_SEO_PROFILES } from '../../../src/data/brandProfiles';
import { INITIAL_SKINCARE_GUIDES } from '../../../src/data/skincareGuides';
import { INGREDIENT_LIBRARY } from '../../../src/data/ingredientLibrary';
import { SKIN_CONCERN_LIBRARY } from '../../../src/data/skinConcerns';
import { getProductPath } from '../../../src/utils/productSlug';
import { encodeSeoPageDocId, normalizeSeoPath } from '../../../src/utils/seoPath';
import {
  isPrivateOrAdminPath,
  LiveSeoCatalog,
  loadLiveSeoCatalog,
  resolveBingVerificationCode,
  resolveIndexNowKey,
  SitemapEntry,
  slugifySeoSegment,
} from './seoData';

const router = express.Router();

export function isSearchEngineBot(userAgent?: string): boolean {
  if (!userAgent) return false;
  const botList = [
    'googlebot',
    'google-inspectiontool',
    'google-extended',
    'bingbot',
    'bingpreview',
    'msnbot',
    'oai-searchbot',
    'chatgpt-user',
    'gptbot',
    'perplexitybot',
    'perplexity-user',
    'claudebot',
    'anthropic-ai',
    'claude-web',
    'meta-externalagent',
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
  const bingCode = resolveBingVerificationCode();
  const robots = noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  let tags = `\n    <!-- Server-Side SEO & OpenGraph Meta Injection (Crawler Optimized) -->\n`;
  tags += `    <title>${escapeXmlString(title)}</title>\n`;
  tags += `    <meta name="description" content="${escapeXmlString(description)}" />\n`;
  tags += `    <meta name="robots" content="${robots}" />\n`;
  if (bingCode) {
    tags += `    <meta name="msvalidate.01" content="${escapeXmlString(bingCode)}" />\n`;
  }
  tags += `    <link rel="canonical" href="${escapeXmlString(canonicalUrl)}" />\n`;
  tags += `    <link rel="alternate" type="application/rss+xml" title="Korean Skin Food BD Feed" href="${escapeXmlString(fallbackBase)}/rss.xml" />\n`;
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
    .replace(/<meta\s+name=["']msvalidate\.01["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["']alternate["'][^>]*application\/rss\+xml[^>]*>/gi, '')
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

export function injectPrerenderedBodyIntoHtml(html: string, bodyHtml?: string): string {
  if (!bodyHtml) return html;
  return html.replace(
    /<div\s+id=["']root["']\s*>\s*<\/div>/i,
    `<div id="root">${bodyHtml}</div>`
  );
}

function renderSitemapUrlSetXml(entries: SitemapEntry[], includeImages = false): string {
  const imageNs = includeImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : '';
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNs}>\n`;
  for (const item of entries) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXmlString(item.loc)}</loc>\n`;
    xml += `    <lastmod>${escapeXmlString(item.lastmod)}</lastmod>\n`;
    xml += `    <changefreq>${escapeXmlString(item.changefreq)}</changefreq>\n`;
    xml += `    <priority>${escapeXmlString(item.priority)}</priority>\n`;
    if (includeImages && item.image?.loc) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXmlString(item.image.loc)}</image:loc>\n`;
      if (item.image.title) {
        xml += `      <image:title>${escapeXmlString(item.image.title)}</image:title>\n`;
      }
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  }
  xml += `</urlset>\n`;
  return xml;
}

function getLatestIsoDate(entries: SitemapEntry[], fallback: string): string {
  let latest = fallback;
  for (const e of entries) {
    if (e.lastmod && e.lastmod > latest) {
      latest = e.lastmod;
    }
  }
  return latest;
}

// ==========================================
// 1. DYNAMIC ROBOTS.TXT
// ==========================================
router.get('/robots.txt', async (req, res) => {
  const siteBase = resolveSiteBaseUrl(req);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=1800');

  let dynamicNoindexLines: string[] = [];
  try {
    const catalog = await loadLiveSeoCatalog(siteBase);
    dynamicNoindexLines = Array.from(catalog.noindexPaths)
      .filter((p) => !isPrivateOrAdminPath(p))
      .sort()
      .map((p) => `Disallow: ${p}`);
  } catch {
    dynamicNoindexLines = [];
  }

  const publicAllowRules = [
    'Allow: /',
    'Allow: /shop',
    'Allow: /product/',
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
    'Allow: /data-deletion',
    'Allow: /become-a-creator',
    'Allow: /llms.txt',
    'Allow: /llms-full.txt',
    'Allow: /rss.xml',
    'Allow: /feed.xml',
  ];

  const privateDisallowRules = [
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /login',
    'Disallow: /profile',
    'Disallow: /checkout',
    'Disallow: /thank-you',
    'Disallow: /wholesale',
    'Disallow: /wholesale/',
    'Disallow: /creator/dashboard',
    'Disallow: /creator/profile',
    'Disallow: /creator/reels',
    'Disallow: /pos',
    'Disallow: /pos/',
    'Disallow: /api/',
    ...dynamicNoindexLines,
  ];

  const buildBotBlock = (agentName: string) =>
    [`User-agent: ${agentName}`, ...publicAllowRules, ...privateDisallowRules, ''].join('\n');

  const robotsTxt = [
    `# Dynamic robots.txt for Korean Skin Food BD (${siteBase}/)`,
    '# Optimized for Search Engines and AI Discovery Crawlers',
    '',
    buildBotBlock('Googlebot'),
    buildBotBlock('Bingbot'),
    buildBotBlock('OAI-SearchBot'),
    buildBotBlock('PerplexityBot'),
    buildBotBlock('*'),
    '# Sitemap Index & Segmented XML Sitemaps',
    `Sitemap: ${siteBase}/sitemap.xml`,
    `Sitemap: ${siteBase}/sitemap-pages.xml`,
    `Sitemap: ${siteBase}/sitemap-products.xml`,
    `Sitemap: ${siteBase}/sitemap-categories.xml`,
    `Sitemap: ${siteBase}/sitemap-brands.xml`,
    `Sitemap: ${siteBase}/sitemap-guides.xml`,
    `Sitemap: ${siteBase}/sitemap-ingredients.xml`,
  ].join('\n');

  return res.send(robotsTxt);
});

// ==========================================
// 2. SITEMAP INDEX & 6 SEGMENTED XML SITEMAPS
// ==========================================
router.get('/sitemap.xml', async (req, res) => {
  try {
    const siteBase = resolveSiteBaseUrl(req);
    const catalog = await loadLiveSeoCatalog(siteBase);
    const todayIso = new Date().toISOString().split('T')[0];

    const subSitemaps = [
      { loc: `${siteBase}/sitemap-pages.xml`, lastmod: getLatestIsoDate(catalog.pages, todayIso) },
      { loc: `${siteBase}/sitemap-products.xml`, lastmod: getLatestIsoDate(catalog.products, todayIso) },
      { loc: `${siteBase}/sitemap-categories.xml`, lastmod: getLatestIsoDate(catalog.categories, todayIso) },
      { loc: `${siteBase}/sitemap-brands.xml`, lastmod: getLatestIsoDate(catalog.brands, todayIso) },
      { loc: `${siteBase}/sitemap-guides.xml`, lastmod: getLatestIsoDate(catalog.guides, todayIso) },
      { loc: `${siteBase}/sitemap-ingredients.xml`, lastmod: getLatestIsoDate(catalog.ingredients, todayIso) },
    ];

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=1800');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const sm of subSitemaps) {
      xml += `  <sitemap>\n`;
      xml += `    <loc>${escapeXmlString(sm.loc)}</loc>\n`;
      xml += `    <lastmod>${escapeXmlString(sm.lastmod)}</lastmod>\n`;
      xml += `  </sitemap>\n`;
    }
    xml += `</sitemapindex>\n`;

    return res.send(xml);
  } catch (err) {
    console.error('[SitemapIndex] Error:', err);
    return res.status(500).send('<!-- Error building sitemap index -->');
  }
});

const sendSubSitemap = (
  segment: keyof Pick<LiveSeoCatalog, 'pages' | 'products' | 'categories' | 'brands' | 'guides' | 'ingredients'>,
  includeImages = false
): express.RequestHandler => {
  return async (req, res) => {
    try {
      const siteBase = resolveSiteBaseUrl(req);
      const catalog = await loadLiveSeoCatalog(siteBase);
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=1800');
      return res.send(renderSitemapUrlSetXml(catalog[segment], includeImages));
    } catch (err) {
      console.error(`[Sitemap:${segment}] Error:`, err);
      return res.status(500).send(`<!-- Error building sitemap-${segment} -->`);
    }
  };
};

router.get('/sitemap-pages.xml', sendSubSitemap('pages', false));
router.get('/sitemap-products.xml', sendSubSitemap('products', true));
router.get('/sitemap-categories.xml', sendSubSitemap('categories', false));
router.get('/sitemap-brands.xml', sendSubSitemap('brands', false));
router.get('/sitemap-guides.xml', sendSubSitemap('guides', false));
router.get('/sitemap-ingredients.xml', sendSubSitemap('ingredients', false));

// ==========================================
// 3. LLMS.TXT, LLMS-FULL.TXT & RSS FEED
// ==========================================
router.get('/llms.txt', async (req, res) => {
  try {
    const siteBase = resolveSiteBaseUrl(req);
    const catalog = await loadLiveSeoCatalog(siteBase);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800');

    const lines: string[] = [
      '# Korean Skin Food BD',
      '',
      `> Authentic Korean skincare & K-Beauty e-commerce storefront in Bangladesh (${siteBase}).`,
      '',
      '- Primary Domain: https://koreanskinfood.com',
      '- Location & Shipping: Banani Road 11, Dhaka 1213, Bangladesh (Nationwide Cash on Delivery)',
      `- Full Product & Knowledge Index: ${siteBase}/llms-full.txt`,
      `- XML Sitemap Index: ${siteBase}/sitemap.xml`,
      `- RSS Feed: ${siteBase}/rss.xml`,
      '',
      '## Key Hubs & Sitemaps',
      `- [All Products Catalog](${siteBase}/shop): Full browsable K-Beauty catalog with category, brand, skin type & concern filters.`,
      `- [Authorized Brand Hubs](${siteBase}/brands): Dedicated brand stores (${catalog.rawBrands.map((b) => b.name).join(', ')}).`,
      `- [Skincare Guides & Routines](${siteBase}/guides): Educational articles tailored for Bangladesh climate & skin concerns.`,
      `- [Ingredient Library](${siteBase}/ingredients): Evidence-aware guide to K-Beauty cosmetic actives & soothing ingredients.`,
      `- [Skin Concern Solutions](${siteBase}/concerns): Routine recommendations by concern.`,
      `- [Authenticity & Verification](${siteBase}/authenticity): Batch code checks and 48-hour inspection support.`,
      '',
      '## Featured Brands',
      ...catalog.rawBrands.slice(0, 20).map((b) => `- [${b.name}](${siteBase}/brand/${b.slug})`),
      '',
      '## Top Products',
      ...catalog.rawProducts.slice(0, 30).map((p) => {
        const price = p.discountPrice > 0 ? p.discountPrice : p.discountRetailPrice > 0 ? p.discountRetailPrice : p.price || p.retailPrice || 0;
        return `- [${p.name}](${p.canonicalUrl}) — ${p.brand || 'K-Beauty'} | BDT ${price}`;
      }),
      '',
      '## Skincare Guides',
      ...catalog.rawGuides.slice(0, 20).map((g) => `- [${g.title}](${g.canonicalUrl}): ${g.excerpt || ''}`),
      '',
      '## Legal & Compliance',
      `- [Privacy Policy](${siteBase}/privacy-policy)`,
      `- [Terms of Service](${siteBase}/terms-of-service)`,
      `- [User Data Deletion Instructions](${siteBase}/data-deletion)`,
    ];

    return res.send(lines.join('\n'));
  } catch (err) {
    console.error('[llms.txt] Error:', err);
    return res.status(500).send('# Korean Skin Food BD\n\nError generating llms.txt');
  }
});

router.get('/llms-full.txt', async (req, res) => {
  try {
    const siteBase = resolveSiteBaseUrl(req);
    const catalog = await loadLiveSeoCatalog(siteBase);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800');

    const sections: string[] = [
      '# Korean Skin Food BD — Complete Knowledge & Product Catalog',
      '',
      `Canonical Site: ${siteBase}`,
      `Generated: ${new Date().toISOString()}`,
      `Total Active Products: ${catalog.rawProducts.length}`,
      `Total Active Brands: ${catalog.rawBrands.length}`,
      `Total Skincare Guides: ${catalog.rawGuides.length}`,
      `Total Ingredients: ${catalog.rawIngredients.length}`,
      '',
      '---',
      '## 1. Categories',
      ...catalog.rawCategories.map((c) => `- ${c.name}: ${siteBase}${c.path}`),
      '',
      '---',
      '## 2. Brands',
      ...catalog.rawBrands.map((b) => `- **${b.name}** (${siteBase}/brand/${b.slug}): ${b.description || ''}`),
      '',
      '---',
      '## 3. Active Product Catalog',
    ];

    for (const p of catalog.rawProducts) {
      const regularPrice = typeof p.price === 'number' ? p.price : p.retailPrice || 0;
      const salePrice =
        typeof p.discountPrice === 'number' && p.discountPrice > 0
          ? p.discountPrice
          : typeof p.discountRetailPrice === 'number' && p.discountRetailPrice > 0
            ? p.discountRetailPrice
            : regularPrice;
      const activePrice = salePrice > 0 ? salePrice : regularPrice;
      const stockStatus = (p.stock ?? 0) > 0 ? `In Stock (${p.stock} units)` : 'Out of Stock';

      sections.push(`### ${p.name}`);
      sections.push(`- URL: ${p.canonicalUrl}`);
      sections.push(`- Brand: ${p.brand || 'Korean Skin Food BD'}`);
      sections.push(`- Category: ${p.category || 'Skincare'}`);
      if (p.ml) sections.push(`- Size: ${p.ml}`);
      sections.push(`- Price: BDT ${activePrice}${regularPrice > activePrice ? ` (Regular: BDT ${regularPrice})` : ''}`);
      sections.push(`- Availability: ${stockStatus}`);
      if (Array.isArray(p.skinTypes) && p.skinTypes.length > 0) {
        sections.push(`- Skin Types: ${p.skinTypes.join(', ')}`);
      }
      if (Array.isArray(p.keyIngredients) && p.keyIngredients.length > 0) {
        sections.push(`- Key Ingredients: ${p.keyIngredients.join(', ')}`);
      }
      if (p.description) {
        sections.push(`- Description: ${String(p.description).replace(/\s+/g, ' ').trim()}`);
      }
      if (p.howToUse) {
        sections.push(`- How to Use: ${String(p.howToUse).replace(/\s+/g, ' ').trim()}`);
      }
      sections.push('');
    }

    sections.push('---', '## 4. Skincare Ingredients Library');
    for (const ing of catalog.rawIngredients) {
      sections.push(`- **${ing.name}** (${siteBase}/ingredient/${ing.slug})${ing.shortRole ? ` — ${ing.shortRole}` : ''}: ${ing.summary || ''}`);
    }

    sections.push('', '---', '## 5. Educational Skincare Guides');
    for (const g of catalog.rawGuides) {
      sections.push(`### ${g.title}`);
      sections.push(`- URL: ${g.canonicalUrl}`);
      if (g.excerpt) sections.push(`- Summary: ${g.excerpt}`);
      if (g.content) {
        sections.push(`- Content Preview: ${String(g.content).replace(/\s+/g, ' ').trim().slice(0, 800)}`);
      }
      sections.push('');
    }

    return res.send(sections.join('\n'));
  } catch (err) {
    console.error('[llms-full.txt] Error:', err);
    return res.status(500).send('# Korean Skin Food BD\n\nError generating llms-full.txt');
  }
});

const handleRssFeed: express.RequestHandler = async (req, res) => {
  try {
    const siteBase = resolveSiteBaseUrl(req);
    const catalog = await loadLiveSeoCatalog(siteBase);

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800');

    const guideItems = catalog.rawGuides.slice(0, 20).map((g) => ({
      title: g.title,
      link: g.canonicalUrl,
      guid: g.canonicalUrl,
      description: g.excerpt || g.title,
      category: 'Skincare Guide',
      pubDate: new Date(g.lastUpdatedDate || g.publishedDate || Date.now()).toUTCString(),
    }));

    const productItems = catalog.rawProducts.slice(0, 30).map((p) => {
      const price = p.discountPrice > 0 ? p.discountPrice : p.discountRetailPrice > 0 ? p.discountRetailPrice : p.price || p.retailPrice || 0;
      const desc = `${p.brand ? `${p.brand} — ` : ''}${p.category || 'Korean Skincare'} — BDT ${price}. ${(p.description || '').slice(0, 220)}`;
      return {
        title: p.name,
        link: p.canonicalUrl,
        guid: p.canonicalUrl,
        description: desc,
        category: p.category || 'Product',
        pubDate: new Date(p.updatedAt || p.createdAt || Date.now()).toUTCString(),
      };
    });

    const itemsXml = [...guideItems, ...productItems]
      .map(
        (item) => `    <item>
      <title>${escapeXmlString(item.title)}</title>
      <link>${escapeXmlString(item.link)}</link>
      <guid isPermaLink="true">${escapeXmlString(item.guid)}</guid>
      <description>${escapeXmlString(item.description)}</description>
      <category>${escapeXmlString(item.category)}</category>
      <pubDate>${escapeXmlString(item.pubDate)}</pubDate>
    </item>`
      )
      .join('\n');

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Korean Skin Food BD — Products &amp; Skincare Guides</title>
    <link>${escapeXmlString(siteBase)}/</link>
    <description>Latest authentic Korean skincare products, brand highlights, and educational skincare guides from Korean Skin Food BD.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXmlString(siteBase)}/rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>
`;
    return res.send(rssXml);
  } catch (err) {
    console.error('[RSS] Error:', err);
    return res.status(500).send('<!-- Error generating RSS feed -->');
  }
};

router.get('/rss.xml', handleRssFeed);
router.get('/feed.xml', handleRssFeed);

// ==========================================
// 4. BING WEBMASTER & INDEXNOW SUPPORT
// ==========================================
router.get('/BingSiteAuth.xml', (_req, res) => {
  const code = resolveBingVerificationCode();
  if (!code) {
    return res.status(404).type('application/xml').send('<!-- BING_SITE_VERIFICATION not configured -->');
  }
  const xml = `<?xml version="1.0"?>\n<users>\n\t<user>${escapeXmlString(code)}</user>\n</users>\n`;
  return res.type('application/xml').send(xml);
});

router.get(/^\/([a-zA-Z0-9-]{8,128})\.txt$/, (req, res, next) => {
  const activeKey = resolveIndexNowKey();
  const requestedKey = req.params[0];
  if (requestedKey !== activeKey) {
    return next();
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.send(activeKey);
});

router.get('/api/seo/indexnow/status', verifyAdminAuth, (req, res) => {
  const siteBase = resolveSiteBaseUrl(req);
  const key = resolveIndexNowKey();
  const bingCode = resolveBingVerificationCode();
  return res.json({
    success: true,
    configured: Boolean(key),
    key,
    keyLocation: `${siteBase}/${key}.txt`,
    bingConfigured: Boolean(bingCode),
    bingMetaName: 'msvalidate.01',
    sitemaps: [
      `${siteBase}/sitemap.xml`,
      `${siteBase}/sitemap-pages.xml`,
      `${siteBase}/sitemap-products.xml`,
      `${siteBase}/sitemap-categories.xml`,
      `${siteBase}/sitemap-brands.xml`,
      `${siteBase}/sitemap-guides.xml`,
      `${siteBase}/sitemap-ingredients.xml`,
    ],
    feeds: {
      llmsTxt: `${siteBase}/llms.txt`,
      llmsFullTxt: `${siteBase}/llms-full.txt`,
      rss: `${siteBase}/rss.xml`,
    },
  });
});

router.post('/api/seo/indexnow', verifyAdminAuth, async (req, res) => {
  try {
    const siteBase = resolveSiteBaseUrl(req);
    const activeUrl = new URL(siteBase);
    const allowedHosts = new Set([activeUrl.hostname.toLowerCase(), 'koreanskinfood.com', 'www.koreanskinfood.com']);
    const key = resolveIndexNowKey();
    const keyLocation = `${siteBase}/${key}.txt`;

    const requestedUrls: unknown = req.body?.urls;
    const submitSitemap = Boolean(req.body?.submitSitemap);

    let urlList: string[] = [];
    if (Array.isArray(requestedUrls) && requestedUrls.length > 0 && !submitSitemap) {
      urlList = requestedUrls
        .map((raw) => String(raw || '').trim())
        .filter(Boolean)
        .map((raw) => (/^https?:\/\//i.test(raw) ? raw : `${siteBase}${raw.startsWith('/') ? raw : `/${raw}`}`))
        .filter((candidate) => {
          try {
            const parsed = new URL(candidate);
            return parsed.protocol === 'https:' && allowedHosts.has(parsed.hostname.toLowerCase());
          } catch {
            return false;
          }
        })
        .slice(0, 500);
    } else {
      const catalog = await loadLiveSeoCatalog(siteBase);
      urlList = [
        ...catalog.pages.map((e) => e.loc),
        ...catalog.products.map((e) => e.loc),
        ...catalog.brands.map((e) => e.loc),
        ...catalog.guides.map((e) => e.loc),
        ...catalog.categories.map((e) => e.loc),
        ...catalog.ingredients.map((e) => e.loc),
      ].slice(0, 1000);
    }

    urlList = Array.from(new Set(urlList));
    if (urlList.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid URLs on koreanskinfood.com to submit to IndexNow.' });
    }

    // IndexNow requires publicly resolvable production host; normalize host to siteBase hostname (or koreanskinfood.com)
    const submitHost = activeUrl.hostname.includes('localhost')
      ? new URL(DEFAULT_SITE_URL).hostname
      : activeUrl.hostname;
    const normalizedUrls = urlList.map((u) => {
      try {
        const parsed = new URL(u);
        parsed.hostname = submitHost;
        parsed.port = '';
        parsed.protocol = 'https:';
        return parsed.toString();
      } catch {
        return u;
      }
    });

    const payload = {
      host: submitHost,
      key,
      keyLocation: `https://${submitHost}/${key}.txt`,
      urlList: normalizedUrls,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let upstreamStatus = 200;
    let upstreamText = '';
    try {
      const resp = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      upstreamStatus = resp.status;
      upstreamText = await resp.text().catch(() => '');
    } finally {
      clearTimeout(timeout);
    }

    return res.json({
      success: upstreamStatus >= 200 && upstreamStatus < 300,
      upstreamStatus,
      upstreamMessage: upstreamText || (upstreamStatus === 200 || upstreamStatus === 202 ? 'Accepted by IndexNow' : 'IndexNow response received'),
      submittedCount: normalizedUrls.length,
      keyLocation: payload.keyLocation,
      sampleUrls: normalizedUrls.slice(0, 10),
    });
  } catch (err: any) {
    console.error('[IndexNow] Error:', err);
    return res.status(502).json({
      success: false,
      error: err?.message || 'Failed to reach IndexNow API',
    });
  }
});

// ==========================================
// 5. ADMIN SEO OVERVIEW STATS
// ==========================================
router.get('/api/seo/overview', verifyAdminAuth, async (req, res) => {
  try {
    const siteBase = resolveSiteBaseUrl(req);
    const catalog = await loadLiveSeoCatalog(siteBase);
    const products = catalog.rawProducts;

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

    const indexNowKey = resolveIndexNowKey();
    const totalSitemapUrls =
      catalog.pages.length +
      catalog.products.length +
      catalog.categories.length +
      catalog.brands.length +
      catalog.guides.length +
      catalog.ingredients.length;

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
        sitemapProductCount: catalog.products.length,
        pagesCount: catalog.pages.length,
        productsCount: catalog.products.length,
        categoriesCount: catalog.categories.length,
        brandsCount: catalog.brands.length,
        guidesCount: catalog.guides.length,
        ingredientsCount: catalog.ingredients.length,
        totalSitemapUrls,
        indexNowKey,
        indexNowKeyUrl: `${siteBase}/${indexNowKey}.txt`,
        bingConfigured: Boolean(resolveBingVerificationCode()),
        lastAuditTimestamp: new Date().toISOString(),
      },
      issues: issuesList.slice(0, 50),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// ==========================================
// 6. SERVER-SIDE BOT PRERENDERER & METADATA BUILDER
// ==========================================
interface PrerenderPayload {
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
  bodyHtml: string;
}

function buildPrerenderShell(
  siteBase: string,
  title: string,
  description: string,
  mainHtml: string
): string {
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:1100px;margin:0 auto;padding:24px;color:#111827;background:#FFFBFD;">
      <header style="border-bottom:1px solid #FCE7F3;padding-bottom:16px;margin-bottom:24px;">
        <a href="${escapeXmlString(siteBase)}/" style="font-weight:800;font-size:20px;color:#E91E8C;text-decoration:none;">Korean Skin Food BD</a>
        <nav aria-label="Primary Navigation" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:14px;font-size:14px;">
          <a href="${escapeXmlString(siteBase)}/shop">Shop</a>
          <a href="${escapeXmlString(siteBase)}/brands">Brands</a>
          <a href="${escapeXmlString(siteBase)}/guides">Skincare Guides</a>
          <a href="${escapeXmlString(siteBase)}/ingredients">Ingredients</a>
          <a href="${escapeXmlString(siteBase)}/concerns">Skin Concerns</a>
          <a href="${escapeXmlString(siteBase)}/authenticity">Authenticity</a>
          <a href="${escapeXmlString(siteBase)}/about-us">About Us</a>
          <a href="${escapeXmlString(siteBase)}/contact-us">Contact Us</a>
        </nav>
      </header>
      <main>
        ${mainHtml}
      </main>
      <footer style="border-top:1px solid #FCE7F3;margin-top:32px;padding-top:16px;font-size:13px;color:#4B5563;">
        <p>${escapeXmlString(title)} — ${escapeXmlString(description)}</p>
        <p>
          <a href="${escapeXmlString(siteBase)}/privacy-policy">Privacy Policy</a> |
          <a href="${escapeXmlString(siteBase)}/terms-of-service">Terms of Service</a> |
          <a href="${escapeXmlString(siteBase)}/data-deletion">Data Deletion</a> |
          <a href="${escapeXmlString(siteBase)}/sitemap.xml">Sitemap</a> |
          <a href="${escapeXmlString(siteBase)}/llms.txt">LLMs Index</a> |
          <a href="${escapeXmlString(siteBase)}/rss.xml">RSS Feed</a>
        </p>
      </footer>
    </div>
  `.trim();
}

export async function buildBotPrerenderResult(req: express.Request): Promise<PrerenderPayload> {
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

  const applySeoOverride = (baseMeta: typeof meta, override: any | null) => {
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

  // PRODUCT ROUTE PRERENDERING
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
        // fallback to bundled initial products below
      }
    }

    if (!product && prodParam) {
      const lowerParam = prodParam.toLowerCase();
      product =
        INITIAL_PRODUCTS.find(
          (p) => p.id === prodParam || (p.seoSlug && p.seoSlug.toLowerCase() === lowerParam)
        ) || null;
    }

    if (product && !product.isDeleted && !product.deleted && product.status !== 'deleted') {
      const sizeSuffix = product.ml && String(product.ml).trim() ? ` ${String(product.ml).trim()}` : '';
      const pTitle =
        (product.seoTitle || product.metaTitle)?.trim() ||
        `${product.name}${sizeSuffix} | Price in Bangladesh | Korean Skin Food BD`;
      const pDesc =
        product.metaDescription?.trim() ||
        `Discover ${product.name} at Korean Skin Food BD. Explore product details, ingredients, skin compatibility, directions for use, and current availability in Bangladesh.`;

      const regularPrice = typeof product.price === 'number' ? product.price : product.retailPrice || 0;
      const salePrice =
        typeof product.discountPrice === 'number' && product.discountPrice > 0
          ? product.discountPrice
          : typeof product.discountRetailPrice === 'number' && product.discountRetailPrice > 0
            ? product.discountRetailPrice
            : regularPrice;
      const activePrice = salePrice > 0 ? salePrice : regularPrice;
      const isAvail = (product.stock ?? 0) > 0;
      const productPath = getProductPath(product);
      const productUrl = `${siteBase}${productPath}`;
      const brandName = product.brand || 'Korean Skin Food BD';
      const brandSlug = slugifySeoSegment(brandName);
      const primaryImg = product.ogImage || product.image || (Array.isArray(product.images) && product.images[0]) || defaultOgImage;
      const imageAlt = product.ogImageAlt || product.imageAltText || product.altText || `${product.name} ${brandName} authentic Korean skincare in Bangladesh`;

      const productSchema: any = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${productUrl}#product`,
        name: product.name,
        image: [product.ogImage, product.image, ...(product.images || [])].filter(Boolean),
        description: String(product.description || pDesc),
        sku: product.sku || product.barcode || product.id,
        brand: {
          '@type': 'Brand',
          name: brandName,
        },
        offers: {
          '@type': 'Offer',
          url: productUrl,
          priceCurrency: 'BDT',
          price: activePrice,
          priceValidUntil: '2028-12-31',
          availability: isAvail ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            '@type': 'Organization',
            name: 'Korean Skin Food BD',
          },
        },
      };

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteBase}/` },
          {
            '@type': 'ListItem',
            position: 2,
            name: product.category || 'Skincare',
            item: `${siteBase}/shop?category=${encodeURIComponent(product.category || 'All')}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: brandName,
            item: `${siteBase}/brand/${brandSlug}`,
          },
          { '@type': 'ListItem', position: 4, name: product.name, item: productUrl },
        ],
      };

      const schemas: any[] = [productSchema, breadcrumbSchema];
      const validFaqs = Array.isArray(product.faqs)
        ? product.faqs.filter((f: any) => f?.question?.trim() && f?.answer?.trim())
        : [];
      if (validFaqs.length > 0) {
        schemas.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: validFaqs.map((faq: any) => ({
            '@type': 'Question',
            name: String(faq.question).trim(),
            acceptedAnswer: { '@type': 'Answer', text: String(faq.answer).trim() },
          })),
        });
      }

      meta = {
        title: pTitle,
        description: pDesc,
        canonicalUrl: productUrl,
        ogImage: primaryImg,
        ogImageAlt: imageAlt,
        ogType: 'product',
        noindex: Boolean(product.noindex),
        jsonLd: schemas,
      };

      let override: any = null;
      if (db) {
        try {
          const snap = await getDoc(doc(db, 'seo_pages', encodeSeoPageDocId(productPath)));
          if (snap.exists()) override = snap.data();
          else override = await resolvePageSeoOverride();
        } catch {
          override = null;
        }
      }

      const finalMeta = applySeoOverride(meta, override);

      const skinTypesHtml =
        Array.isArray(product.skinTypes) && product.skinTypes.length > 0
          ? `<p><strong>Suitable Skin Types:</strong> ${escapeXmlString(product.skinTypes.join(', '))}</p>`
          : '';
      const ingredientsHtml =
        Array.isArray(product.keyIngredients) && product.keyIngredients.length > 0
          ? `<section><h2>Key Ingredients</h2><ul>${product.keyIngredients
              .map((ing: string) => `<li>${escapeXmlString(ing)}</li>`)
              .join('')}</ul></section>`
          : '';
      const howToUseHtml = product.howToUse
        ? `<section><h2>How to Use</h2><p>${escapeXmlString(String(product.howToUse))}</p></section>`
        : '';
      const faqHtml =
        validFaqs.length > 0
          ? `<section><h2>Frequently Asked Questions</h2><dl>${validFaqs
              .map(
                (f: any) =>
                  `<dt><strong>${escapeXmlString(f.question)}</strong></dt><dd>${escapeXmlString(f.answer)}</dd>`
              )
              .join('')}</dl></section>`
          : '';

      const productBody = `
        <article itemscope itemtype="https://schema.org/Product">
          <nav aria-label="Breadcrumb">
            <a href="${escapeXmlString(siteBase)}/">Home</a> &gt;
            <a href="${escapeXmlString(siteBase)}/shop?category=${encodeURIComponent(product.category || 'All')}">${escapeXmlString(product.category || 'Skincare')}</a> &gt;
            <a href="${escapeXmlString(siteBase)}/brand/${escapeXmlString(brandSlug)}">${escapeXmlString(brandName)}</a> &gt;
            <span>${escapeXmlString(product.name)}</span>
          </nav>
          <h1 itemprop="name">${escapeXmlString(product.name)}</h1>
          <p>
            <strong>Brand:</strong> <span itemprop="brand">${escapeXmlString(brandName)}</span> |
            <strong>Category:</strong> ${escapeXmlString(product.category || 'Skincare')}
            ${product.ml ? `| <strong>Size:</strong> ${escapeXmlString(String(product.ml))}` : ''}
          </p>
          <p>
            <strong>Price in Bangladesh:</strong> BDT ${escapeXmlString(String(activePrice))}
            ${regularPrice > activePrice ? `<s>BDT ${escapeXmlString(String(regularPrice))}</s>` : ''} |
            <strong>Availability:</strong> ${isAvail ? `In Stock (${product.stock} available)` : 'Out of Stock'}
          </p>
          <img src="${escapeXmlString(primaryImg)}" alt="${escapeXmlString(imageAlt)}" style="max-width:480px;height:auto;border-radius:12px;" />
          <section>
            <h2>Product Details</h2>
            <p itemprop="description">${escapeXmlString(String(product.description || pDesc))}</p>
            ${skinTypesHtml}
          </section>
          ${ingredientsHtml}
          ${howToUseHtml}
          ${faqHtml}
          <section>
            <h2>Order &amp; Delivery in Bangladesh</h2>
            <p>100% authentic Korean skincare sourced from authorized distributors. Cash on Delivery available across Dhaka and nationwide in Bangladesh.</p>
          </section>
        </article>
      `;

      return {
        status: 200,
        meta: finalMeta,
        bodyHtml: buildPrerenderShell(siteBase, finalMeta.title, finalMeta.description, productBody),
      };
    }

    const notFoundMeta = {
      ...meta,
      title: 'Product Not Found | Korean Skin Food BD',
      description: 'The requested Korean skincare product could not be found or is currently unavailable.',
      noindex: true,
    };
    return {
      status: 404,
      meta: notFoundMeta,
      bodyHtml: buildPrerenderShell(
        siteBase,
        notFoundMeta.title,
        notFoundMeta.description,
        `<h1>Product Not Found</h1><p>${escapeXmlString(notFoundMeta.description)}</p><p><a href="${escapeXmlString(siteBase)}/shop">Browse All Korean Skincare Products</a></p>`
      ),
    };
  }

  // BRAND ROUTE
  let pageSpecificMain = '';
  if (req.path.startsWith('/brand/')) {
    const bSlug = slugifySeoSegment(req.path.replace('/brand/', ''));
    const profile = BRAND_SEO_PROFILES[bSlug];
    const brandName =
      profile?.name ||
      bSlug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    meta.title = `${brandName} in Bangladesh | Korean Skin Food BD`;
    meta.description = `Explore ${brandName} skincare products in Bangladesh at Korean Skin Food BD. View product details, key ingredients, and Cash on Delivery options.`;
    meta.canonicalUrl = `${siteBase}/brand/${bSlug}`;
    const matchingProducts = INITIAL_PRODUCTS.filter(
      (p) => slugifySeoSegment(p.brand) === bSlug
    ).slice(0, 24);
    pageSpecificMain = `
      <h1>${escapeXmlString(brandName)} in Bangladesh</h1>
      <p>${escapeXmlString(profile?.description || meta.description)}</p>
      ${profile?.philosophy ? `<p>${escapeXmlString(profile.philosophy)}</p>` : ''}
      <h2>Featured ${escapeXmlString(brandName)} Products</h2>
      <ul>
        ${matchingProducts
          .map(
            (p) =>
              `<li><a href="${escapeXmlString(siteBase + getProductPath(p))}">${escapeXmlString(p.name)}</a> — BDT ${escapeXmlString(String(p.discountPrice || p.price))}</li>`
          )
          .join('')}
      </ul>
    `;
  } else if (req.path === '/brands') {
    meta.title = 'Official Korean Skincare Brands in Bangladesh | Korean Skin Food BD';
    meta.description = 'Explore official Korean skincare brands available in Bangladesh at Korean Skin Food BD.';
    pageSpecificMain = `
      <h1>Korean Skincare Brands</h1>
      <p>${escapeXmlString(meta.description)}</p>
      <ul>
        ${Object.values(BRAND_SEO_PROFILES)
          .map(
            (b) =>
              `<li><a href="${escapeXmlString(siteBase)}/brand/${escapeXmlString(b.slug)}"><strong>${escapeXmlString(b.name)}</strong></a> — ${escapeXmlString(b.tagline)}</li>`
          )
          .join('')}
      </ul>
    `;
  } else if (req.path.startsWith('/guide/')) {
    const gSlug = req.path.replace('/guide/', '').trim().toLowerCase();
    let guide: any = INITIAL_SKINCARE_GUIDES.find((g) => g.slug.toLowerCase() === gSlug) || null;
    if (db && gSlug) {
      try {
        const snap = await getDoc(doc(db, 'educational_articles', gSlug));
        if (snap.exists()) {
          guide = snap.data();
        }
      } catch {
        // keep static guide fallback
      }
    }
    const guideTitle =
      guide?.title ||
      gSlug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    meta.title = `${guideTitle} | Korean Skin Food BD`;
    meta.description =
      guide?.excerpt ||
      `Learn practical Korean skincare routines, key active ingredients, and skin barrier care adapted for Bangladesh.`;
    meta.canonicalUrl = `${siteBase}/guide/${gSlug}`;
    meta.ogType = 'article';
    if (guide?.heroImage) meta.ogImage = guide.heroImage;
    if (guide?.isDeleted || guide?.status === 'draft') meta.noindex = true;
    pageSpecificMain = `
      <article>
        <h1>${escapeXmlString(guideTitle)}</h1>
        <p>${escapeXmlString(meta.description)}</p>
        ${guide?.content ? `<div>${escapeXmlString(String(guide.content).slice(0, 4000))}</div>` : ''}
      </article>
    `;
  } else if (req.path === '/guides') {
    meta.title = 'Korean Skincare Guides & Routines | Korean Skin Food BD';
    meta.description = 'Read skincare guides, sunscreen comparisons, and barrier care routines tailored for Bangladesh.';
    pageSpecificMain = `
      <h1>Skincare Guides &amp; Educational Articles</h1>
      <ul>
        ${INITIAL_SKINCARE_GUIDES.map(
          (g) =>
            `<li><a href="${escapeXmlString(siteBase)}/guide/${escapeXmlString(g.slug)}"><strong>${escapeXmlString(g.title)}</strong></a> — ${escapeXmlString(g.excerpt)}</li>`
        ).join('')}
      </ul>
    `;
  } else if (req.path === '/ingredients' || req.path.startsWith('/ingredient/')) {
    const ingSlug = req.path.startsWith('/ingredient/') ? req.path.replace('/ingredient/', '').trim().toLowerCase() : '';
    const matchedIng = ingSlug ? INGREDIENT_LIBRARY.find((i) => i.slug === ingSlug) : null;
    meta.title = matchedIng
      ? `${matchedIng.name} in Korean Skincare | Korean Skin Food BD`
      : 'Korean Skincare Ingredient Library | Korean Skin Food BD';
    meta.description =
      matchedIng?.summary ||
      'Explore key Korean skincare ingredients including Snail Mucin, Centella Asiatica, Niacinamide, Panthenol, and Ceramides.';
    pageSpecificMain = matchedIng
      ? `<h1>${escapeXmlString(matchedIng.name)}</h1><p>${escapeXmlString(matchedIng.summary)}</p>`
      : `<h1>Korean Skincare Ingredient Library</h1><ul>${INGREDIENT_LIBRARY.map(
          (i) => `<li><a href="${escapeXmlString(siteBase)}/ingredient/${escapeXmlString(i.slug)}">${escapeXmlString(i.name)}</a> — ${escapeXmlString(i.shortRole)}</li>`
        ).join('')}</ul>`;
  } else if (req.path === '/concerns' || req.path.startsWith('/concern/')) {
    const conSlug = req.path.startsWith('/concern/') ? req.path.replace('/concern/', '').trim().toLowerCase() : '';
    const matchedCon = conSlug ? SKIN_CONCERN_LIBRARY.find((c) => c.slug === conSlug) : null;
    meta.title = matchedCon
      ? `Korean Skincare for ${matchedCon.title} | Korean Skin Food BD`
      : 'Shop by Skin Concern | Korean Skin Food BD';
    meta.description =
      matchedCon?.summary ||
      'Explore gentle Korean skincare routines by concern: hydration, oil control, barrier support, soothing, and uneven tone.';
    pageSpecificMain = matchedCon
      ? `<h1>${escapeXmlString(matchedCon.title)}</h1><p>${escapeXmlString(matchedCon.summary)}</p>`
      : `<h1>Skin Concerns &amp; Solutions</h1><ul>${SKIN_CONCERN_LIBRARY.map(
          (c) => `<li><a href="${escapeXmlString(siteBase)}/concern/${escapeXmlString(c.slug)}">${escapeXmlString(c.title)}</a> — ${escapeXmlString(c.summary)}</li>`
        ).join('')}</ul>`;
  } else if (req.path === '/shop') {
    const categoryQuery = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    meta.title =
      categoryQuery && categoryQuery !== 'All'
        ? `Korean ${categoryQuery} in Bangladesh | Korean Skin Food BD`
        : 'Shop Authentic Korean Skincare in Bangladesh | Korean Skin Food BD';
    meta.description =
      categoryQuery && categoryQuery !== 'All'
        ? `Shop authentic Korean ${categoryQuery} in Bangladesh. Explore trusted K-Beauty brands, verified ingredients, and fast nationwide delivery.`
        : 'Shop authentic Korean skincare in Bangladesh. Explore cleansers, toners, serums, sunscreens, and creams with fast nationwide delivery.';
    const filtered =
      categoryQuery && categoryQuery !== 'All'
        ? INITIAL_PRODUCTS.filter((p) => p.category.toLowerCase() === categoryQuery.toLowerCase())
        : INITIAL_PRODUCTS;
    pageSpecificMain = `
      <h1>${escapeXmlString(meta.title)}</h1>
      <p>${escapeXmlString(meta.description)}</p>
      <ul>
        ${filtered.slice(0, 40).map(
          (p) =>
            `<li><a href="${escapeXmlString(siteBase + getProductPath(p))}">${escapeXmlString(p.name)}</a> — ${escapeXmlString(p.brand)} — BDT ${escapeXmlString(String(p.discountPrice || p.price))}</li>`
        ).join('')}
      </ul>
    `;
  } else if (req.path === '/data-deletion' || req.path === '/user-data-deletion') {
    meta.title = 'User Data Deletion Instructions | Korean Skin Food BD';
    meta.description =
      'Official instructions for requesting removal of your account or Facebook login data from Korean Skin Food BD.';
    meta.canonicalUrl = `${siteBase}/data-deletion`;
    meta.jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'User Data Deletion Instructions',
        url: `${siteBase}/data-deletion`,
        description: meta.description,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteBase}/` },
          { '@type': 'ListItem', position: 2, name: 'Data Deletion', item: `${siteBase}/data-deletion` },
        ],
      },
    ];
    pageSpecificMain = `
      <h1>User Data Deletion Instructions</h1>
      <p>How to remove your Korean Skin Food BD account and any data associated with Facebook Login.</p>
      <ol>
        <li>Open Facebook Settings &amp; Privacy &gt; Settings &gt; Apps and Websites.</li>
        <li>Select Korean Skin Food BD and click Remove.</li>
        <li>To request complete erasure of storefront order or profile records, email support@koreanskinfood.com or privacy@koreanskinfood.com.</li>
      </ol>
    `;
  } else if (req.path === '/authenticity') {
    meta.title = 'Authenticity & Sourcing Standards | Korean Skin Food BD';
    meta.description = 'Learn how Korean Skin Food BD checks batch codes, expiry dates, and supplier documentation for skincare in Bangladesh.';
  } else if (req.path === '/skin-quiz') {
    meta.title = 'Skin Profile Quiz | Korean Skin Food BD';
    meta.description = 'Answer 5 quick questions to identify your skin type and explore tailored Korean skincare options.';
  } else if (req.path === '/routine-builder') {
    meta.title = 'AM & PM Skincare Routine Builder | Korean Skin Food BD';
    meta.description = 'Build a balanced morning and evening Korean skincare routine with layering notes and active compatibility tips.';
  } else if (req.path === '/about-us') {
    meta.title = 'About Us | Korean Skin Food BD';
    meta.description = 'Learn about Korean Skin Food BD, our authentic K-Beauty sourcing standards, and our team in Dhaka, Bangladesh.';
  } else if (req.path === '/contact-us') {
    meta.title = 'Contact Us | Korean Skin Food BD';
    meta.description = 'Reach Korean Skin Food BD customer support in Banani, Dhaka for skincare advice, orders, and assistance.';
  } else if (req.path === '/privacy-policy') {
    meta.title = 'Privacy Policy | Korean Skin Food BD';
    meta.description = 'Read how Korean Skin Food BD collects, uses, and protects your personal information in Bangladesh.';
  } else if (req.path === '/terms-of-service') {
    meta.title = 'Terms of Service | Korean Skin Food BD';
    meta.description = 'Review the terms and conditions for shopping and using Korean Skin Food BD services.';
  } else if (req.path === '/become-a-creator') {
    meta.title = 'Become a K-Beauty Creator | Korean Skin Food BD';
    meta.description = 'Join the Korean Skin Food BD creator program to review authentic Korean skincare and earn rewards.';
  } else if (isPrivateOrAdminPath(req.path)) {
    meta.noindex = true;
  }

  if (!pageSpecificMain) {
    if (req.path === '/') {
      pageSpecificMain = `
        <h1>Korean Skin Food BD — Authentic Korean Skincare in Bangladesh</h1>
        <p>${escapeXmlString(meta.description)}</p>
        <section>
          <h2>Featured K-Beauty Products</h2>
          <ul>
            ${INITIAL_PRODUCTS.slice(0, 16)
              .map(
                (p) =>
                  `<li><a href="${escapeXmlString(siteBase + getProductPath(p))}">${escapeXmlString(p.name)}</a> (${escapeXmlString(p.brand)}) — BDT ${escapeXmlString(String(p.discountPrice || p.price))}</li>`
              )
              .join('')}
          </ul>
        </section>
      `;
    } else {
      pageSpecificMain = `<h1>${escapeXmlString(meta.title)}</h1><p>${escapeXmlString(meta.description)}</p>`;
    }
  }

  const pageOverride = await resolvePageSeoOverride();
  const finalMeta = applySeoOverride(meta, pageOverride);
  return {
    status: 200,
    meta: finalMeta,
    bodyHtml: buildPrerenderShell(siteBase, finalMeta.title, finalMeta.description, pageSpecificMain),
  };
}

export async function buildBotSsrMetadata(req: express.Request) {
  const { status, meta } = await buildBotPrerenderResult(req);
  return { status, meta };
}

export default router;
