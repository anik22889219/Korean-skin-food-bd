import { Product, InventoryLog, StockMovement, StockReceipt, StockReceiptItem } from '../types';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, limit, startAfter, writeBatch, runTransaction, getDoc, getDocs } from 'firebase/firestore';
import { INITIAL_PRODUCTS } from '../data/allProducts';
import { normalizeBarcode, findProductByScannedCode } from '../utils/barcode';
import { getCanonicalBrandName } from '../data/brands';
import { normalizeProductPricing } from '../utils/pricing';
import { queryClient } from '../lib/queryClient';
import { queryKeys } from '../lib/queryKeys';

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
    try {
      queryClient.setQueryData(queryKeys.products.all, prods);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    } catch {
      // Ignored if queryClient not initialized in testing
    }
  }
}, (err) => {
  console.warn('[Firebase] products onSnapshot warning:', err);
  if (err?.code === 'permission-denied' || err?.message?.includes('permission') || err?.message?.includes('Permission')) {
    handleFirestoreError(err, OperationType.GET, 'products', false);
  }
});

// Subscribe to real-time changes in latest 200 inventory logs
onSnapshot(query(collection(db, 'inventory_logs'), orderBy('createdAt', 'desc'), limit(200)), (snapshot) => {
  const logs: InventoryLog[] = [];
  snapshot.forEach((doc) => {
    logs.push(doc.data() as InventoryLog);
  });
  inventoryLogsCache = logs;
  try {
    queryClient.setQueryData(queryKeys.inventory.logs(), logs);
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
  } catch {
    // Safe guard
  }
}, (err) => {
  console.warn('[Firebase] inventory_logs onSnapshot warning:', err);
  if (err?.code === 'permission-denied' || err?.message?.includes('permission') || err?.message?.includes('Permission')) {
    handleFirestoreError(err, OperationType.GET, 'inventory_logs', false);
  }
});

// Subscribe to real-time changes in latest 200 stock movements
onSnapshot(query(collection(db, 'stock_movements'), orderBy('createdAt', 'desc'), limit(200)), (snapshot) => {
  const movements: StockMovement[] = [];
  snapshot.forEach((docSnap) => {
    movements.push(docSnap.data() as StockMovement);
  });
  stockMovementsCache = movements;
  try {
    queryClient.setQueryData(queryKeys.inventory.movements(), movements);
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movements() });
  } catch {
    // Safe guard
  }
}, (err) => {
  console.warn('[Firebase] stock_movements onSnapshot warning:', err);
});

// Subscribe to real-time changes in latest 200 stock receipts
onSnapshot(query(collection(db, 'stock_receipts'), orderBy('createdAt', 'desc'), limit(200)), (snapshot) => {
  const receipts: StockReceipt[] = [];
  snapshot.forEach((docSnap) => {
    receipts.push(docSnap.data() as StockReceipt);
  });
  stockReceiptsCache = receipts;
  notifyReceiptSubscribers();
  try {
    queryClient.setQueryData(queryKeys.inventory.receipts(), receipts);
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.receipts() });
  } catch {
    // Safe guard
  }
}, (err) => {
  console.warn('[Firebase] stock_receipts onSnapshot warning:', err);
});

