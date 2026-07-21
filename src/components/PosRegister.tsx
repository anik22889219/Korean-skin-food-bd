import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, setDoc, onSnapshot, query, deleteDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { db } from '../services/firebase';
import { productService } from '../services/productService';
import { Product, Order } from '../types';
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
  Sparkles
} from 'lucide-react';

interface PosRegisterProps {
  onBack: () => void;
  products: Product[];
}

export default function PosRegister({ onBack, products }: PosRegisterProps) {
  const [sessionId, setSessionId] = useState<string>('');
  const [scans, setScans] = useState<any[]>([]);
  
  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState<'inside' | 'outside'>('inside');
  
  // Invoice state
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

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
          computerJoined: true
        });
        setSessionId(newSessionId);
      } catch (err) {
        console.error('Error creating POS session in Firestore:', err);
      }
    };
    initSession();
  }, []);

  // 2. Real-time subscription to scans subcollection
  useEffect(() => {
    if (!sessionId) return;
    const q = query(collection(db, 'pos_sessions', sessionId, 'scans'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
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
      const prod = productService.getProductById(pId);
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

  const deliveryCharge = deliveryArea === 'inside' ? 60 : 120;
  const grandTotal = subtotal + (cartItems.length > 0 ? deliveryCharge : 0);

  // 4. Manual cart adjustments (Reactive back to Firestore)
  const handleIncrement = async (productId: string) => {
    if (!sessionId) return;
    const product = productService.getProductById(productId);
    if (product && product.stock <= 0) {
      alert(`Cannot add. ${product.name} is out of stock!`);
      return;
    }
    try {
      const scanRef = doc(collection(db, 'pos_sessions', sessionId, 'scans'));
      await setDoc(scanRef, {
        product_id: productId,
        scanned_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error simulating manual scan:', err);
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
      alert('Cart is empty! Scan some products from your mobile scanner.');
      return;
    }

    // Stock verification
    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        alert(`Insufficient stock for "${item.product.name}". Available: ${item.product.stock}`);
        return;
      }
    }

    try {
      const orderId = 'POS-' + Math.floor(100000 + Math.random() * 900000);
      const newOrder: Order = {
        id: orderId,
        customerName: customerName.trim() || 'In-Person Customer',
        customerPhone: customerPhone.trim() || 'Walk-In',
        address: customerAddress.trim() 
          ? `${customerAddress.trim()} (${deliveryArea === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'})` 
          : 'In-Store Checkout Counter',
        items: cartItems.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.discountPrice || item.product.price,
          quantity: item.quantity
        })),
        totalAmount: grandTotal,
        status: 'delivered',
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
    }
  };

  // 6. Download PDF Invoice using jsPDF
  const downloadPDF = () => {
    if (!invoiceOrder) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors & Branding
      doc.setFillColor(233, 30, 140); // Pink header bar
      doc.rect(0, 0, 210, 15, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('KOREAN SKIN FOOD BD', 15, 10);

      // Invoice info
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(22);
      doc.text('INVOICE', 15, 30);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Invoice ID: ${invoiceOrder.id}`, 150, 25);
      doc.text(`Date: ${new Date(invoiceOrder.createdAt).toLocaleString()}`, 150, 30);
      doc.text(`Channel: In-Store POS Register`, 150, 35);

      // Divider line
      doc.setDrawColor(240, 240, 240);
      doc.line(15, 42, 195, 42);

      // Customer Details
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('CUSTOMER INFO:', 15, 50);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Name: ${invoiceOrder.customerName}`, 15, 56);
      doc.text(`Phone: ${invoiceOrder.customerPhone}`, 15, 62);
      doc.text(`Address: ${invoiceOrder.address}`, 15, 68);

      // Products Table Header
      let currentY = 82;
      doc.setFillColor(250, 240, 245);
      doc.rect(15, currentY, 180, 8, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(190, 24, 93); // Pink dark text
      doc.text('Item Description', 18, currentY + 5.5);
      doc.text('Price (BDT)', 110, currentY + 5.5);
      doc.text('Qty', 145, currentY + 5.5);
      doc.text('Total (BDT)', 170, currentY + 5.5);

      // Table rows
      doc.setTextColor(70, 70, 70);
      doc.setFont('helvetica', 'normal');
      
      invoiceOrder.items.forEach((item, index) => {
        currentY += 10;
        
        // Background strip for alternating rows
        if (index % 2 === 1) {
          doc.setFillColor(253, 250, 252);
          doc.rect(15, currentY - 2, 180, 10, 'F');
        }

        // Draw item row
        doc.text(item.name.substring(0, 48), 18, currentY + 4);
        doc.text(`bdt ${item.price}`, 110, currentY + 4);
        doc.text(`x ${item.quantity}`, 145, currentY + 4);
        doc.text(`bdt ${item.price * item.quantity}`, 170, currentY + 4);
        
        doc.setDrawColor(245, 245, 245);
        doc.line(15, currentY + 8, 195, currentY + 8);
      });

      // Totals block
      currentY += 18;
      doc.setDrawColor(200, 200, 200);
      doc.line(120, currentY, 195, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Subtotal:', 130, currentY + 6);
      doc.text(`BDT ৳${invoiceOrder.totalAmount - (invoiceOrder.items.length > 0 ? (deliveryArea === 'inside' ? 60 : 120) : 0)}`, 170, currentY + 6);

      doc.text('Delivery Charge:', 130, currentY + 12);
      doc.text(`BDT ৳${deliveryArea === 'inside' ? 60 : 120}`, 170, currentY + 12);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(233, 30, 140);
      doc.text('Grand Total:', 130, currentY + 20);
      doc.text(`BDT ৳${invoiceOrder.totalAmount}`, 170, currentY + 20);

      // Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Thank you for glowing with us! This is an official computer-generated receipt.', 105, 275, { align: 'center' });

      doc.save(`Invoice-${invoiceOrder.id}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  const pairingUrl = `${window.location.origin}/pos/scan/${sessionId}`;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 print:p-0">
      
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

          {/* PRINTABLE A4 INVOICE SHEET */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-pink-100 space-y-8 font-mono print:border-none print:shadow-none print:p-0">
            <div className="flex justify-between items-start flex-wrap gap-4 border-b border-pink-100 pb-6">
              <div className="space-y-1.5">
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">KOREAN SKIN FOOD BD</h1>
                <p className="text-xs text-pink-600 font-semibold italic">"Love yourself, Love your skin"</p>
                <p className="text-[11px] text-gray-500 font-medium">Flagship Store, Dhaka, Bangladesh</p>
                <p className="text-[11px] text-gray-500 font-medium font-mono">Mobile Hotline: 01712345678</p>
              </div>

              <div className="text-right space-y-1 text-xs">
                <span className="bg-[#E91E8C] text-white px-2.5 py-1 rounded font-bold uppercase text-[10px] tracking-wider block text-center">
                  Cash Invoice
                </span>
                <p className="font-bold text-gray-800 mt-1"># {invoiceOrder.id}</p>
                <p className="text-gray-500 text-[10px]">{new Date(invoiceOrder.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Customer info card */}
            <div className="bg-pink-50/10 p-5 rounded-2xl border border-pink-100/50 text-xs grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-pink-700 font-bold uppercase tracking-wider block text-[10px]">Customer Details:</span>
                <div><strong className="text-gray-800 font-bold">{invoiceOrder.customerName}</strong></div>
                <div><span className="text-gray-500">Phone:</span> <span className="font-mono">{invoiceOrder.customerPhone}</span></div>
              </div>
              <div className="space-y-2">
                <span className="text-pink-700 font-bold uppercase tracking-wider block text-[10px]">Delivery Info:</span>
                <div className="text-gray-700 font-medium">{invoiceOrder.address}</div>
                <div><span className="text-gray-500">Method:</span> POS Counter Checkout</div>
              </div>
            </div>

            {/* Invoice Line Items */}
            <div className="space-y-4">
              <span className="text-pink-700 font-bold uppercase tracking-wider block text-[10px]">Order Particulars:</span>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-dashed border-pink-100 text-[#E91E8C] font-extrabold">
                    <th className="py-2.5 px-1">Product Description</th>
                    <th className="py-2.5 px-1 text-right">Unit Price</th>
                    <th className="py-2.5 px-1 text-center">Qty</th>
                    <th className="py-2.5 px-1 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-100/50 text-gray-800">
                  {invoiceOrder.items.map((item, index) => (
                    <tr key={index}>
                      <td className="py-3 px-1 font-semibold">{item.name}</td>
                      <td className="py-3 px-1 text-right font-mono">৳{item.price}</td>
                      <td className="py-3 px-1 text-center font-mono font-bold">{item.quantity}</td>
                      <td className="py-3 px-1 text-right font-mono font-extrabold">৳{item.price * item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="flex justify-end pt-4">
              <div className="w-full max-w-xs space-y-2 text-right text-xs border-t border-dashed border-pink-200 pt-4">
                <div className="flex justify-between text-gray-500">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono">৳{subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>In-Store Delivery:</span>
                  <span className="font-mono">৳{deliveryCharge}</span>
                </div>
                <div className="flex justify-between text-gray-900 font-black text-sm border-t border-dashed border-pink-200 pt-2">
                  <span className="text-[#E91E8C]">Amount Paid (Net):</span>
                  <span className="text-[#E91E8C] font-mono">৳{grandTotal}</span>
                </div>
              </div>
            </div>

            <div className="text-center text-gray-400 text-[10px] border-t border-pink-100 pt-6">
              Thank you for choosing Korean Skin Food BD. We appreciate your preference!<br/>
              Exchange available within 7 days with unopened package and receipt.
            </div>
          </div>

          {/* CONTROLS (HIDDEN ON PRINT) */}
          <div className="flex flex-wrap gap-3 pt-4 print:hidden">
            <button 
              onClick={() => window.print()}
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
        // REGISTER SCREEN
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: LIVE SESSION SYNCHRONIZATION DETAILS (5/12) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* PAIRING STATUS & QR CODE */}
            <div className="bg-white p-6 rounded-[32px] border border-pink-100 shadow-sm text-center space-y-5">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Smartphone className="text-[#E91E8C]" size={16} />
                  <span>Scan Pairing Code</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Scan this code on a mobile device to open the barcode camera scanner.
                </p>
              </div>

              {sessionId ? (
                <div className="bg-pink-50/20 border border-pink-100/60 p-4 rounded-2xl inline-block shadow-inner relative group">
                  <QRCodeSVG 
                    value={pairingUrl} 
                    size={160} 
                    bgColor={"#FFFFFF"}
                    fgColor={"#E91E8C"}
                    level={"H"}
                  />
                  <div className="text-[10px] text-gray-400 mt-2 font-mono font-semibold truncate max-w-[200px] mx-auto">
                    {pairingUrl}
                  </div>
                </div>
              ) : (
                <div className="w-40 h-40 bg-pink-50 animate-pulse mx-auto rounded-2xl flex items-center justify-center">
                  <span className="text-xs text-pink-400 font-semibold">Generating pairing...</span>
                </div>
              )}

              <div className="bg-pink-50/40 p-4 rounded-2xl text-left border border-pink-100/50">
                <span className="text-[10px] uppercase font-bold text-pink-700 block mb-1">Instruction for staff:</span>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Log in as staff on your smartphone, scan this QR code using the camera, and start scanning items. The cart on this desktop register will update in <strong>real-time</strong>.
                </p>
              </div>
            </div>

            {/* MOCK SCANNER UTILITY FOR EASY DEMO */}
            <div className="bg-white p-6 rounded-[32px] border border-pink-100 shadow-sm space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={13} className="text-[#E91E8C]" />
                  <span>Desktop Mock Scanner</span>
                </h4>
                <p className="text-[11px] text-gray-500">
                  No smartphone? Click on any product below to instantly simulate scanning it into this live session.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleIncrement(p.id)}
                    className="p-2 bg-pink-50/20 hover:bg-pink-50 border border-pink-100/50 hover:border-pink-300 rounded-xl text-left text-[11px] transition cursor-pointer flex items-center gap-2"
                  >
                    <img src={p.image} className="w-6 h-6 object-cover rounded shadow-sm flex-shrink-0" referrerPolicy="no-referrer" />
                    <div className="truncate">
                      <span className="font-bold text-gray-800 block truncate">{p.name}</span>
                      <span className="text-[9px] text-[#E91E8C] font-bold font-mono">৳{p.discountPrice || p.price}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: RUNNING CART & CUSTOMER FORM (7/12) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* LIVE CART ITEMS LIST */}
            <div className="bg-white p-6 rounded-[32px] border border-pink-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-pink-50 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="text-[#E91E8C]" size={16} />
                    <span>Real-Time Cart</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Scanned items from live session</p>
                </div>
                <span className="bg-pink-50 border border-pink-100 text-[#E91E8C] font-bold text-[10px] px-2.5 py-1 rounded-full font-mono">
                  {scans.length} items scanned
                </span>
              </div>

              {cartItems.length === 0 ? (
                <div className="py-12 text-center space-y-2 text-gray-400">
                  <ShoppingBag size={32} className="mx-auto opacity-30 animate-pulse text-gray-500" />
                  <p className="text-xs font-semibold">Cart is currently empty.</p>
                  <p className="text-[10px]">Scanned products will show up here instantly!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {cartItems.map(item => {
                    const price = item.product.discountPrice || item.product.price;
                    return (
                      <div 
                        key={item.product.id}
                        className="bg-pink-50/25 border border-pink-100/50 p-3 rounded-2xl flex items-center justify-between text-xs transition hover:bg-pink-50/40"
                      >
                        <div className="flex items-center gap-3">
                          <img src={item.product.image} className="w-10 h-10 object-cover rounded shadow-sm" referrerPolicy="no-referrer" />
                          <div>
                            <span className="text-[9px] uppercase font-bold text-pink-600 block">{item.product.brand}</span>
                            <h4 className="font-bold text-gray-850 truncate max-w-xs">{item.product.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[#E91E8C] font-extrabold font-mono">৳{price}</span>
                              <span className="text-[10px] text-gray-400">Stock: {item.product.stock} left</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Real-time sync controllers */}
                          <div className="flex items-center bg-white border border-pink-100 rounded-lg">
                            <button 
                              onClick={() => handleDecrement(item.product.id, item.docIds)}
                              className="p-1 hover:bg-pink-50 text-gray-400 hover:text-pink-600 cursor-pointer"
                            >
                              <Minus size={11} />
                            </button>
                            <span className="px-2 text-gray-800 font-mono font-black text-xs">{item.quantity}</span>
                            <button 
                              onClick={() => handleIncrement(item.product.id)}
                              className="p-1 hover:bg-pink-50 text-gray-400 hover:text-pink-600 cursor-pointer"
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <button 
                            onClick={() => handleRemove(item.product.id, item.docIds)}
                            className="text-gray-400 hover:text-red-500 cursor-pointer p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CUSTOMER FORM & DISPATCH */}
            <form onSubmit={handleCheckout} className="bg-white p-6 rounded-[32px] border border-pink-100 shadow-sm space-y-4 text-xs">
              <span className="text-pink-700 font-bold uppercase tracking-wider block text-[10px]">
                In-Store Delivery & Customer Details:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-500 font-bold mb-1 flex items-center gap-1">
                    <User size={12} className="text-pink-500" />
                    <span>Customer Name (Optional)</span>
                  </label>
                  <input 
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g., Sadia Anjum"
                    className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-bold mb-1 flex items-center gap-1">
                    <Phone size={12} className="text-pink-500" />
                    <span>Customer Mobile (Optional)</span>
                  </label>
                  <input 
                    type="tel" 
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g., 01700000000"
                    className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-500 font-bold mb-1 flex items-center gap-1">
                  <Truck size={12} className="text-pink-500" />
                  <span>Select Delivery Zone</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryArea('inside')}
                    className={`p-3 rounded-xl border font-bold transition text-center cursor-pointer ${deliveryArea === 'inside' ? 'bg-[#E91E8C]/10 border-[#E91E8C] text-[#E91E8C]' : 'bg-white border-pink-100 hover:bg-pink-50 text-gray-600'}`}
                  >
                    Inside Dhaka (৳60)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryArea('outside')}
                    className={`p-3 rounded-xl border font-bold transition text-center cursor-pointer ${deliveryArea === 'outside' ? 'bg-[#E91E8C]/10 border-[#E91E8C] text-[#E91E8C]' : 'bg-white border-pink-100 hover:bg-pink-50 text-gray-600'}`}
                  >
                    Outside Dhaka (৳120)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-500 font-bold mb-1 flex items-center gap-1">
                  <MapPin size={12} className="text-pink-500" />
                  <span>Delivery Address (Optional)</span>
                </label>
                <textarea 
                  rows={2}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Street, Area, District"
                  className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
                />
              </div>

              {/* Summary calculations */}
              <div className="bg-pink-50/20 border border-pink-100 p-4 rounded-2xl space-y-2 font-mono text-gray-700">
                <div className="flex justify-between font-medium">
                  <span>Gross Items Subtotal:</span>
                  <span>৳{subtotal}</span>
                </div>
                {cartItems.length > 0 && (
                  <div className="flex justify-between font-medium">
                    <span>Selected Delivery Charge:</span>
                    <span>৳{deliveryCharge}</span>
                  </div>
                )}
                <div className="border-t border-pink-100 pt-2.5 flex justify-between text-gray-900 font-extrabold text-sm">
                  <span className="text-pink-700 font-black">Grand Total BDT:</span>
                  <span className="text-[#E91E8C] font-black">৳{grandTotal}</span>
                </div>
              </div>

              <button 
                type="submit"
                disabled={cartItems.length === 0}
                className="w-full bg-gradient-to-r from-[#FF4B91] to-[#E91E8C] text-white py-3.5 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 shadow-md shadow-pink-100"
              >
                <CheckCircle size={15} />
                <span>Confirm & Create Order (Generate Invoice)</span>
              </button>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}
