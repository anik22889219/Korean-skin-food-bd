import React, { useState, useEffect, useMemo } from 'react';
import { PosSession, Product } from '../../types';
import { posService, isSessionStale, formatSessionActivityTime } from '../../services/posService';
import { productService } from '../../services/productService';
import { 
  ArrowLeft, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Clock, 
  Package, 
  Layers, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Activity, 
  ShoppingCart, 
  ScanLine, 
  Eye,
  Info,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface PosLiveDetailProps {
  sessionId: string;
  onBack: () => void;
}

interface GroupedCartItem {
  productId: string;
  product: Product | {
    id: string;
    name: string;
    brand?: string;
    price: number;
    discountPrice?: number;
    imageUrl?: string;
    barcode?: string;
    category?: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export const PosLiveDetail: React.FC<PosLiveDetailProps> = ({
  sessionId,
  onBack
}) => {
  const [session, setSession] = useState<PosSession | null>(null);
  const [scans, setScans] = useState<any[]>([]);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [isSessionClosed, setIsSessionClosed] = useState<boolean>(false);
  const [lastTick, setLastTick] = useState<number>(Date.now());

  // 1. Subscribe to session document in real time
  useEffect(() => {
    if (!sessionId) return;
    setIsLoadingSession(true);

    const unsubSession = posService.subscribeSession(
      sessionId,
      (sess) => {
        setIsLoadingSession(false);
        if (!sess) {
          setIsSessionClosed(true);
          setSession(null);
          return;
        }

        if (sess.status === 'completed' || sess.status === 'closed') {
          setIsSessionClosed(true);
        } else {
          setIsSessionClosed(false);
        }
        setSession(sess);
      },
      (err) => {
        console.warn(`[PosLiveDetail] Error subscribing to session ${sessionId}:`, err);
        setIsLoadingSession(false);
      }
    );

    // 2. Subscribe to scans subcollection in real time
    const unsubScans = posService.subscribeSessionScans(
      sessionId,
      (scanList) => {
        setScans(scanList);
      },
      (err) => {
        console.warn(`[PosLiveDetail] Error subscribing to scans for ${sessionId}:`, err);
      }
    );

    return () => {
      unsubSession();
      unsubScans();
    };
  }, [sessionId]);

  // Periodic ticker to refresh relative timestamps
  useEffect(() => {
    const timer = setInterval(() => {
      setLastTick(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // 3. Compute live grouped cart items from scans & session doc
  const groupedCartItems: GroupedCartItem[] = useMemo(() => {
    // If scans are available in subcollection, aggregate by product_id
    if (scans.length > 0) {
      const counts: { [pId: string]: { count: number; sampleScan?: any } } = {};
      scans.forEach((s) => {
        const pId = s.product_id;
        if (pId) {
          if (!counts[pId]) {
            counts[pId] = { count: 0, sampleScan: s };
          }
          counts[pId].count += 1;
        }
      });

      return Object.keys(counts).map((pId) => {
        const prod = productService.getProductByBarcode(pId) || productService.getProductById(pId);
        const sample = counts[pId].sampleScan;
        const unitPrice = prod?.discountPrice || prod?.price || sample?.price || 0;
        const quantity = counts[pId].count;

        return {
          productId: pId,
          product: prod || {
            id: pId,
            name: sample?.product_name || `Scanned Item (${pId})`,
            brand: 'Store Item',
            price: unitPrice,
            barcode: sample?.barcode || pId,
            imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=200'
          },
          quantity,
          unitPrice,
          totalPrice: unitPrice * quantity
        };
      });
    }

    // Fallback to session.items if scans subcollection is empty or loading
    if (session && Array.isArray(session.items) && session.items.length > 0) {
      return session.items.map((item) => {
        const prod = productService.getProductById(item.productId) || productService.getProductByBarcode(item.productId);
        const unitPrice = item.price || prod?.discountPrice || prod?.price || 0;
        const quantity = item.quantity || 1;

        return {
          productId: item.productId,
          product: prod || {
            id: item.productId,
            name: item.name || `Item ${item.productId}`,
            brand: 'Store Item',
            price: unitPrice,
            barcode: item.productId,
            imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=200'
          },
          quantity,
          unitPrice,
          totalPrice: unitPrice * quantity
        };
      });
    }

    return [];
  }, [scans, session]);

  // Aggregate cart metrics
  const totalUniqueProducts = groupedCartItems.length;
  const totalUnits = groupedCartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotalAmount = groupedCartItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const getDeviceIcon = (device?: string) => {
    if (device === 'mobile') return <Smartphone size={16} className="text-pink-500" />;
    if (device === 'tablet') return <Tablet size={16} className="text-purple-500" />;
    return <Monitor size={16} className="text-blue-500" />;
  };

  const getDeviceLabel = (device?: string) => {
    if (device === 'mobile') return 'Mobile Terminal';
    if (device === 'tablet') return 'Tablet Terminal';
    return 'Desktop Terminal';
  };

  const getRoleDisplayName = (role?: string) => {
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'admin') return 'Admin';
    if (role === 'inventory_manager') return 'Inventory Manager';
    return role ? role.replace('_', ' ') : 'Staff';
  };

  if (isLoadingSession) {
    return (
      <div className="bg-white rounded-[32px] border border-pink-100 p-12 text-center space-y-4 shadow-xs">
        <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-gray-700">Connecting to live POS session feed...</p>
      </div>
    );
  }

  if (!session || isSessionClosed) {
    return (
      <div className="bg-white rounded-[32px] border border-pink-100 p-10 text-center space-y-4 shadow-xs animate-fadeIn">
        <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-600">
          <AlertCircle size={28} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-gray-900">
            {isSessionClosed ? 'POS Session Completed / Closed' : 'POS Session Not Found'}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {isSessionClosed
              ? 'This session was completed or closed by the operator and is no longer actively receiving scans.'
              : `The session with ID "${sessionId}" could not be located or has expired.`}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Return to Live Records</span>
        </button>
      </div>
    );
  }

  const isStale = isSessionStale(session.lastSeenAt || session.updated_at, 90);
  const activityText = formatSessionActivityTime(session.lastSeenAt || session.lastScanTime || session.updated_at);
  const startedDate = session.startedAt || session.created_at;
  const formattedStartTime = startedDate 
    ? new Date(startedDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
    : 'Recently';

  return (
    <div className="space-y-6 animate-fadeIn" id="pos-live-detail-view">
      {/* 1. TOP NAVIGATION & READ-ONLY NOTICE BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shadow-2xs hover:shadow-xs"
        >
          <ArrowLeft size={15} className="text-gray-500" />
          <span>Back to Live POS Records</span>
        </button>

        {/* Read-Only Observation Notice */}
        <div className="flex items-center gap-2 bg-blue-50/90 border border-blue-200/80 px-3.5 py-1.5 rounded-2xl text-[11px] font-bold text-blue-900 shadow-2xs">
          <Eye size={14} className="text-blue-600 shrink-0" />
          <span>READ-ONLY MONITORING MODE &bull; Non-destructive Realtime Mirror</span>
        </div>
      </div>

      {/* 2. OPERATOR & SESSION INFO BANNER */}
      <div className="bg-white rounded-[32px] border border-pink-100 p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 pb-5 border-b border-gray-100">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-50 to-pink-100 border border-pink-200 flex items-center justify-center text-[#E91E8C] shrink-0 shadow-2xs">
              {getDeviceIcon(session.deviceType)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-gray-900">
                  {session.userName || session.operatorName || 'Store Operator'}
                </h2>
                <span className="bg-pink-100 text-pink-800 border border-pink-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                  {getRoleDisplayName(session.userRole)}
                </span>
                <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  {getDeviceIcon(session.deviceType)}
                  <span>{getDeviceLabel(session.deviceType)}</span>
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                Session ID: <strong className="text-gray-800">{session.sessionId || session.id}</strong>
                {session.operatorEmail && (
                  <span className="text-gray-400 font-sans ml-2">&bull; {session.operatorEmail}</span>
                )}
              </p>
            </div>
          </div>

          {/* Live Status and Activity Tag */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Session Status</span>
              {!isStale ? (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-extrabold shadow-2xs">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span>LIVE ACTIVE</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-xl text-xs font-extrabold">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                  <span>IDLE / STALE</span>
                </span>
              )}
            </div>

            <div className="text-right border-l border-gray-200 pl-3">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Last Activity</span>
              <span className="text-xs font-bold text-gray-800 flex items-center gap-1 justify-end">
                <Clock size={12} className="text-gray-400" />
                {activityText}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Session Started</span>
            <span className="text-sm font-black text-gray-900 font-mono mt-0.5 block">
              {formattedStartTime}
            </span>
          </div>

          <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Products in Cart</span>
            <span className="text-sm font-black text-[#E91E8C] font-mono mt-0.5 block">
              {totalUniqueProducts} {totalUniqueProducts === 1 ? 'Item' : 'Items'}
            </span>
          </div>

          <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Units</span>
            <span className="text-sm font-black text-[#E91E8C] font-mono mt-0.5 block">
              {totalUnits} {totalUnits === 1 ? 'Unit' : 'Units'}
            </span>
          </div>

          <div className="bg-pink-50/80 p-3 rounded-2xl border border-pink-200/80">
            <span className="text-[10px] uppercase font-bold text-pink-700 block">Live Cart Total</span>
            <span className="text-base font-black text-[#E91E8C] font-mono mt-0.5 block">
              ৳{cartTotalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 3. TWO-COLUMN WORKSPACE: LIVE CART & REAL-TIME ACTIVITY TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / MAIN (8 COLS): CURRENT CART TABLE */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-[32px] border border-pink-100 overflow-hidden shadow-xs">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/40">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-[#E91E8C]" />
                <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                  Live Cart Items ({groupedCartItems.length})
                </h3>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                Auto-synced via Firestore
              </span>
            </div>

            {groupedCartItems.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center mx-auto text-[#E91E8C]">
                  <ShoppingCart size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Cart is currently empty</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    When the operator scans or adds products on their device, items will immediately appear in this live table.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {groupedCartItems.map((item, idx) => (
                  <div
                    key={`${item.productId}-${idx}`}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition text-xs"
                  >
                    {/* Product Identity */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          src={(item.product as any)?.image || (item.product as any)?.imageUrl || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=200'}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="min-w-0 space-y-0.5 flex-1">
                        <span className="text-[10px] font-bold text-[#E91E8C] uppercase tracking-wider block">
                          {item.product.brand || 'Korean Skin Food'}
                        </span>
                        <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                          {item.product.name}
                        </h4>
                        <span className="font-mono text-[11px] text-gray-400 block">
                          Code: {item.product.barcode || item.productId}
                        </span>
                      </div>
                    </div>

                    {/* Quantity & Unit Price */}
                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-800 font-bold px-2.5 py-1 rounded-lg text-xs font-mono">
                        <span>× {item.quantity}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1 font-mono">
                        @ ৳{item.unitPrice.toLocaleString()}
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="text-right shrink-0 min-w-[75px]">
                      <span className="text-sm sm:text-base font-black text-gray-900 font-mono">
                        ৳{item.totalPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Cart Summary Footer */}
                <div className="p-5 bg-pink-50/30 border-t border-pink-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-gray-600 flex items-center gap-3">
                    <span>Total Products: <strong>{totalUniqueProducts}</strong></span>
                    <span>&bull;</span>
                    <span>Total Units: <strong>{totalUnits}</strong></span>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <span className="text-xs uppercase font-extrabold text-gray-500">Cart Total:</span>
                    <span className="text-xl font-black text-[#E91E8C] font-mono">
                      ৳{cartTotalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Security & Observability Note */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
            <ShieldCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Operator Final Checkout Policy</span>
              <p className="text-amber-800/90 text-[11px] leading-relaxed">
                Stock is deducted from inventory only when the staff operator finishes checkout and generates a sales invoice on their terminal. This administrative view provides live observability without altering cart contents.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT (4 COLS): LIVE REALTIME SCAN FEED */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-[32px] border border-pink-100 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/40">
              <div className="flex items-center gap-2">
                <ScanLine size={16} className="text-emerald-600" />
                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                  Live Activity Timeline
                </h3>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                {scans.length} Scans
              </span>
            </div>

            {scans.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-xs text-gray-400">
                <Activity size={20} className="mx-auto text-gray-300" />
                <p>Waiting for operator scans...</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[460px] overflow-y-auto p-2">
                {scans.map((scan, sIdx) => {
                  const scanTime = scan.scanned_at 
                    ? new Date(scan.scanned_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                    : 'Just now';

                  const productDetails = productService.getProductByBarcode(scan.product_id) || productService.getProductById(scan.product_id);
                  const prodName = productDetails?.name || scan.product_name || `Product #${scan.product_id}`;
                  const prodPrice = productDetails?.discountPrice || productDetails?.price || scan.price;

                  return (
                    <div
                      key={scan.id || sIdx}
                      className="p-3 hover:bg-gray-50/60 rounded-xl transition flex items-start gap-3 text-xs"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                        <ScanLine size={13} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-gray-900 text-[11px] truncate">
                            {prodName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                          <span>{scanTime}</span>
                          {prodPrice && <span className="text-emerald-700 font-bold">৳{prodPrice}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
