import React from 'react';
import { CartItem, PricingMode, DeliveryArea } from './types';
import { ShoppingBag, Trash2, Plus, Minus, User, Phone, MapPin, Truck, Receipt, CheckCircle, Loader2 } from 'lucide-react';
import { getProductUnitPrice } from '../../utils/pricing';

interface PosCartProps {
  cartItems: CartItem[];
  pricingMode: PricingMode;
  onPricingModeChange: (mode: PricingMode) => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string, docIds: string[]) => void;
  onSetQuantity: (productId: string, docIds: string[], maxStock: number, rawValue: string) => void;
  onRemove: (productId: string, docIds: string[]) => void;
  onClearCart?: () => void;
  editingQty: Record<string, string>;
  setEditingQty: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  customerName: string;
  setCustomerName: (val: string) => void;
  customerPhone: string;
  setCustomerPhone: (val: string) => void;
  customerAddress: string;
  setCustomerAddress: (val: string) => void;
  deliveryArea: DeliveryArea;
  setDeliveryArea: (val: DeliveryArea) => void;
  onCheckout: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export const PosCart: React.FC<PosCartProps> = ({
  cartItems,
  pricingMode,
  onPricingModeChange,
  onIncrement,
  onDecrement,
  onSetQuantity,
  onRemove,
  onClearCart,
  editingQty,
  setEditingQty,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerAddress,
  setCustomerAddress,
  deliveryArea,
  setDeliveryArea,
  onCheckout,
  isSubmitting
}) => {
  const totalItemsCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);

  const subtotal = cartItems.reduce((sum, it) => {
    const unitPrice = getProductUnitPrice(it.product, pricingMode, it.quantity);
    return sum + unitPrice * it.quantity;
  }, 0);

  const deliveryCharge = deliveryArea === 'inside' ? 60 : deliveryArea === 'outside' ? 120 : 0;
  const grandTotal = subtotal + (cartItems.length > 0 ? deliveryCharge : 0);

  return (
    <form onSubmit={onCheckout} className="space-y-5">
      {/* CART ITEMS CONTAINER */}
      <div className="bg-white p-5 sm:p-6 rounded-[32px] border border-pink-100 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 border-b border-pink-50 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag className="text-[#E91E8C]" size={18} />
              <span>POS Cart & Checkout</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Real-time synchronized checkout register</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Pricing Mode Toggle */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => onPricingModeChange('retail')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  pricingMode === 'retail'
                    ? 'bg-[#E91E8C] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Retail
              </button>
              <button
                type="button"
                onClick={() => onPricingModeChange('wholesale')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  pricingMode === 'wholesale'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Wholesale</span>
                <span className="text-[9px] bg-purple-200/50 text-purple-900 px-1 py-0.2 rounded font-mono">1-49 / 50+</span>
              </button>
            </div>

            <span className="bg-pink-50 border border-pink-100 text-[#E91E8C] font-extrabold text-xs px-3 py-1 rounded-full font-mono shadow-xs">
              {totalItemsCount} pcs
            </span>

            {cartItems.length > 0 && onClearCart && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-gray-400 hover:text-red-600 text-xs font-semibold px-2 py-1 transition cursor-pointer"
                title="Clear all cart items"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Items List */}
        {cartItems.length === 0 ? (
          <div className="py-12 text-center space-y-3 text-gray-400">
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto text-[#E91E8C]/40 border border-pink-100">
              <ShoppingBag size={28} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-700">POS Cart is empty</p>
              <p className="text-[11px] text-gray-400">
                Scan barcodes using camera scanner or click products in the catalog to begin.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1 divide-y divide-pink-50/60">
            {cartItems.map((item) => {
              const price = getProductUnitPrice(item.product, pricingMode, item.quantity);
              const itemSubtotal = price * item.quantity;
              const isMaxStock = item.quantity >= item.product.stock;

              return (
                <div
                  key={item.product.id}
                  className="pt-3 first:pt-0 flex items-center justify-between text-xs transition gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-12 h-12 object-cover rounded-xl border border-pink-100 shadow-2xs shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] uppercase font-bold text-pink-600 block truncate">
                        {item.product.brand}
                      </span>
                      <h4 className="font-bold text-gray-900 truncate text-xs">{item.product.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[#E91E8C] font-extrabold font-mono text-xs">৳{price}</span>
                        {pricingMode === 'wholesale' && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              item.quantity >= 50
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {item.quantity >= 50
                              ? `Tier 50+ (৳${item.product.wholesalePrice50Plus ?? item.product.wholesalePrice})`
                              : `Tier 1-49 (৳${item.product.wholesalePrice ?? item.product.retailPrice})`}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">Stock: {item.product.stock}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Row Subtotal */}
                    <div className="text-right font-mono hidden sm:block">
                      <span className="text-[10px] text-gray-400 block">Subtotal</span>
                      <span className="font-extrabold text-gray-800 text-xs">৳{itemSubtotal}</span>
                    </div>

                    {/* Numeric Input & Step Buttons */}
                    <div className="flex items-center bg-white border border-pink-200 rounded-xl shadow-2xs overflow-hidden focus-within:border-[#E91E8C] focus-within:ring-2 focus-within:ring-[#E91E8C]/20 transition">
                      <button
                        type="button"
                        onClick={() => onDecrement(item.product.id, item.docIds)}
                        className="p-1.5 hover:bg-pink-50 text-gray-500 hover:text-pink-600 transition cursor-pointer shrink-0"
                        title="Decrease quantity (-)"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.product.stock}
                        value={
                          editingQty[item.product.id] !== undefined
                            ? editingQty[item.product.id]
                            : item.quantity
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingQty((prev) => ({ ...prev, [item.product.id]: val }));
                        }}
                        onFocus={(e) => e.target.select()}
                        onBlur={(e) =>
                          onSetQuantity(item.product.id, item.docIds, item.product.stock, e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-11 text-center text-gray-900 font-mono font-black text-xs py-1 px-0.5 border-x border-pink-100 bg-transparent outline-none focus:bg-pink-50/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => onIncrement(item.product.id)}
                        disabled={isMaxStock}
                        className={`p-1.5 transition cursor-pointer shrink-0 ${
                          isMaxStock
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'hover:bg-pink-50 text-gray-500 hover:text-pink-600'
                        }`}
                        title={isMaxStock ? 'Stock limit reached' : 'Increase quantity (+)'}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemove(item.product.id, item.docIds)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-xl transition cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CUSTOMER & DELIVERY INFORMATION */}
      <div className="bg-white p-5 sm:p-6 rounded-[32px] border border-pink-100 shadow-xs space-y-4 text-xs">
        <div className="border-b border-pink-50 pb-2.5">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <User size={15} className="text-[#E91E8C]" />
            <span>Customer & Delivery Details</span>
          </h4>
          <p className="text-[11px] text-gray-500 mt-0.5">Optional fields for customer invoice</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-gray-600 font-bold mb-1 flex items-center gap-1 text-[11px]">
              <User size={12} className="text-pink-500" />
              <span>Customer Name (Optional)</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g., Sadia Anjum"
              className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C] focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-1 flex items-center gap-1 text-[11px]">
              <Phone size={12} className="text-pink-500" />
              <span>Customer Mobile (Optional)</span>
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g., 01700000000"
              className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C] focus:bg-white transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-600 font-bold mb-1.5 flex items-center gap-1 text-[11px]">
            <Truck size={12} className="text-pink-500" />
            <span>Select Delivery Zone</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDeliveryArea('inside')}
              className={`p-2.5 rounded-xl border font-bold transition text-center cursor-pointer text-[11px] sm:text-xs ${
                deliveryArea === 'inside'
                  ? 'bg-[#E91E8C]/10 border-[#E91E8C] text-[#E91E8C] shadow-2xs'
                  : 'bg-white border-pink-100 hover:bg-pink-50 text-gray-600'
              }`}
            >
              Inside Dhaka (৳60)
            </button>
            <button
              type="button"
              onClick={() => setDeliveryArea('outside')}
              className={`p-2.5 rounded-xl border font-bold transition text-center cursor-pointer text-[11px] sm:text-xs ${
                deliveryArea === 'outside'
                  ? 'bg-[#E91E8C]/10 border-[#E91E8C] text-[#E91E8C] shadow-2xs'
                  : 'bg-white border-pink-100 hover:bg-pink-50 text-gray-600'
              }`}
            >
              Outside Dhaka (৳120)
            </button>
            <button
              type="button"
              onClick={() => setDeliveryArea('none')}
              className={`p-2.5 rounded-xl border font-bold transition text-center cursor-pointer text-[11px] sm:text-xs ${
                deliveryArea === 'none'
                  ? 'bg-[#E91E8C]/10 border-[#E91E8C] text-[#E91E8C] shadow-2xs'
                  : 'bg-white border-pink-100 hover:bg-pink-50 text-gray-600'
              }`}
            >
              In-Store (৳0)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-gray-600 font-bold mb-1 flex items-center gap-1 text-[11px]">
            <MapPin size={12} className="text-pink-500" />
            <span>Delivery Address (Optional)</span>
          </label>
          <textarea
            rows={2}
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            placeholder="Street address, Area, City"
            className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C] focus:bg-white transition"
          />
        </div>
      </div>

      {/* ORDER SUMMARY & CHECKOUT BUTTON */}
      <div className="bg-gradient-to-b from-pink-50/40 to-pink-50/90 p-5 sm:p-6 rounded-[32px] border border-pink-200/80 shadow-xs space-y-4 text-xs">
        <div className="border-b border-pink-200/60 pb-2 flex items-center justify-between">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt size={15} className="text-[#E91E8C]" />
            <span>Order Summary</span>
          </h4>
          <span className="font-mono text-[11px] text-pink-700 font-semibold">{totalItemsCount} total items</span>
        </div>

        <div className="space-y-1.5 font-mono text-gray-700">
          <div className="flex justify-between font-medium">
            <span className="text-gray-600">Items Subtotal:</span>
            <span className="font-bold text-gray-900">৳{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span className="text-gray-600">Delivery Charge:</span>
            <span className="font-bold text-gray-900">৳{cartItems.length > 0 ? deliveryCharge : 0}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-pink-200 shadow-2xs flex items-center justify-between mt-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-pink-600 block tracking-wider">Total Amount Due</span>
              <span className="text-xs sm:text-sm font-black text-gray-900">Grand Total BDT</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-[#E91E8C] font-mono">৳{grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={cartItems.length === 0 || isSubmitting}
          className="w-full bg-gradient-to-r from-[#FF4B91] to-[#E91E8C] hover:from-[#E91E8C] hover:to-[#D81B60] text-white py-4 rounded-2xl text-xs sm:text-sm font-extrabold transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-pink-200/60 active:scale-[0.99]"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Processing Checkout & Invoice...</span>
            </>
          ) : (
            <>
              <CheckCircle size={18} />
              <span>Confirm & Create Order (Generate Invoice)</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
