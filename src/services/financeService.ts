import { 
  FinancialTransaction, 
  PaymentTransaction, 
  PaymentMethodType, 
  PaymentStatus, 
  Order 
} from '../types';
import { db, sanitizeForFirestore } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  runTransaction,
  limit 
} from 'firebase/firestore';

export interface RecordExpenseParams {
  category: FinancialTransaction['category'];
  amount: number;
  description: string;
  accountCode: FinancialTransaction['accountCode'];
  performedBy: string;
  date?: string;
  referenceType?: FinancialTransaction['referenceType'];
  referenceId?: string;
  receiptUrl?: string;
}

export interface RecordTransferParams {
  fromAccount: FinancialTransaction['accountCode'];
  toAccount: FinancialTransaction['accountCode'];
  amount: number;
  description?: string;
  performedBy: string;
  date?: string;
}

export interface RecordEquityParams {
  type: 'CAPITAL_IN' | 'WITHDRAWAL';
  accountCode: FinancialTransaction['accountCode'];
  amount: number;
  description?: string;
  performedBy: string;
  date?: string;
}

export interface CollectDueParams {
  orderId: string;
  amount: number;
  method: PaymentMethodType;
  accountCode?: string;
  note?: string;
  receivedBy: string;
  source?: 'POS' | 'WEBSITE' | 'WHOLESALE' | 'MANUAL';
  idempotencyKey?: string;
}

export interface MonthlyPnLSummary {
  monthKey: string; // e.g. "2026-08"
  monthName: string; // e.g. "August 2026"
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  operatingExpenses: number;
  netProfit: number;
  netMarginPct: number;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  receivablesAdded: number;
  receivablesCollected: number;
  ordersCount: number;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalCollected: number;
  totalDueOutstanding: number;
  totalExpenses: number;
  totalCOGS: number;
  grossProfit: number;
  netProfit: number;
  totalCapitalAdded: number;
  totalWithdrawals: number;
  accountBalances: {
    cash: number;
    bkash: number;
    nagad: number;
    bank: number;
    pettyCash: number;
  };
  totalLiquidCash: number;
  recentTransactions: FinancialTransaction[];
  recentPaymentTransactions: PaymentTransaction[];
}

let financialTransactionsCache: FinancialTransaction[] = [];
let paymentTransactionsCache: PaymentTransaction[] = [];
const financeSubscribers = new Set<(transactions: FinancialTransaction[]) => void>();
const paymentSubscribers = new Set<(payments: PaymentTransaction[]) => void>();

// Realtime listeners
try {
  const finQuery = query(collection(db, 'financial_transactions'), orderBy('createdAt', 'desc'), limit(500));
  onSnapshot(finQuery, (snapshot) => {
    const list: FinancialTransaction[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as FinancialTransaction);
    });
    financialTransactionsCache = list;
    financeSubscribers.forEach(cb => cb(list));
  }, (err) => {
    console.warn('[financeService] financial_transactions realtime notice:', err);
  });

  const payQuery = query(collection(db, 'payment_transactions'), orderBy('receivedAt', 'desc'), limit(500));
  onSnapshot(payQuery, (snapshot) => {
    const list: PaymentTransaction[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as PaymentTransaction);
    });
    paymentTransactionsCache = list;
    paymentSubscribers.forEach(cb => cb(list));
  }, (err) => {
    console.warn('[financeService] payment_transactions realtime notice:', err);
  });
} catch (e) {
  console.warn('[financeService] Setup error:', e);
}

