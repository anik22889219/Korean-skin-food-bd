import React from 'react';
import { StockReceipt } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, ArrowLeft, CheckCircle2, PackageCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface StockReceiptSlipProps {
  receipt: StockReceipt;
  onBack?: () => void;
}

export const StockReceiptSlip: React.FC<StockReceiptSlipProps> = ({ receipt, onBack }) => {
  const handlePrint = () => {
    const el = document.getElementById(`stock-receipt-${receipt.id}`);
    if (!el) {
      window.print();
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Stock Receipt #${receipt.receiptNumber} - Korean Skin Food BD</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 0; background: white; }
              @page { margin: 10mm; size: auto; }
            }
          </style>
        </head>
        <body class="bg-white p-4">
          ${el.outerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 300);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = async () => {
    const el = document.getElementById(`stock-receipt-${receipt.id}`);
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`StockReceipt-${receipt.receiptNumber}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-emerald-50 border border-emerald-200/80 p-5 rounded-3xl text-center space-y-2 print:hidden shadow-xs">
        <div className="w-12 h-12 bg-white rounded-full border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
          <PackageCheck size={24} />
        </div>
        <h3 className="text-base font-extrabold text-gray-900">Stock Receiving Completed!</h3>
        <p className="text-xs text-gray-600">
          Received <strong>{receipt.totalQuantity} units</strong> across {receipt.totalItemsCount} product(s). Inventory logs updated with full audit trail.
        </p>
      </div>

      {/* Printable Receipt Card */}
      <div
        id={`stock-receipt-${receipt.id}`}
        className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm text-gray-900 font-sans print:border-none print:shadow-none print:m-0"
      >
        {/* Header */}
        <div className="bg-[#1E293B] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-400 font-black text-base">
              K
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">Korean Skin Food BD</h2>
              <p className="text-[11px] text-gray-300 font-medium">Warehouse Inventory Receiving Voucher</p>
            </div>
          </div>

          <div className="text-right">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block">
              STOCK IN INTAKE
            </span>
            <div className="text-xs font-mono font-bold text-white mt-1">
              #{receipt.receiptNumber}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Date & Time</span>
            <span className="font-semibold text-gray-800">
              {new Date(receipt.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Received By</span>
            <span className="font-semibold text-gray-800 truncate block">{receipt.receivedBy}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Supplier</span>
            <span className="font-semibold text-gray-800 truncate block">{receipt.supplier || 'Direct Import / Local'}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Batch / Lot #</span>
            <span className="font-mono font-semibold text-gray-800 truncate block">{receipt.batchNumber || 'N/A'}</span>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="p-6 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400">
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-center">Previous</th>
                  <th className="pb-2 text-center font-extrabold text-[#E91E8C]">+ Received</th>
                  <th className="pb-2 text-center">New Stock</th>
                  {receipt.totalCost ? <th className="pb-2 text-right">Cost (BDT)</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {receipt.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-2.5 pr-2">
                      <div className="font-bold text-gray-900">{it.productName}</div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-2">
                        {it.brand && <span>{it.brand}</span>}
                        {it.barcode && <span className="font-mono">#{it.barcode}</span>}
                      </div>
                    </td>
                    <td className="py-2.5 text-center font-mono text-gray-500">{it.previousStock}</td>
                    <td className="py-2.5 text-center font-mono font-black text-emerald-600 bg-emerald-50/50 rounded-lg">
                      +{it.quantity}
                    </td>
                    <td className="py-2.5 text-center font-mono font-bold text-gray-900">{it.newStock}</td>
                    {receipt.totalCost ? (
                      <td className="py-2.5 text-right font-mono text-gray-700">
                        {it.importCost ? `৳${it.importCost * it.quantity}` : '—'}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Box */}
          <div className="bg-pink-50/40 border border-pink-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-700 block">Total Summary</span>
              <div className="text-gray-700">
                <strong>{receipt.totalItemsCount}</strong> unique item(s) &bull; <strong>{receipt.totalQuantity} pcs</strong> received
              </div>
            </div>

            {receipt.totalCost && (
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Total Intake Cost</span>
                <span className="text-base font-black text-[#E91E8C] font-mono">৳{receipt.totalCost.toLocaleString()}</span>
              </div>
            )}
          </div>

          {receipt.notes && (
            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200/80">
              <strong className="text-gray-900 block text-[11px] mb-0.5">Notes:</strong>
              {receipt.notes}
            </div>
          )}

          {/* Signatures for physical warehouse slip */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-gray-500">
            <div className="border-t border-gray-300 pt-2">
              <p className="font-semibold text-gray-700">Received By (Staff)</p>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{receipt.receivedBy}</p>
            </div>
            <div className="border-t border-gray-300 pt-2">
              <p className="font-semibold text-gray-700">Supervisor / Manager Signature</p>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">Korean Skin Food BD</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-2 print:hidden">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ArrowLeft size={15} />
            <span>Back to Register</span>
          </button>
        )}

        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Printer size={15} />
          <span>Print Slip</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadPDF}
          className="flex-1 bg-pink-50 border border-pink-100 hover:bg-pink-100 text-pink-700 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Download size={15} />
          <span>Download PDF</span>
        </button>
      </div>
    </div>
  );
};
