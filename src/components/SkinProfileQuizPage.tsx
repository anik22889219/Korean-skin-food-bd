import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  RotateCcw,
  Save,
  ShoppingBag,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useProducts } from '../hooks/queries/products';
import { Product } from '../types';
import { SkinProfileRecord, userPortalService } from '../services/userPortalService';
import { buildSkinQuizSeo } from '../services/seoService';
import { getRetailPrice } from '../utils/pricing';
import { SeoHead } from './SeoHead';
import { ProductCard } from './ProductCard';

type SkinTypeOption = SkinProfileRecord['skinType'];

const SKIN_TYPE_OPTIONS: Array<{ value: SkinTypeOption; desc: string }> = [
  { value: 'Oily', desc: 'Visible midday shine and enlarged T-zone pores' },
  { value: 'Dry', desc: 'Feels tight, flaky, or parched after cleansing' },
  { value: 'Combination', desc: 'Oily T-zone with dry or normal cheeks' },
  { value: 'Sensitive', desc: 'Reacts easily with redness, warmth, or stinging' },
  { value: 'Normal', desc: 'Generally balanced with occasional seasonal changes' },
];

const CONCERN_OPTIONS = [
  { id: 'acne', label: 'Breakouts & Clogged Pores' },
  { id: 'dark_spots', label: 'Dark Spots & Uneven Tone' },
  { id: 'dehydration', label: 'Dehydration & Tightness' },
  { id: 'barrier', label: 'Redness & Barrier Support' },
  { id: 'oil_pores', label: 'Excess Sebum & Visible Pores' },
  { id: 'uv', label: 'Daily Sun Protection' },
];

const CONCERN_KEYWORDS: Record<string, string[]> = {
  acne: ['acne', 'blemish', 'salicylic', 'bha', 'pore', 'tea tree', 'heartleaf', 'pimple'],
  dark_spots: ['bright', 'niacinamide', 'vitamin c', 'rice', 'spot', 'glow', 'pigment', 'arbutin'],
  dehydration: ['hyaluronic', 'snail', 'hydrat', 'moisture', 'dry', 'plump', 'essence'],
  barrier: ['centella', 'cica', 'ceramide', 'panthenol', 'barrier', 'sooth', 'calm', 'mugwort'],
  oil_pores: ['niacinamide', 'pore', 'sebum', 'matte', 'gel', 'oil', 'bha'],
  uv: ['sun', 'spf', 'uv', 'sunscreen', 'sunblock'],
};

function scoreProductForProfile(
  product: Product,
  skinType: SkinTypeOption,
  concerns: string[],
  sensitivity: SkinProfileRecord['sensitivity'],
  sunExposure: SkinProfileRecord['sunExposure'],
  budgetTier: SkinProfileRecord['budgetTier']
): number {
  const stock = product.stock || 0;
  if (stock <= 0) return -100;

  let score = 10;
  const hay = [
    product.name,
    product.category,
    product.description,
    ...(product.skinTypes || []),
    ...(product.concerns || []),
    ...(product.benefits || []),
    ...(product.keyIngredients || []),
  ]
    .join(' ')
    .toLowerCase();

  // Skin type match
  if (
    (product.skinTypes || []).some((st) => st.toLowerCase().includes(skinType.toLowerCase())) ||
    (product.skinTypes || []).some((st) => st.toLowerCase().includes('all'))
  ) {
    score += 20;
  }

  // Concern keyword match
  for (const cid of concerns) {
    const kws = CONCERN_KEYWORDS[cid] || [];
    if (kws.some((kw) => hay.includes(kw))) {
      score += 18;
    }
  }

  // Sensitivity filter
  if (sensitivity === 'high') {
    if (['centella', 'cica', 'panthenol', 'ceramide', 'mugwort', 'snail'].some((kw) => hay.includes(kw))) {
      score += 14;
    }
    if (['retinol', 'aha', 'bha', 'salicylic', 'peel'].some((kw) => hay.includes(kw))) {
      score -= 10;
    }
  }

  // High sun exposure boost for SPF products
  if (sunExposure === 'high' && ['sun', 'spf', 'sunscreen'].some((kw) => hay.includes(kw))) {
    score += 16;
  }

  // Budget preference
  const price = getRetailPrice(product);
  if (budgetTier === 'budget' && price <= 1400) score += 10;
  else if (budgetTier === 'mid' && price > 1000 && price <= 2400) score += 10;
  else if (budgetTier === 'premium' && price >= 1800) score += 10;

  return score;
}

