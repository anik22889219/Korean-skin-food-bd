import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Camera, ShoppingBag, Eye, Sparkles, ChevronRight, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { analytics } from '../services/analyticsService';
import { getRetailPrice, getRetailOriginalPrice, hasRetailDiscount } from '../utils/pricing';

interface HeaderSearchProps {
  products: Product[];
  onOpenImageSearch: () => void;
  onAddToCart?: (product: Product) => void;
  className?: string;
}

export const HeaderSearch: React.FC<HeaderSearchProps> = ({
  products,
  onOpenImageSearch,
  onAddToCart,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter matching products
  const matchingProducts = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    return products.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(query);
      const nameBNMatch = p.nameBN ? p.nameBN.toLowerCase().includes(query) : false;
      const brandMatch = p.brand.toLowerCase().includes(query);
      const catMatch = p.category.toLowerCase().includes(query);
      const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(query) : false;
      const descMatch = p.description ? p.description.toLowerCase().includes(query) : false;

      return nameMatch || nameBNMatch || brandMatch || catMatch || barcodeMatch || descMatch;
    }).slice(0, 8); // Top 8 results
  }, [products, searchTerm]);

  const handleSelectProduct = (product: Product) => {
    if (searchTerm.trim()) {
      analytics.trackSearch(searchTerm.trim());
    }
    setIsOpen(false);
    setSearchTerm('');
    navigate(`/product/${product.id}`);
  };

  const handleClear = () => {
    setSearchTerm('');
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div ref={dropdownRef} className={`relative w-full max-w-md ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 text-rose-400 w-4 h-4 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (searchTerm.trim()) setIsOpen(true);
          }}
          placeholder="Search products, brands, ingredients, barcode..."
          className="w-full bg-slate-50 hover:bg-rose-50/20 focus:bg-white border border-rose-100 hover:border-rose-300 focus:border-rose-500 rounded-xl pl-9 pr-20 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition-all shadow-2xs focus:shadow-md"
        />

        {/* Action Controls: Clear button + Camera/Image Search Button */}
        <div className="absolute right-1.5 flex items-center gap-1">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenImageSearch}
            className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Search Products by Image / Photo"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Photo</span>
          </button>
        </div>
      </div>

      {/* Live Dropdown Selector Overlay */}
      {isOpen && searchTerm.trim() !== '' && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-rose-100 overflow-hidden z-50 animate-fadeIn">
          {/* Dropdown Header */}
          <div className="px-4 py-2 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-rose-700 flex items-center gap-1">
              <Search className="w-3.5 h-3.5" /> Search Results ({matchingProducts.length})
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Type or Click to select</span>
          </div>

          {/* Result List */}
          {matchingProducts.length > 0 ? (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {matchingProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="p-3 hover:bg-rose-50/50 cursor-pointer transition-colors flex items-center gap-3 group"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded-xl bg-slate-100 border border-slate-200 shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100">
                        {product.brand}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        • {product.category}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-rose-600 transition-colors">
                      {product.name}
                    </h4>
                    {product.nameBN && (
                      <p className="text-[11px] text-slate-500 font-bn truncate">
                        {product.nameBN}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-black text-rose-600">
                        ৳{getRetailPrice(product).toLocaleString()}
                      </span>
                      {hasRetailDiscount(product) && (
                        <span className="text-[10px] text-slate-400 line-through">
                          ৳{getRetailOriginalPrice(product).toLocaleString()}
                        </span>
                      )}
                      <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                        product.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {product.stock > 0 ? `${product.stock} available` : 'Out of Stock'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {onAddToCart && product.stock > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(product);
                          setIsOpen(false);
                          setSearchTerm('');
                        }}
                        className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors shadow-2xs"
                        title="Add to Cart"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="p-6 text-center space-y-3">
              <p className="text-xs font-semibold text-slate-700">No products matched "{searchTerm}"</p>
              <p className="text-[11px] text-slate-500">
                Try searching by brand name (COSRX, Anua), category, or scan using Photo Search.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenImageSearch();
                }}
                className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" /> Try Photo Search
              </button>
            </div>
          )}

          {/* Footer view all link */}
          {matchingProducts.length > 0 && (
            <div
              onClick={() => {
                setIsOpen(false);
                navigate(`/shop?search=${encodeURIComponent(searchTerm)}`);
              }}
              className="p-2 bg-slate-50 hover:bg-rose-50/80 border-t border-slate-100 text-center text-xs text-rose-600 font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
            >
              <span>View all store catalog results for "{searchTerm}"</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
