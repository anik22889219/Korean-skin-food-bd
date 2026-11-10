import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, StockReceipt } from '../../types';
import { StockInQueueItem } from './types';
import { productService } from '../../services/productService';
import { userService } from '../../services/userService';
import { uploadFileToCloudinary, uploadInvoiceImageToCloudinary } from '../../services/cloudinaryService';
import { StockReceiptSlip } from './StockReceiptSlip';
import { findProductByScannedCode } from '../../utils/barcode';
import { playSuccessBeep, playErrorBeep } from '../PosScan';
import { 
  PackagePlus, 
  Trash2, 
  Plus, 
  Minus, 
  Building2, 
  Barcode, 
  FileText, 
  User, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  PackageCheck,
  Search,
  Check,
  Sparkles,
  Calendar,
  Upload,
  Image as ImageIcon,
  X,
  ChevronDown,
  Cloud,
  Settings2
} from 'lucide-react';

interface PosStockInProps {
  products: Product[];
  queue: StockInQueueItem[];
  setQueue: React.Dispatch<React.SetStateAction<StockInQueueItem[]>>;
  onOpenScanner?: () => void;
  onOpenSearch?: () => void;
  staffName?: string;
}

export const PosStockIn: React.FC<PosStockInProps> = ({
  products,
  queue,
  setQueue,
  onOpenScanner,
  onOpenSearch,
  staffName = 'Store Cashier'
}) => {
  const [supplier, setSupplier] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [receivedBy, setReceivedBy] = useState(staffName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedReceipt, setCompletedReceipt] = useState<StockReceipt | null>(null);

  // Invoice Image Upload & Preview State
  const [invoiceImageUrl, setInvoiceImageUrl] = useState<string>('');
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [previewInvoiceModal, setPreviewInvoiceModal] = useState<string | null>(null);
  const invoiceFileInputRef = useRef<HTMLInputElement>(null);

  // Cloudinary Settings State
  const [showCloudinarySettings, setShowCloudinarySettings] = useState(false);
  const [customCloudName, setCustomCloudName] = useState(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('cloudinary_cloud_name') || '' : '';
  });
  const [customUploadPreset, setCustomUploadPreset] = useState(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('cloudinary_upload_preset') || '' : '';
  });
  const [settingsSavedAlert, setSettingsSavedAlert] = useState(false);

  // Searchable Receiver Combobox State
  const [receiverDropdownOpen, setReceiverDropdownOpen] = useState(false);
  const receiverWrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (receiverWrapperRef.current && !receiverWrapperRef.current.contains(e.target as Node)) {
        setReceiverDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Compute available receivers from registered staff + past shipment history
  const availableReceivers = useMemo(() => {
    const list = new Set<string>();
    try {
      const users = userService.getUsers();
      users.forEach((u) => {
        if (['admin', 'super_admin', 'inventory_manager', 'hr', 'customer_support'].includes(u.role)) {
          if (u.name) list.add(u.name.trim());
          else if (u.email) list.add(u.email.split('@')[0]);
        }
      });
    } catch {}

    try {
      const pastReceipts = productService.getStockReceipts();
      pastReceipts.forEach((r) => {
        if (r.receivedBy) list.add(r.receivedBy.trim());
      });
    } catch {}

    if (list.size === 0) {
      list.add('Store Cashier');
      list.add('Inventory Manager');
      list.add('Warehouse Admin');
    }

    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, []);

  const filteredReceivers = useMemo(() => {
    const term = receivedBy.trim().toLowerCase();
    if (!term) return availableReceivers;
    return availableReceivers.filter((r) => r.toLowerCase().includes(term));
  }, [availableReceivers, receivedBy]);

  // Inline Quick Product / Barcode Search
  const [quickQuery, setQuickQuery] = useState('');
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);

  // Filter products for quick search
  const searchResults = useMemo(() => {
    const term = quickQuery.trim().toLowerCase();
    if (!term) return [];
    return products.filter((p) => {
      const matchName = p.name?.toLowerCase().includes(term);
      const matchBrand = p.brand?.toLowerCase().includes(term);
      const matchBarcode = p.barcode?.toLowerCase().includes(term);
      const matchId = p.id?.toLowerCase().includes(term);
      return matchName || matchBrand || matchBarcode || matchId;
    }).slice(0, 8);
  }, [products, quickQuery]);

  const handleAddProductToQueue = (product: Product, addQty: number = 1) => {
    setQueue((prev) => {
      const existing = prev.find((it) => it.product.id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.product.id === product.id ? { ...it, quantity: it.quantity + addQty } : it
        );
      }
      return [{ product, quantity: addQty }, ...prev];
    });
    playSuccessBeep(0.2);
    setQuickFeedback(`✓ Added "${product.name}"`);
    setTimeout(() => setQuickFeedback(null), 3000);
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = quickQuery.trim();
    if (!code) return;

    // Check barcode match first
    const { product } = findProductByScannedCode(products, code);
    if (product) {
      handleAddProductToQueue(product, 1);
      setQuickQuery('');
      return;
    }

    // Check if first search result exists
    if (searchResults.length > 0) {
      handleAddProductToQueue(searchResults[0], 1);
      setQuickQuery('');
      return;
    }

    playErrorBeep();
    setQuickFeedback(`Product or barcode "${code}" not found.`);
    setTimeout(() => setQuickFeedback(null), 3500);
  };

  // Quick quantity modifier
  const handleModifyQty = (productId: string, delta: number) => {
    setQueue((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const handleSetExactQty = (productId: string, rawValue: string) => {
    const parsed = parseInt(rawValue.trim(), 10);
    if (isNaN(parsed) || parsed <= 0) return;
    setQueue((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity: parsed } : item))
    );
  };

  const handleSetImportCost = (productId: string, rawValue: string) => {
    const parsed = parseFloat(rawValue.trim());
    setQueue((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, importCost: isNaN(parsed) ? undefined : parsed }
          : item
      )
    );
  };

  const handleSetExpiryDate = (productId: string, rawValue: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, expiryDate: rawValue.trim() || undefined }
          : item
      )
    );
  };

  /**
   * Downscale and compress image client-side to ensure file size remains tiny (~30KB-60KB)
   */
  const compressImageFile = async (file: File, maxDim = 1000, quality = 0.72): Promise<{ dataUrl: string; blob: Blob }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({ dataUrl, blob });
            } else {
              resolve({ dataUrl, blob: new Blob([dataUrl], { type: 'image/jpeg' }) });
            }
          }, 'image/jpeg', quality);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveCloudinarySettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cloudinary_cloud_name', customCloudName.trim());
      localStorage.setItem('cloudinary_upload_preset', customUploadPreset.trim());
      setSettingsSavedAlert(true);
      setTimeout(() => setSettingsSavedAlert(false), 3000);
    }
  };

  const handleInvoiceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingInvoice(true);
    setUploadProgress(15);
    try {
      // 1. Compress the image locally using canvas (downscales camera photos to ~35-70KB for rapid upload)
      const { dataUrl, blob } = await compressImageFile(file, 1200, 0.76);
      setUploadProgress(30);

      const cleanFileName = `invoice-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      // 2. PRIMARY: Direct upload to Cloudinary (Folder: 'kbeauty_invoices')
      try {
        const cloudRes = await uploadInvoiceImageToCloudinary(blob, cleanFileName, {
          folder: 'kbeauty_invoices',
          cloudName: customCloudName.trim() || undefined,
          uploadPreset: customUploadPreset.trim() || undefined,
          onProgress: (pct) => setUploadProgress(30 + Math.round(pct * 0.65))
        });

        if (cloudRes.success && cloudRes.secureUrl) {
          setInvoiceImageUrl(cloudRes.secureUrl);
          setUploadProgress(100);
          return;
        }
      } catch (cloudErr: any) {
        console.warn('Cloudinary upload encountered an issue, trying server proxy:', cloudErr);
      }

      // 3. Fallback: Local Server Upload Endpoint
      try {
        const uploadRes = await fetch('/api/upload/invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl,
            fileName: file.name
          })
        });

        if (uploadRes.ok) {
          const resData = await uploadRes.json();
          if (resData.success && resData.url) {
            setInvoiceImageUrl(resData.url);
            setUploadProgress(100);
            return;
          }
        }
      } catch (srvErr) {
        console.warn('Local server upload endpoint fallback:', srvErr);
      }

      // 4. Safe compressed data URL fallback (~40KB, safely within Firestore document limits)
      setInvoiceImageUrl(dataUrl);
      setUploadProgress(100);
    } catch (err: any) {
      console.error('Invoice image compression/upload error:', err);
      setErrorMessage('Failed to process invoice image: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsUploadingInvoice(false);
      if (invoiceFileInputRef.current) {
        invoiceFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFromQueue = (productId: string) => {
    setQueue((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearQueue = () => {
    if (window.confirm('Clear all items from the receiving queue?')) {
      setQueue([]);
    }
  };

  // Calculations
  const totalUnits = queue.reduce((sum, it) => sum + it.quantity, 0);
  const totalEstimatedCost = queue.reduce((sum, it) => {
    const cost = it.importCost || it.product.importPrice || 0;
    return sum + cost * it.quantity;
  }, 0);

  // Submit Stock-In Batch
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (queue.length === 0) {
      setErrorMessage('Receiving queue is empty. Scan or search products to receive.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        items: queue.map((it) => ({
          productId: it.product.id,
          quantity: it.quantity,
          importCost: it.importCost,
          expiryDate: it.expiryDate
        })),
        supplier: supplier.trim() || undefined,
        batchNumber: batchNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        receivedBy: receivedBy.trim() || 'Store Cashier',
        invoiceImageUrl: invoiceImageUrl.trim() || undefined
      };

      const res = await productService.processStockInBatch(payload);

      if (res.success && res.receipt) {
        setCompletedReceipt(res.receipt);
        setQueue([]);
        setSupplier('');
        setBatchNumber('');
        setNotes('');
        setInvoiceImageUrl('');
      } else {
        setErrorMessage(res.message || 'Failed to process stock intake.');
      }
    } catch (err: any) {
      console.error('Stock in submission error:', err);
      setErrorMessage(err?.message || 'Unexpected error during stock receiving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If a stock intake was just completed, show the printable voucher slip
  if (completedReceipt) {
    return (
      <StockReceiptSlip
        receipt={completedReceipt}
        onBack={() => setCompletedReceipt(null)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-[#1E293B] text-white p-5 sm:p-6 rounded-[32px] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
            <PackagePlus size={24} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2">
              <span>Stock Receiving / In-Store Stock Intake</span>
            </h2>
            <p className="text-xs text-gray-300 font-medium mt-0.5">
              Receive new shipments, update inventory quantities, and generate audit receipts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Barcode size={15} />
              <span>Scan Barcode</span>
            </button>
          )}

          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 text-white px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>Catalog Browser</span>
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Inline Quick Search & Barcode Intake Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-[28px] border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Search size={15} className="text-emerald-600" />
            <span>Fast Product Lookup / USB Barcode Scanner</span>
          </label>
          <span className="text-[11px] text-gray-500">Scan barcode or type name & press Enter</span>
        </div>

        <div className="relative">
          <Barcode size={18} className="text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={quickInputRef}
            type="text"
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickSubmit(e);
              }
            }}
            placeholder="Scan barcode (e.g. 8809...) or type product name/brand..."
            className="w-full bg-gray-50 text-gray-900 text-xs sm:text-sm pl-11 pr-24 py-3 rounded-2xl border border-gray-300 outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition font-medium"
          />
          <button
            type="button"
            onClick={handleQuickSubmit}
            disabled={!quickQuery.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            + Add Item
          </button>
        </div>

        {quickFeedback && (
          <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-fadeIn">
            {quickFeedback}
          </div>
        )}

        {/* Live Search Suggestions Dropdown */}
        {searchResults.length > 0 && quickQuery.trim() && (
          <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-sm max-h-56 overflow-y-auto">
            {searchResults.map((p) => {
              const inQueue = queue.find((it) => it.product.id === p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    handleAddProductToQueue(p, 1);
                    setQuickQuery('');
                  }}
                  className="p-2.5 hover:bg-emerald-50/50 cursor-pointer flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-9 h-9 object-cover rounded-lg border border-gray-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 text-xs">
                      <span className="text-[10px] font-bold text-pink-600 block uppercase truncate">{p.brand}</span>
                      <h5 className="font-bold text-gray-900 truncate">{p.name}</h5>
                      <span className="text-[11px] text-gray-500 font-mono">Stock: {p.stock} {p.barcode ? `| #${p.barcode}` : ''}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    {inQueue && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-mono">
                        +{inQueue.quantity} in queue
                      </span>
                    )}
                    <button
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                      title="Add to intake queue"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Receiving Queue Card */}
      <div className="bg-white p-5 sm:p-6 rounded-[32px] border border-gray-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <PackageCheck size={18} className="text-emerald-600" />
              <span>Receiving Queue ({queue.length} items)</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Adjust incoming quantities using quick buttons (+1, +5, +10, +50, +100) or direct typing
            </p>
          </div>

          {queue.length > 0 && (
            <button
              type="button"
              onClick={handleClearQueue}
              className="text-xs text-gray-400 hover:text-red-600 font-bold transition cursor-pointer"
            >
              Clear Queue
            </button>
          )}
        </div>

        {queue.length === 0 ? (
          <div className="py-12 text-center space-y-3 text-gray-400">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400 border border-gray-200">
              <PackagePlus size={28} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-700">Stock In Queue is empty</p>
              <p className="text-[11px] text-gray-400">
                Scan product barcodes with mobile camera or search catalog to add items for intake.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 divide-y divide-gray-100">
            {queue.map((item) => {
              const currentStock = item.product.stock;
              const newStock = currentStock + item.quantity;

              return (
                <div
                  key={item.product.id}
                  className="pt-3.5 first:pt-0 space-y-2.5"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {/* Product Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-13 h-13 object-cover rounded-xl border border-gray-200 shadow-2xs shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1 text-xs">
                      <span className="text-[9px] uppercase font-bold text-pink-600 block truncate">
                        {item.product.brand}
                      </span>
                      <h4 className="font-bold text-gray-900 truncate text-xs">{item.product.name}</h4>
                      
                      {/* Stock Change Visualizer */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                        <span className="text-gray-500 font-mono">
                          Current Stock: <strong className="text-gray-800">{currentStock}</strong>
                        </span>
                        <span className="text-gray-400">&rarr;</span>
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-mono font-black border border-emerald-200">
                          New Stock: {newStock} (+{item.quantity})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Item Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0">
                    {/* Quick Step Increment Buttons */}
                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
                      {[1, 5, 10, 50, 100].map((step) => (
                        <button
                          key={step}
                          type="button"
                          onClick={() => handleModifyQty(item.product.id, step)}
                          className="px-2 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-gray-700 font-mono text-[10px] font-bold rounded-lg border border-gray-200 shadow-2xs transition cursor-pointer"
                        >
                          +{step}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Numeric Input & Step Buttons */}
                      <div className="flex items-center bg-white border border-gray-300 rounded-xl shadow-2xs overflow-hidden focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 transition">
                        <button
                          type="button"
                          onClick={() => handleModifyQty(item.product.id, -1)}
                          className="p-2 hover:bg-gray-50 text-gray-600 transition cursor-pointer"
                          title="Decrease (-1)"
                        >
                          <Minus size={13} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleSetExactQty(item.product.id, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-12 text-center text-gray-900 font-mono font-black text-xs py-1.5 border-x border-gray-200 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleModifyQty(item.product.id, 1)}
                          className="p-2 hover:bg-gray-50 text-gray-600 transition cursor-pointer"
                          title="Increase (+1)"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Delete Item */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFromQueue(item.product.id)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition cursor-pointer"
                        title="Remove from intake queue"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Import Cost & Expiry Date Inputs per Queue Item */}
                <div className="flex items-center gap-3 pt-2 border-t border-dashed border-gray-100 flex-wrap text-xs bg-gray-50/50 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-gray-600">Import Cost (৳):</span>
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-[11px] font-mono font-bold text-gray-400 pointer-events-none">৳</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={String(item.product.importPrice || 0)}
                        value={item.importCost !== undefined ? item.importCost : ''}
                        onChange={(e) => handleSetImportCost(item.product.id, e.target.value)}
                        className="w-24 pl-5 pr-2 py-1 bg-white text-gray-800 text-xs font-mono font-bold rounded-lg border border-gray-300 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition"
                        title="Set product import cost per unit"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                      <Calendar size={13} className="text-emerald-600" />
                      <span>Expiry Date:</span>
                    </span>
                    <input
                      type="date"
                      value={item.expiryDate || item.product.expiryDate || ''}
                      onChange={(e) => handleSetExpiryDate(item.product.id, e.target.value)}
                      className="px-2 py-1 bg-white text-gray-800 text-xs font-mono rounded-lg border border-gray-300 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition"
                      title="Product batch expiry date"
                    />
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Receiving Shipment Metadata */}
      <div className="bg-white p-5 sm:p-6 rounded-[32px] border border-gray-200/80 shadow-xs space-y-4 text-xs">
        <div className="border-b border-gray-100 pb-2.5">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 size={15} className="text-emerald-600" />
            <span>Shipment & Intake Audit Metadata</span>
          </h4>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Details for warehouse logs and stock receipt voucher
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="relative" ref={receiverWrapperRef}>
            <label className="block text-gray-600 font-bold mb-1 flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1">
                <User size={12} className="text-emerald-600" />
                <span>Received By (Staff / Receiver)</span>
              </span>
              <span className="text-[10px] text-gray-400 font-normal">Search or type</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={receivedBy}
                onChange={(e) => {
                  setReceivedBy(e.target.value);
                  setReceiverDropdownOpen(true);
                }}
                onFocus={() => setReceiverDropdownOpen(true)}
                placeholder="Type or select staff name..."
                className="w-full bg-gray-50/50 text-gray-800 px-3.5 py-2.5 pr-8 rounded-xl border border-gray-200 outline-none focus:border-emerald-600 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setReceiverDropdownOpen((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                title="Toggle receivers list"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {receiverDropdownOpen && filteredReceivers.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-gray-100 animate-fadeIn">
                {filteredReceivers.map((rec) => (
                  <button
                    key={rec}
                    type="button"
                    onClick={() => {
                      setReceivedBy(rec);
                      setReceiverDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-xs text-gray-800 flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="font-medium">{rec}</span>
                    {receivedBy === rec && <Check size={14} className="text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-1 flex items-center gap-1 text-[11px]">
              <Building2 size={12} className="text-emerald-600" />
              <span>Supplier / Distributor (Optional)</span>
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. Seoul Beauty Export Inc."
              className="w-full bg-gray-50/50 text-gray-800 px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-emerald-600 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-bold mb-1 flex items-center gap-1 text-[11px]">
              <Barcode size={12} className="text-emerald-600" />
              <span>Batch / Container / Invoice # (Optional)</span>
            </label>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="e.g. LOT-2026-KR09"
              className="w-full bg-gray-50/50 text-gray-800 px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-emerald-600 focus:bg-white transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-600 font-bold mb-1 flex items-center gap-1 text-[11px]">
            <FileText size={12} className="text-emerald-600" />
            <span>Intake Notes / Inspection Remarks (Optional)</span>
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Air freight shipment received in perfect condition. Packaging inspected."
            className="w-full bg-gray-50/50 text-gray-800 px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-emerald-600 focus:bg-white transition"
          />
        </div>

        {/* Optional Invoice Image Upload Field */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
            <label className="text-gray-700 font-bold text-[11px] flex items-center gap-1.5">
              <Cloud size={14} className="text-sky-600" />
              <span>Shipment Invoice Document (Cloudinary Hosted)</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCloudinarySettings(!showCloudinarySettings)}
                className="text-[10px] text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition cursor-pointer"
                title="Configure Cloudinary Cloud Name and Upload Preset"
              >
                <Settings2 size={11} />
                <span>Cloudinary Config</span>
              </button>
            </div>
          </div>

          {/* Collapsible Cloudinary Settings Box */}
          {showCloudinarySettings && (
            <div className="bg-sky-50/70 border border-sky-200 p-3.5 rounded-2xl mb-3 text-xs space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sky-900 flex items-center gap-1.5 text-[11px]">
                  <Cloud size={13} className="text-sky-600" />
                  Cloudinary Storage Credentials
                </span>
                {settingsSavedAlert && (
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full animate-pulse">
                    ✓ Saved!
                  </span>
                )}
              </div>
              <p className="text-[11px] text-sky-800">
                Invoices upload to folder <span className="font-mono font-bold bg-sky-100 px-1 py-0.5 rounded">kbeauty_invoices</span>. Defaults to active Cloudinary configuration or set custom below:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-sky-800 mb-0.5">Cloud Name</label>
                  <input
                    type="text"
                    value={customCloudName}
                    onChange={(e) => setCustomCloudName(e.target.value)}
                    placeholder="e.g. dxvmfaxeh"
                    className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-sky-200 text-xs text-gray-800 outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-sky-800 mb-0.5">Upload Preset (Unsigned)</label>
                  <input
                    type="text"
                    value={customUploadPreset}
                    onChange={(e) => setCustomUploadPreset(e.target.value)}
                    placeholder="e.g. ml_default"
                    className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-sky-200 text-xs text-gray-800 outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveCloudinarySettings}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-1 rounded-lg text-[11px] transition shadow-xs cursor-pointer"
                >
                  Save Cloudinary Settings
                </button>
              </div>
            </div>
          )}

          <input
            ref={invoiceFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInvoiceFileChange}
            className="hidden"
          />

          {invoiceImageUrl ? (
            <div className="flex items-center gap-3 bg-sky-50/70 border border-sky-200 p-3 rounded-2xl animate-fadeIn">
              <img
                src={invoiceImageUrl}
                alt="Invoice Preview"
                onClick={() => setPreviewInvoiceModal(invoiceImageUrl)}
                className="w-14 h-14 object-cover rounded-xl border border-sky-300 shadow-xs cursor-pointer hover:opacity-90 transition shrink-0"
                title="Click to view full image"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                    Invoice Document Attached
                  </span>
                  {invoiceImageUrl.includes('cloudinary.com') && (
                    <span className="text-[9px] font-extrabold text-sky-700 bg-sky-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Cloud size={10} /> Cloudinary Hosted
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-700 truncate font-mono">
                  {invoiceImageUrl}
                </p>
                <button
                  type="button"
                  onClick={() => setPreviewInvoiceModal(invoiceImageUrl)}
                  className="text-[11px] text-sky-700 hover:underline font-bold mt-0.5 inline-block cursor-pointer"
                >
                  View Full Image &rarr;
                </button>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceImageUrl('')}
                className="text-gray-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition cursor-pointer shrink-0"
                title="Remove attached invoice"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => invoiceFileInputRef.current?.click()}
                disabled={isUploadingInvoice}
                className="w-full sm:w-auto bg-sky-50 hover:bg-sky-100 hover:border-sky-300 border border-dashed border-sky-300 text-sky-800 px-4 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                {isUploadingInvoice ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-sky-600" />
                    <span>Uploading to Cloudinary... {uploadProgress > 0 ? `${uploadProgress}%` : ''}</span>
                  </>
                ) : (
                  <>
                    <Cloud size={16} className="text-sky-600" />
                    <span>Upload Invoice to Cloudinary</span>
                  </>
                )}
              </button>
              <span className="text-[10px] text-gray-400">or paste Cloudinary URL:</span>
              <input
                type="url"
                value={invoiceImageUrl}
                onChange={(e) => setInvoiceImageUrl(e.target.value)}
                placeholder="https://res.cloudinary.com/..."
                className="flex-1 w-full sm:w-auto bg-gray-50/50 text-gray-800 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-sky-600 focus:bg-white text-xs font-mono"
              />
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Box & Trigger */}
      <div className="bg-gradient-to-b from-gray-900 to-[#1E293B] text-white p-5 sm:p-6 rounded-[32px] shadow-md space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-700 pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">Intake Summary</span>
            <div className="text-sm font-black text-white mt-0.5">
              Receiving <span className="text-emerald-400 font-mono text-base">{totalUnits} units</span> across {queue.length} product(s)
            </div>
          </div>

          {totalEstimatedCost > 0 && (
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Estimated Intake Cost</span>
              <span className="text-base font-black text-emerald-400 font-mono">৳{totalEstimatedCost.toLocaleString()}</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={queue.length === 0 || isSubmitting}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl text-xs sm:text-sm font-extrabold transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-950/40 active:scale-[0.99]"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Updating Warehouse Inventory & Creating Receipt...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              <span>Confirm Stock In & Update Inventory (Generate Receipt)</span>
            </>
          )}
        </button>
      </div>

      {/* Invoice Image Full-Screen Lightbox Modal */}
      {previewInvoiceModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn"
          onClick={() => setPreviewInvoiceModal(null)}
        >
          <div 
            className="relative max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" />
                <span>Shipment Invoice Document Preview</span>
              </h4>
              <button
                type="button"
                onClick={() => setPreviewInvoiceModal(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[75vh] overflow-auto bg-gray-100">
              <img
                src={previewInvoiceModal}
                alt="Shipment Invoice"
                className="max-h-[70vh] object-contain rounded-xl border border-gray-300 shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
