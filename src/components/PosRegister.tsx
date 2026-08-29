import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { collection, doc, setDoc, updateDoc, onSnapshot, query, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { productService } from '../services/productService';
import { addProductToSession } from '../services/posService';
import { posDiscoveryService } from '../services/posDiscoveryService';
import { useAuth } from '../context/AuthContext';
import { Product, Order, StockReceipt } from '../types';
import { InvoiceDocument } from './InvoiceDocument';
import { downloadInvoicePDF, printInvoice } from '../utils/invoicePdf';
import { playSuccessBeep } from './PosScan';
import { getProductUnitPrice } from '../utils/pricing';

// Modular POS subcomponents
import { PosTab, PricingMode, DeliveryArea, CartItem, StockInQueueItem, ScannerConnectionInfo } from './pos/types';
import { PosMobileNav } from './pos/PosMobileNav';
import { PosCart } from './pos/PosCart';
import { PosProductSearch } from './pos/PosProductSearch';
import { PosStockIn } from './pos/PosStockIn';
import { PosHistory } from './pos/PosHistory';
import { PosPairingModal } from './pos/PosPairingModal';
import { PosScannerNotification } from './pos/PosScannerNotification';
import { PosScannerStatusBadge } from './pos/PosScannerStatusBadge';
import PosScan from './PosScan';
import { posService, isAllowedPosRole, detectDeviceType } from '../services/posService';
import { PosSession } from '../types';

import { 
  Tv, 
  Smartphone, 
  Printer, 
  Download, 
  ArrowLeft, 
  CheckCircle,
  QrCode,
  PackagePlus,
  ShoppingBag,
  History,
  ScanLine,
  Search,
  Volume2,
  VolumeX,
  Layers,
  Check,
  ShieldAlert,
  UserCheck,
  Monitor,
  Tablet,
  Loader2
} from 'lucide-react';

interface PosRegisterProps {
  onBack: () => void;
  products: Product[];
}

export default function PosRegister({ onBack, products }: PosRegisterProps) {
  const { profile, user } = useAuth();
  const operatorName = profile?.name || user?.displayName || user?.email || 'Store Staff';
  const operatorEmail = profile?.email || user?.email || 'staff@koreanskinfoodbd.com';
  const userRole = profile?.role;
  const isAuthorized = isAllowedPosRole(userRole);

  const [currentSession, setCurrentSession] = useState<PosSession | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [scans, setScans] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState<boolean>(false);
  
  // Mobile scanner connection state
  const [scannerInfo, setScannerInfo] = useState<ScannerConnectionInfo>({
    isConnected: false,
    scannerId: null,
    scannerName: null,
    connectedAt: null,
    lastSeenAt: null,
    pendingRequest: null
  });

  // Notification toast state for desktop
  const [notificationOpen, setNotificationOpen] = useState(false);
  const prevConnectedRef = useRef<boolean>(false);
  const prevScannerIdRef = useRef<string | null>(null);

  // Navigation tabs: 'sale' | 'scan' | 'search' | 'stock_in' | 'history'
  const [activeTab, setActiveTab] = useState<PosTab>('sale');
  const [scannerContext, setScannerContext] = useState<'SALE' | 'STOCK_IN'>('SALE');

  const handleTabChange = (tab: PosTab) => {
    setActiveTab(tab);
    if (tab === 'stock_in') {
      setScannerContext('STOCK_IN');
    } else if (tab === 'sale' || tab === 'search') {
      setScannerContext('SALE');
    }
  };

  // React Router search params & location for direct "View Live POS" deep-links
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [targetLiveSessionId, setTargetLiveSessionId] = useState<string | null>(null);
  const [liveSessionsCount, setLiveSessionsCount] = useState<number>(0);

  const isAdminOrSuperAdmin = userRole === 'admin' || userRole === 'super_admin';

  // Handle URL deep-link to view a specific live POS session (?session=XYZ or router state)
  useEffect(() => {
    const sessionParam = searchParams.get('session') || (location.state as any)?.targetSessionId;
    if (sessionParam && isAdminOrSuperAdmin) {
      setTargetLiveSessionId(sessionParam);
      setActiveTab('history');
    }
  }, [searchParams, location.state, isAdminOrSuperAdmin]);

  // Subscribe to real-time active sessions count for Admins
  useEffect(() => {
    if (!isAdminOrSuperAdmin) return;
    const unsub = posService.subscribeActiveSessions((sessions) => {
      setLiveSessionsCount(sessions.length);
    });
    return () => unsub();
  }, [isAdminOrSuperAdmin]);

  // Pricing Mode: Retail vs Wholesale
  const [pricingMode, setPricingMode] = useState<PricingMode>('retail');

  // Customer Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea>('none');
  
  // Completed Invoice State
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Orders list for History tab
  const [orders, setOrders] = useState<Order[]>([]);

  // Stock In Receiving Queue
  const [stockInQueue, setStockInQueue] = useState<StockInQueueItem[]>([]);

  // Direct quantity typing buffer
  const [editingQty, setEditingQty] = useState<{ [productId: string]: string }>({});

  // Sound toggle (persisted)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pos_sound_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('pos_sound_enabled', String(next));
    } catch {}
    if (next) playSuccessBeep(0.2);
  };

  // 1. Initialize & Maintain User-based POS session in Firestore
  useEffect(() => {
    if (!user?.uid || !userRole) {
      setIsLoadingSession(false);
      return;
    }

    if (!isAllowedPosRole(userRole)) {
      setIsLoadingSession(false);
      return;
    }

    let isMounted = true;

    const initUserSession = async () => {
      try {
        setIsLoadingSession(true);
        setSessionError(null);
        const session = await posService.getOrCreateUserPosSession({
          userId: user.uid,
          userName: operatorName,
          userRole: userRole,
          operatorEmail
        });
        if (isMounted) {
          setCurrentSession(session);
          setSessionId(session.id);
        }
      } catch (err: any) {
        console.error('[PosRegister] Error initializing user POS session:', err);
        if (isMounted) {
          setSessionError(err?.message || 'Failed to initialize POS session.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingSession(false);
        }
      }
    };

    initUserSession();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, userRole, operatorName, operatorEmail]);

  // Periodic heartbeat for the active user session
  useEffect(() => {
    if (!sessionId || !isAuthorized) return;

    const heartbeatTimer = setInterval(() => {
      try {
        const sessionRef = doc(db, 'pos_sessions', sessionId);
        const nowIso = new Date().toISOString();
        const currentDevice = detectDeviceType();
        updateDoc(sessionRef, {
          lastSeenAt: nowIso,
          updated_at: nowIso,
          deviceType: currentDevice,
          status: 'active'
        }).catch(() => {});
      } catch {}
    }, 15000);

    return () => {
      clearInterval(heartbeatTimer);
    };
  }, [sessionId, isAuthorized]);

  // 2. Real-time subscription to POS session doc for status and mobile scanner
  useEffect(() => {
    if (!sessionId) return;
    const sessionRef = doc(db, 'pos_sessions', sessionId);

    const unsub = onSnapshot(sessionRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data() as PosSession;
      setCurrentSession({
        ...data,
        id: docSnap.id,
        sessionId: data.sessionId || docSnap.id
      });
      
      const isConnected = Boolean(data.scannerConnected);
      const scannerId = data.mobileScannerId || null;
      const scannerName = data.mobileScannerName || null;
      const connectedAt = data.scannerConnectedAt || null;
      const lastSeenAt = data.scannerLastSeenAt || null;
      const pendingRequest = data.pendingScannerRequest || null;

      // Check if newly connected (transitioned from false to true OR new scanner device connected)
      const isNewlyConnected = (isConnected && !prevConnectedRef.current) || 
                               (isConnected && scannerId && scannerId !== prevScannerIdRef.current);

      if (isNewlyConnected) {
        setNotificationOpen(true);
        if (soundEnabled) {
          playSuccessBeep(0.25);
        }
      }

      if (pendingRequest) {
        setNotificationOpen(true);
      }

      prevConnectedRef.current = isConnected;
      prevScannerIdRef.current = scannerId;

      setScannerInfo({
        isConnected,
        scannerId,
        scannerName,
        connectedAt,
        lastSeenAt,
        pendingRequest
      });
    }, (err) => {
      console.warn('[PosRegister] Session listener error:', err);
    });

    return () => unsub();
  }, [sessionId, soundEnabled]);

  // 3. Real-time subscription to scans subcollection
  const prevScanCountRef = useRef<number>(0);
  useEffect(() => {
    if (!sessionId) return;
    const q = query(collection(db, 'pos_sessions', sessionId, 'scans'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (list.length > prevScanCountRef.current && prevScanCountRef.current > 0 && soundEnabled) {
          playSuccessBeep(0.2);
        }
        prevScanCountRef.current = list.length;
        setScans(list);
      },
      (err) => {
        console.error('Error listening to session scans:', err);
      }
    );
    return () => unsubscribe();
  }, [sessionId, soundEnabled]);

  // 4. Listen to orders for history
  useEffect(() => {
    const q = query(collection(db, 'orders'));
    const unsub = onSnapshot(q, (snapshot) => {
      const ords: Order[] = [];
      snapshot.forEach((d) => {
        ords.push({ id: d.id, ...d.data() } as Order);
      });
      ords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(ords);
    });
    return () => unsub();
  }, []);

  // 5. Map scans to product details & quantities
  const cartItems: CartItem[] = useMemo(() => {
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
        product:
          prod ||
          ({
            id: pId,
            name: 'Unknown Product',
            nameBN: 'অজানা পণ্য',
            brand: 'Generic',
            price: 1000,
            stock: 0,
            image: 'https://images.unsplash.com/photo-1608248597481-496100c8c836?w=150&auto=format&fit=crop'
          } as Product),
        quantity: counts[pId].count,
        docIds: counts[pId].docIds
      };
    });
  }, [scans, products]);

  const cartQuantitiesMap = useMemo(() => {
    const map: Record<string, number> = {};
    cartItems.forEach((it) => {
      map[it.product.id] = it.quantity;
    });
    return map;
  }, [cartItems]);

  const stockInQuantitiesMap = useMemo(() => {
    const map: Record<string, number> = {};
    stockInQueue.forEach((it) => {
      map[it.product.id] = it.quantity;
    });
    return map;
  }, [stockInQueue]);

  // Mobile Handover / Scanner Actions
  const handleAcceptPendingScanner = async () => {
    if (!sessionId || !scannerInfo.pendingRequest) return;
    await posDiscoveryService.desktopAcceptScannerRequest(
      sessionId,
      scannerInfo.pendingRequest.mobileScannerId,
      scannerInfo.pendingRequest.mobileScannerName
    );
    setNotificationOpen(false);
  };

  const handleRejectPendingScanner = async () => {
    if (!sessionId) return;
    await posDiscoveryService.desktopRejectScannerRequest(sessionId);
    setNotificationOpen(false);
  };

  const handleDisconnectScanner = async () => {
    if (!sessionId) return;
    await posDiscoveryService.desktopDisconnectScanner(sessionId);
  };

  // Cart Adjustments
  const handleAddToCart = async (product: Product) => {
    if (!sessionId) return;
    const currentCartQty = cartQuantitiesMap[product.id] || 0;
    if (product.stock <= 0) {
      alert(`"${product.name}" is out of stock!`);
      return;
    }
    if (currentCartQty >= product.stock) {
      alert(`Cannot add more. Available warehouse stock is ${product.stock}.`);
      return;
    }
    const res = await addProductToSession(sessionId, product.id, currentCartQty);
    if (!res.success) {
      alert(res.message);
    }
  };

  const handleAddToStockIn = (product: Product) => {
    setStockInQueue((prev) => {
      const existing = prev.find((it) => it.product.id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.product.id === product.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [{ product, quantity: 1 }, ...prev];
    });
    if (soundEnabled) playSuccessBeep(0.2);
  };

  const handleIncrement = async (productId: string) => {
    if (!sessionId) return;
    const currentQty = cartQuantitiesMap[productId] || 0;
    const res = await addProductToSession(sessionId, productId, currentQty);
    if (!res.success) {
      alert(res.message);
    }
  };

  const handleDecrement = async (productId: string, docIds: string[]) => {
    if (!sessionId || docIds.length === 0) return;
    try {
      const lastDocId = docIds[docIds.length - 1];
      await deleteDoc(doc(db, 'pos_sessions', sessionId, 'scans', lastDocId));
    } catch (err) {
      console.error('Error decrementing scan:', err);
    }
  };

  const handleSetQuantity = async (
    productId: string,
    docIds: string[],
    maxStock: number,
    rawValue: string
  ) => {
    if (!sessionId) return;
    setEditingQty((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });

    const parsed = parseInt(rawValue.trim(), 10);
    if (isNaN(parsed) || parsed < 0) return;

    if (parsed === 0) {
      await handleRemove(productId, docIds);
      return;
    }

    let targetQty = parsed;
    if (targetQty > maxStock) {
      alert(`Available stock for this product is ${maxStock}. Setting quantity to ${maxStock}.`);
      targetQty = maxStock;
    }

    const currentQty = docIds.length;
    if (targetQty === currentQty) return;

    try {
      const batch = writeBatch(db);
      if (targetQty > currentQty) {
        const diff = targetQty - currentQty;
        const scansColRef = collection(db, 'pos_sessions', sessionId, 'scans');
        for (let i = 0; i < diff; i++) {
          const newDocRef = doc(scansColRef);
          batch.set(newDocRef, {
            product_id: productId,
            scanned_at: new Date().toISOString()
          });
        }
      } else {
        const diff = currentQty - targetQty;
        const docsToDelete = docIds.slice(docIds.length - diff);
        for (const dId of docsToDelete) {
          batch.delete(doc(db, 'pos_sessions', sessionId, 'scans', dId));
        }
      }
      await batch.commit();
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
  };

  const handleRemove = async (productId: string, docIds: string[]) => {
    if (!sessionId || docIds.length === 0) return;
    try {
      const batch = writeBatch(db);
      for (const id of docIds) {
        batch.delete(doc(db, 'pos_sessions', sessionId, 'scans', id));
      }
      await batch.commit();
    } catch (err) {
      console.error('Error removing scans:', err);
    }
  };

  const handleClearCart = async () => {
    if (!sessionId || scans.length === 0) return;
    if (!window.confirm('Are you sure you want to clear all items in the POS cart?')) return;
    try {
      const batch = writeBatch(db);
      for (const s of scans) {
        batch.delete(doc(db, 'pos_sessions', sessionId, 'scans', s.id));
      }
      await batch.commit();
    } catch (err) {
      console.error('Error clearing cart:', err);
    }
  };

  // Checkout Handler (Atomic Firestore Transaction with Stock & Idempotency Guards)
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert('Cart is empty! Scan or add products to proceed.');
      return;
    }

    if (!user?.uid || !sessionId) {
      alert('Active POS session not found or user not authenticated. Please restart the session.');
      return;
    }

    // Pre-flight client stock check (for immediate UI UX, while server/transaction strictly re-validates from Firestore)
    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        alert(`Insufficient stock for "${item.product.name}". Available: ${item.product.stock}, In Cart: ${item.quantity}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const checkoutItems = cartItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        barcode: item.product.barcode,
        name: item.product.name,
        price: getProductUnitPrice(item.product, pricingMode, item.quantity)
      }));

      const result = await posService.processPosCheckout({
        sessionId,
        userId: user.uid,
        userRole: userRole || undefined,
        operatorName,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        deliveryArea,
        pricingMode,
        items: checkoutItems
      });

      if (!result.success || !result.order) {
        alert(result.message || 'Checkout failed. Please try again.');
        return;
      }

      setInvoiceOrder(result.order);
      if (soundEnabled) playSuccessBeep(0.3);
    } catch (err: any) {
      console.error('Error during POS checkout:', err);
      alert(err?.message || 'Checkout failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNewSession = async () => {
    setInvoiceOrder(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setScans([]);
  };

  const totalCartCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white border border-rose-200 p-8 rounded-3xl shadow-sm text-center space-y-4 animate-fadeIn">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
          <ShieldAlert size={32} />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">POS Access Restricted</h2>
          <p className="text-xs text-gray-600 mt-1">
            POS terminal is restricted to authorized store staff. Only <strong>admin</strong>, <strong>super_admin</strong>, and <strong>inventory_manager</strong> accounts can access POS sessions.
          </p>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-left text-slate-700">
          <p><span className="font-semibold">Current Account:</span> {operatorName}</p>
          <p><span className="font-semibold">Assigned Role:</span> <span className="font-mono text-rose-600 uppercase font-bold">{userRole || 'No role'}</span></p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold text-xs transition cursor-pointer shadow-xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (isLoadingSession) {
    return (
      <div className="py-24 text-center space-y-4 animate-fadeIn">
        <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto text-[#E91E8C] border border-pink-100">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">Loading User POS Session</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Connecting authenticated session for {operatorName} ({userRole})...
          </p>
        </div>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white border border-rose-200 p-8 rounded-3xl shadow-sm text-center space-y-4 animate-fadeIn">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Session Initialization Error</h2>
        <p className="text-xs text-gray-600">{sessionError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-[#E91E8C] text-white rounded-2xl font-bold text-xs hover:bg-[#FF4B91] transition cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-24 lg:pb-12 print:p-0 print:pb-0">
      {/* ================= IN-APP SCANNER NOTIFICATION TOAST ================= */}
      <PosScannerNotification
        connectionInfo={scannerInfo}
        isOpen={notificationOpen}
        onDismiss={() => setNotificationOpen(false)}
        onOpenScanner={() => {
          setActiveTab('scan');
          setNotificationOpen(false);
        }}
        onAcceptPendingRequest={handleAcceptPendingScanner}
        onRejectPendingRequest={handleRejectPendingScanner}
      />

      {/* ================= TOP NAVIGATION & WORKSTATION HEADER ================= */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-pink-100 pb-5 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 rounded-2xl cursor-pointer transition shadow-2xs"
            title="Exit POS"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <Tv className="text-[#E91E8C]" size={22} />
              <span>Korean Skin Food BD &bull; POS</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-800 bg-pink-50 border border-pink-200 px-2.5 py-0.5 rounded-lg">
                <UserCheck size={12} className="text-[#E91E8C]" />
                <span>{operatorName}</span>
              </span>
              <span className="inline-flex items-center text-[10px] font-mono uppercase font-bold text-pink-700 bg-pink-100 px-2 py-0.5 rounded-md">
                {userRole}
              </span>
              {currentSession?.deviceType && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  {currentSession.deviceType === 'desktop' ? <Monitor size={11} /> : <Smartphone size={11} />}
                  <span className="capitalize">{currentSession.deviceType}</span>
                </span>
              )}
              {sessionId && (
                <span className="hidden sm:inline font-mono text-[11px] text-gray-400">
                  ({sessionId})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Mode Switcher & Status Controls */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-2xl border border-gray-200 text-xs font-bold flex items-center">
            <button
              type="button"
              onClick={() => handleTabChange('sale')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'sale' || activeTab === 'search' || (activeTab === 'scan' && scannerContext === 'SALE')
                  ? 'bg-[#E91E8C] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingBag size={14} />
              <span>Sale Register</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('stock_in')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'stock_in' || (activeTab === 'scan' && scannerContext === 'STOCK_IN')
                  ? 'bg-[#1E293B] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <PackagePlus size={14} />
              <span>Stock Receiving</span>
              {stockInQueue.length > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {stockInQueue.length}
                </span>
              )}
            </button>
            <button
              type="button"
              id="btn-pos-tab-records"
              onClick={() => handleTabChange('history')}
              className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <History size={14} />
              <span>Records</span>
              {isAdminOrSuperAdmin && liveSessionsCount > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
                  <span>{liveSessionsCount} LIVE</span>
                </span>
              )}
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2.5 rounded-2xl border transition cursor-pointer ${
              soundEnabled
                ? 'bg-pink-50 border-pink-200 text-pink-700'
                : 'bg-gray-100 border-gray-200 text-gray-400'
            }`}
            title={soundEnabled ? 'Mute scanner chime' : 'Enable scanner chime'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Mobile Scanner Real-time Status Badge */}
          <PosScannerStatusBadge
            connectionInfo={scannerInfo}
            onOpenScanner={() => setActiveTab('scan')}
            onOpenQrModal={() => setIsPairingModalOpen(true)}
            onDisconnectScanner={handleDisconnectScanner}
          />
        </div>

        {/* Mobile Header Controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition ${
              soundEnabled
                ? 'bg-pink-50 border-pink-200 text-pink-700'
                : 'bg-gray-100 border-gray-200 text-gray-400'
            }`}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          <PosScannerStatusBadge
            connectionInfo={scannerInfo}
            onOpenScanner={() => setActiveTab('scan')}
            onOpenQrModal={() => setIsPairingModalOpen(true)}
            onDisconnectScanner={handleDisconnectScanner}
          />
        </div>
      </header>

      {/* QR PAIRING MODAL (FALLBACK) */}
      <PosPairingModal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        sessionId={sessionId}
      />

      {/* ================= SCREEN CONTENT ROUTING ================= */}
      {invoiceOrder ? (
        // INVOICE / RECEIPT SCREEN
        <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
          <div className="bg-emerald-50 border border-emerald-200/80 p-6 rounded-[28px] text-center space-y-3 print:hidden shadow-xs">
            <div className="w-14 h-14 bg-white rounded-full border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
              <CheckCircle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">POS Checkout Success!</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Cash invoice #{invoiceOrder.id} generated and warehouse inventory decremented safely.
              </p>
            </div>
          </div>

          <InvoiceDocument order={invoiceOrder} />

          <div className="flex flex-wrap gap-3 pt-2 print:hidden">
            <button
              type="button"
              onClick={() => printInvoice(invoiceOrder)}
              className="flex-1 bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer size={15} />
              <span>Print Invoice (A4)</span>
            </button>

            <button
              type="button"
              onClick={() => downloadInvoicePDF(invoiceOrder)}
              className="flex-1 bg-pink-50 border border-pink-100 hover:bg-pink-100 text-pink-700 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download size={15} />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handleStartNewSession}
              className="w-full sm:w-auto bg-[#E91E8C] hover:bg-[#FF4B91] text-white px-8 py-3 rounded-2xl text-xs font-bold transition cursor-pointer text-center shadow-md shadow-pink-200"
            >
              Start New POS Order
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* DESKTOP SPLIT VIEW (On Large Screens) */}
          <div className="hidden lg:block">
            {activeTab === 'stock_in' ? (
              <PosStockIn
                products={products}
                queue={stockInQueue}
                setQueue={setStockInQueue}
                onOpenScanner={() => {
                  setScannerContext('STOCK_IN');
                  setActiveTab('scan');
                }}
                onOpenSearch={() => setActiveTab('search')}
                staffName={operatorName}
              />
            ) : activeTab === 'history' ? (
              <PosHistory orders={orders} />
            ) : activeTab === 'scan' ? (
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between bg-pink-50/50 p-4 rounded-2xl border border-pink-100">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <ScanLine size={16} className="text-[#E91E8C]" />
                      <span>
                        {scannerContext === 'STOCK_IN' ? 'Stock Receiving Barcode Scanner' : 'Desktop Barcode Scanner & Camera View'}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      {scannerContext === 'STOCK_IN' 
                        ? 'Scan products to quickly add quantities to the stock-in receiving queue.'
                        : 'Use connected webcam or wireless mobile phone to scan products directly into cart.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab(scannerContext === 'STOCK_IN' ? 'stock_in' : 'sale')}
                    className="bg-[#E91E8C] text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#FF4B91] transition cursor-pointer shadow-xs"
                  >
                    {scannerContext === 'STOCK_IN' ? `View Stock Queue (${stockInQueue.length})` : `View Cart (${totalCartCount})`}
                  </button>
                </div>

                <PosScan
                  sessionId={sessionId}
                  onBack={() => setActiveTab(scannerContext === 'STOCK_IN' ? 'stock_in' : 'sale')}
                  currentUser={{
                    uid: user?.uid || 'staff-pos',
                    email: operatorEmail,
                    role: 'admin',
                    name: operatorName
                  }}
                  onLoginStaff={() => {}}
                  context={scannerContext}
                  onAddToCart={handleAddToCart}
                  onAddToStockIn={handleAddToStockIn}
                  stockInQueue={stockInQueue}
                />
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-8 items-start">
                {/* Left Column: Product Search & Catalog */}
                <div className="col-span-5 space-y-6">
                  <PosProductSearch
                    products={products}
                    onAddToCart={handleAddToCart}
                    onAddToStockIn={handleAddToStockIn}
                    onOpenScanner={() => {
                      setScannerContext('SALE');
                      setActiveTab('scan');
                    }}
                    mode={scannerContext === 'STOCK_IN' || activeTab === 'stock_in' ? 'stock_in' : 'sale'}
                    cartQuantities={cartQuantitiesMap}
                    stockInQuantities={stockInQuantitiesMap}
                  />
                </div>

                {/* Right Column: Live Synchronized Cart & Checkout */}
                <div className="col-span-7 space-y-6">
                  <PosCart
                    cartItems={cartItems}
                    pricingMode={pricingMode}
                    onPricingModeChange={setPricingMode}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
                    onSetQuantity={handleSetQuantity}
                    onRemove={handleRemove}
                    onClearCart={handleClearCart}
                    onOpenScanner={() => {
                      setScannerContext('SALE');
                      setActiveTab('scan');
                    }}
                    editingQty={editingQty}
                    setEditingQty={setEditingQty}
                    customerName={customerName}
                    setCustomerName={setCustomerName}
                    customerPhone={customerPhone}
                    setCustomerPhone={setCustomerPhone}
                    customerAddress={customerAddress}
                    setCustomerAddress={setCustomerAddress}
                    deliveryArea={deliveryArea}
                    setDeliveryArea={setDeliveryArea}
                    onCheckout={handleCheckout}
                    isSubmitting={isSubmitting}
                  />
                </div>
              </div>
            )}
          </div>

          {/* MOBILE / TABLET VIEW (Responsive Tab Switching) */}
          <div className="block lg:hidden">
            {activeTab === 'sale' && (
              <PosCart
                cartItems={cartItems}
                pricingMode={pricingMode}
                onPricingModeChange={setPricingMode}
                onIncrement={handleIncrement}
                onDecrement={handleDecrement}
                onSetQuantity={handleSetQuantity}
                onRemove={handleRemove}
                onClearCart={handleClearCart}
                onOpenScanner={() => {
                  setScannerContext('SALE');
                  setActiveTab('scan');
                }}
                editingQty={editingQty}
                setEditingQty={setEditingQty}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerPhone={customerPhone}
                setCustomerPhone={setCustomerPhone}
                customerAddress={customerAddress}
                setCustomerAddress={setCustomerAddress}
                deliveryArea={deliveryArea}
                setDeliveryArea={setDeliveryArea}
                onCheckout={handleCheckout}
                isSubmitting={isSubmitting}
              />
            )}

            {activeTab === 'scan' && (
              <PosScan
                sessionId={sessionId}
                onBack={() => setActiveTab(scannerContext === 'STOCK_IN' ? 'stock_in' : 'sale')}
                currentUser={{
                  uid: user?.uid || 'staff-pos',
                  email: operatorEmail,
                  role: 'admin',
                  name: operatorName
                }}
                onLoginStaff={() => {}}
                context={scannerContext}
                onAddToCart={handleAddToCart}
                onAddToStockIn={handleAddToStockIn}
                stockInQueue={stockInQueue}
              />
            )}

            {activeTab === 'search' && (
              <PosProductSearch
                products={products}
                onAddToCart={(p) => {
                  handleAddToCart(p);
                  setActiveTab('sale');
                }}
                onAddToStockIn={(p) => {
                  handleAddToStockIn(p);
                  setActiveTab('stock_in');
                }}
                mode={scannerContext === 'STOCK_IN' || activeTab === 'stock_in' ? 'stock_in' : 'sale'}
                cartQuantities={cartQuantitiesMap}
                stockInQuantities={stockInQuantitiesMap}
              />
            )}

            {activeTab === 'stock_in' && (
              <PosStockIn
                products={products}
                queue={stockInQueue}
                setQueue={setStockInQueue}
                onOpenScanner={() => {
                  setScannerContext('STOCK_IN');
                  setActiveTab('scan');
                }}
                onOpenSearch={() => setActiveTab('search')}
                staffName={operatorName}
              />
            )}

            {activeTab === 'history' && (
              <PosHistory
                orders={orders}
                userRole={userRole}
                initialSelectedLiveSessionId={targetLiveSessionId}
                onClearSelectedLiveSession={() => {
                  setTargetLiveSessionId(null);
                  if (searchParams.has('session')) {
                    const next = new URLSearchParams(searchParams);
                    next.delete('session');
                    setSearchParams(next, { replace: true });
                  }
                }}
              />
            )}
          </div>
        </>
      )}

      {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
      <PosMobileNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        cartCount={totalCartCount}
        stockInCount={stockInQueue.length}
        liveCount={isAdminOrSuperAdmin ? liveSessionsCount : 0}
      />
    </div>
  );
}

