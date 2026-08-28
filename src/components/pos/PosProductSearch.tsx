import React, { useState, useMemo } from 'react';
import { Product } from '../../types';
import { Search, X, Plus, Package, Check, Sparkles, Filter } from 'lucide-react';
import { getRetailPrice } from '../../utils/pricing';

interface PosProductSearchProps {
  products: Product[];
  onAddToCart?: (product: Product) => void;
  onAddToStockIn?: (product: Product) => void;
  mode?: 'sale' | 'stock_in';
  cartQuantities?: Record<string, number>;
  stockInQuantities?: Record<string, number>;
}

export const PosProductSearch: React.FC<PosProductSearchProps> = ({
  products,
  onAddToCart,
  onAddToStockIn,
  mode = 'sale',
  cartQuantities = {},
  stockInQuantities = {}
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');

  // Extract unique categories and brands
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set).sort()];
  }, [products]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return ['All', ...Array.from(set).sort()];
  }, [products]);

  // Filter products based on search term, category, and brand
  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'All' || p.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchBrand = selectedBrand === 'All' || p.brand?.toLowerCase() === selectedBrand.toLowerCase();

      if (!matchCategory || !matchBrand) return false;

      if (!term) return true;

      const nameMatch = p.name?.toLowerCase().includes(term);
      const brandMatch = p.brand?.toLowerCase().includes(term);
      const barcodeMatch = p.barcode?.toLowerCase().includes(term);
      const idMatch = p.id?.toLowerCase().includes(term);
      const catMatch = p.category?.toLowerCase().includes(term);

      return nameMatch || brandMatch || barcodeMatch || idMatch || catMatch;
    });
  }, [products, query, selectedCategory, selectedBrand]);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-[32px] border border-pink-100 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Search size={18} className="text-[#E91E8C]" />
            <span>Product Catalog & Search</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {mode === 'sale'
              ? 'Find and add items directly to active POS cart'
              : 'Find products to receive into warehouse inventory'}
          </p>
        </div>

        <span className="text-[11px] font-bold text-pink-700 bg-pink-50 border border-pink-100 px-3 py-1 rounded-full font-mono">
          {filteredProducts.length} product(s)
        </span>
      </div>

      {/* Search Input Box */}
      <div className="relative">
        <Search size={18} className="text-pink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, brand, barcode (e.g. 880959...) or category..."
          className="w-full bg-pink-50/20 text-gray-800 text-xs sm:text-sm pl-11 pr-10 py-3 rounded-2xl border border-pink-200 outline-none focus:border-[#E91E8C] focus:bg-white focus:ring-4 focus:ring-[#E91E8C]/10 transition shadow-inner font-medium"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-600 cursor-pointer p-1"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Chips (Categories & Brands) */}
      <div className="space-y-2 text-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-[10px] font-bold uppercase text-gray-400 shrink-0 mr-1 flex items-center gap-1">
            <Filter size={11} /> Cat:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold transition shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#E91E8C] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-pink-50 hover:text-pink-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Brand Pills */}
        {brands.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10px] font-bold uppercase text-gray-400 shrink-0 mr-1 flex items-center gap-1">
              <Sparkles size={11} /> Brand:
            </span>
            {brands.slice(0, 15).map((brand) => (
              <button
                key={brand}
                type="button"
                onClick={() => setSelectedBrand(brand)}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer ${
                  selectedBrand === brand
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 space-y-2">
            <Package size={32} className="mx-auto text-pink-300" />
            <p className="text-xs font-bold text-gray-700">No products matching filters</p>
            <p className="text-[11px] text-gray-400">Try changing your search term or clearing category filter.</p>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const inCartQty = cartQuantities[p.id] || 0;
            const inStockInQty = stockInQuantities[p.id] || 0;
            const isOutOfStock = p.stock <= 0;
            const isMaxCart = mode === 'sale' && inCartQty >= p.stock;

            return (
              <div
                key={p.id}
                className={`p-3 rounded-2xl border transition flex items-center gap-3 group relative ${
                  mode === 'sale' && isOutOfStock
                    ? 'bg-gray-50/70 border-gray-200/60 opacity-60'
                    : mode === 'sale' && isMaxCart
                    ? 'bg-amber-50/30 border-amber-200'
                    : inStockInQty > 0
                    ? 'bg-emerald-50/30 border-emerald-200'
                    : inCartQty > 0
                    ? 'bg-pink-50/40 border-pink-200 shadow-2xs'
                    : 'bg-white border-pink-100/80 hover:border-pink-300 hover:bg-pink-50/20 shadow-2xs hover:shadow-sm'
                }`}
              >
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-12 h-12 object-cover rounded-xl border border-pink-100 shrink-0 group-hover:scale-105 transition shadow-2xs"
                  referrerPolicy="no-referrer"
                />

                <div className="min-w-0 flex-1 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] uppercase font-bold text-pink-600 truncate max-w-[110px]">
                      {p.brand}
                    </span>
                    {p.barcode && (
                      <span className="text-[9px] text-gray-400 font-mono">
                        #{p.barcode}
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-gray-900 truncate mt-0.5 text-xs" title={p.name}>
                    {p.name}
                  </h4>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[#E91E8C] font-black font-mono text-xs">
                      ৳{getRetailPrice(p)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isOutOfStock ? (
                        <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                          Stock 0
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500">
                          Stock: <strong className="text-emerald-600">{p.stock}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Button */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {mode === 'sale' ? (
                    <button
                      type="button"
                      disabled={isOutOfStock || isMaxCart}
                      onClick={() => onAddToCart && onAddToCart(p)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1 cursor-pointer ${
                        isOutOfStock || isMaxCart
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-[#E91E8C] hover:bg-[#FF4B91] text-white shadow-xs'
                      }`}
                    >
                      {inCartQty > 0 ? (
                        <>
                          <Check size={12} />
                          <span>{inCartQty} in cart</span>
                        </>
                      ) : (
                        <>
                          <Plus size={12} />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAddToStockIn && onAddToStockIn(p)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1 cursor-pointer ${
                        inStockInQty > 0
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-[#1E293B] hover:bg-gray-800 text-white shadow-xs'
                      }`}
                    >
                      {inStockInQty > 0 ? (
                        <>
                          <Check size={12} />
                          <span>+{inStockInQty} queue</span>
                        </>
                      ) : (
                        <>
                          <Plus size={12} />
                          <span>Receive</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
