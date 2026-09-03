import React, { useState, useEffect } from 'react';
import { WholesaleCustomer, WholesalePayment } from '../types';
import { wholesaleLedgerService } from '../services/wholesaleService';
import { useAuth } from '../context/AuthContext';
import { X, DollarSign, Plus, Calendar, CreditCard, Loader2, Save } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface Props {
  wholesaleCustomerId: string;
  onClose: () => void;
}

export function WholesaleLedgerModal({ wholesaleCustomerId, onClose }: Props) {
  const { user, profile } = useAuth();
  const [customer, setCustomer] = useState<WholesaleCustomer | null>(null);
  const [payments, setPayments] = useState<WholesalePayment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Payment Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // Load Customer Ledger
      const snap = await getDoc(doc(db, 'wholesale_customers', wholesaleCustomerId));
      if (snap.exists()) {
        setCustomer({ id: snap.id, ...snap.data() } as WholesaleCustomer);
      }
      
      // Load Payments
      const loadedPayments = await wholesaleLedgerService.getPayments(wholesaleCustomerId);
      setPayments(loadedPayments);
    } catch (err: any) {
      setError(err.message || 'Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [wholesaleCustomerId]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    try {
      const createdBy = profile?.name || user?.displayName || user?.email || 'Admin';
      await wholesaleLedgerService.addPayment({
        wholesaleCustomerId,
        amount: Number(amount),
        paymentMethod,
        reference,
        note,
        createdBy
      });
      setAmount('');
      setReference('');
      setNote('');
      setShowAddForm(false);
      await loadData(); // Reload to get updated ledger and payments
    } catch (err: any) {
      setError(err.message || 'Failed to add payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-900">Wholesale Payment Ledger</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {customer ? `${customer.name} (${customer.businessName || 'N/A'})` : 'Loading...'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition cursor-pointer">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Ledger Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Orders</span>
                  <div className="text-2xl font-black text-slate-900">{customer?.totalOrders || 0}</div>
                </div>
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">Total Purchase</span>
                  <div className="text-2xl font-black text-indigo-900">৳{(customer?.totalWholesalePurchase || 0).toLocaleString()}</div>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1">Total Paid</span>
                  <div className="text-2xl font-black text-emerald-900">৳{(customer?.totalPaid || 0).toLocaleString()}</div>
                </div>
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                  <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block mb-1">Current Due</span>
                  <div className="text-2xl font-black text-rose-900">৳{(customer?.totalDue || 0).toLocaleString()}</div>
                </div>
              </div>

              {/* Add Payment Form */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign size={18} className="text-indigo-500" />
                    Add Payment Record
                  </h3>
                  {!showAddForm && (
                    <button 
                      onClick={() => setShowAddForm(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition cursor-pointer"
                    >
                      <Plus size={16} /> New Payment
                    </button>
                  )}
                </div>
                
                {showAddForm && (
                  <form onSubmit={handleAddPayment} className="p-6 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">Payment Amount (৳)</label>
                        <input 
                          type="number" 
                          required
                          min="1"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium bg-white"
                        >
                          <option value="Cash">Cash</option>
                          <option value="bKash">bKash</option>
                          <option value="Bank">Bank Transfer</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">Reference ID (Optional)</label>
                        <input 
                          type="text"
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                          placeholder="TrxID or Bank Receipt No."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">Notes (Optional)</label>
                        <input 
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                          placeholder="Internal note..."
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                      <button 
                        type="button" 
                        onClick={() => setShowAddForm(false)}
                        className="px-6 py-2.5 rounded-xl text-slate-700 font-bold hover:bg-slate-200 transition cursor-pointer"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Save Payment
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Payment History */}
              <div>
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar size={18} className="text-slate-500" />
                  Payment History
                </h3>
                
                {payments.length === 0 ? (
                  <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    <CreditCard size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">No payments recorded yet.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                          <th className="p-4 font-bold">Date</th>
                          <th className="p-4 font-bold">Method</th>
                          <th className="p-4 font-bold">Amount</th>
                          <th className="p-4 font-bold">Remaining Due</th>
                          <th className="p-4 font-bold">Reference / Note</th>
                          <th className="p-4 font-bold">Recorded By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.map(payment => (
                          <tr key={payment.id} className="hover:bg-slate-50 transition">
                            <td className="p-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                              {new Date(payment.createdAt).toLocaleDateString('en-GB', { 
                                day: '2-digit', month: 'short', year: 'numeric', 
                                hour: '2-digit', minute: '2-digit' 
                              })}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {payment.paymentMethod}
                              </span>
                            </td>
                            <td className="p-4 whitespace-nowrap text-sm font-black text-emerald-600">
                              ৳{payment.amount.toLocaleString()}
                            </td>
                            <td className="p-4 whitespace-nowrap text-sm font-bold text-rose-600">
                              ৳{(payment.remainingDue ?? 0).toLocaleString()}
                            </td>
                            <td className="p-4">
                              <div className="text-sm text-slate-900 font-medium">{payment.reference || '-'}</div>
                              {payment.note && <div className="text-xs text-slate-500 mt-1">{payment.note}</div>}
                            </td>
                            <td className="p-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                              {payment.createdBy}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
