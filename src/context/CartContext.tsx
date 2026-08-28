import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Order, OrderItem } from '../types';
import { posService } from '../services/posService';
import { useAuth } from './AuthContext';
import { db, sanitizeForFirestore } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { analytics } from '../services/analyticsService';
import { captureAndPersistAttribution, getStoredAttribution } from '../services/attributionService';
import { getProductUnitPrice, getRetailPrice } from '../utils/pricing';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, delta: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  language: 'en' | 'bn';
  setLanguage: (lang: 'en' | 'bn') => void;
  checkoutStep: 'cart' | 'details' | 'success';
  setCheckoutStep: (step: 'cart' | 'details' | 'success') => void;
  checkoutForm: {
    name: string;
    phone: string;
    address: string;
    area: 'dhaka' | 'outside';
  };
  setCheckoutForm: React.Dispatch<React.SetStateAction<{
    name: string;
    phone: string;
    address: string;
    area: 'dhaka' | 'outside';
  }>>;
  lastCreatedOrder: Order | null;
  setLastCreatedOrder: (order: Order | null) => void;
  calculateCartSubtotal: () => number;
  calculateShipping: () => number;
  handleCheckoutSubmit: (e: React.FormEvent) => Promise<void>;
  activeTranslations: any;
  // Loyalty Points
  useLoyaltyPoints: boolean;
  setUseLoyaltyPoints: (use: boolean) => void;
  availablePoints: number;
  pointsDiscount: number;
  calculateGrandTotal: () => number;
  calculatePointsEarned: () => number;
}

