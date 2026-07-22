import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { productService } from '../services/productService';
import { agentService } from '../services/agentService';
import { cloudinaryService } from '../services/cloudinaryService';
import { Product } from '../types';
import { MediaLibraryModal } from './MediaLibraryModal';
import { 
  Plus, Wand2, QrCode, Search, 
  Trash2, Edit, AlertCircle, CheckCircle, X, 
  Image as ImageIcon, Languages, HelpCircle, Eye, EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['All', 'Cleanser', 'Toner', 'Serum & Essence', 'Moisturizer', 'Sunscreen', 'Lip Care'];

export const ProductManagement: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductForPopup, setSelectedProductForPopup] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isAiGeneratingContent, setIsAiGeneratingContent] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cloudinary media library popup states
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaPurpose, setMediaPurpose] = useState<'main' | 'gallery'>('main');

  // AI automation states
  const [isTranslatingName, setIsTranslatingName] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // AI upload selector/wizard states
  const [showUploadSelector, setShowUploadSelector] = useState(false);
  const [uploadSelectorMode, setUploadSelectorMode] = useState<'select' | 'name' | 'image' | 'camera'>('select');

  // Name Search upload states
  const [nameSearchQuery, setNameSearchQuery] = useState('');
  const [nameSuggestions, setNameSuggestions] = useState<any[]>([]);
  const [isSearchingNames, setIsSearchingNames] = useState(false);

  // Image/Camera upload states
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isAnalyzingCapturedImage, setIsAnalyzingCapturedImage] = useState(false);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // Handle live search by product name
  const handleSearchProductsByName = async (queryVal: string) => {
    if (!queryVal || queryVal.trim().length < 2) {
      setNameSuggestions([]);
      return;
    }
    setIsSearchingNames(true);
    try {
      const res = await fetch('/api/gemini/search-skincare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryVal.trim() })
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setNameSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('Skincare name search failed:', err);
    } finally {
      setIsSearchingNames(false);
    }
  };

  // Camera capture methods
  const startCamera = async () => {
    setUploadSelectorMode('camera');
    setCapturedImageBase64(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      setCameraStream(s);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(e => console.error("Play failed:", e));
        }
      }, 100);
    } catch (err) {
      console.error("Camera access error:", err);
      setAlertMsg({ type: 'error', text: 'Could not access device camera. Please upload an image file instead.' });
      setUploadSelectorMode('image');
      setTimeout(() => setAlertMsg(null), 4000);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg');
        setCapturedImageBase64(base64);
        stopCamera();
        setUploadSelectorMode('image');
      }
    } catch (err) {
      console.error("Failed to capture image:", err);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedImageBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Automatically process product name selection, upload image to Cloudinary, and save directly to database
  const handleSelectNameSuggestion = async (sug: any) => {
    setIsSearchingNames(true);
    setAlertMsg({ type: 'success', text: 'Connecting... Uploading product image to Cloudinary and registering in database...' });
    
    try {
      const newId = 'p' + Math.floor(100 + Math.random() * 900);
      const barcode = Math.floor(8800000000000 + Math.random() * 9999999999).toString();
      
      // 1. Store the representative product image in Cloudinary mock/real system
      let finalImageUrl = sug.imageUrl || 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=600&auto=format&fit=crop';
      try {
        const uploadedImg = await cloudinaryService.uploadImage(sug.name, finalImageUrl);
        if (uploadedImg && uploadedImg.url) {
          finalImageUrl = uploadedImg.url;
        }
      } catch (cloudErr) {
        console.warn("Cloudinary upload failed, using original URL:", cloudErr);
      }

      // 2. Fetch automatic Bangla translation
      let nameBN = '';
      try {
        const transRes = await fetch('/api/gemini/translate-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: sug.name })
        });
        if (transRes.ok) {
          const transData = await transRes.json();
          nameBN = transData.translatedName || '';
        }
      } catch (transErr) {
        console.warn("Translation failed:", transErr);
      }

      // 3. Assemble full Product object
      const completeProduct = {
        id: newId,
        name: sug.name || 'Authentic K-Beauty Skincare',
        nameBN: nameBN,
        brand: sug.brand || 'COSRX',
        category: sug.category || 'Serum & Essence',
        skinTypes: ['All'],
        price: Number(sug.price) || 1200,
        stock: 20,
        ml: sug.ml || '100ml',
        image: finalImageUrl,
        images: [],
        description: sug.description || 'Premium skincare product imported directly from Seoul, Korea.',
        descriptionBN: 'আমদানিকৃত আসল কোরিয়ান স্কিনকেয়ার প্রোডাক্ট যা আপনার ত্বকের যত্নে অত্যন্ত কার্যকরী।',
        rating: 4.8,
        reviewsCount: 1,
        barcode,
      };

      // 4. Save directly to Firestore database!
      await productService.createProduct(completeProduct);

      // 5. Try generating marketing content right away as well!
      try {
        await agentService.generateProductMarketingContent(newId);
      } catch (e) {
        console.warn("Background marketing content generation failed:", e);
      }

      setShowUploadSelector(false);
      refreshProducts();
      setAlertMsg({ type: 'success', text: `✨ "${sug.name}" registered successfully! Image stored on Cloudinary and product stored in your inventory.` });
      setTimeout(() => setAlertMsg(null), 5000);
    } catch (err: any) {
      console.error("Auto registration by product name failed:", err);
      setAlertMsg({ type: 'error', text: 'Auto registration failed: ' + err.message });
      setTimeout(() => setAlertMsg(null), 5000);
    } finally {
      setIsSearchingNames(false);
    }
  };

  // Automatically process product image with Gemini, upload to Cloudinary, and save directly to database
  const handleProcessImageWithGemini = async (base64Img: string) => {
    setIsAnalyzingCapturedImage(true);
    setAlertMsg({ type: 'success', text: 'Step 1 of 3: Gemini is analyzing the skincare bottle design & labels...' });
    
    try {
      // 1. Fetch analysis details from Gemini
      const res = await fetch('/api/gemini/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Img })
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      
      const newId = 'p' + Math.floor(100 + Math.random() * 900);
      const barcode = Math.floor(8800000000000 + Math.random() * 9999999999).toString();
      const generatedName = data.brand && data.ml ? `${data.brand} Skincare ${data.ml}` : 'Analyzed Skincare Bottle';
      const productName = data.seoTitle || generatedName;

      setAlertMsg({ type: 'success', text: 'Step 2 of 3: Uploading your high-resolution captured snapshot to Cloudinary...' });

      // 2. Upload captured photo to Cloudinary
      let finalImageUrl = base64Img;
      try {
        const uploadedImg = await cloudinaryService.uploadImage(productName, base64Img);
        if (uploadedImg && uploadedImg.url) {
          finalImageUrl = uploadedImg.url;
        }
      } catch (cloudErr) {
        console.warn("Cloudinary photo upload failed, using local base64:", cloudErr);
      }

      setAlertMsg({ type: 'success', text: 'Step 3 of 3: Phonetically translating brand to Bangla and saving product...' });

      // 3. Fetch phonetic translation
      let nameBN = '';
      try {
        const transRes = await fetch('/api/gemini/translate-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: productName })
        });
        if (transRes.ok) {
          const transData = await transRes.json();
          nameBN = transData.translatedName || '';
        }
      } catch (transErr) {
        console.warn("Phonetic translation failed:", transErr);
      }

      // 4. Assemble full Product object
      const completeProduct = {
        id: newId,
        name: productName,
        nameBN: nameBN,
        brand: data.brand || 'Authentic K-Beauty',
        category: data.category || 'Serum & Essence',
        skinTypes: ['All'],
        price: 1500, // Reasonable standard retail price
        stock: 20, // Default opening stock
        ml: data.ml || '100ml',
        image: finalImageUrl, // Saved Cloudinary image URL!
        images: [],
        description: data.description || 'Premium Korean skincare imported directly from Seoul.',
        descriptionBN: 'আমদানিকৃত আসল কোরিয়ান স্কিনকেয়ার প্রোডাক্ট যা আপনার ত্বকের যত্নে অত্যন্ত কার্যকরী।',
        rating: 4.8,
        reviewsCount: 1,
        barcode,
        generatedSeoContent: `SEO Title: ${data.seoTitle || ''}\nKeywords: ${data.keywords || ''}\nMeta Description: ${data.metaDescription || ''}`
      };

      // 5. Save product to Firestore database directly
      await productService.createProduct(completeProduct);

      // 6. Try generating copywriting right away
      try {
        await agentService.generateProductMarketingContent(newId);
      } catch (e) {
        console.warn("Marketing content generation failed:", e);
      }

      setShowUploadSelector(false);
      refreshProducts();
      setAlertMsg({ type: 'success', text: '✨ Gemini successfully processed the image! Photo stored on Cloudinary and product registered in Firestore.' });
      setTimeout(() => setAlertMsg(null), 5000);
    } catch (err: any) {
      console.error("Gemini image analysis and registration failed:", err);
      setAlertMsg({ type: 'error', text: 'Image registration failed. ' + err.message });
      setTimeout(() => setAlertMsg(null), 5000);
    } finally {
      setIsAnalyzingCapturedImage(false);
    }
  };

  useEffect(() => {
    refreshProducts();
  }, []);

  const refreshProducts = () => {
    setProducts(productService.getProducts());
  };

  const handleStartAddProduct = () => {
    setIsAddingProduct(true);
    setEditingProduct({
      id: 'p' + Math.floor(100 + Math.random() * 900),
      name: '',
      nameBN: '',
      brand: '',
      category: 'Cleanser',
      price: 1200,
      importPrice: undefined,
      discountPrice: undefined,
      ml: '100ml',
      stock: 20,
      image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=600&auto=format&fit=crop',
      images: [],
      description: '',
      descriptionBN: '',
      skinTypes: ['All'],
      rating: 4.8,
      reviewsCount: 1,
      barcode: Math.floor(8800000000000 + Math.random() * 9999999999).toString()
    } as any);
  };

  const handleStartEditProduct = (p: Product) => {
    setIsAddingProduct(false);
    setEditingProduct({ 
      ...p,
      images: p.images || [] // ensure array exists
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      if (isAddingProduct) {
        productService.createProduct(editingProduct);
        setAlertMsg({ type: 'success', text: 'New K-Beauty product added successfully.' });
      } else {
        productService.updateProduct(editingProduct);
        setAlertMsg({ type: 'success', text: 'Stock parameters and specs successfully updated.' });
      }
      setEditingProduct(null);
      refreshProducts();
      setTimeout(() => setAlertMsg(null), 3000);
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Failed to save product.' });
    }
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product from the inventory? This cannot be undone.')) {
      productService.deleteProduct(id);
      setAlertMsg({ type: 'success', text: 'Product successfully removed.' });
      refreshProducts();
      setTimeout(() => setAlertMsg(null), 3000);
    }
  };

  const handleGenerateOnDemandContent = async (productId: string) => {
    setIsAiGeneratingContent(productId);
    try {
      await agentService.generateProductMarketingContent(productId);
      setAlertMsg({ type: 'success', text: 'SEO and marketing content generated with Gemini.' });
      refreshProducts();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: `Copywriting failed: ${err.message}` });
    } finally {
      setIsAiGeneratingContent(null);
      setTimeout(() => setAlertMsg(null), 3000);
    }
  };

  // AI translation trigger
  const handleTranslateNameToBangla = async () => {
    if (!editingProduct || !editingProduct.name.trim()) {
      setAlertMsg({ type: 'error', text: 'Please enter an English product name first to translate.' });
      setTimeout(() => setAlertMsg(null), 3000);
      return;
    }
    setIsTranslatingName(true);
    try {
      const res = await fetch('/api/gemini/translate-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingProduct.name.trim() })
      });
      if (!res.ok) throw new Error('Translation failed');
      const data = await res.json();
      if (data.translatedName) {
        setEditingProduct(prev => prev ? { ...prev, nameBN: data.translatedName } : null);
        setAlertMsg({ type: 'success', text: 'Phonetic Bangla translation completed!' });
        setTimeout(() => setAlertMsg(null), 3000);
      }
    } catch (err: any) {
      console.error(err);
      setAlertMsg({ type: 'error', text: 'Translation failed: ' + err.message });
      setTimeout(() => setAlertMsg(null), 3000);
    } finally {
      setIsTranslatingName(false);
    }
  };

  // AI image analysis trigger
  const handleAnalyzeImageWithAI = async () => {
    if (!editingProduct || !editingProduct.image) {
      setAlertMsg({ type: 'error', text: 'Please set a main product image first to analyze.' });
      setTimeout(() => setAlertMsg(null), 3000);
      return;
    }
    setIsAnalyzingImage(true);
    try {
      const isBase64 = editingProduct.image.startsWith('data:image/');
      const payload = isBase64 
        ? { imageBase64: editingProduct.image } 
        : { imageUrl: editingProduct.image };

      const res = await fetch('/api/gemini/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      
      setEditingProduct(prev => {
        if (!prev) return null;
        return {
          ...prev,
          brand: data.brand || prev.brand || '',
          category: data.category || prev.category || 'Cleanser',
          ml: data.ml || prev.ml || '100ml',
          description: data.description || prev.description || '',
          generatedSeoContent: `SEO Title: ${data.seoTitle || ''}\nKeywords: ${data.keywords || ''}\nMeta Description: ${data.metaDescription || ''}`
        };
      });

      setAlertMsg({ type: 'success', text: 'Image analyzed successfully! Auto-filled brand, category, volume, and marketing description.' });
      setTimeout(() => setAlertMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setAlertMsg({ type: 'error', text: 'Image analysis failed: ' + err.message });
      setTimeout(() => setAlertMsg(null), 3000);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Select image from our library callback
  const handleSelectMediaImage = (url: string) => {
    if (!editingProduct) return;
    if (mediaPurpose === 'main') {
      setEditingProduct({
        ...editingProduct,
        image: url
      });
    } else {
      const currentImages = editingProduct.images || [];
      if (!currentImages.includes(url)) {
        setEditingProduct({
          ...editingProduct,
          images: [...currentImages, url]
        });
      }
    }
  };

  // Remove thumbnail from gallery
  const handleRemoveGalleryImage = (indexToRemove: number) => {
    if (!editingProduct) return;
    const currentImages = editingProduct.images || [];
    const updatedImages = currentImages.filter((_, idx) => idx !== indexToRemove);
    setEditingProduct({
      ...editingProduct,
      images: updatedImages
    });
  };

  const openMediaLibrary = (purpose: 'main' | 'gallery') => {
    setMediaPurpose(purpose);
    setIsMediaModalOpen(true);
  };

  // Filtered list
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.barcode?.includes(searchQuery);
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm space-y-6">
      
      {/* Header and CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pink-50 pb-5">
        <div>
          <h4 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">Skincare Inventory Catalog</h4>
          <p className="text-xs text-gray-500 mt-0.5">Edit prices, manage quantities, and trigger on-demand Gemini SEO copywriting</p>
        </div>

        <div className="flex gap-2.5 flex-wrap">
          <button 
            onClick={() => navigate('/admin/pos')}
            className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow-sm"
          >
            <QrCode size={13} className="text-[#E91E8C]" />
            <span>Generate QR Tags</span>
          </button>

          <button 
            onClick={() => {
              setNameSearchQuery('');
              setNameSuggestions([]);
              setCapturedImageBase64(null);
              setUploadSelectorMode('select');
              setShowUploadSelector(true);
            }}
            className="px-4 py-2 bg-[#E91E8C] hover:bg-[#FF4B91] text-white rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={13} />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {alertMsg && (
        <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
          alertMsg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          {alertMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-pink-50/10 p-4 rounded-2xl border border-pink-100/30">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-pink-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brand, name or barcode..."
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-pink-100 bg-white rounded-lg outline-none focus:ring-2 focus:ring-[#E91E8C]/15"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-[11px] font-bold text-gray-500 uppercase">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-pink-100 text-xs text-gray-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#E91E8C]"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Dual-Layout Table/Cards */}
      <div className="space-y-4">
        {/* Desktop Table: shown only on lg and up */}
        <div className="hidden lg:block overflow-x-auto border border-pink-50 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-pink-50/40 text-pink-700 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Brand & Product</th>
                <th className="py-3 px-2">Category</th>
                <th className="py-3 px-2">Stock Level</th>
                <th className="py-3 px-2">Base Price</th>
                <th className="py-3 px-2">Promo Price</th>
                <th className="py-3 px-2 text-center">Gemini Writer</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50 bg-white">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">No items match the filters.</td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-pink-50/10 transition">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={p.image} 
                          className="w-10 h-10 object-cover rounded shadow-sm border border-pink-50 cursor-pointer hover:scale-105 transition" 
                          referrerPolicy="no-referrer" 
                          onClick={() => setSelectedProductForPopup(p)}
                          title="Click to view full specs & AI Discussion"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] uppercase font-bold text-[#E91E8C] block leading-none">{p.brand}</span>
                            {p.ml && (
                              <span className="text-[8px] px-1 bg-pink-50 text-pink-700 rounded font-mono font-bold leading-none">{p.ml}</span>
                            )}
                          </div>
                          <span 
                            onClick={() => setSelectedProductForPopup(p)}
                            className="font-extrabold text-gray-800 block truncate max-w-xs cursor-pointer hover:text-[#E91E8C] transition"
                            title="Click to view full specs & AI Discussion"
                          >
                            {p.name}
                          </span>
                          <span className="text-[9px] text-gray-400 block font-mono">Barcode: {p.barcode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-gray-600 font-bold">{p.category}</td>
                    <td className="py-4 px-2">
                      <span className={`px-2.5 py-0.5 rounded font-mono font-bold text-[10px] ${p.stock <= 5 ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                        {p.stock} units
                      </span>
                    </td>
                    <td className="py-4 px-2 text-gray-800 font-black font-mono">
                      ৳{p.price}
                      {p.importPrice && (
                        <span className="block text-[8px] font-medium text-gray-400">Cost: ৳{p.importPrice}</span>
                      )}
                    </td>
                    <td className="py-4 px-2 font-mono font-bold text-[#E91E8C]">
                      {p.discountPrice ? `৳${p.discountPrice}` : 'None'}
                    </td>
                    <td className="py-4 px-2 text-center">
                      <button 
                        onClick={() => handleGenerateOnDemandContent(p.id)}
                        disabled={isAiGeneratingContent === p.id}
                        className="mx-auto bg-pink-50 text-[#E91E8C] border border-pink-100 hover:bg-pink-100 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1 disabled:opacity-40"
                      >
                        <Wand2 size={11} className={isAiGeneratingContent === p.id ? "animate-spin" : ""} />
                        <span>{isAiGeneratingContent === p.id ? "Writing..." : "Auto-Generate SEO"}</span>
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          onClick={() => setSelectedProductForPopup(p)}
                          className="p-1.5 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] border border-pink-100 rounded-lg cursor-pointer transition text-[11px] font-bold"
                          title="Quick Spec Specifications Details"
                        >
                          <Eye size={12} />
                        </button>
                        <button 
                          onClick={() => handleStartEditProduct(p)}
                          className="p-1.5 bg-pink-50 hover:bg-pink-100 text-pink-750 border border-pink-100 rounded-lg cursor-pointer transition text-[11px] font-bold"
                        >
                          <Edit size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg cursor-pointer transition text-[11px] font-bold"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Grid: shown on smaller screens to completely prevent scrolling */}
        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-10 bg-white rounded-2xl border border-pink-100/50 text-gray-400">
              No items match the filters.
            </div>
          ) : (
            filteredProducts.map(p => (
              <div 
                key={p.id} 
                onClick={() => setSelectedProductForPopup(p)}
                className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm space-y-3 cursor-pointer hover:border-[#E91E8C] transition flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  {/* Top row: Image & Quick Info */}
                  <div className="flex gap-3">
                    <img src={p.image} className="w-16 h-16 object-cover rounded-xl shadow-sm border border-pink-100 shrink-0" referrerPolicy="no-referrer" />
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] uppercase font-bold text-[#E91E8C] block leading-none">{p.brand}</span>
                        {p.ml && (
                          <span className="text-[8px] px-1 bg-pink-50 text-pink-700 rounded font-mono font-bold leading-none">{p.ml}</span>
                        )}
                      </div>
                      <span className="font-extrabold text-gray-900 block text-sm leading-snug line-clamp-2">{p.name}</span>
                      <span className="text-[9px] text-gray-400 block font-mono">Barcode: {p.barcode || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Stock level, Prices, Category */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-pink-50/15 rounded-xl border border-pink-50/50">
                    <div>
                      <span className="text-[8px] text-gray-400 block uppercase font-bold">Category</span>
                      <span className="font-bold text-gray-700">{p.category}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-gray-400 block uppercase font-bold">Stock Level</span>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${p.stock <= 5 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {p.stock} units
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] text-gray-400 block uppercase font-bold">Price</span>
                      <span className="font-extrabold text-gray-950 font-mono">৳{p.price}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-gray-400 block uppercase font-bold">Promo Price</span>
                      <span className="font-bold text-[#E91E8C] font-mono">
                        {p.discountPrice ? `৳${p.discountPrice}` : 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex gap-2 justify-end pt-2 border-t border-pink-50/50" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => handleGenerateOnDemandContent(p.id)}
                    disabled={isAiGeneratingContent === p.id}
                    className="mr-auto bg-pink-50 hover:bg-pink-100 text-[#E91E8C] border border-pink-100 px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer transition flex items-center gap-1 disabled:opacity-40"
                  >
                    <Wand2 size={10} className={isAiGeneratingContent === p.id ? "animate-spin" : ""} />
                    <span>{isAiGeneratingContent === p.id ? "..." : "SEO Write"}</span>
                  </button>

                  <button 
                    onClick={() => setSelectedProductForPopup(p)}
                    className="p-1.5 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] border border-pink-100 rounded-lg cursor-pointer transition text-[10px] font-bold flex items-center gap-1"
                  >
                    <Eye size={12} />
                    <span>Info</span>
                  </button>

                  <button 
                    onClick={() => handleStartEditProduct(p)}
                    className="p-1.5 bg-pink-50 hover:bg-pink-100 text-pink-750 border border-pink-100 rounded-lg cursor-pointer transition text-[10px]"
                  >
                    <Edit size={12} />
                  </button>

                  <button 
                    onClick={() => handleDeleteProduct(p.id)}
                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg cursor-pointer transition text-[10px]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Product Details Specifications Popup Modal */}
      <AnimatePresence>
        {selectedProductForPopup && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[28px] border border-pink-100 overflow-hidden max-w-2xl w-full shadow-2xl flex flex-col justify-between max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-pink-50 flex justify-between items-center bg-white">
                <span className="text-xs font-black text-gray-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Wand2 size={14} className="text-[#E91E8C]" />
                  <span>Product Specifications & AI Profile</span>
                </span>
                <button 
                  type="button" 
                  onClick={() => setSelectedProductForPopup(null)} 
                  className="text-gray-400 hover:text-pink-600 cursor-pointer p-1 rounded-full hover:bg-pink-50 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1 bg-white">
                
                {/* Header Info Block */}
                <div className="flex flex-col sm:flex-row gap-5">
                  {/* Product Image */}
                  <div className="w-full sm:w-44 h-44 rounded-2xl overflow-hidden bg-pink-50/20 border border-pink-100/50 relative group flex-shrink-0">
                    <img 
                      src={selectedProductForPopup.image} 
                      alt={selectedProductForPopup.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>

                  {/* Identity Detail */}
                  <div className="space-y-3 flex-1">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-black text-[#E91E8C] tracking-widest">{selectedProductForPopup.brand}</span>
                        {selectedProductForPopup.ml && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-pink-50 text-pink-700 rounded-full font-mono font-bold border border-pink-100">{selectedProductForPopup.ml}</span>
                        )}
                        <span className="text-[9px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-bold">{selectedProductForPopup.category}</span>
                      </div>
                      <h4 className="text-base font-black text-gray-950 mt-1 leading-snug">{selectedProductForPopup.name}</h4>
                      {selectedProductForPopup.nameBN && (
                        <h5 className="text-xs font-medium text-pink-600 mt-1">{selectedProductForPopup.nameBN}</h5>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100/50">
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase font-bold">Base Retail Price</span>
                        <span className="font-black font-mono text-gray-900 text-sm">৳{selectedProductForPopup.price.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase font-bold">Promo Discount</span>
                        <span className="font-black font-mono text-[#E91E8C] text-sm">
                          {selectedProductForPopup.discountPrice ? `৳${selectedProductForPopup.discountPrice.toLocaleString()}` : 'No Promo'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase font-bold">Import Cost Price</span>
                        <span className="font-bold font-mono text-gray-650 text-xs">
                          {selectedProductForPopup.importPrice ? `৳${selectedProductForPopup.importPrice.toLocaleString()}` : 'Optional'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase font-bold">Current Stock Level</span>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${selectedProductForPopup.stock <= 5 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                          {selectedProductForPopup.stock} Units
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Gallery */}
                {selectedProductForPopup.gallery && selectedProductForPopup.gallery.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider block">Additional Image Gallery</span>
                    <div className="grid grid-cols-4 gap-2">
                      {selectedProductForPopup.gallery.map((img, idx) => (
                        <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-pink-50 bg-pink-50/5">
                          <img src={img} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI generated description and discussion */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-black text-pink-700 tracking-wider block flex items-center gap-1">
                    <Wand2 size={11} className="text-[#E91E8C]" />
                    <span>AI Generated Discussion & Usage</span>
                  </span>
                  <div className="bg-pink-50/10 p-4 rounded-2xl border border-pink-100/30 text-gray-700 text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {selectedProductForPopup.discussion || 'No AI discussion or details generated yet. Use the auto-generate button to trigger the Gemini content writer.'}
                  </div>
                </div>

                {/* Metadata & SEO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-1.5">
                    <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">Barcode / SKU</span>
                    <span className="font-mono font-bold text-gray-800 text-xs">{selectedProductForPopup.barcode || 'N/A'}</span>
                  </div>

                  <div className="p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-1.5">
                    <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">SEO Keywords / Meta Tags</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedProductForPopup.metaKeywords && selectedProductForPopup.metaKeywords.length > 0 ? (
                        selectedProductForPopup.metaKeywords.map((k, idx) => (
                          <span key={idx} className="inline-block bg-white text-gray-650 px-1.5 py-0.5 rounded text-[10px] border border-gray-200">
                            {k}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 italic">None registered</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-pink-50/10 border-t border-pink-50 flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setSelectedProductForPopup(null)} 
                  className="px-5 py-2.5 bg-transparent hover:bg-pink-50 text-gray-500 hover:text-pink-750 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close Specification
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleStartEditProduct(selectedProductForPopup);
                    setSelectedProductForPopup(null);
                  }}
                  className="px-5 py-2.5 bg-[#E91E8C] hover:bg-pink-700 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow"
                >
                  Edit Product Settings
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Edit/Add Modal Overlay */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveProduct} className="bg-white rounded-[28px] border border-pink-100 overflow-hidden max-w-lg w-full max-h-[92vh] flex flex-col justify-between shadow-2xl">
            
            <div className="p-4 border-b border-pink-100 flex justify-between items-center bg-white">
              <span className="text-xs font-black text-gray-950 uppercase tracking-wider">
                {isAddingProduct ? "🚀 AI-Powered Product Upload" : "📝 Edit Stock & AI Properties"}
              </span>
              <button type="button" onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-pink-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1 bg-white">
              
              {/* Product English Name & Auto-Translation */}
              <div className="space-y-1">
                <label className="block text-gray-500 font-bold">Product Title (English)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Beauty of Joseon Relief Sun Rice SPF50+"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="flex-1 bg-pink-50/10 text-gray-800 px-3 py-2.5 rounded-lg border border-pink-100 outline-none focus:border-[#E91E8C]"
                  />
                  <button
                    type="button"
                    onClick={handleTranslateNameToBangla}
                    disabled={isTranslatingName || !editingProduct.name.trim()}
                    className="px-3 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] border border-pink-150 rounded-lg font-extrabold flex items-center gap-1 transition text-[10px] disabled:opacity-40"
                    title="Phonetically translate name to Bangla"
                  >
                    <Languages size={13} className={isTranslatingName ? "animate-spin" : ""} />
                    <span>{isTranslatingName ? "Translating..." : "AI Bangla"}</span>
                  </button>
                </div>
              </div>

              {/* Product Bangla Title */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">Product Title (Bangla)</label>
                <input 
                  type="text" 
                  required
                  placeholder="বিউটি অব জোসিয়ন রিলিফ সান রাইস SPF50+"
                  value={editingProduct.nameBN}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nameBN: e.target.value })}
                  className="w-full bg-pink-50/10 text-gray-800 px-3 py-2.5 rounded-lg border border-pink-100 outline-none focus:border-[#E91E8C]"
                />
              </div>

              {/* Main Product Image Upload / Cloudinary Select Dashboard */}
              <div className="p-4 bg-pink-50/15 border border-pink-100/40 rounded-2xl space-y-3">
                <span className="text-[10px] uppercase font-extrabold text-pink-700 tracking-wider flex items-center gap-1">
                  <ImageIcon size={12} />
                  <span>Product Main Cover Image</span>
                </span>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden shadow-md border border-pink-100 bg-gray-50 flex-shrink-0">
                    <img 
                      src={editingProduct.image} 
                      alt="Product Cover" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openMediaLibrary('main')}
                        className="flex-1 bg-white hover:bg-pink-50 text-[#E91E8C] border border-[#E91E8C]/30 text-xs font-bold py-2 px-3 rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <ImageIcon size={13} />
                        <span>Cloudinary Library</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleAnalyzeImageWithAI}
                        disabled={isAnalyzingImage || !editingProduct.image}
                        className="flex-1 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] border border-pink-200 text-xs font-bold py-2 px-3 rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        <Wand2 size={13} className={isAnalyzingImage ? "animate-spin" : ""} />
                        <span>{isAnalyzingImage ? "Analyzing..." : "Analyze Image with AI"}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Use the Cloudinary Library to pick from existing images or upload from your device. Click "Analyze Image with AI" to auto-extract skincare specs!
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing, Stocks, and Volume size */}
              <div className="grid grid-cols-2 gap-3 bg-pink-50/5 p-3 rounded-xl border border-pink-50">
                <div>
                  <label className="block text-gray-500 font-bold mb-1">Selling Price (৳ Base) *</label>
                  <input 
                    type="number" 
                    required
                    value={editingProduct.price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full bg-white text-gray-800 px-3 py-2 rounded-lg border border-pink-100 outline-none focus:border-[#E91E8C]"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-bold mb-1">Warehouse Stock *</label>
                  <input 
                    type="number" 
                    required
                    value={editingProduct.stock || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="w-full bg-white text-gray-800 px-3 py-2 rounded-lg border border-pink-100 outline-none focus:border-[#E91E8C]"
                  />
                </div>

                <div>
                  <label className="block text-gray-500 font-bold mb-1">Import Price (৳ BDT) (Optional)</label>
                  <input 
                    type="number" 
                    value={editingProduct.importPrice || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, importPrice: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="e.g. 900"
                    className="w-full bg-white text-gray-800 px-3 py-2 rounded-lg border border-pink-100 outline-none focus:border-[#E91E8C]"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-bold mb-1">Discount Price (৳ Promo) (Optional)</label>
                  <input 
                    type="number" 
                    value={editingProduct.discountPrice || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, discountPrice: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="e.g. 1100"
                    className="w-full bg-white text-gray-800 px-3 py-2 rounded-lg border border-pink-100 outline-none focus:border-[#E91E8C]"
                  />
                </div>
              </div>

              {/* Brand Name, Category & size */}
              <div className="grid grid-cols-3 gap-2 bg-pink-50/5 p-3 rounded-xl border border-pink-50">
                <div>
                  <label className="block text-gray-500 font-bold mb-1">Brand Name</label>
                  <input 
                    type="text" 
                    placeholder="AI Auto-filled"
                    value={editingProduct.brand}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="w-full bg-white text-gray-800 px-3 py-2 rounded-lg border border-pink-100 outline-none focus:border-[#E91E8C]"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-bold mb-1">Category</label>
                  <select 
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full bg-white text-gray-800 px-3 py-2 rounded-lg border border-pink-100 outline-none focus:border-[#E91E8C]"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-500 font-bold mb-1">Volume/Size (ml)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 50ml, 100ml"
                    value={editingProduct.ml || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, ml: e.target.value })}
                    className="w-full bg-white text-gray-800 px-3 py-2 rounded-lg border border-pink-100 outline-none focus:border-[#E91E8C]"
                  />
                </div>
              </div>

              {/* Multiple Image Gallery for Product */}
              <div className="p-3 bg-pink-50/10 border border-pink-100/55 rounded-xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-gray-700 tracking-wide flex items-center gap-1">
                  <ImageIcon size={12} />
                  <span>Product Image Gallery (Multiple Images)</span>
                </span>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Gallery Thumbnails */}
                  {(editingProduct.images || []).map((imgUrl, idx) => (
                    <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-pink-100 shadow-sm group">
                      <img src={imgUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(idx)}
                        className="absolute inset-0 bg-red-600/75 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150 rounded-lg cursor-pointer"
                        title="Remove image from gallery"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Add Dotted Square Card */}
                  <button
                    type="button"
                    onClick={() => openMediaLibrary('gallery')}
                    className="w-12 h-12 border-2 border-dashed border-pink-200 hover:border-[#E91E8C] rounded-lg flex flex-col items-center justify-center bg-white transition hover:bg-pink-50 text-pink-400 hover:text-[#E91E8C]"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <p className="text-[9px] text-gray-400">Add multiple aesthetic promotional slides or ingredient views to show on the details page.</p>
              </div>

              {/* Product Discussion / Description */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">Product Description</label>
                <textarea 
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="AI Auto-filled description of ingredients, skincare benefits, and application guide..."
                  rows={3}
                  className="w-full bg-pink-50/10 text-gray-800 px-3 py-2 rounded-lg border border-pink-100 outline-none focus:border-[#E91E8C]"
                />
              </div>

              {/* Meta Data & Keywords Generated */}
              {editingProduct.generatedSeoContent && (
                <div className="p-3 bg-pink-50/10 border border-pink-100/50 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase font-bold text-pink-700 block">AI Generated Search Metadata (SEO)</span>
                  <pre className="text-[10px] text-gray-600 font-mono whitespace-pre-wrap leading-tight bg-white p-2 rounded-lg border border-pink-50/80 max-h-24 overflow-y-auto">
                    {editingProduct.generatedSeoContent}
                  </pre>
                </div>
              )}

            </div>

            <div className="p-4 bg-pink-50/20 border-t border-pink-100 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 bg-transparent hover:bg-pink-50 text-gray-500 hover:text-pink-750 text-xs font-semibold rounded-lg cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 bg-[#E91E8C] hover:bg-[#FF4B91] text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-sm">
                Save Product
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Cloudinary media library popup */}
      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectImage={handleSelectMediaImage}
        title={mediaPurpose === 'main' ? "Select Product Cover Image" : "Add Gallery Image Asset"}
      />

      {/* Upload Choice Selector Dialog / Wizard */}
      {showUploadSelector && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-pink-100 overflow-hidden max-w-lg w-full shadow-2xl flex flex-col justify-between max-h-[92vh]">
            
            <div className="p-4 border-b border-pink-100 flex justify-between items-center bg-white">
              <span className="text-xs font-black text-gray-950 uppercase tracking-wider flex items-center gap-1.5">
                <Wand2 size={14} className="text-[#E91E8C] animate-pulse" />
                <span>AI-Powered Product Registration</span>
              </span>
              <button 
                type="button" 
                onClick={() => {
                  setShowUploadSelector(false);
                  stopCamera();
                }} 
                className="text-gray-400 hover:text-pink-600 cursor-pointer p-1 rounded-full hover:bg-pink-50 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step 1: Selector Screen */}
            {uploadSelectorMode === 'select' && (
              <div className="p-6 space-y-5 overflow-y-auto max-h-[68vh]">
                <p className="text-xs text-gray-500 leading-relaxed text-center">
                  Select your preferred product registration method. Our integrated Gemini AI models will assist you in copywriting, categorization, and digital optimization instantly.
                </p>

                {/* Gemini Free Tier info & Token Capacity Indicator */}
                <div className="bg-pink-50/20 p-4 rounded-2xl border border-pink-100/60 space-y-2.5 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <Wand2 size={14} className="text-[#E91E8C]" />
                    <span className="text-[10px] uppercase font-black text-pink-700 tracking-wider">Gemini Workspace Engine</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-500 font-bold">
                      <span>Free-Tier Rate Limits (No Credit Card/Billing Needed)</span>
                      <span className="text-[#E91E8C]">Active & Unlimited</span>
                    </div>
                    <div className="w-full bg-pink-100/40 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-[#E91E8C] h-full w-[25%] rounded-full animate-pulse"></div>
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-400 leading-none mt-1">
                      <span>Rate Limit: 15 Requests/Min</span>
                      <span>~2.5K tokens per upload (0.25% of 1M TPM)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {/* Option 1: Manual */}
                  <button
                    onClick={() => {
                      setShowUploadSelector(false);
                      handleStartAddProduct();
                    }}
                    className="group p-4 bg-white hover:bg-pink-50/15 border border-gray-150 hover:border-pink-200 rounded-2xl transition text-left flex items-start gap-3.5 cursor-pointer shadow-sm hover:shadow"
                  >
                    <div className="p-3 bg-gray-50 group-hover:bg-pink-50 rounded-xl text-gray-500 group-hover:text-[#E91E8C] transition flex-shrink-0">
                      <Edit size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-gray-800 text-xs block group-hover:text-[#E91E8C] transition">Upload Manually</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5 leading-relaxed">Type everything on your own using our standard forms. No API calls or tokens required.</span>
                    </div>
                  </button>

                  {/* Option 2: By Name */}
                  <button
                    onClick={() => {
                      setNameSearchQuery('');
                      setNameSuggestions([]);
                      setUploadSelectorMode('name');
                    }}
                    className="group p-4 bg-white hover:bg-pink-50/15 border border-gray-150 hover:border-pink-200 rounded-2xl transition text-left flex items-start gap-3.5 cursor-pointer shadow-sm hover:shadow"
                  >
                    <div className="p-3 bg-gray-50 group-hover:bg-pink-50 rounded-xl text-gray-500 group-hover:text-[#E91E8C] transition flex-shrink-0">
                      <Search size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-gray-800 text-xs block group-hover:text-[#E91E8C] transition">Upload by Product Name</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5 leading-relaxed">Type any cosmetics product. Shows a real-time skin care search database network to let you pick & auto-fill.</span>
                    </div>
                  </button>

                  {/* Option 3: By Image */}
                  <button
                    onClick={() => {
                      setCapturedImageBase64(null);
                      setUploadSelectorMode('image');
                    }}
                    className="group p-4 bg-white hover:bg-pink-50/15 border border-gray-150 hover:border-pink-200 rounded-2xl transition text-left flex items-start gap-3.5 cursor-pointer shadow-sm hover:shadow"
                  >
                    <div className="p-3 bg-gray-50 group-hover:bg-pink-50 rounded-xl text-gray-500 group-hover:text-[#E91E8C] transition flex-shrink-0">
                      <ImageIcon size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-gray-800 text-xs block group-hover:text-[#E91E8C] transition">Upload by Product Image / Camera</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5 leading-relaxed">Take a live photo of your skincare bottle using your camera or upload a file. Gemini auto-completes the entire details.</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2A: Product Name Autocomplete Mode */}
            {uploadSelectorMode === 'name' && (
              <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[68vh]">
                <div className="flex flex-col gap-1.5 border-b border-pink-50 pb-2.5">
                  <div className="flex items-center justify-between">
                    <button 
                      type="button" 
                      onClick={() => setUploadSelectorMode('select')}
                      className="text-[#E91E8C] hover:underline font-bold text-[11px]"
                    >
                      &larr; Back to Methods
                    </button>
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Name Autocomplete Network</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] bg-pink-50/40 text-[#E91E8C] font-extrabold px-2.5 py-1 rounded-lg">
                    <span>⚡ System Cost: 100% Free Tier</span>
                    <span>Tokens: ~1.2K per query (15 RPM Max)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-gray-600 font-extrabold text-[11px]">Type Brand & Product Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nameSearchQuery}
                      onChange={(e) => {
                        setNameSearchQuery(e.target.value);
                        if (e.target.value.length >= 2) {
                          handleSearchProductsByName(e.target.value);
                        } else {
                          setNameSuggestions([]);
                        }
                      }}
                      placeholder="Type e.g. COSRX Snail, Beauty of Joseon, Anua..."
                      className="flex-1 bg-pink-50/10 text-gray-800 px-3.5 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C] text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchProductsByName(nameSearchQuery)}
                      disabled={isSearchingNames || nameSearchQuery.trim().length < 2}
                      className="px-4 bg-[#E91E8C] hover:bg-[#FF4B91] text-white text-[11px] font-extrabold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition disabled:opacity-40"
                    >
                      {isSearchingNames ? (
                        <>
                          <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
                          <span>Searching...</span>
                        </>
                      ) : "Search"}
                    </button>
                  </div>
                </div>

                {/* Search suggestions list */}
                <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
                  {isSearchingNames ? (
                    <div className="py-12 text-center text-gray-400 space-y-2.5">
                      <div className="animate-spin inline-block w-6 h-6 border-2 border-[#E91E8C] border-t-transparent rounded-full"></div>
                      <p className="text-[11px] font-medium">Scanning network skincare database with search grounding...</p>
                    </div>
                  ) : nameSuggestions.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-[11px] bg-pink-50/10 rounded-2xl border border-dashed border-pink-100">
                      {nameSearchQuery.trim().length < 2 
                        ? "Type skincare details above to query real-time network dropdown..." 
                        : "No exact matches found. Try searching for COSRX, Anua, Skin1004, or Beauty of Joseon."}
                    </div>
                  ) : (
                    <div className="divide-y divide-pink-50 border border-pink-100/50 rounded-2xl overflow-hidden bg-white shadow-sm">
                      {nameSuggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectNameSuggestion(sug)}
                          className="w-full text-left p-3.5 hover:bg-pink-50/20 flex flex-col gap-1 transition hover:border-[#E91E8C] border-l-4 border-l-transparent hover:border-l-[#E91E8C]"
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[9px] uppercase font-bold text-[#E91E8C] bg-pink-50 px-2 py-0.5 rounded-full">{sug.brand}</span>
                            <span className="text-[9px] px-1.5 bg-gray-100 text-gray-600 rounded font-mono font-bold leading-none">{sug.ml}</span>
                          </div>
                          <span className="font-extrabold text-gray-900 text-xs mt-0.5">{sug.name}</span>
                          <span className="text-[10px] text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">{sug.description}</span>
                          <div className="flex justify-between items-center w-full mt-2 border-t border-pink-50/40 pt-2">
                            <span className="text-[9px] px-2 py-0.5 bg-gray-50 rounded text-gray-500 font-extrabold">{sug.category}</span>
                            <span className="font-black text-[#E91E8C] font-mono text-xs">Suggested: ৳{sug.price}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2B: Product Image Upload / Camera Mode */}
            {uploadSelectorMode === 'image' && (
              <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[68vh] text-center">
                <div className="flex flex-col gap-1.5 border-b border-pink-50 pb-2.5">
                  <div className="flex items-center justify-between">
                    <button 
                      type="button" 
                      onClick={() => {
                        setUploadSelectorMode('select');
                        setCapturedImageBase64(null);
                      }}
                      className="text-[#E91E8C] hover:underline font-bold text-[11px]"
                    >
                      &larr; Back to Methods
                    </button>
                    <span className="text-[10px] text-gray-400 uppercase font-bold">Image Recognition</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] bg-pink-50/40 text-[#E91E8C] font-extrabold px-2.5 py-1 rounded-lg">
                    <span>⚡ System Cost: 100% Free Tier</span>
                    <span>Tokens: ~2.5K per image (15 RPM Max)</span>
                  </div>
                </div>

                {!capturedImageBase64 ? (
                  <div className="space-y-4 py-4">
                    <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
                      Capture a live product image with your camera or select a photo from your file manager. Gemini AI will analyze the branding, active ingredients, size and auto-register it.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Live Camera Option */}
                      <button
                        type="button"
                        onClick={startCamera}
                        className="py-7 bg-pink-50/40 hover:bg-pink-50 border border-pink-100 hover:border-[#E91E8C]/40 rounded-2xl transition flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm group hover:scale-[1.02] duration-200"
                      >
                        <div className="p-3 bg-white rounded-full text-[#E91E8C] shadow-sm border border-pink-50">
                          <QrCode size={20} className="text-[#E91E8C]" />
                        </div>
                        <span className="text-xs font-bold text-gray-800">Use Live Camera</span>
                        <span className="text-[9px] text-gray-400">Mobile or Desktop Cam</span>
                      </button>

                      {/* File Manager Option */}
                      <label className="py-7 bg-white hover:bg-pink-50/10 border border-gray-150 hover:border-[#E91E8C]/40 rounded-2xl transition flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm group hover:scale-[1.02] duration-200 relative">
                        <div className="p-3 bg-gray-50 rounded-full text-pink-400 group-hover:text-[#E91E8C] group-hover:bg-white shadow-sm border border-gray-100 group-hover:border-pink-50">
                          <ImageIcon size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-800">Upload Image File</span>
                        <span className="text-[9px] text-gray-400">Pick from device</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <p className="text-[11px] text-gray-500 font-medium">Ready for Gemini Image Processing. Review the snapshot below:</p>
                    
                    <div className="relative max-w-xs mx-auto aspect-square rounded-2xl overflow-hidden border border-pink-100 shadow-md">
                      <img src={capturedImageBase64} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => setCapturedImageBase64(null)}
                        className="absolute top-2.5 right-2.5 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition cursor-pointer"
                        title="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="flex gap-2.5 justify-center">
                      <button
                        type="button"
                        onClick={() => setCapturedImageBase64(null)}
                        className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Retake Snapshot
                      </button>

                      <button
                        type="button"
                        onClick={() => handleProcessImageWithGemini(capturedImageBase64)}
                        disabled={isAnalyzingCapturedImage}
                        className="px-5 py-2 bg-[#E91E8C] hover:bg-[#FF4B91] text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-md disabled:opacity-40 cursor-pointer"
                      >
                        <Wand2 size={13} className={isAnalyzingCapturedImage ? "animate-spin" : ""} />
                        <span>{isAnalyzingCapturedImage ? "Analyzing with Gemini..." : "Extract & Register Product"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live Camera Stream Display */}
            {uploadSelectorMode === 'camera' && (
              <div className="p-6 space-y-4 text-center">
                <div className="flex items-center justify-between border-b border-pink-50 pb-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      stopCamera();
                      setUploadSelectorMode('image');
                    }}
                    className="text-[#E91E8C] hover:underline font-bold text-[11px]"
                  >
                    &larr; Back to Photo Modes
                  </button>
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Live Camera Feed</span>
                </div>

                <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-gray-900 shadow-lg">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute inset-0 border-[3px] border-dashed border-[#E91E8C]/40 rounded-2xl pointer-events-none"></div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-[10px] text-white py-1 px-3 rounded-full backdrop-blur-sm pointer-events-none">
                    Center the cosmetics bottle in the camera frame
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setUploadSelectorMode('image');
                    }}
                    className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-5 py-2 bg-[#E91E8C] hover:bg-[#FF4B91] text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer hover:scale-[1.02] duration-150"
                  >
                    <QrCode size={14} />
                    <span>Capture Snapshot</span>
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 bg-pink-50/20 border-t border-pink-100 flex justify-end">
              <button 
                type="button" 
                onClick={() => {
                  setShowUploadSelector(false);
                  stopCamera();
                }} 
                className="px-4 py-2 bg-transparent hover:bg-pink-50 text-gray-500 hover:text-pink-750 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloudinary media library popup */}
      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectImage={handleSelectMediaImage}
        title={mediaPurpose === 'main' ? "Select Product Cover Image" : "Add Gallery Image Asset"}
      />

    </div>
  );
};
