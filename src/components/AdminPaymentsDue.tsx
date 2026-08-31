import React, { useState, useMemo } from 'react';
import { 
  Order, 
  PaymentMethodType, 
  PaymentStatus 
} from '../types';
import { financeService } from '../services/financeService';
import { useAuth } from '../context/AuthContext';
import { 
  DollarSign, 
  Search, 
  Filter, 
  ArrowUpDown, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Phone, 
  User, 
  Calendar, 
  Receipt, 
  Wallet, 
  Loader2, 
  X, 
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Building2,
  FileSpreadsheet
} from 'lucide-react';

interface AdminPaymentsDueProps {
  orders: Order[];
  onRefreshOrders?: () => void;
}

export default function AdminPaymentsDue({ orders, onRefreshOrders }: AdminPaymentsDueProps) {
  const { profile, user } = useAuth();
  const operatorName = profile?.name || user?.displayName || user?.email || 'Store Admin';

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'WEBSITE' | 'POS' | 'WHOLESALE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'OVERDUE'>('ALL');
  const [sortBy, setSortBy] = useState<'HIGHEST_DUE' | 'OLDEST_DUE' | 'NEWEST' | 'CUSTOMER_NAME'>('HIGHEST_DUE');

  // Collect Due Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectMethod, setCollectMethod] = useState<PaymentMethodType>('CASH');
  const [collectAccount, setCollectAccount] = useState<string>('CASH_REGISTER');
  const [collectNote, setCollectNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // View Details Modal
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // Calculate order due metadata
  const getOrderDueInfo = (order: Order) => {
    const total = Number(order.totalAmount || 0);
    const paid = Number(order.totalPaid ?? (order.isPaid ? total : 0));
    const due = Number(order.dueAmount ?? (order.isPaid ? 0 : Math.max(0, total - paid)));
    const paymentStatus: PaymentStatus = due === 0 ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

    const orderDate = new Date(order.createdAt);
    const daysOld = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = due > 0 && daysOld >= 7;

    const lastPayment = order.paymentTransactions && order.paymentTransactions.length > 0
      ? order.paymentTransactions[order.paymentTransactions.length - 1]
      : null;

    return {
      total,
      paid,
      due,
      paymentStatus,
      daysOld,
      isOverdue,
      lastPayment
    };
  };

  // Filtered and sorted due orders
  const processedOrders = useMemo(() => {
    return orders
      .filter((order) => {
        if (order.status === 'cancelled') return false;

        const info = getOrderDueInfo(order);

        // Status Filter
        if (statusFilter === 'UNPAID' && (info.due <= 0 || info.paid > 0)) return false;
        if (statusFilter === 'PARTIAL' && (info.due <= 0 || info.paid === 0)) return false;
        if (statusFilter === 'OVERDUE' && !info.isOverdue) return false;
        if (statusFilter === 'ALL' && info.due <= 0) return false;

        // Source Filter
        if (sourceFilter === 'WEBSITE' && order.order_source !== 'WEBSITE') return false;
        if (sourceFilter === 'POS' && order.order_source !== 'POS') return false;
        if (sourceFilter === 'WHOLESALE' && order.order_source !== 'WHOLESALE') return false;

        // Search Filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchId = (order.id || '').toLowerCase().includes(q);
          const matchCustomer = (order.customerName || '').toLowerCase().includes(q);
          const matchPhone = (order.customerPhone || '').toLowerCase().includes(q);
          if (!matchId && !matchCustomer && !matchPhone) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const infoA = getOrderDueInfo(a);
        const infoB = getOrderDueInfo(b);

        if (sortBy === 'HIGHEST_DUE') return infoB.due - infoA.due;
        if (sortBy === 'OLDEST_DUE') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === 'NEWEST') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'CUSTOMER_NAME') return (a.customerName || '').localeCompare(b.customerName || '');
        return 0;
      });
  }, [orders, sourceFilter, statusFilter, searchTerm, sortBy]);

  // High-level receivable summary metrics
  const summaryMetrics = useMemo(() => {
    let totalReceivable = 0;
    let unpaidCount = 0;
    let partialCount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let collectedToday = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    orders.forEach((o) => {
      if (o.status === 'cancelled') return;
      const info = getOrderDueInfo(o);
      if (info.due > 0) {
        totalReceivable += info.due;
        if (info.paid === 0) unpaidCount++;
        else partialCount++;

        if (info.isOverdue) {
          overdueCount++;
          overdueAmount += info.due;
        }
      }

      if (o.paymentTransactions) {
        o.paymentTransactions.forEach((tx) => {
          if (tx.receivedAt && tx.receivedAt.startsWith(todayStr)) {
            collectedToday += Number(tx.amount || 0);
          }
        });
      }
    });

    return {
      totalReceivable,
      unpaidCount,
      partialCount,
      overdueCount,
      overdueAmount,
      collectedToday,
      totalDueOrdersCount: unpaidCount + partialCount
    };
  }, [orders]);

  // Open Collect Modal
  const handleOpenCollectModal = (order: Order) => {
    const info = getOrderDueInfo(order);
    setSelectedOrder(order);
    setCollectAmount(String(info.due));
    setCollectMethod('CASH');
    setCollectAccount('CASH_REGISTER');
    setCollectNote('');
    setActionFeedback(null);
  };

  // Submit Collect Payment
  const handleSubmitCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const amountNum = parseFloat(collectAmount);
    const info = getOrderDueInfo(selectedOrder);

    if (isNaN(amountNum) || amountNum <= 0) {
      setActionFeedback({ type: 'error', text: 'Please enter a valid payment amount greater than 0.' });
      return;
    }

    if (amountNum > info.due) {
      setActionFeedback({ type: 'error', text: `Amount cannot exceed current due balance of ৳${info.due}.` });
      return;
    }

    setIsSubmitting(true);
    setActionFeedback(null);

    try {
      const result = await financeService.collectOrderDue({
        orderId: selectedOrder.id,
        amount: amountNum,
        method: collectMethod,
        accountCode: collectAccount,
        note: collectNote || `Due collected by ${operatorName} via ${collectMethod}`,
        receivedBy: operatorName,
        source: 'MANUAL',
        idempotencyKey: `due_collect_${selectedOrder.id}_${Date.now()}`
      });

      if (result.success) {
        setActionFeedback({ type: 'success', text: result.message });
        if (onRefreshOrders) onRefreshOrders();
        setTimeout(() => {
          setSelectedOrder(null);
          setActionFeedback(null);
        }, 1200);
      } else {
        setActionFeedback({ type: 'error', text: result.message });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err?.message || 'Failed to record due collection.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customer Due Payments & Receivables</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track, monitor, and collect outstanding payment dues from Website, POS, and Wholesale customers.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">Total Outstanding Due</div>
              <div className="text-lg font-bold text-amber-900 dark:text-amber-200">
                ৳{summaryMetrics.totalReceivable.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Receivables */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Outstanding</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            ৳{summaryMetrics.totalReceivable.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Across {summaryMetrics.totalDueOrdersCount} unpaid & partial orders
          </div>
        </div>

        {/* Unpaid Orders */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">100% Unpaid Orders</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
            {summaryMetrics.unpaidCount} <span className="text-sm font-normal text-slate-500">orders</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Zero payment collected yet
          </div>
        </div>

        {/* Overdue (>7 Days) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Overdue (&gt;7 Days)</span>
            <div className="p-2 bg-red-50 dark:bg-red-950/50 text-red-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
            ৳{summaryMetrics.overdueAmount.toLocaleString()}
          </div>
          <div className="text-xs text-red-500 dark:text-red-400 mt-1">
            {summaryMetrics.overdueCount} orders overdue for payment
          </div>
        </div>

        {/* Collected Today */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Collected Today</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            ৳{summaryMetrics.collectedToday.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            Successfully deposited to wallets
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order ID, Customer Name, or Phone Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="HIGHEST_DUE">Highest Due First</option>
              <option value="OLDEST_DUE">Oldest Due First</option>
              <option value="NEWEST">Newest Order Date</option>
              <option value="CUSTOMER_NAME">Customer Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Source:</span>
          {(['ALL', 'WEBSITE', 'POS', 'WHOLESALE'] as const).map((source) => (
            <button
              key={source}
              onClick={() => setSourceFilter(source)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                sourceFilter === source
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {source === 'ALL' ? 'All Sources' : source}
            </button>
          ))}

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2" />

          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
          {(['ALL', 'UNPAID', 'PARTIAL', 'OVERDUE'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                statusFilter === status
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {status === 'ALL' ? 'All Active Dues' : status === 'PARTIAL' ? 'Partial' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Order Date</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right text-rose-600 dark:text-rose-400">Due Amount</th>
                <th className="py-3.5 px-4">Payment Status</th>
                <th className="py-3.5 px-4">Last Payment</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {processedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">No Outstanding Due Records Found</p>
                    <p className="text-xs text-slate-400 mt-1">All filtered customer orders have been fully paid or settled.</p>
                  </td>
                </tr>
              ) : (
                processedOrders.map((order) => {
                  const info = getOrderDueInfo(order);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Order ID */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-white">
                        <button
                          onClick={() => setViewingOrder(order)}
                          className="text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1"
                        >
                          #{order.id}
                        </button>
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {order.customerName || 'Walk-In Customer'}
                        </div>
                        {order.customerPhone && (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <a href={`tel:${order.customerPhone}`} className="hover:underline text-slate-600 dark:text-slate-400">
                              {order.customerPhone}
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          order.order_source === 'POS'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : order.order_source === 'WHOLESALE'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {order.order_source || 'POS'}
                        </span>
                      </td>

                      {/* Date & Aging */}
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        <div>{new Date(order.createdAt).toLocaleDateString('en-GB')}</div>
                        {info.daysOld > 0 && (
                          <div className={`text-[11px] font-medium ${info.isOverdue ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                            {info.daysOld}d ago {info.isOverdue && '⚠️ Overdue'}
                          </div>
                        )}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        ৳{info.total.toLocaleString()}
                      </td>

                      {/* Paid */}
                      <td className="py-3.5 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        ৳{info.paid.toLocaleString()}
                      </td>

                      {/* Due */}
                      <td className="py-3.5 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                        ৳{info.due.toLocaleString()}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          info.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : info.paymentStatus === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                        }`}>
                          {info.paymentStatus === 'PARTIALLY_PAID' ? 'PARTIAL' : info.paymentStatus}
                        </span>
                      </td>

                      {/* Last Payment */}
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {info.lastPayment ? (
                          <div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">৳{info.lastPayment.amount}</span>
                            <span className="text-slate-400"> ({info.lastPayment.method})</span>
                            <div className="text-[11px] text-slate-400">
                              {new Date(info.lastPayment.receivedAt).toLocaleDateString('en-GB')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenCollectModal(order)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all inline-flex items-center gap-1"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          Receive Due
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COLLECT DUE MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                <h3 className="font-bold text-lg">Receive Due Payment</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-amber-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmitCollection} className="p-6 space-y-4">
              {/* Order Info Card */}
              <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200 dark:border-amber-900 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Order Reference:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">#{selectedOrder.id}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Customer:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{selectedOrder.customerName} ({selectedOrder.customerPhone})</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-200 dark:border-amber-900 text-center">
                  <div>
                    <div className="text-xs text-slate-500">Order Total</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">৳{selectedOrder.totalAmount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Already Paid</div>
                    <div className="font-bold text-emerald-600">৳{selectedOrder.totalPaid || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Current Due</div>
                    <div className="font-bold text-rose-600">৳{getOrderDueInfo(selectedOrder).due}</div>
                  </div>
                </div>
              </div>

              {/* Amount Input with Quick Buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Collection Amount (BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max={getOrderDueInfo(selectedOrder).due}
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    required
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                {/* Quick select buttons */}
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setCollectAmount(String(getOrderDueInfo(selectedOrder).due))}
                    className="px-2.5 py-1 text-xs font-semibold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-lg hover:bg-amber-200"
                  >
                    Full Due (৳{getOrderDueInfo(selectedOrder).due})
                  </button>
                  {getOrderDueInfo(selectedOrder).due > 500 && (
                    <button
                      type="button"
                      onClick={() => setCollectAmount('500')}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200"
                    >
                      ৳500
                    </button>
                  )}
                  {getOrderDueInfo(selectedOrder).due > 1000 && (
                    <button
                      type="button"
                      onClick={() => setCollectAmount('1000')}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200"
                    >
                      ৳1,000
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Method & Destination Wallet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={collectMethod}
                    onChange={(e) => {
                      const m = e.target.value as PaymentMethodType;
                      setCollectMethod(m);
                      if (m === 'CASH') setCollectAccount('CASH_REGISTER');
                      else if (m === 'BKASH') setCollectAccount('BKASH_MERCHANT');
                      else if (m === 'NAGAD') setCollectAccount('NAGAD_MERCHANT');
                      else if (m === 'CARD' || m === 'BANK_TRANSFER') setCollectAccount('BRAC_BANK');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="CASH">Cash in Hand</option>
                    <option value="BKASH">bKash Merchant / Personal</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="BANK_TRANSFER">Bank Wire / Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Deposit Wallet / Account
                  </label>
                  <select
                    value={collectAccount}
                    onChange={(e) => setCollectAccount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="CASH_REGISTER">Cash Register</option>
                    <option value="BKASH_MERCHANT">bKash Merchant</option>
                    <option value="NAGAD_MERCHANT">Nagad Merchant</option>
                    <option value="BRAC_BANK">BRAC Bank / Corporate</option>
                    <option value="PETTY_CASH">Petty Cash</option>
                  </select>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Reference Note / Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. bKash TrxID: 9X8Y7Z / Paid in shop counter"
                  value={collectNote}
                  onChange={(e) => setCollectNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Feedback Banner */}
              {actionFeedback && (
                <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
                  actionFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {actionFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  )}
                  <span>{actionFeedback.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm Collection
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ORDER DETAILS MODAL */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 bg-slate-100 dark:bg-slate-800 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Order Details #{viewingOrder.id}</h3>
                <span className="text-xs text-slate-500">Source: {viewingOrder.order_source || 'POS'}</span>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Customer summary */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl space-y-1 text-xs">
                <div className="font-semibold text-slate-900 dark:text-white text-sm">{viewingOrder.customerName}</div>
                <div className="text-slate-500">Phone: {viewingOrder.customerPhone}</div>
                <div className="text-slate-500">Address: {viewingOrder.address}</div>
                <div className="text-slate-500">Created: {new Date(viewingOrder.createdAt).toLocaleString()}</div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Purchased Items</h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {viewingOrder.items.map((it, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">{it.name}</div>
                        <div className="text-slate-400">Qty: {it.quantity} × ৳{it.price}</div>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        ৳{it.price * it.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment History Ledger</h4>
                {viewingOrder.paymentTransactions && viewingOrder.paymentTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {viewingOrder.paymentTransactions.map((tx) => (
                      <div key={tx.id} className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/60 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-emerald-800 dark:text-emerald-300">
                            ৳{tx.amount} <span className="font-normal text-slate-500">via {tx.method}</span>
                          </div>
                          <div className="text-slate-400 mt-0.5">{tx.note || 'Tender / Due payment'}</div>
                          <div className="text-[11px] text-slate-400">Received by {tx.receivedBy} at {new Date(tx.receivedAt).toLocaleString()}</div>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">PAID</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800 rounded-xl">
                    No payment transactions recorded yet.
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Billed:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">৳{viewingOrder.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Paid:</span>
                  <span className="font-bold text-emerald-600">৳{viewingOrder.totalPaid || 0}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 text-sm">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Remaining Due:</span>
                  <span className="font-bold text-rose-600">৳{getOrderDueInfo(viewingOrder).due}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
              {getOrderDueInfo(viewingOrder).due > 0 && (
                <button
                  onClick={() => {
                    const ord = viewingOrder;
                    setViewingOrder(null);
                    handleOpenCollectModal(ord);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow"
                >
                  Receive Due
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
