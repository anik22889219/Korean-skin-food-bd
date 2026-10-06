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
  brand: {
    label: 'Brands',
    labelBN: 'ব্র্যান্ডসমূহ',
    singular: 'Brand',
    description: 'Manage K-Beauty brands, logos, origin descriptions, and brand spotlights.',
    icon: '🏷️',
    color: 'from-pink-500 to-rose-600',
  },
  category: {
    label: 'Categories',
    labelBN: 'ক্যাটাগরিসমূহ',
    singular: 'Category',
    description: 'Primary product categories for the shop navigation and catalog filters.',
    icon: '🗂️',
    color: 'from-purple-500 to-indigo-600',
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

  // Active taxonomy tab
  const [activeTab, setActiveTab] = useState<TaxonomyDimensionType>('brand');
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
    return productUsageMap.get(key) || 0;
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
    setIsCustomSlug(false);
    setIsEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: TaxonomyItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormNameBN(item.nameBN || '');
    setFormSlug(item.slug || generateTaxonomySlug(item.name));
    setFormDescription(item.description || '');
    setFormDescriptionBN(item.descriptionBN || '');
    setFormImage(item.image || '');
    setFormDisplayOrder(item.displayOrder || 1);
    setFormIsActive(item.isActive ?? true);
    setFormIsFeatured(item.isFeatured ?? false);
    setFormIsPopular(item.isPopular ?? false);
    setIsCustomSlug(true);
    setIsEditModalOpen(true);
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

    const slug = formSlug.trim() || generateTaxonomySlug(formName);

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          updates: {
            name: formName.trim(),
            nameBN: formNameBN.trim() || undefined,
            slug,
            description: formDescription.trim() || undefined,
            descriptionBN: formDescriptionBN.trim() || undefined,
            image: formImage.trim() || undefined,
            displayOrder: Number(formDisplayOrder) || 1,
            isActive: formIsActive,
            isFeatured: formIsFeatured,
            isPopular: formIsPopular,
          },
        });
        showNotification(`${DIMENSION_CONFIG[activeTab].singular} "${formName}" updated successfully.`);
      } else {
        await createMutation.mutateAsync({
          type: activeTab,
          name: formName.trim(),
          nameBN: formNameBN.trim() || undefined,
          slug,
          description: formDescription.trim() || undefined,
          descriptionBN: formDescriptionBN.trim() || undefined,
          image: formImage.trim() || undefined,
          displayOrder: Number(formDisplayOrder) || tabItems.length + 1,
          isActive: formIsActive,
          isFeatured: formIsFeatured,
          isPopular: formIsPopular,
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
                  Taxonomies & Product Filters
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    Live System
                  </span>
                </h1>
                <p className="text-sm text-slate-500">
                  Manage Brands, Categories, Skin Types, Concerns, Benefits, Routine Steps, and Key Ingredients for store-wide filters.
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
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
