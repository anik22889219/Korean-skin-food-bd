import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  List,
  ListOrdered,
  Package,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { articleService, slugifyGuideTitle } from '../services/articleService';
import { SkincareGuide } from '../data/skincareGuides';
import { useProducts } from '../hooks/queries/products';
import { getUniqueBrandList } from '../data/brands';
import { MediaLibraryModal } from './MediaLibraryModal';
import { GuideContentRenderer } from './GuideContentRenderer';
import { getRetailPrice } from '../utils/pricing';

type GuideCategory = SkincareGuide['category'];

const CATEGORY_OPTIONS: Array<{ value: GuideCategory; label: string }> = [
  { value: 'routine', label: 'Routines & Steps' },
  { value: 'sun_care', label: 'Sun Protection' },
  { value: 'sensitive', label: 'Sensitive Skin' },
  { value: 'acne', label: 'Acne & Pores' },
  { value: 'dry_skin', label: 'Dry & Dehydrated Skin' },
  { value: 'ingredients', label: 'Active Ingredients' },
  { value: 'layering', label: 'Product Layering' },
  { value: 'authentication', label: 'Authenticity Checks' },
];

const CATEGORY_LABEL_MAP: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label])
);

const SKIN_TYPE_PRESETS = [
  'All Skin Types',
  'Oily',
  'Dry',
  'Very Dry',
  'Combination',
  'Sensitive',
  'Acne-Prone',
  'Normal',
  'Irritated',
  'Reactive',
  'Hyperpigmented',
];

