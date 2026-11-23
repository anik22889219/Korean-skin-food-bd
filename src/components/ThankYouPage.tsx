import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  Copy,
  Gift,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Printer,
  ShoppingBag,
  Sparkles,
  Truck,
  User as UserIcon
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useProducts } from '../hooks/queries/products';
import { db } from '../services/firebase';
import { posService } from '../services/posService';
import { DEFAULT_PAGES_THEME, themeService } from '../services/themeService';
import { ThankYouPageThemeSettings } from '../types/theme';
import { Order } from '../types';
import { SeoHead } from './SeoHead';

export const ThankYouPage: React.FC = () => {
  const { orderId } = useParams<{ orderId?: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const { lastCreatedOrder, language, activeTranslations } = useCart();
  const { data: allProducts = [] } = useProducts();

  const isBn = language === 'bn';

  const [resolvedOrder, setResolvedOrder] = useState<Order | null>(() => {
    const stateOrder = (location.state as { order?: Order } | null)?.order;
    if (stateOrder && (!orderId || stateOrder.id === orderId)) {
      return stateOrder;
    }
    if (lastCreatedOrder && (!orderId || lastCreatedOrder.id === orderId)) {
      return lastCreatedOrder;
    }
    try {
      if (orderId) {
        const byId = sessionStorage.getItem(`ksf_order_${orderId}`);
        if (byId) return JSON.parse(byId);
      }
      const last = sessionStorage.getItem('ksf_last_order');
      if (last) {
        const parsed: Order = JSON.parse(last);
        if (!orderId || parsed.id === orderId) {
          return parsed;
        }
      }
    } catch {
      // Ignore malformed session cache
    }
    return null;
  });

  const [isLoadingOrder, setIsLoadingOrder] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [pageTheme, setPageTheme] = useState<ThankYouPageThemeSettings>(
    () => themeService.getPagesTheme().thankYou || DEFAULT_PAGES_THEME.thankYou
  );

  useEffect(() => {
    return themeService.subscribePages((pages) => {
      if (pages?.thankYou) setPageTheme(pages.thankYou);
    });
  }, []);

  // Fallback lookup in Firestore / posService when signed in (e.g., opened in another tab)
  useEffect(() => {
    if (resolvedOrder || !orderId) return;

    const cached = posService.getOrders().find((o) => o.id === orderId);
    if (cached) {
      setResolvedOrder(cached);
      return;
    }

    if (!user) return;
    let active = true;
    setIsLoadingOrder(true);
    getDoc(doc(db, 'orders', orderId))
      .then((snap) => {
        if (active && snap.exists()) {
          setResolvedOrder({ id: snap.id, ...(snap.data() as any) } as Order);
        }
      })
      .catch((err) => console.warn('[ThankYouPage] Firestore order lookup skipped:', err))
      .finally(() => {
        if (active) setIsLoadingOrder(false);
      });

    return () => {
      active = false;
    };
  }, [orderId, resolvedOrder, user]);

  // Keep synced if navigation state updates
  useEffect(() => {
    const stateOrder = (location.state as { order?: Order } | null)?.order;
    if (stateOrder && (!orderId || stateOrder.id === orderId)) {
      setResolvedOrder(stateOrder);
    }
  }, [location.state, orderId]);

  const productImageMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of allProducts) {
      if (p.id && p.image) map[p.id] = p.image;
    }
    return map;
  }, [allProducts]);

  const whatsappNumber = useMemo(() => {
    const contact = themeService.getPagesTheme().contact || DEFAULT_PAGES_THEME.contact;
    return (contact.whatsappNumber || '+8801755837545').replace(/[^0-9]/g, '');
  }, []);

  const handleCopyOrderId = async () => {
    if (!resolvedOrder?.id) return;
    try {
      await navigator.clipboard.writeText(resolvedOrder.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2200);
    } catch {
      setCopiedId(false);
    }
  };

  if (isLoadingOrder) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <SeoHead title="Order Confirmation | Korean Skin Food BD" noindex />
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#E91E8C] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-gray-500">
            {isBn ? 'অর্ডার তথ্য লোড হচ্ছে...' : 'Loading your order confirmation...'}
          </p>
        </div>
      </div>
    );
  }

  if (!resolvedOrder) {
    return (
      <div className="min-h-[70vh] bg-[#FFF5F8]/40 flex items-center justify-center px-4 py-12">
        <SeoHead title="Order Receipt | Korean Skin Food BD" noindex />
        <div className="bg-white rounded-3xl border border-pink-100 p-8 max-w-md w-full text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center mx-auto text-[#E91E8C]">
            <Package size={26} />
          </div>
          <h1 className="text-xl font-black text-gray-900">
            {isBn ? pageTheme.notFoundTitleBN : pageTheme.notFoundTitleEN}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
            {orderId
              ? isBn
                ? `অর্ডার #${orderId} এর রসিদ এই সেশনে সংরক্ষিত নেই। আপনার অ্যাকাউন্ট থেকে অর্ডার ট্র্যাক করতে পারেন।`
                : `We couldn't find receipt details for #${orderId} in this browser session. Sign in to view your full order history.`
              : isBn
                ? 'এই মুহূর্তে দেখানোর জন্য কোনো নিশ্চিত অর্ডার নেই।'
                : 'There is no recent confirmed order in this session yet.'}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Link
              to="/shop"
              className="min-h-[44px] px-5 py-2.5 bg-[#E91E8C] hover:bg-[#d8177f] text-white rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <ShoppingBag size={15} />
              <span>{isBn ? 'শপিং করুন' : 'Browse Shop'}</span>
            </Link>
            <Link
              to={user ? '/profile' : '/login'}
              className="min-h-[44px] px-5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-gray-700 rounded-xl text-xs font-bold transition inline-flex items-center justify-center whitespace-nowrap"
            >
              {user ? (isBn ? 'আমার অর্ডারসমূহ' : 'My Orders') : isBn ? 'লগইন করুন' : 'Sign In to Track'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const itemsSubtotal = resolvedOrder.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const shippingCharge = Number(resolvedOrder.shippingCharge ?? 0);
  const couponDiscount = Number(resolvedOrder.couponDiscount ?? 0);
  const pointsRedeemed = Number(resolvedOrder.pointsRedeemed ?? 0);
  const totalPayable = Number(resolvedOrder.totalAmount ?? Math.max(0, itemsSubtotal + shippingCharge - couponDiscount - pointsRedeemed));

  const formattedDate = (() => {
    try {
      return new Date(resolvedOrder.createdAt).toLocaleString('en-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return resolvedOrder.createdAt;
    }
  })();

  const whatsappMessage = encodeURIComponent(
    `Hello Korean Skin Food BD, I have just placed order #${resolvedOrder.id} (Total: ৳${totalPayable.toLocaleString()}). Could you please confirm delivery updates?`
  );

  return (
    <div className="min-h-screen bg-[#FFF5F8]/40 py-6 sm:py-10 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12">
      <SeoHead
        title={`Order #${resolvedOrder.id} Confirmed | Korean Skin Food BD`}
        description="Thank you for your order with Korean Skin Food BD."
        noindex
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Confirmation Hero Banner */}
        <div className="bg-white rounded-3xl border border-pink-100 p-6 sm:p-8 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 size={34} />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {isBn ? pageTheme.titleBN : pageTheme.titleEN}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
              {isBn ? pageTheme.subtitleBN : pageTheme.subtitleEN}
            </p>
          </div>

          {/* Order ID & Copy Control */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {activeTranslations?.orderId || 'Order ID'}:
            </span>
            <span className="font-mono font-black text-base sm:text-lg text-gray-900 tabular-nums">
              #{resolvedOrder.id}
            </span>
            <button
              type="button"
              onClick={handleCopyOrderId}
              className="print:hidden min-h-[36px] px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-pink-50 hover:border-pink-200 text-xs font-bold text-gray-700 hover:text-[#E91E8C] transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {copiedId ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiedId ? (isBn ? 'কপি হয়েছে' : 'Copied') : isBn ? 'কপি' : 'Copy ID'}</span>
            </button>
          </div>

          {/* Unboxed Metadata Strip */}
          <p className="text-xs text-gray-500 font-medium pt-1">
            <span>{formattedDate}</span>
            <span className="mx-2 text-gray-300">·</span>
            <span>{isBn ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery (COD)'}</span>
            <span className="mx-2 text-gray-300">·</span>
            <span className="text-emerald-700 font-bold uppercase">{resolvedOrder.status || 'pending'}</span>
          </p>
        </div>

        {/* Details & Receipt Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Delivery Details & Next Steps */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-2xl border border-pink-100 p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider border-b border-pink-100 pb-3 flex items-center gap-2">
                <Truck size={16} className="text-[#E91E8C]" />
                <span>{isBn ? pageTheme.deliveryHeadingBN : pageTheme.deliveryHeadingEN}</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <UserIcon size={15} className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-400 block text-[11px]">{isBn ? 'গ্রাহকের নাম' : 'Recipient'}</span>
                    <span className="font-bold text-gray-900 text-sm">{resolvedOrder.customerName}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone size={15} className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-400 block text-[11px]">{isBn ? 'মোবাইল নম্বর' : 'Phone'}</span>
                    <span className="font-mono font-bold text-gray-900 text-sm tabular-nums">
                      {resolvedOrder.customerPhone}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin size={15} className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-gray-400 block text-[11px]">{isBn ? 'ডেলিভারি ঠিকানা' : 'Delivery Address'}</span>
                    <span className="font-medium text-gray-800 leading-relaxed">{resolvedOrder.address}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Loyalty Points Earned Highlight */}
            {(resolvedOrder.pointsEarned ?? 0) > 0 && (
              <div className="bg-white rounded-2xl border border-pink-200 p-4 sm:p-5 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-[#E91E8C] shrink-0">
                  <Sparkles size={18} />
                </div>
                <div className="text-xs">
                  <p className="font-black text-gray-900">
                    {isBn
                      ? `+${resolvedOrder.pointsEarned} গ্লো লয়্যালটি পয়েন্ট যোগ হয়েছে!`
                      : `+${resolvedOrder.pointsEarned} Glow Loyalty Points Earned`}
                  </p>
                  <p className="text-gray-500 mt-0.5">
                    {isBn
                      ? 'পরবর্তী অর্ডারে এই পয়েন্ট ডিসকাউন্ট হিসেবে ব্যবহার করতে পারবেন।'
                      : 'Redeem your points as instant BDT savings on your next order.'}
                  </p>
                </div>
              </div>
            )}

            {pageTheme.showGuestRewardsTip && !user && (resolvedOrder.pointsEarned ?? 0) === 0 && (
              <div className="print:hidden bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3 text-xs">
                <Gift size={18} className="text-[#E91E8C] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-gray-900">
                    {isBn ? 'পরবর্তী অর্ডারে রিওয়ার্ড পয়েন্ট পেতে চান?' : 'Want Loyalty Rewards Next Time?'}
                  </p>
                  <p className="text-gray-500 leading-relaxed">
                    {isBn
                      ? 'অ্যাকাউন্ট তৈরি করে অর্ডার করলে প্রতিটি কেনাকাটায় গ্লো পয়েন্ট পাবেন।'
                      : 'Sign in with Google on your next visit to track deliveries automatically and earn Glow Points.'}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Support & Navigation Actions */}
            <div className="print:hidden space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-gray-800 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Printer size={15} />
                  <span>{isBn ? pageTheme.printBtnBN : pageTheme.printBtnEN}</span>
                </button>

                <a
                  href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-800 text-xs font-bold transition flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <MessageCircle size={15} />
                  <span>{isBn ? pageTheme.whatsappBtnBN : pageTheme.whatsappBtnEN}</span>
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Link
                  to="/shop"
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#E91E8C] hover:bg-[#d8177f] text-white text-xs font-bold transition flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <ShoppingBag size={15} />
                  <span>{isBn ? pageTheme.continueShoppingBN : pageTheme.continueShoppingEN}</span>
                </Link>
                <Link
                  to={user ? '/profile' : '/login'}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-pink-200 bg-pink-50/60 hover:bg-pink-100/60 text-[#E91E8C] text-xs font-bold transition flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Package size={15} />
                  <span>{user ? (isBn ? 'অর্ডার ট্র্যাক করুন' : 'Track My Orders') : isBn ? 'লগইন পোর্টাল' : 'Customer Portal'}</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right: Itemized Order Receipt */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-pink-100 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3.5">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {isBn ? pageTheme.receiptHeadingBN : pageTheme.receiptHeadingEN}
              </h2>
              <span className="text-xs font-mono font-bold text-gray-500 tabular-nums">
                {resolvedOrder.items.reduce((s, i) => s + Number(i.quantity || 1), 0)} items
              </span>
            </div>

            <div className="divide-y divide-pink-100/70">
              {resolvedOrder.items.map((item, idx) => {
                const thumb = productImageMap[item.productId];
                const imgFailed = failedImages[item.productId];
                const lineTotal = Number(item.price || 0) * Number(item.quantity || 1);
                return (
                  <div key={`${item.productId}-${idx}`} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl border border-pink-100 bg-pink-50/30 overflow-hidden shrink-0 flex items-center justify-center">
                        {thumb && !imgFailed ? (
                          <img
                            src={thumb}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            onError={() => setFailedImages((prev) => ({ ...prev, [item.productId]: true }))}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ShoppingBag size={16} className="text-pink-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">{item.name}</p>
                        <p className="text-xs text-gray-500 font-mono tabular-nums mt-0.5">
                          ৳{Number(item.price || 0).toLocaleString()} × {item.quantity}
                          {item.isCombo ? ' · Combo' : ''}
                        </p>
                        {item.comboComponents && item.comboComponents.length > 0 && (
                          <div className="mt-1 space-y-0.5 text-[11px] text-gray-500">
                            {item.comboComponents.map((comp, cIdx) => (
                              <div key={cIdx}>
                                · {comp.quantity}× {comp.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="text-xs sm:text-sm font-black text-gray-900 font-mono tabular-nums shrink-0">
                      ৳{lineTotal.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Financial Totals */}
            <div className="border-t border-pink-100 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>{isBn ? 'সাবটোটাল' : 'Items Subtotal'}</span>
                <span className="font-mono font-bold text-gray-900 tabular-nums">৳{itemsSubtotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>{isBn ? 'ডেলিভারি চার্জ' : 'Shipping Charge'}</span>
                {resolvedOrder.isFreeDelivery || shippingCharge === 0 ? (
                  <span className="font-mono font-bold text-emerald-600 tabular-nums">
                    ৳0 {resolvedOrder.isFreeDelivery ? '(Free Delivery)' : ''}
                  </span>
                ) : (
                  <span className="font-mono font-bold text-gray-900 tabular-nums">৳{shippingCharge.toLocaleString()}</span>
                )}
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>
                    {isBn ? 'কুপন ডিসকাউন্ট' : 'Coupon Discount'}
                    {resolvedOrder.couponCode ? ` (${resolvedOrder.couponCode})` : ''}
                  </span>
                  <span className="font-mono font-bold tabular-nums">-৳{couponDiscount.toLocaleString()}</span>
                </div>
              )}

              {pointsRedeemed > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>{isBn ? 'লয়্যালটি ডিসকাউন্ট' : 'Loyalty Points Redeemed'}</span>
                  <span className="font-mono font-bold tabular-nums">-৳{pointsRedeemed.toLocaleString()}</span>
                </div>
              )}

              <div className="border-t border-pink-100 pt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-black text-gray-900 block">
                    {isBn ? 'ডেলিভারিতে পরিশোধযোগ্য' : 'Total Payable (Cash on Delivery)'}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {isBn ? 'পার্সেল রিসিভ করার সময় পরিশোধ করবেন' : 'Payable upon parcel delivery'}
                  </span>
                </div>
                <span className="text-xl font-black text-[#E91E8C] font-mono tabular-nums">
                  ৳{totalPayable.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
