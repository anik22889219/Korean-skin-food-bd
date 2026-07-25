import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, CreditCard, Boxes, TrendingUp, Wand2, MessageCircle, 
  LogOut, Menu, X, Eye, Crown, ChevronRight, Store, ShieldCheck, Palette, Package 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminLayout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { to: '/admin', label: 'Dashboard Overview', badge: 'Live', icon: BarChart3, end: true },
    { to: '/admin/orders', label: 'Order Fulfillment', badge: 'Workflow', icon: Package },
    { to: '/admin/theme-editor', label: 'Theme Editor', badge: 'New', icon: Palette },
    { to: '/admin/pos', label: 'POS Register', badge: 'Terminal', icon: CreditCard },
    { to: '/admin/products', label: 'Skincare Catalog', badge: 'Stock', icon: Boxes },
    { to: '/admin/seo', label: 'SEO Optimizer', badge: 'Google', icon: TrendingUp },
    { to: '/admin/social', label: 'Social Copy Studio', badge: 'AI', icon: Wand2 },
    { to: '/admin/chat-leads', label: 'WhatsApp Leads', badge: 'CRM', icon: MessageCircle },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8FA]/40 flex text-slate-800 font-sans">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sticky / Fixed Premium Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 h-screen w-64 p-5 flex flex-col justify-between 
        bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 
        border-r border-slate-800/80 shadow-2xl transition-all duration-300
        lg:sticky lg:top-0 lg:z-30 lg:translate-x-0 shrink-0 overflow-y-auto scrollbar-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="space-y-6">
          {/* Brand / Role Header */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E91E8C] via-pink-600 to-purple-600 p-0.5 shadow-lg shadow-[#E91E8C]/25 shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-300">
                  <Crown size={18} />
                </div>
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-sm tracking-tight text-white truncate">KSF Admin Deck</h4>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                </div>
                <span className="text-[10px] text-pink-400 font-extrabold tracking-wider uppercase block mt-0.5">
                  {profile?.role === 'super_admin' ? 'Super Admin Portal' : 'Executive Staff'}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-3 block mb-1">
              Main Operations
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `
                    group flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-extrabold transition-all duration-200 cursor-pointer border
                    ${isActive 
                      ? 'bg-gradient-to-r from-[#E91E8C] via-pink-600 to-purple-600 text-white shadow-lg shadow-[#E91E8C]/25 border-pink-400/40' 
                      : 'text-slate-300 hover:text-white bg-slate-900/40 hover:bg-slate-850/80 border-slate-800/60 hover:border-slate-700/80'}
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`
                          w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0
                          ${isActive 
                            ? 'bg-white/20 backdrop-blur-md text-white shadow-inner border border-white/30' 
                            : 'bg-slate-800/90 border border-slate-700/60 text-pink-400 group-hover:bg-[#E91E8C] group-hover:text-white group-hover:border-pink-400 group-hover:shadow-md group-hover:shadow-[#E91E8C]/30'}
                        `}>
                          <Icon size={16} />
                        </div>
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span className={`
                        text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0 transition-colors
                        ${isActive 
                          ? 'bg-white/20 text-white border border-white/30' 
                          : 'bg-slate-800 text-pink-400 group-hover:bg-slate-700 group-hover:text-white'}
                      `}>
                        {item.badge}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-5 border-t border-slate-800/80 space-y-3">
          {/* View Storefront Quick Button */}
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-pink-950/40 to-purple-950/40 border border-pink-500/20 text-pink-300 hover:text-white hover:border-pink-500/40 transition text-xs font-bold cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Store size={14} className="text-[#E91E8C]" />
              <span>View Storefront</span>
            </div>
            <ChevronRight size={14} className="text-pink-400" />
          </button>

          {/* Admin User Profile Box */}
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E91E8C] to-purple-600 p-0.5 text-xs font-black text-white shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-pink-300 font-extrabold">
                  {profile?.name?.slice(0, 2).toUpperCase() || 'AD'}
                </div>
              </div>
              <div className="truncate text-xs">
                <span className="font-extrabold block text-white truncate leading-none mb-0.5">{profile?.name}</span>
                <span className="text-[9px] text-pink-400 font-semibold truncate block capitalize">{profile?.role?.replace('_', ' ')}</span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition cursor-pointer shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top bar inside admin layout */}
        <header className="h-16 bg-white border-b border-pink-100/50 px-4 md:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-sm shadow-pink-50/20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1 text-slate-600 hover:text-pink-600 cursor-pointer animate-pulse"
              id="admin_mobile_menu_trigger"
            >
              <Menu size={20} />
            </button>
            <span className="hidden sm:inline-block text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Korean Skin Food Bangladesh Admin Deck
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-3.5 py-1.5 bg-white hover:bg-pink-50 text-gray-700 font-bold rounded-xl border border-pink-200 cursor-pointer transition text-xs flex items-center gap-1.5 shadow-sm"
              id="view_storefront_btn"
            >
              <Eye size={12} className="text-[#E91E8C]" />
              <span>View Storefront</span>
            </button>
          </div>
        </header>

        {/* Sticky Horizontal Quick-Nav for Admin Pages */}
        <div className="sticky top-16 bg-white/95 backdrop-blur-md border-b border-pink-100 z-20 flex items-center gap-2 px-4 md:px-8 py-2.5 overflow-x-auto scrollbar-none shadow-sm shadow-pink-50/10">
          <span className="text-[9px] font-extrabold text-pink-600 uppercase tracking-wider shrink-0 mr-1 hidden xs:inline-block">Quick Menu:</span>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold whitespace-nowrap transition cursor-pointer shrink-0 border
                  ${isActive 
                    ? 'bg-pink-50 border-pink-200 text-[#E91E8C] shadow-sm scale-[0.98]' 
                    : 'border-slate-100 bg-slate-50/40 text-slate-500 hover:text-[#E91E8C] hover:bg-pink-50/30'}
                `}
              >
                <Icon size={12} className="text-[#E91E8C]" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Page Inner Container */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto w-full min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
