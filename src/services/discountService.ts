import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  writeBatch, 
  increment 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import { Coupon, BulkDiscountParams, Product } from '../types';
import { getProductUnitPrice, getRetailOriginalPrice } from '../utils/pricing';

export const discountService = {
  /**
   * Real-time subscription to all coupon vouchers for the admin interface.
   */
  subscribeCoupons(
    onData: (coupons: Coupon[]) => void, 
    onError?: (err: Error) => void
  ): () => void {
    const couponsRef = collection(db, 'coupons');
    return onSnapshot(
      couponsRef,
      (snapshot) => {
        const coupons: Coupon[] = [];
        snapshot.forEach((snap) => {
          const data = snap.data() as Coupon;
          coupons.push({
            ...data,
            id: snap.id,
          });
        });
        // Sort newest first
        coupons.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        onData(coupons);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'coupons', false);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Fetch all coupons once.
   */
  async getCoupons(): Promise<Coupon[]> {
    try {
      const snap = await getDocs(collection(db, 'coupons'));
      const list: Coupon[] = [];
      snap.forEach((d) => {
        list.push({ ...(d.data() as Coupon), id: d.id });
      });
      return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'coupons');
      return [];
    }
  },

  /**
   * Create or update a coupon voucher.
   */
  async saveCoupon(couponData: Partial<Coupon> & { code: string; discountType: Coupon['discountType'] }): Promise<string> {
    const formattedCode = couponData.code.trim().toUpperCase();
    const id = couponData.id || `cpn_${formattedCode}_${Date.now()}`;
    const now = new Date().toISOString();

    const payload: Coupon = {
      id,
      code: formattedCode,
      description: couponData.description || '',
      discountType: couponData.discountType,
      discountValue: Number(couponData.discountValue) || 0,
      minOrderAmount: couponData.minOrderAmount ? Number(couponData.minOrderAmount) : undefined,
      maxDiscountCap: couponData.maxDiscountCap ? Number(couponData.maxDiscountCap) : undefined,
      appliesTo: couponData.appliesTo || 'all',
      applicableProductIds: couponData.applicableProductIds || [],
      applicableBrands: couponData.applicableBrands || [],
      applicableCategories: couponData.applicableCategories || [],
      startDate: couponData.startDate || now,
      endDate: couponData.endDate || '',
      usageLimit: couponData.usageLimit ? Number(couponData.usageLimit) : undefined,
      usageCount: couponData.usageCount || 0,
      isActive: couponData.isActive !== false,
      createdAt: couponData.createdAt || now,
      updatedAt: now,
      createdBy: couponData.createdBy || 'admin',
    };

    try {
      const sanitized = sanitizeForFirestore(payload);
      await setDoc(doc(db, 'coupons', id), sanitized, { merge: true });
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `coupons/${id}`);
      throw error;
    }
  },

  /**
   * Toggle active/inactive status of a coupon.
   */
  async toggleCouponStatus(couponId: string, isActive: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, 'coupons', couponId), {
        isActive,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `coupons/${couponId}`);
      throw error;
    }
  },

  /**
   * Delete a coupon document.
   */
  async deleteCoupon(couponId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'coupons', couponId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `coupons/${couponId}`);
      throw error;
    }
  },

  /**
   * Validate a coupon against customer's cart items and subtotal.
   */
  async validateCoupon(
    rawCode: string, 
    cartItems: { product: Product; quantity: number }[], 
    cartSubtotal: number
  ): Promise<{
    isValid: boolean;
    message?: string;
    coupon?: Coupon;
    discountAmount: number;
    isFreeDelivery: boolean;
  }> {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      return { isValid: false, message: 'Please enter a coupon code', discountAmount: 0, isFreeDelivery: false };
    }

    try {
      // Look up coupon by code
      const q = query(collection(db, 'coupons'), where('code', '==', code));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { isValid: false, message: `Coupon "${code}" is invalid or expired.`, discountAmount: 0, isFreeDelivery: false };
      }

      const couponDoc = snap.docs[0];
      const coupon = { ...couponDoc.data(), id: couponDoc.id } as Coupon;

      // 1. Active check
      if (!coupon.isActive) {
        return { isValid: false, message: `Coupon "${code}" is currently inactive.`, discountAmount: 0, isFreeDelivery: false };
      }

      const now = new Date();

      // 2. Start date check
      if (coupon.startDate && new Date(coupon.startDate) > now) {
        return { 
          isValid: false, 
          message: `Coupon "${code}" is not valid until ${new Date(coupon.startDate).toLocaleDateString()}.`, 
          discountAmount: 0, 
          isFreeDelivery: false 
        };
      }

      // 3. Expiration date check
      if (coupon.endDate && new Date(coupon.endDate) < now) {
        return { isValid: false, message: `Coupon "${code}" expired on ${new Date(coupon.endDate).toLocaleDateString()}.`, discountAmount: 0, isFreeDelivery: false };
      }

      // 4. Usage limit check
      if (coupon.usageLimit && (coupon.usageCount || 0) >= coupon.usageLimit) {
        return { isValid: false, message: `Coupon "${code}" has reached its maximum redemption limit.`, discountAmount: 0, isFreeDelivery: false };
      }

      // 5. Minimum order amount check
      if (coupon.minOrderAmount && cartSubtotal < coupon.minOrderAmount) {
        const diff = coupon.minOrderAmount - cartSubtotal;
        return { 
          isValid: false, 
          message: `Minimum order value for "${code}" is ৳${coupon.minOrderAmount.toLocaleString()}. Add ৳${diff.toLocaleString()} more to apply.`, 
          discountAmount: 0, 
          isFreeDelivery: false 
        };
      }

      // 6. Scope check (all vs specific products/brands/categories)
      let eligibleSubtotal = cartSubtotal;
      if (coupon.appliesTo === 'specific_products' && coupon.applicableProductIds && coupon.applicableProductIds.length > 0) {
        const eligibleItems = cartItems.filter(item => coupon.applicableProductIds?.includes(item.product.id));
        if (eligibleItems.length === 0) {
          return { 
            isValid: false, 
            message: `Coupon "${code}" applies only to specific promotional products.`, 
            discountAmount: 0, 
            isFreeDelivery: false 
          };
        }
        eligibleSubtotal = eligibleItems.reduce((acc, item) => {
          return acc + (getProductUnitPrice(item.product, 'retail', item.quantity) * item.quantity);
        }, 0);
      } else if (coupon.appliesTo === 'brands' && coupon.applicableBrands && coupon.applicableBrands.length > 0) {
        const eligibleItems = cartItems.filter(item => 
          coupon.applicableBrands?.some(b => b.toLowerCase() === (item.product.brand || '').toLowerCase())
        );
        if (eligibleItems.length === 0) {
          return { 
            isValid: false, 
            message: `Coupon "${code}" is only valid for selected brands (${coupon.applicableBrands.join(', ')}).`, 
            discountAmount: 0, 
            isFreeDelivery: false 
          };
        }
        eligibleSubtotal = eligibleItems.reduce((acc, item) => {
          return acc + (getProductUnitPrice(item.product, 'retail', item.quantity) * item.quantity);
        }, 0);
      }

      // 7. Calculate discount amount & free delivery
      let discountAmount = 0;
      let isFreeDelivery = false;

      if (coupon.discountType === 'free_delivery') {
        isFreeDelivery = true;
        discountAmount = 0; // The shipping charge itself is zeroed out by CartContext
      } else if (coupon.discountType === 'percentage') {
        const pct = Math.min(100, Math.max(0, coupon.discountValue));
        discountAmount = Math.round((eligibleSubtotal * pct) / 100);
        if (coupon.maxDiscountCap && coupon.maxDiscountCap > 0) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscountCap);
        }
      } else if (coupon.discountType === 'fixed_amount') {
        discountAmount = Math.min(eligibleSubtotal, coupon.discountValue);
      }

      return {
        isValid: true,
        coupon,
        discountAmount,
        isFreeDelivery,
        message: isFreeDelivery 
          ? `Coupon "${code}" applied: Free Delivery!` 
          : `Coupon "${code}" applied: ৳${discountAmount.toLocaleString()} discount!`
      };
    } catch (error) {
      console.error('Error validating coupon:', error);
      return { isValid: false, message: 'Unable to validate coupon code at this time.', discountAmount: 0, isFreeDelivery: false };
    }
  },

  /**
   * Record coupon redemption on an order.
   */
  async incrementCouponUsage(couponId: string): Promise<void> {
    try {
      const ref = doc(db, 'coupons', couponId);
      await updateDoc(ref, {
        usageCount: increment(1),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Failed to increment coupon usage count:', err);
    }
  },

  /**
   * Bulk apply or remove discount directly onto products.
   * Can target all products, a specific brand, category, or selected product IDs.
   */
  async applyBulkProductDiscount(
    params: BulkDiscountParams, 
    allProducts: Product[]
  ): Promise<{ updatedCount: number; message: string }> {
    let targetProducts: Product[] = [];

    if (params.target === 'all') {
      targetProducts = allProducts;
    } else if (params.target === 'brand' && params.targetValue) {
      targetProducts = allProducts.filter(
        p => (p.brand || '').toLowerCase() === params.targetValue?.toLowerCase()
      );
    } else if (params.target === 'category' && params.targetValue) {
      targetProducts = allProducts.filter(
        p => (p.category || '').toLowerCase() === params.targetValue?.toLowerCase()
      );
    } else if (params.target === 'specific_products' && params.productIds) {
      targetProducts = allProducts.filter(p => params.productIds?.includes(p.id));
    }

    if (targetProducts.length === 0) {
      return { updatedCount: 0, message: 'No matching products found to update.' };
    }

    // Process in batches of 400 (Firestore max batch is 500)
    const BATCH_SIZE = 400;
    let updatedCount = 0;

    for (let i = 0; i < targetProducts.length; i += BATCH_SIZE) {
      const chunk = targetProducts.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const prod of chunk) {
        const prodRef = doc(db, 'products', prod.id);
        const originalPrice = getRetailOriginalPrice(prod);

        if (params.clearDiscount) {
          // Remove discount
          batch.update(prodRef, {
            discountRetailPrice: null,
            discountPrice: null,
            autoDiscountReason: null,
          });
        } else {
          // Calculate new discounted price
          let newPrice = originalPrice;
          let reason = '';

          if (params.discountType === 'percentage') {
            const pct = Math.min(99, Math.max(1, params.discountValue));
            const reduction = Math.round((originalPrice * pct) / 100);
            newPrice = Math.max(1, originalPrice - reduction);
            reason = `${pct}% Sale`;
          } else {
            const cut = Math.max(1, params.discountValue);
            newPrice = Math.max(1, originalPrice - cut);
            reason = `৳${cut} OFF`;
          }

          batch.update(prodRef, {
            discountRetailPrice: newPrice,
            discountPrice: newPrice,
            autoDiscountReason: reason,
          });
        }
      }

      await batch.commit();
      updatedCount += chunk.length;
    }

    const actionText = params.clearDiscount ? 'Discounts removed from' : 'Discount applied to';
    return {
      updatedCount,
      message: `${actionText} ${updatedCount} product(s) successfully.`
    };
  },

  /**
   * Update or remove discount price for an individual product.
   */
  async updateSingleProductDiscount(
    productId: string, 
    discountRetailPrice: number | null,
    reason?: string
  ): Promise<void> {
    try {
      const prodRef = doc(db, 'products', productId);
      await updateDoc(prodRef, {
        discountRetailPrice: discountRetailPrice !== null ? Number(discountRetailPrice) : null,
        discountPrice: discountRetailPrice !== null ? Number(discountRetailPrice) : null,
        autoDiscountReason: discountRetailPrice !== null ? (reason || 'Admin Special Deal') : null,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
      throw error;
    }
  }
};
