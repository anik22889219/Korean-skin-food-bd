import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WholesaleCustomer, WholesaleOrder, Product } from '../types';
import { productService } from '../services/productService';
import { wholesaleService } from '../services/wholesaleService';
import { wholesaleOrderService, CreateAdminWholesaleOrderParams } from '../services/wholesaleOrderService';
import { 
  startUnifiedCameraScanner, 
  ScannerController, 
  normalizeBarcode, 
  buildBarcodeIndex, 
  lookupProductByBarcode 
} from '../utils/barcode';
import { playSuccessBeep } from './PosScan';
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  Building2,
  Calendar,
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
  ChevronDown,
  ScanLine,
  Camera,
  RotateCcw,
  PackageCheck,
  TrendingUp,
  Hash,
  Sparkles,
  Info,
  Check,
  Volume2
} from 'lucide-react';

export interface OrderItemEntry {
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

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
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
  const [orderDate, setOrderDate] = useState<string>(getTodayDate());

  // Customer search state
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Product Search State
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Order Items
  const [orderItems, setOrderItems] = useState<OrderItemEntry[]>([]);

  // Checkout Mode: Type 1 (COD Direct Delivery) vs Type 2 (Parcel Courier Booking)
  const [checkoutType, setCheckoutType] = useState<'COD_DIRECT' | 'PARCEL_COURIER'>('COD_DIRECT');

  // Type 1 Form Fields (COD Customer Delivery)
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [courier, setCourier] = useState('Steadfast');

  // Type 2 Form Fields (Parcel / Existing Courier)
  const [parcelId, setParcelId] = useState('');
  const [velouriaId, setVelouriaId] = useState('');
  const [parcelCustomerName, setParcelCustomerName] = useState('');

  // Shared Notes
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

