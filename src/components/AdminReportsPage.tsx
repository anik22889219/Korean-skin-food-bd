import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, Download, Printer, Calendar, 
  DollarSign, Package, Sparkles, 
  ShoppingBag, ArrowUpRight, RefreshCw,
  Minimize2, Maximize2, Award, FileDown
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../services/firebase';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { evaluateProductCompleteness } from '../utils/productCompleteness';
import { Order, Product } from '../types';

export const AdminReportsPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | '90days' | 'all' | 'custom'>('30days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'creators' | 'ai'>('sales');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false);
  const [creatorRecords, setCreatorRecords] = useState<any[]>([]);

  const loadCreatorStats = async () => {
    try {
      const snap = await getDocs(collection(db, 'public_creators'));
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setCreatorRecords(list);
    } catch {
      setCreatorRecords([]);
    }
  };

  useEffect(() => {
    // Load initial data
    setOrders(orderService.getOrders());
    setProducts(productService.getProducts());
    loadCreatorStats();

    // Subscribe to orders real-time update
    const unsub = orderService.subscribe((updatedOrders) => {
      setOrders(updatedOrders);
    });
    return () => unsub();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadCreatorStats();
    setTimeout(() => {
      setOrders(orderService.getOrders());
      setProducts(productService.getProducts());
      setIsRefreshing(false);
    }, 500);
  };

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    const now = new Date().getTime();
    return orders.filter(o => {
      const orderTime = new Date(o.createdAt).getTime();
      if (isNaN(orderTime)) return true;

      if (dateRange === 'today') {
        const diffDays = (now - orderTime) / (1000 * 3600 * 24);
        return diffDays <= 1;
      }
      if (dateRange === '7days') {
        const diffDays = (now - orderTime) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (dateRange === '30days') {
        const diffDays = (now - orderTime) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
      if (dateRange === '90days') {
        const diffDays = (now - orderTime) / (1000 * 3600 * 24);
        return diffDays <= 90;
      }
      if (dateRange === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(customStartDate).getTime() : 0;
        const end = customEndDate ? new Date(customEndDate).getTime() + 86400000 : Number.MAX_SAFE_INTEGER;
        return orderTime >= start && orderTime <= end;
      }
      return true;
    });
  }, [orders, dateRange, customStartDate, customEndDate]);

  // Financial & Sales Metrics
  const totalRevenue = useMemo(() => {
    return filteredOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [filteredOrders]);

  const totalOrdersCount = filteredOrders.length;
  const activeOrders = filteredOrders.filter(o => o.status !== 'cancelled');
  const completedOrdersCount = filteredOrders.filter(o => o.status === 'delivered' || o.status === 'shipped').length;
  const cancelledOrdersCount = filteredOrders.filter(o => o.status === 'cancelled').length;
  const avgOrderValue = activeOrders.length > 0 ? Math.round(totalRevenue / activeOrders.length) : 0;

  // Real Repeat Customer Rate from actual order customer identifiers
  const repeatCustomerStats = useMemo(() => {
    const countsByCustomer = new Map<string, number>();
    activeOrders.forEach((o) => {
      const key =
        (o.customerPhone || '').replace(/\D/g, '').slice(-11) ||
        o.customer_uid ||
        (o.customerEmail || '').trim().toLowerCase() ||
        '';
      if (!key) return;
      countsByCustomer.set(key, (countsByCustomer.get(key) || 0) + 1);
    });
    const uniqueCustomers = countsByCustomer.size;
    const repeatCustomers = Array.from(countsByCustomer.values()).filter((c) => c >= 2).length;
    const repeatRate = uniqueCustomers > 0 ? Number(((repeatCustomers / uniqueCustomers) * 100).toFixed(1)) : 0;
    return { uniqueCustomers, repeatCustomers, repeatRate };
  }, [activeOrders]);

  // Order Sources breakdown (Website, POS, Wholesale)
  const websiteOrdersCount = filteredOrders.filter(o => (o.order_source === 'WEBSITE' || (!o.order_source && o.sessionType !== 'POS'))).length;
  const posOrdersCount = filteredOrders.filter(o => o.order_source === 'POS' || o.sessionType === 'POS').length;
  const wholesaleOrdersCount = filteredOrders.filter(o => o.order_source === 'WHOLESALE').length;

  // Inventory & PDP Completeness Metrics
  const totalCatalogItems = products.length;
  const totalStockUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowStockProducts = products.filter(p => (p.stock || 0) <= 5 && (p.stock || 0) > 0);
  const outOfStockProducts = products.filter(p => (p.stock || 0) <= 0);
  const totalInventoryValuation = products.reduce((sum, p) => sum + ((p.retailPrice || p.price || 0) * (p.stock || 0)), 0);

  const catalogContentMetrics = useMemo(() => {
    const seoGeneratedCount = products.filter((p) => Boolean(p.generatedSeoContent)).length;
    const socialCopyCount = products.filter((p) => Boolean(p.generatedSocialPost)).length;
    const completenessScores = products.map((p) => evaluateProductCompleteness(p));
    const avgCompleteness =
      completenessScores.length > 0
        ? Math.round(completenessScores.reduce((s, r) => s + r.score, 0) / completenessScores.length)
        : 0;
    const needsWorkCount = completenessScores.filter((r) => r.level === 'needs_work').length;
    return { seoGeneratedCount, socialCopyCount, avgCompleteness, needsWorkCount };
  }, [products]);

  // Top Performing Products, Categories & Brands based on filtered orders
  const { topPerformingProducts, topCategories, topBrands } = useMemo(() => {
    const productSalesMap: Record<string, { name: string; brand: string; image: string; unitsSold: number; revenue: number }> = {};
    const categorySalesMap: Record<string, { category: string; units: number; revenue: number }> = {};
    const brandSalesMap: Record<string, { brand: string; units: number; revenue: number }> = {};

    filteredOrders.forEach(o => {
      if (o.status === 'cancelled') return;
      (o.items || []).forEach(item => {
        const pId = item.productId || item.name;
        const matchedProd = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.name.toLowerCase());
        const brandName = matchedProd?.brand || 'Uncategorized Brand';
        const catName = matchedProd?.category || 'Skincare';
        const qty = item.quantity || 1;
        const rev = (item.price || 0) * qty;

        if (!productSalesMap[pId]) {
          productSalesMap[pId] = {
            name: item.name,
            brand: brandName,
            image: matchedProd?.image || '',
            unitsSold: 0,
            revenue: 0,
          };
        }
        productSalesMap[pId].unitsSold += qty;
        productSalesMap[pId].revenue += rev;

        if (!categorySalesMap[catName]) {
          categorySalesMap[catName] = { category: catName, units: 0, revenue: 0 };
        }
        categorySalesMap[catName].units += qty;
        categorySalesMap[catName].revenue += rev;

        if (!brandSalesMap[brandName]) {
          brandSalesMap[brandName] = { brand: brandName, units: 0, revenue: 0 };
        }
        brandSalesMap[brandName].units += qty;
        brandSalesMap[brandName].revenue += rev;
      });
    });

    return {
      topPerformingProducts: Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      topCategories: Object.values(categorySalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      topBrands: Object.values(brandSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    };
  }, [filteredOrders, products]);

  // Growth Trends Calculation (Real Period-over-Period)
  const growthMetrics = useMemo(() => {
    const now = new Date().getTime();
    const daysCount = dateRange === 'today' ? 1 : dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : dateRange === '90days' ? 90 : 30;
    const periodMs = daysCount * 24 * 60 * 60 * 1000;

    // Previous period orders
    const prevPeriodOrders = orders.filter(o => {
      const orderTime = new Date(o.createdAt).getTime();
      if (isNaN(orderTime)) return false;
      const diffMs = now - orderTime;
      return diffMs > periodMs && diffMs <= periodMs * 2 && o.status !== 'cancelled';
    });

    const currentRevenue = totalRevenue;
    const prevRevenue = prevPeriodOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const revenueGrowth = prevRevenue > 0 
      ? Number((((currentRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1))
      : currentRevenue > 0 ? 100 : 0;

    const currentOrders = completedOrdersCount;
    const prevOrders = prevPeriodOrders.length;
    const orderGrowth = prevOrders > 0
      ? Number((((currentOrders - prevOrders) / prevOrders) * 100).toFixed(1))
      : currentOrders > 0 ? 100 : 0;

    const prevAov = prevOrders > 0 ? Math.round(prevRevenue / prevOrders) : 0;
    const aovGrowth = prevAov > 0
      ? Number((((avgOrderValue - prevAov) / prevAov) * 100).toFixed(1))
      : avgOrderValue > 0 ? 100 : 0;

    return { revenueGrowth, orderGrowth, aovGrowth };
  }, [orders, totalRevenue, completedOrdersCount, avgOrderValue, dateRange]);

  // Daily Revenue Chart Data preparation for Recharts
  const dailyRevenueData = useMemo(() => {
    const map: { [key: string]: { date: string; revenue: number; orders: number } } = {};
    
    const daysCount = dateRange === 'today' ? 1 : dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : dateRange === '90days' ? 90 : 30;
    const now = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      map[key] = { date: label, revenue: 0, orders: 0 };
    }

    filteredOrders.forEach(o => {
      if (o.status === 'cancelled') return;
      const dateKey = new Date(o.createdAt).toISOString().slice(0, 10);
      if (map[dateKey]) {
        map[dateKey].revenue += (o.totalAmount || 0);
        map[dateKey].orders += 1;
      } else {
        const label = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!map[dateKey]) {
          map[dateKey] = { date: label, revenue: (o.totalAmount || 0), orders: 1 };
        }
      }
    });

    return Object.values(map);
  }, [filteredOrders, dateRange]);

  // Export CSV Report
  const handleExportCSV = () => {
    const headers = ['Order ID', 'Customer Name', 'Phone', 'Source', 'Status', 'Payment', 'Total (BDT)', 'Date'];
    const rows = filteredOrders.map(o => [
      o.id,
      `"${o.customerName || 'Guest'}"`,
      o.customerPhone || '',
      o.order_source || 'WEBSITE',
      o.status,
      o.paymentMethod || 'COD',
      o.totalAmount,
      new Date(o.createdAt).toLocaleString()
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ksf_store_report_${dateRange}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF Report using jsPDF & autotable
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(233, 30, 140); // #E91E8C
    doc.text('KSF Enterprise Master Analytics Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Timeframe: ${dateRange.toUpperCase()}`, 14, 28);

    // Summary Box
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, 34, 182, 22, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(`Net Revenue: BDT ${totalRevenue.toLocaleString()}`, 18, 43);
    doc.text(`Total Orders: ${totalOrdersCount}`, 75, 43);
    doc.text(`AOV: BDT ${avgOrderValue.toLocaleString()}`, 120, 43);
    doc.text(`Repeat Buyers: ${repeatCustomerStats.repeatRate}%`, 158, 43);

    // Transactions Table
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text('Transactions Ledger', 14, 66);

    const tableColumn = ["Order ID", "Customer Name", "Source", "Status", "Payment", "Amount (BDT)", "Date"];
    const tableRows = filteredOrders.map(o => [
      o.id,
      o.customerName || 'Guest',
      o.order_source || 'WEBSITE',
      o.status,
      o.paymentMethod || 'COD',
      `BDT ${o.totalAmount?.toLocaleString()}`,
      new Date(o.createdAt).toLocaleDateString()
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 70,
      theme: 'grid',
      headStyles: { fillColor: [233, 30, 140] },
      styles: { fontSize: 8, cellPadding: 3 },
    });

    doc.save(`ksf_enterprise_report_${dateRange}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`space-y-${isCompactMode ? '3' : '6'} pb-12`}>
      {/* Top Header & Actions */}
      <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white ${isCompactMode ? 'p-3' : 'p-5'} rounded-2xl border border-pink-100 shadow-xs print:hidden`}>
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-pink-600 uppercase tracking-widest mb-1">
            <BarChart3 size={15} /> KSF Enterprise Analytics & Intelligence
          </div>
          <h1 className={`${isCompactMode ? 'text-xl' : 'text-2xl'} font-black text-slate-900 tracking-tight`}>All Reports & Master Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time consolidated reports covering sales, financial reconciliation, inventory valuation, and channel performance.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Compact Mode Toggle */}
          <button
            onClick={() => setIsCompactMode(!isCompactMode)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              isCompactMode 
                ? 'bg-pink-600 text-white border-pink-600' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
            }`}
            title="Toggle Compact View"
          >
            {isCompactMode ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            <span>{isCompactMode ? 'Comfortable Mode' : 'Compact Mode'}</span>
          </button>

          {/* Date Range Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['today', '7days', '30days', '90days', 'all', 'custom'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                  dateRange === range 
                    ? 'bg-white text-[#E91E8C] shadow-xs border border-pink-200' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range === 'today' ? 'Today' : range === '7days' ? '7D' : range === '30days' ? '30D' : range === '90days' ? '90D' : range === 'all' ? 'All' : 'Custom'}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center justify-center cursor-pointer border border-slate-200"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-pink-600' : ''} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] border border-pink-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Download CSV Report"
          >
            <Download size={15} /> CSV Export
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-[#E91E8C] hover:bg-pink-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Download PDF Report"
          >
            <FileDown size={15} /> PDF Export
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Print Report"
          >
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Bar (if custom selected) */}
      {dateRange === 'custom' && (
        <div className="bg-pink-50/70 p-4 rounded-xl border border-pink-200 flex flex-wrap items-center gap-4 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Calendar size={16} className="text-[#E91E8C]" /> Custom Date Range:
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">From:</span>
            <input 
              type="date" 
              value={customStartDate} 
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium" 
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">To:</span>
            <input 
              type="date" 
              value={customEndDate} 
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium" 
            />
          </div>
          <span className="text-xs text-pink-700 font-bold ml-auto">
            Showing {filteredOrders.length} orders for selected timeframe
          </span>
        </div>
      )}

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`bg-white ${isCompactMode ? 'p-3' : 'p-5'} rounded-2xl border border-pink-100 shadow-xs flex items-center justify-between`}>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Net Revenue</span>
            <h3 className={`${isCompactMode ? 'text-lg' : 'text-2xl'} font-black text-slate-900 mt-0.5`}>৳{totalRevenue.toLocaleString()}</h3>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
              <ArrowUpRight size={14} /> +{growthMetrics.revenueGrowth}% vs prior period
            </span>
          </div>
          <div className={`w-${isCompactMode ? '10' : '12'} h-${isCompactMode ? '10' : '12'} rounded-2xl bg-pink-50 text-[#E91E8C] flex items-center justify-center border border-pink-100`}>
            <DollarSign size={isCompactMode ? 18 : 22} />
          </div>
        </div>

        <div className={`bg-white ${isCompactMode ? 'p-3' : 'p-5'} rounded-2xl border border-pink-100 shadow-xs flex items-center justify-between`}>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Orders</span>
            <h3 className={`${isCompactMode ? 'text-lg' : 'text-2xl'} font-black text-slate-900 mt-0.5`}>{totalOrdersCount}</h3>
            <span className="text-[11px] font-bold text-slate-500 mt-0.5 block">
              {completedOrdersCount} completed ({Math.round((completedOrdersCount / Math.max(1, totalOrdersCount)) * 100)}% rate)
            </span>
          </div>
          <div className={`w-${isCompactMode ? '10' : '12'} h-${isCompactMode ? '10' : '12'} rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100`}>
            <ShoppingBag size={isCompactMode ? 18 : 22} />
          </div>
        </div>

        <div className={`bg-white ${isCompactMode ? 'p-3' : 'p-5'} rounded-2xl border border-pink-100 shadow-xs flex items-center justify-between`}>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Avg Order Value (AOV)</span>
            <h3 className={`${isCompactMode ? 'text-lg' : 'text-2xl'} font-black text-slate-900 mt-0.5`}>৳{avgOrderValue.toLocaleString()}</h3>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
              <ArrowUpRight size={14} /> +{growthMetrics.aovGrowth}% basket size
            </span>
          </div>
          <div className={`w-${isCompactMode ? '10' : '12'} h-${isCompactMode ? '10' : '12'} rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100`}>
            <TrendingUp size={isCompactMode ? 18 : 22} />
          </div>
        </div>

        <div className={`bg-white ${isCompactMode ? 'p-3' : 'p-5'} rounded-2xl border border-pink-100 shadow-xs flex items-center justify-between`}>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Repeat Customer Rate</span>
            <h3 className={`${isCompactMode ? 'text-lg' : 'text-2xl'} font-black text-slate-900 mt-0.5`}>{repeatCustomerStats.repeatRate}%</h3>
            <span className="text-[11px] font-bold text-slate-600 mt-0.5 block">
              {repeatCustomerStats.repeatCustomers} of {repeatCustomerStats.uniqueCustomers} tracked buyers
            </span>
          </div>
          <div className={`w-${isCompactMode ? '10' : '12'} h-${isCompactMode ? '10' : '12'} rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100`}>
            <BarChart3 size={isCompactMode ? 18 : 22} />
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 gap-6 bg-white px-6 rounded-t-2xl pt-4 print:hidden">
        {[
          { id: 'sales', label: 'Sales & Financial Reports', icon: BarChart3 },
          { id: 'inventory', label: 'Inventory & Stock Reports', icon: Package },
          { id: 'creators', label: 'Creator & Commission Reports', icon: Sparkles },
          { id: 'ai', label: 'AI & Channel Analytics', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-3.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                isActive 
                  ? 'border-[#E91E8C] text-[#E91E8C]' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className={`bg-white rounded-2xl border border-pink-100 shadow-xs ${isCompactMode ? 'p-4' : 'p-6'} space-y-${isCompactMode ? '4' : '8'}`}>
        {activeTab === 'sales' && (
          <div className={`space-y-${isCompactMode ? '4' : '8'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`${isCompactMode ? 'text-sm' : 'text-base'} font-black text-slate-900`}>Daily Revenue & Sales Trend</h3>
                <p className="text-xs text-slate-500">Visualizing total daily sales performance over the selected timeframe.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-pink-50 text-pink-600 text-xs font-extrabold border border-pink-100">
                {filteredOrders.length} Orders in Period
              </span>
            </div>

            {/* Recharts Bar Chart: Daily Revenue */}
            <div className={`bg-slate-50/50 ${isCompactMode ? 'p-3' : 'p-5'} rounded-2xl border border-slate-200`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Revenue Breakdown (BDT)</span>
                <span className="text-xs text-slate-400 font-medium">Hover bars for exact daily sums</span>
              </div>
              <div className={`w-full ${isCompactMode ? 'h-52' : 'h-72'}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `৳${v}`} />
                    <Tooltip 
                      formatter={(value: any) => [`৳${Number(value || 0).toLocaleString()}`, 'Revenue']}
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                      itemStyle={{ color: '#f472b6' }}
                    />
                    <Bar dataKey="revenue" fill="#E91E8C" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Growth Trends Section (Requested) */}
            <div className="bg-gradient-to-r from-pink-50/70 via-purple-50/50 to-pink-50/70 p-5 rounded-2xl border border-pink-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#E91E8C]" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Period-over-Period Growth Trends</h4>
                </div>
                <span className="text-[11px] font-bold text-pink-700 bg-white px-2.5 py-1 rounded-lg border border-pink-100 shadow-2xs">
                  Compared to prior period
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-3.5 rounded-xl border border-pink-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Revenue Growth</span>
                    <p className="text-lg font-black text-emerald-600 mt-0.5">+{growthMetrics.revenueGrowth}%</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ArrowUpRight size={16} />
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-pink-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Order Volume Growth</span>
                    <p className="text-lg font-black text-emerald-600 mt-0.5">+{growthMetrics.orderGrowth}%</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ArrowUpRight size={16} />
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-pink-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">AOV Growth</span>
                    <p className="text-lg font-black text-emerald-600 mt-0.5">+{growthMetrics.aovGrowth}%</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ArrowUpRight size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Performing Products Table Component (Requested) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Award size={15} className="text-[#E91E8C]" /> Top Performing Products (Selected Timeframe)
                </h4>
                <span className="text-xs text-slate-400 font-medium">{topPerformingProducts.length} items ranked by revenue</span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-black text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Brand</th>
                      <th className="p-3 text-center">Units Sold</th>
                      <th className="p-3 text-right">Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {topPerformingProducts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-black text-pink-600">#{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <img src={p.image} alt={p.name} className="w-8 h-8 rounded object-cover border" />
                          <span className="truncate max-w-xs">{p.name}</span>
                        </td>
                        <td className="p-3 font-semibold text-slate-600">{p.brand}</td>
                        <td className="p-3 text-center font-black text-slate-900">{p.unitsSold} units</td>
                        <td className="p-3 text-right font-black text-slate-900">৳{p.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                    {topPerformingProducts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">No product sales recorded in this period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order Channel Split & Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`p-${isCompactMode ? '3' : '5'} rounded-xl border border-slate-200 bg-slate-50/50 space-y-4`}>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Order Channel Split</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-700 flex items-center gap-1.5"><ShoppingBag size={14} className="text-pink-600" /> Website Online Orders</span>
                      <span className="text-slate-900">{websiteOrdersCount} orders ({Math.round((websiteOrdersCount / Math.max(1, filteredOrders.length)) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-pink-600 h-full rounded-full" style={{ width: `${Math.round((websiteOrdersCount / Math.max(1, filteredOrders.length)) * 100)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-700 flex items-center gap-1.5"><BarChart3 size={14} className="text-purple-600" /> POS Terminal Sales</span>
                      <span className="text-slate-900">{posOrdersCount} orders ({Math.round((posOrdersCount / Math.max(1, filteredOrders.length)) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-purple-600 h-full rounded-full" style={{ width: `${Math.round((posOrdersCount / Math.max(1, filteredOrders.length)) * 100)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-700 flex items-center gap-1.5"><Package size={14} className="text-amber-600" /> Wholesale B2B Orders</span>
                      <span className="text-slate-900">{wholesaleOrdersCount} orders ({Math.round((wholesaleOrdersCount / Math.max(1, filteredOrders.length)) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.round((wholesaleOrdersCount / Math.max(1, filteredOrders.length)) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-${isCompactMode ? '3' : '5'} rounded-xl border border-slate-200 bg-slate-50/50 space-y-4`}>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Order Status Summary</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pending / Packing</span>
                    <p className="text-lg font-black text-amber-600 mt-1">
                      {filteredOrders.filter(o => o.status === 'pending' || o.status === 'packing').length}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Shipped / Delivered</span>
                    <p className="text-lg font-black text-emerald-600 mt-1">
                      {completedOrdersCount}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Cancelled</span>
                    <p className="text-lg font-black text-red-600 mt-1">
                      {cancelledOrdersCount}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Cash on Delivery</span>
                    <p className="text-lg font-black text-blue-600 mt-1">
                      {filteredOrders.filter(o => o.paymentMethod === 'COD').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Category & Brand Revenue Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Top Categories by Revenue</h4>
                {topCategories.length === 0 ? (
                  <p className="text-xs text-slate-400">No category revenue in selected timeframe.</p>
                ) : (
                  <div className="space-y-2">
                    {topCategories.map((cat) => (
                      <div key={cat.category} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-800">{cat.category}</span>
                        <span className="font-mono font-black text-slate-900">
                          ৳{cat.revenue.toLocaleString()} ({cat.units} u)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Top Brands by Revenue</h4>
                {topBrands.length === 0 ? (
                  <p className="text-xs text-slate-400">No brand revenue in selected timeframe.</p>
                ) : (
                  <div className="space-y-2">
                    {topBrands.map((b) => (
                      <div key={b.brand} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-800">{b.brand}</span>
                        <span className="font-mono font-black text-slate-900">
                          ৳{b.revenue.toLocaleString()} ({b.units} u)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Orders Ledger */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Transactions Ledger ({filteredOrders.length})</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-black text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Source</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredOrders.slice(0, 15).map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-slate-900">{o.id}</td>
                        <td className="p-3 font-bold text-slate-800">{o.customerName || 'Guest Customer'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${o.order_source === 'POS' ? 'bg-purple-50 text-purple-700' : 'bg-pink-50 text-pink-700'}`}>
                            {o.order_source || 'WEBSITE'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                            o.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' :
                            o.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-600">{o.paymentMethod || 'COD'}</td>
                        <td className="p-3 text-right font-black text-slate-900">৳{o.totalAmount?.toLocaleString()}</td>
                        <td className="p-3 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">No orders found in this period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Product List & Stock Valuation Reports</h3>
                <p className="text-xs text-slate-500">Monitor stock levels, low-stock warnings, and warehouse asset valuation.</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                  {totalStockUnits} Total Units in Stock
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                  {lowStockProducts.length} Low Stock Alert
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Catalog SKUs</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{totalCatalogItems}</p>
                <span className="text-xs text-emerald-600 mt-1 block">Active K-Beauty products</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Out of Stock Items</span>
                <p className="text-2xl font-black text-red-600 mt-1">{outOfStockProducts.length}</p>
                <span className="text-xs text-red-500 mt-1 block">Requires immediate restock</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Retail Valuation</span>
                <p className="text-2xl font-black text-slate-900 mt-1">৳{totalInventoryValuation.toLocaleString()}</p>
                <span className="text-xs text-blue-600 mt-1 block">Based on retail pricing</span>
              </div>
            </div>

            {/* Low Stock Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Low Stock & Out of Stock Alerts</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-black text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Brand</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Stock Units</th>
                      <th className="p-3 text-right">Retail Price</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {products.filter(p => (p.stock || 0) <= 5).map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <img src={p.image} alt={p.name} className="w-8 h-8 rounded object-cover border" />
                          <span className="truncate max-w-xs">{p.name}</span>
                        </td>
                        <td className="p-3 text-slate-600 font-semibold">{p.brand}</td>
                        <td className="p-3 text-slate-600">{p.category}</td>
                        <td className="p-3 font-black text-slate-900">{p.stock} units</td>
                        <td className="p-3 text-right font-black text-slate-900">৳{p.retailPrice || p.price}</td>
                        <td className="p-3">
                          {p.stock <= 0 ? (
                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">Out of Stock</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">Low Stock</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {products.filter(p => (p.stock || 0) <= 5).length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-emerald-600 font-bold">All products are well-stocked! No low stock warnings.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'creators' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Creator & Referral Attribution Reports</h3>
                <p className="text-xs text-slate-500">Live counts from verified `public_creators` records and coupon/referral-attributed orders.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-pink-50 text-pink-700 text-xs font-bold border border-pink-100">
                Live Firestore Data
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Registered Creators</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{creatorRecords.length}</p>
                <span className="text-xs text-pink-600 mt-1 block">Active creator profiles</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Creator Points</span>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {creatorRecords.reduce((sum, c) => sum + Number(c.totalPoints || 0), 0).toLocaleString()} pts
                </p>
                <span className="text-xs text-emerald-600 mt-1 block">Earned across network</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Coupon-Attributed Orders</span>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {filteredOrders.filter((o) => Boolean(o.couponCode)).length}
                </p>
                <span className="text-xs text-purple-600 mt-1 block">Orders with promo/ref codes</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Creator Reels</span>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {creatorRecords.reduce((sum, c) => sum + Number(c.totalReels || 0), 0)}
                </p>
                <span className="text-xs text-blue-600 mt-1 block">Recorded on creator profiles</span>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 text-center space-y-3">
              <Sparkles size={28} className="text-pink-600 mx-auto" />
              <h4 className="text-sm font-black text-slate-900">Creator Leaderboard & Moderation</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All creator tiers, reel approvals, and commission settlements are managed directly inside the Creators Hub module.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Catalog Completeness & AI Content Analytics</h3>
                <p className="text-xs text-slate-500">Live PDP readiness score, Gemini SEO metadata coverage, and social copy generation across all {totalCatalogItems} SKUs.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                Gemini 2.5 Flash
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Catalog SEO Enriched</span>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {catalogContentMetrics.seoGeneratedCount} / {totalCatalogItems} SKUs
                </p>
                <span className="text-xs text-blue-600 mt-1 block">Products with AI SEO metadata</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Social Copy Coverage</span>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {catalogContentMetrics.socialCopyCount} / {totalCatalogItems} SKUs
                </p>
                <span className="text-xs text-fuchsia-600 mt-1 block">Products with generated captions</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Avg PDP Completeness</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{catalogContentMetrics.avgCompleteness}%</p>
                <span className="text-xs text-amber-700 mt-1 block">
                  {catalogContentMetrics.needsWorkCount} SKUs below 60% readiness
                </span>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <h4 className="text-sm font-black text-slate-900">Catalog & Fulfillment Readiness</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span>In-Stock SKUs</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                    {totalCatalogItems - outOfStockProducts.length} Active
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span>Low Stock Warnings (≤ 5)</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                    {lowStockProducts.length} SKUs
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span>Active Orders in Period</span>
                  <span className="px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-bold">
                    {activeOrders.length} Orders
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
