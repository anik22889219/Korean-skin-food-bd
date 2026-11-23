import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Droplets,
  Info,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useProducts } from '../hooks/queries/products';
import { useTaxonomies } from '../hooks/queries/taxonomies';
import { useCart } from '../context/CartContext';
import {
  INGREDIENT_LIBRARY,
  findIngredientBySlug,
  findIngredientSlug,
  matchesIngredient,
  taxonomiesToIngredientGuideEntries,
} from '../data/ingredientLibrary';
import { taxonomyService } from '../services/taxonomyService';
import { buildIngredientSeo } from '../services/seoService';
import { SeoHead } from './SeoHead';
import { ProductCard } from './ProductCard';
import { themeService, DEFAULT_PAGES_THEME } from '../services/themeService';
import { IngredientsPageThemeSettings } from '../types/theme';
import { TaxonomyItem } from '../types';

export const IngredientLibraryPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const { language } = useCart();
  const isBn = language === 'bn';
  const { data: products = [], isLoading } = useProducts();
  const { data: queryIngredients = [] } = useTaxonomies('ingredient');
  const [liveTaxonomies, setLiveTaxonomies] = useState<TaxonomyItem[]>(() =>
    taxonomyService.getTaxonomiesSync('ingredient')
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [pageTheme, setPageTheme] = useState<IngredientsPageThemeSettings>(
    () => themeService.getPagesTheme().ingredients || DEFAULT_PAGES_THEME.ingredients
  );

  useEffect(() => {
    const unsubTheme = themeService.subscribePages((pages) => {
      if (pages?.ingredients) setPageTheme(pages.ingredients);
    });
    const unsubTaxonomies = taxonomyService.subscribe((items) => {
      setLiveTaxonomies(items.filter((i) => i.type === 'ingredient'));
    });
    return () => {
      unsubTheme();
      unsubTaxonomies();
    };
  }, []);

  const ingredientEntries = useMemo(() => {
    const source = liveTaxonomies.length > 0 ? liveTaxonomies : queryIngredients;
    const dynamicEntries = taxonomiesToIngredientGuideEntries(source);
    return dynamicEntries.length > 0 ? dynamicEntries : INGREDIENT_LIBRARY;
  }, [liveTaxonomies, queryIngredients]);

  const activeIngredient = useMemo(
    () => findIngredientBySlug(slug, ingredientEntries),
    [slug, ingredientEntries]
  );
  const seoMetadata = useMemo(() => buildIngredientSeo(activeIngredient), [activeIngredient]);

  const filteredIngredients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return ingredientEntries;
    return ingredientEntries.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.nameBN || '').toLowerCase().includes(q) ||
        (item.koreanName || '').toLowerCase().includes(q) ||
        item.shortRole.toLowerCase().includes(q) ||
        (item.shortRoleBN || '').toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        (item.summaryBN || '').toLowerCase().includes(q) ||
        item.bestForSkinTypes.some((st) => st.toLowerCase().includes(q)) ||
        item.matchKeywords.some((kw) => kw.toLowerCase().includes(q))
    );
  }, [searchTerm, ingredientEntries]);

  const matchedProducts = useMemo(() => {
    if (!activeIngredient) return [];
    return products
      .filter((p) => matchesIngredient(p, activeIngredient))
      .sort((a, b) => Number((b.stock || 0) > 0) - Number((a.stock || 0) > 0));
  }, [products, activeIngredient]);

  if (slug && !activeIngredient) {
    return (
      <div className="min-h-[65vh] bg-[#FFF5F8]/50 px-4 py-14 flex items-center justify-center">
        <SeoHead metadata={seoMetadata} />
        <div className="max-w-lg w-full bg-white rounded-3xl border border-pink-100 p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-pink-50 text-[#E91E8C] flex items-center justify-center mx-auto">
            <Droplets size={26} />
          </div>
          <h1 className="text-xl font-black text-gray-900">
            {isBn ? 'উপাদান গাইড পাওয়া যায়নি' : 'Ingredient Guide Not Found'}
          </h1>
          <p className="text-sm text-gray-600">
            {isBn
              ? 'এই উপাদানটির পাতাটি খুঁজে পাওয়া যায়নি। সম্পূর্ণ কোরিয়ান স্কিনকেয়ার ইনগ্রেডিয়েন্ট লাইব্রেরি দেখুন।'
              : 'We could not find an ingredient guide for that URL. Browse our full Korean skincare ingredients library.'}
          </p>
          <Link
            to="/ingredients"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E91E8C] hover:bg-pink-700 text-white text-xs font-bold transition"
          >
            <ArrowLeft size={14} />
            <span>{isBn ? 'সব উপাদান দেখুন' : 'View All Ingredients'}</span>
          </Link>
        </div>
      </div>
    );
  }

  // DETAIL VIEW (/ingredient/:slug)
  if (activeIngredient) {
    const displayName =
      isBn && activeIngredient.nameBN ? activeIngredient.nameBN : activeIngredient.name;
    const secondaryName =
      isBn && activeIngredient.nameBN && activeIngredient.nameBN !== activeIngredient.name
        ? activeIngredient.name
        : !isBn && activeIngredient.nameBN
        ? activeIngredient.nameBN
        : '';
    const displayRole =
      isBn && activeIngredient.shortRoleBN
        ? activeIngredient.shortRoleBN
        : activeIngredient.shortRole;
    const displaySummary =
      isBn && activeIngredient.summaryBN ? activeIngredient.summaryBN : activeIngredient.summary;
    const displayCautions =
      isBn && activeIngredient.layeringCautionsBN && activeIngredient.layeringCautionsBN.length > 0
        ? activeIngredient.layeringCautionsBN
        : activeIngredient.layeringCautions;

    return (
      <div className="min-h-screen bg-[#FFF5F8]/40 py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
        <SeoHead metadata={seoMetadata} />

        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/ingredients"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E91E8C] hover:underline"
            >
              <ArrowLeft size={14} />
              <span>{isBn ? 'সকল ইনগ্রেডিয়েন্ট লাইব্রেরিতে ফিরুন' : 'Back to Ingredients Library'}</span>
            </Link>
            <Link
              to="/routine-builder"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-[#E91E8C]"
            >
              <Sparkles size={14} />
              <span>{isBn ? 'রুটিন বিল্ডারে লেয়ারিং দেখুন' : 'Check Layering in Routine Builder'}</span>
            </Link>
          </div>

          <section className="bg-white rounded-3xl border border-pink-100 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5 border-b border-pink-100 pb-6">
              {activeIngredient.image && (
                <img
                  src={activeIngredient.image}
                  alt={displayName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-pink-50 border border-pink-100 shrink-0"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-pink-50 text-[#E91E8C] border border-pink-100 text-[11px] font-black uppercase tracking-wider">
                    {pageTheme.detailBadgeText}
                  </span>
                  {activeIngredient.koreanName && (
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      {activeIngredient.koreanName}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {displayName}
                </h1>
                {secondaryName && (
                  <p className="text-xs font-semibold text-gray-500">{secondaryName}</p>
                )}
                {displayRole && (
                  <p className="text-sm font-semibold text-[#E91E8C]">{displayRole}</p>
                )}
                {displaySummary && (
                  <p className="text-sm text-gray-700 leading-relaxed pt-1">{displaySummary}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Suitable Skin Types */}
              <div className="p-5 rounded-2xl bg-[#FFF5F8]/60 border border-pink-100 space-y-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <Droplets size={15} className="text-[#E91E8C]" />
                  <span>{isBn ? 'কোন ত্বকের জন্য উপযোগী' : 'Best For Skin Types'}</span>
                </h2>
                {activeIngredient.bestForSkinTypes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeIngredient.bestForSkinTypes.map((skin, idx) => (
                      <span
                        key={`${skin}-${idx}`}
                        className="px-2.5 py-1 rounded-lg bg-white border border-pink-200 text-xs font-bold text-gray-800"
                      >
                        {skin}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    {isBn
                      ? 'সকল ত্বকের ধরন অনুযায়ী প্যাচ টেস্ট করে ব্যবহার করা যায়।'
                      : 'Skin type suitability tags are being updated.'}
                  </p>
                )}
              </div>

              {/* Pairs Well With */}
              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <Sparkles size={15} className="text-emerald-600" />
                  <span>{isBn ? 'যার সাথে ভালো মানায়' : 'Pairs Well With'}</span>
                </h2>
                {activeIngredient.pairsWellWith.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeIngredient.pairsWellWith.map((partner, idx) => {
                      const partnerSlug = findIngredientSlug(partner, ingredientEntries);
                      return partnerSlug && partnerSlug !== activeIngredient.slug ? (
                        <Link
                          key={`${partner}-${idx}`}
                          to={`/ingredient/${partnerSlug}`}
                          className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 hover:border-emerald-400 text-xs font-bold text-emerald-800 transition"
                        >
                          {partner} →
                        </Link>
                      ) : (
                        <span
                          key={`${partner}-${idx}`}
                          className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-xs font-bold text-emerald-800"
                        >
                          {partner}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    {isBn
                      ? 'সহায়ক উপাদানগুলোর তালিকা শীঘ্রই যুক্ত করা হবে।'
                      : 'Compatible pairing suggestions are being updated.'}
                  </p>
                )}
              </div>

              {/* Layering & Cosmetic Cautions */}
              <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <ShieldAlert size={15} className="text-amber-600" />
                  <span>{isBn ? 'ব্যবহার ও সতর্কতা' : 'Layering & Patch Test Notes'}</span>
                </h2>
                {displayCautions.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-gray-700 leading-relaxed">
                    {displayCautions.map((note, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold mt-0.5">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">
                    {isBn
                      ? 'যেকোনো নতুন উপাদান ব্যবহারের আগে প্যাচ টেস্ট করে নিন।'
                      : 'Patch test on the jawline or inner arm before introducing a new active.'}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-gray-600">
              <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
              <p>{pageTheme.detailDisclaimer}</p>
            </div>
          </section>

          {/* Matching Catalog Products */}
          {pageTheme.showDetailRelatedProducts && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-gray-900">
                    {isBn
                      ? `${displayName} যুক্ত প্রডাক্ট`
                      : `Catalog Formulas Featuring ${activeIngredient.name}`}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {isLoading
                      ? 'Loading live catalog matches...'
                      : `${matchedProducts.length} matching product(s) found in our Bangladesh catalog`}
                  </p>
                </div>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E91E8C] hover:underline"
                >
                  <span>{isBn ? 'সম্পূর্ণ শপ দেখুন' : 'Browse Full Shop'}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-72 rounded-2xl bg-white border border-pink-100 animate-pulse" />
                  ))}
                </div>
              ) : matchedProducts.length === 0 ? (
                <div className="bg-white rounded-3xl border border-pink-100 p-8 text-center space-y-3">
                  <p className="text-sm font-bold text-gray-800">
                    {isBn
                      ? 'এই মুহূর্তে এই উপাদান অনুযায়ী ট্যাগ করা কোনো প্রডাক্ট পাওয়া যায়নি।'
                      : 'No live catalog products currently list this ingredient in their active tags.'}
                  </p>
                  <Link
                    to="/shop"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E91E8C] text-white text-xs font-bold"
                  >
                    <span>{isBn ? 'সব প্রডাক্ট দেখুন' : 'Explore All Products'}</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                  {matchedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    );
  }

  // INDEX VIEW (/ingredients)
  return (
    <div className="min-h-screen bg-[#FFF5F8]/40 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <SeoHead metadata={seoMetadata} />

      <div className="max-w-6xl mx-auto space-y-8">
        <div className="bg-white rounded-3xl border border-pink-100 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-100 text-[#E91E8C] text-[11px] font-black uppercase tracking-wider">
              <Droplets size={13} />
              <span>{pageTheme.badgeText}</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {isBn ? pageTheme.titleBN : pageTheme.titleEN}
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              {isBn ? pageTheme.subtitleBN : pageTheme.subtitleEN}
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isBn ? pageTheme.searchPlaceholderBN : pageTheme.searchPlaceholderEN}
              className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#E91E8C] text-xs font-semibold outline-none transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIngredients.map((entry, idx) => {
            const count = products.filter((p) => matchesIngredient(p, entry)).length;
            const cardName = isBn && entry.nameBN ? entry.nameBN : entry.name;
            const cardRole = isBn && entry.shortRoleBN ? entry.shortRoleBN : entry.shortRole;
            const cardSummary = isBn && entry.summaryBN ? entry.summaryBN : entry.summary;

            return (
              <Link
                key={`${entry.slug}-${idx}`}
                to={`/ingredient/${entry.slug}`}
                className="group bg-white rounded-3xl border border-pink-100 hover:border-[#E91E8C]/50 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {entry.image && (
                        <img
                          src={entry.image}
                          alt={cardName}
                          className="w-10 h-10 rounded-xl object-cover bg-pink-50 border border-pink-100 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="min-w-0">
                        <h2 className="text-base font-black text-gray-900 group-hover:text-[#E91E8C] transition">
                          {cardName}
                        </h2>
                        {entry.koreanName && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-pink-50 text-[#E91E8C] text-[10px] font-bold">
                            {entry.koreanName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {cardRole && (
                    <p className="text-xs font-semibold text-gray-800">{cardRole}</p>
                  )}
                  {cardSummary && (
                    <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                      {cardSummary}
                    </p>
                  )}
                  {entry.bestForSkinTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {entry.bestForSkinTypes.slice(0, 3).map((st, stIdx) => (
                        <span
                          key={`${st}-${stIdx}`}
                          className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/80 text-gray-600 text-[10px] font-semibold"
                        >
                          {st}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-pink-100/70 flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-gray-500">
                    {count > 0
                      ? isBn
                        ? `${count}টি প্রডাক্ট`
                        : `${count} catalog matches`
                      : isBn
                      ? 'উপাদান গাইড'
                      : 'Cosmetic guide'}
                  </span>
                  <span className="font-bold text-[#E91E8C] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>{pageTheme.cardCtaLabel}</span>
                    <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {pageTheme.showBottomBanner && (
          <div className="bg-white rounded-3xl border border-pink-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-black text-gray-900">
                {isBn ? pageTheme.bottomTitleBN : pageTheme.bottomTitleEN}
              </h2>
              <p className="text-xs text-gray-600">{pageTheme.bottomSubtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                to={pageTheme.bottomSecondaryLink || '/concerns'}
                className="px-4 py-2.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-[#E91E8C] text-xs font-bold transition"
              >
                {pageTheme.bottomSecondaryLabel}
              </Link>
              <Link
                to={pageTheme.bottomPrimaryLink || '/skin-quiz'}
                className="px-4 py-2.5 rounded-xl bg-[#E91E8C] hover:bg-pink-700 text-white text-xs font-bold transition"
              >
                {pageTheme.bottomPrimaryLabel}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