const TRANSLATIONS = {
  en: {
    tagline: "Love yourself, Love your skin",
    shop: "Shop Catalog",
    home: "Home",
    cart: "Your Cart",
    checkout: "Checkout",
    categories: "Categories",
    skinType: "Skin Types",
    searchPlaceholder: "Search K-Beauty products...",
    all: "All",
    addToCart: "Add to Cart",
    outOfStock: "Out of Stock",
    items: "items",
    total: "Subtotal",
    orderNow: "Confirm Order (Cash on Delivery)",
    cod: "Cash on Delivery (COD)",
    dhaka: "Inside Dhaka (৳80)",
    outsideDhaka: "Outside Dhaka (৳150)",
    shipping: "Shipping Charge",
    grandTotal: "Grand Total",
    trackOrder: "Track Order",
    billingInfo: "Billing & Delivery Info",
    fullName: "Full Name",
    phone: "Phone Number (SMS OTP login)",
    deliveryAddress: "Full Delivery Address",
    selectDelivery: "Select Delivery Zone",
    details: "Details",
    brand: "Brand",
    category: "Category",
    rating: "Rating",
    reviews: "reviews",
    recommendation: "AI Recommendation",
    customerDashboard: "Customer Portal",
    adminDashboard: "Admin Dashboard",
    posSystem: "POS Simulator",
    posSystemSubtitle: "In-Store Live Sync Register",
    loginTitle: "Customer Mobile Login",
    enterPhone: "Enter your phone number to receive a 6-digit OTP code",
    sendOtp: "Send Verification Code",
    enterOtp: "Enter Verification Code",
    verifyOtp: "Verify Code & Log In",
    orderHistory: "Order History",
    noOrders: "No orders found.",
    orderId: "Order ID",
    date: "Date",
    status: "Status",
    payment: "Payment",
    itemsTotal: "Items Total",
    activeOrders: "Active Tracking",
    staffZone: "Staff Verification Zone",
    selectStaffRole: "Select Staff Role to Enter",
    staffEmail: "Staff Work Email",
    staffLogin: "Log in as Staff",
    currency: "৳",
    loginToOrder: "Login Required to Place Order",
    loginToOrderDesc: "You must be logged in with your account to complete your purchase and earn K-Beauty Loyalty Points.",
    loginToOrderBtn: "Log In / Register with Google"
  },
  bn: {
    tagline: "নিজেকে ভালোবাসুন, নিজের ত্বকের যত্ন নিন",
    shop: "পণ্য তালিকা",
    home: "হোম",
    cart: "আপনার কার্ট",
    checkout: "চেকআউট",
    categories: "ক্যাটাগরি",
    skinType: "ত্বকের ধরন",
    searchPlaceholder: "কে-বিউটি পণ্য খুঁজুন...",
    all: "সব পণ্য",
    addToCart: "কার্টে যোগ করুন",
    outOfStock: "স্টক শেষ",
    items: "টি পণ্য",
    total: "সাবটোটাল",
    orderNow: "অর্ডার নিশ্চিত করুন (ক্যাশ অন ডেলিভারি)",
    cod: "ক্যাশ অন ডেলিভারি (COD)",
    dhaka: "ঢাকার ভেতরে (৳৮০)",
    outsideDhaka: "ঢাকার বাইরে (৳১৫০)",
    shipping: "ডেলিভারি চার্জ",
    grandTotal: "সর্বমোট",
    trackOrder: "অর্ডার ট্র্যাক করুন",
    billingInfo: "বিলিং ও ডেলিভারি তথ্য",
    fullName: "পূর্ণ নাম",
    phone: "মোবাইল নম্বর (ওটিপি লগইন)",
    deliveryAddress: "সম্পূর্ণ ডেলিভারি ঠিকানা",
    selectDelivery: "ডেলিভারি জোন নির্বাচন করুন",
    details: "বিস্তারিত",
    brand: "ব্র্যান্ড",
    category: "ক্যাটাগরি",
    rating: "রেটিং",
    reviews: "রিভিউ",
    recommendation: "এআই সুপারিশ",
    customerDashboard: "গ্রাহক পোর্টাল",
    adminDashboard: "এডমিন ড্যাশবোর্ড",
    posSystem: "পিওএস সিমুলেটর",
    posSystemSubtitle: "ইন-স্টোর লাইভ সিঙ্ক রেজিস্টার",
    loginTitle: "গ্রাহক মোবাইল লগইন",
    enterPhone: "৬-সংখ্যার ওটিপি কোড পেতে আপনার মোবাইল নম্বর লিখুন",
    sendOtp: "ভেরিফিকেশন কোড পাঠান",
    enterOtp: "ভেরিফিকেশন কোড লিখুন",
    verifyOtp: "কোড যাচাই এবং লগইন",
    orderHistory: "অর্ডার হিস্ট্রি",
    noOrders: "কোন অর্ডার পাওয়া যায়নি।",
    orderId: "অর্ডার আইডি",
    date: "তারিখ",
    status: "অবস্থা",
    payment: "পেমেন্ট",
    itemsTotal: "মোট আইটেম",
    activeOrders: "অর্ডার ট্র্যাকিং",
    staffZone: "স্টাফ ভেরিফিকেশন জোন",
    selectStaffRole: "প্রবেশ করতে স্টাফ রোল সিলেক্ট করুন",
    staffEmail: "স্টাফ কাজের ইমেইল",
    staffLogin: "স্টাফ হিসেবে লগইন",
    currency: "৳",
    loginToOrder: "অর্ডার করতে লগইন করা আবশ্যক",
    loginToOrderDesc: "অর্ডার সম্পন্ন করতে এবং লয়ালটি পয়েন্ট অর্জন করতে আপনার গুগল অ্যাকাউন্ট দিয়ে লগইন করুন।",
    loginToOrderBtn: "গুগল দিয়ে লগইন করুন"
  }
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'details' | 'success'>('cart');
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);

  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState<boolean>(false);

  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    phone: '',
    address: '',
    area: 'dhaka' as 'dhaka' | 'outside'
  });

  // Load cart from localStorage on mount and initialize attribution/analytics
  useEffect(() => {
    captureAndPersistAttribution();
    analytics.init();

    const cached = localStorage.getItem('ksf_online_cart_v1');
    if (cached) {
      try {
        setCart(JSON.parse(cached));
      } catch (err) {
        console.error('Failed to parse cart cache:', err);
      }
    }
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    localStorage.setItem('ksf_online_cart_v1', JSON.stringify(cart));
  }, [cart]);

  // Auto-fill checkout form from logged-in user profile
  useEffect(() => {
    if (user) {
      setCheckoutForm((prev) => ({
        ...prev,
        name: prev.name || profile?.name || user.displayName || '',
        phone: prev.phone || profile?.phone || user.phoneNumber || '',
        address: prev.address || profile?.address || ''
      }));
    }
  }, [user, profile]);

  const availablePoints = profile?.loyaltyPoints ?? 0;

  const calculateCartSubtotal = () => {
    const isWholesale = profile?.wholesaleAccess === true;
    return cart.reduce((sum, item) => {
      const price = getProductUnitPrice(item.product, isWholesale ? 'wholesale' : 'retail', item.quantity);
      return sum + price * item.quantity;
    }, 0);
  };

  const calculateShipping = () => {
    if (cart.length === 0) return 0;
    return checkoutForm.area === 'dhaka' ? 80 : 150;
  };

  // 1 Point = ৳1 discount. Maximum discount cannot exceed subtotal.
  const pointsDiscount = useLoyaltyPoints 
    ? Math.min(calculateCartSubtotal(), availablePoints) 
    : 0;

  const calculateGrandTotal = () => {
    const subtotal = calculateCartSubtotal();
    if (subtotal === 0) return 0;
    const ship = calculateShipping();
    return Math.max(0, subtotal + ship - pointsDiscount);
  };

  // Earning rate: 1 point for every ৳10 spent
  const calculatePointsEarned = () => {
    const total = calculateGrandTotal();
    return Math.floor(total / 10);
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    const validQty = Math.max(1, Number(quantity) || 1);
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += validQty;
        return updated;
      }
      return [...prev, { product, quantity: validQty }];
    });
    setIsCartOpen(true);
    setCheckoutStep('cart');
    // Track Add To Cart
    analytics.trackAddToCart(product, validQty);
  };

  const removeFromCart = (productId: string) => {
    const targetItem = cart.find((item) => item.product.id === productId);
    if (targetItem) {
      analytics.trackRemoveFromCart(targetItem.product, targetItem.quantity);
    }
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (delta > 0) {
              analytics.trackAddToCart(item.product, delta);
            } else if (delta < 0) {
              analytics.trackRemoveFromCart(item.product, Math.abs(delta));
            }
            return { ...item, quantity: Math.max(1, nextQty) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const clearCart = () => {
    setCart([]);
    setCheckoutStep('cart');
    setLastCreatedOrder(null);
    setUseLoyaltyPoints(false);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!user) {
      alert(language === 'bn' ? 'অর্ডার সম্পন্ন করতে আপনাকে অবশ্যই প্রথমে লগইন করতে হবে।' : 'Login Required: You must be logged in to place an order.');
      return;
    }

    try {
      const isWholesale = profile?.wholesaleAccess === true;
      const orderItems: OrderItem[] = cart.map((item) => {
        const unitPrice = getProductUnitPrice(item.product, isWholesale ? 'wholesale' : 'retail', item.quantity);
        const tier = isWholesale
          ? (item.quantity >= 50 ? 'wholesale_50_plus' : 'wholesale_1_49')
          : 'retail';
        return {
          productId: item.product.id,
          name: item.product.name,
          price: unitPrice,
          quantity: item.quantity,
          pricingType: isWholesale ? 'wholesale' : 'retail',
          pricingTier: tier
        };
      });

      const grandTotal = calculateGrandTotal();
      const earnedPts = calculatePointsEarned();
      const redeemedPts = pointsDiscount; // 1 point = ৳1
      const attribution = getStoredAttribution();
      
      const attributionPayload: Record<string, any> = {};
      const utm_source = attribution.last_touch?.utm_source || attribution.first_touch?.utm_source;
      const utm_medium = attribution.last_touch?.utm_medium || attribution.first_touch?.utm_medium;
      const utm_campaign = attribution.last_touch?.utm_campaign || attribution.first_touch?.utm_campaign;
      const utm_content = attribution.last_touch?.utm_content || attribution.first_touch?.utm_content;
      const utm_term = attribution.last_touch?.utm_term || attribution.first_touch?.utm_term;
      
      if (utm_source) attributionPayload.utm_source = utm_source;
      if (utm_medium) attributionPayload.utm_medium = utm_medium;
      if (utm_campaign) attributionPayload.utm_campaign = utm_campaign;
      if (utm_content) attributionPayload.utm_content = utm_content;
      if (utm_term) attributionPayload.utm_term = utm_term;
      if (attribution.gclid) attributionPayload.gclid = attribution.gclid;
      if (attribution.fbclid) attributionPayload.fbclid = attribution.fbclid;
      if (attribution.fbp) attributionPayload.fbp = attribution.fbp;
      if (attribution.fbc) attributionPayload.fbc = attribution.fbc;
      if (attribution.creator?.creator_id) attributionPayload.creator_id = attribution.creator.creator_id;
      if (attribution.creator?.ref) attributionPayload.ref = attribution.creator.ref;

      const orderData = {
        customerName: checkoutForm.name,
        customerPhone: checkoutForm.phone,
        customerEmail: user?.email || null,
        address: checkoutForm.address,
        items: orderItems,
        totalAmount: grandTotal,
        discountAmount: redeemedPts,
        pointsEarned: earnedPts,
        pointsRedeemed: redeemedPts,
        paymentMethod: 'COD' as const,
        customer_uid: user?.uid || null,
        attribution: attributionPayload
      };

      const createdOrder = posService.createOnlineOrder(sanitizeForFirestore(orderData) as any);

      // Track Authoritative Purchase immediately on order placement
      analytics.trackPurchase(createdOrder).catch(console.warn);

      // Update user's loyalty points balance in Firestore
      if (user?.uid) {
        const currentBalance = profile?.loyaltyPoints ?? 0;
        const newBalance = Math.max(0, currentBalance - redeemedPts + earnedPts);
        try {
          await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore({
            loyaltyPoints: newBalance
          }), { merge: true });
        } catch (ptsErr) {
          console.warn('[CartContext] Failed to update user loyalty points balance:', ptsErr);
        }
      }

      setLastCreatedOrder(createdOrder);
      setCheckoutStep('success');
      setCart([]);
      setUseLoyaltyPoints(false);
      localStorage.removeItem('ksf_online_cart_v1');
    } catch (err) {
      console.error('Online checkout failed:', err);
      alert('Order Placement Failed. Please try again.');
    }
  };

  const activeTranslations = TRANSLATIONS[language];

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        language,
        setLanguage,
        checkoutStep,
        setCheckoutStep,
        checkoutForm,
        setCheckoutForm,
        lastCreatedOrder,
        setLastCreatedOrder,
        calculateCartSubtotal,
        calculateShipping,
        handleCheckoutSubmit,
        activeTranslations,
        useLoyaltyPoints,
        setUseLoyaltyPoints,
        availablePoints,
        pointsDiscount,
        calculateGrandTotal,
        calculatePointsEarned,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
