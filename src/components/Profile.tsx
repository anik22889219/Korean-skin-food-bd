import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { Order, Product, ProductReview, UserRole } from '../types';
import { posService } from '../services/posService';
import { productService } from '../services/productService';
import { useProducts } from '../hooks/queries/products';
import { useCart } from '../context/CartContext';
import { getRetailPrice } from '../utils/pricing';
import { getProductPath } from '../utils/productSlug';
import {
  CustomerSupportTicket,
  LoyaltyLedgerEntry,
  SavedAddress,
  SavedRoutineRecord,
  SkinProfileRecord,
  userPortalService,
} from '../services/userPortalService';
import {
  ShoppingBag, Phone, MapPin, User, Save, CheckCircle, Clock, Package,
  HelpCircle, Search, Copy, Check, ChevronDown, ChevronUp,
  RefreshCw, Mail, ArrowRight, Tag, ShieldCheck, Truck, XCircle,
  Gift, Award, Crown, Coins, Percent, Sparkles, Video, Flame,
  ChevronRight, Zap, Heart, Star, Building2, Trash2, MessageSquare, Droplets, Eye, AlertCircle, Plus, Printer, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { themeService, DEFAULT_PAGES_THEME } from '../services/themeService';
import { ProfilePageThemeSettings } from '../types/theme';
import { downloadInvoicePDF, printInvoice } from '../utils/invoicePdf';

/* -------------------------------------------------------------
   Real-Time Visual Order Stage Tracker
------------------------------------------------------------- */
const OrderStatusTracker: React.FC<{ status: string }> = ({ status }) => {
  const statusLower = status?.toLowerCase() || 'pending';

  if (statusLower === 'cancelled') {
    return (
      <div className="mt-3 bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-red-700 font-semibold">
        <div className="flex items-center gap-2">
          <XCircle size={16} className="text-red-500 shrink-0" />
          <span>This order was cancelled. Please contact our support team for questions or refunds.</span>
        </div>
      </div>
    );
  }

  let currentStep = 1;
  if (['shipped', 'out_for_delivery', 'in_transit'].includes(statusLower)) {
    currentStep = 2;
  } else if (statusLower === 'delivered') {
    currentStep = 3;
  }

  const steps = [
    {
      step: 1,
      label: 'Processing',
      desc: statusLower === 'pending' ? 'Order Placed' : 'Packaging & Verification',
      icon: Package,
    },
    {
      step: 2,
      label: 'Shipped',
      desc: currentStep > 2 ? 'Dispatched' : currentStep === 2 ? 'Out for Delivery' : 'Courier Handover Pending',
      icon: Truck,
    },
    {
      step: 3,
      label: 'Delivered',
      desc: currentStep === 3 ? 'Delivered to Doorstep' : 'Delivery Pending',
      icon: CheckCircle,
    }
  ];

  return (
    <div className="mt-4 pt-3.5 border-t border-pink-100/70 space-y-3">
      <div className="flex items-center justify-between text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
        <span className="flex items-center gap-1.5 text-[#E91E8C]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E91E8C]" />
          </span>
          <span>Live Courier Status</span>
        </span>
        <span className="font-mono text-gray-700">
          Status: <strong className="capitalize text-[#E91E8C]">{status}</strong>
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative px-3 sm:px-6 pt-2 pb-2">
        <div className="absolute top-6 left-8 right-8 h-1 bg-gray-200 rounded-full" />
        <motion.div 
          className="absolute top-6 left-8 h-1 bg-gradient-to-r from-[#E91E8C] via-pink-500 to-emerald-500 rounded-full transition-all duration-700"
          initial={{ width: '0%' }}
          animate={{ 
            width: currentStep === 1 
              ? '0%' 
              : currentStep === 2 
                ? 'calc(50% - 16px)' 
                : 'calc(100% - 32px)' 
          }}
        />

        <div className="relative z-10 flex items-center justify-between">
          {steps.map((item) => {
            const isDone = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            const Icon = item.icon;

            return (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    isDone 
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-100'
                      : isCurrent
                        ? 'bg-[#E91E8C] text-white shadow-md shadow-pink-200 ring-4 ring-pink-100 scale-110'
                        : 'bg-white text-gray-300 border-2 border-gray-200'
                  }`}
                >
                  <Icon size={16} />
                </div>
                <span className={`text-[11px] font-extrabold mt-2 ${isCurrent ? 'text-[#E91E8C]' : isDone ? 'text-gray-800' : 'text-gray-400'}`}>
                  {item.label}
                </span>
                <span className="text-[10px] text-gray-400 font-medium leading-none mt-0.5 hidden sm:block">
                  {item.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------
   Role Badge Helper
------------------------------------------------------------- */
const RoleBadge: React.FC<{ role?: UserRole; isCreatorApproved?: boolean }> = ({ role = 'customer', isCreatorApproved }) => {
  if (role === 'super_admin') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-amber-300 border border-slate-700 text-xs font-black uppercase tracking-wider shadow-xs">
        <Crown size={13} className="text-amber-400" />
        <span>Super Admin</span>
      </span>
    );
  }
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-pink-300 border border-slate-700 text-xs font-black uppercase tracking-wider shadow-xs">
        <ShieldCheck size={13} className="text-pink-400" />
        <span>Operations Admin</span>
      </span>
    );
  }
  if (role === 'hr') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900 text-blue-200 border border-blue-700 text-xs font-black uppercase tracking-wider shadow-xs">
        <Award size={13} className="text-blue-300" />
        <span>HR & People Lead</span>
      </span>
    );
  }
  if (role === 'inventory_manager') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900 text-emerald-200 border border-emerald-700 text-xs font-black uppercase tracking-wider shadow-xs">
        <Package size={13} className="text-emerald-300" />
        <span>Inventory Manager</span>
      </span>
    );
  }
  if (role === 'customer_support') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900 text-purple-200 border border-purple-700 text-xs font-black uppercase tracking-wider shadow-xs">
        <HelpCircle size={13} className="text-purple-300" />
        <span>Customer Support</span>
      </span>
    );
  }
  if (role === 'creator' || isCreatorApproved) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-pink-500/20">
        <Sparkles size={13} />
        <span>Verified Creator</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-pink-100 text-[#E91E8C] text-xs font-black uppercase tracking-wider border border-pink-200">
      <Sparkles size={13} />
      <span>Glow VIP Shopper</span>
    </span>
  );
};

/* -------------------------------------------------------------
   Main Profile Component
------------------------------------------------------------- */
export const Profile: React.FC = () => {
  const { user, profile, signOut, isAdmin, creatorProfile } = useAuth();
  const navigate = useNavigate();
  const { addToCart, setIsCartOpen } = useCart();
  const { data: liveProducts = [] } = useProducts();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'orders' | 'wishlist' | 'addresses' | 'skin_routine' | 'rewards' | 'reviews' | 'support' | 'settings' | 'role_hub'
  >('orders');
  const [pageTheme, setPageTheme] = useState<ProfilePageThemeSettings>(
    () => themeService.getPagesTheme().profile || DEFAULT_PAGES_THEME.profile
  );

  useEffect(() => {
    return themeService.subscribePages((pages) => {
      if (pages?.profile) setPageTheme(pages.profile);
    });
  }, []);

  // Editable Form states
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState((profile as any)?.address || '');
  const [name, setName] = useState(profile?.name || user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Orders state
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Portal Tabs Data
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrRecipient, setAddrRecipient] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrArea, setAddrArea] = useState<'dhaka' | 'outside'>('dhaka');
  const [addrLine, setAddrLine] = useState('');
  const [addrDefault, setAddrDefault] = useState(true);
  const [savingAddr, setSavingAddr] = useState(false);
  const [addrFeedback, setAddrFeedback] = useState<string | null>(null);

  const [skinProfile, setSkinProfile] = useState<SkinProfileRecord | null>(null);
  const [savedRoutines, setSavedRoutines] = useState<SavedRoutineRecord[]>([]);
  const [loyaltyLedger, setLoyaltyLedger] = useState<LoyaltyLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [myReviews, setMyReviews] = useState<ProductReview[]>([]);
  const [supportTickets, setSupportTickets] = useState<CustomerSupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketOrderId, setTicketOrderId] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketNotice, setTicketNotice] = useState<string | null>(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [reorderMessage, setReorderMessage] = useState<string | null>(null);

  // Sync state if profile changes
  useEffect(() => {
    if (profile) {
      setPhone(profile.phone || '');
      setAddress((profile as any).address || '');
      setName(profile.name || user?.displayName || '');
      setAddrRecipient((prev) => prev || profile.name || user?.displayName || '');
      setAddrPhone((prev) => prev || profile.phone || '');
    }
  }, [profile, user]);

  // Subscribe wishlist, recent views, skin profile, routines, addresses, ledger, support & reviews
  useEffect(() => {
    const unsubWish = userPortalService.subscribeWishlist(user?.uid, setWishlistIds);
    setRecentIds(userPortalService.getRecentlyViewedIds());

    if (!user?.uid) {
      return () => {
        unsubWish();
      };
    }

    userPortalService.getSavedAddresses(user.uid).then(setSavedAddresses);
    userPortalService.getSkinProfile(user.uid).then(setSkinProfile);
    userPortalService.getSavedRoutines(user.uid).then(setSavedRoutines);

    setLedgerLoading(true);
    userPortalService
      .getMyLoyaltyLedger(user.uid)
      .then(setLoyaltyLedger)
      .catch(() => setLoyaltyLedger([]))
      .finally(() => setLedgerLoading(false));

    setTicketsLoading(true);
    userPortalService
      .getMySupportTickets()
      .then(setSupportTickets)
      .catch(() => setSupportTickets([]))
      .finally(() => setTicketsLoading(false));

    const revQ = query(collection(db, 'product_reviews'), where('userId', '==', user.uid));
    const unsubRevs = onSnapshot(
      revQ,
      (snap) => {
        const list: ProductReview[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ProductReview));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMyReviews(list);
      },
      () => setMyReviews([])
    );

    return () => {
      unsubWish();
      unsubRevs();
    };
  }, [user?.uid]);

  // Query user's past transactions linked to user's email, UID, or phone
  useEffect(() => {
    if (!user) {
      setLoadingOrders(false);
      return;
    }

    const ordersRef = collection(db, 'orders');
    const q = isAdmin 
      ? query(ordersRef, orderBy('createdAt', 'desc'))
      : query(ordersRef, where('customer_uid', '==', user.uid));

    const userEmailLower = user.email?.toLowerCase().trim();
    const userUid = user.uid;

    const processSnapshot = (ords: Order[]) => {
      const userPhoneClean = profile?.phone?.trim();

      const matched = ords.filter(ord => {
        const matchEmail = userEmailLower && ord.customerEmail && ord.customerEmail.toLowerCase().trim() === userEmailLower;
        const matchUid = ord.customer_uid && ord.customer_uid === userUid;
        const matchPhone = userPhoneClean && ord.customerPhone && ord.customerPhone.trim() === userPhoneClean;
        return matchEmail || matchUid || matchPhone;
      });

      matched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (matched.length === 0) {
        const localOrders = posService.getOrders();
        const fallbackMatched = localOrders.filter(ord => {
          const matchEmail = userEmailLower && ord.customerEmail && ord.customerEmail.toLowerCase().trim() === userEmailLower;
          const matchUid = ord.customer_uid && ord.customer_uid === userUid;
          const matchPhone = userPhoneClean && ord.customerPhone && ord.customerPhone.trim() === userPhoneClean;
          return matchEmail || matchUid || matchPhone;
        });
        fallbackMatched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUserOrders(fallbackMatched);
      } else {
        setUserOrders(matched);
      }

      setLoadingOrders(false);
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ords: Order[] = [];
      snapshot.forEach((docSnap) => {
        ords.push({ id: docSnap.id, ...docSnap.data() } as Order);
      });
      processSnapshot(ords);
    }, (error) => {
      console.warn('[Profile] Orders onSnapshot listener notice:', error);
      const allPosOrders = posService.getOrders();
      processSnapshot(allPosOrders);
    });

    return () => unsubscribe();
  }, [user, profile?.phone]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`, false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const catalogProducts = useMemo(() => {
    return liveProducts.length > 0 ? liveProducts : productService.getProducts();
  }, [liveProducts]);

  const wishlistProducts = useMemo(() => {
    const map = new Map(catalogProducts.map((p) => [p.id, p]));
    return wishlistIds.map((id) => map.get(id)).filter((p): p is Product => Boolean(p));
  }, [catalogProducts, wishlistIds]);

  const recentProducts = useMemo(() => {
    const map = new Map(catalogProducts.map((p) => [p.id, p]));
    return recentIds.map((id) => map.get(id)).filter((p): p is Product => Boolean(p));
  }, [catalogProducts, recentIds]);

  const handleReorder = (order: Order) => {
    let reorderedCount = 0;
    const unavailableNames: string[] = [];

    order.items.forEach((item) => {
      const prod = catalogProducts.find(
        (p) => p.id === item.productId || p.name.toLowerCase() === item.name.toLowerCase()
      );
      if (!prod || (prod.stock ?? 0) <= 0) {
        unavailableNames.push(item.name);
        return;
      }

      const qtyToAdd = Math.min(Math.max(1, item.quantity), prod.stock || 1);
      addToCart(prod, qtyToAdd, item.comboComponents, { openDrawer: false });
      reorderedCount += qtyToAdd;
    });

    if (reorderedCount > 0) {
      setIsCartOpen(true);
      setReorderMessage(
        unavailableNames.length > 0
          ? `Added ${reorderedCount} in-stock item(s) to cart. Unavailable / out of stock: ${unavailableNames.join(', ')}`
          : `Added ${reorderedCount} item(s) from Order #${order.id} to your cart!`
      );
    } else {
      setReorderMessage(`None of the items in Order #${order.id} are currently in stock.`);
    }
    setTimeout(() => setReorderMessage(null), 5000);
  };

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !addrRecipient.trim() || !addrPhone.trim() || !addrLine.trim()) return;
    setSavingAddr(true);
    setAddrFeedback(null);
    try {
      await userPortalService.saveAddress(user.uid, {
        label: addrLabel,
        recipientName: addrRecipient,
        phone: addrPhone,
        area: addrArea,
        addressLine: addrLine,
        isDefault: addrDefault,
      });
      const updated = await userPortalService.getSavedAddresses(user.uid);
      setSavedAddresses(updated);
      setAddrLine('');
      setAddrFeedback('Delivery address saved.');
      setTimeout(() => setAddrFeedback(null), 3000);
    } finally {
      setSavingAddr(false);
    }
  };

  const handleDeleteSavedAddress = async (id: string) => {
    if (!user?.uid) return;
    await userPortalService.deleteAddress(user.uid, id);
    setSavedAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDesc.trim()) return;
    setTicketSubmitting(true);
    setTicketNotice(null);
    try {
      const created = await userPortalService.createSupportTicket({
        customerName: name || profile?.name || user?.displayName || 'Customer',
        customerPhone: phone || profile?.phone || '',
        customerEmail: user?.email || '',
        orderId: ticketOrderId || undefined,
        subject: ticketSubject.trim(),
        description: ticketDesc.trim(),
      });
      setSupportTickets((prev) => [created, ...prev]);
      setTicketSubject('');
      setTicketOrderId('');
      setTicketDesc('');
      setTicketNotice(`Ticket ${created.ticketNumber || created.id} submitted to support.`);
    } catch (err: any) {
      setTicketNotice(err?.message || 'Could not submit support ticket.');
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Metrics
  const totalSpent = useMemo(() => {
    return userOrders.reduce((sum, ord) => ord.status !== 'cancelled' ? sum + ord.totalAmount : sum, 0);
  }, [userOrders]);

  const activeOrdersCount = useMemo(() => {
    return userOrders.filter(ord => ['pending', 'processing', 'shipped', 'confirmed'].includes(ord.status?.toLowerCase())).length;
  }, [userOrders]);

  const deliveredOrdersCount = useMemo(() => {
    return userOrders.filter(ord => ord.status?.toLowerCase() === 'delivered').length;
  }, [userOrders]);

  // Verified server-synced Loyalty Points (earned at 1 point per ৳10 on delivered orders)
  const loyaltyPoints = useMemo(() => {
    return typeof profile?.loyaltyPoints === 'number' ? profile.loyaltyPoints : 0;
  }, [profile?.loyaltyPoints]);

  // Tier Status
  const loyaltyTier = useMemo(() => {
    if (loyaltyPoints >= 1000) return { name: 'Platinum Glow Tier', color: 'from-purple-600 via-pink-600 to-amber-500', nextTier: null, nextGoal: 1000, progress: 100, perk: 'Redeem points at 1 pt = ৳1 BDT on checkout' };
    if (loyaltyPoints >= 500) return { name: 'Gold Glow Tier', color: 'from-amber-500 to-[#E91E8C]', nextTier: 'Platinum Glow Tier', nextGoal: 1000, progress: Math.min(100, Math.round(((loyaltyPoints - 500) / 500) * 100)), perk: 'Redeem points at 1 pt = ৳1 BDT on checkout' };
    if (loyaltyPoints >= 200) return { name: 'Silver Glow Tier', color: 'from-pink-500 to-purple-500', nextTier: 'Gold Glow Tier', nextGoal: 500, progress: Math.min(100, Math.round(((loyaltyPoints - 200) / 300) * 100)), perk: 'Redeem points at 1 pt = ৳1 BDT on checkout' };
    return { name: 'Bronze Glow Tier', color: 'from-[#E91E8C] to-pink-400', nextTier: 'Silver Glow Tier', nextGoal: 200, progress: Math.min(100, Math.round((loyaltyPoints / 200) * 100)), perk: 'Earn 1 point per ৳10 spent on delivered orders' };
  }, [loyaltyPoints]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return userOrders.filter(ord => {
      const statusLower = ord.status?.toLowerCase() || '';
      if (statusFilter === 'active') {
        if (!['pending', 'processing', 'shipped', 'confirmed'].includes(statusLower)) return false;
      } else if (statusFilter === 'delivered') {
        if (statusLower !== 'delivered') return false;
      } else if (statusFilter === 'cancelled') {
        if (statusLower !== 'cancelled') return false;
      }

      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase().trim();
        const matchesId = ord.id.toLowerCase().includes(queryLower);
        const matchesItem = ord.items.some(i => i.name.toLowerCase().includes(queryLower));
        const matchesAddress = (ord.address || '').toLowerCase().includes(queryLower);
        if (!matchesId && !matchesItem && !matchesAddress) return false;
      }

      return true;
    });
  }, [userOrders, statusFilter, searchQuery]);

  const getStatusBadge = (status: Order['status']) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'pending':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center gap-1"><Clock size={11} /> Pending</span>;
      case 'confirmed':
      case 'processing':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center gap-1"><Package size={11} /> Processing</span>;
      case 'shipped':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center gap-1"><Truck size={11} /> Out for Delivery</span>;
      case 'delivered':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1"><CheckCircle size={11} /> Delivered</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-red-50 text-red-700 border border-red-200/80 flex items-center gap-1"><XCircle size={11} /> Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-gray-50 text-gray-700 border border-gray-200/80 flex items-center gap-1">{status}</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 py-6 px-3 sm:px-6 lg:px-8">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {reorderMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 sm:right-6 z-50 bg-gradient-to-r from-[#E91E8C] to-purple-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold"
          >
            <Sparkles size={16} />
            <span>{reorderMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. ROLE-AWARE TOP HIGHLIGHT CARDS */}
      
      {/* Super Admin & Staff Fast Deck Access */}
      {pageTheme.showRoleBanners && isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-3xl p-5 sm:p-6 text-white border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0 shadow-sm">
              <Crown size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                  Privileged Operations
                </span>
                <span className="text-xs text-slate-400">Department: {profile?.department || 'Executive'}</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                KSF Operations Management Deck
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                You have administrative access to manage users, orders, AI agents, social studio, and POS register.
              </p>
            </div>
          </div>

          <Link
            to="/admin"
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#E91E8C] via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <ShieldCheck size={16} />
            <span>Open Admin Panel</span>
            <ChevronRight size={14} />
          </Link>
        </motion.div>
      )}

      {/* Verified Creator Status Banner */}
      {pageTheme.showRoleBanners && creatorProfile && creatorProfile.status === 'approved' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-pink-950 via-slate-900 to-purple-950 rounded-3xl p-5 sm:p-6 text-white border border-pink-900/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-pink-500/30">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-pink-300 bg-pink-500/20 px-2 py-0.5 rounded-full border border-pink-500/30">
                  Level {creatorProfile.level}: {creatorProfile.levelName}
                </span>
                <span className="text-xs font-mono text-amber-300 font-black flex items-center gap-1">
                  <Zap size={13} className="fill-amber-400" /> {creatorProfile.totalPoints.toLocaleString()} Creator Points
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                Official Creator Studio: @{creatorProfile.username}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Post Facebook & Instagram reels, earn verified engagement points, and claim your free Seoul skincare PR boxes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Link
              to="/creator/dashboard"
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition"
            >
              <Video size={14} />
              <span>Creator Hub</span>
            </Link>
            <Link
              to="/creator/reels/upload"
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs rounded-xl border border-white/20 flex items-center justify-center gap-1.5 transition"
            >
              <span>+ Reel</span>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Wholesale Partner Status Banner */}
      {pageTheme.showRoleBanners && profile?.wholesaleAccess && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-5 sm:p-6 text-white border border-purple-900/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                  Verified Wholesale Partner
                </span>
                <span className="text-xs text-purple-200">1–49 & 50+ Bulk Pricing Active</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                B2B Enterprise Wholesale Hub
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Manage your business profile, view credit limits, tax invoices, and store credentials.
              </p>
            </div>
          </div>

          <Link
            to="/wholesale/profile"
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Building2 size={16} />
            <span>Open Wholesale Profile</span>
            <ChevronRight size={14} />
          </Link>
        </motion.div>
      )}

      {/* 2. PROFILE HERO CARD WITH AVATAR & QUICK STATS */}
      <div className="bg-white rounded-3xl p-5 sm:p-8 border border-pink-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Avatar + User Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-3xl p-1 bg-gradient-to-tr from-[#E91E8C] via-pink-400 to-purple-500 shadow-md">
                {user?.photoURL || profile?.photoURL ? (
                  <img 
                    src={profile?.photoURL || user?.photoURL} 
                    alt={profile?.name || 'Avatar'} 
                    className="w-full h-full object-cover rounded-[20px] bg-white" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full rounded-[20px] bg-white flex items-center justify-center text-[#E91E8C] font-black text-xl">
                    {profile?.name?.slice(0, 2).toUpperCase() || 'KB'}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 p-1 bg-[#E91E8C] text-white rounded-lg shadow-sm border border-white">
                <Check size={12} />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {profile?.name || user?.displayName || pageTheme.fallbackDisplayName}
                </h1>
                <RoleBadge role={profile?.role} isCreatorApproved={creatorProfile?.status === 'approved'} />
              </div>
              <p className="text-xs text-gray-500 font-mono flex items-center gap-1.5">
                <Mail size={13} className="text-gray-400" /> {user?.email}
              </p>
              {profile?.phone && (
                <p className="text-xs text-gray-500 font-mono flex items-center gap-1.5">
                  <Phone size={13} className="text-gray-400" /> {profile.phone}
                </p>
              )}
            </div>
          </div>

          {/* Quick Metrics Cards */}
          {pageTheme.showQuickMetrics && (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 bg-pink-50/40 p-3 sm:p-4 rounded-2xl border border-pink-100 text-center shrink-0">
              <div className="px-2 sm:px-4">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Orders</span>
                <span className="text-base sm:text-lg font-black text-gray-900 font-mono mt-0.5 block">{userOrders.length}</span>
              </div>
              <div className="px-2 sm:px-4 border-x border-pink-200/60">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Total Spent</span>
                <span className="text-base sm:text-lg font-black text-[#E91E8C] font-mono mt-0.5 block">৳{totalSpent.toLocaleString()}</span>
              </div>
              <div className="px-2 sm:px-4">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Glow Points</span>
                <span className="text-base sm:text-lg font-black text-purple-700 font-mono mt-0.5 block">{loyaltyPoints}</span>
              </div>
            </div>
          )}

        </div>

        {/* 3. TAB NAVIGATION BAR */}
        <div className="mt-6 pt-5 border-t border-pink-100 flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 shrink-0 border ${
              activeTab === 'orders'
                ? 'bg-[#E91E8C] text-white border-[#E91E8C] shadow-md shadow-pink-500/20'
                : 'bg-gray-50 hover:bg-pink-50/60 text-gray-700 border-gray-200/80'
            }`}
          >
            <ShoppingBag size={14} />
            <span>{pageTheme.ordersTabLabel}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {userOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 shrink-0 border ${
              activeTab === 'wishlist'
                ? 'bg-[#E91E8C] text-white border-[#E91E8C] shadow-md shadow-pink-500/20'
                : 'bg-gray-50 hover:bg-pink-50/60 text-gray-700 border-gray-200/80'
            }`}
          >
            <Heart size={14} />
            <span>{pageTheme.wishlistTabLabel} ({wishlistProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 shrink-0 border ${
              activeTab === 'addresses'
                ? 'bg-[#E91E8C] text-white border-[#E91E8C] shadow-md shadow-pink-500/20'
                : 'bg-gray-50 hover:bg-pink-50/60 text-gray-700 border-gray-200/80'
            }`}
          >
            <MapPin size={14} />
            <span>{pageTheme.addressesTabLabel} ({savedAddresses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('skin_routine')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 shrink-0 border ${
              activeTab === 'skin_routine'
                ? 'bg-[#E91E8C] text-white border-[#E91E8C] shadow-md shadow-pink-500/20'
                : 'bg-gray-50 hover:bg-pink-50/60 text-gray-700 border-gray-200/80'
            }`}
          >
            <Droplets size={14} />
            <span>{pageTheme.routineTabLabel}</span>
          </button>

          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 shrink-0 border ${
              activeTab === 'rewards'
                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                : 'bg-gray-50 hover:bg-pink-50/60 text-gray-700 border-gray-200/80'
            }`}
          >
            <Award size={14} />
            <span>{pageTheme.loyaltyTabLabel} ({loyaltyPoints})</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 shrink-0 border ${
              activeTab === 'reviews'
                ? 'bg-[#E91E8C] text-white border-[#E91E8C] shadow-md shadow-pink-500/20'
                : 'bg-gray-50 hover:bg-pink-50/60 text-gray-700 border-gray-200/80'
            }`}
          >
            <Star size={14} />
            <span>{pageTheme.reviewsTabLabel} ({myReviews.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 shrink-0 border ${
              activeTab === 'support'
                ? 'bg-[#E91E8C] text-white border-[#E91E8C] shadow-md shadow-pink-500/20'
                : 'bg-gray-50 hover:bg-pink-50/60 text-gray-700 border-gray-200/80'
            }`}
          >
            <MessageSquare size={14} />
            <span>{pageTheme.supportTabLabel} ({supportTickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 shrink-0 border ${
              activeTab === 'settings'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20'
                : 'bg-gray-50 hover:bg-pink-50/60 text-gray-700 border-gray-200/80'
            }`}
          >
            <User size={14} />
            <span>{pageTheme.accountTabLabel}</span>
          </button>

          {(creatorProfile || isAdmin) && (
            <button
              onClick={() => setActiveTab('role_hub')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 shrink-0 border ${
                activeTab === 'role_hub'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-600 shadow-md shadow-pink-500/20'
                  : 'bg-pink-50 text-[#E91E8C] border-pink-200 hover:bg-pink-100'
              }`}
            >
              <Sparkles size={14} />
              <span>{isAdmin ? 'Staff Hub' : 'Creator Portal'}</span>
            </button>
          )}

          <div className="ml-auto hidden sm:flex items-center gap-2">
            <button
              onClick={() => signOut()}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl border border-rose-200 text-xs transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: MY ORDERS & LIVE TRACKING */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          
          {/* Filter & Search Toolbar */}
          <div className="bg-white p-4 rounded-3xl border border-pink-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Orders', count: userOrders.length },
                { id: 'active', label: 'Active Shipments', count: activeOrdersCount },
                { id: 'delivered', label: 'Delivered', count: deliveredOrdersCount },
                { id: 'cancelled', label: 'Cancelled', count: userOrders.filter(o => o.status === 'cancelled').length },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer border ${
                    statusFilter === f.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID or item name..."
                className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#E91E8C] outline-none transition"
              />
            </div>
          </div>

          {/* Orders List */}
          {loadingOrders ? (
            <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-pink-100">
              <div className="w-8 h-8 border-3 border-[#E91E8C] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-500 font-bold">Loading your authenticated order history...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center space-y-4 bg-white rounded-3xl border border-dashed border-pink-200 p-8">
              <div className="w-16 h-16 bg-pink-50 text-[#E91E8C] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <ShoppingBag size={30} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">No Orders Found</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No orders match your active filter or search criteria.'
                    : "You haven't placed any orders yet. Discover genuine Korean skincare products and elevate your routine!"}
                </p>
              </div>
              <button
                onClick={() => navigate('/shop')}
                className="px-6 py-3 bg-[#E91E8C] hover:bg-pink-700 text-white rounded-xl font-black text-xs transition shadow-md shadow-pink-500/20 inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Explore Skincare Catalog</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const isCopied = copiedOrderId === order.id;

                return (
                  <motion.div
                    key={order.id}
                    layout
                    className="bg-white rounded-3xl border border-pink-100/90 shadow-sm overflow-hidden transition-all hover:border-pink-300/80"
                  >
                    {/* Order Item Header */}
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleCopyOrderId(order.id)}
                            className="text-xs font-mono font-black text-gray-900 hover:text-[#E91E8C] flex items-center gap-1.5 bg-gray-100 hover:bg-pink-50 px-2.5 py-1 rounded-lg transition"
                            title="Click to copy Order ID"
                          >
                            <span>#{order.id}</span>
                            {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-gray-400" />}
                          </button>
                          {getStatusBadge(order.status)}
                          <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                            <Clock size={12} /> {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 flex-wrap">
                          <span>{order.items.length} item(s)</span>
                          <span>•</span>
                          <span>Delivery: <strong className="text-gray-800">{order.shippingCity || (order.shippingFee === 80 ? 'Inside Dhaka' : 'Outside Dhaka')}</strong></span>
                          {order.paymentMethod && (
                            <>
                              <span>•</span>
                              <span className="uppercase text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">{order.paymentMethod}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right controls: Total amount + Reorder + Expand Toggle */}
                      <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                        <div className="text-left md:text-right">
                          <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Amount</span>
                          <span className="text-base font-black text-[#E91E8C] font-mono">৳{order.totalAmount.toLocaleString()}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReorder(order)}
                            className="px-3.5 py-2 bg-pink-50 hover:bg-[#E91E8C] text-[#E91E8C] hover:text-white rounded-xl text-xs font-black transition cursor-pointer border border-pink-200 flex items-center gap-1 shadow-2xs"
                            title="Reorder all items in this order"
                          >
                            <RefreshCw size={13} />
                            <span className="hidden sm:inline">Reorder</span>
                          </button>

                          <button
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                            title="View order details"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Real-time status tracker bar */}
                    <div className="px-4 sm:px-6 pb-4">
                      <OrderStatusTracker status={order.status} />
                    </div>

                    {/* Expandable Order Breakdown Body */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-pink-100 bg-pink-50/20 p-4 sm:p-6 space-y-4"
                        >
                          {/* Products List */}
                          <div className="space-y-2.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                              Purchased Items ({order.items.length})
                            </span>
                            <div className="divide-y divide-pink-100/60 bg-white rounded-2xl border border-pink-100 overflow-hidden">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="p-3 sm:p-4 flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-[#E91E8C] font-black text-xs shrink-0">
                                      <Tag size={16} />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-bold text-gray-900 truncate">{item.name}</h4>
                                      <p className="text-[11px] text-gray-500">
                                        Qty: <strong className="text-gray-800">{item.quantity}</strong> × ৳{item.price.toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-xs font-mono font-black text-gray-900 shrink-0">
                                    ৳{(item.price * item.quantity).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Address & Payment Breakdown */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="bg-white p-3.5 rounded-2xl border border-pink-100 space-y-1">
                              <span className="text-[10px] font-black uppercase text-gray-400 block">Delivery Address</span>
                              <p className="font-bold text-gray-900">{order.customerName}</p>
                              <p className="text-gray-600">{order.address}</p>
                              <p className="font-mono text-gray-600">{order.customerPhone}</p>
                            </div>

                            <div className="bg-white p-3.5 rounded-2xl border border-pink-100 space-y-1.5">
                              <span className="text-[10px] font-black uppercase text-gray-400 block">Pricing Summary</span>
                              <div className="flex justify-between text-gray-600">
                                <span>Subtotal:</span>
                                <span className="font-mono font-bold">৳{(order.totalAmount - (order.shippingFee || 0)).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-gray-600">
                                <span>Shipping Delivery:</span>
                                <span className="font-mono font-bold">৳{order.shippingFee || 0}</span>
                              </div>
                              <div className="flex justify-between font-black text-gray-900 border-t border-pink-100 pt-1">
                                <span>Total Paid:</span>
                                <span className="font-mono text-[#E91E8C]">৳{order.totalAmount.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Invoice Print & PDF Download Actions */}
                          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => printInvoice(order)}
                              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Printer size={13} />
                              <span>Print Invoice</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadInvoicePDF(order)}
                              className="px-3.5 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-[#C81E78] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Download size={13} />
                              <span>Download PDF</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* TAB: WISHLIST & RECENTLY VIEWED */}
      {activeTab === 'wishlist' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">Saved Wishlist ({wishlistProducts.length})</h2>
              <Link to="/shop" className="text-xs font-bold text-[#E91E8C] hover:underline">
                Browse Catalog →
              </Link>
            </div>
            {wishlistProducts.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">
                No wishlist items yet. Tap the heart icon on any product to save it here.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishlistProducts.map((p) => (
                  <div key={p.id} className="p-4 rounded-2xl border border-pink-100 flex items-center justify-between gap-3">
                    <Link to={getProductPath(p)} className="flex items-center gap-3 min-w-0">
                      <img src={p.image} alt={p.name} className="w-14 h-14 rounded-xl object-cover border border-pink-100 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                        <p className="text-[11px] text-gray-500">{p.brand}</p>
                        <p className="text-xs font-black text-[#E91E8C] font-mono">৳{getRetailPrice(p).toLocaleString()}</p>
                      </div>
                    </Link>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={(p.stock || 0) <= 0}
                        onClick={() => addToCart(p, 1)}
                        className="px-3 py-1.5 rounded-lg bg-[#E91E8C] disabled:bg-gray-300 text-white text-[11px] font-bold cursor-pointer"
                      >
                        {(p.stock || 0) > 0 ? 'Add' : 'Out'}
                      </button>
                      <button
                        type="button"
                        onClick={() => userPortalService.toggleWishlist(p.id, user?.uid)}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 text-[11px] font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {recentProducts.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-[#E91E8C]" />
                <h2 className="text-base font-black text-gray-900">Recently Viewed</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recentProducts.slice(0, 8).map((p) => (
                  <Link key={p.id} to={getProductPath(p)} className="p-3 rounded-2xl border border-slate-200 hover:border-pink-200 transition space-y-2">
                    <img src={p.image} alt={p.name} className="w-full h-28 object-cover rounded-xl bg-pink-50/40" />
                    <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs font-black text-[#E91E8C] font-mono">৳{getRetailPrice(p).toLocaleString()}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: SAVED ADDRESS BOOK */}
      {activeTab === 'addresses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-gray-900">Saved Delivery Addresses</h2>
            {savedAddresses.length === 0 ? (
              <p className="text-xs text-gray-500 py-6">No saved addresses yet. Add your primary delivery address on the right for 1-click checkout.</p>
            ) : (
              <div className="space-y-3">
                {savedAddresses.map((addr) => (
                  <div key={addr.id} className="p-4 rounded-2xl border border-pink-100 bg-pink-50/20 flex items-start justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900">{addr.label}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {addr.area === 'dhaka' ? 'Inside Dhaka (৳80)' : 'Outside Dhaka (৳150)'}
                        </span>
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-gray-800">{addr.recipientName} · <span className="font-mono">{addr.phone}</span></p>
                      <p className="text-gray-600">{addr.addressLine}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedAddress(addr.id)}
                      className="p-2 text-gray-400 hover:text-rose-600 cursor-pointer"
                      aria-label="Delete address"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSaveNewAddress} className="lg:col-span-5 bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-4">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Plus size={16} className="text-[#E91E8C]" />
              <span>Add Delivery Address</span>
            </h3>
            {addrFeedback && <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">{addrFeedback}</p>}
            <input type="text" required value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)} placeholder="Label (e.g. Home, Office)" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#E91E8C]" />
            <input type="text" required value={addrRecipient} onChange={(e) => setAddrRecipient(e.target.value)} placeholder="Recipient Full Name" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#E91E8C]" />
            <input type="tel" required value={addrPhone} onChange={(e) => setAddrPhone(e.target.value)} placeholder="BD Mobile (017XXXXXXXX)" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-semibold outline-none focus:border-[#E91E8C]" />
            <select value={addrArea} onChange={(e) => setAddrArea(e.target.value as 'dhaka' | 'outside')} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#E91E8C]">
              <option value="dhaka">Inside Dhaka City (৳80)</option>
              <option value="outside">Outside Dhaka Nationwide (৳150)</option>
            </select>
            <textarea rows={3} required value={addrLine} onChange={(e) => setAddrLine(e.target.value)} placeholder="House, Road, Area, Thana, District..." className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#E91E8C] resize-none" />
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
              <input type="checkbox" checked={addrDefault} onChange={(e) => setAddrDefault(e.target.checked)} className="accent-[#E91E8C]" />
              <span>Set as default checkout address</span>
            </label>
            <button type="submit" disabled={savingAddr} className="w-full py-3 rounded-xl bg-[#E91E8C] hover:bg-pink-700 text-white text-xs font-black cursor-pointer">
              {savingAddr ? 'Saving...' : 'Save Address'}
            </button>
          </form>
        </div>
      )}

      {/* TAB: SKIN PROFILE & SAVED ROUTINES */}
      {activeTab === 'skin_routine' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">Your Skin Profile</h2>
              <Link to="/skin-quiz" className="px-3.5 py-2 rounded-xl bg-pink-50 text-[#E91E8C] text-xs font-bold hover:bg-pink-100">
                {skinProfile ? 'Retake Quiz' : 'Take Quiz'}
              </Link>
            </div>
            {skinProfile ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-pink-50/40 border border-pink-100">
                    <span className="text-[10px] font-bold text-gray-500 uppercase block">Skin Type</span>
                    <span className="font-black text-gray-900 text-sm">{skinProfile.skinType}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-pink-50/40 border border-pink-100">
                    <span className="text-[10px] font-bold text-gray-500 uppercase block">Sensitivity</span>
                    <span className="font-black text-gray-900 text-sm capitalize">{skinProfile.sensitivity}</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Saved Concerns</span>
                  <div className="flex flex-wrap gap-1.5">
                    {skinProfile.concerns.map((c) => (
                      <span key={c} className="px-2.5 py-1 rounded-lg bg-white border border-pink-200 text-[#E91E8C] font-bold capitalize">
                        {c.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Complete the 1-minute Skin Profile Quiz to personalize product shortlists.</p>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">Saved Routines ({savedRoutines.length})</h2>
              <Link to="/routine-builder" className="px-3.5 py-2 rounded-xl bg-[#E91E8C] text-white text-xs font-bold hover:bg-pink-700">
                Open Routine Builder
              </Link>
            </div>
            {savedRoutines.length === 0 ? (
              <p className="text-xs text-gray-500">No saved routines yet. Pair your AM/PM products in the Routine Builder.</p>
            ) : (
              <div className="space-y-3">
                {savedRoutines.map((r) => (
                  <div key={r.id} className="p-4 rounded-2xl border border-pink-100 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-gray-900">{r.name}</p>
                      <p className="text-[11px] text-gray-500">{r.amSteps.length} AM steps · {r.pmSteps.length} PM steps</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to="/routine-builder" className="px-3 py-1.5 rounded-lg bg-pink-50 text-[#E91E8C] text-xs font-bold">
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          await userPortalService.deleteRoutine(r.id, user?.uid);
                          setSavedRoutines((prev) => prev.filter((item) => item.id !== r.id));
                        }}
                        className="p-1.5 text-gray-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GLOW REWARDS & LOYALTY POINTS */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          <div className={`rounded-3xl p-6 sm:p-8 text-white shadow-xl bg-gradient-to-r ${loyaltyTier.color} relative overflow-hidden`}>
            <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
                    <Crown size={14} /> Glow Rewards Club
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black">{loyaltyTier.name}</h2>
                  <p className="text-xs text-white/90 font-medium mt-1">{loyaltyTier.perk}</p>
                </div>

                <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center sm:text-right shrink-0">
                  <span className="text-[10px] uppercase font-black text-white/80 block">Current Balance</span>
                  <span className="text-3xl font-black font-mono flex items-center justify-center sm:justify-end gap-1.5 mt-0.5">
                    <Sparkles size={22} className="text-amber-300" />
                    {loyaltyPoints} <span className="text-xs font-bold text-white/80">pts</span>
                  </span>
                  <span className="text-[10px] text-white/90 block mt-1">
                    Redeemable Value: <strong>৳{loyaltyPoints} BDT</strong>
                  </span>
                </div>
              </div>

              {loyaltyTier.nextTier && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs font-bold text-white/90">
                    <span>Progress to {loyaltyTier.nextTier}</span>
                    <span className="font-mono">{loyaltyPoints} / {loyaltyTier.nextGoal} pts ({loyaltyTier.progress}%)</span>
                  </div>
                  <div className="w-full bg-black/20 h-3 rounded-full overflow-hidden p-0.5">
                    <div className="bg-white h-full rounded-full transition-all duration-700" style={{ width: `${loyaltyTier.progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-pink-100 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#E91E8C] flex items-center justify-center font-bold">
                <Coins size={20} />
              </div>
              <h4 className="text-sm font-black text-gray-900">Earn On Delivered Orders</h4>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                Receive 1 Glow Loyalty Point for every ৳10 spent once an order is marked delivered.
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-pink-100 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Percent size={20} />
              </div>
              <h4 className="text-sm font-black text-gray-900">Instant Checkout Discount</h4>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                Apply your verified point balance at checkout for direct BDT savings (1 pt = ৳1 BDT).
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-pink-100 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Gift size={20} />
              </div>
              <h4 className="text-sm font-black text-gray-900">Transparent Audit Ledger</h4>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                Every point earned or redeemed is recorded in your server-verified loyalty ledger below.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-4">
            <h3 className="text-base font-black text-gray-900">Points Transaction History</h3>
            {ledgerLoading ? (
              <p className="text-xs text-gray-500">Loading loyalty history...</p>
            ) : loyaltyLedger.length === 0 ? (
              <p className="text-xs text-gray-500">No loyalty point transactions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-pink-100 text-[10px] uppercase text-gray-400 font-black">
                    <tr>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Description</th>
                      <th className="py-2 pr-3 text-right">Points</th>
                      <th className="py-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-100/60">
                    {loyaltyLedger.map((entry) => (
                      <tr key={entry.id}>
                        <td className="py-2.5 pr-3 text-gray-500 whitespace-nowrap">{new Date(entry.createdAt).toLocaleDateString()}</td>
                        <td className="py-2.5 pr-3 font-mono font-bold text-gray-700">{entry.type}</td>
                        <td className="py-2.5 pr-3 text-gray-700">{entry.description}</td>
                        <td className={`py-2.5 pr-3 text-right font-mono font-black ${entry.pointsDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {entry.pointsDelta >= 0 ? `+${entry.pointsDelta}` : entry.pointsDelta}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-gray-900">{entry.balanceAfter} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: MY SUBMITTED REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-gray-900">My Product Reviews ({myReviews.length})</h2>
          {myReviews.length === 0 ? (
            <p className="text-xs text-gray-500 py-6">
              You have not submitted any product reviews yet. Visit a product page after shopping to share your experience.
            </p>
          ) : (
            <div className="space-y-3">
              {myReviews.map((rev) => (
                <div key={rev.id} className="p-4 rounded-2xl border border-pink-100 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-amber-500">{'★'.repeat(rev.rating)}</span>
                      <Link to={getProductPath(catalogProducts.find((pr) => pr.id === rev.productId) || { id: rev.productId })} className="text-xs font-bold text-[#E91E8C] hover:underline">
                        Product #{rev.productId}
                      </Link>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      rev.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : rev.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {rev.status || 'approved'}
                    </span>
                  </div>
                  {rev.title && <p className="text-xs font-bold text-gray-900">{rev.title}</p>}
                  <p className="text-xs text-gray-600">{rev.comment}</p>
                  {rev.moderationNote && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                      Moderation note: {rev.moderationNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: CUSTOMER SUPPORT TICKETS */}
      {activeTab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-gray-900">Your Support Requests</h2>
            {ticketsLoading ? (
              <p className="text-xs text-gray-500">Loading support tickets...</p>
            ) : supportTickets.length === 0 ? (
              <p className="text-xs text-gray-500 py-6">No support requests submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {supportTickets.map((t) => (
                  <div key={t.id} className="p-4 rounded-2xl border border-pink-100 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-black text-[#E91E8C]">{t.ticketNumber || t.id}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-900">{t.subject}</p>
                    <p className="text-xs text-gray-600">{t.description}</p>
                    {t.orderId && <p className="text-[11px] font-mono text-gray-500">Order Ref: #{t.orderId}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleCreateSupportTicket} className="lg:col-span-5 bg-white rounded-3xl p-6 border border-pink-100 shadow-sm space-y-4">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <AlertCircle size={16} className="text-[#E91E8C]" />
              <span>Open a Support Ticket</span>
            </h3>
            {ticketNotice && (
              <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                {ticketNotice}
              </p>
            )}
            <input
              type="text"
              required
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              placeholder="Subject (e.g. Damaged seal, Address change)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#E91E8C]"
            />
            {userOrders.length > 0 && (
              <select
                value={ticketOrderId}
                onChange={(e) => setTicketOrderId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#E91E8C]"
              >
                <option value="">-- Related Order (Optional) --</option>
                {userOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.id} — ৳{o.totalAmount.toLocaleString()} ({o.status})
                  </option>
                ))}
              </select>
            )}
            <textarea
              rows={4}
              required
              value={ticketDesc}
              onChange={(e) => setTicketDesc(e.target.value)}
              placeholder="Describe how our team can help..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#E91E8C] resize-none"
            />
            <button
              type="submit"
              disabled={ticketSubmitting}
              className="w-full py-3 rounded-xl bg-[#E91E8C] hover:bg-pink-700 text-white text-xs font-black cursor-pointer"
            >
              {ticketSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: PROFILE SETTINGS & SHIPPING ADDRESS */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100 shadow-sm max-w-3xl mx-auto space-y-6">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#E91E8C] block mb-1">
              Account & Delivery Info
            </span>
            <h3 className="text-xl font-black text-gray-900">Manage Your Personal Information</h3>
            <p className="text-xs text-gray-500 mt-1">
              Keep your phone number and delivery address updated for fast one-click checkout across Bangladesh.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {saveSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle size={16} />
                <span>Profile details and default delivery address saved successfully!</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Full Name / Recipient Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ayesha Rahman"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#E91E8C] outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email Address (Google Account)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-xs font-mono font-semibold text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Phone / WhatsApp Number (for Courier COD) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01700-000000"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#E91E8C] outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Default Delivery Address (House, Road, Area, City) *
              </label>
              <textarea
                rows={3}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. House #12, Road #5, Block C, Banani, Dhaka"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#E91E8C] outline-none transition resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#E91E8C] hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: ROLE HUB / CREATOR / ADMIN SHORTCUTS */}
      {activeTab === 'role_hub' && (
        <div className="space-y-6">
          
          {/* Wholesale Partner Hub Card in Role Hub */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-purple-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-purple-100 pb-4">
              <div>
                <span className="text-xs font-black uppercase text-purple-600 tracking-wider block">B2B Wholesale Portal</span>
                <h3 className="text-xl font-black text-gray-900">Enterprise & Wholesale Account</h3>
              </div>
              <Link
                to="/wholesale/profile"
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
              >
                <Building2 size={14} />
                <span>{profile?.wholesaleAccess ? 'Manage Wholesale Profile →' : 'Apply for Wholesale →'}</span>
              </Link>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Wholesale accounts enjoy verified tier 1 (1–49 qty) and tier 2 (50+ qty) bulk discounting directly from Korean brand importers, commercial tax invoices, and credit ledger capabilities.
            </p>
          </div>

          {/* If Creator */}
          {creatorProfile && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-pink-100 pb-4">
                <div>
                  <span className="text-xs font-black uppercase text-[#E91E8C] tracking-wider block">Creator Network</span>
                  <h3 className="text-xl font-black text-gray-900">Your Creator Hub Center</h3>
                </div>
                <Link
                  to="/creator/dashboard"
                  className="px-5 py-2.5 bg-[#E91E8C] hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  Open Full Creator Dashboard →
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-4 bg-pink-50/50 rounded-2xl border border-pink-100">
                  <span className="text-[10px] font-black uppercase text-gray-500 block">Total Points</span>
                  <span className="text-2xl font-black text-amber-600 font-mono mt-1 block">{creatorProfile.totalPoints}</span>
                </div>
                <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                  <span className="text-[10px] font-black uppercase text-gray-500 block">Level Tier</span>
                  <span className="text-lg font-black text-purple-700 mt-1 block">Lvl {creatorProfile.level}</span>
                </div>
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <span className="text-[10px] font-black uppercase text-gray-500 block">Total Reels</span>
                  <span className="text-2xl font-black text-blue-700 font-mono mt-1 block">{creatorProfile.totalReels || 0}</span>
                </div>
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] font-black uppercase text-gray-500 block">Total Views</span>
                  <span className="text-2xl font-black text-emerald-700 font-mono mt-1 block">{creatorProfile.totalViews || 0}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/creator/reels/upload"
                  className="px-5 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2"
                >
                  <Video size={16} />
                  <span>Submit Facebook & Instagram Reel</span>
                </Link>
                <Link
                  to="/creator/leaderboard"
                  className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold flex items-center gap-2"
                >
                  <Flame size={16} className="text-amber-500" />
                  <span>View Public Leaderboard</span>
                </Link>
              </div>
            </div>
          )}

          {/* If Admin / Staff */}
          {isAdmin && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider block">Staff Operations</span>
                  <h3 className="text-xl font-black text-gray-900">Executive Control Modules</h3>
                </div>
                <Link
                  to="/admin"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  Open Full Admin Panel →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  to="/admin/users"
                  className="p-5 bg-slate-50 hover:bg-pink-50/50 rounded-2xl border border-slate-200 transition group block"
                >
                  <Crown size={20} className="text-[#E91E8C] mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="text-sm font-black text-gray-900">User Management</h4>
                  <p className="text-xs text-gray-500 mt-1">Manage user roles, HR permissions, and creator authorizations.</p>
                </Link>

                <Link
                  to="/admin/orders"
                  className="p-5 bg-slate-50 hover:bg-pink-50/50 rounded-2xl border border-slate-200 transition group block"
                >
                  <Package size={20} className="text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="text-sm font-black text-gray-900">Order Fulfillment</h4>
                  <p className="text-xs text-gray-500 mt-1">Update courier delivery stages, Steadfast IDs, and invoices.</p>
                </Link>

                <Link
                  to="/admin/creators"
                  className="p-5 bg-slate-50 hover:bg-pink-50/50 rounded-2xl border border-slate-200 transition group block"
                >
                  <Sparkles size={20} className="text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                  <h4 className="text-sm font-black text-gray-900">Creator Approvals</h4>
                  <p className="text-xs text-gray-500 mt-1">Review pending creator profiles, audit reels, and assign points.</p>
                </Link>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
