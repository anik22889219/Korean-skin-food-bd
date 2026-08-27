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
 */
export function getWholesalePrice(product?: Partial<Product> | null, quantity: number = 1): number {
  if (!product) return 0;

  const fallbackRetail = getRetailPrice(product);
  const ws1to49 = product.wholesalePrice !== undefined && !isNaN(Number(product.wholesalePrice)) && Number(product.wholesalePrice) > 0
    ? Number(product.wholesalePrice)
    : fallbackRetail;

  const ws50Plus = product.wholesalePrice50Plus !== undefined && !isNaN(Number(product.wholesalePrice50Plus)) && Number(product.wholesalePrice50Plus) > 0
    ? Number(product.wholesalePrice50Plus)
    : ws1to49;

  if (quantity >= 50) {
    return ws50Plus;
  }
  return ws1to49;
}

/**
 * Calculates the unit price for any product given pricing mode and quantity.
 */
export function getProductUnitPrice(
  product?: Partial<Product> | null,
  pricingMode: 'retail' | 'wholesale' = 'retail',
  quantity: number = 1
): number {
  if (!product) return 0;
  if (pricingMode === 'wholesale') {
    return getWholesalePrice(product, quantity);
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
    // Legacy fields for full backward compatibility
    price: retailPrice,
    discountPrice: discountRetailPrice,
    image: product.image || '',
    stock: Number(product.stock ?? 0),
    description: product.description || '',
    descriptionBN: product.descriptionBN || '',
    rating: Number(product.rating ?? 5),
    reviewsCount: Number(product.reviewsCount ?? 0),
    barcode: product.barcode || '',
  } as Product;
}
