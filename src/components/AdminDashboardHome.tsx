import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Bot, Boxes, ShoppingBag, Sparkles, MessageCircle, CreditCard, Palette, ShieldCheck, Search, Megaphone, Users, ChevronRight, Store, FileText, Landmark, Receipt } from 'lucide-react';

interface AdminNavCard { title: string; description: string; to: string; icon: React.ElementType; tone: string; iconTone: string; badge?: string; }

const navCards: AdminNavCard[] = [
  { title: 'Command Overview', description: 'Sales, inventory, AI and operations at a glance.', to: '/admin', icon: BarChart3, tone: 'from-violet-50 to-indigo-50 border-violet-100', iconTone: 'bg-violet-100 text-violet-600', badge: 'LIVE' },
  { title: 'Business Banking & Dues', description: 'Cash flow, multi-wallet accounts, COGS, P&L and expenses.', to: '/admin/business-finance', icon: Landmark, tone: 'from-emerald-50 to-teal-50 border-emerald-100', iconTone: 'bg-emerald-100 text-emerald-600', badge: 'FINANCE' },
  { title: 'Due Payments & Receivables', description: 'Track unpaid customer balances, collect dues, and view overdue aging.', to: '/admin/payments-due', icon: Receipt, tone: 'from-amber-50 to-orange-50 border-amber-100', iconTone: 'bg-amber-100 text-amber-600', badge: 'DUES' },
  { title: 'All Reports & Analytics', description: 'Consolidated financial reports, inventory valuation and channel stats.', to: '/admin/reports', icon: FileText, tone: 'from-rose-50 to-pink-50 border-rose-100', iconTone: 'bg-rose-100 text-rose-600', badge: 'REPORTS' },
  { title: 'Creator Hub', description: 'Approve creators, moderate reels, manage points, tiers & leaderboard.', to: '/admin/creators', icon: Sparkles, tone: 'from-pink-50 to-rose-50 border-pink-100', iconTone: 'bg-pink-100 text-pink-600', badge: 'CREATORS' },
  { title: 'User Management', description: 'Super Admin & HR user accounts and access control.', to: '/admin/users', icon: Users, tone: 'from-indigo-50 to-purple-50 border-indigo-100', iconTone: 'bg-indigo-100 text-indigo-600', badge: 'HR' },
  { title: 'AI Agent Manager', description: 'Manage AI agents, permissions, quotas and activity.', to: '/admin/ai-agents', icon: Bot, tone: 'from-purple-50 to-indigo-50 border-purple-100', iconTone: 'bg-purple-100 text-purple-600', badge: 'AI' },
  { title: 'Skincare Catalog', description: 'Products, stock, barcode tools and product intelligence.', to: '/admin/products', icon: Boxes, tone: 'from-emerald-50 to-teal-50 border-emerald-100', iconTone: 'bg-emerald-100 text-emerald-600', badge: 'STOCK' },
  { title: 'Order Fulfillment', description: 'Review orders and manage the fulfillment workflow.', to: '/admin/orders', icon: ShoppingBag, tone: 'from-amber-50 to-yellow-50 border-amber-100', iconTone: 'bg-amber-100 text-amber-600', badge: 'OPS' },
  { title: 'SEO Optimizer', description: 'Generate and refine search-friendly product content.', to: '/admin/seo', icon: Search, tone: 'from-blue-50 to-cyan-50 border-blue-100', iconTone: 'bg-blue-100 text-blue-600', badge: 'AI' },
  { title: 'Social Copy Studio', description: 'Create campaign-ready social media content with AI.', to: '/admin/social', icon: Megaphone, tone: 'from-fuchsia-50 to-pink-50 border-fuchsia-100', iconTone: 'bg-fuchsia-100 text-fuchsia-600', badge: 'AI' },
  { title: 'WhatsApp Leads', description: 'Manage skincare conversations and customer leads.', to: '/admin/chat-leads', icon: MessageCircle, tone: 'from-green-50 to-emerald-50 border-green-100', iconTone: 'bg-green-100 text-green-600', badge: 'CRM' },
  { title: 'POS Register', description: 'Run in-store sales and barcode-based checkout.', to: '/admin/pos', icon: CreditCard, tone: 'from-sky-50 to-blue-50 border-sky-100', iconTone: 'bg-sky-100 text-sky-600', badge: 'POS' },
  { title: 'Theme Editor', description: 'Control storefront branding and visual settings.', to: '/admin/theme-editor', icon: Palette, tone: 'from-purple-50 to-fuchsia-50 border-purple-100', iconTone: 'bg-purple-100 text-purple-600', badge: 'DESIGN' },
  { title: 'Slack Operations', description: 'Monitor alerts, queues and team operations.', to: '/admin/slack', icon: ShieldCheck, tone: 'from-slate-50 to-gray-50 border-slate-200', iconTone: 'bg-slate-100 text-slate-600', badge: 'OPS' },
];

