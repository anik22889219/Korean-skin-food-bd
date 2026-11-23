import React, { useState, useMemo, useEffect } from 'react';
import { 
  SlidersHorizontal, Search, Plus, Edit2, Trash2, Check, X, 
  ArrowUpDown, Sparkles, AlertCircle, Eye, EyeOff, Star, 
  Image as ImageIcon, RefreshCw, Layers, Tag, ShieldCheck,
  ChevronRight, ArrowUp, ArrowDown, ExternalLink, Filter, 
  CheckCircle2, Info, Grid, List, HelpCircle, PackageCheck,
  Link2, PackagePlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TaxonomyItem, TaxonomyDimensionType, Product } from '../types';
import { 
  useAllTaxonomies, 
  useCreateTaxonomyItem, 
  useUpdateTaxonomyItem, 
  useDeleteTaxonomyItem, 
  useReorderTaxonomies,
  useSeedDefaultTaxonomies 
} from '../hooks/queries/taxonomies';
import { useProducts } from '../hooks/queries/products';
import { generateTaxonomySlug } from '../services/taxonomyService';
import { getConcernDefaultEnrichment } from '../data/skinConcerns';
import { INGREDIENT_LIBRARY, getIngredientDefaultEnrichment } from '../data/ingredientLibrary';
import { MediaLibraryModal } from './MediaLibraryModal';
import { TaxonomyProductAssignmentModal } from './TaxonomyProductAssignmentModal';

const DIMENSION_CONFIG: Record<TaxonomyDimensionType, {
  label: string;
  labelBN: string;
  singular: string;
  description: string;
  icon: string;
  color: string;
}> = {
  category: {
    label: 'Categories',
    labelBN: 'ক্যাটাগরিসমূহ',
    singular: 'Category',
    description: 'Primary product categories for the shop navigation and catalog filters.',
    icon: '🗂️',
    color: 'from-purple-500 to-indigo-600',
  },
  brand: {
    label: 'Brands',
    labelBN: 'ব্র্যান্ডসমূহ',
    singular: 'Brand',
    description: 'Manage K-Beauty brands, logos, origin descriptions, and brand spotlights.',
    icon: '🏷️',
    color: 'from-pink-500 to-rose-600',
  },
  skin_type: {
    label: 'Skin Types',
    labelBN: 'স্কিন টাইপ',
    singular: 'Skin Type',
    description: 'Skin suitability options (Oily, Dry, Sensitive, Acne-Prone, etc.).',
    icon: '💧',
    color: 'from-blue-500 to-cyan-600',
  },
  skin_concern: {
    label: 'Skin Concerns',
    labelBN: 'স্কিন কনসার্ন',
    singular: 'Skin Concern',
    description: 'Targeted skin problems (Acne, Dark Spots, Barrier Repair, Aging, etc.).',
    icon: '🎯',
    color: 'from-amber-500 to-orange-600',
  },
  target_benefit: {
    label: 'Target Benefits',
    labelBN: 'টার্গেটেড বেনিফিট',
    singular: 'Target Benefit',
    description: 'Expected results (Brightening, Deep Hydration, Firming, Sun Defense).',
    icon: '✨',
    color: 'from-emerald-500 to-teal-600',
  },
  routine_step: {
    label: 'Routine Steps',
    labelBN: 'রুটিন স্টেপসমূহ',
    singular: 'Routine Step',
    description: '10-Step Korean skincare routine stages (Cleanser, Toner, Serum, etc.).',
    icon: '🧴',
    color: 'from-rose-500 to-pink-600',
  },
  ingredient: {
    label: 'Key Ingredients',
    labelBN: 'প্রধান উপাদান',
    singular: 'Key Ingredient',
    description: 'Highlighted skincare active ingredients (Cica, Niacinamide, Retinol, Snail Mucin).',
    icon: '🌿',
    color: 'from-teal-500 to-emerald-600',
  },
};

