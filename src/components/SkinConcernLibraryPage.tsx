import React, { useMemo } from 'react';
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
import { useCart } from '../context/CartContext';
import {
  SKIN_CONCERN_LIBRARY,
  findConcernBySlug,
  matchesConcern,
} from '../data/skinConcerns';
import { findIngredientSlug } from '../data/ingredientLibrary';
import { buildConcernSeo } from '../services/seoService';
import { SeoHead } from './SeoHead';
import { ProductCard } from './ProductCard';

export const SkinConcernLibraryPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const { language } = useCart();
  const isBn = language === 'bn';
  const { data: products = [], isLoading } = useProducts();

  const activeConcern = useMemo(() => findConcernBySlug(slug), [slug]);
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
            <div className="space-y-2 border-b border-pink-100 pb-6 max-w-3xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-100 text-[#E91E8C] text-[11px] font-black uppercase tracking-wider">
                {isBn ? activeConcern.titleBN : 'Bangladesh Climate Routine Guide'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {activeConcern.title}
              </h1>
              <p className="text-xs font-semibold text-gray-500">{activeConcern.titleBN}</p>
              <p className="text-sm text-gray-700 leading-relaxed pt-1">{activeConcern.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-[#FFF5F8]/60 border border-pink-100 space-y-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <Droplets size={15} className="text-[#E91E8C]" />
                  <span>{isBn ? 'গুরুত্বপূর্ণ উপাদান' : 'Key Focus Ingredients'}</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {activeConcern.keyFocusIngredients.map((ing) => {
                    const ingSlug = findIngredientSlug(ing);
                    return ingSlug ? (
                      <Link
                        key={ing}
                        to={`/ingredient/${ingSlug}`}
                        className="px-3 py-1.5 rounded-xl bg-white border border-pink-200 hover:border-[#E91E8C] text-xs font-bold text-[#E91E8C] transition"
                      >
                        {ing} →
                      </Link>
                    ) : (
                      <span
                        key={ing}
                        className="px-3 py-1.5 rounded-xl bg-white border border-pink-200 text-xs font-bold text-gray-800"
                      >
                        {ing}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>{isBn ? 'ব্যবহারিক রুটিন টিপস' : 'Practical Cosmetic Routine Habits'}</span>
                </h2>
                <ul className="space-y-2 text-xs text-gray-700 leading-relaxed">
                  {activeConcern.routineTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#E91E8C] font-black mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-gray-600">
              <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
              <p>
                Skincare products are cosmetic care—not medical treatments. For persistent or painful dermatological conditions, please consult a qualified dermatologist alongside gentle daily cleansing and sun protection.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900">
                  {isBn
                    ? `${activeConcern.titleBN} — প্রডাক্ট তালিকা`
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
            <span>Targeted Korean Skincare Education</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {isBn ? 'ত্বকের সমস্যা অনুযায়ী সমাধান ও রুটিন' : 'Shop & Learn by Skin Concern'}
          </h1>
          <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
            {isBn
              ? 'বাংলাদেশের আবহাওয়া উপযোগী কোরিয়ান স্কিনকেয়ার রুটিন সাজাতে নিচের সমস্যাগুলো থেকে আপনার ত্বকের লক্ষ্য বেছে নিন।'
              : 'Explore practical Korean skincare approaches tailored for Bangladesh heat, humidity, indoor AC dehydration, and daily sun exposure.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SKIN_CONCERN_LIBRARY.map((entry) => {
            const count = products.filter((p) => matchesConcern(p, entry)).length;
            return (
              <Link
                key={entry.slug}
                to={`/concern/${entry.slug}`}
                className="group bg-white rounded-3xl border border-pink-100 hover:border-[#E91E8C]/50 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold text-[#E91E8C]">{entry.titleBN}</span>
                  <h2 className="text-lg font-black text-gray-900 group-hover:text-[#E91E8C] transition">
                    {entry.title}
                  </h2>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{entry.summary}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {entry.keyFocusIngredients.slice(0, 3).map((ing) => (
                      <span
                        key={ing}
                        className="px-2 py-0.5 rounded-md bg-pink-50 text-[#E91E8C] text-[10px] font-bold"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-pink-100/70 flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-gray-500">
                    {count > 0 ? `${count} catalog items` : 'Routine guide'}
                  </span>
                  <span className="font-bold text-[#E91E8C] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Explore solutions</span>
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
