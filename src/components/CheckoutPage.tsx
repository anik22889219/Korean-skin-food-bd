import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Gift,
  MapPin,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  User as UserIcon,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useProducts } from '../hooks/queries/products';
import { Product } from '../types';
import { analytics } from '../services/analyticsService';
import { getProductUnitPrice } from '../utils/pricing';
import { getSiteUrl } from '../utils/siteUrl';
import { authFetch } from '../services/apiClient';
import { SavedAddress, userPortalService } from '../services/userPortalService';
import { SeoHead } from './SeoHead';

const normalizeBdPhone = (raw: string) => {
  let clean = raw.replace(/[\s\-()]/g, '');
  if (clean.startsWith('+880')) clean = '0' + clean.slice(4);
  else if (clean.startsWith('880')) clean = '0' + clean.slice(3);
  return clean;
};

const isValidBdPhone = (raw: string) => {
  const normalized = normalizeBdPhone(raw);
  return /^01[3-9]\d{8}$/.test(normalized);
};

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signInWithGoogle } = useAuth();
  const {
    cart,
    isSubmitting,
    checkoutError,
    setCheckoutError,
    addToCart,
    removeFromCart,
    updateCartQty,
    language,
    checkoutForm,
    setCheckoutForm,
    calculateCartSubtotal,
    calculateShipping,
    handleCheckoutSubmit,
    activeTranslations,
    useLoyaltyPoints,
    setUseLoyaltyPoints,
    availablePoints,
    pointsDiscount,
    appliedCoupon,
    couponDiscount,
    couponError,
    isFreeDelivery,
    applyCoupon,
    removeCoupon,
    calculateGrandTotal,
    calculatePointsEarned
  } = useCart();

  const { data: allProducts = [], isLoading: productsLoading } = useProducts();

  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponNotice, setCouponNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; address?: string }>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  const hydratedQueryRef = useRef<string | null>(null);
  const trackedCheckoutRef = useRef<boolean>(false);
  const checkoutSessionKeyRef = useRef<string>('');

  if (!checkoutSessionKeyRef.current && typeof window !== 'undefined') {
    const existingKey = window.sessionStorage.getItem('ksf_checkout_session_key');
    if (existingKey) {
      checkoutSessionKeyRef.current = existingKey;
    } else {
      const created = `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem('ksf_checkout_session_key', created);
      checkoutSessionKeyRef.current = created;
    }
  }

  const isWholesaleUser = profile?.wholesaleAccess === true;
  const isBn = language === 'bn';

  // Redirect wholesale partners to dedicated B2B wholesale checkout
  useEffect(() => {
    if (isWholesaleUser) {
      navigate('/wholesale/checkout', { replace: true });
    }
  }, [isWholesaleUser, navigate]);

  // Hydrate shareable link parameters: ?product=<id>&qty=<n> or ?items=id1:qty1,id2:qty2
  useEffect(() => {
    if (!location.search || productsLoading || allProducts.length === 0) return;
    if (hydratedQueryRef.current === location.search) return;

    const params = new URLSearchParams(location.search);
    const singleProdId = params.get('product');
    const singleQtyRaw = Number(params.get('qty') || 1);
    const itemsParam = params.get('items');

    const toAdd: Array<{ product: Product; qty: number }> = [];

    if (singleProdId) {
      const matched = allProducts.find((p) => p.id === singleProdId);
      if (matched) {
        toAdd.push({ product: matched, qty: Math.max(1, Number.isFinite(singleQtyRaw) ? singleQtyRaw : 1) });
      }
    }

    if (itemsParam) {
      const pairs = itemsParam.split(',').map((s) => s.trim()).filter(Boolean);
      for (const pair of pairs) {
        const [rawId, rawQty] = pair.split(':');
        const id = decodeURIComponent((rawId || '').trim());
        const qty = Math.max(1, Number(rawQty) || 1);
        const matched = allProducts.find((p) => p.id === id);
        if (matched) {
          toAdd.push({ product: matched, qty });
        }
      }
    }

    hydratedQueryRef.current = location.search;

    if (toAdd.length > 0) {
      for (const entry of toAdd) {
        addToCart(entry.product, entry.qty, undefined, { openDrawer: false });
      }
    }
  }, [location.search, allProducts, productsLoading, addToCart]);

  // Load saved delivery addresses for signed-in shoppers
  useEffect(() => {
    if (!user?.uid) {
      setSavedAddresses([]);
      setSelectedAddressId('');
      return;
    }
    let active = true;
    userPortalService.getSavedAddresses(user.uid).then((list) => {
      if (!active) return;
      setSavedAddresses(list);
      const defaultAddr = list.find((a) => a.isDefault) || list[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        setCheckoutForm((prev) => ({
          ...prev,
          name: prev.name || defaultAddr.recipientName || profile?.name || user.displayName || '',
          phone: prev.phone || defaultAddr.phone || profile?.phone || '',
          area: prev.address ? prev.area : defaultAddr.area,
          address: prev.address || defaultAddr.addressLine || '',
        }));
      }
    });
    return () => {
      active = false;
    };
  }, [user?.uid]);

  // Track Begin Checkout once per session when cart has items
  useEffect(() => {
    if (!trackedCheckoutRef.current && cart.length > 0) {
      trackedCheckoutRef.current = true;
      analytics.trackBeginCheckout(cart, calculateCartSubtotal());
    }
  }, [cart.length]);

  const subtotal = calculateCartSubtotal();
  const shipping = calculateShipping();
  const grandTotal = calculateGrandTotal();
  const earnedPoints = calculatePointsEarned();
  const totalItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  // Live stock checks against catalog
  const stockIssues = useMemo(() => {
    if (allProducts.length === 0) return [];
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    return cart
      .map((item) => {
        const live = productMap.get(item.product.id);
        const liveStock = live ? Number(live.stock ?? 0) : Number(item.product.stock ?? 0);
        if (liveStock < item.quantity) {
          return {
            productId: item.product.id,
            name: item.product.name,
            requested: item.quantity,
            available: liveStock,
          };
        }
        return null;
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [cart, allProducts]);

  // Debounced abandoned-checkout capture beacon
  useEffect(() => {
    if (cart.length === 0) return;
    const hasContact = isValidBdPhone(checkoutForm.phone) || checkoutForm.name.trim().length >= 2;
    if (!hasContact || !checkoutSessionKeyRef.current) return;

    const timer = window.setTimeout(() => {
      authFetch('/api/checkout/abandoned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionKey: checkoutSessionKeyRef.current,
          customerName: checkoutForm.name.trim(),
          customerPhone: normalizeBdPhone(checkoutForm.phone),
          area: checkoutForm.area,
          subtotal,
          items: cart.map((c) => ({
            productId: c.product.id,
            name: c.product.name,
            quantity: c.quantity,
            price: getProductUnitPrice(c.product, 'retail', c.quantity),
          })),
        }),
      }).catch(() => {});
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [cart, checkoutForm.name, checkoutForm.phone, checkoutForm.area, subtotal]);

  // Shareable checkout URL (includes current basket items if non-empty so recipient sees identical cart)
  const shareableCheckoutUrl = useMemo(() => {
    const base = `${getSiteUrl()}/checkout`;
    if (cart.length === 0) return base;
    if (cart.length === 1) {
      return `${base}?product=${encodeURIComponent(cart[0].product.id)}&qty=${cart[0].quantity}`;
    }
    const serialized = cart
      .map((item) => `${encodeURIComponent(item.product.id)}:${item.quantity}`)
      .join(',');
    return `${base}?items=${serialized}`;
  }, [cart]);

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableCheckoutUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2400);
    } catch {
      setLinkCopied(false);
    }
  };

  // Filtered products for inline quick-add
  const quickAddProducts = useMemo(() => {
    const inStock = allProducts.filter((p) => (p.stock ?? 0) > 0);
    const pool = inStock.length > 0 ? inStock : allProducts;
    if (!quickSearch.trim()) return pool.slice(0, 6);
    const q = quickSearch.toLowerCase();
    return pool
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.nameBN?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [allProducts, quickSearch]);

  const handleCouponApply = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponNotice(null);
    const res = await applyCoupon(couponInput.trim());
    setCouponLoading(false);
    if (res.success) {
      setCouponInput('');
      setCouponNotice({ type: 'success', message: res.message });
    } else {
      setCouponNotice({ type: 'error', message: res.message });
    }
  };

  const validateCheckoutForm = () => {
    const errors: { name?: string; phone?: string; address?: string } = {};
    if (!checkoutForm.name.trim() || checkoutForm.name.trim().length < 2) {
      errors.name = isBn ? 'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন।' : 'Please enter your full name.';
    }
    if (!checkoutForm.phone.trim() || !isValidBdPhone(checkoutForm.phone.trim())) {
      errors.phone = isBn
        ? 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।'
        : 'Enter a valid Bangladesh phone number (e.g. 017XXXXXXXX).';
    }
    if (!checkoutForm.address.trim() || checkoutForm.address.trim().length < 5) {
      errors.address = isBn
        ? 'বাসা, রোড ও এলাকা উল্লেখ করে সম্পূর্ণ ঠিকানা লিখুন।'
        : 'Please enter your complete delivery address (house, road, area).';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || isSubmitting) return;
    if (!validateCheckoutForm()) return;

    const createdOrder = await handleCheckoutSubmit();
    if (createdOrder) {
      navigate(`/thank-you/${encodeURIComponent(createdOrder.id)}`, {
        state: { order: createdOrder },
        replace: true
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5F8]/40 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12">
      <SeoHead
        title={isBn ? 'চেকআউট | Korean Skin Food BD' : 'Checkout | Korean Skin Food BD'}
        description="Complete your Korean skincare order with fast Cash on Delivery across Bangladesh."
        noindex
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Bar & Shareable Checkout Header */}
        <div className="bg-white rounded-2xl border border-pink-100 p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <nav className="flex items-center gap-2 text-xs font-semibold text-gray-500">
              <Link to="/" className="hover:text-[#E91E8C] transition">
                {activeTranslations.home || 'Home'}
              </Link>
              <span>/</span>
              <Link to="/shop" className="hover:text-[#E91E8C] transition">
                {activeTranslations.shop || 'Shop'}
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-bold">{activeTranslations.checkout || 'Checkout'}</span>
            </nav>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {isBn ? 'অর্ডার চেকআউট' : 'Checkout & Delivery Details'}
            </h1>
            <p className="text-xs text-gray-500">
              {isBn
                ? 'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা · সরাসরি ফোন কনফার্মেশন'
                : 'Cash on Delivery across Bangladesh · Phone Confirmation Dispatch'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-pink-200 bg-pink-50/70 hover:bg-pink-100/70 text-[#E91E8C] text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              {linkCopied ? <Check size={15} className="text-emerald-600" /> : <Share2 size={15} />}
              <span>
                {linkCopied
                  ? isBn
                    ? 'লিংক কপি হয়েছে!'
                    : 'Checkout Link Copied!'
                  : isBn
                    ? 'চেকআউট লিংক কপি'
                    : 'Copy Checkout Link'}
              </span>
            </button>
            <Link
              to="/shop"
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-gray-700 text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <ArrowLeft size={14} />
              <span>{isBn ? 'শপিং চালিয়ে যান' : 'Continue Shopping'}</span>
            </Link>
          </div>
        </div>

        {/* Empty Basket State with Inline Quick Product Add */}
        {cart.length === 0 ? (
          <div className="bg-white rounded-3xl border border-pink-100 p-6 sm:p-10 shadow-xs space-y-8">
            <div className="text-center max-w-md mx-auto space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center mx-auto text-[#E91E8C]">
                <ShoppingBag size={28} />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900">
                {isBn ? 'আপনার চেকআউট কার্টটি খালি' : 'Your Checkout Basket is Empty'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                {isBn
                  ? 'সরাসরি এখান থেকে পছন্দের পণ্য যোগ করুন অথবা আমাদের শপ ক্যাটালগ থেকে বেছে নিন।'
                  : 'Add products directly below to start an instant order, or browse our full K-Beauty catalog.'}
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/shop"
                  className="min-h-[44px] px-6 py-2.5 bg-[#E91E8C] hover:bg-[#d8177f] text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <ShoppingBag size={15} />
                  <span>{isBn ? 'শপ ক্যাটালগ দেখুন' : 'Browse Shop Catalog'}</span>
                </Link>
              </div>
            </div>

            {/* Inline Quick-Add Search */}
            <div className="border-t border-pink-100 pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-sm font-black text-gray-900">
                  {isBn ? 'দ্রুত পণ্য যোগ করুন' : 'Quick Add to Basket'}
                </h3>
                <div className="relative w-full sm:w-72">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    placeholder={isBn ? 'পণ্যের নাম বা ব্র্যান্ড লিখুন...' : 'Search product or brand...'}
                    className="w-full min-h-[44px] pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#E91E8C] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {quickAddProducts.map((product) => {
                  const unitPrice = getProductUnitPrice(product, 'retail', 1);
                  const imgFailed = failedImages[product.id];
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200 bg-white hover:border-pink-200 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl border border-pink-100 bg-pink-50/30 overflow-hidden shrink-0 flex items-center justify-center">
                          {product.image && !imgFailed ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              referrerPolicy="no-referrer"
                              onError={() => setFailedImages((prev) => ({ ...prev, [product.id]: true }))}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShoppingBag size={18} className="text-pink-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {isBn ? product.nameBN || product.name : product.name}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate">{product.brand}</p>
                          <p className="text-xs font-black text-[#E91E8C] font-mono tabular-nums mt-0.5">
                            ৳{unitPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(product, 1, undefined, { openDrawer: false })}
                        className="min-h-[40px] px-3 py-2 rounded-xl bg-pink-50 hover:bg-[#E91E8C] text-[#E91E8C] hover:text-white border border-pink-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Plus size={14} />
                        <span>{isBn ? 'যোগ' : 'Add'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Two-Column Active Checkout Grid */
          <form onSubmit={onSubmitOrder} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Customer Info, Delivery Zone, Payment & Promotions */}
            <div className="lg:col-span-7 space-y-5">
              {/* Optional Google Account Banner for Guest Users / Rewards */}
              {!user ? (
                <div className="bg-white rounded-2xl border border-pink-100 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-[#E91E8C] shrink-0">
                      <Gift size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-black text-gray-900">
                        {isBn ? 'গেস্ট হিসেবে অর্ডার করুন বা গুগল দিয়ে লগইন করুন' : 'Checkout as Guest or Sign In for Rewards'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isBn
                          ? `লগইন ছাড়াই অর্ডার করতে পারবেন। সাইন-ইন করলে এই অর্ডারে +${earnedPoints} গ্লো পয়েন্ট পাবেন।`
                          : `No account required to order. Sign in with Google to collect +${earnedPoints} Glow Loyalty Points on this order.`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => signInWithGoogle().catch((err) => console.warn('Google sign-in skipped:', err))}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-gray-800 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>{activeTranslations.loginToOrderBtn || 'Continue with Google'}</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-xs flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                      <UserIcon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">
                        {profile?.name || user.displayName || user.email}
                      </p>
                      <p className="text-[11px] text-emerald-700 font-semibold">
                        {isBn
                          ? `সাইন-ইন করা আছে · +${earnedPoints} গ্লো পয়েন্ট যোগ হবে`
                          : `Signed in · Earning +${earnedPoints} Glow Loyalty Points`}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-gray-600 tabular-nums shrink-0">
                    {availablePoints} pts
                  </span>
                </div>
              )}

              {/* Section 1: Customer & Shipping Form */}
              <div className="bg-white rounded-2xl border border-pink-100 p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-pink-100 pb-3.5">
                  <div>
                    <h2 className="text-base font-black text-gray-900">
                      {activeTranslations.billingInfo || 'Billing & Delivery Info'}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isBn ? 'সঠিক ডেলিভারির জন্য আপনার তথ্য দিন' : 'Provide your contact and shipping address in Bangladesh'}
                    </p>
                  </div>
                  <Truck size={18} className="text-[#E91E8C] shrink-0" />
                </div>

                {savedAddresses.length > 0 && (
                  <div className="space-y-2 pb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                      {isBn ? 'সেভ করা ঠিকানা থেকে বেছে নিন' : 'Quick Fill from Saved Addresses'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => {
                            setSelectedAddressId(addr.id);
                            setCheckoutForm({
                              name: addr.recipientName,
                              phone: addr.phone,
                              area: addr.area,
                              address: addr.addressLine,
                            });
                            setFormErrors({});
                          }}
                          className={`px-3 py-2 rounded-xl border text-left text-xs transition cursor-pointer ${
                            selectedAddressId === addr.id
                              ? 'bg-pink-50 border-[#E91E8C] text-[#E91E8C] font-bold'
                              : 'bg-slate-50 border-slate-200 text-gray-700 hover:border-pink-200 font-semibold'
                          }`}
                        >
                          <span className="block">{addr.label}</span>
                          <span className="block text-[10px] text-gray-500 truncate max-w-[180px]">
                            {addr.addressLine}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="checkout-name" className="block text-xs font-bold text-gray-700 mb-1.5">
                      {activeTranslations.fullName} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="checkout-name"
                        type="text"
                        required
                        value={checkoutForm.name}
                        onChange={(e) => {
                          setCheckoutForm({ ...checkoutForm, name: e.target.value });
                          if (formErrors.name) setFormErrors((p) => ({ ...p, name: undefined }));
                        }}
                        placeholder={isBn ? 'যেমন: সাদিয়া আঞ্জুম' : 'e.g., Sadia Anjum'}
                        className={`w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl border text-sm bg-white text-gray-900 outline-none transition ${
                          formErrors.name ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-[#E91E8C]'
                        }`}
                      />
                    </div>
                    {formErrors.name && <p className="text-[11px] font-semibold text-rose-600 mt-1">{formErrors.name}</p>}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label htmlFor="checkout-phone" className="block text-xs font-bold text-gray-700 mb-1.5">
                      {activeTranslations.phone} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="checkout-phone"
                        type="tel"
                        required
                        value={checkoutForm.phone}
                        onChange={(e) => {
                          setCheckoutForm({ ...checkoutForm, phone: e.target.value });
                          if (formErrors.phone) setFormErrors((p) => ({ ...p, phone: undefined }));
                        }}
                        placeholder="017XXXXXXXX"
                        className={`w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl border text-sm font-mono bg-white text-gray-900 outline-none transition ${
                          formErrors.phone ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-[#E91E8C]'
                        }`}
                      />
                    </div>
                    {formErrors.phone ? (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1">{formErrors.phone}</p>
                    ) : checkoutForm.phone.trim().length > 0 && !isValidBdPhone(checkoutForm.phone) ? (
                      <p className="text-[11px] font-medium text-amber-600 mt-1">
                        {isBn ? '১১ সংখ্যার নম্বর দিন (013–019 দিয়ে শুরু)' : 'Enter 11 digits starting with 013–019'}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Delivery Zone */}
                <div>
                  <span className="block text-xs font-bold text-gray-700 mb-2">
                    {activeTranslations.deliveryCity || 'Delivery Zone'} <span className="text-rose-500">*</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutForm({ ...checkoutForm, area: 'dhaka' });
                        analytics.trackAddShippingInfo('dhaka', 80, cart, grandTotal);
                      }}
                      className={`min-h-[48px] px-4 py-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                        checkoutForm.area === 'dhaka'
                          ? 'bg-pink-50 border-[#E91E8C] text-gray-900 shadow-xs'
                          : 'bg-white border-slate-200 text-gray-700 hover:border-pink-200'
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-bold">{isBn ? 'ঢাকার ভেতরে' : 'Inside Dhaka City'}</span>
                        <span className="block text-[11px] text-gray-500">{isBn ? '২৪–৪৮ ঘণ্টায় ডেলিভারি' : '1–2 days delivery'}</span>
                      </div>
                      <span className="font-mono font-black text-xs text-[#E91E8C] tabular-nums">
                        {isFreeDelivery ? '৳0' : '৳80'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutForm({ ...checkoutForm, area: 'outside' });
                        analytics.trackAddShippingInfo('outside', 150, cart, grandTotal);
                      }}
                      className={`min-h-[48px] px-4 py-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                        checkoutForm.area === 'outside'
                          ? 'bg-pink-50 border-[#E91E8C] text-gray-900 shadow-xs'
                          : 'bg-white border-slate-200 text-gray-700 hover:border-pink-200'
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-bold">{isBn ? 'ঢাকার বাইরে (সারাদেশ)' : 'Outside Dhaka (Nationwide)'}</span>
                        <span className="block text-[11px] text-gray-500">{isBn ? '২–৪ দিনে হোম ডেলিভারি' : '2–4 days courier'}</span>
                      </div>
                      <span className="font-mono font-black text-xs text-[#E91E8C] tabular-nums">
                        {isFreeDelivery ? '৳0' : '৳150'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Full Address */}
                <div>
                  <label htmlFor="checkout-address" className="block text-xs font-bold text-gray-700 mb-1.5">
                    {activeTranslations.address || 'Full Delivery Address'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                    <textarea
                      id="checkout-address"
                      rows={3}
                      required
                      value={checkoutForm.address}
                      onChange={(e) => {
                        setCheckoutForm({ ...checkoutForm, address: e.target.value });
                        if (formErrors.address) setFormErrors((p) => ({ ...p, address: undefined }));
                      }}
                      placeholder={
                        isBn
                          ? 'বাসা নং, রোড নং, এলাকা, থানা ও জেলা লিখুন...'
                          : 'House / Flat no, Road, Area, Thana, District...'
                      }
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm bg-white text-gray-900 outline-none transition resize-none ${
                        formErrors.address ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-[#E91E8C]'
                      }`}
                    />
                  </div>
                  {formErrors.address && <p className="text-[11px] font-semibold text-rose-600 mt-1">{formErrors.address}</p>}
                </div>
              </div>

              {/* Section 2: Payment Method (Cash on Delivery) */}
              <div className="bg-white rounded-2xl border border-pink-100 p-5 sm:p-6 shadow-xs space-y-3">
                <h2 className="text-base font-black text-gray-900">
                  {isBn ? 'পেমেন্ট পদ্ধতি' : 'Payment Method'}
                </h2>
                <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-[#E91E8C]/40 bg-pink-50/40">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 mt-0.5 rounded-full border-2 border-[#E91E8C] flex items-center justify-center shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E91E8C]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-900">{activeTranslations.cod}</p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {isBn
                          ? 'পণ্য হাতে পেয়ে যাচাই করে ডেলিভারি ম্যানের কাছে মূল্য পরিশোধ করুন।'
                          : 'Pay in cash upon receiving your parcel at your doorstep anywhere in Bangladesh.'}
                      </p>
                    </div>
                  </div>
                  <ShieldCheck size={20} className="text-[#E91E8C] shrink-0" />
                </div>
              </div>

              {/* Section 3: Coupon & Loyalty Points */}
              <div className="bg-white rounded-2xl border border-pink-100 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <Tag size={15} className="text-[#E91E8C]" />
                    <span>{isBn ? 'প্রমো কোড / কুপন' : 'Promo / Discount Code'}</span>
                  </span>
                  {appliedCoupon && (
                    <button
                      type="button"
                      onClick={() => {
                        removeCoupon();
                        setCouponNotice(null);
                      }}
                      className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      {isBn ? 'মুছে ফেলুন' : 'Remove'}
                    </button>
                  )}
                </div>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="bg-emerald-600 text-white font-mono font-bold px-2.5 py-1 rounded text-xs uppercase tracking-wide">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-emerald-800 font-semibold">
                        {appliedCoupon.discountType === 'free_delivery'
                          ? isBn
                            ? 'ফ্রি ডেলিভারি সক্রিয়!'
                            : 'Free Delivery Activated!'
                          : isBn
                            ? `৳${couponDiscount} ডিসকাউন্ট প্রয়োগ হয়েছে`
                            : `৳${couponDiscount} discount applied`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                      aria-label="Remove coupon"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        if (couponNotice) setCouponNotice(null);
                      }}
                      placeholder={isBn ? 'কুপন কোড লিখুন...' : 'Enter promo code (e.g. FREEDELIVERY)'}
                      className="flex-1 min-h-[44px] bg-slate-50 focus:bg-white text-gray-900 uppercase tracking-wider font-mono px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#E91E8C] text-xs"
                    />
                    <button
                      type="button"
                      disabled={couponLoading || !couponInput.trim()}
                      onClick={handleCouponApply}
                      className="min-h-[44px] px-5 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs cursor-pointer transition whitespace-nowrap shrink-0"
                    >
                      {couponLoading ? '...' : isBn ? 'প্রয়োগ করুন' : 'Apply'}
                    </button>
                  </div>
                )}

                {(couponNotice || couponError) && (
                  <p className={`text-xs font-medium ${couponNotice?.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {couponNotice?.message || couponError}
                  </p>
                )}

                {/* Loyalty Points Redemption (Signed-in Users) */}
                {user && availablePoints > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Sparkles size={16} className="text-[#E91E8C] shrink-0" />
                        <div>
                          <span className="font-bold text-gray-900 block text-xs">
                            {isBn ? 'গ্লো লয়্যালটি পয়েন্ট ব্যবহার করুন' : 'Redeem Glow Loyalty Points'}
                          </span>
                          <span className="text-[11px] text-gray-500 font-mono tabular-nums">
                            {availablePoints} pts = ৳{availablePoints} max discount
                          </span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useLoyaltyPoints}
                          onChange={(e) => setUseLoyaltyPoints(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E91E8C]" />
                      </label>
                    </div>
                    {useLoyaltyPoints && pointsDiscount > 0 && (
                      <div className="text-xs text-emerald-700 font-bold flex items-center justify-between pt-1">
                        <span>{isBn ? 'লয়্যালটি ডিসকাউন্ট:' : 'Loyalty Discount Applied:'}</span>
                        <span className="font-mono tabular-nums">-৳{pointsDiscount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Sticky Order Summary & Basket Controls */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
              <div className="bg-white rounded-2xl border border-pink-100 p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-pink-100 pb-3.5">
                  <div>
                    <h2 className="text-base font-black text-gray-900">
                      {isBn ? 'অর্ডার সারাংশ' : 'Order Summary'}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono tabular-nums">
                      {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddOpen((prev) => !prev)}
                    className="text-xs font-bold text-[#E91E8C] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus size={14} />
                    <span>{isBn ? 'আরও পণ্য যোগ' : 'Add Items'}</span>
                  </button>
                </div>

                {/* Inline Mini Quick-Add Drawer inside Summary */}
                {isQuickAddOpen && (
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={quickSearch}
                        onChange={(e) => setQuickSearch(e.target.value)}
                        placeholder={isBn ? 'পণ্য খুঁজুন...' : 'Search product to add...'}
                        className="w-full min-h-[40px] pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#E91E8C]"
                      />
                      <button
                        type="button"
                        onClick={() => setIsQuickAddOpen(false)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                      {quickAddProducts.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 text-xs bg-white p-2 rounded-lg border border-slate-200">
                          <span className="truncate font-semibold text-gray-800">{p.name}</span>
                          <button
                            type="button"
                            onClick={() => addToCart(p, 1, undefined, { openDrawer: false })}
                            className="px-2.5 py-1 rounded-md bg-pink-50 hover:bg-[#E91E8C] text-[#E91E8C] hover:text-white font-bold text-[11px] transition cursor-pointer shrink-0 whitespace-nowrap"
                          >
                            + ৳{getProductUnitPrice(p, 'retail', 1).toLocaleString()}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Basket Items */}
                <div className="divide-y divide-pink-100/70 max-h-[360px] overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const unitPrice = getProductUnitPrice(item.product, 'retail', item.quantity);
                    const lineTotal = unitPrice * item.quantity;
                    const imgFailed = failedImages[item.product.id];
                    return (
                      <div key={item.product.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-14 h-14 rounded-xl border border-pink-100 bg-pink-50/30 overflow-hidden shrink-0 flex items-center justify-center">
                            {item.product.image && !imgFailed ? (
                              <img
                                src={item.product.image}
                                alt={item.product.name}
                                referrerPolicy="no-referrer"
                                onError={() => setFailedImages((prev) => ({ ...prev, [item.product.id]: true }))}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ShoppingBag size={18} className="text-pink-300" />
                            )}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <h3 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">
                              {isBn ? item.product.nameBN || item.product.name : item.product.name}
                            </h3>
                            <p className="text-[11px] text-gray-500 font-mono tabular-nums">
                              ৳{unitPrice.toLocaleString()} × {item.quantity}
                              {item.product.isCombo ? ' · Combo' : ''}
                            </p>
                            {item.comboComponents && item.comboComponents.length > 0 && (
                              <div className="text-[10px] text-gray-500 space-y-0.5 pt-0.5">
                                {item.comboComponents.map((comp, idx) => (
                                  <div key={idx} className="truncate">
                                    · {comp.quantity}× {comp.name}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Quantity Steppers */}
                            <div className="flex items-center gap-2 pt-1">
                              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                                <button
                                  type="button"
                                  onClick={() => updateCartQty(item.product.id, -1)}
                                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-[#E91E8C] cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="px-2 text-xs font-mono font-bold text-gray-900 tabular-nums">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateCartQty(item.product.id, 1)}
                                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-[#E91E8C] cursor-pointer"
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.product.id)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 cursor-pointer"
                                aria-label="Remove item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-gray-900 font-mono tabular-nums">
                            ৳{lineTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals Breakdown */}
                <div className="border-t border-pink-100 pt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>{activeTranslations.total || 'Subtotal'}</span>
                    <span className="font-mono font-bold text-gray-900 tabular-nums">৳{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{activeTranslations.shipping || 'Shipping Charge'}</span>
                    {isFreeDelivery ? (
                      <span className="font-mono font-bold text-emerald-600 tabular-nums">
                        <span className="line-through text-gray-400 font-normal mr-1.5">
                          ৳{checkoutForm.area === 'dhaka' ? 80 : 150}
                        </span>
                        ৳0
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-gray-900 tabular-nums">৳{shipping.toLocaleString()}</span>
                    )}
                  </div>
                  {couponDiscount > 0 && appliedCoupon && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Coupon ({appliedCoupon.code})</span>
                      <span className="font-mono font-bold tabular-nums">-৳{couponDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {pointsDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>{isBn ? 'লয়্যালটি ডিসকাউন্ট' : 'Loyalty Discount'}</span>
                      <span className="font-mono font-bold tabular-nums">-৳{pointsDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="border-t border-pink-100 pt-3 flex items-baseline justify-between">
                    <span className="text-sm font-black text-gray-900">
                      {activeTranslations.grandTotal || 'Grand Total'}
                    </span>
                    <span className="text-xl font-black text-[#E91E8C] font-mono tabular-nums">
                      ৳{grandTotal.toLocaleString()}
                    </span>
                  </div>

                  {user && earnedPoints > 0 && (
                    <p className="text-[11px] font-semibold text-gray-500 text-right">
                      {isBn
                        ? `এই অর্ডারে +${earnedPoints} গ্লো লয়্যালটি পয়েন্ট পাবেন`
                        : `You will earn +${earnedPoints} Glow Loyalty Points`}
                    </p>
                  )}
                </div>

                {/* Stock Availability Warning */}
                {stockIssues.length > 0 && (
                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>Stock Notice</span>
                    </div>
                    {stockIssues.map((issue) => (
                      <p key={issue.productId} className="text-[11px]">
                        {issue.name}: requested {issue.requested}, currently available {issue.available}.
                      </p>
                    ))}
                  </div>
                )}

                {/* Inline Checkout Error Banner */}
                {checkoutError && (
                  <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span className="flex-1">{checkoutError}</span>
                    <button
                      type="button"
                      onClick={() => setCheckoutError(null)}
                      className="text-rose-400 hover:text-rose-700 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Confirm Order CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] py-3.5 px-5 rounded-xl bg-[#E91E8C] hover:bg-[#d8177f] disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{isBn ? 'অর্ডার প্রক্রিয়াধীন...' : 'Confirming Order...'}</span>
                    </>
                  ) : (
                    <>
                      <PackageCheck size={17} />
                      <span>{activeTranslations.orderNow}</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-gray-500">
                  {isBn
                    ? 'অর্ডার নিশ্চিত করলে ডেলিভারির আগে আমাদের টিম কল করে কনফার্ম করবে।'
                    : 'Our team confirms every Cash on Delivery order by phone before dispatch.'}
                </p>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
