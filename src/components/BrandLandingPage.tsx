import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProducts } from '../hooks/queries/products';
import { BRAND_SEO_PROFILES, getBrandProfileBySlug, BrandSeoProfile } from '../data/brandProfiles';
import { getCanonicalBrandName, isSameBrand } from '../data/brands';
import { ProductCard } from './ProductCard';
import { SeoHead } from './SeoHead';
import { buildBrandSeo } from '../services/seoService';
import { ShieldCheck, ChevronRight, HelpCircle, ChevronDown, Sparkles, Package, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const BrandLandingPage: React.FC = () => {
  const { brandSlug = '' } = useParams<{ brandSlug: string }>();
  const { data: allProducts = [], isLoading } = useProducts();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Match brand profile or compose dynamic fallback
  const brandProfile: BrandSeoProfile = useMemo(() => {
    const matched = getBrandProfileBySlug(brandSlug);
    if (matched) return matched;

    // Fallback: derive name from slug
    const formattedName = brandSlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    const canonicalName = getCanonicalBrandName(formattedName) || formattedName;

    return {
      name: canonicalName,
      slug: brandSlug,
      countryOfOrigin: 'South Korea',
      city: 'Seoul',
      tagline: `Authentic ${canonicalName} Skincare in Bangladesh`,
      taglineBN: `বাংলাদেশে ১০০% আসল ${canonicalName} স্কিন কেয়ার`,
      description: `Explore authentic ${canonicalName} cosmeceuticals and skincare essentials imported directly from South Korea. Verified batch codes, manufacturer barcodes, and reliable delivery across Dhaka and all Bangladesh.`,
      descriptionBN: `দক্ষিণ কোরিয়া থেকে সরাসরি আমদানিকৃত আসল ${canonicalName} প্রডাক্ট। দ্রুত ডেলিভারি ও আসল পণ্যের নিশ্চয়তা।`,
      philosophy: 'Authentic Korean cosmeceutical formulation focused on gentle, effective skin barrier support.',
      keyIngredients: ['Centella Asiatica', 'Hyaluronic Acid', 'Niacinamide'],
      heroImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80',
      faqs: [
        {
          question: `Are ${canonicalName} products at Korean Skin Food BD authentic?`,
          answer: `Yes. Every ${canonicalName} item in our catalog is imported directly from authorized South Korean distribution channels in Seoul with verified barcodes and sealed manufacturer packaging.`
        },
        {
          question: `How fast is delivery for ${canonicalName} products across Bangladesh?`,
          answer: `We deliver within 24 to 48 hours in Dhaka with Cash on Delivery, and within 2 to 4 days across all 64 districts in Bangladesh.`
        }
      ]
    };
  }, [brandSlug]);

  // Filter products belonging to this brand
  const brandProducts = useMemo(() => {
    return allProducts.filter(p => isSameBrand(p.brand, brandProfile.name));
  }, [allProducts, brandProfile.name]);

  const seoMeta = useMemo(() => buildBrandSeo(brandProfile), [brandProfile]);

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 py-8 md:px-8 lg:px-12 space-y-12">
      <SeoHead metadata={seoMeta} />

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 font-medium" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-[#E91E8C] transition">Home</Link>
        <ChevronRight size={12} />
        <Link to="/brands" className="hover:text-[#E91E8C] transition">Brands</Link>
        <ChevronRight size={12} />
        <span className="text-[#E91E8C] font-extrabold">{brandProfile.name}</span>
      </nav>

      {/* Brand Hero Showcase */}
      <header className="relative bg-white border border-pink-100 rounded-[32px] p-6 sm:p-10 md:p-12 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-pink-100/40 via-purple-50/20 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              <ShieldCheck size={14} />
              <span>100% Authentic Korean Import</span>
            </span>
            <span className="flex items-center gap-1 text-gray-600">
              <MapPin size={13} className="text-[#E91E8C]" />
              <span>{brandProfile.city}, {brandProfile.countryOfOrigin}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-gray-600">
              <strong className="font-bold text-gray-900">{brandProducts.length}</strong> Products in Catalog
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight text-balance">
            {brandProfile.name} Bangladesh
          </h1>

          <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
            {brandProfile.description}
          </p>

          {/* Key Botanicals & Ingredients */}
          {brandProfile.keyIngredients && brandProfile.keyIngredients.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-gray-700">Signature Ingredients:</span>
              {brandProfile.keyIngredients.map((ing, i) => (
                <span key={i} className="text-gray-600 bg-pink-50/50 px-2.5 py-1 rounded-lg border border-pink-100/60 font-semibold">
                  {ing}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Brand Product Catalog Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pink-100/80 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package size={22} className="text-[#E91E8C]" />
              <span>Available {brandProfile.name} Products</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Genuine Seoul-imported formulas with cash on delivery across Bangladesh.
            </p>
          </div>
          <span className="text-xs font-bold text-gray-600 font-mono tabular-nums">
            Showing {brandProducts.length} {brandProducts.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white rounded-2xl h-80 animate-pulse border border-pink-50 p-4" />
            ))}
          </div>
        ) : brandProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {brandProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-pink-100 p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto text-[#E91E8C]">
              <Sparkles size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900">New Shipments Arriving Soon</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Current {brandProfile.name} inventory has sold out. Fresh authentic batches are currently in transit from Seoul.
              </p>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#E91E8C] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#d0177c] transition"
            >
              Browse All Korean Skincare
            </Link>
          </div>
        )}
      </section>

      {/* Brand FAQs Section */}
      {brandProfile.faqs && brandProfile.faqs.length > 0 && (
        <section className="bg-white border border-pink-100 rounded-[32px] p-6 sm:p-10 space-y-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle size={20} className="text-[#E91E8C]" />
              <span>Frequently Asked Questions about {brandProfile.name} in Bangladesh</span>
            </h2>
            <p className="text-xs text-gray-500">
              Key guidance on authenticity verification, suitable skin types, and delivery terms.
            </p>
          </div>

          <div className="space-y-3">
            {brandProfile.faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="border border-pink-100 rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-gray-900 hover:text-[#E91E8C] transition"
                  >
                    <span>{faq.question}</span>
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
                          {faq.answer}
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
    </div>
  );
};
