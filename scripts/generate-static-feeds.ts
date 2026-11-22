import fs from 'fs';
import path from 'path';
import { INITIAL_PRODUCTS } from '../src/data/allProducts';
import { BRAND_SEO_PROFILES } from '../src/data/brandProfiles';
import { INITIAL_SKINCARE_GUIDES } from '../src/data/skincareGuides';
import { INGREDIENT_LIBRARY } from '../src/data/ingredientLibrary';
import { SKIN_CONCERN_LIBRARY } from '../src/data/skinConcerns';

function escapeXml(s: any): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(s: any): string {
  if (!s) return '';
  return String(s)
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeCsv(s: any): string {
  if (s === null || s === undefined) return '""';
  return `"${String(s).replace(/"/g, '""')}"`;
}

const rawBaseUrl = (process.env.SITE_URL || process.env.APP_URL || 'https://koreanskinfood.com').trim().replace(/\/+$/, '');
const baseUrl = /^https?:\/\//i.test(rawBaseUrl) ? rawBaseUrl : `https://${rawBaseUrl}`;
const products = INITIAL_PRODUCTS || [];

// ==========================================
// 1. META & GOOGLE MERCHANT XML FEED
// ==========================================
const metaXmlItems = products.map((p) => {
  const id = p.id || p.barcode || 'prod';
  const name = p.name || 'Korean Skincare Product';
  const desc = stripHtml(p.description || name);
  const price = (typeof p.price === 'number' ? p.price : 0).toFixed(2);
  const link = `${baseUrl}/product/${encodeURIComponent(id)}`;
  const img = p.image || '';
  const brand = p.brand || 'Korean Skin Food BD';
  const cat = 'Health & Beauty > Personal Care > Cosmetics > Skin Care';
  const avail = ((p.stock ?? 1) > 0) ? 'in stock' : 'out of stock';

  return `    <item>
      <g:id>${escapeXml(id)}</g:id>
      <g:title>${escapeXml(name)}</g:title>
      <g:description>${escapeXml(desc)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(img)}</g:image_link>
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${avail}</g:availability>
      <g:price>${price} BDT</g:price>
      <g:google_product_category>${escapeXml(cat)}</g:google_product_category>
      <g:fb_product_category>${escapeXml(cat)}</g:fb_product_category>
    </item>`;
}).join('\n');

const fullMetaXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Korean Skin Food BD Product Catalog</title>
    <link>${baseUrl}</link>
    <description>Authentic Korean Skincare &amp; Cosmeceuticals Feed for Meta &amp; Google Merchant Center</description>
${metaXmlItems}
  </channel>
</rss>`;

// ==========================================
// 2. META CSV FEED
// ==========================================
const metaHeaders = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'brand',
  'google_product_category',
  'fb_product_category'
];

const metaCsvRows = [metaHeaders.join(',')];
for (const p of products) {
  const id = p.id || p.barcode || 'prod';
  const name = p.name || 'Korean Skincare Product';
  const desc = stripHtml(p.description || name);
  const price = `${(typeof p.price === 'number' ? p.price : 0).toFixed(2)} BDT`;
  const link = `${baseUrl}/product/${encodeURIComponent(id)}`;
  const img = p.image || '';
  const brand = p.brand || 'Korean Skin Food BD';
  const cat = 'Health & Beauty > Personal Care > Cosmetics > Skin Care';
  const avail = ((p.stock ?? 1) > 0) ? 'in stock' : 'out of stock';

  metaCsvRows.push([
    escapeCsv(id),
    escapeCsv(name),
    escapeCsv(desc),
    escapeCsv(avail),
    '"new"',
    escapeCsv(price),
    escapeCsv(link),
    escapeCsv(img),
    escapeCsv(brand),
    escapeCsv(cat),
    escapeCsv(cat)
  ].join(','));
}
const fullMetaCsv = metaCsvRows.join('\r\n');

// ==========================================
// 3. PINTEREST SHOPPING XML FEED
// ==========================================
const pinterestXmlItems = products.map((p) => {
  const id = p.id || p.barcode || 'prod';
  const name = p.name || 'Korean Skincare Product';
  const desc = stripHtml(p.description || name);
  const price = (typeof p.price === 'number' ? p.price : 0).toFixed(2);
  const link = `${baseUrl}/product/${encodeURIComponent(id)}`;
  const img = p.image || '';
  const brand = p.brand || 'Korean Skin Food BD';
  const cat = 'Health & Beauty > Personal Care > Cosmetics > Skin Care';
  const avail = ((p.stock ?? 1) > 0) ? 'in stock' : 'out of stock';

  return `    <item>
      <g:id>${escapeXml(id)}</g:id>
      <g:title><![CDATA[${name}]]></g:title>
      <g:description><![CDATA[${desc}]]></g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(img)}</g:image_link>
      <g:brand><![CDATA[${brand}]]></g:brand>
      <g:condition>new</g:condition>
      <g:availability>${avail}</g:availability>
      <g:price>${price} BDT</g:price>
      <g:google_product_category><![CDATA[${cat}]]></g:google_product_category>
      <g:item_group_id>${escapeXml(id)}</g:item_group_id>
      <g:custom_label_0>${avail === 'in stock' ? 'In Stock' : 'Out of Stock'}</g:custom_label_0>
      <g:custom_label_1><![CDATA[${brand}]]></g:custom_label_1>
      <g:custom_label_2>Korean Skin Food BD</g:custom_label_2>
    </item>`;
}).join('\n');

const fullPinterestXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Korean Skin Food BD - Pinterest Product Catalog</title>
    <link>${baseUrl}</link>
    <description>Dynamic product feed for Pinterest Shopping and Pinterest Merchant</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${pinterestXmlItems}
  </channel>
</rss>`;

