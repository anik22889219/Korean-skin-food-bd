import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../hooks/queries/products';
import { KOREAN_BRANDS, getBrandProductCounts, getUniqueBrandList } from '../data/brands';
import { BRAND_SEO_PROFILES } from '../data/brandProfiles';
import { SeoHead } from './SeoHead';
import { SITE_URL, buildCanonicalUrl, DEFAULT_OG_IMAGE } from '../services/seoService';
import { ShieldCheck, Search, ChevronRight, Sparkles, Building2, ExternalLink } from 'lucide-react';

export const BrandsIndexPage: React.FC = () => {
  const { data: products = [] } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');

  // Collect unique brand names
  const allBrands = useMemo(() => {
    return getUniqueBrandList(products);
  }, [products]);

  // Aggregate product counts per brand
  const brandCounts = useMemo(() => {
    return getBrandProductCounts(products);
  }, [products]);

  // Filtered brands
  const filteredBrands = useMemo(() => {
    if (!searchTerm.trim()) return allBrands;
    const term = searchTerm.toLowerCase().trim();
    return allBrands.filter(b => b.toLowerCase().includes(term));
  }, [allBrands, searchTerm]);

  // Featured flagship brands (those with curated SEO profiles)
  const featuredBrandKeys = Object.keys(BRAND_SEO_PROFILES);

  const seoMetadata = useMemo(() => {
    const canonicalUrl = buildCanonicalUrl('/brands');
    const title = 'Authentic Korean Skincare Brands in Bangladesh | Korean Skin Food BD';
    const description = 'Explore the complete directory of genuine Korean skincare and K-Beauty brands available in Bangladesh. COSRX, Beauty of Joseon, SKIN1004, Anua, Round Lab, and more.';

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
          name: 'Brands',
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
        'Korean Skincare Brands Bangladesh',
        'K-Beauty Brands Dhaka',
        'COSRX BD',
        'Beauty of Joseon Bangladesh',
        'SKIN1004 BD',
        'Authentic Korean cosmetics directory'
      ],
      ogType: 'website' as const,
      ogImage: DEFAULT_OG_IMAGE,
      ogImageAlt: 'Korean Skincare Brands in Bangladesh',
      twitterCard: 'summary_large_image' as const,
      jsonLd: [breadcrumbSchema, collectionSchema]
    };
  }, []);

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 py-8 md:px-8 lg:px-12 space-y-12">
      <SeoHead metadata={seoMetadata} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 font-medium" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-[#E91E8C] transition">Home</Link>
        <ChevronRight size={12} />
        <span className="text-[#E91E8C] font-extrabold">Brands</span>
      </nav>

      {/* Directory Header */}
      <header className="relative bg-white border border-pink-100 rounded-[32px] p-6 sm:p-10 shadow-sm overflow-hidden space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 w-fit">
          <ShieldCheck size={14} />
          <span>100% Guaranteed South Korean Imports</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Korean Skincare Brands in Bangladesh
        </h1>

        <p className="text-xs sm:text-sm text-gray-600 max-w-3xl leading-relaxed">
          Korean Skin Food BD is Bangladesh's dedicated sanctuary for genuine Korean beauty. Browse our authenticated brand partners imported straight from Seoul with manufacturer batch transparency.
        </p>

        {/* Search Input */}
        <div className="pt-2 max-w-md">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Korean brand (e.g. COSRX, SKIN1004, Anua)..."
              className="w-full pl-10 pr-4 py-2.5 bg-pink-50/30 text-xs font-semibold text-gray-800 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C] transition"
            />
          </div>
        </div>
      </header>

      {/* Featured Flagship Brands */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#E91E8C]" />
          <h2 className="text-lg font-extrabold text-gray-900">Featured K-Beauty Flagships</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {featuredBrandKeys.map(key => {
            const profile = BRAND_SEO_PROFILES[key];
            const count = brandCounts[profile.name.toLowerCase()] || 0;
            return (
              <Link
                key={key}
                to={`/brand/${profile.slug}`}
                className="group bg-white border border-pink-100 hover:border-[#E91E8C]/50 rounded-2xl p-6 transition shadow-xs hover:shadow-md flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-gray-900 group-hover:text-[#E91E8C] transition">
                      {profile.name}
                    </h3>
                    <span className="text-[11px] font-mono tabular-nums font-bold text-gray-500 bg-pink-50/60 px-2 py-0.5 rounded-md">
                      {count} {count === 1 ? 'Product' : 'Products'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed font-medium">
                    {profile.tagline}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-[#E91E8C] pt-2 border-t border-pink-50">
                  <span>Explore Brand Catalog</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Complete A-Z Brand Directory */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-pink-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-[#E91E8C]" />
            <h2 className="text-lg font-extrabold text-gray-900">Complete Brand Directory</h2>
          </div>
          <span className="text-xs text-gray-500 font-mono tabular-nums">
            {filteredBrands.length} brands listed
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredBrands.map(brandName => {
            const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const count = brandCounts[brandName.toLowerCase()] || 0;
            return (
              <Link
                key={brandName}
                to={`/brand/${slug}`}
                className="bg-white border border-pink-50 hover:border-pink-200 hover:bg-pink-50/20 rounded-xl p-3.5 transition group flex flex-col justify-between text-left"
              >
                <span className="text-xs font-bold text-gray-800 group-hover:text-[#E91E8C] truncate transition">
                  {brandName}
                </span>
                <span className="text-[10px] text-gray-400 font-mono mt-1">
                  {count > 0 ? `${count} available` : 'Direct Seoul Import'}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
};
