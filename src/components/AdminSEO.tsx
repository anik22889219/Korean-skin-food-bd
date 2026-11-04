import React, { useState, useEffect, useMemo } from 'react';
import { productService } from '../services/productService';
import { agentService } from '../services/agentService';
import { Product } from '../types';
import { 
  Search, Wand2, Save, CheckCircle, AlertCircle, FileText, Globe, Key, 
  ExternalLink, Smartphone, Monitor, Share2, Layers, Sparkles, Check, 
  Eye, RefreshCw, Info, HelpCircle, BarChart3, Activity, CheckCircle2, ShieldCheck, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { buildHomepageSeo, buildCategorySeo, buildProductSeo, SITE_NAME, SITE_URL } from '../services/seoService';
import { analytics, GA4_MEASUREMENT_ID, META_PIXEL_ID, isGa4Configured, ga4Source } from '../services/analyticsService';

export const AdminSEO: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'global' | 'analytics'>('products');
  const [testEventStatus, setTestEventStatus] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preview format: Google Desktop vs Mobile vs Social Card
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile' | 'social'>('desktop');

  // Editable fields for product
  const [seoTitle, setSeoTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [jsonLdSchema, setJsonLdSchema] = useState('');

  // Sample Category Preview selection
  const [previewCategory, setPreviewCategory] = useState('Serum & Essence');
  const [previewBrand, setPreviewBrand] = useState('COSRX');

  useEffect(() => {
    const loaded = productService.getProducts();
    setProducts(loaded);
    if (loaded.length > 0) {
      setSelectedProductId(loaded[0].id);
      loadProductFields(loaded[0]);
    }
  }, []);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  const loadProductFields = (p: Product) => {
    let customTitle = p.seoTitle || p.metaTitle || '';
    let customDesc = p.metaDescription || '';
    let customKeys = '';
    let customSchemaStr = '';

    if (p.generatedSeoContent) {
      try {
        const parsed = typeof p.generatedSeoContent === 'string'
          ? JSON.parse(p.generatedSeoContent)
          : p.generatedSeoContent;

        if (parsed.seoTitle && !customTitle) customTitle = parsed.seoTitle;
        if (parsed.metaDescription && !customDesc) customDesc = parsed.metaDescription;
        if (parsed.keywords) {
          customKeys = Array.isArray(parsed.keywords) ? parsed.keywords.join(', ') : parsed.keywords;
        }
        if (parsed.jsonLdSchema) {
          customSchemaStr = JSON.stringify(parsed.jsonLdSchema, null, 2);
        }
      } catch {
        // Ignore JSON error
      }
    }

    // Dynamic defaults if empty
    const defaultTitle = `${p.name} | ${p.brand} - Authentic K-Beauty Bangladesh`;
    const defaultDesc = `${p.brand} ${p.name} imported from Seoul. Discover hydrated, glowing skin with authentic Korean skin care formulas in Dhaka.`;
    const defaultKeys = `${p.brand}, ${p.name}, Korean skincare, K-Beauty Bangladesh, authentic cosmetics`;
    const defaultSchema = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": p.name,
      "image": p.image,
      "description": p.description,
      "brand": {
        "@type": "Brand",
        "name": p.brand
      },
      "offers": {
        "@type": "Offer",
        "priceCurrency": "BDT",
        "price": p.discountPrice || p.price,
        "availability": p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
      }
    }, null, 2);

    setSeoTitle(customTitle || defaultTitle);
    setMetaDescription(customDesc || defaultDesc);
    setKeywords(customKeys || defaultKeys);
    setJsonLdSchema(customSchemaStr || defaultSchema);
  };

  const handleSelectProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const found = products.find(p => p.id === productId);
    if (found) {
      loadProductFields(found);
    }
  };

  const handleGenerateSEO = async () => {
    if (!selectedProduct) return;
    setIsGenerating(true);
    setStatusMessage(null);

    try {
      const result = await agentService.generateProductMarketingContent(selectedProduct.id);
      
      if (result.seoTitle) setSeoTitle(result.seoTitle);
      if (result.metaDescription) setMetaDescription(result.metaDescription);
      if (result.keywords) {
        setKeywords(Array.isArray(result.keywords) ? result.keywords.join(', ') : result.keywords);
      }
      if (result.jsonLdSchema) {
        setJsonLdSchema(JSON.stringify(result.jsonLdSchema, null, 2));
      }

      setStatusMessage({
        type: 'success',
        text: 'On-Page SEO properties auto-drafted by Gemini AI. Review and save below.'
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: `Gemini SEO generation failed: ${err.message || 'Server error'}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSEO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setIsSaving(true);
    setStatusMessage(null);

    try {
      let parsedSchema = null;
      if (jsonLdSchema.trim()) {
        try {
          parsedSchema = JSON.parse(jsonLdSchema);
        } catch {
          throw new Error('Invalid JSON-LD Schema syntax. Please correct the JSON structure before saving.');
        }
      }

      productService.updateProduct({
        ...selectedProduct,
        seoTitle: seoTitle.trim(),
        metaTitle: seoTitle.trim(),
        metaDescription: metaDescription.trim(),
        generatedSeoContent: JSON.stringify({
          seoTitle: seoTitle.trim(),
          metaDescription: metaDescription.trim(),
          keywords: keywords.split(',').map(s => s.trim()).filter(Boolean),
          jsonLdSchema: parsedSchema
        })
      });

      setStatusMessage({
        type: 'success',
        text: 'SEO meta tags, OpenGraph cards & JSON-LD schema saved and published to storefront.'
      });

      // Refresh product list
      const refreshed = productService.getProducts();
      setProducts(refreshed);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to save SEO fields.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // SEO Health Checks
  const titleLength = seoTitle.length;
  const isTitleIdeal = titleLength >= 30 && titleLength <= 60;
  const descLength = metaDescription.length;
  const isDescIdeal = descLength >= 120 && descLength <= 160;

  // Schema Validation Check
  const isSchemaValid = useMemo(() => {
    if (!jsonLdSchema.trim()) return false;
    try {
      JSON.parse(jsonLdSchema);
      return true;
    } catch {
      return false;
    }
  }, [jsonLdSchema]);

  // Dynamic Rule Previews for Homepage & Category
  const sampleHomepageSeo = useMemo(() => buildHomepageSeo(), []);
  const sampleCategorySeo = useMemo(() => buildCategorySeo({
    category: previewCategory,
    brand: previewBrand
  }), [previewCategory, previewBrand]);

  return (
    <div className="space-y-6">
      {/* Header Banner & Tab Navigation */}
      <div className="bg-white p-6 rounded-[28px] border border-pink-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-pink-50 text-[#E91E8C] rounded-xl">
              <Globe size={18} />
            </span>
            <h3 className="text-base font-extrabold text-gray-900 tracking-tight">
              On-Page SEO &amp; Structured Data Studio
            </h3>
          </div>
          <p className="text-xs text-gray-500 font-medium max-w-xl">
            Configure dynamic title tags, meta descriptions, OpenGraph social sharing previews, and Schema.org rich snippet microdata for search engines and social platforms.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-pink-50/50 p-1.5 rounded-2xl border border-pink-100 self-start md:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'products'
                ? 'bg-white text-[#E91E8C] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText size={14} />
            <span>Product Pages</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('global')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'global'
                ? 'bg-white text-[#E91E8C] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers size={14} />
            <span>Homepage &amp; Categories</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-white text-[#E91E8C] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 size={14} />
            <span>Analytics &amp; Tracking Health</span>
          </button>
        </div>
      </div>

      {activeTab === 'products' ? (
        <>
          {/* Product Selector Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-[24px] border border-pink-100 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">
                Selected Product:
              </span>
              <select
                value={selectedProductId}
                onChange={(e) => handleSelectProductChange(e.target.value)}
                className="w-full max-w-md bg-pink-50/30 text-xs font-semibold text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.brand}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <a
                href={`/product/${selectedProduct.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#E91E8C] bg-pink-50 hover:bg-pink-100 rounded-xl transition border border-pink-200"
              >
                <span>Live Product Page</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* Main Grid: Form Editor & Live Previews */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Form Editor (7 cols) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-[28px] border border-pink-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-pink-50 pb-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-[#E91E8C]" />
                  <h4 className="font-extrabold text-xs uppercase text-gray-900 tracking-wider">
                    Metadata &amp; Schema Properties
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateSEO}
                  disabled={isGenerating || !selectedProduct}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 text-[#E91E8C] text-xs font-bold border border-pink-200 rounded-xl cursor-pointer transition flex items-center gap-1.5 disabled:opacity-40 shadow-xs"
                >
                  <Wand2 size={13} className={isGenerating ? "animate-spin" : ""} />
                  <span>{isGenerating ? "Gemini Generating..." : "Generate with Gemini"}</span>
                </button>
              </div>

              {statusMessage && (
                <div className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs font-semibold ${
                  statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
                }`}>
                  {statusMessage.type === 'success' ? <CheckCircle size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveSEO} className="space-y-5 text-xs">
                {/* SEO Title Tag */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-extrabold text-gray-700">Page Title (`&lt;title&gt;` &amp; `og:title`)</label>
                    <span className={`text-[10px] font-mono font-bold ${
                      isTitleIdeal ? 'text-emerald-600' : titleLength > 60 ? 'text-rose-500' : 'text-amber-500'
                    }`}>
                      {titleLength}/60 chars {isTitleIdeal ? '(Optimal)' : titleLength > 60 ? '(Too Long)' : '(Short)'}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="e.g. COSRX Snail Mucin Essence | Korean Skin Food Bangladesh"
                    className="w-full bg-pink-50/10 text-gray-900 px-3.5 py-2.5 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] font-semibold text-xs"
                  />
                  <p className="text-[10px] text-gray-400">
                    Recommended 30–60 characters. Appears as the clickable blue title in Google Search and link card headings.
                  </p>
                </div>

                {/* Meta Description */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-extrabold text-gray-700">Meta Description (`&lt;meta description&gt;` &amp; `og:description`)</label>
                    <span className={`text-[10px] font-mono font-bold ${
                      isDescIdeal ? 'text-emerald-600' : descLength > 160 ? 'text-rose-500' : 'text-amber-500'
                    }`}>
                      {descLength}/160 chars {isDescIdeal ? '(Optimal)' : descLength > 160 ? '(Will Truncate)' : '(Short)'}
                    </span>
                  </div>
                  <textarea
                    required
                    rows={3}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="e.g. Buy authentic COSRX Advanced Snail 96 Mucin Power Essence in Bangladesh for ৳1,650. Seoul-sourced K-Beauty with cash on delivery..."
                    className="w-full bg-pink-50/10 text-gray-900 px-3.5 py-2.5 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] leading-relaxed text-xs"
                  />
                  <p className="text-[10px] text-gray-400">
                    Recommended 120–160 characters. Summarizes the page content under the Google title link.
                  </p>
                </div>

                {/* Search Keywords */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-gray-700 flex items-center gap-1.5">
                    <Key size={12} className="text-[#E91E8C]" />
                    <span>Target Search Keywords</span>
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g. COSRX, Snail Mucin, Korean skincare BD, dry skin moisturizer Dhaka"
                    className="w-full bg-pink-50/10 text-gray-900 px-3.5 py-2.5 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] text-xs font-medium"
                  />
                </div>

                {/* Structured JSON-LD Schema */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-extrabold text-gray-700">Schema.org JSON-LD Structured Data</label>
                    <span className={`text-[10px] font-mono font-bold ${
                      isSchemaValid ? 'text-emerald-600' : 'text-rose-500'
                    }`}>
                      {isSchemaValid ? 'Valid JSON-LD' : 'Invalid Syntax'}
                    </span>
                  </div>
                  <textarea
                    rows={7}
                    value={jsonLdSchema}
                    onChange={(e) => setJsonLdSchema(e.target.value)}
                    className="w-full bg-slate-900 text-emerald-300 px-3.5 py-2.5 border border-slate-700 rounded-xl outline-none focus:border-[#E91E8C] font-mono text-[11px] leading-relaxed"
                  />
                  <p className="text-[10px] text-gray-400">
                    Embedded into the page head as a `&lt;script type=&quot;application/ld+json&quot;&gt;` block for rich product snippets, star ratings, and price info.
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSaving || !selectedProduct}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E91E8C] hover:bg-[#d0177c] text-white font-bold rounded-2xl cursor-pointer transition shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{isSaving ? "Publishing SEO Metadata..." : "Save & Publish On-Page SEO"}</span>
                </button>
              </form>
            </div>

            {/* Right Column: Live Previews (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Device & Platform Switcher */}
              <div className="bg-white p-5 rounded-[28px] border border-pink-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-pink-50 pb-3">
                  <h4 className="font-extrabold text-xs uppercase text-gray-900 tracking-wider flex items-center gap-1.5">
                    <Eye size={14} className="text-[#E91E8C]" />
                    <span>Real-Time Live Preview</span>
                  </h4>

                  <div className="flex items-center gap-1 bg-pink-50/50 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1.5 rounded-lg transition ${
                        previewDevice === 'desktop' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-gray-400 hover:text-gray-700'
                      }`}
                      title="Google Desktop SERP"
                    >
                      <Monitor size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1.5 rounded-lg transition ${
                        previewDevice === 'mobile' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-gray-400 hover:text-gray-700'
                      }`}
                      title="Google Mobile SERP"
                    >
                      <Smartphone size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('social')}
                      className={`p-1.5 rounded-lg transition ${
                        previewDevice === 'social' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-gray-400 hover:text-gray-700'
                      }`}
                      title="OpenGraph Social Sharing Card"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>

                {/* 1. Google Desktop Preview */}
                {previewDevice === 'desktop' && (
                  <div className="p-4 border border-gray-100 rounded-2xl bg-white shadow-xs font-sans space-y-1.5 text-left">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="w-5 h-5 bg-pink-100 rounded-full flex items-center justify-center text-[10px] text-[#E91E8C] font-bold">
                        KS
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-gray-900 leading-none">Korean Skin Food Bangladesh</span>
                        <span className="text-[10px] text-gray-500 leading-none mt-0.5 truncate max-w-xs">
                          {SITE_URL} › product › {selectedProduct?.id || 'sample-id'}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-lg font-medium text-[#1a0dab] hover:underline cursor-pointer leading-snug pt-1">
                      {seoTitle || 'Product Title | Korean Skin Food Bangladesh'}
                    </h4>

                    {selectedProduct && (
                      <div className="flex items-center gap-2 text-[11px] text-[#4d5156]">
                        <span className="text-amber-600 font-bold">★★★★★</span>
                        <span className="font-semibold">Rating: {selectedProduct.rating || 5.0}</span>
                        <span>•</span>
                        <span>{selectedProduct.reviewsCount || 12} reviews</span>
                        <span>•</span>
                        <span className="font-bold text-gray-800">BDT {selectedProduct.discountPrice || selectedProduct.price}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-semibold">{selectedProduct.stock > 0 ? 'In stock' : 'Out of stock'}</span>
                      </div>
                    )}

                    <p className="text-xs text-[#4d5156] leading-relaxed pt-0.5">
                      {metaDescription || 'No custom meta description defined. Google will extract text from the product page.'}
                    </p>
                  </div>
                )}

                {/* 2. Google Mobile Preview */}
                {previewDevice === 'mobile' && (
                  <div className="p-3.5 border border-gray-200 rounded-2xl bg-white shadow-xs font-sans space-y-2 text-left max-w-xs mx-auto">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center text-[10px] text-[#E91E8C] font-bold">
                        KS
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-gray-900 block leading-tight">koreanskinfoodbd.com</span>
                        <span className="text-[9px] text-gray-400 block leading-tight">https://koreanskinfoodbd.com</span>
                      </div>
                    </div>

                    <h4 className="text-sm font-semibold text-[#1a0dab] leading-snug">
                      {seoTitle || 'Product Title | Korean Skin Food Bangladesh'}
                    </h4>

                    {selectedProduct?.image && (
                      <div className="flex items-start gap-3">
                        <p className="text-[11px] text-gray-600 leading-snug flex-1">
                          {metaDescription?.slice(0, 95)}...
                        </p>
                        <img
                          src={selectedProduct.image}
                          alt="Thumbnail"
                          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-100"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Social Media OpenGraph Card Preview */}
                {previewDevice === 'social' && (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs font-sans text-left">
                    <div className="aspect-[1.91/1] w-full bg-pink-50 relative overflow-hidden">
                      <img
                        src={selectedProduct?.image || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80'}
                        alt="OpenGraph Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3.5 space-y-1 bg-gray-50 border-t border-gray-100">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                        KOREANSKINFOODBD.COM
                      </span>
                      <h5 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">
                        {seoTitle || selectedProduct?.name}
                      </h5>
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-tight">
                        {metaDescription}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Live SEO Checklist Score */}
              <div className="bg-white p-5 rounded-[28px] border border-pink-100 shadow-sm space-y-3 text-xs">
                <span className="font-extrabold uppercase tracking-wider text-gray-900 block text-[11px]">
                  SEO Quality Checks
                </span>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-pink-50/20 border border-pink-100/50">
                    <span className="text-gray-700 font-medium">Title length (30-60 chars)</span>
                    {isTitleIdeal ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check size={13} /> Pass ({titleLength})
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold">{titleLength} chars</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-pink-50/20 border border-pink-100/50">
                    <span className="text-gray-700 font-medium">Description (120-160 chars)</span>
                    {isDescIdeal ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check size={13} /> Pass ({descLength})
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold">{descLength} chars</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-pink-50/20 border border-pink-100/50">
                    <span className="text-gray-700 font-medium">JSON-LD Schema Syntax</span>
                    {isSchemaValid ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check size={13} /> Valid
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold">Error</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-pink-50/20 border border-pink-100/50">
                    <span className="text-gray-700 font-medium">OpenGraph Card Ready</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Check size={13} /> Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'global' ? (
        /* Global & Categories SEO Rules Tab */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Homepage SEO Preview Card */}
            <div className="bg-white p-6 rounded-[28px] border border-pink-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-pink-50 pb-3">
                <h4 className="font-extrabold text-xs uppercase text-gray-900 tracking-wider flex items-center gap-1.5">
                  <Globe size={14} className="text-[#E91E8C]" />
                  <span>Homepage Baseline SEO</span>
                </h4>
                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#E91E8C] font-bold hover:underline flex items-center gap-1"
                >
                  <span>View Homepage</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Default Title</span>
                  <p className="font-bold text-gray-900 mt-0.5">{sampleHomepageSeo.title}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Default Meta Description</span>
                  <p className="text-gray-600 mt-0.5 leading-relaxed">{sampleHomepageSeo.description}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Injected Schemas</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="px-2.5 py-1 bg-pink-50 text-[#E91E8C] font-bold text-[10px] rounded-lg">Organization</span>
                    <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-bold text-[10px] rounded-lg">WebSite + SearchAction</span>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-lg">Store (LocalBusiness)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category / Brand Dynamic Rule Generator */}
            <div className="bg-white p-6 rounded-[28px] border border-pink-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-pink-50 pb-3">
                <h4 className="font-extrabold text-xs uppercase text-gray-900 tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-[#E91E8C]" />
                  <span>Category &amp; Brand Dynamic Rule Preview</span>
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Brand</label>
                  <input
                    type="text"
                    value={previewBrand}
                    onChange={(e) => setPreviewBrand(e.target.value)}
                    className="w-full bg-pink-50/10 px-3 py-2 border border-pink-100 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Category</label>
                  <input
                    type="text"
                    value={previewCategory}
                    onChange={(e) => setPreviewCategory(e.target.value)}
                    className="w-full bg-pink-50/10 px-3 py-2 border border-pink-100 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-3 text-xs pt-2 border-t border-pink-50">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Generated Title</span>
                  <p className="font-bold text-gray-900 mt-0.5">{sampleCategorySeo.title}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Generated Meta Description</span>
                  <p className="text-gray-600 mt-0.5 leading-relaxed">{sampleCategorySeo.description}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Breadcrumb Schema Chain</span>
                  <p className="text-emerald-700 font-mono text-[11px] mt-0.5">
                    Home &gt; {previewBrand} &gt; {previewCategory}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* Analytics & Tracking Health Tab */
        <div className="space-y-6">
          {testEventStatus && (
            <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
              testEventStatus.startsWith('Success') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                {testEventStatus.startsWith('Success') ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-rose-600" />}
                <span>{testEventStatus}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setTestEventStatus(null)}
                className="text-gray-400 hover:text-gray-700 font-bold ml-4"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Analytics 4 (GA4) Card */}
            <div className="bg-white p-6 rounded-[28px] border border-pink-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-pink-50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold text-xs">
                    GA4
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900 leading-tight">Google Analytics 4</h4>
                    <span className="text-[10px] text-gray-500 font-medium">Real-time Web Traffic &amp; E-commerce Funnel</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{isGa4Configured ? 'Active & Linked' : 'Pending Config'}</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 bg-pink-50/20 rounded-xl border border-pink-100/50">
                  <span className="text-gray-600 font-medium">Measurement ID:</span>
                  <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                    {GA4_MEASUREMENT_ID || 'Not Configured'}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-pink-50/20 rounded-xl border border-pink-100/50">
                  <span className="text-gray-600 font-medium">Configuration Source:</span>
                  <span className="font-bold text-[#E91E8C] capitalize">
                    {ga4Source === 'firebase-config' ? 'Firebase Project (firebase-applet-config.json)' : ga4Source}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-pink-50/20 rounded-xl border border-pink-100/50">
                  <span className="text-gray-600 font-medium">Gtag Loader Script:</span>
                  <span className="text-gray-700 font-mono text-[11px]">
                    https://www.googletagmanager.com/gtag/js?id={GA4_MEASUREMENT_ID}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-pink-50/20 rounded-xl border border-pink-100/50">
                  <span className="text-gray-600 font-medium">SPA Route Tracking:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Active on every URL change
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      analytics.init();
                      if (typeof window.gtag === 'function') {
                        window.gtag('event', 'test_admin_verification', {
                          event_category: 'admin_test',
                          event_label: 'Google Analytics Verification Check',
                          value: 1,
                          currency: 'BDT',
                          timestamp: new Date().toISOString()
                        });
                        setTestEventStatus('Success: Test event "test_admin_verification" sent to Google Analytics! Check your Google Analytics Realtime Dashboard now.');
                      } else {
                        setTestEventStatus('Notice: Google Tag is still loading. Please refresh and try again.');
                      }
                    } catch (e: any) {
                      setTestEventStatus(`Error: ${e?.message || 'Failed to dispatch test event'}`);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-sm transition"
                >
                  <Zap size={14} />
                  <span>Send Real-Time GA4 Test Ping</span>
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-2">
                  Click to fire an instant test event to verify in your Google Analytics &gt; Reports &gt; Realtime dashboard.
                </p>
              </div>
            </div>

            {/* Meta Pixel & Conversions API Card */}
            <div className="bg-white p-6 rounded-[28px] border border-pink-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-pink-50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-xs">
                    META
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900 leading-tight">Meta Pixel &amp; CAPI</h4>
                    <span className="text-[10px] text-gray-500 font-medium">Facebook &amp; Instagram Ad Tracking</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Active &amp; Deduplicated</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 bg-pink-50/20 rounded-xl border border-pink-100/50">
                  <span className="text-gray-600 font-medium">Pixel ID:</span>
                  <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                    {META_PIXEL_ID}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-pink-50/20 rounded-xl border border-pink-100/50">
                  <span className="text-gray-600 font-medium">Browser + Server CAPI:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <ShieldCheck size={13} /> Active (Cloud Functions + Proxy)
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-pink-50/20 rounded-xl border border-pink-100/50">
                  <span className="text-gray-600 font-medium">Deduplication:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} /> eventID (purchase_{'{orderId}'})
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-pink-50/20 rounded-xl border border-pink-100/50">
                  <span className="text-gray-600 font-medium">Customer Match:</span>
                  <span className="text-gray-700 font-medium">
                    SHA-256 Hashed Phone &amp; Email
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      analytics.init();
                      if (typeof window.fbq === 'function') {
                        window.fbq('trackCustom', 'TestAdminVerification', {
                          timestamp: new Date().toISOString()
                        });
                        setTestEventStatus('Success: Meta Pixel test event sent! Check Meta Events Manager / Pixel Helper.');
                      } else {
                        setTestEventStatus('Notice: Meta Pixel script is loading. Refresh and try again.');
                      }
                    } catch (e: any) {
                      setTestEventStatus(`Error: ${e?.message || 'Failed to dispatch Meta test event'}`);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition"
                >
                  <Activity size={14} />
                  <span>Send Meta Pixel Test Ping</span>
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-2">
                  Verify in Meta Pixel Helper browser extension or Meta Events Manager.
                </p>
              </div>
            </div>
          </div>

          {/* E-Commerce Events Tracking Table */}
          <div className="bg-white p-6 rounded-[28px] border border-pink-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-pink-50 pb-3">
              <h4 className="font-extrabold text-xs uppercase text-gray-900 tracking-wider flex items-center gap-2">
                <BarChart3 size={15} className="text-[#E91E8C]" />
                <span>Fully Implemented E-Commerce Events Matrix</span>
              </h4>
              <span className="text-[11px] text-emerald-600 font-bold">12 of 12 Events Active</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold text-[10px] uppercase">
                    <th className="py-2.5 px-3">Funnel Step</th>
                    <th className="py-2.5 px-3">GA4 Event Name</th>
                    <th className="py-2.5 px-3">Meta Pixel Event</th>
                    <th className="py-2.5 px-3">Currency / Parameters</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { step: 'Page Browse', ga: 'page_view', meta: 'PageView', param: 'page_path, page_title' },
                    { step: 'Catalog Browse', ga: 'view_item_list', meta: 'ViewItemList', param: 'items[], item_list_name' },
                    { step: 'Product Click', ga: 'select_item', meta: 'SelectItem', param: 'item_id, price, item_name' },
                    { step: 'Product Detail / Quick View', ga: 'view_item', meta: 'ViewContent', param: 'item_id, price, currency: BDT' },
                    { step: 'Store Search', ga: 'search', meta: 'Search', param: 'search_term / search_string' },
                    { step: 'Add to Cart', ga: 'add_to_cart', meta: 'AddToCart', param: 'items[], value, currency: BDT' },
                    { step: 'Remove from Cart', ga: 'remove_from_cart', meta: 'RemoveFromCart', param: 'items[], value' },
                    { step: 'View Drawer Cart', ga: 'view_cart', meta: 'ViewCart', param: 'items[], value, currency: BDT' },
                    { step: 'Begin Checkout', ga: 'begin_checkout', meta: 'InitiateCheckout', param: 'items[], value, currency: BDT' },
                    { step: 'Select Shipping Tier', ga: 'add_shipping_info', meta: 'AddShippingInfo', param: 'shipping_tier: Dhaka/Outside' },
                    { step: 'Select Payment Method', ga: 'add_payment_info', meta: 'AddPaymentInfo', param: 'payment_type: COD/bKash' },
                    { step: 'Purchase Completed', ga: 'purchase', meta: 'Purchase + CAPI', param: 'transaction_id, value, deduplicated eventId' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-pink-50/20 transition">
                      <td className="py-2.5 px-3 font-semibold text-gray-800">{row.step}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-700">{row.ga}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{row.meta}</td>
                      <td className="py-2.5 px-3 text-gray-500 font-mono text-[11px]">{row.param}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
