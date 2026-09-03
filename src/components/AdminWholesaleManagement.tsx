import React, { useState, useEffect, useMemo } from 'react';
import { WholesaleCustomer } from '../types';
import { wholesaleService } from '../services/wholesaleService';
import { WholesaleLedgerModal } from './WholesaleLedgerModal';
import { useAuth } from '../context/AuthContext';
import { 
  Building2,
  Clock, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Phone,
  MapPin,
  TrendingUp,
  Receipt,
  Users,
  Wallet,
  Loader2,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminWholesaleManagement() {
  const { isSuperAdmin, isAdmin } = useAuth();
  const [customers, setCustomers] = useState<WholesaleCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'pending' | 'suspended'>('ALL');
  
  // Modals
  const [ledgerCustomerId, setLedgerCustomerId] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await wholesaleService.getAllWholesaleCustomers();
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch wholesale customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    let totalWholesalers = customers.length;
    let activeWholesalers = 0;
    let totalOrders = 0;
    let totalSales = 0;
    let totalPaid = 0;
    let totalDue = 0;

    customers.forEach(c => {
      if (c.status === 'active') activeWholesalers++;
      totalOrders += (c.totalOrders || 0);
      totalSales += (c.totalWholesalePurchase || 0);
      totalPaid += (c.totalPaid || 0);
      totalDue += (c.totalDue || 0);
    });

    return { totalWholesalers, activeWholesalers, totalOrders, totalSales, totalPaid, totalDue };
  }, [customers]);

  // Filter Data
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.pageName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.businessAddress?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter]);

  const handleToggleAccess = async (customerId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      const access = newStatus === 'active';
      
      await wholesaleService.adminUpdateWholesaleCustomer(customerId, {
        status: newStatus,
        wholesaleAccess: access
      });

      // Update local state
      setCustomers(prev => prev.map(c => 
        c.id === customerId ? { ...c, status: newStatus as any, wholesaleAccess: access } : c
      ));

    } catch (err: any) {
      alert(`Error updating access: ${err.message}`);
    }
  };

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-100 mt-6 max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-600">You do not have permission to view wholesale management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Building2 className="w-8 h-8 text-indigo-600" />
            Wholesale Management
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Manage wholesale customers, ledger, and financials
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <Users size={16} />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wholesalers</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalWholesalers}</div>
          <div className="text-sm font-semibold text-blue-600 mt-1">{stats.activeWholesalers} Active</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <Receipt size={16} />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalOrders}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales</span>
          </div>
          <div className="text-2xl font-black text-slate-900">৳{stats.totalSales.toLocaleString()}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center">
              <Wallet size={16} />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Paid</span>
          </div>
          <div className="text-2xl font-black text-slate-900">৳{stats.totalPaid.toLocaleString()}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm bg-rose-50/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center">
              <AlertCircle size={16} />
            </div>
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Total Due</span>
          </div>
          <div className="text-2xl font-black text-rose-700">৳{stats.totalDue.toLocaleString()}</div>
        </div>

        {/* Note: Wholesaler profit isn't strictly tracked in wholesale_customers table without iterating all orders, so we place a placeholder or fetch it if needed. For now we will hide or show a generic label */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
              <Building2 size={16} />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Order Val</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ৳{stats.totalOrders > 0 ? Math.round(stats.totalSales / stats.totalOrders).toLocaleString() : 0}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, business, phone, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium text-slate-900 transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full md:w-48 pl-12 pr-10 py-3 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 appearance-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-500">Wholesaler</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-500">Contact & Loc</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-500 text-center">Orders</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-500 text-right">Purchase</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-500 text-right">Paid</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-500 text-right">Due</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-500 text-center">Status</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
                    <span className="text-slate-500 font-medium">Loading wholesale directory...</span>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 font-medium">
                    No wholesalers found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <Link to={`/admin/wholesale/${customer.id}`} className="font-black text-slate-900 hover:text-indigo-600 transition block">
                        {customer.name}
                      </Link>
                      {(customer.businessName || customer.pageName) && (
                        <div className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-1">
                          <Building2 size={12} />
                          {customer.businessName || customer.pageName}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-700 text-sm">{customer.phone}</div>
                      {(customer.location || customer.businessAddress) && (
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-1 line-clamp-1 max-w-[150px]">
                          <MapPin size={12} className="flex-shrink-0" />
                          <span className="truncate">{customer.location || customer.businessAddress}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200">
                        {customer.totalOrders || 0}
                      </span>
                    </td>
                    <td className="p-4 text-right font-black text-slate-900">
                      ৳{(customer.totalWholesalePurchase || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-black text-emerald-600">
                      ৳{(customer.totalPaid || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-black text-rose-600">
                      ৳{(customer.totalDue || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleAccess(customer.id, customer.status)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border transition ${
                          customer.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800'
                            : customer.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                        title="Click to toggle access"
                      >
                        {customer.status === 'active' ? (
                          <><CheckCircle2 size={12} className="mr-1" /> Active</>
                        ) : customer.status === 'pending' ? (
                          <><Clock size={12} className="mr-1" /> Pending</>
                        ) : (
                          <><AlertCircle size={12} className="mr-1" /> Suspended</>
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/wholesale/${customer.id}`}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition whitespace-nowrap"
                          title="View Details & Orders"
                        >
                          Details
                        </Link>
                        <button
                          onClick={() => setLedgerCustomerId(customer.id)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition whitespace-nowrap"
                        >
                          Ledger / Pay
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {ledgerCustomerId && (
        <WholesaleLedgerModal 
          wholesaleCustomerId={ledgerCustomerId}
          onClose={() => {
            setLedgerCustomerId(null);
            fetchCustomers(); // Refresh stats when ledger is closed
          }}
        />
      )}
    </div>
  );
}
