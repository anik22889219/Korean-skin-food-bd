import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { productService } from './productService';
import { INITIAL_PRODUCTS } from '../data/allProducts';
import { authFetch } from './apiClient';

export interface MetaCatalogItem {
  id: string;
  title: string;
  description: string;
  availability: 'in stock' | 'out of stock';
  condition: 'new' | 'refurbished' | 'used';
  price: number;
  salePrice: number | null;
  currency: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  brand: string;
  googleProductCategory: string;
  fbProductCategory: string;
  inventory: number;
  barcode: string;
  sku: string;
  hasValidImage: boolean;
  hasValidPrice: boolean;
}

export interface MetaCatalogSummary {
  totalProducts: number;
  inStockCount: number;
  outOfStockCount: number;
  missingImagesCount: number;
  missingBarcodesCount: number;
  readyForMetaCount: number;
  healthPercentage: number;
}

export interface MetaCatalogSettings {
  catalogId: string;
  accessToken?: string;
  hasAccessToken?: boolean;
  pixelId?: string;
  currency: string;
  domainUrl: string;
  defaultCategory: string;
  lastSyncAt: string | null;
  lastSyncStatus: 'idle' | 'success' | 'partial' | 'error';
  lastSyncResult: {
    totalProducts: number;
    syncedCount: number;
    errorCount: number;
    errorDetails?: Array<{ batch: number; error: string }>;
    syncLogs?: string[];
  } | null;
}

export interface MetaCatalogPreview {
  success: boolean;
  baseUrl: string;
  settings: MetaCatalogSettings;
  feedUrls: {
    xml: string;
    csv: string;
  };
  summary: MetaCatalogSummary;
  products: MetaCatalogItem[];
  error?: string;
}

export interface MetaConnectionTestResult {
  success: boolean;
  message: string;
  catalog?: {
    id: string;
    name: string;
    productCount: number;
    vertical: string;
    business?: string;
  };
  error?: string;
}

export interface MetaSyncResult {
  success: boolean;
  status: 'success' | 'partial' | 'error';
  message: string;
  result?: {
    totalProducts: number;
    syncedCount: number;
    errorCount: number;
    errorDetails?: Array<{ batch: number; error: string }>;
    syncLogs?: string[];
  };
  error?: string;
}

