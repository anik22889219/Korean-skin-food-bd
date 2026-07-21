import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { 
  ShoppingBag, Sparkles, Languages, LogOut, User, X, 
  Trash2, Plus, Minus, CheckCircle, ShieldCheck, Settings,
  LayoutDashboard, Tv, Globe, MessageSquare, Menu, ChevronLeft, 
  ChevronRight, Home, Compass, BarChart3, CreditCard, Boxes, 
  TrendingUp, Wand2, MessageCircle, Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { WhatsAppChatBot } from './WhatsAppChatBot';
import { Footer } from './Footer';

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin } = useAuth();
  const { 
    cart, isCartOpen, setIsCartOpen, language, setLanguage, 
    checkoutStep, setCheckoutStep, checkoutForm, setCheckoutForm,
    lastCreatedOrder, calculateCartSubtotal, calculateShipping, 
    handleCheckoutSubmit, activeTranslations, updateCartQty, removeFromCart,
    useLoyaltyPoints, setUseLoyaltyPoints, availablePoints, pointsDiscount,
    calculateGrandTotal, calculatePointsEarned
  } = useCart();

  const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [announcementIndex, setAnnouncementIndex] = useState(0);

  const announcements = [
    "✨ FREE shipping inside Dhaka for orders over ৳2,000! ✨",
    "🛍️ 100% Genuine Imported Cosmeceuticals straight from Seoul, South Korea!",
    "📞 Need professional skincare advice? Click WhatsApp below for a free consultation!",
    "🌟 Cash on Delivery (COD) services available nationwide across Bangladesh!"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncementIndex((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5F8]/40 text-gray-800 font-sans selection:bg-[#E91E8C] selection:text-white flex flex-col pb-16 md:pb-0">
      
      {/* 1. Dynamic Auto-Sliding Announcement Bar */}
      <div className="bg-[#E91E8C] text-white py-2 px-4 text-center text-[10px] sm:text-xs font-bold tracking-wider relative overflow-hidden z-20 min-h-[36px] flex items-center justify-center shadow-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={announcementIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="w-full text-center px-4"
          >
            {announcements[announcementIndex]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. Responsive Adaptive Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-pink-100 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-sm">
        {/* Left Section: Admin Trigger + Desktop Menus */}
        <div className="flex items-center gap-6">
          {user && isAdmin && (
            <button 
              onClick={() => setAdminSidebarOpen(!adminSidebarOpen)}
              className="p-2 hover:bg-pink-50 rounded-xl text-[#E91E8C] transition-all cursor-pointer border border-transparent hover:border-pink-200/50"
              title="Toggle Admin Controls"
            >
              <Menu size={18} />
            </button>
          )}

          {/* Menus: Home, Shop, About Us, Contact Us */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-bold text-gray-650">
            <Link to="/" className="hover:text-[#E91E8C] hover:scale-105 transition-all py-1">{activeTranslations.home || "Home"}</Link>
            <Link to="/shop" className="hover:text-[#E91E8C] hover:scale-105 transition-all py-1">{activeTranslations.shop || "Shop"}</Link>
            <Link to="/about-us" className="hover:text-[#E91E8C] hover:scale-105 transition-all py-1">{language === 'bn' ? 'আমাদের সম্পর্কে' : 'About Us'}</Link>
            <Link to="/contact-us" className="hover:text-[#E91E8C] hover:scale-105 transition-all py-1">{language === 'bn' ? 'যোগাযোগ' : 'Contact Us'}</Link>
          </nav>
        </div>

        {/* Center Section: Branding Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-[#E91E8C] rounded-full flex items-center justify-center shadow-md shadow-[#E91E8C]/25 border border-[#FF62B2] group-hover:scale-105 transition-transform duration-300">
            <Sparkles className="text-white" size={14} />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-extrabold text-gray-900 tracking-tight leading-none">Korean Skin Food BD</h1>
            <p className="text-[9px] text-pink-600 mt-0.5 font-bold tracking-wider hidden sm:block">
              {activeTranslations.tagline}
            </p>
          </div>
        </Link>

        {/* Right Section: Language Switcher, Cart Trigger, Login or Profile avatar */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher Badge Button */}
          <button 
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            aria-label="Toggle Language English / Bengali"
            title={language === 'en' ? 'বাংলা ভাষায় পরিবর্তন করুন' : 'Switch to English'}
            className="flex items-center gap-1.5 bg-pink-50/90 hover:bg-pink-100 text-gray-800 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border border-pink-200/80 transition-all shadow-xs hover:shadow-sm active:scale-95 group"
          >
            <Languages size={15} className="text-[#E91E8C] shrink-0 group-hover:rotate-12 transition-transform" />
            <span className="font-extrabold text-gray-800">
              {language === 'en' ? 'বাংলা' : 'English'}
            </span>
            <span className="text-[9px] px-1 py-0.2 bg-[#E91E8C] text-white rounded font-black uppercase tracking-wider ml-0.5">
              {language === 'en' ? 'BN' : 'EN'}
            </span>
          </button>

          {/* Cart Icon trigger */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 bg-white hover:bg-pink-50 rounded-xl border border-pink-200 cursor-pointer transition text-gray-700 shadow-sm"
          >
            <ShoppingBag size={16} />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-[#E91E8C] text-white text-[8px] font-black rounded-full flex items-center justify-center animate-bounce border border-white">
                {cart.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            )}
          </button>

          {/* Login Button or Profile Image dropdown */}
          {!user ? (
            <Link 
              to="/login"
              className="p-2.5 bg-white hover:bg-pink-50 rounded-xl border border-pink-200 cursor-pointer transition text-gray-750 shadow-sm flex items-center justify-center"
              title="Login"
              id="login_icon_btn"
            >
              <User size={16} className="text-[#E91E8C]" />
            </Link>
          ) : (
            <div className="relative">
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-8 h-8 rounded-full overflow-hidden border border-pink-200 cursor-pointer hover:border-[#E91E8C] transition"
              >
                {profile?.photoURL || user?.photoURL ? (
                  <img 
                    src={profile?.photoURL || user?.photoURL} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-[#E91E8C]/10 text-[#E91E8C] font-black text-xs flex items-center justify-center uppercase">
                    {profile?.name?.slice(0, 1) || 'U'}
                  </div>
                )}
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white border border-pink-100 rounded-2xl shadow-xl z-50 py-2.5 text-xs font-semibold text-gray-700"
                    >
                      <div className="px-4 py-2 border-b border-pink-50">
                        <p className="font-extrabold text-gray-955 truncate leading-none mb-1">{profile?.name || 'K-Beauty User'}</p>
                        <p className="text-[10px] text-gray-400 truncate font-mono">{profile?.email}</p>
                      </div>
                      
                      <Link 
                        to="/profile" 
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2 hover:bg-pink-50/40 flex items-center gap-2 transition"
                      >
                        <User size={13} className="text-[#E91E8C]" />
                        <span>My Profile</span>
                      </Link>

                      {isAdmin && (
                        <Link 
                          to="/admin" 
                          onClick={() => setProfileMenuOpen(false)}
                          className="w-full text-left px-4 py-2 hover:bg-pink-50/40 flex items-center gap-2 transition text-slate-800"
                        >
                          <Settings size={13} className="text-slate-950" />
                          <span>Admin Dashboard</span>
                        </Link>
                      )}

                      <button 
                        onClick={() => { setProfileMenuOpen(false); handleLogout(); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-500 flex items-center gap-2 transition border-t border-pink-50 mt-1 font-bold cursor-pointer"
                      >
                        <LogOut size={13} />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </header>

      {/* 3. Render Storefront with Admin Sidebar integration if appropriate */}
      <div className="flex-1 flex min-h-0 relative">
        <AnimatePresence>
          {user && isAdmin && (
            <>
              {/* Mobile overlay */}
              {adminSidebarOpen && (
                <div 
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
                  onClick={() => setAdminSidebarOpen(false)}
                />
              )}

              {/* Sidebar Element */}
              <aside className={`
                fixed inset-y-0 left-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 z-50 flex flex-col justify-between border-r border-slate-800/80 shadow-2xl transition-all duration-300 p-4 shrink-0
                lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0 lg:z-20 overflow-y-auto scrollbar-none
                ${adminSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-16'}
              `}>
                <div className="space-y-6">
                  {/* Collapsible Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 bg-gradient-to-tr from-[#E91E8C] to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md border border-pink-400/40 shrink-0">
                        <ShieldCheck size={16} />
                      </div>
                      {adminSidebarOpen && (
                        <div className="truncate">
                          <h4 className="font-extrabold text-xs text-white leading-none truncate">KSF Admin Deck</h4>
                          <span className="text-[9px] text-pink-400 font-extrabold uppercase tracking-wider block mt-1">Quick Access</span>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => setAdminSidebarOpen(false)}
                      className="lg:hidden p-1 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Sidebar Navigation items */}
                  <nav className="space-y-1.5">
                    {[
                      { to: '/admin', label: 'Dashboard Overview', icon: BarChart3 },
                      { to: '/admin/pos', label: 'POS Register', icon: CreditCard },
                      { to: '/admin/products', label: 'Skincare Catalog', icon: Boxes },
                      { to: '/admin/seo', label: 'SEO Optimizer', icon: TrendingUp },
                      { to: '/admin/social', label: 'Social Copy Studio', icon: Wand2 },
                      { to: '/admin/chat-leads', label: 'WhatsApp Leads', icon: MessageCircle },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => {
                            if (window.innerWidth < 1024) {
                              setAdminSidebarOpen(false);
                            }
                          }}
                          className="group flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:bg-slate-850/80 text-slate-300 hover:text-white cursor-pointer border border-transparent hover:border-slate-800"
                        >
                          <div className="w-7 h-7 rounded-lg bg-slate-800/90 border border-slate-700/50 flex items-center justify-center text-pink-400 group-hover:bg-[#E91E8C] group-hover:text-white group-hover:border-pink-400 transition-colors shrink-0">
                            <Icon size={14} />
                          </div>
                          {adminSidebarOpen && <span className="truncate">{item.label}</span>}
                        </Link>
                      );
                    })}
                  </nav>
                </div>

                {/* Sidebar footer meta */}
                {adminSidebarOpen && (
                  <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E91E8C] to-purple-600 p-0.5 text-xs font-black text-white shrink-0">
                      <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-pink-300 font-extrabold">
                        {profile?.name?.slice(0, 1) || 'A'}
                      </div>
                    </div>
                    <div className="truncate text-[10px] text-slate-400">
                      <p className="font-extrabold text-white truncate leading-none mb-0.5">{profile?.name || 'Admin'}</p>
                      <p className="truncate text-pink-400 font-mono text-[9px] uppercase font-bold">{profile?.role}</p>
                    </div>
                  </div>
                )}
              </aside>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* 4. Footer */}
      <Footer />

      {/* 5. Cart Drawer overlay */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="bg-white w-full max-w-md h-full flex flex-col justify-between shadow-2xl relative border-l border-pink-100"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-pink-100 flex justify-between items-center bg-white">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag className="text-[#E91E8C]" size={16} />
                  <span>{activeTranslations.cart}</span>
                </h3>
                <button 
                  onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }} 
                  className="text-gray-400 hover:text-pink-600 cursor-pointer p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body content */}
              <div className="p-4 overflow-y-auto flex-1 space-y-4 bg-white">
                {checkoutStep === 'cart' && (
                  <>
                    {cart.length === 0 ? (
                      <div className="py-24 text-center text-gray-500 space-y-3">
                        <ShoppingBag size={42} className="mx-auto opacity-20 text-gray-400" />
                        <p className="text-xs font-bold text-gray-650">Your skincare basket is empty.</p>
                        <button 
                          onClick={() => setIsCartOpen(false)} 
                          className="px-4 py-2 bg-[#E91E8C] hover:bg-[#FF4B91] text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-sm"
                        >
                          Start Shopping
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {cart.map(item => (
                          <div key={item.product.id} className="bg-pink-50/15 p-3 rounded-2xl border border-pink-100/40 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <img src={item.product.image} className="w-12 h-12 object-cover rounded-xl shadow-sm border border-pink-100/30 shrink-0" referrerPolicy="no-referrer" />
                              <div className="min-w-0">
                                <h4 className="font-bold text-gray-805 leading-tight truncate">
                                  {language === 'en' ? item.product.name : item.product.nameBN}
                                </h4>
                                <span className="text-[#E91E8C] font-extrabold block mt-0.5 font-mono">
                                  ৳{item.product.discountPrice || item.product.price}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center bg-white rounded-lg border border-pink-100">
                                <button onClick={() => updateCartQty(item.product.id, -1)} className="p-1 text-gray-400 hover:text-pink-600 cursor-pointer">
                                  <Minus size={11} />
                                </button>
                                <span className="px-1.5 text-gray-800 font-mono font-bold text-[11px]">{item.quantity}</span>
                                <button onClick={() => updateCartQty(item.product.id, 1)} className="p-1 text-gray-400 hover:text-pink-600 cursor-pointer">
                                  <Plus size={11} />
                                </button>
                              </div>

                              <button onClick={() => removeFromCart(item.product.id)} className="text-gray-400 hover:text-red-600 cursor-pointer p-1">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Shipping Details form */}
                {checkoutStep === 'details' && (
                  <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[#E91E8C] font-black uppercase text-xs tracking-wider block">{activeTranslations.billingInfo}</span>
                      <p className="text-[10px] text-gray-405 font-semibold">Cash on Delivery details inside Bangladesh</p>
                    </div>

                    <div>
                      <label className="block text-gray-500 font-bold mb-1">{activeTranslations.fullName}</label>
                      <input 
                        type="text" 
                        required
                        value={checkoutForm.name}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                        placeholder="e.g., Sadia Anjum"
                        className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-500 font-bold mb-1">{activeTranslations.phone}</label>
                      <input 
                        type="tel" 
                        required
                        value={checkoutForm.phone}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                        placeholder="e.g., 01700000000"
                        className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none font-mono focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-500 font-bold mb-1">{activeTranslations.selectDelivery}</label>
                      <select 
                        value={checkoutForm.area}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, area: e.target.value as any })}
                        className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
                      >
                        <option value="dhaka">Inside Dhaka (৳80 delivery fee)</option>
                        <option value="outside">Outside Dhaka (৳150 delivery fee)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-500 font-bold mb-1">{activeTranslations.deliveryAddress}</label>
                      <textarea 
                        required
                        rows={2}
                        value={checkoutForm.address}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                        placeholder="Flat, House, Road, Area, District"
                        className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    {/* Loyalty Points Redemption Box */}
                    {availablePoints > 0 && (
                      <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-3.5 rounded-2xl border border-pink-200/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#E91E8C] text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                              <Gift size={12} />
                            </div>
                            <div>
                              <span className="font-extrabold text-gray-900 text-xs block">K-Beauty Loyalty Points</span>
                              <span className="text-[10px] text-gray-500 font-medium">You have <strong className="text-[#E91E8C] font-mono">{availablePoints} Points</strong> (৳{availablePoints} value)</span>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={useLoyaltyPoints} 
                              onChange={(e) => setUseLoyaltyPoints(e.target.checked)} 
                              className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E91E8C]"></div>
                          </label>
                        </div>
                        {useLoyaltyPoints && (
                          <div className="text-[10px] bg-white p-2 rounded-xl border border-pink-100 text-emerald-700 font-bold flex items-center justify-between">
                            <span>Instant Loyalty Discount Applied:</span>
                            <span className="font-mono text-emerald-600 font-black">-৳{pointsDiscount} BDT</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="bg-pink-50/20 p-4 rounded-2xl border border-pink-100/50 space-y-1.5 font-mono text-gray-700">
                      <div className="flex justify-between font-medium">
                        <span>{language === 'en' ? 'Subtotal' : 'সাবটোটাল'}</span>
                        <span>৳{calculateCartSubtotal()}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>{activeTranslations.shipping}</span>
                        <span>৳{calculateShipping()}</span>
                      </div>
                      {useLoyaltyPoints && pointsDiscount > 0 && (
                        <div className="flex justify-between font-bold text-emerald-600">
                          <span>Loyalty Discount</span>
                          <span>-৳{pointsDiscount}</span>
                        </div>
                      )}
                      <div className="border-t border-pink-100/60 pt-2 flex justify-between text-gray-900 font-extrabold text-sm">
                        <span>{activeTranslations.grandTotal}</span>
                        <span className="text-[#E91E8C] font-black">৳{calculateGrandTotal()}</span>
                      </div>
                      <div className="text-[10px] text-pink-600 font-sans font-bold pt-1 text-right flex items-center justify-end gap-1">
                        <Sparkles size={11} />
                        <span>You will earn +{calculatePointsEarned()} Loyalty Points on this order!</span>
                      </div>
                    </div>

                    <button type="submit" className="w-full bg-[#E91E8C] hover:bg-[#FF4B91] text-white py-3 rounded-xl font-bold cursor-pointer transition shadow-sm">
                      {activeTranslations.orderNow}
                    </button>
                  </form>
                )}

                {/* Successful checkout order */}
                {checkoutStep === 'success' && lastCreatedOrder && (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600 animate-bounce">
                      <CheckCircle size={32} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-gray-900 text-sm">Order Placed Successfully!</h4>
                      <p className="text-[11px] text-gray-500">Thank you for shopping with Korean Skin Food BD. Track your order under the profile dashboard.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer CTA */}
              {cart.length > 0 && checkoutStep === 'cart' && (
                <div className="p-4 border-t border-pink-100 bg-pink-50/10 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-gray-500">Basket Subtotal:</span>
                    <span className="font-black text-gray-800 font-mono">৳{calculateCartSubtotal()} BDT</span>
                  </div>
                  <button 
                    onClick={() => setCheckoutStep('details')}
                    className="w-full py-3 bg-[#E91E8C] hover:bg-[#FF4B91] text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>Proceed to Checkout</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating AI assistant widget */}
      <WhatsAppChatBot />

      {/* Sticky Bottom Navigation for Mobile Devices */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-pink-100 py-2.5 px-6 flex items-center justify-between z-45 shadow-xl pb-safe">
        <Link to="/" className="flex flex-col items-center gap-1 text-gray-500 hover:text-[#E91E8C] active:text-[#E91E8C] transition-all">
          <Home size={18} />
          <span className="text-[9px] font-bold">{activeTranslations.home || "Home"}</span>
        </Link>
        <Link to="/shop" className="flex flex-col items-center gap-1 text-gray-500 hover:text-[#E91E8C] active:text-[#E91E8C] transition-all">
          <Compass size={18} />
          <span className="text-[9px] font-bold">{activeTranslations.shop || "Shop"}</span>
        </Link>
        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center gap-1 text-gray-500 hover:text-[#E91E8C] active:text-[#E91E8C] transition-all cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag size={18} />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#E91E8C] text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white">
                {cart.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold">{activeTranslations.cart || "Cart"}</span>
        </button>
        <Link to="/profile" className="flex flex-col items-center gap-1 text-gray-500 hover:text-[#E91E8C] active:text-[#E91E8C] transition-all">
          <User size={18} />
          <span className="text-[9px] font-bold">{language === 'bn' ? 'প্রোফাইল' : 'Profile'}</span>
        </Link>
        {user && isAdmin && (
          <button 
            onClick={() => setAdminSidebarOpen(!adminSidebarOpen)}
            className="flex flex-col items-center gap-1 text-[#E91E8C] animate-pulse cursor-pointer animate-duration-[2000ms]"
          >
            <ShieldCheck size={18} />
            <span className="text-[9px] font-bold">Admin</span>
          </button>
        )}
      </div>

    </div>
  );
};
