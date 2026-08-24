import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, CreditCard, Boxes, TrendingUp, Wand2, MessageCircle, 
  LogOut, Menu, X, Eye, Crown, ChevronRight, Store, ShieldCheck, 
  Palette, Package, Bot, Users, Sparkles, ChevronsLeft, ChevronsRight,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WhatsAppChatBot } from './WhatsAppChatBot';
import { AdminNotificationBell } from './AdminNotificationBell';

export const AdminLayout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // Desktop collapsed state initialized from localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ksf_admin_sidebar_collapsed');
      if (saved !== null) {
        return saved === 'true';
      }
      // Auto-collapse if screen width is between 1024px and 1280px by default
      return typeof window !== 'undefined' ? window.innerWidth < 1280 && window.innerWidth >= 1024 : false;
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ksf_admin_sidebar_collapsed', String(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Prevent body scrolling when mobile drawer is open and close on ESC
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileDrawerOpen(false);
      }
    };

    if (mobileDrawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileDrawerOpen]);

  // Only close mobile drawer when resizing up to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { to: '/admin', label: 'Dashboard Overview', badge: 'Live', icon: BarChart3, end: true },
    { to: '/admin/creators', label: 'Creators Hub', badge: 'Hub', icon: Sparkles },
    { to: '/admin/users', label: 'User Management', badge: 'HR', icon: Users },
    { to: '/admin/ai-agents', label: 'AI Agent Manager', badge: 'AI', icon: Bot },
    { to: '/admin/orders', label: 'Order Fulfillment', badge: 'Orders', icon: Package },
    { to: '/admin/theme-editor', label: 'Theme Editor', badge: 'New', icon: Palette },
    { to: '/admin/pos', label: 'POS Register', badge: 'Terminal', icon: CreditCard },
    { to: '/admin/products', label: 'Skincare Catalog', badge: 'Stock', icon: Boxes },
    { to: '/admin/seo', label: 'SEO Optimizer', badge: 'Google', icon: TrendingUp },
    { to: '/admin/social', label: 'Social Copy Studio', badge: 'AI', icon: Wand2 },
    { to: '/admin/chat-leads', label: 'WhatsApp Leads', badge: 'CRM', icon: MessageCircle },
    { to: '/admin/slack', label: 'Slack Integration', badge: 'Notify', icon: ShieldCheck },
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
    <div className="min-h-screen bg-slate-100/70 text-slate-800 font-sans selection:bg-pink-500 selection:text-white relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 lg:hidden"
            id="admin_mobile_backdrop"
          />
        )}
      </AnimatePresence>

      {/* Permanently Fixed Full-Height Sidebar (Zero White Space at Bottom) */}
      <aside 
        id="admin_sidebar"
        className={`
          fixed top-0 bottom-0 left-0 z-50 h-[100dvh] max-h-[100dvh] flex flex-col justify-between 
          bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 
          border-r border-slate-800/90 shadow-2xl transition-all duration-300 ease-in-out
          ${mobileDrawerOpen ? 'translate-x-0 w-[280px] xs:w-[300px] max-w-[85vw] p-4' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20 lg:p-3' : 'lg:w-64 lg:p-4'}
        `}
      >
        {/* TOP: Brand / Header */}
        <div className="shrink-0 pb-3 border-b border-slate-800/80">
          <div className={`flex items-center justify-between ${isCollapsed ? 'lg:justify-center' : ''} gap-2`}>
            <div className="flex items-center gap-3 min-w-0">
              <div 
                onClick={() => {
                  setMobileDrawerOpen(false);
                  navigate('/admin');
                }}
                title="KSF Admin Deck"
                className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E91E8C] via-pink-600 to-purple-600 p-0.5 shadow-lg shadow-[#E91E8C]/25 shrink-0 cursor-pointer group"
              >
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
                  <Crown size={18} />
                </div>
              </div>

              {/* Title text - Always shown on mobile, hidden on desktop only when collapsed */}
              <div className={`truncate select-none ${isCollapsed ? 'lg:hidden' : ''}`}>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-sm tracking-tight text-white truncate">KSF Admin</h4>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" title="System Operational"></span>
                </div>
                <span className="text-[10px] text-pink-400 font-extrabold tracking-wider uppercase block mt-0.5">
                  {profile?.role === 'super_admin' ? 'Super Admin' : 'Executive Staff'}
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button 
              onClick={() => setMobileDrawerOpen(false)} 
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Close Menu"
              id="admin_mobile_close_btn"
            >
              <X size={18} />
            </button>

            {/* Desktop Minimize Toggle button in header */}
            {!isCollapsed && (
              <button
                onClick={toggleSidebarCollapse}
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-pink-400 hover:bg-slate-800/90 rounded-xl border border-transparent hover:border-slate-700 transition cursor-pointer"
                title="Collapse Sidebar"
                id="admin_sidebar_collapse_btn_header"
              >
                <ChevronsLeft size={16} />
              </button>
            )}
          </div>
        </div>

        {/* MIDDLE: Scrollable Navigation List (Internal scroll so sidebar never leaves viewport) */}
        <div className="flex-1 overflow-y-auto py-3 space-y-1.5 min-h-0 [scrollbar-width:thin] [scrollbar-color:#334155_transparent]">
          <div className={`px-2 pb-1.5 flex items-center justify-between ${isCollapsed ? 'lg:hidden' : ''}`}>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Navigation
            </span>
            <span className="text-[9px] font-bold text-slate-600">
              {navItems.length} modules
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.to} className="relative group">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={({ isActive }) => `
                      group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border min-h-[42px]
                      ${isCollapsed ? 'lg:justify-center lg:p-2.5' : 'lg:justify-between lg:px-3 lg:py-2.5'}
                      ${isActive 
                        ? 'bg-gradient-to-r from-[#E91E8C] via-pink-600 to-purple-600 text-white shadow-md shadow-[#E91E8C]/25 border-pink-400/40' 
                        : 'text-slate-300 hover:text-white bg-slate-900/40 hover:bg-slate-800/80 border-slate-800/60 hover:border-slate-700/80'}
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`
                            w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0
                            ${isActive 
                              ? 'bg-white/20 backdrop-blur-md text-white shadow-inner border border-white/30' 
                              : 'bg-slate-800/90 border border-slate-700/60 text-pink-400 group-hover:bg-[#E91E8C] group-hover:text-white group-hover:border-pink-400 group-hover:shadow-sm'}
                          `}>
                            <Icon size={15} />
                          </div>
                          {/* Text label: Always visible on mobile, hidden on desktop when collapsed */}
                          <span className={`truncate tracking-tight ${isCollapsed ? 'lg:hidden' : ''}`}>
                            {item.label}
                          </span>
                        </div>

                        {/* Badge: Always visible on mobile, hidden on desktop when collapsed */}
                        <span className={`
                          text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider shrink-0 transition-colors
                          ${isCollapsed ? 'lg:hidden' : ''}
                          ${isActive 
                            ? 'bg-white/25 text-white border border-white/30' 
                            : 'bg-slate-800 text-pink-400/90 group-hover:bg-slate-700 group-hover:text-white'}
                        `}>
                          {item.badge}
                        </span>
                      </>
                    )}
                  </NavLink>

                  {/* Floating Tooltip when collapsed on Desktop */}
                  {isCollapsed && (
                    <div className="hidden lg:block opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50">
                      <div className="bg-slate-900 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap flex items-center gap-2">
                        <span>{item.label}</span>
                        <span className="text-[9px] bg-pink-500/30 text-pink-300 px-1.5 py-0.5 rounded font-black border border-pink-500/40">
                          {item.badge}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM: Fixed Footer Actions & Profile (Always stays at bottom) */}
        <div className="shrink-0 pt-3 border-t border-slate-800/80 space-y-2">
          {/* Quick Storefront Link */}
          <div className="relative group">
            <button
              onClick={() => {
                setMobileDrawerOpen(false);
                navigate('/');
              }}
              title="View Live Storefront"
              className={`
                w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-pink-950/40 to-purple-950/40 border border-pink-500/20 
                text-pink-300 hover:text-white hover:border-pink-500/50 hover:bg-pink-900/30 transition text-xs font-bold cursor-pointer min-h-[38px]
                ${isCollapsed ? 'lg:justify-center lg:p-2.5' : 'lg:justify-between lg:px-3 lg:py-2'}
              `}
              id="admin_sidebar_storefront_btn"
            >
              <div className="flex items-center gap-2">
                <Store size={15} className="text-[#E91E8C] shrink-0" />
                <span className={isCollapsed ? 'lg:hidden' : ''}>Live Storefront</span>
              </div>
              <ChevronRight size={13} className={`text-pink-400 ${isCollapsed ? 'lg:hidden' : ''}`} />
            </button>

            {isCollapsed && (
              <div className="hidden lg:block opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50">
                <div className="bg-slate-900 text-white text-xs font-bold py-1 px-2.5 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap">
                  View Live Storefront
                </div>
              </div>
            )}
          </div>

          {/* Admin User Profile Card */}
          <div className={`
            rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between p-2.5 gap-2 shadow-inner
            ${isCollapsed ? 'lg:justify-center lg:p-1.5 lg:flex-col lg:gap-1' : 'lg:justify-between lg:p-2.5 lg:gap-2'}
          `}>
            <div className="flex items-center gap-2 min-w-0">
              <div 
                title={profile?.name || 'Administrator'}
                className="relative w-7 h-7 rounded-lg bg-gradient-to-tr from-[#E91E8C] to-purple-600 p-0.5 text-xs font-black text-white shrink-0"
              >
                <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center text-pink-300 font-extrabold text-[10px]">
                  {profile?.name?.slice(0, 2).toUpperCase() || 'AD'}
                </div>
              </div>

              <div className={`truncate text-xs ${isCollapsed ? 'lg:hidden' : ''}`}>
                <span className="font-bold block text-white truncate leading-tight">{profile?.name || 'Admin'}</span>
                <span className="text-[9px] text-pink-400 font-semibold truncate block capitalize">{profile?.role?.replace('_', ' ') || 'Staff'}</span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/15 rounded-lg transition cursor-pointer shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
              id="admin_sidebar_logout_btn"
            >
              <LogOut size={14} />
            </button>
          </div>

          {/* Expand Toggle Button when collapsed on Desktop */}
          {isCollapsed && (
            <button
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex w-full items-center justify-center p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 hover:text-pink-400 text-slate-400 border border-slate-700/60 transition cursor-pointer"
              title="Expand Sidebar"
              id="admin_sidebar_expand_btn"
            >
              <ChevronsRight size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Layout with padding matching the fixed sidebar width */}
      <div className={`flex flex-col min-w-0 min-h-screen bg-[#FFF8FA]/40 transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Top Header Bar */}
        <header className="h-14 md:h-16 bg-white/95 backdrop-blur-md border-b border-pink-100/70 px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile trigger */}
            <button 
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 text-slate-700 hover:text-[#E91E8C] hover:bg-pink-50 rounded-xl transition cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center border border-slate-200/80 active:scale-95"
              id="admin_mobile_menu_trigger"
              title="Open Navigation"
              aria-label="Open Navigation Drawer"
            >
              <Menu size={20} />
            </button>

            {/* Desktop Minimize/Expand trigger button in Top Bar */}
            <button
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-600 hover:text-pink-600 hover:bg-pink-50 border border-slate-200/80 hover:border-pink-200 text-xs font-bold transition cursor-pointer"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              id="admin_topbar_collapse_toggle"
            >
              {isCollapsed ? (
                <>
                  <PanelLeftOpen size={15} className="text-[#E91E8C]" />
                  <span>Expand Sidebar</span>
                </>
              ) : (
                <>
                  <PanelLeftClose size={15} className="text-slate-400" />
                  <span>Minimize Sidebar</span>
                </>
              )}
            </button>

            <span className="hidden sm:inline-block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest font-mono border-l border-slate-200 pl-3">
              Korean Skin Food BD &bull; Admin Console
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Real-Time Operational Alerts & Orders Bell */}
            <AdminNotificationBell />

            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 bg-white hover:bg-pink-50 text-slate-700 font-bold rounded-xl border border-pink-200 cursor-pointer transition text-xs flex items-center gap-1.5 shadow-2xs hover:text-[#E91E8C]"
              id="view_storefront_top_btn"
            >
              <Eye size={13} className="text-[#E91E8C]" />
              <span className="hidden xs:inline">View Storefront</span>
            </button>
          </div>
        </header>

        {/* Sticky Horizontal Quick-Nav for Rapid Module Switching */}
        <div className="sticky top-14 md:top-16 bg-white/90 backdrop-blur-md border-b border-pink-100/80 z-20 flex items-center gap-2 px-4 md:px-6 py-2 overflow-x-auto scrollbar-none shadow-xs">
          <span className="text-[9px] font-black text-pink-600 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline-block">
            Quick Nav:
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `
                  flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition cursor-pointer shrink-0 border
                  ${isActive 
                    ? 'bg-pink-50 border-pink-200 text-[#E91E8C] shadow-xs scale-[0.98]' 
                    : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:text-[#E91E8C] hover:bg-pink-50/40'}
                `}
              >
                <Icon size={11} className="text-[#E91E8C]" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Main Content Outlet with full stretch and no bottom clipping */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Floating WhatsApp / AI Chatbot Widget */}
      <WhatsAppChatBot />
    </div>
  );
};
