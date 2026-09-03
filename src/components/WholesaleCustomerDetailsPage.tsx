import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { WholesaleCustomer, WholesaleOrder, WholesalePayment } from '../types';
import { wholesaleService, wholesaleLedgerService } from '../services/wholesaleService';
import { wholesaleOrderService } from '../services/wholesaleOrderService';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  ArrowLeft, 
  Phone, 
  MapPin, 
  Globe, 
  Facebook, 
  Instagram, 
  Receipt, 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  FileText, 
  Truck, 
  CreditCard,
  ShieldAlert
} from 'lucide-react';

export function WholesaleCustomerDetailsPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, isAdmin } = useAuth();

  const [customer, setCustomer] = useState<WholesaleCustomer | null>(null);
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [payments, setPayments] = useState<WholesalePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Order for Details Modal
  const [selectedOrder, setSelectedOrder] = useState<WholesaleOrder | null>(null);

  // Pagination for Order History & Payment History
  const [orderPage, setOrderPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    async function loadData() {
      if (!customerId) return;
      setLoading(true);
      setError(null);
      try {
        const [custData, ordersData, paymentsData] = await Promise.all([
          wholesaleService.getWholesaleCustomer(customerId),
          wholesaleOrderService.getWholesaleOrders(customerId),
          wholesaleLedgerService.getPayments(customerId).catch(() => [])
        ]);

        if (!custData) {
          setError('Wholesale customer not found.');
        } else {
          setCustomer(custData);
          setOrders(ordersData || []);
          setPayments(paymentsData || []);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load wholesale customer details');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [customerId]);

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-100 mt-6 max-w-md mx-auto">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-600">Only administrators have access to wholesale customer financial records.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading wholesale customer profile...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-100 mt-6 max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
        <p className="text-slate-600 mb-6">{error || 'Customer not found.'}</p>
        <Link 
          to="/admin/wholesale"
          className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
        >
          Back to Wholesale Management
        </Link>
      </div>
    );
  }

  // Computed Financials across loaded orders or customer record
  const totalWholesaleCost = orders.reduce((sum, o) => sum + (o.totalWholesaleCost || 0), 0);
  const totalCODValue = orders.reduce((sum, o) => sum + (o.totalCODValue || 0), 0);
  const totalProfit = orders.reduce((sum, o) => sum + (o.totalProfit || 0), 0);
  const totalPaid = customer.totalPaid || payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalDue = customer.totalDue !== undefined ? customer.totalDue : Math.max(0, totalCODValue - totalPaid);

  // Pagination slices
  const totalOrderPages = Math.ceil(orders.length / itemsPerPage) || 1;
  const paginatedOrders = orders.slice((orderPage - 1) * itemsPerPage, orderPage * itemsPerPage);

  const totalPaymentPages = Math.ceil(payments.length / itemsPerPage) || 1;
  const paginatedPayments = payments.slice((paymentPage - 1) * itemsPerPage, paymentPage * itemsPerPage);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Back & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/admin/wholesale"
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition shadow-sm"
          >
            <ArrowLeft size={20} />
          </Link>

          {(customer.logoUrl || customer.businessLogoUrl) ? (
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
              <img 
                src={customer.logoUrl || customer.businessLogoUrl} 
                alt={customer.businessName || customer.name} 
                className="w-full h-full object-contain" 
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 font-black">
              <Building2 size={24} />
            </div>
          )}

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{customer.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                customer.status === 'active' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : customer.status === 'pending'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {customer.status === 'active' ? <CheckCircle2 size={12} className="mr-1" /> : <Clock size={12} className="mr-1" />}
                {customer.status.toUpperCase()}
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium mt-0.5">
              {customer.businessName || customer.pageName || 'Independent Wholesaler'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer ID:</span>
          <code className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono">{customer.id}</code>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Information</h3>
          <div className="flex items-center gap-3 text-slate-700 font-medium">
            <Phone size={16} className="text-indigo-600" />
            <span>{customer.phone}</span>
            {customer.altPhone && <span className="text-slate-400 text-xs">(Alt: {customer.altPhone})</span>}
          </div>
          {customer.email && (
            <div className="flex items-center gap-3 text-slate-700 font-medium">
              <Building2 size={16} className="text-indigo-600" />
              <span>{customer.email}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business & Location</h3>
          <div className="flex items-center gap-3 text-slate-700 font-medium">
            <Building2 size={16} className="text-indigo-600" />
            <span>{customer.businessName || 'N/A'} {customer.pageName ? `(${customer.pageName})` : ''}</span>
          </div>
          <div className="flex items-start gap-3 text-slate-700 font-medium">
            <MapPin size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
            <span>{customer.location || customer.businessAddress || 'Location not specified'}</span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Social Channels</h3>
          <div className="flex flex-wrap gap-2">
            {customer.facebookPageUrl && (
              <a 
                href={customer.facebookPageUrl} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-lg transition"
              >
                <Facebook size={14} /> Facebook Page
              </a>
            )}
            {customer.instagramUrl && (
              <a 
                href={customer.instagramUrl} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-700 hover:bg-pink-100 text-xs font-bold rounded-lg transition"
              >
                <Instagram size={14} /> Instagram
              </a>
            )}
            {customer.websiteUrl && (
              <a 
                href={customer.websiteUrl} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-lg transition"
              >
                <Globe size={14} /> Website
              </a>
            )}
            {!customer.facebookPageUrl && !customer.instagramUrl && !customer.websiteUrl && (
              <span className="text-sm text-slate-400 font-medium italic">No social links registered</span>
            )}
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Orders</span>
          <div className="text-2xl font-black text-slate-900">{orders.length}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">Wholesale Cost</span>
          <div className="text-2xl font-black text-indigo-900">৳{totalWholesaleCost.toLocaleString()}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1">COD / Selling</span>
          <div className="text-2xl font-black text-emerald-900">৳{totalCODValue.toLocaleString()}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block mb-1">Total Profit</span>
          <div className="text-2xl font-black text-teal-700">৳{totalProfit.toLocaleString()}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">Total Paid</span>
          <div className="text-2xl font-black text-blue-700">৳{totalPaid.toLocaleString()}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm bg-rose-50/30">
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block mb-1">Current Due</span>
          <div className="text-2xl font-black text-rose-700">৳{totalDue.toLocaleString()}</div>
        </div>
      </div>

      {/* Order History Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Receipt size={18} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Wholesale Order History</h2>
              <p className="text-xs font-medium text-slate-500">All wholesale orders placed by this customer</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200">
            {orders.length} Orders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500 tracking-wider">
                <th className="p-4">Order ID</th>
                <th className="p-4">Date</th>
                <th className="p-4">Products & Qty</th>
                <th className="p-4 text-right">Wholesale Cost</th>
                <th className="p-4 text-right">COD Value</th>
                <th className="p-4 text-right">Profit</th>
                <th className="p-4 text-right">Paid / Due</th>
                <th className="p-4 text-center">Type</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-500 font-medium">
                    No wholesale orders found for this customer.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map(order => {
                  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
                  const firstProdName = order.items[0]?.productName || 'Product';
                  const moreCount = order.items.length > 1 ? ` +${order.items.length - 1} more` : '';
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-indigo-600 text-sm">
                        {order.orderNumber || order.id.slice(0, 8)}
                      </td>
                      <td className="p-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">{firstProdName}{moreCount}</div>
                        <div className="text-xs text-slate-500 font-medium">Qty: {totalQty} units</div>
                      </td>
                      <td className="p-4 text-right font-black text-slate-800">
                        ৳{(order.totalWholesaleCost || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-black text-emerald-700">
                        ৳{(order.totalCODValue || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-black text-teal-700">
                        ৳{(order.totalProfit || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-black text-blue-700 text-sm">৳{(order.paidAmount || 0).toLocaleString()}</div>
                        <div className="font-bold text-rose-600 text-xs">Due: ৳{(order.dueAmount || 0).toLocaleString()}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded border border-slate-200">
                          {order.checkoutInfo.checkoutType}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          order.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition inline-flex items-center gap-1.5"
                        >
                          <Eye size={14} /> Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Order Pagination */}
        {totalOrderPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-xs font-bold text-slate-500">
              Showing page {orderPage} of {totalOrderPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOrderPage(p => Math.max(p - 1, 1))}
                disabled={orderPage === 1}
                className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700 disabled:opacity-50 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setOrderPage(p => Math.min(p + 1, totalOrderPages))}
                disabled={orderPage === totalOrderPages}
                className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700 disabled:opacity-50 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment History Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Wholesale Payment History</h2>
              <p className="text-xs font-medium text-slate-500">Recorded payments and ledger settlements</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
            {payments.length} Payments
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500 tracking-wider">
                <th className="p-4">Date</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Method</th>
                <th className="p-4">Reference / Order ID</th>
                <th className="p-4">Recorded By</th>
                <th className="p-4">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                    No payment records found for this wholesaler.
                  </td>
                </tr>
              ) : (
                paginatedPayments.map(payment => (
                  <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-xs font-semibold text-slate-600">
                      {new Date(payment.createdAt).toLocaleDateString()} {new Date(payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 font-black text-emerald-600 text-base">
                      ৳{(payment.amount || 0).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200">
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs font-bold text-indigo-600">
                      {payment.reference || payment.orderId || 'General Deposit'}
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-700">
                      {payment.createdBy || 'Admin'}
                    </td>
                    <td className="p-4 text-xs text-slate-500 italic max-w-xs truncate">
                      {payment.note || 'No note provided'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Payment Pagination */}
        {totalPaymentPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-xs font-bold text-slate-500">
              Showing page {paymentPage} of {totalPaymentPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaymentPage(p => Math.max(p - 1, 1))}
                disabled={paymentPage === 1}
                className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700 disabled:opacity-50 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPaymentPage(p => Math.min(p + 1, totalPaymentPages))}
                disabled={paymentPage === totalPaymentPages}
                className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700 disabled:opacity-50 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Receipt className="text-indigo-600" size={20} />
                  Order Details: #{selectedOrder.orderNumber || selectedOrder.id}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()} • Status: <span className="uppercase text-indigo-600 font-bold">{selectedOrder.status}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition cursor-pointer"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Products Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Order Items & Pricing</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                        <th className="p-3">Product</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Wholesale Price</th>
                        <th className="p-3 text-right">COD Price</th>
                        <th className="p-3 text-right">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{item.productName}</div>
                            {item.sku && <div className="text-xs text-slate-400 font-mono">SKU: {item.sku}</div>}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">{item.quantity}</td>
                          <td className="p-3 text-right font-medium text-slate-700">৳{(item.wholesaleUnitPrice || item.wholesaleCost || 0).toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-emerald-700">৳{(item.CODUnitPrice || item.CODValue || 0).toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-teal-700">৳{(item.profit || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Checkout / Delivery Information */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Checkout & Delivery Information</h4>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-500">Checkout Type:</span>
                    <span className="font-black text-indigo-700 px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                      {selectedOrder.checkoutInfo.checkoutType}
                    </span>
                  </div>
                  {selectedOrder.checkoutInfo.checkoutType === 'COD' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-500">Delivery Name:</span>
                        <span className="font-semibold text-slate-800">{(selectedOrder.checkoutInfo as any).deliveryName || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-500">Delivery Phone:</span>
                        <span className="font-semibold text-slate-800">{(selectedOrder.checkoutInfo as any).deliveryPhone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-500">Delivery Address:</span>
                        <span className="font-semibold text-slate-800 text-right max-w-md">{(selectedOrder.checkoutInfo as any).deliveryAddress || 'N/A'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-500">Parcel ID / Velouria ID:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {(selectedOrder.checkoutInfo as any).parcelId || (selectedOrder.checkoutInfo as any).velouriaId || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-500">Recipient Name:</span>
                        <span className="font-semibold text-slate-800">{(selectedOrder.checkoutInfo as any).deliveryName || 'N/A'}</span>
                      </div>
                    </>
                  )}
                  {selectedOrder.checkoutInfo.orderNote && (
                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <span className="font-bold text-slate-500 block mb-1">Order Note:</span>
                      <p className="text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                        {selectedOrder.checkoutInfo.orderNote}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Financial Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl text-center">
                    <span className="text-xs font-bold text-indigo-600 block mb-1">Wholesale Cost</span>
                    <span className="font-black text-indigo-900 text-lg">৳{(selectedOrder.totalWholesaleCost || 0).toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-center">
                    <span className="text-xs font-bold text-emerald-600 block mb-1">COD Value</span>
                    <span className="font-black text-emerald-900 text-lg">৳{(selectedOrder.totalCODValue || 0).toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-teal-50/50 border border-teal-200 rounded-xl text-center">
                    <span className="text-xs font-bold text-teal-600 block mb-1">Total Profit</span>
                    <span className="font-black text-teal-900 text-lg">৳{(selectedOrder.totalProfit || 0).toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl text-center">
                    <span className="text-xs font-bold text-blue-600 block mb-1">Paid</span>
                    <span className="font-black text-blue-900 text-lg">৳{(selectedOrder.paidAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl text-center">
                    <span className="text-xs font-bold text-rose-600 block mb-1">Due</span>
                    <span className="font-black text-rose-900 text-lg">৳{(selectedOrder.dueAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition text-sm"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
