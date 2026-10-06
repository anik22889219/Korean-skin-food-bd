import React, { useState, useMemo } from 'react';
import { 
  X, Search, Check, Plus, Trash2, AlertCircle, RefreshCw, 
  Package, CheckCircle2, Filter, Layers, ArrowRight, ExternalLink,
  ShieldAlert, Tag, CheckSquare, Square
} from 'lucide-react';
import { TaxonomyItem, Product } from '../types';
import { useProducts } from '../hooks/queries/products';
import { useCategories } from '../hooks/queries/categories';
import { 
  useBatchAssignTaxonomyToProducts, 
  useBatchUnassignTaxonomyFromProducts 
} from '../hooks/queries/taxonomies';

interface TaxonomyProductAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  taxonomyItem: TaxonomyItem | null;
}

export const TaxonomyProductAssignmentModal: React.FC<TaxonomyProductAssignmentModalProps> = ({
  isOpen,
  onClose,
  taxonomyItem,
}) => {
  const { data: allProducts = [], isLoading: isLoadingProducts } = useProducts();
  const { data: categories = [] } = useCategories();

  const assignMutation = useBatchAssignTaxonomyToProducts();
  const unassignMutation = useBatchUnassignTaxonomyFromProducts();

  // Active Tab inside modal: 'assigned' | 'available'
  const [activeTab, setActiveTab] = useState<'assigned' | 'available'>('assigned');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock'>('all');

  // Selected Product IDs for bulk operations
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Helper: Determine if a product has this taxonomy item assigned
  const isProductAssigned = (product: Product, item: TaxonomyItem): boolean => {
    const itemName = item.name.trim().toLowerCase();
    switch (item.type) {
      case 'brand':
        return (product.brand || '').trim().toLowerCase() === itemName;
      case 'category':
        return (product.category || '').trim().toLowerCase() === itemName;
      case 'routine_step':
        return (product.routineStep || '').trim().toLowerCase() === itemName;
      case 'skin_type':
        return Array.isArray(product.skinTypes) && product.skinTypes.some(st => st.trim().toLowerCase() === itemName);
      case 'skin_concern':
        return Array.isArray(product.concerns) && product.concerns.some(c => c.trim().toLowerCase() === itemName);
      case 'target_benefit':
        return Array.isArray(product.benefits) && product.benefits.some(b => b.trim().toLowerCase() === itemName);
      case 'ingredient':
        return Array.isArray(product.keyIngredients) && product.keyIngredients.some(ing => ing.trim().toLowerCase() === itemName);
      default:
        return false;
    }
  };

  // Split into Assigned and Available products
  const { assignedProducts, availableProducts } = useMemo(() => {
    if (!taxonomyItem) return { assignedProducts: [], availableProducts: [] };

    const assigned: Product[] = [];
    const available: Product[] = [];

    allProducts.forEach((p) => {
      // Exclude combo wrappers from single product tagging
      if (p.isCombo && p.category === 'Combo & Sets') return;

      if (isProductAssigned(p, taxonomyItem)) {
        assigned.push(p);
      } else {
        available.push(p);
      }
    });

    return { assignedProducts: assigned, availableProducts: available };
  }, [allProducts, taxonomyItem]);

  // Filtered lists based on search and filters
  const currentList = activeTab === 'assigned' ? assignedProducts : availableProducts;

  const filteredList = useMemo(() => {
    return currentList.filter((p) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q) || (p.nameBN && p.nameBN.toLowerCase().includes(q));
        const matchesBrand = (p.brand || '').toLowerCase().includes(q);
        const matchesBarcode = (p.barcode || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBrand && !matchesBarcode) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== 'All' && p.category !== selectedCategory) {
        return false;
      }

      // Stock
      if (stockFilter === 'in_stock' && (p.stock || 0) <= 0) {
        return false;
      }

      return true;
    });
  }, [currentList, searchQuery, selectedCategory, stockFilter]);

  if (!isOpen || !taxonomyItem) return null;

  // Toggle Single Product Selection
  const toggleSelectProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  // Select All Filtered Products
  const toggleSelectAll = () => {
    const visibleIds = filteredList.map((p) => p.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedProductIds.includes(id));

    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Perform Bulk Assignment
  const handleBulkAssign = async () => {
    if (selectedProductIds.length === 0) return;

    try {
      const res = await assignMutation.mutateAsync({
        dimensionType: taxonomyItem.type,
        taxonomyName: taxonomyItem.name,
        productIds: selectedProductIds,
      });

      showToast(
        `Successfully assigned ${res.modifiedCount} ${res.modifiedCount === 1 ? 'product' : 'products'} to "${taxonomyItem.name}".`
      );
      setSelectedProductIds([]);
    } catch (err: any) {
      showToast(`Assignment failed: ${err.message}`, 'error');
    }
  };

  // Perform Single / Bulk Unassign
  const handleUnassignProducts = async (productIds: string[]) => {
    if (productIds.length === 0) return;

    try {
      const res = await unassignMutation.mutateAsync({
        dimensionType: taxonomyItem.type,
        taxonomyName: taxonomyItem.name,
        productIds,
      });

      showToast(
        `Unassigned ${res.modifiedCount} ${res.modifiedCount === 1 ? 'product' : 'products'} from "${taxonomyItem.name}".`
      );
      setSelectedProductIds((prev) => prev.filter((id) => !productIds.includes(id)));
    } catch (err: any) {
      showToast(`Unassign failed: ${err.message}`, 'error');
    }
  };

  const isAllVisibleSelected =
    filteredList.length > 0 && filteredList.every((p) => selectedProductIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {taxonomyItem.image ? (
              <img
                src={taxonomyItem.image}
                alt={taxonomyItem.name}
                className="w-12 h-12 rounded-2xl object-contain bg-white border border-slate-200 p-1 shrink-0 shadow-xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-rose-200 uppercase shrink-0">
                {taxonomyItem.name.slice(0, 2)}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                  {taxonomyItem.type.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-400 font-mono">/{taxonomyItem.slug}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>{taxonomyItem.name}</span>
                {taxonomyItem.nameBN && (
                  <span className="text-sm font-medium text-rose-600 font-bengali">
                    ({taxonomyItem.nameBN})
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Manage which single products are tagged with this {taxonomyItem.type.replace('_', ' ')}.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NOTIFICATION TOAST */}
        {notification && (
          <div
            className={`px-5 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notification.text}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TABS & CONTROLS HEADER */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 bg-white space-y-3">
          {/* Segmented Tab Switcher */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
              <button
                onClick={() => {
                  setActiveTab('assigned');
                  setSelectedProductIds([]);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 font-bold rounded-lg transition-all ${
                  activeTab === 'assigned'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>Currently Assigned</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                    activeTab === 'assigned' ? 'bg-rose-100 text-rose-700 font-extrabold' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {assignedProducts.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('available');
                  setSelectedProductIds([]);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 font-bold rounded-lg transition-all ${
                  activeTab === 'available'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-rose-600" />
                <span>Assign from Catalog</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                    activeTab === 'available' ? 'bg-indigo-100 text-indigo-700 font-extrabold' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {availableProducts.length}
                </span>
              </button>
            </div>

            {/* Select All Toggle button */}
            {filteredList.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                {isAllVisibleSelected ? (
                  <CheckSquare className="w-4 h-4 text-rose-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>{isAllVisibleSelected ? 'Deselect All' : 'Select All Filtered'}</span>
                <span className="text-[10px] text-slate-400 font-mono">({filteredList.length})</span>
              </button>
            )}
          </div>

          {/* Search and Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search products by name, barcode, brand...`}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="All">All Categories</option>
                {categories.filter(c => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Stock toggle */}
              <button
                type="button"
                onClick={() => setStockFilter(stockFilter === 'all' ? 'in_stock' : 'all')}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors shrink-0 whitespace-nowrap ${
                  stockFilter === 'in_stock'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
                title="Filter in-stock items"
              >
                In Stock Only
              </button>
            </div>
          </div>
        </div>

        {/* PRODUCT LIST (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 space-y-2.5">
          {isLoadingProducts ? (
            <div className="space-y-3 py-8 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-rose-500" />
              <p className="text-xs">Loading products catalog...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-xs my-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Package className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                {activeTab === 'assigned'
                  ? `No products currently assigned to "${taxonomyItem.name}"`
                  : 'No available products match your search/filter'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                {activeTab === 'assigned'
                  ? 'Switch to the "Assign from Catalog" tab above to start tagging products.'
                  : 'Try changing your search keywords or category filters.'}
              </p>
              {activeTab === 'assigned' && (
                <button
                  onClick={() => setActiveTab('available')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Browse & Assign Products
                </button>
              )}
            </div>
          ) : (
            filteredList.map((product) => {
              const isSelected = selectedProductIds.includes(product.id);
              const price = product.retailPrice || product.price || 0;
              const stock = product.stock ?? 0;

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    if (activeTab === 'available') {
                      toggleSelectProduct(product.id);
                    }
                  }}
                  className={`bg-white rounded-2xl p-3.5 border transition-all flex items-center justify-between gap-3 group ${
                    activeTab === 'available' ? 'cursor-pointer hover:border-rose-300' : ''
                  } ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500'
                      : 'border-slate-200/90 hover:shadow-xs'
                  }`}
                >
                  {/* Left: Checkbox + Thumbnail + Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {activeTab === 'available' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectProduct(product.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-rose-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </button>
                    )}

                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-12 h-12 rounded-xl object-contain bg-slate-50 border border-slate-100 p-1 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200">
                        <Package className="w-6 h-6" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate" title={product.name}>
                          {product.name}
                        </h4>
                      </div>

                      {product.nameBN && (
                        <p className="text-[11px] text-slate-500 truncate font-bengali">
                          {product.nameBN}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span className="font-semibold text-slate-700">{product.brand || 'No Brand'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{product.category || 'General'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-bold text-rose-600 font-mono">৳{price.toLocaleString()}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold ${
                            stock > 0 ? 'text-emerald-600' : 'text-rose-500'
                          }`}
                        >
                          Stock: {stock}
                        </span>
                        {product.barcode && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-[100px] text-slate-400">BC: {product.barcode}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Action Button */}
                  <div className="shrink-0 flex items-center gap-2">
                    {activeTab === 'assigned' ? (
                      <button
                        type="button"
                        onClick={() => handleUnassignProducts([product.id])}
                        disabled={unassignMutation.isPending}
                        className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-xl border border-rose-200 transition-all flex items-center gap-1.5"
                        title="Remove tag from this product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Unassign</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBulkAssign();
                        }}
                        className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                          isSelected
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
                        }`}
                        title="Toggle selection"
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            {activeTab === 'available' && selectedProductIds.length > 0 ? (
              <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 font-mono">
                {selectedProductIds.length} {selectedProductIds.length === 1 ? 'product' : 'products'} selected
              </span>
            ) : (
              <span>
                Total {activeTab === 'assigned' ? 'assigned' : 'available'}:{' '}
                <strong className="text-slate-900 font-mono">{filteredList.length}</strong> items
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Close
            </button>

            {activeTab === 'available' ? (
              <button
                type="button"
                onClick={handleBulkAssign}
                disabled={selectedProductIds.length === 0 || assignMutation.isPending}
                className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:hover:bg-rose-600 rounded-xl shadow-xs transition-all flex items-center gap-2"
              >
                {assignMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  Assign {selectedProductIds.length > 0 ? `(${selectedProductIds.length})` : ''} Selected
                </span>
              </button>
            ) : (
              selectedProductIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleUnassignProducts(selectedProductIds)}
                  disabled={unassignMutation.isPending}
                  className="px-4 py-2 font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Unassign ({selectedProductIds.length}) Selected</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