function brandToSlug(brandName: string): string {
  return brandName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createEmptyGuideDraft(): Partial<SkincareGuide> {
  return {
    id: `guide-${Date.now()}`,
    slug: '',
    title: '',
    titleBN: '',
    excerpt: '',
    excerptBN: '',
    category: 'routine',
    status: 'draft',
    isDeleted: false,
    readingTimeMinutes: 5,
    publishedDate: new Date().toISOString(),
    lastUpdatedDate: new Date().toISOString(),
    heroImage: '',
    imageAltText: '',
    targetSkinTypes: ['All Skin Types'],
    keyIngredients: [],
    recommendedBrandSlugs: [],
    recommendedProductIds: [],
    content: '### Introduction\n\nWrite your skincare guide here...\n\n*Disclaimer: Cosmetic products support skin hygiene, hydration, and cosmetic appearance; they are not intended to diagnose, treat, cure, or prevent dermatological medical conditions.*',
    contentBN: '### ভূমিকা\n\nবাংলায় ত্বকের যত্ন সম্পর্কিত বিস্তারিত নির্দেশিকা এখানে লিখুন...',
    faqs: [
      {
        question: '',
        questionBN: '',
        answer: '',
        answerBN: '',
      },
    ],
    author: {
      name: 'Korean Skin Food BD Editorial Team',
      role: 'K-Beauty Cosmeceutical Research',
    },
  };
}

const CoverThumbnail: React.FC<{
  src?: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-slate-100 text-[#E91E8C]/70 ${className}`}
      >
        <BookOpen size={20} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const AdminBlogs: React.FC = () => {
  const { data: catalogProducts = [] } = useProducts();

  const [guides, setGuides] = useState<SkincareGuide[]>(() =>
    articleService.getAllAdminArticles()
  );
  const [deletedBuiltInCount, setDeletedBuiltInCount] = useState<number>(() =>
    articleService.getDeletedBuiltInCount()
  );

  // List filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingOriginalSlug, setEditingOriginalSlug] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [formData, setFormData] = useState<Partial<SkincareGuide>>(createEmptyGuideDraft);
  const [editorLanguageMode, setEditorLanguageMode] = useState<'en' | 'bn' | 'split'>('split');
  const [editorViewMode, setEditorViewMode] = useState<'edit' | 'preview'>('edit');
  const [previewLang, setPreviewLang] = useState<'en' | 'bn'>('en');

  // Tag & Picker helpers
  const [newSkinTypeInput, setNewSkinTypeInput] = useState('');
  const [newIngredientInput, setNewIngredientInput] = useState('');
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // Async & feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SkincareGuide | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const contentEnRef = useRef<HTMLTextAreaElement | null>(null);
  const contentBnRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const unsub = articleService.subscribeAdmin((loaded) => {
      setGuides(loaded);
      setDeletedBuiltInCount(articleService.getDeletedBuiltInCount());
    });
    return () => unsub();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Canonical brand list from catalog + presets
  const allBrands = useMemo(() => {
    const list = getUniqueBrandList(catalogProducts);
    return list.map((name) => ({
      name,
      slug: brandToSlug(name),
    }));
  }, [catalogProducts]);

  // Stats
  const stats = useMemo(() => {
    const total = guides.length;
    const published = guides.filter((g) => g.status !== 'draft').length;
    const drafts = guides.filter((g) => g.status === 'draft').length;
    const avgRead =
      total > 0
        ? Math.round(guides.reduce((sum, g) => sum + (g.readingTimeMinutes || 5), 0) / total)
        : 0;
    return { total, published, drafts, avgRead };
  }, [guides]);

  // Filtered list
  const filteredGuides = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return guides.filter((guide) => {
      const currentStatus = guide.status === 'draft' ? 'draft' : 'published';
      if (statusFilter !== 'all' && currentStatus !== statusFilter) return false;
      if (categoryFilter !== 'all' && guide.category !== categoryFilter) return false;
      if (q) {
        const hay = [
          guide.title,
          guide.titleBN,
          guide.slug,
          guide.excerpt,
          guide.excerptBN,
          ...(guide.keyIngredients || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [guides, statusFilter, categoryFilter, searchQuery]);

  // Filtered brand & product pickers in editor
  const filteredBrandsForPicker = useMemo(() => {
    const q = brandSearchQuery.trim().toLowerCase();
    if (!q) return allBrands;
    return allBrands.filter(
      (b) => b.name.toLowerCase().includes(q) || b.slug.includes(q)
    );
  }, [allBrands, brandSearchQuery]);

  const filteredProductsForPicker = useMemo(() => {
    const q = productSearchQuery.trim().toLowerCase();
    const list = catalogProducts.filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    });
    return list.slice(0, 30);
  }, [catalogProducts, productSearchQuery]);

  const selectedRecommendedProducts = useMemo(() => {
    const ids = formData.recommendedProductIds || [];
    const byId = new Map(catalogProducts.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [catalogProducts, formData.recommendedProductIds]);

  const previewMatchedProducts = useMemo(() => {
    const explicitIds = new Set(formData.recommendedProductIds || []);
    const explicit = catalogProducts.filter((p) => explicitIds.has(p.id));
    const brandSlugs = formData.recommendedBrandSlugs || [];
    const brandMatches = catalogProducts.filter(
      (p) => !explicitIds.has(p.id) && brandSlugs.includes(brandToSlug(p.brand || ''))
    );
    return [...explicit, ...brandMatches].slice(0, 4);
  }, [catalogProducts, formData.recommendedProductIds, formData.recommendedBrandSlugs]);

  const slugCollision = useMemo(() => {
    const candidate = slugifyGuideTitle(formData.slug || '');
    if (!candidate) return false;
    return guides.some(
      (g) =>
        g.slug.toLowerCase() === candidate &&
        g.slug.toLowerCase() !== (editingOriginalSlug || '').toLowerCase()
    );
  }, [formData.slug, guides, editingOriginalSlug]);

  // Handlers
  const handleCreateNew = () => {
    setEditingOriginalSlug(null);
    setSlugManuallyEdited(false);
    setFormData(createEmptyGuideDraft());
    setEditorViewMode('edit');
    setEditorLanguageMode('split');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (guide: SkincareGuide) => {
    setEditingOriginalSlug(guide.slug);
    setSlugManuallyEdited(true);
    setFormData({
      ...guide,
      status: guide.status === 'draft' ? 'draft' : 'published',
      targetSkinTypes: [...(guide.targetSkinTypes || [])],
      keyIngredients: [...(guide.keyIngredients || [])],
      recommendedBrandSlugs: [...(guide.recommendedBrandSlugs || [])],
      recommendedProductIds: [...(guide.recommendedProductIds || [])],
      faqs: (guide.faqs || []).map((f) => ({ ...f })),
      author: {
        name: guide.author?.name || 'Korean Skin Food BD Editorial Team',
        role: guide.author?.role || 'K-Beauty Cosmeceutical Research',
      },
    });
    setEditorViewMode('edit');
    setIsEditorOpen(true);
  };

  const handleTitleEnChange = (value: string) => {
    setFormData((prev) => {
      const next: Partial<SkincareGuide> = { ...prev, title: value };
      if (!editingOriginalSlug && !slugManuallyEdited) {
        next.slug = slugifyGuideTitle(value);
      }
      return next;
    });
  };

  const handleEstimateReadTime = () => {
    const enWords = (formData.content || '').trim().split(/\s+/).filter(Boolean).length;
    const bnWords = (formData.contentBN || '').trim().split(/\s+/).filter(Boolean).length;
    const wordCount = Math.max(enWords, bnWords);
    const estimated = Math.max(1, Math.min(60, Math.ceil(wordCount / 180) || 1));
    setFormData((prev) => ({ ...prev, readingTimeMinutes: estimated }));
    showToast(`Reading time updated to ${estimated} min based on ${wordCount} words.`, 'info');
  };

  const insertMarkdownSnippet = (target: 'en' | 'bn', snippet: string) => {
    const field = target === 'en' ? 'content' : 'contentBN';
    const ref = target === 'en' ? contentEnRef.current : contentBnRef.current;

    if (ref) {
      const start = ref.selectionStart ?? (formData[field] || '').length;
      const end = ref.selectionEnd ?? start;
      const current = formData[field] || '';
      const prefix = start > 0 && current[start - 1] !== '\n' ? '\n\n' : '';
      const nextVal = current.slice(0, start) + prefix + snippet + current.slice(end);
      setFormData((prev) => ({ ...prev, [field]: nextVal }));
      window.requestAnimationFrame(() => {
        ref.focus();
        const cursor = start + prefix.length + snippet.length;
        ref.setSelectionRange(cursor, cursor);
      });
    } else {
      const current = formData[field] || '';
      setFormData((prev) => ({
        ...prev,
        [field]: current ? `${current}\n\n${snippet}` : snippet,
      }));
    }
  };

  const toggleSkinType = (skinType: string) => {
    setFormData((prev) => {
      const current = prev.targetSkinTypes || [];
      const exists = current.includes(skinType);
      return {
        ...prev,
        targetSkinTypes: exists
          ? current.filter((item) => item !== skinType)
          : [...current, skinType],
      };
    });
  };

  const handleAddCustomSkinType = () => {
    const clean = newSkinTypeInput.trim();
    if (!clean) return;
    setFormData((prev) => {
      const current = prev.targetSkinTypes || [];
      if (current.some((s) => s.toLowerCase() === clean.toLowerCase())) return prev;
      return { ...prev, targetSkinTypes: [...current, clean] };
    });
    setNewSkinTypeInput('');
  };

  const handleAddIngredient = () => {
    const clean = newIngredientInput.trim();
    if (!clean) return;
    setFormData((prev) => {
      const current = prev.keyIngredients || [];
      if (current.some((i) => i.toLowerCase() === clean.toLowerCase())) return prev;
      return { ...prev, keyIngredients: [...current, clean] };
    });
    setNewIngredientInput('');
  };

  const handleRemoveIngredient = (ing: string) => {
    setFormData((prev) => ({
      ...prev,
      keyIngredients: (prev.keyIngredients || []).filter((item) => item !== ing),
    }));
  };

  const toggleBrandSlug = (brandSlug: string) => {
    setFormData((prev) => {
      const current = prev.recommendedBrandSlugs || [];
      const exists = current.includes(brandSlug);
      return {
        ...prev,
        recommendedBrandSlugs: exists
          ? current.filter((b) => b !== brandSlug)
          : [...current, brandSlug],
      };
    });
  };

  const toggleProductId = (productId: string) => {
    setFormData((prev) => {
      const current = prev.recommendedProductIds || [];
      const exists = current.includes(productId);
      return {
        ...prev,
        recommendedProductIds: exists
          ? current.filter((id) => id !== productId)
          : [...current, productId],
      };
    });
  };

  const handleAddFaq = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: [
        ...(prev.faqs || []),
        { question: '', questionBN: '', answer: '', answerBN: '' },
      ],
    }));
  };

  const handleUpdateFaq = (
    index: number,
    field: 'question' | 'questionBN' | 'answer' | 'answerBN',
    value: string
  ) => {
    setFormData((prev) => {
      const next = [...(prev.faqs || [])];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: value };
      return { ...prev, faqs: next };
    });
  };

  const handleMoveFaq = (index: number, direction: -1 | 1) => {
    setFormData((prev) => {
      const list = [...(prev.faqs || [])];
      const target = index + direction;
      if (target < 0 || target >= list.length) return prev;
      const [item] = list.splice(index, 1);
      list.splice(target, 0, item);
      return { ...prev, faqs: list };
    });
  };

  const handleRemoveFaq = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      faqs: (prev.faqs || []).filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (targetStatus?: 'published' | 'draft') => {
    const title = (formData.title || '').trim();
    const slug = slugifyGuideTitle(formData.slug || title);

    if (!title) {
      showToast('Please enter an English title for the blog guide.', 'error');
      return;
    }
    if (!slug || slug.length < 2) {
      showToast('Please enter a valid URL slug (at least 2 letters or numbers).', 'error');
      return;
    }
    if (slugCollision) {
      showToast(`Another guide already uses the slug "/guide/${slug}". Please choose a unique slug.`, 'error');
      return;
    }
    if (formData.heroImage && formData.heroImage.length > 1500) {
      showToast('Cover image URL exceeds 1500 characters. Please upload via the Media Library.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const finalStatus = targetStatus || (formData.status === 'draft' ? 'draft' : 'published');
      const saved = await articleService.saveArticle(
        {
          ...formData,
          slug,
          status: finalStatus,
        },
        editingOriginalSlug || undefined
      );
      setEditingOriginalSlug(saved.slug);
      setFormData(saved);
      setIsEditorOpen(false);
      showToast(
        finalStatus === 'published'
          ? `"${saved.title}" is now live on Korean Skincare Guides!`
          : `"${saved.title}" saved as a Draft.`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to save blog guide. Check your staff permissions.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickToggleStatus = async (guide: SkincareGuide) => {
    const nextStatus = guide.status === 'draft' ? 'published' : 'draft';
    setBusySlug(guide.slug);
    try {
      await articleService.toggleArticleStatus(guide.slug, nextStatus);
      showToast(
        nextStatus === 'published'
          ? `"${guide.title}" published to storefront.`
          : `"${guide.title}" moved to Drafts.`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Could not update guide status.', 'error');
    } finally {
      setBusySlug(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setBusySlug(deleteTarget.slug);
    try {
      await articleService.deleteArticle(deleteTarget.slug);
      showToast(`"${deleteTarget.title}" removed from guides.`, 'success');
      if (isEditorOpen && editingOriginalSlug === deleteTarget.slug) {
        setIsEditorOpen(false);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete guide.', 'error');
    } finally {
      setBusySlug(null);
    }
  };

  const handleRestoreDefaults = async () => {
    setIsSaving(true);
    try {
      const count = await articleService.restoreDeletedBuiltInGuides();
      showToast(
        count > 0
          ? `Restored ${count} default skincare guide${count > 1 ? 's' : ''}.`
          : 'All default guides are already active.',
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Could not restore default guides.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== EDITOR VIEW ====================
  if (isEditorOpen) {
    const activeSlug = slugifyGuideTitle(formData.slug || formData.title || '') || 'new-guide';
    const isDraft = formData.status === 'draft';
    const previewTitle =
      previewLang === 'bn' && formData.titleBN?.trim()
        ? formData.titleBN
        : formData.title || 'Untitled Guide';
    const previewExcerpt =
      previewLang === 'bn' && formData.excerptBN?.trim()
        ? formData.excerptBN
        : formData.excerpt || '';
    const previewContent =
      previewLang === 'bn' && formData.contentBN?.trim()
        ? formData.contentBN
        : formData.content || '';

    return (
      <div className="space-y-4 sm:space-y-5 max-w-[1440px] mx-auto overflow-x-hidden">
        {/* Editor Action Bar (Sticky on Desktop lg+, Static on Mobile to preserve viewport height) */}
        <div className="lg:sticky lg:top-28 z-20 bg-white border border-pink-100 rounded-2xl p-3 sm:p-3.5 lg:px-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center justify-between lg:justify-start gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[42px] text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft size={14} />
              <span>Back to Blogs</span>
            </button>

            <div className="min-w-0 hidden sm:block">
              <p className="text-sm font-extrabold text-slate-900 truncate max-w-xs md:max-w-md">
                {formData.title?.trim() || (editingOriginalSlug ? 'Edit Skincare Guide' : 'New Skincare Guide')}
              </p>
              <p className="text-[11px] text-slate-500 font-mono truncate">
                /guide/{activeSlug}
              </p>
            </div>

            {/* Mobile quick Edit/Preview switcher aligned with Back button */}
            <div className="flex lg:hidden items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setEditorViewMode('edit')}
                className={`px-3 py-1.5 min-h-[34px] rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  editorViewMode === 'edit'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setEditorViewMode('preview')}
                className={`px-3 py-1.5 min-h-[34px] rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-1 ${
                  editorViewMode === 'preview'
                    ? 'bg-white text-[#E91E8C] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye size={13} />
                <span>Preview</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Desktop Edit / Live Preview Switcher */}
            <div className="hidden lg:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
              <button
                type="button"
                onClick={() => setEditorViewMode('edit')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  editorViewMode === 'edit'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setEditorViewMode('preview')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                  editorViewMode === 'preview'
                    ? 'bg-white text-[#E91E8C] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye size={13} />
                <span>Live Preview</span>
              </button>
            </div>

            {/* Draft / Published Selector */}
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  status: isDraft ? 'published' : 'draft',
                }))
              }
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[42px] lg:min-h-0 rounded-xl text-xs font-bold border transition cursor-pointer whitespace-nowrap shrink-0 w-full sm:w-auto ${
                isDraft
                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              }`}
              title="Toggle visibility status"
            >
              {isDraft ? <EyeOff size={13} /> : <CheckCircle2 size={13} />}
              <span>{isDraft ? 'Status: Draft' : 'Status: Published'}</span>
            </button>

            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave('draft')}
                className="px-3.5 py-2 min-h-[42px] lg:min-h-0 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0 text-center"
              >
                Save Draft
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave('published')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[42px] lg:min-h-0 rounded-xl bg-[#E91E8C] hover:bg-[#d0177c] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Save size={14} />
                <span>{isSaving ? 'Saving...' : 'Publish Guide'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`px-4 py-3 rounded-2xl border flex items-center justify-between text-xs ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : toast.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <span className="font-semibold">{toast.text}</span>
            <button type="button" onClick={() => setToast(null)} className="cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {editorViewMode === 'preview' ? (
          /* LIVE PREVIEW VIEW */
          <div className="space-y-6">
            <div className="bg-white border border-pink-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Live Storefront Preview
                </h2>
                <p className="text-xs text-slate-500">
                  Inspect how this blog guide appears on Korean Skincare Guides (/guides) and its full article page (/guide/{activeSlug}).
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-pink-50/70 rounded-xl border border-pink-100 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewLang('en')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    previewLang === 'en' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLang('bn')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    previewLang === 'bn' ? 'bg-white text-[#E91E8C] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  বাংলা
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Card Preview */}
              <div className="lg:col-span-4 space-y-2">
                <span className="text-xs font-bold text-slate-500 block">
                  Listing Card Preview (/guides)
                </span>
                <div className="bg-white border border-pink-100 rounded-2xl overflow-hidden shadow-xs">
                  <div className="relative aspect-[16/9] bg-pink-50 overflow-hidden">
                    <CoverThumbnail
                      src={formData.heroImage}
                      alt={formData.imageAltText || previewTitle}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 tabular-nums">
                      <Clock size={11} />
                      <span>{formData.readingTimeMinutes || 5} min read</span>
                    </div>
                  </div>
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 font-semibold">
                      <span>{(formData.category || 'routine').toUpperCase().replace('_', ' ')}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {new Date(formData.publishedDate || Date.now()).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-gray-900 leading-snug line-clamp-2">
                      {previewTitle}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed font-medium">
                      {previewExcerpt || 'Add a summary excerpt to appear on the guides grid card.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Full Article Preview */}
              <div className="lg:col-span-8 bg-white border border-pink-100 rounded-2xl sm:rounded-3xl p-4 sm:p-8 space-y-5 sm:space-y-6 shadow-xs">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 font-medium">
                    <span className="font-bold text-[#E91E8C]">
                      {CATEGORY_LABEL_MAP[formData.category || 'routine'] || formData.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formData.readingTimeMinutes || 5} min read</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate max-w-full">{formData.author?.name || 'Korean Skin Food BD Editorial Team'}</span>
                  </div>

                  <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 leading-tight text-balance">
                    {previewTitle}
                  </h1>

                  <div className="aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden bg-pink-50 border border-pink-100">
                    <CoverThumbnail
                      src={formData.heroImage}
                      alt={formData.imageAltText || previewTitle}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <GuideContentRenderer content={previewContent} />

                {(formData.keyIngredients?.length || 0) > 0 && (
                  <div className="p-4 rounded-2xl bg-pink-50/30 border border-pink-100 space-y-2">
                    <span className="text-xs font-bold text-slate-900 block">
                      Key Active Ingredients
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {formData.keyIngredients?.map((ing, i) => (
                        <span
                          key={i}
                          className="text-xs font-semibold text-slate-700 bg-white px-3 py-1 rounded-lg border border-pink-100"
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(formData.faqs?.filter((f) => f.question.trim() && f.answer.trim()).length || 0) >
                  0 && (
                  <div className="space-y-3 pt-4 border-t border-pink-100">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <HelpCircle size={16} className="text-[#E91E8C]" />
                      <span>Frequently Asked Questions</span>
                    </h3>
                    {formData.faqs
                      ?.filter((f) => f.question.trim() && f.answer.trim())
                      .map((faq, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-pink-100 bg-pink-50/15 space-y-1"
                        >
                          <p className="text-xs font-bold text-slate-900">
                            {previewLang === 'bn' && faq.questionBN ? faq.questionBN : faq.question}
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {previewLang === 'bn' && faq.answerBN ? faq.answerBN : faq.answer}
                          </p>
                        </div>
                      ))}
                  </div>
                )}

                {previewMatchedProducts.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-pink-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles size={15} className="text-[#E91E8C]" />
                      <span>Linked Storefront Products ({previewMatchedProducts.length})</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {previewMatchedProducts.map((p) => (
                        <div
                          key={p.id}
                          className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1.5"
                        >
                          <img
                            src={p.image}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-full aspect-square object-cover rounded-lg bg-slate-50"
                          />
                          <p className="text-[11px] font-bold text-slate-900 line-clamp-2">
                            {p.name}
                          </p>
                          <p className="text-[11px] font-bold text-[#E91E8C] tabular-nums">
                            ৳{getRetailPrice(p).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* EDITOR WORKSPACE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / MAIN COLUMN */}
            <div className="lg:col-span-8 space-y-6">
              {/* Language Workspace Mode */}
              <div className="bg-white border border-pink-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-50 pb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Bilingual Content Studio
                    </h2>
                    <p className="text-xs text-slate-500">
                      Write and edit both English and Bengali versions of this guide.
                    </p>
                  </div>

                  <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs w-full sm:w-auto overflow-x-auto scrollbar-none">
                    {(
                      [
                        { id: 'split', label: 'Side-by-Side' },
                        { id: 'en', label: 'English Only' },
                        { id: 'bn', label: 'বাংলা Only' },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setEditorLanguageMode(mode.id)}
                        className={`flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 text-center ${
                          editorLanguageMode === mode.id
                            ? 'bg-white text-[#E91E8C] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Titles */}
                <div
                  className={`grid gap-4 ${
                    editorLanguageMode === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                  }`}
                >
                  {editorLanguageMode !== 'bn' && (
                    <div className="space-y-1.5 min-w-0">
                      <label className="block text-xs font-bold text-slate-700">
                        Guide Title (English) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title || ''}
                        onChange={(e) => handleTitleEnChange(e.target.value)}
                        placeholder="e.g. Best Korean Skincare Routine for Monsoon in Bangladesh"
                        className="w-full px-3.5 py-2.5 bg-pink-50/15 border border-pink-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-[#E91E8C]"
                      />
                    </div>
                  )}

                  {editorLanguageMode !== 'en' && (
                    <div className="space-y-1.5 min-w-0">
                      <label className="block text-xs font-bold text-slate-700">
                        Guide Title (বাংলা)
                      </label>
                      <input
                        type="text"
                        value={formData.titleBN || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, titleBN: e.target.value }))
                        }
                        placeholder="যেমন: বর্ষাকালে বাংলাদেশে কোরিয়ান স্কিন কেয়ার রুটিন"
                        className="w-full px-3.5 py-2.5 bg-pink-50/15 border border-pink-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-[#E91E8C]"
                      />
                    </div>
                  )}
                </div>

                {/* URL Slug */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="block text-xs font-bold text-slate-700 shrink-0">
                      URL Slug <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono truncate max-w-full">
                      /guide/{activeSlug}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formData.slug || ''}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setFormData((prev) => ({
                        ...prev,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
                      }));
                    }}
                    placeholder="korean-skincare-routine-for-bangladesh"
                    className={`w-full px-3.5 py-2.5 sm:py-2 bg-slate-50 border rounded-xl text-sm sm:text-xs font-mono outline-none focus:bg-white ${
                      slugCollision
                        ? 'border-rose-400 text-rose-700 focus:border-rose-500'
                        : 'border-slate-200 text-slate-800 focus:border-[#E91E8C]'
                    }`}
                  />
                  {slugCollision && (
                    <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>This slug is already used by another guide. Please customize it.</span>
                    </p>
                  )}
                </div>

                {/* Summary Excerpts */}
                <div
                  className={`grid gap-4 ${
                    editorLanguageMode === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                  }`}
                >
                  {editorLanguageMode !== 'bn' && (
                    <div className="space-y-1.5 min-w-0">
                      <label className="block text-xs font-bold text-slate-700">
                        Short Summary Excerpt (English)
                      </label>
                      <textarea
                        rows={3}
                        value={formData.excerpt || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
                        }
                        placeholder="Concise 1-2 sentence overview displayed on guide cards and Google search snippets..."
                        className="w-full px-3.5 py-2.5 bg-pink-50/15 border border-pink-200 rounded-xl text-sm sm:text-xs text-slate-800 leading-relaxed outline-none focus:bg-white focus:border-[#E91E8C]"
                      />
                    </div>
                  )}

                  {editorLanguageMode !== 'en' && (
                    <div className="space-y-1.5 min-w-0">
                      <label className="block text-xs font-bold text-slate-700">
                        Short Summary Excerpt (বাংলা)
                      </label>
                      <textarea
                        rows={3}
                        value={formData.excerptBN || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, excerptBN: e.target.value }))
                        }
                        placeholder="গাইড কার্ডে দেখানোর জন্য সংক্ষিপ্ত সারসংক্ষেপ..."
                        className="w-full px-3.5 py-2.5 bg-pink-50/15 border border-pink-200 rounded-xl text-sm sm:text-xs text-slate-800 leading-relaxed outline-none focus:bg-white focus:border-[#E91E8C]"
                      />
                    </div>
                  )}
                </div>

                {/* Body Content Editors with Formatting Toolbar */}
                <div
                  className={`grid gap-5 ${
                    editorLanguageMode === 'split' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'
                  }`}
                >
                  {editorLanguageMode !== 'bn' && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-700">
                          Full Guide Content (English Markdown)
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => insertMarkdownSnippet('en', '### Section Heading')}
                            className="px-2.5 py-1.5 sm:py-1 text-[11px] sm:text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                            title="Insert Section Heading"
                          >
                            H2
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdownSnippet('en', '#### Subheading')}
                            className="px-2.5 py-1.5 sm:py-1 text-[11px] sm:text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                            title="Insert Subheading"
                          >
                            H3
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdownSnippet('en', '**Key highlight**')}
                            className="px-2.5 py-1.5 sm:py-1 text-[11px] sm:text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                            title="Insert Bold"
                          >
                            Bold
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              insertMarkdownSnippet('en', '- First point\n- Second point')
                            }
                            className="p-2 sm:p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                            title="Insert Bullet List"
                          >
                            <List size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              insertMarkdownSnippet('en', '1. Step one\n2. Step two')
                            }
                            className="p-2 sm:p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                            title="Insert Numbered List"
                          >
                            <ListOrdered size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              insertMarkdownSnippet(
                                'en',
                                '*Disclaimer: Cosmetic products support skin hygiene and hydration; they are not intended to treat medical conditions.*'
                              )
                            }
                            className="px-2.5 py-1.5 sm:py-1 text-[11px] sm:text-[10px] font-bold bg-pink-50 hover:bg-pink-100 text-[#E91E8C] rounded-lg cursor-pointer"
                            title="Insert Disclaimer"
                          >
                            Disclaimer
                          </button>
                        </div>
                      </div>
                      <textarea
                        ref={contentEnRef}
                        rows={11}
                        value={formData.content || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, content: e.target.value }))
                        }
                        placeholder="### Heading&#10;&#10;Write detailed evidence-based skincare advice..."
                        className="w-full px-3.5 py-3 bg-slate-950 text-pink-100 border border-slate-800 rounded-xl font-mono text-sm sm:text-xs leading-relaxed outline-none focus:border-[#E91E8C]"
                      />
                    </div>
                  )}

                  {editorLanguageMode !== 'en' && (
                    <div className="space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-700">
                          Full Guide Content (বাংলা Markdown)
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => insertMarkdownSnippet('bn', '### মূল শিরোনাম')}
                            className="px-2.5 py-1.5 sm:py-1 text-[11px] sm:text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                          >
                            H2
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdownSnippet('bn', '#### উপ-শিরোনাম')}
                            className="px-2.5 py-1.5 sm:py-1 text-[11px] sm:text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                          >
                            H3
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdownSnippet('bn', '**গুরুত্বপূর্ণ তথ্য**')}
                            className="px-2.5 py-1.5 sm:py-1 text-[11px] sm:text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                          >
                            Bold
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              insertMarkdownSnippet('bn', '- প্রথম ধাপ\n- দ্বিতীয় ধাপ')
                            }
                            className="p-2 sm:p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                            title="Insert Bullet List"
                          >
                            <List size={13} />
                          </button>
                        </div>
                      </div>
                      <textarea
                        ref={contentBnRef}
                        rows={11}
                        value={formData.contentBN || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, contentBN: e.target.value }))
                        }
                        placeholder="### নির্দেশিকা&#10;&#10;এখানে বাংলায় বিস্তারিত লিখুন..."
                        className="w-full px-3.5 py-3 bg-slate-950 text-pink-100 border border-slate-800 rounded-xl font-mono text-sm sm:text-xs leading-relaxed outline-none focus:border-[#E91E8C]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bilingual FAQ Builder */}
              <div className="bg-white border border-pink-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pink-50 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <HelpCircle size={16} className="text-[#E91E8C]" />
                      <span>Bilingual FAQ Builder ({formData.faqs?.length || 0})</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      FAQs appear in an interactive accordion on the guide page and boost Google FAQ Schema visibility.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFaq}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Plus size={14} />
                    <span>Add FAQ</span>
                  </button>
                </div>

                {(formData.faqs?.length || 0) === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                    <p className="text-xs text-slate-500">No FAQs added to this guide yet.</p>
                    <button
                      type="button"
                      onClick={handleAddFaq}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#E91E8C] hover:underline cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add your first FAQ</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.faqs?.map((faq, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-700 tabular-nums">
                            FAQ #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveFaq(idx, -1)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded-lg hover:bg-white cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === (formData.faqs?.length || 1) - 1}
                              onClick={() => handleMoveFaq(idx, 1)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded-lg hover:bg-white cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFaq(idx)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 cursor-pointer"
                              title="Remove FAQ"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-slate-600">
                              Question (English)
                            </label>
                            <input
                              type="text"
                              value={faq.question}
                              onChange={(e) => handleUpdateFaq(idx, 'question', e.target.value)}
                              placeholder="e.g. Can oily skin skip moisturizer?"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#E91E8C]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-slate-600">
                              Question (বাংলা - Optional)
                            </label>
                            <input
                              type="text"
                              value={faq.questionBN || ''}
                              onChange={(e) => handleUpdateFaq(idx, 'questionBN', e.target.value)}
                              placeholder="তৈলাক্ত ত্বকে কি ময়েশ্চারাইজার বাদ দেওয়া যায়?"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#E91E8C]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-slate-600">
                              Answer (English)
                            </label>
                            <textarea
                              rows={2}
                              value={faq.answer}
                              onChange={(e) => handleUpdateFaq(idx, 'answer', e.target.value)}
                              placeholder="Provide a clear, practical answer..."
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#E91E8C]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-slate-600">
                              Answer (বাংলা - Optional)
                            </label>
                            <textarea
                              rows={2}
                              value={faq.answerBN || ''}
                              onChange={(e) => handleUpdateFaq(idx, 'answerBN', e.target.value)}
                              placeholder="বাংলায় উত্তর লিখুন..."
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#E91E8C]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT / SETTINGS & VISUAL PICKERS SIDEBAR */}
            <div className="lg:col-span-4 space-y-5">
              {/* Cover Image Picker */}
              <div className="bg-white border border-pink-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-[#E91E8C]" />
                    <span>Cover Photo</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsMediaModalOpen(true)}
                    className="px-3 py-2 sm:py-1.5 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] text-[11px] font-bold rounded-lg transition cursor-pointer whitespace-nowrap"
                  >
                    Choose from Media Library
                  </button>
                </div>

                <div className="aspect-video rounded-xl overflow-hidden border border-pink-100 bg-pink-50/30">
                  <CoverThumbnail
                    src={formData.heroImage}
                    alt={formData.imageAltText || formData.title || 'Guide Cover'}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Image URL
                  </label>
                  <input
                    type="text"
                    value={formData.heroImage || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, heroImage: e.target.value }))
                    }
                    placeholder="https://res.cloudinary.com/..."
                    className="w-full px-3 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs font-mono outline-none focus:bg-white focus:border-[#E91E8C]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">
                    SEO Image Alt Text
                  </label>
                  <input
                    type="text"
                    value={formData.imageAltText || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, imageAltText: e.target.value }))
                    }
                    placeholder="Describe the skincare image for accessibility & SEO"
                    className="w-full px-3 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs outline-none focus:bg-white focus:border-[#E91E8C]"
                  />
                </div>
              </div>

              {/* Category, Reading Time & Author */}
              <div className="bg-white border border-pink-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-[#E91E8C]" />
                  <span>Guide Details</span>
                </h3>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">Category</label>
                  <select
                    value={formData.category || 'routine'}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: e.target.value as GuideCategory,
                      }))
                    }
                    className="w-full px-3 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#E91E8C]"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-600">
                        Read Time (min)
                      </label>
                      <button
                        type="button"
                        onClick={handleEstimateReadTime}
                        className="text-[10px] font-bold text-[#E91E8C] hover:underline cursor-pointer"
                      >
                        Auto
                      </button>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={formData.readingTimeMinutes || 5}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          readingTimeMinutes: Math.max(1, Number(e.target.value) || 1),
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono tabular-nums outline-none focus:bg-white focus:border-[#E91E8C]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Publish Date
                    </label>
                    <input
                      type="date"
                      value={(formData.publishedDate || new Date().toISOString()).slice(0, 10)}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          publishedDate: e.target.value
                            ? new Date(`${e.target.value}T09:00:00Z`).toISOString()
                            : new Date().toISOString(),
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono tabular-nums outline-none focus:bg-white focus:border-[#E91E8C]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">Author Name</label>
                  <input
                    type="text"
                    value={formData.author?.name || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        author: {
                          name: e.target.value,
                          role: prev.author?.role || 'K-Beauty Cosmeceutical Research',
                        },
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#E91E8C]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">Author Role</label>
                  <input
                    type="text"
                    value={formData.author?.role || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        author: {
                          name: prev.author?.name || 'Korean Skin Food BD Editorial Team',
                          role: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#E91E8C]"
                  />
                </div>
              </div>

              {/* Target Skin Types & Key Ingredients */}
              <div className="bg-white border border-pink-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag size={14} className="text-[#E91E8C]" />
                    <span>Target Skin Types</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {SKIN_TYPE_PRESETS.map((st) => {
                      const active = (formData.targetSkinTypes || []).includes(st);
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => toggleSkinType(st)}
                          className={`px-2.5 py-1.5 sm:py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                            active
                              ? 'bg-[#E91E8C] text-white border-[#E91E8C]'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-pink-300'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      value={newSkinTypeInput}
                      onChange={(e) => setNewSkinTypeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomSkinType();
                        }
                      }}
                      placeholder="Add custom skin type..."
                      className="min-w-0 flex-1 px-3 py-2 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm sm:text-xs outline-none focus:border-[#E91E8C]"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSkinType}
                      className="px-3.5 py-2 sm:py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-pink-50">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#E91E8C]" />
                    <span>Key Ingredients ({formData.keyIngredients?.length || 0})</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(formData.keyIngredients || []).map((ing) => (
                      <span
                        key={ing}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-50 text-slate-800 border border-pink-100 rounded-lg text-[11px] font-semibold"
                      >
                        <span>{ing}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(ing)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newIngredientInput}
                      onChange={(e) => setNewIngredientInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddIngredient();
                        }
                      }}
                      placeholder="e.g. Centella Asiatica, Niacinamide..."
                      className="min-w-0 flex-1 px-3 py-2 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm sm:text-xs outline-none focus:border-[#E91E8C]"
                    />
                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      className="px-3.5 py-2 sm:py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Visual Brand & Product Picker */}
              <div className="bg-white border border-pink-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={14} className="text-[#E91E8C]" />
                    <span>Recommended Brands &amp; Products</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Visually pick brands or specific products to feature on the guide page.
                  </p>
                </div>

                {/* Brand Multi-Select */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Recommended Brands ({formData.recommendedBrandSlugs?.length || 0} selected)
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={brandSearchQuery}
                      onChange={(e) => setBrandSearchQuery(e.target.value)}
                      placeholder="Filter brands (e.g. COSRX, SKIN1004)..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#E91E8C]"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 flex flex-wrap gap-1.5 bg-slate-50/40">
                    {filteredBrandsForPicker.map((b) => {
                      const selected = (formData.recommendedBrandSlugs || []).includes(b.slug);
                      return (
                        <button
                          key={b.slug}
                          type="button"
                          onClick={() => toggleBrandSlug(b.slug)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                            selected
                              ? 'bg-[#E91E8C] text-white border-[#E91E8C]'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-pink-300'
                          }`}
                        >
                          {selected && <Check size={11} />}
                          <span>{b.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Specific Products Multi-Select */}
                <div className="space-y-2 pt-3 border-t border-pink-50">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Pinned Products ({selectedRecommendedProducts.length} selected)
                  </label>

                  {selectedRecommendedProducts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRecommendedProducts.map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1.5 px-2 py-1 bg-pink-50 border border-pink-200 text-slate-800 rounded-lg text-[11px] font-semibold max-w-full"
                        >
                          <img
                            src={p.image}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-4 h-4 rounded object-cover shrink-0"
                          />
                          <span className="truncate max-w-[160px]">{p.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleProductId(p.id)}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      placeholder="Search store products to link..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#E91E8C]"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                    {filteredProductsForPicker.length === 0 ? (
                      <p className="p-3 text-center text-[11px] text-slate-400">
                        No matching products in catalog.
                      </p>
                    ) : (
                      filteredProductsForPicker.map((product) => {
                        const isSelected = (formData.recommendedProductIds || []).includes(
                          product.id
                        );
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => toggleProductId(product.id)}
                            className={`w-full flex items-center gap-2.5 p-2 text-left transition cursor-pointer ${
                              isSelected ? 'bg-pink-50/70' : 'hover:bg-slate-50'
                            }`}
                          >
                            <img
                              src={product.image}
                              alt={product.name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-lg object-cover border border-slate-100 shrink-0 bg-slate-50"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-slate-900 truncate">
                                {product.name}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate tabular-nums">
                                {product.brand} · ৳{getRetailPrice(product).toLocaleString()}
                              </p>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                                isSelected
                                  ? 'bg-[#E91E8C] border-[#E91E8C] text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check size={12} />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile/Tablet Bottom Quick-Action Footer inside Editor */}
            <div className="lg:col-span-12 lg:hidden bg-white border border-pink-100 rounded-2xl p-4 shadow-xs grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave('draft')}
                className="px-4 py-3 min-h-[44px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave('published')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] rounded-xl bg-[#E91E8C] hover:bg-[#d0177c] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isSaving ? 'Saving...' : 'Publish Guide'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Cloudinary Media Library Modal */}
        <MediaLibraryModal
          isOpen={isMediaModalOpen}
          onClose={() => setIsMediaModalOpen(false)}
          onSelectImage={(url) => {
            setFormData((prev) => ({ ...prev, heroImage: url }));
            setIsMediaModalOpen(false);
          }}
          title="Select Blog Cover Photo"
        />
      </div>
    );
  }

  // ==================== LIST VIEW ====================
  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1440px] mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-pink-100 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen size={22} className="text-[#E91E8C] shrink-0" />
            <span>Blogs &amp; Skincare Guides</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Create, edit, publish, draft, or remove bilingual guides displayed on the Korean Skincare Guides for Bangladesh page.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 shrink-0">
          {deletedBuiltInCount > 0 && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleRestoreDefaults}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] sm:min-h-0 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw size={14} />
              <span>Restore {deletedBuiltInCount} Default{deletedBuiltInCount > 1 ? 's' : ''}</span>
            </button>
          )}

          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <a
              href="/guides"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] sm:min-h-0 bg-white hover:bg-pink-50 text-slate-700 hover:text-[#E91E8C] border border-pink-200 text-xs font-bold rounded-xl transition whitespace-nowrap shrink-0"
            >
              <ExternalLink size={14} />
              <span>View Live</span>
            </a>

            <button
              type="button"
              onClick={handleCreateNew}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] sm:min-h-0 bg-[#E91E8C] hover:bg-[#d0177c] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus size={15} />
              <span>New Blog Post</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Column Stat Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 block truncate">Total Guides</span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums mt-0.5 block">
              {stats.total}
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-pink-50 text-[#E91E8C] flex items-center justify-center shrink-0">
            <Layers size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 block truncate">Published Live</span>
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 tabular-nums mt-0.5 block">
              {stats.published}
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 block truncate">Drafts Hidden</span>
            <span className="text-xl sm:text-2xl font-extrabold text-amber-700 tabular-nums mt-0.5 block">
              {stats.drafts}
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <EyeOff size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 block truncate">Avg. Read Time</span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums mt-0.5 block">
              {stats.avgRead} min
            </span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-2xl border flex items-center justify-between gap-2 text-xs ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <span className="font-semibold">{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} className="cursor-pointer shrink-0 p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs overflow-x-auto scrollbar-none max-w-full">
            {(
              [
                { id: 'all', label: `All (${stats.total})` },
                { id: 'published', label: `Published (${stats.published})` },
                { id: 'draft', label: `Drafts (${stats.drafts})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 tabular-nums text-center ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs font-bold text-slate-700 outline-none focus:border-[#E91E8C]"
          >
            <option value="all">All Categories</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search English/Bangla title, slug, ingredient..."
            className="w-full pl-9 pr-8 py-2.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs text-slate-900 outline-none focus:bg-white focus:border-[#E91E8C]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Guides Table / Empty State */}
      {filteredGuides.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#E91E8C] flex items-center justify-center mx-auto">
            <BookOpen size={22} />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">
            {guides.length === 0 ? 'No blog guides yet' : 'No guides match your filters'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {guides.length === 0
              ? 'Create your first bilingual Korean skincare guide to publish it on the storefront.'
              : 'Try adjusting your status tab, category filter, or search keyword.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            {guides.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setCategoryFilter('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateNew}
                className="px-4 py-2 bg-[#E91E8C] hover:bg-[#d0177c] text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Create First Blog Post
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          {/* Mobile Stacked Card List (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredGuides.map((guide) => {
              const isDraft = guide.status === 'draft';
              const isBusy = busySlug === guide.slug;
              return (
                <div key={guide.slug} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <CoverThumbnail
                      src={guide.heroImage}
                      alt={guide.imageAltText || guide.title}
                      className="w-20 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-slate-500 truncate">
                          {CATEGORY_LABEL_MAP[guide.category] || guide.category}
                        </span>
                        {isDraft ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-bold shrink-0">
                            <EyeOff size={12} />
                            <span>Draft</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold shrink-0">
                            <CheckCircle2 size={12} />
                            <span>Published</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(guide)}
                        className="text-sm font-extrabold text-slate-900 hover:text-[#E91E8C] text-left line-clamp-2 leading-snug cursor-pointer transition w-full"
                      >
                        {guide.title}
                      </button>

                      {guide.titleBN && (
                        <p className="text-xs text-slate-500 line-clamp-1">{guide.titleBN}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400 tabular-nums">
                    <span className="font-mono truncate max-w-[160px]">/guide/{guide.slug}</span>
                    <span aria-hidden="true">·</span>
                    <span>{guide.readingTimeMinutes || 5} min</span>
                    <span aria-hidden="true">·</span>
                    <span>{guide.faqs?.length || 0} FAQs</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {new Date(guide.lastUpdatedDate || guide.publishedDate).toLocaleDateString(
                        'en-US',
                        { month: 'short', day: 'numeric', year: 'numeric' }
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(guide)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[42px] bg-pink-50 hover:bg-pink-100 text-[#E91E8C] text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleQuickToggleStatus(guide)}
                      className="flex-1 px-3 py-2.5 min-h-[42px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      {isDraft ? 'Publish' : 'Hide'}
                    </button>

                    <a
                      href={`/guide/${guide.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center min-w-[42px] min-h-[42px] text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
                      title="View Guide Page"
                      aria-label="View Guide Page"
                    >
                      <ExternalLink size={15} />
                    </a>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setDeleteTarget(guide)}
                      className="inline-flex items-center justify-center min-w-[42px] min-h-[42px] text-rose-500 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100 border border-rose-100 rounded-xl transition cursor-pointer disabled:opacity-50"
                      title="Delete Guide"
                      aria-label="Delete Guide"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop / Tablet Table (md+) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500">
                  <th className="py-3 px-4">Guide Article</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGuides.map((guide) => {
                  const isDraft = guide.status === 'draft';
                  const isBusy = busySlug === guide.slug;
                  return (
                    <tr key={guide.slug} className="hover:bg-pink-50/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-[260px] max-w-xl">
                          <CoverThumbnail
                            src={guide.heroImage}
                            alt={guide.imageAltText || guide.title}
                            className="w-16 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0 space-y-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(guide)}
                              className="font-bold text-slate-900 hover:text-[#E91E8C] text-left line-clamp-1 cursor-pointer transition"
                            >
                              {guide.title}
                            </button>
                            {guide.titleBN && (
                              <p className="text-[11px] text-slate-500 line-clamp-1">
                                {guide.titleBN}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 tabular-nums">
                              <span className="font-mono truncate max-w-[180px]">
                                /guide/{guide.slug}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{guide.readingTimeMinutes || 5} min</span>
                              <span aria-hidden="true">·</span>
                              <span>{guide.faqs?.length || 0} FAQs</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-slate-700 font-semibold whitespace-nowrap">
                        {CATEGORY_LABEL_MAP[guide.category] || guide.category}
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isDraft ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold">
                            <EyeOff size={13} />
                            <span>Draft</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                            <CheckCircle2 size={13} />
                            <span>Published</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-slate-500 font-mono tabular-nums whitespace-nowrap">
                        {new Date(guide.lastUpdatedDate || guide.publishedDate).toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric', year: 'numeric' }
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(guide)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] font-bold rounded-lg transition cursor-pointer"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleQuickToggleStatus(guide)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
                            title={isDraft ? 'Publish guide' : 'Move to draft'}
                          >
                            {isDraft ? 'Publish' : 'Hide'}
                          </button>

                          <a
                            href={`/guide/${guide.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="View Guide Page"
                          >
                            <ExternalLink size={14} />
                          </a>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setDeleteTarget(guide)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-50"
                            title="Delete Guide"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-base font-extrabold text-slate-900">Delete Blog Guide?</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to remove{' '}
                  <strong className="text-slate-900">{deleteTarget.title}</strong>?{' '}
                  {articleService.isBuiltInSlug(deleteTarget.slug)
                    ? 'This starter guide will be hidden from both the admin list and public storefront, and can be restored anytime using "Restore Defaults".'
                    : 'This blog post will be permanently deleted from Firestore.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busySlug === deleteTarget.slug}
                onClick={handleConfirmDelete}
                className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {busySlug === deleteTarget.slug ? 'Deleting...' : 'Delete Guide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