  // POS Barcode Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [useFrontCamera, setUseFrontCamera] = useState(false);
  const [scannerNotice, setScannerNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [scannerError, setScannerError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControllerRef = useRef<ScannerController | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);

  // Barcode index for instant O(1) matching
  const barcodeIndex = useMemo(() => {
    return buildBarcodeIndex(allProducts);
  }, [allProducts]);

  // Unique product categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set).sort()];
  }, [allProducts]);

  // Load Customers & Products on Open
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = productService.subscribe((prods) => {
      setAllProducts(prods);
    });

    wholesaleService.getAllWholesaleCustomers().then(custs => {
      setAllCustomers(custs);
    });

    if (initialCustomer) {
      setSelectedCustomer(initialCustomer);
      setDeliveryName(initialCustomer.name || '');
      setDeliveryPhone(initialCustomer.phone || '');
      setDeliveryAddress(initialCustomer.businessAddress || initialCustomer.address || initialCustomer.location || '');
      setParcelCustomerName(initialCustomer.name || '');
    } else {
      setSelectedCustomer(null);
      setDeliveryName('');
      setDeliveryPhone('');
      setDeliveryAddress('');
      setParcelCustomerName('');
    }

    // Reset Form
    setOrderDate(getTodayDate());
    setOrderItems([]);
    setCheckoutType('COD_DIRECT');
    setParcelId('');
    setVelouriaId('');
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
    setSelectedCategory('All');
    setIsScannerOpen(false);

    return () => {
      unsubscribe();
    };
  }, [isOpen, initialCustomer]);

  // Camera Barcode Scanner lifecycle
  useEffect(() => {
    if (!isScannerOpen) {
      if (scannerControllerRef.current) {
        scannerControllerRef.current.stop().catch(() => {});
        scannerControllerRef.current = null;
      }
      return;
    }

    let isMounted = true;
    setScannerError(null);
    setScannerNotice(null);

    const startScanner = async () => {
      try {
        if (!videoRef.current) return;
        const controller = await startUnifiedCameraScanner({
          videoElement: videoRef.current,
          useFrontCamera,
          onScanSuccess: (scannedText) => {
            handleBarcodeScanned(scannedText);
          },
          onError: (err) => {
            if (isMounted) setScannerError(err);
          }
        });
        if (isMounted) {
          scannerControllerRef.current = controller;
        } else {
          controller.stop().catch(() => {});
        }
      } catch (err: any) {
        if (isMounted) {
          setScannerError(err.message || 'Unable to access camera for barcode scanning');
        }
      }
    };

    const timer = setTimeout(startScanner, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerControllerRef.current) {
        scannerControllerRef.current.stop().catch(() => {});
        scannerControllerRef.current = null;
      }
    };
  }, [isScannerOpen, useFrontCamera]);

  // When customer changes, update shipping info
  const handleSelectCustomer = (customer: WholesaleCustomer) => {
    setSelectedCustomer(customer);
    setDeliveryName(customer.name || '');
    setDeliveryPhone(customer.phone || '');
    setDeliveryAddress(customer.businessAddress || customer.address || customer.location || '');
    setParcelCustomerName(customer.name || '');
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
    const q = productSearchTerm.trim().toLowerCase();
    return allProducts.filter(p => {
      const matchCat = selectedCategory === 'All' || p.category?.toLowerCase() === selectedCategory.toLowerCase();
      if (!matchCat) return false;
      if (!q) return true;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
      );
    }).slice(0, 12);
  }, [allProducts, productSearchTerm, selectedCategory]);

  // Add Product to Order Items
  const handleAddProduct = (product: Product, forcedQty?: number) => {
    const existingIndex = orderItems.findIndex(item => item.productId === product.id);
    const currentStock = Number(product.stock || 0);

    if (currentStock <= 0) {
      setErrorMessage(`Product "${product.name}" is currently out of stock.`);
      return;
    }

    // Determine initial wholesale price & retail COD price
    const initialWholesaleRate = (product.wholesalePrice && Number(product.wholesalePrice) > 0)
      ? Number(product.wholesalePrice)
      : (product.discountRetailPrice && Number(product.discountRetailPrice) > 0)
      ? Number(product.discountRetailPrice)
      : Number(product.retailPrice ?? product.price ?? 0);

    const initialCodSellingPrice = Number(product.retailPrice ?? product.price ?? initialWholesaleRate);

    if (existingIndex >= 0) {
      const currentQty = orderItems[existingIndex].quantity;
      const targetQty = forcedQty !== undefined ? forcedQty : currentQty + 1;

      if (targetQty > currentStock) {
        setErrorMessage(`Cannot add more. Available stock for "${product.name}" is ${currentStock}.`);
        return;
      }

      setOrderItems(prev => prev.map((item, idx) => {
        if (idx !== existingIndex) return item;
        // Check tier rate change
        let unitRate = item.unitPrice;
        if (targetQty >= 50 && product.wholesalePrice50Plus && Number(product.wholesalePrice50Plus) > 0) {
          unitRate = Number(product.wholesalePrice50Plus);
        } else if (targetQty < 50 && currentQty >= 50) {
          unitRate = initialWholesaleRate;
        }
        return {
          ...item,
          quantity: targetQty,
          unitPrice: unitRate
        };
      }));
    } else {
      const initialQty = forcedQty || 1;
      let unitRate = initialWholesaleRate;
      if (initialQty >= 50 && product.wholesalePrice50Plus && Number(product.wholesalePrice50Plus) > 0) {
        unitRate = Number(product.wholesalePrice50Plus);
      }

      setOrderItems(prev => [
        ...prev,
        {
          productId: product.id,
          product,
          quantity: initialQty,
          unitPrice: unitRate,
          customCodPrice: initialCodSellingPrice
        }
      ]);
    }

    setProductSearchTerm('');
    setShowProductDropdown(false);
    setErrorMessage(null);
  };

  // Barcode scanned handler from camera or hardware scanner
  const handleBarcodeScanned = (scannedCode: string) => {
    const norm = normalizeBarcode(scannedCode);
    if (!norm) return;

    const { product } = lookupProductByBarcode(barcodeIndex, norm);
    if (!product) {
      setScannerNotice({ type: 'error', text: `No product matched barcode: ${norm}` });
      return;
    }

    const stock = Number(product.stock || 0);
    if (stock <= 0) {
      setScannerNotice({ type: 'error', text: `"${product.name}" is out of stock!` });
      return;
    }

    handleAddProduct(product);
    playSuccessBeep();
    setScannerNotice({ type: 'success', text: `Added "${product.name}" (+1)` });

    // Clear notice after 3 seconds
    setTimeout(() => {
      setScannerNotice(null);
    }, 3000);
  };

  // Manual Barcode Input Submit
  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcodeInput.trim()) return;
    handleBarcodeScanned(manualBarcodeInput.trim());
    setManualBarcodeInput('');
    if (manualInputRef.current) {
      manualInputRef.current.focus();
    }
  };

  // Update Item Quantity
  const handleQuantityChange = (index: number, newQty: number) => {
    const item = orderItems[index];
    const maxStock = Number(item.product.stock || 0);
    const clampedQty = Math.max(1, Math.min(maxStock, newQty));

    // Dynamic tier pricing
    let unitRate = item.unitPrice;
    if (clampedQty >= 50 && item.product.wholesalePrice50Plus && Number(item.product.wholesalePrice50Plus) > 0) {
      unitRate = Number(item.product.wholesalePrice50Plus);
    } else if (clampedQty < 50 && item.quantity >= 50) {
      unitRate = Number(item.product.wholesalePrice || item.product.retailPrice || item.product.price || item.unitPrice);
    }

    setOrderItems(prev => prev.map((it, idx) => 
      idx === index ? { ...it, quantity: clampedQty, unitPrice: unitRate } : it
    ));
  };

  // Toggle 50+ Volume Tier
  const handleToggleTier50 = (index: number) => {
    const item = orderItems[index];
    const maxStock = Number(item.product.stock || 0);
    const targetQty = item.quantity >= 50 ? 1 : Math.min(maxStock, 50);
    handleQuantityChange(index, targetQty);
  };

  // Update Item Wholesale Unit Price
  const handleWholesalePriceChange = (index: number, newPrice: number) => {
    const validPrice = Math.max(0, newPrice);
    setOrderItems(prev => prev.map((it, idx) => 
      idx === index ? { ...it, unitPrice: validPrice } : it
    ));
  };

  // Update Item COD Selling Price (Per Unit)
  const handleCodPriceChange = (index: number, newCodPrice: number) => {
    const validPrice = Math.max(0, newCodPrice);
    setOrderItems(prev => prev.map((it, idx) => 
      idx === index ? { ...it, customCodPrice: validPrice } : it
    ));
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Financial Formulas & Metrics
  const totalUnits = useMemo(() => {
    return orderItems.reduce((acc, it) => acc + it.quantity, 0);
  }, [orderItems]);

  const itemsSubtotal = useMemo(() => {
    return orderItems.reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);
  }, [orderItems]);

  const totalCodValue = useMemo(() => {
    return orderItems.reduce((acc, it) => {
      const codUnitPrice = it.customCodPrice !== undefined ? it.customCodPrice : it.unitPrice;
      return acc + (codUnitPrice * it.quantity);
    }, 0);
  }, [orderItems]);

  const totalProfit = useMemo(() => {
    return totalCodValue - itemsSubtotal;
  }, [totalCodValue, itemsSubtotal]);

  const isTotalLoss = totalProfit < 0;

  const grandTotal = useMemo(() => {
    const effectiveDelivery = checkoutType === 'PARCEL_COURIER' ? 0 : Number(deliveryCharge || 0);
    return Math.max(0, itemsSubtotal + effectiveDelivery - Number(discount || 0));
  }, [itemsSubtotal, deliveryCharge, discount, checkoutType]);

  const balanceDue = useMemo(() => {
    return Math.max(0, grandTotal - Number(paidAmount || 0));
  }, [grandTotal, paidAmount]);

  // Check customer credit limit
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

  // Order Submission
  const handleSubmitOrder = async () => {
    if (!selectedCustomer) {
      setErrorMessage('Please select a wholesale customer first.');
      return;
    }
    if (orderItems.length === 0) {
      setErrorMessage('Please add at least one product to the order.');
      return;
    }

    // Validate type-specific inputs
    if (checkoutType === 'COD_DIRECT') {
      if (!deliveryName.trim()) {
        setErrorMessage('Type 1 COD Delivery requires a Recipient Name.');
        return;
      }
      if (!deliveryPhone.trim()) {
        setErrorMessage('Type 1 COD Delivery requires a Contact Phone Number.');
        return;
      }
      if (!deliveryAddress.trim()) {
        setErrorMessage('Type 1 COD Delivery requires a Complete Delivery Address.');
        return;
      }
    } else {
      if (!parcelId.trim()) {
        setErrorMessage('Type 2 Parcel Booking requires a Parcel / Tracking Code.');
        return;
      }
      if (!velouriaId.trim()) {
        setErrorMessage('Type 2 Parcel Booking requires a Velouria ID / Platform Code.');
        return;
      }
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const activeDeliveryName = checkoutType === 'COD_DIRECT' 
        ? deliveryName.trim() 
        : (parcelCustomerName.trim() || selectedCustomer.name || 'Wholesale Customer');
      const activeDeliveryPhone = checkoutType === 'COD_DIRECT' 
        ? deliveryPhone.trim() 
        : (selectedCustomer.phone || '');
      const activeDeliveryAddress = checkoutType === 'COD_DIRECT' 
        ? deliveryAddress.trim() 
        : (selectedCustomer.businessAddress || selectedCustomer.address || selectedCustomer.location || '');

      const resolvedCheckoutType: 'COD' | 'PARCEL' = checkoutType === 'COD_DIRECT' ? 'COD' : 'PARCEL';

      const params: CreateAdminWholesaleOrderParams = {
        customerId: selectedCustomer.id,
        orderDate: orderDate.trim() || undefined,
        customerName: selectedCustomer.name,
        businessName: selectedCustomer.businessName || selectedCustomer.pageName,
        phone: selectedCustomer.phone,
        items: orderItems.map(it => {
          const codUnitPrice = it.customCodPrice !== undefined ? it.customCodPrice : it.unitPrice;
          const unitProfit = codUnitPrice - it.unitPrice;
          return {
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            customCodPrice: codUnitPrice,
            CODUnitPrice: codUnitPrice,
            productName: it.product.name,
            sku: it.product.sku || it.product.barcode,
            barcode: it.product.barcode,
            image: it.product.image,
            wholesaleUnitPrice: it.unitPrice,
            profitPerUnit: unitProfit,
            totalProfit: unitProfit * it.quantity
          };
        }),
        checkoutInfo: {
          checkoutType: resolvedCheckoutType,
          deliveryName: activeDeliveryName,
          deliveryPhone: activeDeliveryPhone,
          deliveryAddress: activeDeliveryAddress,
          courier,
          parcelId: checkoutType === 'PARCEL_COURIER' ? parcelId.trim() : undefined,
          velouriaId: checkoutType === 'PARCEL_COURIER' ? velouriaId.trim() : undefined,
          codPrice: totalCodValue,
          orderNote: orderNote.trim()
        },
        shippingAddress: {
          deliveryName: activeDeliveryName,
          deliveryPhone: activeDeliveryPhone,
          deliveryAddress: activeDeliveryAddress,
          courier,
          orderNote: orderNote.trim()
        },
        totalWholesaleCost: itemsSubtotal,
        totalCODValue: totalCodValue,
        totalProfit: totalProfit,
        deliveryCharge: checkoutType === 'PARCEL_COURIER' ? 0 : Number(deliveryCharge || 0),
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 border border-pink-200 flex items-center justify-center text-[#E91E8C] shadow-2xs">
              <Receipt size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Create Wholesale Order
                </h2>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  B2B Tiered Pricing
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Dual checkout fulfillment, live margin calculations & POS barcode scanning
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Success View */}
        {createdOrder ? (
          <div className="p-8 sm:p-12 text-center space-y-6 max-w-2xl mx-auto overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-black rounded-full">
                Order #{createdOrder.orderNumber}
              </span>
              <h3 className="text-2xl font-black text-slate-900">Wholesale Order Created Successfully!</h3>
              <p className="text-xs text-slate-600">
                Order has been confirmed, warehouse inventory decremented, and the customer ledger updated.
              </p>
            </div>

            {/* Quick Financial Snapshot */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Wholesaler</span>
                <span className="font-extrabold text-slate-900">{createdOrder.customer?.customerName || selectedCustomer?.name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Order Date:</span>
                <span className="font-mono font-extrabold text-slate-900">
                  {createdOrder.orderDate || new Date(createdOrder.createdAt).toLocaleDateString('en-GB')}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Checkout Mode:</span>
                <span className="font-extrabold text-[#E91E8C]">
                  {createdOrder.checkoutInfo?.checkoutType === 'PARCEL' ? 'Type 2: Parcel / Courier' : 'Type 1: COD Direct'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center">
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Wholesale Cost</span>
                  <span className="font-mono font-black text-slate-900 text-xs">
                    ৳{itemsSubtotal.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-pink-200">
                  <span className="text-[10px] text-[#E91E8C] font-bold uppercase block">Customer COD</span>
                  <span className="font-mono font-black text-[#E91E8C] text-xs">
                    ৳{totalCodValue.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Wholesaler Margin</span>
                  <span className={`font-mono font-black text-xs ${totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {totalProfit >= 0 ? `+৳${totalProfit.toLocaleString()}` : `-৳${Math.abs(totalProfit).toLocaleString()}`}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-700">Balance Added to Due:</span>
                <span className="font-mono font-black text-rose-600 tabular-nums">৳{(createdOrder.dueAmount || balanceDue).toLocaleString()} BDT</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCreatedOrder(null);
                  setOrderItems([]);
                  setPaidAmount(0);
                  setOrderDate(getTodayDate());
                }}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-[#E91E8C] bg-pink-50 hover:bg-pink-100 rounded-xl border border-pink-200 transition cursor-pointer"
              >
                + Create Another Wholesale Order
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* Global Error Banner */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
                <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-relaxed font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* STEP 1: Wholesaler Selection */}
            <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-[#E91E8C]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Step 1: Wholesaler Account
                  </h3>
                </div>
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-xs text-[#E91E8C] font-bold hover:underline cursor-pointer"
                  >
                    Change Wholesaler
                  </button>
                )}
              </div>

              {selectedCustomer ? (
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-[#E91E8C] font-black shrink-0">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">
                        {selectedCustomer.businessName || selectedCustomer.name}
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
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

                  {/* Financial Balance Summary Card */}
                  <div className="flex items-center gap-3 text-xs bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[9px] font-black uppercase">Credit Limit</span>
                      <span className="font-mono font-black text-slate-800 tabular-nums">
                        ৳{(selectedCustomer.creditLimit || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div>
                      <span className="text-slate-400 block text-[9px] font-black uppercase">Current Due</span>
                      <span className="font-mono font-black text-rose-600 tabular-nums">
                        ৳{(selectedCustomer.totalDue || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Search wholesaler by business name, partner name, phone or address..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#E91E8C] shadow-2xs transition"
                    />
                  </div>

                  {/* Dropdown list */}
                  {showCustomerDropdown && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 font-medium">
                          No wholesale partners matching "{customerSearchTerm}"
                        </div>
                      ) : (
                        filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className="w-full text-left p-3 hover:bg-pink-50/50 flex items-center justify-between transition cursor-pointer"
                          >
                            <div>
                              <div className="text-xs font-black text-slate-900">
                                {c.businessName || c.name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {c.name} · <span className="font-mono">{c.phone}</span> {c.location ? `· ${c.location}` : ''}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-mono font-bold text-rose-600 block">
                                Due: ৳{(c.totalDue || 0).toLocaleString()}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
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

              {/* Order Date Selection */}
              <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-[#E91E8C] shrink-0" />
                  <div>
                    <label htmlFor="wholesale-order-date" className="text-xs font-bold text-slate-800">
                      Order Date
                    </label>
                    <span className="text-[11px] text-slate-500 ml-2 hidden sm:inline">
                      Defaults to today. Change to backdate this transaction in ledgers and reports.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="inline-flex items-center rounded-lg bg-slate-200/70 p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setOrderDate(getTodayDate())}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer text-[11px] font-bold ${
                        orderDate === getTodayDate()
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderDate(getYesterdayDate())}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer text-[11px] font-bold ${
                        orderDate === getYesterdayDate()
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Yesterday
                    </button>
                  </div>

                  <input
                    id="wholesale-order-date"
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 outline-none focus:border-[#E91E8C] transition"
                  />
                </div>
              </div>
            </div>

            {/* STEP 2: Product Entry (Instant Search + POS Barcode Scanner) */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-[#E91E8C]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Step 2: Add Wholesale Products ({orderItems.length} items · {totalUnits} units)
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Search catalog with category filters or scan barcodes using the POS scanner
                  </p>
                </div>

                {/* POS Barcode Scanner Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#E91E8C] hover:bg-[#d0177c] text-white transition flex items-center gap-2 cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
                >
                  <ScanLine size={15} />
                  <span>Scan Barcode (POS)</span>
                </button>
              </div>

              {/* Instant Search Bar & Category Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-8 relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => {
                      setProductSearchTerm(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Search by product name, brand, SKU, or barcode to add..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-[#E91E8C] transition"
                  />

                  {/* Autocomplete Results Dropdown */}
                  {showProductDropdown && productSearchTerm.trim().length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
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
                              className={`w-full text-left p-2.5 hover:bg-slate-50 flex items-center justify-between transition cursor-pointer ${
                                isOutOfStock ? 'opacity-40 cursor-not-allowed' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {p.image ? (
                                  <img
                                    src={p.image}
                                    alt={p.name}
                                    className="w-9 h-9 object-cover rounded-lg border border-slate-200 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                    <Package size={16} />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-xs font-extrabold text-slate-900 truncate">{p.name}</div>
                                  <div className="text-[10px] text-slate-500 truncate">
                                    {p.brand} {p.sku ? `· SKU: ${p.sku}` : ''} {p.barcode ? `· Barcode: ${p.barcode}` : ''}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0 pl-2">
                                <div className="text-xs font-black font-mono text-[#E91E8C] tabular-nums">
                                  ৳{Number(wsPrice).toLocaleString()}
                                </div>
                                <div className={`text-[10px] font-bold ${isOutOfStock ? 'text-rose-600' : 'text-emerald-600'}`}>
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

                {/* Category Filter Select */}
                <div className="sm:col-span-4 relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-[#E91E8C] cursor-pointer"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>Category: {cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Order Items Table */}
              {orderItems.length > 0 ? (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider text-[10px]">
                          <th className="p-3">Product Details</th>
                          <th className="p-3 text-center">Stock</th>
                          <th className="p-3 text-center w-36">Quantity & Tier</th>
                          <th className="p-3 text-right w-28">Wholesale Price</th>
                          <th className="p-3 text-right w-28">COD Unit Price</th>
                          <th className="p-3 text-center w-28">Margin / Profit</th>
                          <th className="p-3 text-right w-24">Wholesale Total</th>
                          <th className="p-3 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orderItems.map((item, index) => {
                          const stock = Number(item.product.stock || 0);
                          const isTier50 = item.quantity >= 50;
                          const codUnitPrice = item.customCodPrice !== undefined 
                            ? item.customCodPrice 
                            : (item.product.price ?? item.unitPrice);

                          const unitProfit = codUnitPrice - item.unitPrice;
                          const totalItemProfit = unitProfit * item.quantity;
                          const totalItemWholesaleCost = item.unitPrice * item.quantity;
                          const isItemLoss = unitProfit < 0;

                          return (
                            <tr key={item.productId} className="hover:bg-slate-50/60 transition">
                              
                              {/* Product Info */}
                              <td className="p-3">
                                <div className="flex items-center gap-2.5">
                                  {item.product.image ? (
                                    <img
                                      src={item.product.image}
                                      alt={item.product.name}
                                      className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                      <Package size={16} />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <span className="font-extrabold text-slate-900 block truncate max-w-[200px]">
                                      {item.product.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block truncate">
                                      {item.product.brand} {item.product.sku ? `· ${item.product.sku}` : ''}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Available Stock */}
                              <td className="p-3 text-center font-mono font-medium text-slate-600 tabular-nums">
                                {stock}
                              </td>

                              {/* Quantity Stepper & 50+ Volume Tier */}
                              <td className="p-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  <div className="flex items-center bg-white rounded-lg border border-slate-300 shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => handleQuantityChange(index, item.quantity - 1)}
                                      className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-[#E91E8C] font-bold cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      min="1"
                                      max={stock}
                                      onChange={(e) => handleQuantityChange(index, Math.max(1, parseInt(e.target.value, 10) || 1))}
                                      className="w-10 py-1 text-center font-mono font-bold text-xs text-slate-900 outline-none tabular-nums"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleQuantityChange(index, item.quantity + 1)}
                                      disabled={item.quantity >= stock}
                                      className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-[#E91E8C] disabled:opacity-30 font-bold cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleTier50(index)}
                                    className={`px-1.5 py-1 rounded text-[9px] font-black border transition cursor-pointer ${
                                      isTier50
                                        ? 'bg-amber-500 text-slate-950 border-amber-600'
                                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-amber-400'
                                    }`}
                                    title="Toggle 50+ bulk rate tier"
                                  >
                                    50+
                                  </button>
                                </div>
                              </td>

                              {/* Wholesale Unit Price (Editable) */}
                              <td className="p-3 text-right">
                                <div className="relative inline-block w-24">
                                  <input
                                    type="number"
                                    value={item.unitPrice}
                                    min="0"
                                    onChange={(e) => handleWholesalePriceChange(index, parseFloat(e.target.value) || 0)}
                                    className="w-full py-1 px-2 text-right font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-[#E91E8C] tabular-nums outline-none"
                                    title="Wholesale cost per unit"
                                  />
                                </div>
                              </td>

                              {/* Custom COD Unit Price (Editable) */}
                              <td className="p-3 text-right">
                                <div className="relative inline-block w-24">
                                  <input
                                    type="number"
                                    value={codUnitPrice}
                                    min="0"
                                    onChange={(e) => handleCodPriceChange(index, parseFloat(e.target.value) || 0)}
                                    className={`w-full py-1 px-2 text-right font-mono font-bold text-xs rounded-lg border outline-none tabular-nums transition ${
                                      isItemLoss ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-[#E91E8C]'
                                    }`}
                                    title="Wholesaler's selling COD price per unit"
                                  />
                                </div>
                              </td>

                              {/* Live Margin Calculation */}
                              <td className="p-3 text-center">
                                {isItemLoss ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-black text-rose-700 bg-rose-50 border border-rose-200">
                                    -৳{Math.abs(totalItemProfit).toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200">
                                    +৳{totalItemProfit.toLocaleString()}
                                  </span>
                                )}
                              </td>

                              {/* Total Wholesale Cost */}
                              <td className="p-3 text-right font-mono font-black text-slate-900 tabular-nums">
                                ৳{totalItemWholesaleCost.toLocaleString()}
                              </td>

                              {/* Remove */}
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(index)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                  title="Remove product"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="py-8 px-4 border border-dashed border-slate-300 rounded-2xl text-center space-y-2">
                  <Package size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">No products added to this wholesale order yet.</p>
                  <p className="text-[11px] text-slate-400">Search above or click "Scan Barcode (POS)" to scan items directly.</p>
                </div>
              )}
            </div>

            {/* STEP 3: Checkout Mode Selector (Type 1 COD vs Type 2 Parcel) */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-[#E91E8C] tracking-wider block">
                  Step 3: Delivery Method
                </span>
                <h3 className="text-xs font-black text-slate-900 uppercase">
                  Select Wholesale Checkout Mode
                </h3>
                <p className="text-[11px] text-slate-500">
                  Switch between Direct COD Customer Fulfillment and Existing Courier Parcel Booking without losing products.
                </p>
              </div>

              {/* Dual Mode Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Type 1 Button */}
                <button
                  type="button"
                  onClick={() => setCheckoutType('COD_DIRECT')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer relative ${
                    checkoutType === 'COD_DIRECT'
                      ? 'bg-pink-50/50 border-[#E91E8C] ring-2 ring-pink-500/20 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-pink-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        checkoutType === 'COD_DIRECT' ? 'bg-[#E91E8C] text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Truck size={16} />
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
                  onClick={() => {
                    setCheckoutType('PARCEL_COURIER');
                    setDeliveryCharge(0);
                  }}
                  className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer relative ${
                    checkoutType === 'PARCEL_COURIER'
                      ? 'bg-purple-50/50 border-purple-600 ring-2 ring-purple-500/20 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-purple-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        checkoutType === 'PARCEL_COURIER' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <PackageCheck size={16} />
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

              {/* Dynamic Type Fields */}
              {checkoutType === 'COD_DIRECT' ? (
                <div className="space-y-3 pt-2 text-xs">
                  <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-100 text-[11px] text-pink-900 flex items-start gap-2">
                    <Info size={15} className="text-[#E91E8C] shrink-0 mt-0.5" />
                    <span>
                      Warehouse will dispatch directly to end customer with Cash on Delivery collection.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Recipient Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryName}
                        onChange={(e) => setDeliveryName(e.target.value)}
                        placeholder="e.g. Mahbuba Rahman"
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-medium text-slate-900 outline-none focus:bg-white focus:border-[#E91E8C]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Contact Phone <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={deliveryPhone}
                        onChange={(e) => setDeliveryPhone(e.target.value)}
                        placeholder="017XXXXXXXX"
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-mono font-medium text-slate-900 outline-none focus:bg-white focus:border-[#E91E8C]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 font-bold mb-1">
                        Full Delivery Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="House No, Road / Sector, Area, Thana / District..."
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-medium text-slate-900 outline-none focus:bg-white focus:border-[#E91E8C]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Courier Partner
                      </label>
                      <select
                        value={courier}
                        onChange={(e) => setCourier(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-bold text-slate-800 outline-none focus:bg-white focus:border-[#E91E8C]"
                      >
                        <option value="Steadfast">Steadfast Courier</option>
                        <option value="Pathao">Pathao Courier</option>
                        <option value="RedX">RedX Logistics</option>
                        <option value="Paperfly">Paperfly</option>
                        <option value="Hub Delivery">SA Paribahan / Hub</option>
                        <option value="Self Pickup">Store Self Pickup</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2 text-xs">
                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-[11px] text-purple-900 flex items-start gap-2">
                    <Info size={15} className="text-purple-600 shrink-0 mt-0.5" />
                    <span>
                      For orders booked on wholesaler's own courier panel. Packing team will affix these consignment tags.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Parcel ID / Tracking Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={parcelId}
                        onChange={(e) => setParcelId(e.target.value)}
                        placeholder="e.g. STF-84920492"
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Velouria ID / Ref <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={velouriaId}
                        onChange={(e) => setVelouriaId(e.target.value)}
                        placeholder="e.g. VEL-49204"
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Customer Name on Parcel <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={parcelCustomerName}
                        onChange={(e) => setParcelCustomerName(e.target.value)}
                        placeholder="e.g. Farhana Yasmin (optional)"
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-medium text-slate-900 outline-none focus:bg-white focus:border-purple-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Order Dispatch Notes */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs">
                  Order / Packing Notes <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Special instructions for warehouse packing team or courier..."
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-[#E91E8C]"
                />
              </div>
            </div>

            {/* STEP 4: Financial Breakdown & Wholesaler Settlement */}
            <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/90 space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                <CreditCard size={16} className="text-[#E91E8C]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Step 4: Financial Settlement & Wholesaler Margin
                </h3>
              </div>

              {/* 3-Column Profitability Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Wholesale Cost (To You)</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    ৳{itemsSubtotal.toLocaleString()} BDT
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-pink-200 shadow-2xs">
                  <span className="text-[10px] text-[#E91E8C] font-bold uppercase block">Customer Collection (COD)</span>
                  <span className="font-mono font-black text-[#E91E8C] text-sm">
                    ৳{totalCodValue.toLocaleString()} BDT
                  </span>
                </div>
                <div className={`p-3 bg-white rounded-xl border shadow-2xs ${totalProfit >= 0 ? 'border-emerald-200' : 'border-rose-200'}`}>
                  <span className={`text-[10px] font-bold uppercase block ${totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {totalProfit >= 0 ? 'Estimated Wholesaler Profit' : 'Estimated Wholesaler Loss'}
                  </span>
                  <span className={`font-mono font-black text-sm ${totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {totalProfit >= 0 ? `+৳${totalProfit.toLocaleString()} BDT` : `-৳${Math.abs(totalProfit).toLocaleString()} BDT`}
                  </span>
                </div>
              </div>

              {/* Delivery, Discount, & Grand Total Calculation */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                {checkoutType === 'COD_DIRECT' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 font-bold block mb-1">Delivery Charge (৳)</label>
                      <input
                        type="number"
                        value={deliveryCharge}
                        min="0"
                        onChange={(e) => setDeliveryCharge(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-[#E91E8C]"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 font-bold block mb-1">Adjustment / Discount (৳)</label>
                      <input
                        type="number"
                        value={discount}
                        min="0"
                        onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-[#E91E8C]"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-slate-600 font-bold block mb-1">Adjustment / Discount (৳)</label>
                    <input
                      type="number"
                      value={discount}
                      min="0"
                      onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="e.g. 0"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-600"
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 text-sm">Wholesale Grand Total:</span>
                  <span className="font-mono font-black text-base text-[#E91E8C] tabular-nums">
                    ৳{grandTotal.toLocaleString()} BDT
                  </span>
                </div>
              </div>

              {/* Paid Amount, Method & Due Sync */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">
                    Advance / Paid Amount (৳)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSetPaidZero}
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      Unpaid (৳0)
                    </button>
                    <button
                      type="button"
                      onClick={handleSetPaidFull}
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition cursor-pointer"
                    >
                      Paid in Full
                    </button>
                  </div>
                </div>

                <input
                  type="number"
                  value={paidAmount}
                  min="0"
                  max={grandTotal}
                  onChange={(e) => setPaidAmount(Math.max(0, Math.min(grandTotal, Number(e.target.value) || 0)))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-black text-emerald-700 tabular-nums outline-none focus:bg-white focus:border-emerald-600"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1 text-[11px]">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 outline-none"
                    >
                      <option value="Cash">Cash at Office / Store</option>
                      <option value="bKash">bKash (Merchant / Personal)</option>
                      <option value="Nagad">Nagad</option>
                      <option value="Bank Transfer">Bank Wire / Deposit</option>
                      <option value="Rocket">Rocket</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Credit / Due">Ledger Due / Credit</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-600 font-semibold block mb-1 text-[11px]">Payment Reference / TrxID</label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="e.g. 9J29DK29"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 font-semibold block mb-1 text-[11px]">Order Status</label>
                    <select
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 outline-none"
                    >
                      <option value="confirmed">Confirmed (Ready to Pack)</option>
                      <option value="processing">Processing</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                {/* Remaining Due Pill */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700">Balance Added to Customer Due:</span>
                  <span className="font-mono font-black text-rose-600 text-sm tabular-nums">
                    ৳{balanceDue.toLocaleString()} BDT
                  </span>
                </div>

                {/* Credit Limit Alert */}
                {isCreditExceeded && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-xs">
                    <ShieldAlert size={16} className="shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      <strong>Credit Alert:</strong> This order exceeds customer's credit limit of ৳{(selectedCustomer?.creditLimit || 0).toLocaleString()} BDT. Super Admin override is enabled.
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Footer Actions */}
        {!createdOrder && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Payable</span>
                <span className="text-base font-black font-mono text-[#E91E8C] tabular-nums">
                  ৳{grandTotal.toLocaleString()} BDT
                </span>
              </div>

              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={isSubmitting || orderItems.length === 0 || !selectedCustomer}
                className="px-6 py-2.5 text-xs font-extrabold text-white bg-[#E91E8C] hover:bg-[#d0177c] disabled:opacity-40 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Placing Order...</span>
                  </>
                ) : (
                  <>
                    <Receipt size={16} />
                    <span>Create Wholesale Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* POS BARCODE SCANNER MODAL */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
            
            {/* Scanner Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <ScanLine size={18} className="text-[#E91E8C]" />
                <h3 className="text-sm font-black tracking-wide">POS Barcode Scanner</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUseFrontCamera(prev => !prev)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  title="Flip camera"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Camera Viewport */}
            <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Target Aiming Box */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
                <div className="w-64 h-36 border-2 border-[#E91E8C] rounded-2xl relative shadow-lg shadow-pink-500/20">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -mt-0.5 -ml-0.5 rounded-tl" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mt-0.5 -mr-0.5 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -mb-0.5 -ml-0.5 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mb-0.5 -mr-0.5 rounded-br" />
                  {/* Laser line animation */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#E91E8C] to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Notice Toast */}
              {scannerNotice && (
                <div className={`absolute top-4 inset-x-4 py-2 px-3 rounded-xl text-xs font-bold text-center border shadow-lg animate-in fade-in slide-in-from-top-2 ${
                  scannerNotice.type === 'success' 
                    ? 'bg-emerald-500/90 text-white border-emerald-400' 
                    : 'bg-rose-500/90 text-white border-rose-400'
                }`}>
                  {scannerNotice.text}
                </div>
              )}

              {/* Scanner error */}
              {scannerError && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <Camera size={32} className="text-slate-500" />
                  <p className="text-xs text-rose-400 font-semibold">{scannerError}</p>
                  <p className="text-[11px] text-slate-400">You can still scan with a hardware barcode gun or type manually below.</p>
                </div>
              )}
            </div>

            {/* Hardware Scanner & Manual Barcode Input Fallback */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
              <form onSubmit={handleManualBarcodeSubmit} className="flex gap-2">
                <input
                  ref={manualInputRef}
                  type="text"
                  value={manualBarcodeInput}
                  onChange={(e) => setManualBarcodeInput(e.target.value)}
                  placeholder="Scan or type barcode / SKU and press Enter..."
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white outline-none focus:border-[#E91E8C]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#E91E8C] hover:bg-[#d0177c] text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Add
                </button>
              </form>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Volume2 size={13} className="text-[#E91E8C]" />
                  <span>Audio chime enabled</span>
                </div>
                <span>Items in order: <strong className="text-white font-mono">{totalUnits}</strong></span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