export const AdminDashboardHome: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const isInventoryManager = profile?.role === 'inventory_manager';
  const inventoryManagerAllowedPaths = [
    '/admin/products',
    '/admin/reports',
    '/admin/orders',
    '/admin/chat-leads',
    '/admin/pos',
  ];

  const visibleNavCards = navCards.filter((card) => {
    if (isInventoryManager) {
      return inventoryManagerAllowedPaths.includes(card.to);
    }
    return true;
  });

  return (
    <div className="min-h-full pb-8">
      <section className="relative overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-white via-[#FFF8FB] to-pink-50 p-5 sm:p-6 lg:p-7 shadow-sm">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-pink-200/30 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-purple-200/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-pink-600"><Sparkles size={13} />Korean Skin Food BD · Admin Command Center</div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Assalamu Alaikum, {profile?.name || 'Administrator'}</h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">Everything you need to run the K-Beauty store, manage AI automation and keep daily operations moving.</p>
          </div>
          <button onClick={() => navigate('/')} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 shadow-sm transition hover:border-pink-300 hover:bg-pink-50"><Store size={15} className="text-pink-600" />View Storefront</button>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-pink-100 bg-white p-3 shadow-sm"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Store</span><div className="mt-1 flex items-center gap-1.5 text-xs font-extrabold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Operational</div></div>
        <div className="rounded-2xl border border-pink-100 bg-white p-3 shadow-sm"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">AI System</span><div className="mt-1 flex items-center gap-1.5 text-xs font-extrabold text-pink-600"><Bot size={13} />Agent Ready</div></div>
        <div className="rounded-2xl border border-pink-100 bg-white p-3 shadow-sm"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Operations</span><div className="mt-1 flex items-center gap-1.5 text-xs font-extrabold text-blue-600"><BarChart3 size={13} />Monitoring</div></div>
        <div className="rounded-2xl border border-pink-100 bg-white p-3 shadow-sm"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Access</span><div className="mt-1 flex items-center gap-1.5 text-xs font-extrabold text-violet-600"><Users size={13} />{profile?.role === 'super_admin' ? 'Super Admin' : 'Staff'}</div></div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-end justify-between px-1"><div><h2 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">Admin Navigation</h2><p className="mt-0.5 text-[11px] text-slate-400">Choose a workspace to continue</p></div><span className="hidden rounded-full bg-pink-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-pink-600 sm:inline-flex">{visibleNavCards.length} Workspaces</span></div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {visibleNavCards.map((card) => { const Icon = card.icon; return (
            <button key={card.to} type="button" onClick={() => navigate(card.to)} className={`group relative flex min-h-[148px] flex-col items-center justify-center overflow-hidden rounded-[22px] border bg-gradient-to-br p-4 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] sm:min-h-[164px] sm:rounded-[24px] ${card.tone}`}>
              <span className="absolute right-3 top-3 rounded-full bg-white/80 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-slate-400 backdrop-blur">{card.badge}</span>
              <span className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ring-1 ring-white/80 transition group-hover:scale-105 sm:h-16 sm:w-16 ${card.iconTone}`}><Icon size={25} strokeWidth={2} /></span>
              <span className="text-sm font-black tracking-tight text-slate-800 sm:text-[15px]">{card.title}</span>
              <span className="mt-1.5 line-clamp-2 max-w-[210px] text-[10px] leading-4 text-slate-500 sm:text-[11px]">{card.description}</span>
              {card.to !== '/admin' && <span className="absolute bottom-3 right-3 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-pink-500"><ChevronRight size={15} /></span>}
            </button>
          ); })}
        </div>
      </section>

      <section className="mt-5 rounded-[24px] border border-dashed border-pink-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600"><Bot size={19} /></div><div><h3 className="text-sm font-black text-slate-900">AI Workforce & User Management</h3><p className="mt-0.5 text-[10px] leading-4 text-slate-500">The next admin layer will assign AI agents to users and enforce per-agent usage limits and permissions.</p></div></div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-amber-700">Planned Module</span>
        </div>
      </section>
    </div>
  );
};
