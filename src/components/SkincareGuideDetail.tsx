import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { articleService } from '../services/articleService';
import { useProducts } from '../hooks/queries/products';
import { isSameBrand } from '../data/brands';
import { ProductCard } from './ProductCard';
import { SeoHead } from './SeoHead';
import { buildGuideSeo } from '../services/seoService';
import { Clock, Calendar, User, ChevronRight, HelpCircle, ChevronDown, BookOpen, AlertCircle, Sparkles, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SkincareGuideDetail: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const guide = useMemo(() => articleService.getArticleBySlug(slug), [slug]);
  const { data: allProducts = [] } = useProducts();

  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // SEO metadata
  const seoMeta = useMemo(() => {
    return guide ? buildGuideSeo(guide) : undefined;
  }, [guide]);

  // Related products from recommended brands or ingredients
  const relatedProducts = useMemo(() => {
    if (!guide || !allProducts.length) return [];
    const brandMatches = allProducts.filter(p => 
      guide.recommendedBrandSlugs?.some(bSlug => {
        const cleanName = bSlug.replace(/-/g, ' ');
        return isSameBrand(p.brand, cleanName);
      })
    );
    return brandMatches.slice(0, 4);
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

  const isBengali = language === 'bn' && guide.contentBN;
  const currentTitle = isBengali && guide.titleBN ? guide.titleBN : guide.title;
  const currentContent = isBengali && guide.contentBN ? guide.contentBN : guide.content;

  return (
    <article className="w-full max-w-[1280px] mx-auto px-4 py-8 md:px-8 space-y-10">
      {seoMeta && <SeoHead metadata={seoMeta} />}

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 font-medium" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-[#E91E8C] transition">Home</Link>
        <ChevronRight size={12} />
        <Link to="/guides" className="hover:text-[#E91E8C] transition">Skincare Guides</Link>
        <ChevronRight size={12} />
        <span className="text-[#E91E8C] font-extrabold truncate max-w-xs">{currentTitle}</span>
      </nav>

      {/* Article Header */}
      <header className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
            <span className="bg-pink-50 text-[#E91E8C] font-bold px-3 py-1 rounded-full border border-pink-100 uppercase tracking-wider text-[10px]">
              {guide.category.replace('_', ' ')}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={13} className="text-gray-400" />
              <span>{new Date(guide.publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Clock size={13} className="text-gray-400" />
              <span>{guide.readingTimeMinutes} min read</span>
            </span>
          </div>

          {/* Bilingual Switcher */}
          {guide.contentBN && (
            <div className="flex items-center gap-1 bg-pink-50/60 p-1 rounded-xl border border-pink-100 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-lg transition ${language === 'en' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                className={`px-3 py-1 rounded-lg transition ${language === 'bn' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
              >
                বাংলা
              </button>
            </div>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight text-balance leading-tight">
          {currentTitle}
        </h1>

        <div className="flex items-center gap-3 pt-2 text-xs text-gray-600 font-medium border-t border-pink-50">
          <div className="w-8 h-8 rounded-full bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold">
            <User size={15} />
          </div>
          <div>
            <span className="font-bold text-gray-900 block">{guide.author.name}</span>
            <span className="text-[11px] text-gray-400">{guide.author.role}</span>
          </div>
        </div>

        {/* Hero Image */}
        <div className="relative aspect-[21/9] sm:aspect-[2.2/1] rounded-3xl overflow-hidden bg-pink-50 border border-pink-100 shadow-sm">
          <img
            src={guide.heroImage}
            alt={guide.imageAltText || guide.title}
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </header>

      {/* Article Body Content */}
      <section className="bg-white border border-pink-100 rounded-[32px] p-6 sm:p-10 md:p-12 shadow-sm space-y-8">
        <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed space-y-6">
          {currentContent.split('\n\n').map((block, idx) => {
            const trimmed = block.trim();
            if (!trimmed) return null;

            if (trimmed.startsWith('### ')) {
              return (
                <h2 key={idx} className="text-xl sm:text-2xl font-bold text-gray-900 pt-4 border-b border-pink-50 pb-2">
                  {trimmed.replace('### ', '')}
                </h2>
              );
            }
            if (trimmed.startsWith('#### ')) {
              return (
                <h3 key={idx} className="text-base sm:text-lg font-bold text-gray-800 pt-2">
                  {trimmed.replace('#### ', '')}
                </h3>
              );
            }
            if (trimmed.startsWith('*Disclaimer:')) {
              return (
                <div key={idx} className="p-4 rounded-2xl bg-pink-50/40 border border-pink-100/60 text-xs text-gray-500 italic mt-6">
                  {trimmed.replace('*Disclaimer:', 'Medical Disclaimer:')}
                </div>
              );
            }
            return (
              <p key={idx} className="text-sm sm:text-base text-gray-700 leading-relaxed">
                {trimmed}
              </p>
            );
          })}
        </div>

        {/* Key Actives Pill Box */}
        {guide.keyIngredients && guide.keyIngredients.length > 0 && (
          <div className="p-5 rounded-2xl bg-pink-50/20 border border-pink-100 space-y-2">
            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
              Featured Dermatological Actives Discussed
            </span>
            <div className="flex flex-wrap gap-2">
              {guide.keyIngredients.map((ing, i) => (
                <span key={i} className="text-xs font-semibold text-gray-700 bg-white px-3 py-1 rounded-lg border border-pink-100 shadow-2xs">
                  {ing}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Frequently Asked Questions */}
      {guide.faqs && guide.faqs.length > 0 && (
        <section className="bg-white border border-pink-100 rounded-[32px] p-6 sm:p-10 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle size={20} className="text-[#E91E8C]" />
              <span>{isBengali ? 'সাধারণ জিজ্ঞাসা (FAQ)' : 'Frequently Asked Questions'}</span>
            </h2>
            <p className="text-xs text-gray-500">
              Clear answers to common questions about this skincare topic in Bangladesh.
            </p>
          </div>

          <div className="space-y-3">
            {guide.faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className="border border-pink-100 rounded-2xl overflow-hidden transition-colors">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-gray-900 hover:text-[#E91E8C] transition"
                  >
                    <span>{isBengali && faq.questionBN ? faq.questionBN : faq.question}</span>
                    <ChevronDown
                      size={18}
                      className={`text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#E91E8C]' : ''}`}
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
                        <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-pink-50/60">
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
      {relatedProducts.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-pink-100/80 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles size={20} className="text-[#E91E8C]" />
                <span>Recommended Products from Our Catalog</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Authentic, Seoul-imported cosmeceuticals matching the principles outlined in this guide.
              </p>
            </div>
            <Link to="/shop" className="text-xs font-bold text-[#E91E8C] hover:underline">
              View All Products &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
};
