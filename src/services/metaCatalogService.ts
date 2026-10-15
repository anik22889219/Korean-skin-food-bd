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

export const metaCatalogService = {
  /**
   * Fetches the preview data, feed URLs, and diagnostic statistics
   */
  async getPreview(): Promise<MetaCatalogPreview> {
    const res = await fetch('/api/meta-catalog/preview');
    if (!res.ok) {
      throw new Error(`Failed to load catalog preview (Status ${res.status})`);
    }
    return res.json();
  },

  /**
   * Retrieves saved Meta Catalog credentials and options
   */
  async getSettings(): Promise<MetaCatalogSettings> {
    const res = await authFetch('/api/meta-catalog/settings');
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch Meta Catalog settings');
    }
    return data.settings;
  },

  /**
   * Saves or updates Meta Catalog credentials and options
   */
  async saveSettings(settings: Partial<MetaCatalogSettings>): Promise<{ success: boolean; message: string }> {
    const res = await authFetch('/api/meta-catalog/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save Meta Catalog settings');
    }
    return data;
  },

  /**
   * Tests the connection with Meta Graph API using the provided or saved credentials
   */
  async testConnection(credentials?: { catalogId?: string; accessToken?: string }): Promise<MetaConnectionTestResult> {
    const res = await authFetch('/api/meta-catalog/test-connection', {
      method: 'POST',
      body: JSON.stringify(credentials || {})
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to connect to Meta Graph API');
    }
    return data;
  },

  /**
   * Triggers a live batch update to Meta Graph API (/items_batch)
   */
  async triggerBatchSync(credentials?: { catalogId?: string; accessToken?: string }): Promise<MetaSyncResult> {
    const res = await authFetch('/api/meta-catalog/sync', {
      method: 'POST',
      body: JSON.stringify(credentials || {})
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Meta Catalog synchronization failed');
    }
    return data;
  },

  /**
   * Returns current origin feed URLs
   */
  getFeedUrls(): { xml: string; csv: string } {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      xml: `${origin}/api/meta-catalog.xml`,
      csv: `${origin}/api/meta-catalog.csv`
    };
  }
};
