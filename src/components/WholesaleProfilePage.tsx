import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
  WholesaleCustomer, 
  WholesaleOrder, 
  WholesalePayment, 
  WholesaleOrderStatus 
} from '../types';
import { 
  wholesaleService, 
  wholesaleLedgerService,
  validateWholesaleProfile, 
  isValidPhoneNumber, 
  isValidUrl,
  formatUrl
} from '../services/wholesaleService';
import { wholesaleOrderService } from '../services/wholesaleOrderService';
import { 
  Building2, User, Phone, Mail, MapPin, Globe, 
  CheckCircle2, AlertCircle, Save, ArrowLeft, ShieldCheck, 
  Clock, CreditCard, Sparkles, Store, ExternalLink, 
  BadgeCheck, HelpCircle, FileText, ChevronRight, ChevronLeft, Lock, 
  AlertTriangle, Truck, Receipt, DollarSign, TrendingUp, Wallet, 
  Eye, X, Search, Filter, Printer, Download, RefreshCw, Layers, 
  Calendar, ShoppingBag, Facebook, Instagram, Hash, Info, Check,
  Upload, Image as ImageIcon, Camera, Trash2, Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadFileToCloudinary, cloudinaryService } from '../services/cloudinaryService';

const BUSINESS_TYPES = [
  'Retailer',
  'Online Reseller',
  'Salon / Spa',
  'Wholesaler / Distributor',
  'Super Shop',
  'Dermatology / Clinic',
  'Other'
];

type ActiveTab = 'orders' | 'payments' | 'profile';

