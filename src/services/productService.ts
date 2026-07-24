import { Product, InventoryLog } from '../types';
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
  snapshot.forEach((doc) => {
    const data = doc.data() as Product;
    prods.push({
      ...data,
      barcodeNormalized: data.barcodeNormalized || normalizeBarcode(data.barcode)
    });
  });

  seedInitialProductsIfMissing(prods.length);

  if (prods.length > 0) {
    // Merge existing local cache with remote Firestore data to ensure complete set
    const map = new Map<string, Product>();
    INITIAL_PRODUCTS.forEach(p => {
      map.set(p.id, { ...p, barcodeNormalized: p.barcodeNormalized || normalizeBarcode(p.barcode) });
    });
    prods.forEach(p => map.set(p.id, p));
    productsCache = Array.from(map.values());
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

export const productService = {
  getProducts(): Product[] {
    return productsCache;
  },

  async saveProducts(products: Product[]) {
    productsCache = products;
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

    // Save to Firestore asynchronously
    setDoc(doc(db, 'products', product.id), newProduct).catch(console.error);
    
    // log inventory creation
    this.logInventory(product.id, 'stock_in', product.stock, 0, product.stock, 'Initial creation');
    
    return newProduct;
  },

  updateProduct(product: Product): Product {
    const oldProduct = productsCache.find(p => p.id === product.id);
    const barcodeNormalized = normalizeBarcode(product.barcode);
    const updatedProduct: Product = { ...product, barcodeNormalized };
    
    // Update local cache synchronously
    productsCache = productsCache.map(p => p.id === product.id ? updatedProduct : p);

    // Save to Firestore asynchronously
    setDoc(doc(db, 'products', product.id), updatedProduct).catch(console.error);

    if (oldProduct && oldProduct.stock !== product.stock) {
      this.logInventory(
        product.id,
        'adjustment',
        Math.abs(product.stock - oldProduct.stock),
        oldProduct.stock,
        product.stock,
        'Manual dashboard adjustment'
      );
    }
    return product;
  },

  deleteProduct(id: string) {
    productsCache = productsCache.filter(p => p.id !== id);
    deleteDoc(doc(db, 'products', id)).catch(console.error);
  },

  getInventoryLogs(): InventoryLog[] {
    return inventoryLogsCache;
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
