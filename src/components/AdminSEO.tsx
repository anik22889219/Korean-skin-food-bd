import React, { useState, useEffect, useMemo } from 'react';
import { productService } from '../services/productService';
import { agentService } from '../services/agentService';
import { articleService } from '../services/articleService';
import { Product } from '../types';
import { SkincareGuide } from '../data/skincareGuides';
import { 
  Search, Wand2, Save, CheckCircle, AlertCircle, FileText, Globe, Key, 
  ExternalLink, Smartphone, Monitor, Share2, Layers, Sparkles, Check, 
  Eye, RefreshCw, Info, HelpCircle, BookOpen, AlertTriangle, ShieldCheck,
  CheckSquare, XCircle, Plus, Edit3, Image as ImageIcon, Link as LinkIcon, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  buildHomepageSeo, 
  buildCategorySeo, 
  buildProductSeo, 
  SITE_NAME, 
  SITE_URL,
  DEFAULT_HOMEPAGE_TITLE,
  DEFAULT_HOMEPAGE_DESCRIPTION,
  buildCanonicalUrl
} from '../services/seoService';

export const AdminSEO: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'guides' | 'global'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preview format: Google Desktop vs Mobile vs Social Card
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile' | 'social'>('desktop');

  // Editable fields for product
  const [seoTitle, setSeoTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [imageAltText, setImageAltText] = useState('');
  const [customCanonical, setCustomCanonical] = useState('');
  const [customOgImage, setCustomOgImage] = useState('');
  const [isNoIndex, setIsNoIndex] = useState(false);
  const [jsonLdSchema, setJsonLdSchema] = useState('');

  // Sample Category Preview selection
  const [previewCategory, setPreviewCategory] = useState('Serum & Essence');
  const [previewBrand, setPreviewBrand] = useState('COSRX');

  // Skincare Guides CMS State
  const [guides, setGuides] = useState<SkincareGuide[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<SkincareGuide | null>(null);
  const [isEditingGuide, setIsEditingGuide] = useState(false);
  const [guideFormData, setGuideFormData] = useState<Partial<SkincareGuide>>({});

  // Health Audit Filter
  const [healthFilter, setHealthFilter] = useState<'all' | 'errors' | 'warnings'>('all');

  useEffect(() => {
    const loaded = productService.getProducts();
    setProducts(loaded);
    if (loaded.length > 0) {
      setSelectedProductId(loaded[0].id);
      loadProductFields(loaded[0]);
    }

    const unsubGuides = articleService.subscribe(loadedGuides => {
      setGuides(loadedGuides);
    });
    return () => unsubGuides();
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
          customSchemaStr = typeof parsed.jsonLdSchema === 'string'
            ? parsed.jsonLdSchema
            : JSON.stringify(parsed.jsonLdSchema, null, 2);
        }
      } catch {
        // Ignore JSON error
      }
    }

    const sizeSuffix = p.ml && p.ml.trim() ? ` ${p.ml.trim()}` : '';
    const defaultTitle = `${p.name}${sizeSuffix} | Price in Bangladesh | Korean Skin Food BD`;
    const defaultDesc = `Discover ${p.name} at Korean Skin Food BD. Explore product details, ingredients, skin compatibility, directions for use, and current availability in Bangladesh.`;
    const defaultKeys = `${p.brand}, ${p.name}, Korean skincare Bangladesh, K-Beauty Dhaka`;
    const defaultSchema = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": p.name,
      "image": p.image,
      "description": p.description || defaultDesc,
      "sku": p.sku || p.barcode || p.id,
      "brand": {
        "@type": "Brand",
        "name": p.brand
      },
      "offers": {
        "@type": "Offer",
        "url": buildCanonicalUrl(`/product/${p.id}`),
        "priceCurrency": "BDT",
        "price": p.discountPrice || p.price,
        "availability": (p.stock ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "itemCondition": "https://schema.org/NewCondition"
      }
    }, null, 2);

    setSeoTitle(customTitle || defaultTitle);
    setMetaDescription(customDesc || defaultDesc);
    setKeywords(customKeys || defaultKeys);
    setImageAltText(p.imageAltText || p.altText || `${p.name} ${p.brand} - Authentic Korean Skincare in Bangladesh`);
    setCustomCanonical(buildCanonicalUrl(`/product/${p.id}`));
    setCustomOgImage(p.image || '');
    setIsNoIndex(!!p.noindex);
    setJsonLdSchema(customSchemaStr || defaultSchema);
  };

  const handleSelectProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const found = products.find(p => p.id === productId);
    if (found) {
      loadProductFields(found);
    }
  };

  // SEO Health Auditing & Analysis
  const auditAnalysis = useMemo(() => {
    let missingTitleCount = 0;
    let missingDescCount = 0;
    let missingAltCount = 0;
    let overlongTitleCount = 0;
    let overlongDescCount = 0;
    let duplicateTitleCount = 0;
    let invalidSchemaCount = 0;

    const seenTitles = new Map<string, string>();
    const auditIssues: Array<{
      productId: string;
      productName: string;
      brand: string;
      issue: string;
      severity: 'error' | 'warning';
      field: 'title' | 'description' | 'image' | 'schema';
    }> = [];

    products.forEach(p => {
      const title = (p.seoTitle || p.metaTitle || '').trim();
      const desc = (p.metaDescription || '').trim();
      const alt = (p.imageAltText || p.altText || '').trim();

      // Title Checks
      if (!title) {
        missingTitleCount++;
        auditIssues.push({
          productId: p.id,
          productName: p.name,
          brand: p.brand,
          issue: 'Missing custom SEO title (using dynamic fallback)',
          severity: 'warning',
          field: 'title'
        });
      } else if (title.length > 60) {
        overlongTitleCount++;
        auditIssues.push({
          productId: p.id,
          productName: p.name,
          brand: p.brand,
          issue: `Title exceeds 60 characters (${title.length} chars)`,
          severity: 'warning',
          field: 'title'
        });
      }

      if (title) {
        const lower = title.toLowerCase();
        if (seenTitles.has(lower)) {
          duplicateTitleCount++;
          auditIssues.push({
            productId: p.id,
            productName: p.name,
            brand: p.brand,
            issue: `Duplicate SEO title matching product ID "${seenTitles.get(lower)}"`,
            severity: 'error',
            field: 'title'
          });
        } else {
          seenTitles.set(lower, p.id);
        }
      }

      // Description Checks
      if (!desc) {
        missingDescCount++;
        auditIssues.push({
          productId: p.id,
          productName: p.name,
          brand: p.brand,
          issue: 'Missing custom meta description',
          severity: 'warning',
          field: 'description'
        });
      } else if (desc.length > 160) {
        overlongDescCount++;
        auditIssues.push({
          productId: p.id,
          productName: p.name,
          brand: p.brand,
          issue: `Description exceeds 160 characters (${desc.length} chars)`,
          severity: 'warning',
          field: 'description'
        });
      }

      // Alt Text Checks
      if (!alt) {
        missingAltCount++;
        auditIssues.push({
          productId: p.id,
          productName: p.name,
          brand: p.brand,
          issue: 'Missing descriptive image alt text for Image SEO',
          severity: 'warning',
          field: 'image'
        });
      }

      // Schema Checks
      if (p.generatedSeoContent) {
        try {
          const parsed = typeof p.generatedSeoContent === 'string' ? JSON.parse(p.generatedSeoContent) : p.generatedSeoContent;
          if (parsed.jsonLdSchema) {
            if (typeof parsed.jsonLdSchema === 'string') {
              JSON.parse(parsed.jsonLdSchema);
            }
          }
        } catch {
          invalidSchemaCount++;
          auditIssues.push({
            productId: p.id,
            productName: p.name,
            brand: p.brand,
            issue: 'Syntax error in custom Schema.org JSON-LD microdata',
            severity: 'error',
            field: 'schema'
          });
        }
      }
    });

    const filteredIssues = auditIssues.filter(item => {
      if (healthFilter === 'errors') return item.severity === 'error';
      if (healthFilter === 'warnings') return item.severity === 'warning';
      return true;
    });

    return {
      totalProducts: products.length,
      missingTitleCount,
      missingDescCount,
      missingAltCount,
      overlongTitleCount,
      overlongDescCount,
      duplicateTitleCount,
      invalidSchemaCount,
      sitemapCoverage: products.filter(p => !p.noindex).length,
      issues: filteredIssues,
      totalIssuesCount: auditIssues.length
    };
  }, [products, healthFilter]);

  const handleGenerateSEO = async () => {
    if (!selectedProduct) return;
    setIsGenerating(true);
    setStatusMessage(null);

    try {
      const result = await agentService.generateProductMarketingContent(selectedProduct.id);
      
      const sizeSuffix = selectedProduct.ml && selectedProduct.ml.trim() ? ` ${selectedProduct.ml.trim()}` : '';
      const promptTitle = `${selectedProduct.name}${sizeSuffix} | Price in Bangladesh | Korean Skin Food BD`;
      const promptDesc = `Discover ${selectedProduct.name} at Korean Skin Food BD. Explore product details, ingredients, skin compatibility, directions for use, and current availability in Bangladesh.`;

      setSeoTitle(result.seoTitle || promptTitle);
      setMetaDescription(result.metaDescription || promptDesc);
      if (result.keywords) {
        setKeywords(Array.isArray(result.keywords) ? result.keywords.join(', ') : result.keywords);
      }
      setImageAltText(`${selectedProduct.name} ${selectedProduct.brand} - Authentic Korean Skincare in Bangladesh`);

      setStatusMessage({
        type: 'success',
        text: 'On-Page SEO properties auto-generated with Google Search compliance guidelines. Review and save below.'
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: `Gemini SEO generation error: ${err.message || 'Server error'}`
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

      const updatedProduct: Product = {
        ...selectedProduct,
        seoTitle: seoTitle.trim(),
        metaTitle: seoTitle.trim(),
        metaDescription: metaDescription.trim(),
        imageAltText: imageAltText.trim(),
        altText: imageAltText.trim(),
        noindex: isNoIndex,
        generatedSeoContent: JSON.stringify({
          seoTitle: seoTitle.trim(),
          metaDescription: metaDescription.trim(),
          keywords: keywords.split(',').map(s => s.trim()).filter(Boolean),
          jsonLdSchema: parsedSchema,
          customCanonical: customCanonical.trim(),
          imageAltText: imageAltText.trim(),
          noindex: isNoIndex
        })
      };

      await productService.updateProduct(updatedProduct);

      setStatusMessage({
        type: 'success',
        text: 'SEO metadata, canonical URL, and Schema.org markup published to storefront and sitemap.'
      });

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

  // Skincare Guides CMS Handlers
  const handleEditGuide = (guide: SkincareGuide) => {
    setSelectedGuide(guide);
    setGuideFormData({ ...guide });
    setIsEditingGuide(true);
  };

  const handleNewGuide = () => {
    setSelectedGuide(null);
    setGuideFormData({
      id: `guide-${Date.now()}`,
      slug: '',
      title: '',
      titleBN: '',
      excerpt: '',
      excerptBN: '',
      category: 'routine',
      readingTimeMinutes: 5,
      publishedDate: new Date().toISOString(),
      heroImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80',
      imageAltText: 'Korean skincare routine guide in Bangladesh',
      targetSkinTypes: ['All Skin Types'],
      keyIngredients: ['Centella Asiatica', 'Hyaluronic Acid'],
      recommendedBrandSlugs: ['cosrx', 'beauty-of-joseon'],
      content: '### Guide Introduction\n\nEnter evidence-conscious skincare guidance here...',
      contentBN: '### নির্দেশিকা ভূমিকা\n\nএখানে বাংলায় ত্বকের যত্ন নির্দেশিকা লিখুন...',
      faqs: [{ question: 'How do I start?', answer: 'Follow our 4-step routine daily.' }],
      author: {
        name: 'Korean Skin Food BD Editorial Team',
        role: 'K-Beauty Cosmeceutical Research'
      }
    });
    setIsEditingGuide(true);
  };

  const handleSaveGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guideFormData.title || !guideFormData.slug) {
      alert('Title and Slug are required');
      return;
    }

    try {
      await articleService.saveArticle(guideFormData as SkincareGuide);
      setIsEditingGuide(false);
      setSelectedGuide(null);
      alert('Skincare Guide saved and published to sitemap.xml and live store!');
    } catch (err: any) {
      alert(`Failed to save guide: ${err.message}`);
    }
  };

  // SEO Health Length Checks
  const titleLength = seoTitle.length;
  const isTitleIdeal = titleLength >= 30 && titleLength <= 60;
  const descLength = metaDescription.length;
  const isDescIdeal = descLength >= 120 && descLength <= 160;

  const isSchemaValid = useMemo(() => {
    if (!jsonLdSchema.trim()) return false;
    try {
      JSON.parse(jsonLdSchema);
      return true;
    } catch {
      return false;
    }
  }, [jsonLdSchema]);

  const sampleHomepageSeo = useMemo(() => buildHomepageSeo(), []);
  const sampleCategorySeo = useMemo(() => buildCategorySeo(previewCategory), [previewCategory]);

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
              Technical SEO Command Center &amp; Google Ranking Studio
            </h3>
          </div>
          <p className="text-xs text-gray-500 font-medium max-w-xl">
            Audit indexing health, manage on-page metadata, configure brand landing hubs, edit skincare routine guides, and inspect dynamic sitemap coverage.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-pink-50/50 p-1.5 rounded-2xl border border-pink-100 self-start md:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShieldCheck size={14} />
            <span>SEO Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'products' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText size={14} />
            <span>Product SEO</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guides')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'guides' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen size={14} />
            <span>Skincare Guides CMS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('global')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'global' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers size={14} />
            <span>Sitemap &amp; Brand Hubs</span>
          </button>
        </div>
      </div>

      {/* 1. OVERVIEW & HEALTH AUDIT TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive SEO Health Scorecard */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Published Products</span>
              <span className="text-xl font-extrabold text-gray-900 font-mono tabular-nums">{auditAnalysis.totalProducts}</span>
              <span className="text-[10px] text-emerald-600 font-bold block">100% In Catalog</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Sitemap Coverage</span>
              <span className="text-xl font-extrabold text-[#E91E8C] font-mono tabular-nums">{auditAnalysis.sitemapCoverage}</span>
              <span className="text-[10px] text-gray-500 font-semibold block">In /sitemap.xml</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Missing SEO Titles</span>
              <span className={`text-xl font-extrabold font-mono tabular-nums ${auditAnalysis.missingTitleCount > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                {auditAnalysis.missingTitleCount}
              </span>
              <span className="text-[10px] text-gray-400 font-semibold block">Using dynamic fallback</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Missing Descriptions</span>
              <span className={`text-xl font-extrabold font-mono tabular-nums ${auditAnalysis.missingDescCount > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                {auditAnalysis.missingDescCount}
              </span>
              <span className="text-[10px] text-gray-400 font-semibold block">Needs customization</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Missing Image Alt</span>
              <span className={`text-xl font-extrabold font-mono tabular-nums ${auditAnalysis.missingAltCount > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                {auditAnalysis.missingAltCount}
              </span>
              <span className="text-[10px] text-gray-400 font-semibold block">Google Images SEO</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Duplicate Titles</span>
              <span className={`text-xl font-extrabold font-mono tabular-nums ${auditAnalysis.duplicateTitleCount > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                {auditAnalysis.duplicateTitleCount}
              </span>
              <span className="text-[10px] text-gray-400 font-semibold block">{auditAnalysis.duplicateTitleCount === 0 ? 'Zero Duplicates' : 'Cannibalization risk'}</span>
            </div>
          </div>

          {/* Quick Technical Links Bar */}
          <div className="bg-white p-4 rounded-2xl border border-pink-100 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
            <div className="flex items-center gap-3">
              <a
                href="/robots.txt"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-[#E91E8C] rounded-lg hover:bg-pink-100 transition"
              >
                <span>Live robots.txt</span>
                <ExternalLink size={12} />
              </a>
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-[#E91E8C] rounded-lg hover:bg-pink-100 transition"
              >
                <span>Live sitemap.xml</span>
                <ExternalLink size={12} />
              </a>
              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
              >
                <span>Google Search Console</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <span className="text-gray-400 text-[11px] font-mono">
              Verification Tag: GwiMlKnv8wLcjHMFH3GxOMi4h3eLpy2MX3ZXkzJUhXg
            </span>
          </div>

          {/* Real-Time SEO Issues Audit Table */}
          <div className="bg-white rounded-[28px] border border-pink-100 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pink-50 pb-4">
              <div>
                <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-[#E91E8C]" />
                  <span>Automated Catalog SEO Health Checker</span>
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Identifies titles, descriptions, and metadata issues that impede Google organic ranking and SERP click-through rates.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-pink-50/50 p-1 rounded-xl border border-pink-100 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setHealthFilter('all')}
                  className={`px-3 py-1 rounded-lg transition ${healthFilter === 'all' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-gray-500'}`}
                >
                  All ({auditAnalysis.totalIssuesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setHealthFilter('errors')}
                  className={`px-3 py-1 rounded-lg transition ${healthFilter === 'errors' ? 'bg-white text-rose-600 shadow-xs' : 'text-gray-500'}`}
                >
                  Errors
                </button>
                <button
                  type="button"
                  onClick={() => setHealthFilter('warnings')}
                  className={`px-3 py-1 rounded-lg transition ${healthFilter === 'warnings' ? 'bg-white text-amber-600 shadow-xs' : 'text-gray-500'}`}
                >
                  Warnings
                </button>
              </div>
            </div>

            {auditAnalysis.issues.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle size={32} className="text-emerald-500 mx-auto" />
                <h5 className="text-sm font-bold text-gray-900">Zero SEO Critical Issues Found</h5>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  All active product titles, descriptions, alt text, and schemas comply with Google Search optimization guidelines.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-pink-50 text-[10px] uppercase font-bold text-gray-400">
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Brand</th>
                      <th className="py-2.5 px-3">Detected Issue</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-50/60 font-medium">
                    {auditAnalysis.issues.slice(0, 30).map((issue, idx) => (
                      <tr key={idx} className="hover:bg-pink-50/20 transition-colors">
                        <td className="py-3 px-3 font-bold text-gray-900 max-w-xs truncate">
                          {issue.productName}
                        </td>
                        <td className="py-3 px-3 text-gray-600">{issue.brand}</td>
                        <td className="py-3 px-3 text-gray-700">{issue.issue}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            issue.severity === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {issue.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductId(issue.productId);
                              const p = products.find(x => x.id === issue.productId);
                              if (p) loadProductFields(p);
                              setActiveTab('products');
                            }}
                            className="text-[#E91E8C] hover:underline font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>Fix in Editor</span>
                            <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PRODUCT SEO STUDIO TAB */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Product Selector Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-[24px] border border-pink-100 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
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
                <span>View Live Product Page</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* Form Editor & Live SERP Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Form Editor (7 cols) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-[28px] border border-pink-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-pink-50 pb-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-[#E91E8C]" />
                  <h4 className="font-extrabold text-xs uppercase text-gray-900 tracking-wider">
                    Metadata &amp; Schema Editor
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateSEO}
                  disabled={isGenerating || !selectedProduct}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 text-[#E91E8C] text-xs font-bold border border-pink-200 rounded-xl cursor-pointer transition flex items-center gap-1.5 disabled:opacity-40 shadow-xs"
                >
                  <Wand2 size={13} className={isGenerating ? "animate-spin" : ""} />
                  <span>{isGenerating ? "Gemini Generating..." : "Generate with Gemini AI"}</span>
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

              <form onSubmit={handleSaveSEO} className="space-y-4 text-xs">
                {/* SEO Title Tag */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-extrabold text-gray-700">SEO Title (`&lt;title&gt;` &amp; `og:title`)</label>
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
                    placeholder="{Product Name} {Size} | Price in Bangladesh | Korean Skin Food BD"
                    className="w-full bg-pink-50/10 text-gray-900 px-3.5 py-2.5 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] font-semibold text-xs"
                  />
                  <p className="text-[10px] text-gray-400">
                    Format: {selectedProduct?.name} | Price in Bangladesh | Korean Skin Food BD
                  </p>
                </div>

                {/* Meta Description */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-extrabold text-gray-700">Meta Description</label>
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
                    placeholder="Discover {Product Name} at Korean Skin Food BD. Explore product details, ingredients, skin compatibility, directions for use, and current availability in Bangladesh."
                    className="w-full bg-pink-50/10 text-gray-900 px-3.5 py-2.5 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] leading-relaxed text-xs"
                  />
                </div>

                {/* Image Alt Text */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-gray-700 flex items-center gap-1.5">
                    <ImageIcon size={12} className="text-[#E91E8C]" />
                    <span>Product Image Alt Text (Image SEO)</span>
                  </label>
                  <input
                    type="text"
                    value={imageAltText}
                    onChange={(e) => setImageAltText(e.target.value)}
                    placeholder="Descriptive image alt text (e.g. Beauty of Joseon Relief Sun Rice Probiotics SPF50+ Korean sunscreen)"
                    className="w-full bg-pink-50/10 text-gray-900 px-3.5 py-2.5 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] text-xs font-medium"
                  />
                </div>

                {/* Target Keywords & Canonical */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-gray-700 flex items-center gap-1.5">
                      <Key size={12} className="text-[#E91E8C]" />
                      <span>Focus Keywords</span>
                    </label>
                    <input
                      type="text"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="e.g. Snail Mucin, Korean skincare BD"
                      className="w-full bg-pink-50/10 text-gray-900 px-3.5 py-2.5 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-extrabold text-gray-700 flex items-center gap-1.5">
                      <LinkIcon size={12} className="text-[#E91E8C]" />
                      <span>Canonical URL</span>
                    </label>
                    <input
                      type="text"
                      value={customCanonical}
                      onChange={(e) => setCustomCanonical(e.target.value)}
                      className="w-full bg-pink-50/10 text-gray-900 px-3.5 py-2.5 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Index / Noindex Toggle */}
                <div className="p-3 bg-pink-50/20 rounded-xl border border-pink-100 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-gray-800 block text-xs">Search Engine Indexability</span>
                    <p className="text-[10px] text-gray-500">Enable to allow Googlebot to index this product in Google Search and sitemap.xml.</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={!isNoIndex}
                      onChange={(e) => setIsNoIndex(!e.target.checked)}
                      className="accent-[#E91E8C] w-4 h-4 rounded cursor-pointer"
                    />
                    <span>{isNoIndex ? 'Noindex (Hidden from Search)' : 'Index, Follow (Public)'}</span>
                  </label>
                </div>

                {/* JSON-LD Schema */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-extrabold text-gray-700">Schema.org Product Microdata (JSON-LD)</label>
                    <span className={`text-[10px] font-mono font-bold ${
                      isSchemaValid ? 'text-emerald-600' : 'text-rose-500'
                    }`}>
                      {isSchemaValid ? 'Valid JSON-LD' : 'Invalid Syntax'}
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={jsonLdSchema}
                    onChange={(e) => setJsonLdSchema(e.target.value)}
                    className="w-full bg-slate-900 text-emerald-300 px-3.5 py-2.5 border border-slate-700 rounded-xl outline-none focus:border-[#E91E8C] font-mono text-[11px] leading-relaxed"
                  />
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

            {/* Live Previews Column (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-5 rounded-[28px] border border-pink-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-pink-50 pb-3">
                  <h4 className="font-extrabold text-xs uppercase text-gray-900 tracking-wider flex items-center gap-1.5">
                    <Eye size={14} className="text-[#E91E8C]" />
                    <span>Real-Time Google Snippet Preview</span>
                  </h4>

                  <div className="flex items-center gap-1 bg-pink-50/50 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1.5 rounded-lg transition ${previewDevice === 'desktop' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-gray-400'}`}
                      title="Google Desktop SERP"
                    >
                      <Monitor size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1.5 rounded-lg transition ${previewDevice === 'mobile' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-gray-400'}`}
                      title="Google Mobile SERP"
                    >
                      <Smartphone size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('social')}
                      className={`p-1.5 rounded-lg transition ${previewDevice === 'social' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-gray-400'}`}
                      title="OpenGraph Social Card"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Google Desktop Preview */}
                {previewDevice === 'desktop' && (
                  <div className="p-4 border border-gray-100 rounded-2xl bg-white shadow-xs font-sans space-y-1.5 text-left">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="w-5 h-5 bg-pink-100 rounded-full flex items-center justify-center text-[10px] text-[#E91E8C] font-bold">
                        KS
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-gray-900 leading-none">Korean Skin Food BD</span>
                        <span className="text-[10px] text-gray-500 leading-none mt-0.5 truncate max-w-xs font-mono">
                          {SITE_URL}/product/{selectedProduct?.id || 'sample-id'}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-lg font-medium text-[#1a0dab] hover:underline cursor-pointer leading-snug pt-1">
                      {seoTitle || 'Product Title | Price in Bangladesh | Korean Skin Food BD'}
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
                        <span className="text-emerald-700 font-semibold">{(selectedProduct.stock ?? 0) > 0 ? 'In stock' : 'Out of stock'}</span>
                      </div>
                    )}

                    <p className="text-xs text-[#4d5156] leading-relaxed pt-0.5">
                      {metaDescription}
                    </p>
                  </div>
                )}

                {/* Google Mobile Preview */}
                {previewDevice === 'mobile' && (
                  <div className="p-3.5 border border-gray-200 rounded-2xl bg-white shadow-xs font-sans space-y-2 text-left max-w-xs mx-auto">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center text-[10px] text-[#E91E8C] font-bold">
                        KS
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-gray-900 block leading-tight">koreanskinfood.web.app</span>
                        <span className="text-[9px] text-gray-400 block leading-tight">https://koreanskinfood.web.app/product/{selectedProduct?.id}</span>
                      </div>
                    </div>

                    <h4 className="text-sm font-semibold text-[#1a0dab] leading-snug">
                      {seoTitle}
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

                {/* OpenGraph Card Preview */}
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
                        KOREANSKINFOOD.WEB.APP
                      </span>
                      <h5 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">
                        {seoTitle}
                      </h5>
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-tight">
                        {metaDescription}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SKINCARE GUIDES CMS TAB */}
      {activeTab === 'guides' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[24px] border border-pink-100 shadow-sm">
            <div>
              <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <BookOpen size={16} className="text-[#E91E8C]" />
                <span>Skincare Knowledge Base &amp; Educational CMS</span>
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage high-ranking skincare routines, barrier guides, and ingredient articles with Article &amp; FAQ Schema.
              </p>
            </div>

            <button
              type="button"
              onClick={handleNewGuide}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E91E8C] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#d0177c] transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Create New Guide</span>
            </button>
          </div>

          {/* Guide Edit Modal / Drawer */}
          {isEditingGuide && (
            <div className="bg-white p-6 rounded-[28px] border-2 border-[#E91E8C]/20 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-pink-100 pb-3">
                <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <Edit3 size={15} className="text-[#E91E8C]" />
                  <span>{selectedGuide ? 'Edit Skincare Guide' : 'Draft New Skincare Guide'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditingGuide(false)}
                  className="text-xs text-gray-400 hover:text-gray-800 font-bold"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveGuide} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Guide Title (English)</label>
                    <input
                      type="text"
                      required
                      value={guideFormData.title || ''}
                      onChange={(e) => setGuideFormData({ ...guideFormData, title: e.target.value })}
                      className="w-full bg-pink-50/10 px-3.5 py-2.5 border border-pink-100 rounded-xl font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Title (বাংলা)</label>
                    <input
                      type="text"
                      value={guideFormData.titleBN || ''}
                      onChange={(e) => setGuideFormData({ ...guideFormData, titleBN: e.target.value })}
                      className="w-full bg-pink-50/10 px-3.5 py-2.5 border border-pink-100 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">URL Slug (`/guide/{guideFormData.slug || 'slug'}`)</label>
                    <input
                      type="text"
                      required
                      value={guideFormData.slug || ''}
                      onChange={(e) => setGuideFormData({ ...guideFormData, slug: e.target.value })}
                      className="w-full bg-pink-50/10 px-3.5 py-2.5 border border-pink-100 rounded-xl font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Category</label>
                    <select
                      value={guideFormData.category || 'routine'}
                      onChange={(e) => setGuideFormData({ ...guideFormData, category: e.target.value as any })}
                      className="w-full bg-pink-50/10 px-3.5 py-2.5 border border-pink-100 rounded-xl font-bold"
                    >
                      <option value="routine">Routines &amp; Steps</option>
                      <option value="sun_care">Sun Protection</option>
                      <option value="sensitive">Sensitive Skin</option>
                      <option value="acne">Acne &amp; Pores</option>
                      <option value="dry_skin">Dry &amp; Dehydrated Skin</option>
                      <option value="ingredients">Active Ingredients</option>
                      <option value="authentication">Authenticity Verification</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Summary Excerpt</label>
                  <textarea
                    rows={2}
                    value={guideFormData.excerpt || ''}
                    onChange={(e) => setGuideFormData({ ...guideFormData, excerpt: e.target.value })}
                    className="w-full bg-pink-50/10 px-3.5 py-2.5 border border-pink-100 rounded-xl leading-relaxed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">Full Content Markdown (English)</label>
                  <textarea
                    rows={6}
                    value={guideFormData.content || ''}
                    onChange={(e) => setGuideFormData({ ...guideFormData, content: e.target.value })}
                    className="w-full bg-slate-900 text-pink-200 px-3.5 py-2.5 border border-slate-700 rounded-xl font-mono text-xs leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingGuide(false)}
                    className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#E91E8C] text-white font-bold rounded-xl shadow-xs hover:bg-[#d0177c] transition"
                  >
                    Save &amp; Publish Guide
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Guides List Table */}
          <div className="bg-white rounded-[28px] border border-pink-100 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-pink-50 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Active Skincare Educational Articles ({guides.length})</span>
              <a
                href="/guides"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#E91E8C] hover:underline flex items-center gap-1"
              >
                <span>View Live Guides Hub</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-pink-50 text-[10px] uppercase font-bold text-gray-400 bg-pink-50/10">
                    <th className="py-2.5 px-4">Title</th>
                    <th className="py-2.5 px-3">Slug</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Read Time</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50/60 font-medium">
                  {guides.map(guide => (
                    <tr key={guide.id} className="hover:bg-pink-50/20 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900 max-w-sm truncate">
                        {guide.title}
                      </td>
                      <td className="py-3 px-3 text-gray-500 font-mono text-[11px] truncate max-w-xs">
                        /guide/{guide.slug}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-50 text-[#E91E8C] border border-pink-100">
                          {guide.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-500 font-mono">{guide.readingTimeMinutes}m</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEditGuide(guide)}
                          className="text-[#E91E8C] hover:underline font-bold text-xs"
                        >
                          Edit
                        </button>
                        <a
                          href={`/guide/${guide.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-400 hover:text-gray-700"
                        >
                          <ExternalLink size={12} className="inline ml-1" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. GLOBAL RULES, SITEMAP & BRAND HUBS TAB */}
      {activeTab === 'global' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Homepage Baseline SEO Card */}
            <div className="bg-white p-6 rounded-[28px] border border-pink-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-pink-50 pb-3">
                <h4 className="font-extrabold text-xs uppercase text-gray-900 tracking-wider flex items-center gap-1.5">
                  <Globe size={14} className="text-[#E91E8C]" />
                  <span>Homepage Baseline SEO Rule</span>
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
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Prescribed Title Tag</span>
                  <p className="font-bold text-gray-900 mt-0.5">{DEFAULT_HOMEPAGE_TITLE}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Prescribed Meta Description</span>
                  <p className="text-gray-600 mt-0.5 leading-relaxed">{DEFAULT_HOMEPAGE_DESCRIPTION}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Structured Data Entities</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="px-2.5 py-1 bg-pink-50 text-[#E91E8C] font-bold text-[10px] rounded-lg">OnlineStore (Organization)</span>
                    <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-bold text-[10px] rounded-lg">WebSite + SearchAction</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dedicated Brand Hubs & Sitemap Health */}
            <div className="bg-white p-6 rounded-[28px] border border-pink-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-pink-50 pb-3">
                <h4 className="font-extrabold text-xs uppercase text-gray-900 tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-[#E91E8C]" />
                  <span>Dedicated Brand Hubs &amp; Sitemap Status</span>
                </h4>
                <a
                  href="/brands"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#E91E8C] font-bold hover:underline flex items-center gap-1"
                >
                  <span>Brands Directory</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Active Brand URLs</span>
                  <p className="text-gray-700 mt-0.5">
                    COSRX (`/brand/cosrx`), Beauty of Joseon (`/brand/beauty-of-joseon`), SKIN1004 (`/brand/skin1004`), Anua (`/brand/anua`), Some By Mi (`/brand/some-by-mi`), Round Lab (`/brand/round-lab`).
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Sitemap XML Endpoint</span>
                  <p className="font-mono text-[11px] text-[#E91E8C] mt-0.5">
                    https://koreanskinfood.web.app/sitemap.xml
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Search Console Action Steps</span>
                  <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">
                    Submit `https://koreanskinfood.web.app/sitemap.xml` directly in Google Search Console under Sitemaps tab. The Google site verification meta tag `GwiMlKnv8wLcjHMFH3GxOMi4h3eLpy2MX3ZXkzJUhXg` is permanently embedded in `index.html`.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
