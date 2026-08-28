import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, MessageCircle, Star, Sparkles, ShieldCheck, Truck, Building2, Plus, Minus } from 'lucide-react';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { analytics } from '../services/analyticsService';
import { formatWhatsAppNumber } from '../services/chatbotService';
import {
  getRetailPrice,
  getRetailOriginalPrice,
  hasRetailDiscount,
  getRetailDiscountPercentage,
  getWholesalePrice
} from '../utils/pricing';

interface ProductQuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  whatsappNumber?: string;
}

export const ProductQuickViewModal: React.FC<ProductQuickViewModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  whatsappNumber = '8801755837545'
}) => {
  const navigate = useNavigate();
  const trackedProductIdRef = useRef<string | null>(null);

  const [quantity, setQuantity] = useState<number>(1);
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [selectedWholesaleTier, setSelectedWholesaleTier] = useState<'1-49' | '50+'>('1-49');

  // Reset state when product or modal opens
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setQuantityInput('1');
      setSelectedWholesaleTier('1-49');
    }
  }, [isOpen, product?.id]);

  // Authoritative Track ViewContent (Meta) and view_item (GA4) on Quick View open with re-render deduplication
  useEffect(() => {
    if (isOpen && product && product.id) {
      if (trackedProductIdRef.current !== product.id) {
        trackedProductIdRef.current = product.id;
        analytics.trackViewItem(product);
      }
    } else if (!isOpen) {
      trackedProductIdRef.current = null;
    }
  }, [isOpen, product]);

  const { profile } = useAuth();
  const hasWholesaleAccess = profile?.wholesaleAccess === true;
  const wholesaleTier1 = useMemo(() => getWholesalePrice(product, 1), [product]);
  const wholesaleTier2 = useMemo(() => getWholesalePrice(product, 50), [product]);

  const currentPrice = getRetailPrice(product);
  const originalPrice = getRetailOriginalPrice(product);
  const hasDiscount = hasRetailDiscount(product);
  const discountPercent = getRetailDiscountPercentage(product);

  const activeUnitPrice = hasWholesaleAccess 
    ? (selectedWholesaleTier === '50+' || quantity >= 50 ? wholesaleTier2 : wholesaleTier1)
    : currentPrice;

  // Quantity Change Handlers
  const handleQuantityChange = (newQty: number) => {
    const maxStock = product?.stock && product.stock > 0 ? product.stock : 9999;
    const clamped = Math.max(1, Math.min(newQty, maxStock));
    setQuantity(clamped);
    setQuantityInput(String(clamped));
    if (clamped >= 50) {
      setSelectedWholesaleTier('50+');
    } else if (selectedWholesaleTier === '50+' && clamped < 50) {
      setSelectedWholesaleTier('1-49');
    }
  };

  const handleQuantityInputChange = (val: string) => {
    setQuantityInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1) {
      const maxStock = product?.stock && product.stock > 0 ? product.stock : 9999;
      const clamped = Math.min(num, maxStock);
      setQuantity(clamped);
      if (clamped >= 50) {
        setSelectedWholesaleTier('50+');
      } else if (selectedWholesaleTier === '50+' && clamped < 50) {
        setSelectedWholesaleTier('1-49');
      }
    }
  };

  const handleQuantityInputBlur = () => {
    const num = parseInt(quantityInput, 10);
    const maxStock = product?.stock && product.stock > 0 ? product.stock : 9999;
    if (isNaN(num) || num < 1) {
      setQuantity(1);
      setQuantityInput('1');
      if (selectedWholesaleTier === '50+') {
        setSelectedWholesaleTier('1-49');
      }
    } else {
      const clamped = Math.min(num, maxStock);
      setQuantity(clamped);
      setQuantityInput(String(clamped));
    }
  };

  if (!isOpen || !product) return null;

  const handleWhatsAppOrder = () => {
    const pageUrl = `${window.location.origin}/product/${product.id}`;
    const totalAmount = activeUnitPrice * quantity;
    const summaryText =
      `🌸 *Order Inquiry - Korean Skin Food BD* 🌸\n` +
      `--------------------------------------\n` +
      `📦 *Product:* ${product.name}\n` +
      `🏷️ *Brand:* ${product.brand || 'K-Beauty'}\n` +
      `💰 *Unit Price:* ৳${activeUnitPrice.toLocaleString()} BDT\n` +
      `🔢 *Quantity:* ${quantity} pcs\n` +
      `💳 *Total Estimated:* ৳${totalAmount.toLocaleString()} BDT\n` +
      (hasWholesaleAccess ? `🏢 *Wholesale Tier:* ${selectedWholesaleTier === '50+' || quantity >= 50 ? 'Bulk 50+ pcs' : 'Wholesale 1-49 pcs'}\n` : '') +
      `📁 *Category:* ${product.category || 'Skincare'}\n` +
      `⚡ *Availability:* ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}\n` +
      `🔗 *Product Link:* ${pageUrl}\n` +
      `--------------------------------------\n` +
      `Hello! I would like to order ${quantity} unit(s) of this authentic Korean skincare product.`;

    const encodedSummary = encodeURIComponent(summaryText);
    const targetNumber = formatWhatsAppNumber(whatsappNumber);
    const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodedSummary}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleViewFullDetails = () => {
    onClose();
    navigate(`/product/${product.id}`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 relative shadow-2xl border border-pink-100 max-h-[90vh] overflow-y-auto space-y-6"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-[#E91E8C] rounded-full hover:bg-pink-50 transition cursor-pointer"
            aria-label="Close Quick View"
          >
            <X size={20} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Thumbnail Image */}
            <div className="relative aspect-square bg-gradient-to-b from-pink-50/40 via-white to-pink-50/20 rounded-2xl overflow-hidden border border-pink-100 flex items-center justify-center">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {hasDiscount && (
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#E91E8C] to-pink-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                  -{discountPercent}% OFF
                </span>
              )}
            </div>

            {/* Product Meta & Actions */}
            <div className="space-y-3.5">
              <div>
                <span className="text-[10px] font-black uppercase text-[#E91E8C] tracking-widest block">
                  {product.brand || 'K-Beauty'}
                </span>
                <h3 className="text-base sm:text-lg font-serif font-black text-slate-900 leading-snug">
                  {product.name}
                </h3>
              </div>

              {/* Pricing */}
              {hasWholesaleAccess ? (
                <div className="p-3 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/50 rounded-2xl border-2 border-amber-300 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black">
                    <span className="text-amber-800 flex items-center gap-1">
                      <Building2 size={12} /> Wholesale Access Active
                    </span>
                    <span className="text-amber-950 font-bold bg-amber-200/50 px-2 py-0.5 rounded-full text-[10px]">
                      {selectedWholesaleTier === '50+' || quantity >= 50 ? '50+ Tier' : '1–49 Tier'}
                    </span>
                  </div>

                  {/* Side-by-side retail & wholesale */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div className="p-2 bg-white rounded-lg border border-amber-200/80">
                      <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Retail Price</span>
                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-sm font-black text-slate-800">৳{currentPrice.toLocaleString()}</span>
                        {hasDiscount && (
                          <span className="text-[10px] text-gray-400 line-through">৳{originalPrice.toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="p-2 bg-amber-100/80 rounded-lg border border-amber-300">
                      <span className="text-[9px] text-amber-950 font-black block uppercase tracking-wider">
                        Wholesale ({selectedWholesaleTier === '50+' || quantity >= 50 ? '50+' : '1–49'})
                      </span>
                      <div className="text-sm font-black text-amber-950 font-mono">
                        ৳{(selectedWholesaleTier === '50+' || quantity >= 50 ? wholesaleTier2 : wholesaleTier1).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* 50+ Price Button */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedWholesaleTier === '50+') {
                          setSelectedWholesaleTier('1-49');
                          if (quantity >= 50) {
                            setQuantity(1);
                            setQuantityInput('1');
                          }
                        } else {
                          setSelectedWholesaleTier('50+');
                          if (quantity < 50) {
                            setQuantity(50);
                            setQuantityInput('50');
                          }
                        }
                      }}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-black transition-all flex items-center justify-between border cursor-pointer ${
                        selectedWholesaleTier === '50+' || quantity >= 50
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                          : 'bg-white hover:bg-amber-100 text-amber-950 border-amber-300'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Sparkles size={11} className={selectedWholesaleTier === '50+' || quantity >= 50 ? 'fill-current' : 'text-amber-600'} />
                        <span>50+ Bulk Price</span>
                      </span>
                      <span className="font-mono font-black">৳{wholesaleTier2.toLocaleString()}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-mono font-bold">
                  <span className="text-xl text-slate-900 font-black">
                    ৳{currentPrice.toLocaleString()} BDT
                  </span>
                  {hasDiscount && (
                    <span className="line-through text-slate-400">
                      ৳{originalPrice.toLocaleString()}
                    </span>
                  )}
                </div>
              )}

              {/* Stock Status */}
              <div className="flex items-center gap-2 text-xs">
                {product.stock > 0 ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <ShieldCheck size={13} /> In Stock ({product.stock} units)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    Sold Out / Pre-order
                  </span>
                )}
                {product.category && (
                  <span className="text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                    {product.category}
                  </span>
                )}
              </div>

              {/* Quantity Selector Section */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span>Quantity:</span>
                  <span className="text-slate-500 font-mono">
                    Subtotal: ৳{(activeUnitPrice * quantity).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center bg-pink-50/40 border border-pink-100 rounded-xl p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-[#E91E8C] hover:text-white text-slate-700 disabled:opacity-30 flex items-center justify-center transition border border-pink-100 shadow-2xs cursor-pointer active:scale-95 disabled:cursor-not-allowed"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={product.stock > 0 ? product.stock : 9999}
                      value={quantityInput}
                      onChange={(e) => handleQuantityInputChange(e.target.value)}
                      onBlur={handleQuantityInputBlur}
                      className="w-12 text-center font-mono font-black text-sm text-slate-900 bg-transparent focus:outline-none appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={product.stock > 0 && quantity >= product.stock}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-[#E91E8C] hover:text-white text-slate-700 disabled:opacity-30 flex items-center justify-center transition border border-pink-100 shadow-2xs cursor-pointer active:scale-95 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                {product.description}
              </p>

              {/* Action Buttons */}
              <div className="pt-1 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(product, quantity);
                    onClose();
                  }}
                  disabled={product.stock === 0}
                  className={`w-full py-3 rounded-xl text-xs font-extrabold cursor-pointer transition shadow-md flex items-center justify-center gap-2 ${
                    product.stock > 0
                      ? 'bg-[#E91E8C] hover:bg-pink-600 text-white active:scale-[0.99]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <ShoppingBag size={15} />
                  <span>
                    {product.stock > 0 
                      ? (quantity > 1 ? `Add ${quantity} to Bag & View Cart` : 'Add to Bag & View Cart') 
                      : 'Currently Unavailable'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppOrder}
                  className="w-full py-2.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white rounded-xl text-xs font-extrabold cursor-pointer transition shadow-xs flex items-center justify-center gap-2"
                >
                  <MessageCircle size={16} className="fill-white" />
                  <span>Order via WhatsApp ({quantity} pcs)</span>
                </button>

                <button
                  type="button"
                  onClick={handleViewFullDetails}
                  className="w-full py-2 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] rounded-xl text-xs font-extrabold cursor-pointer transition text-center block border border-pink-200"
                >
                  View Full Details Page →
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
