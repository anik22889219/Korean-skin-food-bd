import { Product } from '../types';

/**
 * Korean Skin Food BD - Centralized Product Pricing Utility
 * 
 * Rules:
 * 1. Retail: Uses discountRetailPrice (if active/valid) or regular retailPrice.
 * 2. Wholesale: Quantity 1-49 uses wholesalePrice; Quantity 50+ uses wholesalePrice50Plus.
 * 3. Backward Compatibility: Preserves mapping to legacy price and discountPrice.
 */

/**
 * Returns the active retail unit price for a product.
 * If discountRetailPrice is set and valid (< retailPrice), returns discountRetailPrice.
 * Otherwise returns retailPrice (falling back to legacy price).
 */
export function getRetailPrice(product?: Partial<Product> | null): number {
  if (!product) return 0;

  const retail = Number(product.retailPrice ?? product.price ?? 0);
  const discount = product.discountRetailPrice !== undefined
    ? Number(product.discountRetailPrice)
    : (product.discountPrice !== undefined ? Number(product.discountPrice) : undefined);

  if (discount !== undefined && !isNaN(discount) && discount > 0 && discount < retail) {
    return discount;
  }

  return isNaN(retail) ? 0 : retail;
}

/**
 * Returns the non-discounted original retail price (for crossed-out display).
 */
export function getRetailOriginalPrice(product?: Partial<Product> | null): number {
  if (!product) return 0;
  const retail = Number(product.retailPrice ?? product.price ?? 0);
  return isNaN(retail) ? 0 : retail;
}

/**
 * Returns the wholesale unit price based on tiered quantity.
 * Quantity < 50 -> wholesalePrice
 * Quantity >= 50 -> wholesalePrice50Plus
 * Strict wholesale mode: If wholesale price is not configured, returns 0 / throws or flags error rather than silently charging retail.
 */
export function getWholesalePrice(product?: Partial<Product> | null, quantity: number = 1, strict: boolean = false): number {
  if (!product) return 0;

  const hasWs1to49 = product.wholesalePrice !== undefined && !isNaN(Number(product.wholesalePrice)) && Number(product.wholesalePrice) > 0;
  const hasWs50Plus = product.wholesalePrice50Plus !== undefined && !isNaN(Number(product.wholesalePrice50Plus)) && Number(product.wholesalePrice50Plus) > 0;

  if (strict && !hasWs1to49 && !hasWs50Plus) {
    throw new Error(`Wholesale price not configured for "${product.name || 'this product'}".`);
  }

  const fallbackRetail = getRetailPrice(product);
  const ws1to49 = hasWs1to49 ? Number(product.wholesalePrice) : fallbackRetail;
  const ws50Plus = hasWs50Plus ? Number(product.wholesalePrice50Plus) : ws1to49;

  if (quantity >= 50) {
    return ws50Plus;
  }
  return ws1to49;
}

/**
 * Checks if a product has valid wholesale pricing configured.
 */
export function isWholesaleConfigured(product?: Partial<Product> | null): boolean {
  if (!product) return false;
  const hasWs1to49 = product.wholesalePrice !== undefined && !isNaN(Number(product.wholesalePrice)) && Number(product.wholesalePrice) > 0;
  const hasWs50Plus = product.wholesalePrice50Plus !== undefined && !isNaN(Number(product.wholesalePrice50Plus)) && Number(product.wholesalePrice50Plus) > 0;
  return hasWs1to49 || hasWs50Plus;
}

/**
 * Returns the cash price for a product if configured (> 0).
 * Otherwise falls back to active retail price.
 */
export function getCashPrice(product?: Partial<Product> | null): number {
  if (!product) return 0;
  const cash = product.cashPrice !== undefined && product.cashPrice !== null ? Number(product.cashPrice) : undefined;
  if (cash !== undefined && !isNaN(cash) && cash > 0) {
    return cash;
  }
  return getRetailPrice(product);
}

/**
 * Aggregates item quantities by productId across cart items to ensure
 * multi-line or split-line quantities (e.g. 30 + 20 = 50) receive the appropriate 50+ wholesale tier.
 */
export function aggregateProductQuantities(items: Array<{ productId: string; quantity: number }>): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) {
    if (!item.productId) continue;
    map[item.productId] = (map[item.productId] || 0) + Number(item.quantity || 0);
  }
  return map;
}

/**
 * Calculates the unit price for any product given pricing mode and total aggregated quantity.
 * Modes:
 * - 'retail': Uses discountRetailPrice (if active) or regular retailPrice.
 * - 'wholesale': Tiered based on quantity (1-49: wholesalePrice, 50+: wholesalePrice50Plus).
 * - 'cash': Uses cashPrice (if configured > 0) or falls back to retail.
 */
