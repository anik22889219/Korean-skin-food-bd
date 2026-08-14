import React, { useState, useEffect, useMemo, useRef } from 'react';
import { themeService } from '../services/themeService';
import { HomeThemeSettings, SectionKey, ReelItem } from '../types/theme';
import { productService } from '../services/productService';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import { KOREAN_BRANDS } from '../data/brands';
import { 
  ShoppingBag, Search, SlidersHorizontal, CheckCircle, X,
  Globe, Store, Zap, ShieldCheck, FileText, ChevronRight, ChevronLeft,
  ArrowRight, Play, Pause, Star, Sparkles, MapPin, Package, Truck,
  Award, Heart, RefreshCw, Send, Volume2, VolumeX, ExternalLink,
  Eye, Share2, Clock, Calendar, Filter, Tag, Camera
} from 'lucide-react';
import { motion } from 'motion/react';
import { getShelfLifeInfo, formatCompactNumber } from './AdminSocial';
import { StoreCatalogSkeleton } from './Skeletons';
import { ImageSearchModal } from './ImageSearchModal';
import { TopCreatorsSection } from './TopCreatorsSection';

const CATEGORIES = [
  'All', 
  'Cleanser', 
  'Toner', 
  'Serum & Essence', 
  'Cream & Moisturizer', 
  'Sunscreen', 
  'Lip Care', 
  'Eye Care', 
  'Mask & Pack', 
  'Exfoliator', 
  'Body & Hair Care', 
  'Oral Care', 
  'Supplements', 
  'Spot Treatment',
  'Makeup & Tone-Up'
];
const SKIN_TYPES = ['All', 'Oily', 'Dry', 'Sensitive', 'Combination', 'Acne-Prone'];

