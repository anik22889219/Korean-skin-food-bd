import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, MessageCircle, Star, Sparkles, ShieldCheck, Truck } from 'lucide-react';
import { Product } from '../types';
import { analytics } from '../services/analyticsService';
import { formatWhatsAppNumber } from '../services/chatbotService';

interface ProductQuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
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

  if (!isOpen || !product) return null;

  const currentPrice = product.discountPrice || product.price;
  const hasDiscount = !!product.discountPrice && product.discountPrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
    : 0;

  const handleWhatsAppOrder = () => {
    const pageUrl = `${window.location.origin}/product/${product.id}`;
    const summaryText =
      `🌸 *Order Inquiry - Korean Skin Food BD* 🌸\n` +
      `--------------------------------------\n` +
      `📦 *Product:* ${product.name}\n` +
      `🏷️ *Brand:* ${product.brand || 'K-Beauty'}\n` +
      `💰 *Price:* ৳${currentPrice.toLocaleString()} BDT\n` +
      `📁 *Category:* ${product.category || 'Skincare'}\n` +
      `⚡ *Availability:* ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}\n` +
      `🔗 *Product Link:* ${pageUrl}\n` +
      `--------------------------------------\n` +
      `Hello! I would like to order this authentic Korean skincare product.`;

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
              <div className="flex items-center gap-2 text-xs font-mono font-bold">
                <span className="text-xl text-slate-900 font-black">
                  ৳{currentPrice.toLocaleString()} BDT
                </span>
                {hasDiscount && (
                  <span className="line-through text-slate-400">
                    ৳{product.price.toLocaleString()}
                  </span>
                )}
              </div>

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

              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                {product.description}
              </p>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(product);
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
                  <span>{product.stock > 0 ? 'Add to Bag & View Cart' : 'Currently Unavailable'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppOrder}
                  className="w-full py-2.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white rounded-xl text-xs font-extrabold cursor-pointer transition shadow-xs flex items-center justify-center gap-2"
                >
                  <MessageCircle size={16} className="fill-white" />
                  <span>Order via WhatsApp</span>
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
