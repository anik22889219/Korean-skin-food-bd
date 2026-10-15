import fs from 'fs';
import path from 'path';
import { INITIAL_PRODUCTS } from '../src/data/allProducts';

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

const baseUrl = 'https://koreanskinfood.web.app';
const products = INITIAL_PRODUCTS || [];

// XML
const xmlItems = products.map((p) => {
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

const fullXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Korean Skin Food BD Product Catalog</title>
    <link>${baseUrl}</link>
    <description>Authentic Korean Skincare &amp; Cosmeceuticals Feed for Meta &amp; Google Merchant Center</description>
${xmlItems}
  </channel>
</rss>`;

// CSV
const headers = [
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

const csvRows = [headers.join(',')];
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

  csvRows.push([
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
const fullCsv = csvRows.join('\r\n');

// Ensure directories
if (!fs.existsSync('public')) fs.mkdirSync('public', { recursive: true });
if (!fs.existsSync('dist')) fs.mkdirSync('dist', { recursive: true });

fs.writeFileSync('public/meta-catalog.xml', fullXml);
fs.writeFileSync('public/meta-catalog.csv', fullCsv);
fs.writeFileSync('dist/meta-catalog.xml', fullXml);
fs.writeFileSync('dist/meta-catalog.csv', fullCsv);

console.log(`[Feeds] Generated static feeds for ${products.length} products successfully.`);
