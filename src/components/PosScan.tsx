import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, onSnapshot, query, addDoc, deleteDoc } from 'firebase/firestore';
import { Html5Qrcode } from 'html5-qrcode';
import { db } from '../services/firebase';
import { productService } from '../services/productService';
import { addProductToSession } from '../services/posService';
import { Product, UserProfile } from '../types';
import { 
  Camera, 
  Smartphone, 
  ShieldAlert, 
  CheckCircle, 
  ArrowLeft,
  X,
  UserCheck,
  Search,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  Volume2
} from 'lucide-react';

interface PosScanProps {
  sessionId: string;
  onBack: () => void;
  currentUser: UserProfile | null;
  onLoginStaff: (email: string, role: any) => void;
}

// Play instant audio beep on successful camera scan
function playScanBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz beep
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {
    // Audio Context restricted before first user interaction
  }
}

export default function PosScan({ sessionId, onBack, currentUser, onLoginStaff }: PosScanProps) {
  const [scannedItemsCount, setScannedItemsCount] = useState(0);
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  const [scanStatusMsg, setScanStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useFrontCamera, setUseFrontCamera] = useState(false);

  // Manual search state
  const [manualCode, setManualCode] = useState('');
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'cart'>('camera');
  
  // Live scans list for mobile cart view
  const [scansList, setScansList] = useState<any[]>([]);

  // Login form for unauthenticated staff
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<'admin' | 'inventory_manager' | 'customer_support'>('admin');

  // Debounce refs
  const lastScanRef = useRef<{ productId: string; time: number } | null>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Check if current user is a staff member
  const isUserStaff = currentUser && ['admin', 'inventory_manager', 'customer_support', 'super_admin'].includes(currentUser.role);

  // 1. Listen live to scans under this session to show live counter & list
  useEffect(() => {
    if (!sessionId || !isUserStaff) return;
    const q = query(collection(db, 'pos_sessions', sessionId, 'scans'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setScansList(list);
      setScannedItemsCount(snapshot.size);
    }, (err) => {
      console.warn('Error listening to session scans:', err);
    });
    return () => unsubscribe();
  }, [sessionId, isUserStaff]);

  // 2. Initialize QR / Barcode Scanner
  useEffect(() => {
    if (!isUserStaff || !isCameraActive) return;

    const startScanner = async () => {
      setCameraError(null);
      try {
        if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop().catch(() => {});
        }

        const qrScanner = new Html5Qrcode("reader-container");
        html5QrcodeRef.current = qrScanner;

        const cameraConfig = useFrontCamera ? { facingMode: "user" } : { facingMode: "environment" };

        await qrScanner.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: (width, height) => {
              const minDim = Math.min(width, height);
              // Rectangle box fits both 1D Barcodes and 2D QR codes
              return { width: Math.floor(minDim * 0.85), height: Math.floor(minDim * 0.55) };
            },
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            }
          } as any,
          handleScanSuccess,
          (errorMessage) => {
            // Quiet fail for scan frame failures
          }
        );
      } catch (err: any) {
        console.error("Camera startup error:", err);
        setCameraError(
          "Camera access standard blocked or unavailable. Ensure camera permission is granted in browser settings or try manual code entry below."
        );
        setIsCameraActive(false);
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, [isCameraActive, isUserStaff, useFrontCamera]);

  const stopScanner = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().then(() => {
        html5QrcodeRef.current = null;
      }).catch(err => {
        console.error("Error stopping scanner:", err);
      });
    }
  };

  // 3. Handle a successfully scanned QR code or Barcode
  const handleScanSuccess = async (rawText: string) => {
    if (!rawText) return;
    const decodedText = rawText.trim();

    // Extract code from URL if present (e.g. /pos/product/{id} or /product/{id})
    let codeToSearch = decodedText;
    const indicator = '/pos/product/';
    const index = decodedText.indexOf(indicator);

    if (index !== -1) {
      codeToSearch = decodedText.substring(index + indicator.length).trim();
      codeToSearch = codeToSearch.split('?')[0].split('#')[0].replace(/\/$/, '');
    } else if (decodedText.includes('/')) {
      const parts = decodedText.split('/');
      codeToSearch = parts[parts.length - 1].split('?')[0].split('#')[0];
    }

    if (!codeToSearch) return;

    // Resolve product in catalog by barcode or ID
    const product = productService.getProductByBarcode(codeToSearch) || productService.getProductById(codeToSearch);

    if (!product) {
      setScanStatusMsg({
        type: 'error',
        text: `Unrecognized product code: "${codeToSearch}"`
      });
      return;
    }

    const productId = product.id;

    // Check debounce: avoid double scans of the same item within 1200ms
    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.productId === productId && (now - lastScanRef.current.time) < 1200) {
      return;
    }

    lastScanRef.current = { productId, time: now };

    // Play instant audio beep & haptic feedback
    playScanBeep();
    if (navigator.vibrate) {
      navigator.vibrate(120);
    }

    // Call shared addProductToSession helper
    const result = await addProductToSession(sessionId, productId);
    if (result.success && result.product) {
      setLastScannedProduct(result.product);
      setScanStatusMsg({
        type: 'success',
        text: `Added "${result.product.name}"!`
      });
    } else {
      setScanStatusMsg({
        type: 'error',
        text: result.message || `Failed to add product.`
      });
    }

    setTimeout(() => {
      setScanStatusMsg(null);
    }, 3500);
  };

  // Manual code submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    await handleScanSuccess(manualCode.trim());
    setManualCode('');
  };

  const handleStaffLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      alert("Please enter work email.");
      return;
    }
    onLoginStaff(emailInput.trim(), roleInput);
  };

  // Grouped cart items for mobile cart view
  const mobileCartItems = React.useMemo(() => {
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
  }, [scansList]);

  const handleIncrementMobile = async (productId: string) => {
    const res = await addProductToSession(sessionId, productId);
    if (!res.success) {
      alert(res.message);
    }
  };

  const handleDecrementMobile = async (docIds: string[]) => {
    if (docIds.length === 0) return;
    try {
      const lastDocId = docIds[docIds.length - 1];
      await deleteDoc(doc(db, 'pos_sessions', sessionId, 'scans', lastDocId));
    } catch (err) {
      console.error('Error decrementing scan:', err);
    }
  };

  const handleRemoveMobile = async (docIds: string[]) => {
    if (docIds.length === 0) return;
    try {
      for (const id of docIds) {
        await deleteDoc(doc(db, 'pos_sessions', sessionId, 'scans', id));
      }
    } catch (err) {
      console.error('Error removing scans:', err);
    }
  };

  if (!isUserStaff) {
    // UN-AUTHENTICATED BARRIER
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-3xl border border-pink-100 shadow-xl space-y-6 text-xs text-center my-6">
        <div className="w-14 h-14 bg-red-50 border border-red-200 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert size={28} />
        </div>
        
        <div className="space-y-1.5">
          <h3 className="text-base font-extrabold text-gray-900">Staff Authentication Required</h3>
          <p className="text-gray-500 leading-relaxed font-medium">
            This live smartphone POS scanner module is restricted exclusively to authorized checkout staff members.
          </p>
        </div>

        {/* Staff Quick Login Form */}
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
              <option value="inventory_manager">Inventory Supervisor</option>
              <option value="customer_support">Support Associate</option>
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
          onClick={onBack}
          className="text-[#E91E8C] hover:text-[#FF4B91] font-bold text-xs flex items-center justify-center gap-1 mx-auto cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Return to Store</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-[#FFF5F8] min-h-screen flex flex-col justify-between pb-8">
      
      {/* MOBILE SCANNERS HEADER */}
      <div className="bg-white px-4 py-3 border-b border-pink-100 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <button 
          onClick={() => {
            stopScanner();
            onBack();
          }}
          className="p-1.5 hover:bg-pink-50 text-gray-500 rounded-lg cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="text-center">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center justify-center gap-1">
            <Smartphone size={13} className="text-[#E91E8C]" />
            <span>Mobile Scanner</span>
          </h3>
          <span className="text-[9px] text-pink-600 font-bold font-mono">Session: {sessionId}</span>
        </div>

        <button
          onClick={() => setActiveTab(activeTab === 'cart' ? 'camera' : 'cart')}
          className="flex items-center gap-1.5 bg-pink-50 border border-pink-100 text-[#E91E8C] text-[10px] font-bold px-2.5 py-1 rounded-full font-mono shadow-inner cursor-pointer"
        >
          <ShoppingBag size={12} />
          <span>{scannedItemsCount} Scanned</span>
        </button>
      </div>

      {/* MODE TABS (Camera Scan / Manual Entry / Live Cart) */}
      <div className="bg-white border-b border-pink-100 px-4 py-2 flex items-center justify-around text-xs font-bold">
        <button
          onClick={() => {
            setActiveTab('camera');
            if (!isCameraActive) setIsCameraActive(true);
          }}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'camera'
              ? 'bg-[#E91E8C] text-white shadow-sm'
              : 'text-gray-500 hover:text-pink-600'
          }`}
        >
          <Camera size={14} />
          <span>Camera</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('manual');
          }}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'manual'
              ? 'bg-[#E91E8C] text-white shadow-sm'
              : 'text-gray-500 hover:text-pink-600'
          }`}
        >
          <Search size={14} />
          <span>Manual Input</span>
        </button>

        <button
          onClick={() => setActiveTab('cart')}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition cursor-pointer ${
            activeTab === 'cart'
              ? 'bg-[#E91E8C] text-white shadow-sm'
              : 'text-gray-500 hover:text-pink-600'
          }`}
        >
          <ShoppingBag size={14} />
          <span>Live Cart ({scannedItemsCount})</span>
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-4">
        
        {/* STATUS BANNER */}
        {scanStatusMsg && (
          <div className={`w-full max-w-sm p-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md ${
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
                {/* Html5Qrcode mounts directly in this container ID */}
                <div id="reader-container" className="w-full h-full"></div>
                
                {/* Laser scan line animation */}
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse z-10 pointer-events-none"></div>

                {/* Top overlay hint */}
                <div className="absolute top-2 inset-x-0 text-center z-10">
                  <span className="bg-black/60 text-white text-[9px] font-bold px-3 py-1 rounded-full backdrop-blur-xs">
                    Align Barcode or QR inside box
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-square max-w-[300px] bg-white rounded-3xl border border-pink-100 shadow-inner flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-pink-50 text-[#E91E8C] rounded-full flex items-center justify-center shadow-inner">
                  <Camera size={32} />
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Mobile Camera Ready</h4>
                  <p className="text-[10px] text-gray-500 leading-relaxed max-w-[220px] mx-auto">
                    Point camera at product barcodes (1D or QR codes) to sync items to desktop POS register.
                  </p>
                </div>

                {cameraError && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] p-2.5 rounded-xl font-medium leading-relaxed text-left">
                    {cameraError}
                  </div>
                )}

                <button
                  onClick={() => setIsCameraActive(true)}
                  className="bg-[#E91E8C] hover:bg-[#FF4B91] text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer transition shadow-md shadow-pink-100 flex items-center gap-1.5"
                >
                  <Camera size={14} />
                  <span>Activate Camera Scanner</span>
                </button>
              </div>
            )}

            {isCameraActive && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUseFrontCamera(!useFrontCamera)}
                  className="bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 text-[10px] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <RefreshCw size={12} />
                  <span>Switch Camera ({useFrontCamera ? "Front" : "Rear"})</span>
                </button>

                <button
                  onClick={() => {
                    stopScanner();
                    setIsCameraActive(false);
                  }}
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-[10px] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs"
                >
                  Pause Camera
                </button>
              </div>
            )}

            {/* RECENTLY SCANNED ITEM BANNER */}
            {lastScannedProduct && (
              <div className="w-full bg-white p-3.5 rounded-2xl border-b-4 border-[#E91E8C] shadow-md flex items-center gap-3 animate-scale-in">
                <img 
                  src={lastScannedProduct.image} 
                  alt={lastScannedProduct.name}
                  className="w-12 h-12 object-cover rounded-xl border border-pink-100 shadow-xs flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0 text-left text-[11px]">
                  <span className="text-[9px] uppercase font-extrabold text-[#E91E8C] block">Scanned Product</span>
                  <h4 className="font-bold text-gray-800 truncate">{lastScannedProduct.name}</h4>
                  <p className="text-gray-500 font-mono mt-0.5">Price: <strong>৳{lastScannedProduct.discountPrice || lastScannedProduct.price}</strong></p>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: MANUAL BARCODE / PRODUCT ENTRY */}
        {activeTab === 'manual' && (
          <div className="w-full max-w-sm bg-white p-5 rounded-3xl border border-pink-100 shadow-sm space-y-4 text-xs">
            <div className="space-y-1 text-center">
              <h4 className="font-extrabold text-gray-900 uppercase tracking-wider text-xs">
                Manual Barcode / Product Entry
              </h4>
              <p className="text-[10px] text-gray-500">
                Type product barcode (e.g., 8809598450123) or product ID directly.
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter barcode or ID..."
                  className="w-full bg-pink-50/20 text-gray-800 text-xs px-4 py-3 rounded-2xl border border-pink-200 outline-none focus:border-[#E91E8C] focus:bg-white font-mono font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full bg-[#E91E8C] hover:bg-[#FF4B91] disabled:opacity-50 text-white py-3 rounded-2xl font-bold transition cursor-pointer shadow-md shadow-pink-100 flex items-center justify-center gap-1.5"
              >
                <Plus size={15} />
                <span>Add Product To Cart</span>
              </button>
            </form>

            <div className="pt-3 border-t border-pink-50 space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Quick Sample Barcodes:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Cosrx Essence', code: '8809598450123' },
                  { label: 'Felicia Foam', code: '880980010101' },
                  { label: 'SKIN1004 Ampoule', code: '8809530040101' },
                  { label: 'Lebelage Suncream', code: '880940040101' }
                ].map((sample) => (
                  <button
                    key={sample.code}
                    type="button"
                    onClick={() => {
                      setManualCode(sample.code);
                    }}
                    className="bg-pink-50 hover:bg-pink-100 border border-pink-100 text-[#E91E8C] text-[10px] font-bold px-2.5 py-1 rounded-xl cursor-pointer transition"
                  >
                    {sample.label}
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
                <span>Scanned Cart Items ({scannedItemsCount})</span>
              </h4>
            </div>

            {mobileCartItems.length === 0 ? (
              <div className="py-8 text-center text-gray-400 space-y-2">
                <p className="text-xs">No products scanned yet.</p>
                <button
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
                      <span className="text-[#E91E8C] font-black font-mono text-[10px]">৳{item.product.discountPrice || item.product.price}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleDecrementMobile(item.docIds)}
                        className="p-1 bg-white border border-pink-200 text-pink-700 rounded-lg hover:bg-pink-100 cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-bold font-mono px-1.5 text-xs text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => handleIncrementMobile(item.product.id)}
                        className="p-1 bg-[#E91E8C] text-white rounded-lg hover:bg-[#FF4B91] cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                      <button
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

      {/* FOOTER AUTHORIZED BADGE */}
      <div className="px-6 text-center space-y-1.5">
        <div className="inline-flex items-center gap-1 bg-white border border-pink-100 px-3 py-1 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
          <span className="text-[10px] text-gray-600 font-semibold">Authorized Staff: {currentUser.name}</span>
        </div>
      </div>

    </div>
  );
}
