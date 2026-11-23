import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Moon,
  Save,
  ShoppingBag,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useProducts } from '../hooks/queries/products';
import { Product } from '../types';
import { SavedRoutineRecord, userPortalService } from '../services/userPortalService';
import { buildRoutineBuilderSeo } from '../services/seoService';
import { getRetailPrice } from '../utils/pricing';
import { getProductPath } from '../utils/productSlug';
import { SeoHead } from './SeoHead';
import { themeService, DEFAULT_PAGES_THEME } from '../services/themeService';
import { RoutineBuilderPageThemeSettings } from '../types/theme';

const AM_SLOTS = [
  { id: 'am_cleanser', label: '1. Cleanser (AM)', keywords: ['cleanser', 'foam', 'gel wash', 'wash'] },
  { id: 'am_toner', label: '2. Hydrating Toner / Essence', keywords: ['toner', 'essence', 'mist'] },
  { id: 'am_serum', label: '3. Daytime Serum', keywords: ['serum', 'ampoule', 'niacinamide', 'vitamin c', 'centella'] },
  { id: 'am_moisturizer', label: '4. Moisturizer', keywords: ['cream', 'moistur', 'lotion', 'gel'] },
  { id: 'am_spf', label: '5. Broad-Spectrum Sunscreen', keywords: ['sunscreen', 'spf', 'sun'] },
];

const PM_SLOTS = [
  { id: 'pm_cleanser', label: '1. Cleanser (PM)', keywords: ['cleanser', 'oil', 'balm', 'foam', 'wash'] },
  { id: 'pm_exfoliant', label: '2. Toner / Treatment', keywords: ['toner', 'pad', 'exfoli', 'bha', 'aha', 'essence'] },
  { id: 'pm_serum', label: '3. Night Serum / Ampoule', keywords: ['serum', 'ampoule', 'retinol', 'snail', 'repair', 'cica'] },
  { id: 'pm_moisturizer', label: '4. Barrier Cream / Sleeping Mask', keywords: ['cream', 'mask', 'ceramide', 'moistur', 'panthenol'] },
];

function detectLayeringConflicts(selectedProducts: Product[]): string[] {
  const warnings: string[] = [];
  const haystacks = selectedProducts.map((p) =>
    `${p.name} ${(p.keyIngredients || []).join(' ')} ${p.description || ''}`.toLowerCase()
  );

  const hasRetinoid = haystacks.some((h) => /\bretinol\b|\bretinal\b|\bretinoid\b/.test(h));
  const hasExfoliantAcid = haystacks.some((h) =>
    /\baha\b|\bbha\b|\bsalicylic\b|\bglycolic\b|\blactic\b|\bmandelic\b/.test(h)
  );
  const hasVitaminC = haystacks.some((h) => /vitamin c|ascorbic/.test(h));

  if (hasRetinoid && hasExfoliantAcid) {
    warnings.push(
      'Layering caution: Retinoids (Retinol/Retinal) and AHA/BHA exfoliants in the same routine window can increase dryness or stinging. Consider alternating them on separate nights.'
    );
  }
  if (hasRetinoid && hasVitaminC) {
    warnings.push(
      'Layering caution: Using L-Ascorbic Vitamin C and Retinol in the same slot may irritate sensitive skin. A common routine places Vitamin C in AM (under SPF) and Retinol in PM.'
    );
  }
  const exfoliantCount = haystacks.filter((h) => /\baha\b|\bbha\b|\bsalicylic\b|\bglycolic\b/.test(h)).length;
  if (exfoliantCount > 1) {
    warnings.push(
      'Exfoliation note: Multiple AHA/BHA exfoliating products selected in one routine—use only one exfoliating step per session to protect your barrier.'
    );
  }
  return warnings;
}