// ==========================================
// 4. PINTEREST SHOPPING CSV FEED
// ==========================================
const pinterestHeaders = [
  'id',
  'title',
  'description',
  'link',
  'image_link',
  'price',
  'availability',
  'condition',
  'brand',
  'google_product_category',
  'sale_price',
  'additional_image_link',
  'item_group_id'
];

const pinterestCsvRows = [pinterestHeaders.join(',')];
for (const p of products) {
  const id = p.id || p.barcode || 'prod';
  const name = p.name || 'Korean Skincare Product';
  const desc = stripHtml(p.description || name);
  const price = `${(typeof p.price === 'number' ? p.price : 0).toFixed(2)} BDT`;
  const link = `${baseUrl}/product/${encodeURIComponent(id)}`;
  const img = p.image || '';
  const brand = p.brand || 'Korean Skin Food BD';
  const cat = 'Health & Beauty > Personal Care > Cosmetics > Skin Care';
  const avail = ((p.stock ?? 1) > 0) ? 'in stock' : 'out of stock';

  pinterestCsvRows.push([
    escapeCsv(id),
    escapeCsv(name),
    escapeCsv(desc),
    escapeCsv(link),
    escapeCsv(img),
    escapeCsv(price),
    escapeCsv(avail),
    '"new"',
    escapeCsv(brand),
    escapeCsv(cat),
    '""',
    '""',
    escapeCsv(id)
  ].join(','));
}
const fullPinterestCsv = pinterestCsvRows.join('\r\n');

// ==========================================
// 5. PINTEREST PREVIEW JSON
// ==========================================
const previewSampleItems = products.slice(0, 50).map((p) => {
  const id = p.id || p.barcode || 'prod';
  const name = p.name || 'Korean Skincare Product';
  const price = typeof p.price === 'number' ? p.price : 0;
  const avail = ((p.stock ?? 1) > 0) ? 'in stock' : 'out of stock';
  return {
    id,
    title: name,
    price,
    salePrice: null,
    currency: 'BDT',
    availability: avail,
    brand: p.brand || 'Korean Skin Food BD',
    link: `${baseUrl}/product/${encodeURIComponent(id)}`,
    imageLink: p.image || '',
    condition: 'new'
  };
});

const pinterestPreviewJson = JSON.stringify({
  success: true,
  stats: {
    totalProducts: products.length,
    inStockCount: products.filter(p => (p.stock ?? 1) > 0).length,
    outOfStockCount: products.filter(p => (p.stock ?? 1) <= 0).length,
  },
  feedUrls: {
    xml: `${baseUrl}/pinterest-catalog.xml`,
    csv: `${baseUrl}/pinterest-catalog.csv`,
    verificationFile: `${baseUrl}/pinterest-7da08.html`
  },
  sampleItems: previewSampleItems
}, null, 2);

