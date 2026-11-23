import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Share2,
  Smartphone,
  Sparkles,
  Trash2,
  Wand2,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/queries/products';
import { productService } from '../services/productService';
import { articleService } from '../services/articleService';
import {
  DiscoveredWebsitePage,
  discoverWebsitePages,
  pageSeoService,
} from '../services/pageSeoService';
import { buildCanonicalUrl, DEFAULT_OG_IMAGE } from '../services/seoService';
import { PageSeoConfig, PageSeoFaqItem, Product, SeoPageCategoryType } from '../types';
import { SkincareGuide } from '../data/skincareGuides';
import {
  analyzeProductLinkHealth,
  getProductPath,
  isCleanProductSlug,
  ProductLinkAuditItem,
  slugifyProductText,
  suggestProductSlug,
} from '../utils/productSlug';
import { encodeSeoPageDocId, normalizeSeoPath } from '../utils/seoPath';
import { getSiteHostname, getSiteUrl } from '../utils/siteUrl';
import { MediaLibraryModal } from './MediaLibraryModal';

type StudioMode = 'pages' | 'links';
type PageFilterType =
  | 'all'
  | 'customized'
  | 'issues'
  | SeoPageCategoryType;
type PreviewFormat = 'desktop' | 'mobile' | 'social' | 'faq';
type LinkFilterType = 'issues' | 'all';

const CATEGORY_LABELS: Record<SeoPageCategoryType, string> = {
  core: 'Core',
  shop_filter: 'Shop Filter',
  brand: 'Brand',
  guide: 'Guide',
  ingredient: 'Ingredient',
  concern: 'Concern',
  product: 'Product',
  custom: 'Custom URL',
};

function parseGeneratedSeoContent(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') {
    return { ...(raw as Record<string, any>) };
  }
  return {};
}

