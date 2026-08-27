import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { 
  ShoppingBag, Languages, LogOut, User, X, 
  Trash2, Plus, Minus, CheckCircle, ShieldCheck, Settings,
  LayoutDashboard, Tv, Globe, MessageSquare, Menu, ChevronLeft, 
  ChevronRight, Home, Compass, BarChart3, CreditCard, Boxes, 
  TrendingUp, Wand2, MessageCircle, Gift, Lock, Camera, Sparkles,
  Search, Video, Award, Heart, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { WhatsAppChatBot } from './WhatsAppChatBot';
import { Footer } from './Footer';
import { ImageSearchModal } from './ImageSearchModal';
import { HeaderSearch } from './HeaderSearch';
import { themeService, DEFAULT_GLOBAL_THEME } from '../services/themeService';
import { productService } from '../services/productService';
import { Product } from '../types';
import { GlobalThemeSettings } from '../types/theme';
import { analytics } from '../services/analyticsService';
import { getProductUnitPrice } from '../utils/pricing';

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut, isAdmin, signInWithGoogle, creatorProfile } = useAuth();
  const { 
    cart, isCartOpen, setIsCartOpen, language, setLanguage, 
    checkoutStep, setCheckoutStep, checkoutForm, setCheckoutForm,
    lastCreatedOrder, calculateCartSubtotal, calculateShipping, 
    handleCheckoutSubmit, activeTranslations, updateCartQty, removeFromCart,
    useLoyaltyPoints, setUseLoyaltyPoints, availablePoints, pointsDiscount,
    calculateGrandTotal, calculatePointsEarned, addToCart
  } = useCart();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [globalTheme, setGlobalTheme] = useState<GlobalThemeSettings>(DEFAULT_GLOBAL_THEME);
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Track View Cart when cart drawer opens with items
  useEffect(() => {
    if (isCartOpen && checkoutStep === 'cart' && cart.length > 0) {
      analytics.trackViewCart(cart, calculateCartSubtotal());
    }
  }, [isCartOpen]);

  useEffect(() => {
    const unsubscribeTheme = themeService.subscribeGlobal((gt) => {
      setGlobalTheme(gt);
    });
    const unsubProducts = productService.subscribe((prods) => {
      setAllProducts(prods);
    });
    return () => {
      unsubscribeTheme();
      unsubProducts();
    };
  }, []);

  const defaultAnnouncements = [
    "✨ FREE shipping inside Dhaka for orders over ৳2,000! ✨",
    "🛍️ 100% Genuine Imported Cosmeceuticals straight from Seoul, South Korea!",
    "📞 Need professional skincare advice? Click WhatsApp below for a free consultation!",
    "🌟 Cash on Delivery (COD) services available nationwide across Bangladesh!"
  ];

  const announcements = globalTheme.announcementText 
    ? [globalTheme.announcementText, ...defaultAnnouncements.slice(1)]
    : defaultAnnouncements;

  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncementIndex((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#FFF5F8]/40 text-gray-800 font-sans selection:bg-[#E91E8C] selection:text-white flex flex-col pb-20 lg:pb-0">
      
      {/* 1. Dynamic Auto-Sliding Announcement Bar */}
      {globalTheme.enableAnnouncement !== false && (
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
      )}

      {/* 2. Responsive Adaptive Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-pink-100 px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between shadow-xs">
        
        {/* Left Section: Mobile Menu Trigger + Desktop Menus & Admin Shortcut */}
        <div className="flex items-center gap-3 lg:gap-6">
          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 text-gray-700 hover:text-[#E91E8C] hover:bg-pink-50 rounded-xl transition cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>

          {user && isAdmin && (
            <Link 
              to="/admin"
              className="hidden sm:flex px-3 py-1.5 bg-slate-900 hover:bg-[#E91E8C] text-white rounded-xl text-xs font-bold transition-all items-center gap-1.5 shadow-xs shrink-0"
              title="Go to Admin Dashboard"
            >
              <ShieldCheck size={14} className="text-pink-400" />
              <span>Admin Deck</span>
            </Link>
          )}

          {/* Menus: Home, Shop, About Us, Contact Us */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-bold text-gray-650">
            <Link 
              to="/" 
              className={`py-1 transition-all hover:text-[#E91E8C] ${isActivePath('/') && location.pathname === '/' ? 'text-[#E91E8C] font-extrabold' : ''}`}
            >
              {activeTranslations.home || "Home"}
            </Link>
            <Link 
              to="/shop" 
              className={`py-1 transition-all hover:text-[#E91E8C] ${isActivePath('/shop') ? 'text-[#E91E8C] font-extrabold' : ''}`}
            >
              {activeTranslations.shop || "Shop"}
            </Link>
            <Link 
              to="/about-us" 
              className={`py-1 transition-all hover:text-[#E91E8C] ${isActivePath('/about-us') ? 'text-[#E91E8C] font-extrabold' : ''}`}
            >
              {language === 'bn' ? 'আমাদের সম্পর্কে' : 'About Us'}
            </Link>
            <Link 
              to="/contact-us" 
              className={`py-1 transition-all hover:text-[#E91E8C] ${isActivePath('/contact-us') ? 'text-[#E91E8C] font-extrabold' : ''}`}
            >
              {language === 'bn' ? 'যোগাযোগ' : 'Contact Us'}
            </Link>
          </nav>
        </div>

        {/* Center Section: Branding Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          {globalTheme.logoUrl ? (
            <img src={globalTheme.logoUrl} alt={globalTheme.logoText} className="h-8 sm:h-9 object-contain" />
          ) : (
            <>
              <div className="w-8 h-8 bg-[#E91E8C] rounded-full flex items-center justify-center shadow-md shadow-[#E91E8C]/25 border border-[#FF62B2] group-hover:scale-105 transition-transform duration-300">
                <Wand2 className="text-white" size={14} />
              </div>
              <div className="text-left">
                <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-gray-900 tracking-tight leading-none">
                  {globalTheme.logoText || 'Korean Skin Food BD'}
                </h1>
                <p className="text-[8px] sm:text-[9px] text-pink-600 font-bold tracking-wider hidden sm:block uppercase mt-0.5">
                  {globalTheme.logoTagline || activeTranslations.tagline}
                </p>
              </div>
            </>
          )}
        </Link>

        {/* Right Section: Header Live Text + Image Search, Language Switcher, Cart Trigger, Login */}
        <div className="flex items-center gap-1 sm:gap-2.5">
          {/* Desktop Search Bar */}
          <div className="hidden md:block w-56 lg:w-72">
            <HeaderSearch
              products={allProducts}
              onOpenImageSearch={() => setIsImageSearchOpen(true)}
              onAddToCart={(product) => {
                addToCart(product);
                setIsCartOpen(true);
              }}
            />
          </div>

          {/* Mobile Search Toggle Button */}
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="md:hidden p-1.5 sm:p-2 text-gray-700 hover:text-[#E91E8C] hover:bg-pink-50 rounded-xl transition cursor-pointer"
            title="Search Store"
            aria-label="Search Store"
          >
            <Search size={18} />
          </button>

          {/* Language Switcher Badge Button */}
          <button 
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            aria-label="Toggle Language English / Bengali"
            title={language === 'en' ? 'বাংলা ভাষায় পরিবর্তন করুন' : 'Switch to English'}
            className="flex items-center gap-0.5 sm:gap-1 bg-pink-50/90 hover:bg-pink-100 text-gray-800 px-1.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border border-pink-200/80 transition-all shadow-xs active:scale-95 group"
          >
            <Languages size={14} className="text-[#E91E8C] shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#E91E8C]">
              {language === 'en' ? 'BN' : 'EN'}
            </span>
          </button>

          {/* Cart Icon trigger */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 sm:p-2.5 bg-white hover:bg-pink-50 rounded-xl border border-pink-200 cursor-pointer transition text-gray-700 shadow-xs"
            aria-label="Shopping Cart"
          >
            <ShoppingBag size={16} />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-4.5 sm:h-4.5 bg-[#E91E8C] text-white text-[8px] font-black rounded-full flex items-center justify-center animate-bounce border border-white">
                {cart.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            )}
          </button>

          {/* User Profile Avatar / Login Button */}
          {!user ? (
            <Link 
              to="/login"
              className="p-2 sm:p-2.5 bg-white hover:bg-pink-50 rounded-xl border border-pink-200 cursor-pointer transition text-gray-750 shadow-xs flex items-center justify-center"
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
                      className="absolute right-0 mt-2 w-52 bg-white border border-pink-100 rounded-2xl shadow-xl z-50 py-2.5 text-xs font-semibold text-gray-700"
                    >
                      <div className="px-4 py-2 border-b border-pink-50">
                        <p className="font-extrabold text-gray-900 truncate leading-none mb-1">{profile?.name || 'K-Beauty User'}</p>
                        <p className="text-[10px] text-gray-400 truncate font-mono">{profile?.email}</p>
                      </div>
                      
                      <Link 
                        to="/profile" 
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2.5 hover:bg-pink-50/40 flex items-center gap-2 transition font-bold text-gray-800"
                      >
                        <User size={14} className="text-[#E91E8C]" />
                        <span>My Account & Orders</span>
                      </Link>

                      {(creatorProfile || profile?.role === 'creator') && (
                        <Link 
                          to="/creator/dashboard" 
                          onClick={() => setProfileMenuOpen(false)}
                          className="w-full text-left px-4 py-2 hover:bg-pink-50/40 flex items-center gap-2 transition text-pink-600 font-extrabold"
                        >
                          <Sparkles size={14} className="text-[#E91E8C]" />
                          <span>Creator Studio</span>
                        </Link>
                      )}

                      {isAdmin && (
                        <Link 
                          to="/admin" 
                          onClick={() => setProfileMenuOpen(false)}
                          className="w-full text-left px-4 py-2 hover:bg-pink-50/40 flex items-center gap-2 transition text-slate-800 font-bold"
                        >
                          <Settings size={14} className="text-slate-900" />
                          <span>Operations Admin</span>
                        </Link>
                      )}

                      <button 
                        onClick={() => { setProfileMenuOpen(false); handleLogout(); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-500 flex items-center gap-2 transition border-t border-pink-50 mt-1 font-bold cursor-pointer"
                      >
                        <LogOut size={14} />
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

      {/* Mobile Expandable Search Bar Drawer */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-white border-b border-pink-100 p-3 shadow-sm z-25 overflow-hidden"
          >
            <HeaderSearch
              products={allProducts}
              onOpenImageSearch={() => {
                setMobileSearchOpen(false);
                setIsImageSearchOpen(true);
              }}
              onAddToCart={(product) => {
                addToCart(product);
                setIsCartOpen(true);
                setMobileSearchOpen(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl z-50 flex flex-col justify-between p-5 border-r border-pink-100 overflow-y-auto"
            >
              <div className="space-y-6">
                {/* Brand Header */}
                <div className="flex items-center justify-between pb-4 border-b border-pink-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#E91E8C] rounded-full flex items-center justify-center text-white">
                      <Wand2 size={14} />
                    </div>
                    <span className="font-black text-sm text-gray-900">Korean Skin Food</span>
                  </div>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Nav Links List */}
                <nav className="space-y-1.5 text-xs font-bold text-gray-700">
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition ${
                      isActivePath('/') && location.pathname === '/' ? 'bg-[#E91E8C] text-white' : 'hover:bg-pink-50'
                    }`}
                  >
                    <Home size={16} />
                    <span>{activeTranslations.home || "Home"}</span>
                  </Link>

                  <Link
                    to="/shop"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition ${
                      isActivePath('/shop') ? 'bg-[#E91E8C] text-white' : 'hover:bg-pink-50'
                    }`}
                  >
                    <Compass size={16} />
                    <span>{activeTranslations.shop || "Shop"}</span>
                  </Link>

                  <Link
                    to="/about-us"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition ${
                      isActivePath('/about-us') ? 'bg-[#E91E8C] text-white' : 'hover:bg-pink-50'
                    }`}
                  >
                    <Globe size={16} />
                    <span>{language === 'bn' ? 'আমাদের সম্পর্কে' : 'About Us'}</span>
                  </Link>

                  <Link
                    to="/contact-us"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition ${
                      isActivePath('/contact-us') ? 'bg-[#E91E8C] text-white' : 'hover:bg-pink-50'
                    }`}
                  >
                    <MessageCircle size={16} />
                    <span>{language === 'bn' ? 'যোগাযোগ' : 'Contact Us'}</span>
                  </Link>

                  <div className="pt-3 border-t border-pink-100 my-2" />

                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition ${
                      isActivePath('/profile') ? 'bg-slate-900 text-white' : 'hover:bg-pink-50'
                    }`}
                  >
                    <User size={16} />
                    <span>{language === 'bn' ? 'আমার প্রোফাইল ও অর্ডার' : 'My Account & Orders'}</span>
                  </Link>

                  {user && isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-slate-900 text-amber-300 font-black"
                    >
                      <ShieldCheck size={16} />
                      <span>Admin Control Deck</span>
                    </Link>
                  )}
                </nav>
              </div>

              {/* Bottom Drawer Actions */}
              <div className="pt-4 border-t border-pink-100 space-y-2">
                {user ? (
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 bg-[#E91E8C] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-pink-500/20"
                  >
                    <User size={14} />
                    <span>Sign In to Account</span>
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Render Storefront Content */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>

      {/* 4. Footer */}
      <Footer />

      {/* 5. Cart Drawer overlay */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="bg-white w-full max-w-full sm:max-w-md h-full flex flex-col justify-between shadow-2xl relative border-l border-pink-100"
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
                        <p className="text-xs font-bold text-gray-600">Your skincare basket is empty.</p>
                        <button 
                          onClick={() => setIsCartOpen(false)} 
                          className="px-4 py-2 bg-[#E91E8C] hover:bg-[#FF4B91] text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-sm"
                        >
                          Start Shopping
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {profile?.wholesaleAccess && (
                          <div className="bg-amber-500/10 border border-amber-300/80 p-2.5 rounded-xl flex items-center gap-2 text-[11px] font-bold text-amber-900">
                            <Sparkles size={14} className="text-amber-600 shrink-0" />
                            <span>Wholesale Pricing Active: Quantity-based tiers (1–49 & 50+) apply automatically.</span>
                          </div>
                        )}
                        {cart.map(item => {
                          const isWholesale = profile?.wholesaleAccess === true;
                          const unitPrice = getProductUnitPrice(item.product, isWholesale ? 'wholesale' : 'retail', item.quantity);
                          const tierLabel = isWholesale ? (item.quantity >= 50 ? 'Wholesale (50+)' : 'Wholesale (1-49)') : null;
                          return (
                            <div key={item.product.id} className="bg-pink-50/20 p-3 rounded-2xl border border-pink-100/50 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3 min-w-0">
                                <img src={item.product.image} className="w-12 h-12 object-cover rounded-xl shadow-xs border border-pink-100 shrink-0" referrerPolicy="no-referrer" />
                                <div className="min-w-0">
                                  <h4 className="font-bold text-gray-800 leading-tight truncate">
                                    {language === 'en' ? item.product.name : (item.product.nameBN || item.product.name)}
                                  </h4>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="text-[#E91E8C] font-extrabold font-mono">
                                      ৳{unitPrice.toLocaleString()}
                                    </span>
                                    {tierLabel && (
                                      <span className="text-[9px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-200">
                                        {tierLabel}
                                      </span>
                                    )}
                                  </div>
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
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Shipping Details form */}
                {checkoutStep === 'details' && (
                  !user ? (
                    <div className="py-8 px-4 text-center space-y-5 bg-pink-50/30 rounded-3xl border border-pink-100 my-2">
                      <div className="w-14 h-14 bg-[#E91E8C]/10 border border-[#E91E8C]/20 rounded-full flex items-center justify-center mx-auto text-[#E91E8C] shadow-xs">
                        <Lock size={26} />
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-extrabold text-gray-900 text-sm">
                          {activeTranslations.loginToOrder}
                        </h4>
                        <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto font-medium">
                          {activeTranslations.loginToOrderDesc}
                        </p>
                      </div>

                      <div className="space-y-2.5 pt-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await signInWithGoogle();
                            } catch (err) {
                              console.error('Google sign-in error:', err);
                            }
                          }}
                          className="w-full py-3.5 bg-[#E91E8C] hover:bg-[#FF4B91] text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-md shadow-pink-100/50 flex items-center justify-center gap-2"
                        >
                          <svg className="h-4 w-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <span>{activeTranslations.loginToOrderBtn}</span>
                        </button>

                        <Link
                          to="/login"
                          onClick={() => setIsCartOpen(false)}
                          className="w-full py-2.5 bg-white hover:bg-pink-50 text-gray-700 rounded-xl text-xs font-bold text-center block transition border border-pink-200"
                        >
                          {language === 'bn' ? 'লগইন পেজে যান' : 'Go to Login Page'}
                        </Link>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setCheckoutStep('cart')}
                          className="text-xs text-[#E91E8C] hover:underline font-bold cursor-pointer"
                        >
                          {language === 'bn' ? '← কার্টে ফিরে যান' : '← Back to Cart Items'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-[#E91E8C] font-black uppercase text-xs tracking-wider block">{activeTranslations.billingInfo}</span>
                        <p className="text-[10px] text-gray-500 font-semibold">Cash on Delivery details inside Bangladesh</p>
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
                          placeholder="017XXXXXXXX"
                          className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-500 font-bold mb-1">{activeTranslations.deliveryCity}</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCheckoutForm({ ...checkoutForm, area: 'dhaka' });
                              analytics.trackAddShippingInfo('dhaka', 80, cart, calculateGrandTotal());
                            }}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                              checkoutForm.area === 'dhaka'
                                ? 'bg-[#E91E8C] text-white border-[#E91E8C]'
                                : 'bg-white text-gray-700 border-pink-100 hover:bg-pink-50'
                            }`}
                          >
                            Inside Dhaka (৳80)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCheckoutForm({ ...checkoutForm, area: 'outside' });
                              analytics.trackAddShippingInfo('outside', 150, cart, calculateGrandTotal());
                            }}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                              checkoutForm.area === 'outside'
                                ? 'bg-[#E91E8C] text-white border-[#E91E8C]'
                                : 'bg-white text-gray-700 border-pink-100 hover:bg-pink-50'
                            }`}
                          >
                            Outside Dhaka (৳150)
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-500 font-bold mb-1">{activeTranslations.address}</label>
                        <textarea 
                          rows={2} 
                          required
                          value={checkoutForm.address}
                          onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                          placeholder="House, Road, Area, Ward/Thana..."
                          className="w-full bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C] resize-none"
                        />
                      </div>

                      {/* Loyalty Points Redemption Box */}
                      {user && availablePoints > 0 && (
                        <div className="bg-gradient-to-r from-pink-50/80 to-purple-50/80 p-3.5 rounded-2xl border border-pink-200/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles size={16} className="text-[#E91E8C]" />
                              <div>
                                <span className="font-extrabold text-gray-900 block text-xs">Glow Loyalty Balance</span>
                                <span className="text-[10px] text-gray-500 font-semibold">{availablePoints} Available Points</span>
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
                          <Wand2 size={11} />
                          <span>You will earn +{calculatePointsEarned()} Loyalty Points on this order!</span>
                        </div>
                      </div>

                      <button type="submit" className="w-full bg-[#E91E8C] hover:bg-[#FF4B91] text-white py-3 rounded-xl font-bold cursor-pointer transition shadow-sm">
                        {activeTranslations.orderNow}
                      </button>
                    </form>
                  )
                )}

                {/* Successful checkout order */}
                {checkoutStep === 'success' && lastCreatedOrder && (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600 animate-bounce">
                      <CheckCircle size={32} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-gray-900 text-sm">Order Placed Successfully!</h4>
                      <p className="text-[11px] text-gray-500">Thank you for shopping with Korean Skin Food BD. Track your order under your profile dashboard.</p>
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
                    onClick={() => {
                      analytics.trackBeginCheckout(cart, calculateCartSubtotal());
                      setCheckoutStep('details');
                    }}
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-pink-100 py-2 px-4 flex items-center justify-around z-40 shadow-xl pb-safe">
        <Link 
          to="/" 
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
            isActivePath('/') && location.pathname === '/' ? 'text-[#E91E8C] font-extrabold' : 'text-gray-500 hover:text-[#E91E8C]'
          }`}
        >
          <Home size={18} />
          <span className="text-[9px]">{activeTranslations.home || "Home"}</span>
        </Link>

        <Link 
          to="/shop" 
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
            isActivePath('/shop') ? 'text-[#E91E8C] font-extrabold' : 'text-gray-500 hover:text-[#E91E8C]'
          }`}
        >
          <Compass size={18} />
          <span className="text-[9px]">{activeTranslations.shop || "Shop"}</span>
        </Link>

        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center gap-0.5 py-1 px-2.5 text-gray-500 hover:text-[#E91E8C] active:text-[#E91E8C] transition-all cursor-pointer"
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

        <Link 
          to="/profile" 
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
            isActivePath('/profile') ? 'text-[#E91E8C] font-extrabold' : 'text-gray-500 hover:text-[#E91E8C]'
          }`}
        >
          <User size={18} />
          <span className="text-[9px]">{language === 'bn' ? 'প্রোফাইল' : 'Profile'}</span>
        </Link>

        {user && isAdmin && (
          <Link 
            to="/admin"
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${
              isActivePath('/admin') ? 'text-[#E91E8C] font-extrabold' : 'text-slate-700 hover:text-[#E91E8C]'
            }`}
          >
            <ShieldCheck size={18} />
            <span className="text-[9px]">Admin</span>
          </Link>
        )}
      </div>

      {/* Image Search Modal */}
      <ImageSearchModal
        isOpen={isImageSearchOpen}
        onClose={() => setIsImageSearchOpen(false)}
        catalog={allProducts}
        onAddToCart={(product) => {
          addToCart(product);
          setIsCartOpen(true);
        }}
        onSelectProduct={(product) => {
          navigate(`/shop`);
        }}
      />

    </div>
  );
};
