import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Droplets,
  Info,
  Sparkles,
} from 'lucide-react';
import { useProducts } from '../hooks/queries/products';
import { useTaxonomies } from '../hooks/queries/taxonomies';
import { useCart } from '../context/CartContext';
import {
  SKIN_CONCERN_LIBRARY,
  findConcernBySlug,
  matchesConcern,
  taxonomiesToSkinConcernEntries,
} from '../data/skinConcerns';
import { findIngredientSlug, taxonomiesToIngredientGuideEntries } from '../data/ingredientLibrary';
import { taxonomyService } from '../services/taxonomyService';
import { buildConcernSeo } from '../services/seoService';
import { SeoHead } from './SeoHead';
import { ProductCard } from './ProductCard';
import { themeService, DEFAULT_PAGES_THEME } from '../services/themeService';
import { ConcernsPageThemeSettings } from '../types/theme';
import { TaxonomyItem } from '../types';

export const SkinConcernLibraryPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const { language } = useCart();
  const isBn = language === 'bn';
  const { data: products = [], isLoading } = useProducts();
  const { data: queryConcerns = [] } = useTaxonomies('skin_concern');
  const { data: queryIngredients = [] } = useTaxonomies('ingredient');
  const [liveTaxonomies, setLiveTaxonomies] = useState<TaxonomyItem[]>(() =>
    taxonomyService.getTaxonomiesSync('skin_concern')
  );
  const [liveIngredients, setLiveIngredients] = useState<TaxonomyItem[]>(() =>
    taxonomyService.getTaxonomiesSync('ingredient')
  );
  const [pageTheme, setPageTheme] = useState<ConcernsPageThemeSettings>(
    () => themeService.getPagesTheme().concerns || DEFAULT_PAGES_THEME.concerns
  );

  useEffect(() => {
    const unsubTheme = themeService.subscribePages((pages) => {
      if (pages?.concerns) setPageTheme(pages.concerns);
    });
    const unsubTaxonomies = taxonomyService.subscribe((items) => {
      setLiveTaxonomies(items.filter((i) => i.type === 'skin_concern'));
      setLiveIngredients(items.filter((i) => i.type === 'ingredient'));
    });
    return () => {
      unsubTheme();
      unsubTaxonomies();
    };
  }, []);

  const concernEntries = useMemo(() => {
    const source = liveTaxonomies.length > 0 ? liveTaxonomies : queryConcerns;
    const dynamicEntries = taxonomiesToSkinConcernEntries(source);
    return dynamicEntries.length > 0 ? dynamicEntries : SKIN_CONCERN_LIBRARY;
  }, [liveTaxonomies, queryConcerns]);

  const dynamicIngredients = useMemo(() => {
    const source = liveIngredients.length > 0 ? liveIngredients : queryIngredients;
    return taxonomiesToIngredientGuideEntries(source);
  }, [liveIngredients, queryIngredients]);

  const activeConcern = useMemo(
    () => findConcernBySlug(slug, concernEntries),
    [slug, concernEntries]
  );
  const seoMetadata = useMemo(() => buildConcernSeo(activeConcern), [activeConcern]);

  const matchedProducts = useMemo(() => {
    if (!activeConcern) return [];
    return products
      .filter((p) => matchesConcern(p, activeConcern))
      .sort((a, b) => Number((b.stock || 0) > 0) - Number((a.stock || 0) > 0));
  }, [products, activeConcern]);

  if (slug && !activeConcern) {
    return (
      <div className="min-h-[65vh] bg-[#FFF5F8]/50 px-4 py-14 flex items-center justify-center">
        <SeoHead metadata={seoMetadata} />
        <div className="max-w-lg w-full bg-white rounded-3xl border border-pink-100 p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-pink-50 text-[#E91E8C] flex items-center justify-center mx-auto">
            <Sparkles size={26} />
          </div>
          <h1 className="text-xl font-black text-gray-900">
            {isBn ? 'ত্বকের সমস্যার গাইড পাওয়া যায়নি' : 'Skin Concern Guide Not Found'}
          </h1>
          <p className="text-sm text-gray-600">
            {isBn
              ? 'অনুরোধকৃত পাতাটি পাওয়া যায়নি। সকল স্কিন কনসার্ন গাইড দেখুন।'
              : 'That skin concern URL was not found. Browse all curated routine guides below.'}
          </p>
          <Link
            to="/concerns"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E91E8C] hover:bg-pink-700 text-white text-xs font-bold transition"
          >
            <ArrowLeft size={14} />
            <span>{isBn ? 'সব স্কিন কনসার্ন দেখুন' : 'View All Skin Concerns'}</span>
          </Link>
        </div>
      </div>
    );
  }

  // DETAIL VIEW (/concern/:slug)
  if (activeConcern) {
    const displayTitle = isBn ? activeConcern.titleBN || activeConcern.title : activeConcern.title;
    const secondaryTitle = isBn
      ? activeConcern.titleBN && activeConcern.title !== activeConcern.titleBN
        ? activeConcern.title
        : ''
      : activeConcern.titleBN;
    const displaySummary =
      isBn && activeConcern.summaryBN ? activeConcern.summaryBN : activeConcern.summary;
    const displayTips =
      isBn && activeConcern.routineTipsBN && activeConcern.routineTipsBN.length > 0
        ? activeConcern.routineTipsBN
        : activeConcern.routineTips;

    return (
      <div className="min-h-screen bg-[#FFF5F8]/40 py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
        <SeoHead metadata={seoMetadata} />

        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/concerns"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E91E8C] hover:underline"
            >
              <ArrowLeft size={14} />
              <span>{isBn ? 'সকল স্কিন কনসার্ন গাইডে ফিরুন' : 'Back to Skin Concerns'}</span>
            </Link>
            <Link
              to="/skin-quiz"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-[#E91E8C]"
            >
              <Sparkles size={14} />
              <span>{isBn ? 'ব্যক্তিগত স্কিন কুইজ দিন' : 'Get Personalized Quiz Match'}</span>
            </Link>
          </div>

          <section className="bg-white rounded-3xl border border-pink-100 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5 border-b border-pink-100 pb-6">
              {activeConcern.image && (
                <img
                  src={activeConcern.image}
                  alt={displayTitle}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-pink-50 border border-pink-100 shrink-0"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="space-y-2 max-w-3xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-100 text-[#E91E8C] text-[11px] font-black uppercase tracking-wider">
                  {isBn
                    ? activeConcern.titleBN || pageTheme.detailBadgeFallback
                    : pageTheme.detailBadgeFallback}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {displayTitle}
                </h1>
                {secondaryTitle && (
                  <p className="text-xs font-semibold text-gray-500">{secondaryTitle}</p>
                )}
                {displaySummary && (
                  <p className="text-sm text-gray-700 leading-relaxed pt-1">{displaySummary}</p>
                )}
              </div>
            </div>

            <div
              className={`grid grid-cols-1 ${
                pageTheme.showDetailKeyIngredients ? 'md:grid-cols-2' : ''
              } gap-6`}
            >
              {pageTheme.showDetailKeyIngredients && (
                <div className="p-5 rounded-2xl bg-[#FFF5F8]/60 border border-pink-100 space-y-3">
                  <h2 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                    <Droplets size={15} className="text-[#E91E8C]" />
                    <span>{isBn ? 'গুরুত্বপূর্ণ উপাদান' : 'Key Focus Ingredients'}</span>
                  </h2>
                  {activeConcern.keyFocusIngredients.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeConcern.keyFocusIngredients.map((ing, idx) => {
                        const ingSlug = findIngredientSlug(ing, dynamicIngredients);
                        return ingSlug ? (
                          <Link
                            key={`${ing}-${idx}`}
                            to={`/ingredient/${ingSlug}`}
                            className="px-3 py-1.5 rounded-xl bg-white border border-pink-200 hover:border-[#E91E8C] text-xs font-bold text-[#E91E8C] transition"
                          >
                            {ing} →
                          </Link>
                        ) : (
                          <span
                            key={`${ing}-${idx}`}
                            className="px-3 py-1.5 rounded-xl bg-white border border-pink-200 text-xs font-bold text-gray-800"
                          >
                            {ing}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {isBn
                        ? 'এই স্কিন কনসার্নের জন্য এখনো নির্দিষ্ট উপাদান যুক্ত করা হয়নি।'
                        : 'Key focus ingredients have not been added for this concern yet.'}
                    </p>
                  )}
                </div>
              )}

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>{isBn ? 'ব্যবহারিক রুটিন টিপস' : 'Practical Cosmetic Routine Habits'}</span>
                </h2>
                {displayTips.length > 0 ? (
                  <ul className="space-y-2 text-xs text-gray-700 leading-relaxed">
                    {displayTips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#E91E8C] font-black mt-0.5">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">
                    {isBn
                      ? 'এই কনসার্নের জন্য রুটিন টিপস শীঘ্রই যুক্ত করা হবে।'
                      : 'Routine habits are being updated for this concern.'}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-gray-600">
              <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
              <p>{pageTheme.detailDisclaimer}</p>
            </div>
          </section>

          {pageTheme.showDetailRelatedProducts && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-gray-900">
                    {isBn
                      ? `${activeConcern.titleBN || activeConcern.title} — প্রডাক্ট তালিকা`
                      : `Catalog Matches for ${activeConcern.title}`}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {isLoading
                      ? 'Loading catalog matches...'
                      : `${matchedProducts.length} product(s) matched by concern, category, and formula tags`}
                  </p>
                </div>
                <Link
                  to="/routine-builder"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E91E8C] hover:underline"
                >
                  <span>Build AM/PM Routine</span>
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
                    No matching products are tagged for this concern yet.
                  </p>
                  <Link
                    to="/shop"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E91E8C] text-white text-xs font-bold"
                  >
                    <span>Browse Full Catalog</span>
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

  // INDEX VIEW (/concerns)
  return (
    <div className="min-h-screen bg-[#FFF5F8]/40 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <SeoHead metadata={seoMetadata} />

      <div className="max-w-6xl mx-auto space-y-8">
        <div className="bg-white rounded-3xl border border-pink-100 p-6 sm:p-8 shadow-sm space-y-3 max-w-full">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-100 text-[#E91E8C] text-[11px] font-black uppercase tracking-wider">
            <Sparkles size={13} />
            <span>{pageTheme.badgeText}</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {isBn ? pageTheme.titleBN : pageTheme.titleEN}
          </h1>
          <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
            {isBn ? pageTheme.subtitleBN : pageTheme.subtitleEN}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {concernEntries.map((entry, idx) => {
            const count = products.filter((p) => matchesConcern(p, entry)).length;
            const cardTitle = isBn ? entry.titleBN || entry.title : entry.title;
            const cardSub = isBn
              ? entry.titleBN && entry.title !== entry.titleBN
                ? entry.title
                : ''
              : entry.titleBN;
            const cardSummary = isBn && entry.summaryBN ? entry.summaryBN : entry.summary;

            return (
              <Link
                key={`${entry.slug}-${idx}`}
                to={`/concern/${entry.slug}`}
                className="group bg-white rounded-3xl border border-pink-100 hover:border-[#E91E8C]/50 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      {cardSub && (
                        <span className="text-[11px] font-bold text-[#E91E8C] block truncate">
                          {cardSub}
                        </span>
                      )}
                      <h2 className="text-lg font-black text-gray-900 group-hover:text-[#E91E8C] transition">
                        {cardTitle}
                      </h2>
                    </div>
                    {entry.image && (
                      <img
                        src={entry.image}
                        alt={cardTitle}
                        className="w-11 h-11 rounded-xl object-cover bg-pink-50 border border-pink-100 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                  {cardSummary && (
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                      {cardSummary}
                    </p>
                  )}
                  {entry.keyFocusIngredients.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {entry.keyFocusIngredients.slice(0, 3).map((ing, ingIdx) => (
                        <span
                          key={`${ing}-${ingIdx}`}
                          className="px-2 py-0.5 rounded-md bg-pink-50 text-[#E91E8C] text-[10px] font-bold"
                        >
                          {ing}
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
                        : `${count} catalog items`
                      : isBn
                      ? 'রুটিন গাইড'
                      : 'Routine guide'}
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
      </div>
    </div>
  );
};
