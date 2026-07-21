import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Order, Product } from '../types';
import { posService } from '../services/posService';
import { productService } from '../services/productService';
import { useCart } from '../context/CartContext';
import { 
  ShoppingBag, Phone, MapPin, User, Save, CheckCircle, Clock, Package, 
  HelpCircle, Search, Filter, Copy, Check, ChevronDown, ChevronUp, 
  RefreshCw, DollarSign, Mail, ArrowRight, Sparkles, Tag, ShieldCheck, Truck, XCircle,
  Gift, Award, Crown, Coins, Percent
} from 'lucide-react';

const OrderStatusTracker: React.FC<{ status: string }> = ({ status }) => {
  const statusLower = status?.toLowerCase() || 'pending';

  if (statusLower === 'cancelled') {
    return (
      <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3 flex items-center justify-between text-xs text-red-700 font-semibold">
        <div className="flex items-center gap-2">
          <XCircle size={16} className="text-red-500 shrink-0" />
          <span>This order was cancelled. Please contact support if you need assistance.</span>
        </div>
      </div>
    );
  }

  // Determine active stage (1: Processing, 2: Shipped, 3: Delivered)
  let currentStep = 1;
  if (['shipped', 'out_for_delivery'].includes(statusLower)) {
    currentStep = 2;
  } else if (statusLower === 'delivered') {
    currentStep = 3;
  }

  const steps = [
    {
      step: 1,
      label: 'Processing',
      desc: statusLower === 'pending' ? 'Order Received' : 'Preparing Order',
      icon: Package,
    },
    {
      step: 2,
      label: 'Shipped',
      desc: currentStep > 2 ? 'Dispatched' : currentStep === 2 ? 'Out for Delivery' : 'Pending Dispatch',
      icon: Truck,
    },
    {
      step: 3,
      label: 'Delivered',
      desc: currentStep === 3 ? 'Package Delivered' : 'Delivery Pending',
      icon: CheckCircle,
    }
  ];

  return (
    <div className="mt-3.5 pt-3 border-t border-pink-100/60 space-y-3">
      <div className="flex items-center justify-between text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
        <span className="flex items-center gap-1.5 text-[#E91E8C]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E91E8C]" />
          </span>
          <span>Real-Time Status Tracking</span>
        </span>
        <span className="font-mono text-gray-700">
          Live Status: <strong className="capitalize text-[#E91E8C]">{status}</strong>
        </span>
      </div>

      {/* Progress Bar Container */}
      <div className="relative px-3 sm:px-6 pt-1 pb-2">
        {/* Track Line Background */}
        <div className="absolute top-5 left-8 right-8 h-1 bg-gray-200 rounded-full" />

        {/* Active Progress Fill Line */}
        <motion.div 
          className="absolute top-5 left-8 h-1 bg-gradient-to-r from-[#E91E8C] via-pink-500 to-emerald-500 rounded-full transition-all duration-700"
          initial={{ width: '0%' }}
          animate={{ 
            width: currentStep === 1 
              ? '0%' 
              : currentStep === 2 
                ? 'calc(50% - 16px)' 
                : 'calc(100% - 32px)' 
          }}
        />

        {/* Steps */}
        <div className="relative z-10 flex items-center justify-between">
          {steps.map((item) => {
            const isDone = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            const Icon = item.icon;

            return (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    isDone 
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-100'
                      : isCurrent
                        ? 'bg-[#E91E8C] text-white shadow-md shadow-pink-200 ring-4 ring-pink-100 scale-110'
                        : 'bg-white text-gray-300 border-2 border-gray-200'
                  }`}
                >
                  <Icon size={14} />
                </div>
                <span className={`text-[11px] font-extrabold mt-1.5 ${isCurrent ? 'text-[#E91E8C]' : isDone ? 'text-gray-800' : 'text-gray-400'}`}>
                  {item.label}
                </span>
                <span className="text-[9px] text-gray-400 font-medium leading-none mt-0.5 hidden sm:block">
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
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export const Profile: React.FC = () => {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { addToCart, setIsCartOpen } = useCart();

  // Redirect admin users to the admin dashboard
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, navigate]);

  // Editable Form states
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState((profile as any)?.address || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Orders state
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Search & Filter states for My Orders section
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
    }
  }, [profile]);

  // Query user's past transactions linked to user's email, UID, or phone
  useEffect(() => {
    if (!user) {
      setLoadingOrders(false);
      return;
    }

    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));

    const userEmailLower = user.email?.toLowerCase().trim();
    const userUid = user.uid;

    const processSnapshot = (ords: Order[]) => {
      const userPhoneClean = profile?.phone?.trim();

      // Filter past transaction data linked to authenticated user's email, UID, or phone
      const matched = ords.filter(ord => {
        const matchEmail = userEmailLower && ord.customerEmail && ord.customerEmail.toLowerCase().trim() === userEmailLower;
        const matchUid = ord.customer_uid && ord.customer_uid === userUid;
        const matchPhone = userPhoneClean && ord.customerPhone && ord.customerPhone.trim() === userPhoneClean;
        return matchEmail || matchUid || matchPhone;
      });

      // Sort descending by date
      matched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Fallback: If no orders found yet, also combine with local posService cache orders matched by email
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
      // Fallback query using posService
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
        phone,
        address
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
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

  const handleReorder = (order: Order) => {
    const allProducts = productService.getProducts();
    let reorderedCount = 0;

    order.items.forEach(item => {
      let prod = allProducts.find(p => p.id === item.productId || p.name.toLowerCase() === item.name.toLowerCase());
      if (!prod) {
        // Construct a safe fallback product object if not found in catalog
        prod = {
          id: item.productId || 'custom-item',
          name: item.name,
          nameBN: item.name,
          brand: 'K-Beauty',
          category: 'Skincare',
          skinTypes: ['All Skin Types'],
          price: item.price,
          stock: 10,
          image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=60',
          description: item.name,
          descriptionBN: item.name,
          rating: 4.8,
          reviewsCount: 12,
          barcode: '8800000000000',
          qrCodeUrl: ''
        };
      }
      for (let i = 0; i < item.quantity; i++) {
        addToCart(prod);
      }
      reorderedCount += item.quantity;
    });

    setReorderMessage(`Added ${reorderedCount} item(s) from Order #${order.id} to your cart!`);
    setIsCartOpen(true);
    setTimeout(() => setReorderMessage(null), 4000);
  };

  // Filtered orders based on search & status selection
  const filteredOrders = useMemo(() => {
    return userOrders.filter(ord => {
      // Status filter logic
      const statusLower = ord.status?.toLowerCase() || '';
      if (statusFilter === 'active') {
        if (!['pending', 'processing', 'shipped', 'confirmed'].includes(statusLower)) return false;
      } else if (statusFilter === 'delivered') {
        if (statusLower !== 'delivered') return false;
      } else if (statusFilter === 'cancelled') {
        if (statusLower !== 'cancelled') return false;
      }

      // Search query logic
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase().trim();
        const matchesId = ord.id.toLowerCase().includes(queryLower);
        const matchesItem = ord.items.some(i => i.name.toLowerCase().includes(queryLower));
        const matchesAddress = ord.address.toLowerCase().includes(queryLower);
        if (!matchesId && !matchesItem && !matchesAddress) return false;
      }

      return true;
    });
  }, [userOrders, statusFilter, searchQuery]);

  // Overall order metrics
  const totalSpent = useMemo(() => {
    return userOrders.reduce((sum, ord) => ord.status !== 'cancelled' ? sum + ord.totalAmount : sum, 0);
  }, [userOrders]);

  const activeOrdersCount = useMemo(() => {
    return userOrders.filter(ord => ['pending', 'processing', 'shipped', 'confirmed'].includes(ord.status?.toLowerCase())).length;
  }, [userOrders]);

  const deliveredOrdersCount = useMemo(() => {
    return userOrders.filter(ord => ord.status?.toLowerCase() === 'delivered').length;
  }, [userOrders]);

  // Loyalty Points calculation
  const loyaltyPoints = useMemo(() => {
    if (typeof profile?.loyaltyPoints === 'number') {
      return profile.loyaltyPoints;
    }
    // Fallback: 1 point earned per ৳10 spent on non-cancelled orders
    return Math.floor(totalSpent / 10);
  }, [profile?.loyaltyPoints, totalSpent]);

  // Redeemable discount value in BDT (1 Loyalty Point = ৳1 BDT discount)
  const discountValueBDT = loyaltyPoints;

  // Loyalty Tier Status
  const loyaltyTier = useMemo(() => {
    if (loyaltyPoints >= 1000) return { name: 'Platinum Glass Skin Elite', color: 'from-purple-600 to-indigo-600', nextTier: null, nextGoal: 1000, progress: 100 };
    if (loyaltyPoints >= 500) return { name: 'Gold K-Beauty VIP', color: 'from-amber-500 to-[#E91E8C]', nextTier: 'Platinum Glass Skin Elite', nextGoal: 1000, progress: Math.min(100, Math.round(((loyaltyPoints - 500) / 500) * 100)) };
    if (loyaltyPoints >= 200) return { name: 'Silver Radiance Member', color: 'from-pink-500 to-purple-500', nextTier: 'Gold K-Beauty VIP', nextGoal: 500, progress: Math.min(100, Math.round(((loyaltyPoints - 200) / 300) * 100)) };
    return { name: 'Bronze Glow Member', color: 'from-[#E91E8C] to-pink-400', nextTier: 'Silver Radiance Member', nextGoal: 200, progress: Math.min(100, Math.round((loyaltyPoints / 200) * 100)) };
  }, [loyaltyPoints]);

  const getStatusBadge = (status: Order['status']) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'pending':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1"><Clock size={11} /> Pending</span>;
      case 'confirmed':
      case 'processing':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center gap-1"><Package size={11} /> Confirmed</span>;
      case 'shipped':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center gap-1"><Truck size={11} /> Out for Delivery</span>;
      case 'delivered':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1"><CheckCircle size={11} /> Delivered</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-red-50 text-red-700 border border-red-200/60 flex items-center gap-1">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-gray-50 text-gray-700 border border-gray-200/60 flex items-center gap-1">{status}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6 px-4">
      {/* Toast Notification for Reorder */}
      <AnimatePresence>
        {reorderMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-[#E91E8C] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold"
          >
            <Sparkles size={16} />
            <span>{reorderMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-pink-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-pink-100 text-[#E91E8C] text-[10px] font-black rounded-full uppercase tracking-wider">Authenticated Account</span>
            <span className="text-xs text-gray-400 font-mono flex items-center gap-1"><Mail size={12} /> {user?.email}</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 mt-1">
            <User className="text-[#E91E8C]" />
            <span>My Account & Orders Portal</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            View your complete order history, track active shipments, reorder favorites, and manage delivery addresses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-white hover:bg-pink-50 text-gray-700 font-bold rounded-xl border border-pink-200 cursor-pointer transition text-xs shadow-sm flex items-center gap-1.5"
          >
            ← Continue Shopping
          </button>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl border border-red-100 cursor-pointer transition text-xs shadow-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile & Address Card */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-[32px] border border-pink-100 shadow-sm space-y-6"
          >
            {/* User Avatar & Info */}
            <div className="text-center space-y-3 pb-4 border-b border-pink-50">
              <div className="relative w-24 h-24 mx-auto rounded-full p-1 border-2 border-[#E91E8C] overflow-hidden bg-pink-50">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#E91E8C] text-white flex items-center justify-center font-bold text-2xl">
                    {profile?.name?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase() || 'KB'}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-gray-900 leading-tight">{profile?.name || user?.displayName || 'K-Beauty Shopper'}</h3>
                <span className="inline-block mt-1 px-3 py-1 bg-pink-50 text-[#E91E8C] font-bold rounded-full text-[10px] uppercase tracking-wider">
                  {profile?.role === 'customer' ? 'K-Beauty Customer' : 'Skincare Customer'}
                </span>
              </div>
            </div>

            {/* Account Quick Metrics Summary */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-pink-50/30 rounded-2xl border border-pink-100 text-center">
              <div>
                <span className="text-[9px] text-gray-400 font-bold block uppercase">Total Spent</span>
                <span className="text-xs font-extrabold text-[#E91E8C] font-mono">৳{totalSpent.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 font-bold block uppercase">Orders</span>
                <span className="text-xs font-extrabold text-gray-800 font-mono">{userOrders.length}</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 font-bold block uppercase">Glow Points</span>
                <span className="text-xs font-extrabold text-amber-600 font-mono">{loyaltyPoints.toLocaleString()}</span>
              </div>
            </div>

            {/* Editable Delivery Details Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Account Email</label>
                <div className="w-full bg-gray-50 text-xs text-gray-600 border border-gray-200/80 rounded-xl px-3.5 py-3 select-none flex items-center justify-between">
                  <span className="truncate">{user?.email}</span>
                  <ShieldCheck size={14} className="text-emerald-500 shrink-0 ml-2" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Phone Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-400" />
                  <input
                    type="tel"
                    placeholder="e.g. 017XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-pink-50/5 text-xs text-gray-800 pl-10 pr-4 py-3 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/15 transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Default Shipping Address</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-4 text-pink-400" />
                  <textarea
                    placeholder="House, Road, Area, City, Bangladesh"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="w-full bg-pink-50/5 text-xs text-gray-800 pl-10 pr-4 py-3 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/15 transition resize-none leading-relaxed"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#E91E8C] hover:bg-[#d0177c] text-white font-bold rounded-xl cursor-pointer shadow-sm shadow-pink-100 transition disabled:opacity-50 text-xs"
              >
                <Save size={14} />
                <span>{isSaving ? 'Updating Profile...' : 'Save Profile Details'}</span>
              </button>

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-[11px] text-emerald-700 font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle size={14} />
                  <span>Profile updated successfully!</span>
                </div>
              )}
            </form>
          </motion.div>
        </div>

        {/* Right Column: Loyalty Points & Extended "My Orders" Section */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* K-Beauty Loyalty Points & Rewards Banner Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-pink-600 via-[#E91E8C] to-purple-800 text-white rounded-[32px] p-6 shadow-xl relative overflow-hidden border border-pink-400/30"
          >
            {/* Background Decorative Circles */}
            <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute right-24 -top-12 w-32 h-32 rounded-full bg-pink-400/20 blur-xl pointer-events-none" />

            <div className="relative z-10 space-y-5">
              {/* Card Header & Tier Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/15 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300 shadow-inner">
                    <Crown size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight leading-none text-white">K-Beauty Glow Rewards Club</h3>
                    <span className="text-[10px] text-pink-200 font-medium">Earn points with every skincare purchase & save BDT</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="px-3 py-1 bg-white/15 backdrop-blur-md border border-white/25 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-200 flex items-center gap-1.5 shadow-sm">
                    <Award size={12} className="text-amber-300" />
                    <span>{loyaltyTier.name}</span>
                  </span>
                </div>
              </div>

              {/* Main Points & Redeemable Discount Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Current Balance Box */}
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-pink-200 tracking-wider block">Current Points Balance</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono tracking-tight text-white">{loyaltyPoints.toLocaleString()}</span>
                    <span className="text-xs font-extrabold text-amber-300 uppercase">Points</span>
                  </div>
                  <p className="text-[10px] text-pink-100 font-medium">10 Points earned per ৳100 spent</p>
                </div>

                {/* Redeemable Discount Box */}
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-200 tracking-wider block">Redeemable Discount Value</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono tracking-tight text-amber-300">৳{discountValueBDT.toLocaleString()}</span>
                    <span className="text-xs font-extrabold text-white">BDT OFF</span>
                  </div>
                  <p className="text-[10px] text-pink-100 font-medium">1 Loyalty Point = ৳1 BDT instant savings</p>
                </div>
              </div>

              {/* Tier Progress Bar */}
              {loyaltyTier.nextTier && (
                <div className="space-y-1.5 bg-black/10 p-3 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-pink-100">Progress to <strong className="text-amber-200">{loyaltyTier.nextTier}</strong></span>
                    <span className="font-mono text-white">{loyaltyPoints} / {loyaltyTier.nextGoal} PTS</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden p-0.5">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-amber-300 to-amber-400 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${Math.min(100, Math.max(5, loyaltyTier.progress))}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <p className="text-[9px] text-pink-200 font-medium">
                    Earn {loyaltyTier.nextGoal - loyaltyPoints} more points to unlock exclusive VIP tier perks!
                  </p>
                </div>
              )}

              {/* Earning & Redemption Guide */}
              <div className="pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-[10px]">
                <div className="bg-white/5 p-2 rounded-xl border border-white/10 flex items-center gap-2 text-left">
                  <ShoppingBag size={14} className="text-pink-300 shrink-0" />
                  <div>
                    <span className="font-extrabold block text-white">1. Shop & Earn</span>
                    <span className="text-pink-200 text-[9px]">1 Point for every ৳10 spent</span>
                  </div>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/10 flex items-center gap-2 text-left">
                  <Gift size={14} className="text-amber-300 shrink-0" />
                  <div>
                    <span className="font-extrabold block text-white">2. Redeem Value</span>
                    <span className="text-pink-200 text-[9px]">1 Point = ৳1 Discount</span>
                  </div>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/10 flex items-center gap-2 text-left">
                  <Sparkles size={14} className="text-emerald-300 shrink-0" />
                  <div>
                    <span className="font-extrabold block text-white">3. Direct Checkout</span>
                    <span className="text-pink-200 text-[9px]">Apply savings at payment</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-pink-100 font-semibold">
                  {discountValueBDT > 0 
                    ? `You can save ৳${discountValueBDT} BDT on your next order today!` 
                    : 'Make your first purchase to start earning loyalty discount points!'}
                </span>
                <button
                  onClick={() => navigate('/shop')}
                  className="px-4 py-2 bg-white hover:bg-pink-50 text-[#E91E8C] font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>Redeem at Shop</span>
                  <ArrowRight size={14} />
                </button>
              </div>

            </div>
          </motion.div>

          <div className="bg-white p-6 rounded-[32px] border border-pink-100 shadow-sm space-y-6">
            
            {/* My Orders Section Header & Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pink-100">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="text-[#E91E8C]" size={20} />
                  <span>My Orders ({userOrders.length})</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Transactions linked to <span className="font-bold text-gray-700">{user?.email}</span>
                </p>
              </div>

              {/* Order Stats Badges */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-100 rounded-xl text-[11px] font-bold flex items-center gap-1">
                  <Clock size={12} /> {activeOrdersCount} Active
                </span>
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle size={12} /> {deliveredOrdersCount} Delivered
                </span>
              </div>
            </div>

            {/* Filter Controls & Search Bar */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1 w-full">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by Order ID, Product Name, Address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-pink-50/10 text-xs text-gray-800 pl-10 pr-4 py-2.5 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/15 transition"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status Filter Tabs */}
                <div className="flex items-center gap-1 p-1 bg-pink-50/40 rounded-xl border border-pink-100 w-full sm:w-auto shrink-0 overflow-x-auto">
                  {(['all', 'active', 'delivered', 'cancelled'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setStatusFilter(tab)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition cursor-pointer whitespace-nowrap ${
                        statusFilter === tab 
                          ? 'bg-[#E91E8C] text-white shadow-xs' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Orders Content List */}
            {loadingOrders ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="mx-auto text-[#E91E8C] animate-spin" size={28} />
                <p className="text-xs text-gray-500 font-medium">Retrieving past transactions linked to {user?.email}...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-pink-150 rounded-3xl bg-pink-50/10 space-y-4">
                <ShoppingBag className="mx-auto text-pink-300" size={42} />
                <div className="space-y-1">
                  <p className="text-sm font-extrabold text-gray-800">
                    {searchQuery || statusFilter !== 'all' ? 'No matching orders found' : 'No past transactions found'}
                  </p>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    {searchQuery || statusFilter !== 'all'
                      ? 'Try adjusting your search query or filter tab to locate your transaction.'
                      : `No orders logged under ${user?.email} yet. Once you complete checkout, your order history will appear here.`
                    }
                  </p>
                </div>
                {(searchQuery || statusFilter !== 'all') ? (
                  <button
                    onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                    className="px-4 py-2 bg-pink-100 hover:bg-pink-200 text-[#E91E8C] text-xs font-bold rounded-xl transition"
                  >
                    Reset Filters
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/')}
                    className="px-5 py-2.5 bg-[#E91E8C] text-white text-xs font-bold rounded-xl hover:bg-[#d0177c] transition shadow-md shadow-pink-100 flex items-center gap-2 mx-auto"
                  >
                    <span>Browse K-Beauty Catalog</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;

                  return (
                    <motion.div 
                      key={order.id} 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-pink-100 rounded-2xl bg-white hover:border-pink-200 transition shadow-xs overflow-hidden"
                    >
                      {/* Order Card Header */}
                      <div className="p-4 sm:p-5 bg-pink-50/20 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pink-100/60 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-gray-900 font-mono tracking-tight">{order.id}</span>
                            <button
                              onClick={() => handleCopyOrderId(order.id)}
                              title="Copy Order ID"
                              className="p-1 hover:bg-pink-100 rounded-md text-gray-400 hover:text-[#E91E8C] transition cursor-pointer"
                            >
                              {copiedOrderId === order.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                            <span className="text-[10px] px-2 py-0.5 bg-white text-gray-600 font-bold rounded-md border border-gray-200">
                              {order.sessionType === 'POS' ? 'In-Store POS' : 'Online COD'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {getStatusBadge(order.status)}
                            <button
                              onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                              className="text-xs font-bold text-[#E91E8C] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* Summary Info Bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase block">Date & Time</span>
                            <span className="font-semibold text-gray-800">
                              {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Amount</span>
                            <span className="font-extrabold text-[#E91E8C] font-mono">৳{order.totalAmount.toLocaleString()} BDT</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase block">Payment Status</span>
                            <span className={`font-bold ${order.isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {order.isPaid ? '✓ Paid' : 'Cash on Delivery'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase block">Items</span>
                            <span className="font-semibold text-gray-800">
                              {order.items.reduce((acc, i) => acc + i.quantity, 0)} item(s)
                            </span>
                          </div>
                        </div>

                        {/* Real-time Order Tracking Visual Progress Bar */}
                        <OrderStatusTracker status={order.status} />
                      </div>

                      {/* Purchased Items Preview */}
                      <div className="px-4 sm:px-5 py-3 border-t border-pink-50 space-y-2">
                        <div className="divide-y divide-gray-50">
                          {order.items.slice(0, isExpanded ? order.items.length : 2).map((item, idx) => (
                            <div key={idx} className="py-2.5 flex items-center justify-between text-xs gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-pink-50 text-[#E91E8C] flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {item.quantity}x
                                </div>
                                <span className="text-gray-800 font-medium truncate">{item.name}</span>
                              </div>
                              <span className="text-gray-700 font-mono font-bold shrink-0">
                                ৳{(item.price * item.quantity).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>

                        {!isExpanded && order.items.length > 2 && (
                          <p className="text-[11px] text-pink-600 font-bold pt-1 cursor-pointer" onClick={() => setExpandedOrderId(order.id)}>
                            + {order.items.length - 2} more item(s)...
                          </p>
                        )}
                      </div>

                      {/* Expanded Order Details Panel */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-pink-50/15 border-t border-pink-100 p-4 sm:p-5 space-y-4"
                          >
                            {/* Shipping & Recipient Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-white p-3.5 rounded-xl border border-pink-100">
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Recipient Contact</span>
                                <p className="font-bold text-gray-900">{order.customerName}</p>
                                <p className="text-gray-600 font-mono">{order.customerPhone}</p>
                                {order.customerEmail && <p className="text-gray-500 font-mono text-[11px]">{order.customerEmail}</p>}
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Delivery Address</span>
                                <p className="text-gray-700 leading-relaxed">{order.address}</p>
                              </div>
                            </div>

                            {/* Action Buttons for Order */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                              <a
                                href={`https://wa.me/8801700000000?text=Hello%20Korean%20Skin%20Food%20BD,%20I%20need%20assistance%20with%20my%20Order%20${order.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl border border-gray-200 text-xs flex items-center gap-1.5 transition"
                              >
                                <HelpCircle size={14} className="text-[#E91E8C]" />
                                <span>Need Help with Order?</span>
                              </a>

                              <button
                                onClick={() => handleReorder(order)}
                                className="px-4 py-2 bg-[#E91E8C] hover:bg-[#d0177c] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                              >
                                <RefreshCw size={14} />
                                <span>Reorder Items</span>
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
        </div>
      </div>
    </div>
  );
};