export function getProductUnitPrice(
  product?: Partial<Product> | null,
  pricingMode: 'retail' | 'wholesale' | 'cash' = 'retail',
  quantity: number = 1,
  strictWholesale: boolean = false
): number {
  if (!product) return 0;
  if (pricingMode === 'wholesale') {
    return getWholesalePrice(product, quantity, strictWholesale);
  }
  if (pricingMode === 'cash') {
    return getCashPrice(product);
  }
  return getRetailPrice(product);
}

/**
 * Checks whether the product has an active retail discount.
 */
export function hasRetailDiscount(product?: Partial<Product> | null): boolean {
  if (!product) return false;
  const original = getRetailOriginalPrice(product);
  const effective = getRetailPrice(product);
  return original > 0 && effective < original;
}

/**
 * Calculates the retail discount percentage integer (e.g., 15 for 15% OFF).
 */
export function getRetailDiscountPercentage(product?: Partial<Product> | null): number {
  if (!product) return 0;
  const original = getRetailOriginalPrice(product);
  const effective = getRetailPrice(product);
  if (original <= 0 || effective >= original) return 0;
  return Math.round(((original - effective) / original) * 100);
}

/**
 * Calculates the monetary savings amount (e.g., 200 Tk).
 */
export function getRetailSavingsAmount(product?: Partial<Product> | null): number {
  if (!product) return 0;
  const original = getRetailOriginalPrice(product);
  const effective = getRetailPrice(product);
  if (original <= 0 || effective >= original) return 0;
  return original - effective;
}

/**
 * Normalizes product object ensuring all 5 pricing fields and legacy fields are populated.
 */
export function normalizeProductPricing(product: Partial<Product>): Product {
  const retailPrice = Number(product.retailPrice ?? product.price ?? 0);
  const discountRetailPrice = product.discountRetailPrice !== undefined && product.discountRetailPrice !== null && !isNaN(Number(product.discountRetailPrice)) && Number(product.discountRetailPrice) > 0
    ? Number(product.discountRetailPrice)
    : (product.discountPrice !== undefined && product.discountPrice !== null && !isNaN(Number(product.discountPrice)) && Number(product.discountPrice) > 0
      ? Number(product.discountPrice)
      : undefined);

  const importPrice = Number(product.importPrice ?? 0);
  const wholesalePrice = Number(
    product.wholesalePrice !== undefined && product.wholesalePrice !== null && !isNaN(Number(product.wholesalePrice)) && Number(product.wholesalePrice) > 0
      ? product.wholesalePrice
      : (discountRetailPrice ?? retailPrice)
  );

  const wholesalePrice50Plus = Number(
    product.wholesalePrice50Plus !== undefined && product.wholesalePrice50Plus !== null && !isNaN(Number(product.wholesalePrice50Plus)) && Number(product.wholesalePrice50Plus) > 0
      ? product.wholesalePrice50Plus
      : wholesalePrice
  );

  const cashPrice = product.cashPrice !== undefined && product.cashPrice !== null && !isNaN(Number(product.cashPrice)) && Number(product.cashPrice) > 0
    ? Number(product.cashPrice)
    : undefined;

  return {
    ...product,
    id: product.id || `prod-${Date.now()}`,
    name: product.name || '',
    nameBN: product.nameBN || '',
    brand: product.brand || 'K-Beauty',
    category: product.category || 'Skincare',
    skinTypes: product.skinTypes || [],
    retailPrice,
    discountRetailPrice,
    importPrice,
    wholesalePrice,
    wholesalePrice50Plus,
    cashPrice,
    // Legacy fields for full backward compatibility
    price: retailPrice,
    discountPrice: discountRetailPrice,
    image: product.image || '',
    imageAltText: product.imageAltText || product.altText || '',
    metaTitle: product.metaTitle || product.seoTitle || '',
    metaDescription: product.metaDescription || '',
    stock: Number(product.stock ?? 0),
    description: product.description || '',
    descriptionBN: product.descriptionBN || '',
    rating: Number(product.rating ?? 5),
    reviewsCount: Number(product.reviewsCount ?? 0),
    barcode: product.barcode || '',
    isCombo: product.isCombo,
    comboConfig: product.comboConfig,
  } as Product;
}

/**
 * Calculates the dynamic effective stock of a combo product package.
 * For fixed bundles: Determined by the limiting component product.
 * For customizable sets: Determined by the minimum available pool across required steps.
 */
