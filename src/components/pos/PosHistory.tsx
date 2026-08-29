import React, { useState, useEffect } from 'react';
import { Order, StockReceipt } from '../../types';
import { productService } from '../../services/productService';
import { posService } from '../../services/posService';
import { InvoiceDocument } from '../InvoiceDocument';
import { StockReceiptSlip } from './StockReceiptSlip';
import { PosLiveRecords } from './PosLiveRecords';
import { PosLiveDetail } from './PosLiveDetail';
import { printInvoice, downloadInvoicePDF } from '../../utils/invoicePdf';
import { 
  ShoppingBag, 
  PackageCheck, 
  Search, 
  Printer, 
  Download, 
  Eye, 
  X, 
  Clock, 
  Calendar, 
  Building2, 
  User, 
  Receipt,
  FileText
} from 'lucide-react';

interface PosHistoryProps {
  orders: Order[];
  userRole?: string;
  initialSelectedLiveSessionId?: string | null;
  onClearSelectedLiveSession?: () => void;
}

export const PosHistory: React.FC<PosHistoryProps> = ({ 
  orders,
  userRole,
  initialSelectedLiveSessionId = null,
  onClearSelectedLiveSession
}) => {
  const isAdminOrSuperAdmin = userRole === 'admin' || userRole === 'super_admin';
  const [historyTab, setHistoryTab] = useState<'live' | 'sales' | 'stock_in'>(
    initialSelectedLiveSessionId && isAdminOrSuperAdmin ? 'live' : 'sales'
  );
  const [selectedLiveSessionId, setSelectedLiveSessionId] = useState<string | null>(initialSelectedLiveSessionId);
  const [liveSessionsCount, setLiveSessionsCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [receipts, setReceipts] = useState<StockReceipt[]>(productService.getStockReceipts());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<StockReceipt | null>(null);

  // Synchronize when initialSelectedLiveSessionId changes from outside
  useEffect(() => {
    if (initialSelectedLiveSessionId && isAdminOrSuperAdmin) {
      setSelectedLiveSessionId(initialSelectedLiveSessionId);
      setHistoryTab('live');
    }
  }, [initialSelectedLiveSessionId, isAdminOrSuperAdmin]);

  // Subscribe to live sessions count in real-time
  useEffect(() => {
    if (!isAdminOrSuperAdmin) return;
    const unsub = posService.subscribeActiveSessions((sessions) => {
      setLiveSessionsCount(sessions.length);
    });
    return () => unsub();
  }, [isAdminOrSuperAdmin]);

  useEffect(() => {
    const unsub = productService.subscribeStockReceipts((newReceipts) => {
      setReceipts(newReceipts);
    });
    return () => unsub();
  }, []);

  const handleSelectLiveSession = (sId: string) => {
    setSelectedLiveSessionId(sId);
  };

  const handleBackFromLiveDetail = () => {
    setSelectedLiveSessionId(null);
    if (onClearSelectedLiveSession) {
      onClearSelectedLiveSession();
    }
  };

  // Filter POS sales only
  const posOrders = orders.filter((o) => o.order_source === 'POS' || o.sessionType === 'POS');

  const filteredOrders = posOrders.filter((o) => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return true;
    return (
      o.id.toLowerCase().includes(term) ||
      o.customerName?.toLowerCase().includes(term) ||
      o.customerPhone?.toLowerCase().includes(term) ||
      o.items.some((it) => it.name.toLowerCase().includes(term))
    );
  });

  const filteredReceipts = receipts.filter((r) => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return true;
    return (
      r.receiptNumber.toLowerCase().includes(term) ||
      r.supplier?.toLowerCase().includes(term) ||
      r.receivedBy?.toLowerCase().includes(term) ||
      r.batchNumber?.toLowerCase().includes(term) ||
      r.items.some((it) => it.productName.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Tab Switcher */}
      <div className="bg-white p-5 sm:p-6 rounded-[32px] border border-pink-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Receipt size={18} className="text-[#E91E8C]" />
              <span>POS Records, Live Monitoring & Invoices</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isAdminOrSuperAdmin
                ? 'Monitor live staff registers, review sales records, reprint cash invoices, and audit intake vouchers'
                : 'Review past transactions, reprint cash invoices, and audit warehouse receiving receipts'}
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200 text-xs font-bold w-full sm:w-auto flex-wrap gap-1">
            {isAdminOrSuperAdmin && (
              <button
                type="button"
                id="tab-history-live-pos"
                onClick={() => {
                  setHistoryTab('live');
                }}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  historyTab === 'live'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span>Live POS ({liveSessionsCount})</span>
              </button>
            )}

            <button
              type="button"
              id="tab-history-sales"
              onClick={() => {
                setHistoryTab('sales');
                setSelectedLiveSessionId(null);
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                historyTab === 'sales'
                  ? 'bg-[#E91E8C] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingBag size={14} />
              <span>POS Sales ({posOrders.length})</span>
            </button>

            <button
              type="button"
              id="tab-history-stock-in"
              onClick={() => {
                setHistoryTab('stock_in');
                setSelectedLiveSessionId(null);
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                historyTab === 'stock_in'
                  ? 'bg-[#1E293B] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <PackageCheck size={14} />
              <span>Stock In Receipts ({receipts.length})</span>
            </button>
          </div>
        </div>

        {/* Search Bar (Only for sales and stock_in tabs) */}
        {historyTab !== 'live' && (
          <div className="relative">
            <Search size={16} className="text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                historyTab === 'sales'
                  ? 'Search by Order ID (e.g. POS-123456), customer name, phone...'
                  : 'Search by Receipt # (e.g. SR-123456), supplier, receiver...'
              }
              className="w-full bg-gray-50/70 text-gray-800 text-xs pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#E91E8C] focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* LIVE POS MONITORING TAB */}
      {historyTab === 'live' && isAdminOrSuperAdmin && (
        <div>
          {selectedLiveSessionId ? (
            <PosLiveDetail
              sessionId={selectedLiveSessionId}
              onBack={handleBackFromLiveDetail}
            />
          ) : (
            <PosLiveRecords
              onSelectSession={handleSelectLiveSession}
              currentUserRole={userRole}
            />
          )}
        </div>
      )}

      {/* SALES HISTORY TAB */}
      {historyTab === 'sales' && (
        <div className="bg-white rounded-[32px] border border-pink-100 shadow-xs overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center space-y-2 text-gray-400">
              <ShoppingBag size={32} className="mx-auto text-pink-300" />
              <p className="text-xs font-bold text-gray-700">No POS orders found</p>
              <p className="text-[11px] text-gray-400">Complete checkout from POS register to view sales here.</p>
            </div>
          ) : (
            <div className="divide-y divide-pink-50">
              {filteredOrders.map((order) => {
                const totalUnits = order.items.reduce((sum, it) => sum + it.quantity, 0);

                return (
                  <div
                    key={order.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-pink-50/30 transition text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-[#E91E8C] text-sm">
                          #{order.id}
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Paid & Delivered
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(order.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600 flex-wrap">
                        <span className="font-bold text-gray-900 flex items-center gap-1">
                          <User size={12} className="text-pink-500" />
                          {order.customerName || 'In-Person Customer'}
                        </span>
                        {order.customerPhone && order.customerPhone !== 'Walk-In' && (
                          <span className="font-mono text-gray-400">({order.customerPhone})</span>
                        )}
                        <span className="text-gray-300">&bull;</span>
                        <span>{totalUnits} items ({order.items.length} unique)</span>
                      </div>

                      <div className="text-[11px] text-gray-400 truncate max-w-md">
                        {order.items.map((it) => `${it.name} (x${it.quantity})`).join(', ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Total</span>
                        <span className="text-base font-black text-gray-900 font-mono">
                          ৳{order.totalAmount.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="bg-pink-50 hover:bg-pink-100 text-pink-700 p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="View Cash Invoice"
                        >
                          <Eye size={14} />
                          <span className="hidden sm:inline">View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => printInvoice(order)}
                          className="bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 p-2 rounded-xl text-xs font-bold transition cursor-pointer"
                          title="Print A4 Invoice"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STOCK IN INTAKE TAB */}
      {historyTab === 'stock_in' && (
        <div className="bg-white rounded-[32px] border border-gray-200 shadow-xs overflow-hidden">
          {filteredReceipts.length === 0 ? (
            <div className="py-16 text-center space-y-2 text-gray-400">
              <PackageCheck size={32} className="mx-auto text-emerald-300" />
              <p className="text-xs font-bold text-gray-700">No stock receiving receipts found</p>
              <p className="text-[11px] text-gray-400">
                Receive shipments through the "Stock In" tab to generate intake vouchers.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        #{receipt.receiptNumber}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Intake Completed
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(receipt.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600 flex-wrap">
                      <span className="font-bold text-gray-900 flex items-center gap-1">
                        <Building2 size={12} className="text-emerald-600" />
                        {receipt.supplier || 'Direct Warehouse Intake'}
                      </span>
                      <span className="text-gray-300">&bull;</span>
                      <span>Received by: <strong>{receipt.receivedBy}</strong></span>
                      <span className="text-gray-300">&bull;</span>
                      <span className="text-emerald-700 font-bold">+{receipt.totalQuantity} units ({receipt.totalItemsCount} products)</span>
                    </div>

                    {receipt.batchNumber && (
                      <div className="text-[10px] text-gray-400 font-mono">
                        Batch/Lot: #{receipt.batchNumber}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                    {receipt.totalCost && (
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Intake Cost</span>
                        <span className="text-base font-black text-gray-900 font-mono">
                          ৳{receipt.totalCost.toLocaleString()}
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedReceipt(receipt)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={14} />
                      <span>View Voucher</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: VIEW ORDER CASH INVOICE */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-[32px] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 relative shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                Cash Invoice #{selectedOrder.id}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <InvoiceDocument order={selectedOrder} />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => printInvoice(selectedOrder)}
                className="flex-1 bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={15} />
                <span>Print Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => downloadInvoicePDF(selectedOrder)}
                className="flex-1 bg-pink-50 border border-pink-100 hover:bg-pink-100 text-pink-700 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download size={15} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW STOCK IN VOUCHER */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-[32px] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 relative shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                Intake Voucher #{selectedReceipt.receiptNumber}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <StockReceiptSlip receipt={selectedReceipt} />
          </div>
        </div>
      )}
    </div>
  );
};
