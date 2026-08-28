import React, { useState } from 'react';
import { Product, StockReceipt } from '../../types';
import { StockInQueueItem } from './types';
import { productService } from '../../services/productService';
import { StockReceiptSlip } from './StockReceiptSlip';
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
  PackageCheck
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
          importCost: it.importCost
        })),
        supplier: supplier.trim() || undefined,
        batchNumber: batchNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        receivedBy: receivedBy.trim() || 'Store Cashier'
      };

      const res = await productService.processStockInBatch(payload);

      if (res.success && res.receipt) {
        setCompletedReceipt(res.receipt);
        setQueue([]);
        setSupplier('');
        setBatchNumber('');
        setNotes('');
      } else {
        setErrorMessage(res.message || 'Failed to process stock intake.');
      }
    } catch (err) {
      console.error('Stock in submission error:', err);
      setErrorMessage('Unexpected error during stock receiving.');
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
              <span>Add From Catalog</span>
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
                  className="pt-3.5 first:pt-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
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

                  {/* Quantity & Import Cost Controls */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0 flex-wrap">
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
          <div>
            <label className="block text-gray-600 font-bold mb-1 flex items-center gap-1 text-[11px]">
              <User size={12} className="text-emerald-600" />
              <span>Received By (Staff / Receiver)</span>
            </label>
            <input
              type="text"
              required
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="e.g. Arif Hossain"
              className="w-full bg-gray-50/50 text-gray-800 px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-emerald-600 focus:bg-white transition"
            />
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
    </form>
  );
};
