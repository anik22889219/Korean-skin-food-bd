import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  Product, 
  WholesaleCartItem, 
  WholesaleCheckoutType, 
  WholesaleCodFormData, 
  WholesaleParcelFormData,
  WholesaleOrder
} from '../types';
import { getWholesalePrice } from '../utils/pricing';
import { isValidPhoneNumber } from '../services/wholesaleService';
import { wholesaleOrderService } from '../services/wholesaleOrderService';
import { auth } from '../services/firebase';
import { useAuth } from './AuthContext';

interface WholesaleCartContextType {
  cart: WholesaleCartItem[];
  addToWholesaleCart: (product: Product, quantity?: number) => void;
  updateWholesaleCartQty: (productId: string, quantity: number) => void;
  updateWholesaleItemCodPrice: (productId: string, codPrice: number) => void;
  removeFromWholesaleCart: (productId: string) => void;
  clearWholesaleCart: () => void;
  totalUnits: number;
  wholesaleSubtotal: number;
  totalWholesaleCost: number;
  totalCodValue: number;
  totalProfit: number;
  isTotalLoss: boolean;
  totalUniqueItems: number;
  // Checkout Type & Form States
  checkoutType: WholesaleCheckoutType;
  setCheckoutType: (type: WholesaleCheckoutType) => void;
  codForm: WholesaleCodFormData;
  setCodForm: React.Dispatch<React.SetStateAction<WholesaleCodFormData>>;
  parcelForm: WholesaleParcelFormData;
  setParcelForm: React.Dispatch<React.SetStateAction<WholesaleParcelFormData>>;
  validationErrors: Record<string, string>;
  setValidationErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isSubmitting: boolean;
  submitSuccess: boolean;
  submittedOrderSummary: any | null;
  resetSubmission: () => void;
  handleWholesaleSubmit: (e?: React.FormEvent) => Promise<boolean>;
}

const WholesaleCartContext = createContext<WholesaleCartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'ksf_wholesale_cart_v2';
const DRAFT_STORAGE_KEY = 'ksf_wholesale_checkout_draft_v2';

