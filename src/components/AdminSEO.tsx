import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { agentService } from '../services/agentService';
import { Product } from '../types';
import { Search, Wand2, Save, CheckCircle, AlertCircle, FileText, Globe, Key } from 'lucide-react';
import { motion } from 'motion/react';

export const AdminSEO: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Editable fields
  const [seoTitle, setSeoTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [jsonLdSchema, setJsonLdSchema] = useState('');

  useEffect(() => {
    const loaded = productService.getProducts();
    setProducts(loaded);
    if (loaded.length > 0) {
      handleSelectProduct(loaded[0]);
    }
  }, []);

  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p);
    setSeoTitle((p as any).seoTitle || `${p.name} | Buy Authentic K-Beauty Bangladesh`);
    setMetaDescription((p as any).metaDescription || `${p.brand} ${p.name} imported from Seoul. Discover hydrated, glowing skin with authentic Korean skin care formulas in Dhaka.`);
    setKeywords((p as any).keywords || `${p.brand}, ${p.name}, Korean skincare, K-Beauty Bangladesh, authentic cosmetics`);
    setJsonLdSchema((p as any).jsonLdSchema ? JSON.stringify((p as any).jsonLdSchema, null, 2) : JSON.stringify({
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
    }, null, 2));
  };

  const handleGenerateSEO = async () => {
    if (!selectedProduct) return;
    setIsGenerating(true);
    setStatusMessage(null);

    try {
      const result = await agentService.generateProductMarketingContent(selectedProduct.id);
      
      // Update local fields immediately
      setSeoTitle(result.seoTitle || '');
      setMetaDescription(result.metaDescription || '');
      setKeywords(result.keywords || '');
      if (result.jsonLdSchema) {
        setJsonLdSchema(JSON.stringify(result.jsonLdSchema, null, 2));
      }

      setStatusMessage({
        type: 'success',
        text: 'SEO elements auto-drafted by Gemini. Review and click Save below to finalize.'
      });

      // Refresh product list from storage
      const refreshedProds = productService.getProducts();
      setProducts(refreshedProds);
      const currentRefreshed = refreshedProds.find(p => p.id === selectedProduct.id);
      if (currentRefreshed) {
        setSelectedProduct(currentRefreshed);
      }
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
      // Parse JSON Schema
      let parsedSchema = null;
      try {
        parsedSchema = JSON.parse(jsonLdSchema);
      } catch (err) {
        throw new Error('Invalid JSON-LD Schema syntax. Please correct the JSON structure.');
      }

      // Update in productService
      productService.updateProduct({
        ...selectedProduct,
        generatedSeoContent: JSON.stringify({
          seoTitle,
          metaDescription,
          keywords,
          jsonLdSchema: parsedSchema
        })
      });

      setStatusMessage({
        type: 'success',
        text: 'Skincare SEO meta properties successfully saved and deployed.'
      });

      // Refresh product list
      const refreshed = productService.getProducts();
      setProducts(refreshed);
      const current = refreshed.find(p => p.id === selectedProduct.id);
      if (current) {
        setSelectedProduct(current);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to save SEO fields.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector and Summary Card */}
      <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2 space-y-1">
          <h4 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Globe className="text-[#E91E8C]" size={16} />
            <span>AI Search Engine Optimization</span>
          </h4>
          <p className="text-xs text-gray-500">
            Select a cosmetic product and deploy high-visibility title tags, structured meta snippets, and micro-data schemas to index on Google and Bing.
          </p>
        </div>

        <div>
          <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Select Catalog Product</label>
          <select
            value={selectedProduct?.id || ''}
            onChange={(e) => {
              const found = products.find(p => p.id === e.target.value);
              if (found) handleSelectProduct(found);
            }}
            className="w-full bg-pink-50/10 text-xs text-gray-800 px-3 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>
                [{p.brand}] {p.name.slice(0, 35)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Form Editor */}
        <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-pink-50 pb-3">
            <h5 className="font-extrabold text-xs uppercase text-gray-800 flex items-center gap-1.5">
              <FileText size={14} className="text-[#E91E8C]" />
              <span>SEO Meta Elements</span>
            </h5>
            <button
              type="button"
              onClick={handleGenerateSEO}
              disabled={isGenerating || !selectedProduct}
              className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] text-[10px] font-bold border border-pink-200 rounded-lg cursor-pointer transition flex items-center gap-1 disabled:opacity-40"
            >
              <Wand2 size={11} className={isGenerating ? "animate-spin" : ""} />
              <span>{isGenerating ? "Gemini Drafting..." : "Draft with Gemini"}</span>
            </button>
          </div>

          {statusMessage && (
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs font-semibold ${
              statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle size={14} className="mt-0.5" /> : <AlertCircle size={14} className="mt-0.5" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveSEO} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block text-gray-500 font-bold">SEO Title Tag (Recomm. under 60 chars)</label>
              <input
                type="text"
                required
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                className="w-full bg-pink-50/5 text-gray-800 px-3.5 py-2.5 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] font-semibold"
              />
              <span className="text-[10px] text-gray-400 text-right block font-mono">{seoTitle.length} / 60 characters</span>
            </div>

            <div className="space-y-1">
              <label className="block text-gray-500 font-bold">Meta Description Snippet (Recomm. under 160 chars)</label>
              <textarea
                required
                rows={3}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="w-full bg-pink-50/5 text-gray-800 px-3.5 py-2.5 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] leading-relaxed"
              />
              <span className="text-[10px] text-gray-400 text-right block font-mono">{metaDescription.length} / 160 characters</span>
            </div>

            <div className="space-y-1">
              <label className="block text-gray-500 font-bold flex items-center gap-1">
                <Key size={11} className="text-[#E91E8C]" />
                <span>Search Keywords (comma-separated)</span>
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="eg. skincare, dry skin, k-beauty, dhaka"
                className="w-full bg-pink-50/5 text-gray-800 px-3.5 py-2.5 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-gray-500 font-bold">Structured JSON-LD Product Schema</label>
              <textarea
                rows={5}
                value={jsonLdSchema}
                onChange={(e) => setJsonLdSchema(e.target.value)}
                className="w-full bg-gray-50 text-gray-600 px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-400 font-mono text-[10px] leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving || !selectedProduct}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E91E8C] hover:bg-[#d0177c] text-white font-bold rounded-xl cursor-pointer transition shadow-sm"
            >
              <Save size={14} />
              <span>{isSaving ? "Saving Metadata..." : "Save SEO Properties"}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Google Live Snippet Preview */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm space-y-4">
            <h5 className="font-extrabold text-xs uppercase text-gray-800 flex items-center gap-1.5 border-b border-pink-50 pb-3">
              <Globe size={14} className="text-[#E91E8C]" />
              <span>Google SERP Preview (Desktop)</span>
            </h5>

            <div className="p-5 border border-gray-100 rounded-2xl bg-white shadow-sm font-sans space-y-1">
              {/* Google Header */}
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <div className="w-5 h-5 bg-pink-100 rounded-full flex items-center justify-center text-[10px] text-[#E91E8C] font-bold">KB</div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-gray-900 leading-none">Korean Skin Food BD</span>
                  <span className="text-[10px] text-gray-500 leading-none mt-0.5">https://koreanskinfoodbd.com › product › {selectedProduct?.id}</span>
                </div>
              </div>

              {/* Title link */}
              <h4 className="text-xl font-medium text-[#1a0dab] hover:underline cursor-pointer pt-1 leading-snug">
                {seoTitle || `${selectedProduct?.name} | Korean Skin Food`}
              </h4>

              {/* Description body */}
              <p className="text-sm text-[#4d5156] leading-relaxed pt-0.5">
                <span className="text-gray-500 font-medium font-mono text-[11px] mr-1.5">Rating: {selectedProduct?.rating} ★ - ‎{selectedProduct?.reviewsCount} reviews - </span>
                {metaDescription || "No custom meta snippet defined. Google will default to auto-extracting descriptive page strings."}
              </p>
            </div>
          </div>

          {/* Tips card */}
          <div className="bg-pink-50/15 p-5 rounded-[24px] border border-pink-100/50 space-y-3">
            <span className="text-xs font-bold text-[#E91E8C] uppercase tracking-wider block">SEO Optimization Tip</span>
            <p className="text-xs text-gray-600 leading-relaxed">
              Google ranks pages with proper <strong>JSON-LD schemas</strong> significantly higher. Incorporating product micro-data allows rich result elements (such as pricing badges, stock availability, and star reviews) to appear directly on Google searches.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
