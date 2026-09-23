import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { collection, doc, onSnapshot, query, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { productService } from '../services/productService';
import { addProductToSession, posService, isAllowedPosRole } from '../services/posService';
import { Product, UserProfile, PosSession } from '../types';
import { getRetailPrice } from '../utils/pricing';
import { StockInQueueItem, ScannerContext } from './pos/types';
import { 
  lookupProductByBarcode, 
  buildBarcodeIndex,
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
  Loader2, 
  Eye,
  EyeOff,
  Sparkles,
  X
} from 'lucide-react';
import { PosProductQuickViewModal } from './pos/PosProductQuickViewModal';

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
  onAddToCart?: (product: Product, quantity?: number) => void;
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
  } catch {
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
  } catch {}
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
  } catch {}
}

export const PosScan = React.memo(function PosScan({ 
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
  // Check if current user is authorized staff
  const isUserStaff = Boolean(currentUser && isAllowedPosRole(currentUser.role));

  // Active user-based session state
  const [activeSession, setActiveSession] = useState<PosSession | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string>(propSessionId || '');
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(context === 'SALE');
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Optimistic cart state for instant (<2ms) UI feedback
  interface OptimisticCartItem {
    product: Product;
    quantity: number;
    docIds: string[];
  }
  const [optimisticCart, setOptimisticCart] = useState<OptimisticCartItem[]>([]);

  // Last scanned item & notification banner
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  const [scanStatusMsg, setScanStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Camera video ref and state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControllerRef = useRef<ScannerController | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useFrontCamera, setUseFrontCamera] = useState<boolean>(false);
  const [posCameraZoom, setPosCameraZoom] = useState<number>(1.0);

  // Manual search & drawer states
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [showCartDrawer, setShowCartDrawer] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [isPhotoScanning, setIsPhotoScanning] = useState<boolean>(false);

  // Sound & vibration
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pos_scan_sound_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Quick View Inspection Mode (default false = direct fast add)
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState<boolean>(false);
  const [quickViewEnabled, setQuickViewEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pos_scan_quickview_enabled');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  // Hidden barcode input for physical USB/Bluetooth/Keyboard-wedge scanners
  const [hiddenBarcode, setHiddenBarcode] = useState<string>('');
  const hiddenBarcodeRef = useRef<HTMLInputElement>(null);

  // Products list & O(1) Barcode Index
  const [productsList, setProductsList] = useState<Product[]>(() => productService.getProducts());
  useEffect(() => {
    return productService.subscribe((prods) => {
      setProductsList(prods);
    });
  }, []);

  const barcodeIndex = useMemo(() => {
    return buildBarcodeIndex(productsList);
  }, [productsList]);

  // Keep hidden input focused for physical hardware scanners
  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (hiddenBarcodeRef.current && document.activeElement !== hiddenBarcodeRef.current) {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          hiddenBarcodeRef.current.focus();
        }
      }
    }, 500);
    return () => clearInterval(focusInterval);
  }, []);

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

    const nowIso = new Date().toISOString();
    const sessionRef = doc(db, 'pos_sessions', activeSessionId);
    updateDoc(sessionRef, {
      lastSeenAt: nowIso,
      updated_at: nowIso
    }).catch(() => {});

    const heartbeatTimer = setInterval(() => {
      const timeIso = new Date().toISOString();
      updateDoc(sessionRef, {
        lastSeenAt: timeIso,
        updated_at: timeIso
      }).catch(() => {});
    }, 15000);

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
      return;
    }
    const q = query(collection(db, 'pos_sessions', activeSessionId, 'scans'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const counts: Record<string, { count: number; docIds: string[] }> = {};
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.product_id) {
          if (!counts[d.product_id]) counts[d.product_id] = { count: 0, docIds: [] };
          counts[d.product_id].count++;
          counts[d.product_id].docIds.push(docSnap.id);
        }
      });

      // Reconcile server snapshot with optimistic cart
      setOptimisticCart((prev) => {
        const productMap = new Map<string, OptimisticCartItem>();
        
        // Add existing items from optimistic
        prev.forEach(item => {
          productMap.set(item.product.id, { ...item });
        });

        // Reconcile with server counts
        Object.keys(counts).forEach(productId => {
          const prod = productService.getProductByBarcode(productId) || productService.getProductById(productId);
          if (!prod) return;

          const serverCount = counts[productId].count;
          const serverDocIds = counts[productId].docIds;

          const existing = productMap.get(productId);
          if (existing) {
            existing.quantity = Math.max(existing.quantity, serverCount);
            existing.docIds = serverDocIds;
          } else {
            productMap.set(productId, {
              product: prod,
              quantity: serverCount,
              docIds: serverDocIds
            });
          }
        });

        // If snapshot size is 0 and no optimistic addition pending, clear
        if (snapshot.size === 0 && prev.every(it => it.docIds.length > 0)) {
          return [];
        }

        return Array.from(productMap.values());
      });
    }, (err) => {
      console.warn('[PosScan] Error listening to scans:', err);
    });

    return () => unsubscribe();
  }, [activeSessionId, context]);

  // ================= 4. REAL-TIME FAST SCAN DISPATCHER =================
  const handleScanDetected = useCallback(async (rawText: string) => {
    if (!rawText) return;
    const tStart = performance.now();

    // 1. O(1) Map Lookup
    const { product, normalizedCode } = lookupProductByBarcode(barcodeIndex, rawText);
    const tLookup = performance.now();

    if (!product) {
      if (soundEnabled) playErrorBeep();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setScanStatusMsg({
        type: 'error',
        text: `Unrecognized code: "${normalizedCode || rawText}"`
      });
      return;
    }

    // Stock check for sale mode
    if (context === 'SALE' && product.stock <= 0) {
      if (soundEnabled) playErrorBeep();
      setScanStatusMsg({
        type: 'error',
        text: `"${product.name}" is out of stock!`
      });
      return;
    }

    // 2. Instant Feedback: Beep + Vibration immediately
    if (soundEnabled) playSuccessBeep(0.25);
    if (navigator.vibrate) navigator.vibrate(80);

    setLastScannedProduct(product);
    setScanStatusMsg({
      type: 'success',
      text: `Added "${product.name}"`
    });

    // If Quick-View is explicitly toggled by user, open inspection modal
    if (quickViewEnabled) {
      setQuickViewProduct(product);
      setIsQuickViewOpen(true);
      return;
    }

    // 3. OPTIMISTIC LOCAL CART UPDATE (< 2ms)
    if (context === 'STOCK_IN') {
      if (onAddToStockIn) {
        onAddToStockIn(product);
      }
    } else {
      let currentCartQty = 0;
      setOptimisticCart((prev) => {
        const existing = prev.find((it) => it.product.id === product.id);
        if (existing) {
          currentCartQty = existing.quantity;
          if (currentCartQty >= product.stock) {
            return prev;
          }
          return prev.map((it) =>
            it.product.id === product.id ? { ...it, quantity: it.quantity + 1 } : it
          );
        }
        return [{ product, quantity: 1, docIds: [] }, ...prev];
      });

      if (onAddToCart) {
        onAddToCart(product, 1);
      }

      const tUI = performance.now();

      // 4. Background Firestore Synchronization (Non-blocking)
      if (activeSessionId) {
        addProductToSession(activeSessionId, product.id, currentCartQty, 1)
          .then((res) => {
            const tSync = performance.now();
            console.log(
              `[POS Scan Timing]\n` +
              `Detection & Lookup: ${(tLookup - tStart).toFixed(1)} ms\n` +
              `UI Update: ${(tUI - tLookup).toFixed(1)} ms\n` +
              `Firestore Sync: ${(tSync - tUI).toFixed(1)} ms\n` +
              `Total: ${(tSync - tStart).toFixed(1)} ms`
            );

            if (!res.success) {
              // Rollback optimistic update on error
              setOptimisticCart((prev) => {
                const item = prev.find((it) => it.product.id === product.id);
                if (!item) return prev;
                if (item.quantity <= 1) {
                  return prev.filter((it) => it.product.id !== product.id);
                }
                return prev.map((it) =>
                  it.product.id === product.id ? { ...it, quantity: it.quantity - 1 } : it
                );
              });
              if (soundEnabled) playErrorBeep();
              setScanStatusMsg({
                type: 'error',
                text: res.message
              });
            }
          })
          .catch((err) => {
            console.error('[PosScan] Background session sync error:', err);
            // Rollback optimistic update
            setOptimisticCart((prev) => {
              const item = prev.find((it) => it.product.id === product.id);
              if (!item) return prev;
              if (item.quantity <= 1) {
                return prev.filter((it) => it.product.id !== product.id);
              }
              return prev.map((it) =>
                it.product.id === product.id ? { ...it, quantity: it.quantity - 1 } : it
              );
            });
            if (soundEnabled) playErrorBeep();
            setScanStatusMsg({
              type: 'error',
              text: 'Failed to sync scan with session.'
            });
          });
      }
    }
  }, [barcodeIndex, context, soundEnabled, quickViewEnabled, onAddToStockIn, onAddToCart, activeSessionId]);

  // Physical Barcode Scanner Submission (Enter key)
  const handleHiddenBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = hiddenBarcode.trim();
    if (!code) return;
    setHiddenBarcode('');
    await handleScanDetected(code);
  };

  // ================= 5. CAMERA CONTROLLER LIFECYCLE =================
  useEffect(() => {
    if (!isCameraActive) {
      if (scannerControllerRef.current) {
        scannerControllerRef.current.stop();
        scannerControllerRef.current = null;
      }
      return;
    }

    let active = true;

    const initScanner = async () => {
      setCameraError(null);
      if (scannerControllerRef.current) {
        await scannerControllerRef.current.stop();
        scannerControllerRef.current = null;
      }

      if (!videoRef.current || !active) return;

      try {
        const controller = await startUnifiedCameraScanner({
          videoElement: videoRef.current,
          useFrontCamera,
          onScanSuccess: (rawCode) => {
            if (active) handleScanDetected(rawCode);
          },
          onError: (errMsg) => {
            if (active) {
              setCameraError(errMsg);
              setIsCameraActive(false);
            }
          },
          debounceMs: 800
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

    // Small delay to ensure React ref has attached to video element
    const timer = setTimeout(initScanner, 60);

    return () => {
      active = false;
      clearTimeout(timer);
      if (scannerControllerRef.current) {
        scannerControllerRef.current.stop();
        scannerControllerRef.current = null;
      }
    };
  }, [isCameraActive, useFrontCamera, handleScanDetected]);

  const stopScanner = () => {
    if (scannerControllerRef.current) {
      scannerControllerRef.current.stop();
      scannerControllerRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Quick Zoom control
  const handleZoomChange = async (newZoom: number) => {
    setPosCameraZoom(newZoom);
    if (scannerControllerRef.current) {
      await scannerControllerRef.current.applyZoom(newZoom);
    }
  };

  // Live Lens Snapshot fallback
  const handleLiveLensSnap = async () => {
    if (!videoRef.current) return;
    setIsPhotoScanning(true);
    setScanStatusMsg({ type: 'success', text: '🔍 Analyzing instant frame...' });

    try {
      const scannedText = await scanBarcodeFromLiveVideoSnapshot(videoRef.current);
      if (scannedText) {
        await handleScanDetected(scannedText);
      } else {
        setScanStatusMsg({
          type: 'error',
          text: 'No barcode detected in frame. Hold camera ~15cm away.'
        });
      }
    } catch {
      setScanStatusMsg({ type: 'error', text: 'Error analyzing frame.' });
    } finally {
      setIsPhotoScanning(false);
    }
  };

  // Gallery photo barcode scan fallback
  const handlePhotoUploadScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsPhotoScanning(true);
    setScanStatusMsg({ type: 'success', text: '🔍 Analyzing photo barcode...' });

    try {
      const scannedText = await scanBarcodeFromImageFile(file);
      if (scannedText) {
        await handleScanDetected(scannedText);
      } else {
        setScanStatusMsg({
          type: 'error',
          text: 'Could not read barcode from image.'
        });
      }
    } catch {
      setScanStatusMsg({ type: 'error', text: 'Error analyzing photo.' });
    } finally {
      setIsPhotoScanning(false);
      e.target.value = '';
    }
  };

  // Manual search submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = manualCode.trim();
    if (!q) return;

    const { product } = lookupProductByBarcode(barcodeIndex, q);
    if (product) {
      await handleScanDetected(q);
      setManualCode('');
      setShowManualInput(false);
      return;
    }

    const matches = productsList.filter(p => 
      p.name?.toLowerCase().includes(q.toLowerCase()) || 
      p.brand?.toLowerCase().includes(q.toLowerCase())
    );

    if (matches.length === 1) {
      await handleScanDetected(matches[0].barcode || matches[0].id);
      setManualCode('');
      setShowManualInput(false);
    } else if (matches.length > 1) {
      setScanStatusMsg({
        type: 'error',
        text: `Multiple matches found (${matches.length}). Select one below.`
      });
    } else {
      await handleScanDetected(q);
      setManualCode('');
    }
  };

  // Total cart count
  const totalCount = useMemo(() => {
    if (context === 'STOCK_IN') {
      return stockInQueue.reduce((acc, it) => acc + (it.quantity || 0), 0);
    }
    return optimisticCart.reduce((acc, it) => acc + it.quantity, 0);
  }, [context, stockInQueue, optimisticCart]);

  // Cart quantity adjustment inside scanner drawer
  const handleIncrement = async (product: Product) => {
    if (context === 'STOCK_IN') {
      if (onAddToStockIn) onAddToStockIn(product);
      return;
    }
    await handleScanDetected(product.barcode || product.id);
  };

  const handleDecrement = async (item: OptimisticCartItem) => {
    if (context === 'STOCK_IN') {
      if (onUpdateStockInQty && item.quantity > 1) {
        onUpdateStockInQty(item.product.id, item.quantity - 1);
      } else if (onRemoveFromStockIn) {
        onRemoveFromStockIn(item.product.id);
      }
      return;
    }

    if (item.quantity <= 1) {
      handleRemoveItem(item);
      return;
    }

    // Optimistic decrement
    setOptimisticCart(prev =>
      prev.map(it => it.product.id === item.product.id ? { ...it, quantity: it.quantity - 1 } : it)
    );

    if (activeSessionId && item.docIds.length > 0) {
      const docIdToDelete = item.docIds[item.docIds.length - 1];
      deleteDoc(doc(db, 'pos_sessions', activeSessionId, 'scans', docIdToDelete)).catch(e => {
        console.error('Error deleting scan doc:', e);
      });
    }
  };

  const handleRemoveItem = async (item: OptimisticCartItem) => {
    if (context === 'STOCK_IN') {
      if (onRemoveFromStockIn) onRemoveFromStockIn(item.product.id);
      return;
    }

    setOptimisticCart(prev => prev.filter(it => it.product.id !== item.product.id));

    if (activeSessionId && item.docIds.length > 0) {
      const batch = writeBatch(db);
      item.docIds.forEach(id => {
        batch.delete(doc(db, 'pos_sessions', activeSessionId, 'scans', id));
      });
      batch.commit().catch(e => console.error('Error batch deleting items:', e));
    }
  };

  // Staff login simulation
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<'admin' | 'super_admin' | 'inventory_manager'>('admin');
  const handleStaffLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    if (onLoginStaff) {
      onLoginStaff(emailInput.trim(), roleInput);
    }
  };

  // ================= RENDER A: AUTHENTICATION CHECK =================
  if (!isUserStaff) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-3xl border border-pink-100 shadow-xl space-y-6 text-xs text-center my-6">
        <div className="w-14 h-14 bg-red-50 border border-red-200 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert size={28} />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-extrabold text-gray-900">Staff Authentication Required</h3>
          <p className="text-gray-500 leading-relaxed font-medium">
            This live smartphone POS module is restricted exclusively to authorized staff (admin, super_admin, inventory_manager).
          </p>
        </div>

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
            <label className="block text-gray-500 font-semibold mb-1">Role</label>
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
          <span>Return</span>
        </button>
      </div>
    );
  }

  // ================= RENDER B: LOADING SESSION =================
  if (isLoadingSession) {
    return (
      <div className="max-w-md mx-auto min-h-[60vh] flex flex-col items-center justify-center space-y-4 p-6 text-center">
        <div className="w-14 h-14 bg-pink-50 border border-pink-200 text-[#E91E8C] rounded-full flex items-center justify-center animate-bounce shadow-md shadow-pink-100">
          <Loader2 className="animate-spin" size={26} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-gray-900">Starting POS Session</h3>
          <p className="text-xs text-pink-600 font-medium font-mono animate-pulse">
            Connecting session for {currentUser?.name || 'Staff'}...
          </p>
        </div>
      </div>
    );
  }

  // ================= RENDER C: SESSION ERROR =================
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

  // ================= RENDER D: MOBILE-FIRST POS SCANNER =================
  return (
    <div className="max-w-md mx-auto bg-[#FFF5F8] min-h-screen flex flex-col justify-between pb-6 select-none">
      {/* Hidden input for physical USB/Bluetooth barcode scanners */}
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

      {/* TOP HEADER */}
      <header className="bg-white/95 backdrop-blur-md px-4 py-3 border-b border-pink-100 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center justify-between">
          <button 
            type="button"
            onClick={() => {
              stopScanner();
              onBack();
            }}
            className="p-2 hover:bg-pink-50 text-gray-600 rounded-xl cursor-pointer transition"
            title="Close / Back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{context === 'STOCK_IN' ? 'STOCK-IN SCAN' : 'POS SCANNER'}</span>
            </span>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
              {activeSessionId ? `Session: #${activeSessionId.slice(-6).toUpperCase()}` : 'Ready to scan'}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                try { localStorage.setItem('pos_scan_sound_enabled', String(next)); } catch {}
                if (next) playSuccessBeep();
              }}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                soundEnabled 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                  : 'bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200'
              }`}
              title={soundEnabled ? 'Sound ON' : 'Sound MUTED'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* View Cart / Queue Count Button */}
            <button
              type="button"
              onClick={() => setShowCartDrawer(prev => !prev)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#E91E8C] to-[#FF4B91] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs hover:opacity-95 transition cursor-pointer"
            >
              <ShoppingBag size={14} />
              <span>{totalCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN SCANNER VIEW */}
      <main className="flex-1 flex flex-col p-4 space-y-3">
        {/* CAMERA PREVIEW CONTAINER */}
        <div className="relative w-full aspect-[4/3] max-h-[50vh] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white/60 flex items-center justify-center">
          {/* Native HTML5 Video Element directly managed with videoRef */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isCameraActive && !cameraError ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Camera Viewfinder Overlay with corner reticles & animated scanning laser beam */}
          {isCameraActive && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              <div className="relative w-64 h-36 max-w-[85%] max-h-[70%] rounded-2xl border border-white/25">
                {/* 4 Corner Markers */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-[#E91E8C] rounded-tl shadow-[0_0_8px_#E91E8C]" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-[#E91E8C] rounded-tr shadow-[0_0_8px_#E91E8C]" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-[#E91E8C] rounded-bl shadow-[0_0_8px_#E91E8C]" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-[#E91E8C] rounded-br shadow-[0_0_8px_#E91E8C]" />

                {/* Laser scan line */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-[#E91E8C] to-transparent shadow-[0_0_10px_#E91E8C] animate-pulse top-1/2 -translate-y-1/2" />
              </div>

              <div className="mt-4 bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/10 shadow-lg">
                <span className="text-[11px] font-bold text-white tracking-wide uppercase">
                  Point camera at barcode
                </span>
              </div>
            </div>
          )}

          {/* Camera Loading or Error State */}
          {(!isCameraActive || cameraError) && (
            <div className="absolute inset-0 bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Camera size={36} className="text-[#E91E8C] animate-pulse" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold">Camera Paused</h4>
                <p className="text-xs text-gray-400 max-w-[220px]">
                  {cameraError || 'Camera stream is stopped.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCameraActive(true)}
                className="px-5 py-2.5 bg-[#E91E8C] text-white rounded-xl text-xs font-bold shadow-lg hover:bg-[#FF4B91] transition cursor-pointer"
              >
                Restart Camera
              </button>
            </div>
          )}

          {/* Quick Zoom Pill (1x / 1.5x / 2x) on Top Right of Camera */}
          {isCameraActive && !cameraError && (
            <div className="absolute top-3 right-3 flex items-center bg-black/50 backdrop-blur-md rounded-xl p-1 border border-white/20 z-10">
              {[1.0, 1.5, 2.0].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => handleZoomChange(z)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    posCameraZoom === z 
                      ? 'bg-[#E91E8C] text-white shadow-xs' 
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {z}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* STATUS NOTIFICATION MESSAGE */}
        {scanStatusMsg && (
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold shadow-xs animate-scaleIn ${
            scanStatusMsg.type === 'error' 
              ? 'bg-rose-50 text-rose-700 border border-rose-200' 
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}>
            {scanStatusMsg.type === 'error' ? (
              <AlertCircle size={16} className="text-rose-500 shrink-0" />
            ) : (
              <CheckCircle size={16} className="text-emerald-500 shrink-0" />
            )}
            <span className="truncate flex-1">{scanStatusMsg.text}</span>
            <button 
              type="button" 
              onClick={() => setScanStatusMsg(null)}
              className="text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* SMALL LAST SCANNED PRODUCT INDICATOR (Instant Recognition Feedback) */}
        {lastScannedProduct && (
          <div className="bg-white p-3 rounded-2xl border-2 border-[#E91E8C]/30 shadow-md flex items-center justify-between gap-3 animate-fade-in">
            <img 
              src={lastScannedProduct.image || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=200'} 
              alt={lastScannedProduct.name}
              className="w-12 h-12 object-cover rounded-xl border border-pink-100 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[9px] uppercase font-black text-[#E91E8C] tracking-wide block">
                ✓ Just Scanned
              </span>
              <h4 className="font-bold text-gray-900 text-xs truncate">
                {lastScannedProduct.name}
              </h4>
              <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                {context === 'STOCK_IN' 
                  ? `Available Stock: ${lastScannedProduct.stock} pcs`
                  : `৳${getRetailPrice(lastScannedProduct).toLocaleString()} • Stock: ${lastScannedProduct.stock}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setQuickViewProduct(lastScannedProduct);
                setIsQuickViewOpen(true);
              }}
              className="p-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl border border-purple-200 transition cursor-pointer text-[10px] font-bold flex items-center gap-1 shrink-0"
            >
              <Eye size={12} />
              <span>Details</span>
            </button>
          </div>
        )}

        {/* PRIMARY CONTROLS BAR */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {/* Camera Flip Button */}
          <button
            type="button"
            onClick={() => setUseFrontCamera(prev => !prev)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-pink-50 border border-pink-100 rounded-2xl text-xs font-bold text-gray-700 transition shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className="text-[#E91E8C]" />
            <span>Flip Cam</span>
          </button>

          {/* Manual Input Toggle */}
          <button
            type="button"
            onClick={() => setShowManualInput(prev => !prev)}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 border rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer ${
              showManualInput 
                ? 'bg-pink-50 border-[#E91E8C] text-[#E91E8C]' 
                : 'bg-white hover:bg-pink-50 border-pink-100 text-gray-700'
            }`}
          >
            <Search size={14} className="text-[#E91E8C]" />
            <span>Manual</span>
          </button>

          {/* Instant Frame Lens Scan */}
          <button
            type="button"
            onClick={handleLiveLensSnap}
            disabled={isPhotoScanning}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-blue-50 border border-blue-200 rounded-2xl text-xs font-bold text-blue-700 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Camera size={14} className="text-blue-600" />
            <span>{isPhotoScanning ? 'Scanning...' : 'Snapshot'}</span>
          </button>
        </div>

        {/* COLLAPSIBLE MANUAL CODE / PRODUCT SEARCH FORM */}
        {showManualInput && (
          <form onSubmit={handleManualSubmit} className="bg-white p-3.5 rounded-3xl border border-pink-200 shadow-md space-y-2.5 animate-scaleIn">
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Type barcode or product name..."
                className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#E91E8C] focus:bg-white"
                autoFocus
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2.5 bg-[#E91E8C] text-white rounded-xl text-xs font-bold hover:bg-[#FF4B91] transition cursor-pointer disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {/* Gallery Photo Scan option inside manual fallback */}
            <div className="flex items-center justify-between pt-1 text-[10px] text-gray-500">
              <span>Can't read barcode?</span>
              <label className="text-[#E91E8C] font-bold hover:underline cursor-pointer flex items-center gap-1">
                <span>Upload Barcode Photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUploadScan}
                  className="hidden" 
                  disabled={isPhotoScanning}
                />
              </label>
            </div>
          </form>
        )}

        {/* COLLAPSIBLE LIVE CART DRAWER PREVIEW */}
        {showCartDrawer && (
          <div className="bg-white p-4 rounded-3xl border border-pink-200 shadow-xl space-y-3 animate-scaleIn max-h-[40vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-pink-100 pb-2">
              <h4 className="font-extrabold text-gray-900 text-xs flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-[#E91E8C]" />
                <span>Current Items ({totalCount})</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowCartDrawer(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {context === 'STOCK_IN' ? (
                stockInQueue.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-4">No stock-in items yet.</p>
                ) : (
                  stockInQueue.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between p-2.5 bg-pink-50/40 rounded-xl border border-pink-100 text-xs">
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-gray-900 truncate">{item.product.name}</h5>
                        <span className="text-gray-500 font-mono text-[10px]">Stock: {item.product.stock}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateStockInQty && onUpdateStockInQty(item.product.id, Math.max(1, item.quantity - 1))}
                          className="w-6 h-6 flex items-center justify-center bg-white border border-pink-200 rounded-lg text-pink-700"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="font-bold font-mono text-xs">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onAddToStockIn && onAddToStockIn(item.product)}
                          className="w-6 h-6 flex items-center justify-center bg-[#E91E8C] text-white rounded-lg"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveFromStockIn && onRemoveFromStockIn(item.product.id)}
                          className="text-red-500 hover:text-red-700 p-1 ml-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                optimisticCart.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-4">No cart items yet.</p>
                ) : (
                  optimisticCart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between p-2.5 bg-pink-50/40 rounded-xl border border-pink-100 text-xs">
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-gray-900 truncate">{item.product.name}</h5>
                        <span className="text-[#E91E8C] font-mono font-bold text-[10px]">
                          ৳{getRetailPrice(item.product).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecrement(item)}
                          className="w-6 h-6 flex items-center justify-center bg-white border border-pink-200 rounded-lg text-pink-700 cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="font-bold font-mono text-xs">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleIncrement(item.product)}
                          className="w-6 h-6 flex items-center justify-center bg-[#E91E8C] text-white rounded-lg cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item)}
                          className="text-red-500 hover:text-red-700 p-1 ml-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                stopScanner();
                onBack();
              }}
              className="w-full py-2.5 bg-[#E91E8C] text-white rounded-xl text-xs font-bold hover:bg-[#FF4B91] transition cursor-pointer shadow-sm text-center"
            >
              Done & Checkout ({totalCount} items)
            </button>
          </div>
        )}
      </main>

      {/* FOOTER ACTION BUTTON: DONE / PROCEED TO CHECKOUT */}
      <footer className="px-4">
        <button
          type="button"
          onClick={() => {
            stopScanner();
            onBack();
          }}
          className="w-full py-3.5 bg-gradient-to-r from-[#E91E8C] to-[#FF4B91] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-pink-200 hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <ShoppingBag size={18} />
          <span>
            {context === 'STOCK_IN' 
              ? `Done Scanning (Queue: ${totalCount})` 
              : `View Cart & Checkout (${totalCount})`}
          </span>
        </button>
      </footer>

      {/* PRODUCT QUICK-VIEW MODAL (ONLY WHEN EXPLICITLY OPENED) */}
      <PosProductQuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        onConfirmAdd={(prod, qty) => {
          for (let i = 0; i < qty; i++) {
            handleScanDetected(prod.barcode || prod.id);
          }
          setIsQuickViewOpen(false);
        }}
        context={context}
      />
    </div>
  );
});

export default PosScan;
