import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tag, 
  Percent, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Trash2, 
  Edit3, 
  Truck, 
  Sparkles, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Filter, 
  ArrowRight, 
  Calendar, 
  Package, 
  Layers, 
  Eye, 
  X,
  Play
} from 'lucide-react';
import { discountService } from '../services/discountService';
import { productService } from '../services/productService';
import { Coupon, Product, BulkDiscountParams } from '../types';
import { getRetailOriginalPrice, getRetailPrice } from '../utils/pricing';
import { KOREAN_BRANDS } from '../data/brands';
import { AdminDiscountPreviewTable, computeDiscountStatus } from './AdminDiscountPreviewTable';

export const AdminDiscounts: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'coupons' | 'product_discounts' | 'simulator'>('preview');

  // Coupon Filters & Search
  const [couponSearch, setCouponSearch] = useState('');
  const [couponTypeFilter, setCouponTypeFilter] = useState<'all' | 'free_delivery' | 'percentage' | 'fixed_amount'>('all');
  const [couponStatusFilter, setCouponStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Coupon Modal State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as Coupon['discountType'],
    discountValue: 10,
    minOrderAmount: '',
    maxDiscountCap: '',
    appliesTo: 'all' as Coupon['appliesTo'],
    selectedProductIds: [] as string[],
    selectedBrand: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    usageLimit: '',
    isActive: true,
  });

  // Bulk Product Discount State
  const [bulkTarget, setBulkTarget] = useState<'all' | 'brand' | 'category'>('all');
  const [bulkBrand, setBulkBrand] = useState(KOREAN_BRANDS[0] || 'COSRX');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkDiscountType, setBulkDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [bulkDiscountValue, setBulkDiscountValue] = useState<number>(10);
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Single Product Discount Edit Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [singleDiscountValue, setSingleDiscountValue] = useState<string>('');
  const [singleDiscountType, setSingleDiscountType] = useState<'percentage' | 'fixed_price'>('percentage');

  // Product Search in Product Discount Tab
  const [prodSearch, setProdSearch] = useState('');
  const [prodSaleOnly, setProdSaleOnly] = useState(false);
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');

  // Copy code feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Simulator State
  const [simCode, setSimCode] = useState('');
  const [simSubtotal, setSimSubtotal] = useState(1500);
  const [simArea, setSimArea] = useState<'dhaka' | 'outside'>('dhaka');
  const [simResult, setSimResult] = useState<{
    tested: boolean;
    isValid: boolean;
    message: string;
    discountAmount: number;
    isFreeDelivery: boolean;
    initialShipping: number;
    finalShipping: number;
    finalGrandTotal: number;
  } | null>(null);

  // Subscribe to Coupons & Products
  useEffect(() => {
    setLoading(true);
    const unsubCoupons = discountService.subscribeCoupons(
      (data) => {
        setCoupons(data);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to coupons:', err);
        setLoading(false);
      }
    );

    const unsubProducts = productService.subscribe((prods) => {
      setProducts(prods);
    });

    return () => {
      unsubCoupons();
      unsubProducts();
    };
  }, []);

  // Distinct Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Distinct Brands
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort();
  }, [products]);

  // KPIs
  const stats = useMemo(() => {
    const now = new Date();
    let activeCoupons = 0;
    let scheduledCoupons = 0;
    let expiredCoupons = 0;

    coupons.forEach((c) => {
      const meta = computeDiscountStatus(c, now);
      if (meta.status === 'active') activeCoupons++;
      else if (meta.status === 'scheduled') scheduledCoupons++;
      else if (meta.status === 'expired') expiredCoupons++;
    });

    const freeDeliveryCodes = coupons.filter((c) => c.discountType === 'free_delivery' && c.isActive).length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
    const productsOnSale = products.filter((p) => {
      const orig = getRetailOriginalPrice(p);
      const retail = getRetailPrice(p);
      return retail > 0 && retail < orig;
    }).length;

    return {
      activeCoupons,
      scheduledCoupons,
      expiredCoupons,
      totalCoupons: coupons.length,
      freeDeliveryCodes,
      totalRedemptions,
      productsOnSale,
    };
  }, [coupons, products]);

  // Filtered Coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      const matchSearch = 
        coupon.code.toLowerCase().includes(couponSearch.toLowerCase()) ||
        (coupon.description || '').toLowerCase().includes(couponSearch.toLowerCase());
      
      const matchType = 
        couponTypeFilter === 'all' ? true : coupon.discountType === couponTypeFilter;

      const matchStatus = 
        couponStatusFilter === 'all' ? true : (couponStatusFilter === 'active' ? coupon.isActive : !coupon.isActive);

      return matchSearch && matchType && matchStatus;
    });
  }, [coupons, couponSearch, couponTypeFilter, couponStatusFilter]);

  // Filtered Products for Product Discount Tab
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = prodSearch.toLowerCase();
      const matchText = 
        p.name.toLowerCase().includes(q) || 
        (p.brand || '').toLowerCase().includes(q) ||
        (p.barcode || '').includes(q);

      const isSale = getRetailPrice(p) < getRetailOriginalPrice(p);
      const matchSale = prodSaleOnly ? isSale : true;

      const matchBrand = selectedBrandFilter === 'all' ? true : p.brand === selectedBrandFilter;

      return matchText && matchSale && matchBrand;
    });
  }, [products, prodSearch, prodSaleOnly, selectedBrandFilter]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setCouponForm({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: '',
      maxDiscountCap: '',
      appliesTo: 'all',
      selectedProductIds: [],
      selectedBrand: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      usageLimit: '',
      isActive: true,
    });
    setIsCouponModalOpen(true);
  };

  const handleOpenEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount ? String(coupon.minOrderAmount) : '',
      maxDiscountCap: coupon.maxDiscountCap ? String(coupon.maxDiscountCap) : '',
      appliesTo: coupon.appliesTo,
      selectedProductIds: coupon.applicableProductIds || [],
      selectedBrand: (coupon.applicableBrands && coupon.applicableBrands[0]) || '',
      startDate: coupon.startDate ? coupon.startDate.split('T')[0] : '',
      endDate: coupon.endDate ? coupon.endDate.split('T')[0] : '',
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      isActive: coupon.isActive,
    });
    setIsCouponModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code.trim()) return;

    try {
      await discountService.saveCoupon({
        id: editingCoupon?.id,
        code: couponForm.code,
        description: couponForm.description,
        discountType: couponForm.discountType,
        discountValue: couponForm.discountType === 'free_delivery' ? 0 : Number(couponForm.discountValue) || 0,
        minOrderAmount: couponForm.minOrderAmount ? Number(couponForm.minOrderAmount) : undefined,
        maxDiscountCap: couponForm.maxDiscountCap ? Number(couponForm.maxDiscountCap) : undefined,
        appliesTo: couponForm.appliesTo,
        applicableProductIds: couponForm.appliesTo === 'specific_products' ? couponForm.selectedProductIds : [],
        applicableBrands: couponForm.appliesTo === 'brands' && couponForm.selectedBrand ? [couponForm.selectedBrand] : [],
        startDate: couponForm.startDate ? new Date(couponForm.startDate).toISOString() : undefined,
        endDate: couponForm.endDate ? new Date(couponForm.endDate).toISOString() : undefined,
        usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : undefined,
        isActive: couponForm.isActive,
        usageCount: editingCoupon?.usageCount || 0,
      });

      setIsCouponModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save coupon:', err);
      alert('Error saving coupon: ' + (err?.message || 'Please check your inputs'));
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      await discountService.toggleCouponStatus(coupon.id, !coupon.isActive);
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    if (!window.confirm(`Are you sure you want to delete coupon code "${coupon.code}"?`)) {
      return;
    }
    try {
      await discountService.deleteCoupon(coupon.id);
    } catch (err) {
      console.error('Failed to delete coupon:', err);
    }
  };

  // Bulk Discount Actions
  const handleApplyBulk = async () => {
    let confirmMsg = '';
    if (bulkTarget === 'all') {
      confirmMsg = `Are you sure you want to set a ${bulkDiscountValue}${bulkDiscountType === 'percentage' ? '%' : ' BDT'} discount on ALL ${products.length} products in the store?`;
    } else if (bulkTarget === 'brand') {
      confirmMsg = `Apply ${bulkDiscountValue}${bulkDiscountType === 'percentage' ? '%' : ' BDT'} discount on all "${bulkBrand}" products?`;
    } else if (bulkTarget === 'category') {
      confirmMsg = `Apply ${bulkDiscountValue}${bulkDiscountType === 'percentage' ? '%' : ' BDT'} discount on all "${bulkCategory}" products?`;
    }

    if (!window.confirm(confirmMsg)) return;

    setIsApplyingBulk(true);
    setBulkMessage(null);
    try {
      const params: BulkDiscountParams = {
        target: bulkTarget,
        targetValue: bulkTarget === 'brand' ? bulkBrand : (bulkTarget === 'category' ? bulkCategory : undefined),
        discountType: bulkDiscountType,
        discountValue: Number(bulkDiscountValue) || 0,
      };

      const res = await discountService.applyBulkProductDiscount(params, products);
      setBulkMessage({ type: 'success', text: res.message });
    } catch (err: any) {
      setBulkMessage({ type: 'error', text: err?.message || 'Failed to apply bulk discount.' });
    } finally {
      setIsApplyingBulk(false);
    }
  };

  const handleClearAllDiscounts = async () => {
    if (!window.confirm('Are you sure you want to CLEAR all product discounts across the entire store? All products will return to their regular retail prices.')) {
      return;
    }
    setIsApplyingBulk(true);
    setBulkMessage(null);
    try {
      const res = await discountService.applyBulkProductDiscount({
        target: 'all',
        discountType: 'percentage',
        discountValue: 0,
        clearDiscount: true
      }, products);
      setBulkMessage({ type: 'success', text: res.message });
    } catch (err: any) {
      setBulkMessage({ type: 'error', text: err?.message || 'Failed to clear discounts.' });
    } finally {
      setIsApplyingBulk(false);
    }
  };

  // Single Product Discount Save
  const handleSaveSingleProductDiscount = async () => {
    if (!editingProduct) return;
    try {
      const orig = getRetailOriginalPrice(editingProduct);
      let newPrice: number | null = null;
      let reason: string | undefined = undefined;

      if (!singleDiscountValue.trim() || Number(singleDiscountValue) <= 0) {
        newPrice = null;
      } else {
        const val = Number(singleDiscountValue);
        if (singleDiscountType === 'percentage') {
          const cut = Math.round((orig * Math.min(99, val)) / 100);
          newPrice = Math.max(1, orig - cut);
          reason = `${val}% Special Deal`;
        } else {
          newPrice = Math.min(orig, Math.max(1, val));
          reason = `৳${orig - newPrice} OFF`;
        }
      }

      await discountService.updateSingleProductDiscount(editingProduct.id, newPrice, reason);
      setEditingProduct(null);
    } catch (err: any) {
      alert('Failed to update product discount: ' + (err?.message || ''));
    }
  };

  // Run Simulator
  const handleRunSimulator = async () => {
    const raw = simCode.trim();
    if (!raw) return;

    const initialShipping = simArea === 'dhaka' ? 80 : 150;
    const mockCart = products.slice(0, 3).map((p) => ({ product: p, quantity: 1 }));
    const res = await discountService.validateCoupon(raw, mockCart, simSubtotal);

    const finalShipping = res.isFreeDelivery ? 0 : initialShipping;
    const finalGrandTotal = Math.max(0, simSubtotal + finalShipping - res.discountAmount);

    setSimResult({
      tested: true,
      isValid: res.isValid,
      message: res.message || '',
      discountAmount: res.discountAmount,
      isFreeDelivery: res.isFreeDelivery,
      initialShipping,
      finalShipping,
      finalGrandTotal,
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-pink-100/70 text-[#E91E8C] rounded-xl">
              <Percent size={20} />
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Discounts & Promotions
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Manage promotional coupon codes, free delivery vouchers, and storewide product discounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(activeTab === 'preview' || activeTab === 'coupons') && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus size={15} />
              <span>Create Coupon</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Active Discounts
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              {stats.activeCoupons}
            </span>
            <span className="text-xs text-slate-400">
              / {stats.totalCoupons} total
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block font-sans">Live & redeemable</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Scheduled Promotions
            </span>
            <Clock size={14} className="text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
              {stats.scheduledCoupons}
            </span>
            <span className="text-xs text-slate-400">upcoming launch</span>
          </div>
          <span className="text-[11px] text-slate-400 block font-sans">Future start date</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Expired & Exhausted
            </span>
            <AlertCircle size={14} className="text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-700 tabular-nums">
              {stats.expiredCoupons}
            </span>
            <span className="text-xs text-slate-400">archived campaigns</span>
          </div>
          <span className="text-[11px] text-slate-400 block font-sans">Past date or filled limit</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Total Redemptions
            </span>
            <Sparkles size={14} className="text-[#E91E8C]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#E91E8C] tabular-nums">
              {stats.totalRedemptions}
            </span>
            <span className="text-xs text-slate-400">customer checkouts</span>
          </div>
          <span className="text-[11px] text-slate-400 block font-sans">{stats.productsOnSale} catalog items on sale</span>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl max-w-fit">
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'preview'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Eye size={14} className="text-[#E91E8C]" />
          <span>Discounts Preview Table ({coupons.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'coupons'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Tag size={14} />
          <span>Coupon Management</span>
        </button>

        <button
          onClick={() => setActiveTab('product_discounts')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'product_discounts'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package size={14} />
          <span>Product Deals & Storewide ({stats.productsOnSale} on sale)</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'simulator'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Play size={14} />
          <span>Test Simulator</span>
        </button>
      </div>

      {/* TAB 0: PREVIEW TABLE & STATUS MONITORING */}
      {activeTab === 'preview' && (
        <AdminDiscountPreviewTable
          coupons={coupons}
          products={products}
          onCreateCoupon={handleOpenCreateModal}
          onEditCoupon={handleOpenEditModal}
          onToggleStatus={handleToggleStatus}
          onDeleteCoupon={handleDeleteCoupon}
        />
      )}

      {/* TAB 1: COUPONS MANAGEMENT */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search by coupon code (e.g. FREEDELIVERY, EID15)..."
                value={couponSearch}
                onChange={(e) => setCouponSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#E91E8C]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={couponTypeFilter}
                onChange={(e) => setCouponTypeFilter(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Discount Types</option>
                <option value="free_delivery">Free Delivery</option>
                <option value="percentage">Percentage (%) Off</option>
                <option value="fixed_amount">Fixed Amount (৳)</option>
              </select>

              <select
                value={couponStatusFilter}
                onChange={(e) => setCouponStatusFilter(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Coupons Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {filteredCoupons.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Tag size={20} />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">No coupons found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {couponSearch ? 'No coupons matched your search criteria.' : 'Create your first promotional voucher code with free delivery or percentage discounts.'}
                </p>
                {!couponSearch && (
                  <button
                    onClick={handleOpenCreateModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl"
                  >
                    <Plus size={14} />
                    <span>Create First Coupon</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Coupon Code</th>
                      <th className="py-3 px-4 font-semibold">Benefit</th>
                      <th className="py-3 px-4 font-semibold">Min Spend</th>
                      <th className="py-3 px-4 font-semibold">Scope</th>
                      <th className="py-3 px-4 font-semibold">Redemptions</th>
                      <th className="py-3 px-4 font-semibold">Validity</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredCoupons.map((coupon) => {
                      const meta = computeDiscountStatus(coupon);
                      return (
                        <tr key={coupon.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Code */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-xs tracking-wider text-slate-800">
                                {coupon.code}
                              </span>
                              <button
                                onClick={() => handleCopyCode(coupon.code)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded"
                                title="Copy coupon code"
                              >
                                {copiedCode === coupon.code ? (
                                  <Check size={13} className="text-emerald-600" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </div>
                            {coupon.description && (
                              <p className="text-[11px] font-sans font-normal text-slate-500 mt-1 line-clamp-1">
                                {coupon.description}
                              </p>
                            )}
                          </td>

                          {/* Benefit */}
                          <td className="py-3.5 px-4">
                            {coupon.discountType === 'free_delivery' && (
                              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                                <Truck size={14} className="text-emerald-600" />
                                <span>Free Delivery (৳0)</span>
                              </div>
                            )}
                            {coupon.discountType === 'percentage' && (
                              <div className="font-semibold text-slate-900">
                                <span className="font-mono text-[#E91E8C] font-bold">{coupon.discountValue}%</span> OFF
                                {coupon.maxDiscountCap ? (
                                  <span className="text-[11px] text-slate-400 font-normal block">
                                    Capped at ৳{coupon.maxDiscountCap.toLocaleString()}
                                  </span>
                                ) : null}
                              </div>
                            )}
                            {coupon.discountType === 'fixed_amount' && (
                              <div className="font-semibold text-slate-900">
                                <span className="font-mono text-emerald-600 font-bold">৳{coupon.discountValue.toLocaleString()}</span> OFF
                              </div>
                            )}
                          </td>

                          {/* Min Spend */}
                          <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600">
                            {coupon.minOrderAmount ? `৳${coupon.minOrderAmount.toLocaleString()}` : 'None'}
                          </td>

                          {/* Scope */}
                          <td className="py-3.5 px-4">
                            {coupon.appliesTo === 'all' && (
                              <span className="text-slate-600">All Products</span>
                            )}
                            {coupon.appliesTo === 'specific_products' && (
                              <span className="text-indigo-600 font-medium">
                                {coupon.applicableProductIds?.length || 0} Products
                              </span>
                            )}
                            {coupon.appliesTo === 'brands' && (
                              <span className="text-purple-600 font-medium">
                                Brand: {coupon.applicableBrands?.join(', ') || 'Selected'}
                              </span>
                            )}
                          </td>

                          {/* Redemptions */}
                          <td className="py-3.5 px-4 font-mono tabular-nums text-slate-700">
                            <span>{coupon.usageCount || 0}</span>
                            {coupon.usageLimit ? (
                              <span className="text-slate-400 text-[11px]"> / {coupon.usageLimit}</span>
                            ) : null}
                          </td>

                          {/* Validity & Status Badge */}
                          <td className="py-3.5 px-4 text-[11px]">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${meta.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`}></span>
                                <span>{meta.label}</span>
                              </span>
                              <div className="text-slate-500 text-[10px]">
                                {meta.subtext}
                              </div>
                            </div>
                          </td>

                          {/* Status Toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={coupon.isActive}
                                onChange={() => handleToggleStatus(coupon)}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditModal(coupon)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                                title="Edit Coupon"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteCoupon(coupon)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                title="Delete Coupon"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STOREWIDE & PRODUCT DISCOUNTS */}
      {activeTab === 'product_discounts' && (
        <div className="space-y-6">
          {/* Quick Bulk Discount Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles size={16} className="text-[#E91E8C]" />
                  <span>Launch Bulk Promotional Sale</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Directly sets discounted retail prices (<code className="font-mono text-slate-700">discountRetailPrice</code>) on your catalog items.
                </p>
              </div>

              <button
                onClick={handleClearAllDiscounts}
                disabled={isApplyingBulk}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg font-semibold border border-rose-200 transition cursor-pointer self-start sm:self-auto"
              >
                Clear All Catalog Discounts
              </button>
            </div>

            {bulkMessage && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                bulkMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {bulkMessage.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{bulkMessage.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Target Products</label>
                <select
                  value={bulkTarget}
                  onChange={(e) => setBulkTarget(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none"
                >
                  <option value="all">Entire Store (All Products)</option>
                  <option value="brand">By Brand</option>
                  <option value="category">By Category</option>
                </select>
              </div>

              {bulkTarget === 'brand' && (
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Select Brand</label>
                  <select
                    value={bulkBrand}
                    onChange={(e) => setBulkBrand(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none"
                  >
                    {availableBrands.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              {bulkTarget === 'category' && (
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Select Category</label>
                  <select
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Discount Mode</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setBulkDiscountType('percentage')}
                    className={`py-1 rounded-lg font-semibold transition ${
                      bulkDiscountType === 'percentage' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkDiscountType('fixed_amount')}
                    className={`py-1 rounded-lg font-semibold transition ${
                      bulkDiscountType === 'fixed_amount' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Fixed Off (৳)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Discount Value {bulkDiscountType === 'percentage' ? '(%)' : '(BDT ৳)'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max={bulkDiscountType === 'percentage' ? 90 : 5000}
                    value={bulkDiscountValue}
                    onChange={(e) => setBulkDiscountValue(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none font-mono"
                  />
                  <button
                    type="button"
                    disabled={isApplyingBulk}
                    onClick={handleApplyBulk}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl whitespace-nowrap cursor-pointer transition disabled:opacity-50"
                  >
                    {isApplyingBulk ? 'Applying...' : 'Apply Sale'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Catalog Discount Inspector Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-3 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package size={17} className="text-slate-500" />
                <h4 className="text-sm font-bold text-slate-900">Product Discount Inspector</h4>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search product..."
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <select
                  value={selectedBrandFilter}
                  onChange={(e) => setSelectedBrandFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-slate-700 outline-none"
                >
                  <option value="all">All Brands</option>
                  {availableBrands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={prodSaleOnly}
                    onChange={(e) => setProdSaleOnly(e.target.checked)}
                    className="rounded text-[#E91E8C]"
                  />
                  <span>On Sale Only</span>
                </label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Product</th>
                    <th className="py-2.5 px-3 font-semibold">Brand</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Regular Price</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Sale Price</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Discount Badge</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.slice(0, 50).map((prod) => {
                    const regular = getRetailOriginalPrice(prod);
                    const current = getRetailPrice(prod);
                    const isOnSale = current > 0 && current < regular;
                    const savings = regular - current;
                    const pct = Math.round((savings / regular) * 100);

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 line-clamp-1">{prod.name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{prod.barcode || prod.id}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{prod.brand}</td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500">
                          ৳{regular.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-bold">
                          {isOnSale ? (
                            <span className="text-emerald-600">৳{current.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isOnSale ? (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-bold">
                              -{pct}% (৳{savings})
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Regular</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setEditingProduct(prod);
                              setSingleDiscountType('percentage');
                              setSingleDiscountValue(isOnSale ? String(pct) : '10');
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg cursor-pointer"
                          >
                            {isOnSale ? 'Edit Sale' : 'Set Discount'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredProducts.length > 50 && (
                <p className="text-[11px] text-slate-400 text-center py-2">
                  Showing first 50 of {filteredProducts.length} matching products. Use search above to narrow down.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COUPON SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Play size={16} className="text-emerald-600" />
              <span>Interactive Coupon Simulator</span>
            </h3>
            <p className="text-xs text-slate-500">
              Test how coupon codes will calculate on customer carts before publishing them to social media or advertising campaigns.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Coupon Code</label>
              <input
                type="text"
                placeholder="e.g. FREEDELIVERY"
                value={simCode}
                onChange={(e) => setSimCode(e.target.value.toUpperCase())}
                className="w-full uppercase font-mono tracking-wider bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Simulated Cart Subtotal (৳)</label>
              <input
                type="number"
                value={simSubtotal}
                onChange={(e) => setSimSubtotal(Number(e.target.value))}
                className="w-full font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Delivery Destination</label>
              <select
                value={simArea}
                onChange={(e) => setSimArea(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none cursor-pointer"
              >
                <option value="dhaka">Inside Dhaka (Standard ৳80)</option>
                <option value="outside">Outside Dhaka (Standard ৳150)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleRunSimulator}
            disabled={!simCode.trim()}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition disabled:opacity-50"
          >
            Run Calculation Simulation
          </button>

          {simResult?.tested && (
            <div className={`p-4 rounded-2xl border text-xs space-y-3 ${
              simResult.isValid ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                {simResult.isValid ? (
                  <CheckCircle2 size={18} className="text-emerald-600" />
                ) : (
                  <AlertCircle size={18} className="text-rose-600" />
                )}
                <span className={`font-bold ${simResult.isValid ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {simResult.message}
                </span>
              </div>

              {simResult.isValid && (
                <div className="bg-white p-3 rounded-xl border border-emerald-100 font-mono space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>Basket Subtotal:</span>
                    <span>৳{simSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Original Shipping:</span>
                    <span>৳{simResult.initialShipping}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>Applied Coupon Discount:</span>
                    <span>-৳{simResult.discountAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>Final Shipping Charge:</span>
                    <span>৳{simResult.finalShipping} {simResult.isFreeDelivery ? '(Free Delivery!)' : ''}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-sm text-slate-900">
                    <span>Customer Grand Total:</span>
                    <span className="text-[#E91E8C]">৳{simResult.finalGrandTotal.toLocaleString()} BDT</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT COUPON MODAL */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Coupon'}
              </h3>
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Coupon Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FREEDELIVERY, EID15"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  className="w-full uppercase font-mono tracking-wider bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none focus:border-[#E91E8C]"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Discount Type</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCouponForm({ ...couponForm, discountType: 'free_delivery' })}
                    className={`py-1.5 rounded-lg font-semibold transition ${
                      couponForm.discountType === 'free_delivery' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Free Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setCouponForm({ ...couponForm, discountType: 'percentage' })}
                    className={`py-1.5 rounded-lg font-semibold transition ${
                      couponForm.discountType === 'percentage' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCouponForm({ ...couponForm, discountType: 'fixed_amount' })}
                    className={`py-1.5 rounded-lg font-semibold transition ${
                      couponForm.discountType === 'fixed_amount' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Fixed Amount (৳)
                  </button>
                </div>
              </div>

              {couponForm.discountType !== 'free_delivery' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      {couponForm.discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Taka Amount (৳)'}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={couponForm.discountType === 'percentage' ? 100 : 10000}
                      value={couponForm.discountValue}
                      onChange={(e) => setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })}
                      className="w-full font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none"
                    />
                  </div>

                  {couponForm.discountType === 'percentage' && (
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Max Cap (৳) <span className="text-slate-400 font-normal">Optional</span>
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={couponForm.maxDiscountCap}
                        onChange={(e) => setCouponForm({ ...couponForm, maxDiscountCap: e.target.value })}
                        className="w-full font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Min Order Spend (৳) <span className="text-slate-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    value={couponForm.minOrderAmount}
                    onChange={(e) => setCouponForm({ ...couponForm, minOrderAmount: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Max Redemptions <span className="text-slate-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={couponForm.usageLimit}
                    onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })}
                    className="w-full font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Application Scope</label>
                <select
                  value={couponForm.appliesTo}
                  onChange={(e) => setCouponForm({ ...couponForm, appliesTo: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none cursor-pointer"
                >
                  <option value="all">Entire Store (All Products)</option>
                  <option value="brands">Specific Brand</option>
                </select>
              </div>

              {couponForm.appliesTo === 'brands' && (
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Select Applicable Brand</label>
                  <select
                    value={couponForm.selectedBrand}
                    onChange={(e) => setCouponForm({ ...couponForm, selectedBrand: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none"
                  >
                    <option value="">Select a brand...</option>
                    {availableBrands.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={couponForm.startDate}
                    onChange={(e) => setCouponForm({ ...couponForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Expiry Date <span className="text-slate-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="date"
                    value={couponForm.endDate}
                    onChange={(e) => setCouponForm({ ...couponForm, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Internal Note / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Free delivery on orders above ৳1000 for Eid campaign"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCoupon"
                  checked={couponForm.isActive}
                  onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                  className="rounded text-[#E91E8C]"
                />
                <label htmlFor="isActiveCoupon" className="text-slate-700 font-semibold cursor-pointer">
                  Activate coupon immediately
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
                >
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE PRODUCT DISCOUNT EDIT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Set Product Discount</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="font-bold text-slate-900 block text-sm">{editingProduct.name}</span>
                <span className="text-slate-500 font-mono text-[11px]">Regular Price: ৳{getRetailOriginalPrice(editingProduct)} BDT</span>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Discount Mode</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSingleDiscountType('percentage')}
                    className={`py-1.5 rounded-lg font-semibold transition ${
                      singleDiscountType === 'percentage' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Percentage (%) Off
                  </button>
                  <button
                    type="button"
                    onClick={() => setSingleDiscountType('fixed_price')}
                    className={`py-1.5 rounded-lg font-semibold transition ${
                      singleDiscountType === 'fixed_price' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Exact Sale Price (৳)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {singleDiscountType === 'percentage' ? 'Percentage Cut (%)' : 'New Discounted Selling Price (৳)'}
                </label>
                <input
                  type="number"
                  placeholder={singleDiscountType === 'percentage' ? 'e.g. 15' : 'e.g. 1450'}
                  value={singleDiscountValue}
                  onChange={(e) => setSingleDiscountValue(e.target.value)}
                  className="w-full font-mono bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Leave empty or enter 0 to remove product discount.
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSingleDiscountValue('');
                    handleSaveSingleProductDiscount();
                  }}
                  className="text-rose-600 hover:underline font-semibold cursor-pointer"
                >
                  Clear Discount
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSingleProductDiscount}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Save Deal
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
