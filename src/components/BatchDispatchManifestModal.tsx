import React, { useRef } from 'react';
import {
  Printer,
  X,
  Boxes,
  Truck,
  Calendar,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  FileText,
  Package,
  Layers,
  ArrowRight
} from 'lucide-react';
import { WholesaleOrderBatch } from '../types';
import { formatBatchDate } from '../utils/wholesaleBatching';

interface BatchDispatchManifestModalProps {
  batch: WholesaleOrderBatch | null;
  onClose: () => void;
}

export const BatchDispatchManifestModal: React.FC<BatchDispatchManifestModalProps> = ({
  batch,
  onClose
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!batch) return null;

  const handlePrint = () => {
    window.print();
  };

  const isByCustomer = batch.groupBy === 'customer';
  const manifestDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div 
        ref={printContainerRef}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none"
      >
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Batch Dispatch & Packing Manifest
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {batch.id} • {batch.totalOrders} Wholesale Orders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Manifest
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Manifest Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 print:p-0 print:overflow-visible text-slate-900">
          
          {/* Header Block */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-900 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-slate-900">VELOURIA</span>
                <span className="text-xs uppercase font-extrabold px-2 py-0.5 bg-slate-900 text-white rounded-md tracking-wider">
                  B2B Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Wholesale Central Distribution & Warehouse Logistics
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                Dhaka, Bangladesh • Hotline: +880 1700-000000 • support@velouria.com
              </p>
            </div>

            <div className="text-left sm:text-right font-mono text-xs">
              <div className="text-lg font-black text-purple-900 tracking-wider">
                DISPATCH MANIFEST
              </div>
              <div className="text-slate-600 font-bold mt-1">
                Manifest #: <span className="text-slate-900">{batch.id}</span>
              </div>
              <div className="text-slate-500">
                Generated: <strong>{manifestDate}</strong>
              </div>
              <div className="text-slate-500">
                Grouping: <strong>{isByCustomer ? 'By Wholesale Partner' : 'By Order Date'}</strong>
              </div>
            </div>
          </div>

          {/* Recipient / Partner Details (When grouped by Customer) */}
          {isByCustomer && batch.customerDetails && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                  Wholesaler / Client Partner
                </div>
                <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-600" />
                  {batch.customerDetails.customerName}
                </div>
                {batch.customerDetails.customerPhone && (
                  <div className="text-slate-600 font-mono mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {batch.customerDetails.customerPhone}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                  Delivery Destination
                </div>
                <div className="text-slate-700 flex items-start gap-1.5 leading-snug">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{batch.customerDetails.businessAddress || 'Store Pickup / Warehouse Direct'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Grouped by Date Details */}
          {!isByCustomer && (
            <div className="bg-purple-50/60 rounded-xl p-4 border border-purple-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-purple-700" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">
                    Consolidated Dispatch Batch Date
                  </div>
                  <div className="font-black text-sm text-purple-950">
                    {formatBatchDate(batch.date)}
                  </div>
                </div>
              </div>
              <div className="font-mono text-purple-800 font-bold">
                {batch.totalOrders} Orders queued on this date
              </div>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[10px] font-bold uppercase text-slate-400">Total Orders</div>
              <div className="text-xl font-black text-slate-900 font-mono tabular-nums mt-0.5">
                {batch.totalOrders}
              </div>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="text-[10px] font-bold uppercase text-purple-600">Total Units to Pick</div>
              <div className="text-xl font-black text-purple-900 font-mono tabular-nums mt-0.5">
                {batch.totalUnits}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[10px] font-bold uppercase text-slate-400">Batch Value</div>
              <div className="text-xl font-black text-slate-900 font-mono tabular-nums mt-0.5">
                ৳{batch.totalAmount.toLocaleString()}
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="text-[10px] font-bold uppercase text-rose-600">COD / Due to Collect</div>
              <div className="text-xl font-black text-rose-900 font-mono tabular-nums mt-0.5">
                ৳{batch.totalDue.toLocaleString()}
              </div>
            </div>
          </div>

          {/* SECTION 1: CONSOLIDATED WAREHOUSE PICKING LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-purple-700" />
                Consolidated Warehouse Picking List ({batch.consolidatedItems.length} Products)
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Warehouse staff check-off checklist
              </span>
            </div>

            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">Check</th>
                  <th className="py-2.5 px-3">Product Description</th>
                  <th className="py-2.5 px-3 font-mono">SKU / Barcode</th>
                  <th className="py-2.5 px-3 text-center">Total Qty</th>
                  <th className="py-2.5 px-3 text-right">Avg Unit ৳</th>
                  <th className="py-2.5 px-3 text-right">Subtotal ৳</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {batch.consolidatedItems.map((item, idx) => (
                  <tr key={item.productId || idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center">
                      <div className="w-4 h-4 border-2 border-slate-400 rounded-sm mx-auto" />
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {item.productName}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">
                      {item.barcode || '—'}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-black text-purple-700 text-sm">
                      {item.totalQuantity}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">
                      ৳{item.unitPrice ? Math.round(item.unitPrice).toLocaleString() : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      ৳{item.totalValue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-300 text-xs">
                <tr>
                  <td colSpan={3} className="py-2 px-3 text-right text-slate-600">
                    Grand Total Units & Value:
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-black text-purple-900 text-sm">
                    {batch.totalUnits}
                  </td>
                  <td></td>
                  <td className="py-2 px-3 text-right font-mono font-black text-slate-900 text-sm">
                    ৳{batch.totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* SECTION 2: DETAILED ORDER BREAKDOWN */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-700" />
                Batch Orders Breakdown ({batch.orders.length} Consignments)
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Parcel courier tracking & collection
              </span>
            </div>

            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Order #</th>
                  <th className="py-2.5 px-3">Customer / Consignee</th>
                  <th className="py-2.5 px-3">Items Summary</th>
                  <th className="py-2.5 px-3 text-right">Order ৳</th>
                  <th className="py-2.5 px-3 text-right">COD / Due ৳</th>
                  <th className="py-2.5 px-3">Courier / Tracking</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {batch.orders.map((o) => {
                  const itemsCount = (o.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
                  return (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-black text-purple-800">
                        #{o.orderNumber || o.id}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{o.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{o.customerPhone}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {itemsCount} units ({o.items?.length || 0} SKUs)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ৳{o.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600">
                        ৳{(o.dueAmount || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        {o.courier ? (
                          <div className="font-mono text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block">
                            {o.courier.consignmentId || o.courier.trackingCode}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          o.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : o.status === 'shipped'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : o.status === 'packing'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* SECTION 3: WAREHOUSE & DISPATCH SIGNATURES */}
          <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-8">
              <div className="h-10 border-b border-dashed border-slate-400"></div>
              <div>
                <div className="font-bold text-slate-900">Warehouse Picker</div>
                <div className="text-[10px] text-slate-500">Items Gathered & Verified</div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="h-10 border-b border-dashed border-slate-400"></div>
              <div>
                <div className="font-bold text-slate-900">Quality / Packing Officer</div>
                <div className="text-[10px] text-slate-500">Packaged & Box Sealed</div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="h-10 border-b border-dashed border-slate-400"></div>
              <div>
                <div className="font-bold text-slate-900">Courier / Driver Received</div>
                <div className="text-[10px] text-slate-500">Sign & Date</div>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
            This document is an official warehouse packing & dispatch manifest of Velouria Cosmetics Ltd.
            All quantities and parcel conditions must be verified before signing carrier receipt.
          </div>
        </div>
      </div>
    </div>
  );
};
