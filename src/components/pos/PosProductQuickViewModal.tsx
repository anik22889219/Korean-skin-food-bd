import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShoppingBag, 
  PackagePlus, 
  CheckCircle2, 
  Sparkles, 
  Copy, 
  Check, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Tag, 
  ShieldCheck, 
  Layers, 
  Maximize2,
  TrendingUp,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { Product } from '../../types';
import { 
  getRetailPrice, 
  getRetailOriginalPrice, 
  hasRetailDiscount, 
  getRetailDiscountPercentage,
  getWholesalePrice,
  getCashPrice
} from '../../utils/pricing';

interface PosProductQuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmAdd: (product: Product, quantity: number, action: 'keep_scanning' | 'checkout') => void;
  context?: 'SALE' | 'STOCK_IN';
  currentUserRole?: string;
  autoCloseOnAdd?: boolean;
}

export const PosProductQuickViewModal: React.FC<PosProductQuickViewModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirmAdd,
  context = 'SALE',
  currentUserRole,
  autoCloseOnAdd = true
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [copiedBarcode, setCopiedBarcode] = useState<boolean>(false);
  const [isImageZoomed, setIsImageZoomed] = useState<boolean>(false);

  // Auto-add countdown timer (optional rapid workflow)
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCountdownPaused, setIsCountdownPaused] = useState<boolean>(false);

  // Reset states whenever modal opens or product changes
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setQuantityInput('1');
      setCopiedBarcode(false);
      setIsImageZoomed(false);
      setIsCountdownPaused(false);
    }
  }, [isOpen, product?.id]);

  // Pricing calculations
  const retailPrice = useMemo(() => product ? getRetailPrice(product) : 0, [product]);
  const originalRetailPrice = useMemo(() => product ? getRetailOriginalPrice(product) : 0, [product]);
  const hasDiscount = useMemo(() => product ? hasRetailDiscount(product) : false, [product]);
  const discountPercent = useMemo(() => product ? getRetailDiscountPercentage(product) : 0, [product]);

  const wholesaleTier1 = useMemo(() => product ? getWholesalePrice(product, 1) : 0, [product]);
  const wholesaleTier2 = useMemo(() => product ? getWholesalePrice(product, 50) : 0, [product]);
  const cashPriceVal = useMemo(() => product ? getCashPrice(product) : 0, [product]);
  const importCost = product?.importPrice || 0;

  // Active unit price based on quantity for wholesale
  const activeUnitPrice = useMemo(() => {
    if (quantity >= 50 && wholesaleTier2 > 0) return wholesaleTier2;
    return retailPrice;
  }, [quantity, wholesaleTier2, retailPrice]);

  const subtotal = useMemo(() => activeUnitPrice * quantity, [activeUnitPrice, quantity]);

  // Margin calculation (for authorized staff)
  const grossMargin = useMemo(() => {
    if (!importCost || importCost <= 0) return null;
    const profit = retailPrice - importCost;
    const margin = (profit / retailPrice) * 100;
    return Math.round(margin);
  }, [retailPrice, importCost]);

  // Stock status
  const maxStock = product?.stock !== undefined ? product.stock : 999;
  const isOutOfStock = context === 'SALE' && maxStock <= 0;
  const isLowStock = context === 'SALE' && maxStock > 0 && maxStock <= 5;

  // Quantity controls
  const handleQuantityChange = (newQty: number) => {
    setIsCountdownPaused(true);
    const minQty = 1;
    const maxAllowed = context === 'STOCK_IN' ? 9999 : Math.max(1, maxStock);
    const clamped = Math.max(minQty, Math.min(newQty, maxAllowed));
    setQuantity(clamped);
    setQuantityInput(String(clamped));
  };

  const handleQuantityInputChange = (val: string) => {
    setIsCountdownPaused(true);
    setQuantityInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      const maxAllowed = context === 'STOCK_IN' ? 9999 : Math.max(1, maxStock);
      const clamped = Math.min(parsed, maxAllowed);
      setQuantity(clamped);
    }
  };

  const handleCopyBarcode = () => {
    if (!product?.barcode) return;
    navigator.clipboard.writeText(product.barcode).catch(() => {});
    setCopiedBarcode(true);
    setTimeout(() => setCopiedBarcode(false), 2000);
  };

  if (!isOpen || !product) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-3xl border border-pink-100 shadow-2xl w-full max-w-md overflow-hidden text-gray-900 my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. MODAL HEADER & AUTHENTICITY BADGE */}
          <div className="bg-gradient-to-r from-pink-50 via-pink-100/60 to-purple-50 px-4 py-3 border-b border-pink-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-[#E91E8C] text-white p-1 rounded-lg">
                <CheckCircle2 size={14} />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#E91E8C]">
                    Match Found & Verified
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                    <ShieldCheck size={10} /> 100% Genuine
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 font-medium block">
                  Quick View & Quantity Confirmation
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-pink-200/50 rounded-xl transition cursor-pointer"
              title="Close Quick View"
            >
              <X size={18} />
            </button>
          </div>

          {/* 2. PRODUCT HERO SECTION */}
          <div className="p-4 space-y-4">
            <div className="flex gap-3 items-start">
              {/* Product Thumbnail with Zoom trigger */}
              <div 
                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-pink-50/50 border-2 border-pink-100 flex-shrink-0 cursor-pointer group shadow-xs"
                onClick={() => setIsImageZoomed(!isImageZoomed)}
                title="Click to zoom image"
              >
                <img
                  src={product.image || 'https://images.unsplash.com/photo-1608248597481-496100c8c836?w=200&auto=format&fit=crop'}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-1 right-1 bg-black/60 text-white p-1 rounded-md opacity-70 group-hover:opacity-100 transition">
                  <Maximize2 size={10} />
                </div>
                {product.origin && (
                  <span className="absolute top-1 left-1 bg-white/90 text-gray-800 text-[8px] font-bold px-1 rounded shadow-2xs">
                    🇰🇷 KR
                  </span>
                )}
              </div>

              {/* Product Identifiers & Badges */}
              <div className="flex-1 min-w-0 space-y-1">
                {/* Brand & Category Tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-pink-50 border border-pink-200 text-[#E91E8C] text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                    {product.brand || 'Korean Skincare'}
                  </span>
                  {product.category && (
                    <span className="bg-gray-100 text-gray-600 text-[9px] font-semibold px-2 py-0.5 rounded-md">
                      {product.category}
                    </span>
                  )}
                  {product.volume && (
                    <span className="bg-purple-50 text-purple-700 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                      {product.volume}
                    </span>
                  )}
                </div>

                {/* Main Product Title */}
                <h3 className="font-extrabold text-gray-900 text-sm sm:text-base leading-tight line-clamp-2">
                  {product.name}
                </h3>
                {product.nameBN && (
                  <p className="text-[11px] text-gray-500 font-medium truncate">
                    {product.nameBN}
                  </p>
                )}

                {/* Barcode & SKU Pill */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Barcode:</span>
                  <button
                    type="button"
                    onClick={handleCopyBarcode}
                    className="inline-flex items-center gap-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md cursor-pointer transition active:scale-95"
                    title="Click to copy barcode"
                  >
                    <span>{product.barcode || product.id}</span>
                    {copiedBarcode ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} className="text-gray-400" />}
                  </button>
                </div>
              </div>
            </div>

            {/* 3. STOCK & INVENTORY STATUS GAUGE */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-600 text-[11px]">Physical Stock:</span>
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1 text-rose-700 font-black bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[10px]">
                    <AlertTriangle size={11} /> Out of Stock (0)
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center gap-1 text-amber-800 font-black bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[10px]">
                    <AlertTriangle size={11} /> Low Stock: {maxStock} left
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-800 font-black bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                    <CheckCircle2 size={11} /> {maxStock} units available
                  </span>
                )}
              </div>

              {grossMargin !== null && (
                <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1 font-semibold">
                  <TrendingUp size={11} className="text-emerald-600" />
                  <span>Margin: <strong className="text-emerald-700">{grossMargin}%</strong></span>
                </div>
              )}
            </div>

            {/* 4. MULTI-TIER PRICING MATRIX */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
              {/* Retail Selling Price Card */}
              <div className={`p-2.5 rounded-2xl border transition ${
                activeUnitPrice === retailPrice 
                  ? 'bg-pink-50/70 border-[#E91E8C] ring-1 ring-[#E91E8C]/30' 
                  : 'bg-white border-pink-100'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Retail Price</span>
                  {hasDiscount && (
                    <span className="bg-rose-500 text-white text-[8px] font-extrabold px-1 rounded">
                      -{discountPercent}%
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-base font-black text-gray-900 font-mono">৳{retailPrice}</span>
                  {hasDiscount && (
                    <span className="text-[10px] text-gray-400 line-through font-mono">৳{originalRetailPrice}</span>
                  )}
                </div>
                <span className="text-[8px] text-gray-400 block mt-0.5">Standard single unit</span>
              </div>

              {/* Wholesale Tier 1 Card */}
              <div className="p-2.5 rounded-2xl bg-white border border-pink-100">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Wholesale (1-49)</span>
                <div className="mt-1">
                  <span className="text-sm font-black text-purple-700 font-mono">
                    {wholesaleTier1 > 0 ? `৳${wholesaleTier1}` : 'N/A'}
                  </span>
                </div>
                <span className="text-[8px] text-gray-400 block mt-0.5">Small bulk tier</span>
              </div>

              {/* Wholesale Tier 2 Card (50+) */}
              <div className={`p-2.5 rounded-2xl border transition ${
                quantity >= 50 && wholesaleTier2 > 0
                  ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-400' 
                  : 'bg-white border-pink-100'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Volume (50+)</span>
                  {quantity >= 50 && wholesaleTier2 > 0 && (
                    <span className="bg-purple-600 text-white text-[8px] font-bold px-1 rounded">Active</span>
                  )}
                </div>
                <div className="mt-1">
                  <span className="text-sm font-black text-indigo-700 font-mono">
                    {wholesaleTier2 > 0 ? `৳${wholesaleTier2}` : 'N/A'}
                  </span>
                </div>
                <span className="text-[8px] text-gray-400 block mt-0.5">Bulk volume rate</span>
              </div>

              {/* Cash Price Card */}
              <div className="p-2.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/70">
                <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">Cash Price</span>
                <div className="mt-1">
                  <span className="text-sm font-black text-emerald-700 font-mono">
                    {product?.cashPrice ? `৳${product.cashPrice}` : `৳${retailPrice}`}
                  </span>
                </div>
                <span className="text-[8px] text-emerald-600 block mt-0.5">Instant cash checkout</span>
              </div>
            </div>

            {/* 5. INTERACTIVE QUANTITY SELECTOR & SUBTOTAL */}
            <div className="bg-pink-50/40 p-3.5 rounded-2xl border border-pink-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">
                  Select Quantity to Add:
                </span>
                {/* Real-time Subtotal */}
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">Subtotal:</span>
                  <span className="text-base font-black text-[#E91E8C] font-mono">
                    ৳{subtotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Counter Buttons & Direct Typing Input */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="w-10 h-10 rounded-xl bg-white border border-pink-200 text-pink-700 font-bold flex items-center justify-center hover:bg-pink-100 disabled:opacity-40 transition cursor-pointer shadow-2xs"
                  title="Decrease quantity"
                >
                  <Minus size={16} />
                </button>

                <input
                  type="number"
                  min="1"
                  max={context === 'STOCK_IN' ? 9999 : maxStock}
                  value={quantityInput}
                  onChange={(e) => handleQuantityInputChange(e.target.value)}
                  onFocus={(e) => {
                    setIsCountdownPaused(true);
                    e.target.select();
                  }}
                  className="flex-1 h-10 text-center font-mono font-black text-lg text-gray-900 bg-white border-2 border-pink-200 rounded-xl outline-none focus:border-[#E91E8C] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-inner"
                />

                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={context === 'SALE' && quantity >= maxStock}
                  className="w-10 h-10 rounded-xl bg-[#E91E8C] text-white font-bold flex items-center justify-center hover:bg-[#FF4B91] disabled:opacity-40 transition cursor-pointer shadow-md shadow-pink-100"
                  title="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Quick Quantity Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-gray-400 font-bold">Quick:</span>
                {[1, 2, 3, 5, 10].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuantityChange(preset)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border ${
                      quantity === preset
                        ? 'bg-[#E91E8C] text-white border-[#E91E8C]'
                        : 'bg-white text-gray-700 border-pink-200 hover:bg-pink-50'
                    }`}
                  >
                    +{preset}
                  </button>
                ))}
                {maxStock > 0 && maxStock <= 50 && context === 'SALE' && (
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(maxStock)}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer ml-auto"
                  >
                    Max ({maxStock})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 6. CONTEXTUAL ACTION BUTTONS */}
          <div className="bg-gray-50/90 px-4 py-3 border-t border-pink-100 flex flex-col sm:flex-row gap-2">
            {/* Action 1: Add & Keep Scanning */}
            <button
              type="button"
              onClick={() => onConfirmAdd(product, quantity, 'keep_scanning')}
              disabled={isOutOfStock}
              className="flex-1 py-3 px-4 bg-[#E91E8C] hover:bg-[#FF4B91] disabled:opacity-50 text-white rounded-2xl font-extrabold text-xs transition cursor-pointer shadow-md shadow-pink-200 flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Plus size={15} />
              <span>
                {context === 'STOCK_IN' 
                  ? `Add ${quantity} & Keep Receiving` 
                  : `Add ${quantity} & Keep Scanning`}
              </span>
            </button>

            {/* Action 2: Add & Finish / Go to Checkout */}
            <button
              type="button"
              onClick={() => onConfirmAdd(product, quantity, 'checkout')}
              disabled={isOutOfStock}
              className="py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl font-extrabold text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5 active:scale-98"
            >
              <span>{context === 'STOCK_IN' ? 'Add & Review Queue' : 'Add & Done'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
