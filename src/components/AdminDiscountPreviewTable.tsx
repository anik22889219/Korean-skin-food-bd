import React, { useState, useMemo } from 'react';
import { 
  Tag, 
  Percent, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Eye, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Truck, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Layers, 
  X,
  Play,
  PauseCircle,
  Plus
} from 'lucide-react';
import { Coupon, Product } from '../types';
import { discountService } from '../services/discountService';

export type DiscountStatus = 'active' | 'scheduled' | 'expired' | 'paused';

export interface DiscountStatusMeta {
  status: DiscountStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
  subtext: string;
  isExpiringSoon: boolean;
}

export function computeDiscountStatus(coupon: Coupon, referenceDate: Date = new Date()): DiscountStatusMeta {
  const now = referenceDate.getTime();
  const startTime = coupon.startDate ? new Date(coupon.startDate).getTime() : 0;
  const endTime = coupon.endDate ? new Date(coupon.endDate).getTime() : 0;
  
  const isUsageExhausted = Boolean(coupon.usageLimit && (coupon.usageCount || 0) >= (coupon.usageLimit || 0));
  const isExpiredByDate = Boolean(endTime && endTime < now);
  
  // 1. Expired state (Date passed or usage quota reached)
  if (isExpiredByDate || isUsageExhausted) {
    let subtext = 'Ended';
    if (isUsageExhausted) {
      subtext = `Quota reached (${coupon.usageCount}/${coupon.usageLimit})`;
    } else if (endTime) {
      const daysAgo = Math.floor((now - endTime) / (1000 * 60 * 60 * 24));
      subtext = daysAgo === 0 ? 'Expired today' : daysAgo === 1 ? 'Expired yesterday' : `Ended ${daysAgo}d ago`;
    }
    
    return {
      status: 'expired',
      label: isUsageExhausted ? 'Quota Full' : 'Expired',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/90 ring-1 ring-rose-500/10',
      dotClass: 'bg-rose-500',
      subtext,
      isExpiringSoon: false,
    };
  }

  // 2. Scheduled state (Start date is in future)
  if (startTime && startTime > now) {
    const daysUntil = Math.ceil((startTime - now) / (1000 * 60 * 60 * 24));
    const subtext = daysUntil <= 1 ? 'Starts in < 24h' : `Starts in ${daysUntil} days`;

    return {
      status: 'scheduled',
      label: 'Scheduled',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/90 ring-1 ring-amber-500/10',
      dotClass: 'bg-amber-500',
      subtext,
      isExpiringSoon: false,
    };
  }

  // 3. Paused / Inactive state (Admin toggled off)
  if (!coupon.isActive) {
    return {
      status: 'paused',
      label: 'Paused',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-400/10',
      dotClass: 'bg-slate-400',
      subtext: 'Manually disabled',
      isExpiringSoon: false,
    };
  }

  // 4. Active state
  let subtext = 'Ongoing (No expiry)';
  let isExpiringSoon = false;
  if (endTime) {
    const daysLeft = Math.ceil((endTime - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) {
      isExpiringSoon = true;
      subtext = daysLeft <= 1 ? 'Ends in < 24h!' : `Ends in ${daysLeft} days!`;
    } else {
      subtext = `Ends in ${daysLeft} days`;
    }
  }

  return {
    status: 'active',
    label: isExpiringSoon ? 'Expiring Soon' : 'Active',
    badgeClass: isExpiringSoon 
      ? 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-500/20'
      : 'bg-emerald-50 text-emerald-800 border-emerald-200/90 ring-1 ring-emerald-500/10',
    dotClass: isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500',
    subtext,
    isExpiringSoon,
  };
}

interface AdminDiscountPreviewTableProps {
  coupons: Coupon[];
  products: Product[];
  onCreateCoupon: () => void;
  onEditCoupon: (coupon: Coupon) => void;
  onToggleStatus: (coupon: Coupon) => void;
  onDeleteCoupon: (coupon: Coupon) => void;
}

export const AdminDiscountPreviewTable: React.FC<AdminDiscountPreviewTableProps> = ({
  coupons,
  products,
  onCreateCoupon,
  onEditCoupon,
  onToggleStatus,
  onDeleteCoupon,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'expired' | 'paused'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'percentage' | 'fixed_amount' | 'free_delivery'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'status' | 'discount' | 'redemptions' | 'date'>('status');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Quick preview modal state
  const [previewCoupon, setPreviewCoupon] = useState<Coupon | null>(null);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  // Simulator state inside preview modal
  const [simCartSubtotal, setSimCartSubtotal] = useState<number>(2000);
  const [simArea, setSimArea] = useState<'dhaka' | 'outside'>('dhaka');

  // Copy code handler
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Enriched coupon list with calculated status
  const enrichedCoupons = useMemo(() => {
    const now = new Date();
    return coupons.map((c) => {
      const meta = computeDiscountStatus(c, now);
      return {
        ...c,
        statusMeta: meta,
      };
    });
  }, [coupons]);

  // Aggregate counts for KPI chips
  const counts = useMemo(() => {
    let active = 0;
    let scheduled = 0;
    let expired = 0;
    let paused = 0;

    enrichedCoupons.forEach((c) => {
      if (c.statusMeta.status === 'active') active++;
      else if (c.statusMeta.status === 'scheduled') scheduled++;
      else if (c.statusMeta.status === 'expired') expired++;
      else if (c.statusMeta.status === 'paused') paused++;
    });

    const totalRedemptions = enrichedCoupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);

    return {
      all: enrichedCoupons.length,
      active,
      scheduled,
      expired,
      paused,
      totalRedemptions,
    };
  }, [enrichedCoupons]);

  // Filtered and sorted coupons
  const filteredCoupons = useMemo(() => {
    return enrichedCoupons
      .filter((c) => {
        // Status filter
        if (statusFilter !== 'all' && c.statusMeta.status !== statusFilter) {
          return false;
        }

        // Type filter
        if (typeFilter !== 'all' && c.discountType !== typeFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchCode = c.code.toLowerCase().includes(q);
          const matchDesc = (c.description || '').toLowerCase().includes(q);
          const matchBrand = (c.applicableBrands || []).some((b) => b.toLowerCase().includes(q));
          if (!matchCode && !matchDesc && !matchBrand) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'status') {
          // Priority: Active -> Scheduled -> Paused -> Expired
          const rank = { active: 1, scheduled: 2, paused: 3, expired: 4 };
          const diff = rank[a.statusMeta.status] - rank[b.statusMeta.status];
          if (diff !== 0) return diff;
          // Sub-sort by date
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortBy === 'discount') {
          return (b.discountValue || 0) - (a.discountValue || 0);
        }
        if (sortBy === 'redemptions') {
          return (b.usageCount || 0) - (a.usageCount || 0);
        }
        if (sortBy === 'date') {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        return 0;
      });
  }, [enrichedCoupons, statusFilter, typeFilter, searchQuery, sortBy]);

  // Quick Seed Demo Promotion campaigns (Active, Scheduled, Expired)
  const handleSeedDemoPromotions = async () => {
    setIsSeedingDemo(true);
    setSeedNotice(null);
    try {
      const now = Date.now();
      const demoPromotions = [
        {
          code: 'GLOW20',
          description: 'Mid-Season K-Beauty Glow: 20% Off Storewide',
          discountType: 'percentage' as const,
          discountValue: 20,
          minOrderAmount: 1500,
          maxDiscountCap: 600,
          appliesTo: 'all' as const,
          startDate: new Date(now - 3 * 86400000).toISOString(), // Started 3 days ago (ACTIVE)
          endDate: new Date(now + 14 * 86400000).toISOString(), // Ends in 14 days
          usageLimit: 150,
          usageCount: 42,
          isActive: true,
        },
        {
          code: 'FREESHIP',
          description: 'Free Nationwide Shipping on orders over ৳2,000',
          discountType: 'free_delivery' as const,
          discountValue: 0,
          minOrderAmount: 2000,
          appliesTo: 'all' as const,
          startDate: new Date(now - 10 * 86400000).toISOString(), // Ongoing (ACTIVE)
          endDate: new Date(now + 30 * 86400000).toISOString(),
          usageCount: 88,
          isActive: true,
        },
        {
          code: 'EID_SPECIAL',
          description: 'Upcoming Eid Festival Flash: Flat ৳300 Off orders over ৳2,500',
          discountType: 'fixed_amount' as const,
          discountValue: 300,
          minOrderAmount: 2500,
          appliesTo: 'all' as const,
          startDate: new Date(now + 7 * 86400000).toISOString(), // Starts in 7 days (SCHEDULED)
          endDate: new Date(now + 21 * 86400000).toISOString(),
          usageLimit: 200,
          usageCount: 0,
          isActive: true,
        },
        {
          code: 'COSRX_VIP',
          description: 'Scheduled Brand Spotlight: 15% Off All COSRX Catalog',
          discountType: 'percentage' as const,
          discountValue: 15,
          minOrderAmount: 1200,
          maxDiscountCap: 500,
          appliesTo: 'brands' as const,
          applicableBrands: ['COSRX'],
          startDate: new Date(now + 3 * 86400000).toISOString(), // Starts in 3 days (SCHEDULED)
          endDate: new Date(now + 18 * 86400000).toISOString(),
          usageLimit: 100,
          usageCount: 0,
          isActive: true,
        },
        {
          code: 'SUMMER_CLEAR',
          description: 'Previous Summer Clearance 25% Off (Campaign Concluded)',
          discountType: 'percentage' as const,
          discountValue: 25,
          minOrderAmount: 1800,
          maxDiscountCap: 800,
          appliesTo: 'all' as const,
          startDate: new Date(now - 30 * 86400000).toISOString(),
          endDate: new Date(now - 5 * 86400000).toISOString(), // Ended 5 days ago (EXPIRED)
          usageLimit: 100,
          usageCount: 74,
          isActive: true,
        },
        {
          code: 'EARLYBIRD50',
          description: 'Flat ৳400 Off Flash Deal (Quota 50/50 Filled)',
          discountType: 'fixed_amount' as const,
          discountValue: 400,
          minOrderAmount: 3000,
          appliesTo: 'all' as const,
          startDate: new Date(now - 14 * 86400000).toISOString(),
          endDate: new Date(now + 10 * 86400000).toISOString(),
          usageLimit: 50,
          usageCount: 50, // Usage limit reached (EXPIRED / QUOTA FULL)
          isActive: true,
        }
      ];

      for (const promo of demoPromotions) {
        await discountService.saveCoupon(promo);
      }
      setSeedNotice('Sample promotional campaigns (Active, Scheduled, and Expired) loaded successfully!');
      setTimeout(() => setSeedNotice(null), 4000);
    } catch (err: any) {
      console.error('Failed to seed demo discounts:', err);
      setSeedNotice('Failed to seed sample discounts: ' + (err?.message || 'Error occurred'));
    } finally {
      setIsSeedingDemo(false);
    }
  };

  // Calculate live simulation for the preview modal
  const simulationCalculation = useMemo(() => {
    if (!previewCoupon) return null;
    const initialShipping = simArea === 'dhaka' ? 80 : 150;
    const now = new Date();
    const meta = computeDiscountStatus(previewCoupon, now);

    let isEligible = true;
    let reason = '';

    if (meta.status === 'expired') {
      isEligible = false;
      reason = 'Discount is expired or redemption limit is reached.';
    } else if (meta.status === 'scheduled') {
      isEligible = false;
      reason = `Discount is scheduled and will become active on ${new Date(previewCoupon.startDate || '').toLocaleDateString()}.`;
    } else if (meta.status === 'paused') {
      isEligible = false;
      reason = 'Discount is currently paused by admin.';
    } else if (previewCoupon.minOrderAmount && simCartSubtotal < previewCoupon.minOrderAmount) {
      isEligible = false;
      reason = `Minimum order amount of ৳${previewCoupon.minOrderAmount.toLocaleString()} not met. (Needs ৳${(previewCoupon.minOrderAmount - simCartSubtotal).toLocaleString()} more).`;
    }

    let discountAmount = 0;
    let finalShipping = initialShipping;

    if (isEligible) {
      if (previewCoupon.discountType === 'free_delivery') {
        finalShipping = 0;
      } else if (previewCoupon.discountType === 'percentage') {
        const cut = Math.round((simCartSubtotal * previewCoupon.discountValue) / 100);
        discountAmount = previewCoupon.maxDiscountCap ? Math.min(cut, previewCoupon.maxDiscountCap) : cut;
      } else if (previewCoupon.discountType === 'fixed_amount') {
        discountAmount = Math.min(simCartSubtotal, previewCoupon.discountValue);
      }
    }

    const grandTotal = Math.max(0, simCartSubtotal + finalShipping - discountAmount);

    return {
      isEligible,
      reason,
      initialShipping,
      finalShipping,
      discountAmount,
      grandTotal,
    };
  }, [previewCoupon, simCartSubtotal, simArea]);

  return (
    <div className="space-y-5">
      {/* Seed Notice Feedback */}
      {seedNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{seedNotice}</span>
          </div>
          <button onClick={() => setSeedNotice(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Monitoring Summary Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Active Card */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            statusFilter === 'active'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
              Active Discounts
            </span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              {counts.active}
            </span>
            <span className="text-xs text-slate-400">live now</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Ready for customer checkout</span>
        </button>

        {/* Scheduled Card */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'scheduled' ? 'all' : 'scheduled')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            statusFilter === 'scheduled'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
              Scheduled
            </span>
            <Clock size={15} className="text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
              {counts.scheduled}
            </span>
            <span className="text-xs text-slate-400">upcoming</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Launches automatically</span>
        </button>

        {/* Expired Card */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            statusFilter === 'expired'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-rose-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
              Expired / Full
            </span>
            <AlertCircle size={15} className="text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-700 tabular-nums">
              {counts.expired}
            </span>
            <span className="text-xs text-slate-400">archived</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Passed date or filled quota</span>
        </button>

        {/* Paused & Total Card */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'paused' ? 'all' : 'paused')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            statusFilter === 'paused'
              ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
              Paused / Inactive
            </span>
            <PauseCircle size={15} className="text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-700 tabular-nums">
              {counts.paused}
            </span>
            <span className="text-xs text-slate-400">/ {counts.all} total</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">{counts.totalRedemptions} total redemptions</span>
        </button>
      </div>

      {/* Control & Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search code, campaign name, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#E91E8C] transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick Filter Selectors & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-700 outline-none cursor-pointer focus:border-[#E91E8C]"
            >
              <option value="all">All Discount Types</option>
              <option value="percentage">Percentage (%) Off</option>
              <option value="fixed_amount">Fixed Amount (৳) Off</option>
              <option value="free_delivery">Free Delivery (৳0)</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-700 outline-none cursor-pointer focus:border-[#E91E8C]"
            >
              <option value="status">Sort: Status (Active First)</option>
              <option value="date">Sort: Creation Date</option>
              <option value="discount">Sort: Value / Rate</option>
              <option value="redemptions">Sort: Total Redemptions</option>
            </select>

            {/* Demo Sample Seed Button */}
            <button
              onClick={handleSeedDemoPromotions}
              disabled={isSeedingDemo}
              title="Populate test Active, Scheduled, and Expired promotions"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] text-xs font-semibold rounded-xl border border-pink-200 transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={13} />
              <span>{isSeedingDemo ? 'Loading...' : 'Load Sample Set'}</span>
            </button>

            {/* Create Coupon Button */}
            <button
              onClick={onCreateCoupon}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus size={14} />
              <span>New Coupon</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tab Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 uppercase tracking-wider">
            Filter:
          </span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            All Discounts ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Active ({counts.active})</span>
          </button>
          <button
            onClick={() => setStatusFilter('scheduled')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
              statusFilter === 'scheduled'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <Clock size={11} />
            <span>Scheduled ({counts.scheduled})</span>
          </button>
          <button
            onClick={() => setStatusFilter('expired')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
              statusFilter === 'expired'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <AlertCircle size={11} />
            <span>Expired / Full ({counts.expired})</span>
          </button>
          <button
            onClick={() => setStatusFilter('paused')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
              statusFilter === 'paused'
                ? 'bg-slate-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <PauseCircle size={11} />
            <span>Paused ({counts.paused})</span>
          </button>
        </div>
      </div>

      {/* Main Discounts Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredCoupons.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Tag size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No discounts matching criteria</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your search filters or status selection.'
                : 'You have not configured any promotions yet. Load sample campaigns or create a new coupon code.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={handleSeedDemoPromotions}
                disabled={isSeedingDemo}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] text-xs font-semibold rounded-xl border border-pink-200 transition cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Load Sample Active, Scheduled & Expired Deals</span>
              </button>
              <button
                onClick={onCreateCoupon}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                <Plus size={14} />
                <span>Create New Coupon</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Promotion & Code</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Benefit</th>
                  <th className="py-3 px-4">Min Spend & Terms</th>
                  <th className="py-3 px-4">Validity Timeline</th>
                  <th className="py-3 px-4">Quota & Usage</th>
                  <th className="py-3 px-4 text-center">Live Toggle</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredCoupons.map((coupon) => {
                  const meta = coupon.statusMeta;
                  const usagePercent = coupon.usageLimit 
                    ? Math.min(100, Math.round(((coupon.usageCount || 0) / coupon.usageLimit) * 100))
                    : null;

                  return (
                    <tr 
                      key={coupon.id} 
                      className={`transition-colors hover:bg-slate-50/80 ${
                        meta.status === 'expired' ? 'opacity-85 bg-slate-50/30' : ''
                      }`}
                    >
                      {/* 1. Code & Campaign */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-xs tracking-wider">
                              {coupon.code}
                            </span>
                            <button
                              onClick={() => handleCopyCode(coupon.code)}
                              className="text-slate-400 hover:text-slate-700 p-1 rounded transition cursor-pointer"
                              title="Copy code"
                            >
                              {copiedCode === coupon.code ? (
                                <Check size={13} className="text-emerald-600" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          </div>

                          {coupon.description && (
                            <p className="text-[11px] text-slate-600 line-clamp-1 max-w-xs font-normal">
                              {coupon.description}
                            </p>
                          )}

                          {/* Scope pill */}
                          <div className="text-[10px] text-slate-400 font-medium">
                            {coupon.appliesTo === 'all' && <span>Scope: All Store Products</span>}
                            {coupon.appliesTo === 'brands' && (
                              <span className="text-purple-600 font-semibold">
                                Scope: {coupon.applicableBrands?.join(', ') || 'Selected Brands'}
                              </span>
                            )}
                            {coupon.appliesTo === 'specific_products' && (
                              <span className="text-indigo-600 font-semibold">
                                Scope: {coupon.applicableProductIds?.length || 0} Targeted Items
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${meta.badgeClass}`}
                          >
                            {meta.status === 'active' && (
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${meta.dotClass}`}></span>
                              </span>
                            )}
                            {meta.status === 'scheduled' && <Clock size={11} className="text-amber-700" />}
                            {meta.status === 'expired' && <AlertCircle size={11} className="text-rose-600" />}
                            {meta.status === 'paused' && <PauseCircle size={11} className="text-slate-500" />}
                            <span>{meta.label}</span>
                          </span>

                          <span className="text-[10px] text-slate-500 font-medium mt-1">
                            {meta.subtext}
                          </span>
                        </div>
                      </td>

                      {/* 3. Benefit */}
                      <td className="py-3.5 px-4">
                        {coupon.discountType === 'percentage' && (
                          <div>
                            <span className="font-mono font-bold text-[#E91E8C] text-sm">
                              {coupon.discountValue}%
                            </span>{' '}
                            <span className="font-semibold text-slate-800">OFF</span>
                            {coupon.maxDiscountCap ? (
                              <span className="text-[10px] text-slate-400 block font-normal">
                                Cap: ৳{coupon.maxDiscountCap.toLocaleString()}
                              </span>
                            ) : null}
                          </div>
                        )}
                        {coupon.discountType === 'fixed_amount' && (
                          <div>
                            <span className="font-mono font-bold text-emerald-700 text-sm">
                              ৳{coupon.discountValue.toLocaleString()}
                            </span>{' '}
                            <span className="font-semibold text-slate-800">OFF</span>
                          </div>
                        )}
                        {coupon.discountType === 'free_delivery' && (
                          <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
                            <Truck size={14} className="text-emerald-600" />
                            <span>Free Shipping</span>
                          </div>
                        )}
                      </td>

                      {/* 4. Min Spend & Terms */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-mono text-slate-700 font-medium">
                            {coupon.minOrderAmount ? `৳${coupon.minOrderAmount.toLocaleString()}` : 'No minimum'}
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            {coupon.minOrderAmount ? 'Min cart total' : 'Applies to any cart'}
                          </span>
                        </div>
                      </td>

                      {/* 5. Validity Timeline */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center gap-1 text-slate-700">
                            <Calendar size={11} className="text-slate-400" />
                            <span>
                              {coupon.startDate ? new Date(coupon.startDate).toLocaleDateString() : 'Instant'}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span>
                              {coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : 'Open-ended'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 6. Quota & Usage Progress */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-baseline justify-between gap-2 text-[11px] font-mono">
                            <span className="font-semibold text-slate-800">
                              {coupon.usageCount || 0}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              {coupon.usageLimit ? `/ ${coupon.usageLimit} limit` : 'unlimited'}
                            </span>
                          </div>

                          {usagePercent !== null && (
                            <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  usagePercent >= 100
                                    ? 'bg-rose-500'
                                    : usagePercent >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-[#E91E8C]'
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 7. Quick Active/Inactive Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={coupon.isActive}
                            onChange={() => onToggleStatus(coupon)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </td>

                      {/* 8. Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPreviewCoupon(coupon)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition"
                            title="Inspect & Preview Card"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => onEditCoupon(coupon)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition"
                            title="Edit Discount"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => onDeleteCoupon(coupon)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                            title="Delete Discount"
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

        {/* Table Footer Summary */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Showing <span className="font-semibold text-slate-700">{filteredCoupons.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{coupons.length}</span> configured discounts
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Active: {counts.active}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Scheduled: {counts.scheduled}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Expired: {counts.expired}</span>
            </span>
          </div>
        </div>
      </div>

      {/* QUICK PREVIEW & SIMULATION MODAL */}
      {previewCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-pink-100 text-[#E91E8C] rounded-lg">
                  <Tag size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Discount Preview & Simulation</h3>
                  <span className="text-[11px] text-slate-500 font-mono">ID: {previewCoupon.id}</span>
                </div>
              </div>
              <button
                onClick={() => setPreviewCoupon(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Customer Voucher Visual Mockup */}
              <div className="relative rounded-2xl border border-dashed border-pink-300 bg-linear-to-br from-pink-50/60 via-white to-pink-50/40 p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full inline-block">
                      Korean Skin Food Promo Voucher
                    </span>
                    <h4 className="text-base font-bold text-slate-900">
                      {previewCoupon.discountType === 'percentage' && `${previewCoupon.discountValue}% OFF Total Order`}
                      {previewCoupon.discountType === 'fixed_amount' && `Flat ৳${previewCoupon.discountValue} OFF`}
                      {previewCoupon.discountType === 'free_delivery' && 'Free Nationwide Delivery'}
                    </h4>
                    <p className="text-slate-600 text-xs font-normal">
                      {previewCoupon.description || 'Promotional coupon applicable during checkout'}
                    </p>
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                      <span className="font-mono font-bold text-sm tracking-wider text-slate-900">
                        {previewCoupon.code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(previewCoupon.code)}
                        className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        title="Copy code"
                      >
                        {copiedCode === previewCoupon.code ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>

                    <span className="text-[10px] text-slate-500 font-mono">
                      {previewCoupon.endDate ? `Valid till ${new Date(previewCoupon.endDate).toLocaleDateString()}` : 'No expiration date'}
                    </span>
                  </div>
                </div>

                {/* Voucher Meta Pills */}
                <div className="mt-3 pt-3 border-t border-pink-200/50 flex flex-wrap gap-2 text-[11px] text-slate-600">
                  <span className="bg-white/80 px-2.5 py-1 rounded-md border border-slate-200">
                    Min Spend: {previewCoupon.minOrderAmount ? `৳${previewCoupon.minOrderAmount.toLocaleString()}` : 'None'}
                  </span>
                  {previewCoupon.maxDiscountCap && (
                    <span className="bg-white/80 px-2.5 py-1 rounded-md border border-slate-200">
                      Max Discount: ৳{previewCoupon.maxDiscountCap.toLocaleString()}
                    </span>
                  )}
                  <span className="bg-white/80 px-2.5 py-1 rounded-md border border-slate-200">
                    Applies To: {previewCoupon.appliesTo === 'all' ? 'All Products' : previewCoupon.appliesTo === 'brands' ? `Brand: ${previewCoupon.applicableBrands?.join(', ')}` : 'Specific Items'}
                  </span>
                </div>
              </div>

              {/* Status Badge & Lifecycle Info */}
              {(() => {
                const meta = computeDiscountStatus(previewCoupon);
                return (
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Lifecycle Status:</span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold ${meta.badgeClass}`}>
                        <span className={`w-2 h-2 rounded-full ${meta.dotClass}`}></span>
                        <span>{meta.label}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400 block">Launch / Start Date:</span>
                        <span className="font-mono font-medium">
                          {previewCoupon.startDate ? new Date(previewCoupon.startDate).toLocaleString() : 'Immediate upon creation'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Expiration Date:</span>
                        <span className="font-mono font-medium">
                          {previewCoupon.endDate ? new Date(previewCoupon.endDate).toLocaleString() : 'Never expires (Perpetual)'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Interactive Cart Simulator Preview */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Play size={13} className="text-[#E91E8C]" />
                    <span>Instant Cart Calculation Simulator</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Preview live customer experience</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Simulated Cart Subtotal (৳)</label>
                    <input
                      type="number"
                      value={simCartSubtotal}
                      onChange={(e) => setSimCartSubtotal(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full font-mono bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-800 outline-none focus:border-[#E91E8C]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Customer Delivery Area</label>
                    <select
                      value={simArea}
                      onChange={(e) => setSimArea(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-800 outline-none"
                    >
                      <option value="dhaka">Inside Dhaka (৳80 delivery)</option>
                      <option value="outside">Outside Dhaka (৳150 delivery)</option>
                    </select>
                  </div>
                </div>

                {simulationCalculation && (
                  <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Eligibility Check:</span>
                      {simulationCalculation.isEligible ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 size={13} />
                          <span>Coupon Valid & Applied</span>
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold flex items-center gap-1 text-[11px]">
                          <AlertCircle size={13} />
                          <span>{simulationCalculation.reason}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-slate-500">Cart Subtotal:</span>
                      <span className="text-slate-800">৳{simCartSubtotal.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-slate-500">Shipping Charge:</span>
                      <span className="text-slate-800">
                        {simulationCalculation.finalShipping === 0 ? (
                          <span className="text-emerald-700 font-bold">৳0 (Free Delivery)</span>
                        ) : (
                          `৳${simulationCalculation.finalShipping}`
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-slate-500">Discount Savings:</span>
                      <span className="text-[#E91E8C] font-bold">
                        - ৳{simulationCalculation.discountAmount.toLocaleString()}
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between font-bold text-sm">
                      <span className="text-slate-900">Customer Final Pay:</span>
                      <span className="font-mono text-slate-900">
                        ৳{simulationCalculation.grandTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <button
                onClick={() => {
                  onToggleStatus(previewCoupon);
                  setPreviewCoupon({
                    ...previewCoupon,
                    isActive: !previewCoupon.isActive,
                  });
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold text-xs border transition cursor-pointer flex items-center gap-1.5 ${
                  previewCoupon.isActive
                    ? 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100'
                    : 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                }`}
              >
                {previewCoupon.isActive ? <PauseCircle size={14} /> : <CheckCircle2 size={14} />}
                <span>{previewCoupon.isActive ? 'Pause Promotion' : 'Activate Promotion'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const c = previewCoupon;
                    setPreviewCoupon(null);
                    onEditCoupon(c);
                  }}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 size={13} />
                  <span>Edit Configuration</span>
                </button>
                <button
                  onClick={() => setPreviewCoupon(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
