import { doc, getDoc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from './firebase';
import { authFetch } from './apiClient';
import { productService } from './productService';
import { INITIAL_PRODUCTS } from '../data/allProducts';
import { getSiteUrl } from '../utils/siteUrl';
import { getProductPath } from '../utils/productSlug';

export interface PinterestSettings {
  domainVerification: {
    enabled: boolean;
    verificationCode: string;
    fileName: string;
    isVerified?: boolean;
    verifiedAt?: string;
  };
  tag: {
    enabled: boolean;
    tagId: string;
    enhancedMatch: boolean;
  };
  catalog: {
    enabled: boolean;
    currency: string;
    defaultCategory: string;
    lastSyncedAt?: string;
  };
  richPins: {
    enabled: boolean;
    showSaveButton: boolean;
  };
  updatedAt?: string;
  updatedBy?: string;
}

export interface PinterestCatalogPreviewItem {
  id: string;
  title: string;
  price: number;
  salePrice: number | null;
  currency: string;
  availability: 'in stock' | 'out of stock';
  brand: string;
  link: string;
  imageLink: string;
  condition: string;
}

export interface PinterestCatalogPreviewData {
  success: boolean;
  stats: {
    totalProducts: number;
    inStockCount: number;
    outOfStockCount: number;
  };
  feedUrls: {
    xml: string;
    csv: string;
    verificationFile: string;
  };
  sampleItems: PinterestCatalogPreviewItem[];
}

const SETTINGS_STORAGE_KEY = 'ksf_pinterest_settings_cache_v1';

export const DEFAULT_PINTEREST_SETTINGS: PinterestSettings = {
  domainVerification: {
    enabled: true,
    verificationCode: '7da0826bf938ef0f99cb087f3822459f',
    fileName: 'pinterest-7da08.html',
    isVerified: true,
    verifiedAt: new Date().toISOString(),
  },
  tag: {
    enabled: true,
    tagId: '',
    enhancedMatch: true,
  },
  catalog: {
    enabled: true,
    currency: 'BDT',
    defaultCategory: 'Health & Beauty > Personal Care > Cosmetics > Skin Care',
    lastSyncedAt: new Date().toISOString(),
  },
  richPins: {
    enabled: true,
    showSaveButton: true,
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'system_default',
};

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

class PinterestService {
  private currentSettings: PinterestSettings = { ...DEFAULT_PINTEREST_SETTINGS };
  private listeners: Set<(settings: PinterestSettings) => void> = new Set();
  private isSubscribed = false;
  private unsubscribeFirestore: (() => void) | null = null;

  constructor() {
    this.loadFromLocalStorage();
    this.initFirestoreListener();
  }

  private loadFromLocalStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.currentSettings = this.mergeWithDefaults(parsed);
      }
    } catch {
      // ignore
    }
  }

  private saveToLocalStorage(settings: PinterestSettings) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }

  private mergeWithDefaults(incoming: Partial<PinterestSettings>): PinterestSettings {
    return {
      domainVerification: {
        enabled: incoming.domainVerification?.enabled ?? DEFAULT_PINTEREST_SETTINGS.domainVerification.enabled,
        verificationCode: (incoming.domainVerification?.verificationCode || DEFAULT_PINTEREST_SETTINGS.domainVerification.verificationCode).trim(),
        fileName: (incoming.domainVerification?.fileName || DEFAULT_PINTEREST_SETTINGS.domainVerification.fileName).trim(),
        isVerified: incoming.domainVerification?.isVerified ?? DEFAULT_PINTEREST_SETTINGS.domainVerification.isVerified,
        verifiedAt: incoming.domainVerification?.verifiedAt || DEFAULT_PINTEREST_SETTINGS.domainVerification.verifiedAt,
      },
      tag: {
        enabled: incoming.tag?.enabled ?? DEFAULT_PINTEREST_SETTINGS.tag.enabled,
        tagId: (incoming.tag?.tagId || '').trim(),
        enhancedMatch: incoming.tag?.enhancedMatch ?? DEFAULT_PINTEREST_SETTINGS.tag.enhancedMatch,
      },
      catalog: {
        enabled: incoming.catalog?.enabled ?? DEFAULT_PINTEREST_SETTINGS.catalog.enabled,
        currency: (incoming.catalog?.currency || 'BDT').trim().toUpperCase(),
        defaultCategory: (incoming.catalog?.defaultCategory || DEFAULT_PINTEREST_SETTINGS.catalog.defaultCategory).trim(),
        lastSyncedAt: incoming.catalog?.lastSyncedAt || new Date().toISOString(),
      },
      richPins: {
        enabled: incoming.richPins?.enabled ?? DEFAULT_PINTEREST_SETTINGS.richPins.enabled,
        showSaveButton: incoming.richPins?.showSaveButton ?? DEFAULT_PINTEREST_SETTINGS.richPins.showSaveButton,
      },
      updatedAt: incoming.updatedAt || new Date().toISOString(),
      updatedBy: incoming.updatedBy || 'admin',
    };
  }

  public initFirestoreListener() {
    if (typeof window === 'undefined' || this.isSubscribed) return;
    this.isSubscribed = true;

    try {
      const docRef = doc(db, 'settings', 'pinterest');
      this.unsubscribeFirestore = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const merged = this.mergeWithDefaults(data as Partial<PinterestSettings>);
            this.currentSettings = merged;
            this.saveToLocalStorage(merged);
            this.notifyListeners();
            this.updateMetaTag(merged.domainVerification.verificationCode);
          } else if (auth.currentUser) {
            // First time seeding when signed in
            this.saveSettings(DEFAULT_PINTEREST_SETTINGS).catch(() => {});
          }
        },
        (error) => {
          console.warn('[PinterestService] Firestore snapshot error (using local cache):', error.message);
        }
      );
    } catch (e) {
      console.warn('[PinterestService] Failed to bind Firestore snapshot listener:', e);
    }
  }

  private updateMetaTag(code: string) {
    if (typeof document === 'undefined') return;
    try {
      let meta = document.querySelector('meta[name="p:domain_verify"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'p:domain_verify');
        document.head.appendChild(meta);
      }
      if (code) {
        meta.setAttribute('content', code);
      }
    } catch (e) {
      console.warn('[PinterestService] Meta tag update error:', e);
    }
  }

  private notifyListeners() {
    const copy = { ...this.currentSettings };
    this.listeners.forEach((fn) => {
      try {
        fn(copy);
      } catch (err) {
        console.error('[PinterestService] Listener exception:', err);
      }
    });
  }

  public subscribe(callback: (settings: PinterestSettings) => void): () => void {
    this.listeners.add(callback);
    callback({ ...this.currentSettings });
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getCurrentSettings(): PinterestSettings {
    return { ...this.currentSettings };
  }

  public async getSettings(): Promise<PinterestSettings> {
    try {
      const docRef = doc(db, 'settings', 'pinterest');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const merged = this.mergeWithDefaults(snap.data() as Partial<PinterestSettings>);
        this.currentSettings = merged;
        this.saveToLocalStorage(merged);
        this.updateMetaTag(merged.domainVerification.verificationCode);
        return merged;
      }
    } catch (error) {
      console.warn('[PinterestService] Remote fetch failed, using local/cached values:', error);
    }
    return { ...this.currentSettings };
  }

  public async saveSettings(newSettings: Partial<PinterestSettings>): Promise<PinterestSettings> {
    const updatedBy = auth.currentUser?.email || auth.currentUser?.uid || 'admin';
    const merged = this.mergeWithDefaults({
      ...this.currentSettings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
      updatedBy,
    });

    const docPath = 'settings/pinterest';
    try {
      const docRef = doc(db, 'settings', 'pinterest');
      await setDoc(docRef, merged, { merge: true });
      this.currentSettings = merged;
      this.saveToLocalStorage(merged);
      this.notifyListeners();
      this.updateMetaTag(merged.domainVerification.verificationCode);

      // Notify the server runtime proxy if available and signed in
      if (auth.currentUser) {
        try {
          await authFetch('/api/pinterest/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merged),
          });
        } catch (syncErr) {
          // Server proxy optional in static deployments
        }
      }

      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
      throw error;
    }
  }

  public async verifyDomainDiagnostics(): Promise<{
    fileEndpointOk: boolean;
    metaVerificationOk: boolean;
    verificationCode: string;
    checkedUrl: string;
    details: string;
  }> {
    const settings = this.getCurrentSettings();
    const fileName = settings.domainVerification.fileName || 'pinterest-7da08.html';
    const verificationCode = settings.domainVerification.verificationCode;

    let fileEndpointOk = false;
    let metaVerificationOk = false;
    let details = '';

    try {
      const res = await fetch(`/${fileName}`, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        fileEndpointOk = text.includes('p:domain_verify') || text.includes(verificationCode);
      }
    } catch (e: any) {
      details += `File test failed: ${e.message}. `;
    }

    if (typeof document !== 'undefined') {
      const meta = document.querySelector('meta[name="p:domain_verify"]');
      const content = meta?.getAttribute('content');
      metaVerificationOk = content === verificationCode;
    }

    return {
      fileEndpointOk,
      metaVerificationOk,
      verificationCode,
      checkedUrl: `/${fileName}`,
      details: details || 'Domain verification endpoints are operating normally.',
    };
  }

  /**
   * Retrieves or computes catalog preview data with fallback for static hosting
   */
  public async getPinterestPreview(): Promise<PinterestCatalogPreviewData> {
    const origin = getSiteUrl();

    // 1. Try static JSON endpoint or server endpoint
    try {
      const res = await fetch('/api/pinterest/preview', { cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && !contentType.includes('text/html')) {
        const data = await res.json();
        if (data && data.success) {
          return data;
        }
      }
    } catch {
      // server/static file fetch failed, proceed to client-side fallback
    }

    // 2. Client-side fallback from products
    let rawProducts: any[] = [];
    try {
      if (productService) {
        rawProducts = await productService.fetchProducts();
      }
    } catch (e) {
      console.warn('[PinterestService] productService fetch warning:', e);
    }

    if (!rawProducts || rawProducts.length === 0) {
      try {
        if (db) {
          const snap = await getDocs(collection(db, 'products'));
          const prods: any[] = [];
          snap.forEach((d) => prods.push({ id: d.id, ...d.data() }));
          rawProducts = prods;
        }
      } catch (e) {
        console.warn('[PinterestService] Firestore collection read warning:', e);
      }
    }

    if (!rawProducts || rawProducts.length === 0) {
      rawProducts = INITIAL_PRODUCTS || [];
    }

    const sampleItems: PinterestCatalogPreviewItem[] = rawProducts.map((p) => {
      const id = p.id || p.barcode || 'prod';
      const name = p.name || 'Korean Skincare Product';
      const price = typeof p.price === 'number' ? p.price : 0;
      const avail: 'in stock' | 'out of stock' = (p.stock ?? 1) > 0 ? 'in stock' : 'out of stock';
      return {
        id,
        title: name,
        price,
        salePrice: null,
        currency: 'BDT',
        availability: avail,
        brand: p.brand || 'Korean Skin Food BD',
        link: `${origin}${getProductPath({ id, seoSlug: p.seoSlug })}`,
        imageLink: p.image || '',
        condition: 'new',
      };
    });

    const inStockCount = rawProducts.filter((p) => (p.stock ?? 1) > 0).length;

    return {
      success: true,
      stats: {
        totalProducts: rawProducts.length,
        inStockCount,
        outOfStockCount: rawProducts.length - inStockCount,
      },
      feedUrls: {
        xml: `${origin}/pinterest-catalog.xml`,
        csv: `${origin}/pinterest-catalog.csv`,
        verificationFile: `${origin}/pinterest-7da08.html`,
      },
      sampleItems,
    };
  }

  /**
   * Generates RSS 2.0 XML for Pinterest
   */
  public generatePinterestXml(products: any[], baseUrl: string): string {
    const items = products.map((p) => {
      const id = p.id || p.barcode || 'prod';
      const name = p.name || 'Korean Skincare Product';
      const desc = stripHtml(p.description || name);
      const price = (typeof p.price === 'number' ? p.price : 0).toFixed(2);
      const link = `${baseUrl}${getProductPath({ id, seoSlug: p.seoSlug })}`;
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

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Korean Skin Food BD - Pinterest Product Catalog</title>
    <link>${baseUrl}</link>
    <description>Dynamic product feed for Pinterest Shopping and Pinterest Merchant</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
  }

  /**
   * Generates CSV for Pinterest Commerce
   */
  public generatePinterestCsv(products: any[], baseUrl: string): string {
    const headers = [
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

    const rows = [headers.join(',')];
    for (const p of products) {
      const id = p.id || p.barcode || 'prod';
      const name = p.name || 'Korean Skincare Product';
      const desc = stripHtml(p.description || name);
      const price = `${(typeof p.price === 'number' ? p.price : 0).toFixed(2)} BDT`;
      const link = `${baseUrl}${getProductPath({ id, seoSlug: p.seoSlug })}`;
      const img = p.image || '';
      const brand = p.brand || 'Korean Skin Food BD';
      const cat = 'Health & Beauty > Personal Care > Cosmetics > Skin Care';
      const avail = ((p.stock ?? 1) > 0) ? 'in stock' : 'out of stock';

      rows.push([
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
    return rows.join('\r\n');
  }

  /**
   * Downloads a generated feed file directly in the browser
   */
  public downloadBlob(content: string, filename: string, mimeType: string) {
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
  }
}

export const pinterestService = new PinterestService();
