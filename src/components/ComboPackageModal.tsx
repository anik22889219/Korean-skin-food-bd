import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Layers, Plus, Trash2, Search, Check, Sparkles, Tag, 
  HelpCircle, Image as ImageIcon, ArrowRight, ShieldCheck, Box, RefreshCw 
} from 'lucide-react';
import { Product, ComboConfig, ComboType, ComboFixedItem, ComboStepConfig } from '../types';
import { productService } from '../services/productService';
import { getRetailPrice, getComboEffectiveStock, getComboSavings } from '../utils/pricing';
import { MediaLibraryModal } from './MediaLibraryModal';

interface ComboPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  comboToEdit?: Product | null;
  allProducts: Product[];
  onSaved: (combo: Product) => void;
}

export const ComboPackageModal: React.FC<ComboPackageModalProps> = ({
  isOpen,
  onClose,
  comboToEdit,
  allProducts,
  onSaved
}) => {
  // Available single products (filter out combos from being bundled recursively)
  const singleProducts = useMemo(() => {
    return allProducts.filter(p => !p.isCombo && p.id !== comboToEdit?.id);
  }, [allProducts, comboToEdit]);

  // Form State
  const [comboType, setComboType] = useState<ComboType>('fixed');
  const [name, setName] = useState('');
  const [nameBN, setNameBN] = useState('');
  const [brand, setBrand] = useState('Korean Skin Food');
  const [category, setCategory] = useState('Combo & Sets');
  const [barcode, setBarcode] = useState('');
  const [sku, setSku] = useState('');
  const [image, setImage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [descriptionBN, setDescriptionBN] = useState('');

  // Fixed Bundle State
  const [fixedItems, setFixedItems] = useState<ComboFixedItem[]>([]);
  const [fixedPackagePrice, setFixedPackagePrice] = useState<number | ''>('');
  const [searchProductQuery, setSearchProductQuery] = useState('');

  // Customizable Routine State
  const [pricingMode, setPricingMode] = useState<'fixed_price' | 'dynamic_discount'>('fixed_price');
  const [customPackagePrice, setCustomPackagePrice] = useState<number | ''>('');
  const [discountPercentage, setDiscountPercentage] = useState<number | ''>(15);
  const [steps, setSteps] = useState<ComboStepConfig[]>([
    { id: 'step-1', title: 'Step 1: Choose Cleanser', titleBN: 'ধাপ ১: ক্লিনজার নির্বাচন করুন', minSelections: 1, maxSelections: 1, allowedProductIds: [] },
    { id: 'step-2', title: 'Step 2: Choose Toner', titleBN: 'ধাপ ২: টোনার নির্বাচন করুন', minSelections: 1, maxSelections: 1, allowedProductIds: [] },
    { id: 'step-3', title: 'Step 3: Choose Cream', titleBN: 'ধাপ ৩: ময়েশ্চারাইজার নির্বাচন করুন', minSelections: 1, maxSelections: 1, allowedProductIds: [] }
  ]);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [stepSearchQuery, setStepSearchQuery] = useState('');

  // Media Library Modal
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize form when opening or editing
  useEffect(() => {
    if (comboToEdit) {
      setName(comboToEdit.name || '');
      setNameBN(comboToEdit.nameBN || '');
      setBrand(comboToEdit.brand || 'Korean Skin Food');
      setCategory(comboToEdit.category || 'Combo & Sets');
      setBarcode(comboToEdit.barcode || '');
      setSku(comboToEdit.sku || '');
      setImage(comboToEdit.image || '');
      setImages(comboToEdit.images || []);
      setDescription(comboToEdit.description || '');
      setDescriptionBN(comboToEdit.descriptionBN || '');

      if (comboToEdit.comboConfig) {
        setComboType(comboToEdit.comboConfig.type);
        setPricingMode(comboToEdit.comboConfig.pricingMode || 'fixed_price');
        if (comboToEdit.comboConfig.packagePrice) {
          setFixedPackagePrice(comboToEdit.comboConfig.packagePrice);
          setCustomPackagePrice(comboToEdit.comboConfig.packagePrice);
        }
        if (comboToEdit.comboConfig.discountPercentage) {
          setDiscountPercentage(comboToEdit.comboConfig.discountPercentage);
        }
        if (comboToEdit.comboConfig.items) {
          setFixedItems(comboToEdit.comboConfig.items);
        }
        if (comboToEdit.comboConfig.steps) {
          setSteps(comboToEdit.comboConfig.steps);
        }
      } else {
        setFixedPackagePrice(getRetailPrice(comboToEdit));
      }
    } else {
      // New combo package default
      setName('');
      setNameBN('');
      setBrand('Korean Skin Food');
      setCategory('Combo & Sets');
      const randomBarcode = 'CMB-' + Math.floor(100000 + Math.random() * 900000);
      setBarcode(randomBarcode);
      setSku('SKU-' + randomBarcode);
      setImage('');
      setImages([]);
      setDescription('');
      setDescriptionBN('');
      setFixedItems([]);
      setFixedPackagePrice('');
      setCustomPackagePrice('');
      setDiscountPercentage(15);
      setComboType('fixed');
    }
    setErrorMsg(null);
  }, [comboToEdit, isOpen]);

  // Calculations for Fixed Mode
  const fixedTotalOriginal = useMemo(() => {
    return fixedItems.reduce((sum, it) => {
      const prod = singleProducts.find(p => p.id === it.productId);
      return sum + (prod ? getRetailPrice(prod) * it.quantity : 0);
    }, 0);
  }, [fixedItems, singleProducts]);

  const fixedSavings = useMemo(() => {
    const pkgPrice = typeof fixedPackagePrice === 'number' ? fixedPackagePrice : 0;
    if (pkgPrice <= 0 || fixedTotalOriginal <= 0) return { amount: 0, percent: 0 };
    const saved = Math.max(0, fixedTotalOriginal - pkgPrice);
    const pct = Math.round((saved / fixedTotalOriginal) * 100);
    return { amount: saved, percent: pct };
  }, [fixedTotalOriginal, fixedPackagePrice]);

  // Dynamic Effective Stock for Preview
  const previewStock = useMemo(() => {
    const dummyProduct: Partial<Product> = {
      isCombo: true,
      comboConfig: {
        type: comboType,
        pricingMode,
        packagePrice: comboType === 'fixed' 
          ? (typeof fixedPackagePrice === 'number' ? fixedPackagePrice : 0)
          : (typeof customPackagePrice === 'number' ? customPackagePrice : 0),
        discountPercentage: typeof discountPercentage === 'number' ? discountPercentage : 0,
        items: fixedItems,
        steps: steps
      }
    };
    return getComboEffectiveStock(dummyProduct, singleProducts);
  }, [comboType, pricingMode, fixedPackagePrice, customPackagePrice, discountPercentage, fixedItems, steps, singleProducts]);

  // Handlers for Fixed Items
  const handleAddFixedItem = (prod: Product) => {
    if (fixedItems.some(i => i.productId === prod.id)) return;
    setFixedItems([...fixedItems, { productId: prod.id, quantity: 1 }]);
    setSearchProductQuery('');
    // Auto-set package price if currently empty
    if (!fixedPackagePrice) {
      const newTotal = fixedTotalOriginal + getRetailPrice(prod);
      // default 15% discount for package recommendation
      setFixedPackagePrice(Math.round(newTotal * 0.85));
    }
  };

  const handleUpdateFixedQty = (productId: string, delta: number) => {
    setFixedItems(items => items.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleRemoveFixedItem = (productId: string) => {
    setFixedItems(items => items.filter(i => i.productId !== productId));
  };

  // Handlers for Customizable Steps
  const handleAddStep = () => {
    const newStepNum = steps.length + 1;
    setSteps([
      ...steps,
      {
        id: `step-${Date.now()}`,
        title: `Step ${newStepNum}: Select Item`,
        titleBN: `ধাপ ${newStepNum}: পণ্য নির্বাচন করুন`,
        minSelections: 1,
        maxSelections: 1,
        allowedProductIds: []
      }
    ]);
    setActiveStepIndex(steps.length);
  };

  const handleRemoveStep = (indexToRemove: number) => {
    if (steps.length <= 1) {
      setErrorMsg('A customizable set must have at least one routine step.');
      return;
    }
    const updated = steps.filter((_, idx) => idx !== indexToRemove);
    setSteps(updated);
    setActiveStepIndex(Math.max(0, indexToRemove - 1));
  };

  const handleToggleProductInStep = (stepIdx: number, productId: string) => {
    setSteps(prev => prev.map((step, idx) => {
      if (idx !== stepIdx) return step;
      const isAllowed = step.allowedProductIds.includes(productId);
      return {
        ...step,
        allowedProductIds: isAllowed
          ? step.allowedProductIds.filter(id => id !== productId)
          : [...step.allowedProductIds, productId]
      };
    }));
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a combo package name.');
      return;
    }

    if (comboType === 'fixed') {
      if (fixedItems.length < 2) {
        setErrorMsg('A fixed combo bundle must include at least 2 existing products.');
        return;
      }
      if (!fixedPackagePrice || Number(fixedPackagePrice) <= 0) {
        setErrorMsg('Please specify a valid package retail price.');
        return;
      }
    } else {
      if (steps.length === 0) {
        setErrorMsg('Please add at least one routine step for customizable packages.');
        return;
      }
      const emptyStep = steps.find(s => s.allowedProductIds.length === 0);
      if (emptyStep) {
        setErrorMsg(`Step "${emptyStep.title}" has no selectable products assigned.`);
        return;
      }
      if (pricingMode === 'fixed_price' && (!customPackagePrice || Number(customPackagePrice) <= 0)) {
        setErrorMsg('Please specify a fixed package retail price.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const finalPrice = comboType === 'fixed' 
        ? Number(fixedPackagePrice) 
        : (pricingMode === 'fixed_price' ? Number(customPackagePrice) : fixedTotalOriginal || 1000);

      const comboConfigPayload: ComboConfig = {
        type: comboType,
        pricingMode: comboType === 'fixed' ? 'fixed_price' : pricingMode,
        packagePrice: finalPrice,
        discountPercentage: comboType === 'customizable' && pricingMode === 'dynamic_discount' ? Number(discountPercentage) : undefined,
        items: comboType === 'fixed' ? fixedItems : undefined,
        steps: comboType === 'customizable' ? steps : undefined
      };

      const productPayload: Product = {
        id: comboToEdit ? comboToEdit.id : `combo-${Date.now()}`,
        name: name.trim(),
        nameBN: nameBN.trim() || name.trim(),
        brand: brand.trim() || 'Korean Skin Food',
        category: category.trim() || 'Combo & Sets',
        skinTypes: comboToEdit?.skinTypes || ['All Skin Types'],
        retailPrice: finalPrice,
        price: finalPrice,
        discountRetailPrice: comboType === 'fixed' && fixedTotalOriginal > finalPrice ? finalPrice : undefined,
        discountPrice: comboType === 'fixed' && fixedTotalOriginal > finalPrice ? finalPrice : undefined,
        image: image.trim() || (fixedItems[0] ? (singleProducts.find(p => p.id === fixedItems[0].productId)?.image || '') : ''),
        images: images.length > 0 ? images : undefined,
        stock: previewStock,
        description: description.trim() || `Special combo set containing curated K-Beauty essentials.`,
        descriptionBN: descriptionBN.trim() || '',
        rating: comboToEdit?.rating || 5,
        reviewsCount: comboToEdit?.reviewsCount || 0,
        barcode: barcode.trim() || ('CMB-' + Math.floor(100000 + Math.random() * 900000)),
        sku: sku.trim() || ('SKU-CMB-' + Math.floor(100000 + Math.random() * 900000)),
        isCombo: true,
        comboConfig: comboConfigPayload
      };

      if (comboToEdit) {
        await productService.updateProduct(productPayload);
      } else {
        await productService.createProduct(productPayload);
      }

      onSaved(productPayload);
      onClose();
    } catch (err: any) {
      console.error('Failed to save combo package:', err);
      setErrorMsg(err.message || 'Failed to save combo package. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100/80 text-rose-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                {comboToEdit ? 'Edit Combo Package' : 'Create New Combo Package'}
              </h2>
              <p className="text-xs text-stone-500">
                Bundle existing catalog products with dynamic real-time inventory tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <span className="font-semibold">Error:</span> {errorMsg}
            </div>
          )}

          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
              Combo Package Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setComboType('fixed')}
                className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  comboType === 'fixed'
                    ? 'border-rose-600 bg-rose-50/40 ring-2 ring-rose-500/20'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${comboType === 'fixed' ? 'bg-rose-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-stone-900">Fixed Curated Bundle</div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Specific products pre-selected at a bundled price (e.g. Glass Skin Duo, 4-Piece Anti-Acne Kit).
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setComboType('customizable')}
                className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  comboType === 'customizable'
                    ? 'border-rose-600 bg-rose-50/40 ring-2 ring-rose-500/20'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${comboType === 'customizable' ? 'bg-rose-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-stone-900">Customizable Routine Box</div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Customer chooses 1 item per routine step from designated pools (e.g. Pick 1 Cleanser + 1 Toner + 1 Cream).
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Basic Package Information */}
          <div className="bg-stone-50/50 rounded-xl p-4 border border-stone-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Basic Package Information
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Package Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Glass Skin Routine Duo"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Package Name (Bengali)
                </label>
                <input
                  type="text"
                  placeholder="e.g. গ্লাস স্কিন রুটিন কম্বো"
                  value={nameBN}
                  onChange={e => setNameBN(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Package Barcode / POS Code *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. CMB-123456"
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newCode = 'CMB-' + Math.floor(100000 + Math.random() * 900000);
                      setBarcode(newCode);
                      if (!sku) setSku('SKU-' + newCode);
                    }}
                    className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                    title="Generate Random Barcode"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Auto
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Primary Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://..."
                    value={image}
                    onChange={e => setImage(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsMediaLibraryOpen(true)}
                    className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Media
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                placeholder="Describe what is included in this bundle and its skin benefits..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              />
            </div>
          </div>

          {/* ======================= FIXED BUNDLE BUILDER ======================= */}
          {comboType === 'fixed' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Bundled Products Selection</h3>
                  <p className="text-xs text-stone-500">Pick the products included in this fixed package</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-stone-500">Live Calculated Stock: </span>
                  <span className={`text-sm font-bold ${previewStock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {previewStock} packages available
                  </span>
                </div>
              </div>

              {/* Product Search & Picker */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search existing products by name or barcode to add to combo..."
                  value={searchProductQuery}
                  onChange={e => setSearchProductQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                />

                {/* Dropdown Suggestions */}
                {searchProductQuery.trim().length > 1 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-20 divide-y divide-stone-100">
                    {singleProducts
                      .filter(p => 
                        p.name.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
                        (p.barcode && p.barcode.includes(searchProductQuery))
                      )
                      .slice(0, 8)
                      .map(prod => {
                        const alreadyAdded = fixedItems.some(i => i.productId === prod.id);
                        return (
                          <div
                            key={prod.id}
                            onClick={() => !alreadyAdded && handleAddFixedItem(prod)}
                            className={`p-3 flex items-center justify-between transition-colors ${
                              alreadyAdded ? 'bg-stone-50 opacity-50 cursor-not-allowed' : 'hover:bg-rose-50/50 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={prod.image || 'https://placehold.co/40x40?text=K'}
                                alt={prod.name}
                                className="w-9 h-9 rounded object-cover border border-stone-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-stone-900 truncate">{prod.name}</div>
                                <div className="text-[11px] text-stone-500">
                                  ৳{getRetailPrice(prod)} · Stock: {prod.stock} · {prod.brand}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-rose-600 shrink-0 ml-2">
                              {alreadyAdded ? 'Added' : '+ Add'}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Added Items List */}
              {fixedItems.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-xl text-stone-400 text-xs">
                  No products added yet. Search above to add items to this combo package.
                </div>
              ) : (
                <div className="space-y-2 border border-stone-200 rounded-xl divide-y divide-stone-100 overflow-hidden bg-white">
                  {fixedItems.map((item, idx) => {
                    const prod = singleProducts.find(p => p.id === item.productId);
                    if (!prod) return null;
                    const itemSubtotal = getRetailPrice(prod) * item.quantity;
                    const canFulfill = Math.floor(prod.stock / item.quantity);

                    return (
                      <div key={item.productId} className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-bold text-stone-400 w-4">{idx + 1}.</span>
                          <img
                            src={prod.image || 'https://placehold.co/40x40?text=K'}
                            alt={prod.name}
                            className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-stone-900 truncate">{prod.name}</h4>
                            <div className="text-[11px] text-stone-500 flex items-center gap-2">
                              <span>৳{getRetailPrice(prod)} each</span>
                              <span>·</span>
                              <span className={prod.stock > 0 ? 'text-stone-600' : 'text-rose-600 font-bold'}>
                                Shelf Stock: {prod.stock}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          {/* Quantity in bundle stepper */}
                          <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleUpdateFixedQty(item.productId, -1)}
                              disabled={item.quantity <= 1}
                              className="px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 disabled:opacity-40"
                            >
                              -
                            </button>
                            <span className="px-2.5 py-1 text-xs font-semibold text-stone-800">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateFixedQty(item.productId, 1)}
                              className="px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
                            >
                              +
                            </button>
                          </div>

                          <div className="w-16 text-right text-xs font-bold text-stone-900">
                            ৳{itemSubtotal}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveFixedItem(item.productId)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pricing & Savings Card */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-xs text-stone-500">Combined Original Retail Value:</div>
                  <div className="text-base font-bold text-stone-700">৳{fixedTotalOriginal}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Bundle Package Price (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 2800"
                      value={fixedPackagePrice}
                      onChange={e => setFixedPackagePrice(e.target.value ? Number(e.target.value) : '')}
                      className="w-32 px-3 py-2 text-sm font-bold border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  {fixedSavings.amount > 0 && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
                      <div className="font-bold">Customer Saves ৳{fixedSavings.amount}</div>
                      <div className="text-[11px] text-emerald-600 font-semibold">{fixedSavings.percent}% OFF regular sum</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= CUSTOMIZABLE ROUTINE BUILDER ================= */}
          {comboType === 'customizable' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Customizable Routine Steps</h3>
                  <p className="text-xs text-stone-500">Configure each step and allowed product choices</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Step
                </button>
              </div>

              {/* Pricing Policy Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pricingMode"
                    checked={pricingMode === 'fixed_price'}
                    onChange={() => setPricingMode('fixed_price')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-stone-800">Flat Package Price</span>
                    <span className="text-stone-500 block text-[11px]">Any combination costs the exact same set price</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pricingMode"
                    checked={pricingMode === 'dynamic_discount'}
                    onChange={() => setPricingMode('dynamic_discount')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-stone-800">Dynamic Bundle Discount</span>
                    <span className="text-stone-500 block text-[11px]">Sums chosen items minus % bundle savings</span>
                  </div>
                </label>
              </div>

              {pricingMode === 'fixed_price' ? (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-stone-700">Set Package Retail Price (৳):</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 3500"
                    value={customPackagePrice}
                    onChange={e => setCustomPackagePrice(e.target.value ? Number(e.target.value) : '')}
                    className="w-36 px-3 py-2 text-sm font-bold border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-stone-700">Bundle Discount (%):</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={90}
                    placeholder="e.g. 15"
                    value={discountPercentage}
                    onChange={e => setDiscountPercentage(e.target.value ? Number(e.target.value) : '')}
                    className="w-24 px-3 py-2 text-sm font-bold border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-xs text-stone-500">applied to total of selected items at checkout</span>
                </div>
              )}

              {/* Step Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200">
                {steps.map((step, idx) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStepIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                      activeStepIndex === idx
                        ? 'bg-rose-600 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Step {idx + 1} ({step.allowedProductIds.length} items)
                  </button>
                ))}
              </div>

              {/* Active Step Editor */}
              {steps[activeStepIndex] && (
                <div className="p-4 border border-stone-200 rounded-xl space-y-4 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-stone-600 mb-1">Step Title (English)</label>
                        <input
                          type="text"
                          value={steps[activeStepIndex].title}
                          onChange={e => {
                            const val = e.target.value;
                            setSteps(prev => prev.map((s, i) => i === activeStepIndex ? { ...s, title: val } : s));
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-stone-600 mb-1">Step Title (Bengali)</label>
                        <input
                          type="text"
                          value={steps[activeStepIndex].titleBN || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setSteps(prev => prev.map((s, i) => i === activeStepIndex ? { ...s, titleBN: val } : s));
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg"
                        />
                      </div>
                    </div>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(activeStepIndex)}
                        className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors self-end"
                        title="Delete Step"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filter products to add into this step */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Selectable Products for {steps[activeStepIndex].title} ({steps[activeStepIndex].allowedProductIds.length} selected)
                    </label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Filter catalog products..."
                        value={stepSearchQuery}
                        onChange={e => setStepSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-lg divide-y divide-stone-100 bg-stone-50/30">
                      {singleProducts
                        .filter(p => !stepSearchQuery || p.name.toLowerCase().includes(stepSearchQuery.toLowerCase()))
                        .slice(0, 30)
                        .map(prod => {
                          const isSelected = steps[activeStepIndex].allowedProductIds.includes(prod.id);
                          return (
                            <div
                              key={prod.id}
                              onClick={() => handleToggleProductInStep(activeStepIndex, prod.id)}
                              className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected ? 'bg-rose-50/70' : 'hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                                  isSelected ? 'bg-rose-600 border-rose-600 text-white' : 'border-stone-300 bg-white'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <img
                                  src={prod.image || 'https://placehold.co/30x30?text=K'}
                                  alt={prod.name}
                                  className="w-7 h-7 rounded object-cover border border-stone-200 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-stone-900 truncate">{prod.name}</div>
                                  <div className="text-[10px] text-stone-500">৳{getRetailPrice(prod)} · Stock: {prod.stock}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving Package...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {comboToEdit ? 'Save Changes' : 'Create Combo Package'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Media Library Integration */}
      {isMediaLibraryOpen && (
        <MediaLibraryModal
          isOpen={isMediaLibraryOpen}
          onClose={() => setIsMediaLibraryOpen(false)}
          onSelectImage={(url) => {
            setImage(url);
            setIsMediaLibraryOpen(false);
          }}
          title="Select Combo Package Cover Image"
        />
      )}
    </div>
  );
};
