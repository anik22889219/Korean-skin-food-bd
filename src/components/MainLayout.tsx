import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWholesaleCart } from '../context/WholesaleCartContext';
import { 
  ShoppingBag, Languages, LogOut, User, X, 
  Trash2, Plus, Minus, CheckCircle, ShieldCheck, Settings,
  LayoutDashboard, Tv, Globe, MessageSquare, Menu, ChevronLeft, 
  ChevronRight, Home, Compass, BarChart3, CreditCard, Boxes, 
  TrendingUp, Wand2, MessageCircle, Gift, Lock, Camera, Sparkles,
  Search, Video, Award, Heart, HelpCircle, Building2, Truck, Tag, Percent, Layers
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
  const { user, profile, signOut, isAdmin, creatorProfile } = useAuth();
  const { 
    cart, isCartOpen, setIsCartOpen, language, setLanguage, 
    checkoutStep, setCheckoutStep, calculateCartSubtotal, 
    activeTranslations, updateCartQty, removeFromCart, addToCart
  } = useCart();
  const { cart: wholesaleCart, totalUnits: wholesaleTotalUnits } = useWholesaleCart();
  const isWholesaleUser = profile?.wholesaleAccess === true;

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

  // Wholesale Checkout Enforcement: Auto-redirect wholesale users away from customer cart drawer
  useEffect(() => {
    if (isWholesaleUser && isCartOpen) {
      setIsCartOpen(false);
      navigate('/wholesale/checkout');
    }
  }, [isWholesaleUser, isCartOpen, navigate, setIsCartOpen]);

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
    "FREE delivery nationwide on orders over ৳2,000!",
    "Curated Korean Skincare & Daily Essentials delivered across Bangladesh.",
    "Need routine advice? Try our Skin Profile Quiz or message us on WhatsApp!",
    "Cash on Delivery (COD) available across all 64 districts in Bangladesh."
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

          {/* Menus: Home, Shop, Concerns, Ingredients, Skin Quiz, Routine, Authenticity */}
          <nav className="hidden lg:flex items-center gap-4 text-xs font-bold text-gray-650">
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
              to="/concerns" 
              className={`py-1 transition-all hover:text-[#E91E8C] ${isActivePath('/concerns') || isActivePath('/concern/') ? 'text-[#E91E8C] font-extrabold' : ''}`}
            >
              {language === 'bn' ? 'ত্বকের ধরন ও সমস্যা' : 'Concerns'}
            </Link>
            <Link 
              to="/ingredients" 
              className={`py-1 transition-all hover:text-[#E91E8C] ${isActivePath('/ingredients') || isActivePath('/ingredient/') ? 'text-[#E91E8C] font-extrabold' : ''}`}
            >
              {language === 'bn' ? 'উপাদান' : 'Ingredients'}
            </Link>
            <Link 
              to="/skin-quiz" 
              className={`py-1 transition-all hover:text-[#E91E8C] ${isActivePath('/skin-quiz') ? 'text-[#E91E8C] font-extrabold' : ''}`}
            >
              {language === 'bn' ? 'স্কিন কুইজ' : 'Skin Quiz'}
            </Link>
            <Link 
              to="/routine-builder" 
              className={`py-1 transition-all hover:text-[#E91E8C] ${isActivePath('/routine-builder') ? 'text-[#E91E8C] font-extrabold' : ''}`}
            >
              {language === 'bn' ? 'রুটিন বিল্ডার' : 'Routine'}
            </Link>
            <Link 
              to="/authenticity" 
              className={`py-1 transition-all hover:text-[#E91E8C] ${isActivePath('/authenticity') ? 'text-[#E91E8C] font-extrabold' : ''}`}
            >
              {language === 'bn' ? 'অথেনটিসিটি' : 'Authenticity'}
            </Link>
            <Link 
              to="/about-us" 
              className={`py-1 transition-all hover:text-[#E91E8C] ${isActivePath('/about-us') ? 'text-[#E91E8C] font-extrabold' : ''}`}
            >
              {language === 'bn' ? 'আমাদের সম্পর্কে' : 'About'}
            </Link>
            <Link 
              to="/contact-us" 
              className={`py-1 transition-all hover:text-[#E91E8C] ${isActivePath('/contact-us') ? 'text-[#E91E8C] font-extrabold' : ''}`}
            >
              {language === 'bn' ? 'যোগাযোগ' : 'Contact'}
            </Link>
          </nav>
        </div>

        {/* Center Section: Branding Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          {globalTheme.logoUrl && globalTheme.logoUrl.trim() !== '' ? (
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
                if (isWholesaleUser) {
                  navigate(`/product/${product.id}`);
                } else {
                  addToCart(product);
                  setIsCartOpen(true);
                }
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
            onClick={() => {
              if (isWholesaleUser) {
                navigate('/wholesale/checkout');
              } else {
                setIsCartOpen(true);
              }
            }}
            className="relative p-2 sm:p-2.5 bg-white hover:bg-pink-50 rounded-xl border border-pink-200 cursor-pointer transition text-gray-700 shadow-xs"
            aria-label={isWholesaleUser ? "Wholesale Cart & Checkout" : "Shopping Cart"}
            title={isWholesaleUser ? (language === 'bn' ? 'হোলসেল চেকআউট' : 'Wholesale Checkout') : (language === 'bn' ? 'শপিং ব্যাগ' : 'Shopping Cart')}
          >
            <ShoppingBag size={16} className={isWholesaleUser ? 'text-amber-600' : ''} />
            {isWholesaleUser ? (
              wholesaleTotalUnits > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-4.5 sm:h-4.5 bg-amber-500 text-slate-950 text-[8px] font-black rounded-full flex items-center justify-center border border-white">
                  {wholesaleTotalUnits}
                </span>
              )
            ) : (
              cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-4.5 sm:h-4.5 bg-[#E91E8C] text-white text-[8px] font-black rounded-full flex items-center justify-center animate-bounce border border-white">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )
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
                {(profile?.photoURL && profile.photoURL.trim() !== '') || (user?.photoURL && user.photoURL.trim() !== '') ? (
                  <img 
                    src={(profile?.photoURL && profile.photoURL.trim() !== '') ? profile.photoURL : user!.photoURL!} 
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

                      <Link 
                        to="/wholesale/profile" 
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2 hover:bg-pink-50/40 flex items-center gap-2 transition text-purple-700 font-bold"
                      >
                        <Building2 size={14} className="text-purple-600" />
                        <span>Wholesale Profile</span>
                      </Link>

                      <Link 
                        to="/wholesale/checkout" 
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2 hover:bg-amber-50/40 flex items-center gap-2 transition text-amber-900 font-bold"
                      >
                        <Truck size={14} className="text-amber-600" />
                        <span>Wholesale Checkout</span>
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
                    to="/concerns"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition ${
                      isActivePath('/concerns') || isActivePath('/concern/') ? 'bg-[#E91E8C] text-white' : 'hover:bg-pink-50'
                    }`}
                  >
                    <Sparkles size={16} />
                    <span>{language === 'bn' ? 'ত্বকের সমস্যা ও সমাধান' : 'Skin Concerns'}</span>
                  </Link>

                  <Link
                    to="/ingredients"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition ${
                      isActivePath('/ingredients') || isActivePath('/ingredient/') ? 'bg-[#E91E8C] text-white' : 'hover:bg-pink-50'
                    }`}
                  >
                    <Layers size={16} />
                    <span>{language === 'bn' ? 'উপাদান লাইব্রেরি' : 'Ingredient Library'}</span>
                  </Link>

                  <Link
                    to="/skin-quiz"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition ${
                      isActivePath('/skin-quiz') ? 'bg-[#E91E8C] text-white' : 'hover:bg-pink-50'
                    }`}
                  >
                    <Wand2 size={16} />
                    <span>{language === 'bn' ? 'স্কিন প্রোফাইল কুইজ' : 'Skin Profile Quiz'}</span>
                  </Link>

                  <Link
                    to="/routine-builder"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition ${
                      isActivePath('/routine-builder') ? 'bg-[#E91E8C] text-white' : 'hover:bg-pink-50'
                    }`}
                  >
                    <Award size={16} />
                    <span>{language === 'bn' ? 'রুটিন বিল্ডার' : 'AM/PM Routine Builder'}</span>
                  </Link>

                  <Link
                    to="/authenticity"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition ${
                      isActivePath('/authenticity') ? 'bg-[#E91E8C] text-white' : 'hover:bg-pink-50'
                    }`}
                  >
                    <ShieldCheck size={16} />
                    <span>{language === 'bn' ? 'অথেনটিসিটি ও প্যাকিং গাইড' : 'Authenticity & Inspection'}</span>
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

                  <Link
                    to="/wholesale/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition ${
                      isActivePath('/wholesale/profile') ? 'bg-purple-900 text-white' : 'hover:bg-purple-50 text-purple-900 font-bold'
                    }`}
                  >
                    <Building2 size={16} className="text-purple-600" />
                    <span>{language === 'bn' ? 'হোলসেল প্রোফাইল' : 'Wholesale Profile'}</span>
                  </Link>

                  <Link
                    to="/wholesale/checkout"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition ${
                      isActivePath('/wholesale/checkout') ? 'bg-amber-500 text-slate-950 font-black' : 'hover:bg-amber-50 text-amber-900 font-bold'
                    }`}
                  >
                    <Truck size={16} className="text-amber-600" />
                    <span>{language === 'bn' ? 'হোলসেল চেকআউট' : 'Wholesale Checkout'}</span>
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

      {/* 5. Cart Drawer overlay (Suppressed completely for Wholesale Users) */}
      <AnimatePresence>
        {isCartOpen && !isWholesaleUser && (
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
                {cart.length === 0 ? (
                  <div className="py-24 text-center text-gray-500 space-y-3">
                    <ShoppingBag size={42} className="mx-auto opacity-20 text-gray-400" />
                    <p className="text-xs font-bold text-gray-600">
                      {language === 'bn' ? 'আপনার স্কিনকেয়ার কার্টটি খালি।' : 'Your skincare basket is empty.'}
                    </p>
                    <button 
                      onClick={() => setIsCartOpen(false)} 
                      className="px-4 py-2 bg-[#E91E8C] hover:bg-[#FF4B91] text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-sm"
                    >
                      {language === 'bn' ? 'শপিং শুরু করুন' : 'Start Shopping'}
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
                            <img src={item.product.image || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=200'} className="w-12 h-12 object-cover rounded-xl shadow-xs border border-pink-100 shrink-0" referrerPolicy="no-referrer" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-bold text-gray-800 leading-tight truncate">
                                  {language === 'en' ? item.product.name : (item.product.nameBN || item.product.name)}
                                </h4>
                                {item.product.isCombo && (
                                  <span className="text-[8px] font-black uppercase text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                                    Combo
                                  </span>
                                )}
                              </div>
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
                              {/* Combo Components Breakdown */}
                              {item.comboComponents && item.comboComponents.length > 0 && (
                                <div className="mt-1 space-y-0.5 text-[10px] text-slate-500 pl-2 border-l-2 border-purple-200">
                                  {item.comboComponents.map((comp, cIdx) => (
                                    <div key={cIdx} className="truncate text-slate-600">
                                      • {comp.quantity}x {comp.name}
                                    </div>
                                  ))}
                                </div>
                              )}
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
              </div>

              {/* Drawer Footer CTA */}
              {cart.length > 0 && (
                <div className="p-4 border-t border-pink-100 bg-pink-50/10 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-gray-500">
                      {language === 'bn' ? 'সাবটোটাল:' : 'Basket Subtotal:'}
                    </span>
                    <span className="font-black text-gray-800 font-mono tabular-nums">৳{calculateCartSubtotal().toLocaleString()} BDT</span>
                  </div>
                  <button 
                    onClick={() => {
                      analytics.trackBeginCheckout(cart, calculateCartSubtotal());
                      setCheckoutStep('cart');
                      setIsCartOpen(false);
                      navigate('/checkout');
                    }}
                    className="w-full py-3 bg-[#E91E8C] hover:bg-[#FF4B91] text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>{language === 'bn' ? 'চেকআউটে যান' : 'Proceed to Checkout'}</span>
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
          onClick={() => {
            if (isWholesaleUser) {
              navigate('/wholesale/checkout');
            } else {
              setIsCartOpen(true);
            }
          }}
          className="relative flex flex-col items-center gap-0.5 py-1 px-2.5 text-gray-500 hover:text-[#E91E8C] active:text-[#E91E8C] transition-all cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag size={18} className={isWholesaleUser ? 'text-amber-600' : ''} />
            {isWholesaleUser ? (
              wholesaleTotalUnits > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 text-slate-950 text-[8px] font-black rounded-full flex items-center justify-center border border-white">
                  {wholesaleTotalUnits}
                </span>
              )
            ) : (
              cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#E91E8C] text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )
            )}
          </div>
          <span className="text-[9px] font-bold">
            {isWholesaleUser ? (language === 'bn' ? 'হোলসেল' : 'Wholesale') : (activeTranslations.cart || "Cart")}
          </span>
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
          if (isWholesaleUser) {
            navigate(`/product/${product.id}`);
          } else {
            addToCart(product);
            setIsCartOpen(true);
          }
        }}
        onSelectProduct={(product) => {
          navigate(`/shop`);
        }}
      />

    </div>
  );
};
