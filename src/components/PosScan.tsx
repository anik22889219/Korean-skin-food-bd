import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, doc, onSnapshot, query, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { productService } from '../services/productService';
import { addProductToSession, posService, isAllowedPosRole, detectDeviceType } from '../services/posService';
import { Product, UserProfile, PosSession } from '../types';
import { getRetailPrice } from '../utils/pricing';
import { StockInQueueItem, ScannerContext } from './pos/types';
import { 
  findProductByScannedCode, 
  scanBarcodeFromImageFile, 
  scanBarcodeFromLiveVideoSnapshot, 
  applyCameraTrackConstraints, 
  startUnifiedCameraScanner,
  ScannerController,
  BarcodeDebugInfo 
} from '../utils/barcode';
import { 
  Camera, 
  Smartphone, 
  ShieldAlert, 
  CheckCircle, 
  ArrowLeft, 
  UserCheck, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  AlertCircle, 
  RefreshCw, 
  ShoppingBag, 
  Volume2, 
  VolumeX, 
  Bug, 
  Loader2, 
  PackagePlus, 
  Package 
} from 'lucide-react';

export { type ScannerContext };

interface PosScanProps {
  sessionId?: string;
  onBack: () => void;
  currentUser: UserProfile | null;
  onLoginStaff?: (email: string, role: any) => void;
  context?: ScannerContext;
  onAddToStockIn?: (product: Product) => void;
  stockInQueue?: StockInQueueItem[];
  onRemoveFromStockIn?: (productId: string) => void;
  onUpdateStockInQty?: (productId: string, quantity: number) => void;
  onAddToCart?: (product: Product) => void;
}

// Resilient Web Audio API synthesizer for retail barcode scanning chime
let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!globalAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        globalAudioCtx = new AudioContextClass();
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch (e) {
    return null;
  }
}

/**
 * Play a high-precision dual-tone retail scanner chime upon successful barcode read
 */
export function playSuccessBeep(volume: number = 0.25) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1400, now);
    osc1.frequency.exponentialRampToValueAtTime(2350, now + 0.07);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2800, now);
    osc2.frequency.exponentialRampToValueAtTime(3520, now + 0.07);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.18);
    osc2.stop(now + 0.18);
  } catch (e) {}
}

/**
 * Play a short low-pitch alert tone when barcode is unrecognized or invalid
 */
export function playErrorBeep(volume: number = 0.2) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.setValueAtTime(220, now + 0.08);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  } catch (e) {}
}

