import React, { useState, useRef, useMemo } from 'react';
import { Camera, Upload, X, Sparkles, CheckCircle2, AlertCircle, ShoppingBag, ArrowRight, RefreshCw, Eye, Search, ChevronRight, Tag } from 'lucide-react';
import { Product } from '../types';

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: Product[];
  onAddToCart?: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
}

interface ImageSearchResult {
  detectedItem?: {
    brand?: string;
    name?: string;
    category?: string;
    description?: string;
    skinConcernOrFeature?: string;
  };
  matches?: Array<{
    productId: string;
    matchScore: number;
    reason: string;
  }>;
  analysisSummary?: string;
}

export const ImageSearchModal: React.FC<ImageSearchModalProps> = ({
  isOpen,
  onClose,
  catalog,
  onAddToCart,
  onSelectProduct
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [textSearchQuery, setTextSearchQuery] = useState('');
  
  // Image state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<ImageSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Filter products for Text Search Tab
  const textFilteredProducts = useMemo(() => {
    const q = textSearchQuery.trim().toLowerCase();
    if (!q) return [];

    return catalog.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(q);
      const nameBNMatch = p.nameBN ? p.nameBN.toLowerCase().includes(q) : false;
      const brandMatch = p.brand.toLowerCase().includes(q);
      const categoryMatch = p.category.toLowerCase().includes(q);
      const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
      const skinMatch = p.skinType ? p.skinType.toLowerCase().includes(q) : false;
      return nameMatch || nameBNMatch || brandMatch || categoryMatch || barcodeMatch || skinMatch;
    });
  }, [catalog, textSearchQuery]);

  if (!isOpen) return null;

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    setError(null);
    setSearchResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1024;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setSelectedImage(compressedDataUrl);
          setMimeType('image/jpeg');
        } else {
          setSelectedImage(rawDataUrl);
          setMimeType(file.type);
        }
      };
      img.onerror = () => {
        setSelectedImage(rawDataUrl);
        setMimeType(file.type);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  const handlePerformSearch = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/search-by-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType,
          catalog
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        if (response.status === 413) {
          throw new Error('Image file size is too large. Please select a smaller photo or crop the item.');
        }
        throw new Error(`Server returned non-JSON response (${response.status}): ${text.slice(0, 100)}`);
      }

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to analyze image');
      }

      setSearchResult(data);
    } catch (err: any) {
      console.error('[Image Search Error]', err);
      setError(err.message || 'Error processing image search. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetSelection = () => {
    setSelectedImage(null);
    setSearchResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Map result match IDs to catalog products
  const matchedProductsWithDetails = (searchResult?.matches || [])
    .map(match => {
      const product = catalog.find(p => p.id === match.productId);
      return product ? { product, matchScore: match.matchScore, reason: match.reason } : null;
    })
    .filter(Boolean) as Array<{ product: Product; matchScore: number; reason: string }>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-50 via-pink-50 to-rose-100 border-b border-rose-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-md shadow-rose-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  Catalog Product Search
                  <span className="text-xs bg-rose-600 text-white px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shadow-xs">
                    Smart Search
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Search products by typing text or upload/snap a photo for AI visual recognition
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-2 bg-white/80 p-1 rounded-xl border border-rose-100 shadow-2xs">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'text'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-rose-50/50'
              }`}
            >
              <Search className="w-4 h-4" /> Type & Select Dropdown
            </button>
            <button
              onClick={() => setActiveTab('image')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'image'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-rose-50/50'
              }`}
            >
              <Camera className="w-4 h-4" /> Photo & Vision AI Search
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'text' ? (
            /* Tab 1: Text Search with Interactive Live Dropdown Selection */
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 text-rose-400 w-4 h-4" />
                <input
                  type="text"
                  value={textSearchQuery}
                  onChange={(e) => setTextSearchQuery(e.target.value)}
                  placeholder="Type product name (e.g., Snail Mucin, Anua, Sunscreen, COSRX)..."
                  className="w-full bg-slate-50 border border-rose-200 focus:border-rose-500 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition-all shadow-inner"
                  autoFocus
                />
                {textSearchQuery && (
                  <button
                    onClick={() => setTextSearchQuery('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Suggestion Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className="font-semibold text-slate-400 mr-1">Popular:</span>
                {['COSRX', 'Anua', 'Beauty of Joseon', 'Sunscreen', 'Cleanser', 'Centella'].map(pill => (
                  <button
                    key={pill}
                    onClick={() => setTextSearchQuery(pill)}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded-lg border border-rose-100 transition-colors"
                  >
                    {pill}
                  </button>
                ))}
              </div>

              {/* Dropdown Results Box */}
              {textSearchQuery.trim() !== '' ? (
                <div className="border border-rose-100 rounded-2xl bg-white shadow-sm overflow-hidden">
                  <div className="px-4 py-2 bg-rose-50/50 border-b border-rose-100 text-xs font-semibold text-rose-700 flex items-center justify-between">
                    <span>Matching Catalog Products ({textFilteredProducts.length})</span>
                    <span className="text-[10px] text-slate-400">Click product to view or add to cart</span>
                  </div>

                  {textFilteredProducts.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {textFilteredProducts.map(product => (
                        <div
                          key={product.id}
                          className="p-3 hover:bg-rose-50/40 transition-colors flex items-center gap-3 cursor-pointer group"
                          onClick={() => {
                            if (onSelectProduct) onSelectProduct(product);
                            onClose();
                          }}
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded-xl bg-slate-100 border border-slate-200 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-bold text-rose-600 uppercase bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100">
                                {product.brand}
                              </span>
                              <span className="text-[10px] text-slate-400">• {product.category}</span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-rose-600 transition-colors">
                              {product.name}
                            </h4>
                            {product.nameBN && (
                              <p className="text-[11px] text-slate-500 truncate font-bn">{product.nameBN}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-black text-rose-600">
                                ৳{product.price.toLocaleString()}
                              </span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                                product.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {onAddToCart && product.stock > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddToCart(product);
                                  onClose();
                                }}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" /> Add
                              </button>
                            )}
                            {onSelectProduct && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectProduct(product);
                                  onClose();
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center space-y-2">
                      <p className="font-semibold text-slate-700 text-sm">No products found for "{textSearchQuery}"</p>
                      <p className="text-xs text-slate-500">
                        Try searching with another keyword or switch to the <strong className="text-rose-600 cursor-pointer" onClick={() => setActiveTab('image')}>Photo Search</strong> tab!
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Default List when typing is empty */
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    All Catalog Items ({catalog.length})
                  </h4>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                    {catalog.slice(0, 10).map(product => (
                      <div
                        key={product.id}
                        className="p-3 hover:bg-rose-50/40 transition-colors flex items-center gap-3 cursor-pointer group"
                        onClick={() => {
                          if (onSelectProduct) onSelectProduct(product);
                          onClose();
                        }}
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded-lg bg-slate-100 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-slate-800 truncate group-hover:text-rose-600 transition-colors">
                            {product.name}
                          </h5>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {product.brand} • ৳{product.price.toLocaleString()}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Photo / Camera Vision AI Search */
            <div>
              {!selectedImage ? (
                /* Upload State */
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-rose-200 hover:border-rose-400 rounded-2xl p-8 text-center bg-rose-50/30 hover:bg-rose-50/60 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-base">
                      Drag & drop your product image here
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports JPEG, PNG, or WEBP photos of skincare bottles, labels, or boxes
                    </p>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" /> Browse Image
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition-all flex items-center gap-2 shadow-2xs"
                    >
                      <Camera className="w-4 h-4 text-rose-500" /> Snap Photo
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                /* Selected Image & Analysis View */
                <div className="space-y-6">
                  {/* Preview Box */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center max-h-64 shadow-inner">
                    <img
                      src={selectedImage}
                      alt="Product to search"
                      className="max-h-64 object-contain"
                    />
                    <button
                      onClick={resetSelection}
                      className="absolute top-3 right-3 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition-colors shadow-md text-xs flex items-center gap-1 px-3"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Change Photo
                    </button>
                  </div>

                  {/* Action Button if search hasn't run yet */}
                  {!searchResult && !isAnalyzing && (
                    <button
                      onClick={handlePerformSearch}
                      className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg shadow-rose-200 hover:shadow-rose-300 transition-all flex items-center justify-center gap-2 text-base"
                    >
                      <Sparkles className="w-5 h-5 animate-pulse" />
                      Analyze Image & Search Catalog
                    </button>
                  )}

                  {/* Loading State */}
                  {isAnalyzing && (
                    <div className="p-8 text-center bg-rose-50/50 rounded-2xl border border-rose-100 space-y-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 animate-spin">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 text-base">Gemini Vision AI is Scanning Photo...</h4>
                        <p className="text-xs text-slate-500 mt-1">Reading bottle labels, brand names, and matching formula features against store catalog</p>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Search Notice</p>
                        <p className="text-xs text-amber-700 mt-0.5">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Results Display */}
                  {searchResult && (
                    <div className="space-y-6 animate-fadeIn">
                      {/* AI Detection Summary Card */}
                      {searchResult.detectedItem && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Visual AI Detection
                            </span>
                            {searchResult.detectedItem.brand && (
                              <span className="text-xs bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                                {searchResult.detectedItem.brand}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-900 text-base">
                            {searchResult.detectedItem.name || 'Identified Skincare Item'}
                          </h4>
                          {searchResult.detectedItem.description && (
                            <p className="text-xs text-slate-600">
                              {searchResult.detectedItem.description}
                            </p>
                          )}
                          {searchResult.detectedItem.skinConcernOrFeature && (
                            <div className="text-xs text-rose-700 font-medium bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 inline-block">
                              Key Feature / Concern: {searchResult.detectedItem.skinConcernOrFeature}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Catalog Matches List */}
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm mb-3 flex items-center justify-between">
                          <span>Matching Catalog Products ({matchedProductsWithDetails.length})</span>
                          {matchedProductsWithDetails.length > 0 && (
                            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              Match Found
                            </span>
                          )}
                        </h4>

                        {matchedProductsWithDetails.length > 0 ? (
                          <div className="space-y-3">
                            {matchedProductsWithDetails.map(({ product, matchScore, reason }) => (
                              <div
                                key={product.id}
                                className="p-4 bg-white rounded-xl border border-slate-200 hover:border-rose-300 hover:shadow-md transition-all flex items-center gap-4 group"
                              >
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-16 h-16 object-cover rounded-lg bg-slate-100 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      {matchScore}% Match
                                    </span>
                                    <span className="text-xs font-medium text-slate-500 uppercase">
                                      {product.brand}
                                    </span>
                                  </div>
                                  <h5 className="font-semibold text-slate-900 text-sm truncate group-hover:text-rose-600 transition-colors">
                                    {product.name}
                                  </h5>
                                  <p className="text-xs text-slate-500 truncate mt-0.5">{reason}</p>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-sm font-bold text-rose-600">
                                      ৳{product.price.toLocaleString()}
                                    </span>
                                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                                      product.stock > 0 ? 'bg-slate-100 text-slate-600' : 'bg-rose-50 text-rose-600'
                                    }`}>
                                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 shrink-0">
                                  {onAddToCart && (
                                    <button
                                      onClick={() => {
                                        onAddToCart(product);
                                        onClose();
                                      }}
                                      disabled={product.stock <= 0}
                                      className="p-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 text-white rounded-xl shadow-xs transition-colors"
                                      title="Add to Cart"
                                    >
                                      <ShoppingBag className="w-4 h-4" />
                                    </button>
                                  )}
                                  {onSelectProduct && (
                                    <button
                                      onClick={() => {
                                        onSelectProduct(product);
                                        onClose();
                                      }}
                                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                                      title="View Details"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 mx-auto flex items-center justify-center">
                              <ShoppingBag className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">
                                No exact match in current catalog
                              </p>
                              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                                We identified <strong className="text-slate-700">{searchResult.detectedItem?.name || 'this item'}</strong> in your photo.
                                {catalog.length === 0
                                  ? ' Your store catalog is currently empty. Add products from the Admin Panel to search them!'
                                  : ' It is not currently listed in stock. You can request this item via our WhatsApp support!'}
                              </p>
                            </div>
                            <button
                              onClick={resetSelection}
                              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                            >
                              Try Another Image
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Powered by Korean Skin Food BD AI Search Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-slate-600 hover:text-slate-800 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
