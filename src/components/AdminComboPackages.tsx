import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Layers, Plus, Search, Filter, Sparkles, Box, Check, 
  Trash2, Edit, Copy, ExternalLink, Eye, AlertCircle, 
  Tag, ArrowUpDown, ChevronRight, CheckCircle, Package,
  SlidersHorizontal, RefreshCw, LayoutGrid, List, Info,
  Store, Flame, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProducts } from '../hooks/queries/products';
import { productService } from '../services/productService';
import { Product } from '../types';
import { getRetailPrice, getComboEffectiveStock, getComboSavings } from '../utils/pricing';
import { ComboPackageModal } from './ComboPackageModal';

export const AdminComboPackages: React.FC = () => {
  const navigate = useNavigate();
  const { data: products = [], isLoading, refetch } = useProducts();

  // Filter only combo packages
  const comboPackages = useMemo(() => {
    return products.filter((p) => p.isCombo === true);
  }, [products]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comboToEdit, setComboToEdit] = useState<Product | null>(null);

  // Search, Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'fixed' | 'customizable'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'price_asc' | 'price_desc' | 'savings_desc'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Action feedback alert
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingCombo, setDeletingCombo] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick stats calculation
  const stats = useMemo(() => {
    const total = comboPackages.length;
    let fixedCount = 0;
    let customCount = 0;
    let inStockCount = 0;
    let outOfStockCount = 0;

    comboPackages.forEach((combo) => {
      if (combo.comboConfig?.type === 'customizable') {
        customCount++;
      } else {
        fixedCount++;
      }

      const effStock = getComboEffectiveStock(combo, products);
      if (effStock > 0) {
        inStockCount++;
      } else {
        outOfStockCount++;
      }
    });

    return { total, fixedCount, customCount, inStockCount, outOfStockCount };
  }, [comboPackages, products]);

  // Filtered & Sorted Combos
  const filteredCombos = useMemo(() => {
    return comboPackages
      .filter((combo) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = combo.name?.toLowerCase().includes(q);
          const matchNameBN = combo.nameBN?.toLowerCase().includes(q);
          const matchBrand = combo.brand?.toLowerCase().includes(q);
          const matchBarcode = combo.barcode?.toLowerCase().includes(q);
          
          // Check child products in fixed combo
          const matchChild = combo.comboConfig?.items?.some(it => {
            const childP = products.find(p => p.id === it.productId);
            return childP?.name.toLowerCase().includes(q) || childP?.barcode?.toLowerCase().includes(q);
          });

          if (!matchName && !matchNameBN && !matchBrand && !matchBarcode && !matchChild) {
            return false;
          }
        }

        // Type filter
        if (typeFilter !== 'all') {
          const cType = combo.comboConfig?.type || 'fixed';
          if (cType !== typeFilter) return false;
        }

        // Stock availability filter
        if (stockFilter !== 'all') {
          const effStock = getComboEffectiveStock(combo, products);
          if (stockFilter === 'in_stock' && effStock <= 0) return false;
          if (stockFilter === 'out_of_stock' && effStock > 0) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'price_asc') {
          const priceA = getRetailPrice(a);
          const priceB = getRetailPrice(b);
          return priceA - priceB;
        }
        if (sortBy === 'price_desc') {
          const priceA = getRetailPrice(a);
          const priceB = getRetailPrice(b);
          return priceB - priceA;
        }
        if (sortBy === 'savings_desc') {
          const savA = getComboSavings(a, products)?.savings || 0;
          const savB = getComboSavings(b, products)?.savings || 0;
          return savB - savA;
        }
        // newest (default)
        return (b.id || '').localeCompare(a.id || '');
      });
  }, [comboPackages, products, searchQuery, typeFilter, stockFilter, sortBy]);

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!deletingCombo) return;
    setIsDeleting(true);
    try {
      await productService.deleteProduct(deletingCombo.id);
      await refetch?.();
      setAlertMsg({
        type: 'success',
        text: `Combo package "${deletingCombo.name}" has been deleted.`
      });
      setDeletingCombo(null);
      setTimeout(() => setAlertMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to delete combo:', err);
      setAlertMsg({
        type: 'error',
        text: err?.message || 'Failed to delete combo package.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Duplicate / Clone Combo
  const handleDuplicateCombo = (combo: Product) => {
    const clonedCombo: Product = {
      ...combo,
      id: '', // reset id so it saves as new
      name: `${combo.name} (Copy)`,
      nameBN: combo.nameBN ? `${combo.nameBN} (কপি)` : undefined,
      barcode: combo.barcode ? `${combo.barcode}-COPY` : '',
    };
    setComboToEdit(clonedCombo);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-full pb-12 space-y-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {alertMsg && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${
              alertMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-500/10'
                : 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-500/10'
            }`}
          >
            {alertMsg.type === 'success' ? <CheckCircle size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-rose-600" />}
            <span>{alertMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[28px] border border-purple-100 bg-gradient-to-br from-purple-50/60 via-[#FCF8FF] to-pink-50/40 p-5 sm:p-6 lg:p-7 shadow-xs">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-purple-200/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-pink-200/30 blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-purple-700">
              <Sparkles size={13} className="text-purple-600" />
              <span>Bundle Intelligence & Set Management</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl flex items-center gap-2.5">
              <Layers className="text-purple-600" size={28} />
              <span>Combo Product Packages</span>
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-600 sm:text-sm">
              Create and manage fixed skincare bundles and customizable routine sets. Availability dynamically synchronizes in real-time with component product inventory across Storefront, POS Register, and Wholesale.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/shop?category=Combo%20%26%20Sets')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-white px-3.5 py-2.5 text-xs font-extrabold text-purple-700 shadow-xs transition hover:bg-purple-50 cursor-pointer"
            >
              <Store size={14} />
              <span>View in Store</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setComboToEdit(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-purple-500/20 active:scale-[0.98] transition cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Create Combo Package</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Combos */}
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Packages</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{stats.total}</div>
          <div className="text-[11px] text-slate-500 font-medium">Curated bundle configurations</div>
        </div>

        {/* Fixed Bundles */}
        <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fixed Bundles</span>
            <div className="w-7 h-7 rounded-lg bg-pink-50 text-[#E91E8C] flex items-center justify-center">
              <Box size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-[#E91E8C] font-mono">{stats.fixedCount}</div>
          <div className="text-[11px] text-slate-500 font-medium">Pre-packaged skincare kits</div>
        </div>

        {/* Customizable Sets */}
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Custom Sets</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 font-mono">{stats.customCount}</div>
          <div className="text-[11px] text-slate-500 font-medium">Build-your-own routine boxes</div>
        </div>

        {/* Stock Status */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Live Availability</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 font-mono">{stats.inStockCount}</span>
            <span className="text-xs font-bold text-slate-400 font-mono">/ {stats.total} in stock</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {stats.outOfStockCount > 0 ? (
              <span className="text-rose-600 font-bold">{stats.outOfStockCount} limited by out-of-stock items</span>
            ) : (
              <span className="text-emerald-600 font-bold">All packages sellable</span>
            )}
          </div>
        </div>
      </div>

      {/* Action, Search & Filters Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search combo packages by name, barcode, brand, or included products..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* Type selector */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  typeFilter === 'all' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Types
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('fixed')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  typeFilter === 'fixed' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fixed Bundles
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('customizable')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  typeFilter === 'customizable' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Custom Sets
              </button>
            </div>

            {/* Stock selector */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:border-purple-500 shrink-0 cursor-pointer"
            >
              <option value="all">All Stock Status</option>
              <option value="in_stock">In Stock Only</option>
              <option value="out_of_stock">Out of Stock Only</option>
            </select>

            {/* Sort selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:border-purple-500 shrink-0 cursor-pointer"
            >
              <option value="newest">Sort: Newest</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="savings_desc">Highest Discount / Savings</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table View"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>Showing <strong className="text-slate-800">{filteredCombos.length}</strong> of <strong className="text-slate-800">{comboPackages.length}</strong> combo packages</span>
          {(searchQuery || typeFilter !== 'all' || stockFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setStockFilter('all');
              }}
              className="text-purple-600 hover:text-purple-800 font-bold hover:underline cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="animate-spin text-purple-600 mx-auto" size={28} />
          <p className="text-xs font-bold text-slate-500">Loading combo packages...</p>
        </div>
      ) : filteredCombos.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white rounded-3xl border-2 border-dashed border-purple-200 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
            <Layers size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-black text-slate-900">
              {searchQuery || typeFilter !== 'all' || stockFilter !== 'all'
                ? 'No matching combo packages found'
                : 'No combo packages created yet'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {searchQuery || typeFilter !== 'all' || stockFilter !== 'all'
                ? 'Try adjusting your search criteria or clearing your filters.'
                : 'Bundle multiple individual products together with special package pricing or set up customizable step-by-step skincare routine sets.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setComboToEdit(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-md shadow-purple-500/20 transition cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Your First Combo Package</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCombos.map((combo) => {
            const isCustom = combo.comboConfig?.type === 'customizable';
            const effStock = getComboEffectiveStock(combo, products);
            const savingsData = getComboSavings(combo, products);
            const finalPrice = savingsData?.finalPrice ?? getRetailPrice(combo);
            const originalSum = savingsData?.originalSum ?? finalPrice;
            const savings = savingsData?.savings ?? 0;
            const percentage = savingsData?.percentage ?? 0;

            const fixedItems = combo.comboConfig?.items || [];
            const steps = combo.comboConfig?.steps || [];

            return (
              <div
                key={combo.id}
                className="bg-white rounded-[26px] border border-slate-200/90 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {/* Top Media & Floating Badges */}
                <div className="p-4 space-y-3.5">
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <img
                      src={combo.image || 'https://placehold.co/400x225?text=Combo+Package'}
                      alt={combo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Floating Type Badge */}
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-purple-700 to-indigo-700 shadow-md flex items-center gap-1.5">
                        {isCustom ? <Sparkles size={11} /> : <Box size={11} />}
                        <span>{isCustom ? 'Customizable Routine Set' : 'Fixed Curated Bundle'}</span>
                      </span>

                      {savings > 0 && (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase text-white bg-[#E91E8C] shadow-sm">
                          Save {percentage}% (৳{savings.toLocaleString()})
                        </span>
                      )}
                    </div>

                    {/* Floating Live Stock Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-sm backdrop-blur-md ${
                        effStock > 0
                          ? 'bg-emerald-50/95 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50/95 text-rose-800 border-rose-200'
                      }`}>
                        {effStock > 0 ? `Stock: ${effStock} Sets` : 'Sold Out'}
                      </span>
                    </div>
                  </div>

                  {/* Combo Information */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-purple-600 uppercase tracking-wider">{combo.brand || 'Korean Skin Food'}</span>
                      {combo.barcode && (
                        <span className="text-slate-400 font-mono">#{combo.barcode}</span>
                      )}
                    </div>

                    <h3 className="text-sm font-black text-slate-900 line-clamp-1 group-hover:text-purple-600 transition">
                      {combo.name}
                    </h3>
                    {combo.nameBN && (
                      <p className="text-xs text-pink-700 font-medium line-clamp-1">{combo.nameBN}</p>
                    )}
                  </div>

                  {/* Pricing Box */}
                  <div className="p-3 bg-gradient-to-br from-purple-50/60 to-pink-50/30 rounded-xl border border-purple-100 flex items-baseline justify-between font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">Package Price</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-slate-900">৳{finalPrice.toLocaleString()}</span>
                        {originalSum > finalPrice && (
                          <span className="text-xs text-slate-400 line-through">৳{originalSum.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    {savings > 0 && (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 font-sans">
                        Save ৳{savings.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Breakdown of Included / Allowed Items */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                      <span>{isCustom ? `Routine Steps (${steps.length})` : `Included Items (${fixedItems.length})`}</span>
                      <span className="text-[10px] text-slate-400 font-normal">Component inventory synced</span>
                    </div>

                    {isCustom ? (
                      <div className="space-y-1">
                        {steps.slice(0, 3).map((step, idx) => (
                          <div key={step.id} className="text-xs text-slate-700 flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            <span className="truncate font-medium">{idx + 1}. {step.title}</span>
                            <span className="text-[10px] text-purple-700 font-bold shrink-0 ml-1 bg-purple-50 px-1.5 py-0.2 rounded">
                              {step.allowedProductIds.length} choices
                            </span>
                          </div>
                        ))}
                        {steps.length > 3 && (
                          <div className="text-[10px] text-slate-400 text-center font-bold">+{steps.length - 3} more steps</div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {fixedItems.slice(0, 3).map((it) => {
                          const childProd = products.find(p => p.id === it.productId);
                          const childStock = childProd?.stock || 0;
                          return (
                            <div key={it.productId} className="flex items-center justify-between text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-100 gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <img
                                  src={childProd?.image || 'https://placehold.co/24x24'}
                                  alt=""
                                  className="w-5 h-5 rounded object-cover border shrink-0"
                                />
                                <span className="truncate font-medium text-slate-800">{childProd?.name || it.productId}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                                <span className="font-bold text-slate-500 font-mono">Qty: {it.quantity}</span>
                                <span className={`px-1 rounded font-bold ${
                                  childStock < it.quantity ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  Stk: {childStock}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {fixedItems.length > 3 && (
                          <div className="text-[10px] text-slate-400 text-center font-bold">+{fixedItems.length - 3} more products</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Bottom Bar */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/product/${combo.id}`)}
                      className="p-2 hover:bg-white text-slate-600 hover:text-purple-600 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200"
                      title="View on Storefront"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateCombo(combo)}
                      className="p-2 hover:bg-white text-slate-600 hover:text-purple-600 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200"
                      title="Duplicate Combo"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingCombo(combo)}
                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer"
                      title="Delete Combo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setComboToEdit(combo);
                      setIsModalOpen(true);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Edit size={13} />
                    <span>Edit Package</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Combo Package Details</th>
                  <th className="py-3 px-4">Package Type</th>
                  <th className="py-3 px-4">Package Pricing</th>
                  <th className="py-3 px-4">Constituent Components</th>
                  <th className="py-3 px-4">Live Dynamic Stock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCombos.map((combo) => {
                  const isCustom = combo.comboConfig?.type === 'customizable';
                  const effStock = getComboEffectiveStock(combo, products);
                  const savingsData = getComboSavings(combo, products);
                  const finalPrice = savingsData?.finalPrice ?? getRetailPrice(combo);
                  const originalSum = savingsData?.originalSum ?? finalPrice;
                  const savings = savingsData?.savings ?? 0;
                  const percentage = savingsData?.percentage ?? 0;

                  const fixedItems = combo.comboConfig?.items || [];
                  const steps = combo.comboConfig?.steps || [];

                  return (
                    <tr key={combo.id} className="hover:bg-purple-50/20 transition">
                      {/* Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={combo.image || 'https://placehold.co/48x48'}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover border border-purple-100 shrink-0"
                          />
                          <div className="min-w-0 max-w-xs">
                            <span className="text-[9px] font-black text-purple-600 uppercase tracking-wider">{combo.brand}</span>
                            <div className="font-extrabold text-slate-900 truncate hover:text-purple-600 cursor-pointer" onClick={() => { setComboToEdit(combo); setIsModalOpen(true); }}>
                              {combo.name}
                            </div>
                            {combo.barcode && (
                              <span className="text-[10px] text-slate-400 font-mono block truncate">#{combo.barcode}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                          {isCustom ? <Sparkles size={11} /> : <Box size={11} />}
                          <span>{isCustom ? 'Custom Set' : 'Fixed Bundle'}</span>
                        </span>
                      </td>

                      {/* Pricing */}
                      <td className="py-3 px-4 font-mono">
                        <div className="font-extrabold text-slate-900 text-sm">৳{finalPrice.toLocaleString()}</div>
                        {originalSum > finalPrice && (
                          <div className="text-[10px] text-slate-400 line-through">৳{originalSum.toLocaleString()}</div>
                        )}
                        {savings > 0 && (
                          <div className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100 inline-block mt-0.5">
                            Save {percentage}% (৳{savings})
                          </div>
                        )}
                      </td>

                      {/* Components */}
                      <td className="py-3 px-4">
                        <div className="max-w-xs space-y-0.5">
                          {isCustom ? (
                            <span className="text-slate-600 font-medium">
                              {steps.length} configurable routine steps
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">
                              {fixedItems.map(it => {
                                const p = products.find(x => x.id === it.productId);
                                return `${it.quantity}x ${p?.name || it.productId}`;
                              }).join(', ')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Live Stock */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold border ${
                          effStock > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-mono'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {effStock > 0 ? `${effStock} Sets Available` : 'Sold Out'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/product/${combo.id}`)}
                            className="p-1.5 hover:bg-purple-50 text-slate-600 hover:text-purple-600 rounded-xl transition"
                            title="View on Storefront"
                          >
                            <ExternalLink size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateCombo(combo)}
                            className="p-1.5 hover:bg-purple-50 text-slate-600 hover:text-purple-600 rounded-xl transition"
                            title="Duplicate Combo"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setComboToEdit(combo);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white rounded-xl transition"
                            title="Edit"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCombo(combo)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCombo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-rose-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Delete Combo Package?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-800">"{deletingCombo.name}"</strong>? Individual component products will remain safe in inventory.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingCombo(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Combo Package Creator & Editor Modal */}
      {isModalOpen && (
        <ComboPackageModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setComboToEdit(null);
          }}
          comboToEdit={comboToEdit}
          allProducts={products}
          onSaved={(savedCombo) => {
            refetch?.();
            setIsModalOpen(false);
            setComboToEdit(null);
            setAlertMsg({
              type: 'success',
              text: `🎉 Combo package "${savedCombo.name}" saved successfully!`
            });
            setTimeout(() => setAlertMsg(null), 5000);
          }}
        />
      )}
    </div>
  );
};