// ==========================================
// 6. SITEMAP.XML (SYNCED WITH SPA ROUTES)
// ==========================================
const todayIso = new Date().toISOString().split('T')[0];
const sitemapEntries: Array<{ url: string; lastmod: string; changefreq: string; priority: string }> = [
  { url: `${baseUrl}/`, lastmod: todayIso, changefreq: 'daily', priority: '1.0' },
  { url: `${baseUrl}/shop`, lastmod: todayIso, changefreq: 'daily', priority: '0.9' },
  { url: `${baseUrl}/brands`, lastmod: todayIso, changefreq: 'weekly', priority: '0.9' },
  { url: `${baseUrl}/guides`, lastmod: todayIso, changefreq: 'weekly', priority: '0.85' },
  { url: `${baseUrl}/ingredients`, lastmod: todayIso, changefreq: 'weekly', priority: '0.85' },
  { url: `${baseUrl}/concerns`, lastmod: todayIso, changefreq: 'weekly', priority: '0.85' },
  { url: `${baseUrl}/authenticity`, lastmod: todayIso, changefreq: 'monthly', priority: '0.8' },
  { url: `${baseUrl}/skin-quiz`, lastmod: todayIso, changefreq: 'monthly', priority: '0.75' },
  { url: `${baseUrl}/routine-builder`, lastmod: todayIso, changefreq: 'monthly', priority: '0.75' },
  { url: `${baseUrl}/about-us`, lastmod: todayIso, changefreq: 'monthly', priority: '0.6' },
  { url: `${baseUrl}/contact-us`, lastmod: todayIso, changefreq: 'monthly', priority: '0.6' },
  { url: `${baseUrl}/become-a-creator`, lastmod: todayIso, changefreq: 'monthly', priority: '0.7' },
  { url: `${baseUrl}/privacy-policy`, lastmod: todayIso, changefreq: 'yearly', priority: '0.3' },
  { url: `${baseUrl}/terms-of-service`, lastmod: todayIso, changefreq: 'yearly', priority: '0.3' },
];

for (const brandSlug of Object.keys(BRAND_SEO_PROFILES)) {
  sitemapEntries.push({
    url: `${baseUrl}/brand/${brandSlug}`,
    lastmod: todayIso,
    changefreq: 'weekly',
    priority: '0.85',
  });
}

for (const guide of INITIAL_SKINCARE_GUIDES) {
  sitemapEntries.push({
    url: `${baseUrl}/guide/${guide.slug}`,
    lastmod: (guide.lastUpdatedDate || todayIso).split('T')[0],
    changefreq: 'weekly',
    priority: '0.8',
  });
}

for (const ing of INGREDIENT_LIBRARY) {
  sitemapEntries.push({
    url: `${baseUrl}/ingredient/${ing.slug}`,
    lastmod: todayIso,
    changefreq: 'monthly',
    priority: '0.75',
  });
}

for (const concern of SKIN_CONCERN_LIBRARY) {
  sitemapEntries.push({
    url: `${baseUrl}/concern/${concern.slug}`,
    lastmod: todayIso,
    changefreq: 'monthly',
    priority: '0.75',
  });
}

for (const p of products) {
  if (!p.id || p.noindex) continue;
  sitemapEntries.push({
    url: `${baseUrl}/product/${encodeURIComponent(p.id)}`,
    lastmod: todayIso,
    changefreq: 'weekly',
    priority: '0.8',
  });
}

const fullSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join('\n')}\n</urlset>\n`;

// ==========================================
// WRITE ALL FEEDS TO PUBLIC & DIST
// ==========================================
function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

const targets = ['public', 'dist'];

for (const target of targets) {
  ensureDir(target);
  ensureDir(path.join(target, 'api'));
  ensureDir(path.join(target, 'api', 'feeds'));
  ensureDir(path.join(target, 'api', 'pinterest'));

  // Meta feeds
  fs.writeFileSync(path.join(target, 'meta-catalog.xml'), fullMetaXml);
  fs.writeFileSync(path.join(target, 'meta-catalog.csv'), fullMetaCsv);
  fs.writeFileSync(path.join(target, 'facebook-catalog.xml'), fullMetaXml);
  fs.writeFileSync(path.join(target, 'facebook-catalog.csv'), fullMetaCsv);
  fs.writeFileSync(path.join(target, 'google-merchant.xml'), fullMetaXml);

  // Pinterest feeds - root URLs
  fs.writeFileSync(path.join(target, 'pinterest-catalog.xml'), fullPinterestXml);
  fs.writeFileSync(path.join(target, 'pinterest-catalog.csv'), fullPinterestCsv);

  // Pinterest feeds - /api/ URLs
  fs.writeFileSync(path.join(target, 'api', 'pinterest-catalog.xml'), fullPinterestXml);
  fs.writeFileSync(path.join(target, 'api', 'pinterest-catalog.csv'), fullPinterestCsv);
  fs.writeFileSync(path.join(target, 'api', 'feeds', 'pinterest-catalog.xml'), fullPinterestXml);
  fs.writeFileSync(path.join(target, 'api', 'feeds', 'pinterest-catalog.csv'), fullPinterestCsv);

  // Pinterest preview - /api/pinterest/preview and preview.json
  fs.writeFileSync(path.join(target, 'api', 'pinterest', 'preview'), pinterestPreviewJson);
  fs.writeFileSync(path.join(target, 'api', 'pinterest', 'preview.json'), pinterestPreviewJson);

  // Sitemap XML
  fs.writeFileSync(path.join(target, 'sitemap.xml'), fullSitemapXml);
}

console.log(`[Feeds] Generated Meta, Pinterest & Sitemap (${sitemapEntries.length} URLs) for ${products.length} products across public/ and dist/.`);
