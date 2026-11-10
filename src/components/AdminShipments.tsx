import React, { useState, useMemo, useEffect } from 'react';
import { StockReceipt, StockReceiptItem } from '../types';
import { productService } from '../services/productService';
import { userService } from '../services/userService';
import { StockReceiptSlip } from './pos/StockReceiptSlip';
import { 
  PackageCheck, 
  Search, 
  Calendar, 
  User, 
  Building2, 
  Barcode, 
  FileText, 
  Eye, 
  Printer, 
  Image as ImageIcon, 
  X, 
  ChevronDown, 
  ChevronRight, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  Boxes, 
  DollarSign, 
  Clock, 
  Layers,
  ExternalLink,
  Cloud
} from 'lucide-react';

export const AdminShipments: React.FC = () => {
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceiver, setSelectedReceiver] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'last7' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals & Expansion
  const [selectedReceiptForSlip, setSelectedReceiptForSlip] = useState<StockReceipt | null>(null);
  const [previewInvoiceUrl, setPreviewInvoiceUrl] = useState<string | null>(null);
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null);

  // Subscribe to real-time stock receipts
  useEffect(() => {
    setLoading(true);
    const unsub = productService.subscribeStockReceipts((data) => {
      // Sort newest first
      const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReceipts(sorted);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Compute distinct list of receivers from registered staff + past shipments
  const receiversList = useMemo(() => {
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

    receipts.forEach((r) => {
      if (r.receivedBy) list.add(r.receivedBy.trim());
    });

    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [receipts]);

  // Apply Search & Filters
  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      // Receiver filter
      if (selectedReceiver !== 'all' && receipt.receivedBy !== selectedReceiver) {
        return false;
      }

      // Date filtering
      if (receipt.createdAt) {
        const receiptDate = new Date(receipt.createdAt);
        const now = new Date();

        if (datePreset === 'today') {
          const isToday = receiptDate.toDateString() === now.toDateString();
          if (!isToday) return false;
        } else if (datePreset === 'last7') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (receiptDate < sevenDaysAgo) return false;
        } else if (datePreset === 'month') {
          const isThisMonth = 
            receiptDate.getMonth() === now.getMonth() && 
            receiptDate.getFullYear() === now.getFullYear();
          if (!isThisMonth) return false;
        } else if (datePreset === 'custom') {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (receiptDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (receiptDate > end) return false;
          }
        }
      }

      // Search query (receipt #, supplier, batch #, notes, receiver, or item names)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = receipt.receiptNumber?.toLowerCase().includes(q);
        const matchSupplier = receipt.supplier?.toLowerCase().includes(q);
        const matchBatch = receipt.batchNumber?.toLowerCase().includes(q);
        const matchReceiver = receipt.receivedBy?.toLowerCase().includes(q);
        const matchNotes = receipt.notes?.toLowerCase().includes(q);
        const matchItems = receipt.items?.some((it) => 
          it.productName?.toLowerCase().includes(q) || it.barcode?.toLowerCase().includes(q)
        );

        if (!matchNumber && !matchSupplier && !matchBatch && !matchReceiver && !matchNotes && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [receipts, selectedReceiver, datePreset, startDate, endDate, searchQuery]);

  // KPI Calculations
  const totalShipmentsCount = filteredReceipts.length;
  const totalUnitsReceived = filteredReceipts.reduce((sum, r) => sum + (r.totalQuantity || 0), 0);
  const totalIntakeCost = filteredReceipts.reduce((sum, r) => sum + (r.totalCost || 0), 0);
  const uniqueReceiversInView = new Set(filteredReceipts.map((r) => r.receivedBy).filter(Boolean)).size;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedReceiver('all');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header Banner */}
      <div className="bg-[#1E293B] text-white p-6 sm:p-8 rounded-[32px] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
            <PackageCheck size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-400/20 font-mono">
                Inventory Logistics & Intake Audits
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              Shipments & Stock Intake History
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 font-medium mt-0.5">
              Comprehensive log of all received warehouse inventory, physical invoice attachments, and receiver tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <Filter size={14} />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[28px] border border-gray-200/80 shadow-xs space-y-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Total Shipments Logged</span>
          <div className="text-2xl font-black text-gray-900 font-mono tabular-nums">
            {totalShipmentsCount}
          </div>
          <p className="text-[11px] text-gray-400">Intake batches recorded</p>
        </div>

        <div className="bg-white p-5 rounded-[28px] border border-gray-200/80 shadow-xs space-y-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Total Units Ingested</span>
          <div className="text-2xl font-black text-emerald-600 font-mono tabular-nums">
            {totalUnitsReceived.toLocaleString()} pcs
          </div>
          <p className="text-[11px] text-gray-400">Products added to inventory</p>
        </div>

        <div className="bg-white p-5 rounded-[28px] border border-gray-200/80 shadow-xs space-y-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Total Value (Import Cost)</span>
          <div className="text-2xl font-black text-gray-900 font-mono tabular-nums">
            ৳{totalIntakeCost.toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-400">Inventory valuation added</p>
        </div>

        <div className="bg-white p-5 rounded-[28px] border border-gray-200/80 shadow-xs space-y-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Active Receivers</span>
          <div className="text-2xl font-black text-purple-600 font-mono tabular-nums">
            {uniqueReceiversInView}
          </div>
          <p className="text-[11px] text-gray-400">Staff members in view</p>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white p-5 rounded-[28px] border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Receipt #, Supplier, Batch #, or Product..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 text-gray-800 text-xs sm:text-sm rounded-2xl border border-gray-200 outline-none focus:border-emerald-600 focus:bg-white transition"
            />
          </div>

          {/* Receiver / Staff Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-1 shrink-0">
              <User size={13} className="text-emerald-600" />
              <span>Receiver:</span>
            </label>
            <select
              value={selectedReceiver}
              onChange={(e) => setSelectedReceiver(e.target.value)}
              className="bg-gray-50 text-gray-800 text-xs font-bold px-3 py-2.5 rounded-2xl border border-gray-200 outline-none focus:border-emerald-600 focus:bg-white transition cursor-pointer min-w-[160px]"
            >
              <option value="all">All Receivers ({receiversList.length})</option>
              {receiversList.map((rec) => (
                <option key={rec} value={rec}>
                  {rec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter Strip */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-gray-600 flex items-center gap-1 mr-1">
              <Calendar size={13} className="text-emerald-600" />
              <span>Date:</span>
            </span>
            {(['all', 'today', 'last7', 'month', 'custom'] as const).map((preset) => {
              const labels = {
                all: 'All Time',
                today: 'Today',
                last7: 'Last 7 Days',
                month: 'This Month',
                custom: 'Custom Range'
              };
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDatePreset(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    datePreset === preset
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  {labels[preset]}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Pickers */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 animate-fadeIn flex-wrap text-xs">
              <span className="text-gray-500 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 text-gray-800 rounded-xl border border-gray-200 outline-none focus:border-emerald-600 font-mono text-xs"
              />
              <span className="text-gray-500 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 text-gray-800 rounded-xl border border-gray-200 outline-none focus:border-emerald-600 font-mono text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* SHIPMENTS DATA TABLE */}
      <div className="bg-white rounded-[32px] border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400 space-y-2">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-gray-600">Loading stock shipments...</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="py-20 text-center text-gray-400 space-y-3">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400 border border-gray-200">
              <PackageCheck size={28} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700">No shipments matched your filters</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Try adjusting the receiver filter, date range, or search keyword.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Table Header (Desktop) */}
            <div className="hidden lg:grid grid-cols-12 gap-3 px-6 py-3.5 bg-gray-50/80 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
              <div className="col-span-2">Date & Voucher #</div>
              <div className="col-span-2">Supplier & Batch</div>
              <div className="col-span-2">Receiver (Staff)</div>
              <div className="col-span-2 text-right">Items & Units</div>
              <div className="col-span-2 text-right">Total Intake Value</div>
              <div className="col-span-2 text-center">Invoice & Action</div>
            </div>

            {/* Shipment Rows */}
            {filteredReceipts.map((receipt) => {
              const isExpanded = expandedReceiptId === receipt.id;
              const hasInvoice = Boolean(receipt.invoiceImageUrl);

              return (
                <div key={receipt.id} className="transition hover:bg-gray-50/60">
                  {/* Summary Row */}
                  <div className="p-4 sm:p-5 lg:px-6 lg:py-4 flex flex-col lg:grid lg:grid-cols-12 gap-3 items-start lg:items-center">
                    {/* Date & Receipt Number */}
                    <div className="col-span-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedReceiptId(isExpanded ? null : receipt.id)}
                          className="text-gray-400 hover:text-emerald-600 transition cursor-pointer p-0.5"
                          title={isExpanded ? 'Collapse items' : 'Expand items'}
                        >
                          <ChevronRight size={16} className={`transition-transform ${isExpanded ? 'rotate-90 text-emerald-600' : ''}`} />
                        </button>
                        <span className="font-mono font-black text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                          #{receipt.receiptNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono pl-6">
                        {formatDate(receipt.createdAt)}
                      </div>
                    </div>

                    {/* Supplier & Batch */}
                    <div className="col-span-2 text-xs">
                      <div className="font-bold text-gray-900 flex items-center gap-1 truncate">
                        <Building2 size={12} className="text-gray-400 shrink-0" />
                        <span className="truncate">{receipt.supplier || 'Warehouse Direct Intake'}</span>
                      </div>
                      {receipt.batchNumber && (
                        <div className="text-[11px] text-gray-500 font-mono mt-0.5 truncate flex items-center gap-1">
                          <Barcode size={11} className="text-gray-400 shrink-0" />
                          <span>Batch: {receipt.batchNumber}</span>
                        </div>
                      )}
                    </div>

                    {/* Received By (Staff) */}
                    <div className="col-span-2 text-xs">
                      <div className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-800 px-2.5 py-1 rounded-xl font-bold border border-purple-100">
                        <User size={12} className="text-purple-600" />
                        <span className="truncate max-w-[140px]">{receipt.receivedBy || 'Staff Member'}</span>
                      </div>
                    </div>

                    {/* Items & Units */}
                    <div className="col-span-2 lg:text-right text-xs">
                      <span className="font-mono font-black text-gray-900 text-sm">
                        {receipt.totalQuantity} pcs
                      </span>
                      <span className="text-[11px] text-gray-500 block">
                        across {receipt.totalItemsCount || receipt.items?.length || 0} product(s)
                      </span>
                    </div>

                    {/* Total Value */}
                    <div className="col-span-2 lg:text-right text-xs font-mono">
                      {receipt.totalCost ? (
                        <>
                          <span className="font-black text-emerald-700 text-sm block">
                            ৳{receipt.totalCost.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-400">Est. Cost</span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </div>

                    {/* Invoice Image & Actions */}
                    <div className="col-span-2 flex items-center justify-start lg:justify-center gap-2 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                      {/* Invoice Thumbnail */}
                      {hasInvoice ? (
                        <div className="relative group">
                          <img
                            src={receipt.invoiceImageUrl}
                            alt="Invoice"
                            onClick={() => setPreviewInvoiceUrl(receipt.invoiceImageUrl || null)}
                            className="w-9 h-9 object-cover rounded-lg border border-emerald-300 shadow-2xs cursor-pointer group-hover:scale-105 transition"
                            title="Click to view full invoice photo"
                          />
                          {receipt.invoiceImageUrl?.includes('cloudinary.com') && (
                            <span className="absolute -top-1.5 -right-1.5 bg-sky-600 text-white rounded-full p-0.5 shadow-xs" title="Hosted on Cloudinary CDN">
                              <Cloud size={9} />
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-mono py-1 px-2 bg-gray-50 rounded-md border border-gray-200">
                          No Invoice
                        </span>
                      )}

                      {/* View Products Details Button */}
                      <button
                        type="button"
                        onClick={() => setExpandedReceiptId(isExpanded ? null : receipt.id)}
                        className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          isExpanded
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700'
                        }`}
                        title="View item breakdown"
                      >
                        <Eye size={14} />
                        <span className="hidden sm:inline">Items</span>
                      </button>

                      {/* Print Voucher Slip */}
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptForSlip(receipt)}
                        className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                        title="Print / View Receipt Voucher"
                      >
                        <Printer size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Product Breakdown Details Drawer */}
                  {isExpanded && (
                    <div className="bg-gray-50/80 p-4 sm:p-6 border-t border-gray-100 space-y-4 animate-fadeIn">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-200/60 pb-3">
                        <div className="flex items-center gap-2">
                          <Boxes size={16} className="text-emerald-600" />
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-900">
                            Shipment Products Breakdown ({receipt.items?.length || 0} line items)
                          </h4>
                        </div>
                        {receipt.notes && (
                          <div className="text-xs text-gray-600 italic">
                            <span className="font-bold text-gray-700 not-italic">Notes:</span> {receipt.notes}
                          </div>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                              <th className="py-2 pr-3">Product Name</th>
                              <th className="py-2 px-3 text-center">Previous Stock</th>
                              <th className="py-2 px-3 text-center">Intake Qty</th>
                              <th className="py-2 px-3 text-center">Resulting Stock</th>
                              <th className="py-2 px-3 text-right">Import Cost</th>
                              <th className="py-2 pl-3 text-right">Expiry Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200/60">
                            {receipt.items?.map((item, idx) => (
                              <tr key={idx} className="hover:bg-white/60 transition">
                                <td className="py-2.5 pr-3">
                                  <div className="font-bold text-gray-900">{item.productName}</div>
                                  <div className="text-[10px] text-gray-400 font-mono">
                                    {item.brand && <span className="uppercase text-pink-600 mr-1.5">{item.brand}</span>}
                                    {item.barcode && <span>#{item.barcode}</span>}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-gray-500">
                                  {item.previousStock}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-700">
                                  +{item.quantity}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-900">
                                  {item.newStock}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">
                                  {item.importCost ? `৳${item.importCost.toLocaleString()}` : '—'}
                                </td>
                                <td className="py-2.5 pl-3 text-right font-mono">
                                  {item.expiryDate ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                      <Calendar size={11} />
                                      <span>{item.expiryDate}</span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic">Not set</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* INVOICE IMAGE LIGHTBOX MODAL */}
      {previewInvoiceUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn"
          onClick={() => setPreviewInvoiceUrl(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" />
                <span>Original Shipment Invoice Document</span>
              </h4>
              <div className="flex items-center gap-2">
                {previewInvoiceUrl.includes('cloudinary.com') && (
                  <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1 bg-sky-950/70 border border-sky-700/60 px-2.5 py-0.5 rounded-full">
                    <Cloud size={12} className="text-sky-400" />
                    <span>Cloudinary CDN</span>
                  </span>
                )}
                <a
                  href={previewInvoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-gray-300 hover:text-white flex items-center gap-1 bg-white/10 px-3 py-1 rounded-xl transition"
                >
                  <ExternalLink size={12} />
                  <span>Open Full Screen</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewInvoiceUrl(null)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[80vh] overflow-auto bg-gray-100">
              <img
                src={previewInvoiceUrl}
                alt="Shipment Invoice Document"
                className="max-h-[75vh] object-contain rounded-xl border border-gray-300 shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE STOCK RECEIPT SLIP MODAL */}
      {selectedReceiptForSlip && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="relative max-w-2xl w-full my-8 bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Printer size={16} className="text-emerald-400" />
                <span>Stock Receiving Voucher Slip</span>
              </h4>
              <button
                type="button"
                onClick={() => setSelectedReceiptForSlip(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <StockReceiptSlip
                receipt={selectedReceiptForSlip}
                onBack={() => setSelectedReceiptForSlip(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
