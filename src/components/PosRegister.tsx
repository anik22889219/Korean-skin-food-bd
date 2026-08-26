import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, doc, setDoc, onSnapshot, query, deleteDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../services/firebase';
import { productService } from '../services/productService';
import { addProductToSession } from '../services/posService';
import { Product, Order } from '../types';
import InvoiceDocument from './InvoiceDocument';
import { downloadInvoicePDF, printInvoice } from '../utils/invoicePdf';
import { playSuccessBeep } from './PosScan';
import { 
  Tv, 
  Smartphone, 
  User, 
  Phone, 
  MapPin, 
  Printer, 
  Download, 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowLeft, 
  CheckCircle,
  Truck,
  Wand2,
  Search,
  X,
  Receipt,
  Loader2,
  QrCode
} from 'lucide-react';

interface PosRegisterProps {
  onBack: () => void;
  products: Product[];
}

export default function PosRegister({ onBack, products }: PosRegisterProps) {
  const [sessionId, setSessionId] = useState<string>('');
  const [scans, setScans] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState<boolean>(false);
  
  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState<'inside' | 'outside' | 'none'>('inside');
  
  // Invoice state
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Manual Product Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchMessage, setSearchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  // Filter products by name, brand, or barcode
  const filteredProducts = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => {
      const matchName = p.name && p.name.toLowerCase().includes(term);
      const matchNameBN = p.nameBN && p.nameBN.toLowerCase().includes(term);
      const matchBrand = p.brand && p.brand.toLowerCase().includes(term);
      const matchBarcode = p.barcode && p.barcode.toLowerCase().includes(term);
      const matchId = p.id && p.id.toLowerCase().includes(term);
      return matchName || matchNameBN || matchBrand || matchBarcode || matchId;
    });
  }, [searchQuery, products]);

  // Click outside listener to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 1. Initialize POS session in Firestore on mount
  useEffect(() => {
    const initSession = async () => {
      const newSessionId = 'pos-' + Math.floor(100000 + Math.random() * 900000);
      try {
        await setDoc(doc(db, 'pos_sessions', newSessionId), {
          id: newSessionId,
          status: 'open',
          created_at: new Date().toISOString(),
          customerName: '',
          customerPhone: '',
          customerAddress: '',
          customerArea: '',
          computerJoined: true,
          items: []
        });
        setSessionId(newSessionId);
      } catch (err) {
        console.error('Error creating POS session in Firestore:', err);
      }
    };
    initSession();
  }, []);

  // 2. Real-time subscription to scans subcollection
  const prevScanCountRef = useRef<number>(0);
  useEffect(() => {
    if (!sessionId) return;
    const q = query(collection(db, 'pos_sessions', sessionId, 'scans'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      if (list.length > prevScanCountRef.current && prevScanCountRef.current > 0) {
        playSuccessBeep(0.2);
      }
      prevScanCountRef.current = list.length;
      setScans(list);
    }, (err) => {
      console.error('Error listening to session scans:', err);
    });
    return () => unsubscribe();
  }, [sessionId]);

  // 3. Map scans to product details & quantities
  const cartItems = useMemo(() => {
    const counts: { [pId: string]: { count: number; docIds: string[] } } = {};
    scans.forEach((s) => {
      if (s.product_id) {
        if (!counts[s.product_id]) {
          counts[s.product_id] = { count: 0, docIds: [] };
        }
        counts[s.product_id].count += 1;
        counts[s.product_id].docIds.push(s.id);
      }
    });

    return Object.keys(counts).map((pId) => {
      const prod = productService.getProductByBarcode(pId) || productService.getProductById(pId);
      return {
        product: prod || {
          id: pId,
          name: 'Unknown Product',
          nameBN: 'অজানা পণ্য',
          brand: 'Generic',
          price: 1000,
          stock: 0,
          image: 'https://images.unsplash.com/photo-1608248597481-496100c8c836?w=150&auto=format&fit=crop'
        } as Product,
        quantity: counts[pId].count,
        docIds: counts[pId].docIds
      };
    });
  }, [scans, products]);

  // Compute values
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = item.product.discountPrice || item.product.price;
      return sum + (price * item.quantity);
    }, 0);
  }, [cartItems]);

  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const deliveryCharge = deliveryArea === 'inside' ? 60 : deliveryArea === 'outside' ? 120 : 0;
  const grandTotal = subtotal + (cartItems.length > 0 ? deliveryCharge : 0);

  // Product select behavior for Manual Product Search
  const handleSelectProduct = async (product: Product) => {
    if (!sessionId) return;

    const currentCartItem = cartItems.find((item) => item.product.id === product.id);
    const currentQty = currentCartItem ? currentCartItem.quantity : 0;

    if (product.stock <= 0) {
      setSearchMessage({ type: 'error', text: `Cannot add "${product.name}". Product is out of stock!` });
      return;
    }

    if (currentQty >= product.stock) {
      setSearchMessage({
        type: 'error',
        text: `Cannot add more. Available stock for "${product.name}" is ${product.stock}.`
      });
      return;
    }

    const res = await addProductToSession(sessionId, product.id, currentQty);

    if (res.success) {
      setSearchQuery('');
      setIsDropdownOpen(false);
      setSelectedIndex(-1);
      setSearchMessage({ type: 'success', text: `"${product.name}" added to cart!` });
      setTimeout(() => {
        setSearchMessage(null);
      }, 3000);
    } else {
      setSearchMessage({ type: 'error', text: res.message });
    }
  };

  // Keyboard Navigation Support
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || filteredProducts.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsDropdownOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredProducts.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetIdx = selectedIndex >= 0 ? selectedIndex : 0;
      if (filteredProducts[targetIdx]) {
        handleSelectProduct(filteredProducts[targetIdx]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
      setSelectedIndex(-1);
    }
  };

  // 4. Manual cart adjustments (Reactive back to Firestore)
  const handleIncrement = async (productId: string) => {
    if (!sessionId) return;
    const currentCartItem = cartItems.find(item => item.product.id === productId);
    const currentQty = currentCartItem ? currentCartItem.quantity : 0;
    const res = await addProductToSession(sessionId, productId, currentQty);
    if (!res.success) {
      alert(res.message);
    }
  };

  const handleDecrement = async (productId: string, docIds: string[]) => {
    if (!sessionId || docIds.length === 0) return;
    try {
      // Delete exactly 1 scan document
      const lastDocId = docIds[docIds.length - 1];
      await deleteDoc(doc(db, 'pos_sessions', sessionId, 'scans', lastDocId));
    } catch (err) {
      console.error('Error decrementing scan:', err);
    }
  };

  const handleRemove = async (productId: string, docIds: string[]) => {
    if (!sessionId || docIds.length === 0) return;
    try {
      // Delete all scans for this product
      for (const id of docIds) {
        await deleteDoc(doc(db, 'pos_sessions', sessionId, 'scans', id));
      }
    } catch (err) {
      console.error('Error removing product scans:', err);
    }
  };

  // 5. Checkout Handler
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert('Cart is empty! Scan some products from your mobile scanner or search above.');
      return;
    }

    // Stock verification
    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        alert(`Insufficient stock for "${item.product.name}". Available: ${item.product.stock}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const orderId = 'POS-' + Math.floor(100000 + Math.random() * 900000);
      const newOrder: Order = {
        id: orderId,
        customerName: customerName.trim() || 'In-Person Customer',
        customerPhone: customerPhone.trim() || 'Walk-In',
        address: customerAddress.trim() 
          ? `${customerAddress.trim()} (${deliveryArea === 'inside' ? 'Inside Dhaka' : deliveryArea === 'outside' ? 'Outside Dhaka' : 'No Delivery Cost'})` 
          : 'In-Store Checkout Counter',
        items: cartItems.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.discountPrice || item.product.price,
          quantity: item.quantity,
          scannedQuantity: item.quantity,
          barcode: item.product.barcode
        })),
        totalAmount: grandTotal,
        status: 'delivered',
        order_source: 'POS',
        stock_deducted: true,
        createdAt: new Date().toISOString(),
        paymentMethod: 'POS_In_Person',
        sessionType: 'POS',
        isPaid: true
      };

      // Create main order in Firestore
      await setDoc(doc(db, 'orders', orderId), newOrder);

      // Decrement warehouse stock for each product
      for (const item of cartItems) {
        const prod = productService.getProductById(item.product.id);
        if (prod) {
          const prevStock = prod.stock;
          const updatedProd = {
            ...prod,
            stock: prod.stock - item.quantity
          };
          productService.updateProduct(updatedProd);
          productService.logInventory(
            prod.id,
            'sale',
            item.quantity,
            prevStock,
            updatedProd.stock,
            `POS Checkout - Register ${sessionId}`
          );
          productService.logStockMovement({
            productId: prod.id,
            productName: prod.name,
            orderId,
            quantity: -item.quantity,
            type: 'sale',
            source: 'POS',
            performedBy: 'POS Operator',
            previousStock: prevStock,
            newStock: updatedProd.stock,
            reason: `POS In-Store Checkout`
          });
        }
      }

      // Close POS session document in Firestore
      await setDoc(doc(db, 'pos_sessions', sessionId), {
        id: sessionId,
        status: 'closed',
        closed_at: new Date().toISOString(),
        customerName,
        customerPhone,
        customerAddress,
        customerArea: deliveryArea,
        itemsCount: scans.length
      }, { merge: true });

      setInvoiceOrder(newOrder);
    } catch (err) {
      console.error('Error during POS checkout:', err);
      alert('Checkout failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Download PDF Invoice using html2canvas & jsPDF helper
  const downloadPDF = () => {
    if (!invoiceOrder) return;
    downloadInvoicePDF(invoiceOrder);
  };

  const pairingUrl = `${window.location.origin}/pos/scan/${sessionId}`;

  return (
    <div className="w-full space-y-8 pb-12 print:p-0">
      
      {/* HEADER SECTION (HIDDEN ON PRINT) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-pink-100 pb-5 print:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 rounded-xl cursor-pointer transition shadow-sm"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <Tv className="text-[#E91E8C]" size={24} />
              <span>In-Store POS Register</span>
            </h2>
            <p className="text-xs text-pink-600 font-semibold tracking-wider uppercase mt-1">
              Desktop Cashier Console
            </p>
          </div>
        </div>

        {sessionId && (
          <div className="flex items-center gap-2 bg-[#E91E8C]/10 px-4 py-2 rounded-2xl border border-[#E91E8C]/20 text-xs text-[#E91E8C] font-mono font-bold animate-pulse">
            <span className="w-2.5 h-2.5 bg-[#E91E8C] rounded-full"></span>
            <span>Live Session: {sessionId}</span>
          </div>
        )}
      </div>

      {/* PAIRING QR CODE MODAL POPUP */}
      {isPairingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn print:hidden">
          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-pink-100 shadow-2xl max-w-md w-full space-y-5 text-center relative">
            <button
              type="button"
              onClick={() => setIsPairingModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition cursor-pointer"
              title="Close modal"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 bg-pink-100/60 rounded-2xl flex items-center justify-center mx-auto text-[#E91E8C]">
              <Smartphone size={24} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                Pair Mobile Barcode Scanner
              </h3>
              <p className="text-xs text-gray-500">
                Scan this QR code with a smartphone camera to connect mobile camera scanner.
              </p>
            </div>

            {sessionId ? (
              <div className="bg-pink-50/30 border border-pink-100 p-5 rounded-2xl inline-block shadow-inner">
                <QRCodeSVG 
                  value={pairingUrl} 
                  size={180} 
                  bgColor={"#FFFFFF"}
                  fgColor={"#E91E8C"}
                  level={"H"}
                />
                <div className="text-[10px] text-pink-600 mt-2 font-mono font-bold truncate max-w-[220px] mx-auto bg-white px-2 py-1 rounded-lg border border-pink-100 shadow-2xs">
                  {pairingUrl}
                </div>
              </div>
            ) : (
              <div className="w-48 h-48 bg-pink-50 animate-pulse mx-auto rounded-2xl flex items-center justify-center">
                <span className="text-xs text-pink-400 font-semibold">Generating pairing...</span>
              </div>
            )}

            <div className="bg-pink-50/50 p-4 rounded-2xl text-left border border-pink-100 text-xs text-gray-600 space-y-1">
              <span className="font-extrabold text-pink-700 uppercase text-[10px] block">Instruction for staff:</span>
              <p className="leading-relaxed text-[11px]">
                1. Open camera on smartphone & scan this QR code.<br/>
                2. Log in as staff on mobile.<br/>
                3. Start scanning product barcodes — cart on this register will update in <strong>real-time</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsPairingModalOpen(false)}
              className="w-full bg-[#E91E8C] hover:bg-[#FF4B91] text-white py-3 rounded-2xl font-bold text-xs transition cursor-pointer shadow-md shadow-pink-200"
            >
              Done / Close Popup
            </button>
          </div>
        </div>
      )}

      {invoiceOrder ? (
        // INVOICE / RECEIPT SCREEN
        <div className="max-w-2xl mx-auto space-y-6">
          
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[24px] text-center space-y-3 print:hidden shadow-sm">
            <div className="w-16 h-16 bg-white rounded-full border-4 border-emerald-300 flex items-center justify-center mx-auto text-emerald-600 animate-bounce">
              <CheckCircle size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">POS Checkout Success!</h3>
              <p className="text-xs text-gray-500 mt-1 font-medium">Order created and stock levels decremented safely.</p>
            </div>
          </div>

          {/* REUSABLE INVOICE DOCUMENT COMPONENT */}
          <InvoiceDocument order={invoiceOrder} />

          {/* CONTROLS (HIDDEN ON PRINT) */}
          <div className="flex flex-wrap gap-3 pt-4 print:hidden">
            <button 
              onClick={() => printInvoice(invoiceOrder)}
              className="flex-1 bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer size={15} />
              <span>Print Invoice (A4)</span>
            </button>
            
            <button 
              onClick={downloadPDF}
              className="flex-1 bg-pink-50 border border-pink-100 hover:bg-pink-100 text-pink-700 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download size={15} />
              <span>Download PDF</span>
            </button>

            <button 
              onClick={() => {
                setInvoiceOrder(null);
                setCustomerName('');
                setCustomerPhone('');
                setCustomerAddress('');
                setScans([]);
                // Re-create a new session
                const createSession = async () => {
                  const newSessionId = 'pos-' + Math.floor(100000 + Math.random() * 900000);
                  await setDoc(doc(db, 'pos_sessions', newSessionId), {
                    id: newSessionId,
                    status: 'open',
                    created_at: new Date().toISOString(),
                    customerName: '',
                    customerPhone: '',
                    customerAddress: '',
                    customerArea: '',
                    computerJoined: true
                  });
                  setSessionId(newSessionId);
                };
                createSession();
              }}
              className="w-full sm:w-auto bg-[#E91E8C] hover:bg-[#FF4B91] text-white px-8 py-3 rounded-2xl text-xs font-bold transition cursor-pointer text-center shadow-md shadow-pink-100"
            >
              Start New POS Session
            </button>
          </div>

        </div>
      ) : (
        // REGISTER SCREEN - 2 BALANCED SIDE-BY-SIDE COLUMNS
        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start w-full">
          
          {/* ================= LEFT COLUMN (PRODUCT SEARCH + MOCK SCANNER CATALOG) ================= */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. PAIR MOBILE SCANNER POPUP TRIGGER */}
            <div className="bg-white p-5 rounded-[28px] border border-pink-100 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center text-[#E91E8C] flex-shrink-0">
                  <Smartphone size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider truncate">
                    Mobile Camera Scanner
                  </h4>
                  <p className="text-[11px] text-gray-500 truncate">
                    Pair phone for wireless camera scanning
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPairingModalOpen(true)}
                className="bg-[#E91E8C] hover:bg-[#FF4B91] text-white px-3.5 py-2.5 rounded-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 flex-shrink-0 shadow-sm shadow-pink-200"
              >
                <QrCode size={15} />
                <span>Scan Pairing Code</span>
              </button>
            </div>

            {/* 2. MANUAL PRODUCT SEARCH & DESKTOP CATALOG (MOCK SCANNER) */}
            <div 
              ref={searchContainerRef} 
              className="bg-white p-6 rounded-[32px] border border-pink-100 shadow-sm space-y-5 relative"
            >
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Search size={18} className="text-[#E91E8C]" />
                  <span>Manual Product Search & Quick Selector</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Type to search or click any product below to instantly add items to POS cart.
                </p>
              </div>

              {/* Search Input Container */}
              <div className="relative">
                <Search size={18} className="text-pink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                    setSelectedIndex(-1);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search product by name, brand or barcode..."
                  className="w-full bg-pink-50/20 text-gray-800 text-xs sm:text-sm pl-11 pr-10 py-3.5 rounded-2xl border border-pink-200 outline-none focus:border-[#E91E8C] focus:bg-white focus:ring-4 focus:ring-[#E91E8C]/10 transition shadow-inner font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsDropdownOpen(false);
                      setSelectedIndex(-1);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-600 cursor-pointer p-1"
                  >
                    <X size={16} />
                  </button>
                )}

                {/* Dropdown list when typing */}
                {isDropdownOpen && searchQuery.trim().length > 0 && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-pink-100 shadow-2xl max-h-80 overflow-y-auto divide-y divide-pink-50">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400 font-medium">
                        No matching products found for "{searchQuery}"
                      </div>
                    ) : (
                      filteredProducts.map((p, idx) => {
                        const isSelected = idx === selectedIndex;
                        const currentCartItem = cartItems.find((item) => item.product.id === p.id);
                        const currentCartQty = currentCartItem ? currentCartItem.quantity : 0;
                        const isOutOfStock = p.stock <= 0;
                        const isMaxCart = currentCartQty >= p.stock;

                        return (
                          <div
                            key={p.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              if (!isOutOfStock && !isMaxCart) {
                                handleSelectProduct(p);
                              }
                            }}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`p-3 flex items-center justify-between gap-3 transition text-xs ${
                              isOutOfStock
                                ? 'bg-gray-50/70 opacity-60 cursor-not-allowed'
                                : isMaxCart
                                ? 'bg-amber-50/40 cursor-not-allowed'
                                : isSelected
                                ? 'bg-pink-50/90 border-l-4 border-[#E91E8C] cursor-pointer'
                                : 'hover:bg-pink-50/40 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-11 h-11 object-cover rounded-xl border border-pink-100 flex-shrink-0 shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[9px] uppercase font-bold text-[#E91E8C] bg-pink-100/60 px-1.5 py-0.5 rounded">
                                    {p.brand}
                                  </span>
                                  {p.barcode && (
                                    <span className="text-[9px] text-gray-400 font-mono">
                                      #{p.barcode}
                                    </span>
                                  )}
                                </div>
                                <h5 className="font-bold text-gray-800 text-xs truncate mt-0.5" title={p.name}>
                                  {p.name}
                                </h5>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                                  <span className="font-mono font-extrabold text-[#E91E8C]">
                                    ৳{p.discountPrice || p.price}
                                  </span>
                                  {isOutOfStock ? (
                                    <span className="text-red-500 font-bold bg-red-50 px-1.5 rounded">
                                      Stock 0
                                    </span>
                                  ) : isMaxCart ? (
                                    <span className="text-amber-600 font-bold bg-amber-50 px-1.5 rounded">
                                      Max in cart ({currentCartQty}/{p.stock})
                                    </span>
                                  ) : (
                                    <span className="text-gray-500">
                                      Stock: <strong className="text-emerald-600">{p.stock}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={isOutOfStock || isMaxCart}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition flex-shrink-0 flex items-center gap-1 ${
                                isOutOfStock || isMaxCart
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-[#E91E8C] hover:bg-[#FF4B91] text-white shadow-sm shadow-pink-100'
                              }`}
                            >
                              <Plus size={12} />
                              <span>Add</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Status / feedback message */}
              {searchMessage && (
                <div
                  className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                    searchMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0 bg-current"></span>
                  <span>{searchMessage.text}</span>
                </div>
              )}

              {/* DESKTOP MOCK SCANNER / QUICK PRODUCT GRID */}
              <div className="space-y-3 pt-3 border-t border-pink-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Wand2 size={14} className="text-[#E91E8C]" />
                    <span>Quick Catalog ({filteredProducts.length})</span>
                  </span>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-[11px] font-bold text-pink-600 hover:underline cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {filteredProducts.map((p) => {
                    const currentCartItem = cartItems.find((item) => item.product.id === p.id);
                    const currentCartQty = currentCartItem ? currentCartItem.quantity : 0;
                    const isOutOfStock = p.stock <= 0;
                    const isMaxCart = currentCartQty >= p.stock;

                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          if (!isOutOfStock && !isMaxCart) {
                            handleSelectProduct(p);
                          }
                        }}
                        disabled={isOutOfStock || isMaxCart}
                        className={`p-2.5 rounded-2xl border text-left text-xs transition cursor-pointer flex items-center gap-2.5 group ${
                          isOutOfStock
                            ? 'bg-gray-50 opacity-50 cursor-not-allowed border-gray-100'
                            : isMaxCart
                            ? 'bg-amber-50/30 border-amber-200 cursor-not-allowed'
                            : 'bg-pink-50/20 hover:bg-pink-50/80 border-pink-100 hover:border-pink-300 shadow-2xs hover:shadow-sm'
                        }`}
                      >
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-10 h-10 object-cover rounded-xl border border-pink-100 shadow-2xs flex-shrink-0 group-hover:scale-105 transition"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] uppercase font-bold text-pink-600 block truncate">
                            {p.brand}
                          </span>
                          <h5 className="font-bold text-gray-800 text-xs truncate" title={p.name}>
                            {p.name}
                          </h5>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[#E91E8C] font-black font-mono text-xs">
                              ৳{p.discountPrice || p.price}
                            </span>
                            {isOutOfStock ? (
                              <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Stock 0</span>
                            ) : isMaxCart ? (
                              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Max</span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-0.5 group-hover:text-[#E91E8C]">
                                <Plus size={11} />
                                <span>Add</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

          {/* ================= RIGHT COLUMN (CART + CUSTOMER & DELIVERY + ORDER SUMMARY) ================= */}
          <div className="lg:col-span-7 space-y-6">

            {/* 1. REAL-TIME CART */}
            <div className="bg-white p-6 rounded-[32px] border border-pink-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-pink-50 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <ShoppingBag className="text-[#E91E8C]" size={18} />
                    <span>Real-Time Cart</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Scanned items from mobile & manual search</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-pink-50 border border-pink-100 text-[#E91E8C] font-extrabold text-xs px-3 py-1.5 rounded-full font-mono shadow-xs">
                    {totalItemsCount} items ({scans.length} scans)
                  </span>
                </div>
              </div>

              {cartItems.length === 0 ? (
                <div className="py-12 text-center space-y-3 text-gray-400">
                  <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto text-[#E91E8C]/40 border border-pink-100">
                    <ShoppingBag size={28} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-700">Cart is currently empty</p>
                    <p className="text-[11px] text-gray-400">Scan barcodes with mobile or select products on the left to start building order.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {cartItems.map(item => {
                    const price = item.product.discountPrice || item.product.price;
                    const itemSubtotal = price * item.quantity;
                    const isMaxStock = item.quantity >= item.product.stock;

                    return (
                      <div 
                        key={item.product.id}
                        className="bg-pink-50/20 border border-pink-100/60 p-3.5 rounded-2xl flex items-center justify-between text-xs transition hover:bg-pink-50/40 gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img 
                            src={item.product.image} 
                            alt={item.product.name}
                            className="w-12 h-12 object-cover rounded-xl border border-pink-100 shadow-sm flex-shrink-0" 
                            referrerPolicy="no-referrer" 
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] uppercase font-bold text-pink-600 block truncate">{item.product.brand}</span>
                            <h4 className="font-bold text-gray-850 truncate text-xs">{item.product.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[#E91E8C] font-extrabold font-mono text-xs">৳{price}</span>
                              <span className="text-[10px] text-gray-400">Stock: {item.product.stock}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Row Subtotal */}
                          <div className="text-right font-mono hidden sm:block">
                            <span className="text-[10px] text-gray-400 block">Subtotal</span>
                            <span className="font-extrabold text-gray-800 text-xs">৳{itemSubtotal}</span>
                          </div>

                          {/* Real-time sync controllers */}
                          <div className="flex items-center bg-white border border-pink-200 rounded-xl shadow-xs">
                            <button 
                              type="button"
                              onClick={() => handleDecrement(item.product.id, item.docIds)}
                              className="p-1.5 hover:bg-pink-50 text-gray-500 hover:text-pink-600 transition cursor-pointer"
                              title="Decrease quantity"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="px-2.5 text-gray-900 font-mono font-black text-xs">{item.quantity}</span>
                            <button 
                              type="button"
                              onClick={() => handleIncrement(item.product.id)}
                              disabled={isMaxStock}
                              className={`p-1.5 transition cursor-pointer ${
                                isMaxStock 
                                  ? 'text-gray-300 cursor-not-allowed' 
                                  : 'hover:bg-pink-50 text-gray-500 hover:text-pink-600'
                              }`}
                              title={isMaxStock ? 'Stock limit reached' : 'Increase quantity'}
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <button 
                            type="button"
                            onClick={() => handleRemove(item.product.id, item.docIds)}
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

            {/* 2. CUSTOMER & DELIVERY INFORMATION */}
            <div className="bg-white p-6 rounded-[32px] border border-pink-100 shadow-sm space-y-4 text-xs">
              <div className="border-b border-pink-50 pb-2.5">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={15} className="text-[#E91E8C]" />
                  <span>Customer & Delivery Details</span>
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">Optional details for invoice & dispatch record</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryArea('inside')}
                    className={`p-2.5 rounded-xl border font-bold transition text-center cursor-pointer text-xs ${
                      deliveryArea === 'inside' 
                        ? 'bg-[#E91E8C]/10 border-[#E91E8C] text-[#E91E8C] shadow-xs' 
                        : 'bg-white border-pink-100 hover:bg-pink-50 text-gray-600'
                    }`}
                  >
                    Inside Dhaka (৳60)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryArea('outside')}
                    className={`p-2.5 rounded-xl border font-bold transition text-center cursor-pointer text-xs ${
                      deliveryArea === 'outside' 
                        ? 'bg-[#E91E8C]/10 border-[#E91E8C] text-[#E91E8C] shadow-xs' 
                        : 'bg-white border-pink-100 hover:bg-pink-50 text-gray-600'
                    }`}
                  >
                    Outside Dhaka (৳120)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryArea('none')}
                    className={`p-2.5 rounded-xl border font-bold transition text-center cursor-pointer text-xs ${
                      deliveryArea === 'none' 
                        ? 'bg-[#E91E8C]/10 border-[#E91E8C] text-[#E91E8C] shadow-xs' 
                        : 'bg-white border-pink-100 hover:bg-pink-50 text-gray-600'
                    }`}
                  >
                    No Delivery Cost (৳0)
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

            {/* 3. ORDER SUMMARY & CHECKOUT BUTTON */}
            <div className="bg-gradient-to-b from-pink-50/30 to-pink-50/80 p-6 rounded-[32px] border border-pink-200/80 shadow-sm space-y-5 text-xs">
              <div className="border-b border-pink-200/60 pb-2">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt size={15} className="text-[#E91E8C]" />
                  <span>Order Summary</span>
                </h4>
              </div>

              {/* Calculations Breakdown */}
              <div className="space-y-2 font-mono text-gray-700">
                <div className="flex justify-between font-medium">
                  <span className="text-gray-600">Gross Items Subtotal ({totalItemsCount} pcs):</span>
                  <span className="font-bold text-gray-900">৳{subtotal}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-gray-600">Selected Delivery Charge:</span>
                  <span className="font-bold text-gray-900">৳{cartItems.length > 0 ? deliveryCharge : 0}</span>
                </div>
                
                {/* Grand Total Highlight */}
                <div className="bg-white p-4 rounded-2xl border border-pink-200 shadow-sm flex items-center justify-between mt-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-pink-600 block tracking-wider">Total Amount Due</span>
                    <span className="text-sm font-black text-gray-900">Grand Total BDT</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-[#E91E8C] font-mono">৳{grandTotal}</span>
                  </div>
                </div>
              </div>

              {/* Checkout Action Button */}
              <button 
                type="submit"
                disabled={cartItems.length === 0 || isSubmitting}
                className="w-full bg-gradient-to-r from-[#FF4B91] to-[#E91E8C] hover:from-[#E91E8C] hover:to-[#D81B60] text-white py-4 rounded-2xl text-xs sm:text-sm font-extrabold transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-pink-200/60 active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Creating Order & Generating Invoice...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Confirm & Create Order (Generate Invoice)</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </form>
      )}

    </div>
  );
}