export const financeService = {
  getFinancialTransactions(): FinancialTransaction[] {
    return financialTransactionsCache;
  },

  getPaymentTransactions(): PaymentTransaction[] {
    return paymentTransactionsCache;
  },

  subscribeFinancials(callback: (txs: FinancialTransaction[]) => void): () => void {
    financeSubscribers.add(callback);
    callback(financialTransactionsCache);
    return () => {
      financeSubscribers.delete(callback);
    };
  },

  subscribePayments(callback: (payments: PaymentTransaction[]) => void): () => void {
    paymentSubscribers.add(callback);
    callback(paymentTransactionsCache);
    return () => {
      paymentSubscribers.delete(callback);
    };
  },

  /**
   * Log an operational or business expense (Salary, Rent, Marketing, Packaging, Supplier)
   */
  async recordExpense(params: RecordExpenseParams): Promise<{ success: boolean; transaction?: FinancialTransaction; message: string }> {
    const {
      category,
      amount,
      description,
      accountCode,
      performedBy,
      date = new Date().toISOString().split('T')[0],
      referenceType = 'MANUAL',
      referenceId,
      receiptUrl
    } = params;

    if (!amount || amount <= 0) {
      return { success: false, message: 'Expense amount must be greater than 0 BDT.' };
    }

    // Try server API first
    try {
      const response = await fetch('/api/finance/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: 'EXPENSE',
          category,
          amount: Number(amount),
          accountCode,
          description: description || `${category} Expense`,
          performedBy: performedBy || 'Store Staff',
          referenceType,
          referenceId,
          receiptUrl
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.transaction) {
          financialTransactionsCache = [data.transaction, ...financialTransactionsCache.filter(t => t.id !== data.transaction.id)];
          financeSubscribers.forEach(cb => cb(financialTransactionsCache));
        }
        return { success: true, transaction: data.transaction, message: 'Expense recorded successfully!' };
      }
    } catch (apiErr) {
      console.warn('[financeService] Server API failed, falling back to direct Firestore:', apiErr);
    }

    const txId = 'FIN-EXP-' + Math.floor(100000 + Math.random() * 900000);
    const nowIso = new Date().toISOString();

    const tx: FinancialTransaction = {
      id: txId,
      transactionType: 'EXPENSE',
      category,
      amount: Number(amount),
      date,
      accountCode,
      description: description || `${category} Expense`,
      performedBy: performedBy || 'Store Staff',
      referenceType,
      referenceId: referenceId || txId,
      createdAt: nowIso,
      receiptUrl: receiptUrl || ''
    };

    try {
      await setDoc(doc(db, 'financial_transactions', txId), sanitizeForFirestore(tx));
      financialTransactionsCache = [tx, ...financialTransactionsCache];
      financeSubscribers.forEach(cb => cb(financialTransactionsCache));
      return { success: true, transaction: tx, message: 'Expense recorded successfully!' };
    } catch (err: any) {
      console.error('[financeService] recordExpense failed:', err);
      return { success: false, message: err?.message || 'Failed to record expense.' };
    }
  },

  /**
   * Record a transfer between wallets (e.g., Cash -> Bank, Bank -> bKash)
   * Transfers affect wallet balances but do NOT count as revenue or expense.
   */
  async recordWalletTransfer(params: RecordTransferParams): Promise<{ success: boolean; transaction?: FinancialTransaction; message: string }> {
    const {
      fromAccount,
      toAccount,
      amount,
      description,
      performedBy,
      date = new Date().toISOString().split('T')[0]
    } = params;

    if (!amount || amount <= 0) {
      return { success: false, message: 'Transfer amount must be greater than 0 BDT.' };
    }
    if (fromAccount === toAccount) {
      return { success: false, message: 'Source and destination accounts must be different.' };
    }

    // Try server API first
    try {
      const response = await fetch('/api/finance/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccount,
          toAccount,
          amount: Number(amount),
          description,
          performedBy: performedBy || 'Store Admin'
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.transaction) {
          financialTransactionsCache = [data.transaction, ...financialTransactionsCache.filter(t => t.id !== data.transaction.id)];
          financeSubscribers.forEach(cb => cb(financialTransactionsCache));
        }
        return { success: true, transaction: data.transaction, message: `Transferred ৳${amount} from ${fromAccount} to ${toAccount}.` };
      }
    } catch (apiErr) {
      console.warn('[financeService] Server API failed, falling back to direct Firestore:', apiErr);
    }

    const txId = 'FIN-TRF-' + Math.floor(100000 + Math.random() * 900000);
    const nowIso = new Date().toISOString();

    const tx: FinancialTransaction = {
      id: txId,
      transactionType: 'TRANSFER',
      category: 'TRANSFER',
      amount: Number(amount),
      date,
      accountCode: fromAccount,
      targetAccountCode: toAccount as any,
      description: description || `Wallet Transfer: ${fromAccount} → ${toAccount}`,
      performedBy: performedBy || 'Store Admin',
      referenceType: 'TRANSFER',
      referenceId: txId,
      createdAt: nowIso
    };

    try {
      await setDoc(doc(db, 'financial_transactions', txId), sanitizeForFirestore(tx));
      financialTransactionsCache = [tx, ...financialTransactionsCache];
      financeSubscribers.forEach(cb => cb(financialTransactionsCache));
      return { success: true, transaction: tx, message: `Transferred ৳${amount} from ${fromAccount} to ${toAccount}.` };
    } catch (err: any) {
      console.error('[financeService] recordWalletTransfer failed:', err);
      return { success: false, message: err?.message || 'Failed to record transfer.' };
    }
  },

  /**
   * Record Capital Injection or Owner Drawings (Withdrawals)
   * Affects cash balance without distorting business operating revenues or expenses.
   */
  async recordEquityMovement(params: RecordEquityParams): Promise<{ success: boolean; transaction?: FinancialTransaction; message: string }> {
    const {
      type,
      accountCode,
      amount,
      description,
      performedBy,
      date = new Date().toISOString().split('T')[0]
    } = params;

    if (!amount || amount <= 0) {
      return { success: false, message: 'Amount must be greater than 0 BDT.' };
    }

    // Try server API first
    try {
      const response = await fetch('/api/finance/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: type,
          category: type === 'CAPITAL_IN' ? 'CAPITAL' : 'WITHDRAWAL',
          amount: Number(amount),
          accountCode,
          description: description || (type === 'CAPITAL_IN' ? 'Capital Added by Owner' : 'Owner Withdrawal / Drawings'),
          performedBy: performedBy || 'Owner / Admin',
          referenceType: type === 'CAPITAL_IN' ? 'CAPITAL' : 'WITHDRAWAL'
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.transaction) {
          financialTransactionsCache = [data.transaction, ...financialTransactionsCache.filter(t => t.id !== data.transaction.id)];
          financeSubscribers.forEach(cb => cb(financialTransactionsCache));
        }
        return {
          success: true,
          transaction: data.transaction,
          message: `${type === 'CAPITAL_IN' ? 'Capital added' : 'Withdrawal recorded'} of ৳${amount} successfully.`
        };
      }
    } catch (apiErr) {
      console.warn('[financeService] Server API failed, falling back to direct Firestore:', apiErr);
    }

    const txId = (type === 'CAPITAL_IN' ? 'FIN-CAP-' : 'FIN-WDR-') + Math.floor(100000 + Math.random() * 900000);
    const nowIso = new Date().toISOString();

    const tx: FinancialTransaction = {
      id: txId,
      transactionType: type,
      category: type === 'CAPITAL_IN' ? 'CAPITAL' : 'WITHDRAWAL',
      amount: Number(amount),
      date,
      accountCode,
      description: description || (type === 'CAPITAL_IN' ? 'Capital Added by Owner' : 'Owner Withdrawal / Drawings'),
      performedBy: performedBy || 'Owner / Admin',
      referenceType: type === 'CAPITAL_IN' ? 'CAPITAL' : 'WITHDRAWAL',
      referenceId: txId,
      createdAt: nowIso
    };

    try {
      await setDoc(doc(db, 'financial_transactions', txId), sanitizeForFirestore(tx));
      financialTransactionsCache = [tx, ...financialTransactionsCache];
      financeSubscribers.forEach(cb => cb(financialTransactionsCache));
      return {
        success: true,
        transaction: tx,
        message: `${type === 'CAPITAL_IN' ? 'Capital added' : 'Withdrawal recorded'} of ৳${amount} successfully.`
      };
    } catch (err: any) {
      console.error('[financeService] recordEquityMovement failed:', err);
      return { success: false, message: err?.message || 'Failed to record equity transaction.' };
    }
  },

  /**
   * Collect due payment on an existing order atomically with idempotency protection
   */
  async collectOrderDue(params: CollectDueParams): Promise<{ success: boolean; order?: Order; paymentTransaction?: PaymentTransaction; message: string }> {
    const {
      orderId,
      amount,
      method,
      accountCode = method === 'CASH' ? 'CASH_REGISTER' : method === 'BKASH' ? 'BKASH_MERCHANT' : method === 'NAGAD' ? 'NAGAD_MERCHANT' : 'BRAC_BANK',
      note = 'Due payment collection',
      receivedBy,
      source = 'POS',
      idempotencyKey
    } = params;

    if (!orderId) {
      return { success: false, message: 'Order ID is required.' };
    }
    if (!amount || amount <= 0) {
      return { success: false, message: 'Collection amount must be greater than 0 BDT.' };
    }

    const effectiveIdempotencyKey = idempotencyKey || `due_pay_${orderId}_${Date.now()}`;

    // 1. Try authoritative server-side endpoint first
    try {
      const response = await fetch('/api/finance/collect-due', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: Number(amount),
          method,
          accountCode,
          note,
          receivedBy,
          source,
          idempotencyKey: effectiveIdempotencyKey
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (data.payTx) {
          paymentTransactionsCache = [data.payTx, ...paymentTransactionsCache.filter(p => p.id !== data.payTx.id)];
          paymentSubscribers.forEach(cb => cb(paymentTransactionsCache));
        }
        if (data.finTx) {
          financialTransactionsCache = [data.finTx, ...financialTransactionsCache.filter(t => t.id !== data.finTx.id)];
          financeSubscribers.forEach(cb => cb(financialTransactionsCache));
        }
        return {
          success: true,
          order: data.updatedOrder || data.order,
          paymentTransaction: data.payTx || data.paymentTx,
          message: data.message || `Successfully collected ৳${amount} for Order #${orderId}.`
        };
      } else if (data.error && !data.error.includes('fetch') && response.status === 400) {
        // Business logic rejection from server (e.g. order not found or already fully paid)
        return { success: false, message: data.error };
      }
    } catch (apiErr) {
      console.warn('[financeService] Server API failed, attempting Firestore transaction fallback:', apiErr);
    }

    // 2. Client-side Firestore transaction fallback
    const payTxId = 'PAY-' + Math.floor(100000 + Math.random() * 900000);
    const finTxId = 'FIN-REV-' + Math.floor(100000 + Math.random() * 900000);
    const nowIso = new Date().toISOString();

    try {
      const result = await runTransaction(db, async (transaction) => {
        // Check idempotency record
        const idempRef = doc(db, 'payment_idempotency', effectiveIdempotencyKey);
        const idempDoc = await transaction.get(idempRef);
        if (idempDoc.exists()) {
          const prevData = idempDoc.data();
          return {
            updatedOrder: prevData.order as Order,
            paymentTx: prevData.paymentTx as PaymentTransaction,
            isDuplicate: true
          };
        }

        const orderRef = doc(db, 'orders', orderId);
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists()) {
          throw new Error(`Order #${orderId} not found.`);
        }

        const currentOrder = orderDoc.data() as Order;
        const totalAmount = currentOrder.totalAmount || 0;
        const currentPaid = currentOrder.totalPaid ?? (currentOrder.isPaid ? totalAmount : 0);
        const currentDue = currentOrder.dueAmount ?? Math.max(0, totalAmount - currentPaid);

        if (currentDue <= 0) {
          throw new Error(`Order #${orderId} is already fully paid. No outstanding due.`);
        }

        const effectivePayment = Math.min(amount, currentDue);
        const newTotalPaid = currentPaid + effectivePayment;
        const newDueAmount = Math.max(0, totalAmount - newTotalPaid);
        const newPaymentStatus: PaymentStatus = newDueAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';

        const paymentTx: PaymentTransaction = {
          id: payTxId,
          orderId,
          type: 'POS_DUE_COLLECTION',
          method,
          amount: effectivePayment,
          note: note || `Due collection of ৳${effectivePayment} for Order #${orderId}`,
          receivedBy,
          receivedAt: nowIso,
          source,
          idempotencyKey: effectiveIdempotencyKey,
          accountCode,
          customerPhone: currentOrder.customerPhone,
          customerName: currentOrder.customerName
        };

        const finTx: FinancialTransaction = {
          id: finTxId,
          transactionType: 'MONEY_IN',
          category: 'REVENUE',
          amount: effectivePayment,
          date: nowIso.split('T')[0],
          accountCode: accountCode as any,
          description: `Due Collection ৳${effectivePayment} for Order #${orderId} (${method})`,
          performedBy: receivedBy,
          referenceType: 'ORDER',
          referenceId: orderId,
          createdAt: nowIso
        };

        // Writes
        const existingTxList = currentOrder.paymentTransactions || [];
        const updatedOrder: Order = {
          ...currentOrder,
          totalPaid: newTotalPaid,
          dueAmount: newDueAmount,
          paymentStatus: newPaymentStatus,
          isPaid: newPaymentStatus === 'PAID',
          paymentTransactions: [...existingTxList, paymentTx]
        };

        transaction.set(orderRef, sanitizeForFirestore(updatedOrder));
        transaction.set(doc(db, 'payment_transactions', payTxId), sanitizeForFirestore(paymentTx));
        transaction.set(doc(db, 'financial_transactions', finTxId), sanitizeForFirestore(finTx));
        transaction.set(idempRef, sanitizeForFirestore({
          idempotencyKey: effectiveIdempotencyKey,
          orderId,
          amount: effectivePayment,
          paymentTxId: payTxId,
          order: updatedOrder,
          paymentTx,
          createdAt: nowIso
        }));

        return { updatedOrder, paymentTx, isDuplicate: false };
      });

      return {
        success: true,
        order: result.updatedOrder,
        paymentTransaction: result.paymentTx,
        message: result.isDuplicate
          ? `Duplicate request safely handled. Current order due: ৳${result.updatedOrder?.dueAmount}.`
          : `Successfully collected ৳${params.amount} for Order #${orderId}. Remaining due: ৳${result.updatedOrder.dueAmount}.`
      };
    } catch (err: any) {
      console.error('[financeService] collectOrderDue error:', err);
      return { success: false, message: err?.message || 'Failed to collect due payment.' };
    }
  },

  /**
   * Compute complete business financial summaries from transactions and orders
   */
  calculateSummary(orders: Order[]): FinancialSummary {
    const finTxs = financialTransactionsCache;
    const payTxs = paymentTransactionsCache;

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalCOGS = 0;
    let totalCapitalAdded = 0;
    let totalWithdrawals = 0;

    // Multi-wallet account balances
    const accountBalances = {
      cash: 0,
      bkash: 0,
      nagad: 0,
      bank: 0,
      pettyCash: 0
    };

    const updateWallet = (account: string | undefined, delta: number) => {
      if (!account) return;
      if (account === 'CASH_REGISTER') accountBalances.cash += delta;
      else if (account === 'BKASH_MERCHANT') accountBalances.bkash += delta;
      else if (account === 'NAGAD_MERCHANT') accountBalances.nagad += delta;
      else if (account === 'BRAC_BANK' || account === 'CITY_BANK') accountBalances.bank += delta;
      else if (account === 'PETTY_CASH') accountBalances.pettyCash += delta;
    };

    // Calculate from financial ledger
    finTxs.forEach((tx) => {
      const amt = Number(tx.amount || 0);

      if (tx.transactionType === 'MONEY_IN' || (tx.category === 'REVENUE' && tx.transactionType !== 'CAPITAL_IN')) {
        totalRevenue += amt;
        updateWallet(tx.accountCode, amt);
      } else if (tx.transactionType === 'EXPENSE' || tx.transactionType === 'MONEY_OUT') {
        if (tx.category === 'COGS') {
          totalCOGS += amt;
        } else {
          totalExpenses += amt;
        }
        updateWallet(tx.accountCode, -amt);
      } else if (tx.transactionType === 'CAPITAL_IN') {
        totalCapitalAdded += amt;
        updateWallet(tx.accountCode, amt);
      } else if (tx.transactionType === 'WITHDRAWAL') {
        totalWithdrawals += amt;
        updateWallet(tx.accountCode, -amt);
      } else if (tx.transactionType === 'TRANSFER') {
        updateWallet(tx.accountCode, -amt);
        updateWallet(tx.targetAccountCode, amt);
      } else if (tx.transactionType === 'REFUND') {
        totalRevenue -= amt;
        updateWallet(tx.accountCode, -amt);
      }
    });

    // Factor completed orders for due balances & COGS
    let totalDueOutstanding = 0;
    let totalCollected = 0;
    let billedOrderRevenue = 0;

    orders.forEach((o) => {
      if (o.status === 'cancelled') return;
      const orderTotal = Number(o.totalAmount || 0);
      const paid = Number(o.totalPaid ?? (o.isPaid ? orderTotal : 0));
      const due = Number(o.dueAmount ?? (o.isPaid ? 0 : Math.max(0, orderTotal - paid)));

      billedOrderRevenue += orderTotal;
      totalCollected += paid;
      totalDueOutstanding += due;

      // Real COGS calculation or fallback to standard 58% K-Beauty wholesale landing cost
      if (o.cogsAmount) {
        totalCOGS += Number(o.cogsAmount);
      } else if (o.status === 'delivered') {
        totalCOGS += Math.round(orderTotal * 0.58);
      }
    });

    const effectiveRevenue = Math.max(totalRevenue, billedOrderRevenue);
    const grossProfit = Math.max(0, effectiveRevenue - totalCOGS);
    const netProfit = grossProfit - totalExpenses;

    const totalLiquidCash = accountBalances.cash + accountBalances.bkash + accountBalances.nagad + accountBalances.bank + accountBalances.pettyCash;

    return {
      totalRevenue: effectiveRevenue,
      totalCollected: totalCollected || totalRevenue,
      totalDueOutstanding,
      totalExpenses,
      totalCOGS,
      grossProfit,
      netProfit,
      totalCapitalAdded,
      totalWithdrawals,
      accountBalances,
      totalLiquidCash,
      recentTransactions: finTxs.slice(0, 20),
      recentPaymentTransactions: payTxs.slice(0, 20)
    };
  },

  /**
   * Generate monthly P&L using Asia/Dhaka (+06:00) calendar boundaries
   */
  getMonthlyPnL(orders: Order[], finTxs: FinancialTransaction[] = financialTransactionsCache): MonthlyPnLSummary[] {
    const monthMap: Record<string, {
      monthKey: string;
      monthName: string;
      revenue: number;
      cogs: number;
      expenses: number;
      cashIn: number;
      cashOut: number;
      receivablesAdded: number;
      receivablesCollected: number;
      ordersCount: number;
    }> = {};

    const getDhakaMonthKey = (isoDateString: string) => {
      try {
        const d = new Date(isoDateString);
        if (isNaN(d.getTime())) return '2026-08';
        // Asia/Dhaka is UTC+6
        const dhakaTime = new Date(d.getTime() + 6 * 3600000);
        const y = dhakaTime.getUTCFullYear();
        const m = String(dhakaTime.getUTCMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      } catch {
        return '2026-08';
      }
    };

    // Process Orders
    orders.forEach((o) => {
      if (o.status === 'cancelled') return;
      const mKey = getDhakaMonthKey(o.createdAt);
      if (!monthMap[mKey]) {
        const [year, month] = mKey.split('-');
        const dateObj = new Date(Number(year), Number(month) - 1, 1);
        const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        monthMap[mKey] = {
          monthKey: mKey,
          monthName,
          revenue: 0,
          cogs: 0,
          expenses: 0,
          cashIn: 0,
          cashOut: 0,
          receivablesAdded: 0,
          receivablesCollected: 0,
          ordersCount: 0
        };
      }

      const total = Number(o.totalAmount || 0);
      const paid = Number(o.totalPaid ?? (o.isPaid ? total : 0));
      const due = Number(o.dueAmount ?? (o.isPaid ? 0 : Math.max(0, total - paid)));
      const cogs = o.cogsAmount ? Number(o.cogsAmount) : Math.round(total * 0.58);

      monthMap[mKey].revenue += total;
      monthMap[mKey].cashIn += paid;
      monthMap[mKey].receivablesAdded += due;
      monthMap[mKey].cogs += cogs;
      monthMap[mKey].ordersCount += 1;
    });

    // Process Financial Transactions
    finTxs.forEach((tx) => {
      const mKey = getDhakaMonthKey(tx.date || tx.createdAt);
      if (!monthMap[mKey]) {
        const [year, month] = mKey.split('-');
        const dateObj = new Date(Number(year), Number(month) - 1, 1);
        const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        monthMap[mKey] = {
          monthKey: mKey,
          monthName,
          revenue: 0,
          cogs: 0,
          expenses: 0,
          cashIn: 0,
          cashOut: 0,
          receivablesAdded: 0,
          receivablesCollected: 0,
          ordersCount: 0
        };
      }

      const amt = Number(tx.amount || 0);
      if (tx.transactionType === 'EXPENSE' || tx.transactionType === 'MONEY_OUT') {
        if (tx.category === 'COGS') {
          monthMap[mKey].cogs += amt;
        } else {
          monthMap[mKey].expenses += amt;
        }
        monthMap[mKey].cashOut += amt;
      } else if (tx.transactionType === 'CAPITAL_IN') {
        monthMap[mKey].cashIn += amt;
      } else if (tx.transactionType === 'WITHDRAWAL') {
        monthMap[mKey].cashOut += amt;
      }
    });

    // Format list
    return Object.values(monthMap)
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      .map((m) => {
        const grossProfit = Math.max(0, m.revenue - m.cogs);
        const grossMarginPct = m.revenue > 0 ? Number(((grossProfit / m.revenue) * 100).toFixed(1)) : 0;
        const netProfit = grossProfit - m.expenses;
        const netMarginPct = m.revenue > 0 ? Number(((netProfit / m.revenue) * 100).toFixed(1)) : 0;
        const netCashFlow = m.cashIn - m.cashOut;

        return {
          monthKey: m.monthKey,
          monthName: m.monthName,
          revenue: m.revenue,
          cogs: m.cogs,
          grossProfit,
          grossMarginPct,
          operatingExpenses: m.expenses,
          netProfit,
          netMarginPct,
          cashIn: m.cashIn,
          cashOut: m.cashOut,
          netCashFlow,
          receivablesAdded: m.receivablesAdded,
          receivablesCollected: m.receivablesCollected,
          ordersCount: m.ordersCount
        };
      });
  }
};