export default function PosScan({ 
  sessionId: propSessionId, 
  onBack, 
  currentUser, 
  onLoginStaff,
  context = 'SALE',
  onAddToStockIn,
  stockInQueue = [],
  onRemoveFromStockIn,
  onUpdateStockInQty,
  onAddToCart
}: PosScanProps) {
  // Check if current user is authorized staff (Only admin, super_admin, inventory_manager)
  const isUserStaff = Boolean(currentUser && isAllowedPosRole(currentUser.role));

  // Active user-based session state
  const [activeSession, setActiveSession] = useState<PosSession | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string>(propSessionId || '');
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(context === 'SALE');
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Scanner & Cart states
  const [scannedItemsCount, setScannedItemsCount] = useState(0);
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  const [scanStatusMsg, setScanStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sound & debug
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pos_scan_sound_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [showDebugMode, setShowDebugMode] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<BarcodeDebugInfo | null>(null);

  // Camera & tab states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [isPhotoScanning, setIsPhotoScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useFrontCamera, setUseFrontCamera] = useState<boolean>(false);
  const [posCameraZoom, setPosCameraZoom] = useState<number>(1.5);
  const [manualCode, setManualCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'cart'>('camera');

  // Hidden barcode input state & ref for physical USB/Bluetooth/keyboard-wedge barcode scanners (BARCODE + ENTER)
  const [hiddenBarcode, setHiddenBarcode] = useState<string>('');
  const hiddenBarcodeRef = useRef<HTMLInputElement>(null);

  // Keep hidden input focused for physical barcode scanners
  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (hiddenBarcodeRef.current && document.activeElement !== hiddenBarcodeRef.current) {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          hiddenBarcodeRef.current.focus();
        }
      }
    }, 400);
    return () => clearInterval(focusInterval);
  }, []);

  const handleHiddenBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = hiddenBarcode.trim();
    if (!code) return;
    setHiddenBarcode('');
    await handleScanSuccess(code);
  };
  
  // Live cart
  const [scansList, setScansList] = useState<any[]>([]);
  const [editingQtyMobile, setEditingQtyMobile] = useState<{ [productId: string]: string }>({});

  // Staff login simulation (for quick testing)
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<'admin' | 'super_admin' | 'inventory_manager'>('admin');

  // Scanner Controller Ref
  const lastScanRef = useRef<{ productId: string; time: number } | null>(null);
  const scannerControllerRef = useRef<ScannerController | null>(null);

  // Sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('pos_scan_sound_enabled', String(next));
    } catch {}
    if (next) playSuccessBeep(0.22);
  };

  const handleTestSound = () => {
    playSuccessBeep(0.28);
    if (navigator.vibrate) navigator.vibrate(80);
  };

  // Warm up audio context on interaction
  useEffect(() => {
    const unlockAudio = () => getAudioContext();
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // ================= 1. AUTOMATIC USER POS SESSION START / RESTORE =================
  useEffect(() => {
    let isMounted = true;

    const initUserSession = async () => {
      if (!isUserStaff || !currentUser?.uid) {
        setIsLoadingSession(false);
        return;
      }

      if (context === 'STOCK_IN' && !propSessionId) {
        setIsLoadingSession(false);
        return;
      }

      setIsLoadingSession(true);
      setSessionError(null);

      try {
        // Call the user-based session architecture:
        // Automatically restores existing active session or creates a new one
        const session = await posService.getOrCreateUserPosSession({
          userId: currentUser.uid,
          userName: currentUser.name || 'Store Staff',
          userRole: currentUser.role,
          operatorEmail: currentUser.email
        });

        if (isMounted) {
          setActiveSession(session);
          setActiveSessionId(session.id || session.sessionId || '');
          setIsLoadingSession(false);
        }
      } catch (err: any) {
        console.error('[PosScan] Error starting/restoring user POS session:', err);
        if (isMounted) {
          if (context === 'STOCK_IN') {
            setIsLoadingSession(false);
          } else {
            setSessionError(err?.message || 'Failed to initialize mobile POS session.');
            setIsLoadingSession(false);
          }
        }
      }
    };

    initUserSession();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, currentUser?.role, currentUser?.name, currentUser?.email, isUserStaff, propSessionId, context]);

  // ================= 2. ACTIVE SESSION HEARTBEAT & REAL-TIME SYNC =================
  useEffect(() => {
    if (!activeSessionId) return;

    // Send immediate heartbeat on session connect
    const nowIso = new Date().toISOString();
    const sessionRef = doc(db, 'pos_sessions', activeSessionId);
    updateDoc(sessionRef, {
      lastSeenAt: nowIso,
      updated_at: nowIso
    }).catch(() => {});

    // Periodic heartbeat every 15 seconds to keep session alive in Firestore
    const heartbeatTimer = setInterval(() => {
      const timeIso = new Date().toISOString();
      updateDoc(sessionRef, {
        lastSeenAt: timeIso,
        updated_at: timeIso
      }).catch(() => {});
    }, 15000);

    // Real-time listener on active session document
    const unsub = onSnapshot(sessionRef, (snap) => {
      if (!snap.exists()) {
        if (context === 'SALE') {
          setSessionError('POS session was closed or removed.');
        }
        return;
      }
      const data = snap.data() as PosSession;
      if (data.status === 'completed' || data.status === 'closed') {
        if (context === 'SALE') {
          setActiveSession(null);
          setSessionError('This POS session has been completed and closed.');
        }
        return;
      }

      setActiveSession({
        ...data,
        id: snap.id,
        sessionId: data.sessionId || snap.id,
        items: Array.isArray(data?.items) ? data.items : []
      });
    }, (err) => {
      console.warn('[PosScan] Session sync error:', err);
    });

    return () => {
      clearInterval(heartbeatTimer);
      unsub();
    };
  }, [activeSessionId, context]);

  // ================= 3. SCANS REAL-TIME LISTENER (CART ITEMS) =================
  useEffect(() => {
    if (!activeSessionId || context === 'STOCK_IN') {
      setScansList([]);
      setScannedItemsCount(0);
      return;
    }
    const q = query(collection(db, 'pos_sessions', activeSessionId, 'scans'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setScansList(list);
      setScannedItemsCount(snapshot.size);
    }, (err) => {
      console.warn('[PosScan] Error listening to scans:', err);
    });
    return () => unsubscribe();
  }, [activeSessionId, context]);

  // ================= 4. CAMERA SCANNER ENGINE =================
  useEffect(() => {
    if (!isCameraActive) {
      if (scannerControllerRef.current) {
        scannerControllerRef.current.stop();
        scannerControllerRef.current = null;
      }
      return;
    }

    let active = true;

    const startScanner = async () => {
      setCameraError(null);
      if (scannerControllerRef.current) {
        await scannerControllerRef.current.stop();
        scannerControllerRef.current = null;
      }

      // Wait until #reader-container is mounted in the DOM
      let attempts = 0;
      while (active && !document.getElementById("reader-container") && attempts < 15) {
        await new Promise(r => setTimeout(r, 50));
        attempts++;
      }

      if (!active) return;

      const containerCheck = document.getElementById("reader-container");
      if (!containerCheck) {
        if (active) {
          setCameraError("Camera view container not found.");
          setIsCameraActive(false);
        }
        return;
      }

      try {
        const controller = await startUnifiedCameraScanner({
          containerId: "reader-container",
          useFrontCamera,
          onScanSuccess: (rawCode) => {
            if (active) handleScanSuccess(rawCode);
          },
          onError: (errMsg) => {
            if (active) {
              setCameraError(errMsg);
              setIsCameraActive(false);
            }
          },
          debounceMs: 1200
        });

        if (active) {
          scannerControllerRef.current = controller;
        } else {
          controller.stop();
        }
      } catch (err: any) {
        console.error("Camera startup error:", err);
        if (active) {
          setCameraError(err.message || "Camera access blocked or unavailable.");
          setIsCameraActive(false);
        }
      }
    };

    startScanner();

    return () => {
      active = false;
      if (scannerControllerRef.current) {
        scannerControllerRef.current.stop();
        scannerControllerRef.current = null;
      }
    };
  }, [isCameraActive, useFrontCamera]);

  const stopScanner = () => {
    if (scannerControllerRef.current) {
      scannerControllerRef.current.stop();
      scannerControllerRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleLiveLensSnapPos = async () => {
    setIsPhotoScanning(true);
    setScanStatusMsg({ type: 'success', text: '🔍 Analyzing live camera frame...' });

    try {
      const scannedText = await scanBarcodeFromLiveVideoSnapshot("reader-container");
      if (scannedText) {
        await handleScanSuccess(scannedText);
      } else {
        setScanStatusMsg({
          type: 'error',
          text: 'Could not read barcode from instant frame. Hold camera ~15cm away and tap Lens Scan again.'
        });
      }
    } catch (err) {
      console.error("POS Live Lens snap error:", err);
      setScanStatusMsg({ type: 'error', text: 'Error performing live snapshot scan.' });
    } finally {
      setIsPhotoScanning(false);
    }
  };

  const handlePosZoomChange = async (newZoom: number) => {
    setPosCameraZoom(newZoom);
    if (isCameraActive) {
      await applyCameraTrackConstraints("reader-container", { zoom: newZoom, triggerFocus: true });
    }
  };

  const handleGoogleLensPhotoScanPos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsPhotoScanning(true);
    setScanStatusMsg({ type: 'success', text: '🔍 Analyzing photo barcode...' });

    try {
      const scannedText = await scanBarcodeFromImageFile(file);
      if (scannedText) {
        await handleScanSuccess(scannedText);
      } else {
        setScanStatusMsg({
          type: 'error',
          text: 'Could not read barcode from photo. Ensure lighting is clear and retry.'
        });
      }
    } catch (err) {
      console.error("POS Photo scan error:", err);
      setScanStatusMsg({ type: 'error', text: 'Error analyzing photo barcode.' });
    } finally {
      setIsPhotoScanning(false);
      e.target.value = '';
    }
  };

  // ================= 5. BARCODE SUCCESS PROCESSING =================
  const handleScanSuccess = async (rawText: string) => {
    if (!rawText) return;

    getAudioContext();

    const allProducts = productService.getProducts();
    const { product, debugInfo: scanDebug } = findProductByScannedCode(allProducts, rawText);
    setDebugInfo(scanDebug);

    if (!product) {
      // Unknown barcode: show error, keep scanner open, do NOT add product, do NOT play success sound
      if (soundEnabled) playErrorBeep();
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
      setScanStatusMsg({
        type: 'error',
        text: `Unrecognized code "${scanDebug.normalizedValue || scanDebug.rawValue}"`
      });
      return;
    }

    const productId = product.id;

    // Avoid double scans within 1.2 seconds / prevent duplicate Enter/rapid scan submissions
    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.productId === productId && (now - lastScanRef.current.time) < 1200) {
      return;
    }
    lastScanRef.current = { productId, time: now };

    if (soundEnabled) playSuccessBeep();
    if (navigator.vibrate) navigator.vibrate(90);

    if (context === 'STOCK_IN') {
      // CONTEXT-AWARE: STOCK RECEIVING FLOW
      if (onAddToStockIn) {
        onAddToStockIn(product);
      }
    } else {
      // CONTEXT-AWARE: SALE REGISTER FLOW
      if (activeSessionId) {
        const result = await addProductToSession(activeSessionId, productId);
        if (!result.success) {
          if (soundEnabled) playErrorBeep();
          setScanStatusMsg({
            type: 'error',
            text: result.message || `Failed to add product.`
          });
          return;
        }
      } else if (onAddToCart) {
        onAddToCart(product);
      }
    }

    // Successful scan: stop camera/media tracks, close scanner, return to originating POS section/card
    stopScanner();
    onBack();
  };

  // Products list for manual search
  const [productsList, setProductsList] = useState<Product[]>(() => productService.getProducts());
  useEffect(() => {
    return productService.subscribe((prods) => {
      setProductsList(prods);
    });
  }, []);

  const filteredManualProducts = useMemo(() => {
    const q = manualCode.trim().toLowerCase();
    if (!q) return [];
    return productsList.filter(p => {
      const nameMatch = p.name?.toLowerCase().includes(q);
      const brandMatch = p.brand?.toLowerCase().includes(q);
      const barcodeMatch = p.barcode?.toLowerCase().includes(q);
      const idMatch = p.id?.toLowerCase().includes(q);
      const catMatch = p.category?.toLowerCase().includes(q);
      return nameMatch || brandMatch || barcodeMatch || idMatch || catMatch;
    }).slice(0, 15);
  }, [productsList, manualCode]);

  const handleSelectManualProduct = async (product: Product) => {
    if (!product) return;
    getAudioContext();
    const productId = product.id;

    if (soundEnabled) playSuccessBeep();
    if (navigator.vibrate) navigator.vibrate(90);

    setLastScannedProduct(product);

    if (context === 'STOCK_IN') {
      if (onAddToStockIn) {
        onAddToStockIn(product);
      }
    } else {
      if (activeSessionId) {
        const result = await addProductToSession(activeSessionId, productId);
        if (!result.success) {
          if (soundEnabled) playErrorBeep();
          setScanStatusMsg({
            type: 'error',
            text: result.message || `Failed to add product.`
          });
          return;
        }
      } else if (onAddToCart) {
        onAddToCart(product);
      }
    }

    setScanStatusMsg({
      type: 'success',
      text: `Added "${product.name}" to cart!`
    });

    setManualCode('');
    stopScanner();
    onBack();
  };

  // Manual code submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = manualCode.trim();
    if (!q) return;

    const { product } = findProductByScannedCode(productsList, q);
    if (product) {
      await handleSelectManualProduct(product);
      return;
    }

    const matches = productsList.filter(p => 
      p.name?.toLowerCase().includes(q.toLowerCase()) || 
      p.brand?.toLowerCase().includes(q.toLowerCase())
    );

    if (matches.length === 1) {
      await handleSelectManualProduct(matches[0]);
    } else if (matches.length > 1) {
      setScanStatusMsg({
        type: 'error',
        text: `Multiple products matched "${q}". Please select from the list below.`
      });
    } else {
      await handleScanSuccess(q);
    }
  };

  const handleStaffLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      alert("Please enter work email.");
      return;
    }
    if (onLoginStaff) {
      onLoginStaff(emailInput.trim(), roleInput);
    }
  };

  // Grouped cart items
  const mobileCartItems = useMemo(() => {
    const counts: { [pId: string]: { count: number; docIds: string[] } } = {};
    scansList.forEach((s) => {
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
        product: prod || ({
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
  }, [scansList]);

  const handleIncrementMobile = async (productId: string) => {
    if (!activeSessionId) return;
    const res = await addProductToSession(activeSessionId, productId);
    if (!res.success) alert(res.message);
  };

  const handleDecrementMobile = async (docIds: string[]) => {
    if (!activeSessionId || docIds.length === 0) return;
    try {
      const lastDocId = docIds[docIds.length - 1];
      await deleteDoc(doc(db, 'pos_sessions', activeSessionId, 'scans', lastDocId));
    } catch (err) {
      console.error('Error decrementing scan:', err);
    }
  };

  const handleSetQuantityMobile = async (productId: string, docIds: string[], maxStock: number, rawValue: string) => {
    if (!activeSessionId) return;
    setEditingQtyMobile(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });

    const parsed = parseInt(rawValue.trim(), 10);
    if (isNaN(parsed) || parsed < 0) return;

    if (parsed === 0) {
      await handleRemoveMobile(docIds);
      return;
    }

    let targetQty = parsed;
    if (targetQty > maxStock) {
      alert(`Available stock is ${maxStock}. Setting quantity to ${maxStock}.`);
      targetQty = maxStock;
    }

    const currentQty = docIds.length;
    if (targetQty === currentQty) return;

    try {
      const batch = writeBatch(db);
      if (targetQty > currentQty) {
        const diff = targetQty - currentQty;
        const scansColRef = collection(db, 'pos_sessions', activeSessionId, 'scans');
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
          batch.delete(doc(db, 'pos_sessions', activeSessionId, 'scans', dId));
        }
      }
      await batch.commit();
    } catch (err) {
      console.error('Error setting quantity in mobile scanner:', err);
    }
  };

  const handleRemoveMobile = async (docIds: string[]) => {
    if (!activeSessionId || docIds.length === 0) return;
    try {
      for (const id of docIds) {
        await deleteDoc(doc(db, 'pos_sessions', activeSessionId, 'scans', id));
      }
    } catch (err) {
      console.error('Error removing scans:', err);
    }
  };

  // Effective count based on context
  const totalStockInItemsCount = useMemo(() => {
    return stockInQueue.reduce((acc, item) => acc + (item.quantity || 0), 0);
  }, [stockInQueue]);

  const effectiveItemCount = context === 'STOCK_IN' ? totalStockInItemsCount : scannedItemsCount;

  // ================= RENDER A: AUTHENTICATION / ACCESS RESTRICTION =================
  if (!isUserStaff) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-3xl border border-pink-100 shadow-xl space-y-6 text-xs text-center my-6">
        <div className="w-14 h-14 bg-red-50 border border-red-200 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert size={28} />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-extrabold text-gray-900">Staff Authentication Required</h3>
          <p className="text-gray-500 leading-relaxed font-medium">
            This live smartphone POS module is restricted exclusively to authorized checkout staff members (admin, super_admin, inventory_manager).
          </p>
        </div>

        {currentUser && (
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left text-slate-700 text-[11px] space-y-1">
            <p><span className="font-semibold text-gray-900">Logged-in User:</span> {currentUser.name || currentUser.email}</p>
            <p><span className="font-semibold text-gray-900">Assigned Role:</span> <span className="font-mono font-bold text-rose-600 uppercase">{currentUser.role || 'customer'}</span></p>
          </div>
        )}

        <form onSubmit={handleStaffLoginSubmit} className="text-left bg-pink-50/20 p-5 rounded-2xl border border-pink-100/50 space-y-4">
          <span className="text-[10px] uppercase font-bold text-pink-700 tracking-wider block">Staff Quick Login</span>
          <div>
            <label className="block text-gray-500 font-semibold mb-1">Work Email</label>
            <input 
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="staff@koreanskinfood.com"
              className="w-full bg-white text-gray-800 px-3 py-2 rounded-lg border border-pink-100 outline-none focus:border-[#E91E8C]"
            />
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Assigned Role</label>
            <select
              value={roleInput}
              onChange={(e: any) => setRoleInput(e.target.value)}
              className="w-full bg-white text-gray-800 px-3 py-2 rounded-lg border border-pink-100 outline-none focus:border-[#E91E8C]"
            >
              <option value="admin">Administrator</option>
              <option value="super_admin">Super Administrator</option>
              <option value="inventory_manager">Inventory Manager</option>
            </select>
          </div>

          <button 
            type="submit"
            className="w-full bg-[#E91E8C] hover:bg-[#FF4B91] text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <UserCheck size={14} />
            <span>Verify & Authenticate</span>
          </button>
        </form>

        <button 
          type="button"
          onClick={onBack}
          className="text-[#E91E8C] hover:text-[#FF4B91] font-bold text-xs flex items-center justify-center gap-1 mx-auto cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Return to Store</span>
        </button>
      </div>
    );
  }

  // ================= RENDER B: LOADING SESSION STATE =================
  if (isLoadingSession) {
    return (
      <div className="max-w-md mx-auto min-h-[60vh] flex flex-col items-center justify-center space-y-4 p-6 text-center">
        <div className="w-14 h-14 bg-pink-50 border border-pink-200 text-[#E91E8C] rounded-full flex items-center justify-center animate-bounce shadow-md shadow-pink-100">
          <Loader2 className="animate-spin" size={26} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-gray-900">Starting POS Live Session</h3>
          <p className="text-xs text-pink-600 font-medium font-mono animate-pulse">
            Connecting session for {currentUser?.name || 'Staff'} ({currentUser?.role})...
          </p>
        </div>
      </div>
    );
  }

  // ================= RENDER C: SESSION INITIALIZATION ERROR =================
  if (sessionError) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-rose-200 p-6 rounded-3xl shadow-sm text-center space-y-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={28} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-gray-900">Session Error</h3>
          <p className="text-xs text-gray-600 leading-relaxed">{sessionError}</p>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 py-2.5 bg-[#E91E8C] text-white rounded-xl font-bold text-xs hover:bg-[#FF4B91] transition cursor-pointer"
          >
            Retry Connection
          </button>
          <button
            type="button"
            onClick={onBack}
            className="py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition cursor-pointer"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Format operator display role
  const formattedRole = (activeSession?.userRole || currentUser?.role || '')
    .replace('_', ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  // ================= RENDER D: AUTOMATIC LIVE MOBILE POS WORKSTATION =================
  return (
    <div className="max-w-md mx-auto bg-[#FFF5F8] min-h-screen flex flex-col justify-between pb-8">
      {/* Hidden focusable input for USB/Bluetooth/keyboard-wedge physical barcode scanners */}
      <form onSubmit={handleHiddenBarcodeSubmit} className="sr-only opacity-0 absolute w-0 h-0 overflow-hidden pointer-events-none">
        <input
          ref={hiddenBarcodeRef}
          type="text"
          value={hiddenBarcode}
          onChange={(e) => setHiddenBarcode(e.target.value)}
          placeholder="Hidden Barcode Scanner Input"
          tabIndex={-1}
          aria-label="Hidden Barcode Scanner Input"
        />
      </form>

      {/* 🟢 POS LIVE WORKSTATION HEADER */}
      <header className="bg-white px-4 py-3 border-b border-pink-100 shadow-xs sticky top-0 z-20 space-y-2">
        <div className="flex items-center justify-between">
          <button 
            type="button"
            onClick={() => {
              stopScanner();
              onBack();
            }}
            className="p-1.5 hover:bg-pink-50 text-gray-500 rounded-xl cursor-pointer"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>POS LIVE</span>
              </span>
            </div>
            <div className="flex items-center justify-center gap-1 text-[11px] text-gray-600 mt-0.5">
              <span className="font-bold text-gray-900 truncate max-w-[120px]">
                {activeSession?.userName || currentUser?.name || 'Staff'}
              </span>
              <span>&bull;</span>
              <span className="text-[#E91E8C] font-semibold text-[10px]">
                {formattedRole}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 shadow-2xs ${
                soundEnabled 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                  : 'bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200'
              }`}
              title={soundEnabled ? 'Audio Feedback ON' : 'Audio Feedback MUTED'}
            >
              {soundEnabled ? <Volume2 size={13} className="text-emerald-600" /> : <VolumeX size={13} />}
            </button>

            {/* Cart Count Button */}
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'cart' ? 'camera' : 'cart')}
              className="flex items-center gap-1.5 bg-pink-50 border border-pink-100 text-[#E91E8C] text-[10px] font-bold px-2.5 py-1.5 rounded-xl font-mono shadow-inner cursor-pointer"
            >
              <ShoppingBag size={12} />
              <span>{scannedItemsCount}</span>
            </button>
          </div>
        </div>

        {/* User Session & Device Identifier Sub-bar */}
        <div className="flex items-center justify-between text-[10px] text-gray-500 bg-pink-50/50 px-3 py-1.5 rounded-xl border border-pink-100/60 font-mono">
          <span className="flex items-center gap-1 text-slate-700 font-bold">
            <Smartphone size={11} className="text-[#E91E8C]" />
            <span className="capitalize">{activeSession?.deviceType || 'Mobile'}</span>
          </span>
          <span className="text-gray-400 font-semibold truncate max-w-[180px]">
            Session: <strong className="text-gray-700 font-bold">{activeSessionId}</strong>
          </span>
        </div>
      </header>

      {/* MODE TABS (Camera Scan / Manual Entry / Live Cart) */}
      <nav className="bg-white border-b border-pink-100 px-4 py-2 flex items-center justify-around text-xs font-bold" aria-label="Scanner modes">
        <button
          type="button"
          onClick={() => {
            setActiveTab('camera');
            if (!isCameraActive) setIsCameraActive(true);
          }}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'camera'
              ? 'bg-[#E91E8C] text-white shadow-xs'
              : 'text-gray-500 hover:text-pink-600'
          }`}
        >
          <Camera size={14} />
          <span>Camera</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'manual'
              ? 'bg-[#E91E8C] text-white shadow-xs'
              : 'text-gray-500 hover:text-pink-600'
          }`}
        >
          <Search size={14} />
          <span>Manual Input</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cart')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'cart'
              ? 'bg-[#E91E8C] text-white shadow-xs'
              : 'text-gray-500 hover:text-pink-600'
          }`}
        >
          <ShoppingBag size={14} />
          <span>Cart ({scannedItemsCount})</span>
        </button>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-4">
        {/* STATUS NOTIFICATION BANNER */}
        {scanStatusMsg && (
          <div className={`w-full max-w-sm p-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md animate-scaleIn ${
            scanStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {scanStatusMsg.type === 'success' ? <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" /> : <AlertCircle size={16} className="text-red-600 flex-shrink-0" />}
            <span className="truncate">{scanStatusMsg.text}</span>
          </div>
        )}

        {/* TAB 1: CAMERA SCANNER */}
        {activeTab === 'camera' && (
          <div className="w-full max-w-sm flex flex-col items-center space-y-4">
            {isCameraActive ? (
              <div className="w-full aspect-square max-w-[300px] bg-black rounded-3xl overflow-hidden relative border-4 border-[#E91E8C] shadow-2xl">
                <div id="reader-container" className="w-full h-full"></div>
                
                {/* Laser animation */}
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse z-10 pointer-events-none"></div>

                <div className="absolute top-2 inset-x-0 text-center z-10">
                  <span className="bg-black/60 text-white text-[9px] font-bold px-3 py-1 rounded-full backdrop-blur-xs">
                    Align Barcode or QR in Box
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-square max-w-[300px] bg-white rounded-3xl border border-pink-100 shadow-inner flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-pink-50 text-[#E91E8C] rounded-full flex items-center justify-center shadow-inner">
                  <Camera size={32} />
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Camera Scanner Ready</h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed max-w-[220px] mx-auto">
                    Point camera at retail product barcodes to instantly add items into your session cart.
                  </p>
                </div>

                {cameraError && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] p-2.5 rounded-xl font-medium leading-relaxed text-left">
                    {cameraError}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraActive(true)}
                    className="bg-[#E91E8C] hover:bg-[#FF4B91] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition shadow-md shadow-pink-100 flex items-center gap-1.5"
                  >
                    <Camera size={14} />
                    <span>START CAMERA SCANNER</span>
                  </button>

                  <label className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition shadow-md flex items-center gap-1.5">
                    <Search size={14} />
                    <span>{isPhotoScanning ? "Analyzing..." : "Lens Photo"}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={handleGoogleLensPhotoScanPos}
                      className="hidden"
                      disabled={isPhotoScanning}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Live Camera Controls */}
            {isCameraActive && (
              <div className="flex flex-col items-center gap-2.5 w-full max-w-xs mx-auto mt-2">
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-xl border border-gray-200 text-[10px]">
                    <span className="text-gray-500 font-bold">Zoom:</span>
                    {[1.0, 1.5, 2.0, 2.5].map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => handlePosZoomChange(z)}
                        className={`px-1.5 py-0.5 rounded-lg text-[9px] font-extrabold cursor-pointer transition ${
                          posCameraZoom === z 
                            ? "bg-[#E91E8C] text-white" 
                            : "bg-white text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {z}x
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => applyCameraTrackConstraints("reader-container", { zoom: posCameraZoom, triggerFocus: true })}
                    className="bg-white border border-amber-300 hover:bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer shadow-2xs flex items-center gap-1"
                    title="Force camera focus"
                  >
                    🎯 Refocus
                  </button>

                  <button
                    type="button"
                    onClick={() => setUseFrontCamera(!useFrontCamera)}
                    className="bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 text-[10px] font-bold px-3 py-1 rounded-xl transition cursor-pointer shadow-2xs flex items-center gap-1"
                  >
                    <RefreshCw size={12} />
                    <span>Cam ({useFrontCamera ? "Front" : "Rear"})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stopScanner();
                      setIsCameraActive(false);
                    }}
                    className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-[10px] font-bold px-3 py-1 rounded-xl transition cursor-pointer shadow-2xs"
                  >
                    Pause
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleLiveLensSnapPos}
                  disabled={isPhotoScanning}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 text-white font-extrabold text-xs py-2 px-3 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <Search size={14} className={isPhotoScanning ? "animate-spin" : ""} />
                  <span>{isPhotoScanning ? "Scanning Frame..." : "📸 Instant Lens HD Scan"}</span>
                </button>
              </div>
            )}

            {/* RECENTLY SCANNED ITEM BANNER */}
            {lastScannedProduct && (
              <div className="w-full bg-white p-3.5 rounded-2xl border-b-4 border-[#E91E8C] shadow-md flex items-center gap-3 animate-scaleIn">
                <img 
                  src={lastScannedProduct.image} 
                  alt={lastScannedProduct.name}
                  className="w-12 h-12 object-cover rounded-xl border border-pink-100 shadow-xs flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0 text-left text-[11px]">
                  <span className="text-[9px] uppercase font-extrabold text-[#E91E8C] block">Added to Session Cart</span>
                  <h4 className="font-bold text-gray-800 truncate">{lastScannedProduct.name}</h4>
                  <p className="text-gray-500 font-mono mt-0.5">Price: <strong>৳{getRetailPrice(lastScannedProduct)}</strong></p>
                </div>
              </div>
            )}

            {/* BARCODE DEBUG MODE PANEL */}
            <div className="w-full bg-slate-900 text-slate-100 p-3 rounded-2xl border border-slate-700 shadow-lg text-[10px] space-y-2 text-left font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Bug size={12} />
                  <span>Barcode Inspector</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestSound}
                    className="bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded text-[9px] font-bold border border-slate-700 transition cursor-pointer flex items-center gap-1"
                  >
                    <Volume2 size={10} />
                    <span>Beep</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDebugMode(!showDebugMode)}
                    className="text-slate-400 hover:text-white underline cursor-pointer text-[9px]"
                  >
                    {showDebugMode ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {showDebugMode && (
                <div className="space-y-1.5">
                  {debugInfo ? (
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 bg-slate-950 p-2 rounded-xl border border-slate-800 text-[9px]">
                      <div>
                        <span className="text-slate-500 block">Raw:</span>
                        <span className="text-pink-300 font-bold truncate block">{JSON.stringify(debugInfo.rawValue)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Norm:</span>
                        <span className="text-emerald-300 font-bold truncate block">{debugInfo.normalizedValue || '(empty)'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">Status: </span>
                        <span className={debugInfo.matchFound ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                          {debugInfo.matchFound ? `✅ MATCH: ${debugInfo.matchedProductName}` : "❌ NO MATCH"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-[9px]">
                      Scan barcode to inspect raw vs normalized values.
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: MANUAL BARCODE / PRODUCT ENTRY */}
        {activeTab === 'manual' && (
          <div className="w-full max-w-sm bg-white p-5 rounded-3xl border border-pink-100 shadow-sm space-y-4 text-xs">
            <div className="space-y-1 text-center">
              <h4 className="font-extrabold text-gray-900 uppercase tracking-wider text-xs">
                Search & Add Product By Name/Barcode
              </h4>
              <p className="text-[10px] text-gray-500">
                Type product name, brand, barcode, or ID to add to cart instantly.
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="relative">
                <Search size={15} className="text-pink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Type product name or barcode..."
                  className="w-full bg-pink-50/20 text-gray-800 text-xs pl-10 pr-3 py-3 rounded-2xl border border-pink-200 outline-none focus:border-[#E91E8C] focus:bg-white font-medium"
                  autoFocus
                />
              </div>

              {filteredManualProducts.length > 0 && (
                <div className="bg-pink-50/50 border border-pink-100 rounded-2xl p-2 space-y-1.5 max-h-56 overflow-y-auto">
                  <span className="text-[9px] font-bold text-gray-400 uppercase px-1">Matching Products ({filteredManualProducts.length}):</span>
                  {filteredManualProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectManualProduct(p)}
                      className="w-full bg-white hover:bg-pink-100/60 p-2 rounded-xl border border-pink-100 text-left flex items-center justify-between gap-2 transition cursor-pointer"
                    >
                      <img 
                        src={p.image} 
                        alt={p.name}
                        className="w-8 h-8 object-cover rounded-lg border border-pink-100 flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[8px] font-bold text-[#E91E8C] uppercase block truncate">{p.brand}</span>
                        <h5 className="font-bold text-gray-900 text-[11px] truncate">{p.name}</h5>
                        <span className="font-mono text-[9px] text-gray-400">৳{getRetailPrice(p)} &bull; Stock: {p.stock}</span>
                      </div>
                      <span className="bg-[#E91E8C] text-white text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 flex items-center gap-0.5">
                        <Plus size={10} /> Add
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full bg-[#E91E8C] hover:bg-[#FF4B91] disabled:opacity-50 text-white py-3 rounded-2xl font-bold transition cursor-pointer shadow-md shadow-pink-100 flex items-center justify-center gap-1.5"
              >
                <Plus size={15} />
                <span>Add Product By Code/Name</span>
              </button>
            </form>

            <div className="pt-3 border-t border-pink-50 space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Quick Popular Products:</span>
              <div className="flex flex-wrap gap-1.5">
                {productsList.slice(0, 6).map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleSelectManualProduct(prod)}
                    className="bg-pink-50 hover:bg-pink-100 border border-pink-100 text-[#E91E8C] text-[10px] font-bold px-2.5 py-1 rounded-xl cursor-pointer transition truncate max-w-[150px]"
                    title={prod.name}
                  >
                    {prod.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LIVE SESSION CART */}
        {activeTab === 'cart' && (
          <div className="w-full max-w-sm bg-white p-5 rounded-3xl border border-pink-100 shadow-sm space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-pink-50 pb-2">
              <h4 className="font-extrabold text-gray-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <ShoppingBag size={15} className="text-[#E91E8C]" />
                <span>Live Cart Items ({scannedItemsCount})</span>
              </h4>
            </div>

            {mobileCartItems.length === 0 ? (
              <div className="py-8 text-center text-gray-400 space-y-2">
                <p className="text-xs">No products scanned yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('camera')}
                  className="text-[#E91E8C] font-bold text-xs hover:underline cursor-pointer"
                >
                  Start Scanning
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {mobileCartItems.map((item) => (
                  <div key={item.product.id} className="p-3 bg-pink-50/30 rounded-2xl border border-pink-100 flex items-center justify-between gap-3">
                    <img 
                      src={item.product.image} 
                      alt={item.product.name} 
                      className="w-10 h-10 object-cover rounded-xl border border-pink-100 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-gray-800 text-[11px] truncate">{item.product.name}</h5>
                      <span className="text-[#E91E8C] font-black font-mono text-[10px]">৳{getRetailPrice(item.product)}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDecrementMobile(item.docIds)}
                        className="p-1 bg-white border border-pink-200 text-pink-700 rounded-lg hover:bg-pink-100 cursor-pointer"
                        title="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.product.stock}
                        value={editingQtyMobile[item.product.id] !== undefined ? editingQtyMobile[item.product.id] : item.quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingQtyMobile(prev => ({ ...prev, [item.product.id]: val }));
                        }}
                        onFocus={(e) => e.target.select()}
                        onBlur={(e) => handleSetQuantityMobile(item.product.id, item.docIds, item.product.stock, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-9 text-center font-bold font-mono text-xs text-gray-900 bg-white border border-pink-200 rounded-lg py-0.5 outline-none focus:border-[#E91E8C] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleIncrementMobile(item.product.id)}
                        className="p-1 bg-[#E91E8C] text-white rounded-lg hover:bg-[#FF4B91] cursor-pointer"
                        title="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMobile(item.docIds)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg ml-1 cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* FOOTER BADGE */}
      <footer className="px-6 text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 bg-white border border-pink-100 px-3 py-1 rounded-full shadow-xs">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] text-gray-600 font-semibold font-mono">
            {activeSessionId ? `Session: ${activeSessionId}` : 'POS Live Ready'}
          </span>
        </div>
      </footer>
    </div>
  );
}