export const WholesaleProfilePage: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Active view tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('orders');

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wholesaleData, setWholesaleData] = useState<WholesaleCustomer | null>(null);
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [payments, setPayments] = useState<WholesalePayment[]>([]);

  // Filtering & Pagination for Orders
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [orderPage, setOrderPage] = useState(1);
  const ordersPerPage = 6;

  // Filtering & Pagination for Payments
  const [paymentSearchQuery, setPaymentSearchQuery] = useState<string>('');
  const [paymentPage, setPaymentPage] = useState(1);
  const paymentsPerPage = 8;

  // Selected Order for Details / Invoice Modal
  const [selectedOrder, setSelectedOrder] = useState<WholesaleOrder | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Form states for Profile tab
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [pageName, setPageName] = useState('');
  const [businessType, setBusinessType] = useState('Retailer');
  const [location, setLocation] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [facebookPageUrl, setFacebookPageUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [otherSocialInfo, setOtherSocialInfo] = useState('');
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState('');

  // Logo upload states
  const [logoUrl, setLogoUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [showLogoUrlInput, setShowLogoUrlInput] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  // UI status states
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Subscribe to wholesale customer record and real-time orders
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Subscribe to wholesale customer record
    const unsubCustomer = wholesaleService.subscribeWholesaleCustomer(user.uid, (customer) => {
      setWholesaleData(customer);

      if (customer) {
        setName(customer.name || profile?.name || user.displayName || '');
        setPhone(customer.phone || profile?.phone || '');
        setAltPhone(customer.altPhone || profile?.altPhone || '');
        setEmail(customer.email || user.email || '');
        setLogoUrl(customer.logoUrl || customer.businessLogoUrl || profile?.logoUrl || profile?.photoURL || '');
        setBusinessName(customer.businessName || customer.storeName || profile?.businessName || '');
        setPageName(customer.pageName || profile?.pageName || '');
        setBusinessType(customer.businessType || profile?.businessType || 'Retailer');
        setLocation(customer.location || profile?.location || '');
        setBusinessAddress(customer.businessAddress || customer.address || profile?.businessAddress || profile?.address || '');
        setFacebookPageUrl(customer.facebookPageUrl || profile?.facebookPageUrl || '');
        setInstagramUrl(customer.instagramUrl || profile?.instagramUrl || '');
        setWhatsappNumber(customer.whatsappNumber || profile?.whatsappNumber || customer.phone || '');
        setWebsiteUrl(customer.websiteUrl || profile?.websiteUrl || '');
        setOtherSocialInfo(customer.otherSocialInfo || profile?.otherSocialInfo || '');
        setTradeLicenseNumber(customer.tradeLicenseNumber || '');
      } else {
        // Fallback to auth profile
        setName(profile?.name || user.displayName || '');
        setPhone(profile?.phone || '');
        setAltPhone(profile?.altPhone || '');
        setEmail(user.email || '');
        setLogoUrl(profile?.logoUrl || profile?.photoURL || '');
        setBusinessName(profile?.businessName || '');
        setPageName(profile?.pageName || '');
        setBusinessType(profile?.businessType || 'Retailer');
        setLocation(profile?.location || '');
        setBusinessAddress(profile?.businessAddress || profile?.address || '');
        setFacebookPageUrl(profile?.facebookPageUrl || '');
        setInstagramUrl(profile?.instagramUrl || '');
        setWhatsappNumber(profile?.whatsappNumber || profile?.phone || '');
        setWebsiteUrl(profile?.websiteUrl || '');
        setOtherSocialInfo(profile?.otherSocialInfo || '');
      }
    });

    // 2. Subscribe to Wholesale Orders for this user
    const unsubOrders = wholesaleOrderService.subscribeWholesaleOrders(user.uid, (fetchedOrders) => {
      setOrders(fetchedOrders || []);
      setLoading(false);
    });

    // 3. Fetch Wholesale Payments
    loadPayments(user.uid);

    return () => {
      unsubCustomer();
      unsubOrders();
    };
  }, [user, profile]);

  const loadPayments = async (userId: string) => {
    try {
      const paymentList = await wholesaleLedgerService.getPayments(userId);
      setPayments(paymentList || []);
    } catch (err) {
      console.warn('[WholesaleProfile] Error loading payments:', err);
    }
  };

  const handleManualRefresh = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const [fetchedOrders, fetchedPayments, custDoc] = await Promise.all([
        wholesaleOrderService.getWholesaleOrders(user.uid),
        wholesaleLedgerService.getPayments(user.uid),
        wholesaleService.getWholesaleCustomer(user.uid)
      ]);
      setOrders(fetchedOrders || []);
      setPayments(fetchedPayments || []);
      if (custDoc) setWholesaleData(custDoc);
    } catch (err) {
      console.error('[WholesaleProfile] Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Process Device Logo Upload
  const processLogoUpload = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Please select a valid image file (PNG, JPG, WebP, SVG).' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Image size must be under 10MB.' });
      return;
    }

    setIsUploadingLogo(true);
    setUploadProgress(15);
    try {
      const uploadResult = await uploadFileToCloudinary(file, {
        folder: 'wholesale_logos',
        resourceType: 'image',
        onProgress: (pct) => setUploadProgress(pct)
      });

      if (!uploadResult?.secureUrl) {
        throw new Error('Upload completed without returning an image URL.');
      }

      const newUrl = uploadResult.secureUrl;
      setLogoUrl(newUrl);

      // Record metadata
      try {
        await cloudinaryService.uploadImage(file.name || 'Store Logo', newUrl, 'image');
      } catch (metaErr) {
        console.warn('Could not record image metadata:', metaErr);
      }

      // Auto-save to wholesale customer profile
      await wholesaleService.updateProfileByCustomer(user.uid, {
        logoUrl: newUrl,
        businessLogoUrl: newUrl
      });

      setFeedback({
        type: 'success',
        message: 'Business logo uploaded and updated successfully!'
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to upload logo:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to upload logo from device. Please check your network or try again.'
      });
    } finally {
      setIsUploadingLogo(false);
      setUploadProgress(0);
    }
  };

  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processLogoUpload(file);
    if (e.target) e.target.value = '';
  };

  const handleRemoveLogo = async () => {
    if (!user) return;
    setLogoUrl('');
    try {
      await wholesaleService.updateProfileByCustomer(user.uid, {
        logoUrl: '',
        businessLogoUrl: ''
      });
      setFeedback({
        type: 'success',
        message: 'Logo removed successfully.'
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to remove logo.'
      });
    }
  };

  // Validation
  const validate = (): boolean => {
    const formData: Partial<WholesaleCustomer> = {
      name,
      phone,
      altPhone,
      email,
      facebookPageUrl,
      instagramUrl,
      websiteUrl
    };

    const result = validateWholesaleProfile(formData);
    setValidationErrors(result.errors);
    return result.isValid;
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setFeedback(null);

    if (!validate()) {
      setFeedback({
        type: 'error',
        message: 'Please resolve the highlighted validation errors before saving.'
      });
      return;
    }

    setIsSaving(true);

    try {
      const payload: Partial<WholesaleCustomer> = {
        name: name.trim(),
        phone: phone.trim(),
        altPhone: altPhone.trim(),
        email: email.trim(),
        logoUrl: logoUrl.trim(),
        businessLogoUrl: logoUrl.trim(),
        businessName: businessName.trim(),
        storeName: businessName.trim(),
        pageName: pageName.trim(),
        businessType,
        location: location.trim(),
        businessAddress: businessAddress.trim(),
        address: businessAddress.trim(),
        facebookPageUrl: facebookPageUrl.trim(),
        instagramUrl: instagramUrl.trim(),
        whatsappNumber: whatsappNumber.trim(),
        websiteUrl: websiteUrl.trim(),
        otherSocialInfo: otherSocialInfo.trim(),
        tradeLicenseNumber: tradeLicenseNumber.trim()
      };

      await wholesaleService.updateProfileByCustomer(user.uid, payload);

      setFeedback({
        type: 'success',
        message: 'Wholesale customer profile updated successfully!'
      });

      setTimeout(() => {
        setFeedback(null);
      }, 4000);
    } catch (err: any) {
      console.error('[WholesaleProfile] Save error:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save profile changes. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Wholesale Verification Application
  const handleApplyWholesale = async () => {
    if (!user) return;
    setFeedback(null);

    if (!validate()) {
      setFeedback({
        type: 'error',
        message: 'Please complete the required name and phone fields to apply.'
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<WholesaleCustomer> = {
        name: name.trim(),
        phone: phone.trim(),
        altPhone: altPhone.trim(),
        email: email.trim(),
        logoUrl: logoUrl.trim(),
        businessLogoUrl: logoUrl.trim(),
        businessName: businessName.trim(),
        storeName: businessName.trim(),
        pageName: pageName.trim(),
        businessType,
        location: location.trim(),
        businessAddress: businessAddress.trim(),
        facebookPageUrl: facebookPageUrl.trim(),
        instagramUrl: instagramUrl.trim(),
        whatsappNumber: whatsappNumber.trim(),
        websiteUrl: websiteUrl.trim(),
        otherSocialInfo: otherSocialInfo.trim(),
        tradeLicenseNumber: tradeLicenseNumber.trim()
      };

      await wholesaleService.applyForWholesale(user.uid, payload);

      setFeedback({
        type: 'success',
        message: 'Wholesale registration application submitted for review. Our accounts team will contact you shortly.'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit wholesale application.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Financial Computations
  const totalWholesaleCost = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.totalWholesaleCost || 0), 0);
  }, [orders]);

  const totalCODValue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.totalCODValue || 0), 0);
  }, [orders]);

  const totalProfit = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.totalProfit || 0), 0);
  }, [orders]);

  const totalPaid = useMemo(() => {
    if (wholesaleData?.totalPaid !== undefined) {
      return Number(wholesaleData.totalPaid);
    }
    const paymentSum = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const orderPaidSum = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    return Math.max(paymentSum, orderPaidSum);
  }, [wholesaleData, payments, orders]);

  const totalDue = useMemo(() => {
    if (wholesaleData?.totalDue !== undefined && wholesaleData.totalDue !== null) {
      return Number(wholesaleData.totalDue);
    }
    if (wholesaleData?.currentDue !== undefined && wholesaleData.currentDue !== null) {
      return Number(wholesaleData.currentDue);
    }
    return Math.max(0, totalWholesaleCost - totalPaid);
  }, [wholesaleData, totalWholesaleCost, totalPaid]);

  const creditLimit = wholesaleData?.creditLimit || 0;
  const availableCredit = Math.max(0, creditLimit - totalDue);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Status filter
      if (orderStatusFilter !== 'all' && order.status !== orderStatusFilter) {
        return false;
      }
      // Search query
      if (orderSearchQuery.trim()) {
        const query = orderSearchQuery.toLowerCase().trim();
        const matchesNumber = (order.orderNumber || order.id || '').toLowerCase().includes(query);
        const matchesProduct = (order.items || []).some(item => 
          (item.productName || '').toLowerCase().includes(query) ||
          (item.sku || '').toLowerCase().includes(query)
        );
        const matchesDelivery = (order.checkoutInfo as any)?.deliveryName?.toLowerCase().includes(query);
        if (!matchesNumber && !matchesProduct && !matchesDelivery) {
          return false;
        }
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderSearchQuery]);

  // Paginated Orders
  const totalOrderPages = Math.ceil(filteredOrders.length / ordersPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (orderPage - 1) * ordersPerPage;
    return filteredOrders.slice(start, start + ordersPerPage);
  }, [filteredOrders, orderPage, ordersPerPage]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    if (!paymentSearchQuery.trim()) return payments;
    const q = paymentSearchQuery.toLowerCase().trim();
    return payments.filter(p => 
      (p.reference || '').toLowerCase().includes(q) ||
      (p.orderId || '').toLowerCase().includes(q) ||
      (p.paymentMethod || '').toLowerCase().includes(q) ||
      (p.note || '').toLowerCase().includes(q)
    );
  }, [payments, paymentSearchQuery]);

  // Paginated Payments
  const totalPaymentPages = Math.ceil(filteredPayments.length / paymentsPerPage) || 1;
  const paginatedPayments = useMemo(() => {
    const start = (paymentPage - 1) * paymentsPerPage;
    return filteredPayments.slice(start, start + paymentsPerPage);
  }, [filteredPayments, paymentPage, paymentsPerPage]);

  // Status counts for order tabs
  const orderCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: orders.length,
      pending: 0,
      confirmed: 0,
      processing: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0
    };
    orders.forEach(o => {
      if (counts[o.status] !== undefined) {
        counts[o.status] += 1;
      }
    });
    return counts;
  }, [orders]);

  const isWholesaleVerified = profile?.wholesaleAccess === true || wholesaleData?.wholesaleAccess === true;
  const accountStatus = wholesaleData?.status || (profile?.wholesaleAccess ? 'active' : 'pending');

  const printCurrentInvoice = () => {
    if (!selectedOrder) return;
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  const getStatusBadge = (status: WholesaleOrderStatus | string) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            <span className="uppercase">Delivered</span>
          </span>
        );
      case 'processing':
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
            <Truck size={12} className="text-blue-600" />
            <span className="uppercase">{status}</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Check size={12} className="text-indigo-600" />
            <span className="uppercase">Confirmed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle size={12} className="text-rose-600" />
            <span className="uppercase">Cancelled</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} className="text-amber-600" />
            <span className="uppercase">Pending</span>
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-pink-200 border-t-[#E91E8C] rounded-full animate-spin" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loading Wholesale Profile & Orders...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-pink-100 p-8 text-center shadow-lg">
          <div className="w-14 h-14 bg-pink-50 text-[#E91E8C] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-pink-100">
            <Lock size={28} />
          </div>
          <h2 className="text-lg font-black text-gray-900 mb-2">Wholesale Partner Portal</h2>
          <p className="text-xs text-gray-600 mb-6 leading-relaxed">
            Please sign in with your account to access your wholesale orders, status tracking, payments, and dues.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#E91E8C] hover:bg-pink-600 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-pink-200"
          >
            Sign In to Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-1">
            <Link to="/profile" className="hover:text-[#E91E8C] flex items-center gap-1 transition">
              <ArrowLeft size={13} />
              <span>Customer Hub</span>
            </Link>
            <ChevronRight size={12} />
            <span className="text-gray-700">Wholesale Profile & Portal</span>
          </div>

          <div className="flex items-center gap-3.5 mt-1">
            {logoUrl ? (
              <div className="w-12 h-12 rounded-2xl bg-white border border-pink-200 p-1 shadow-xs shrink-0 overflow-hidden flex items-center justify-center">
                <img 
                  src={logoUrl} 
                  alt={businessName || 'Business Logo'} 
                  className="w-full h-full object-contain" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-[#E91E8C] shrink-0 font-black shadow-xs">
                <Store size={22} />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <span>{businessName || name || 'Wholesale Customer Profile'}</span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {pageName ? `${pageName} • ` : ''}Live order tracking, delivery status, payment history, and ledger.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons & Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh Orders & Ledger"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#E91E8C]' : 'text-gray-500'} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            to="/wholesale/checkout"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E91E8C] hover:bg-[#d0177c] text-white text-xs font-black shadow-xs transition"
          >
            <Truck size={14} />
            <span>Wholesale Checkout</span>
          </Link>

          {isWholesaleVerified ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <BadgeCheck size={15} className="text-emerald-600" />
              <span>Verified Partner</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black shadow-2xs">
              <Clock size={15} className="text-amber-600" />
              <span>Pending Approval</span>
            </div>
          )}
        </div>
      </div>

      {/* Alert Banner for Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl border flex items-start gap-3 text-xs font-bold ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-xs'
                : 'bg-rose-50 border-rose-200 text-rose-800 shadow-xs'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p>{feedback.message}</p>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer text-xs"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification Alert if not verified */}
      {!isWholesaleVerified && (
        <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-pink-50 border border-pink-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#E91E8C] shadow-xs border border-pink-100 shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900">Unlock Tiered Wholesale B2B Pricing</h2>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                Complete your business information in the Profile tab below to get approved for wholesale tier discounts, 
                official invoices, and credit line billing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleApplyWholesale}
            disabled={isSaving}
            className="px-4 py-2 bg-[#E91E8C] hover:bg-pink-600 text-white rounded-xl text-xs font-extrabold transition shadow-sm shadow-pink-200 shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Submitting...' : 'Apply for Wholesale Verification'}
          </button>
        </div>
      )}

      {/* 1. FINANCIAL & DUE OVERVIEW STAT CARDS (Top KPI Summary) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Total Orders */}
        <div className="bg-white p-4 sm:p-4.5 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-pink-200 transition">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">Total Orders</span>
            <Receipt size={15} className="text-[#E91E8C]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900">{orders.length}</div>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
            {orders.reduce((s, o) => s + (o.totalUnits || o.items?.reduce((is, i) => is + i.quantity, 0) || 0), 0)} units ordered
          </p>
        </div>

        {/* Wholesale Purchase Cost */}
        <div className="bg-white p-4 sm:p-4.5 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-indigo-200 transition">
          <div className="flex items-center justify-between text-indigo-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700">Wholesale Cost</span>
            <DollarSign size={15} className="text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-950 font-mono">
            ৳{totalWholesaleCost.toLocaleString()}
          </div>
          <p className="text-[10px] text-indigo-500 font-medium mt-0.5">B2B Base Price</p>
        </div>

        {/* Total COD / Retail Selling Value */}
        <div className="bg-white p-4 sm:p-4.5 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-emerald-200 transition">
          <div className="flex items-center justify-between text-emerald-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">COD Selling Value</span>
            <TrendingUp size={15} className="text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
            ৳{totalCODValue.toLocaleString()}
          </div>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Customer Bill Value</p>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-4 sm:p-4.5 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-teal-200 transition">
          <div className="flex items-center justify-between text-teal-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-teal-700">Total Profit</span>
            <Sparkles size={15} className="text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-900 font-mono">
            ৳{totalProfit.toLocaleString()}
          </div>
          <p className="text-[10px] text-teal-600 font-medium mt-0.5">Your Gross Margin</p>
        </div>

        {/* Total Paid */}
        <div className="bg-white p-4 sm:p-4.5 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-blue-200 transition">
          <div className="flex items-center justify-between text-blue-500 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">Total Paid</span>
            <CreditCard size={15} className="text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-950 font-mono">
            ৳{totalPaid.toLocaleString()}
          </div>
          <p className="text-[10px] text-blue-600 font-medium mt-0.5">Settled Payments</p>
        </div>

        {/* Current Due (Highlighted) */}
        <div className={`p-4 sm:p-4.5 rounded-2xl border shadow-2xs transition ${
          totalDue > 0 
            ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300' 
            : 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-black uppercase tracking-wider ${
              totalDue > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}>
              Current Due
            </span>
            <Wallet size={15} className={totalDue > 0 ? 'text-rose-600' : 'text-emerald-600'} />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono ${
            totalDue > 0 ? 'text-rose-900' : 'text-emerald-900'
          }`}>
            ৳{totalDue.toLocaleString()}
          </div>
          <p className={`text-[10px] font-bold mt-0.5 ${
            totalDue > 0 ? 'text-rose-600' : 'text-emerald-600'
          }`}>
            {totalDue > 0 ? 'Outstanding Balance' : 'Fully Settled (৳0)'}
          </p>
        </div>

      </div>

      {/* 2. TABBED NAVIGATION BAR */}
      <div className="bg-white rounded-2xl border border-pink-100/80 p-1.5 shadow-2xs flex flex-wrap gap-1.5 items-center justify-between">
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 w-full sm:w-auto">
          
          {/* Tab 1: Orders */}
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#E91E8C] text-white shadow-xs'
                : 'text-gray-600 hover:bg-pink-50/60 hover:text-gray-900'
            }`}
          >
            <Receipt size={15} />
            <span>Wholesale Orders</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {orders.length}
            </span>
          </button>

          {/* Tab 2: Payments & Due Ledger */}
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-[#E91E8C] text-white shadow-xs'
                : 'text-gray-600 hover:bg-pink-50/60 hover:text-gray-900'
            }`}
          >
            <CreditCard size={15} />
            <span>Payments & Dues</span>
            {totalDue > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'payments' ? 'bg-rose-900 text-white' : 'bg-rose-100 text-rose-700 font-bold'
              }`}>
                Due: ৳{totalDue.toLocaleString()}
              </span>
            )}
          </button>

          {/* Tab 3: Profile & Settings */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#E91E8C] text-white shadow-xs'
                : 'text-gray-600 hover:bg-pink-50/60 hover:text-gray-900'
            }`}
          >
            <User size={15} />
            <span>Business Profile & Info</span>
          </button>
        </div>

        {/* Account Info Pill */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1 text-xs text-gray-500">
          <span>Credit Limit: <strong className="text-gray-900 font-mono">৳{creditLimit.toLocaleString()}</strong></span>
          <span className="text-gray-300">•</span>
          <span>Avail. Credit: <strong className="text-emerald-700 font-mono">৳{availableCredit.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* 3. TAB 1: WHOLESALE ORDERS LIST & STATUS TRACKING */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          
          {/* Controls: Search & Status Filter Chips */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs space-y-3">
            
            {/* Search and Quick Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => {
                    setOrderSearchQuery(e.target.value);
                    setOrderPage(1);
                  }}
                  placeholder="Search by order #, product name, or recipient..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:border-[#E91E8C] transition"
                />
                {orderSearchQuery && (
                  <button
                    onClick={() => setOrderSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Action Button */}
              <Link
                to="/wholesale/checkout"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition shadow-2xs"
              >
                <ShoppingBag size={14} />
                <span>New Wholesale Order</span>
              </Link>
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                <Filter size={12} /> Status:
              </span>
              {[
                { id: 'all', label: 'All Orders', count: orderCounts.all },
                { id: 'pending', label: 'Pending', count: orderCounts.pending },
                { id: 'confirmed', label: 'Confirmed', count: orderCounts.confirmed },
                { id: 'processing', label: 'Processing', count: orderCounts.processing },
                { id: 'ready', label: 'Ready for Dispatch', count: orderCounts.ready },
                { id: 'delivered', label: 'Delivered', count: orderCounts.delivered },
                { id: 'cancelled', label: 'Cancelled', count: orderCounts.cancelled }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setOrderStatusFilter(tab.id);
                    setOrderPage(1);
                  }}
                  className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    orderStatusFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    orderStatusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-white text-gray-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

          </div>

          {/* Orders Table Container */}
          <div className="bg-white border border-gray-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-[#E91E8C] flex items-center justify-center font-bold">
                  <Receipt size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Wholesale Orders List</h3>
                  <p className="text-[11px] text-gray-500">Live order status, invoice details, and client profit tracking</p>
                </div>
              </div>
              <span className="text-xs font-bold text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
              </span>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 sm:p-4">Order #</th>
                    <th className="p-3.5 sm:p-4">Date & Time</th>
                    <th className="p-3.5 sm:p-4">Items / Products</th>
                    <th className="p-3.5 sm:p-4 text-right">Wholesale Cost</th>
                    <th className="p-3.5 sm:p-4 text-right">COD / Selling</th>
                    <th className="p-3.5 sm:p-4 text-right">Profit</th>
                    <th className="p-3.5 sm:p-4 text-right">Paid / Due</th>
                    <th className="p-3.5 sm:p-4 text-center">Checkout</th>
                    <th className="p-3.5 sm:p-4 text-center">Status</th>
                    <th className="p-3.5 sm:p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-10 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Receipt size={36} className="text-gray-300" />
                          <p className="font-bold text-gray-700 text-sm">No wholesale orders found.</p>
                          <p className="text-xs text-gray-400 max-w-sm">
                            {orderSearchQuery || orderStatusFilter !== 'all'
                              ? 'Try clearing your search query or changing your status filter.'
                              : 'You have not submitted any wholesale orders yet.'}
                          </p>
                          <Link
                            to="/wholesale/checkout"
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E91E8C] text-white text-xs font-bold shadow-xs hover:bg-pink-600 transition"
                          >
                            <ShoppingBag size={14} />
                            <span>Create First Wholesale Order</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map(order => {
                      const totalQty = order.items?.reduce((s, i) => s + i.quantity, 0) || order.totalUnits || 0;
                      const firstItem = order.items?.[0];
                      const firstTitle = firstItem?.productName || 'Wholesale Product';
                      const moreCount = (order.items?.length || 0) > 1 ? ` +${order.items.length - 1} more` : '';
                      const isOrderDue = (order.dueAmount || 0) > 0;

                      return (
                        <tr key={order.id} className="hover:bg-pink-50/30 transition-colors">
                          
                          {/* Order Number */}
                          <td className="p-3.5 sm:p-4 font-mono font-black text-gray-900 text-xs">
                            <span className="text-[#E91E8C]">#</span>{order.orderNumber || order.id.slice(0, 8)}
                          </td>

                          {/* Date */}
                          <td className="p-3.5 sm:p-4 text-gray-600 whitespace-nowrap">
                            <div className="font-bold text-gray-800">
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Recent'}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                          </td>

                          {/* Items Summary */}
                          <td className="p-3.5 sm:p-4 max-w-[220px]">
                            <div className="font-bold text-gray-900 truncate" title={firstTitle}>
                              {firstTitle}{moreCount}
                            </div>
                            <div className="text-[11px] text-gray-500 font-semibold flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 bg-gray-100 rounded text-gray-700 font-mono font-bold">
                                {totalQty} {totalQty === 1 ? 'unit' : 'units'}
                              </span>
                              <span>•</span>
                              <span>{order.items?.length || 1} SKUs</span>
                            </div>
                          </td>

                          {/* Wholesale Cost */}
                          <td className="p-3.5 sm:p-4 text-right font-mono font-black text-gray-900">
                            ৳{(order.totalWholesaleCost || 0).toLocaleString()}
                          </td>

                          {/* COD Selling Value */}
                          <td className="p-3.5 sm:p-4 text-right font-mono font-black text-emerald-700">
                            ৳{(order.totalCODValue || 0).toLocaleString()}
                          </td>

                          {/* Net Profit */}
                          <td className="p-3.5 sm:p-4 text-right font-mono font-black text-teal-700">
                            +৳{(order.totalProfit || 0).toLocaleString()}
                          </td>

                          {/* Paid / Due */}
                          <td className="p-3.5 sm:p-4 text-right">
                            <div className="font-mono font-bold text-blue-700 text-xs">
                              ৳{(order.paidAmount || 0).toLocaleString()}
                            </div>
                            <div className={`font-mono text-[10px] font-bold ${isOrderDue ? 'text-rose-600' : 'text-gray-400'}`}>
                              {isOrderDue ? `Due: ৳${(order.dueAmount || 0).toLocaleString()}` : 'Settled'}
                            </div>
                          </td>

                          {/* Checkout Type */}
                          <td className="p-3.5 sm:p-4 text-center">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-extrabold rounded-md uppercase border border-gray-200">
                              {order.checkoutInfo?.checkoutType === 'COD' || order.checkoutInfo?.checkoutType === 'COD_DIRECT' ? 'COD' : 'Parcel'}
                            </span>
                          </td>

                          {/* Order Status */}
                          <td className="p-3.5 sm:p-4 text-center whitespace-nowrap">
                            {getStatusBadge(order.status)}
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3.5 sm:p-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-50 hover:bg-[#E91E8C] text-[#E91E8C] hover:text-white font-bold text-xs border border-pink-200 transition cursor-pointer"
                              title="View full order details & invoice"
                            >
                              <Eye size={13} />
                              <span>Details</span>
                            </button>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalOrderPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-slate-50/60">
                <span className="text-xs font-bold text-gray-500">
                  Showing page {orderPage} of {totalOrderPages} ({filteredOrders.length} total orders)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOrderPage(p => Math.max(p - 1, 1))}
                    disabled={orderPage === 1}
                    className="p-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-mono font-bold px-2 text-gray-700">
                    {orderPage} / {totalOrderPages}
                  </span>
                  <button
                    onClick={() => setOrderPage(p => Math.min(p + 1, totalOrderPages))}
                    disabled={orderPage === totalOrderPages}
                    className="p-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* 4. TAB 2: PAYMENTS & DUE LEDGER */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          
          {/* Due & Credit Balance Hero Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-black uppercase tracking-wider border border-pink-500/30">
                    Wholesale Credit & Due Ledger
                  </span>
                  <span className="text-xs text-slate-400">Account ID: <code className="text-slate-200">{user.uid.slice(0, 10)}</code></span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-baseline gap-3">
                  <span className="text-slate-400 text-lg font-normal">Outstanding Due:</span>
                  <span className={`font-mono ${totalDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ৳{totalDue.toLocaleString()}
                  </span>
                </h2>

                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  {totalDue > 0
                    ? `You have an outstanding due of ৳${totalDue.toLocaleString()}. You can settle payments via bKash Merchant, Bank Deposit, or cash on delivery reconciliation.`
                    : 'Your wholesale account has zero outstanding due. All orders and accounts are completely balanced and settled.'}
                </p>
              </div>

              {/* Quick Credit Meter */}
              <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl space-y-2 min-w-[240px]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Approved Credit:</span>
                  <span className="font-mono font-bold text-white">৳{creditLimit.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Paid:</span>
                  <span className="font-mono font-bold text-emerald-400">৳{totalPaid.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Payment Terms:</span>
                  <span className="font-bold text-slate-200 text-[11px]">{wholesaleData?.paymentTerms || 'Standard Invoice / COD'}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Payment Transactions Table */}
          <div className="bg-white border border-gray-200/90 rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Recorded Payment History</h3>
                  <p className="text-[11px] text-gray-500">Official transaction entries, ledger deposits, and due adjustments</p>
                </div>
              </div>

              {/* Search in Payments */}
              <div className="relative max-w-xs w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={paymentSearchQuery}
                  onChange={(e) => {
                    setPaymentSearchQuery(e.target.value);
                    setPaymentPage(1);
                  }}
                  placeholder="Filter by reference, order ID, note..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:border-[#E91E8C]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 sm:p-4">Payment Date</th>
                    <th className="p-3.5 sm:p-4">Amount</th>
                    <th className="p-3.5 sm:p-4">Method</th>
                    <th className="p-3.5 sm:p-4">Reference / Order</th>
                    <th className="p-3.5 sm:p-4">Remaining Due</th>
                    <th className="p-3.5 sm:p-4">Recorded By</th>
                    <th className="p-3.5 sm:p-4">Note / Memo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CreditCard size={36} className="text-gray-300" />
                          <p className="font-bold text-gray-700 text-sm">No payments recorded yet.</p>
                          <p className="text-xs text-gray-400 max-w-sm">
                            When payments or invoice settlements are confirmed by the accounts team, they will automatically appear here.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPayments.map(payment => (
                      <tr key={payment.id} className="hover:bg-emerald-50/30 transition-colors">
                        
                        {/* Date */}
                        <td className="p-3.5 sm:p-4 whitespace-nowrap">
                          <div className="font-bold text-gray-800">
                            {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'Recent'}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {payment.createdAt ? new Date(payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="p-3.5 sm:p-4 font-mono font-black text-emerald-700 text-sm">
                          ৳{(payment.amount || 0).toLocaleString()}
                        </td>

                        {/* Payment Method */}
                        <td className="p-3.5 sm:p-4">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 text-[11px] font-bold border border-gray-200">
                            {payment.paymentMethod || 'bKash / Bank'}
                          </span>
                        </td>

                        {/* Reference / Order ID */}
                        <td className="p-3.5 sm:p-4 font-mono font-bold text-indigo-600 text-xs">
                          {payment.reference || payment.orderId || 'General Deposit'}
                        </td>

                        {/* Remaining Due */}
                        <td className="p-3.5 sm:p-4 font-mono text-xs font-semibold text-gray-700">
                          {payment.remainingDue !== undefined ? `৳${payment.remainingDue.toLocaleString()}` : '-'}
                        </td>

                        {/* Recorded By */}
                        <td className="p-3.5 sm:p-4 text-xs font-semibold text-gray-600">
                          {payment.createdBy || 'Accounts Admin'}
                        </td>

                        {/* Note */}
                        <td className="p-3.5 sm:p-4 text-xs text-gray-500 italic max-w-xs truncate">
                          {payment.note || 'No notes'}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPaymentPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-slate-50/60">
                <span className="text-xs font-bold text-gray-500">
                  Showing page {paymentPage} of {totalPaymentPages} ({filteredPayments.length} total payments)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPaymentPage(p => Math.max(p - 1, 1))}
                    disabled={paymentPage === 1}
                    className="p-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-mono font-bold px-2 text-gray-700">
                    {paymentPage} / {totalPaymentPages}
                  </span>
                  <button
                    onClick={() => setPaymentPage(p => Math.min(p + 1, totalPaymentPages))}
                    disabled={paymentPage === totalPaymentPages}
                    className="p-1.5 border border-gray-200 rounded-lg bg-white text-gray-700 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Payment Guidance Card */}
          <div className="bg-pink-50/50 border border-pink-100 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Info size={15} className="text-[#E91E8C]" />
              <span>How Wholesale Payments & Dues Work</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600 leading-relaxed">
              <div className="p-3 bg-white rounded-xl border border-pink-100 space-y-1">
                <strong className="text-gray-900 block font-bold">1. Order Submission</strong>
                <p>When you place wholesale orders, your wholesale purchase price is added to your account ledger.</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-pink-100 space-y-1">
                <strong className="text-gray-900 block font-bold">2. COD Reconciliation</strong>
                <p>When Steadfast or courier delivers the package and collects COD cash, the collected amount is credited to offset your dues.</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-pink-100 space-y-1">
                <strong className="text-gray-900 block font-bold">3. Bank / bKash Settlement</strong>
                <p>Direct bank transfers or bKash payments are verified and recorded by our accounts team immediately.</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 5. TAB 3: BUSINESS & PERSONAL PROFILE SETTINGS */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Columns: Editable Sections */}
            <div className="lg:col-span-2 space-y-6">

              {/* BRAND / STORE LOGO UPLOAD (FROM DEVICE) */}
              <div className="bg-white rounded-3xl border border-pink-100 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-pink-50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-pink-50 text-[#E91E8C] flex items-center justify-center font-black">
                      <ImageIcon size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900">ব্যবসার লোগো (Business / Shop Logo)</h3>
                      <p className="text-[11px] text-gray-400">Upload your brand/store logo from your device for order documents & portal</p>
                    </div>
                  </div>
                  {logoUrl && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold border border-emerald-200 flex items-center gap-1">
                      <Check size={11} /> Logo Active
                    </span>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoFileSelect}
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Current Logo / Placeholder Preview */}
                  <div className="relative group shrink-0">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-pink-50 to-purple-50 border-2 border-dashed border-pink-200 flex items-center justify-center p-2 overflow-hidden shadow-xs">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt="Store Logo Preview" 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-2 text-pink-400">
                          <Camera size={26} className="mb-1" />
                          <span className="text-[10px] font-bold">No Logo</span>
                        </div>
                      )}
                    </div>

                    {logoUrl && !isUploadingLogo && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md transition cursor-pointer"
                        title="Remove Logo"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  {/* Actions and Dropzone */}
                  <div className="flex-1 w-full space-y-2.5">
                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingLogo(true);
                      }}
                      onDragLeave={() => setIsDraggingLogo(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingLogo(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) processLogoUpload(file);
                      }}
                      onClick={() => logoInputRef.current?.click()}
                      className={`p-4 rounded-2xl border-2 border-dashed text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        isDraggingLogo 
                          ? 'border-[#E91E8C] bg-pink-50/70 scale-[0.99]' 
                          : 'border-pink-200 hover:border-[#E91E8C] bg-pink-50/20 hover:bg-pink-50/40'
                      }`}
                    >
                      <Upload size={20} className={isUploadingLogo ? 'animate-bounce text-[#E91E8C]' : 'text-pink-500'} />
                      <p className="text-xs font-black text-gray-800">
                        {isUploadingLogo ? 'লোগো আপলোড হচ্ছে...' : 'ডিভাইস থেকে লোগো সিলেক্ট করুন (Select from Device)'}
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium">
                        Drag and drop image here, or click to browse (PNG, JPG, WebP, SVG • Max 10MB)
                      </p>
                    </div>

                    {/* Upload Progress Bar */}
                    {isUploadingLogo && (
                      <div className="space-y-1 bg-pink-50/60 p-2.5 rounded-xl border border-pink-100">
                        <div className="flex justify-between text-[11px] font-bold text-[#E91E8C]">
                          <span className="flex items-center gap-1">
                            <RefreshCw size={11} className="animate-spin" /> Uploading to server...
                          </span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-pink-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-[#E91E8C] h-full transition-all duration-300 rounded-full"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Secondary Actions: URL Input Toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setShowLogoUrlInput(!showLogoUrlInput)}
                        className="text-[11px] font-bold text-gray-500 hover:text-[#E91E8C] flex items-center gap-1 transition cursor-pointer"
                      >
                        <LinkIcon size={12} />
                        <span>{showLogoUrlInput ? 'Hide URL field' : 'Or enter Image URL manually'}</span>
                      </button>

                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={isUploadingLogo}
                          className="text-[11px] font-bold text-[#E91E8C] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Upload size={11} /> Change Logo
                        </button>
                      )}
                    </div>

                    {/* Direct URL input if expanded */}
                    {showLogoUrlInput && (
                      <div className="pt-2">
                        <input
                          type="url"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="https://example.com/your-store-logo.png"
                          className="w-full px-3.5 py-2 rounded-xl border border-pink-200 text-xs font-medium focus:outline-none focus:border-[#E91E8C]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 1. PERSONAL INFORMATION */}
              <div className="bg-white rounded-3xl border border-pink-100 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-pink-50">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 text-[#E91E8C] flex items-center justify-center font-black">
                    <User size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">1. Personal Information</h3>
                    <p className="text-[11px] text-gray-400">Primary authorized contact for wholesale orders</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (validationErrors.name) setValidationErrors({ ...validationErrors, name: '' });
                      }}
                      placeholder="Enter contact person's name"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition ${
                        validationErrors.name 
                          ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500' 
                          : 'border-pink-200 focus:border-[#E91E8C]'
                      }`}
                    />
                    {validationErrors.name && (
                      <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                        <AlertCircle size={12} /> {validationErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Contact Number */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Contact Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (validationErrors.phone) setValidationErrors({ ...validationErrors, phone: '' });
                      }}
                      placeholder="e.g. 01712345678"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition ${
                        validationErrors.phone 
                          ? 'border-rose-300 bg-rose-50/30 focus:border-rose-500' 
                          : 'border-pink-200 focus:border-[#E91E8C]'
                      }`}
                    />
                    {validationErrors.phone && (
                      <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                        <AlertCircle size={12} /> {validationErrors.phone}
                      </p>
                    )}
                  </div>

                  {/* Alternative Contact Number */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Alternative Contact Number <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={altPhone}
                      onChange={(e) => {
                        setAltPhone(e.target.value);
                        if (validationErrors.altPhone) setValidationErrors({ ...validationErrors, altPhone: '' });
                      }}
                      placeholder="e.g. 01812345678"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 focus:border-[#E91E8C] text-xs font-semibold focus:outline-none transition"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Email Address <span className="text-gray-400 font-normal">(Verified Account)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-xs font-mono cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* 2. BUSINESS INFORMATION */}
              <div className="bg-white rounded-3xl border border-pink-100 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-pink-50">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                    <Store size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">2. Business Information</h3>
                    <p className="text-[11px] text-gray-400">Shop, salon, online page, or distribution entity</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Business Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Business / Company Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Glow Aesthetics BD / K-Glam Parlor"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 focus:border-[#E91E8C] text-xs font-semibold focus:outline-none transition"
                    />
                  </div>

                  {/* Page Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Facebook / Storefront Page Name
                    </label>
                    <input
                      type="text"
                      value={pageName}
                      onChange={(e) => setPageName(e.target.value)}
                      placeholder="e.g. Korean Cosmetics Dhaka"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 focus:border-[#E91E8C] text-xs font-semibold focus:outline-none transition"
                    />
                  </div>

                  {/* Business Type */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Business Type
                    </label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 focus:border-[#E91E8C] text-xs font-semibold focus:outline-none transition bg-white"
                    >
                      {BUSINESS_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location / District */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Location / District
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Dhanmondi, Dhaka / Chattogram"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 focus:border-[#E91E8C] text-xs font-semibold focus:outline-none transition"
                    />
                  </div>

                  {/* Trade License (Optional) */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Trade License / Registration Number <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={tradeLicenseNumber}
                      onChange={(e) => setTradeLicenseNumber(e.target.value)}
                      placeholder="e.g. TRAD/DNCC/123456/2026"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 focus:border-[#E91E8C] text-xs font-mono focus:outline-none transition"
                    />
                  </div>

                  {/* Full Business Address */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Full Business / Delivery Address
                    </label>
                    <textarea
                      rows={2}
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      placeholder="Shop #, Building, Road, Area, Thana, District"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 focus:border-[#E91E8C] text-xs font-semibold focus:outline-none transition resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. CONTACT & SOCIAL CHANNELS */}
              <div className="bg-white rounded-3xl border border-pink-100 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-pink-50">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                    <Globe size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">3. Contact & Social Channels</h3>
                    <p className="text-[11px] text-gray-400">Social channels and direct business messaging links</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Facebook Page URL */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Facebook Page URL
                    </label>
                    <input
                      type="text"
                      value={facebookPageUrl}
                      onChange={(e) => {
                        setFacebookPageUrl(e.target.value);
                        if (validationErrors.facebookPageUrl) setValidationErrors({ ...validationErrors, facebookPageUrl: '' });
                      }}
                      placeholder="https://facebook.com/yourpagename"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 focus:border-[#E91E8C] text-xs font-semibold focus:outline-none transition"
                    />
                  </div>

                  {/* WhatsApp Number */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      WhatsApp Order Number
                    </label>
                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="e.g. 01712345678"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 focus:border-[#E91E8C] text-xs font-semibold focus:outline-none transition"
                    />
                  </div>

                  {/* Instagram URL */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Instagram URL / Handle
                    </label>
                    <input
                      type="text"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/yourbrand"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 focus:border-[#E91E8C] text-xs font-semibold focus:outline-none transition"
                    />
                  </div>

                  {/* Website URL */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Website URL
                    </label>
                    <input
                      type="text"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 focus:border-[#E91E8C] text-xs font-semibold focus:outline-none transition"
                    />
                  </div>

                  {/* Other Social Info */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Other Social Media / Notes
                    </label>
                    <input
                      type="text"
                      value={otherSocialInfo}
                      onChange={(e) => setOtherSocialInfo(e.target.value)}
                      placeholder="TikTok, YouTube, or additional contact notes"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 focus:border-[#E91E8C] text-xs font-semibold focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <Link
                  to="/profile"
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
                >
                  Back to Hub
                </Link>
                
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#E91E8C] hover:bg-pink-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-pink-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Right Column: Account Status & Privileges */}
            <div className="space-y-6">
              
              {/* Account Status Card */}
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 sm:p-6 text-white shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-pink-400" />
                    <h3 className="text-sm font-black tracking-tight">Wholesale Account</h3>
                  </div>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                    Managed
                  </span>
                </div>

                {/* Status Indicator */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Wholesale Access:</span>
                    <span className={`font-black ${isWholesaleVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isWholesaleVerified ? 'AUTHORIZED' : 'PENDING APPROVAL'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Account Status:</span>
                    <span className="font-bold uppercase text-slate-200">
                      {accountStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Wholesale Tier:</span>
                    <span className="font-bold uppercase text-pink-300">
                      {wholesaleData?.tier || 'Standard Tier'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Customer Since:</span>
                    <span className="font-mono text-slate-300 text-[11px]">
                      {wholesaleData?.customerSince ? new Date(wholesaleData.customerSince).toLocaleDateString() : 'Active User'}
                    </span>
                  </div>
                </div>

                {/* Credit & Financial Summary */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Approved Credit Limit:</span>
                      <span className="font-mono font-black text-emerald-400">
                        ৳{creditLimit.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Outstanding Due:</span>
                      <span className={`font-mono font-black ${totalDue > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                        ৳{totalDue.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Payment Terms:</span>
                      <span className="text-slate-200 text-[11px] font-semibold">
                        {wholesaleData?.paymentTerms || 'Standard Invoice / COD'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Admin Advisory */}
                {wholesaleData?.notes && (
                  <div className="p-3 bg-pink-950/30 border border-pink-900/40 rounded-2xl text-[11px] text-pink-200 space-y-1">
                    <p className="font-bold text-pink-300 flex items-center gap-1">
                      <FileText size={12} /> Account Advisory
                    </p>
                    <p className="leading-relaxed text-slate-300">{wholesaleData.notes}</p>
                  </div>
                )}

                {/* Security notice */}
                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <Lock size={12} className="shrink-0 text-slate-600" />
                  <span>Privileged financial terms and tier limits are regulated by store administration.</span>
                </div>
              </div>

              {/* Benefits Card */}
              <div className="bg-white rounded-3xl border border-pink-100 p-5 shadow-2xs space-y-3">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#E91E8C]" />
                  <span>Wholesale B2B Benefits</span>
                </h4>
                <ul className="text-xs text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>1–49 Unit Tier:</strong> Bulk discounted pricing on genuine Korean imports.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>50+ Unit Tier:</strong> Maximum volume discounts straight from distributors.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Tax Invoices:</strong> Commercial invoices and COD reconciliation ledgers.</span>
                  </li>
                </ul>
                
                <div className="pt-2 border-t border-pink-50">
                  <Link
                    to="/contact-us"
                    className="text-xs font-bold text-[#E91E8C] hover:underline flex items-center gap-1"
                  >
                    <span>Need custom volume pricing or credit increase?</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>

            </div>

          </div>
        </form>
      )}

      {/* 6. ORDER DETAILS & TAX INVOICE MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-gray-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100 bg-slate-50/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 text-[#E91E8C] flex items-center justify-center">
                    <Receipt size={18} />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900">
                    Order Details: <span className="font-mono text-[#E91E8C]">#{selectedOrder.orderNumber || selectedOrder.id}</span>
                  </h3>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-2">
                  <span>Placed: {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : 'N/A'}</span>
                  <span>•</span>
                  <span>Status:</span>
                  {getStatusBadge(selectedOrder.status)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={printCurrentInvoice}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                  title="Print Invoice"
                >
                  <Printer size={14} />
                  <span>Print Invoice</span>
                </button>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-gray-200 rounded-full transition cursor-pointer text-gray-400 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              
              {/* Items & Pricing Breakdown Table */}
              <div>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <ShoppingBag size={14} className="text-[#E91E8C]" />
                  <span>Purchased Items & Wholesale Pricing</span>
                </h4>
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                        <th className="p-3">Product Description</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Wholesale Unit</th>
                        <th className="p-3 text-right">Total Wholesale</th>
                        <th className="p-3 text-right">COD Selling Unit</th>
                        <th className="p-3 text-right">Total COD</th>
                        <th className="p-3 text-right">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedOrder.items?.map((item, idx) => {
                        const unitPrice = item.wholesaleUnitPrice || (item.wholesaleCost && item.quantity ? item.wholesaleCost / item.quantity : 0);
                        const totalCost = item.wholesaleCost || (unitPrice * item.quantity);
                        const codUnit = item.CODUnitPrice || (item.CODValue && item.quantity ? item.CODValue / item.quantity : 0);
                        const totalCod = item.CODValue || (codUnit * item.quantity);
                        const profit = item.profit || (totalCod - totalCost);

                        return (
                          <tr key={idx} className="hover:bg-pink-50/20">
                            <td className="p-3">
                              <div className="font-bold text-gray-900">{item.productName}</div>
                              {item.sku && <div className="text-[10px] text-gray-400 font-mono">SKU: {item.sku}</div>}
                            </td>
                            <td className="p-3 text-center font-bold text-gray-800 font-mono">{item.quantity}</td>
                            <td className="p-3 text-right font-mono text-gray-700">৳{unitPrice.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono font-bold text-gray-900">৳{totalCost.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-emerald-700">৳{codUnit.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-800">৳{totalCod.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono font-black text-teal-700">+৳{profit.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Delivery & Checkout Details */}
              <div>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Truck size={14} className="text-[#E91E8C]" />
                  <span>Delivery & Dispatch Information</span>
                </h4>
                <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <span className="font-bold text-gray-500">Checkout / Dispatch Type:</span>
                    <span className="font-black text-indigo-700 px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded-md">
                      {selectedOrder.checkoutInfo?.checkoutType || 'COD'}
                    </span>
                  </div>

                  {selectedOrder.checkoutInfo?.checkoutType === 'COD' || (selectedOrder.checkoutInfo as any)?.deliveryName ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-500">Recipient Name:</span>
                        <span className="font-semibold text-gray-900">{(selectedOrder.checkoutInfo as any)?.deliveryName || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-500">Recipient Contact:</span>
                        <span className="font-semibold text-gray-900">{(selectedOrder.checkoutInfo as any)?.deliveryPhone || 'N/A'}</span>
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-gray-500 shrink-0">Delivery Address:</span>
                        <span className="font-semibold text-gray-900 text-right max-w-sm">{(selectedOrder.checkoutInfo as any)?.deliveryAddress || 'N/A'}</span>
                      </div>
                    </>
                  ) : null}

                  {(selectedOrder.checkoutInfo as any)?.parcelId && (
                    <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                      <span className="font-bold text-gray-500">Courier Parcel ID / Tracking:</span>
                      <span className="font-mono font-bold text-indigo-600">{(selectedOrder.checkoutInfo as any).parcelId}</span>
                    </div>
                  )}

                  {selectedOrder.checkoutInfo?.orderNote && (
                    <div className="pt-2 border-t border-gray-200">
                      <span className="font-bold text-gray-500 block mb-1">Order Notes / Instructions:</span>
                      <p className="text-gray-700 italic bg-white p-2.5 rounded-xl border border-gray-200 text-xs">
                        {selectedOrder.checkoutInfo.orderNote}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Breakdown Grid */}
              <div>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Wallet size={14} className="text-[#E91E8C]" />
                  <span>Order Financial Summary</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-2xl text-center">
                    <span className="text-[11px] font-bold text-indigo-700 block mb-0.5">Wholesale Total</span>
                    <span className="font-black text-indigo-950 text-base font-mono">৳{(selectedOrder.totalWholesaleCost || 0).toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-center">
                    <span className="text-[11px] font-bold text-emerald-700 block mb-0.5">COD Amount</span>
                    <span className="font-black text-emerald-950 text-base font-mono">৳{(selectedOrder.totalCODValue || 0).toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-2xl text-center">
                    <span className="text-[11px] font-bold text-teal-700 block mb-0.5">Profit Margin</span>
                    <span className="font-black text-teal-900 text-base font-mono">+৳{(selectedOrder.totalProfit || 0).toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-2xl text-center">
                    <span className="text-[11px] font-bold text-blue-700 block mb-0.5">Paid Amount</span>
                    <span className="font-black text-blue-950 text-base font-mono">৳{(selectedOrder.paidAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className={`p-3 rounded-2xl text-center border ${
                    (selectedOrder.dueAmount || 0) > 0 
                      ? 'bg-rose-50/60 border-rose-200' 
                      : 'bg-emerald-50/40 border-emerald-200'
                  }`}>
                    <span className={`text-[11px] font-bold block mb-0.5 ${
                      (selectedOrder.dueAmount || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}>Order Due</span>
                    <span className={`font-black text-base font-mono ${
                      (selectedOrder.dueAmount || 0) > 0 ? 'text-rose-900' : 'text-emerald-900'
                    }`}>৳{(selectedOrder.dueAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-slate-50/80 flex items-center justify-between">
              <button
                onClick={printCurrentInvoice}
                className="inline-flex sm:hidden items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-bold shadow-2xs"
              >
                <Printer size={14} />
                <span>Print</span>
              </button>

              <button
                onClick={() => setSelectedOrder(null)}
                className="ml-auto px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition text-xs cursor-pointer shadow-xs"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