export function getComboEffectiveStock(product?: Partial<Product> | null, allProducts: Product[] = []): number {
  if (!product) return 0;
  if (!product.isCombo || !product.comboConfig) {
    return Number(product.stock ?? 0);
  }

  const { type, items, steps } = product.comboConfig;

  if (type === 'fixed') {
    if (!items || items.length === 0) return 0;
    let minStock = Infinity;
    for (const item of items) {
      const child = allProducts.find(p => p.id === item.productId);
      if (!child || (child.stock ?? 0) <= 0) {
        return 0;
      }
      const requiredQty = Math.max(1, Number(item.quantity || 1));
      const possibleCombos = Math.floor(Number(child.stock) / requiredQty);
      if (possibleCombos < minStock) {
        minStock = possibleCombos;
      }
    }
    return minStock === Infinity ? 0 : Math.max(0, minStock);
  }

  if (type === 'customizable') {
    if (!steps || steps.length === 0) return 0;
    let minStepStock = Infinity;
    for (const step of steps) {
      if (!step.allowedProductIds || step.allowedProductIds.length === 0) return 0;
      // Total available stock across selectable options for this step
      const stepTotalStock = step.allowedProductIds.reduce((sum, pid) => {
        const child = allProducts.find(p => p.id === pid);
        return sum + Math.max(0, Number(child?.stock ?? 0));
      }, 0);
      if (stepTotalStock < minStepStock) {
        minStepStock = stepTotalStock;
      }
    }
    return minStepStock === Infinity ? 0 : Math.max(0, minStepStock);
  }

  return Number(product.stock ?? 0);
}

/**
 * Calculates the original retail sum of the components in a combo package.
 */
export function getComboOriginalSum(
  product?: Partial<Product> | null,
  allProducts: Product[] = [],
  selectedStepProducts?: Record<string, string>
): number {
  if (!product || !product.comboConfig) {
    return getRetailOriginalPrice(product);
  }

  const { type, items, steps } = product.comboConfig;

  if (type === 'fixed') {
    if (!items || items.length === 0) return getRetailOriginalPrice(product);
    return items.reduce((sum, item) => {
      const child = allProducts.find(p => p.id === item.productId);
      const unitRetail = child ? getRetailPrice(child) : 0;
      return sum + (unitRetail * Math.max(1, Number(item.quantity || 1)));
    }, 0);
  }

  if (type === 'customizable') {
    if (!steps || steps.length === 0) return getRetailOriginalPrice(product);
    // If user has chosen products for steps, sum the chosen ones
    if (selectedStepProducts && Object.keys(selectedStepProducts).length > 0) {
      return Object.values(selectedStepProducts).reduce((sum, pid) => {
        const child = allProducts.find(p => p.id === pid);
        return sum + (child ? getRetailPrice(child) : 0);
      }, 0);
    }
    // Otherwise, calculate estimate from first available option in each step
    return steps.reduce((sum, step) => {
      const firstPid = step.allowedProductIds[0];
      const child = allProducts.find(p => p.id === firstPid);
      return sum + (child ? getRetailPrice(child) : 0);
    }, 0);
  }

  return getRetailOriginalPrice(product);
}

/**
 * Calculates the effective final price for a combo package.
 */
export function getComboEffectivePrice(
  product?: Partial<Product> | null,
  allProducts: Product[] = [],
  selectedStepProducts?: Record<string, string>
): number {
  if (!product) return 0;
  if (!product.isCombo || !product.comboConfig) {
    return getRetailPrice(product);
  }

  const { type, pricingMode, packagePrice, discountPercentage } = product.comboConfig;

  if (pricingMode === 'fixed_price' && packagePrice && packagePrice > 0) {
    return packagePrice;
  }

  const originalSum = getComboOriginalSum(product, allProducts, selectedStepProducts);

  if (pricingMode === 'dynamic_discount' && discountPercentage && discountPercentage > 0) {
    const discounted = originalSum * (1 - discountPercentage / 100);
    return Math.round(discounted);
  }

  return packagePrice && packagePrice > 0 ? packagePrice : (getRetailPrice(product) || originalSum);
}

/**
 * Returns total savings in BDT and percentage for a combo package.
 */
export function getComboSavings(
  product?: Partial<Product> | null,
  allProducts: Product[] = [],
  selectedStepProducts?: Record<string, string>
): { savings: number; percentage: number; originalSum: number; finalPrice: number } {
  const originalSum = getComboOriginalSum(product, allProducts, selectedStepProducts);
  const finalPrice = getComboEffectivePrice(product, allProducts, selectedStepProducts);
  const savings = Math.max(0, originalSum - finalPrice);
  const percentage = originalSum > 0 ? Math.round((savings / originalSum) * 100) : 0;

  return { savings, percentage, originalSum, finalPrice };
}
