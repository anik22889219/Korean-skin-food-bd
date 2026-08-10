import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adService } from '../services/adService';
import { agentService, AiAgentRun } from '../services/agentService';
import { productService } from '../services/productService';
import { posService } from '../services/posService';
import { slackNotificationService } from '../services/slackNotificationService';
import { Product, Order, AdPerformance } from '../types';
import { 
  TrendingUp, Wand2, RefreshCw, AlertCircle, ShoppingBag, 
  ArrowUpRight, ArrowDownRight, Zap, Play, CheckCircle, ShieldCheck,
  Send, Users, Bell, Clock, RotateCcw, ChevronRight, MessageSquare, AlertTriangle, ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ResponsiveContainer, ComposedChart, Bar, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend 
} from 'recharts';

export const AdminDashboardHome: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [adPerformance, setAdPerformance] = useState<AdPerformance[]>([]);
  const [realAgentRuns, setRealAgentRuns] = useState<AiAgentRun[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [slackSummary, setSlackSummary] = useState<any>(null);
  
  // Loading and action triggers
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [isSyncingAds, setIsSyncingAds] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [isSendingTestAlert, setIsSendingTestAlert] = useState(false);
  const [isRetryingQueue, setIsRetryingQueue] = useState(false);
  const [slackActionMsg, setSlackActionMsg] = useState<string | null>(null);

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

      // Load Slack Ops Summary
      const summary = await slackNotificationService.getOpsSummary();
      setSlackSummary(summary);
    } catch (err) {
      console.error('[DashboardHome] Failed to load data:', err);
      setIsLoadingAds(false);
      setIsLoadingRuns(false);
    }
  };

  const handleSendTestAlert = async () => {
    setIsSendingTestAlert(true);
    setSlackActionMsg(null);
    try {
      await slackNotificationService.sendTestNotification('#system-alerts');
      const updated = await slackNotificationService.getOpsSummary();
      setSlackSummary(updated);
      setSlackActionMsg('✅ Test notification successfully enqueued to #system-alerts!');
      setTimeout(() => setSlackActionMsg(null), 4000);
    } catch (err: any) {
      setSlackActionMsg(`❌ Test failed: ${err.message}`);
    } finally {
      setIsSendingTestAlert(false);
    }
  };

  const handleRetryQueue = async () => {
    setIsRetryingQueue(true);
    setSlackActionMsg(null);
    try {
      const res = await slackNotificationService.retryFailedQueue();
      const updated = await slackNotificationService.getOpsSummary();
      setSlackSummary(updated);
      setSlackActionMsg(`🔄 ${res.message}`);
      setTimeout(() => setSlackActionMsg(null), 4000);
    } catch (err: any) {
      setSlackActionMsg(`❌ Retry failed: ${err.message}`);
    } finally {
      setIsRetryingQueue(false);
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
      const updated = await slackNotificationService.getOpsSummary();
      setSlackSummary(updated);
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
            Autonomous audit agents are monitoring warehouse stock. Slack notifications & Meta Ads are synchronizing operations in real-time.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 z-10">
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

      {/* Slack Integration Dashboard Hub */}
      <div className="bg-white p-6 rounded-[28px] border border-pink-200/80 shadow-md space-y-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-pink-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E91E8C] to-purple-600 flex items-center justify-center text-white shadow-md shadow-[#E91E8C]/20 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-slate-900 tracking-tight">Slack Operations & Team Hub</h4>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {slackSummary?.connectionStatus?.configured ? '🟢 Bolt SDK Active' : '🟡 Safe Mode Ready'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Real-time synchronization for orders, inventory alerts, courier status, and customer support tickets.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSendTestAlert}
              disabled={isSendingTestAlert}
              className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] font-extrabold text-xs rounded-xl border border-pink-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Send size={12} className={isSendingTestAlert ? 'animate-bounce' : ''} />
              <span>{isSendingTestAlert ? 'Sending...' : 'Test Alert'}</span>
            </button>

            <button
              onClick={handleRetryQueue}
              disabled={isRetryingQueue}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw size={12} className={isRetryingQueue ? 'animate-spin' : ''} />
              <span>Retry Queue</span>
            </button>

            <button
              onClick={() => navigate('/admin/slack')}
              className="px-3.5 py-1.5 bg-[#E91E8C] hover:bg-pink-600 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Slack Settings</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {slackActionMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-pink-50/80 border border-pink-200 rounded-xl text-xs font-bold text-pink-900"
          >
            {slackActionMsg}
          </motion.div>
        )}

        {/* Status Metrics Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Channels</span>
            <div className="text-base font-black text-slate-900 font-mono">
              {slackSummary?.connectionStatus?.activeChannelsCount || 6} Channels
            </div>
            <span className="text-[9px] text-pink-600 font-bold block">#new-orders, #inventory</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Approvals</span>
            <div className="text-base font-black text-amber-600 font-mono">
              {slackSummary?.connectionStatus?.pendingApprovalsCount || 0} Items
            </div>
            <span className="text-[9px] text-amber-700 font-bold block">Imports & Refunds</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Team Online</span>
            <div className="text-base font-black text-emerald-600 font-mono">
              {slackSummary?.teamOnlineStatus?.length || 2} Members
            </div>
            <span className="text-[9px] text-emerald-700 font-bold block">RBAC Mapped</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Queue Status</span>
            <div className="text-base font-black text-slate-800 capitalize font-mono">
              {slackSummary?.queueMetrics?.queueStatus || 'Idle'}
            </div>
            <span className="text-[9px] text-slate-500 font-bold block">Rate Limit: {slackSummary?.connectionStatus?.rateLimitMs || 500}ms</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-150 space-y-1 col-span-2 md:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Queue Metrics</span>
            <div className="text-base font-black text-blue-600 font-mono">
              {slackSummary?.queueMetrics?.sentCount || 0} Sent / {slackSummary?.queueMetrics?.pendingCount || 0} Queued
            </div>
            <span className="text-[9px] text-slate-500 font-bold block">Errors: {slackSummary?.queueMetrics?.totalErrorLogs || 0}</span>
          </div>
        </div>

        {/* Dual Column Slack Feeds: Recent Activity & Pending Approvals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
          {/* Left: Recent Slack Activity Stream */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                <Bell size={13} />
                <span>Live Slack Activity Stream</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Last 8 dispatches</span>
            </div>

            {(!slackSummary?.recentActivity || slackSummary.recentActivity.length === 0) ? (
              <div className="text-center py-6 text-slate-400 text-xs font-mono">
                No recent Slack activity logs. Trigger test alert or create a POS order!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 text-xs">
                {slackSummary.recentActivity.map((log: any) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-extrabold text-pink-400 uppercase font-mono">{log.type.replace('_', ' ')}</span>
                      <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-300 font-medium truncate">{log.title}</p>
                    {log.lastAction && (
                      <div className="text-[10px] text-emerald-400 font-mono truncate">
                        Action: {log.lastAction} (by {log.lastActionBy})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Team Online Status & Pending Approvals */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Users size={13} className="text-[#E91E8C]" />
                <span>Team Members & Roles Mapped</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">RBAC Active</span>
            </div>

            <div className="space-y-2">
              {slackSummary?.teamOnlineStatus?.map((user: any) => (
                <div key={user.slackUserId} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative w-7 h-7 rounded-lg bg-pink-100 text-[#E91E8C] font-black flex items-center justify-center shrink-0 text-xs">
                      {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                    </div>
                    <div className="truncate">
                      <strong className="block text-slate-900 truncate leading-none mb-0.5">{user.name}</strong>
                      <span className="text-[10px] text-slate-500 font-mono block">@{user.slackUsername} ({user.slackUserId})</span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-md bg-pink-50 text-[#E91E8C] font-extrabold text-[10px] uppercase border border-pink-100 shrink-0">
                    {user.role?.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
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
            <Wand2 className="text-[#E91E8C]" size={14} />
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
