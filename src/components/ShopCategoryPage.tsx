import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  ShoppingBag, Search, SlidersHorizontal, Filter, X, ChevronDown, 
  ChevronRight, ChevronLeft, Star, Sparkles, RefreshCw, Heart, Check, CheckCircle, 
  Tag, ArrowUpDown, Sliders, Eye, Flame, ShieldCheck, Truck, ArrowRight,
  Info, Award, Zap, Package, Compass, Droplets, Droplet, Sun, Layers,
  Smile, Feather, Pill, Palette, Pause, Play, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';
import { productService } from '../services/productService';
import { fetchSiteSettings, formatWhatsAppNumber } from '../services/chatbotService';
import { themeService, DEFAULT_SHOP_THEME } from '../services/themeService';
import { useProducts } from '../hooks/queries/products';
import { useCategories } from '../hooks/queries/categories';
import { useBrands } from '../hooks/queries/brands';
import { Product } from '../types';
import { ShopThemeSettings } from '../types/theme';
import { KOREAN_BRANDS, getUniqueBrandList, getBrandProductCounts, isSameBrand } from '../data/brands';
import { ProductCard } from './ProductCard';
import { ProductQuickViewModal } from './ProductQuickViewModal';
import { analytics } from '../services/analyticsService';
import { getRetailPrice } from '../utils/pricing';

const CATEGORIES = [
  'All',
  'Cleanser',
  'Toner',
  'Serum & Essence',
  'Cream & Moisturizer',
  'Sunscreen',
  'Eye Care',
  'Lip Care',
  'Mask & Pack',
  'Exfoliator',
  'Spot Treatment',
  'Body & Hair Care',
  'Oral Care',
  'Supplements',
  'Makeup & Tone-Up'
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Cleanser': return <Droplets size={13} className="text-sky-300 shrink-0" />;
    case 'Toner': return <Droplet size={13} className="text-teal-300 shrink-0" />;
    case 'Serum & Essence': return <Sparkles size={13} className="text-amber-300 shrink-0" />;
    case 'Cream & Moisturizer': return <ShieldCheck size={13} className="text-pink-300 shrink-0" />;
    case 'Sunscreen': return <Sun size={13} className="text-yellow-300 shrink-0" />;
    case 'Eye Care': return <Eye size={13} className="text-indigo-300 shrink-0" />;
    case 'Lip Care': return <Smile size={13} className="text-rose-300 shrink-0" />;
    case 'Mask & Pack': return <Layers size={13} className="text-purple-300 shrink-0" />;
    case 'Exfoliator': return <RefreshCw size={13} className="text-cyan-300 shrink-0" />;
    case 'Spot Treatment': return <Zap size={13} className="text-emerald-300 shrink-0" />;
    case 'Body & Hair Care': return <Feather size={13} className="text-orange-300 shrink-0" />;
    case 'Oral Care': return <Smile size={13} className="text-sky-300 shrink-0" />;
    case 'Supplements': return <Pill size={13} className="text-lime-300 shrink-0" />;
    case 'Makeup & Tone-Up': return <Palette size={13} className="text-fuchsia-300 shrink-0" />;
    case 'All':
    default:
      return <Compass size={13} className="text-emerald-400 shrink-0" />;
  }
};

const SKIN_TYPES = [
  'All',
  'Dry',
  'Oily',
  'Combination',
  'Sensitive',
  'Acne-Prone'
];

const SKIN_CONCERNS = [
  'All',
  'Hydration',
  'Brightening & Glow',
  'Anti-Aging & Firming',
  'Acne & Blemish',
  'Pore Care',
  'Soothing & Barrier Repair',
  'Hyperpigmentation'
];