function stripHtmlMarkup(str: any): string {
  if (!str) return "";
  return String(str)
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function escapeXmlString(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function formatProductsForMeta(products: any[], settings: MetaCatalogSettings, baseUrl: string): MetaCatalogItem[] {
  return products.map((prod) => {
    const id = String(prod.id || prod.barcode || `prod-${Math.random().toString(36).slice(2)}`).trim();
    const title = prod.name || prod.nameBN || "Korean Skincare Product";
    const rawDesc = prod.description || prod.descriptionBN || title;
    const cleanDesc = stripHtmlMarkup(rawDesc);
    const stockQty = typeof prod.stock === "number" ? prod.stock : (parseInt(prod.stock, 10) || 0);
    const availability: 'in stock' | 'out of stock' = stockQty > 0 ? "in stock" : "out of stock";
    
    // Pricing
    const regularPrice = typeof prod.price === "number" ? prod.price : (parseFloat(prod.price) || 0);
    const salePrice = typeof prod.discountPrice === "number" && prod.discountPrice > 0 && prod.discountPrice < regularPrice
      ? prod.discountPrice
      : (typeof prod.discountRetailPrice === "number" && prod.discountRetailPrice > 0 && prod.discountRetailPrice < regularPrice ? prod.discountRetailPrice : null);
    
    const brand = prod.brand || "Korean Skin Food BD";
    const category = prod.category ? `Health & Beauty > Personal Care > Cosmetics > Skin Care > ${prod.category}` : settings.defaultCategory;
    
    // Main image
    const mainImg = prod.image || (Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : "");
    const additionalImages = Array.isArray(prod.images) ? prod.images.filter((img: string) => img && img !== mainImg) : [];

    const link = `${baseUrl}/product/${encodeURIComponent(id)}`;
    const barcode = prod.barcodeNormalized || prod.barcode || "";
    const sku = prod.sku || id;

    return {
      id,
      title,
      description: cleanDesc,
      availability,
      condition: "new",
      price: regularPrice,
      salePrice,
      currency: settings.currency || "BDT",
      link,
      imageLink: mainImg,
      additionalImageLinks: additionalImages,
      brand,
      googleProductCategory: category,
      fbProductCategory: category,
      inventory: Math.max(0, stockQty),
      barcode,
      sku,
      hasValidImage: !!mainImg && (mainImg.startsWith("http://") || mainImg.startsWith("https://") || mainImg.startsWith("/")),
      hasValidPrice: regularPrice > 0
    };
  });
}

export const metaCatalogService = {
  /**
   * Retrieves saved Meta Catalog credentials and options
   */
  async getSettings(): Promise<MetaCatalogSettings> {
    const defaultSettings: MetaCatalogSettings = {
      catalogId: "",
      hasAccessToken: false,
      pixelId: "1181966467366737",
      currency: "BDT",
      domainUrl: typeof window !== 'undefined' ? window.location.origin : "https://koreanskinfood.web.app",
      defaultCategory: "Health & Beauty > Personal Care > Cosmetics > Skin Care",
      lastSyncAt: null,
      lastSyncStatus: "idle",
      lastSyncResult: null
    };

    // First try Firestore directly
    try {
      if (db) {
        const sSnap = await getDoc(doc(db, "settings", "meta_catalog"));
        if (sSnap.exists()) {
          const data = sSnap.data();
          return {
            ...defaultSettings,
            ...data,
            pixelId: data.pixelId || "1181966467366737",
            hasAccessToken: !!data.accessToken,
            accessToken: data.accessToken || undefined
          };
        }
      }
    } catch (e) {
      console.warn("[metaCatalogService] Firestore settings read warning:", e);
    }

    // Try server endpoint if running with Express backend
    try {
      const res = await authFetch('/api/meta-catalog/settings');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && !contentType.includes('text/html')) {
        const data = await res.json();
        if (data.success && data.settings) {
          return data.settings;
        }
      }
    } catch {
      // server endpoint unavailable
    }

    return defaultSettings;
  },

  /**
   * Saves or updates Meta Catalog credentials and options
   */
  async saveSettings(settings: Partial<MetaCatalogSettings>): Promise<{ success: boolean; message: string }> {
    try {
      if (db) {
        const cleanPayload: Record<string, any> = {};
        for (const [k, v] of Object.entries(settings)) {
          if (v !== undefined) {
            cleanPayload[k] = v;
          }
        }
        cleanPayload.updatedAt = new Date().toISOString();
        await setDoc(doc(db, "settings", "meta_catalog"), cleanPayload, { merge: true });
        return { success: true, message: "Meta Catalog settings saved successfully." };
      }
    } catch (e: any) {
      console.warn("[metaCatalogService] Firestore save error:", e);
    }

    // Fallback to API if available
    const res = await authFetch('/api/meta-catalog/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || contentType.includes('text/html')) {
      throw new Error(`Failed to save settings (Status ${res.status})`);
    }
    return res.json();
  },

  /**
   * Fetches the preview data, feed URLs, and diagnostic statistics
   */
  async getPreview(): Promise<MetaCatalogPreview> {
    const origin = typeof window !== 'undefined' ? window.location.origin : "https://koreanskinfood.web.app";

    // 1. Try server endpoint first (only if it returns genuine JSON)
    try {
      const res = await fetch('/api/meta-catalog/preview');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && !contentType.includes('text/html')) {
        const text = await res.text();
        if (!text.trim().startsWith('<')) {
          const data = JSON.parse(text);
          if (data && data.success) {
            return data;
          }
        }
      }
    } catch {
      // Server not active, fall back to direct client computation
    }

    // 2. Direct client fallback (reliable on static Firebase Hosting)
    const settings = await this.getSettings();
    let baseUrl = settings.domainUrl && settings.domainUrl.trim() ? settings.domainUrl.trim() : origin;
    baseUrl = baseUrl.replace(/\/+$/, "");

    let rawProducts: any[] = [];
    try {
      if (productService) {
        rawProducts = await productService.fetchProducts();
      }
    } catch (e) {
      console.warn("[metaCatalogService] fetchProducts warning:", e);
    }

    if (!rawProducts || rawProducts.length === 0) {
      try {
        if (db) {
          const snap = await getDocs(collection(db, "products"));
          const prods: any[] = [];
          snap.forEach((d) => prods.push({ id: d.id, ...d.data() }));
          rawProducts = prods;
        }
      } catch (e) {
        console.warn("[metaCatalogService] Firestore collection read warning:", e);
      }
    }

    if (!rawProducts || rawProducts.length === 0) {
      rawProducts = INITIAL_PRODUCTS || [];
    }

    const formattedItems = formatProductsForMeta(rawProducts, settings, baseUrl);
    const total = formattedItems.length;
    const inStock = formattedItems.filter((i) => i.availability === "in stock").length;
    const outOfStock = total - inStock;
    const missingImages = formattedItems.filter((i) => !i.hasValidImage).length;
    const missingBarcodes = formattedItems.filter((i) => !i.barcode).length;
    const readyForMeta = formattedItems.filter((i) => i.hasValidImage && i.hasValidPrice).length;

    return {
      success: true,
      baseUrl,
      settings,
      feedUrls: {
        xml: `${baseUrl}/meta-catalog.xml`,
        csv: `${baseUrl}/meta-catalog.csv`
      },
      summary: {
        totalProducts: total,
        inStockCount: inStock,
        outOfStockCount: outOfStock,
        missingImagesCount: missingImages,
        missingBarcodesCount: missingBarcodes,
        readyForMetaCount: readyForMeta,
        healthPercentage: total > 0 ? Math.round((readyForMeta / total) * 100) : 100
      },
      products: formattedItems
    };
  },

  /**
   * Tests the connection with Meta Graph API using the provided or saved credentials
   */
  async testConnection(credentials?: { catalogId?: string; accessToken?: string }): Promise<MetaConnectionTestResult> {
    const settings = await this.getSettings();
    const catalogId = credentials?.catalogId || settings.catalogId;
    const accessToken = credentials?.accessToken || settings.accessToken;

    if (!catalogId) {
      throw new Error("Missing Meta Catalog ID. Please enter your Catalog ID first.");
    }
    if (!accessToken) {
      throw new Error("Missing Meta Access Token. Please enter your System User Access Token first.");
    }

    try {
      const endpoint = `https://graph.facebook.com/v19.0/${encodeURIComponent(catalogId)}?fields=id,name,product_count,vertical,business&access_token=${encodeURIComponent(accessToken)}`;
      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok || data.error) {
        const errorMsg = data?.error?.message || `Meta Graph API returned status ${res.status}`;
        throw new Error(errorMsg);
      }

      return {
        success: true,
        message: `Successfully connected to Meta Catalog: "${data.name}" (${data.product_count ?? 0} items)`,
        catalog: {
          id: data.id,
          name: data.name,
          productCount: data.product_count ?? 0,
          vertical: data.vertical || "commerce",
          business: data.business?.name
        }
      };
    } catch (err: any) {
      throw new Error(err.message || "Failed to connect to Meta Graph API");
    }
  },

  /**
   * Triggers a live batch update to Meta Graph API (/items_batch)
   */
  async triggerBatchSync(credentials?: { catalogId?: string; accessToken?: string }): Promise<MetaSyncResult> {
    const settings = await this.getSettings();
    const catalogId = credentials?.catalogId || settings.catalogId;
    const accessToken = credentials?.accessToken || settings.accessToken;

    if (!catalogId) {
      throw new Error("Missing Meta Catalog ID. Please enter your Catalog ID first.");
    }
    if (!accessToken) {
      throw new Error("Missing Meta Access Token. Please enter your System User Access Token first.");
    }

    const preview = await this.getPreview();
    const formattedItems = preview.products;
    const baseUrl = preview.baseUrl;

    if (!formattedItems || formattedItems.length === 0) {
      throw new Error("No products found in store to sync with Meta Catalog.");
    }

    const BATCH_SIZE = 4999;
    const batches: MetaCatalogItem[][] = [];
    for (let i = 0; i < formattedItems.length; i += BATCH_SIZE) {
      batches.push(formattedItems.slice(i, i + BATCH_SIZE));
    }

    let totalSynced = 0;
    let totalErrors = 0;
    const errorDetails: Array<{ batch: number; error: string }> = [];
    const syncLogs: string[] = [];

    for (let bIndex = 0; bIndex < batches.length; bIndex++) {
      const batchItems = batches[bIndex];
      const requests = batchItems.map((item) => {
        let fullImageLink = item.imageLink;
        if (fullImageLink && !fullImageLink.startsWith("http://") && !fullImageLink.startsWith("https://")) {
          fullImageLink = `${baseUrl}${fullImageLink.startsWith("/") ? "" : "/"}${fullImageLink}`;
        }
        if (!fullImageLink) {
          fullImageLink = `${baseUrl}/pwa-512x512.png`;
        }

        const regularPriceStr = `${(typeof item.price === 'number' ? item.price : 0).toFixed(2)} ${item.currency || 'BDT'}`;
        const salePriceStr = (item.salePrice !== null && typeof item.salePrice === 'number' && item.salePrice > 0)
          ? `${item.salePrice.toFixed(2)} ${item.currency || 'BDT'}`
          : undefined;

        const data: Record<string, any> = {
          id: item.id,
          retailer_id: item.id,
          title: (item.title || "Korean Skincare Product").slice(0, 150),
          description: (item.description || item.title || "Authentic Korean Skincare").slice(0, 4999),
          availability: item.availability === "in stock" ? "in stock" : "out of stock",
          condition: "new",
          price: regularPriceStr,
          link: item.link || `${baseUrl}/product/${encodeURIComponent(item.id)}`,
          image_link: fullImageLink,
          brand: item.brand || "Korean Skin Food BD",
          google_product_category: item.googleProductCategory || "Health & Beauty > Personal Care > Cosmetics > Skin Care",
          fb_product_category: item.fbProductCategory || "Health & Beauty > Personal Care > Cosmetics > Skin Care",
          inventory: typeof item.inventory === 'number' ? item.inventory : 1
        };

        if (salePriceStr) {
          data.sale_price = salePriceStr;
        }
        if (item.barcode) {
          data.gtin = item.barcode;
        }

        return {
          method: "UPDATE",
          retailer_id: item.id,
          data
        };
      });

      const batchPayload = {
        item_type: "PRODUCT_ITEM",
        allow_upsert: true,
        requests
      };

      const metaEndpoint = `https://graph.facebook.com/v19.0/${encodeURIComponent(catalogId)}/items_batch?access_token=${encodeURIComponent(accessToken)}`;
      const batchRes = await fetch(metaEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchPayload)
      });

      const batchResult: any = await batchRes.json();
      if (!batchRes.ok || batchResult.error) {
        totalErrors += batchItems.length;
        const errMsg = batchResult?.error?.message || `Batch ${bIndex + 1} failed with status ${batchRes.status}`;
        errorDetails.push({ batch: bIndex + 1, error: errMsg });
        syncLogs.push(`Batch ${bIndex + 1} failed: ${errMsg}`);
      } else {
        const handles = batchResult.handles || [];
        totalSynced += batchItems.length;
        syncLogs.push(`Batch ${bIndex + 1} (${batchItems.length} items) pushed successfully to Meta Graph API. Handle: ${handles.join(", ") || "OK"}`);
      }
    }

    const lastSyncStatus = totalErrors === 0 ? "success" : (totalSynced > 0 ? "partial" : "error");
    const lastSyncAt = new Date().toISOString();
    const lastSyncResult = {
      totalProducts: formattedItems.length,
      syncedCount: totalSynced,
      errorCount: totalErrors,
      errorDetails,
      syncLogs
    };

    if (db) {
      try {
        await setDoc(doc(db, "settings", "meta_catalog"), {
          lastSyncAt,
          lastSyncStatus,
          lastSyncResult,
          lastSyncCount: totalSynced
        }, { merge: true });
      } catch (e) {
        console.warn("[Meta Catalog] Failed to save sync status to Firestore:", e);
      }
    }

    return {
      success: lastSyncStatus !== "error",
      status: lastSyncStatus,
      message: `Meta Catalog sync completed: ${totalSynced} products synced, ${totalErrors} errors.`,
      result: lastSyncResult
    };
  },

  /**
   * Generates CSV text for Meta Commerce Manager / Google Merchant
   */
  generateCsv(products: MetaCatalogItem[]): string {
    const headers = [
      "id",
      "title",
      "description",
      "availability",
      "condition",
      "price",
      "sale_price",
      "link",
      "image_link",
      "additional_image_link",
      "brand",
      "google_product_category",
      "fb_product_category",
      "inventory",
      "barcode"
    ];

    const lines: string[] = [headers.join(",")];
    for (const item of products) {
      const priceStr = `${item.price.toFixed(2)} ${item.currency}`;
      const salePriceStr = item.salePrice !== null ? `${item.salePrice.toFixed(2)} ${item.currency}` : "";
      const additionalImgsStr = (item.additionalImageLinks || []).join(",");

      const row = [
        escapeCsvField(item.id),
        escapeCsvField(item.title),
        escapeCsvField(item.description),
        escapeCsvField(item.availability),
        escapeCsvField(item.condition),
        escapeCsvField(priceStr),
        escapeCsvField(salePriceStr),
        escapeCsvField(item.link),
        escapeCsvField(item.imageLink),
        escapeCsvField(additionalImgsStr),
        escapeCsvField(item.brand),
        escapeCsvField(item.googleProductCategory),
        escapeCsvField(item.fbProductCategory),
        escapeCsvField(item.inventory),
        escapeCsvField(item.barcode)
      ];
      lines.push(row.join(","));
    }
    return lines.join("\r\n");
  },

  /**
   * Generates XML RSS 2.0 Feed text
   */
  generateXml(products: MetaCatalogItem[], baseUrl: string): string {
    const itemsXml = products.map((item) => {
      let xml = `    <item>\n`;
      xml += `      <g:id>${escapeXmlString(item.id)}</g:id>\n`;
      xml += `      <g:title>${escapeXmlString(item.title)}</g:title>\n`;
      xml += `      <g:description>${escapeXmlString(item.description)}</g:description>\n`;
      xml += `      <g:link>${escapeXmlString(item.link)}</g:link>\n`;
      xml += `      <g:image_link>${escapeXmlString(item.imageLink)}</g:image_link>\n`;
      for (const addImg of item.additionalImageLinks || []) {
        xml += `      <g:additional_image_link>${escapeXmlString(addImg)}</g:additional_image_link>\n`;
      }
      xml += `      <g:brand>${escapeXmlString(item.brand)}</g:brand>\n`;
      xml += `      <g:condition>new</g:condition>\n`;
      xml += `      <g:availability>${escapeXmlString(item.availability)}</g:availability>\n`;
      xml += `      <g:price>${item.price.toFixed(2)} ${item.currency}</g:price>\n`;
      if (item.salePrice !== null) {
        xml += `      <g:sale_price>${item.salePrice.toFixed(2)} ${item.currency}</g:sale_price>\n`;
      }
      xml += `      <g:google_product_category>${escapeXmlString(item.googleProductCategory)}</g:google_product_category>\n`;
      xml += `      <g:fb_product_category>${escapeXmlString(item.fbProductCategory)}</g:fb_product_category>\n`;
      xml += `      <g:inventory>${item.inventory}</g:inventory>\n`;
      if (item.barcode) {
        xml += `      <g:gtin>${escapeXmlString(item.barcode)}</g:gtin>\n`;
      }
      xml += `    </item>`;
      return xml;
    }).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Korean Skin Food BD Product Catalog</title>
    <link>${escapeXmlString(baseUrl)}</link>
    <description>Authentic Korean Skincare &amp; Cosmeceuticals Feed for Meta &amp; Google Merchant Center</description>
${itemsXml}
  </channel>
</rss>`;
  },

  /**
   * Helper to download file directly in user browser
   */
  downloadBlob(content: string, filename: string, mimeType: string) {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Returns current origin feed URLs
   */
  getFeedUrls(): { xml: string; csv: string } {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://koreanskinfood.web.app';
    return {
      xml: `${origin}/meta-catalog.xml`,
      csv: `${origin}/meta-catalog.csv`
    };
  }
};
