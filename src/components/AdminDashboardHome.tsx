import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adService } from '../services/adService';
import { agentService, AiAgentRun } from '../services/agentService';
import { productService } from '../services/productService';
import { posService } from '../services/posService';
import { Product, Order, AdPerformance } from '../types';
import { 
  TrendingUp, Sparkles, RefreshCw, AlertCircle, ShoppingBag, 
  ArrowUpRight, ArrowDownRight, Zap, Play, CheckCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  ResponsiveContainer, ComposedChart, Bar, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend 
} from 'recharts';

export const AdminDashboardHome: React.FC = () => {
  const { profile } = useAuth();
  const [adPerformance, setAdPerformance] = useState<AdPerformance[]>([]);
  const [realAgentRuns, setRealAgentRuns] = useState<AiAgentRun[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Loading and action triggers
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [isSyncingAds, setIsSyncingAds] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoadingAds(true);
    setIsLoadingRuns(true);
    try {
      // Load products & orders
      setProducts(productService.getProducts());
      
      const ords = posService.getOrders();
      setOrders(ords);

      // Load ad performance
      const ads = await adService.getAdPerformance();
      setAdPerformance(ads);
      setIsLoadingAds(false);

      // Load AI Agent logs
      const runs = await agentService.getRecentRuns(5);
      setRealAgentRuns(runs);
      setIsLoadingRuns(false);
    } catch (err) {
      console.error('[DashboardHome] Failed to load data:', err);
      setIsLoadingAds(false);
      setIsLoadingRuns(false);
    }
  };

  const handleSyncMetaAds = async () => {
    setIsSyncingAds(true);
    try {
      const synced = await adService.syncMetaAds(true); // default to seeding mock so it displays instantly
      setAdPerformance(synced);
      const runs = await agentService.getRecentRuns(5);
      setRealAgentRuns(runs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncingAds(false);
    }
  };

  const handleRunInventoryAudit = async () => {
    setIsAgentRunning(true);
    try {
      await agentService.triggerInventoryWatch();
      const runs = await agentService.getRecentRuns(5);
      setRealAgentRuns(runs);
      setProducts(productService.getProducts());
    } catch (err) {
      console.error(err);
    } finally {
      setIsAgentRunning(false);
    }
  };

  // Quick stats calculations
  const totalSpend = adPerformance.slice(-7).reduce((sum, d) => sum + d.spend, 0);
  const totalPurchases = adPerformance.slice(-7).reduce((sum, d) => sum + d.purchases, 0);
  const totalRevenue = adPerformance.slice(-7).reduce((sum, d) => sum + (d.revenue || (d.purchases * 2450)), 0);
  const averageROAS = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0.00';

  // Low stock check
  const lowStockProducts = products.filter(p => p.stock <= 5);

  return (
    <div className="space-y-6">
      {/* Top Welcome Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-pink-950 p-6 rounded-[28px] text-white shadow-md border border-slate-800 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 z-10">
          <span className="text-pink-400 font-extrabold text-[10px] uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Zap size={11} className="animate-pulse" />
            <span>K-Beauty Command center</span>
          </span>
          <h3 className="text-xl font-black tracking-tight">Assalamu Alaikum, {profile?.name || 'Skincare Administrator'}</h3>
          <p className="text-xs text-slate-300 max-w-xl">
            Autonomous audit agents are monitoring warehouse stock. Facebook Pixel & Meta Ads are synchronizing conversions in real-time.
          </p>
        </div>
        <div className="flex gap-2.5 z-10">
          <button
            onClick={handleRunInventoryAudit}
            disabled={isAgentRunning}
            className="px-4 py-2 bg-[#E91E8C] hover:bg-[#FF4B91] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#E91E8C]/20 cursor-pointer disabled:opacity-40 transition"
          >
            <Play size={11} className={isAgentRunning ? 'animate-spin' : ''} />
            <span>{isAgentRunning ? 'Running Audit...' : 'Audit Stock levels'}</span>
          </button>
          <button
            onClick={handleSyncMetaAds}
            disabled={isSyncingAds}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-pink-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition"
          >
            <RefreshCw size={11} className={isSyncingAds ? 'animate-spin' : ''} />
            <span>Sync Ads</span>
          </button>
        </div>

        {/* Ambient Glowing Orbs */}
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-[#E91E8C]/15 blur-[60px]" />
        <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full bg-pink-500/10 blur-[60px]" />
      </div>

      {/* Stats Bento Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-[24px] border border-pink-100 shadow-sm space-y-2 relative overflow-hidden">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">7-Day Ads Budget</span>
          <div className="text-2xl font-black text-slate-900 font-mono">৳{totalSpend.toLocaleString()} BDT</div>
          <span className="text-[10px] text-pink-500 font-bold flex items-center gap-0.5"><ArrowUpRight size={10} /> Meta Graph API v19</span>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-pink-100 shadow-sm space-y-2">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">7-Day Ad Sales</span>
          <div className="text-2xl font-black text-slate-900">{totalPurchases} Conversions</div>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5"><ArrowUpRight size={10} /> Meta Pixel Active</span>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-pink-100 shadow-sm space-y-2">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Estimated ROAS</span>
          <div className="text-2xl font-black text-[#E91E8C] font-mono">{averageROAS}x</div>
          <span className="text-[10px] text-slate-500 font-semibold block">Target baseline: 4.50x</span>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-pink-100 shadow-sm space-y-2">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Est. Revenue (7D)</span>
          <div className="text-2xl font-black text-emerald-600 font-mono">৳{totalRevenue.toLocaleString()} BDT</div>
          <span className="text-[10px] text-slate-500 font-semibold block">AOV: ~৳2,450 BDT</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recharts Conversion Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Conversion Analytics (Last 14 Days)</h4>
              <p className="text-[10px] text-gray-400">Comparing marketing budget spends with checkout acquisitions.</p>
            </div>
            <span className="text-[10px] font-bold bg-pink-50 text-[#E91E8C] px-2.5 py-1 rounded-full border border-pink-100">Live feed</span>
          </div>

          <div className="h-64 w-full text-xs font-mono">
            {isLoadingAds ? (
              <div className="h-full flex items-center justify-center text-gray-400 font-semibold animate-pulse">Syncing marketing metrics...</div>
            ) : adPerformance.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">Click Sync Ads to generate marketing graph.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={adPerformance.slice(-14)} margin={{ top: 10, right: 0, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fce4ec" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} stroke="#9d174d" fontSize={9} />
                  <YAxis yAxisId="left" stroke="#e91e63" fontSize={9} />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={9} />
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Bar yAxisId="left" dataKey="spend" name="Spend (৳ BDT)" fill="#F472B6" radius={[3, 3, 0, 0]} barSize={10} />
                  <Line yAxisId="right" type="monotone" dataKey="purchases" name="Purchases" stroke="#10b981" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Column: Stock Alerts (1 col) */}
        <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm space-y-4">
          <div>
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Warehouse Inventory Warnings</h4>
            <p className="text-[10px] text-gray-400">Immediate action required on high-demand, low stock cosmetics.</p>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="text-center py-10 bg-emerald-50/15 border border-dashed border-emerald-100 rounded-2xl space-y-1.5">
              <CheckCircle size={28} className="text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-emerald-950">All stock levels nominal</p>
              <p className="text-[10px] text-gray-400">No items currently under 5 units.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {lowStockProducts.map(p => (
                <div key={p.id} className="p-3 bg-red-50/30 border border-red-150 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-0.5 truncate max-w-[150px]">
                    <span className="text-[9px] uppercase font-bold text-red-600 block">{p.brand}</span>
                    <strong className="text-gray-950 block truncate">{p.name}</strong>
                  </div>
                  <span className="px-2 py-1 bg-red-50 border border-red-200 text-red-700 font-bold rounded-lg text-[10px] font-mono shrink-0">
                    {p.stock} units left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Autonomous AI Agent Timeline */}
      <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm space-y-4">
        <div>
          <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="text-[#E91E8C]" size={14} />
            <span>Autonomous Skincare Optimizer Activity Log</span>
          </h4>
          <p className="text-[10px] text-gray-400">Live stream of cron background crawls, margin recommendations, and automated discount suggestions.</p>
        </div>

        {isLoadingRuns ? (
          <div className="py-12 text-center text-xs text-gray-400 font-semibold animate-pulse">Querying database logs...</div>
        ) : realAgentRuns.length === 0 ? (
          <div className="text-center py-10 bg-pink-50/5 rounded-2xl border border-dashed border-pink-100 text-xs text-gray-500">
            No autonomous runs recorded. Try triggering the stock audit agent at the top!
          </div>
        ) : (
          <div className="divide-y divide-pink-50">
            {realAgentRuns.slice(0, 3).map((run) => (
              <div key={run.id} className="py-4 first:pt-0 last:pb-0 space-y-2 text-xs">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-extrabold text-[#E91E8C] uppercase font-mono bg-pink-50 px-2 py-0.5 rounded border border-pink-100">
                    {run.agentType}
                  </span>
                  <span className="text-gray-400 font-bold">{new Date(run.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-gray-700 leading-relaxed font-medium">
                  🤖 <strong className="text-slate-800">Result Summary:</strong> {run.summary}
                </p>
                {run.output?.suggestions && run.output.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {run.output.suggestions.map((s: any, idx: number) => (
                      <span key={idx} className="bg-pink-50 text-pink-700 border border-pink-100 px-2 py-0.5 rounded text-[10px] font-mono">
                        Offer {s.productName.split(' ')[0]}: -{s.suggestedDiscountPercentage}%
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
