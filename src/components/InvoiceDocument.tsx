import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Order } from '../types';

export interface InvoiceDocumentProps {
  order: Order;
  logoUrl?: string;
  className?: string;
}

// Default high-quality circular logo SVG data URI for Korean Skin Food BD
const DEFAULT_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="48" fill="%23C81E78"/><circle cx="50" cy="50" r="44" fill="%23ffffff" stroke="%23FBEAF0" stroke-width="2"/><text x="50" y="42" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="%23C81E78" text-anchor="middle">K</text><text x="50" y="60" font-family="Arial, sans-serif" font-weight="bold" font-size="11" fill="%23993556" text-anchor="middle">BEAUTY</text><path d="M50 66 Q45 74 50 80 Q55 74 50 66 Z" fill="%23C81E78"/></svg>`;

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  order,
  logoUrl = DEFAULT_LOGO,
  className = ''
}) => {
  // Calculate items subtotal
  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate delivery fee logic (if grand total exceeds subtotal or courier fee exists)
  const deliveryFee = order.courier?.deliveryFee !== undefined
    ? order.courier.deliveryFee
    : Math.max(0, order.totalAmount - subtotal);

  // Status color badge logic for Steadfast courier
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'in_transit':
        return (
          <span className="text-[#3B6D11] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
            {status === 'in_transit' ? 'In Transit' : 'Delivered'}
          </span>
        );
      case 'pending':
        return (
          <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
            Pending
          </span>
        );
      case 'cancelled':
      case 'returned':
        return (
          <span className="text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
            {status}
          </span>
        );
      default:
        return (
          <span className="text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
            {status}
          </span>
        );
    }
  };

  const trackingUrl = order.courier?.trackingUrl || (order.courier?.trackingCode ? `https://steadfast.com.bd/t/${order.courier.trackingCode}` : '');

  return (
    <div
      id={`invoice-document-${order.id}`}
      className={`w-full max-w-2xl mx-auto bg-white font-sans text-gray-900 border border-gray-200 rounded-xl overflow-hidden shadow-xs print:shadow-none print:border-none print:m-0 print:w-full ${className}`}
      style={{ backgroundColor: '#ffffff', color: '#111827' }}
    >
      {/* 1. HEADER (background #C81E78, padding ~18-20px) */}
      <div 
        className="px-5 py-4.5 flex items-center justify-between text-white"
        style={{ backgroundColor: '#C81E78' }}
      >
        {/* Left side: circular logo + brand text */}
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="Korean Skin Food BD Logo"
            className="w-[44px] h-[44px] rounded-full object-cover bg-white p-0.5 border border-pink-200/40 shrink-0"
          />
          <div>
            <h1 className="text-[15px] font-bold text-white leading-tight tracking-tight">
              Korean skin food BD
            </h1>
            <p className="text-[11px] text-[#FBEAF0] font-medium">
              Flagship store, Dhaka
            </p>
          </div>
        </div>

        {/* Right side: cash invoice badge + invoice ID */}
        <div className="text-right">
          <div className="bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block backdrop-blur-xs">
            Cash invoice
          </div>
          <div className="text-[12px] font-bold text-white mt-1 font-mono">
            #{order.id}
          </div>
        </div>
      </div>

      {/* 2. TWO-COLUMN INFO ROW (padding ~18-24px, thin bottom border) */}
      <div className="px-6 py-5 border-b border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
        {/* Left Column: Customer */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#993556]">
            CUSTOMER
          </div>
          <div className="text-[13px] font-bold text-gray-900">
            {order.customerName || 'In-Person Customer'}
          </div>
          <div className="text-[12px] text-gray-600 font-medium font-mono">
            {order.customerPhone || 'N/A'}
          </div>
          <div className="text-[11px] text-gray-500 leading-snug">
            {order.address || 'In-Store Checkout'}
          </div>
        </div>

        {/* Right Column: Courier - Steadfast (ONLY rendered if order has courier data) */}
        {order.courier ? (
          <div className="space-y-1.5 bg-pink-50/30 p-3 rounded-lg border border-pink-100 text-[11px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#993556] mb-1">
              COURIER - STEADFAST
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-500">CN ID:</span>
              <span className="font-bold text-gray-900 font-mono">{order.courier.consignmentId}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500">Status:</span>
              {getStatusBadge(order.courier.status)}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500">COD:</span>
              <span className="font-bold text-gray-900 font-mono">৳{order.courier.codAmount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500">Delivery fee:</span>
              <span className="font-bold text-gray-900 font-mono">৳{order.courier.deliveryFee.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-right md:text-left">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#993556]">
              ORDER INFORMATION
            </div>
            <div className="text-[12px] text-gray-600">
              Source: <span className="font-bold text-gray-900">{order.order_source || 'POS'}</span>
            </div>
            <div className="text-[12px] text-gray-600">
              Date: <span className="font-medium text-gray-800">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="text-[12px] text-gray-600">
              Payment: <span className="font-bold text-gray-900">{order.paymentMethod === 'POS_In_Person' ? 'POS In Person' : 'COD'}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. ITEM TABLE (padding ~14-24px) */}
      <div className="px-6 py-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-[#ED93B1]">
              <th className="py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[#993556]">
                ITEM
              </th>
              <th className="py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[#993556]">
                PRICE
              </th>
              <th className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[#993556]">
                QTY
              </th>
              <th className="py-2 text-right text-[10px] font-bold uppercase tracking-wider text-[#993556]">
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-[12px]">
            {order.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50">
                <td className="py-2.5 pr-2 font-semibold text-gray-800">
                  <div>{item.name}</div>
                  {item.pricingType === 'wholesale' && (
                    <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      Wholesale ({item.pricingTier || 'Tier'})
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-right font-mono text-gray-500 whitespace-nowrap">
                  ৳{item.price.toLocaleString()}
                </td>
                <td className="py-2.5 text-center font-mono text-gray-600">
                  x{item.quantity}
                </td>
                <td className="py-2.5 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                  ৳{(item.price * item.quantity).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. BOTTOM ROW (flex row, space-between, items aligned to bottom) */}
      <div className="px-6 py-4 flex items-end justify-between border-t border-gray-100">
        {/* Left: QR code tracking (only if courier trackingUrl exists) */}
        <div className="flex flex-col items-center">
          {trackingUrl ? (
            <>
              <div className="p-1 bg-white border border-gray-200 rounded-lg shadow-2xs">
                <QRCodeSVG
                  value={trackingUrl}
                  size={76}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <span className="text-[9px] text-gray-400 font-medium text-center mt-1 uppercase tracking-wider">
                Track order
              </span>
            </>
          ) : (
            <div className="text-[10px] text-gray-400 italic">
              Official Store Invoice
            </div>
          )}
        </div>

        {/* Right: Totals block (~220px) */}
        <div className="w-[220px] text-right space-y-1.5 text-[12px]">
          <div className="flex justify-between items-center text-gray-600">
            <span>Subtotal</span>
            <span className="font-mono font-medium text-gray-800">৳{subtotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span>Delivery</span>
            <span className="font-mono font-medium text-gray-800">৳{deliveryFee.toLocaleString()}</span>
          </div>

          <div className="border-t-2 border-gray-900 pt-2 flex justify-between items-center mt-2">
            <span className="text-[14px] font-bold text-gray-900">Total paid</span>
            <span className="text-[16px] font-extrabold text-[#993556] font-mono">
              ৳{order.totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 5. FOOTER (padding ~18-24px, centered text, thin top border) */}
      <div className="px-6 py-4 border-t border-gray-200 mt-2 text-center text-[11px] text-gray-500 space-y-0.5 bg-gray-50/50">
        <p className="font-medium text-gray-600">Thank you for choosing Korean skin food BD.</p>
        <p className="text-gray-400">Exchange available within 7 days with receipt.</p>
      </div>
    </div>
  );
};

export default InvoiceDocument;
