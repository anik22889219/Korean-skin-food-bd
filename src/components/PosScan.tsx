import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, onSnapshot, query, addDoc } from 'firebase/firestore';
import { Html5Qrcode } from 'html5-qrcode';
import { db } from '../services/firebase';
import { productService } from '../services/productService';
import { addProductToSession } from '../services/posService';
import { authService } from '../services/authService';
import { Product, UserProfile } from '../types';
import { 
  Camera, 
  Smartphone, 
  ShieldAlert, 
  Wand2, 
  CheckCircle, 
  ArrowLeft,
  X,
  UserCheck,
  RefreshCw,
  LogOut
} from 'lucide-react';

interface PosScanProps {
  sessionId: string;
  onBack: () => void;
  currentUser: UserProfile | null;
  onLoginStaff: (email: string, role: any) => void;
}

export default function PosScan({ sessionId, onBack, currentUser, onLoginStaff }: PosScanProps) {
  const [scannedItemsCount, setScannedItemsCount] = useState(0);
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Login form for unauthenticated staff
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<'admin' | 'inventory_manager' | 'customer_support'>('admin');

  // Debounce refs
  const lastScanRef = useRef<{ productId: string; time: number } | null>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Check if current user is a staff member
  const isUserStaff = currentUser && ['admin', 'inventory_manager', 'customer_support', 'super_admin'].includes(currentUser.role);

  // 1. Listen live to scans under this session to show live counter
  useEffect(() => {
    if (!sessionId || !isUserStaff) return;
    const q = query(collection(db, 'pos_sessions', sessionId, 'scans'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setScannedItemsCount(snapshot.size);
    }, (err) => {
      console.warn('Error listening to scans counter:', err);
    });
    return () => unsubscribe();
  }, [sessionId, isUserStaff]);

  // 2. Initialize QR Scanner
  useEffect(() => {
    if (!isUserStaff || !isCameraActive) return;

    const startScanner = async () => {
      setCameraError(null);
      try {
        const qrScanner = new Html5Qrcode("reader-container");
        html5QrcodeRef.current = qrScanner;

        await qrScanner.start(
          { facingMode: "environment" }, // Rear camera
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            }
          },
          handleScanSuccess,
          (errorMessage) => {
            // Quiet fail for scan failure messages (occurs constantly when searching for code)
          }
        );
      } catch (err: any) {
        console.error("Camera startup error:", err);
        setCameraError("Unable to access the camera. Please make sure camera permissions are granted.");
        setIsCameraActive(false);
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, [isCameraActive, isUserStaff]);

  const stopScanner = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().then(() => {
        html5QrcodeRef.current = null;
      }).catch(err => {
        console.error("Error stopping scanner:", err);
      });
    }
  };

  // 3. Handle a successfully scanned QR code
  const handleScanSuccess = async (decodedText: string) => {
    // Expected text: {origin}/pos/product/{productId}
    const indicator = '/pos/product/';
    const index = decodedText.indexOf(indicator);
    
    if (index === -1) {
      // Not a valid product QR
      return;
    }

    const productId = decodedText.substring(index + indicator.length).trim();
    if (!productId) return;

    // Check debounce: avoid double scans of the same item within 1000ms (1 second)
    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.productId === productId && (now - lastScanRef.current.time) < 1000) {
      // Debounce trigger
      return;
    }

    // Update last scan reference
    lastScanRef.current = { productId, time: now };

    // Play a gentle bip/haptic sound or vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    // Call shared addProductToSession helper
    const result = await addProductToSession(sessionId, productId);
    if (result.success && result.product) {
      setLastScannedProduct(result.product);
    } else {
      const product = productService.getProductById(productId);
      if (product) {
        setLastScannedProduct(product);
      }
      console.warn("Scan add issue:", result.message);
    }
  };

  const handleStaffLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      alert("Please enter work email.");
      return;
    }
    onLoginStaff(emailInput.trim(), roleInput);
  };

  if (!isUserStaff) {
    // UN-AUTHENTICATED BARRIER
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-3xl border border-pink-100 shadow-xl space-y-6 text-xs text-center">
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
      <div className="bg-white px-4 py-3 border-b border-pink-100 flex items-center justify-between shadow-sm">
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
          <span className="text-[9px] text-pink-600 font-bold font-mono">ID: {sessionId}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-pink-50 border border-pink-100 text-[#E91E8C] text-[10px] font-bold px-2.5 py-1 rounded-full font-mono shadow-inner">
          <span className="w-1.5 h-1.5 bg-[#E91E8C] rounded-full animate-ping"></span>
          <span>{scannedItemsCount} Scanned</span>
        </div>
      </div>

      {/* VIEWPORT BARCODE READER */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
        
        {isCameraActive ? (
          <div className="w-full aspect-square max-w-[280px] bg-black rounded-3xl overflow-hidden relative border-4 border-[#E91E8C] shadow-2xl">
            {/* Html5Qrcode mounts directly in this container ID */}
            <div id="reader-container" className="w-full h-full"></div>
            
            {/* Guide Laser Scan Overlay */}
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse z-10"></div>
          </div>
        ) : (
          <div className="w-full aspect-square max-w-[280px] bg-white rounded-3xl border border-pink-100 shadow-inner flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-pink-50 text-[#E91E8C] rounded-full flex items-center justify-center">
              <Camera size={32} />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Camera Offline</h4>
              <p className="text-[10px] text-gray-500 leading-relaxed max-w-[200px] mx-auto">
                Ready to sync live checkouts. Activate your rear camera to scan product QR codes.
              </p>
            </div>

            {cameraError && (
              <p className="text-[10px] text-red-500 font-medium px-2">{cameraError}</p>
            )}

            <button
              onClick={() => setIsCameraActive(true)}
              className="bg-[#E91E8C] hover:bg-[#FF4B91] text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer transition shadow-md shadow-pink-100 flex items-center gap-1.5"
            >
              <Camera size={13} />
              <span>Activate Camera</span>
            </button>
          </div>
        )}

        {isCameraActive && (
          <button
            onClick={() => {
              stopScanner();
              setIsCameraActive(false);
            }}
            className="bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 text-[10px] font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-sm"
          >
            Pause Camera Scan
          </button>
        )}

        {/* RECENTLY SCANNED PRODUCT BANNER */}
        {lastScannedProduct ? (
          <div className="w-full max-w-sm bg-white p-4 rounded-2xl border-b-4 border-[#E91E8C] shadow-md flex items-center gap-3 animate-scale-in">
            <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center text-emerald-500">
              <CheckCircle size={24} />
            </div>
            <div className="flex-1 min-w-0 text-left text-[11px]">
              <span className="text-[9px] uppercase font-extrabold text-[#E91E8C] block">Successfully Scanned!</span>
              <h4 className="font-bold text-gray-800 truncate">{lastScannedProduct.name}</h4>
              <p className="text-gray-500 mt-0.5">Price: <strong>৳{lastScannedProduct.discountPrice || lastScannedProduct.price}</strong></p>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm bg-white p-4 rounded-2xl border border-dashed border-pink-200 text-center text-gray-400 text-[10px]">
            No scans detected in this session yet.
          </div>
        )}

      </div>

      {/* FOOTER AUTHORIZED BADGE */}
      <div className="px-6 text-center space-y-1.5">
        <div className="inline-flex items-center gap-1 bg-white border border-pink-100 px-3 py-1 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
          <span className="text-[10px] text-gray-600 font-semibold">Authorized: {currentUser.name}</span>
        </div>
      </div>

    </div>
  );
}
