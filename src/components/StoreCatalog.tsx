import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Search, SlidersHorizontal, Percent, 
  Sparkles, CheckCircle, X 
} from 'lucide-react';
import { motion } from 'motion/react';

const CATEGORIES = ['All', 'Cleanser', 'Toner', 'Serum & Essence', 'Moisturizer', 'Sunscreen', 'Lip Care'];
const SKIN_TYPES = ['All', 'Oily', 'Dry', 'Sensitive', 'Combination', 'Acne-Prone'];

export const StoreCatalog: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart, language, activeTranslations } = useCart();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSkinType, setSelectedSkinType] = useState('All');

  useEffect(() => {
    // Load products from service
    const prods = productService.getProducts();
    setProducts(prods);
  }, []);

  // Filter products based on search and selected capsules
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSkinType = selectedSkinType === 'All' || p.skinTypes.includes(selectedSkinType);
    return matchesSearch && matchesCategory && matchesSkinType;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto space-y-8 px-4 py-6 md:px-8"
    >
      
      {/* 1. BRAND HERO PROMO */}
      <div className="relative rounded-[32px] overflow-hidden bg-gradient-to-r from-[#E91E8C] to-[#FF4B91] p-6 md:p-12 flex flex-col md:flex-row justify-between items-center gap-8 shadow-xl">
        <div className="space-y-4 max-w-xl text-center md:text-left z-10">
          <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/30 inline-block">
            K-Beauty Premium BD
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
            {language === 'en' ? 'Achieve the Viral' : 'অর্ডার করুন সেই ভাইরাল'} <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-200">
              {language === 'en' ? 'Korean Glass Skin' : 'কোরিয়ান গ্লাস স্কিন'}
            </span>
          </h2>
          <p className="text-pink-50 text-xs md:text-sm leading-relaxed font-semibold">
            {language === 'en' 
              ? 'Shop 100% authentic skin nourishment formulas imported straight from Seoul. Tailored for Bangladesh weather, prices in BDT (৳) with safe cash on delivery.' 
              : 'সরাসরি সিউল থেকে আমদানিকৃত ১০০% আসল স্কিন কেয়ার পণ্য কিনুন। বাংলাদেশের আবহাওয়ার উপযোগী পণ্য, দাম টাকা (৳) এবং ক্যাশ অন ডেলিভারিতে শপিং করুন।'}
          </p>
          
          {/* Trust points */}
          <div className="flex flex-wrap gap-3 pt-2 justify-center md:justify-start">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-white font-semibold bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
              <CheckCircle size={13} className="text-white" />
              <span>{language === 'en' ? '100% Authentic Korean' : '১০০% আসল কোরিয়ান'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-white font-semibold bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
              <CheckCircle size={13} className="text-white" />
              <span>{language === 'en' ? 'Cash on Delivery (COD)' : 'ক্যাশ অন ডেলিভারি'}</span>
            </div>
          </div>
        </div>

        <div className="relative w-40 md:w-56 h-40 md:h-56 flex-shrink-0 z-10">
          <div className="absolute inset-0 bg-white rounded-full opacity-20 blur-2xl animate-pulse animate-duration-[3000ms]"></div>
          <img 
            src="https://images.unsplash.com/photo-1608248597481-496100c8c836?w=600&auto=format&fit=crop&q=60" 
            alt="K-beauty Hero" 
            className="w-full h-full object-cover rounded-3xl border border-white/20 shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="bg-white p-5 rounded-[24px] border border-pink-100 shadow-sm flex flex-col gap-4">
        
        {/* Search Field */}
        <div className="relative w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-450" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTranslations.searchPlaceholder}
            className="w-full bg-pink-50/10 text-gray-800 pl-11 pr-4 py-3 rounded-xl border border-pink-100 focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/15 outline-none text-xs transition"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-600 cursor-pointer p-1">
              <X size={15} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Categories select */}
          <div className="space-y-2">
            <span className="text-[10px] text-pink-700 uppercase font-bold tracking-wider block">
              {activeTranslations.categories}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${selectedCategory === cat ? 'bg-[#E91E8C] text-white' : 'bg-pink-50/25 text-gray-700 hover:text-[#E91E8C] border border-pink-100/55'}`}
                >
                  {cat === 'All' ? activeTranslations.all : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Skin suitabilities select */}
          <div className="space-y-2">
            <span className="text-[10px] text-pink-700 uppercase font-bold tracking-wider block">
              {activeTranslations.skinType}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SKIN_TYPES.map(st => (
                <button
                  key={st}
                  onClick={() => setSelectedSkinType(st)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${selectedSkinType === st ? 'bg-[#E91E8C] text-white' : 'bg-pink-50/25 text-gray-700 hover:text-[#E91E8C] border border-pink-100/55'}`}
                >
                  {st === 'All' ? activeTranslations.all : st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. PRODUCTS GRID */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag size={16} className="text-[#E91E8C]" />
            <span>{language === 'en' ? 'Authentic K-Beauty Catalog' : 'আমাদের স্কিনকেয়ার পণ্যসমূহ'}</span>
          </h3>
          <p className="text-[11px] text-gray-500 font-bold bg-pink-50 border border-pink-100/40 px-2.5 py-0.5 rounded-full">
            {language === 'en' ? `${filteredProducts.length} skincare formulas` : `${filteredProducts.length}টি পণ্য পাওয়া গেছে`}
          </p>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white py-16 text-center rounded-[24px] border border-pink-100 text-gray-500 shadow-sm space-y-3">
            <SlidersHorizontal size={36} className="mx-auto text-pink-300 animate-pulse" />
            <p className="text-xs font-semibold">No skincare products match your active search filters.</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setSelectedSkinType('All'); }}
              className="px-4 py-1.5 bg-[#E91E8C] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#FF4B91] transition shadow-sm"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map(prod => (
              <div 
                key={prod.id}
                className="bg-white rounded-[24px] border border-pink-50 overflow-hidden flex flex-col justify-between hover:border-pink-200 hover:shadow-md transition duration-300 shadow-sm group relative"
              >
                {/* PROMO TAG */}
                {prod.discountPrice && (
                  <div className="absolute top-3 left-3 bg-[#E91E8C] text-white text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full z-10 shadow-sm">
                    Sale
                  </div>
                )}

                <div>
                  {/* Photo graphic */}
                  <div 
                    className="aspect-square overflow-hidden bg-pink-50/15 relative cursor-pointer border-b border-pink-50 p-2" 
                    onClick={() => navigate(`/product/${prod.id}`)}
                  >
                    <img 
                      src={prod.image} 
                      alt={prod.name} 
                      className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition duration-300"
                      referrerPolicy="no-referrer"
                    />
                    {prod.stock <= 5 && prod.stock > 0 && (
                      <div className="absolute bottom-2 right-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-red-600/10 shadow-sm">
                        Only {prod.stock} left
                      </div>
                    )}
                    {prod.stock === 0 && (
                      <div className="absolute inset-0 bg-white/85 flex items-center justify-center rounded-xl p-2">
                        <span className="text-white text-[9px] font-black uppercase tracking-widest bg-red-500 px-2.5 py-1 rounded-lg">
                          {activeTranslations.outOfStock}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body description */}
                  <div className="p-4 space-y-1.5">
                    <span className="text-[9px] uppercase tracking-wider text-[#E91E8C] font-extrabold bg-pink-50 px-2 py-0.5 rounded border border-pink-100/30">
                      {prod.brand}
                    </span>
                    <h4 
                      onClick={() => navigate(`/product/${prod.id}`)}
                      className="font-extrabold text-xs text-gray-800 leading-tight cursor-pointer hover:text-[#E91E8C] transition line-clamp-2"
                    >
                      {language === 'en' ? prod.name : prod.nameBN}
                    </h4>
                    
                    {/* Skin suits */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {prod.skinTypes.slice(0, 2).map(st => (
                        <span key={st} className="text-[8px] bg-pink-50/10 text-pink-700 px-1.5 py-0.5 rounded border border-pink-50 font-bold">
                          {st} Skin
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer price & buy trigger */}
                <div className="p-4 border-t border-pink-50 bg-pink-50/5 flex items-center justify-between gap-1.5">
                  <div className="font-mono">
                    {prod.discountPrice ? (
                      <div className="leading-none">
                        <span className="text-gray-400 text-[10px] line-through block">
                          ৳{prod.price}
                        </span>
                        <span className="text-[#E91E8C] font-black text-xs sm:text-sm block mt-0.5">
                          ৳{prod.discountPrice}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-800 font-black text-xs sm:text-sm block">
                        ৳{prod.price}
                      </span>
                    )}
                  </div>

                  <button 
                    onClick={() => addToCart(prod)}
                    disabled={prod.stock === 0}
                    className="p-2 bg-pink-50 hover:bg-[#E91E8C] text-[#E91E8C] hover:text-white rounded-xl cursor-pointer transition flex items-center justify-center shadow-sm disabled:opacity-40"
                  >
                    <ShoppingBag size={12} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </motion.div>
  );
};
