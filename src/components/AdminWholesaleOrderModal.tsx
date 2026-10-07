import React, { useState, useEffect, useMemo } from 'react';
import { WholesaleCustomer, WholesaleOrder, Product } from '../types';
import { productService } from '../services/productService';
import { wholesaleService } from '../services/wholesaleService';
import { wholesaleOrderService } from '../services/wholesaleOrderService';
import { 
  X, 
  Search, 
  Plus, 
  Trash2, 
  Building2, 
  User, 
  Phone, 
  MapPin, 
  Truck, 
  CreditCard, 
  Receipt, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Package, 
  FileText,
  Printer,
  ArrowRight,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';

interface OrderItemEntry {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  customCodPrice?: number;
}

interface AdminWholesaleOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomer?: WholesaleCustomer | null;
  onOrderCreated?: (order: WholesaleOrder) => void;
}

export function AdminWholesaleOrderModal({
  isOpen,
  onClose,
  initialCustomer,
  onOrderCreated
}: AdminWholesaleOrderModalProps) {
  // Data State
  const [allCustomers, setAllCustomers] = useState<WholesaleCustomer[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<WholesaleCustomer | null>(null);

  // Customer search (when no initial customer provided)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Product Search State
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Order Items
  const [orderItems, setOrderItems] = useState<OrderItemEntry[]>([]);

  // Shipping & Logistics State
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [courier, setCourier] = useState('Steadfast');
  const [orderNote, setOrderNote] = useState('');

  // Financials & Payment State
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<'confirmed' | 'processing' | 'pending'>('confirmed');

  // Submission & Result State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<WholesaleOrder | null>(null);

  // Load Customers & Products on Open
  useEffect(() => {
    if (!isOpen) return;

    // Load products
    const unsubscribe = productService.subscribe((prods) => {
      setAllProducts(prods);
    });

    // Load customers
    wholesaleService.getAllWholesaleCustomers().then(custs => {
      setAllCustomers(custs);
    });

    // If initial customer passed, pre-select
    if (initialCustomer) {
      setSelectedCustomer(initialCustomer);
      setDeliveryName(initialCustomer.name || '');
      setDeliveryPhone(initialCustomer.phone || '');
      setDeliveryAddress(initialCustomer.businessAddress || initialCustomer.address || initialCustomer.location || '');
    } else {
      setSelectedCustomer(null);
      setDeliveryName('');
      setDeliveryPhone('');
      setDeliveryAddress('');
    }

    // Reset Form
    setOrderItems([]);
    setDeliveryCharge(0);
    setDiscount(0);
    setPaidAmount(0);
    setPaymentMethod('Cash');
    setPaymentReference('');
    setOrderStatus('confirmed');
    setOrderNote('');
    setErrorMessage(null);
    setCreatedOrder(null);
    setCustomerSearchTerm('');
    setProductSearchTerm('');

    return () => {
      unsubscribe();
    };
  }, [isOpen, initialCustomer]);

  // When customer changes, update shipping info
  const handleSelectCustomer = (customer: WholesaleCustomer) => {
    setSelectedCustomer(customer);
    setDeliveryName(customer.name || '');
    setDeliveryPhone(customer.phone || '');
    setDeliveryAddress(customer.businessAddress || customer.address || customer.location || '');
    setShowCustomerDropdown(false);
    setCustomerSearchTerm('');
  };

  // Filter Customers for Autocomplete
  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return allCustomers.slice(0, 8);
    const q = customerSearchTerm.toLowerCase();
    return allCustomers.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.businessName?.toLowerCase().includes(q) ||
      c.pageName?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [allCustomers, customerSearchTerm]);

  // Filter Products for Autocomplete
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) return [];
    const q = productSearchTerm.toLowerCase();
    return allProducts.filter(p => 
      p.name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [allProducts, productSearchTerm]);

  // Add Product to Order
  const handleAddProduct = (product: Product) => {
    const existingIndex = orderItems.findIndex(item => item.productId === product.id);
    const currentStock = Number(product.stock || 0);

    if (currentStock <= 0) {
      setErrorMessage(`Product "${product.name}" is currently out of stock.`);
      return;
    }

    // Determine initial wholesale price
    let initialPrice = 0;
    if (product.wholesalePrice && Number(product.wholesalePrice) > 0) {
      initialPrice = Number(product.wholesalePrice);
    } else if (product.discountRetailPrice && Number(product.discountRetailPrice) > 0) {
      initialPrice = Number(product.discountRetailPrice);
    } else {
      initialPrice = Number(product.retailPrice ?? product.price ?? 0);
    }

    if (existingIndex >= 0) {
      const currentQty = orderItems[existingIndex].quantity;
      if (currentQty + 1 > currentStock) {
        setErrorMessage(`Cannot add more. Available stock for "${product.name}" is ${currentStock}.`);
        return;
      }
      setOrderItems(prev => prev.map((item, idx) => 
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setOrderItems(prev => [
        ...prev,
        {
          productId: product.id,
          product,
          quantity: 1,
          unitPrice: initialPrice,
          customCodPrice: initialPrice
        }
      ]);
    }

    setProductSearchTerm('');
    setShowProductDropdown(false);
    setErrorMessage(null);
  };

  // Update Item Quantity
  const handleQuantityChange = (index: number, newQty: number) => {
    const item = orderItems[index];
    const maxStock = Number(item.product.stock || 0);
    const clampedQty = Math.max(1, Math.min(maxStock, newQty));

    setOrderItems(prev => prev.map((it, idx) => 
      idx === index ? { ...it, quantity: clampedQty } : it
    ));
  };

  // Update Item Unit Price
  const handlePriceChange = (index: number, newPrice: number) => {
    const validPrice = Math.max(0, newPrice);
    setOrderItems(prev => prev.map((it, idx) => 
      idx === index ? { ...it, unitPrice: validPrice, customCodPrice: validPrice } : it
    ));
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Compute Financial Totals
  const itemsSubtotal = useMemo(() => {
    return orderItems.reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);
  }, [orderItems]);

  const totalUnits = useMemo(() => {
    return orderItems.reduce((acc, it) => acc + it.quantity, 0);
  }, [orderItems]);

  const grandTotal = useMemo(() => {
    return Math.max(0, itemsSubtotal + Number(deliveryCharge || 0) - Number(discount || 0));
  }, [itemsSubtotal, deliveryCharge, discount]);

  const balanceDue = useMemo(() => {
    return Math.max(0, grandTotal - Number(paidAmount || 0));
  }, [grandTotal, paidAmount]);

  // Credit limit check
  const isCreditExceeded = useMemo(() => {
    if (!selectedCustomer) return false;
    const currentCustomerDue = Number(selectedCustomer.totalDue || 0);
    const creditLimit = Number(selectedCustomer.creditLimit || 0);
    if (creditLimit <= 0) return false;
    return (currentCustomerDue + balanceDue) > creditLimit;
  }, [selectedCustomer, balanceDue]);

  // Quick Payment buttons
  const handleSetPaidFull = () => {
    setPaidAmount(grandTotal);
  };

  const handleSetPaidZero = () => {
    setPaidAmount(0);
  };

  // Submit Order
  const handleSubmitOrder = async () => {
    if (!selectedCustomer) {
      setErrorMessage('Please select a wholesale customer first.');
      return;
    }
    if (orderItems.length === 0) {
      setErrorMessage('Please add at least one product to the order.');
      return;
    }
    if (!deliveryName.trim()) {
      setErrorMessage('Delivery recipient name is required.');
      return;
    }
    if (!deliveryPhone.trim()) {
      setErrorMessage('Delivery recipient phone is required.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const params = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        businessName: selectedCustomer.businessName || selectedCustomer.pageName,
        phone: selectedCustomer.phone,
        items: orderItems.map(it => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          customCodPrice: it.unitPrice,
          productName: it.product.name,
          sku: it.product.sku || it.product.barcode,
          barcode: it.product.barcode,
          image: it.product.image
        })),
        shippingAddress: {
          deliveryName: deliveryName.trim(),
          deliveryPhone: deliveryPhone.trim(),
          deliveryAddress: deliveryAddress.trim(),
          courier,
          orderNote: orderNote.trim()
        },
        deliveryCharge: Number(deliveryCharge || 0),
        discount: Number(discount || 0),
        paidAmount: Number(paidAmount || 0),
        paymentMethod,
        paymentReference: paymentReference.trim(),
        status: orderStatus,
        notes: orderNote.trim(),
        createdBy: 'Super Admin'
      };

      const order = await wholesaleOrderService.createAdminWholesaleOrder(params);
      setCreatedOrder(order);
      if (onOrderCreated) {
        onOrderCreated(order);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create wholesale order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Create Wholesale Order
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Direct manual order entry with live inventory decrement & ledger sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Success View */}
        {createdOrder ? (
          <div className="p-8 text-center space-y-6 animate-in fade-in duration-200">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-900">Order Placed Successfully!</h3>
              <p className="text-slate-500 mt-1 font-medium">
                Wholesale order <span className="font-mono font-bold text-slate-800">#{createdOrder.orderNumber}</span> has been confirmed and ledger synced.
              </p>
            </div>

            {/* Order Card Overview */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-md mx-auto text-left text-sm space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Wholesaler:</span>
                <span className="font-bold text-slate-800">{createdOrder.customer.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Items / Units:</span>
                <span className="font-bold text-slate-800">{createdOrder.items?.length || 0} products ({createdOrder.totalUnits} units)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Grand Total:</span>
                <span className="font-bold text-indigo-600 font-mono tabular-nums">৳{createdOrder.finalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Advance Paid:</span>
                <span className="font-bold text-emerald-600 font-mono tabular-nums">৳{(createdOrder.paidAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-700 font-bold">Balance Added to Due:</span>
                <span className="font-bold text-rose-600 font-mono tabular-nums">৳{(createdOrder.dueAmount || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCreatedOrder(null);
                  setOrderItems([]);
                }}
                className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-all shadow-sm"
              >
                + Create Another Order
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/20"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Error banner */}
            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* SECTION 1: Wholesaler Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Target Wholesaler
                </h3>
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    Change Customer
                  </button>
                )}
              </div>

              {selectedCustomer ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-bold">
                      <Building2 size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-900">
                        {selectedCustomer.businessName || selectedCustomer.name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>{selectedCustomer.name}</span>
                        <span>·</span>
                        <span className="font-mono">{selectedCustomer.phone}</span>
                        {selectedCustomer.location && (
                          <>
                            <span>·</span>
                            <span>{selectedCustomer.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Customer Financial Quick Pill */}
                  <div className="flex items-center gap-3 text-xs bg-white px-3 py-2 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Credit Limit</span>
                      <span className="font-mono font-bold text-slate-800 tabular-nums">৳{(selectedCustomer.creditLimit || 0).toLocaleString()}</span>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Current Due</span>
                      <span className="font-mono font-bold text-rose-600 tabular-nums">৳{(selectedCustomer.totalDue || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Search wholesaler by name, business, phone, or location..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                    />
                  </div>

                  {/* Dropdown list */}
                  {showCustomerDropdown && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 font-medium">
                          No wholesale customers matching "{customerSearchTerm}"
                        </div>
                      ) : (
                        filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className="w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                {c.businessName || c.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {c.name} · <span className="font-mono">{c.phone}</span> {c.location ? `· ${c.location}` : ''}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-mono font-semibold text-rose-600 block">
                                Due: ৳{(c.totalDue || 0).toLocaleString()}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                Limit: ৳{(c.creditLimit || 0).toLocaleString()}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 2: Product Search & Item Entry */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Order Products ({orderItems.length} items · {totalUnits} units)
              </h3>

              {/* Product Search Bar */}
              <div className="relative">
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => {
                      setProductSearchTerm(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Search product catalog by name, brand, SKU, or barcode to add..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                  />
                </div>

                {/* Dropdown list */}
                {showProductDropdown && productSearchTerm.trim().length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 font-medium">
                        No products matching "{productSearchTerm}"
                      </div>
                    ) : (
                      filteredProducts.map(p => {
                        const stock = Number(p.stock || 0);
                        const isOutOfStock = stock <= 0;
                        const wsPrice = p.wholesalePrice || p.discountRetailPrice || p.retailPrice || p.price || 0;

                        return (
                          <button
                            key={p.id}
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => handleAddProduct(p)}
                            className={`w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between transition-colors ${
                              isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="w-9 h-9 object-cover rounded-lg border border-slate-200"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                  <Package size={16} />
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-bold text-slate-900 line-clamp-1">{p.name}</div>
                                <div className="text-xs text-slate-500">
                                  {p.brand} {p.sku ? `· SKU: ${p.sku}` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold font-mono text-indigo-600 tabular-nums">
                                ৳{Number(wsPrice).toLocaleString()}
                              </div>
                              <div className={`text-xs font-semibold ${isOutOfStock ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {isOutOfStock ? 'Out of Stock' : `Stock: ${stock}`}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Selected Items Table */}
              {orderItems.length > 0 ? (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold tracking-wider">
                        <th className="p-3">Product</th>
                        <th className="p-3 text-center">Stock</th>
                        <th className="p-3 text-center w-28">Quantity</th>
                        <th className="p-3 text-right w-32">Unit Price (৳)</th>
                        <th className="p-3 text-right w-28">Total (৳)</th>
                        <th className="p-3 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orderItems.map((item, index) => {
                        const lineTotal = item.unitPrice * item.quantity;
                        const stock = Number(item.product.stock || 0);

                        return (
                          <tr key={item.productId} className="hover:bg-slate-50/60">
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                {item.product.image ? (
                                  <img
                                    src={item.product.image}
                                    alt={item.product.name}
                                    className="w-8 h-8 object-cover rounded-lg border border-slate-200"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                    <Package size={14} />
                                  </div>
                                )}
                                <div>
                                  <span className="font-bold text-slate-900 block text-xs line-clamp-1">
                                    {item.product.name}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    {item.product.brand} {item.product.sku ? `· ${item.product.sku}` : ''}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center text-xs font-mono font-medium text-slate-600 tabular-nums">
                              {stock}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(index, item.quantity - 1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  min="1"
                                  max={stock}
                                  onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                                  className="w-12 py-1 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-indigo-600 tabular-nums"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(index, item.quantity + 1)}
                                  disabled={item.quantity >= stock}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold flex items-center justify-center text-xs"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                value={item.unitPrice}
                                min="0"
                                onChange={(e) => handlePriceChange(index, Number(e.target.value))}
                                className="w-24 py-1 px-2 text-right font-mono font-bold text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-indigo-600 tabular-nums"
                              />
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900 text-xs tabular-nums">
                              ৳{lineTotal.toLocaleString()}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 border border-dashed border-slate-300 rounded-2xl text-center text-slate-500 text-xs font-medium">
                  Search and add products above to start building the wholesale order.
                </div>
              )}
            </div>

            {/* SECTION 3: Delivery Information & Financial Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-200">
              
              {/* Left Column: Shipping & Logistics */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  3. Delivery & Courier Details
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Recipient / Store Receiver Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={deliveryName}
                      onChange={(e) => setDeliveryName(e.target.value)}
                      placeholder="Receiver name"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Contact Phone <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryPhone}
                        onChange={(e) => setDeliveryPhone(e.target.value)}
                        placeholder="017..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Courier Partner
                      </label>
                      <select
                        value={courier}
                        onChange={(e) => setCourier(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-600"
                      >
                        <option value="Steadfast">Steadfast Courier</option>
                        <option value="Pathao">Pathao Courier</option>
                        <option value="RedX">RedX Logistics</option>
                        <option value="Paperfly">Paperfly</option>
                        <option value="Hub Delivery">SA Paribahan / Sundarban Hub</option>
                        <option value="Self Pickup">Store Self Pickup</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Complete Shipping Address
                    </label>
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Delivery address..."
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-600 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Order / Dispatch Notes
                    </label>
                    <input
                      type="text"
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      placeholder="Any special packing instructions or tracking ID..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Pricing & Payment Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  4. Payment & Financial Settlement
                </h3>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  
                  {/* Financial inputs */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-600 font-medium block mb-1">Delivery Charge (৳)</label>
                      <input
                        type="number"
                        value={deliveryCharge}
                        min="0"
                        onChange={(e) => setDeliveryCharge(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 font-medium block mb-1">Special Discount (৳)</label>
                      <input
                        type="number"
                        value={discount}
                        min="0"
                        onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Calculations */}
                  <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Products Subtotal:</span>
                      <span className="font-mono font-semibold tabular-nums">৳{itemsSubtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery Charge:</span>
                      <span className="font-mono font-semibold tabular-nums">+৳{deliveryCharge.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Discount / Adjustment:</span>
                        <span className="font-mono tabular-nums">-৳{discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                      <span>Grand Total:</span>
                      <span className="font-mono text-indigo-600 tabular-nums">৳{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Payment controls */}
                  <div className="pt-3 border-t border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Advance / Paid Amount (৳)
                      </label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={handleSetPaidZero}
                          className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                        >
                          Full Due (৳0)
                        </button>
                        <button
                          type="button"
                          onClick={handleSetPaidFull}
                          className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                        >
                          Full Paid
                        </button>
                      </div>
                    </div>

                    <input
                      type="number"
                      value={paidAmount}
                      min="0"
                      max={grandTotal}
                      onChange={(e) => setPaidAmount(Math.max(0, Math.min(grandTotal, Number(e.target.value) || 0)))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono font-black text-emerald-700 tabular-nums focus:border-emerald-600"
                    />

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-slate-600 font-medium block mb-1">Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                        >
                          <option value="Cash">Cash at Office / Store</option>
                          <option value="bKash">bKash Merchant / Personal</option>
                          <option value="Nagad">Nagad</option>
                          <option value="Bank Transfer">Bank Wire / Deposit</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Credit / Due">Credit / Ledger Due</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-600 font-medium block mb-1">TrxID / Reference</label>
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="TrxID / Cheque #"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-medium text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Balance Due Display */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Remaining Due to Ledger:</span>
                      <span className="font-mono font-black text-rose-600 text-sm tabular-nums">
                        ৳{balanceDue.toLocaleString()}
                      </span>
                    </div>

                    {/* Credit warning */}
                    {isCreditExceeded && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-xs">
                        <ShieldAlert size={16} className="shrink-0 text-amber-600 mt-0.5" />
                        <span>
                          <strong>Credit Alert:</strong> This order will exceed the customer's credit limit (৳{(selectedCustomer?.creditLimit || 0).toLocaleString()}). Super Admin override permitted.
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>

          </div>
        )}

        {/* Footer Actions */}
        {!createdOrder && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <span className="text-xs text-slate-500 font-medium block">Total Payable</span>
                <span className="text-base font-black font-mono text-indigo-600 tabular-nums">৳{grandTotal.toLocaleString()}</span>
              </div>
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={isSubmitting || orderItems.length === 0 || !selectedCustomer}
                className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <Receipt size={16} />
                    Confirm & Create Order
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