export const StoreCatalog: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart, language, activeTranslations } = useCart();
  
  // Theme & Products state
  const [theme, setTheme] = useState<HomeThemeSettings>(themeService.getHomeTheme());
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedSkinType, setSelectedSkinType] = useState('All');
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const [isBrandDrawerOpen, setIsBrandDrawerOpen] = useState(false);
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close catalog search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Available brands list combining static catalog & active store products
  const availableBrands = useMemo(() => {
    const brandSet = new Set<string>();
    KOREAN_BRANDS.forEach(b => brandSet.add(b));
    products.forEach(p => {
      if (p.brand && p.brand.trim()) brandSet.add(p.brand.trim());
    });
    return Array.from(brandSet).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Product counts per brand for badges
  const brandProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      if (p.brand) {
        const key = p.brand.trim().toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Filtered brands for brand modal/search
  const filteredBrandList = useMemo(() => {
    if (!brandSearchTerm.trim()) return availableBrands;
    const term = brandSearchTerm.trim().toLowerCase();
    return availableBrands.filter(b => b.toLowerCase().includes(term));
  }, [availableBrands, brandSearchTerm]);

  // Shipping calculator state
  const [calcWeight, setCalcWeight] = useState<number | ''>(1);
  const [calcResult, setCalcResult] = useState<number | null>(750);

  // Mobile viewport detection
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  // Touch swipe gesture refs for carousels
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (onSwipeLeft: () => void, onSwipeRight: () => void) => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 35) {
      onSwipeLeft();
    } else if (distance < -35) {
      onSwipeRight();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto Slide state for Community Live (Reels)
  const [clActiveIndex, setClActiveIndex] = useState(0);
  const [clAutoPlay, setClAutoPlay] = useState(true);
  const [clIsHovered, setClIsHovered] = useState(false);

  // Auto Slide state for Shared Journey (Community Photos)
  const [sjActiveIndex, setSjActiveIndex] = useState(0);
  const [sjAutoPlay, setSjAutoPlay] = useState(true);
  const [sjIsHovered, setSjIsHovered] = useState(false);

  useEffect(() => {
    // Subscribe to real-time theme updates
    const unsubscribeTheme = themeService.subscribe((data) => {
      setTheme(data);
    });
    const initialProds = productService.getProducts();
    if (initialProds && initialProds.length > 0) {
      setProducts(initialProds);
      setIsLoading(false);
    }
    const unsubscribeProducts = productService.subscribe((prods) => {
      setProducts([...prods]);
      setIsLoading(false);
    });
    return () => {
      unsubscribeTheme();
      unsubscribeProducts();
    };
  }, []);

  // Community Live Auto Slide Timer
  useEffect(() => {
    const reelsCount = theme.communityLive?.reels?.length || 0;
    if (!clAutoPlay || clIsHovered || reelsCount <= 1) return;

    const timer = setInterval(() => {
      setClActiveIndex((prev) => (prev + 1) % reelsCount);
    }, 3500);

    return () => clearInterval(timer);
  }, [clAutoPlay, clIsHovered, theme.communityLive?.reels?.length]);

  // Shared Journey Auto Slide Timer
  useEffect(() => {
    const photosCount = theme.sharedJourney?.photos?.length || 0;
    if (!sjAutoPlay || sjIsHovered || photosCount <= 1) return;

    const timer = setInterval(() => {
      setSjActiveIndex((prev) => (prev + 1) % photosCount);
    }, 3500);

    return () => clearInterval(timer);
  }, [sjAutoPlay, sjIsHovered, theme.sharedJourney?.photos?.length]);

  // Filter products based on search and selected brand, category, and skin type
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !q || 
        (p.name && p.name.toLowerCase().includes(q)) || 
        (p.nameBN && p.nameBN.toLowerCase().includes(q)) || 
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q));

      const matchesCategory = selectedCategory === 'All' || 
        (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());

      const matchesBrand = selectedBrand === 'All' || 
        (p.brand && p.brand.toLowerCase() === selectedBrand.toLowerCase());

      const matchesSkinType = selectedSkinType === 'All' || 
        (p.skinTypes && p.skinTypes.some(s => s.toLowerCase() === selectedSkinType.toLowerCase()));

      return matchesSearch && matchesCategory && matchesBrand && matchesSkinType;
    });
  }, [products, searchQuery, selectedCategory, selectedBrand, selectedSkinType]);

  const handleCalculateShipping = (e: React.FormEvent) => {
    e.preventDefault();
    const w = typeof calcWeight === 'number' ? calcWeight : 1;
    // Calculation logic: Base ৳500 + ৳250 per kg
    setCalcResult(Math.round(500 + w * 250));
  };

  // Helper: Render feature icon
  const renderFeatureIcon = (iconName: string, iconColorClass: string) => {
    switch (iconName) {
      case 'language':
        return <Globe size={20} className={iconColorClass} />;
      case 'storefront':
        return <Store size={20} className={iconColorClass} />;
      case 'speed':
        return <Zap size={20} className={iconColorClass} />;
      case 'verified':
        return <ShieldCheck size={20} className={iconColorClass} />;
      case 'request_quote':
        return <FileText size={20} className={iconColorClass} />;
      default:
        return <Sparkles size={20} className={iconColorClass} />;
    }
  };

  // SECTION 1: HERO BANNER
  const renderHeroSection = () => {
    const h = theme.hero;
    if (!h || !h.enabled) return null;

    return (
      <div 
        key="hero" 
        className="relative w-full min-h-[480px] md:min-h-[560px] overflow-hidden bg-[#fbf2ed] bg-cover bg-center bg-no-repeat border-b border-pink-100 shadow-sm transition-all duration-500 flex items-center"
        style={{
          backgroundImage: h.backgroundImageUrl ? `url("${h.backgroundImageUrl}")` : undefined
        }}
      >
        {/* Soft, crisp gradient overlay to showcase the background image clearly */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/75 via-white/30 to-transparent pointer-events-none z-0" />
        
        {/* Subtle ambient lighting glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-pink-300/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 right-10 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:py-20 lg:py-24">
          <div className="max-w-4xl space-y-7 text-center lg:text-left">
            {h.badgeText && (
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#E91E8C]/15 via-pink-500/10 to-purple-500/10 text-[#E91E8C] text-xs sm:text-sm font-black uppercase tracking-wider px-4 py-1.5 rounded-full border border-[#E91E8C]/30 shadow-xs backdrop-blur-md">
                <Sparkles size={14} className="text-[#E91E8C] animate-pulse" />
                <span>{h.badgeText}</span>
              </div>
            )}

            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-black text-slate-900 leading-[1.1] tracking-tight">
              {h.titleLine1}{' '}
              <span className="bg-gradient-to-r from-[#E91E8C] via-[#FF4B91] to-purple-600 bg-clip-text text-transparent underline decoration-pink-300 decoration-wavy decoration-2">
                {h.titleHighlight}
              </span>{' '}
              {h.titleLine2}
            </h1>

            <p className="text-slate-700 text-sm sm:text-base md:text-lg font-semibold leading-relaxed max-w-3xl mx-auto lg:mx-0">
              {h.subtitle}
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                to={h.primaryButtonLink || '/shop'}
                className="px-8 py-4 bg-gradient-to-r from-[#E91E8C] to-[#C2185B] hover:from-[#FF4B91] hover:to-[#E91E8C] text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-xl shadow-[#E91E8C]/25 hover:shadow-pink-400/40 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2.5 cursor-pointer"
              >
                <span>{h.primaryButtonText}</span>
                <ArrowRight size={18} />
              </Link>

              <Link
                to={h.secondaryButtonLink || '/about-us'}
                className="px-7 py-4 bg-white/95 hover:bg-white text-slate-900 rounded-2xl text-xs sm:text-sm font-extrabold transition-all border border-pink-200 shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer backdrop-blur-md"
              >
                <span>{h.secondaryButtonText}</span>
              </Link>
            </div>

            {/* Premium Trust Cards Grid */}
            <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-left border-t border-pink-200/60 mt-8">
              <div className="p-3.5 sm:p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-pink-100 shadow-xs hover:border-pink-300 transition">
                <ShieldCheck size={20} className="text-[#E91E8C] mb-1.5" />
                <h4 className="text-xs sm:text-sm font-black text-slate-900">100% Genuine</h4>
                <p className="text-[10px] sm:text-xs text-slate-600 font-medium">Direct Seoul Air Freight</p>
              </div>

              <div className="p-3.5 sm:p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-pink-100 shadow-xs hover:border-pink-300 transition">
                <Truck size={20} className="text-[#E91E8C] mb-1.5" />
                <h4 className="text-xs sm:text-sm font-black text-slate-900">Fast Delivery</h4>
                <p className="text-[10px] sm:text-xs text-slate-600 font-medium">Nationwide BD Express</p>
              </div>

              <div className="p-3.5 sm:p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-pink-100 shadow-xs hover:border-pink-300 transition">
                <Sparkles size={20} className="text-[#E91E8C] mb-1.5" />
                <h4 className="text-xs sm:text-sm font-black text-slate-900">Top Brands</h4>
                <p className="text-[10px] sm:text-xs text-slate-600 font-medium">COSRX, Anua, BOJ & More</p>
              </div>

              <div className="p-3.5 sm:p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-pink-100 shadow-xs hover:border-pink-300 transition">
                <CheckCircle size={20} className="text-[#E91E8C] mb-1.5" />
                <h4 className="text-xs sm:text-sm font-black text-slate-900">Verified Quality</h4>
                <p className="text-[10px] sm:text-xs text-slate-600 font-medium">50,000+ BD Customers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // SECTION 2: FEATURE ICONS
  const renderFeatureIconsSection = () => {
    const fi = theme.featureIcons;
    if (!fi || !fi.enabled) return null;

    return (
      <div key="featureIcons" className="bg-white p-6 rounded-[28px] border border-pink-100 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {fi.items.filter(i => i.enabled).map((item) => (
            <div key={item.id} className="flex flex-col items-center text-center p-3 rounded-2xl hover:bg-pink-50/20 transition">
              <div className={`w-12 h-12 rounded-2xl ${item.bgColor || 'bg-pink-50'} flex items-center justify-center mb-2 shadow-xs`}>
                {renderFeatureIcon(item.iconName, item.iconColor || 'text-[#E91E8C]')}
              </div>
              <span className="text-xs font-extrabold text-slate-800 leading-tight">{item.title}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // SECTION 3: FOUNDER STORY
  const renderFounderStorySection = () => {
    const fs = theme.founderStory;
    if (!fs || !fs.enabled) return null;

    return (
      <div key="founderStory" className="bg-[#fbf2ed] p-8 md:p-12 rounded-[32px] border border-pink-100 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-lg border border-pink-100">
              <img
                src={fs.founderImageUrl}
                alt="Founders Story"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {fs.estYear && (
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs font-black text-[#E91E8C] border border-pink-100 shadow-sm">
                {fs.estYear}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-4">
            <span className="text-[10px] font-black text-[#E91E8C] uppercase tracking-widest block">
              {fs.subtitle}
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900 leading-tight">
              {fs.title}
            </h2>
            <blockquote className="text-sm font-serif italic text-slate-700 border-l-2 border-[#E91E8C] pl-4 py-1 leading-relaxed">
              {fs.quote}
            </blockquote>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {fs.body}
            </p>
            {fs.councilLabel && (
              <span className="inline-block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pt-2">
                {fs.councilLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // SECTION 4: BOTANICAL ESSENTIALS
  const renderBotanicalEssentialsSection = () => {
    const be = theme.botanicalEssentials;
    if (!be || !be.enabled) return null;

    return (
      <div key="botanicalEssentials" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-pink-100 pb-3">
          <div>
            <span className="text-[10px] font-black text-[#E91E8C] uppercase tracking-widest block">
              {be.subtitle}
            </span>
            <h2 className="text-2xl font-serif font-black text-slate-900">
              {be.title}
            </h2>
          </div>
          <Link to="/shop" className="text-xs font-extrabold text-[#E91E8C] hover:underline flex items-center gap-1">
            <span>View Full Collection</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredProducts.slice(0, 6).map((prod) => (
            <div
              key={prod.id}
              className="bg-white rounded-2xl border border-pink-100 overflow-hidden flex flex-col justify-between hover:border-pink-300 hover:shadow-md transition p-3 space-y-2 group"
            >
              <div
                className="aspect-square bg-pink-50/20 rounded-xl overflow-hidden cursor-pointer"
                onClick={() => navigate(`/product/${prod.id}`)}
              >
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-[8px] font-extrabold text-[#E91E8C] uppercase">{prod.brand}</span>
                <h4
                  onClick={() => navigate(`/product/${prod.id}`)}
                  className="text-xs font-bold text-slate-900 line-clamp-1 cursor-pointer hover:text-[#E91E8C]"
                >
                  {prod.name}
                </h4>
                <span className="text-xs font-black text-slate-900 font-mono mt-1 block">৳{prod.price}</span>
              </div>
              <button
                onClick={() => addToCart(prod)}
                className="w-full py-1.5 bg-[#E91E8C] hover:bg-[#FF4B91] text-white rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <ShoppingBag size={11} />
                <span>{be.buttonText || 'Add to Bag'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // SECTION 5: QUALITY ASSURANCE
  const renderQualityAssuranceSection = () => {
    const qa = theme.qualityAssurance;
    if (!qa || !qa.enabled) return null;

    return (
      <div key="qualityAssurance" className="bg-white p-8 md:p-12 rounded-[32px] border border-pink-100 shadow-sm space-y-8">
        <div className="max-w-2xl space-y-2">
          <span className="text-[10px] font-black text-[#E91E8C] uppercase tracking-widest block">
            {qa.subtitle}
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
            {qa.title}
          </h2>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            {qa.description}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-6">
            {qa.features.map((f) => (
              <div key={f.id} className="flex items-start gap-4 p-4 bg-pink-50/20 rounded-2xl border border-pink-100/50">
                <span className="text-2xl font-serif font-black text-[#E91E8C]">
                  {f.numberStr}
                </span>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">{f.title}</h4>
                  <p className="text-[11px] text-slate-600 mt-1 font-medium leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-6 relative">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-lg border border-pink-100">
              <img
                src={qa.mainImageUrl}
                alt="Logistics QA"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {qa.opsNoteQuote && (
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-pink-100 shadow-lg text-xs space-y-1">
                <span className="font-extrabold text-[#E91E8C] text-[10px] uppercase tracking-wider block">
                  {qa.opsNoteTitle || 'Operations Note'}
                </span>
                <p className="italic text-slate-700 font-serif">
                  {qa.opsNoteQuote}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // SECTION 6: VALIDATED FORMULATIONS (PRECISION SCIENCE)
  const renderValidatedFormulationsSection = () => {
    const vf = theme.validatedFormulations;
    if (!vf || !vf.enabled) return null;

    const hasActiveFilters = searchQuery.trim() || selectedCategory !== 'All' || selectedBrand !== 'All' || selectedSkinType !== 'All';

    const clearAllFilters = () => {
      setSearchQuery('');
      setSelectedCategory('All');
      setSelectedBrand('All');
      setSelectedSkinType('All');
      setBrandSearchTerm('');
    };

    const POPULAR_BRANDS_SHORTCUTS = [
      'All',
      'Anua',
      'COSRX',
      'SKIN1004',
      'Beauty of Joseon',
      'Atomy',
      'Medicube',
      'Care:Nel',
      'MISSHA',
      'AXIS-Y',
      'iUNIK',
      '3W Clinic',
      'SOME BY MI'
    ];

    return (
      <div key="validatedFormulations" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-pink-100 pb-3">
          <div>
            <span className="text-[10px] font-black text-[#E91E8C] uppercase tracking-widest block">
              {vf.subtitle}
            </span>
            <h2 className="text-2xl font-serif font-black text-slate-900">
              {vf.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 bg-pink-50 px-3 py-1 rounded-full border border-pink-100">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'} Found
            </span>
          </div>
        </div>

        {/* Main Catalog Search & Filter Controls Bar */}
        <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            
            {/* Search Input with Image Search trigger & Live Dropdown */}
            <div ref={searchContainerRef} className="relative md:col-span-4">
              <Search size={16} className="absolute left-3 top-2.5 text-pink-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim()) setIsSearchDropdownOpen(true);
                }}
                placeholder="Search by product name, brand, barcode..."
                className="w-full bg-pink-50/10 border border-pink-100 rounded-xl pl-9 pr-24 py-2 text-xs outline-none focus:border-[#E91E8C]"
              />
              <div className="absolute right-2 top-1.5 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchDropdownOpen(false);
                    }}
                    className="p-1 text-gray-400 hover:text-pink-600"
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsImageSearchOpen(true)}
                  className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="Search catalog by uploading a product photo"
                >
                  <Camera size={13} />
                  <span className="hidden sm:inline">Photo Search</span>
                </button>
              </div>

              {/* Live Search Autocomplete Dropdown */}
              {isSearchDropdownOpen && searchQuery.trim() !== '' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-rose-100 overflow-hidden z-50 animate-fadeIn">
                  <div className="px-3.5 py-2 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between text-xs text-rose-700 font-semibold">
                    <span>Live Suggestions ({filteredProducts.slice(0, 6).length})</span>
                    <span className="text-[10px] text-slate-400 font-medium">Click to view product</span>
                  </div>

                  {filteredProducts.length > 0 ? (
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {filteredProducts.slice(0, 6).map((product) => (
                        <div
                          key={product.id}
                          onClick={() => {
                            setIsSearchDropdownOpen(false);
                            navigate(`/product/${product.id}`);
                          }}
                          className="p-2.5 hover:bg-rose-50/50 cursor-pointer transition-colors flex items-center gap-3 group"
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded-lg bg-slate-100 border border-slate-200 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-bold text-rose-600 uppercase bg-rose-50 px-1 py-0.2 rounded border border-rose-100">
                              {product.brand}
                            </span>
                            <h5 className="text-xs font-bold text-slate-800 truncate group-hover:text-rose-600 transition-colors">
                              {product.name}
                            </h5>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-black text-rose-600">
                                ৳{product.price.toLocaleString()}
                              </span>
                              <span className={`text-[9px] font-medium px-1 py-0.2 rounded ${
                                product.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                              </span>
                            </div>
                          </div>
                          <Eye size={14} className="text-slate-300 group-hover:text-rose-500 shrink-0 transition-colors" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No products found matching "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Category Filter Select */}
            <div className="md:col-span-3 flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-pink-50/20 border border-pink-100 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#E91E8C] cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'All' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter Selector Button */}
            <div className="md:col-span-3 flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Brand:</span>
              <button
                type="button"
                onClick={() => setIsBrandDrawerOpen(!isBrandDrawerOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                  selectedBrand !== 'All'
                    ? 'bg-[#E91E8C] text-white border-[#E91E8C]'
                    : 'bg-pink-50/20 text-slate-800 border-pink-100 hover:border-pink-300'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Tag size={13} />
                  <span className="truncate">{selectedBrand === 'All' ? 'All Brands (60+)' : selectedBrand}</span>
                </div>
                <ChevronRight size={14} className={`transform transition ${isBrandDrawerOpen ? 'rotate-90' : ''}`} />
              </button>
            </div>

            {/* Skin Type Select */}
            <div className="md:col-span-2 flex items-center gap-1.5">
              <select
                value={selectedSkinType}
                onChange={(e) => setSelectedSkinType(e.target.value)}
                className="w-full bg-pink-50/20 border border-pink-100 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#E91E8C] cursor-pointer"
              >
                {SKIN_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {st === 'All' ? 'All Skin Types' : `${st} Skin`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Brand Shortcut Pills Bar */}
          <div className="pt-2 border-t border-pink-50/60 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
              <Filter size={11} className="text-[#E91E8C]" />
              <span>Top Brands:</span>
            </span>
            {POPULAR_BRANDS_SHORTCUTS.map((bName) => {
              const count = bName === 'All' ? products.length : (brandProductCounts[bName.toLowerCase()] || 0);
              const isActive = selectedBrand === bName;
              return (
                <button
                  key={bName}
                  type="button"
                  onClick={() => setSelectedBrand(bName)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                    isActive
                      ? 'bg-[#E91E8C] text-white shadow-xs'
                      : 'bg-pink-50/40 text-gray-700 border border-pink-100/60 hover:border-pink-300 hover:text-[#E91E8C]'
                  }`}
                >
                  <span>{bName === 'All' ? 'All Brands' : bName}</span>
                  {count > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${isActive ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-700'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setIsBrandDrawerOpen(!isBrandDrawerOpen)}
              className="px-3 py-1 rounded-full text-[10px] font-black text-[#E91E8C] bg-pink-100/50 hover:bg-pink-100 whitespace-nowrap transition cursor-pointer"
            >
              {isBrandDrawerOpen ? 'Close Brand List ✕' : 'View All Brands (60+) →'}
            </button>
          </div>

          {/* Expandable Full Brand Selector Drawer */}
          {isBrandDrawerOpen && (
            <div className="bg-pink-50/20 p-4 rounded-2xl border border-pink-200/80 space-y-3 animate-fadeIn">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-pink-200/50 pb-2">
                <div className="flex items-center gap-2">
                  <Tag size={15} className="text-[#E91E8C]" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Filter by Brand ({filteredBrandList.length} Korean Brands)
                  </h4>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-2.5 top-2 text-pink-400" />
                  <input
                    type="text"
                    value={brandSearchTerm}
                    onChange={(e) => setBrandSearchTerm(e.target.value)}
                    placeholder="Search 60+ Korean brand names..."
                    className="w-full bg-white border border-pink-200 rounded-lg pl-8 pr-3 py-1 text-xs outline-none focus:border-[#E91E8C]"
                  />
                  {brandSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setBrandSearchTerm('')}
                      className="absolute right-2 top-1.5 text-gray-400 hover:text-pink-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Brands Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-60 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBrand('All');
                    setIsBrandDrawerOpen(false);
                  }}
                  className={`p-2 rounded-xl text-xs font-bold text-left transition border cursor-pointer flex items-center justify-between ${
                    selectedBrand === 'All'
                      ? 'bg-[#E91E8C] text-white border-[#E91E8C]'
                      : 'bg-white text-gray-800 border-pink-100 hover:border-pink-300'
                  }`}
                >
                  <span>All Brands</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${selectedBrand === 'All' ? 'bg-white/20 text-white' : 'bg-pink-50 text-pink-600'}`}>
                    {products.length}
                  </span>
                </button>

                {filteredBrandList.map((brandName) => {
                  const pCount = brandProductCounts[brandName.toLowerCase()] || 0;
                  const isSelected = selectedBrand.toLowerCase() === brandName.toLowerCase();
                  return (
                    <button
                      key={brandName}
                      type="button"
                      onClick={() => {
                        setSelectedBrand(brandName);
                        setIsBrandDrawerOpen(false);
                      }}
                      className={`p-2 rounded-xl text-xs font-bold text-left transition border cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#E91E8C] text-white border-[#E91E8C]'
                          : 'bg-white text-gray-800 border-pink-100 hover:border-pink-300'
                      }`}
                    >
                      <span className="truncate mr-1">{brandName}</span>
                      {pCount > 0 && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-pink-50 text-pink-700 font-bold'}`}>
                          {pCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Filters Pills & Clear Button */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-pink-100/80 text-xs">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Active Filters:</span>

              {selectedBrand !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E91E8C] text-white text-[10px] font-bold">
                  Brand: {selectedBrand}
                  <button type="button" onClick={() => setSelectedBrand('All')} className="hover:text-pink-200 cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}

              {selectedCategory !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-white text-[10px] font-bold">
                  Category: {selectedCategory}
                  <button type="button" onClick={() => setSelectedCategory('All')} className="hover:text-pink-200 cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}

              {selectedSkinType !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-600 text-white text-[10px] font-bold">
                  Skin: {selectedSkinType}
                  <button type="button" onClick={() => setSelectedSkinType('All')} className="hover:text-pink-200 cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}

              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  Search: "{searchQuery}"
                  <button type="button" onClick={() => setSearchQuery('')} className="hover:text-amber-200 cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[10px] font-black text-[#E91E8C] hover:underline cursor-pointer ml-auto flex items-center gap-1"
              >
                <RefreshCw size={11} />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Products Grid or Empty State */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border border-pink-100 overflow-hidden flex flex-col justify-between hover:border-pink-300 hover:shadow-md transition p-3 space-y-2 group"
              >
                <div
                  className="aspect-square bg-pink-50/20 rounded-xl overflow-hidden cursor-pointer relative"
                  onClick={() => navigate(`/product/${prod.id}`)}
                >
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                    referrerPolicy="no-referrer"
                  />
                  {prod.category && (
                    <span className="absolute top-1.5 left-1.5 bg-slate-900/80 backdrop-blur-xs text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md">
                      {prod.category}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[8px] font-black text-[#E91E8C] uppercase tracking-wider block">{prod.brand}</span>
                  <h4
                    onClick={() => navigate(`/product/${prod.id}`)}
                    className="text-xs font-bold text-slate-900 line-clamp-1 cursor-pointer hover:text-[#E91E8C]"
                  >
                    {prod.name}
                  </h4>
                  <span className="text-xs font-black text-slate-900 font-mono mt-1 block">৳{prod.price}</span>
                </div>
                <button
                  onClick={() => addToCart(prod)}
                  className="w-full py-1.5 bg-[#E91E8C] hover:bg-[#FF4B91] text-white rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ShoppingBag size={11} />
                  <span>{vf.buttonText || 'Shop Now'}</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl border border-pink-100 text-center space-y-4">
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto text-[#E91E8C]">
              <Search size={28} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">No Products Found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                We couldn't find any items matching your selected brand or category filters.
              </p>
            </div>
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-5 py-2.5 bg-[#E91E8C] text-white font-bold text-xs rounded-xl shadow-sm hover:bg-[#FF4B91] transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw size={14} />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // SECTION 7: SHARED JOURNEY (COMMUNITY PHOTOS)
  const renderSharedJourneySection = () => {
    const sj = theme.sharedJourney;
    if (!sj || !sj.enabled) return null;

    const photos = sj.photos || [];
    if (photos.length === 0) return null;

    const handleNextPhoto = () => {
      setSjActiveIndex((prev) => (prev + 1) % photos.length);
    };

    const handlePrevPhoto = () => {
      setSjActiveIndex((prev) => (prev - 1 + photos.length) % photos.length);
    };

    // Calculate visible photos slice (displays 2 items on mobile, 4 on desktop)
    const getVisiblePhotos = () => {
      const maxVisible = isMobile ? 2 : 4;
      if (photos.length <= maxVisible) return photos;
      const visible = [];
      for (let i = 0; i < Math.min(maxVisible, photos.length); i++) {
        visible.push(photos[(sjActiveIndex + i) % photos.length]);
      }
      return visible;
    };

    const visiblePhotos = getVisiblePhotos();

    return (
      <div 
        key="sharedJourney" 
        className="bg-[#fbf2ed] p-5 md:p-10 rounded-[32px] border border-pink-100 shadow-sm space-y-6 relative overflow-hidden select-none"
        onMouseEnter={() => setSjIsHovered(true)}
        onMouseLeave={() => setSjIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => handleTouchEnd(handleNextPhoto, handlePrevPhoto)}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pink-100/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-[#E91E8C] uppercase tracking-widest block">
                {sj.subtitle}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-100/80 border border-pink-200 text-[10px] font-extrabold text-[#E91E8C]">
                <span className={`w-2 h-2 rounded-full ${sjAutoPlay && !sjIsHovered ? 'bg-[#E91E8C] animate-pulse' : 'bg-slate-400'}`} />
                <span>{sjAutoPlay ? (sjIsHovered ? 'Paused (Hover)' : 'Auto Sliding') : 'Slide Paused'}</span>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
              {sj.title}
            </h2>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setSjAutoPlay(!sjAutoPlay)}
              className="p-2.5 rounded-xl bg-white border border-pink-200 text-[#E91E8C] hover:bg-pink-50 transition shadow-xs cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title={sjAutoPlay ? "Pause Auto Slide" : "Start Auto Slide"}
            >
              {sjAutoPlay ? <Pause size={14} /> : <Play size={14} />}
              <span className="hidden md:inline">{sjAutoPlay ? "Pause" : "Auto Play"}</span>
            </button>

            <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-pink-200 shadow-xs">
              <button
                type="button"
                onClick={handlePrevPhoto}
                className="p-2 rounded-xl text-slate-700 hover:text-[#E91E8C] hover:bg-pink-50 transition cursor-pointer"
                aria-label="Previous Photo"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={handleNextPhoto}
                className="p-2 rounded-xl text-slate-700 hover:text-[#E91E8C] hover:bg-pink-50 transition cursor-pointer"
                aria-label="Next Photo"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {visiblePhotos.map((p) => (
            <motion.div
              key={`${p.id}-${sjActiveIndex}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-sm group border border-pink-100"
            >
              <img
                src={p.imageUrl}
                alt={p.altText}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                referrerPolicy="no-referrer"
              />
              {p.hoverText && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white text-[10px] font-extrabold opacity-0 group-hover:opacity-100 transition">
                  {p.hoverText}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {photos.length > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {photos.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSjActiveIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  sjActiveIndex === idx
                    ? 'w-8 bg-[#E91E8C] shadow-xs'
                    : 'w-2 bg-pink-200 hover:bg-pink-300'
                }`}
                aria-label={`Go to photo ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // SECTION 8: REACH & RELIABILITY
  const renderReachReliabilitySection = () => {
    const rr = theme.reachReliability;
    if (!rr || !rr.enabled) return null;

    return (
      <div key="reachReliability" className="bg-white p-8 md:p-12 rounded-[32px] border border-pink-100 shadow-sm space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[10px] font-black text-[#E91E8C] uppercase tracking-widest block">
              {rr.subtitle}
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
              {rr.title}
            </h2>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {rr.description}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {rr.stats.map((s) => (
                <div key={s.id} className="p-3 bg-pink-50/20 rounded-2xl border border-pink-100 space-y-0.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{s.label}</span>
                  <span className="text-lg font-black text-[#E91E8C] block">{s.value}</span>
                  <span className="text-[10px] text-slate-600 font-bold block">{s.subValue}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-3 gap-3">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-pink-100 shadow-sm">
              <img src={rr.image1Url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-pink-100 shadow-sm">
              <img src={rr.image2Url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-pink-100 shadow-sm">
              <img src={rr.image3Url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper ReelCard with auto-play muted video capability
  const ReelCard: React.FC<{ reel: ReelItem }> = ({ reel }) => {
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const videoRef = React.useRef<HTMLVideoElement>(null);

    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {
          // Silent fallback if browser restricts auto-play
        });
      }
    }, [reel.videoUrl]);

    const isDirectVideo = Boolean(
      reel.videoUrl && (
        reel.videoUrl.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i) ||
        reel.videoUrl.includes('cloudinary.com') ||
        reel.videoUrl.includes('res.cloudinary') ||
        reel.videoUrl.startsWith('data:video') ||
        reel.videoUrl.startsWith('blob:')
      )
    );

    const isFacebookReel = Boolean(
      reel.videoUrl && (
        reel.videoUrl.includes('facebook.com') || reel.videoUrl.includes('fb.watch')
      )
    );

    const isInstagramReel = Boolean(
      reel.videoUrl && (
        reel.videoUrl.includes('instagram.com') || reel.videoUrl.includes('instagr.am')
      )
    );

    const getFacebookEmbedUrl = (url: string) => {
      let cleanUrl = url.trim();
      // Transform share/r/ ID to reel/ ID for iframe compatibility
      if (cleanUrl.includes('facebook.com/share/r/')) {
        const reelId = cleanUrl.split('share/r/')[1]?.split('/')[0]?.split('?')[0];
        if (reelId) {
          cleanUrl = `https://www.facebook.com/reel/${reelId}/`;
        }
      } else if (cleanUrl.includes('facebook.com/share/v/')) {
        const videoId = cleanUrl.split('share/v/')[1]?.split('/')[0]?.split('?')[0];
        if (videoId) {
          cleanUrl = `https://www.facebook.com/watch/?v=${videoId}`;
        }
      }

      if (cleanUrl.includes('facebook.com/plugins/video.php')) {
        return cleanUrl.includes('autoplay') ? cleanUrl : `${cleanUrl}&autoplay=true&muted=true`;
      }
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleanUrl)}&show_text=false&autoplay=true&muted=true&container_width=500`;
    };

    const getInstagramEmbedUrl = (url: string) => {
      let cleanUrl = url.trim();
      if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
      if (!cleanUrl.endsWith('/embed')) {
        cleanUrl = `${cleanUrl}/embed`;
      }
      return cleanUrl;
    };

    const isYouTube = Boolean(
      reel.videoUrl && (
        reel.videoUrl.includes('youtube.com') || reel.videoUrl.includes('youtu.be')
      )
    );

    const getYouTubeEmbedUrl = (url: string) => {
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (url.includes('youtube.com/shorts/')) {
        videoId = url.split('youtube.com/shorts/')[1]?.split('?')[0] || '';
      } else if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1]?.split('&')[0] || '';
      }
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0`;
    };

    const toggleMute = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (videoRef.current) {
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
      }
    };

    const togglePlay = () => {
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        } else {
          videoRef.current.play();
          setIsPlaying(true);
        }
      }
    };

    const shelfLife = getShelfLifeInfo(reel.createdAt);

    return (
      <div className="bg-white rounded-2xl border border-pink-100 overflow-hidden shadow-xs hover:shadow-md transition space-y-3 p-3 group">
        <div 
          className="relative aspect-[9/13] rounded-xl overflow-hidden bg-slate-900 cursor-pointer"
          onClick={isDirectVideo ? togglePlay : undefined}
        >
          {isDirectVideo || (reel.videoUrl && (reel.videoUrl.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i) || reel.videoUrl.includes('cloudinary') || reel.videoUrl.endsWith('.mp4'))) ? (
            <>
              <video
                ref={videoRef}
                src={reel.videoUrl}
                poster={reel.coverUrl}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                className="w-full h-full object-cover"
              />
              <button
                onClick={toggleMute}
                type="button"
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md hover:bg-[#E91E8C] transition"
                title={isMuted ? "Unmute Sound" : "Mute Sound"}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              {!isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                  <div className="w-12 h-12 rounded-full bg-[#E91E8C] text-white flex items-center justify-center shadow-lg">
                    <Play size={22} className="ml-0.5" />
                  </div>
                </div>
              )}
            </>
          ) : isYouTube ? (
            <iframe
              src={getYouTubeEmbedUrl(reel.videoUrl)}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            /* Facebook / Instagram or External Reel Card with Poster & Direct Link */
            <div className="relative w-full h-full group/reel">
              <img 
                src={reel.coverUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop'} 
                alt={reel.title} 
                className="w-full h-full object-cover group-hover/reel:scale-105 transition duration-500" 
                referrerPolicy="no-referrer" 
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

              {/* Platform & Shelf-Life Badges */}
              <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-1">
                <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold rounded-full border border-white/20 flex items-center gap-1">
                  {isFacebookReel ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span>Facebook Reel</span>
                    </>
                  ) : isInstagramReel ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                      <span>Instagram Reel</span>
                    </>
                  ) : (
                    <>
                      <Play size={10} className="fill-current text-[#E91E8C]" />
                      <span>Video Highlight</span>
                    </>
                  )}
                </span>

                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black backdrop-blur-md shadow-xs flex items-center gap-1 ${shelfLife.badgeColor}`}>
                  <Clock size={10} />
                  <span>{shelfLife.label}</span>
                </span>
              </div>

              {/* Engagement Metrics Bottom Overlay */}
              <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-white/90 text-[10px] font-bold bg-black/50 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10">
                <div className="flex items-center gap-1">
                  <Eye size={12} className="text-pink-400" />
                  <span>{formatCompactNumber(reel.viewsCount)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart size={12} className="text-rose-400 fill-rose-400/30" />
                  <span>{formatCompactNumber(reel.likesCount)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Share2 size={12} className="text-blue-400" />
                  <span>{formatCompactNumber(reel.sharesCount)}</span>
                </div>
              </div>

              {/* Centered Play / View Post Button & Direct Link */}
              {(reel.postUrl || reel.videoUrl) && (
                <a
                  href={reel.postUrl || reel.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 group/btn"
                >
                  <div className="w-14 h-14 rounded-full bg-[#E91E8C] text-white flex items-center justify-center shadow-xl group-hover/btn:scale-110 group-hover/btn:bg-[#FF4B91] transition duration-300">
                    <Play size={24} className="ml-1 fill-current" />
                  </div>
                  <span className="mt-2 text-[10px] font-extrabold bg-black/60 px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm group-hover/btn:bg-[#E91E8C] transition flex items-center gap-1">
                    <span>{reel.postUrl ? 'View Facebook Post' : 'Watch Reel'}</span>
                    <ExternalLink size={10} />
                  </span>
                </a>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between px-1">
            <a
              href={reel.postUrl || reel.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-extrabold text-slate-900 hover:text-[#E91E8C] transition line-clamp-1"
            >
              {reel.title || 'Social Reel'}
            </a>
            {(reel.postUrl || reel.videoUrl) && (
              <a
                href={reel.postUrl || reel.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[#E91E8C] font-extrabold hover:underline flex items-center gap-0.5 shrink-0 ml-1"
              >
                <span>{reel.postUrl ? 'View Post' : 'Watch'}</span>
                <ExternalLink size={10} />
              </a>
            )}
          </div>
          {reel.createdAt && (
            <div className="text-[10px] text-slate-500 px-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Calendar size={10} className="text-slate-400" />
                <span>Added {reel.createdAt}</span>
              </span>
              <span className="font-extrabold text-slate-600">{shelfLife.status}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // SECTION 9: COMMUNITY LIVE (FACEBOOK REELS)
  const renderCommunityLiveSection = () => {
    const cl = theme.communityLive;
    if (!cl || !cl.enabled) return null;

    const reels = cl.reels || [];
    if (reels.length === 0) return null;

    const handleNextReel = () => {
      setClActiveIndex((prev) => (prev + 1) % reels.length);
    };

    const handlePrevReel = () => {
      setClActiveIndex((prev) => (prev - 1 + reels.length) % reels.length);
    };

    // Calculate visible reels slice for carousel (displays 1 item on mobile, 3 items on desktop)
    const getVisibleReels = () => {
      const maxVisible = isMobile ? 1 : 3;
      if (reels.length <= maxVisible) return reels;
      const visible = [];
      for (let i = 0; i < Math.min(maxVisible, reels.length); i++) {
        visible.push(reels[(clActiveIndex + i) % reels.length]);
      }
      return visible;
    };

    const visibleReels = getVisibleReels();

    return (
      <div 
        key="communityLive" 
        className="bg-[#fbf2ed] p-5 md:p-10 rounded-[32px] border border-pink-100 shadow-sm space-y-6 relative overflow-hidden select-none"
        onMouseEnter={() => setClIsHovered(true)}
        onMouseLeave={() => setClIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => handleTouchEnd(handleNextReel, handlePrevReel)}
      >
        {/* Header with Title and Auto-Slide Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pink-100/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-[#E91E8C] uppercase tracking-widest block">
                {cl.subtitle}
              </span>
              {/* Auto-Slide Badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-100/80 border border-pink-200 text-[10px] font-extrabold text-[#E91E8C]">
                <span className={`w-2 h-2 rounded-full ${clAutoPlay && !clIsHovered ? 'bg-[#E91E8C] animate-pulse' : 'bg-slate-400'}`} />
                <span>{clAutoPlay ? (clIsHovered ? 'Paused (Hover)' : 'Auto Sliding') : 'Slide Paused'}</span>
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-black text-slate-900">
              {cl.title}
            </h2>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Play/Pause Auto-Slide Toggle */}
            <button
              type="button"
              onClick={() => setClAutoPlay(!clAutoPlay)}
              className="p-2.5 rounded-xl bg-white border border-pink-200 text-[#E91E8C] hover:bg-pink-50 transition shadow-xs cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title={clAutoPlay ? "Pause Auto Slide" : "Start Auto Slide"}
            >
              {clAutoPlay ? <Pause size={14} /> : <Play size={14} />}
              <span className="hidden md:inline">{clAutoPlay ? "Pause" : "Auto Play"}</span>
            </button>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-pink-200 shadow-xs">
              <button
                type="button"
                onClick={handlePrevReel}
                className="p-2 rounded-xl text-slate-700 hover:text-[#E91E8C] hover:bg-pink-50 transition cursor-pointer"
                aria-label="Previous Reel"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={handleNextReel}
                className="p-2 rounded-xl text-slate-700 hover:text-[#E91E8C] hover:bg-pink-50 transition cursor-pointer"
                aria-label="Next Reel"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {cl.viewAllLinkUrl && (
              <a
                href={cl.viewAllLinkUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-extrabold text-[#E91E8C] hover:underline flex items-center gap-1 ml-1"
              >
                <span>{cl.viewAllLinkText || 'View All'}</span>
                <ChevronRight size={14} />
              </a>
            )}
          </div>
        </div>

        {/* Sliding Reels Grid / Carousel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 transition-all duration-500">
          {visibleReels.map((reel) => (
            <motion.div
              key={`${reel.id}-${clActiveIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <ReelCard reel={reel} />
            </motion.div>
          ))}
        </div>

        {/* Pagination Dots */}
        {reels.length > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {reels.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setClActiveIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  clActiveIndex === idx
                    ? 'w-8 bg-[#E91E8C] shadow-xs'
                    : 'w-2 bg-pink-200 hover:bg-pink-300'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Section router mapper
  const renderSectionByKey = (secKey: SectionKey) => {
    switch (secKey) {
      case 'hero':
        return renderHeroSection();
      case 'featureIcons':
        return renderFeatureIconsSection();
      case 'founderStory':
        return renderFounderStorySection();
      case 'botanicalEssentials':
        return renderBotanicalEssentialsSection();
      case 'qualityAssurance':
        return renderQualityAssuranceSection();
      case 'validatedFormulations':
        return renderValidatedFormulationsSection();
      case 'sharedJourney':
        return renderSharedJourneySection();
      case 'reachReliability':
        return renderReachReliabilitySection();
      case 'communityLive':
        return (
          <>
            <TopCreatorsSection />
            {renderCommunityLiveSection()}
          </>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return <StoreCatalogSkeleton />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="w-full bg-[#fff8f5] space-y-10 md:space-y-12 pb-12 overflow-x-hidden"
    >
      {/* Dynamic Sections ordered according to theme settings */}
      {theme.sectionOrder.map((secKey) => {
        if (secKey === 'hero') {
          return (
            <div key="hero-wrapper" className="w-full">
              {renderHeroSection()}
            </div>
          );
        }
        return (
          <div key={secKey} className="w-full max-w-[1720px] mx-auto px-4 md:px-8 lg:px-12">
            {renderSectionByKey(secKey)}
          </div>
        );
      })}

      {/* Image Search Modal */}
      <ImageSearchModal
        isOpen={isImageSearchOpen}
        onClose={() => setIsImageSearchOpen(false)}
        catalog={products}
        onAddToCart={(product) => addToCart(product)}
      />
    </motion.div>
  );
};
