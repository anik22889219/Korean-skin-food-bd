import { Product, InventoryLog, StockMovement } from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { INITIAL_PRODUCTS } from '../data/allProducts';
import { normalizeBarcode, findProductByScannedCode } from '../utils/barcode';

// Ensure initial products have barcodeNormalized populated
let productsCache: Product[] = INITIAL_PRODUCTS.map(p => ({
  ...p,
  barcodeNormalized: p.barcodeNormalized || normalizeBarcode(p.barcode)
}));
let inventoryLogsCache: InventoryLog[] = [];
let stockMovementsCache: StockMovement[] = [];

// Subscribers for real-time UI synchronization
const subscribers = new Set<(products: Product[]) => void>();

function notifySubscribers() {
  subscribers.forEach(cb => {
    try {
      cb(productsCache);
    } catch (e) {
      console.error('[ProductService] Subscriber error:', e);
    }
  });
}

// Seed database with full inventory catalog if not already populated
let isSeedingDone = false;
async function seedInitialProductsIfMissing(existingDocsCount: number) {
  if (isSeedingDone) return;
  isSeedingDone = true;
  
  if (existingDocsCount === 0) {
    try {
      console.log(`[ProductService] Seeding catalog (${INITIAL_PRODUCTS.length} items) in batched chunks to Firestore...`);
      const BATCH_SIZE = 40;
      for (let i = 0; i < INITIAL_PRODUCTS.length; i += BATCH_SIZE) {
        const chunk = INITIAL_PRODUCTS.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(p => {
          const normProduct = { ...p, barcodeNormalized: p.barcodeNormalized || normalizeBarcode(p.barcode) };
          batch.set(doc(db, 'products', p.id), normProduct, { merge: true });
        });
        await batch.commit();
      }
      console.log('[ProductService] Catalog seeding complete.');
    } catch (err) {
      console.warn('[ProductService] Seeding notice (operating in offline/cached mode):', err);
    }
  }
}

// Subscribe to real-time changes in products
onSnapshot(collection(db, 'products'), (snapshot) => {
  const prods: Product[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as Product;
    prods.push({
      ...data,
      id: docSnap.id || data.id,
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
    productsCache = products;
    notifySubscribers();
    const BATCH_SIZE = 40;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const chunk = products.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(p => {
        batch.set(doc(db, 'products', p.id), p, { merge: true });
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
    const barcodeNormalized = normalizeBarcode(product.barcode);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${product.id}`;
    const newProduct: Product = { ...product, barcodeNormalized, qrCodeUrl };
    
    // Update local cache synchronously
    productsCache = productsCache.filter(p => p.id !== product.id);
    productsCache.push(newProduct);
    notifySubscribers();

    // Save to Firestore asynchronously
    setDoc(doc(db, 'products', product.id), newProduct).catch(console.error);
    
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
    const oldProduct = productsCache.find(p => p.id === product.id);
    const barcodeNormalized = normalizeBarcode(product.barcode);
    const updatedProduct: Product = { ...product, barcodeNormalized };
    
    // Update local cache synchronously
    productsCache = productsCache.map(p => p.id === product.id ? updatedProduct : p);
    notifySubscribers();

    // Save to Firestore asynchronously
    setDoc(doc(db, 'products', product.id), updatedProduct).catch(console.error);

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
    setDoc(doc(db, 'stock_movements', id), newMovement).catch(console.error);
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
    setDoc(doc(db, 'inventory_logs', logId), newLog).catch(console.error);
  }
};