export const AdminSEOPages: React.FC = () => {
  const { user, profile } = useAuth();
  const { data: queryProducts = [] } = useProducts();

  const [products, setProducts] = useState<Product[]>(() => productService.getProducts());
  const [guides, setGuides] = useState<SkincareGuide[]>([]);
  const [savedOverrides, setSavedOverrides] = useState<PageSeoConfig[]>(() =>
    pageSeoService.getAll()
  );

  // Studio view states
  const [studioMode, setStudioMode] = useState<StudioMode>('pages');
  const [pageSearch, setPageSearch] = useState('');
  const [pageFilter, setPageFilter] = useState<PageFilterType>('all');
  const [selectedPath, setSelectedPath] = useState<string>('/');
  const [previewFormat, setPreviewFormat] = useState<PreviewFormat>('desktop');

  // Add Custom URL dialog state
  const [showCustomUrlModal, setShowCustomUrlModal] = useState(false);
  const [newCustomPath, setNewCustomPath] = useState('');
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [customUrlError, setCustomUrlError] = useState<string | null>(null);

  // Form states for selected page
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [ogImageAlt, setOgImageAlt] = useState('');
  const [faqs, setFaqs] = useState<PageSeoFaqItem[]>([]);
  const [showFaqsOnPage, setShowFaqsOnPage] = useState(true);
  const [keywordsText, setKeywordsText] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [ogType, setOgType] = useState<'website' | 'product' | 'article'>('website');
  const [noindex, setNoindex] = useState(false);
  const [customJsonLd, setCustomJsonLd] = useState('');
  const [productSlugInput, setProductSlugInput] = useState('');

  // Media library picker state
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [ogImageLoadError, setOgImageLoadError] = useState(false);
  const hydratedOverrideKeyRef = React.useRef<string>('');
  const isFormDirtyRef = React.useRef(false);

  // Save / revert / batch fix status states
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingRevert, setConfirmingRevert] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Bulk Link Repair states
  const [linkSearch, setLinkSearch] = useState('');
  const [linkFilter, setLinkFilter] = useState<LinkFilterType>('issues');
  const [rowSlugDrafts, setRowSlugDrafts] = useState<Record<string, string>>({});
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [isBatchFixing, setIsBatchFixing] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Subscriptions to products, guides, seo_pages
  useEffect(() => {
    const unsubProducts = productService.subscribe((prods) => {
      if (prods.length > 0) setProducts(prods);
    });
    const unsubGuides = articleService.subscribe((loadedGuides) => {
      setGuides(loadedGuides);
    });
    const unsubSeo = pageSeoService.subscribe((pages) => {
      setSavedOverrides(pages);
    });
    return () => {
      unsubProducts();
      unsubGuides();
      unsubSeo();
    };
  }, []);

  useEffect(() => {
    if (products.length === 0 && queryProducts.length > 0) {
      setProducts(queryProducts);
    }
  }, [queryProducts, products.length]);

  const savedByPath = useMemo(() => {
    const map = new Map<string, PageSeoConfig>();
    savedOverrides.forEach((item) => {
      map.set(normalizeSeoPath(item.path), item);
    });
    return map;
  }, [savedOverrides]);

  const linkAuditItems = useMemo(() => {
    return analyzeProductLinkHealth(products);
  }, [products]);

  const auditByProductId = useMemo(() => {
    const map = new Map<string, ProductLinkAuditItem>();
    linkAuditItems.forEach((item) => {
      map.set(item.productId, item);
    });
    return map;
  }, [linkAuditItems]);

  const discoveredPages = useMemo(() => {
    return discoverWebsitePages(products, guides, savedOverrides);
  }, [products, guides, savedOverrides]);

  const linkIssueCount = useMemo(() => {
    return linkAuditItems.filter((item) => item.severity !== 'healthy').length;
  }, [linkAuditItems]);

  const rawIdCount = useMemo(() => {
    return linkAuditItems.filter((item) => item.issues.includes('missing_slug')).length;
  }, [linkAuditItems]);

  const badSlugOrCanonicalCount = useMemo(() => {
    return linkAuditItems.filter(
      (item) =>
        item.issues.includes('invalid_slug') ||
        item.issues.includes('duplicate_slug') ||
        item.issues.includes('broken_canonical')
    ).length;
  }, [linkAuditItems]);

  const missingImageCount = useMemo(() => {
    return linkAuditItems.filter((item) => item.issues.includes('missing_image')).length;
  }, [linkAuditItems]);

  const filteredPages = useMemo(() => {
    const q = pageSearch.trim().toLowerCase();
    return discoveredPages.filter((page) => {
      const hasOverride = savedByPath.has(page.path);
      const productAudit = page.product ? auditByProductId.get(page.product.id) : undefined;
      const hasLinkIssue = Boolean(productAudit && productAudit.severity !== 'healthy');

      if (pageFilter === 'customized' && !hasOverride) return false;
      if (pageFilter === 'issues' && !hasLinkIssue) return false;
      if (
        pageFilter !== 'all' &&
        pageFilter !== 'customized' &&
        pageFilter !== 'issues' &&
        page.pageType !== pageFilter
      ) {
        return false;
      }

      if (!q) return true;
      return (
        page.label.toLowerCase().includes(q) ||
        page.path.toLowerCase().includes(q) ||
        (page.subtitle || '').toLowerCase().includes(q) ||
        (page.product?.id || '').toLowerCase().includes(q) ||
        (page.product?.seoSlug || '').toLowerCase().includes(q) ||
        (page.product?.brand || '').toLowerCase().includes(q)
      );
    });
  }, [discoveredPages, pageFilter, pageSearch, savedByPath, auditByProductId]);

  const selectedPage: DiscoveredWebsitePage | null = useMemo(() => {
    const normalized = normalizeSeoPath(selectedPath);
    return (
      discoveredPages.find((p) => p.path === normalized) ||
      discoveredPages[0] ||
      null
    );
  }, [discoveredPages, selectedPath]);

  const activeOverride: PageSeoConfig | null = useMemo(() => {
    if (!selectedPage) return null;
    return savedByPath.get(selectedPage.path) || null;
  }, [selectedPage, savedByPath]);

  // Populate editor fields whenever selected page changes or override initially arrives
  useEffect(() => {
    if (!selectedPage) return;
    const override = savedByPath.get(selectedPage.path);
    const nextHydrationKey = `${selectedPage.path}::${selectedPage.product?.id || ''}::${override?.updatedAt || 'default'}`;

    const isSamePageAsBefore = hydratedOverrideKeyRef.current.startsWith(
      `${selectedPage.path}::${selectedPage.product?.id || ''}::`
    );

    if (isSamePageAsBefore) {
      if (hydratedOverrideKeyRef.current === nextHydrationKey || isFormDirtyRef.current) {
        return;
      }
    }

    hydratedOverrideKeyRef.current = nextHydrationKey;
    isFormDirtyRef.current = false;

    let productCustomCanonical = '';
    if (selectedPage.product?.generatedSeoContent) {
      try {
        const parsed =
          typeof selectedPage.product.generatedSeoContent === 'string'
            ? JSON.parse(selectedPage.product.generatedSeoContent)
            : selectedPage.product.generatedSeoContent;
        if (typeof parsed?.customCanonical === 'string') {
          productCustomCanonical = parsed.customCanonical.trim();
        }
      } catch {
        // ignore JSON parse error
      }
    }

    setMetaTitle(override?.metaTitle || selectedPage.defaultTitle || '');
    setMetaDescription(
      override?.metaDescription || selectedPage.defaultDescription || ''
    );
    setOgImage(
      override?.ogImage ||
        selectedPage.product?.ogImage ||
        selectedPage.defaultOgImage ||
        DEFAULT_OG_IMAGE
    );
    setOgImageAlt(
      override?.ogImageAlt ||
        selectedPage.product?.ogImageAlt ||
        selectedPage.defaultOgImageAlt ||
        selectedPage.label
    );
    setOgImageLoadError(false);

    const initialFaqs =
      override?.faqs && override.faqs.length > 0
        ? override.faqs.map((f) => ({ ...f }))
        : selectedPage.defaultFaqs.map((f) => ({ ...f }));
    setFaqs(initialFaqs);
    setShowFaqsOnPage(override ? override.showFaqsOnPage !== false : true);

    const initialKeywords =
      override?.keywords && override.keywords.length > 0
        ? override.keywords
        : selectedPage.defaultKeywords;
    setKeywordsText(initialKeywords.join(', '));

    setCanonicalUrl(
      override?.canonicalUrl ||
        productCustomCanonical ||
        buildCanonicalUrl(selectedPage.path)
    );
    setOgType(override?.ogType || selectedPage.defaultOgType || 'website');
    setNoindex(
      override ? Boolean(override.noindex) : Boolean(selectedPage.product?.noindex)
    );
    setCustomJsonLd(override?.customJsonLd || '');
    setProductSlugInput(selectedPage.product?.seoSlug || '');
    setConfirmingRevert(false);
    if (!isSamePageAsBefore) {
      setFeedback(null);
    }
  }, [selectedPage, savedByPath]);

  useEffect(() => {
    setOgImageLoadError(false);
  }, [ogImage]);

  // Keep row drafts initialized for the link repair table
  useEffect(() => {
    setRowSlugDrafts((prev) => {
      const next = { ...prev };
      linkAuditItems.forEach((item) => {
        if (next[item.productId] === undefined) {
          next[item.productId] = item.seoSlug || item.suggestedSlug;
        }
      });
      return next;
    });
  }, [linkAuditItems]);

  // Validation for Product SEO Slug input in editor
  const slugValidation = useMemo(() => {
    if (!selectedPage?.product) return { valid: true, message: '' };
    const clean = productSlugInput.trim().toLowerCase();
    if (!clean) {
      return {
        valid: true,
        message: 'Empty slug uses product document ID as URL.',
      };
    }
    if (!isCleanProductSlug(clean)) {
      return {
        valid: false,
        message:
          'Use 3–120 lowercase letters, numbers, and hyphens only (no spaces or raw IDs).',
      };
    }
    const conflict = products.find(
      (p) =>
        p.id !== selectedPage.product!.id &&
        (p.seoSlug || '').trim().toLowerCase() === clean
    );
    if (conflict) {
      return {
        valid: false,
        message: `Already assigned to "${conflict.name}". Choose a unique slug.`,
      };
    }
    return { valid: true, message: '' };
  }, [productSlugInput, products, selectedPage]);

  const jsonLdSyntaxValid = useMemo(() => {
    if (!customJsonLd.trim()) return true;
    try {
      JSON.parse(customJsonLd);
      return true;
    } catch {
      return false;
    }
  }, [customJsonLd]);

  const handleAutoSuggestProductSlug = () => {
    if (!selectedPage?.product) return;
    const used = new Set<string>();
    products.forEach((p) => {
      if (p.id !== selectedPage.product!.id && isCleanProductSlug(p.seoSlug)) {
        used.add(p.seoSlug!.trim().toLowerCase());
      }
    });
    const nextSlug = suggestProductSlug(selectedPage.product, used);
    const oldPath = selectedPage.path;
    const newPath = `/product/${encodeURIComponent(nextSlug)}`;
    setProductSlugInput(nextSlug);
    if (!canonicalUrl || canonicalUrl.includes(oldPath) || canonicalUrl.includes(`/product/${selectedPage.product.id}`)) {
      setCanonicalUrl(buildCanonicalUrl(newPath));
    }
  };

  const handleFaqAdd = () => {
    setFaqs((prev) => [...prev, { question: '', answer: '' }]);
  };

  const handleFaqUpdate = (
    idx: number,
    field: 'question' | 'answer',
    value: string
  ) => {
    setFaqs((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleFaqMove = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= faqs.length) return;
    setFaqs((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[target];
      next[target] = temp;
      return next;
    });
  };

  const handleFaqRemove = (idx: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLoadDefaultFaqs = () => {
    if (!selectedPage || selectedPage.defaultFaqs.length === 0) return;
    setFaqs(selectedPage.defaultFaqs.map((f) => ({ ...f })));
  };

  const handleSavePageSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPage) return;

    if (!jsonLdSyntaxValid) {
      setFeedback({
        type: 'error',
        text: 'Custom JSON-LD contains invalid JSON syntax. Please fix or clear it before saving.',
      });
      return;
    }

    if (selectedPage.product && !slugValidation.valid) {
      setFeedback({
        type: 'error',
        text: slugValidation.message || 'Please fix the product URL slug before saving.',
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const updatedByEmail = profile?.email || user?.email || 'admin';
      const cleanedFaqs = faqs
        .map((f) => ({
          question: f.question.trim(),
          answer: f.answer.trim(),
        }))
        .filter((f) => f.question.length > 0 && f.answer.length > 0);

      const cleanedKeywords = keywordsText
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      let targetPath = selectedPage.path;
      let resolvedCanonical = canonicalUrl.trim();

      // Sync Product record if editing a Product page
      if (selectedPage.product) {
        const prod = selectedPage.product;
        const nextSlug = productSlugInput.trim().toLowerCase();
        const oldPath = selectedPage.path;
        const newPath = nextSlug
          ? `/product/${encodeURIComponent(nextSlug)}`
          : `/product/${encodeURIComponent(prod.id)}`;

        targetPath = normalizeSeoPath(newPath);

        if (
          !resolvedCanonical ||
          resolvedCanonical.includes(oldPath) ||
          resolvedCanonical.includes(`/product/${encodeURIComponent(prod.id)}`)
        ) {
          resolvedCanonical = buildCanonicalUrl(targetPath);
          setCanonicalUrl(resolvedCanonical);
        }

        const existingGeneratedSeo = parseGeneratedSeoContent(
          prod.generatedSeoContent
        );

        const updatedProduct: Product = {
          ...prod,
          seoSlug: nextSlug || undefined,
          seoTitle: metaTitle.trim(),
          metaTitle: metaTitle.trim(),
          metaDescription: metaDescription.trim(),
          ogImage: ogImage.trim() || undefined,
          ogImageAlt: ogImageAlt.trim() || undefined,
          imageAltText: ogImageAlt.trim() || prod.imageAltText,
          altText: ogImageAlt.trim() || prod.altText,
          faqs: cleanedFaqs.length > 0 ? cleanedFaqs : undefined,
          noindex,
          generatedSeoContent: JSON.stringify({
            ...existingGeneratedSeo,
            seoTitle: metaTitle.trim(),
            metaDescription: metaDescription.trim(),
            keywords: cleanedKeywords,
            customCanonical: resolvedCanonical,
            imageAltText: ogImageAlt.trim() || prod.imageAltText || '',
            noindex,
          }),
        };

        productService.updateProduct(updatedProduct);

        // Migrate any seo_pages doc from old product path to new slug path
        if (oldPath !== targetPath) {
          const oldOverride = savedByPath.get(oldPath);
          if (oldOverride) {
            await pageSeoService.deletePageSeo(oldOverride.id);
          }
        }
      }

      await pageSeoService.savePageSeo(
        {
          path: targetPath,
          pageType: selectedPage.pageType,
          label: selectedPage.label,
          metaTitle: metaTitle.trim(),
          metaDescription: metaDescription.trim(),
          ogImage: ogImage.trim() || undefined,
          ogImageAlt: ogImageAlt.trim() || undefined,
          keywords: cleanedKeywords,
          canonicalUrl: resolvedCanonical || undefined,
          ogType,
          noindex,
          faqs: cleanedFaqs,
          showFaqsOnPage,
          customJsonLd: customJsonLd.trim() || undefined,
        },
        updatedByEmail
      );

      isFormDirtyRef.current = false;
      setSelectedPath(targetPath);
      setFeedback({
        type: 'success',
        text: `SEO metadata, OpenGraph image, and ${cleanedFaqs.length} FAQ item(s) published for ${targetPath}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed to publish page SEO settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevertToDefault = async () => {
    if (!activeOverride || !selectedPage) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await pageSeoService.deletePageSeo(activeOverride.id);
      setConfirmingRevert(false);
      setMetaTitle(selectedPage.defaultTitle);
      setMetaDescription(selectedPage.defaultDescription);
      setOgImage(selectedPage.defaultOgImage);
      setOgImageAlt(selectedPage.defaultOgImageAlt);
      setFaqs(selectedPage.defaultFaqs.map((f) => ({ ...f })));
      setShowFaqsOnPage(true);
      setKeywordsText(selectedPage.defaultKeywords.join(', '));
      setCanonicalUrl(buildCanonicalUrl(selectedPage.path));
      setOgType(selectedPage.defaultOgType);
      setNoindex(Boolean(selectedPage.product?.noindex));
      setCustomJsonLd('');
      setFeedback({
        type: 'success',
        text: `Removed custom override for ${selectedPage.path}. Storefront now uses dynamic defaults.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed to revert page SEO override.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCustomUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newCustomPath.trim();
    if (!raw) {
      setCustomUrlError('Enter a URL path such as /shop?brand=COSRX or /summer-sale.');
      return;
    }

    const normalized = normalizeSeoPath(raw);
    if (normalized.startsWith('/admin')) {
      setCustomUrlError('Admin URLs cannot be indexed in storefront SEO.');
      return;
    }

    setCustomUrlError(null);
    try {
      const existing = discoveredPages.find((p) => p.path === normalized);
      if (!existing) {
        const label = newCustomLabel.trim() || normalized;
        await pageSeoService.savePageSeo(
          {
            path: normalized,
            pageType: 'custom',
            label,
            metaTitle: `${label} | Korean Skin Food BD`,
            metaDescription:
              'Explore authentic Korean skincare essentials in Bangladesh at Korean Skin Food BD.',
            ogImage: DEFAULT_OG_IMAGE,
            ogImageAlt: `${label} | Korean Skin Food BD`,
            keywords: [],
            ogType: 'website',
            noindex: false,
            faqs: [],
            showFaqsOnPage: true,
          },
          profile?.email || user?.email || 'admin'
        );
      }
      setSelectedPath(normalized);
      setPageFilter('all');
      setShowCustomUrlModal(false);
      setNewCustomPath('');
      setNewCustomLabel('');
      setStudioMode('pages');
    } catch (err: any) {
      setCustomUrlError(err?.message || 'Could not save custom URL.');
    }
  };

  // Single-row slug save in Link Repair tab
  const handleSaveRowSlug = async (auditItem: ProductLinkAuditItem) => {
    const prod = products.find((p) => p.id === auditItem.productId);
    if (!prod) return;

    const rawDraft = (rowSlugDrafts[prod.id] ?? auditItem.suggestedSlug).trim();
    const normalizedSlug = slugifyProductText(rawDraft);

    if (!isCleanProductSlug(normalizedSlug)) {
      setBatchFeedback({
        type: 'error',
        text: `"${rawDraft}" is not a valid SEO slug. Use at least 3 lowercase alphanumeric characters separated by hyphens.`,
      });
      return;
    }

    const duplicate = products.find(
      (p) => p.id !== prod.id && (p.seoSlug || '').trim().toLowerCase() === normalizedSlug
    );
    if (duplicate) {
      setBatchFeedback({
        type: 'error',
        text: `Slug "/product/${normalizedSlug}" is already assigned to "${duplicate.name}".`,
      });
      return;
    }

    setSavingRowId(prod.id);
    setBatchFeedback(null);

    try {
      const oldPath = getProductPath(prod);
      const newPath = `/product/${encodeURIComponent(normalizedSlug)}`;
      const canonical = buildCanonicalUrl(newPath);

      const parsedGenerated = parseGeneratedSeoContent(
        prod.generatedSeoContent
      );

      const updatedProd: Product = {
        ...prod,
        seoSlug: normalizedSlug,
        generatedSeoContent: JSON.stringify({
          ...parsedGenerated,
          customCanonical: canonical,
        }),
      };

      productService.updateProduct(updatedProd);

      // Migrate existing seo_pages override if one existed on oldPath
      const existingOverride = savedByPath.get(normalizeSeoPath(oldPath));
      if (existingOverride && normalizeSeoPath(oldPath) !== normalizeSeoPath(newPath)) {
        await pageSeoService.savePageSeo(
          {
            ...existingOverride,
            path: newPath,
            canonicalUrl: canonical,
          },
          profile?.email || user?.email || 'admin'
        );
        await pageSeoService.deletePageSeo(existingOverride.id);
      }

      setRowSlugDrafts((prev) => ({ ...prev, [prod.id]: normalizedSlug }));
      setBatchFeedback({
        type: 'success',
        text: `Updated "${prod.name}" link to ${newPath}`,
      });
    } catch (err: any) {
      setBatchFeedback({
        type: 'error',
        text: err?.message || 'Failed to update product link.',
      });
    } finally {
      setSavingRowId(null);
    }
  };

  // Batch repair all broken / missing / duplicate slugs and broken canonicals
  const handleBatchFixAllLinks = async () => {
    const candidates = linkAuditItems.filter(
      (item) =>
        item.issues.includes('missing_slug') ||
        item.issues.includes('invalid_slug') ||
        item.issues.includes('duplicate_slug') ||
        item.issues.includes('broken_canonical')
    );

    if (candidates.length === 0) {
      setBatchFeedback({
        type: 'success',
        text: 'All product links and canonicals are already clean.',
      });
      return;
    }

    setIsBatchFixing(true);
    setBatchFeedback(null);

    try {
      const reservedSlugs = new Set<string>();
      products.forEach((p) => {
        if (isCleanProductSlug(p.seoSlug)) {
          reservedSlugs.add(p.seoSlug!.trim().toLowerCase());
        }
      });

      let fixedCount = 0;
      const updatedDrafts: Record<string, string> = {};

      for (const audit of candidates) {
        const prod = products.find((p) => p.id === audit.productId);
        if (!prod) continue;

        let targetSlug = (prod.seoSlug || '').trim().toLowerCase();
        const needsSlugRepair =
          !isCleanProductSlug(targetSlug) ||
          audit.issues.includes('duplicate_slug');

        if (needsSlugRepair) {
          targetSlug = suggestProductSlug(prod, reservedSlugs);
        }
        reservedSlugs.add(targetSlug);

        const oldPath = getProductPath(prod);
        const newPath = `/product/${encodeURIComponent(targetSlug)}`;
        const cleanCanonical = buildCanonicalUrl(newPath);

        const parsedGenerated = parseGeneratedSeoContent(
          prod.generatedSeoContent
        );

        const updatedProduct: Product = {
          ...prod,
          seoSlug: targetSlug,
          generatedSeoContent: JSON.stringify({
            ...parsedGenerated,
            customCanonical: cleanCanonical,
          }),
        };

        productService.updateProduct(updatedProduct);
        updatedDrafts[prod.id] = targetSlug;

        const existingOverride = savedByPath.get(normalizeSeoPath(oldPath));
        if (existingOverride && normalizeSeoPath(oldPath) !== normalizeSeoPath(newPath)) {
          await pageSeoService.savePageSeo(
            {
              ...existingOverride,
              path: newPath,
              canonicalUrl: cleanCanonical,
            },
            profile?.email || user?.email || 'admin'
          );
          await pageSeoService.deletePageSeo(existingOverride.id);
        }

        fixedCount++;
      }

      setRowSlugDrafts((prev) => ({ ...prev, ...updatedDrafts }));
      setBatchFeedback({
        type: 'success',
        text: `Auto-repaired ${fixedCount} product link(s) with clean SEO slugs and valid canonical URLs.`,
      });
    } catch (err: any) {
      setBatchFeedback({
        type: 'error',
        text: err?.message || 'Batch link repair encountered an error.',
      });
    } finally {
      setIsBatchFixing(false);
    }
  };

  const filteredAuditRows = useMemo(() => {
    const q = linkSearch.trim().toLowerCase();
    return linkAuditItems.filter((item) => {
      if (linkFilter === 'issues' && item.severity === 'healthy') return false;
      if (!q) return true;
      return (
        item.productName.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.productId.toLowerCase().includes(q) ||
        item.seoSlug.toLowerCase().includes(q) ||
        item.currentPath.toLowerCase().includes(q)
      );
    });
  }, [linkAuditItems, linkFilter, linkSearch]);

  const titleLen = metaTitle.trim().length;
  const descLen = metaDescription.trim().length;
  const previewUrl = canonicalUrl.trim() || (selectedPage ? buildCanonicalUrl(selectedPage.path) : getSiteUrl());
  const previewImageUrl = ogImage.trim() || DEFAULT_OG_IMAGE;
  const siteHost = getSiteHostname().toUpperCase();

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb + Studio Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500"
            >
              <Link
                to="/admin/seo"
                className="inline-flex items-center gap-1 text-slate-600 hover:text-[#E91E8C] transition"
              >
                <ArrowLeft size={13} />
                <span>SEO Optimizer</span>
              </Link>
              <ChevronRight size={12} className="text-slate-400" />
              <span className="text-slate-900 font-semibold">
                Website Pages &amp; Link Studio
              </span>
            </nav>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-100 text-[#E91E8C] flex items-center justify-center shrink-0">
                <Globe size={18} />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Full Website Page SEO &amp; Product Link Studio
                </h1>
                <p className="text-xs text-slate-500">
                  Select any page URL to customize Meta Title, Meta Description, Meta Image, and FAQs, or repair broken product links across the catalog.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setStudioMode('pages')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  studioMode === 'pages'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText size={14} className={studioMode === 'pages' ? 'text-[#E91E8C]' : ''} />
                <span>Page-by-Page SEO</span>
                <span className="font-mono tabular-nums text-[11px] text-slate-400">
                  ({discoveredPages.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStudioMode('links')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  studioMode === 'links'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wrench size={14} className={studioMode === 'links' ? 'text-[#E91E8C]' : ''} />
                <span>Product Link Repair</span>
                <span
                  className={`font-mono tabular-nums text-[11px] ${
                    linkIssueCount > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  ({linkIssueCount})
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setCustomUrlError(null);
                setShowCustomUrlModal(true);
              }}
              className="px-3.5 py-2.5 bg-[#E91E8C] hover:bg-[#d0177c] text-white rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add Custom URL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Custom URL Modal */}
      {showCustomUrlModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Link2 size={16} className="text-[#E91E8C]" />
                <span>Add Custom Page URL</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowCustomUrlModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomUrl} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Website URL or Path
                </label>
                <input
                  type="text"
                  required
                  value={newCustomPath}
                  onChange={(e) => setNewCustomPath(e.target.value)}
                  placeholder="/shop?brand=COSRX or /summer-skincare-offer"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#E91E8C] outline-none font-mono text-xs text-slate-900"
                />
                <p className="text-[11px] text-slate-500">
                  Paste either a full URL or relative path. Tracking parameters (utm_*, fbclid) are cleaned automatically.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Display Label (Admin Reference)
                </label>
                <input
                  type="text"
                  value={newCustomLabel}
                  onChange={(e) => setNewCustomLabel(e.target.value)}
                  placeholder="e.g. COSRX Filtered Catalog"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#E91E8C] outline-none text-xs text-slate-900 font-medium"
                />
              </div>

              {customUrlError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {customUrlError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomUrlModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#E91E8C] hover:bg-[#d0177c] text-white text-xs font-bold cursor-pointer"
                >
                  Create &amp; Edit Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODE 1: PAGE-BY-PAGE SEO EDITOR */}
      {studioMode === 'pages' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Website URL Directory */}
          <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Website URLs ({filteredPages.length})
                </h2>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  {savedOverrides.length} customized
                </span>
              </div>

              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={pageSearch}
                  onChange={(e) => setPageSearch(e.target.value)}
                  placeholder="Search URL, product, brand, or guide..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#E91E8C] outline-none text-xs text-slate-800"
                />
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ['all', 'All'],
                    ['customized', 'Customized'],
                    ['issues', `Link Issues (${linkIssueCount})`],
                    ['core', 'Core'],
                    ['shop_filter', 'Categories'],
                    ['brand', 'Brands'],
                    ['guide', 'Guides'],
                    ['ingredient', 'Ingredients'],
                    ['concern', 'Concerns'],
                    ['product', 'Products'],
                    ['custom', 'Custom'],
                  ] as Array<[PageFilterType, string]>
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPageFilter(key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                      pageFilter === key
                        ? 'bg-[#E91E8C] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[760px] overflow-y-auto divide-y divide-slate-100">
              {filteredPages.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <p className="text-xs font-bold text-slate-700">No matching URLs found</p>
                  <p className="text-[11px] text-slate-500">
                    Try clearing your search or adding a custom page URL.
                  </p>
                </div>
              ) : (
                filteredPages.map((page) => {
                  const isSelected = selectedPage?.path === page.path;
                  const override = savedByPath.get(page.path);
                  const productAudit = page.product
                    ? auditByProductId.get(page.product.id)
                    : undefined;
                  const hasSlugIssue = Boolean(
                    productAudit && productAudit.severity !== 'healthy'
                  );

                  return (
                    <button
                      key={page.path}
                      type="button"
                      onClick={() => setSelectedPath(page.path)}
                      className={`w-full text-left px-4 py-3 transition cursor-pointer flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-pink-50/70'
                          : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-bold truncate ${
                              isSelected ? 'text-[#E91E8C]' : 'text-slate-900'
                            }`}
                          >
                            {page.label}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 truncate">
                          {page.path}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                          <span className="uppercase">{CATEGORY_LABELS[page.pageType]}</span>
                          {override && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-700 font-bold">Custom SEO</span>
                            </>
                          )}
                          {override?.faqs && override.faqs.length > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-slate-600 tabular-nums">
                                {override.faqs.length} FAQ
                              </span>
                            </>
                          )}
                          {hasSlugIssue && (
                            <>
                              <span>·</span>
                              <span className="text-amber-600 font-bold">Link Issue</span>
                            </>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        size={14}
                        className={`shrink-0 mt-1 ${
                          isSelected ? 'text-[#E91E8C]' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right Panel: Active Page Metadata, Meta Image, FAQ & Live Preview */}
          <section className="lg:col-span-8 space-y-6">
            {selectedPage && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6">
                {/* Selected Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <span>{CATEGORY_LABELS[selectedPage.pageType]}</span>
                      <span>·</span>
                      <span className={activeOverride ? 'text-emerald-700' : 'text-slate-500'}>
                        {activeOverride ? 'Custom Override Active' : 'Using Dynamic Default'}
                      </span>
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 truncate">
                      {selectedPage.label}
                    </h2>
                    <p className="text-xs font-mono text-slate-500 truncate">
                      {selectedPage.path}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <a
                      href={selectedPage.path}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <span>Open Live URL</span>
                      <ExternalLink size={12} />
                    </a>

                    {activeOverride && (
                      confirmingRevert ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleRevertToDefault}
                            disabled={isSaving}
                            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                          >
                            Confirm Revert
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingRevert(false)}
                            className="px-2.5 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingRevert(true)}
                          className="px-3 py-2 rounded-xl border border-slate-200 hover:border-rose-200 hover:text-rose-700 text-xs font-bold text-slate-600 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <RotateCcw size={12} />
                          <span>Revert Override</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {feedback && (
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-semibold ${
                      feedback.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {feedback.type === 'success' ? (
                      <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    )}
                    <span>{feedback.text}</span>
                  </div>
                )}

                <form onSubmit={handleSavePageSeo} className="space-y-6 text-xs">
                  {/* Product Link & Slug Repair Strip (Only shown for Product Pages) */}
                  {selectedPage.product && (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                            <Link2 size={14} className="text-[#E91E8C]" />
                            <span>Product URL Slug &amp; Link Health</span>
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Legacy ID <span className="font-mono text-slate-700">{selectedPage.product.id}</span> stays working and automatically redirects to this clean slug.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAutoSuggestProductSlug}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#E91E8C] text-[#E91E8C] font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start"
                        >
                          <Wand2 size={12} />
                          <span>Auto-Generate Clean Slug</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-stretch rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-[#E91E8C]">
                          <span className="px-3 py-2.5 bg-slate-100 text-slate-500 font-mono text-xs border-r border-slate-200 shrink-0">
                            /product/
                          </span>
                          <input
                            type="text"
                            value={productSlugInput}
                            onChange={(e) => setProductSlugInput(e.target.value)}
                            placeholder={suggestProductSlug(selectedPage.product)}
                            className="flex-1 px-3 py-2.5 outline-none font-mono text-xs text-slate-900 min-w-0"
                          />
                        </div>
                        {slugValidation.message && (
                          <p
                            className={`text-[11px] font-medium ${
                              slugValidation.valid ? 'text-slate-500' : 'text-rose-600'
                            }`}
                          >
                            {slugValidation.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Meta Title & Meta Description */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="font-bold text-slate-800">
                          Meta Title (&lt;title&gt; &amp; og:title)
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setMetaTitle(selectedPage.defaultTitle)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-[#E91E8C] cursor-pointer"
                          >
                            Reset Default
                          </button>
                          <span
                            className={`font-mono tabular-nums text-[11px] font-bold ${
                              titleLen >= 30 && titleLen <= 60
                                ? 'text-emerald-700'
                                : titleLen > 60
                                  ? 'text-rose-600'
                                  : 'text-amber-600'
                            }`}
                          >
                            {titleLen}/60
                          </span>
                        </div>
                      </div>
                      <input
                        type="text"
                        required
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        placeholder="Enter Meta Title..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#E91E8C] outline-none text-xs font-semibold text-slate-900"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="font-bold text-slate-800">
                          Meta Description (&lt;meta name="description"&gt;)
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setMetaDescription(selectedPage.defaultDescription)
                            }
                            className="text-[11px] font-semibold text-slate-500 hover:text-[#E91E8C] cursor-pointer"
                          >
                            Reset Default
                          </button>
                          <span
                            className={`font-mono tabular-nums text-[11px] font-bold ${
                              descLen >= 120 && descLen <= 160
                                ? 'text-emerald-700'
                                : descLen > 160
                                  ? 'text-rose-600'
                                  : 'text-amber-600'
                            }`}
                          >
                            {descLen}/160
                          </span>
                        </div>
                      </div>
                      <textarea
                        rows={3}
                        required
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        placeholder="Enter concise Meta Description for search results..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#E91E8C] outline-none text-xs text-slate-800 leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Meta Image (OG Image) + Alt Text */}
                  <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200/80 pb-3">
                      <div className="min-w-0">
                        <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          <ImageIcon size={14} className="text-[#E91E8C] shrink-0" />
                          <span>Meta Image (OpenGraph / Social Share Image)</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Recommended 1200×630px (1.91:1 ratio) HTTPS URL or relative path for Facebook, WhatsApp &amp; X cards.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMediaModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 border border-pink-100 text-[#E91E8C] font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition shrink-0"
                      >
                        <ImageIcon size={12} />
                        <span>Media Library / Upload</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 items-start">
                      <div className="md:col-span-5 aspect-[1.91/1] w-full rounded-xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center relative">
                        {ogImage.trim() && !ogImageLoadError ? (
                          <img
                            src={ogImage.trim()}
                            alt={ogImageAlt || metaTitle}
                            onError={() => setOgImageLoadError(true)}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : ogImage.trim() && ogImageLoadError ? (
                          <div className="p-3 text-center space-y-1">
                            <AlertTriangle size={18} className="mx-auto text-amber-500" />
                            <p className="text-[11px] font-bold text-slate-700">
                              Preview failed to load
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Verify the image URL or pick from Media Library.
                            </p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setMediaModalOpen(true)}
                            className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-[#E91E8C] hover:bg-pink-50/40 transition cursor-pointer p-3"
                          >
                            <ImageIcon size={20} />
                            <span className="text-[11px] font-semibold">
                              Select or paste image URL
                            </span>
                          </button>
                        )}
                      </div>

                      <div className="md:col-span-7 min-w-0 space-y-3.5">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="font-bold text-slate-800">
                              Meta Image URL
                            </label>
                            <div className="flex items-center gap-2.5">
                              {ogImage.trim() && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    isFormDirtyRef.current = true;
                                    setOgImage('');
                                  }}
                                  className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer inline-flex items-center gap-0.5"
                                >
                                  <X size={11} />
                                  <span>Clear</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  isFormDirtyRef.current = true;
                                  setOgImage(selectedPage.defaultOgImage);
                                }}
                                className="text-[11px] font-semibold text-slate-500 hover:text-[#E91E8C] cursor-pointer inline-flex items-center gap-1"
                              >
                                <RotateCcw size={10} />
                                <span>Use Default</span>
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={ogImage}
                            onChange={(e) => {
                              isFormDirtyRef.current = true;
                              setOgImage(e.target.value);
                            }}
                            placeholder="https://res.cloudinary.com/... or /og-banner.jpg"
                            className="w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/15 outline-none font-mono text-xs text-slate-900 placeholder:text-slate-400 transition"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="font-bold text-slate-800">
                              Meta Image Alt Text (og:image:alt)
                            </label>
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  isFormDirtyRef.current = true;
                                  setOgImageAlt(
                                    metaTitle.trim() ||
                                      selectedPage.defaultOgImageAlt ||
                                      selectedPage.label
                                  );
                                }}
                                className="text-[11px] font-semibold text-slate-500 hover:text-[#E91E8C] cursor-pointer"
                              >
                                Match Title
                              </button>
                              <span
                                className={`font-mono tabular-nums text-[11px] font-bold ${
                                  ogImageAlt.trim().length > 125
                                    ? 'text-amber-600'
                                    : ogImageAlt.trim().length > 0
                                      ? 'text-emerald-700'
                                      : 'text-slate-400'
                                }`}
                              >
                                {ogImageAlt.trim().length}/125
                              </span>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={ogImageAlt}
                            onChange={(e) => {
                              isFormDirtyRef.current = true;
                              setOgImageAlt(e.target.value);
                            }}
                            placeholder="Descriptive alt text for social share cards and accessibility"
                            className="w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/15 outline-none text-xs font-medium text-slate-900 placeholder:text-slate-400 transition"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Per-Page FAQ Builder */}
                  <div className="p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          <HelpCircle size={14} className="text-[#E91E8C]" />
                          <span>Page FAQs &amp; FAQPage Schema ({faqs.length})</span>
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Injects valid Schema.org FAQPage structured data and optional storefront accordion.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {selectedPage.defaultFaqs.length > 0 && (
                          <button
                            type="button"
                            onClick={handleLoadDefaultFaqs}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-600 text-[11px] font-bold cursor-pointer"
                          >
                            Load Built-in FAQs
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleFaqAdd}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Plus size={12} />
                          <span>Add Question</span>
                        </button>
                      </div>
                    </div>

                    {/* Visibility Mode Toggle */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowFaqsOnPage(true)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          showFaqsOnPage
                            ? 'bg-pink-50 border-pink-200 text-[#E91E8C]'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        Show Accordion on Live Page + FAQPage Schema
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowFaqsOnPage(false)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          !showFaqsOnPage
                            ? 'bg-pink-50 border-pink-200 text-[#E91E8C]'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        FAQPage JSON-LD Schema Only (Hidden from UI)
                      </button>
                    </div>

                    {faqs.length === 0 ? (
                      <div className="p-5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                        <p className="text-xs font-semibold text-slate-600">
                          No FAQs configured for this URL yet.
                        </p>
                        <button
                          type="button"
                          onClick={handleFaqAdd}
                          className="text-xs font-bold text-[#E91E8C] hover:underline cursor-pointer"
                        >
                          + Add first FAQ question
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {faqs.map((faq, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider font-mono tabular-nums">
                                Q{idx + 1}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleFaqMove(idx, -1)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                  title="Move Up"
                                >
                                  <ArrowUp size={13} />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === faqs.length - 1}
                                  onClick={() => handleFaqMove(idx, 1)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                  title="Move Down"
                                >
                                  <ArrowDown size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleFaqRemove(idx)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="Remove FAQ"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            <input
                              type="text"
                              value={faq.question}
                              onChange={(e) =>
                                handleFaqUpdate(idx, 'question', e.target.value)
                              }
                              placeholder="Question (e.g. Is this product suitable for humid Bangladesh weather?)"
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-[#E91E8C] outline-none text-xs font-bold text-slate-900"
                            />
                            <textarea
                              rows={2}
                              value={faq.answer}
                              onChange={(e) =>
                                handleFaqUpdate(idx, 'answer', e.target.value)
                              }
                              placeholder="Clear, accurate answer for shoppers and search snippets..."
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-[#E91E8C] outline-none text-xs text-slate-700 leading-relaxed"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Technical SEO Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-800 block">
                        Focus Keywords (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={keywordsText}
                        onChange={(e) => setKeywordsText(e.target.value)}
                        placeholder="Korean skincare Bangladesh, COSRX Dhaka, ..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#E91E8C] outline-none text-xs text-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-800 block">
                        Canonical URL
                      </label>
                      <input
                        type="text"
                        value={canonicalUrl}
                        onChange={(e) => setCanonicalUrl(e.target.value)}
                        placeholder={buildCanonicalUrl(selectedPage.path)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#E91E8C] outline-none font-mono text-xs text-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-800 block">
                        OpenGraph Type
                      </label>
                      <select
                        value={ogType}
                        onChange={(e) =>
                          setOgType(e.target.value as 'website' | 'product' | 'article')
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#E91E8C] outline-none text-xs font-semibold text-slate-800 bg-white"
                      >
                        <option value="website">website</option>
                        <option value="product">product</option>
                        <option value="article">article</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-800 block">
                        Search Indexability &amp; Sitemap
                      </label>
                      <label className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 cursor-pointer bg-white">
                        <span className="font-semibold text-slate-700">
                          {noindex
                            ? 'Noindex (Hidden from Google & sitemap.xml)'
                            : 'Index, Follow (Public & in sitemap.xml)'}
                        </span>
                        <input
                          type="checkbox"
                          checked={!noindex}
                          onChange={(e) => setNoindex(!e.target.checked)}
                          className="accent-[#E91E8C] w-4 h-4 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Custom JSON-LD (Optional) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800">
                        Additional Custom JSON-LD Schema (Optional)
                      </label>
                      {customJsonLd.trim() && (
                        <span
                          className={`text-[11px] font-mono font-bold ${
                            jsonLdSyntaxValid ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {jsonLdSyntaxValid ? 'Valid JSON' : 'Invalid JSON Syntax'}
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={4}
                      value={customJsonLd}
                      onChange={(e) => setCustomJsonLd(e.target.value)}
                      placeholder='Optional extra Schema.org JSON-LD object or array (e.g. BreadcrumbList, HowTo)...'
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-950 text-emerald-300 focus:border-[#E91E8C] outline-none font-mono text-[11px] leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-3 rounded-xl bg-[#E91E8C] hover:bg-[#d0177c] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      {isSaving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      <span>
                        {isSaving ? 'Publishing SEO...' : 'Save & Publish Page SEO'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Real-Time Search & Social Share Preview Card */}
            {selectedPage && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Eye size={14} className="text-[#E91E8C]" />
                    <span>Live Search &amp; Social Preview</span>
                  </h3>

                  <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPreviewFormat('desktop')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                        previewFormat === 'desktop'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <Monitor size={12} />
                      <span>Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFormat('mobile')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                        previewFormat === 'mobile'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <Smartphone size={12} />
                      <span>Mobile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFormat('social')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                        previewFormat === 'social'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <Share2 size={12} />
                      <span>OG Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFormat('faq')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                        previewFormat === 'faq'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <HelpCircle size={12} />
                      <span>FAQ ({faqs.filter((f) => f.question.trim() && f.answer.trim()).length})</span>
                    </button>
                  </div>
                </div>

                {previewFormat === 'desktop' && (
                  <div className="p-4 rounded-xl border border-slate-100 bg-white space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="w-5 h-5 rounded-full bg-pink-50 border border-pink-100 text-[#E91E8C] flex items-center justify-center text-[9px] font-black">
                        KS
                      </span>
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-slate-900 block leading-tight">
                          Korean Skin Food BD
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 truncate block">
                          {previewUrl}
                        </span>
                      </div>
                    </div>
                    <h4 className="text-base font-medium text-[#1a0dab] pt-1 leading-snug">
                      {metaTitle || selectedPage.defaultTitle}
                    </h4>
                    <p className="text-xs text-[#4d5156] leading-relaxed">
                      {metaDescription || selectedPage.defaultDescription}
                    </p>
                  </div>
                )}

                {previewFormat === 'mobile' && (
                  <div className="p-4 rounded-xl border border-slate-200 max-w-xs mx-auto bg-white space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-pink-50 text-[#E91E8C] flex items-center justify-center text-[10px] font-black">
                        KS
                      </span>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-slate-900 block">
                          {getSiteHostname()}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 truncate block">
                          {previewUrl}
                        </span>
                      </div>
                    </div>
                    <h4 className="text-sm font-semibold text-[#1a0dab] leading-snug">
                      {metaTitle || selectedPage.defaultTitle}
                    </h4>
                    <div className="flex items-start gap-3">
                      <p className="text-[11px] text-slate-600 leading-snug flex-1 line-clamp-3">
                        {metaDescription || selectedPage.defaultDescription}
                      </p>
                      {previewImageUrl && (
                        <img
                          src={previewImageUrl}
                          alt={ogImageAlt || metaTitle}
                          className="w-14 h-14 rounded-lg object-cover border border-slate-100 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                  </div>
                )}

                {previewFormat === 'social' && (
                  <div className="max-w-lg mx-auto rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <div className="aspect-[1.91/1] w-full bg-slate-100 overflow-hidden">
                      <img
                        src={previewImageUrl}
                        alt={ogImageAlt || metaTitle}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider block">
                        {siteHost}
                      </span>
                      <h5 className="text-xs font-bold text-slate-900 line-clamp-2">
                        {metaTitle || selectedPage.defaultTitle}
                      </h5>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {metaDescription || selectedPage.defaultDescription}
                      </p>
                    </div>
                  </div>
                )}

                {previewFormat === 'faq' && (
                  <div className="space-y-2.5">
                    {faqs.filter((f) => f.question.trim() && f.answer.trim()).length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">
                        Add questions &amp; answers above to preview rich FAQ snippets.
                      </p>
                    ) : (
                      faqs
                        .filter((f) => f.question.trim() && f.answer.trim())
                        .map((f, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1"
                          >
                            <p className="text-xs font-bold text-slate-900">{f.question}</p>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {f.answer}
                            </p>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* MODE 2: BULK PRODUCT LINK REPAIR */}
      {studioMode === 'links' && (
        <div className="space-y-6">
          {/* Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Catalog Products
              </span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                {products.length}
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Raw / Unfriendly ID URLs
              </span>
              <span
                className={`text-2xl font-extrabold font-mono tabular-nums ${
                  rawIdCount > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {rawIdCount}
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Duplicate / Broken Canonicals
              </span>
              <span
                className={`text-2xl font-extrabold font-mono tabular-nums ${
                  badSlugOrCanonicalCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {badSlugOrCanonicalCount}
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Missing HTTPS Meta Images
              </span>
              <span
                className={`text-2xl font-extrabold font-mono tabular-nums ${
                  missingImageCount > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {missingImageCount}
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={linkSearch}
                    onChange={(e) => setLinkSearch(e.target.value)}
                    placeholder="Filter products by name, brand, or slug..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#E91E8C] outline-none text-xs"
                  />
                </div>

                <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setLinkFilter('issues')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      linkFilter === 'issues'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Issues Only ({linkIssueCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      linkFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    All Products ({products.length})
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={isBatchFixing}
                onClick={handleBatchFixAllLinks}
                className="px-4 py-2.5 rounded-xl bg-[#E91E8C] hover:bg-[#d0177c] text-white text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {isBatchFixing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                <span>
                  {isBatchFixing
                    ? 'Repairing Product Links...'
                    : `Auto-Fix All Broken Product Links`}
                </span>
              </button>
            </div>

            {batchFeedback && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-semibold ${
                  batchFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {batchFeedback.type === 'success' ? (
                  <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                )}
                <span>{batchFeedback.text}</span>
              </div>
            )}

            {/* Table */}
            {filteredAuditRows.length === 0 ? (
              <div className="p-10 text-center space-y-2 border border-dashed border-slate-200 rounded-xl">
                <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
                <p className="text-sm font-bold text-slate-900">
                  {linkFilter === 'issues'
                    ? 'No Broken Product Links Detected'
                    : 'No Matching Products Found'}
                </p>
                <p className="text-xs text-slate-500">
                  {linkFilter === 'issues'
                    ? 'Every product has a clean slug, valid canonical URL, and HTTPS meta image.'
                    : 'Try adjusting your search query.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50">
                      <th className="py-3 px-3">Product</th>
                      <th className="py-3 px-3">Current Path</th>
                      <th className="py-3 px-3">Link Health</th>
                      <th className="py-3 px-3">Clean SEO Slug (`/product/...`)</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditRows.map((row) => {
                      const prod = products.find((p) => p.id === row.productId);
                      const draftVal = rowSlugDrafts[row.productId] ?? row.suggestedSlug;
                      const isRowSaving = savingRowId === row.productId;

                      return (
                        <tr key={row.productId} className="hover:bg-slate-50/70">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5 min-w-[200px]">
                              <img
                                src={prod?.image || DEFAULT_OG_IMAGE}
                                alt={row.productName}
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate max-w-[220px]">
                                  {row.productName}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">
                                  {row.brand} · <span className="font-mono">{row.productId}</span>
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 font-mono text-[11px] text-slate-600 max-w-[210px] truncate">
                            {row.currentPath}
                          </td>

                          <td className="py-3 px-3 min-w-[200px]">
                            {row.severity === 'healthy' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                <Check size={12} />
                                <span>Healthy URL</span>
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                {row.issueLabels.map((lbl, i) => (
                                  <p
                                    key={i}
                                    className={`text-[11px] font-semibold ${
                                      row.severity === 'error'
                                        ? 'text-rose-600'
                                        : 'text-amber-700'
                                    }`}
                                  >
                                    {lbl}
                                  </p>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 min-w-[240px]">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={draftVal}
                                onChange={(e) =>
                                  setRowSlugDrafts((prev) => ({
                                    ...prev,
                                    [row.productId]: e.target.value,
                                  }))
                                }
                                placeholder={row.suggestedSlug}
                                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-[#E91E8C] outline-none font-mono text-[11px] text-slate-900 bg-white min-w-[160px]"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setRowSlugDrafts((prev) => ({
                                    ...prev,
                                    [row.productId]: row.suggestedSlug,
                                  }))
                                }
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#E91E8C] cursor-pointer"
                                title="Fill Suggested Slug"
                              >
                                <RefreshCw size={12} />
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                disabled={isRowSaving}
                                onClick={() => handleSaveRowSlug(row)}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer disabled:opacity-50"
                              >
                                {isRowSaving ? 'Saving...' : 'Save Slug'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPath(row.currentPath);
                                  setStudioMode('pages');
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-[#E91E8C] text-slate-700 hover:text-[#E91E8C] font-bold text-[11px] cursor-pointer"
                              >
                                Edit SEO
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cloudinary Media Library Modal */}
      <MediaLibraryModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        title="Select Meta Image (OpenGraph)"
        onSelectImage={(url) => {
          isFormDirtyRef.current = true;
          setOgImage(url);
        }}
      />
    </div>
  );
};
