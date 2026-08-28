import { Product, InventoryLog, StockMovement, StockReceipt, StockReceiptItem } from '../types';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { INITIAL_PRODUCTS } from '../data/allProducts';
import { normalizeBarcode, findProductByScannedCode } from '../utils/barcode';
import { getCanonicalBrandName } from '../data/brands';
import { normalizeProductPricing } from '../utils/pricing';

// Ensure initial products cache starts empty
let productsCache: Product[] = [];
let inventoryLogsCache: InventoryLog[] = [];
let stockMovementsCache: StockMovement[] = [];
let stockReceiptsCache: StockReceipt[] = [];

// Subscribers for real-time UI synchronization
const subscribers = new Set<(products: Product[]) => void>();
const receiptSubscribers = new Set<(receipts: StockReceipt[]) => void>();

function notifySubscribers() {
  subscribers.forEach(cb => {
    try {
      cb(productsCache);
    } catch (e) {
      console.error('[ProductService] Subscriber error:', e);
    }
  });
}

function notifyReceiptSubscribers() {
  receiptSubscribers.forEach(cb => {
    try {
      cb(stockReceiptsCache);
    } catch (e) {
      console.error('[ProductService] Receipt subscriber error:', e);
    }
  });
}

// Seeding disabled since demo products were removed
let isSeedingDone = true;
async function seedInitialProductsIfMissing(existingDocsCount: number) {
  isSeedingDone = true;
}

// Subscribe to real-time changes in products
onSnapshot(collection(db, 'products'), (snapshot) => {
  const prods: Product[] = [];
  snapshot.forEach((docSnap) => {
    const rawData = docSnap.data() as Product;
    const data = normalizeProductPricing(rawData);
    const normalizedBrand = getCanonicalBrandName(data.brand) || data.brand;
    prods.push({
      ...data,
      id: docSnap.id || data.id,
      brand: normalizedBrand,
      barcodeNormalized: data.barcodeNormalized || normalizeBarcode(data.barcode)
    });
  });

  if (snapshot.empty && !isSeedingDone) {
    seedInitialProductsIfMissing(0);
  } else {
    isSeedingDone = true;
    productsCache = prods;
    notifySubscribers();
  }
}, (err) => {
  console.warn('[Firebase] products onSnapshot warning:', err);
  if (err?.code === 'permission-denied' || err?.message?.includes('permission') || err?.message?.includes('Permission')) {
    handleFirestoreError(err, OperationType.GET, 'products', false);
  }
});

// Subscribe to real-time changes in inventory logs
onSnapshot(query(collection(db, 'inventory_logs'), orderBy('createdAt', 'desc')), (snapshot) => {
  const logs: InventoryLog[] = [];
  snapshot.forEach((doc) => {
    logs.push(doc.data() as InventoryLog);
  });
  inventoryLogsCache = logs;
}, (err) => {
  console.warn('[Firebase] inventory_logs onSnapshot warning:', err);
  if (err?.code === 'permission-denied' || err?.message?.includes('permission') || err?.message?.includes('Permission')) {
    handleFirestoreError(err, OperationType.GET, 'inventory_logs', false);
  }
});

// Subscribe to real-time changes in stock movements
onSnapshot(query(collection(db, 'stock_movements'), orderBy('createdAt', 'desc')), (snapshot) => {
  const movements: StockMovement[] = [];
  snapshot.forEach((docSnap) => {
    movements.push(docSnap.data() as StockMovement);
  });
  stockMovementsCache = movements;
}, (err) => {
  console.warn('[Firebase] stock_movements onSnapshot warning:', err);
});

// Subscribe to real-time changes in stock receipts
onSnapshot(query(collection(db, 'stock_receipts'), orderBy('createdAt', 'desc')), (snapshot) => {
  const receipts: StockReceipt[] = [];
  snapshot.forEach((docSnap) => {
    receipts.push(docSnap.data() as StockReceipt);
  });
  stockReceiptsCache = receipts;
  notifyReceiptSubscribers();
}, (err) => {
  console.warn('[Firebase] stock_receipts onSnapshot warning:', err);
});

