import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, ShoppingBag, Truck, PackageCheck, AlertCircle, CheckCircle2, 
  Trash2, Plus, Minus, ArrowLeft, Sparkles, ShieldCheck, 
  Info, ExternalLink, RefreshCw, Layers, Calculator, PhoneCall, MapPin, 
  User, Hash, FileText, Check, Search, X, TrendingUp, TrendingDown,
  ArrowRight, DollarSign, Percent, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWholesaleCart } from '../context/WholesaleCartContext';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/queries/products';
import { Product } from '../types';

export const WholesaleCheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const {
    cart,
    addToWholesaleCart,
    updateWholesaleCartQty,
    updateWholesaleItemCodPrice,
    removeFromWholesaleCart,
    clearWholesaleCart,
    totalUnits,
    wholesaleSubtotal,
    totalWholesaleCost,
    totalCodValue,
    totalProfit,
    isTotalLoss,
    totalUniqueItems,
    checkoutType,
    setCheckoutType,
    codForm,
    setCodForm,
    parcelForm,
    setParcelForm,
    validationErrors,
    setValidationErrors,
    isSubmitting,
    submitSuccess,
    submittedOrderSummary,
    resetSubmission,
    handleWholesaleSubmit
  } = useWholesaleCart();

  const { data: allProducts = [] } = useProducts();
  const [quickSearch, setQuickSearch] = useState('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Automatically sync codForm.codPrice and parcelForm.codPrice with totalCodValue (COD Price Per Unit * quantity)
  useEffect(() => {
    if (totalCodValue >= 0) {
      setCodForm(prev => ({ ...prev, codPrice: String(totalCodValue) }));
      setParcelForm(prev => ({ ...prev, codPrice: String(totalCodValue) }));
    }
  }, [totalCodValue]);

  // Filter products for quick add catalog
  const filteredProducts = useMemo(() => {
    if (!quickSearch.trim()) return allProducts.slice(0, 12);
    const q = quickSearch.toLowerCase();
    return allProducts.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.brand?.toLowerCase().includes(q) || 
      p.barcode?.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [allProducts, quickSearch]);

  // Wholesaler margin calculation for active form field
  const currentCodPriceStr = checkoutType === 'COD_DIRECT' ? codForm.codPrice : parcelForm.codPrice;
  const parsedCodPrice = Number(currentCodPriceStr) || 0;
  const wholesalerMargin = parsedCodPrice > 0 ? parsedCodPrice - wholesaleSubtotal : 0;
  const isCodBelowCost = parsedCodPrice > 0 && parsedCodPrice < wholesaleSubtotal;

  const isWholesaleAuthorized = profile?.wholesaleAccess === true;

  // Clear specific validation error on change
  const handleCodChange = (field: keyof typeof codForm, value: string) => {
    setCodForm(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleParcelChange = (field: keyof typeof parcelForm, value: string) => {
    setParcelForm(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-pink-100/80 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Link to="/wholesale/profile" className="hover:text-[#E91E8C] transition flex items-center gap-1">
                <Building2 size={13} className="text-[#E91E8C]" />
                <span>Wholesale Portal</span>
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-extrabold">B2B Wholesale Checkout</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Wholesale Cart & Checkout</span>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                B2B Tiered Pricing
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-pink-50 text-[#E91E8C] hover:bg-pink-100/80 border border-pink-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add More Products</span>
            </button>
            <Link
              to="/wholesale/profile"
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
            >
              Wholesale Profile
            </Link>
          </div>
        </div>

        {/* Wholesale Access Authorization Notice */}
        {!isWholesaleAuthorized && (
          <div className="p-4 bg-amber-500/10 border border-amber-300 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-black text-amber-950">Wholesale Account Pending / Guest Preview</p>
              <p className="leading-relaxed">
                You are currently viewing tiered wholesale pricing. To complete authorized wholesale orders with custom delivery terms or credit limits, ensure your wholesale partner status is approved.
              </p>
              <Link to="/wholesale/profile" className="inline-block text-[#E91E8C] font-extrabold hover:underline pt-0.5">
                Manage Wholesale Profile & Application &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Successful Submission View */}
        {submitSuccess && submittedOrderSummary ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border-2 border-emerald-300 p-6 sm:p-10 shadow-lg space-y-6 text-center max-w-2xl mx-auto"
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-black rounded-full">
                Order #{submittedOrderSummary.orderNumber || submittedOrderSummary.id || 'CONFIRMED'}
              </span>
              <h2 className="text-2xl font-black text-slate-900">Wholesale Order Created Successfully!</h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Your wholesale order with checkout mode <strong className="text-slate-900 font-extrabold">[{submittedOrderSummary.checkoutInfo?.checkoutType === 'COD' || checkoutType === 'COD_DIRECT' ? 'Type 1: COD / Direct Customer Delivery' : 'Type 2: Parcel / Existing Courier'}]</strong> has been securely validated, recorded, and queued for warehouse fulfillment.
              </p>
            </div>

            {/* Authoritative Order Details Summary */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-3.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Status & Reference</span>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] uppercase">
                    {submittedOrderSummary.status || 'pending'}
                  </span>
                  <span className="font-extrabold px-2.5 py-0.5 rounded-full bg-pink-100 text-[#E91E8C] border border-pink-200">
                    {submittedOrderSummary.checkoutInfo?.checkoutType === 'COD' || checkoutType === 'COD_DIRECT' ? 'Type 1: COD' : 'Type 2: Parcel'}
                  </span>
                </div>
              </div>

              {(submittedOrderSummary.checkoutInfo?.checkoutType === 'COD' || checkoutType === 'COD_DIRECT') ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 font-medium">Recipient Name:</span> <br />
                      <strong className="text-slate-900">{submittedOrderSummary.checkoutInfo?.deliveryName || submittedOrderSummary.formData?.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Contact Phone:</span> <br />
                      <strong className="text-slate-900">{submittedOrderSummary.checkoutInfo?.deliveryPhone || submittedOrderSummary.formData?.customerPhone}</strong>
                    </div>
                  </div>
                  <div className="text-slate-700">
                    <span className="text-slate-400 font-medium">Delivery Address:</span> <br />
                    <span className="font-medium text-slate-800">{submittedOrderSummary.checkoutInfo?.deliveryAddress || submittedOrderSummary.formData?.customerAddress}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 font-medium">Parcel ID:</span> <br />
                      <strong className="font-mono text-slate-900">{submittedOrderSummary.checkoutInfo?.parcelId || submittedOrderSummary.formData?.parcelId}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Velouria ID:</span> <br />
                      <strong className="font-mono text-slate-900">{submittedOrderSummary.checkoutInfo?.velouriaId || submittedOrderSummary.formData?.velouriaId}</strong>
                    </div>
                  </div>
                  <div className="text-slate-700">
                    <span className="text-slate-400 font-medium">Receiver / Consignment Name:</span> <br />
                    <strong className="text-slate-900">{submittedOrderSummary.checkoutInfo?.deliveryName || submittedOrderSummary.formData?.customerName}</strong>
                  </div>
                </>
              )}

              {/* Financial Recalculations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Wholesale Cost</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    ৳{Number(submittedOrderSummary.totalWholesaleCost ?? totalWholesaleCost).toLocaleString()} BDT
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-pink-200">
                  <span className="text-[10px] text-[#E91E8C] font-bold uppercase block">Customer COD Value</span>
                  <span className="font-mono font-black text-[#E91E8C] text-sm">
                    ৳{Number(submittedOrderSummary.totalCODValue ?? submittedOrderSummary.checkoutInfo?.codPrice ?? totalCodValue).toLocaleString()} BDT
                  </span>
                </div>
                <div className={`p-2.5 bg-white rounded-xl border ${Number(submittedOrderSummary.totalProfit ?? totalProfit) >= 0 ? 'border-emerald-200' : 'border-rose-200'}`}>
                  <span className={`text-[10px] font-bold uppercase block ${Number(submittedOrderSummary.totalProfit ?? totalProfit) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {Number(submittedOrderSummary.totalProfit ?? totalProfit) >= 0 ? 'Total Profit' : 'Total Loss'}
                  </span>
                  <span className={`font-mono font-black text-sm ${Number(submittedOrderSummary.totalProfit ?? totalProfit) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {Number(submittedOrderSummary.totalProfit ?? totalProfit) >= 0 
                      ? `+৳${Number(submittedOrderSummary.totalProfit ?? totalProfit).toLocaleString()} BDT` 
                      : `Loss: ৳${Math.abs(Number(submittedOrderSummary.totalProfit ?? totalProfit)).toLocaleString()} BDT`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={resetSubmission}
                className="w-full sm:w-auto px-6 py-3 bg-[#E91E8C] hover:bg-[#d0177c] text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-sm"
              >
                Place Another Wholesale Order
              </button>
              <button
                type="button"
                onClick={() => {
                  clearWholesaleCart();
                  resetSubmission();
                  navigate('/wholesale');
                }}
                className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Return to Wholesale Portal
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column (lg:col-span-7) - Items Review & Checkout Type Selector */}
            <div className="lg:col-span-7 space-y-6">

              {/* 1. Wholesale Cart Items Section */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-pink-100/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-pink-50">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={18} className="text-[#E91E8C]" />
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Wholesale Items ({totalUniqueItems})
                    </h2>
                  </div>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={clearWholesaleCart}
                      className="text-xs text-slate-400 hover:text-red-600 font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 size={13} />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <ShoppingBag size={40} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">Your wholesale cart is currently empty.</p>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddOpen(true)}
                      className="px-4 py-2.5 bg-[#E91E8C] hover:bg-[#d0177c] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>Browse & Add Wholesale Products</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => {
                      const isTier50 = item.quantity >= 50;
                      const codUnitPrice = item.customCodPrice !== undefined 
                        ? item.customCodPrice 
                        : (item.product.price ?? item.wholesaleUnitPrice);
                      
                      // Step 4 formulas
                      const unitProfit = codUnitPrice - item.wholesaleUnitPrice;
                      const totalProductProfit = (codUnitPrice - item.wholesaleUnitPrice) * item.quantity;
                      const totalItemWholesaleCost = item.wholesaleUnitPrice * item.quantity;
                      const totalItemCodValue = codUnitPrice * item.quantity;
                      const isItemLoss = unitProfit < 0;

                      return (
                        <div 
                          key={item.product.id}
                          className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/90 transition space-y-3 text-xs shadow-2xs"
                        >
                          {/* Top Row: Product Identity, Quantity Stepper, & Remove */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                            <div className="flex items-center gap-3 min-w-0">
                              <img 
                                src={item.product.image || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=200'} 
                                alt={item.product.name}
                                className="w-14 h-14 object-cover rounded-xl border border-pink-100 bg-white shrink-0 shadow-2xs"
                                referrerPolicy="no-referrer" 
                              />
                              <div className="min-w-0 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                                  {item.product.brand}
                                </span>
                                <h3 className="font-extrabold text-slate-900 truncate leading-tight text-sm">
                                  {item.product.name}
                                </h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-black text-[#E91E8C] text-sm">
                                    ৳{item.wholesaleUnitPrice.toLocaleString()}
                                  </span>
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                    isTier50 
                                      ? 'bg-amber-100 text-amber-900 border-amber-300' 
                                      : 'bg-slate-200 text-slate-700 border-slate-300'
                                  }`}>
                                    {isTier50 ? 'Tier: 50+ Bulk Rate' : 'Tier: 1–49 Standard Rate'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Quantity Controls & Remove */}
                            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center bg-white rounded-xl border border-slate-300 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => updateWholesaleCartQty(item.product.id, Math.max(1, item.quantity - 1))}
                                    className="p-1.5 text-slate-600 hover:text-[#E91E8C] cursor-pointer"
                                    title="Decrease quantity"
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={(e) => updateWholesaleCartQty(item.product.id, Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className="w-12 text-center font-mono font-extrabold text-xs text-slate-900 bg-transparent focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateWholesaleCartQty(item.product.id, item.quantity + 1)}
                                    className="p-1.5 text-slate-600 hover:text-[#E91E8C] cursor-pointer"
                                    title="Increase quantity"
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => updateWholesaleCartQty(item.product.id, isTier50 ? 1 : 50)}
                                  className={`px-2 py-1.5 rounded-lg text-[10px] font-black border transition cursor-pointer ${
                                    isTier50
                                      ? 'bg-amber-500 text-slate-950 border-amber-600'
                                      : 'bg-white text-slate-700 border-slate-300 hover:border-amber-400'
                                  }`}
                                  title="Set 50+ Volume Tier"
                                >
                                  50+ Tier
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeFromWholesaleCart(item.product.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Bottom Row: Profit Calculation Breakdown & Per-Product COD Price Input */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-white p-3 rounded-xl border border-slate-200">
                            {/* COD Price Input */}
                            <div className="sm:col-span-5 space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                                  COD Price (Per Unit) <span className="text-[#E91E8C]">*</span>
                                </label>
                                <span className="text-[9px] text-slate-400 font-semibold">Your Selling Price</span>
                              </div>
                              <div className="relative flex items-center">
                                <span className="absolute left-2.5 font-mono font-bold text-slate-400 text-xs">৳</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={codUnitPrice}
                                  onChange={(e) => updateWholesaleItemCodPrice(item.product.id, Math.max(0, parseFloat(e.target.value) || 0))}
                                  className={`w-full pl-6 pr-12 py-1.5 bg-slate-50 hover:bg-white focus:bg-white rounded-lg border font-mono font-black text-xs text-slate-900 outline-none transition ${
                                    isItemLoss ? 'border-rose-300 focus:border-rose-500 bg-rose-50/20' : 'border-slate-200 focus:border-[#E91E8C]'
                                  }`}
                                  placeholder="e.g. 600"
                                />
                                <span className="absolute right-2.5 font-bold text-slate-400 text-[10px]">BDT</span>
                              </div>
                            </div>

                            {/* Unit Metrics */}
                            <div className="sm:col-span-3 space-y-0.5 border-l-0 sm:border-l border-slate-100 sm:pl-3">
                              <span className="text-[10px] text-slate-400 font-medium block">Wholesale Price</span>
                              <span className="font-mono font-bold text-slate-800 text-xs block">
                                ৳{item.wholesaleUnitPrice.toLocaleString()}
                              </span>
                              <div className="pt-0.5">
                                <span className="text-[10px] text-slate-400 font-medium block">Profit Per Unit</span>
                                {isItemLoss ? (
                                  <span className="inline-block text-[11px] font-black font-mono text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                    Loss: ৳{Math.abs(unitProfit).toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="font-mono font-black text-emerald-700 text-xs block">
                                    +৳{unitProfit.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Total Product Financials & Total Profit */}
                            <div className="sm:col-span-4 space-y-1 border-l-0 sm:border-l border-slate-100 sm:pl-3 text-right">
                              <div className="flex justify-between sm:justify-end gap-3 text-[10px] text-slate-500">
                                <span>Wholesale Cost ({item.quantity}x):</span>
                                <span className="font-mono font-bold text-slate-900">৳{totalItemWholesaleCost.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between sm:justify-end gap-3 text-[10px] text-slate-500">
                                <span>COD Value ({item.quantity}x):</span>
                                <span className="font-mono font-bold text-[#E91E8C]">৳{totalItemCodValue.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between sm:justify-end items-center gap-2 pt-1 border-t border-slate-100">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                                  {isItemLoss ? 'Product Loss:' : 'Total Profit:'}
                                </span>
                                {isItemLoss ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-black font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                                    <span>Loss: ৳{Math.abs(totalProductProfit).toLocaleString()}</span>
                                  </span>
                                ) : (
                                  <span className="text-xs font-black font-mono text-emerald-700">
                                    +৳{totalProductProfit.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Checkout Type Selector */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-pink-100/80 shadow-xs space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase text-[#E91E8C] tracking-wider block">Step 2: Delivery & Checkout Method</span>
                  <h2 className="text-sm font-black text-slate-900">Select Wholesale Checkout Type</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Switch between COD customer fulfillment and existing courier parcel bookings at any time without losing your products or prices.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Type 1 Button */}
                  <button
                    type="button"
                    id="btn_select_type_cod"
                    onClick={() => setCheckoutType('COD_DIRECT')}
                    className={`p-4 rounded-2xl border-2 text-left transition cursor-pointer relative ${
                      checkoutType === 'COD_DIRECT'
                        ? 'bg-pink-50/50 border-[#E91E8C] ring-2 ring-pink-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-pink-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          checkoutType === 'COD_DIRECT' ? 'bg-[#E91E8C] text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Truck size={17} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-900 block">Type 1: COD Delivery</span>
                          <span className="text-[10px] text-slate-500 font-semibold">Direct Customer Fulfillment</span>
                        </div>
                      </div>
                      {checkoutType === 'COD_DIRECT' && (
                        <span className="w-5 h-5 rounded-full bg-[#E91E8C] text-white flex items-center justify-center">
                          <Check size={12} />
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Type 2 Button */}
                  <button
                    type="button"
                    id="btn_select_type_parcel"
                    onClick={() => setCheckoutType('PARCEL_COURIER')}
                    className={`p-4 rounded-2xl border-2 text-left transition cursor-pointer relative ${
                      checkoutType === 'PARCEL_COURIER'
                        ? 'bg-purple-50/50 border-purple-600 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-purple-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          checkoutType === 'PARCEL_COURIER' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <PackageCheck size={17} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-900 block">Type 2: Parcel / Courier</span>
                          <span className="text-[10px] text-slate-500 font-semibold">Existing Consignment Booking</span>
                        </div>
                      </div>
                      {checkoutType === 'PARCEL_COURIER' && (
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                          <Check size={12} />
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* 3. Dynamic Type-Specific Form Inputs */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-pink-100/80 shadow-xs space-y-5">
                
                {/* Form Header */}
                <div className="flex items-center justify-between pb-3 border-b border-pink-50">
                  <div className="flex items-center gap-2">
                    {checkoutType === 'COD_DIRECT' ? (
                      <Truck size={17} className="text-[#E91E8C]" />
                    ) : (
                      <PackageCheck size={17} className="text-purple-600" />
                    )}
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      {checkoutType === 'COD_DIRECT' 
                        ? 'Type 1: COD / Direct Customer Delivery Fields' 
                        : 'Type 2: Parcel / Existing Courier Fields'}
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Required Details</span>
                </div>

                {/* Validation Error Banner */}
                {Object.keys(validationErrors).length > 0 && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700">
                    <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-black text-red-800">Please correct the highlighted errors before submitting:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                        {Object.values(validationErrors).map((msg, i) => (
                          <li key={i}>{msg}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* TYPE 1: COD DIRECT CUSTOMER DELIVERY FORM */}
                {checkoutType === 'COD_DIRECT' && (
                  <div className="space-y-4 text-xs">
                    <div className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100/80 text-[11px] text-pink-900 flex items-start gap-2">
                      <Info size={15} className="text-[#E91E8C] shrink-0 mt-0.5" />
                      <span>
                        Enter your customer's shipping address and your desired COD collection price. Our warehouse will dispatch directly to your end customer on Cash on Delivery.
                      </span>
                    </div>

                    {/* Customer Name */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Customer Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          type="text"
                          id="cod_customer_name"
                          value={codForm.customerName}
                          onChange={(e) => handleCodChange('customerName', e.target.value)}
                          placeholder="e.g. Mahbuba Rahman"
                          className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 rounded-xl border text-slate-900 outline-none focus:bg-white transition ${
                            validationErrors.customerName ? 'border-red-400 bg-red-50/20' : 'border-slate-200 focus:border-[#E91E8C]'
                          }`}
                        />
                      </div>
                      {validationErrors.customerName && (
                        <p className="text-[10px] text-red-600 font-semibold mt-1">{validationErrors.customerName}</p>
                      )}
                    </div>

                    {/* Customer Phone */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Customer Contact Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <PhoneCall size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          type="tel"
                          id="cod_customer_phone"
                          value={codForm.customerPhone}
                          onChange={(e) => handleCodChange('customerPhone', e.target.value)}
                          placeholder="017XXXXXXXX / 018XXXXXXXX"
                          className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 rounded-xl border text-slate-900 outline-none focus:bg-white transition ${
                            validationErrors.customerPhone ? 'border-red-400 bg-red-50/20' : 'border-slate-200 focus:border-[#E91E8C]'
                          }`}
                        />
                      </div>
                      {validationErrors.customerPhone && (
                        <p className="text-[10px] text-red-600 font-semibold mt-1">{validationErrors.customerPhone}</p>
                      )}
                    </div>

                    {/* Customer Address */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Customer Full Delivery Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-3.5 top-3 text-slate-400" />
                        <textarea
                          rows={2}
                          id="cod_customer_address"
                          value={codForm.customerAddress}
                          onChange={(e) => handleCodChange('customerAddress', e.target.value)}
                          placeholder="House No, Road / Sector, Area, Thana / District..."
                          className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 rounded-xl border text-slate-900 outline-none focus:bg-white resize-none transition ${
                            validationErrors.customerAddress ? 'border-red-400 bg-red-50/20' : 'border-slate-200 focus:border-[#E91E8C]'
                          }`}
                        />
                      </div>
                      {validationErrors.customerAddress && (
                        <p className="text-[10px] text-red-600 font-semibold mt-1">{validationErrors.customerAddress}</p>
                      )}
                    </div>

                    {/* COD Price Input & Margin Breakdown */}
                    <div className="p-4 bg-gradient-to-br from-pink-50/40 via-white to-amber-50/30 rounded-2xl border border-pink-200/90 space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-800 font-black">
                            COD Price (Customer Selling Price) <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[10px] font-extrabold text-[#E91E8C] uppercase tracking-wider">
                            Your Choice Price
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 font-mono font-bold text-slate-400 text-sm">৳</span>
                          <input
                            type="number"
                            min={0}
                            id="cod_price_input"
                            value={codForm.codPrice}
                            onChange={(e) => handleCodChange('codPrice', e.target.value)}
                            placeholder="e.g. 3500"
                            className={`w-full pl-8 pr-16 py-2.5 bg-white rounded-xl border font-mono font-black text-slate-900 outline-none transition ${
                              validationErrors.codPrice ? 'border-red-400 bg-red-50/20' : 'border-pink-200 focus:border-[#E91E8C]'
                            }`}
                          />
                          <span className="absolute right-3.5 top-2.5 font-bold text-slate-400 text-xs">BDT</span>
                        </div>
                        {validationErrors.codPrice && (
                          <p className="text-[10px] text-red-600 font-semibold mt-1">{validationErrors.codPrice}</p>
                        )}
                      </div>

                      {/* Explanation & Live Margin Calculations */}
                      <div className="text-[11px] space-y-2 pt-1 border-t border-pink-100">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Wholesale Cost to You:</span>
                          <span className="font-mono font-bold text-slate-900">৳{wholesaleSubtotal.toLocaleString()} BDT</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Customer Collection (COD):</span>
                          <span className="font-mono font-bold text-[#E91E8C]">
                            ৳{parsedCodPrice > 0 ? parsedCodPrice.toLocaleString() : '0'} BDT
                          </span>
                        </div>

                        {parsedCodPrice > 0 && (
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between font-bold ${
                            wholesalerMargin >= 0 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}>
                            <span>Estimated Wholesaler Margin:</span>
                            <span className="font-mono font-black">
                              {wholesalerMargin >= 0 ? `+৳${wholesalerMargin.toLocaleString()} BDT` : `-৳${Math.abs(wholesalerMargin).toLocaleString()} BDT`}
                            </span>
                          </div>
                        )}

                        {isCodBelowCost && (
                          <p className="text-[10px] text-amber-700 font-semibold">
                            Notice: Entered COD Price is lower than your wholesale cost. You are allowed to proceed if intended.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Order Note */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Order Note <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3.5 top-3 text-slate-400" />
                        <textarea
                          rows={2}
                          id="cod_order_note"
                          value={codForm.orderNote}
                          onChange={(e) => handleCodChange('orderNote', e.target.value)}
                          placeholder="Special packing requests, custom invoice instructions, or courier instructions..."
                          className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 rounded-xl border border-slate-200 text-slate-900 outline-none focus:bg-white focus:border-[#E91E8C] resize-none transition"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TYPE 2: PARCEL / EXISTING COURIER ORDER FORM */}
                {checkoutType === 'PARCEL_COURIER' && (
                  <div className="space-y-4 text-xs">
                    <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100 text-[11px] text-purple-900 flex items-start gap-2">
                      <Info size={15} className="text-purple-600 shrink-0 mt-0.5" />
                      <span>
                        Use this option if you have already generated a courier tracking / consignment ID (Steadfast, Velouria, Pathao, etc.). Our packing team will label your parcel with these tracking IDs.
                      </span>
                    </div>

                    {/* Parcel ID */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Parcel ID / Courier Tracking Code <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Hash size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          type="text"
                          id="parcel_id_input"
                          value={parcelForm.parcelId}
                          onChange={(e) => handleParcelChange('parcelId', e.target.value)}
                          placeholder="e.g. STF-84920492 / PTH-92041"
                          className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 rounded-xl border text-slate-900 font-mono outline-none focus:bg-white transition ${
                            validationErrors.parcelId ? 'border-red-400 bg-red-50/20' : 'border-slate-200 focus:border-purple-600'
                          }`}
                        />
                      </div>
                      {validationErrors.parcelId && (
                        <p className="text-[10px] text-red-600 font-semibold mt-1">{validationErrors.parcelId}</p>
                      )}
                    </div>

                    {/* Velouria ID */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Velouria ID / Platform Reference <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          type="text"
                          id="velouria_id_input"
                          value={parcelForm.velouriaId}
                          onChange={(e) => handleParcelChange('velouriaId', e.target.value)}
                          placeholder="e.g. VEL-49204"
                          className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 rounded-xl border text-slate-900 font-mono outline-none focus:bg-white transition ${
                            validationErrors.velouriaId ? 'border-red-400 bg-red-50/20' : 'border-slate-200 focus:border-purple-600'
                          }`}
                        />
                      </div>
                      {validationErrors.velouriaId && (
                        <p className="text-[10px] text-red-600 font-semibold mt-1">{validationErrors.velouriaId}</p>
                      )}
                    </div>

                    {/* Customer Name for Courier */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Customer Name on Parcel <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          type="text"
                          id="parcel_customer_name"
                          value={parcelForm.customerName}
                          onChange={(e) => handleParcelChange('customerName', e.target.value)}
                          placeholder="e.g. Farhana Yasmin"
                          className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 rounded-xl border text-slate-900 outline-none focus:bg-white transition ${
                            validationErrors.customerName ? 'border-red-400 bg-red-50/20' : 'border-slate-200 focus:border-purple-600'
                          }`}
                        />
                      </div>
                      {validationErrors.customerName && (
                        <p className="text-[10px] text-red-600 font-semibold mt-1">{validationErrors.customerName}</p>
                      )}
                    </div>

                    {/* COD Price Input & Margin Breakdown for Parcel/Courier */}
                    <div className="p-4 bg-gradient-to-br from-purple-50/40 via-white to-amber-50/30 rounded-2xl border border-purple-200/90 space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-800 font-black">
                            COD Price (Customer Selling Price) <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider">
                            Parcel COD Amount
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 font-mono font-bold text-slate-400 text-sm">৳</span>
                          <input
                            type="number"
                            min={0}
                            id="parcel_cod_price_input"
                            value={parcelForm.codPrice}
                            onChange={(e) => handleParcelChange('codPrice', e.target.value)}
                            placeholder="e.g. 3500"
                            className={`w-full pl-8 pr-16 py-2.5 bg-white rounded-xl border font-mono font-black text-slate-900 outline-none transition ${
                              validationErrors.codPrice ? 'border-red-400 bg-red-50/20' : 'border-purple-200 focus:border-purple-600'
                            }`}
                          />
                          <span className="absolute right-3.5 top-2.5 font-bold text-slate-400 text-xs">BDT</span>
                        </div>
                        {validationErrors.codPrice && (
                          <p className="text-[10px] text-red-600 font-semibold mt-1">{validationErrors.codPrice}</p>
                        )}
                      </div>

                      {/* Explanation & Live Margin Calculations */}
                      <div className="text-[11px] space-y-2 pt-1 border-t border-purple-100">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Wholesale Cost to You:</span>
                          <span className="font-mono font-bold text-slate-900">৳{wholesaleSubtotal.toLocaleString()} BDT</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Customer Collection (COD):</span>
                          <span className="font-mono font-bold text-purple-700">
                            ৳{parsedCodPrice > 0 ? parsedCodPrice.toLocaleString() : '0'} BDT
                          </span>
                        </div>

                        {parsedCodPrice > 0 && (
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between font-bold ${
                            wholesalerMargin >= 0 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}>
                            <span>Estimated Wholesaler Margin:</span>
                            <span className="font-mono font-black">
                              {wholesalerMargin >= 0 ? `+৳${wholesalerMargin.toLocaleString()} BDT` : `-৳${Math.abs(wholesalerMargin).toLocaleString()} BDT`}
                            </span>
                          </div>
                        )}

                        {isCodBelowCost && (
                          <p className="text-[10px] text-amber-700 font-semibold">
                            Notice: Entered COD Price is lower than your wholesale cost. You are allowed to proceed if intended.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (lg:col-span-5) - Order Summary & Submission */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Order Summary Card */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-pink-100/80 shadow-xs space-y-5 sticky top-24">
                <div className="pb-3 border-b border-pink-50 flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Wholesale Order Summary
                  </h2>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {totalUnits} Units
                  </span>
                </div>

                {/* Subtotal & Tier Breakdown */}
                <div className="space-y-3 text-xs font-medium">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Unique SKUs:</span>
                    <span className="font-bold text-slate-800">{totalUniqueItems} Products</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Total Quantity:</span>
                    <span className="font-bold text-slate-800">{totalUnits} Units</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Selected Fulfillment:</span>
                    <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                      checkoutType === 'COD_DIRECT' 
                        ? 'bg-pink-50 text-[#E91E8C] border border-pink-100' 
                        : 'bg-purple-50 text-purple-700 border border-purple-100'
                    }`}>
                      {checkoutType === 'COD_DIRECT' ? 'COD Direct Customer Delivery' : 'Parcel / Courier Order'}
                    </span>
                  </div>
                </div>

                {/* Step 4 Real-time Wholesale Profit Calculation Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-pink-50/20 to-slate-50 border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Financial Calculation
                    </span>
                    <span className="text-[9px] font-bold text-[#E91E8C] bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                      Real-Time Estimates
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Total Wholesale Cost */}
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-bold">Total Wholesale Cost:</span>
                      <span className="font-mono font-black text-slate-900 text-sm">
                        ৳{totalWholesaleCost.toLocaleString()} BDT
                      </span>
                    </div>

                    {/* Total COD Value */}
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-bold">Total COD Value:</span>
                      <span className="font-mono font-black text-[#E91E8C] text-sm">
                        ৳{totalCodValue.toLocaleString()} BDT
                      </span>
                    </div>

                    {/* Total Profit / Loss */}
                    <div className={`pt-2.5 border-t flex justify-between items-center ${
                      !isTotalLoss ? 'border-emerald-200 text-emerald-800' : 'border-rose-200 text-rose-800'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {!isTotalLoss ? (
                          <TrendingUp size={16} className="text-emerald-600" />
                        ) : (
                          <TrendingDown size={16} className="text-rose-600" />
                        )}
                        <span className="font-black text-xs uppercase tracking-wider">
                          {!isTotalLoss ? 'Total Profit:' : 'Total Loss:'}
                        </span>
                      </div>
                      
                      {!isTotalLoss ? (
                        <span className="font-mono font-black text-base px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                          +৳{totalProfit.toLocaleString()} BDT
                        </span>
                      ) : (
                        <span className="font-mono font-black text-sm px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                          Loss: ৳{Math.abs(totalProfit).toLocaleString()} BDT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Loss handling note */}
                  {isTotalLoss && (
                    <div className="p-2.5 bg-rose-50/80 rounded-xl border border-rose-200 text-[10px] text-rose-800 flex items-start gap-1.5">
                      <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Loss Notice:</strong> Total COD selling value is lower than wholesale cost. The order is not blocked and can still be submitted if intentional.
                      </span>
                    </div>
                  )}

                  <p className="text-[9px] text-slate-400 font-medium leading-tight pt-1">
                    * Calculation is for wholesaler visibility only. Official authoritative financial deductions are processed server-side upon batch packing.
                  </p>
                </div>

                {/* Submit Order Button */}
                <button
                  type="button"
                  id="btn_submit_wholesale_order"
                  onClick={(e) => handleWholesaleSubmit(e)}
                  disabled={cart.length === 0 || isSubmitting}
                  className="w-full py-4 bg-[#E91E8C] hover:bg-[#d0177c] disabled:opacity-40 disabled:hover:bg-[#E91E8C] text-white rounded-2xl font-black text-sm transition shadow-md shadow-pink-100 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={17} className="animate-spin" />
                      <span>Processing Wholesale Order...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>
                        {checkoutType === 'COD_DIRECT' 
                          ? 'Confirm & Stage COD Order' 
                          : 'Confirm & Stage Parcel Order'}
                      </span>
                    </>
                  )}
                </button>

                {/* Guarantees & Features */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                    <span>Direct Korean Import with Batch Authenticity QR</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck size={14} className="text-[#E91E8C] shrink-0" />
                    <span>Priority same-day packaging for wholesale consignments</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Quick Add Product Modal */}
      <AnimatePresence>
        {isQuickAddOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-pink-100 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-pink-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-100 text-[#E91E8C] flex items-center justify-center">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Add Wholesale Products</h3>
                    <p className="text-[10px] text-slate-500">Search and add items to your wholesale cart</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    placeholder="Search by product name, brand, or barcode..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#E91E8C]"
                  />
                </div>
              </div>

              {/* Product Grid */}
              <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
                {filteredProducts.map((p) => {
                  const ws1to49 = p.wholesalePrice || p.retailPrice || p.price;
                  const ws50Plus = p.wholesalePrice50Plus || ws1to49;
                  const inCartItem = cart.find(item => item.product.id === p.id);

                  return (
                    <div 
                      key={p.id}
                      className="p-3 bg-white hover:bg-pink-50/30 rounded-2xl border border-slate-200 hover:border-pink-200 transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={p.image || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=200'} 
                          alt={p.name} 
                          className="w-12 h-12 object-cover rounded-xl border border-pink-100 shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block truncate">{p.brand}</span>
                          <h4 className="font-extrabold text-slate-900 truncate leading-tight">{p.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono font-black text-[#E91E8C] text-xs">
                              1–49: ৳{ws1to49}
                            </span>
                            <span className="text-[10px] font-mono font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              50+: ৳{ws50Plus}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            addToWholesaleCart(p, 1);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-pink-50 hover:bg-[#E91E8C] text-[#E91E8C] hover:text-white border border-pink-200 hover:border-[#E91E8C] text-[11px] font-extrabold transition cursor-pointer"
                        >
                          +1 Unit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            addToWholesaleCart(p, 50);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-black transition cursor-pointer shadow-2xs"
                        >
                          +50 Bulk
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  {cart.length} item{cart.length === 1 ? '' : 's'} in wholesale cart
                </span>
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition"
                >
                  Done Adding
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
