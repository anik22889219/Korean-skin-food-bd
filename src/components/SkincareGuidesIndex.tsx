import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { articleService } from '../services/articleService';
import { SkincareGuide } from '../data/skincareGuides';
import { SeoHead } from './SeoHead';
import { SITE_URL, buildCanonicalUrl, DEFAULT_OG_IMAGE } from '../services/seoService';
import { BookOpen, Clock, ChevronRight, Sparkles, Filter, CheckCircle } from 'lucide-react';

export const SkincareGuidesIndex: React.FC = () => {
  const [guides, setGuides] = useState<SkincareGuide[]>(() => articleService.getAllArticles());
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'bn'>('en');

  useEffect(() => {
    const unsub = articleService.subscribe((updated) => {
      setGuides(updated);
    });
    return () => unsub();
  }, []);

  const filteredGuides = useMemo(() => {
    if (activeCategory === 'all') return guides;
    return guides.filter(g => g.category === activeCategory);
  }, [guides, activeCategory]);

  const seoMetadata = useMemo(() => {
    const canonicalUrl = buildCanonicalUrl('/guides');
    const title = 'Korean Skincare Guides & Routine Advice | Korean Skin Food BD';
    const description = 'Expert evidence-conscious guides on Korean skincare routines, sun protection, skin barrier healing, acne care, and ingredient science adapted for Bangladesh.';

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${SITE_URL}/`
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Skincare Guides',
          item: canonicalUrl
        }
      ]
    };

    const collectionSchema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: canonicalUrl
    };

    return {
      title,
      description,
      canonicalUrl,
      keywords: [
        'Korean Skincare Routine Bangladesh',
        'K-Beauty advice Dhaka',
        'Best Korean Sunscreen for Oily Skin',
        'Acne Skincare Routine Bangladesh',
        'Centella Asiatica Skincare BD'
      ],
      ogType: 'website' as const,
      ogImage: DEFAULT_OG_IMAGE,
      ogImageAlt: 'Korean Skincare Guides in Bangladesh',
      twitterCard: 'summary_large_image' as const,
      jsonLd: [breadcrumbSchema, collectionSchema]
    };
  }, []);

  const categories = [
    { id: 'all', label: 'All Articles' },
    { id: 'routine', label: 'Routines & Steps' },
    { id: 'sun_care', label: 'Sun Protection' },
    { id: 'sensitive', label: 'Sensitive Skin' },
    { id: 'acne', label: 'Acne & Pores' },
    { id: 'ingredients', label: 'Active Ingredients' },
    { id: 'authentication', label: 'Authenticity Checks' }
  ];

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 py-8 md:px-8 lg:px-12 space-y-12">
      <SeoHead metadata={seoMetadata} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 font-medium" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-[#E91E8C] transition">Home</Link>
        <ChevronRight size={12} />
        <span className="text-[#E91E8C] font-extrabold">Skincare Guides</span>
      </nav>

      {/* Hero Banner */}
      <header className="relative bg-white border border-pink-100 rounded-[32px] p-6 sm:p-10 md:p-12 shadow-sm overflow-hidden space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#E91E8C] bg-pink-50 px-3 py-1 rounded-full border border-pink-100">
            <BookOpen size={14} />
            <span>K-Beauty Educational Knowledge Base</span>
          </div>

          {/* Bilingual Switcher */}
          <div className="flex items-center gap-1 bg-pink-50/60 p-1 rounded-xl border border-pink-100 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedLanguage('en')}
              className={`px-3 py-1 rounded-lg transition ${selectedLanguage === 'en' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setSelectedLanguage('bn')}
              className={`px-3 py-1 rounded-lg transition ${selectedLanguage === 'bn' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
            >
              বাংলা
            </button>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight text-balance">
          {selectedLanguage === 'en' ? 'Korean Skincare Guides for Bangladesh' : 'বাংলাদেশে কোরিয়ান স্কিন কেয়ার সহায়িকা'}
        </h1>

        <p className="text-xs sm:text-sm text-gray-600 max-w-2xl leading-relaxed">
          {selectedLanguage === 'en'
            ? 'Evidence-conscious, climate-tailored advice on building healthy skincare routines, decoding active ingredients, and choosing authentic Seoul-imported cosmetics.'
            : 'আমাদের আবহাওয়ার সাথে মানানসই কোরিয়ান রূপচর্চার বিজ্ঞানসম্মত দিকনির্দেশনা ও আসল প্রডাক্ট চেনার সঠিক উপায়।'}
        </p>

        {/* Category Filter Tabs */}
        <div className="pt-4 flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-[#E91E8C] text-white shadow-xs'
                  : 'bg-pink-50/40 text-gray-600 hover:text-gray-900 border border-pink-100/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Guides Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGuides.map(guide => {
          const displayTitle = selectedLanguage === 'bn' && guide.titleBN ? guide.titleBN : guide.title;
          const displayExcerpt = selectedLanguage === 'bn' && guide.excerptBN ? guide.excerptBN : guide.excerpt;

          return (
            <article
              key={guide.id}
              className="bg-white border border-pink-100 hover:border-[#E91E8C]/40 rounded-2xl overflow-hidden transition shadow-xs hover:shadow-md flex flex-col justify-between group"
            >
              <div>
                <div className="relative aspect-[16/9] overflow-hidden bg-pink-50">
                  <img
                    src={guide.heroImage}
                    alt={guide.imageAltText || guide.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
                    <Clock size={11} />
                    <span>{guide.readingTimeMinutes} min read</span>
                  </div>
                </div>

                <div className="p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 font-semibold">
                    <span>{guide.category.toUpperCase().replace('_', ' ')}</span>
                    <span aria-hidden="true">·</span>
                    <span>{new Date(guide.publishedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>

                  <h2 className="text-base font-extrabold text-gray-900 group-hover:text-[#E91E8C] transition leading-snug line-clamp-2">
                    <Link to={`/guide/${guide.slug}`}>
                      {displayTitle}
                    </Link>
                  </h2>

                  <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed font-medium">
                    {displayExcerpt}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <Link
                  to={`/guide/${guide.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E91E8C] hover:text-[#d0177c] transition pt-3 border-t border-pink-50 w-full justify-between"
                >
                  <span>{selectedLanguage === 'en' ? 'Read Complete Guide' : 'সম্পূর্ণ গাইড পড়ুন'}</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};