export const productService = {
  getProducts(): Product[] {
    return productsCache;
  },

  subscribe(callback: (products: Product[]) => void): () => void {
    subscribers.add(callback);
    callback(productsCache);
    return () => {
      subscribers.delete(callback);
    };
  },

  async saveProducts(products: Product[]) {
    const normalized = products.map(p => normalizeProductPricing(p));
    productsCache = normalized;
    notifySubscribers();
    const BATCH_SIZE = 40;
    for (let i = 0; i < normalized.length; i += BATCH_SIZE) {
      const chunk = normalized.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(p => {
        batch.set(doc(db, 'products', p.id), sanitizeForFirestore(p), { merge: true });
      });
      await batch.commit().catch(console.error);
    }
  },

  getProductById(id: string): Product | undefined {
    return productsCache.find(p => p.id === id);
  },

  getProductByBarcode(barcode: string): Product | undefined {
    return findProductByScannedCode(productsCache, barcode).product;
  },

  createProduct(product: Omit<Product, 'qrCodeUrl'>): Product {
    const normalizedPricing = normalizeProductPricing(product as Product);
    const barcodeNormalized = normalizeBarcode(product.barcode);
    const normalizedBrand = getCanonicalBrandName(product.brand) || product.brand;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${product.id}`;
    const newProduct: Product = { ...normalizedPricing, brand: normalizedBrand, barcodeNormalized, qrCodeUrl };
    
    // Update local cache synchronously
    productsCache = productsCache.filter(p => p.id !== product.id);
    productsCache.push(newProduct);
    notifySubscribers();

    // Save to Firestore asynchronously
    setDoc(doc(db, 'products', product.id), sanitizeForFirestore(newProduct)).catch(console.error);
    
    // log inventory creation
    this.logInventory(product.id, 'stock_in', product.stock, 0, product.stock, 'Initial creation');
    this.logStockMovement({
      productId: product.id,
      productName: product.name,
      quantity: product.stock,
      type: 'stock_in',
      source: 'MANUAL',
      performedBy: 'Staff Member',
      previousStock: 0,
      newStock: product.stock,
      reason: 'Initial catalog registration'
    });
    
    return newProduct;
  },

  updateProduct(product: Product): Product {
    const normalizedPricing = normalizeProductPricing(product);
    const oldProduct = productsCache.find(p => p.id === product.id);
    const barcodeNormalized = normalizeBarcode(product.barcode);
    const normalizedBrand = getCanonicalBrandName(product.brand) || product.brand;
    const updatedProduct: Product = { ...normalizedPricing, brand: normalizedBrand, barcodeNormalized };
    
    // Update local cache synchronously
    productsCache = productsCache.map(p => p.id === product.id ? updatedProduct : p);
    notifySubscribers();

    // Save to Firestore asynchronously
    setDoc(doc(db, 'products', product.id), sanitizeForFirestore(updatedProduct)).catch(console.error);

    if (oldProduct && oldProduct.stock !== product.stock) {
      const diff = product.stock - oldProduct.stock;
      this.logInventory(
        product.id,
        'adjustment',
        Math.abs(diff),
        oldProduct.stock,
        product.stock,
        'Manual dashboard adjustment'
      );
      this.logStockMovement({
        productId: product.id,
        productName: product.name,
        quantity: diff,
        type: 'adjustment',
        source: 'MANUAL',
        performedBy: 'Staff Member',
        previousStock: oldProduct.stock,
        newStock: product.stock,
        reason: 'Manual inventory adjustment'
      });

      // Trigger Slack stock alert if low stock or out of stock or inventory updated
      const eventType = product.stock <= 0 
        ? 'out_of_stock' 
        : product.stock <= (product.lowStockThreshold || 5) 
          ? 'low_stock' 
          : 'inventory_updated';

      import('./slackNotificationService').then(({ slackNotificationService }) => {
        slackNotificationService.notifyStockAlert(updatedProduct, eventType, oldProduct.stock).catch(console.warn);
      });
    }
    return product;
  },

  async deleteProduct(id: string): Promise<boolean> {
    productsCache = productsCache.filter(p => p.id !== id);
    notifySubscribers();
    try {
      await deleteDoc(doc(db, 'products', id));
      return true;
    } catch (err: any) {
      console.error("Failed to delete product from Firestore:", err);
      if (err?.code === 'permission-denied' || err?.message?.includes('permission') || err?.message?.includes('Permission')) {
        handleFirestoreError(err, OperationType.DELETE, `products/${id}`, false);
      }
      return false;
    }
  },

  getInventoryLogs(): InventoryLog[] {
    return inventoryLogsCache;
  },

  getStockMovements(): StockMovement[] {
    return stockMovementsCache;
  },

  logStockMovement(movement: Omit<StockMovement, 'id' | 'createdAt'>): StockMovement {
    const id = 'sm-' + Math.random().toString(36).substring(2, 11);
    const newMovement: StockMovement = {
      ...movement,
      id,
      createdAt: new Date().toISOString()
    };
    stockMovementsCache = [newMovement, ...stockMovementsCache];
    setDoc(doc(db, 'stock_movements', id), sanitizeForFirestore(newMovement)).catch(console.error);
    return newMovement;
  },

  restockProduct(productId: string, addQuantity: number, reason: string = 'Manual Restock', performedBy: string = 'Staff Member'): { success: boolean; message: string; newStock?: number } {
    const prod = this.getProductById(productId);
    if (!prod) {
      return { success: false, message: 'Product not found' };
    }
    if (addQuantity <= 0) {
      return { success: false, message: 'Restock quantity must be greater than zero' };
    }

    const prevStock = prod.stock;
    const newStock = prevStock + addQuantity;
    const updatedProduct = { ...prod, stock: newStock };
    this.updateProduct(updatedProduct);

    this.logInventory(productId, 'stock_in', addQuantity, prevStock, newStock, reason);
    this.logStockMovement({
      productId,
      productName: prod.name,
      quantity: addQuantity,
      type: 'restock',
      source: 'MANUAL',
      performedBy,
      previousStock: prevStock,
      newStock,
      reason
    });

    return { success: true, message: `Successfully restocked ${addQuantity} units of ${prod.name}. New stock: ${newStock}`, newStock };
  },

  logInventory(
    productId: string,
    type: 'stock_in' | 'sale' | 'adjustment',
    quantity: number,
    previousStock: number,
    newStock: number,
    reason: string
  ) {
    const prod = this.getProductById(productId);
    const logId = 'log-' + Math.random().toString(36).substring(2, 11);
    const newLog: InventoryLog = {
      id: logId,
      productId,
      productName: prod ? prod.name : 'Unknown Product',
      type,
      quantity,
      previousStock,
      newStock,
      reason,
      performedBy: 'Staff Member',
      createdAt: new Date().toISOString()
    };
    
    // Update local cache synchronously
    inventoryLogsCache = [newLog, ...inventoryLogsCache];

    // Save to Firestore asynchronously
    setDoc(doc(db, 'inventory_logs', logId), sanitizeForFirestore(newLog)).catch(console.error);
  },

  getStockReceipts(): StockReceipt[] {
    return stockReceiptsCache;
  },

  subscribeStockReceipts(callback: (receipts: StockReceipt[]) => void): () => void {
    receiptSubscribers.add(callback);
    callback(stockReceiptsCache);
    return () => {
      receiptSubscribers.delete(callback);
    };
  },

  async processStockInBatch(payload: {
    items: { productId: string; quantity: number; importCost?: number }[];
    supplier?: string;
    batchNumber?: string;
    notes?: string;
    receivedBy: string;
  }): Promise<{ success: boolean; message: string; receipt?: StockReceipt }> {
    if (!payload.items || payload.items.length === 0) {
      return { success: false, message: 'No items in stock-in queue.' };
    }

    const validItems = payload.items.filter(it => it.quantity > 0);
    if (validItems.length === 0) {
      return { success: false, message: 'All items must have quantity greater than zero.' };
    }

    const receiptId = 'rcpt-' + Math.random().toString(36).substring(2, 11);
    const receiptNumber = 'SR-' + Math.floor(100000 + Math.random() * 900000);
    const receiptItems: StockReceiptItem[] = [];
    let totalQuantity = 0;
    let totalCost = 0;

    const batch = writeBatch(db);

    for (const item of validItems) {
      const prod = this.getProductById(item.productId);
      if (!prod) continue;

      const prevStock = prod.stock;
      const newStock = prevStock + item.quantity;
      totalQuantity += item.quantity;

      const itemCost = item.importCost !== undefined && item.importCost > 0 ? item.importCost : (prod.importPrice || 0);
      if (itemCost > 0) {
        totalCost += itemCost * item.quantity;
      }

      receiptItems.push({
        productId: prod.id,
        productName: prod.name,
        barcode: prod.barcode,
        brand: prod.brand,
        quantity: item.quantity,
        previousStock: prevStock,
        newStock,
        importCost: itemCost > 0 ? itemCost : undefined
      });

      // Update product object
      const updatedProd: Product = {
        ...prod,
        stock: newStock,
        ...(item.importCost && item.importCost > 0 ? { importPrice: item.importCost } : {})
      };

      // Update local product cache
      productsCache = productsCache.map(p => p.id === prod.id ? updatedProd : p);

      // Add product update to batch
      batch.set(doc(db, 'products', prod.id), sanitizeForFirestore(updatedProd), { merge: true });

      // Inventory Log
      const logId = 'log-' + Math.random().toString(36).substring(2, 11);
      const newLog: InventoryLog = {
        id: logId,
        productId: prod.id,
        productName: prod.name,
        type: 'stock_in',
        quantity: item.quantity,
        previousStock: prevStock,
        newStock,
        reason: `Stock In Receipt #${receiptNumber} - ${payload.supplier || 'Warehouse Intake'}`,
        performedBy: payload.receivedBy || 'Staff Member',
        createdAt: new Date().toISOString()
      };
      inventoryLogsCache = [newLog, ...inventoryLogsCache];
      batch.set(doc(db, 'inventory_logs', logId), sanitizeForFirestore(newLog));

      // Stock Movement Log
      const movementId = 'sm-' + Math.random().toString(36).substring(2, 11);
      const newMovement: StockMovement = {
        id: movementId,
        productId: prod.id,
        productName: prod.name,
        quantity: item.quantity,
        type: 'stock_in',
        source: 'MANUAL',
        performedBy: payload.receivedBy || 'Staff Member',
        previousStock: prevStock,
        newStock,
        reason: `Stock In #${receiptNumber} (${payload.supplier || 'Receiving'})`,
        createdAt: new Date().toISOString()
      };
      stockMovementsCache = [newMovement, ...stockMovementsCache];
      batch.set(doc(db, 'stock_movements', movementId), sanitizeForFirestore(newMovement));
    }

    if (receiptItems.length === 0) {
      return { success: false, message: 'None of the requested products were found in catalog.' };
    }

    const receipt: StockReceipt = {
      id: receiptId,
      receiptNumber,
      receivedBy: payload.receivedBy || 'Staff Member',
      supplier: payload.supplier?.trim() || undefined,
      batchNumber: payload.batchNumber?.trim() || undefined,
      notes: payload.notes?.trim() || undefined,
      totalQuantity,
      totalItemsCount: receiptItems.length,
      totalCost: totalCost > 0 ? totalCost : undefined,
      items: receiptItems,
      createdAt: new Date().toISOString(),
      status: 'completed'
    };

    stockReceiptsCache = [receipt, ...stockReceiptsCache];
    batch.set(doc(db, 'stock_receipts', receiptId), sanitizeForFirestore(receipt));

    try {
      await batch.commit();
      notifySubscribers();
      notifyReceiptSubscribers();

      // Trigger Slack notification for restock
      import('./slackNotificationService').then(({ slackNotificationService }) => {
        receiptItems.forEach(ri => {
          const prod = this.getProductById(ri.productId);
          if (prod) {
            slackNotificationService.notifyStockAlert(prod, 'inventory_updated', ri.previousStock).catch(console.warn);
          }
        });
      }).catch(console.warn);

      return {
        success: true,
        message: `Successfully received ${totalQuantity} units across ${receiptItems.length} products (Receipt #${receiptNumber}).`,
        receipt
      };
    } catch (err: any) {
      console.error('Failed to commit stock-in batch:', err);
      return { success: false, message: 'Failed to save stock-in to database.' };
    }
  }
};