export const AdminTaxonomyManagement: React.FC = () => {
  const { profile } = useAuth();
  const isAdminOrSuperAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  // Active category/taxonomy tab
  const [activeTab, setActiveTab] = useState<TaxonomyDimensionType>('category');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'featured'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TaxonomyItem | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TaxonomyItem | null>(null);
  const [isSeedConfirmOpen, setIsSeedConfirmOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentItem, setAssignmentItem] = useState<TaxonomyItem | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formNameBN, setFormNameBN] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDescriptionBN, setFormDescriptionBN] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsPopular, setFormIsPopular] = useState(false);
  const [formKeyFocusIngredients, setFormKeyFocusIngredients] = useState<string[]>([]);
  const [ingredientDraftInput, setIngredientDraftInput] = useState('');
  const [formRoutineTips, setFormRoutineTips] = useState<string[]>(['']);
  const [formRoutineTipsBN, setFormRoutineTipsBN] = useState<string[]>([]);
  const [formMatchKeywordsText, setFormMatchKeywordsText] = useState('');
  const [showBnTipsEditor, setShowBnTipsEditor] = useState(false);
  // Key Ingredient library modal fields
  const [formKoreanName, setFormKoreanName] = useState('');
  const [formShortRole, setFormShortRole] = useState('');
  const [formShortRoleBN, setFormShortRoleBN] = useState('');
  const [formBestForSkinTypes, setFormBestForSkinTypes] = useState<string[]>([]);
  const [skinTypeDraftInput, setSkinTypeDraftInput] = useState('');
  const [formPairsWellWith, setFormPairsWellWith] = useState<string[]>([]);
  const [pairDraftInput, setPairDraftInput] = useState('');
  const [formLayeringCautions, setFormLayeringCautions] = useState<string[]>(['']);
  const [formLayeringCautionsBN, setFormLayeringCautionsBN] = useState<string[]>([]);
  const [showBnCautionsEditor, setShowBnCautionsEditor] = useState(false);
  const [isCustomSlug, setIsCustomSlug] = useState(false);
  const [alertBanner, setAlertBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // React Queries & Mutations
  const { data: allTaxonomies = [], isLoading: isLoadingTaxonomies } = useAllTaxonomies();
  const { data: products = [] } = useProducts();
  const createMutation = useCreateTaxonomyItem();
  const updateMutation = useUpdateTaxonomyItem();
  const deleteMutation = useDeleteTaxonomyItem();
  const reorderMutation = useReorderTaxonomies();
  const seedMutation = useSeedDefaultTaxonomies();

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAlertBanner({ text, type });
    setTimeout(() => setAlertBanner(null), 4000);
  };

  // Count products linked to each taxonomy item
  const productUsageMap = useMemo(() => {
    const map = new Map<string, number>();

    products.forEach((p) => {
      // Brand
      if (p.brand) {
        const key = `brand:${p.brand.trim().toLowerCase()}`;
        map.set(key, (map.get(key) || 0) + 1);
      }
      // Category
      if (p.category) {
        const key = `category:${p.category.trim().toLowerCase()}`;
        map.set(key, (map.get(key) || 0) + 1);
      }
      // Skin Types
      if (Array.isArray(p.skinTypes)) {
        p.skinTypes.forEach((st) => {
          if (st) {
            const key = `skin_type:${st.trim().toLowerCase()}`;
            map.set(key, (map.get(key) || 0) + 1);
          }
        });
      }
      // Concerns
      if (Array.isArray(p.concerns)) {
        p.concerns.forEach((c) => {
          if (c) {
            const key = `skin_concern:${c.trim().toLowerCase()}`;
            map.set(key, (map.get(key) || 0) + 1);
          }
        });
      }
      // Benefits
      if (Array.isArray(p.benefits)) {
        p.benefits.forEach((b) => {
          if (b) {
            const key = `target_benefit:${b.trim().toLowerCase()}`;
            map.set(key, (map.get(key) || 0) + 1);
          }
        });
      }
      // Routine Step
      if (p.routineStep) {
        const key = `routine_step:${p.routineStep.trim().toLowerCase()}`;
        map.set(key, (map.get(key) || 0) + 1);
      }
      // Ingredients
      if (Array.isArray(p.keyIngredients)) {
        p.keyIngredients.forEach((ing) => {
          if (ing) {
            const key = `ingredient:${ing.trim().toLowerCase()}`;
            map.set(key, (map.get(key) || 0) + 1);
          }
        });
      }
    });

    return map;
  }, [products]);

  const getItemProductCount = (item: TaxonomyItem): number => {
    const key = `${item.type}:${item.name.trim().toLowerCase()}`;
    const direct = productUsageMap.get(key) || 0;
    if (direct > 0) return direct;

    const targetName = item.name.toLowerCase().trim();
    let count = 0;
    products.forEach((p) => {
      if (item.type === 'brand' && p.brand && p.brand.toLowerCase().includes(targetName)) {
        count++;
      } else if (item.type === 'category' && p.category && p.category.toLowerCase().includes(targetName)) {
        count++;
      } else if (item.type === 'skin_type' && Array.isArray(p.skinTypes) && p.skinTypes.some(s => s.toLowerCase().includes(targetName) || targetName.includes(s.toLowerCase()))) {
        count++;
      } else if (item.type === 'skin_concern' && Array.isArray(p.concerns) && p.concerns.some(c => c.toLowerCase().includes(targetName) || targetName.includes(c.toLowerCase()))) {
        count++;
      } else if (item.type === 'target_benefit' && Array.isArray(p.benefits) && p.benefits.some(b => b.toLowerCase().includes(targetName) || targetName.includes(b.toLowerCase()))) {
        count++;
      } else if (item.type === 'routine_step' && p.routineStep && (p.routineStep.toLowerCase().includes(targetName) || targetName.includes(p.routineStep.toLowerCase()))) {
        count++;
      } else if (item.type === 'ingredient') {
        const inKey = Array.isArray(p.keyIngredients) && p.keyIngredients.some(i => i.toLowerCase().includes(targetName) || targetName.includes(i.toLowerCase()));
        const inDesc = p.description && p.description.toLowerCase().includes(targetName);
        if (inKey || inDesc) count++;
      }
    });
    return count;
  };

  // Filter items for current active tab
  const tabItems = useMemo(() => {
    return allTaxonomies.filter((item) => item.type === activeTab);
  }, [allTaxonomies, activeTab]);

  // Tab counts
  const dimensionCounts = useMemo(() => {
    const counts: Record<TaxonomyDimensionType, number> = {
      brand: 0,
      category: 0,
      skin_type: 0,
      skin_concern: 0,
      target_benefit: 0,
      routine_step: 0,
      ingredient: 0,
    };
    allTaxonomies.forEach((item) => {
      if (counts[item.type] !== undefined) {
        counts[item.type]++;
      }
    });
    return counts;
  }, [allTaxonomies]);

  // Filtered and Searched items
  const filteredItems = useMemo(() => {
    let result = [...tabItems];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.nameBN && i.nameBN.toLowerCase().includes(q)) ||
          i.slug.toLowerCase().includes(q) ||
          (i.description && i.description.toLowerCase().includes(q))
      );
    }

    if (statusFilter === 'active') {
      result = result.filter((i) => i.isActive);
    } else if (statusFilter === 'inactive') {
      result = result.filter((i) => !i.isActive);
    } else if (statusFilter === 'featured') {
      result = result.filter((i) => i.isFeatured);
    }

    return result.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [tabItems, searchQuery, statusFilter]);

  // Stats for the active tab
  const activeTabStats = useMemo(() => {
    const total = tabItems.length;
    const active = tabItems.filter((i) => i.isActive).length;
    const missingBN = tabItems.filter((i) => !i.nameBN || !i.nameBN.trim()).length;
    const totalLinkedProds = tabItems.reduce((acc, i) => acc + getItemProductCount(i), 0);

    return { total, active, missingBN, totalLinkedProds };
  }, [tabItems, productUsageMap]);

  // Suggested ingredient labels for Skin Concerns & Pairs Well With quick-picker
  const suggestedIngredientOptions = useMemo(() => {
    const names = new Set<string>();
    allTaxonomies
      .filter((t) => t.type === 'ingredient' && t.isActive !== false)
      .forEach((t) => {
        if (t.name) names.add(t.name.replace(/\s*\([^)]*\)\s*/g, '').trim() || t.name);
      });
    INGREDIENT_LIBRARY.forEach((ing) => {
      names.add(ing.name.replace(/\s*\([^)]*\)\s*/g, '').trim() || ing.name);
    });
    ['Salicylic Acid (BHA)', 'Niacinamide', 'Centella Asiatica', 'Hyaluronic Acid', 'Snail Mucin', 'Rice Extract', 'Panthenol', 'Ceramides', 'Heartleaf', 'Vitamin C', 'Tranexamic Acid', 'Mugwort', 'Retinol & Retinal', 'Peptides', 'Tea Tree', 'Sunscreen'].forEach((n) => names.add(n));
    return Array.from(names).slice(0, 18);
  }, [allTaxonomies]);

  // Suggested skin type labels for Key Ingredients quick-picker
  const suggestedSkinTypeOptions = useMemo(() => {
    const names = new Set<string>();
    allTaxonomies
      .filter((t) => t.type === 'skin_type' && t.isActive !== false)
      .forEach((t) => {
        if (t.name) names.add(t.name.replace(/\s+Skin$/i, '').trim() || t.name);
      });
    ['All Skin Types', 'Oily', 'Dry', 'Combination', 'Sensitive', 'Acne-Prone', 'Dehydrated', 'Dull', 'Normal', 'Mature', 'Redness-Prone'].forEach((n) => names.add(n));
    return Array.from(names).slice(0, 14);
  }, [allTaxonomies]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormNameBN('');
    setFormSlug('');
    setFormDescription('');
    setFormDescriptionBN('');
    setFormImage('');
    setFormDisplayOrder(tabItems.length + 1);
    setFormIsActive(true);
    setFormIsFeatured(false);
    setFormIsPopular(false);
    setFormKeyFocusIngredients([]);
    setIngredientDraftInput('');
    setFormRoutineTips(['']);
    setFormRoutineTipsBN([]);
    setFormMatchKeywordsText('');
    setShowBnTipsEditor(false);
    setFormKoreanName('');
    setFormShortRole('');
    setFormShortRoleBN('');
    setFormBestForSkinTypes([]);
    setSkinTypeDraftInput('');
    setFormPairsWellWith([]);
    setPairDraftInput('');
    setFormLayeringCautions(['']);
    setFormLayeringCautionsBN([]);
    setShowBnCautionsEditor(false);
    setIsCustomSlug(false);
    setIsEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: TaxonomyItem) => {
    const concernEnrichment = item.type === 'skin_concern' ? getConcernDefaultEnrichment(item.slug) : undefined;
    const ingEnrichment = item.type === 'ingredient' ? getIngredientDefaultEnrichment(item.slug) : undefined;

    const resolvedIngredients =
      item.keyFocusIngredients !== undefined
        ? item.keyFocusIngredients
        : concernEnrichment?.keyFocusIngredients || [];
    const resolvedTips =
      item.routineTips !== undefined
        ? item.routineTips
        : concernEnrichment?.routineTips || [];
    const resolvedTipsBN =
      item.routineTipsBN !== undefined
        ? item.routineTipsBN
        : concernEnrichment?.routineTipsBN || [];
    const resolvedKeywords =
      item.matchKeywords !== undefined
        ? item.matchKeywords
        : concernEnrichment?.matchKeywords || ingEnrichment?.matchKeywords || [];

    const resolvedBestFor =
      item.bestForSkinTypes !== undefined
        ? item.bestForSkinTypes
        : ingEnrichment?.bestForSkinTypes || [];
    const resolvedPairsWell =
      item.pairsWellWith !== undefined
        ? item.pairsWellWith
        : ingEnrichment?.pairsWellWith || [];
    const resolvedCautions =
      item.layeringCautions !== undefined
        ? item.layeringCautions
        : ingEnrichment?.layeringCautions || [];
    const resolvedCautionsBN =
      item.layeringCautionsBN !== undefined
        ? item.layeringCautionsBN
        : ingEnrichment?.layeringCautionsBN || [];

    setEditingItem(item);
    setFormName(item.name);
    setFormNameBN(item.nameBN || '');
    setFormSlug(item.slug || generateTaxonomySlug(item.name));
    setFormDescription(item.description || concernEnrichment?.summary || ingEnrichment?.summary || '');
    setFormDescriptionBN(item.descriptionBN || concernEnrichment?.summaryBN || ingEnrichment?.summaryBN || '');
    setFormImage(item.image || '');
    setFormDisplayOrder(item.displayOrder || 1);
    setFormIsActive(item.isActive ?? true);
    setFormIsFeatured(item.isFeatured ?? false);
    setFormIsPopular(item.isPopular ?? false);
    setFormKeyFocusIngredients(resolvedIngredients);
    setIngredientDraftInput('');
    setFormRoutineTips(resolvedTips.length > 0 ? resolvedTips : ['']);
    setFormRoutineTipsBN(resolvedTipsBN);
    setShowBnTipsEditor(resolvedTipsBN.length > 0);
    setFormMatchKeywordsText(resolvedKeywords.join(', '));
    setFormKoreanName(item.koreanName !== undefined ? item.koreanName : ingEnrichment?.koreanName || '');
    setFormShortRole(item.shortRole !== undefined ? item.shortRole : ingEnrichment?.shortRole || '');
    setFormShortRoleBN(item.shortRoleBN !== undefined ? item.shortRoleBN : ingEnrichment?.shortRoleBN || '');
    setFormBestForSkinTypes(resolvedBestFor);
    setSkinTypeDraftInput('');
    setFormPairsWellWith(resolvedPairsWell);
    setPairDraftInput('');
    setFormLayeringCautions(resolvedCautions.length > 0 ? resolvedCautions : ['']);
    setFormLayeringCautionsBN(resolvedCautionsBN);
    setShowBnCautionsEditor(resolvedCautionsBN.length > 0);
    setIsCustomSlug(true);
    setIsEditModalOpen(true);
  };

  const handleAddIngredientChip = (rawVal?: string) => {
    const source = rawVal !== undefined ? rawVal : ingredientDraftInput;
    const parts = source
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setFormKeyFocusIngredients((prev) => {
      const next = [...prev];
      parts.forEach((p) => {
        if (!next.some((existing) => existing.toLowerCase() === p.toLowerCase())) {
          next.push(p);
        }
      });
      return next;
    });
    if (rawVal === undefined) {
      setIngredientDraftInput('');
    }
  };

  const handleAddChipToList = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    draftSetter: React.Dispatch<React.SetStateAction<string>>,
    draftValue: string,
    rawVal?: string
  ) => {
    const source = rawVal !== undefined ? rawVal : draftValue;
    const parts = source
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setter((prev) => {
      const next = [...prev];
      parts.forEach((p) => {
        if (!next.some((existing) => existing.toLowerCase() === p.toLowerCase())) {
          next.push(p);
        }
      });
      return next;
    });
    if (rawVal === undefined) {
      draftSetter('');
    }
  };

  // Open Product Assignment Modal
  const handleOpenAssignmentModal = (item: TaxonomyItem) => {
    setAssignmentItem(item);
    setIsAssignmentModalOpen(true);
  };

  // Handle Name Change with Auto-Slug Generation
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!isCustomSlug && !editingItem) {
      setFormSlug(generateTaxonomySlug(val));
    }
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showNotification('Please provide a name in English.', 'error');
      return;
    }

    const targetType = editingItem ? editingItem.type : activeTab;
    const slug = formSlug.trim() || generateTaxonomySlug(formName);
    const isSkinConcern = targetType === 'skin_concern';
    const isIngredient = targetType === 'ingredient';

    const cleanIngredients: string[] = Array.from(
      new Set<string>(
        [
          ...formKeyFocusIngredients,
          ...(ingredientDraftInput.trim()
            ? ingredientDraftInput.split(',').map((s) => s.trim()).filter(Boolean)
            : []),
        ]
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
    const cleanRoutineTips: string[] = formRoutineTips.map((s) => s.trim()).filter(Boolean);
    const cleanRoutineTipsBN: string[] = formRoutineTipsBN.map((s) => s.trim()).filter(Boolean);
    const cleanMatchKeywords: string[] = Array.from(
      new Set<string>(
        formMatchKeywordsText
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const cleanBestForSkinTypes: string[] = Array.from(
      new Set<string>(
        [
          ...formBestForSkinTypes,
          ...(skinTypeDraftInput.trim()
            ? skinTypeDraftInput.split(',').map((s) => s.trim()).filter(Boolean)
            : []),
        ]
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
    const cleanPairsWellWith: string[] = Array.from(
      new Set<string>(
        [
          ...formPairsWellWith,
          ...(pairDraftInput.trim()
            ? pairDraftInput.split(',').map((s) => s.trim()).filter(Boolean)
            : []),
        ]
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
    const cleanLayeringCautions: string[] = formLayeringCautions.map((s) => s.trim()).filter(Boolean);
    const cleanLayeringCautionsBN: string[] = formLayeringCautionsBN.map((s) => s.trim()).filter(Boolean);

    const concernFields = isSkinConcern
      ? {
          keyFocusIngredients: cleanIngredients,
          routineTips: cleanRoutineTips,
          routineTipsBN: cleanRoutineTipsBN,
          matchKeywords: cleanMatchKeywords,
        }
      : {};

    const ingredientFields = isIngredient
      ? {
          koreanName: formKoreanName.trim(),
          shortRole: formShortRole.trim(),
          shortRoleBN: formShortRoleBN.trim(),
          bestForSkinTypes: cleanBestForSkinTypes,
          pairsWellWith: cleanPairsWellWith,
          layeringCautions: cleanLayeringCautions,
          layeringCautionsBN: cleanLayeringCautionsBN,
          matchKeywords: cleanMatchKeywords,
        }
      : {};

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          updates: {
            type: editingItem.type,
            name: formName.trim(),
            nameBN: formNameBN.trim() || '',
            slug,
            description: formDescription.trim() || '',
            descriptionBN: formDescriptionBN.trim() || '',
            image: formImage.trim() || '',
            displayOrder: Number(formDisplayOrder) || 1,
            isActive: formIsActive,
            isFeatured: formIsFeatured,
            isPopular: formIsPopular,
            ...concernFields,
            ...ingredientFields,
          },
        });
        showNotification(`${DIMENSION_CONFIG[targetType].singular} "${formName}" updated successfully.`);
      } else {
        await createMutation.mutateAsync({
          type: activeTab,
          name: formName.trim(),
          nameBN: formNameBN.trim() || '',
          slug,
          description: formDescription.trim() || '',
          descriptionBN: formDescriptionBN.trim() || '',
          image: formImage.trim() || '',
          displayOrder: Number(formDisplayOrder) || tabItems.length + 1,
          isActive: formIsActive,
          isFeatured: formIsFeatured,
          isPopular: formIsPopular,
          ...concernFields,
          ...ingredientFields,
        });
        showNotification(`New ${DIMENSION_CONFIG[activeTab].singular} "${formName}" created successfully.`);
      }
      setIsEditModalOpen(false);
    } catch (err: any) {
      showNotification(`Failed to save: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  // Toggle Active Status directly
  const handleToggleActive = async (item: TaxonomyItem) => {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        updates: { isActive: !item.isActive },
      });
      showNotification(
        `"${item.name}" is now ${!item.isActive ? 'Active' : 'Hidden'}.`
      );
    } catch (err: any) {
      showNotification(`Could not update status: ${err.message}`, 'error');
    }
  };

  // Toggle Featured Status directly
  const handleToggleFeatured = async (item: TaxonomyItem) => {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        updates: { isFeatured: !item.isFeatured },
      });
      showNotification(
        `"${item.name}" ${!item.isFeatured ? 'marked as Featured ⭐' : 'removed from Featured'}.`
      );
    } catch (err: any) {
      showNotification(`Could not update featured flag: ${err.message}`, 'error');
    }
  };

  // Reorder Item Up or Down
  const handleMoveOrder = async (item: TaxonomyItem, direction: 'up' | 'down') => {
    const currentIndex = tabItems.findIndex((i) => i.id === item.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= tabItems.length) return;

    const newTabItems = [...tabItems];
    const [moved] = newTabItems.splice(currentIndex, 1);
    newTabItems.splice(targetIndex, 0, moved);

    const orderedIds = newTabItems.map((i) => i.id);
    try {
      await reorderMutation.mutateAsync(orderedIds);
      showNotification(`Order updated for "${item.name}".`);
    } catch (err: any) {
      showNotification(`Reorder failed: ${err.message}`, 'error');
    }
  };

  // Safe Delete Prompt
  const handleOpenDeleteModal = (item: TaxonomyItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteMutation.mutateAsync({
        id: itemToDelete.id,
        type: itemToDelete.type,
      });
      showNotification(`"${itemToDelete.name}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      showNotification(`Delete failed: ${err.message}`, 'error');
    }
  };

  // Handle Seed Defaults
  const handleSeedDefaults = async () => {
    try {
      const res = await seedMutation.mutateAsync();
      showNotification(`Default Korean skincare taxonomies successfully loaded (${res.createdCount} items).`);
      setIsSeedConfirmOpen(false);
    } catch (err: any) {
      showNotification(`Seeding failed: ${err.message}`, 'error');
    }
  };

  const currentConfig = DIMENSION_CONFIG[activeTab];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-rose-100/40 via-purple-50/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-md shadow-rose-200">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Categories
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    Live System
                  </span>
                </h1>
                <p className="text-sm text-slate-500">
                  Manage Categories, Brands, Skin Types, Concerns, Benefits, Routine Steps, and Key Ingredients for store-wide filters.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => setIsSeedConfirmOpen(true)}
              disabled={seedMutation.isPending}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200 active:scale-95"
              title="Sync & seed default Korean beauty categories, brands, and ingredients"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seedMutation.isPending ? 'animate-spin' : ''}`} />
              Sync Default Presets
            </button>

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm hover:shadow-md shadow-rose-200 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add {currentConfig.singular}
            </button>
          </div>
        </div>

        {/* Global Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div className="flex flex-col">
            <span className="text-slate-400 font-medium">Total {currentConfig.label}</span>
            <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">{activeTabStats.total}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 font-medium">Active in Catalog</span>
            <span className="text-lg font-bold text-emerald-600 font-mono tabular-nums">{activeTabStats.active}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 font-medium">Linked Products</span>
            <span className="text-lg font-bold text-indigo-600 font-mono tabular-nums">{activeTabStats.totalLinkedProds}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 font-medium">Missing Bengali (বাংলা)</span>
            <span className={`text-lg font-bold font-mono tabular-nums ${activeTabStats.missingBN > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              {activeTabStats.missingBN}
            </span>
          </div>
        </div>

        {activeTab === 'skin_concern' && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Sparkles className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                Active Skin Concerns sync live with the storefront{' '}
                <strong className="text-slate-900">Shop &amp; Learn by Skin Concern</strong> page, including Key Focus Ingredients, Routine Tips &amp; Match Keywords.
              </span>
            </div>
            <a
              href="/concerns"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold border border-rose-200 transition-colors shrink-0"
            >
              <span>View /concerns Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {activeTab === 'ingredient' && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                Active Key Ingredients sync live with the storefront{' '}
                <strong className="text-slate-900">Korean Skincare Ingredients Library</strong> page, including Korean Name, Short Role, Best Skin Types, Pairings &amp; Layering Cautions.
              </span>
            </div>
            <a
              href="/ingredients"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold border border-teal-200 transition-colors shrink-0"
            >
              <span>View /ingredients Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Alert Banner Notification */}
      {alertBanner && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between text-sm transition-all ${
            alertBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : alertBanner.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {alertBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : alertBanner.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            ) : (
              <Info className="w-4 h-4 text-blue-600" />
            )}
            <span>{alertBanner.text}</span>
          </div>
          <button onClick={() => setAlertBanner(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dimension Selector Segmented Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max">
          {(Object.keys(DIMENSION_CONFIG) as TaxonomyDimensionType[]).map((dimKey) => {
            const cfg = DIMENSION_CONFIG[dimKey];
            const isSelected = activeTab === dimKey;
            const count = dimensionCounts[dimKey] || 0;

            return (
              <button
                key={dimKey}
                onClick={() => {
                  setActiveTab(dimKey);
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search, Filter & View Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${currentConfig.label.toLowerCase()} or বাংলা নাম...`}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Segment & View Mode */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 font-medium rounded-lg transition-all ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 font-medium rounded-lg transition-all ${
                statusFilter === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-2.5 py-1 font-medium rounded-lg transition-all ${
                statusFilter === 'inactive' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Hidden
            </button>
            <button
              onClick={() => setStatusFilter('featured')}
              className={`px-2.5 py-1 font-medium rounded-lg transition-all ${
                statusFilter === 'featured' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ⭐ Featured
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Card Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="High-Density Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Items Listing */}
      {isLoadingTaxonomies ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
            {currentConfig.icon}
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            No {currentConfig.label} found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            {searchQuery
              ? `No items match "${searchQuery}". Try clearing your search keyword.`
              : `You haven't added any ${currentConfig.label.toLowerCase()} yet. Add one or restore default presets.`}
          </p>
          <div className="flex items-center justify-center gap-2.5">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Clear Search
              </button>
            )}
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First {currentConfig.singular}
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item, index) => {
            const linkedCount = getItemProductCount(item);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-4 border transition-all hover:shadow-md flex flex-col justify-between relative group ${
                  item.isActive ? 'border-slate-200/90' : 'border-slate-200 bg-slate-50/50 opacity-75'
                }`}
              >
                <div>
                  {/* Top Bar inside Card */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-11 h-11 rounded-xl object-contain bg-slate-50 border border-slate-100 p-1"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center border border-slate-200/60 uppercase">
                          {item.name.slice(0, 2)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-900 truncate" title={item.name}>
                            {item.name}
                          </h3>
                          {item.isFeatured && (
                            <span title="Featured on Storefront" className="text-amber-500 shrink-0 text-xs">
                              ⭐
                            </span>
                          )}
                        </div>
                        {item.nameBN ? (
                          <p className="text-xs font-medium text-rose-600 truncate font-bengali">
                            {item.nameBN}
                          </p>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No Bengali name</span>
                        )}
                      </div>
                    </div>

                    {/* Quick Star Toggle */}
                    <button
                      onClick={() => handleToggleFeatured(item)}
                      title={item.isFeatured ? 'Remove from Featured' : 'Mark as Featured'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        item.isFeatured ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${item.isFeatured ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>

                  {/* Description / Metadata */}
                  {item.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Skin Concern Shop & Learn Preview */}
                  {item.type === 'skin_concern' && (() => {
                    const enrichment = getConcernDefaultEnrichment(item.slug);
                    const ingredients =
                      item.keyFocusIngredients !== undefined
                        ? item.keyFocusIngredients
                        : enrichment?.keyFocusIngredients || [];
                    const tips =
                      item.routineTips !== undefined
                        ? item.routineTips
                        : enrichment?.routineTips || [];
                    const keywords =
                      item.matchKeywords !== undefined
                        ? item.matchKeywords
                        : enrichment?.matchKeywords || [];
                    const needsAttention = ingredients.length === 0 || tips.length === 0 || keywords.length === 0;

                    return (
                      <div className="mb-3 space-y-1.5">
                        {ingredients.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {ingredients.slice(0, 3).map((ing, idx) => (
                              <span
                                key={`${ing}-${idx}`}
                                className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-semibold"
                              >
                                {ing}
                              </span>
                            ))}
                            {ingredients.length > 3 && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold">
                                +{ingredients.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                          <span>Tips: {tips.length}</span>
                          <span aria-hidden="true">·</span>
                          <span>Keywords: {keywords.length}</span>
                          {needsAttention && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                              Missing guide data
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Key Ingredient Library Preview */}
                  {item.type === 'ingredient' && (() => {
                    const enrichment = getIngredientDefaultEnrichment(item.slug);
                    const koreanName =
                      item.koreanName !== undefined ? item.koreanName : enrichment?.koreanName || '';
                    const shortRole =
                      item.shortRole !== undefined ? item.shortRole : enrichment?.shortRole || '';
                    const skinTypes =
                      item.bestForSkinTypes !== undefined
                        ? item.bestForSkinTypes
                        : enrichment?.bestForSkinTypes || [];
                    const pairs =
                      item.pairsWellWith !== undefined
                        ? item.pairsWellWith
                        : enrichment?.pairsWellWith || [];
                    const cautions =
                      item.layeringCautions !== undefined
                        ? item.layeringCautions
                        : enrichment?.layeringCautions || [];
                    const needsAttention =
                      !shortRole || skinTypes.length === 0 || pairs.length === 0 || cautions.length === 0;

                    return (
                      <div className="mb-3 space-y-1.5">
                        {(koreanName || shortRole) && (
                          <div className="space-y-1">
                            {koreanName && (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-semibold">
                                {koreanName}
                              </span>
                            )}
                            {shortRole && (
                              <p className="text-[11px] font-medium text-slate-700 line-clamp-1">
                                {shortRole}
                              </p>
                            )}
                          </div>
                        )}
                        {skinTypes.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {skinTypes.slice(0, 3).map((st) => (
                              <span
                                key={st}
                                className="px-1.5 py-0.5 rounded bg-pink-50 text-rose-700 border border-pink-100 text-[10px] font-semibold"
                              >
                                {st}
                              </span>
                            ))}
                            {skinTypes.length > 3 && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold">
                                +{skinTypes.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                          <span>Pairs: {pairs.length}</span>
                          <span aria-hidden="true">·</span>
                          <span>Cautions: {cautions.length}</span>
                          {needsAttention && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                              Missing library data
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Quiet Metadata Info */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2.5 font-mono">
                    <span className="truncate" title={`Slug: ${item.slug}`}>
                      /{item.slug}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="shrink-0 text-indigo-600 font-semibold">
                      {linkedCount} {linkedCount === 1 ? 'product' : 'products'}
                    </span>
                  </div>

                  {/* Assign Products Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenAssignmentModal(item)}
                    className="w-full mb-3 py-1.5 px-3 bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold rounded-xl border border-slate-200 hover:border-rose-200 transition-all flex items-center justify-center gap-1.5 text-[11px] group/btn cursor-pointer"
                    title={`Assign or unassign products for ${item.name}`}
                  >
                    <Link2 className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-rose-600" />
                    <span>Assign Products ({linkedCount})</span>
                  </button>
                </div>

                {/* Bottom Actions Bar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  {/* Order & Visibility Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveOrder(item, 'up')}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveOrder(item, 'down')}
                      disabled={index === filteredItems.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleToggleActive(item)}
                      title={item.isActive ? 'Active (Click to Hide)' : 'Hidden (Click to Activate)'}
                      className={`ml-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                        item.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {item.isActive ? 'Active' : 'Hidden'}
                    </button>
                  </div>

                  {/* Edit & Delete Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(item)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 w-14">Media</th>
                  <th className="py-3 px-4">Name (EN / বাংলা)</th>
                  <th className="py-3 px-4">SEO Slug</th>
                  <th className="py-3 px-4 text-center">Linked Products</th>
                  <th className="py-3 px-4 text-center">Featured</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, index) => {
                  const linkedCount = getItemProductCount(item);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !item.isActive ? 'bg-slate-50/40 text-slate-400' : ''
                      }`}
                    >
                      {/* Display Order Index */}
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-400">
                        {item.displayOrder || index + 1}
                      </td>

                      {/* Media Image */}
                      <td className="py-3 px-4">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-200 p-0.5"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center uppercase border border-slate-200">
                            {item.name.slice(0, 2)}
                          </div>
                        )}
                      </td>

                      {/* Name & Bengali translation */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        {item.nameBN ? (
                          <div className="text-[11px] text-rose-600 font-bengali">{item.nameBN}</div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">No Bengali translation</div>
                        )}
                        {item.type === 'skin_concern' && (() => {
                          const enrichment = getConcernDefaultEnrichment(item.slug);
                          const ingredients =
                            item.keyFocusIngredients !== undefined
                              ? item.keyFocusIngredients
                              : enrichment?.keyFocusIngredients || [];
                          const tips =
                            item.routineTips !== undefined
                              ? item.routineTips
                              : enrichment?.routineTips || [];
                          const keywords =
                            item.matchKeywords !== undefined
                              ? item.matchKeywords
                              : enrichment?.matchKeywords || [];
                          return (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Ingredients: {ingredients.length} · Tips: {tips.length} · Keywords: {keywords.length}
                            </div>
                          );
                        })()}
                        {item.type === 'ingredient' && (() => {
                          const enrichment = getIngredientDefaultEnrichment(item.slug);
                          const koreanName =
                            item.koreanName !== undefined ? item.koreanName : enrichment?.koreanName || '';
                          const skinTypes =
                            item.bestForSkinTypes !== undefined
                              ? item.bestForSkinTypes
                              : enrichment?.bestForSkinTypes || [];
                          const pairs =
                            item.pairsWellWith !== undefined
                              ? item.pairsWellWith
                              : enrichment?.pairsWellWith || [];
                          const cautions =
                            item.layeringCautions !== undefined
                              ? item.layeringCautions
                              : enrichment?.layeringCautions || [];
                          return (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {koreanName ? `${koreanName} · ` : ''}
                              Skin Types: {skinTypes.length} · Pairs: {pairs.length} · Cautions: {cautions.length}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Slug */}
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        /{item.slug}
                      </td>

                      {/* Linked Products Count & Assign Button */}
                      <td className="py-3 px-4 text-center font-mono tabular-nums">
                        <button
                          type="button"
                          onClick={() => handleOpenAssignmentModal(item)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                            linkedCount > 0
                              ? 'bg-indigo-50 hover:bg-rose-50 text-indigo-700 hover:text-rose-700 border border-indigo-100 hover:border-rose-200'
                              : 'bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-slate-200 hover:border-rose-200'
                          }`}
                          title="Click to view & assign products"
                        >
                          <Link2 className="w-3 h-3 text-rose-500" />
                          <span>{linkedCount} {linkedCount === 1 ? 'Product' : 'Products'}</span>
                        </button>
                      </td>

                      {/* Featured Star */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleFeatured(item)}
                          className={`p-1 rounded-md transition-colors ${
                            item.isFeatured ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${item.isFeatured ? 'fill-amber-500' : ''}`} />
                        </button>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            item.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          {item.isActive ? 'Active' : 'Hidden'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenAssignmentModal(item)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Assign Products"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveOrder(item, 'up')}
                            disabled={index === 0}
                            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveOrder(item, 'down')}
                            disabled={index === filteredItems.length - 1}
                            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg ml-1"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* CREATE & EDIT TAXONOMY MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div
            className={`bg-white rounded-2xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto ${
              (editingItem?.type || activeTab) === 'skin_concern' || (editingItem?.type || activeTab) === 'ingredient'
                ? 'max-w-2xl'
                : 'max-w-lg'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{currentConfig.icon}</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingItem ? `Edit ${currentConfig.singular}` : `Add New ${currentConfig.singular}`}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Set English & Bengali names, SEO slug, and icon assets.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveItem} className="space-y-4 pt-4 text-xs">
              {/* English Name & Bengali Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    English Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Centella Asiatica"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Bengali Name (বাংলা নাম)
                  </label>
                  <input
                    type="text"
                    value={formNameBN}
                    onChange={(e) => setFormNameBN(e.target.value)}
                    placeholder="e.g. সেন্টেলা এশিয়াটিকা"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bengali focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              {/* SEO Slug */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold">
                    SEO URL Slug <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormSlug(generateTaxonomySlug(formName));
                      setIsCustomSlug(false);
                    }}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Auto-generate
                  </button>
                </div>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-400 font-mono">
                    /
                  </span>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => {
                      setFormSlug(e.target.value);
                      setIsCustomSlug(true);
                    }}
                    placeholder="slug-identifier"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-r-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Image / Thumbnail / Logo */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Logo / Thumbnail Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    placeholder="https://res.cloudinary.com/... or image link"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsMediaModalOpen(true)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 flex items-center gap-1.5 shrink-0 font-medium"
                    title="Choose from Cloudinary Media Library"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Media
                  </button>
                </div>

                {/* Preview Image if exists */}
                {formImage && (
                  <div className="mt-2 flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200/60">
                    <img
                      src={formImage}
                      alt="Preview"
                      className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-200 p-0.5"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] text-slate-500 truncate block">{formImage}</span>
                      <button
                        type="button"
                        onClick={() => setFormImage('')}
                        className="text-[11px] text-rose-600 hover:underline"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Description Fields */}
              <div className="space-y-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    English Description / Tagline
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Short description for customers and search engines..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Bengali Description (বাংলা বিবরণ)
                  </label>
                  <textarea
                    rows={2}
                    value={formDescriptionBN}
                    onChange={(e) => setFormDescriptionBN(e.target.value)}
                    placeholder="বাংলায় সংক্ষিপ্ত বিবরণ..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bengali focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Shop & Learn by Skin Concern Extra Fields */}
              {(editingItem?.type || activeTab) === 'skin_concern' && (
                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-rose-200/60 pb-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        Shop &amp; Learn by Skin Concern Guide Fields
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Displayed on the public /concerns &amp; /concern/:slug storefront pages.
                      </p>
                    </div>
                  </div>

                  {/* Key Focus Ingredients */}
                  <div className="space-y-2">
                    <label className="block text-slate-700 font-semibold">
                      Key Focus Ingredients
                    </label>
                    {formKeyFocusIngredients.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {formKeyFocusIngredients.map((ing, idx) => (
                          <span
                            key={`${ing}-${idx}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 font-semibold text-[11px]"
                          >
                            <span>{ing}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setFormKeyFocusIngredients((prev) => prev.filter((item) => item !== ing))
                              }
                              className="text-rose-400 hover:text-rose-700"
                              title={`Remove ${ing}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ingredientDraftInput}
                        onChange={(e) => setIngredientDraftInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddIngredientChip();
                          }
                        }}
                        placeholder="Add ingredient (e.g. Niacinamide, Centella Asiatica) & press Enter"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddIngredientChip()}
                        className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shrink-0"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {suggestedIngredientOptions
                        .filter(
                          (opt) =>
                            !formKeyFocusIngredients.some(
                              (cur) => cur.toLowerCase() === opt.toLowerCase()
                            )
                        )
                        .slice(0, 10)
                        .map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleAddIngredientChip(opt)}
                            className="px-2 py-0.5 rounded-md bg-white hover:bg-rose-100 border border-slate-200 hover:border-rose-300 text-[10px] font-medium text-slate-600 hover:text-rose-700 transition-colors"
                          >
                            + {opt}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Practical Routine Tips (EN) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-700 font-semibold">
                        Practical Cosmetic Routine Habits (EN)
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormRoutineTips((prev) => [...prev, ''])}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                      >
                        <Plus className="w-3 h-3" />
                        Add Tip
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formRoutineTips.map((tip, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 w-4 shrink-0">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={tip}
                            onChange={(e) => {
                              const next = [...formRoutineTips];
                              next[idx] = e.target.value;
                              setFormRoutineTips(next);
                            }}
                            placeholder="e.g. Apply SPF 50+ PA++++ every morning..."
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFormRoutineTips((prev) =>
                                prev.length > 1 ? prev.filter((_, i) => i !== idx) : ['']
                              )
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                            title="Remove tip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Practical Routine Tips (BN - Optional) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowBnTipsEditor((prev) => !prev)}
                        className="text-[11px] font-semibold text-slate-600 hover:text-rose-600 flex items-center gap-1"
                      >
                        <span>
                          {showBnTipsEditor ? '▾ Hide' : '▸ Add / Edit'} Bengali Routine Tips (বাংলা টিপস · {formRoutineTipsBN.filter((t) => t.trim()).length})
                        </span>
                      </button>
                      {showBnTipsEditor && (
                        <button
                          type="button"
                          onClick={() => setFormRoutineTipsBN((prev) => [...prev, ''])}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                        >
                          <Plus className="w-3 h-3" />
                          Add বাংলা Tip
                        </button>
                      )}
                    </div>
                    {showBnTipsEditor && (
                      <div className="space-y-2">
                        {formRoutineTipsBN.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => setFormRoutineTipsBN([''])}
                            className="w-full py-2 px-3 rounded-xl border border-dashed border-rose-200 bg-white text-[11px] font-medium text-slate-500 hover:text-rose-600"
                          >
                            + Add first Bengali routine tip
                          </button>
                        ) : (
                          formRoutineTipsBN.map((tip, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-slate-400 w-4 shrink-0">
                                {idx + 1}.
                              </span>
                              <input
                                type="text"
                                value={tip}
                                onChange={(e) => {
                                  const next = [...formRoutineTipsBN];
                                  next[idx] = e.target.value;
                                  setFormRoutineTipsBN(next);
                                }}
                                placeholder="বাংলায় ব্যবহারিক রুটিন টিপস লিখুন..."
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bengali focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setFormRoutineTipsBN((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                                title="Remove Bengali tip"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Catalog Match Keywords */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-700 font-semibold">
                      Catalog Auto-Match Keywords (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formMatchKeywordsText}
                      onChange={(e) => setFormMatchKeywordsText(e.target.value)}
                      placeholder="e.g. acne, blemish, pimple, pore, sebum, breakout"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                    <p className="text-[10px] text-slate-500">
                      Products assigned directly via &ldquo;Assign Products&rdquo; or matching these keywords appear on this concern&apos;s page.
                    </p>
                  </div>
                </div>
              )}

              {/* Korean Skincare Ingredients Library Extra Fields */}
              {(editingItem?.type || activeTab) === 'ingredient' && (
                <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200/80 space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-teal-200/60 pb-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        Korean Skincare Ingredients Library Fields
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Displayed on the public /ingredients &amp; /ingredient/:slug library pages.
                      </p>
                    </div>
                  </div>

                  {/* Korean Name & Short Role (EN) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Korean Name (한국어)
                      </label>
                      <input
                        type="text"
                        value={formKoreanName}
                        onChange={(e) => setFormKoreanName(e.target.value)}
                        placeholder="e.g. 병풀추출물"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Short Cosmetic Role (EN)
                      </label>
                      <input
                        type="text"
                        value={formShortRole}
                        onChange={(e) => setFormShortRole(e.target.value)}
                        placeholder="e.g. Calming botanical extract for redness"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Short Role (BN - Optional) */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Short Role in Bengali (সংক্ষিপ্ত ভূমিকা - ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      value={formShortRoleBN}
                      onChange={(e) => setFormShortRoleBN(e.target.value)}
                      placeholder="e.g. লালচে ভাব ও সংবেদনশীল ত্বক প্রশমিত করার উপাদান"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-bengali focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  {/* Best For Skin Types */}
                  <div className="space-y-2">
                    <label className="block text-slate-700 font-semibold">
                      Best For Skin Types
                    </label>
                    {formBestForSkinTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {formBestForSkinTypes.map((st) => (
                          <span
                            key={st}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-teal-800 font-semibold text-[11px]"
                          >
                            <span>{st}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setFormBestForSkinTypes((prev) => prev.filter((item) => item !== st))
                              }
                              className="text-teal-500 hover:text-rose-600"
                              title={`Remove ${st}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={skinTypeDraftInput}
                        onChange={(e) => setSkinTypeDraftInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddChipToList(
                              setFormBestForSkinTypes,
                              setSkinTypeDraftInput,
                              skinTypeDraftInput
                            );
                          }
                        }}
                        placeholder="Add skin type (e.g. Sensitive, Oily, Acne-Prone) & press Enter"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleAddChipToList(
                            setFormBestForSkinTypes,
                            setSkinTypeDraftInput,
                            skinTypeDraftInput
                          )
                        }
                        className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shrink-0"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {suggestedSkinTypeOptions
                        .filter(
                          (opt) =>
                            !formBestForSkinTypes.some(
                              (cur) => cur.toLowerCase() === opt.toLowerCase()
                            )
                        )
                        .slice(0, 10)
                        .map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              handleAddChipToList(
                                setFormBestForSkinTypes,
                                setSkinTypeDraftInput,
                                skinTypeDraftInput,
                                opt
                              )
                            }
                            className="px-2 py-0.5 rounded-md bg-white hover:bg-teal-100 border border-slate-200 hover:border-teal-300 text-[10px] font-medium text-slate-600 hover:text-teal-800 transition-colors"
                          >
                            + {opt}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Pairs Well With */}
                  <div className="space-y-2">
                    <label className="block text-slate-700 font-semibold">
                      Pairs Well With
                    </label>
                    {formPairsWellWith.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {formPairsWellWith.map((partner, idx) => (
                          <span
                            key={`${partner}-${idx}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800 font-semibold text-[11px]"
                          >
                            <span>{partner}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setFormPairsWellWith((prev) => prev.filter((item) => item !== partner))
                              }
                              className="text-emerald-500 hover:text-rose-600"
                              title={`Remove ${partner}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pairDraftInput}
                        onChange={(e) => setPairDraftInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddChipToList(
                              setFormPairsWellWith,
                              setPairDraftInput,
                              pairDraftInput
                            );
                          }
                        }}
                        placeholder="Add compatible ingredient (e.g. Panthenol, Ceramides) & press Enter"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleAddChipToList(
                            setFormPairsWellWith,
                            setPairDraftInput,
                            pairDraftInput
                          )
                        }
                        className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shrink-0"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {suggestedIngredientOptions
                        .filter(
                          (opt) =>
                            !formPairsWellWith.some(
                              (cur) => cur.toLowerCase() === opt.toLowerCase()
                            )
                        )
                        .slice(0, 10)
                        .map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              handleAddChipToList(
                                setFormPairsWellWith,
                                setPairDraftInput,
                                pairDraftInput,
                                opt
                              )
                            }
                            className="px-2 py-0.5 rounded-md bg-white hover:bg-emerald-100 border border-slate-200 hover:border-emerald-300 text-[10px] font-medium text-slate-600 hover:text-emerald-800 transition-colors"
                          >
                            + {opt}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Layering & Patch Test Cautions (EN) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-700 font-semibold">
                        Layering &amp; Patch Test Notes (EN)
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormLayeringCautions((prev) => [...prev, ''])}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800"
                      >
                        <Plus className="w-3 h-3" />
                        Add Note
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formLayeringCautions.map((note, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 w-4 shrink-0">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={note}
                            onChange={(e) => {
                              const next = [...formLayeringCautions];
                              next[idx] = e.target.value;
                              setFormLayeringCautions(next);
                            }}
                            placeholder="e.g. Gentle for daily AM/PM use. Patch test on jawline first."
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFormLayeringCautions((prev) =>
                                prev.length > 1 ? prev.filter((_, i) => i !== idx) : ['']
                              )
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                            title="Remove note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Layering Cautions (BN - Optional) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowBnCautionsEditor((prev) => !prev)}
                        className="text-[11px] font-semibold text-slate-600 hover:text-teal-700 flex items-center gap-1"
                      >
                        <span>
                          {showBnCautionsEditor ? '▾ Hide' : '▸ Add / Edit'} Bengali Layering Notes (বাংলা সতর্কতা · {formLayeringCautionsBN.filter((t) => t.trim()).length})
                        </span>
                      </button>
                      {showBnCautionsEditor && (
                        <button
                          type="button"
                          onClick={() => setFormLayeringCautionsBN((prev) => [...prev, ''])}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800"
                        >
                          <Plus className="w-3 h-3" />
                          Add বাংলা Note
                        </button>
                      )}
                    </div>
                    {showBnCautionsEditor && (
                      <div className="space-y-2">
                        {formLayeringCautionsBN.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => setFormLayeringCautionsBN([''])}
                            className="w-full py-2 px-3 rounded-xl border border-dashed border-teal-200 bg-white text-[11px] font-medium text-slate-500 hover:text-teal-700"
                          >
                            + Add first Bengali layering note
                          </button>
                        ) : (
                          formLayeringCautionsBN.map((note, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-slate-400 w-4 shrink-0">
                                {idx + 1}.
                              </span>
                              <input
                                type="text"
                                value={note}
                                onChange={(e) => {
                                  const next = [...formLayeringCautionsBN];
                                  next[idx] = e.target.value;
                                  setFormLayeringCautionsBN(next);
                                }}
                                placeholder="বাংলায় ব্যবহার ও সতর্কতা লিখুন..."
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bengali focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setFormLayeringCautionsBN((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                                title="Remove Bengali note"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Catalog Match Keywords */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-700 font-semibold">
                      Catalog Auto-Match Keywords (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formMatchKeywordsText}
                      onChange={(e) => setFormMatchKeywordsText(e.target.value)}
                      placeholder="e.g. centella, cica, madecassoside, asiaticoside"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                    <p className="text-[10px] text-slate-500">
                      Products assigned directly via &ldquo;Assign Products&rdquo; or matching these keywords appear on this ingredient&apos;s page.
                    </p>
                  </div>
                </div>
              )}

              {/* Display Order & Flags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Display Priority</label>
                  <input
                    type="number"
                    min={1}
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                  />
                </div>

                <div className="flex items-center sm:pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-semibold text-slate-700">Active in Store</span>
                  </label>
                </div>

                <div className="flex items-center sm:pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsFeatured}
                      onChange={(e) => setFormIsFeatured(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="font-semibold text-slate-700">⭐ Featured</span>
                  </label>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOUDINARY MEDIA LIBRARY MODAL */}
      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectImage={(url) => {
          setFormImage(url);
          setIsMediaModalOpen(false);
        }}
        title={`Select ${currentConfig.singular} Logo / Icon`}
      />

      {/* SAFE DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Delete {currentConfig.singular} "{itemToDelete.name}"?
            </h3>

            {getItemProductCount(itemToDelete) > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 mb-4 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Warning: {getItemProductCount(itemToDelete)} Products Currently Linked!</span>
                </div>
                <p className="text-amber-800">
                  Deleting this taxonomy item may remove it from product filter dropdowns. You can alternatively <strong>Hide</strong> it instead of deleting to keep product links safe.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                This action cannot be undone. It will remove "{itemToDelete.name}" from your store's filter options.
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                {deleteMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEED DEFAULT PRESETS CONFIRMATION MODAL */}
      {isSeedConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100">
              <Sparkles className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Sync & Seed Default Korean Beauty Presets?
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              This will populate your database with comprehensive standard Korean skincare brands (COSRX, Anua, Beauty of Joseon, etc.), standard categories, routine steps, skin concerns, and key ingredients with Bengali translations. Existing custom items will remain untouched.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsSeedConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSeedDefaults}
                disabled={seedMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                {seedMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Proceed with Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT ASSIGNMENT MODAL */}
      <TaxonomyProductAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => {
          setIsAssignmentModalOpen(false);
          setAssignmentItem(null);
        }}
        taxonomyItem={assignmentItem}
      />
    </div>
  );
};
export default AdminTaxonomyManagement;
