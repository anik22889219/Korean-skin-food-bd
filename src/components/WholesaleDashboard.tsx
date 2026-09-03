import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { WholesaleCustomer, WholesaleOrder, WholesalePayment } from '../types';
import { wholesaleService, wholesaleLedgerService, validateWholesaleProfile } from '../services/wholesaleService';
import { wholesaleOrderService } from '../services/wholesaleOrderService';
import { 
  Building2, User, Phone, MapPin, Globe, Facebook, Instagram, 
  Receipt, DollarSign, TrendingUp, Wallet, AlertCircle, CheckCircle2, 
  Clock, Eye, ChevronLeft, ChevronRight, X, FileText, Truck, 
  CreditCard, ShieldCheck, Sparkles, Store, Lock, Save, RefreshCw, Layers
} from 'lucide-react';

export function WholesaleDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'payments' | 'profile'>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [customer, setCustomer] = useState<WholesaleCustomer | null>(null);
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [payments, setPayments] = useState<WholesalePayment[]>([]);

  // Selected Order for Details Modal
  const [selectedOrder, setSelectedOrder] = useState<WholesaleOrder | null>(null);

  // Editable Profile Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [pageName, setPageName] = useState('');
  const [location, setLocation] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [facebookPageUrl, setFacebookPageUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [otherSocialInfo, setOtherSocialInfo] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadWholesaleData() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch customer profile by user.uid
        const cust = await wholesaleService.getWholesaleCustomer(user.uid);
        setCustomer(cust);

        if (cust) {
          setName(cust.name || user.displayName || '');
          setPhone(cust.phone || '');
          setAltPhone(cust.altPhone || '');
          setBusinessName(cust.businessName || cust.storeName || '');
          setPageName(cust.pageName || '');
          setLocation(cust.location || '');
          setBusinessAddress(cust.businessAddress || cust.address || '');
          setFacebookPageUrl(cust.facebookPageUrl || '');
          setInstagramUrl(cust.instagramUrl || '');
          setWhatsappNumber(cust.whatsappNumber || cust.phone || '');
          setWebsiteUrl(cust.websiteUrl || '');
          setOtherSocialInfo(cust.otherSocialInfo || '');
        }

        // Fetch orders and payments strictly belonging to this user
        const [userOrders, userPayments] = await Promise.all([
          wholesaleOrderService.getWholesaleOrders(user.uid),
          cust ? wholesaleLedgerService.getPayments(cust.id).catch(() => []) : Promise.resolve([])
        ]);

        setOrders(userOrders || []);
        setPayments(userPayments || []);
      } catch (err: any) {
        console.error('[WholesaleDashboard] Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadWholesaleData();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setFeedback(null);
    const validation = validateWholesaleProfile({
      name,
      phone,
      facebookPageUrl,
      instagramUrl,
      websiteUrl
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setFeedback({ type: 'error', message: 'Please correct the validation errors in your profile.' });
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<WholesaleCustomer> = {
        name: name.trim(),
        phone: phone.trim(),
        altPhone: altPhone.trim(),
        businessName: businessName.trim(),
        storeName: businessName.trim(),
        pageName: pageName.trim(),
        location: location.trim(),
        businessAddress: businessAddress.trim(),
        address: businessAddress.trim(),
        facebookPageUrl: facebookPageUrl.trim(),
        instagramUrl: instagramUrl.trim(),
        whatsappNumber: whatsappNumber.trim(),
        websiteUrl: websiteUrl.trim(),
        otherSocialInfo: otherSocialInfo.trim()
      };

      await wholesaleService.updateProfileByCustomer(user.uid, payload);
      setFeedback({ type: 'success', message: 'Wholesale profile updated successfully!' });
      
      // Refresh customer data
      const updated = await wholesaleService.getWholesaleCustomer(user.uid);
      if (updated) setCustomer(updated);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-md shadow-xl">
          <Lock className="w-12 h-12 text-pink-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-900 mb-2">Wholesale Dashboard</h2>
          <p className="text-slate-600 text-sm mb-6">Please sign in with your wholesale account to view your dashboard.</p>
          <Link to="/login" className="px-6 py-3 bg-[#E91E8C] text-white font-bold rounded-2xl hover:bg-pink-600 transition block">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold text-sm">Loading your wholesale dashboard...</p>
        </div>
      </div>
    );
  }

  // Financial calculations strictly for this user
  const totalOrders = orders.length;
  const totalPurchase = orders.reduce((sum, o) => sum + (o.totalWholesaleCost || 0), 0);
  const totalCODValue = orders.reduce((sum, o) => sum + (o.totalCODValue || 0), 0);
  const totalProfit = orders.reduce((sum, o) => sum + (o.totalProfit || 0), 0);
  const totalPaid = customer?.totalPaid || payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const currentDue = customer?.totalDue !== undefined ? customer.totalDue : Math.max(0, totalCODValue - totalPaid);

  const isVerified = customer?.wholesaleAccess === true || profile?.wholesaleAccess === true;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-pink-500/20 border border-pink-500/30 text-pink-300 rounded-full text-xs font-black uppercase tracking-wider">
              Wholesale Portal
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
              isVerified ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/20 border-amber-500/30 text-amber-300'
            }`}>
              {isVerified ? 'Active Partner' : 'Approval Pending'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome back, {customer?.name || user.displayName || 'Wholesale Partner'}!
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            {businessName || pageName || 'Manage your B2B orders, ledger balance, and store profile.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/wholesale/checkout"
            className="px-5 py-3 bg-[#E91E8C] hover:bg-pink-600 text-white font-black rounded-2xl shadow-lg shadow-pink-900/30 transition flex items-center gap-2 text-sm"
          >
            <Truck size={18} />
            <span>Place Wholesale Order</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-extrabold text-sm border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'overview' ? 'border-[#E91E8C] text-[#E91E8C]' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers size={16} /> Summary & Analytics
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3 font-extrabold text-sm border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'orders' ? 'border-[#E91E8C] text-[#E91E8C]' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt size={16} /> My Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-6 py-3 font-extrabold text-sm border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'payments' ? 'border-[#E91E8C] text-[#E91E8C]' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard size={16} /> Payment & Ledger ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-3 font-extrabold text-sm border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'profile' ? 'border-[#E91E8C] text-[#E91E8C]' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 size={16} /> My Business Profile
        </button>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-bold ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <AlertCircle size={18} className="text-rose-600 shrink-0" />}
          <span className="flex-1">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
      )}

      {/* TAB 1: OVERVIEW & SUMMARY CARDS */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Orders</span>
              <div className="text-3xl font-black text-slate-900">{totalOrders}</div>
              <p className="text-xs text-slate-500 mt-2">All wholesale orders placed</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">Total Purchase (Cost)</span>
              <div className="text-3xl font-black text-indigo-950">৳{totalPurchase.toLocaleString()}</div>
              <p className="text-xs text-indigo-500 mt-2">B2B wholesale pricing total</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1">Total COD / Selling Value</span>
              <div className="text-3xl font-black text-emerald-950">৳{totalCODValue.toLocaleString()}</div>
              <p className="text-xs text-emerald-600 mt-2">Total retail selling value</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider block mb-1">Total Profit</span>
              <div className="text-3xl font-black text-teal-700">৳{totalProfit.toLocaleString()}</div>
              <p className="text-xs text-teal-600 mt-2">Your projected retail profit</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">Total Paid</span>
              <div className="text-3xl font-black text-blue-700">৳{totalPaid.toLocaleString()}</div>
              <p className="text-xs text-blue-600 mt-2">Verified payments deposited</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-rose-200 shadow-sm bg-rose-50/20">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block mb-1">Current Due Balance</span>
              <div className="text-3xl font-black text-rose-700">৳{currentDue.toLocaleString()}</div>
              <p className="text-xs text-rose-600 mt-2">Outstanding payment due</p>
            </div>
          </div>

          {/* Recent Orders Preview */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Recent Wholesale Orders</h2>
              <button onClick={() => setActiveTab('orders')} className="text-xs font-bold text-[#E91E8C] hover:underline">
                View All Orders &rarr;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase">
                    <th className="pb-3">Order ID</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Items</th>
                    <th className="pb-3 text-right">Cost</th>
                    <th className="pb-3 text-right">Due</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.slice(0, 5).map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-mono font-bold text-indigo-600 text-xs">#{order.orderNumber || order.id.slice(0, 8)}</td>
                      <td className="py-3 text-xs text-slate-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 text-xs font-bold text-slate-800">{order.items.length} items</td>
                      <td className="py-3 text-xs text-right font-black text-slate-900">৳{(order.totalWholesaleCost || 0).toLocaleString()}</td>
                      <td className="py-3 text-xs text-right font-black text-rose-600">৳{(order.dueAmount || 0).toLocaleString()}</td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-bold uppercase">{order.status}</span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-semibold">No wholesale orders placed yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">My Wholesale Orders</h2>
              <p className="text-xs text-slate-500">Complete history of all wholesale orders placed by your account</p>
            </div>
            <Link to="/wholesale/checkout" className="px-4 py-2 bg-[#E91E8C] text-white rounded-xl text-xs font-bold hover:bg-pink-600 transition">
              + New Wholesale Order
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                  <th className="p-3.5">Order ID</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Products Summary</th>
                  <th className="p-3.5 text-right">Wholesale Cost</th>
                  <th className="p-3.5 text-right">COD Value</th>
                  <th className="p-3.5 text-right">Profit</th>
                  <th className="p-3.5 text-right">Paid / Due</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 font-mono font-bold text-indigo-600 text-xs">#{order.orderNumber || order.id.slice(0, 8)}</td>
                    <td className="p-3.5 text-xs text-slate-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="p-3.5 text-xs font-semibold text-slate-800">
                      {order.items[0]?.productName || 'Product'} {order.items.length > 1 ? `(+${order.items.length - 1} more)` : ''}
                    </td>
                    <td className="p-3.5 text-right font-black text-slate-900 text-xs">৳{(order.totalWholesaleCost || 0).toLocaleString()}</td>
                    <td className="p-3.5 text-right font-black text-emerald-700 text-xs">৳{(order.totalCODValue || 0).toLocaleString()}</td>
                    <td className="p-3.5 text-right font-black text-teal-700 text-xs">৳{(order.totalProfit || 0).toLocaleString()}</td>
                    <td className="p-3.5 text-right">
                      <div className="font-bold text-blue-700 text-xs">৳{(order.paidAmount || 0).toLocaleString()}</div>
                      <div className="font-black text-rose-600 text-[11px]">Due: ৳{(order.dueAmount || 0).toLocaleString()}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-black uppercase">{order.status}</span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-400 font-medium">No wholesale orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS & LEDGER */}
      {activeTab === 'payments' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-900">Payment & Ledger History</h2>
            <p className="text-xs text-slate-500">All payment records and deposits credited to your wholesale account</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Amount Paid</th>
                  <th className="p-3.5">Method</th>
                  <th className="p-3.5">Reference / Order</th>
                  <th className="p-3.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(payment => (
                  <tr key={payment.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 text-xs text-slate-600">{new Date(payment.createdAt).toLocaleDateString()}</td>
                    <td className="p-3.5 font-black text-emerald-600 text-sm">৳{(payment.amount || 0).toLocaleString()}</td>
                    <td className="p-3.5 text-xs font-bold text-slate-700">{payment.paymentMethod}</td>
                    <td className="p-3.5 font-mono text-xs font-bold text-indigo-600">{payment.reference || payment.orderId || 'General Deposit'}</td>
                    <td className="p-3.5 text-xs text-slate-500 italic">{payment.note || 'No note'}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 font-medium">No payment records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MY BUSINESS PROFILE */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-900">My Business Profile</h2>
            <p className="text-xs text-slate-500">Update your B2B store information, contact details, and social links</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Contact Person Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#E91E8C]"
                placeholder="Full Name"
              />
              {validationErrors.name && <p className="text-[11px] text-rose-600 font-bold">{validationErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Contact Number *</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#E91E8C]"
                placeholder="01712345678"
              />
              {validationErrors.phone && <p className="text-[11px] text-rose-600 font-bold">{validationErrors.phone}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Alternative Number</label>
              <input
                type="tel"
                value={altPhone}
                onChange={e => setAltPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#E91E8C]"
                placeholder="Alternative phone number"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Business Name / Store Name</label>
              <input
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#E91E8C]"
                placeholder="e.g. SkinStore BD"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Page Name / Shop Title</label>
              <input
                type="text"
                value={pageName}
                onChange={e => setPageName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#E91E8C]"
                placeholder="Facebook Page or Instagram handle title"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Location / City</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#E91E8C]"
                placeholder="e.g. Dhaka, Dhanmondi"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Detailed Delivery Address</label>
              <textarea
                value={businessAddress}
                onChange={e => setBusinessAddress(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#E91E8C]"
                placeholder="Full street address for parcel deliveries"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Facebook Page URL</label>
              <input
                type="url"
                value={facebookPageUrl}
                onChange={e => setFacebookPageUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#E91E8C]"
                placeholder="https://facebook.com/yourpage"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Instagram Profile URL</label>
              <input
                type="url"
                value={instagramUrl}
                onChange={e => setInstagramUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#E91E8C]"
                placeholder="https://instagram.com/yourhandle"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Website URL (Optional)</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#E91E8C]"
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Other Social / Notes</label>
              <input
                type="text"
                value={otherSocialInfo}
                onChange={e => setOtherSocialInfo(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#E91E8C]"
                placeholder="WhatsApp group, TikTok, etc."
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#E91E8C] hover:bg-pink-600 text-white font-bold rounded-2xl shadow-md shadow-pink-200 text-xs transition disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} />
              <span>{saving ? 'Saving Profile...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-900">Order Details: #{selectedOrder.orderNumber || selectedOrder.id}</h3>
                <p className="text-xs text-slate-500">Placed on {new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-200 rounded-full transition">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Products</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase">
                        <th className="p-3">Product</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Wholesale Price</th>
                        <th className="p-3 text-right">COD Price</th>
                        <th className="p-3 text-right">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-bold text-slate-900">{item.productName}</td>
                          <td className="p-3 text-center font-bold text-slate-700">{item.quantity}</td>
                          <td className="p-3 text-right text-slate-700">৳{(item.wholesaleUnitPrice || item.wholesaleCost || 0).toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-emerald-700">৳{(item.CODUnitPrice || item.CODValue || 0).toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-teal-700">৳{(item.profit || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Delivery Information</h4>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="font-bold text-slate-500">Type:</span> <span className="font-bold text-indigo-700">{selectedOrder.checkoutInfo.checkoutType}</span></div>
                  <div className="flex justify-between"><span className="font-bold text-slate-500">Recipient:</span> <span className="font-semibold text-slate-800">{(selectedOrder.checkoutInfo as any).deliveryName || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="font-bold text-slate-500">Phone:</span> <span className="font-semibold text-slate-800">{(selectedOrder.checkoutInfo as any).deliveryPhone || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="font-bold text-slate-500">Address:</span> <span className="font-semibold text-slate-800 text-right">{(selectedOrder.checkoutInfo as any).deliveryAddress || 'N/A'}</span></div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Financials</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl">
                    <span className="text-[10px] font-bold text-indigo-600 block">Cost</span>
                    <span className="font-black text-indigo-950 text-sm">৳{(selectedOrder.totalWholesaleCost || 0).toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <span className="text-[10px] font-bold text-emerald-600 block">COD Value</span>
                    <span className="font-black text-emerald-950 text-sm">৳{(selectedOrder.totalCODValue || 0).toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl">
                    <span className="text-[10px] font-bold text-teal-600 block">Profit</span>
                    <span className="font-black text-teal-950 text-sm">৳{(selectedOrder.totalProfit || 0).toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl">
                    <span className="text-[10px] font-bold text-rose-600 block">Due</span>
                    <span className="font-black text-rose-950 text-sm">৳{(selectedOrder.dueAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setSelectedOrder(null)} className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
