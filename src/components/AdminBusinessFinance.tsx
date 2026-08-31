import React, { useState, useEffect, useMemo } from 'react';
import { 
  Order, 
  FinancialTransaction, 
  PaymentTransaction, 
  PaymentMethodType 
} from '../types';
import { financeService, FinancialSummary } from '../services/financeService';
import { useAuth } from '../context/AuthContext';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  PlusCircle, 
  Receipt, 
  Clock, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Phone, 
  User, 
  Calendar, 
  FileText,
  Loader2,
  X
} from 'lucide-react';

interface AdminBusinessFinanceProps {
  orders: Order[];
}

export default function AdminBusinessFinance({ orders }: AdminBusinessFinanceProps) {
  const { profile, user } = useAuth();
  const operatorName = profile?.name || user?.displayName || user?.email || 'Store Admin';

  const [finTransactions, setFinTransactions] = useState<FinancialTransaction[]>([]);
  const [payTransactions, setPayTransactions] = useState<PaymentTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'dues' | 'expenses' | 'ledger' | 'payments'>('overview');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDueCollectModalOpen, setIsDueCollectModalOpen] = useState(false);
  const [selectedOrderForDue, setSelectedOrderForDue] = useState<Order | null>(null);

  // Expense form state
  const [expenseCategory, setExpenseCategory] = useState<FinancialTransaction['category']>('OPERATING_EXPENSE');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseAccount, setExpenseAccount] = useState<FinancialTransaction['accountCode']>('CASH_REGISTER');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expenseReceiptUrl, setExpenseReceiptUrl] = useState<string>('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [expenseMessage, setExpenseMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Collect due form state
  const [dueCollectAmount, setDueCollectAmount] = useState<string>('');
  const [dueCollectMethod, setDueCollectMethod] = useState<PaymentMethodType>('CASH');
  const [dueCollectNote, setDueCollectNote] = useState<string>('');
  const [isCollectingDue, setIsCollectingDue] = useState(false);
  const [dueCollectMessage, setDueCollectMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('ALL');

  // Real-time subscriptions
  useEffect(() => {
    const unsubFin = financeService.subscribeFinancials((txs) => setFinTransactions(txs));
    const unsubPay = financeService.subscribePayments((pays) => setPayTransactions(pays));
    return () => {
      unsubFin();
      unsubPay();
    };
  }, []);

  // Summary calculations
  const summary: FinancialSummary = useMemo(() => {
    return financeService.calculateSummary(orders);
  }, [orders, finTransactions, payTransactions]);

  // Outstanding Due Orders
  const dueOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (o.status === 'cancelled') return false;
        const total = Number(o.totalAmount || 0);
        const paid = Number(o.totalPaid ?? (o.isPaid ? total : 0));
        const due = Number(o.dueAmount ?? (o.isPaid ? 0 : Math.max(0, total - paid)));
        return due > 0;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  // Filtered Due Orders
  const filteredDueOrders = useMemo(() => {
    if (!searchTerm.trim()) return dueOrders;
    const term = searchTerm.toLowerCase();
    return dueOrders.filter(
      (o) =>
        o.id.toLowerCase().includes(term) ||
        (o.customerName && o.customerName.toLowerCase().includes(term)) ||
        (o.customerPhone && o.customerPhone.includes(term))
    );
  }, [dueOrders, searchTerm]);

  // Filtered Financial Transactions
  const filteredFinTransactions = useMemo(() => {
    return finTransactions.filter((tx) => {
      if (selectedAccountFilter !== 'ALL' && tx.accountCode !== selectedAccountFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          tx.description.toLowerCase().includes(term) ||
          tx.id.toLowerCase().includes(term) ||
          tx.category.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [finTransactions, selectedAccountFilter, searchTerm]);

  // Handle Record Expense Submit
  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(expenseAmount);
    if (!amount || amount <= 0) {
      setExpenseMessage({ type: 'error', text: 'Please enter a valid expense amount.' });
      return;
    }

    setIsSavingExpense(true);
    setExpenseMessage(null);

    const res = await financeService.recordExpense({
      category: expenseCategory,
      amount,
      description: expenseDescription,
      accountCode: expenseAccount,
      performedBy: operatorName,
      date: expenseDate,
      receiptUrl: expenseReceiptUrl
    });

    setIsSavingExpense(false);
    if (res.success) {
      setExpenseMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        setIsExpenseModalOpen(false);
        setExpenseAmount('');
        setExpenseDescription('');
        setExpenseReceiptUrl('');
        setExpenseMessage(null);
      }, 1200);
    } else {
      setExpenseMessage({ type: 'error', text: res.message });
    }
  };

  // Handle Collect Due Submit
  const handleCollectDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForDue) return;

    const amount = Number(dueCollectAmount);
    if (!amount || amount <= 0) {
      setDueCollectMessage({ type: 'error', text: 'Please enter a valid collection amount.' });
      return;
    }

    setIsCollectingDue(true);
    setDueCollectMessage(null);

    const res = await financeService.collectOrderDue({
      orderId: selectedOrderForDue.id,
      amount,
      method: dueCollectMethod,
      note: dueCollectNote,
      receivedBy: operatorName,
      source: 'POS'
    });

    setIsCollectingDue(false);
    if (res.success) {
      setDueCollectMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        setIsDueCollectModalOpen(false);
        setSelectedOrderForDue(null);
        setDueCollectAmount('');
        setDueCollectNote('');
        setDueCollectMessage(null);
      }, 1200);
    } else {
      setDueCollectMessage({ type: 'error', text: res.message });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Date', 'Type', 'Category', 'Account', 'Amount (BDT)', 'Description', 'Performed By'];
    const rows = filteredFinTransactions.map((tx) => [
      tx.id,
      tx.date || tx.createdAt?.split('T')[0],
      tx.transactionType,
      tx.category,
      tx.accountCode,
      tx.amount,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.performedBy
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KoreanSkinFoodBD_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans animate-fadeIn">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#C81E78] to-[#993556] p-6 sm:p-8 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              Banking & Realtime Accounting
            </span>
            <span className="bg-emerald-500/30 text-emerald-100 border border-emerald-300/30 px-2.5 py-0.5 rounded-full text-xs font-bold">
              ● Live Sync
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Business Banking, Dues & P&L Ledger
          </h1>
          <p className="text-pink-100 text-xs sm:text-sm mt-1 max-w-2xl">
            Real-time cash flow, due collections, accounts receivable aging, COGS estimations, and multi-channel merchant wallets.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            className="bg-white text-[#993556] hover:bg-pink-50 font-bold px-4 py-2.5 rounded-2xl text-xs sm:text-sm transition flex items-center gap-2 shadow-md cursor-pointer active:scale-95"
          >
            <PlusCircle size={16} />
            <span>Record Business Expense</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedOrderForDue(dueOrders[0] || null);
              if (dueOrders[0]) {
                const total = dueOrders[0].totalAmount || 0;
                const paid = dueOrders[0].totalPaid ?? (dueOrders[0].isPaid ? total : 0);
                setDueCollectAmount((total - paid).toString());
              }
              setIsDueCollectModalOpen(true);
            }}
            className="bg-pink-900/40 hover:bg-pink-900/60 border border-white/30 text-white font-bold px-4 py-2.5 rounded-2xl text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Receipt size={16} />
            <span>Collect Due (৳)</span>
          </button>
        </div>
      </div>

      {/* EXECUTIVE FINANCIAL METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Realized Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-pink-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Realized Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900 font-mono">
            ৳{summary.totalRevenue.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
            <ArrowUpRight size={13} />
            <span>Money Inflow across all channels</span>
          </div>
        </div>

        {/* Card 2: Outstanding Due Receivables */}
        <div className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Due Receivables (Outstanding)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
            ৳{summary.totalDueOutstanding.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>{dueOrders.length} pending orders</span>
            <button
              type="button"
              onClick={() => setActiveTab('dues')}
              className="text-[#C81E78] font-bold hover:underline cursor-pointer"
            >
              View List →
            </button>
          </div>
        </div>

        {/* Card 3: Estimated COGS & Gross Profit */}
        <div className="bg-white p-5 rounded-3xl border border-pink-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Profit (After COGS)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-900 font-mono">
            ৳{summary.grossProfit.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-500 font-mono">
            COGS: ৳{summary.totalCOGS.toLocaleString()} ({summary.totalRevenue ? Math.round((summary.grossProfit / summary.totalRevenue) * 100) : 0}% Margin)
          </div>
        </div>

        {/* Card 4: Net Profit */}
        <div className="bg-white p-5 rounded-3xl border border-pink-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Net Business Profit</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Building2 size={16} />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono ${summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            ৳{summary.netProfit.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-500 font-mono">
            Expenses Deducted: ৳{summary.totalExpenses.toLocaleString()}
          </div>
        </div>
      </div>

      {/* MULTI-WALLET & ACCOUNT BALANCES BAR */}
      <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Wallet className="text-[#C81E78]" size={18} />
            <span>Store Wallets & Account Balances</span>
          </h3>
          <span className="text-xs text-gray-400 font-medium">Auto-updated per payment transaction</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Cash Register */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">💵 Cash Register</span>
            <div className="text-base sm:text-lg font-black text-amber-900 font-mono">
              ৳{summary.accountBalances.cash.toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-700 block">In-Store Register Drawer</span>
          </div>

          {/* bKash Merchant */}
          <div className="p-4 rounded-2xl bg-pink-50/80 border border-pink-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-800 block">📱 bKash Merchant</span>
            <div className="text-base sm:text-lg font-black text-pink-900 font-mono">
              ৳{summary.accountBalances.bkash.toLocaleString()}
            </div>
            <span className="text-[10px] text-pink-600 block">Official Merchant Wallet</span>
          </div>

          {/* Nagad Merchant */}
          <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800 block">💳 Nagad Merchant</span>
            <div className="text-base sm:text-lg font-black text-orange-900 font-mono">
              ৳{summary.accountBalances.nagad.toLocaleString()}
            </div>
            <span className="text-[10px] text-orange-600 block">Nagad Gateway & QR</span>
          </div>

          {/* Bank Account */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">🏦 Bank (BRAC / City)</span>
            <div className="text-base sm:text-lg font-black text-blue-900 font-mono">
              ৳{summary.accountBalances.bank.toLocaleString()}
            </div>
            <span className="text-[10px] text-blue-600 block">POS Card & EFT Settlement</span>
          </div>

          {/* Petty Cash */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 block">💼 Petty Cash</span>
            <div className="text-base sm:text-lg font-black text-gray-900 font-mono">
              ৳{summary.accountBalances.pettyCash.toLocaleString()}
            </div>
            <span className="text-[10px] text-gray-500 block">Store Operations</span>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {[
            { id: 'overview', label: 'Overview & Analytics' },
            { id: 'dues', label: `Outstanding Dues (${dueOrders.length})` },
            { id: 'ledger', label: `General Ledger (${finTransactions.length})` },
            { id: 'payments', label: `Payment Transactions (${payTransactions.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#C81E78] text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-pink-50 hover:text-gray-900 border border-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Export */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order ID, phone, description..."
              className="pl-8 pr-4 py-1.5 rounded-xl border border-gray-200 text-xs bg-white focus:border-[#C81E78] outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Recent Ledger Inflows & Outflows */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-pink-50 pb-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-[#C81E78]" />
                <span>Recent Financial Activity</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className="text-xs text-[#C81E78] font-bold hover:underline cursor-pointer"
              >
                View Full Ledger →
              </button>
            </div>

            {summary.recentTransactions.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                No financial transactions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-50 space-y-1 max-h-96 overflow-y-auto pr-1">
                {summary.recentTransactions.map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          tx.transactionType === 'MONEY_IN'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}
                      >
                        {tx.transactionType === 'MONEY_IN' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900">{tx.description}</div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                          <span>{tx.date || tx.createdAt?.split('T')[0]}</span>
                          <span>•</span>
                          <span className="font-mono">{tx.accountCode}</span>
                          <span>•</span>
                          <span>{tx.performedBy}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm font-black font-mono ${
                          tx.transactionType === 'MONEY_IN' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {tx.transactionType === 'MONEY_IN' ? '+' : '-'}৳{tx.amount.toLocaleString()}
                      </div>
                      <span className="text-[9px] uppercase font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {tx.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Top Outstanding Due Customers */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-rose-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-rose-50 pb-3">
              <h3 className="text-sm font-bold text-rose-900 uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} className="text-rose-600" />
                <span>Top Customer Dues</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('dues')}
                className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
              >
                View All ({dueOrders.length}) →
              </button>
            </div>

            {dueOrders.length === 0 ? (
              <div className="py-12 text-center text-emerald-600 font-bold text-xs space-y-1">
                <CheckCircle2 size={24} className="mx-auto" />
                <p>All orders are paid in full! Zero outstanding due.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dueOrders.slice(0, 5).map((order) => {
                  const total = order.totalAmount || 0;
                  const paid = order.totalPaid ?? (order.isPaid ? total : 0);
                  const due = order.dueAmount ?? Math.max(0, total - paid);

                  return (
                    <div
                      key={order.id}
                      className="p-3.5 rounded-2xl bg-rose-50/40 border border-rose-100 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-gray-900">
                          {order.customerName || 'In-Person Customer'}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          Order #{order.id} • {order.customerPhone || 'No Phone'}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-rose-700 font-mono">
                          Due: ৳{due.toLocaleString()}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrderForDue(order);
                            setDueCollectAmount(due.toString());
                            setIsDueCollectModalOpen(true);
                          }}
                          className="mt-1 text-[10px] font-bold bg-[#C81E78] hover:bg-[#993556] text-white px-2.5 py-1 rounded-lg transition cursor-pointer shadow-2xs"
                        >
                          Collect Due
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: OUTSTANDING DUES */}
      {activeTab === 'dues' && (
        <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-pink-50 pb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Accounts Receivable & Customer Due Ledger
              </h3>
              <p className="text-xs text-gray-500">
                Orders with remaining unpaid balances. Click "Collect Due" to tender partial or full payments.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-gray-500 block">Total Due Outstanding</span>
              <span className="text-xl font-black text-rose-700 font-mono">
                ৳{summary.totalDueOutstanding.toLocaleString()}
              </span>
            </div>
          </div>

          {filteredDueOrders.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-2">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-gray-700">No orders with outstanding dues found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] font-bold uppercase text-gray-400 bg-pink-50/30">
                    <th className="py-3 px-3">Order ID</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3 text-right">Total Order</th>
                    <th className="py-3 px-3 text-right">Total Paid</th>
                    <th className="py-3 px-3 text-right text-rose-700">Due Remaining</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {filteredDueOrders.map((order) => {
                    const total = order.totalAmount || 0;
                    const paid = order.totalPaid ?? (order.isPaid ? total : 0);
                    const due = order.dueAmount ?? Math.max(0, total - paid);

                    return (
                      <tr key={order.id} className="hover:bg-pink-50/20 transition">
                        <td className="py-3 px-3 font-bold text-gray-900 font-sans">
                          #{order.id}
                        </td>
                        <td className="py-3 px-3 font-sans font-bold text-gray-800">
                          {order.customerName || 'In-Person Customer'}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {order.customerPhone || 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-gray-500 font-sans">
                          {order.createdAt?.split('T')[0]}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-800">
                          ৳{total.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-700 font-bold">
                          ৳{paid.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-700 font-black">
                          ৳{due.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderForDue(order);
                              setDueCollectAmount(due.toString());
                              setIsDueCollectModalOpen(true);
                            }}
                            className="bg-[#C81E78] hover:bg-[#993556] text-white px-3 py-1.5 rounded-xl font-bold font-sans text-xs transition cursor-pointer shadow-2xs"
                          >
                            Collect Due
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GENERAL FINANCIAL LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-pink-50 pb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">General Financial Transactions Ledger</h3>
              <p className="text-xs text-gray-500">Every money movement, revenue inflow, and business expense</p>
            </div>

            {/* Account Filter */}
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <select
                value={selectedAccountFilter}
                onChange={(e) => setSelectedAccountFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white outline-none font-bold text-gray-700"
              >
                <option value="ALL">All Accounts</option>
                <option value="CASH_REGISTER">Cash Register</option>
                <option value="BKASH_MERCHANT">bKash Merchant</option>
                <option value="NAGAD_MERCHANT">Nagad Merchant</option>
                <option value="BRAC_BANK">BRAC Bank / Card</option>
                <option value="PETTY_CASH">Petty Cash</option>
              </select>
            </div>
          </div>

          {filteredFinTransactions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-xs">
              No transactions matching the filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] font-bold uppercase text-gray-400 bg-pink-50/30">
                    <th className="py-3 px-3">Tx ID</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Account</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">By</th>
                    <th className="py-3 px-3 text-right">Amount (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {filteredFinTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-pink-50/20 transition">
                      <td className="py-3 px-3 font-sans font-bold text-gray-700">{tx.id}</td>
                      <td className="py-3 px-3 text-gray-500 font-sans">{tx.date || tx.createdAt?.split('T')[0]}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            tx.transactionType === 'MONEY_IN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tx.transactionType}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans text-gray-700">{tx.category}</td>
                      <td className="py-3 px-3 font-bold text-gray-800">{tx.accountCode}</td>
                      <td className="py-3 px-3 font-sans text-gray-800 max-w-xs truncate">{tx.description}</td>
                      <td className="py-3 px-3 font-sans text-gray-500">{tx.performedBy}</td>
                      <td
                        className={`py-3 px-3 text-right font-black ${
                          tx.transactionType === 'MONEY_IN' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {tx.transactionType === 'MONEY_IN' ? '+' : '-'}৳{tx.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PAYMENT TRANSACTIONS */}
      {activeTab === 'payments' && (
        <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4">
          <div className="border-b border-pink-50 pb-3">
            <h3 className="text-base font-bold text-gray-900">Customer Payment Transactions & Tenders</h3>
            <p className="text-xs text-gray-500">Immutable payment transaction history per order and due settlement</p>
          </div>

          {payTransactions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-xs">
              No payment transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] font-bold uppercase text-gray-400 bg-pink-50/30">
                    <th className="py-3 px-3">Receipt / Tx ID</th>
                    <th className="py-3 px-3">Order ID</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Received At</th>
                    <th className="py-3 px-3">Operator</th>
                    <th className="py-3 px-3 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {payTransactions.map((p) => (
                    <tr key={p.id} className="hover:bg-pink-50/20 transition">
                      <td className="py-3 px-3 font-sans font-bold text-gray-800">{p.id}</td>
                      <td className="py-3 px-3 font-sans font-bold text-[#C81E78]">#{p.orderId}</td>
                      <td className="py-3 px-3 font-sans text-gray-800">
                        {p.customerName || 'Customer'}
                        {p.customerPhone && <span className="block text-[10px] text-gray-400">{p.customerPhone}</span>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-pink-50 text-[#C81E78] border border-pink-100 px-2 py-0.5 rounded text-[10px] font-bold">
                          {p.method}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans text-gray-600 text-[11px]">{p.type}</td>
                      <td className="py-3 px-3 text-gray-500 font-sans text-[11px]">{p.receivedAt?.split('T')[0]}</td>
                      <td className="py-3 px-3 font-sans text-gray-600">{p.receivedBy}</td>
                      <td className="py-3 px-3 text-right font-black text-emerald-700">৳{p.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RECORD EXPENSE MODAL */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-pink-100 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-pink-50 pb-3">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <PlusCircle className="text-[#C81E78]" size={20} />
                <span>Record Business Expense</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Expense Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                  className="w-full bg-pink-50/10 border border-pink-100 rounded-xl px-3.5 py-2.5 font-bold outline-none focus:border-[#C81E78]"
                >
                  <option value="OPERATING_EXPENSE">Operating Expense (General)</option>
                  <option value="MARKETING">Marketing & Meta Ads</option>
                  <option value="SALARY">Staff Salary & Commission</option>
                  <option value="RENT">Store & Warehouse Rent</option>
                  <option value="SUPPLIER_PAYMENT">Korean Supplier / Import Cost</option>
                  <option value="COURIER_CHARGE">Courier Fees & Return Charges</option>
                  <option value="PACKAGING">Packaging Boxes & Bubble Wrap</option>
                  <option value="OTHER">Other Operational Expense</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Amount (BDT)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full bg-pink-50/10 border border-pink-100 rounded-xl px-3.5 py-2.5 font-mono font-bold text-sm outline-none focus:border-[#C81E78]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Account Source</label>
                  <select
                    value={expenseAccount}
                    onChange={(e) => setExpenseAccount(e.target.value as any)}
                    className="w-full bg-pink-50/10 border border-pink-100 rounded-xl px-3.5 py-2.5 font-bold outline-none focus:border-[#C81E78]"
                  >
                    <option value="CASH_REGISTER">Cash Register</option>
                    <option value="BKASH_MERCHANT">bKash Merchant</option>
                    <option value="NAGAD_MERCHANT">Nagad Merchant</option>
                    <option value="BRAC_BANK">BRAC Bank</option>
                    <option value="PETTY_CASH">Petty Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Expense Description</label>
                <input
                  type="text"
                  required
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="e.g. Monthly Facebook Ad Campaign for Skincare Sets"
                  className="w-full bg-pink-50/10 border border-pink-100 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#C81E78]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-pink-50/10 border border-pink-100 rounded-xl px-3.5 py-2 outline-none focus:border-[#C81E78]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Receipt URL / Ref (Optional)</label>
                  <input
                    type="text"
                    value={expenseReceiptUrl}
                    onChange={(e) => setExpenseReceiptUrl(e.target.value)}
                    placeholder="Voucher # or link"
                    className="w-full bg-pink-50/10 border border-pink-100 rounded-xl px-3.5 py-2 outline-none focus:border-[#C81E78]"
                  />
                </div>
              </div>

              {expenseMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    expenseMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                  }`}
                >
                  {expenseMessage.text}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingExpense}
                  className="bg-[#C81E78] hover:bg-[#993556] text-white px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-pink-200"
                >
                  {isSavingExpense ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  <span>Save Expense</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COLLECT DUE MODAL */}
      {isDueCollectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-pink-100 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-pink-50 pb-3">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Receipt className="text-[#C81E78]" size={20} />
                <span>Collect Order Due</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsDueCollectModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Select Order */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Order with Due</label>
                <select
                  value={selectedOrderForDue?.id || ''}
                  onChange={(e) => {
                    const found = orders.find((o) => o.id === e.target.value);
                    setSelectedOrderForDue(found || null);
                    if (found) {
                      const total = found.totalAmount || 0;
                      const paid = found.totalPaid ?? (found.isPaid ? total : 0);
                      setDueCollectAmount(Math.max(0, total - paid).toString());
                    }
                  }}
                  className="w-full bg-pink-50/10 border border-pink-100 rounded-xl px-3.5 py-2.5 font-bold outline-none focus:border-[#C81E78]"
                >
                  {dueOrders.map((o) => {
                    const total = o.totalAmount || 0;
                    const paid = o.totalPaid ?? (o.isPaid ? total : 0);
                    const due = o.dueAmount ?? Math.max(0, total - paid);
                    return (
                      <option key={o.id} value={o.id}>
                        #{o.id} - {o.customerName || 'In-Person'} ({o.customerPhone || 'No phone'}) — Due: ৳{due.toLocaleString()}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedOrderForDue && (
                <div className="bg-pink-50/40 p-4 rounded-2xl border border-pink-100 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Order Total:</span>
                    <span className="font-mono font-bold text-gray-900">৳{selectedOrderForDue.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Already Paid:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      ৳{(selectedOrderForDue.totalPaid ?? (selectedOrderForDue.isPaid ? selectedOrderForDue.totalAmount : 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-pink-200/50 pt-1.5 font-bold">
                    <span className="text-rose-700">Remaining Balance Due:</span>
                    <span className="font-mono text-rose-700 text-sm">
                      ৳{(selectedOrderForDue.dueAmount ?? Math.max(0, selectedOrderForDue.totalAmount - (selectedOrderForDue.totalPaid || 0))).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <form onSubmit={handleCollectDue} className="space-y-4 pt-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Collection Amount (BDT)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={dueCollectAmount}
                    onChange={(e) => setDueCollectAmount(e.target.value)}
                    className="w-full bg-pink-50/10 border border-pink-100 rounded-xl px-3.5 py-2.5 font-mono font-bold text-base outline-none focus:border-[#C81E78]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={dueCollectMethod}
                    onChange={(e) => setDueCollectMethod(e.target.value as any)}
                    className="w-full bg-pink-50/10 border border-pink-100 rounded-xl px-3.5 py-2.5 font-bold outline-none focus:border-[#C81E78]"
                  >
                    <option value="CASH">Cash (Store Register)</option>
                    <option value="BKASH">bKash Merchant</option>
                    <option value="NAGAD">Nagad Merchant</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="BANK_TRANSFER">Bank EFT / Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Note (Optional)</label>
                  <input
                    type="text"
                    value={dueCollectNote}
                    onChange={(e) => setDueCollectNote(e.target.value)}
                    placeholder="e.g. bKash TrxID #823719"
                    className="w-full bg-pink-50/10 border border-pink-100 rounded-xl px-3.5 py-2 outline-none focus:border-[#C81E78]"
                  />
                </div>

                {dueCollectMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold ${
                      dueCollectMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                    }`}
                  >
                    {dueCollectMessage.text}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDueCollectModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCollectingDue || !selectedOrderForDue}
                    className="bg-[#C81E78] hover:bg-[#993556] text-white px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-pink-200"
                  >
                    {isCollectingDue ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    <span>Confirm Due Payment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