export const WholesaleCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [cart, setCart] = useState<WholesaleCartItem[]>([]);
  const [checkoutType, setCheckoutType] = useState<WholesaleCheckoutType>('COD_DIRECT');

  // Type 1 Form State
  const [codForm, setCodForm] = useState<WholesaleCodFormData>({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    codPrice: '',
    orderNote: ''
  });

  // Type 2 Form State
  const [parcelForm, setParcelForm] = useState<WholesaleParcelFormData>({
    parcelId: '',
    velouriaId: '',
    customerName: '',
    codPrice: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedOrderSummary, setSubmittedOrderSummary] = useState<any | null>(null);

  // Restore cart and draft from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }

      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (draft.checkoutType) setCheckoutType(draft.checkoutType);
        if (draft.codForm) setCodForm(draft.codForm);
        if (draft.parcelForm) setParcelForm(draft.parcelForm);
      }
    } catch (err) {
      console.warn('[WholesaleCart] Failed to restore from localStorage:', err);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      console.warn('[WholesaleCart] Failed to persist cart:', err);
    }
  }, [cart]);

  // Save form draft to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
        checkoutType,
        codForm,
        parcelForm
      }));
    } catch (err) {
      console.warn('[WholesaleCart] Failed to persist draft:', err);
    }
  }, [checkoutType, codForm, parcelForm]);

  // Recalculate price helper
  const calculateTierPrice = (product: Product, qty: number): { unitPrice: number; tier: '1-49' | '50+' } => {
    const tier: '1-49' | '50+' = qty >= 50 ? '50+' : '1-49';
    const unitPrice = getWholesalePrice(product, qty);
    return { unitPrice, tier };
  };

  const addToWholesaleCart = (product: Product, quantity: number = 1) => {
    const validQty = Math.max(1, Number(quantity) || 1);
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id);
      if (existingIdx !== -1) {
        const existing = prev[existingIdx];
        const newQty = existing.quantity + validQty;
        const { unitPrice, tier } = calculateTierPrice(product, newQty);
        const updated = [...prev];
        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          wholesaleUnitPrice: unitPrice,
          pricingTier: tier,
          customCodPrice: existing.customCodPrice ?? product.price ?? unitPrice
        };
        return updated;
      } else {
        const { unitPrice, tier } = calculateTierPrice(product, validQty);
        return [
          ...prev,
          {
            product,
            quantity: validQty,
            wholesaleUnitPrice: unitPrice,
            pricingTier: tier,
            customCodPrice: product.price ?? unitPrice
          }
        ];
      }
    });
  };

  const updateWholesaleCartQty = (productId: string, quantity: number) => {
    const validQty = Math.max(1, Number(quantity) || 1);
    setCart((prev) => {
      return prev.map((item) => {
        if (item.product.id === productId) {
          const { unitPrice, tier } = calculateTierPrice(item.product, validQty);
          return {
            ...item,
            quantity: validQty,
            wholesaleUnitPrice: unitPrice,
            pricingTier: tier
          };
        }
        return item;
      });
    });
  };

  const updateWholesaleItemCodPrice = (productId: string, codPrice: number) => {
    const validPrice = isNaN(codPrice) ? 0 : Math.max(0, codPrice);
    setCart((prev) => {
      return prev.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            customCodPrice: validPrice
          };
        }
        return item;
      });
    });
  };

  const removeFromWholesaleCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearWholesaleCart = () => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const resetSubmission = () => {
    setSubmitSuccess(false);
    setSubmittedOrderSummary(null);
    setIsSubmitting(false);
    setValidationErrors({});
  };

  // Aggregated totals & real-time profit metrics
  const totalUnits = useMemo(() => {
    return cart.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  }, [cart]);

  const wholesaleSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      return acc + (Number(item.wholesaleUnitPrice) * Number(item.quantity));
    }, 0);
  }, [cart]);

  const totalWholesaleCost = wholesaleSubtotal;

  const totalCodValue = useMemo(() => {
    return cart.reduce((acc, item) => {
      const itemCod = item.customCodPrice !== undefined 
        ? item.customCodPrice 
        : (item.product.price ?? item.wholesaleUnitPrice);
      return acc + (Number(itemCod) * Number(item.quantity));
    }, 0);
  }, [cart]);

  const totalProfit = useMemo(() => {
    return totalCodValue - totalWholesaleCost;
  }, [totalCodValue, totalWholesaleCost]);

  const isTotalLoss = totalProfit < 0;

  const totalUniqueItems = cart.length;

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (cart.length === 0) {
      errors.cart = 'Your wholesale cart is empty. Please add products before checking out.';
    }

    if (checkoutType === 'COD_DIRECT') {
      if (!codForm.customerName.trim()) {
        errors.customerName = 'Customer Name is required for COD delivery.';
      }

      if (!codForm.customerPhone.trim()) {
        errors.customerPhone = 'Customer Phone Number is required.';
      } else if (!isValidPhoneNumber(codForm.customerPhone)) {
        errors.customerPhone = 'Enter a valid Bangladeshi phone number (e.g., 017XXXXXXXX).';
      }

      if (!codForm.customerAddress.trim()) {
        errors.customerAddress = 'Customer Full Address is required for parcel delivery.';
      } else if (codForm.customerAddress.trim().length < 5) {
        errors.customerAddress = 'Please provide a detailed address including house/road and area.';
      }

      if (codForm.codPrice === '' || codForm.codPrice === undefined || codForm.codPrice === null) {
        errors.codPrice = 'COD Price is required. Enter the amount to collect from the customer.';
      } else {
        const parsedPrice = Number(codForm.codPrice);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          errors.codPrice = 'Please enter a valid non-negative COD Price (in ৳ BDT).';
        }
      }
    } else if (checkoutType === 'PARCEL_COURIER') {
      if (!parcelForm.parcelId.trim()) {
        errors.parcelId = 'Parcel ID is required for existing courier consignment.';
      }

      if (!parcelForm.velouriaId.trim()) {
        errors.velouriaId = 'Velouria ID is required for verification.';
      }

      if (!parcelForm.customerName.trim()) {
        errors.customerName = 'Customer / Consignment Name is required.';
      }

      if (parcelForm.codPrice === '' || parcelForm.codPrice === undefined || parcelForm.codPrice === null) {
        errors.codPrice = 'COD Price is required. Enter the selling price for your customer.';
      } else {
        const parsedPrice = Number(parcelForm.codPrice);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          errors.codPrice = 'Please enter a valid non-negative COD Price (in ৳ BDT).';
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleWholesaleSubmit = async (e?: React.FormEvent): Promise<boolean> => {
    if (e) e.preventDefault();

    if (isSubmitting) return false;

    console.log('[WholesaleCart] Initiating wholesale order submission...', {
      checkoutType,
      cartItemCount: cart.length,
      totalUnits,
      wholesaleSubtotal,
      totalCodValue
    });

    // Validate form inputs
    const isValid = validateForm();
    if (!isValid) {
      console.warn('[WholesaleCart] Validation failed:', validationErrors);
      return false;
    }

    const currentUserId = user?.uid || auth.currentUser?.uid;
    if (!currentUserId) {
      console.error('[WholesaleCart] Authentication error: Missing user ID.');
      setValidationErrors({
        submit: 'Please log in to your approved wholesale partner account to submit orders.'
      });
      return false;
    }

    setIsSubmitting(true);

    try {
      const isCod = checkoutType === 'COD_DIRECT';
      const checkoutInfoPayload = isCod
        ? {
            checkoutType: 'COD' as const,
            deliveryName: codForm.customerName.trim(),
            deliveryPhone: codForm.customerPhone.trim(),
            deliveryAddress: codForm.customerAddress.trim(),
            codPrice: codForm.codPrice ? Number(codForm.codPrice) : totalCodValue,
            orderNote: codForm.orderNote?.trim()
          }
        : {
            checkoutType: 'PARCEL' as const,
            parcelId: parcelForm.parcelId.trim(),
            velouriaId: parcelForm.velouriaId.trim(),
            deliveryName: parcelForm.customerName.trim(),
            codPrice: parcelForm.codPrice ? Number(parcelForm.codPrice) : totalCodValue
          };

      const fullOrderPayload = {
        userId: currentUserId,
        customer: {
          wholesaleCustomerId: currentUserId,
          userId: currentUserId,
          customerName: profile?.name || user?.displayName || (isCod ? codForm.customerName : parcelForm.customerName),
          businessName: (profile as any)?.businessName || '',
          pageName: (profile as any)?.pageName || '',
          contactNumber: (profile as any)?.phone || (isCod ? codForm.customerPhone : '')
        },
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          customCodPrice: item.customCodPrice !== undefined ? Number(item.customCodPrice) : undefined,
          barcode: item.product.barcode || ''
        })),
        checkoutInfo: checkoutInfoPayload,
        deliveryCharge: 0,
        notes: isCod ? codForm.orderNote : undefined,
        idempotencyKey: `ws-${currentUserId}-${Date.now()}`
      };

      console.log('[WholesaleCart] Full order submission payload prepared:', JSON.stringify(fullOrderPayload, null, 2));

      const createdOrder = await wholesaleOrderService.createWholesaleOrder(fullOrderPayload);

      console.log('[WholesaleCart] Wholesale order successfully persisted to database:', createdOrder);
      setSubmittedOrderSummary(createdOrder);
      setSubmitSuccess(true);
      clearWholesaleCart();
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return true;
    } catch (err: any) {
      console.error('[WholesaleCart] Checkout persistence or Firestore transaction error:', {
        message: err.message,
        stack: err.stack,
        details: err
      });
      setValidationErrors({
        submit: err.message || 'Failed to submit wholesale order. Please try again.'
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <WholesaleCartContext.Provider
      value={{
        cart,
        addToWholesaleCart,
        updateWholesaleCartQty,
        updateWholesaleItemCodPrice,
        removeFromWholesaleCart,
        clearWholesaleCart,
        totalUnits,
        wholesaleSubtotal,
        totalWholesaleCost,
        totalCodValue,
        totalProfit,
        isTotalLoss,
        totalUniqueItems,
        checkoutType,
        setCheckoutType,
        codForm,
        setCodForm,
        parcelForm,
        setParcelForm,
        validationErrors,
        setValidationErrors,
        isSubmitting,
        submitSuccess,
        submittedOrderSummary,
        resetSubmission,
        handleWholesaleSubmit
      }}
    >
      {children}
    </WholesaleCartContext.Provider>
  );
};

export const useWholesaleCart = () => {
  const context = useContext(WholesaleCartContext);
  if (!context) {
    throw new Error('useWholesaleCart must be used within a WholesaleCartProvider');
  }
  return context;
};