export const SkinProfileQuizPage: React.FC = () => {
  const { user } = useAuth();
  const { addToCart, setIsCartOpen, language } = useCart();
  const navigate = useNavigate();
  const isBn = language === 'bn';
  const { data: products = [] } = useProducts();
  const seoMetadata = useMemo(() => buildSkinQuizSeo(), []);

  const [skinType, setSkinType] = useState<SkinTypeOption>('Combination');
  const [concerns, setConcerns] = useState<string[]>(['dehydration', 'uv']);
  const [sensitivity, setSensitivity] = useState<SkinProfileRecord['sensitivity']>('moderate');
  const [sunExposure, setSunExposure] = useState<SkinProfileRecord['sunExposure']>('moderate');
  const [budgetTier, setBudgetTier] = useState<SkinProfileRecord['budgetTier']>('mid');

  const [showResults, setShowResults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    userPortalService.getSkinProfile(user?.uid).then((existing) => {
      if (!active || !existing) return;
      setSkinType(existing.skinType || 'Combination');
      setConcerns(Array.isArray(existing.concerns) ? existing.concerns : []);
      setSensitivity(existing.sensitivity || 'moderate');
      setSunExposure(existing.sunExposure || 'moderate');
      setBudgetTier(existing.budgetTier || 'mid');
    });
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const toggleConcern = (id: string) => {
    setConcerns((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const recommendedProducts = useMemo(() => {
    const scored = products
      .filter((p) => (p.stock || 0) > 0)
      .map((product) => ({
        product,
        score: scoreProductForProfile(product, skinType, concerns, sensitivity, sunExposure, budgetTier),
      }))
      .sort((a, b) => b.score - a.score);

    // Pick diverse routine roles (cleanser, toner/treatment, moisturizer, sunscreen)
    const buckets: Record<'cleanser' | 'treatment' | 'moisturizer' | 'sunscreen', Product | null> = {
      cleanser: null,
      treatment: null,
      moisturizer: null,
      sunscreen: null,
    };

    for (const entry of scored) {
      const cat = `${entry.product.category} ${entry.product.routineStep || ''} ${entry.product.name}`.toLowerCase();
      if (!buckets.cleanser && (cat.includes('cleanser') || cat.includes('foam') || cat.includes('wash'))) {
        buckets.cleanser = entry.product;
      } else if (
        !buckets.sunscreen &&
        (cat.includes('sunscreen') || cat.includes('spf') || cat.includes('sun'))
      ) {
        buckets.sunscreen = entry.product;
      } else if (
        !buckets.moisturizer &&
        (cat.includes('cream') || cat.includes('moistur') || cat.includes('gel') || cat.includes('lotion'))
      ) {
        buckets.moisturizer = entry.product;
      } else if (
        !buckets.treatment &&
        (cat.includes('serum') || cat.includes('essence') || cat.includes('toner') || cat.includes('ampoule'))
      ) {
        buckets.treatment = entry.product;
      }
    }

    const pickedIds = new Set<string>();
    const results: Product[] = [];
    for (const p of Object.values(buckets)) {
      if (p && !pickedIds.has(p.id)) {
        pickedIds.add(p.id);
        results.push(p);
      }
    }
    for (const entry of scored) {
      if (results.length >= 8) break;
      if (!pickedIds.has(entry.product.id)) {
        pickedIds.add(entry.product.id);
        results.push(entry.product);
      }
    }
    return results;
  }, [products, skinType, concerns, sensitivity, sunExposure, budgetTier]);

  const handleCompleteQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowResults(true);
    setSaving(true);
    setSavedNotice(null);
    try {
      await userPortalService.saveSkinProfile(
        {
          skinType,
          concerns,
          sensitivity,
          sunExposure,
          budgetTier,
          recommendedProductIds: recommendedProducts.slice(0, 4).map((p) => p.id),
          updatedAt: new Date().toISOString(),
        },
        user?.uid
      );
      setSavedNotice(
        user
          ? 'Skin profile saved to your account!'
          : 'Skin profile saved locally in your browser. Sign in to sync across devices.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenInRoutineBuilder = async () => {
    const pick = recommendedProducts.slice(0, 4);
    if (pick.length > 0) {
      await userPortalService.saveRoutine(
        {
          name: `${skinType} Skin Starter Routine`,
          amSteps: pick.map((p) => ({
            slot: p.category || 'Step',
            productId: p.id,
            productName: p.name,
            brand: p.brand,
          })),
          pmSteps: pick.slice(0, 3).map((p) => ({
            slot: p.category || 'Step',
            productId: p.id,
            productName: p.name,
            brand: p.brand,
          })),
        },
        user?.uid
      );
    }
    navigate('/routine-builder');
  };

  const handleAddShortlistToBag = () => {
    const shortlist = recommendedProducts.slice(0, 4).filter((p) => (p.stock || 0) > 0);
    for (const p of shortlist) {
      addToCart(p, 1, undefined, { openDrawer: false });
    }
    if (shortlist.length > 0) {
      setIsCartOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5F8]/40 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <SeoHead metadata={seoMetadata} />

      <div className="max-w-5xl mx-auto space-y-8">
        <div className="bg-white rounded-3xl border border-pink-100 p-6 sm:p-8 shadow-sm space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-100 text-[#E91E8C] text-[11px] font-black uppercase tracking-wider">
            <Sparkles size={13} />
            <span>Personalized Routine Finder</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {isBn ? 'আপনার স্কিন প্রোফাইল কুইজ' : 'Korean Skincare Profile Quiz'}
          </h1>
          <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
            {isBn
              ? '৫টি সহজ প্রশ্নের উত্তর দিন এবং আমাদের লাইভ বাংলাদেশ ক্যাটালগ থেকে আপনার ত্বকের ধরন অনুযায়ী সাজানো প্রডাক্ট শর্টলিস্ট পান।'
              : 'Answer 5 quick questions about your skin behavior in Bangladesh weather to generate an in-stock catalog shortlist.'}
          </p>
        </div>

        <form onSubmit={handleCompleteQuiz} className="bg-white rounded-3xl border border-pink-100 p-6 sm:p-8 shadow-sm space-y-8">
          {/* Q1: Skin Type */}
          <div className="space-y-3">
            <h2 className="text-sm font-black text-gray-900">1. How does your skin typically feel by midday?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SKIN_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSkinType(opt.value)}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                    skinType === opt.value
                      ? 'bg-pink-50 border-[#E91E8C] shadow-xs'
                      : 'bg-white border-slate-200 hover:border-pink-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-gray-900">{opt.value}</span>
                    {skinType === opt.value && <Check size={16} className="text-[#E91E8C]" />}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Q2: Top Concerns */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-gray-900">2. Select up to 3 top skin goals</h2>
              <span className="text-xs font-mono font-bold text-[#E91E8C]">{concerns.length}/3 selected</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CONCERN_OPTIONS.map((opt) => {
                const selected = concerns.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleConcern(opt.id)}
                    className={`min-h-[48px] px-4 py-3 rounded-2xl border text-left text-xs font-bold flex items-center justify-between gap-2 transition cursor-pointer ${
                      selected
                        ? 'bg-pink-50 border-[#E91E8C] text-[#E91E8C]'
                        : 'bg-white border-slate-200 text-gray-800 hover:border-pink-200'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selected && <CheckCircle2 size={15} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Q3, Q4, Q5 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2.5">
              <h2 className="text-sm font-black text-gray-900">3. Sensitivity to Actives</h2>
              <div className="space-y-2">
                {(['low', 'moderate', 'high'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSensitivity(lvl)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-left text-xs font-bold capitalize transition cursor-pointer ${
                      sensitivity === lvl
                        ? 'bg-pink-50 border-[#E91E8C] text-[#E91E8C]'
                        : 'bg-white border-slate-200 text-gray-700'
                    }`}
                  >
                    {lvl === 'high' ? 'High (Prefer soothing, gentle formulas)' : lvl === 'moderate' ? 'Moderate (Balanced actives)' : 'Low (Handles exfoliants easily)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <h2 className="text-sm font-black text-gray-900">4. Daily Sun Exposure</h2>
              <div className="space-y-2">
                {(['indoor', 'moderate', 'high'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSunExposure(lvl)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                      sunExposure === lvl
                        ? 'bg-pink-50 border-[#E91E8C] text-[#E91E8C]'
                        : 'bg-white border-slate-200 text-gray-700'
                    }`}
                  >
                    <Sun size={14} className="shrink-0" />
                    <span>
                      {lvl === 'indoor' ? 'Mostly Indoors' : lvl === 'moderate' ? 'Commute / Windows' : 'Frequent Direct Sun'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <h2 className="text-sm font-black text-gray-900">5. Per-Product Budget</h2>
              <div className="space-y-2">
                {[
                  { id: 'budget' as const, label: 'Value Picks (Under ৳1,400)' },
                  { id: 'mid' as const, label: 'Balanced (৳1,000 – ৳2,400)' },
                  { id: 'premium' as const, label: 'Concentrated Treatments (৳1,800+)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBudgetTier(opt.id)}
                    className={`w-full px-4 py-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                      budgetTier === opt.id
                        ? 'bg-pink-50 border-[#E91E8C] text-[#E91E8C]'
                        : 'bg-white border-slate-200 text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-pink-100">
            <button
              type="button"
              onClick={() => {
                setSkinType('Combination');
                setConcerns(['dehydration', 'uv']);
                setSensitivity('moderate');
                setSunExposure('moderate');
                setBudgetTier('mid');
                setShowResults(false);
                setSavedNotice(null);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-gray-700 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Reset Answers</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-[#E91E8C] hover:bg-pink-700 text-white text-xs font-black shadow-md shadow-pink-500/20 inline-flex items-center gap-2 cursor-pointer"
            >
              <Save size={15} />
              <span>{saving ? 'Generating...' : 'Show My Catalog Matches & Save Profile'}</span>
            </button>
          </div>
        </form>

        {showResults && (
          <section className="space-y-5">
            <div className="bg-white rounded-3xl border border-pink-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                    {skinType} Skin Profile
                  </span>
                  {savedNotice && <span className="text-xs font-semibold text-emerald-700">{savedNotice}</span>}
                </div>
                <h2 className="text-xl font-black text-gray-900">Your Matched In-Stock Shortlist</h2>
                <p className="text-xs text-gray-600">
                  Selected across Cleanser, Serum/Toner, Moisturizer, and Sunscreen categories where available in stock.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleOpenInRoutineBuilder}
                  className="px-4 py-2.5 rounded-xl border border-pink-200 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Customize in Routine Builder</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleAddShortlistToBag}
                  className="px-4 py-2.5 rounded-xl bg-[#E91E8C] hover:bg-pink-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingBag size={14} />
                  <span>Add Top 4 to Bag</span>
                </button>
              </div>
            </div>

            {recommendedProducts.length === 0 ? (
              <div className="bg-white rounded-3xl border border-pink-100 p-8 text-center">
                <p className="text-sm font-bold text-gray-700">No in-stock products available right now.</p>
                <Link to="/shop" className="text-xs font-bold text-[#E91E8C] hover:underline mt-2 inline-block">
                  Browse Full Catalog
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {recommendedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