export const productService = {
  getProducts(): Product[] {
    return productsCache;
  },

  async fetchProducts(): Promise<Product[]> {
    if (productsCache && productsCache.length > 0) {
      return productsCache;
    }
    try {
      const snap = await getDocs(collection(db, 'products'));
      const prods: Product[] = [];
      snap.forEach((docSnap) => {
        const rawData = docSnap.data() as Product;
        const data = normalizeProductPricing(rawData);
        const normalizedBrand = getCanonicalBrandName(data.brand) || data.brand;
        prods.push({
          ...data,
          id: docSnap.id || data.id,
          brand: normalizedBrand,
          barcodeNormalized: data.barcodeNormalized || normalizeBarcode(data.barcode),
        });
      });
      productsCache = prods;
      notifySubscribers();
      try {
        queryClient.setQueryData(queryKeys.products.all, prods);
        queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
        queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      } catch {
        // Safe guard
      }
      return prods;
    } catch (err: any) {
      console.warn('[ProductService] fetchProducts error:', err);
      return productsCache;
    }
  },

  async fetchProductById(id: string): Promise<Product | null> {
    const local = productsCache.find(p => p.id === id);
    if (local) return local;

    try {
      const docSnap = await getDoc(doc(db, 'products', id));
      if (!docSnap.exists()) return null;
      const rawData = docSnap.data() as Product;
      const data = normalizeProductPricing(rawData);
      const normalizedBrand = getCanonicalBrandName(data.brand) || data.brand;
      const prod: Product = {
        ...data,
        id: docSnap.id || data.id,
        brand: normalizedBrand,
        barcodeNormalized: data.barcodeNormalized || normalizeBarcode(data.barcode),
      };
      productsCache = [...productsCache.filter(p => p.id !== id), prod];
      try {
        queryClient.setQueryData(queryKeys.products.detail(id), prod);
      } catch {
        // Safe guard
      }
      return prod;
    } catch (err) {
      console.warn('[ProductService] fetchProductById error:', err);
      return null;
    }
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
    try {
      queryClient.setQueryData(queryKeys.products.all, normalized);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    } catch {
      // Safe guard
    }
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
    try {
      queryClient.setQueryData(queryKeys.products.detail(newProduct.id), newProduct);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    } catch {
      // Safe guard
    }

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
    try {
      queryClient.setQueryData(queryKeys.products.detail(updatedProduct.id), updatedProduct);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    } catch {
      // Safe guard
    }

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
      queryClient.removeQueries({ queryKey: queryKeys.products.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    } catch {
      // Safe guard
    }
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

  async fetchHistoricalInventoryLogs(options: {
    limitCount?: number;
    startAfterCreatedAt?: string;
    productId?: string;
  } = {}): Promise<InventoryLog[]> {
    const { limitCount = 50, startAfterCreatedAt, productId } = options;
    try {
      let q = query(collection(db, 'inventory_logs'), orderBy('createdAt', 'desc'));
      if (startAfterCreatedAt) {
        q = query(q, startAfter(startAfterCreatedAt));
      }
      q = query(q, limit(limitCount));
      const snap = await getDocs(q);
      const logs: InventoryLog[] = [];
      snap.forEach((d) => {
        const item = d.data() as InventoryLog;
        if (!productId || item.productId === productId) {
          logs.push(item);
        }
      });
      return logs;
    } catch (err) {
      console.warn('[ProductService] fetchHistoricalInventoryLogs error:', err);
      return [];
    }
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
    receiptId?: string;
  }): Promise<{ success: boolean; message: string; receipt?: StockReceipt }> {
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      return { success: false, message: 'No items in stock-in queue.' };
    }

    // Strict validation of incoming items
    const validItems: { productId: string; canonicalId: string; quantity: number; importCost?: number }[] = [];
    for (const rawItem of payload.items) {
      if (!rawItem || !rawItem.productId) continue;
      const rawQty = rawItem.quantity;
      const quantity = Number(rawQty);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return {
          success: false,
          message: `Invalid quantity "${rawQty}" for product ID "${rawItem.productId}". Quantity must be a positive number.`
        };
      }

      // Resolve canonical product ID
      const resolved = this.getProductById(rawItem.productId) || this.getProductByBarcode(rawItem.productId);
      const canonicalId = resolved ? resolved.id : rawItem.productId.trim();

      const importCost = rawItem.importCost !== undefined && Number.isFinite(Number(rawItem.importCost)) && Number(rawItem.importCost) > 0
        ? Number(rawItem.importCost)
        : undefined;

      validItems.push({
        productId: rawItem.productId.trim(),
        canonicalId,
        quantity: Math.round(quantity),
        importCost
      });
    }

    if (validItems.length === 0) {
      return { success: false, message: 'All items must have quantity greater than zero.' };
    }

    const receiptId = payload.receiptId || ('rcpt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7));
    const receiptNumber = 'SR-' + Math.floor(100000 + Math.random() * 900000);
    const nowIso = new Date().toISOString();

    try {
      const committedReceipt = await runTransaction(db, async (transaction) => {
        // Idempotency check: if receipt already exists, return existing receipt
        const receiptRef = doc(db, 'stock_receipts', receiptId);
        const existingReceiptDoc = await transaction.get(receiptRef);
        if (existingReceiptDoc.exists()) {
          return existingReceiptDoc.data() as StockReceipt;
        }

        // ================= 1. READ PHASE (All reads must precede writes) =================
        const readResults: {
          item: typeof validItems[0];
          prodRef: any;
          prodData: Product;
          currentStock: number;
          newStock: number;
          itemCost?: number;
        }[] = [];

        for (const item of validItems) {
          const prodRef = doc(db, 'products', item.canonicalId);
          const prodDoc = await transaction.get(prodRef);

          if (!prodDoc.exists()) {
            throw new Error(`Product ID "${item.canonicalId}" not found in database.`);
          }

          const rawData = prodDoc.data() as Product;
          const prodData = normalizeProductPricing(rawData);
          const currentStock = typeof prodData.stock === 'number' && Number.isFinite(prodData.stock) ? prodData.stock : 0;
          const newStock = currentStock + item.quantity;
          const itemCost = item.importCost !== undefined ? item.importCost : (prodData.importPrice || 0);

          readResults.push({
            item,
            prodRef,
            prodData,
            currentStock,
            newStock,
            itemCost: itemCost > 0 ? itemCost : undefined
          });
        }

        // ================= 2. WRITE PHASE =================
        const receiptItems: StockReceiptItem[] = [];
        let totalQuantity = 0;
        let totalCost = 0;

        for (const entry of readResults) {
          const { item, prodRef, prodData, currentStock, newStock, itemCost } = entry;
          totalQuantity += item.quantity;
          if (itemCost && itemCost > 0) {
            totalCost += itemCost * item.quantity;
          }

          receiptItems.push({
            productId: prodData.id || item.canonicalId,
            productName: prodData.name || 'Product',
            barcode: prodData.barcode,
            brand: prodData.brand,
            quantity: item.quantity,
            previousStock: currentStock,
            newStock,
            importCost: itemCost
          });

          // 1. Update Product Document
          const productUpdate: Record<string, any> = {
            stock: newStock,
            updated_at: nowIso
          };
          if (item.importCost !== undefined && item.importCost > 0) {
            productUpdate.importPrice = item.importCost;
          }
          transaction.update(prodRef, productUpdate);

          // 2. Write Inventory Log
          const logRef = doc(collection(db, 'inventory_logs'));
          const newLog: InventoryLog = {
            id: logRef.id,
            productId: prodData.id || item.canonicalId,
            productName: prodData.name || 'Product',
            type: 'stock_in',
            quantity: item.quantity,
            previousStock: currentStock,
            newStock,
            reason: `Stock In Receipt #${receiptNumber} - ${payload.supplier || 'Warehouse Intake'}`,
            performedBy: payload.receivedBy || 'Staff Member',
            createdAt: nowIso
          };
          transaction.set(logRef, sanitizeForFirestore(newLog));

          // 3. Write Stock Movement
          const movementRef = doc(collection(db, 'stock_movements'));
          const newMovement: StockMovement = {
            id: movementRef.id,
            productId: prodData.id || item.canonicalId,
            productName: prodData.name || 'Product',
            quantity: item.quantity, // POSITIVE for stock additions
            type: 'stock_in',
            source: 'MANUAL',
            performedBy: payload.receivedBy || 'Staff Member',
            previousStock: currentStock,
            newStock,
            reason: `Stock In #${receiptNumber} (${payload.supplier || 'Receiving'})`,
            createdAt: nowIso
          };
          transaction.set(movementRef, sanitizeForFirestore(newMovement));
        }

        // 4. Write Stock Receipt Voucher
        const receiptData: StockReceipt = {
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
          createdAt: nowIso,
          status: 'completed'
        };
        transaction.set(receiptRef, sanitizeForFirestore(receiptData));

        return receiptData;
      });

      // Synchronize local memory cache after successful commit
      committedReceipt.items.forEach(ri => {
        const cached = productsCache.find(p => p.id === ri.productId);
        if (cached) {
          cached.stock = ri.newStock;
          if (ri.importCost) cached.importPrice = ri.importCost;
        }
      });
      stockReceiptsCache = [committedReceipt, ...stockReceiptsCache.filter(r => r.id !== committedReceipt.id)];
      notifySubscribers();
      notifyReceiptSubscribers();

      // Trigger Slack notification asynchronously
      import('./slackNotificationService').then(({ slackNotificationService }) => {
        committedReceipt.items.forEach(ri => {
          const prod = this.getProductById(ri.productId);
          if (prod) {
            slackNotificationService.notifyStockAlert(prod, 'inventory_updated', ri.previousStock).catch(console.warn);
          }
        });
      }).catch(console.warn);

      return {
        success: true,
        message: `Successfully received ${committedReceipt.totalQuantity} units across ${committedReceipt.totalItemsCount} products (Receipt #${committedReceipt.receiptNumber}).`,
        receipt: committedReceipt
      };
    } catch (err: any) {
      console.error('[ProductService] Failed to commit stock-in transaction:', err);
      return {
        success: false,
        message: err?.message || 'Failed to save stock-in to database.'
      };
    }
  }
};