export const RoutineBuilderPage: React.FC = () => {
  const { user } = useAuth();
  const { addToCart, setIsCartOpen, language } = useCart();
  const isBn = language === 'bn';
  const { data: products = [] } = useProducts();
  const seoMetadata = useMemo(() => buildRoutineBuilderSeo(), []);

  const [routineName, setRoutineName] = useState('My Balanced K-Beauty Routine');
  const [amSelection, setAmSelection] = useState<Record<string, string>>({});
  const [pmSelection, setPmSelection] = useState<Record<string, string>>({});
  const [savedRoutines, setSavedRoutines] = useState<SavedRoutineRecord[]>([]);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [pageTheme, setPageTheme] = useState<RoutineBuilderPageThemeSettings>(
    () => themeService.getPagesTheme().routineBuilder || DEFAULT_PAGES_THEME.routineBuilder
  );

  useEffect(() => {
    return themeService.subscribePages((pages) => {
      if (pages?.routineBuilder) setPageTheme(pages.routineBuilder);
    });
  }, []);

  const inStockProducts = useMemo(() => products.filter((p) => (p.stock || 0) > 0), [products]);

  useEffect(() => {
    let active = true;
    userPortalService.getSavedRoutines(user?.uid).then((list) => {
      if (!active) return;
      setSavedRoutines(list);
      if (list.length > 0 && Object.keys(amSelection).length === 0) {
        const latest = list[0];
        const nextAm: Record<string, string> = {};
        latest.amSteps.forEach((step, idx) => {
          const slotKey = AM_SLOTS[idx]?.id || `am_${idx}`;
          if (step.productId) nextAm[slotKey] = step.productId;
        });
        const nextPm: Record<string, string> = {};
        latest.pmSteps.forEach((step, idx) => {
          const slotKey = PM_SLOTS[idx]?.id || `pm_${idx}`;
          if (step.productId) nextPm[slotKey] = step.productId;
        });
        setAmSelection(nextAm);
        setPmSelection(nextPm);
        setRoutineName(latest.name);
      }
    });
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const amSelectedProducts = useMemo(
    () => Object.values(amSelection).map((id) => productMap.get(id)).filter((p): p is Product => Boolean(p)),
    [amSelection, productMap]
  );

  const pmSelectedProducts = useMemo(
    () => Object.values(pmSelection).map((id) => productMap.get(id)).filter((p): p is Product => Boolean(p)),
    [pmSelection, productMap]
  );

  const amWarnings = useMemo(() => detectLayeringConflicts(amSelectedProducts), [amSelectedProducts]);
  const pmWarnings = useMemo(() => detectLayeringConflicts(pmSelectedProducts), [pmSelectedProducts]);

  const uniqueSelectedProducts = useMemo(() => {
    const seen = new Set<string>();
    const combined: Product[] = [];
    for (const p of [...amSelectedProducts, ...pmSelectedProducts]) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        combined.push(p);
      }
    }
    return combined;
  }, [amSelectedProducts, pmSelectedProducts]);

  const estimatedTotal = useMemo(
    () => uniqueSelectedProducts.reduce((sum, p) => sum + getRetailPrice(p), 0),
    [uniqueSelectedProducts]
  );

  const optionsForSlot = (keywords: string[]) => {
    const matching = inStockProducts.filter((p) => {
      const hay = `${p.category} ${p.routineStep || ''} ${p.name}`.toLowerCase();
      return keywords.some((kw) => hay.includes(kw));
    });
    return matching.length > 0 ? matching : inStockProducts.slice(0, 30);
  };

  const handleSaveRoutine = async () => {
    const amSteps = AM_SLOTS.map((s) => {
      const p = amSelection[s.id] ? productMap.get(amSelection[s.id]) : undefined;
      return p ? { slot: s.label, productId: p.id, productName: p.name, brand: p.brand } : null;
    }).filter((x): x is NonNullable<typeof x> => Boolean(x));

    const pmSteps = PM_SLOTS.map((s) => {
      const p = pmSelection[s.id] ? productMap.get(pmSelection[s.id]) : undefined;
      return p ? { slot: s.label, productId: p.id, productName: p.name, brand: p.brand } : null;
    }).filter((x): x is NonNullable<typeof x> => Boolean(x));

    const saved = await userPortalService.saveRoutine(
      {
        name: routineName.trim() || 'My K-Beauty Routine',
        amSteps,
        pmSteps,
      },
      user?.uid
    );
    setSavedRoutines((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
    setSaveNotice(user ? 'Routine saved to your profile!' : 'Routine saved locally in your browser.');
    setTimeout(() => setSaveNotice(null), 3500);
  };

  const handleAddRoutineToCart = () => {
    let added = 0;
    for (const p of uniqueSelectedProducts) {
      if ((p.stock || 0) > 0) {
        addToCart(p, 1, undefined, { openDrawer: false });
        added++;
      }
    }
    if (added > 0) {
      setIsCartOpen(true);
    }
  };

  const handleDeleteSavedRoutine = async (id: string) => {
    await userPortalService.deleteRoutine(id, user?.uid);
    setSavedRoutines((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#FFF5F8]/40 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <SeoHead metadata={seoMetadata} />

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-pink-100 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-100 text-[#E91E8C] text-[11px] font-black uppercase tracking-wider">
              <Sparkles size={13} />
              <span>{pageTheme.badgeText}</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {isBn ? pageTheme.titleBN : pageTheme.titleEN}
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              {pageTheme.subtitle}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <Link
              to="/skin-quiz"
              className="px-4 py-2.5 rounded-xl border border-pink-200 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] text-xs font-bold text-center"
            >
              {pageTheme.quizCtaLabel}
            </Link>
            <Link
              to="/ingredients"
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-gray-700 text-xs font-bold text-center"
            >
              {pageTheme.glossaryCtaLabel}
            </Link>
          </div>
        </div>

        {/* Routine Name & Actions Bar */}
        <div className="bg-white rounded-2xl border border-pink-100 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <label htmlFor="routine-name-input" className="text-xs font-black text-gray-700 whitespace-nowrap">
              Routine Name:
            </label>
            <input
              id="routine-name-input"
              type="text"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#E91E8C] text-xs font-bold outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-mono font-bold text-gray-700 px-3 py-2 rounded-xl bg-pink-50 border border-pink-100">
              {uniqueSelectedProducts.length} unique item(s) · ৳{estimatedTotal.toLocaleString()}
            </div>
            <button
              type="button"
              onClick={handleSaveRoutine}
              disabled={uniqueSelectedProducts.length === 0}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-gray-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save size={14} />
              <span>{pageTheme.saveRoutineLabel}</span>
            </button>
            <button
              type="button"
              onClick={handleAddRoutineToCart}
              disabled={uniqueSelectedProducts.length === 0}
              className="px-4 py-2.5 rounded-xl bg-[#E91E8C] hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag size={14} />
              <span>{pageTheme.addToCartLabel}</span>
            </button>
          </div>
        </div>

        {saveNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{saveNotice}</span>
          </div>
        )}

        {/* AM & PM Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AM Routine */}
          <section className="bg-white rounded-3xl border border-pink-100 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-pink-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <Sun size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900">{pageTheme.amTitle}</h2>
                  <p className="text-xs text-gray-500">{pageTheme.amSubtitle}</p>
                </div>
              </div>
            </div>

            {pageTheme.showLayeringWarnings && amWarnings.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs text-amber-900">
                {amWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {AM_SLOTS.map((slot) => {
                const slotOpts = optionsForSlot(slot.keywords);
                const selectedProduct = amSelection[slot.id] ? productMap.get(amSelection[slot.id]) : undefined;
                return (
                  <div key={slot.id} className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">{slot.label}</label>
                    <select
                      value={amSelection[slot.id] || ''}
                      onChange={(e) => setAmSelection((prev) => ({ ...prev, [slot.id]: e.target.value }))}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#E91E8C] text-xs font-semibold outline-none"
                    >
                      <option value="">-- Choose product (optional) --</option>
                      {slotOpts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.brand}) — ৳{getRetailPrice(p).toLocaleString()}
                        </option>
                      ))}
                    </select>
                    {selectedProduct && (
                      <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                        <span>{selectedProduct.brand}</span>
                        <Link to={getProductPath(selectedProduct)} className="text-[#E91E8C] font-bold hover:underline">
                          View details →
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* PM Routine */}
          <section className="bg-white rounded-3xl border border-pink-100 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-pink-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                  <Moon size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900">{pageTheme.pmTitle}</h2>
                  <p className="text-xs text-gray-500">{pageTheme.pmSubtitle}</p>
                </div>
              </div>
            </div>

            {pageTheme.showLayeringWarnings && pmWarnings.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs text-amber-900">
                {pmWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {PM_SLOTS.map((slot) => {
                const slotOpts = optionsForSlot(slot.keywords);
                const selectedProduct = pmSelection[slot.id] ? productMap.get(pmSelection[slot.id]) : undefined;
                return (
                  <div key={slot.id} className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-800">{slot.label}</label>
                    <select
                      value={pmSelection[slot.id] || ''}
                      onChange={(e) => setPmSelection((prev) => ({ ...prev, [slot.id]: e.target.value }))}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#E91E8C] text-xs font-semibold outline-none"
                    >
                      <option value="">-- Choose product (optional) --</option>
                      {slotOpts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.brand}) — ৳{getRetailPrice(p).toLocaleString()}
                        </option>
                      ))}
                    </select>
                    {selectedProduct && (
                      <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                        <span>{selectedProduct.brand}</span>
                        <Link to={getProductPath(selectedProduct)} className="text-[#E91E8C] font-bold hover:underline">
                          View details →
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Saved Routines List */}
        {pageTheme.showSavedRoutines && savedRoutines.length > 0 && (
          <section className="bg-white rounded-3xl border border-pink-100 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-black text-gray-900">Your Saved Routines</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedRoutines.map((r) => (
                <div key={r.id} className="p-4 rounded-2xl border border-pink-100 bg-[#FFF5F8]/50 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-gray-900">{r.name}</h3>
                    <p className="text-xs text-gray-600">
                      {r.amSteps.length} AM step(s) · {r.pmSteps.length} PM step(s)
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Updated {new Date(r.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextAm: Record<string, string> = {};
                        r.amSteps.forEach((step, idx) => {
                          nextAm[AM_SLOTS[idx]?.id || `am_${idx}`] = step.productId;
                        });
                        const nextPm: Record<string, string> = {};
                        r.pmSteps.forEach((step, idx) => {
                          nextPm[PM_SLOTS[idx]?.id || `pm_${idx}`] = step.productId;
                        });
                        setAmSelection(nextAm);
                        setPmSelection(nextPm);
                        setRoutineName(r.name);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white border border-pink-200 text-xs font-bold text-[#E91E8C] cursor-pointer"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedRoutine(r.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 cursor-pointer"
                      aria-label="Delete routine"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
