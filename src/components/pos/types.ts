import { Product } from '../../types';

export type PosTab = 'sale' | 'search' | 'stock_in' | 'history';

export type ScannerContext = 'SALE' | 'STOCK_IN';

export type PricingMode = 'retail' | 'wholesale';

export type DeliveryArea = 'inside' | 'outside' | 'none';

export interface CartItem {
  product: Product;
  quantity: number;
  docIds: string[];
}

export interface StockInQueueItem {
  product: Product;
  quantity: number;
  importCost?: number;
}

export interface ScannerConnectionInfo {
  isConnected: boolean;
  scannerId?: string | null;
  scannerName?: string | null;
  connectedAt?: string | null;
  lastSeenAt?: string | null;
  pendingRequest?: {
    mobileScannerId: string;
    mobileScannerName: string;
    requestedAt: string;
  } | null;
}
