import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { articleService } from '../services/articleService';
import { SkincareGuide } from '../data/skincareGuides';
import { useProducts } from '../hooks/queries/products';
import { useAuth } from '../context/AuthContext';
import { isSameBrand } from '../data/brands';
import { ProductCard } from './ProductCard';
import { SeoHead } from './SeoHead';
import { buildGuideSeo } from '../services/seoService';
import { pageSeoService } from '../services/pageSeoService';
import { themeService, DEFAULT_PAGES_THEME } from '../services/themeService';
import { GuideDetailPageThemeSettings } from '../types/theme';
import { GuideContentRenderer } from './GuideContentRenderer';
import {
  Clock,
  Calendar,
  User,
  ChevronRight,
  HelpCircle,
  ChevronDown,
  BookOpen,
  AlertCircle,
  Sparkles,
  EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function normalizeBrandSlug(brandName?: string): string {
  return (brandName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const SkincareGuideDetail: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const isStaff = Boolean(
    profile?.role &&
      ['admin', 'super_admin', 'inventory_manager', 'hr', 'customer_support'].includes(
        profile.role
      )
  );

  const [guide, setGuide] = useState<SkincareGuide | null>(() =>
    articleService.getArticleBySlug(slug, isStaff)
  );
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const { data: allProducts = [] } = useProducts();

  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [pageTheme, setPageTheme] = useState<GuideDetailPageThemeSettings>(
    DEFAULT_PAGES_THEME.guideDetail
  );
  const [seoPagesTick, setSeoPagesTick] = useState(0);

  useEffect(() => {
    setHeroImageFailed(false);
    setGuide(articleService.getArticleBySlug(slug, isStaff));

    const unsubArticles = isStaff
      ? articleService.subscribeAdmin(() => {
          setGuide(articleService.getArticleBySlug(slug, true));
        })
      : articleService.subscribe(() => {
          setGuide(articleService.getArticleBySlug(slug, false));
        });

    const unsubTheme = themeService.subscribePages((p) => {
      if (p?.guideDetail) setPageTheme(p.guideDetail);
    });
    const unsubSeo = pageSeoService.subscribe(() => {
      setSeoPagesTick((t) => t + 1);
    });
    return () => {
      unsubArticles();
      unsubTheme();
      unsubSeo();
    };
  }, [slug, isStaff]);

  const hasCustomPageFaqs = useMemo(() => {
    void seoPagesTick;
    const override = pageSeoService.getForPath(`/guide/${slug}`);
    return Boolean(
      override &&
        override.showFaqsOnPage !== false &&
        Array.isArray(override.faqs) &&
        override.faqs.length > 0
    );
  }, [slug, seoPagesTick]);

  // SEO metadata
  const seoMeta = useMemo(() => {
    return guide ? buildGuideSeo(guide) : undefined;
  }, [guide]);

  // Related products: explicit pinned products first, then brand matches
  const relatedProducts = useMemo(() => {
    if (!guide || !allProducts.length) return [];

    const pickedIds = new Set(guide.recommendedProductIds || []);
    const pinnedProducts = allProducts.filter((p) => pickedIds.has(p.id));

    const brandMatches = allProducts.filter((p) => {
      if (pickedIds.has(p.id)) return false;
      const productBrandSlug = normalizeBrandSlug(p.brand);
      return guide.recommendedBrandSlugs?.some((bSlug) => {
        const cleanName = bSlug.replace(/-/g, ' ');
        return (
          productBrandSlug === bSlug.toLowerCase() || isSameBrand(p.brand, cleanName)
        );
      });
    });

    return [...pinnedProducts, ...brandMatches].slice(0, 4);
  }, [guide, allProducts]);

  if (!guide) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <SeoHead
          title="Guide Not Found | Korean Skin Food BD"
          description="The educational skincare article you requested was not found or has been moved."
          noindex={true}
        />
        <div className="w-16 h-16 bg-pink-50 text-[#E91E8C] rounded-full flex items-center justify-center mx-auto border border-pink-100">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Skincare Guide Not Found</h1>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          The requested educational article could not be located. Explore our comprehensive skincare guides library.
        </p>
        <Link
          to="/guides"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#E91E8C] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#d0177c] transition"
        >
          View All Skincare Guides
        </Link>
      </div>
    );
  }

  const isBengali = language === 'bn' && Boolean(guide.contentBN?.trim());
  const currentTitle = isBengali && guide.titleBN ? guide.titleBN : guide.title;
  const currentContent = isBengali && guide.contentBN ? guide.contentBN : guide.content;
  const authorName = guide.author?.name || 'Korean Skin Food BD Editorial Team';
  const authorRole = guide.author?.role || 'K-Beauty Cosmeceutical Research';

  return (
    <article className="w-full max-w-[1280px] mx-auto px-3.5 py-5 sm:px-6 sm:py-8 md:px-8 space-y-6 sm:space-y-10">
      {seoMeta && <SeoHead metadata={seoMeta} />}

      {guide.status === 'draft' && isStaff && (
        <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <span className="flex items-center gap-2">
            <EyeOff size={15} className="text-amber-700 shrink-0" />
            <span>Draft Preview — Only visible to staff until published from Admin Blogs.</span>
          </span>
          <Link to="/admin/blogs" className="text-[#E91E8C] hover:underline whitespace-nowrap self-start sm:self-auto">
            Manage in Admin Blogs
          </Link>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 font-medium min-w-0" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-[#E91E8C] transition shrink-0">Home</Link>
        <ChevronRight size={12} className="shrink-0" />
        <Link to="/guides" className="hover:text-[#E91E8C] transition shrink-0">Skincare Guides</Link>
        <ChevronRight size={12} className="shrink-0" />
        <span className="text-[#E91E8C] font-extrabold truncate min-w-0">{currentTitle}</span>
      </nav>

      {/* Article Header */}
      <header className="space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-gray-500 font-medium">
            <span className="bg-pink-50 text-[#E91E8C] font-bold px-3 py-1 rounded-full border border-pink-100 uppercase tracking-wider text-[10px]">
              {guide.category.replace('_', ' ')}
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Calendar size={13} className="text-gray-400" />
              <span>
                {new Date(guide.publishedDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Clock size={13} className="text-gray-400" />
              <span>{guide.readingTimeMinutes} min read</span>
            </span>
          </div>

          {/* Bilingual Switcher */}
          {pageTheme.showLanguageSwitcher && guide.contentBN && (
            <div className="flex items-center gap-1 bg-pink-50/60 p-1 rounded-xl border border-pink-100 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 sm:py-1 rounded-lg transition cursor-pointer ${
                  language === 'en'
                    ? 'bg-white text-[#E91E8C] shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                className={`px-3 py-1.5 sm:py-1 rounded-lg transition cursor-pointer ${
                  language === 'bn'
                    ? 'bg-white text-[#E91E8C] shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                বাংলা
              </button>
            </div>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight text-balance leading-tight">
          {currentTitle}
        </h1>

        <div className="flex items-center gap-3 pt-2 text-xs text-gray-600 font-medium border-t border-pink-50">
          <div className="w-8 h-8 rounded-full bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold shrink-0">
            <User size={15} />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-gray-900 block truncate">{authorName}</span>
            <span className="text-[11px] text-gray-400 block truncate">{authorRole}</span>
          </div>
        </div>

        {/* Hero Image */}
        <div className="relative aspect-[16/10] sm:aspect-[2.2/1] rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-pink-50 via-rose-50 to-slate-100 border border-pink-100 shadow-sm">
          {guide.heroImage && !heroImageFailed ? (
            <img
              src={guide.heroImage}
              alt={guide.imageAltText || guide.title}
              referrerPolicy="no-referrer"
              onError={() => setHeroImageFailed(true)}
              className="w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#E91E8C]/70 p-6 text-center">
              <BookOpen size={36} />
              <span className="text-sm font-bold text-slate-700">{currentTitle}</span>
            </div>
          )}
        </div>
      </header>

      {/* Article Body Content */}
      <section className="bg-white border border-pink-100 rounded-2xl sm:rounded-[32px] p-4 sm:p-10 md:p-12 shadow-sm space-y-6 sm:space-y-8">
        <GuideContentRenderer content={currentContent} />

        {/* Key Actives Box */}
        {guide.keyIngredients && guide.keyIngredients.length > 0 && (
          <div className="p-5 rounded-2xl bg-pink-50/20 border border-pink-100 space-y-2">
            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
              {pageTheme.featuredActivesHeading}
            </span>
            <div className="flex flex-wrap gap-2">
              {guide.keyIngredients.map((ing, i) => (
                <span
                  key={i}
                  className="text-xs font-semibold text-gray-700 bg-white px-3 py-1 rounded-lg border border-pink-100 shadow-2xs"
                >
                  {ing}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Frequently Asked Questions */}
      {!hasCustomPageFaqs && pageTheme.showFaqs && guide.faqs && guide.faqs.length > 0 && (
        <section className="bg-white border border-pink-100 rounded-2xl sm:rounded-[32px] p-4 sm:p-10 space-y-5 sm:space-y-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle size={20} className="text-[#E91E8C] shrink-0" />
              <span>{isBengali ? pageTheme.faqHeadingBN : pageTheme.faqHeadingEN}</span>
            </h2>
            <p className="text-xs text-gray-500">{pageTheme.faqSubtext}</p>
          </div>

          <div className="space-y-3">
            {guide.faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="border border-pink-100 rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full text-left px-4 sm:px-5 py-3.5 sm:py-4 min-h-[48px] flex items-center justify-between gap-3 sm:gap-4 font-bold text-xs sm:text-sm text-gray-900 hover:text-[#E91E8C] transition cursor-pointer"
                  >
                    <span>{isBengali && faq.questionBN ? faq.questionBN : faq.question}</span>
                    <ChevronDown
                      size={18}
                      className={`text-gray-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#E91E8C]' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-pink-50/60">
                          {isBengali && faq.answerBN ? faq.answerBN : faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recommended Products for this Guide */}
      {pageTheme.showRelatedProducts && relatedProducts.length > 0 && (
        <section className="space-y-5 sm:space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pink-100/80 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles size={20} className="text-[#E91E8C] shrink-0" />
                <span>{pageTheme.relatedHeading}</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{pageTheme.relatedSubtext}</p>
            </div>
            <Link to="/shop" className="text-xs font-bold text-[#E91E8C] hover:underline whitespace-nowrap shrink-0">
              {pageTheme.relatedCtaLabel}
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
};
