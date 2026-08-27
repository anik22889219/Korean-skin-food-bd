import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Heart, Star, Eye, Sparkles, Check, Droplets, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { analytics } from '../services/analyticsService';
import {
  getRetailPrice,
  getRetailOriginalPrice,
  hasRetailDiscount,
  getRetailDiscountPercentage,
  getRetailSavingsAmount,
  getWholesalePrice
} from '../utils/pricing';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
  showWishlist?: boolean;
  priority?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  showWishlist = true,
}) => {
  const navigate = useNavigate();
  const { addToCart, language } = useCart();
  const { profile } = useAuth();
  const [isAdded, setIsAdded] = useState(false);

  const hasWholesaleAccess = profile?.wholesaleAccess === true;
  const wholesaleTier1 = getWholesalePrice(product, 1);
  const wholesaleTier2 = getWholesalePrice(product, 50);

  // Local Wishlist State
  const [isWishlisted, setIsWishlisted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ksf_wishlist');
      if (saved) {
        const list: string[] = JSON.parse(saved);
        return list.includes(product.id);
      }
      return false;
    } catch {
      return false;
    }
  });

  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const saved = localStorage.getItem('ksf_wishlist');
      let list: string[] = saved ? JSON.parse(saved) : [];
      if (list.includes(product.id)) {
        list = list.filter((id) => id !== product.id);
        setIsWishlisted(false);
      } else {
        list.push(product.id);
        setIsWishlisted(true);
      }
      localStorage.setItem('ksf_wishlist', JSON.stringify(list));
    } catch (err) {
      console.warn('Wishlist toggle error:', err);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.stock === 0) return;
    addToCart(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1800);
  };

  const effectivePrice = getRetailPrice(product);
  const originalPrice = getRetailOriginalPrice(product);
  const hasDiscount = hasRetailDiscount(product);
  const discountPercent = getRetailDiscountPercentage(product);
  const savings = getRetailSavingsAmount(product);

  const displayName = language === 'bn' ? (product.nameBN || product.name) : product.name;

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => {
        analytics.trackSelectItem(product);
        navigate(`/product/${product.id}`);
      }}
      className="group relative bg-white rounded-2xl sm:rounded-3xl border border-pink-100/90 hover:border-pink-300/80 p-2.5 sm:p-3.5 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/10 cursor-pointer overflow-hidden select-none"
    >
      {/* Top Media / Thumbnail Section */}
      <div className="relative aspect-square w-full rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-b from-pink-50/40 via-white to-pink-50/20 border border-pink-50/80 mb-2 sm:mb-3">
        {/* Main Product Image */}
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {/* Top Badges Stack (Left) */}
        <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1 pointer-events-none">
          {hasWholesaleAccess && (
            <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
              <Building2 size={10} /> Wholesale Access
            </span>
          )}

          {hasDiscount && (
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-gradient-to-r from-[#E91E8C] to-pink-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-md shadow-pink-500/30">
              -{discountPercent}% OFF
            </span>
          )}

          {product.stock === 0 ? (
            <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 text-white text-[8px] sm:text-[9px] font-extrabold uppercase backdrop-blur-xs shadow-xs">
              Sold Out
            </span>
          ) : product.stock <= 5 ? (
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/90 text-white text-[8px] sm:text-[9px] font-extrabold uppercase backdrop-blur-xs shadow-xs">
              Only {product.stock} Left
            </span>
          ) : null}

          {product.category && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-md text-slate-700 text-[8px] sm:text-[9px] font-extrabold border border-pink-100/80 shadow-2xs">
              {product.category}
            </span>
          )}
        </div>

        {/* Top Floating Actions (Right) */}
        <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1.5">
          {showWishlist && (
            <button
              type="button"
              onClick={toggleWishlist}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm cursor-pointer ${
                isWishlisted
                  ? 'bg-[#E91E8C] text-white scale-105'
                  : 'bg-white/90 backdrop-blur-md text-slate-400 hover:text-[#E91E8C] hover:bg-white hover:scale-105'
              }`}
              title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            >
              <Heart
                size={14}
                className={`transition-transform duration-200 ${isWishlisted ? 'fill-current scale-110' : ''}`}
              />
            </button>
          )}
        </div>

        {/* Quick View Button on Desktop Hover */}
        <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex items-center justify-center p-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onQuickView) {
                onQuickView(product);
              } else {
                navigate(`/product/${product.id}`);
              }
            }}
            className="px-3.5 py-2 bg-white/95 backdrop-blur-md text-slate-900 hover:bg-[#E91E8C] hover:text-white rounded-xl text-xs font-black shadow-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer transform translate-y-2 group-hover:translate-y-0"
          >
            <Eye size={13} />
            <span>Quick View</span>
          </button>
        </div>
      </div>

      {/* Middle Content Section */}
      <div className="flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1">
          {/* Brand & Volume Header */}
          <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px]">
            <span className="font-black text-[#E91E8C] uppercase tracking-wider truncate">
              {product.brand || 'K-Beauty'}
            </span>
            {product.ml && (
              <span className="font-bold text-slate-400 font-mono shrink-0 bg-slate-100/80 px-1.5 py-0.2 rounded">
                {product.ml}
              </span>
            )}
          </div>

          {/* Product Title */}
          <h3
            className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#E91E8C] transition-colors duration-200 line-clamp-2 leading-snug min-h-[2.4em]"
            title={displayName}
          >
            {displayName}
          </h3>

          {/* Skin Type & Rating Pill Row */}
          <div className="flex items-center justify-between gap-1 pt-0.5">
            {product.skinTypes && product.skinTypes.length > 0 ? (
              <span className="text-[9px] font-bold text-slate-600 bg-pink-50/80 px-2 py-0.5 rounded-md truncate max-w-[110px] sm:max-w-[130px]">
                {product.skinTypes[0]}
              </span>
            ) : (
              <span className="text-[9px] font-bold text-slate-400">
                Seoul Authentic
              </span>
            )}

            <div className="flex items-center gap-0.5 text-amber-500 font-mono text-[10px] sm:text-[11px] shrink-0 font-bold">
              <Star size={11} className="fill-current text-amber-400" />
              <span>{product.rating ? Number(product.rating).toFixed(1) : '5.0'}</span>
              <span className="text-slate-400 text-[9px]">({product.reviewsCount || 14})</span>
            </div>
          </div>
        </div>

        {/* Pricing & CTA Container */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {/* Price details */}
          {hasWholesaleAccess ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-amber-800">Wholesale (1–49):</span>
                <span className="font-mono text-slate-900 font-extrabold">৳{wholesaleTier1.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold bg-amber-50/70 p-1 rounded-md border border-amber-200/60">
                <span className="text-amber-900">Bulk Tier (50+):</span>
                <span className="font-mono text-amber-950 font-black">৳{wholesaleTier2.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>Retail Ref:</span>
                <span className="line-through font-mono">৳{effectivePrice.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-black font-mono text-slate-950">
                  ৳{effectivePrice.toLocaleString()}
                </span>
                {hasDiscount && (
                  <span className="text-[10px] sm:text-xs font-mono line-through text-slate-400">
                    ৳{originalPrice.toLocaleString()}
                  </span>
                )}
              </div>

              {hasDiscount && savings > 0 && (
                <span className="hidden xs:inline-block text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100 font-mono">
                  Save ৳{savings}
                </span>
              )}
            </div>
          )}

          {/* Add to Bag CTA Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={`w-full py-2 sm:py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
              isAdded
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : product.stock === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-gradient-to-r from-[#E91E8C] to-pink-600 hover:from-[#FF4B91] hover:to-[#E91E8C] text-white shadow-md shadow-pink-500/20 hover:shadow-pink-500/35 active:scale-[0.98]'
            }`}
          >
            {isAdded ? (
              <>
                <Check size={13} className="animate-bounce" />
                <span>Added to Bag</span>
              </>
            ) : product.stock === 0 ? (
              <span>Out of Stock</span>
            ) : (
              <>
                <ShoppingBag size={13} />
                <span>Add to Bag</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
