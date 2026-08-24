import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  QrCode,
  Search,
  Filter,
  RefreshCw,
  Eye,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  History,
  ShoppingCart,
  User,
  Phone,
  MapPin,
  Barcode,
  Calendar,
  Layers,
  Sparkles,
  Camera,
  RotateCcw,
  Zap,
  Volume2,
  Upload,
  Focus,
  Maximize2,
  FileText,
  Truck,
  Printer,
  Download,
  ExternalLink,
  Send,
  Loader2
} from 'lucide-react';
import { Order, OrderItem, Product, StockMovement } from '../types';
import { posService } from '../services/posService';
import { productService } from '../services/productService';
import InvoiceDocument from './InvoiceDocument';
import { downloadInvoicePDF, printInvoice } from '../utils/invoicePdf';
import { createSteadfastConsignment } from '../services/steadfastService';
import { 
  findProductByScannedCode, 
  scanBarcodeFromImageFile, 
  scanBarcodeFromLiveVideoSnapshot, 
  applyCameraTrackConstraints, 
  startUnifiedCameraScanner, 
  ScannerController 
} from '../utils/barcode';

// Play instant scan confirmation audio beep
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
    // quiet catch if browser policy restricts web audio before interaction
  }
}

export const AdminOrders: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'movements'>('pending');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'WEBSITE' | 'POS'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Active Fulfillment Order state
  const [activeFulfillmentOrder, setActiveFulfillmentOrder] = useState<Order | null>(null);
  const [scannedInput, setScannedInput] = useState('');
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Camera Barcode Scanner State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [useFrontCamera, setUseFrontCamera] = useState<boolean>(false);
  const [posCameraZoom, setPosCameraZoom] = useState<number>(1.5);
  const [isPhotoScanning, setIsPhotoScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerControllerRef = useRef<ScannerController | null>(null);

  // Manual Restock Modal state
  const [restockProductModal, setRestockProductModal] = useState<Product | null>(null);
  const [restockQuantity, setRestockQuantity] = useState<number>(10);
  const [restockReason, setRestockReason] = useState('New Shipment Stock In');

  // Selected Order Detail View Modal
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Invoice Modal State & Courier Sending State
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<Order | null>(null);
  const [isSteadfastLoading, setIsSteadfastLoading] = useState<boolean>(false);
  const [steadfastNotice, setSteadfastNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Send Order to Steadfast Courier
  const handleSendToSteadfast = async (orderToDispatch: Order) => {
    if (isSteadfastLoading) return;
    setIsSteadfastLoading(true);
    setSteadfastNotice(null);

    try {
      const res = await createSteadfastConsignment(orderToDispatch);
      if (res.success && res.courier) {
        // Save courier data to order in posService & Firestore
        const updated = posService.updateOrderCourier(orderToDispatch.id, res.courier);
        
        // Update state across open modals/views
        const finalOrder = updated || { ...orderToDispatch, courier: res.courier };
        
        setOrders(prev => prev.map(o => o.id === finalOrder.id ? finalOrder : o));
        
        if (invoiceModalOrder?.id === finalOrder.id) {
          setInvoiceModalOrder(finalOrder);
        }
        if (selectedOrderDetails?.id === finalOrder.id) {
          setSelectedOrderDetails(finalOrder);
        }
        if (activeFulfillmentOrder?.id === finalOrder.id) {
          setActiveFulfillmentOrder(finalOrder);
        }

        setSteadfastNotice({
          type: 'success',
          text: `Successfully dispatched to Steadfast! Consignment ID: ${res.courier.consignmentId}`
        });
      } else {
        setSteadfastNotice({
          type: 'error',
          text: res.message || 'Failed to create Steadfast courier consignment.'
        });
      }
    } catch (err: any) {
      console.error('Steadfast consignment error:', err);
      setSteadfastNotice({
        type: 'error',
        text: err.message || 'Error connecting to Steadfast Courier API.'
      });
    } finally {
      setIsSteadfastLoading(false);
    }
  };

  // Auto-refresh interval and initial load
  useEffect(() => {
    const loadData = () => {
      setOrders([...posService.getOrders()]);
      setProducts([...productService.getProducts()]);
      setMovements([...productService.getStockMovements()]);
    };

    loadData();
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keep active fulfillment order updated from latest cache
  useEffect(() => {
    if (activeFulfillmentOrder) {
      const updated = orders.find(o => o.id === activeFulfillmentOrder.id);
      if (updated) {
        setActiveFulfillmentOrder(updated);
      }
    }
  }, [orders]);

  // Focus barcode input when verification view opens
  useEffect(() => {
    if (activeFulfillmentOrder && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [activeFulfillmentOrder]);

  // Initialize camera scanner when camera mode active
  useEffect(() => {
    if (!activeFulfillmentOrder || !isCameraActive) {
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

      await new Promise(r => setTimeout(r, 100));
      if (!active) return;

      try {
        const controller = await startUnifiedCameraScanner({
          containerId: "fulfillment-camera-container",
          useFrontCamera,
          onScanSuccess: (rawCode) => {
            if (active) {
              handleVerifyScan(rawCode);
            }
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
          await applyCameraTrackConstraints("fulfillment-camera-container", {
            zoom: posCameraZoom,
            triggerFocus: true
          });
        } else {
          await controller.stop();
        }
      } catch (err: any) {
        if (active) {
          setCameraError(err?.message || "Could not access camera. Please check browser permissions.");
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
  }, [activeFulfillmentOrder?.id, isCameraActive, useFrontCamera]);

  // Handle camera zoom change
  const handleCameraZoomChange = async (newZoom: number) => {
    setPosCameraZoom(newZoom);
    if (isCameraActive) {
      await applyCameraTrackConstraints("fulfillment-camera-container", { zoom: newZoom, triggerFocus: true });
    }
  };

  // Handle live camera snapshot scan
  const handleLiveLensSnap = async () => {
    setIsPhotoScanning(true);
    setScanMessage({ type: 'info', text: '🔍 Capturing live camera frame for HD barcode detection...' });

    try {
      const scannedText = await scanBarcodeFromLiveVideoSnapshot("fulfillment-camera-container");
      if (scannedText) {
        handleVerifyScan(scannedText);
      } else {
        setScanMessage({
          type: 'error',
          text: 'Could not read barcode from live snapshot. Hold camera steady ~15cm away and try again.'
        });
      }
    } catch (err) {
      setScanMessage({ type: 'error', text: 'Error performing live snapshot scan.' });
    } finally {
      setIsPhotoScanning(false);
    }
  };

  // Handle uploaded photo barcode scan
  const handlePhotoUploadScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsPhotoScanning(true);
    setScanMessage({ type: 'info', text: '🔍 Analyzing uploaded barcode image...' });

    try {
      const scannedText = await scanBarcodeFromImageFile(file);
      if (scannedText) {
        handleVerifyScan(scannedText);
      } else {
        setScanMessage({
          type: 'error',
          text: 'Could not detect barcode from image. Ensure image is clear and well-lit.'
        });
      }
    } catch (err) {
      setScanMessage({ type: 'error', text: 'Error analyzing barcode image.' });
    } finally {
      setIsPhotoScanning(false);
      e.target.value = '';
    }
  };

  // Handle start fulfillment
  const handleStartFulfillment = (order: Order) => {
    const res = posService.startFulfillment(order.id);
    if (res.success && res.order) {
      setActiveFulfillmentOrder(res.order);
      setScanMessage({ type: 'info', text: 'Scan items using camera, USB scanner gun, or quick buttons below.' });
    } else {
      alert(res.message);
    }
  };

  // Handle barcode verification scan
  const handleVerifyScan = (codeToScan?: string) => {
    const code = codeToScan || scannedInput.trim();
    if (!code || !activeFulfillmentOrder) return;

    const res = posService.verifyItemScan(activeFulfillmentOrder.id, code);
    setScannedInput('');

    if (res.success) {
      playScanBeep();
      setScanMessage({ type: 'success', text: `✅ ${res.message}` });
      if (res.isComplete) {
        setScanMessage({ type: 'success', text: '🎉 All items verified! You can now confirm fulfillment and deduct stock.' });
      }
    } else {
      setScanMessage({ type: 'error', text: `❌ ${res.message}` });
    }

    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  // Confirm Fulfillment & Deduct Stock
  const handleConfirmFulfillment = () => {
    if (!activeFulfillmentOrder) return;
    setIsSubmitting(true);

    const res = posService.confirmOrderFulfillment(activeFulfillmentOrder.id, 'Admin Manager');
    setIsSubmitting(false);

    if (res.success) {
      alert(res.message);
      setActiveFulfillmentOrder(null);
      setScanMessage(null);
      setOrders([...posService.getOrders()]);
      setProducts([...productService.getProducts()]);
      setMovements([...productService.getStockMovements()]);
    } else {
      setScanMessage({ type: 'error', text: `❌ ${res.message}` });
    }
  };

  // Cancel Order with Stock Restoration handling
  const handleCancelOrder = (order: Order) => {
    const willRestore = order.stock_deducted;
    const confirmText = willRestore
      ? `Cancel Order #${order.id}?\n\nThis order previously had stock deducted. Stock will be RESTORED (+quantity) back to inventory.`
      : `Cancel Order #${order.id}?\n\nThis order has NOT had stock deducted yet. No stock will be altered.`;

    if (window.confirm(confirmText)) {
      const res = posService.cancelOrder(order.id, 'Cancelled by Admin', 'Admin Manager');
      alert(res.message);
      if (activeFulfillmentOrder?.id === order.id) {
        setActiveFulfillmentOrder(null);
      }
      setOrders([...posService.getOrders()]);
      setProducts([...productService.getProducts()]);
      setMovements([...productService.getStockMovements()]);
    }
  };

  // Submit manual restock
  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProductModal) return;

    const res = productService.restockProduct(restockProductModal.id, restockQuantity, restockReason, 'Admin Manager');
    if (res.success) {
      alert(res.message);
      setRestockProductModal(null);
      setProducts([...productService.getProducts()]);
      setMovements([...productService.getStockMovements()]);
    } else {
      alert(res.message);
    }
  };

  // Filter orders
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'packing');

  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery);

    const matchesSource = sourceFilter === 'ALL' || o.order_source === sourceFilter;
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;

    return matchesSearch && matchesSource && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Package className="w-8 h-8 text-rose-600" />
            Order Management & Fulfillment Hub
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Strict barcode verification for website orders & immediate POS stock synchronization.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => { setActiveTab('pending'); setActiveFulfillmentOrder(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Pending Verification
            {pendingOrders.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-white text-rose-600 rounded-full shadow-xs">
                {pendingOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('all'); setActiveFulfillmentOrder(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            All Orders ({orders.length})
          </button>

          <button
            onClick={() => { setActiveTab('movements'); setActiveFulfillmentOrder(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'movements'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <History className="w-4 h-4" />
            Stock Movement Audit
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTIVE BARCODE FULFILLMENT VERIFICATION SCREEN */}
      {/* ========================================================================= */}
      {activeFulfillmentOrder ? (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-rose-200 overflow-hidden space-y-6 p-6">
          {/* Active Order Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold text-xs uppercase tracking-wider rounded-full border border-amber-200 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  Status: {activeFulfillmentOrder.status.toUpperCase()}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-full border border-slate-200">
                  Source: {activeFulfillmentOrder.order_source}
                </span>
                <span className={`px-3 py-1 font-bold text-xs uppercase tracking-wider rounded-full border ${
                  activeFulfillmentOrder.stock_deducted
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border-rose-200'
                }`}>
                  Stock Deducted: {activeFulfillmentOrder.stock_deducted ? 'YES' : 'NO (Pending Confirmation)'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                Order #{activeFulfillmentOrder.id} Fulfillment Verification
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setInvoiceModalOrder(activeFulfillmentOrder)}
                className="px-3.5 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <FileText className="w-4 h-4 text-[#C81E78]" />
                View Invoice
              </button>

              {activeFulfillmentOrder.courier ? (
                <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>Steadfast CN: #{activeFulfillmentOrder.courier.consignmentId}</span>
                </div>
              ) : (
                <button
                  disabled={isSteadfastLoading}
                  onClick={() => handleSendToSteadfast(activeFulfillmentOrder)}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSteadfastLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Truck className="w-4 h-4" />
                  )}
                  <span>Send to Steadfast</span>
                </button>
              )}

              <button
                onClick={() => setActiveFulfillmentOrder(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
              >
                ← Exit Verification
              </button>
              <button
                onClick={() => handleCancelOrder(activeFulfillmentOrder)}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition-all"
              >
                Cancel Order
              </button>
            </div>
          </div>

          {/* Customer Details Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-slate-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-400">Customer</div>
                <div className="font-bold text-slate-800">{activeFulfillmentOrder.customerName}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-slate-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-400">Phone</div>
                <div className="font-bold text-slate-800">{activeFulfillmentOrder.customerPhone}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-400">Delivery Address</div>
                <div className="font-bold text-slate-800">{activeFulfillmentOrder.address}</div>
              </div>
            </div>
          </div>

          {/* Verification Progress Bar */}
          {(() => {
            const totalRequired = activeFulfillmentOrder.items.reduce((sum, item) => sum + item.quantity, 0);
            const totalScanned = activeFulfillmentOrder.items.reduce((sum, item) => sum + (item.scannedQuantity || 0), 0);
            const percentage = Math.min(100, Math.round((totalScanned / Math.max(1, totalRequired)) * 100));
            const isAllVerified = totalScanned >= totalRequired && activeFulfillmentOrder.items.every(i => (i.scannedQuantity || 0) === i.quantity);

            return (
              <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="flex items-center gap-2">
                    <Barcode className="w-5 h-5 text-rose-400" />
                    Verification Progress ({totalScanned} / {totalRequired} Items Scanned)
                  </span>
                  <span className={isAllVerified ? 'text-emerald-400 font-extrabold' : 'text-amber-400'}>
                    {percentage}% Verified
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isAllVerified ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Live Camera Barcode Scanner Section */}
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-rose-500 animate-pulse" />
                <h3 className="font-extrabold text-base">Live Camera Barcode Scanner</h3>
                <span className="px-2 py-0.5 text-xs font-bold bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-full">
                  Auto-Detect Live Feed
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!isCameraActive ? (
                  <button
                    onClick={() => setIsCameraActive(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                  >
                    <Camera className="w-4 h-4" />
                    Open Camera Scanner
                  </button>
                ) : (
                  <button
                    onClick={() => setIsCameraActive(false)}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all border border-slate-700 text-sm flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4 text-rose-400" />
                    Close Camera
                  </button>
                )}

                <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-sm flex items-center gap-2 transition-all">
                  <Upload className="w-4 h-4 text-rose-400" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUploadScan}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Camera Viewport Container */}
            {isCameraActive && (
              <div className="space-y-3">
                <div className="relative w-full h-72 sm:h-80 bg-black rounded-2xl overflow-hidden border-2 border-rose-500 shadow-2xl">
                  <div id="fulfillment-camera-container" className="w-full h-full object-cover" />

                  {/* Laser & Crosshair Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-36 border-2 border-rose-500/80 rounded-xl relative shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-rose-400 -mt-1 -ml-1 rounded-tl-md" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-rose-400 -mt-1 -mr-1 rounded-tr-md" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-rose-400 -mb-1 -ml-1 rounded-bl-md" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-rose-400 -mb-1 -mr-1 rounded-br-md" />
                      
                      {/* Animated Red Laser Line */}
                      <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_10px_#f43f5e] animate-pulse absolute top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Status Banner inside Video */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs font-bold text-white bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                      Hold item barcode steady inside frame
                    </span>
                    <span className="text-slate-400 font-mono">Zoom: {posCameraZoom}x</span>
                  </div>
                </div>

                {/* Camera Control Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <button
                    disabled={isPhotoScanning}
                    onClick={handleLiveLensSnap}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Focus className="w-3.5 h-3.5" />
                    📸 Snap Live Frame Snapshot
                  </button>

                  <button
                    onClick={() => setUseFrontCamera(!useFrontCamera)}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Flip ({useFrontCamera ? 'Front' : 'Rear'})
                  </button>

                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <span>Zoom:</span>
                    <button
                      onClick={() => handleCameraZoomChange(1.0)}
                      className={`px-2 py-1 rounded text-xs ${posCameraZoom === 1.0 ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                    >
                      1x
                    </button>
                    <button
                      onClick={() => handleCameraZoomChange(1.5)}
                      className={`px-2 py-1 rounded text-xs ${posCameraZoom === 1.5 ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                    >
                      1.5x
                    </button>
                    <button
                      onClick={() => handleCameraZoomChange(2.0)}
                      className={`px-2 py-1 rounded text-xs ${posCameraZoom === 2.0 ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                    >
                      2x
                    </button>
                  </div>
                </div>
              </div>
            )}

            {cameraError && (
              <div className="p-3 bg-rose-500/20 text-rose-200 border border-rose-500/30 rounded-xl text-xs font-bold">
                ⚠️ {cameraError}
              </div>
            )}
          </div>

          {/* Barcode Scanner Input Box */}
          <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-200 space-y-3">
            <label className="block font-bold text-slate-800 text-sm flex items-center gap-2">
              <QrCode className="w-4 h-4 text-rose-600" />
              Scan Item Barcode (Use USB Scanner Gun or Type Barcode):
            </label>
            <div className="flex gap-2">
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan or type barcode (e.g. 8809598450123)..."
                value={scannedInput}
                onChange={(e) => setScannedInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleVerifyScan();
                  }
                }}
                className="flex-1 px-4 py-3 bg-white text-slate-900 border-2 border-slate-300 focus:border-rose-500 font-mono font-bold rounded-xl outline-hidden shadow-xs"
              />
              <button
                onClick={() => handleVerifyScan()}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <Barcode className="w-5 h-5" />
                Scan Item
              </button>
            </div>

            {/* Scan Feedback Message Alert */}
            {scanMessage && (
              <div className={`p-4 rounded-xl text-sm font-bold flex items-start gap-3 transition-all ${
                scanMessage.type === 'success'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : scanMessage.type === 'error'
                  ? 'bg-rose-100 text-rose-900 border border-rose-300 animate-bounce'
                  : 'bg-blue-100 text-blue-900 border border-blue-300'
              }`}>
                {scanMessage.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
                {scanMessage.type === 'error' && <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
                {scanMessage.type === 'info' && <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
                <div>{scanMessage.text}</div>
              </div>
            )}
          </div>

          {/* Items Checklist Cards */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-base flex items-center justify-between">
              <span>Order Items Checklist</span>
              <span className="text-xs text-slate-500 font-normal">Click "Quick Scan" button next to item for fast testing</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeFulfillmentOrder.items.map((item, idx) => {
                const prod = productService.getProductById(item.productId);
                const isVerified = (item.scannedQuantity || 0) >= item.quantity;
                const displayBarcode = item.barcode || (prod ? prod.barcode : 'N/A');
                const productImage = item.image || prod?.image || (prod?.images && prod.images[0]) || '';

                return (
                  <div key={idx} className={`p-4 rounded-xl border transition-all space-y-3 ${
                    isVerified ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}>
                    <div className="flex items-start gap-3">
                      {/* Product Image Thumbnail */}
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative shadow-2xs">
                        {productImage ? (
                          <img
                            src={productImage}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <Package className="w-6 h-6 text-slate-300 absolute -z-10" />
                      </div>

                      {/* Title, Stock & Verified Badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-sm leading-snug line-clamp-2" title={item.name}>
                              {item.name}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span>Catalog Stock: <strong className={prod && prod.stock <= 5 ? 'text-rose-600 font-bold' : 'text-slate-800'}>{prod ? prod.stock : 'Unknown'}</strong> units</span>
                              {item.price > 0 && (
                                <span className="text-[#C81E78] font-bold font-mono">৳{item.price.toLocaleString()}</span>
                              )}
                            </div>
                          </div>

                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200 shrink-0 shadow-2xs">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              VERIFIED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-200 shrink-0 shadow-2xs">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              PENDING
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">Barcode</span>
                        <span className="font-mono text-slate-700 font-bold truncate block">{displayBarcode}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[10px] uppercase">Scanned / Ordered</span>
                        <span className="font-bold text-slate-900">{item.scannedQuantity || 0} / {item.quantity}</span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        disabled={isVerified}
                        onClick={() => handleVerifyScan(displayBarcode !== 'N/A' ? displayBarcode : item.productId)}
                        className={`w-full py-2 px-3 text-xs font-bold rounded-lg transition-all text-center ${
                          isVerified
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-slate-900 text-white shadow-xs'
                        }`}
                      >
                        + Quick Scan Barcode
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Confirmation Footer */}
          {(() => {
            const isFullyVerified = activeFulfillmentOrder.items.every(
              item => (item.scannedQuantity || 0) === item.quantity
            );

            return (
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-500 font-medium">
                  {!isFullyVerified ? (
                    <span className="text-amber-700 font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      All items must be verified before stock can be deducted.
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      All items verified. Ready for atomic stock deduction & order completion.
                    </span>
                  )}
                </div>

                <button
                  disabled={!isFullyVerified || isSubmitting}
                  onClick={handleConfirmFulfillment}
                  className={`w-full sm:w-auto px-8 py-4 rounded-xl font-extrabold text-base transition-all shadow-md flex items-center justify-center gap-3 ${
                    isFullyVerified && !isSubmitting
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  {isSubmitting ? 'Deducting Stock & Completing...' : 'Confirm Order & Deduct Stock'}
                </button>
              </div>
            );
          })()}
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* TAB 1: PENDING WEBSITE ORDERS / FULFILLMENT QUEUE */}
      {/* ========================================================================= */}
      {activeTab === 'pending' && !activeFulfillmentOrder && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5 text-rose-600" />
              Website Order Fulfillment Queue ({pendingOrders.length})
            </h2>
            <span className="text-xs text-slate-500">
              Orders created on Website require barcode verification before stock deduction.
            </span>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">Fulfillment Queue Clear!</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                There are no pending website orders awaiting barcode verification right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingOrders.map(order => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-rose-600 text-base">#{order.id}</span>
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold text-xs uppercase rounded-full border border-amber-200">
                        {order.status.toUpperCase()}
                      </span>
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-bold text-xs uppercase rounded-full border border-slate-200">
                        {order.order_source}
                      </span>
                      <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-bold text-xs uppercase rounded-full border border-rose-200">
                        Stock Deducted: NO
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-900">
                      Customer: {order.customerName} ({order.customerPhone})
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      Delivery: {order.address}
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                        Order Items ({order.items.reduce((s, i) => s + i.quantity, 0)} units):
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {order.items.map((i, iIdx) => {
                          const prod = productService.getProductById(i.productId);
                          const img = i.image || prod?.image || (prod?.images && prod.images[0]) || '';
                          return (
                            <div key={iIdx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 pr-3 shadow-2xs">
                              {img ? (
                                <img
                                  src={img}
                                  alt={i.name}
                                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-500 shrink-0">
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 truncate max-w-[180px]">{i.name}</div>
                                <div className="text-[10px] text-slate-500 font-semibold">Qty: <strong className="text-rose-600">x{i.quantity}</strong> • ৳{i.price.toLocaleString()}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 justify-between md:justify-end">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-semibold">Total Amount</div>
                      <div className="text-lg font-extrabold text-slate-900">৳{order.totalAmount.toLocaleString()}</div>
                    </div>

                    <button
                      onClick={() => handleStartFulfillment(order)}
                      className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 shrink-0"
                    >
                      <Barcode className="w-4 h-4" />
                      Start Fulfillment & Scan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ALL ORDERS TABLE */}
      {/* ========================================================================= */}
      {activeTab === 'all' && !activeFulfillmentOrder && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search by Order ID, Name, Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-rose-500 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <Filter className="w-4 h-4" />
                Source:
                <select
                  value={sourceFilter}
                  onChange={(e: any) => setSourceFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-hidden"
                >
                  <option value="ALL">All Sources</option>
                  <option value="WEBSITE">Website</option>
                  <option value="POS">POS / Offline</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                Status:
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-hidden"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="packing">Packing</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Order Cards Grid System */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {filteredOrders.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No orders found matching selected filters.
              </div>
            ) : (
              filteredOrders.map(order => (
                <div key={order.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between hover:border-rose-300 transition-all">
                  <div className="space-y-2.5">
                    {/* Top Row: Order ID, Source & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-rose-600 text-sm">#{order.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          order.order_source === 'POS'
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : 'bg-blue-100 text-blue-800 border-blue-200'
                        }`}>
                          {order.order_source || 'WEBSITE'}
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        order.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : order.status === 'cancelled'
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="font-bold text-slate-900 text-sm">{order.customerName}</div>
                      <div className="text-xs text-slate-500 font-medium">{order.customerPhone}</div>
                      <div className="text-[10px] text-slate-400 font-medium pt-0.5">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {/* Amount & Stock Info */}
                    <div className="grid grid-cols-2 gap-2 text-xs p-2.5 bg-rose-50/20 rounded-xl border border-rose-100/50">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Total Amount</span>
                        <span className="font-black text-slate-900 text-sm font-mono">৳{order.totalAmount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Stock Deducted</span>
                        {order.stock_deducted ? (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle className="w-3.5 h-3.5" /> YES
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> NO
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedOrderDetails(order)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all"
                        title="View Order Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setInvoiceModalOrder(order)}
                        className="p-1.5 bg-pink-50 hover:bg-pink-100 text-[#C81E78] rounded-lg transition-all border border-pink-200"
                        title="View Shared Invoice"
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => downloadInvoicePDF(order)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                        title="Download PDF Invoice"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {order.courier ? (
                        <span 
                          className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] rounded-full flex items-center gap-1"
                          title={`Steadfast CN: ${order.courier.consignmentId}`}
                        >
                          <Truck className="w-3 h-3 text-emerald-600" />
                          CN #{order.courier.consignmentId}
                        </span>
                      ) : (
                        order.status !== 'cancelled' && (
                          <button
                            disabled={isSteadfastLoading}
                            onClick={() => handleSendToSteadfast(order)}
                            className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 font-bold text-xs rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                            title="Send to Steadfast Courier"
                          >
                            <Truck className="w-3 h-3" /> Steadfast
                          </button>
                        )
                      )}

                      {(order.status === 'pending' || order.status === 'packing') && (
                        <button
                          onClick={() => handleStartFulfillment(order)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1"
                        >
                          <Barcode className="w-3 h-3" /> Fulfill
                        </button>
                      )}

                      {order.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancelOrder(order)}
                          className="px-2 py-1 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 font-bold text-xs rounded-lg transition-all"
                          title="Cancel Order"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STOCK MOVEMENT AUDIT LOG */}
      {/* ========================================================================= */}
      {activeTab === 'movements' && !activeFulfillmentOrder && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-rose-600" />
                Real-Time Stock Movement Audit Trail
              </h2>
              <p className="text-slate-500 text-xs">
                Mandatory logging for all sales (POS & Website fulfillment), returns, restocks, and manual adjustments.
              </p>
            </div>

            <button
              onClick={() => setMovements([...productService.getStockMovements()])}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Log
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {movements.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No stock movements recorded yet.
              </div>
            ) : (
              movements.map(m => (
                <div key={m.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-sm leading-tight">{m.productName}</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-medium">
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border shrink-0 ${
                      m.type === 'sale'
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : m.type === 'return'
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : m.type === 'restock' || m.type === 'stock_in'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {m.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Source</span>
                      <span className="font-bold text-slate-700">{m.source}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Qty Delta</span>
                      <span className={`font-black ${m.quantity < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Stock Shift</span>
                      <span className="font-mono text-[11px] text-slate-800 font-bold">
                        {m.previousStock !== undefined ? `${m.previousStock}→${m.newStock}` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1 font-semibold border-t border-slate-100">
                    <div>By: <span className="text-slate-800">{m.performedBy || 'Staff'}</span></div>
                    {m.orderId && <div className="text-rose-600 font-mono text-[11px]">Order #{m.orderId}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Selected Order Details */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg">
                Order Details #{selectedOrderDetails.id}
              </h3>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <div><strong>Customer:</strong> {selectedOrderDetails.customerName} ({selectedOrderDetails.customerPhone})</div>
              <div><strong>Delivery Address:</strong> {selectedOrderDetails.address}</div>
              <div><strong>Order Source:</strong> {selectedOrderDetails.order_source}</div>
              <div><strong>Stock Deducted:</strong> {selectedOrderDetails.stock_deducted ? 'YES' : 'NO'}</div>
              <div><strong>Status:</strong> {selectedOrderDetails.status.toUpperCase()}</div>
            </div>

            {selectedOrderDetails.courier && (
              <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-3 text-xs space-y-1">
                <div className="font-bold text-emerald-800 uppercase flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Steadfast Courier Dispatched</span>
                </div>
                <div className="text-emerald-900 font-mono">Consignment ID: #{selectedOrderDetails.courier.consignmentId}</div>
                <div className="text-emerald-900 font-mono">Tracking Code: {selectedOrderDetails.courier.trackingCode}</div>
                <div className="text-emerald-700 capitalize">Status: {selectedOrderDetails.courier.status}</div>
              </div>
            )}

            <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
              <div className="font-bold text-xs text-slate-500 uppercase">Items Breakdown</div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {selectedOrderDetails.items.map((item, i) => {
                  const prod = productService.getProductById(item.productId);
                  const img = item.image || prod?.image || (prod?.images && prod.images[0]) || '';
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-800 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {img ? (
                          <img
                            src={img}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-slate-50 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-500 shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate max-w-[200px]" title={item.name}>{item.name}</div>
                          <div className="text-[11px] text-slate-500 font-medium">Qty: <strong className="text-slate-800 font-bold">{item.quantity}</strong> × ৳{item.price.toLocaleString()}</div>
                        </div>
                      </div>
                      <span className="font-black text-slate-900 font-mono text-sm shrink-0">৳{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-slate-900 text-base">
                <span>Total Amount:</span>
                <span className="text-[#C81E78] font-mono">৳{selectedOrderDetails.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setInvoiceModalOrder(selectedOrderDetails);
                  setSelectedOrderDetails(null);
                }}
                className="flex-1 py-2.5 bg-pink-50 hover:bg-pink-100 text-[#C81E78] font-bold text-xs rounded-xl border border-pink-200 transition-all flex items-center justify-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                View Invoice
              </button>

              <button
                onClick={() => downloadInvoicePDF(selectedOrderDetails)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>

              {!selectedOrderDetails.courier && selectedOrderDetails.status !== 'cancelled' && (
                <button
                  disabled={isSteadfastLoading}
                  onClick={() => handleSendToSteadfast(selectedOrderDetails)}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSteadfastLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                  Steadfast
                </button>
              )}
            </div>

            <button
              onClick={() => setSelectedOrderDetails(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Shared Invoice Document Modal Overlay */}
      {invoiceModalOrder && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-slate-100 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden">
            {/* Modal Sticky Top Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C81E78]" />
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  Cash Invoice #{invoiceModalOrder.id}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {invoiceModalOrder.courier ? (
                  <div className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Steadfast CN: #{invoiceModalOrder.courier.consignmentId}</span>
                  </div>
                ) : (
                  invoiceModalOrder.status !== 'cancelled' && (
                    <button
                      disabled={isSteadfastLoading}
                      onClick={() => handleSendToSteadfast(invoiceModalOrder)}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      {isSteadfastLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                      <span>Send to Steadfast Courier</span>
                    </button>
                  )
                )}

                <button
                  onClick={() => printInvoice(invoiceModalOrder)}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print</span>
                </button>

                <button
                  onClick={() => downloadInvoicePDF(invoiceModalOrder)}
                  className="px-3.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-[#C81E78] font-bold text-xs rounded-xl border border-pink-200 transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => { setInvoiceModalOrder(null); setSteadfastNotice(null); }}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all font-bold text-sm ml-2"
                  title="Close Modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Steadfast Status Notice */}
            {steadfastNotice && (
              <div className={`px-6 py-2.5 text-xs font-bold flex items-center gap-2 shrink-0 ${
                steadfastNotice.type === 'success' ? 'bg-emerald-100 text-emerald-900 border-b border-emerald-200' : 'bg-rose-100 text-rose-900 border-b border-rose-200'
              }`}>
                {steadfastNotice.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                <span>{steadfastNotice.text}</span>
              </div>
            )}

            {/* Modal Scrollable Body containing InvoiceDocument */}
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/50">
              <div className="max-w-2xl mx-auto shadow-lg rounded-2xl overflow-hidden">
                <InvoiceDocument order={invoiceModalOrder} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