export const ShopCategoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart, language, activeTranslations, setIsCartOpen } = useCart();

  // Theme State
  const [shopTheme, setShopTheme] = useState<ShopThemeSettings>(themeService.getShopTheme());

  // Products & Taxonomy from TanStack Query
  const { data: products = [], isLoading } = useProducts();
  const { data: categories = CATEGORIES } = useCategories();
  const { data: brandsData } = useBrands();

  // Filters State derived from searchParams or defaults
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'All');
  const [selectedSkinType, setSelectedSkinType] = useState<string>(searchParams.get('skinType') || 'All');
  const [selectedConcern, setSelectedConcern] = useState<string>(searchParams.get('concern') || 'All');
  const [selectedBrand, setSelectedBrand] = useState<string>(searchParams.get('brand') || 'All');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  const [brandSearchTerm, setBrandSearchTerm] = useState<string>('');
  
  // Price & Stock filters
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(10000);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState<string>('featured');
  const [visibleCount, setVisibleCount] = useState<number>(12);

  // UI Drawer & Modal States
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('8801755837545');

  useEffect(() => {
    async function loadSettings() {
      const settings = await fetchSiteSettings();
      if (settings && settings.whatsappNumber) {
        setWhatsappNumber(settings.whatsappNumber);
      }
    }
    loadSettings();
  }, []);

  const handleQuickViewWhatsApp = (prod: Product) => {
    const currentPrice = getRetailPrice(prod);
    const pageUrl = `${window.location.origin}/product/${prod.id}`;

    const summaryText = 
      `🌸 *Order Inquiry - Korean Skin Food BD* 🌸\n` +
      `--------------------------------------\n` +
      `📦 *Product Name:* ${prod.name}\n` +
      `🏷️ *Brand:* ${prod.brand}\n` +
      `💰 *Price:* ৳${currentPrice} BDT\n` +
      `📁 *Category:* ${prod.category}\n` +
      `⚡ *Availability:* ${prod.stock > 0 ? 'In Stock' : 'Out of Stock'}\n` +
      `🔗 *Product Link:* ${pageUrl}\n` +
      `--------------------------------------\n` +
      `Hello! I would like to order this product.`;

    const encodedSummary = encodeURIComponent(summaryText);
    const targetNumber = formatWhatsAppNumber(whatsappNumber);
    const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodedSummary}`;

    window.open(whatsappUrl, '_blank');
  };

  // Wishlist local state
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ksf_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Added-to-bag notification toast item
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  // Auto-Sliding Category Chips Ref & State
  const chipsScrollRef = useRef<HTMLDivElement>(null);
  const [isChipsAutoSliding, setIsChipsAutoSliding] = useState<boolean>(true);

  useEffect(() => {
    if (!isChipsAutoSliding) return;

    const interval = setInterval(() => {
      if (chipsScrollRef.current) {
        const container = chipsScrollRef.current;
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (container.scrollLeft >= maxScroll - 15) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container.scrollBy({ left: 180, behavior: 'smooth' });
        }
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [isChipsAutoSliding]);

  const handleManualSlide = (direction: 'left' | 'right') => {
    if (chipsScrollRef.current) {
      const amount = direction === 'left' ? -220 : 220;
      chipsScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    // Subscribe to Theme real-time updates
    const unsubscribeShopTheme = themeService.subscribeShop((st) => setShopTheme(st));
    return () => {
      unsubscribeShopTheme();
    };
  }, []);

  // Update URL search parameters when filters change
  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedCategory !== 'All') params.category = selectedCategory;
    if (selectedSkinType !== 'All') params.skinType = selectedSkinType;
    if (selectedConcern !== 'All') params.concern = selectedConcern;
    if (selectedBrand !== 'All') params.brand = selectedBrand;
    if (searchQuery.trim()) params.q = searchQuery.trim();
    setSearchParams(params, { replace: true });
  }, [selectedCategory, selectedSkinType, selectedConcern, selectedBrand, searchQuery]);

  // Read initial URL params when user navigates
  useEffect(() => {
    const cat = searchParams.get('category');
    const st = searchParams.get('skinType');
    const sc = searchParams.get('concern');
    const sb = searchParams.get('brand');
    const q = searchParams.get('q');

    if (cat) setSelectedCategory(cat);
    if (st) setSelectedSkinType(st);
    if (sc) setSelectedConcern(sc);
    if (sb) setSelectedBrand(sb);
    if (q) setSearchQuery(q);
  }, [searchParams]);

  // Save wishlist to localStorage
  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      try {
        localStorage.setItem('ksf_wishlist', JSON.stringify(next));
      } catch (err) {
        console.warn('Wishlist save error:', err);
      }
      return next;
    });
  };

  // Add to cart with feedback toast & drawer opener
  const handleAddProductToCart = (p: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addToCart(p);
    setLastAddedId(p.id);
    setTimeout(() => setLastAddedId(null), 2500);
  };

  // Combined Brands list with counts (deduplicated across case variations)
  const availableBrands = useMemo(() => {
    return getUniqueBrandList(products);
  }, [products]);

  const brandProductCounts = useMemo(() => {
    return getBrandProductCounts(products);
  }, [products]);

  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      if (p.category) {
        const key = p.category.trim().toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const filteredBrands = useMemo(() => {
    if (!brandSearchTerm.trim()) return availableBrands;
    const term = brandSearchTerm.trim().toLowerCase();
    return availableBrands.filter(b => b.toLowerCase().includes(term));
  }, [availableBrands, brandSearchTerm]);

  // Main Product Filtering Engine
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = products.filter((p) => {
      // 1. Text Search query
      const matchesQuery = !q || 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.nameBN && p.nameBN.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q));

      // 2. Category Filter
      const matchesCategory = selectedCategory === 'All' || 
        (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());

      // 3. Skin Type Filter
      const matchesSkinType = selectedSkinType === 'All' || 
        (p.skinTypes && p.skinTypes.some(s => s.toLowerCase() === selectedSkinType.toLowerCase()));

      // 4. Skin Concern Filter
      const matchesConcern = selectedConcern === 'All' || 
        (p.description && p.description.toLowerCase().includes(selectedConcern.toLowerCase())) ||
        (p.name && p.name.toLowerCase().includes(selectedConcern.toLowerCase()));

      // 5. Brand Filter
      const matchesBrand = selectedBrand === 'All' || 
        (p.brand && isSameBrand(p.brand, selectedBrand));

      // 6. Price Range Filter
      const effectivePrice = getRetailPrice(p);
      const matchesPrice = effectivePrice >= priceMin && effectivePrice <= priceMax;

      // 7. Stock Filter
      const matchesStock = !inStockOnly || p.stock > 0;

      return matchesQuery && matchesCategory && matchesSkinType && matchesConcern && matchesBrand && matchesPrice && matchesStock;
    });

    // Sort Handler
    switch (sortBy) {
      case 'price-asc':
        list.sort((a, b) => getRetailPrice(a) - getRetailPrice(b));
        break;
      case 'price-desc':
        list.sort((a, b) => getRetailPrice(b) - getRetailPrice(a));
        break;
      case 'newest':
        list.reverse();
        break;
      case 'rating':
        list.sort((a, b) => (b.rating || 5) - (a.rating || 5));
        break;
      case 'best-sellers':
        list.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
        break;
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'featured':
      default:
        // Featured default logic
        break;
    }

    return list;
  }, [products, searchQuery, selectedCategory, selectedSkinType, selectedConcern, selectedBrand, priceMin, priceMax, inStockOnly, sortBy]);

  // Track view_item_list when category or filtered products load
  const lastTrackedCategoryRef = useRef<string | null>(null);
  useEffect(() => {
    if (filteredProducts.length > 0) {
      const listKey = `${selectedCategory}_${selectedBrand}_${selectedSkinType}`;
      if (lastTrackedCategoryRef.current !== listKey) {
        lastTrackedCategoryRef.current = listKey;
        analytics.trackViewItemList(filteredProducts, `Shop - ${selectedCategory}`);
      }
    }
  }, [filteredProducts, selectedCategory, selectedBrand, selectedSkinType]);

  // Track view_item when opening Quick View modal
  useEffect(() => {
    if (quickViewProduct) {
      analytics.trackViewItem(quickViewProduct);
    }
  }, [quickViewProduct]);

  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim() !== '' || 
      selectedCategory !== 'All' || 
      selectedSkinType !== 'All' || 
      selectedConcern !== 'All' || 
      selectedBrand !== 'All' || 
      priceMin > 0 || 
      priceMax < 10000 || 
      inStockOnly;
  }, [searchQuery, selectedCategory, selectedSkinType, selectedConcern, selectedBrand, priceMin, priceMax, inStockOnly]);

  const resetAllFilters = () => {
    setSelectedCategory('All');
    setSelectedSkinType('All');
    setSelectedConcern('All');
    setSelectedBrand('All');
    setSearchQuery('');
    setBrandSearchTerm('');
    setPriceMin(0);
    setPriceMax(10000);
    setInStockOnly(false);
    setSortBy('featured');
    setVisibleCount(shopTheme.itemsPerPage || 12);
  };

  return (
    <div className="min-h-screen bg-[#fff8f5] text-[#1e1b18] font-sans selection:bg-[#e91e8c] selection:text-white pb-20">
      
      {/* 1. DYNAMIC EDITORIAL CATEGORY HERO HEADER */}
      <div className="relative w-full overflow-hidden bg-[#0d160d] text-white border-b border-[#2d402d] shadow-lg">
        {/* Background Image / Texture Layer */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-55 sm:opacity-65 scale-105 transition-all duration-1000 z-0"
          style={{ backgroundImage: `url("${shopTheme.heroBannerUrl || 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=1600&auto=format&fit=crop&q=80'}")` }}
        />
        {/* Soft Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d160d]/90 via-[#132213]/70 to-[#0d160d]/35 pointer-events-none z-0" />
        {/* Soft Radial Ambient Glow in Korean Skin Food Signature Accent */}
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-[#e91e8c]/20 rounded-full blur-3xl pointer-events-none z-0" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="max-w-3xl space-y-4">
            
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center flex-wrap gap-2 text-[11px] font-bold text-emerald-300/80 uppercase tracking-widest">
              <Link to="/" className="hover:text-white transition flex items-center gap-1">
                <span>Home</span>
              </Link>
              <ChevronRight size={12} className="text-emerald-500/80" />
              <button 
                onClick={() => {
                  setSelectedCategory('All');
                  setVisibleCount(shopTheme.itemsPerPage || 12);
                }} 
                className="hover:text-white transition cursor-pointer"
              >
                Shop
              </button>
              {selectedCategory !== 'All' && (
                <>
                  <ChevronRight size={12} className="text-emerald-500/80" />
                  <span className="text-[#e91e8c] font-black">{selectedCategory}</span>
                </>
              )}
            </nav>

            {/* Dynamic Hero Category Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black tracking-tight text-white leading-tight">
              {selectedCategory === 'All' ? (shopTheme.heroTitle || 'The Apothecary') : selectedCategory}
              <span className="block text-xs sm:text-sm font-sans font-extrabold text-emerald-400 tracking-widest uppercase mt-2">
                Korean Skin Food Cosmeceuticals Collection
              </span>
            </h1>

            {/* Hero Subtitle */}
            <p className="text-xs sm:text-sm font-medium text-emerald-100/90 leading-relaxed max-w-2xl">
              {shopTheme.heroSubtitle || 'Discover carefully curated Korean skincare essentials for every ritual, skin type, and concern.'}
            </p>

          </div>
        </div>
      </div>

      {/* 2. MAIN LAYOUT CONTAINER (EDITORIAL SIDEBAR + PRODUCT GRID) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ==========================================
              DESKTOP EDITORIAL SIDEBAR (3 COLS)
             ========================================== */}
          <aside className="hidden lg:block lg:col-span-3 space-y-6 sticky top-24">
            
            {/* Sidebar Filters Wrapper Container */}
            <div className="bg-white p-5 rounded-2xl border border-[#ede3dc] shadow-sm space-y-6">
              
              <div className="flex items-center justify-between border-b border-pink-100 pb-3">
                <h3 className="text-xs font-black uppercase text-[#1e1b18] tracking-wider flex items-center gap-1.5">
                  <Filter size={14} className="text-[#e91e8c]" />
                  <span>Refine Rituals</span>
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={resetAllFilters}
                    className="text-[10px] font-extrabold text-[#e91e8c] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={10} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* FILTER 1: Categories List */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-[#8c7b70]">
                  Category
                </h4>
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1 text-xs">
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                    const pCount = cat === 'All' ? products.length : (categoryProductCounts[cat.toLowerCase()] || 0);
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setVisibleCount(shopTheme.itemsPerPage || 12);
                        }}
                        className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl font-medium transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#e91e8c] text-white font-bold shadow-xs'
                            : 'text-gray-700 hover:bg-pink-50/50 hover:text-[#e91e8c]'
                        }`}
                      >
                        <span>{cat}</span>
                        {pCount > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-pink-50 text-pink-700 font-semibold'
                          }`}>
                            {pCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FILTER 2: Skin Type Selector */}
              <div className="space-y-2 border-t border-pink-50 pt-4">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-[#8c7b70]">
                  Skin Type
                </h4>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {SKIN_TYPES.map((st) => {
                    const isSelected = selectedSkinType.toLowerCase() === st.toLowerCase();
                    return (
                      <button
                        key={st}
                        onClick={() => setSelectedSkinType(st)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition text-center border cursor-pointer truncate ${
                          isSelected
                            ? 'bg-[#1e1b18] text-white border-[#1e1b18]'
                            : 'bg-pink-50/20 text-gray-700 border-pink-100 hover:border-pink-300'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FILTER 3: Skin Concern Selector */}
              <div className="space-y-2 border-t border-pink-50 pt-4">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-[#8c7b70]">
                  Skin Concern
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1 text-xs">
                  {SKIN_CONCERNS.map((sc) => {
                    const isSelected = selectedConcern.toLowerCase() === sc.toLowerCase();
                    return (
                      <button
                        key={sc}
                        onClick={() => setSelectedConcern(sc)}
                        className={`w-full text-left py-1.5 px-2.5 rounded-xl font-medium transition cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-[#e91e8c] text-white font-bold'
                            : 'text-gray-700 hover:bg-pink-50/50 hover:text-[#e91e8c]'
                        }`}
                      >
                        {sc}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FILTER 4: Brand Filter with Search */}
              <div className="space-y-2 border-t border-pink-50 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[#8c7b70]">
                    Korean Brand
                  </h4>
                  {selectedBrand !== 'All' && (
                    <button
                      onClick={() => setSelectedBrand('All')}
                      className="text-[9px] font-extrabold text-[#e91e8c] hover:underline cursor-pointer"
                    >
                      Clear Brand
                    </button>
                  )}
                </div>

                {/* Brand Search Input */}
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-2 text-pink-400" />
                  <input
                    type="text"
                    value={brandSearchTerm}
                    onChange={(e) => setBrandSearchTerm(e.target.value)}
                    placeholder="Search 60+ brands..."
                    className="w-full bg-pink-50/20 border border-pink-100 rounded-xl pl-7 pr-3 py-1 text-[11px] outline-none focus:border-[#e91e8c]"
                  />
                  {brandSearchTerm && (
                    <button onClick={() => setBrandSearchTerm('')} className="absolute right-2 top-1.5 text-gray-400">
                      <X size={10} />
                    </button>
                  )}
                </div>

                {/* Brand Selector List */}
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1 text-xs">
                  <button
                    onClick={() => setSelectedBrand('All')}
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl font-medium transition cursor-pointer ${
                      selectedBrand === 'All'
                        ? 'bg-[#1e1b18] text-white font-bold'
                        : 'text-gray-700 hover:bg-pink-50/50'
                    }`}
                  >
                    <span>All Brands</span>
                    <span className="text-[10px] font-mono text-gray-400">{products.length}</span>
                  </button>

                  {filteredBrands.map((bName) => {
                    const isSelected = isSameBrand(selectedBrand, bName);
                    const pCount = brandProductCounts[bName.toLowerCase()] || 0;
                    return (
                      <button
                        key={bName}
                        onClick={() => setSelectedBrand(bName)}
                        className={`w-full flex items-center justify-between py-1 px-2.5 rounded-xl text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#e91e8c] text-white font-bold'
                            : 'text-gray-700 hover:bg-pink-50/50 hover:text-[#e91e8c]'
                        }`}
                      >
                        <span className="truncate mr-1">{bName}</span>
                        {pCount > 0 && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-pink-50 text-pink-700'
                          }`}>
                            {pCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FILTER 5: Price Range Slider / Inputs */}
              <div className="space-y-2 border-t border-pink-50 pt-4">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-[#8c7b70]">
                  Max Price (BDT ৳)
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono font-extrabold text-[#1e1b18]">
                    <span>৳0</span>
                    <span className="text-[#e91e8c]">৳{priceMax.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min={200}
                    max={10000}
                    step={100}
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    className="w-full accent-[#e91e8c] cursor-pointer"
                  />
                </div>
              </div>

              {/* FILTER 6: Stock Availability Toggle */}
              <div className="border-t border-pink-50 pt-4 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">In Stock Only</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#e91e8c]"></div>
                </label>
              </div>

            </div>
          </aside>

          {/* ==========================================
              MAIN SHOP CONTENT AREA (9 COLS)
             ========================================== */}
          <main className="lg:col-span-9 space-y-6">
            
            {/* Top Toolbar: Search, Active Chips, Mobile Filter Trigger, Sort Selector */}
            <div className="bg-white p-4 rounded-2xl border border-[#ede3dc] shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-3 text-pink-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search formulation name, active ingredients, brand..."
                    className="w-full bg-[#fff8f5] border border-pink-100 rounded-xl pl-10 pr-8 py-2.5 text-xs outline-none focus:border-[#e91e8c] transition font-medium text-[#1e1b18]"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-gray-400 hover:text-pink-600">
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                  {/* Mobile Filter Drawer Button */}
                  <button
                    onClick={() => setIsMobileFilterOpen(true)}
                    className="lg:hidden px-3.5 py-2.5 bg-pink-50 hover:bg-pink-100 text-[#e91e8c] rounded-xl text-xs font-bold border border-pink-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <SlidersHorizontal size={14} />
                    <span>Filters</span>
                    {hasActiveFilters && (
                      <span className="w-2 h-2 rounded-full bg-[#e91e8c]" />
                    )}
                  </button>

                  {/* Sort By Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#8c7b70] hidden sm:inline">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-[#fff8f5] border border-pink-100 rounded-xl px-3 py-2.5 text-xs font-extrabold text-[#1e1b18] outline-none focus:border-[#e91e8c] cursor-pointer"
                    >
                      <option value="featured">Featured Rituals</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="newest">Newest Arrivals</option>
                      <option value="rating">Highest Rated</option>
                      <option value="best-sellers">Best Sellers</option>
                      <option value="name-asc">Name A-Z</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Active Filter Chips Bar */}
              {hasActiveFilters && (
                <div className="pt-2 border-t border-pink-50 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Active:</span>

                  {selectedCategory !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e91e8c] text-white text-[10px] font-bold">
                      Category: {selectedCategory}
                      <button onClick={() => setSelectedCategory('All')} className="hover:text-pink-200 cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  )}

                  {selectedSkinType !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1e1b18] text-white text-[10px] font-bold">
                      Skin: {selectedSkinType}
                      <button onClick={() => setSelectedSkinType('All')} className="hover:text-pink-200 cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  )}

                  {selectedConcern !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-700 text-white text-[10px] font-bold">
                      Concern: {selectedConcern}
                      <button onClick={() => setSelectedConcern('All')} className="hover:text-pink-200 cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  )}

                  {selectedBrand !== 'All' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-800 text-white text-[10px] font-bold">
                      Brand: {selectedBrand}
                      <button onClick={() => setSelectedBrand('All')} className="hover:text-pink-200 cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  )}

                  {priceMax < 10000 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-600 text-white text-[10px] font-bold">
                      Max ৳{priceMax}
                      <button onClick={() => setPriceMax(10000)} className="hover:text-amber-200 cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  )}

                  {inStockOnly && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                      In Stock Only
                      <button onClick={() => setInStockOnly(false)} className="hover:text-emerald-200 cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  )}

                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-700 text-white text-[10px] font-bold">
                      "{searchQuery}"
                      <button onClick={() => setSearchQuery('')} className="hover:text-slate-300 cursor-pointer">
                        <X size={12} />
                      </button>
                    </span>
                  )}

                  <button
                    onClick={resetAllFilters}
                    className="text-[10px] font-black text-[#e91e8c] hover:underline cursor-pointer ml-auto flex items-center gap-1"
                  >
                    <RefreshCw size={11} />
                    <span>Clear All</span>
                  </button>
                </div>
              )}
            </div>

            {/* Added to Bag Toast Banner */}
            <AnimatePresence>
              {lastAddedId && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-900 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-lg text-xs font-bold border border-emerald-700"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-emerald-400" size={18} />
                    <span>Added to your Korean Skin Food basket!</span>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(true)}
                    className="px-3 py-1 bg-emerald-400 text-emerald-950 font-black rounded-xl hover:bg-emerald-300 transition text-[11px] cursor-pointer"
                  >
                    View Bag & Checkout →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PRODUCT GRID DISPLAY */}
            {filteredProducts.length > 0 ? (
              <div className="space-y-8">
                
                {/* Product Grid Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                  {filteredProducts.slice(0, visibleCount).map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onQuickView={(p) => setQuickViewProduct(p)}
                    />
                  ))}
                </div>

                {/* LOAD MORE RITUALS BUTTON */}
                {visibleCount < filteredProducts.length && (
                  <div className="pt-6 text-center space-y-2">
                    <p className="text-xs font-bold text-[#8c7b70] font-mono">
                      Showing {Math.min(visibleCount, filteredProducts.length)} of {filteredProducts.length} Formulations
                    </p>
                    <button
                      onClick={() => setVisibleCount(prev => prev + (shopTheme.itemsPerPage || 12))}
                      className="px-8 py-3.5 bg-[#1e1b18] hover:bg-[#e91e8c] text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md hover:shadow-xl cursor-pointer inline-flex items-center gap-2"
                    >
                      <span>Load More Rituals</span>
                      <ChevronDown size={14} />
                    </button>
                  </div>
                )}

              </div>
            ) : (
              /* EMPTY FILTER RESULTS STATE */
              <div className="bg-white p-12 rounded-3xl border border-[#ede3dc] text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto text-[#e91e8c]">
                  <Search size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-[#1e1b18]">No Formulations Found</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                    We couldn't find any Korean cosmeceuticals matching your specific filter criteria.
                  </p>
                </div>
                <button
                  onClick={resetAllFilters}
                  className="px-6 py-3 bg-[#e91e8c] text-white text-xs font-extrabold rounded-xl shadow-sm hover:bg-[#ff4b91] transition cursor-pointer inline-flex items-center gap-2"
                >
                  <RefreshCw size={13} />
                  <span>Reset All Filters</span>
                </button>
              </div>
            )}

          </main>

        </div>
      </div>

      {/* ==========================================
          MOBILE SLIDING FILTER DRAWER
         ========================================== */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end lg:hidden">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="bg-white w-full max-w-xs h-full flex flex-col justify-between shadow-2xl relative border-l border-pink-100"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-pink-100 flex justify-between items-center bg-white">
                <h3 className="text-xs font-black text-[#1e1b18] uppercase tracking-wider flex items-center gap-1.5">
                  <Filter size={15} className="text-[#e91e8c]" />
                  <span>Filter Rituals</span>
                </h3>
                <button onClick={() => setIsMobileFilterOpen(false)} className="text-gray-400 hover:text-pink-600 p-1">
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-4 overflow-y-auto flex-1 space-y-5 text-xs">
                
                {/* Category */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[#8c7b70]">Category</h4>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-pink-50/20 border border-pink-100 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-[#e91e8c]"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Skin Type */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[#8c7b70]">Skin Type</h4>
                  <select
                    value={selectedSkinType}
                    onChange={(e) => setSelectedSkinType(e.target.value)}
                    className="w-full bg-pink-50/20 border border-pink-100 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-[#e91e8c]"
                  >
                    {SKIN_TYPES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Brand */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[#8c7b70]">Korean Brand</h4>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full bg-pink-50/20 border border-pink-100 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-[#e91e8c]"
                  >
                    <option value="All">All Brands</option>
                    {availableBrands.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[#8c7b70]">Max Price (৳)</h4>
                  <div className="flex justify-between font-mono font-bold text-[#e91e8c]">
                    <span>৳200</span>
                    <span>৳{priceMax}</span>
                  </div>
                  <input
                    type="range"
                    min={200}
                    max={10000}
                    step={100}
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    className="w-full accent-[#e91e8c]"
                  />
                </div>

                {/* In Stock */}
                <div className="flex items-center justify-between border-t border-pink-50 pt-3">
                  <span className="font-bold text-gray-700">In Stock Only</span>
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 accent-[#e91e8c]"
                  />
                </div>

              </div>

              {/* Drawer Footer CTA */}
              <div className="p-4 border-t border-pink-100 bg-pink-50/20 flex gap-2">
                <button
                  onClick={resetAllFilters}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Reset
                </button>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="flex-1 py-2.5 bg-[#e91e8c] hover:bg-[#ff4b91] text-white font-bold rounded-xl text-xs"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          QUICK VIEW MODAL OVERLAY (GA4: view_item & Meta: ViewContent)
         ========================================== */}
      <ProductQuickViewModal
        isOpen={Boolean(quickViewProduct)}
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={(p) => {
          addToCart(p);
          setIsCartOpen(true);
        }}
        whatsappNumber={whatsappNumber}
      />

    </div>
  );
};
