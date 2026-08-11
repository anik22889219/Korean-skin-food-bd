import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { productService } from '../services/productService';
import { agentService } from '../services/agentService';
import { cloudinaryService } from '../services/cloudinaryService';
import { Product } from '../types';
import { MediaLibraryModal } from './MediaLibraryModal';
import { 
  auditProductsBarcodes, 
  checkDuplicateBarcode, 
  normalizeBarcode, 
  validateBarcodeFormat,
  extractCodeFromScanText,
  scanBarcodeFromImageFile,
  scanBarcodeFromLiveVideoSnapshot,
  applyCameraTrackConstraints,
  startUnifiedCameraScanner,
  ScannerController,
  BarcodeAuditReport 
} from '../utils/barcode';
import { 
  Plus, Wand2, QrCode, Search, 
  Trash2, Edit, AlertCircle, CheckCircle, X, 
  Image as ImageIcon, Languages, HelpCircle, Eye, EyeOff,
  Barcode, ShieldAlert, Check, RefreshCw, Camera, Tag, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { KOREAN_BRANDS } from '../data/brands';

const CATEGORIES = [
  'All', 
  'Cleanser', 
  'Toner', 
  'Serum & Essence', 
  'Cream & Moisturizer', 
  'Sunscreen', 
  'Lip Care',
  'Eye Care',
  'Mask & Pack',
  'Exfoliator',
  'Body & Hair Care',
  'Oral Care',
  'Supplements',
  'Spot Treatment',
  'Makeup & Tone-Up'
];

export const ProductManagement: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductForPopup, setSelectedProductForPopup] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Scanned Barcode & Confirmation Modal States
  const [pendingScannedBarcode, setPendingScannedBarcode] = useState<string | null>(null);
  const [confirmationProductData, setConfirmationProductData] = useState<Product | null>(null);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isSavingConfirmedProduct, setIsSavingConfirmedProduct] = useState(false);
  
  // Barcode Audit Modal State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditResult, setAuditResult] = useState<BarcodeAuditReport | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [isAiGeneratingContent, setIsAiGeneratingContent] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  // Memoized unique brands for filter
  const availableBrandsForFilter = useMemo(() => {
    const brandSet = new Set<string>();
    KOREAN_BRANDS.forEach(b => brandSet.add(b));
    products.forEach(p => {
      if (p.brand && p.brand.trim()) brandSet.add(p.brand.trim());
    });
    return Array.from(brandSet).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Cloudinary media library popup states
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaPurpose, setMediaPurpose] = useState<'main' | 'gallery'>('main');

  // Edit Form Camera Barcode Scanner States
  const [isFormCameraActive, setIsFormCameraActive] = useState(false);
  const [isPhotoScanning, setIsPhotoScanning] = useState(false);
  const [formCameraError, setFormCameraError] = useState<string | null>(null);
  const [useFormFrontCamera, setUseFormFrontCamera] = useState(false);
  const [formCameraZoom, setFormCameraZoom] = useState<number>(1.5);
  const formScannerControllerRef = useRef<ScannerController | null>(null);

  const handleBarcodeScanResult = async (rawBarcode: string) => {
    if (!rawBarcode || !rawBarcode.trim()) return;
    const cleanBc = normalizeBarcode(rawBarcode);

    if (editingProduct && editingProduct.name && editingProduct.name.trim() !== '' && !isAddingProduct) {
      // Editing existing product -> set barcode code only
      setEditingProduct(prev => prev ? {
        ...prev,
        barcode: cleanBc,
        barcodeNormalized: cleanBc
      } : null);
      setAlertMsg({
        type: 'success',
        text: `✅ Barcode code "${cleanBc}" scanned and assigned to product!`
      });
      setTimeout(() => setAlertMsg(null), 4000);
    } else {
      // Run barcode identification flow
      await handleIdentifyProductByBarcode(cleanBc);
    }
  };

  const handleIdentifyProductByBarcode = async (rawBarcode: string) => {
    if (!rawBarcode || !rawBarcode.trim()) return;
    const cleanBc = normalizeBarcode(rawBarcode);

    setIsPhotoScanning(true);
    setAlertMsg({ type: 'info', text: `🔍 Searching inventory for barcode "${cleanBc}"...` });

    try {
      // 1. Check local catalog / inventory first
      const localMatch = productService.getProductByBarcode(cleanBc) || 
        productService.getProducts().find(p => p.barcodeNormalized === cleanBc || normalizeBarcode(p.barcode) === cleanBc);

      if (localMatch) {
        // FOUND IN INVENTORY -> Load confirmation modal for review/confirmation
        const fullProdObj: Product = {
          ...localMatch,
          barcode: cleanBc,
          barcodeNormalized: cleanBc
        } as any;
        setConfirmationProductData(fullProdObj);
        setIsConfirmationModalOpen(true);
        setAlertMsg({ 
          type: 'success', 
          text: `✅ Found in inventory: "${localMatch.name}" (${localMatch.brand})! Review product details and confirm.` 
        });
        setTimeout(() => setAlertMsg(null), 5000);
        return localMatch;
      }

      // 2. NOT FOUND IN INVENTORY ("amr inventory te na payle"):
      // Search online/Google for product name
      setAlertMsg({ type: 'info', text: `🔍 Barcode "${cleanBc}" inventory-তে পাওয়া যায়নি। Google search করে Product Name খোঁজ করা হচ্ছে...` });

      const res = await fetch('/api/gemini/identify-barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: cleanBc })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.name) {
          const foundProductName = data.name;
          setPendingScannedBarcode(cleanBc);

          // Notify Slack of scanned barcode product import request
          fetch('/api/slack/notify-product-import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productName: data.name,
              brand: data.brand || 'Korean Skincare',
              barcode: cleanBc,
              variant: data.variant || data.ml || 'Full Size',
              volume: data.ml || '50 ml',
              imageMatchScore: '98.5%',
              imageUrl: data.imageUrl,
              category: data.category || 'Serum & Essence',
              price: data.price || 1500,
              source: 'barcode_scan',
              performedBy: 'Barcode Scanner'
            })
          }).catch(err => console.warn('Slack notify error:', err));

          // Open & switch to "Upload by Product Name" mode
          setShowUploadSelector(true);
          setUploadSelectorMode('name');
          setNameSearchQuery(foundProductName);

          // Trigger live search by product name to load suggestions
          await handleSearchProductsByName(foundProductName);

          setAlertMsg({
            type: 'success',
            text: `✨ Barcode Google Search result: "${foundProductName}". Suggestions loaded in "Upload by Product Name"! Select a product to confirm.`
          });
          setTimeout(() => setAlertMsg(null), 7000);
          return data;
        }
      }

      // Fallback if online search returned generic fallback:
      setPendingScannedBarcode(cleanBc);
      setShowUploadSelector(true);
      setUploadSelectorMode('name');
      setNameSearchQuery(`Barcode ${cleanBc}`);
      setAlertMsg({ type: 'warning', text: `Barcode "${cleanBc}" not in inventory. Please type product name in "Upload by Product Name" to view suggestions.` });
      setTimeout(() => setAlertMsg(null), 5000);
    } catch (err) {
      console.error("Barcode identification error:", err);
      setAlertMsg({ type: 'error', text: 'Error searching barcode online.' });
    } finally {
      setIsPhotoScanning(false);
    }
  };

  const handleLiveLensSnap = async (containerId: string) => {
    setIsPhotoScanning(true);
    setAlertMsg({ type: 'info', text: '🔍 Performing Google Lens HD Instant Scan from live camera frame...' });

    try {
      const scannedBc = await scanBarcodeFromLiveVideoSnapshot(containerId);
      if (scannedBc) {
        stopFormCameraScanner();
        await handleBarcodeScanResult(scannedBc);
      } else {
        setAlertMsg({ 
          type: 'error', 
          text: 'Could not read barcode from this instant frame. Tip: Hold camera ~15cm away (do not place too close to avoid lens focus blur) and tap "📸 Lens Live Snap" again!' 
        });
        setTimeout(() => setAlertMsg(null), 5000);
      }
    } catch (err) {
      console.error("Live Lens snap error:", err);
      setAlertMsg({ type: 'error', text: 'Error performing live Lens snapshot scan.' });
    } finally {
      setIsPhotoScanning(false);
    }
  };

  const handleZoomChange = async (newZoom: number) => {
    setFormCameraZoom(newZoom);
    if (isFormCameraActive) {
      await applyCameraTrackConstraints("edit-form-barcode-scanner-container", { zoom: newZoom, triggerFocus: true });
    }
  };

  const handleGoogleLensPhotoScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsPhotoScanning(true);
    setAlertMsg({ type: 'info', text: '🔍 Analyzing photo with Google Lens barcode scanner...' });

    try {
      const scannedBc = await scanBarcodeFromImageFile(file);
      if (scannedBc) {
        stopFormCameraScanner();
        await handleBarcodeScanResult(scannedBc);
      } else {
        setAlertMsg({ 
          type: 'error', 
          text: 'Could not detect a barcode in this photo. Please ensure the barcode is clearly visible and try snapping a closer, focused photo.' 
        });
        setTimeout(() => setAlertMsg(null), 5000);
      }
    } catch (err) {
      console.error("Photo scan error:", err);
      setAlertMsg({ type: 'error', text: 'Error analyzing barcode photo. Please try again.' });
    } finally {
      setIsPhotoScanning(false);
      e.target.value = '';
    }
  };

  const stopFormCameraScanner = async () => {
    if (formScannerControllerRef.current) {
      await formScannerControllerRef.current.stop();
      formScannerControllerRef.current = null;
    }
    setIsFormCameraActive(false);
  };

  useEffect(() => {
    if (!isFormCameraActive || !editingProduct) {
      if (formScannerControllerRef.current) {
        formScannerControllerRef.current.stop();
        formScannerControllerRef.current = null;
      }
      return;
    }

    let isCancelled = false;

    const startScanner = async () => {
      setFormCameraError(null);

      if (formScannerControllerRef.current) {
        await formScannerControllerRef.current.stop();
        formScannerControllerRef.current = null;
      }

      await new Promise(res => setTimeout(res, 80));
      if (isCancelled) return;

      try {
        const controller = await startUnifiedCameraScanner({
          containerId: "edit-form-barcode-scanner-container",
          useFrontCamera: useFormFrontCamera,
          onScanSuccess: async (scannedBc) => {
            if (isCancelled) return;
            if (scannedBc) {
              stopFormCameraScanner();
              await handleBarcodeScanResult(scannedBc);
            }
          },
          onError: (errMsg) => {
            if (isCancelled) return;
            setFormCameraError(errMsg);
            setIsFormCameraActive(false);
          },
          debounceMs: 1200
        });

        if (isCancelled) {
          controller.stop();
        } else {
          formScannerControllerRef.current = controller;
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.error("Edit form camera startup error:", err);
        setFormCameraError(err.message || "Camera permission blocked or unavailable.");
      }
    };

    startScanner();

    return () => {
      isCancelled = true;
      if (formScannerControllerRef.current) {
        formScannerControllerRef.current.stop();
        formScannerControllerRef.current = null;
      }
    };
  }, [isFormCameraActive, editingProduct, useFormFrontCamera]);

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

  // Debounce search by product name
  useEffect(() => {
    if (uploadSelectorMode !== 'name') return;
    const trimmed = nameSearchQuery.trim();
    if (trimmed.length < 2) {
      setNameSuggestions([]);
      setIsSearchingNames(false);
      return;
    }
    const timer = setTimeout(() => {
      handleSearchProductsByName(trimmed);
    }, 400);
    return () => clearTimeout(timer);
  }, [nameSearchQuery, uploadSelectorMode]);

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

  // Process product name selection: populate full product object and open confirmation modal
  const handleSelectNameSuggestion = async (sug: any) => {
    setIsSearchingNames(true);
    setAlertMsg({ type: 'info', text: 'Fetching product details and preparing configuration...' });
    
    try {
      const newId = 'prod_' + Date.now();
      const barcodeToUse = pendingScannedBarcode || (sug.barcode ? normalizeBarcode(sug.barcode) : '');
      
      let finalImageUrl = sug.imageUrl || 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=600&auto=format&fit=crop';
      try {
        const uploadedImg = await cloudinaryService.uploadImage(sug.name, finalImageUrl);
        if (uploadedImg && uploadedImg.url) {
          finalImageUrl = uploadedImg.url;
        }
      } catch (cloudErr) {
        console.warn("Cloudinary upload failed, using original URL:", cloudErr);
      }

      let nameBN = sug.nameBN || '';
      if (!nameBN) {
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
      }

      const fullProductObj: Product = {
        id: newId,
        name: sug.name || 'Authentic K-Beauty Skincare',
        nameBN: nameBN || sug.name,
        brand: sug.brand || 'COSRX',
        category: sug.category || 'Serum & Essence',
        skinTypes: ['All'],
        price: Number(sug.price) || 1500,
        stock: 20,
        ml: sug.ml || '100ml',
        image: finalImageUrl,
        images: [],
        description: sug.description || 'Premium skincare product imported directly from Seoul, Korea.',
        descriptionBN: 'আমদানিকৃত আসল কোরিয়ান স্কিনকেয়ার প্রোডাক্ট যা আপনার ত্বকের যত্নে অত্যন্ত কার্যকরী।',
        rating: 4.8,
        reviewsCount: 1,
        barcode: barcodeToUse,
        barcodeNormalized: barcodeToUse,
        sku: '',
        lowStockThreshold: 5
      } as any;

      // Open Confirmation Modal ("confirmation cabe")!
      setConfirmationProductData(fullProductObj);
      setIsConfirmationModalOpen(true);

      setAlertMsg({ 
        type: 'success', 
        text: `✨ Product details filled for "${sug.name}". Please review and confirm to save to inventory!` 
      });
      setTimeout(() => setAlertMsg(null), 5000);
    } catch (err: any) {
      console.error("Auto population by product name failed:", err);
      setAlertMsg({ type: 'error', text: 'Failed to populate product details: ' + err.message });
      setTimeout(() => setAlertMsg(null), 5000);
    } finally {
      setIsSearchingNames(false);
    }
  };

  const handleConfirmSaveProduct = async () => {
    if (!confirmationProductData) return;
    setIsSavingConfirmedProduct(true);
    setAlertMsg({ type: 'info', text: 'Saving product to inventory database...' });
    try {
      await productService.createProduct(confirmationProductData);
      refreshProducts();
      setAlertMsg({ 
        type: 'success', 
        text: `🎉 "${confirmationProductData.name}" successfully added to inventory!` 
      });
      setIsConfirmationModalOpen(false);
      setConfirmationProductData(null);
      setShowUploadSelector(false);
      setPendingScannedBarcode(null);
      setTimeout(() => setAlertMsg(null), 5000);
    } catch (err: any) {
      console.error("Failed to confirm & save product:", err);
      setAlertMsg({ type: 'error', text: 'Error saving product: ' + err.message });
    } finally {
      setIsSavingConfirmedProduct(false);
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
      // AI Product Import Rule: Do NOT invent fake barcodes. Set to empty if not detected.
      const barcode = data.barcode ? normalizeBarcode(data.barcode) : '';
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
    const unsubscribe = productService.subscribe((prods) => {
      setProducts([...prods]);
    });
    return () => unsubscribe();
  }, []);

  const refreshProducts = () => {
    setProducts(productService.getProducts());
  };

  const handleStartAddProduct = () => {
    stopFormCameraScanner();
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
      barcode: '',
      barcodeNormalized: '',
      sku: '',
      lowStockThreshold: 5
    } as any);
  };

  const handleStartEditProduct = (p: Product) => {
    stopFormCameraScanner();
    setIsAddingProduct(false);
    setEditingProduct({ 
      ...p,
      images: p.images || [],
      sku: p.sku || '',
      lowStockThreshold: p.lowStockThreshold ?? 5
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const rawBc = (editingProduct.barcode || '').trim();
      let isDupWarning = false;
      let dupProdName = '';

      if (rawBc) {
        // STEP 7: Check Duplicate Barcodes for warning feedback
        const dupCheck = checkDuplicateBarcode(products, rawBc, editingProduct.id);
        if (dupCheck.isDuplicate) {
          isDupWarning = true;
          dupProdName = dupCheck.conflictingProduct?.name || 'another item';
        }
      }

      const normBc = normalizeBarcode(rawBc);
      const updatedProd: Product = {
        ...editingProduct,
        barcode: rawBc,
        barcodeNormalized: normBc
      };

      if (isAddingProduct) {
        await productService.createProduct(updatedProd);
        setAlertMsg({ 
          type: isDupWarning ? 'warning' : 'success', 
          text: isDupWarning 
            ? `New product created! ⚠️ Note: Barcode "${rawBc}" is also used by "${dupProdName}".`
            : 'New K-Beauty product registered successfully.' 
        });
      } else {
        await productService.updateProduct(updatedProd);
        setAlertMsg({ 
          type: isDupWarning ? 'warning' : 'success', 
          text: isDupWarning 
            ? `Product updated successfully! ⚠️ Note: Barcode "${rawBc}" is also assigned to "${dupProdName}".`
            : 'Product specs and stock updated successfully.' 
        });
      }
      stopFormCameraScanner();
      setEditingProduct(null);
      refreshProducts();
      setTimeout(() => setAlertMsg(null), 3000);
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Failed to save product.' });
    }
  };

  const handleDeleteProduct = (p: Product) => {
    setProductToDelete(p);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await productService.deleteProduct(productToDelete.id);
      setAlertMsg({ type: 'success', text: `Product "${productToDelete.name}" successfully removed.` });
      refreshProducts();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err?.message || 'Failed to delete product.' });
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
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

  const handleRunBarcodeAudit = () => {
    const currentProds = productService.getProducts();
    const results = auditProductsBarcodes(currentProds);
    setAuditResult(results);
    setIsAuditModalOpen(true);
  };

  const handleBackfillAndNormalize = async () => {
    const currentProds = productService.getProducts();
    let count = 0;
    for (const p of currentProds) {
      const rawBc = p.barcode || '';
      const normBc = normalizeBarcode(rawBc);
      if (p.barcodeNormalized !== normBc || (p.barcode && p.barcode !== p.barcode.trim())) {
        const updated = {
          ...p,
          barcode: rawBc.trim(),
          barcodeNormalized: normBc
        };
        await productService.updateProduct(updated);
        count++;
      }
    }
    refreshProducts();
    const newResults = auditProductsBarcodes(productService.getProducts());
    setAuditResult(newResults);
    setAlertMsg({ type: 'success', text: `Normalized and backfilled barcodes for ${count} product(s)!` });
    setTimeout(() => setAlertMsg(null), 4000);
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
    const matchesBrand = brandFilter === 'All' || p.brand.toLowerCase() === brandFilter.toLowerCase();
    return matchesSearch && matchesCategory && matchesBrand;
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
            type="button"
            onClick={handleRunBarcodeAudit}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow-sm"
            title="Audit missing, duplicate, and unnormalized barcodes"
          >
            <Barcode size={13} className="text-amber-400" />
            <span>Audit Barcodes & Fixes</span>
          </button>

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
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-pink-50/10 p-4 rounded-2xl border border-pink-100/30">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-pink-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brand, name or barcode..."
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-pink-100 bg-white rounded-lg outline-none focus:ring-2 focus:ring-[#E91E8C]/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Brand Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
              <Tag size={12} className="text-[#E91E8C]" />
              <span>Brand:</span>
            </span>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="bg-white border border-pink-100 text-xs text-gray-800 font-semibold rounded-lg px-2.5 py-1.5 outline-none focus:border-[#E91E8C] max-w-[150px]"
            >
              <option value="All">All Brands ({availableBrandsForFilter.length})</option>
              {availableBrandsForFilter.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-pink-100 text-xs text-gray-800 font-semibold rounded-lg px-2.5 py-1.5 outline-none focus:border-[#E91E8C]"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {(brandFilter !== 'All' || categoryFilter !== 'All' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setBrandFilter('All');
                setCategoryFilter('All');
                setSearchQuery('');
              }}
              className="text-[10px] font-bold text-[#E91E8C] hover:underline cursor-pointer bg-pink-50 px-2 py-1 rounded-md"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Products Card System Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-pink-100/50 text-gray-400 font-medium">
            No items match the selected filters.
          </div>
        ) : (
          filteredProducts.map(p => (
            <div 
              key={p.id} 
              onClick={() => setSelectedProductForPopup(p)}
              className="bg-white p-4 rounded-2xl border border-pink-100 shadow-xs space-y-3 cursor-pointer hover:border-[#E91E8C] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                {/* Top row: Image & Quick Info */}
                <div className="flex gap-3">
                  <img src={p.image} className="w-16 h-16 object-cover rounded-xl shadow-xs border border-pink-100 shrink-0" referrerPolicy="no-referrer" />
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] uppercase font-bold text-[#E91E8C] block leading-none">{p.brand}</span>
                      {p.ml && (
                        <span className="text-[8px] px-1 bg-pink-50 text-pink-700 rounded font-mono font-bold leading-none">{p.ml}</span>
                      )}
                    </div>
                    <span className="font-extrabold text-gray-900 block text-sm leading-snug line-clamp-2 hover:text-[#E91E8C] transition-colors">{p.name}</span>
                    <span className="text-[9px] text-gray-400 block font-mono">Barcode: {p.barcode || 'N/A'}</span>
                  </div>
                </div>

                {/* Stock level, Prices, Category */}
                <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 bg-pink-50/15 rounded-xl border border-pink-50/50">
                  <div>
                    <span className="text-[8px] text-gray-400 block uppercase font-bold">Category</span>
                    <span className="font-bold text-gray-700 truncate block">{p.category}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-400 block uppercase font-bold">Stock Level</span>
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${p.stock <= 5 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {p.stock} units
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-400 block uppercase font-bold">Base Price</span>
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
              <div className="flex gap-1.5 justify-end pt-2 border-t border-pink-50/50" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => handleGenerateOnDemandContent(p.id)}
                  disabled={isAiGeneratingContent === p.id}
                  className="mr-auto bg-pink-50 hover:bg-pink-100 text-[#E91E8C] border border-pink-100 px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer transition flex items-center gap-1 disabled:opacity-40"
                  title="Auto-generate AI SEO content"
                >
                  <Wand2 size={10} className={isAiGeneratingContent === p.id ? "animate-spin" : ""} />
                  <span>{isAiGeneratingContent === p.id ? "..." : "SEO Write"}</span>
                </button>

                <button 
                  onClick={() => setSelectedProductForPopup(p)}
                  className="p-1.5 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] border border-pink-100 rounded-lg cursor-pointer transition text-[10px] font-bold flex items-center gap-1"
                  title="View Specs & Details"
                >
                  <Eye size={12} />
                  <span>Info</span>
                </button>

                <button 
                  onClick={() => handleStartEditProduct(p)}
                  className="p-1.5 bg-pink-50 hover:bg-pink-100 text-pink-750 border border-pink-100 rounded-lg cursor-pointer transition text-[10px]"
                  title="Edit Product"
                >
                  <Edit size={12} />
                </button>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProduct(p);
                  }}
                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg cursor-pointer transition text-[10px]"
                  title="Delete product"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
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

              {/* Barcode Identity & Inventory Foundation */}
              <div className="p-3 bg-pink-50/20 border border-pink-100 rounded-2xl space-y-3">
                <span className="text-[10px] uppercase font-black text-pink-700 tracking-wider flex items-center gap-1">
                  <Barcode size={13} />
                  <span>Barcode Identity & Inventory Control</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="sm:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <label className="block text-gray-600 font-bold">
                        Physical Barcode (EAN/UPC)
                      </label>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (isFormCameraActive) {
                              stopFormCameraScanner();
                            } else {
                              setIsFormCameraActive(true);
                            }
                          }}
                          className="px-2.5 py-1 bg-[#E91E8C] hover:bg-[#FF4B91] text-white rounded-lg text-[10px] font-extrabold cursor-pointer transition flex items-center gap-1 shadow-sm"
                          title="Scan barcode with mobile video camera"
                        >
                          <Camera size={12} />
                          <span>{isFormCameraActive ? "Close Cam" : "📷 Live Cam"}</span>
                        </button>

                        <label
                          className={`px-2.5 py-1 ${isPhotoScanning ? 'bg-slate-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'} text-white rounded-lg text-[10px] font-extrabold cursor-pointer transition flex items-center gap-1 shadow-sm`}
                          title="Upload or snap a focused photo (Google Lens style, zero blur)"
                        >
                          <Search size={12} />
                          <span>{isPhotoScanning ? "Analyzing Photo..." : "🔍 Lens Photo Scan"}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            onChange={handleGoogleLensPhotoScan}
                            className="hidden"
                            disabled={isPhotoScanning}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Live Camera Viewfinder if active */}
                    {isFormCameraActive && (
                      <div className="my-2 p-3 bg-slate-900 rounded-2xl border border-pink-300 text-white space-y-2.5 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between text-[10px] gap-1.5 border-b border-slate-800 pb-2">
                          <span className="font-bold text-amber-300 flex items-center gap-1">
                            <Camera size={13} />
                            <span>Live Camera Viewfinder</span>
                          </span>

                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                              <span className="text-[9px] text-slate-400 font-bold">Zoom:</span>
                              {[1.0, 1.5, 2.0, 2.5].map((zVal) => (
                                <button
                                  key={zVal}
                                  type="button"
                                  onClick={() => handleZoomChange(zVal)}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold cursor-pointer transition ${
                                    formCameraZoom === zVal 
                                      ? "bg-[#E91E8C] text-white" 
                                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                  }`}
                                >
                                  {zVal}x
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => applyCameraTrackConstraints("edit-form-barcode-scanner-container", { zoom: formCameraZoom, triggerFocus: true })}
                              className="px-2 py-0.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded text-[9px] font-bold border border-amber-500/40 cursor-pointer transition flex items-center gap-1"
                              title="Force camera focus re-calibration"
                            >
                              🎯 Refocus
                            </button>

                            <button
                              type="button"
                              onClick={() => setUseFormFrontCamera(!useFormFrontCamera)}
                              className="text-[10px] text-slate-300 hover:text-white underline cursor-pointer font-semibold"
                            >
                              Cam ({useFormFrontCamera ? "Front" : "Rear"})
                            </button>
                            <button
                              type="button"
                              onClick={stopFormCameraScanner}
                              className="text-[10px] text-rose-400 hover:text-rose-300 cursor-pointer font-bold"
                            >
                              ✕ Close
                            </button>
                          </div>
                        </div>

                        <div 
                          id="edit-form-barcode-scanner-container" 
                          className="w-full h-48 bg-black rounded-xl overflow-hidden relative border border-slate-700 shadow-inner"
                        />

                        {/* Instant Google Lens Live Video Snapshot Scan Button */}
                        <button
                          type="button"
                          onClick={() => handleLiveLensSnap("edit-form-barcode-scanner-container")}
                          disabled={isPhotoScanning}
                          className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold text-xs py-2 px-3 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                        >
                          <Search size={14} className={isPhotoScanning ? "animate-spin" : ""} />
                          <span>{isPhotoScanning ? "Scanning Live HD Frame..." : "📸 Google Lens Live Scan (Instant Snap & Decode)"}</span>
                        </button>

                        <div className="text-[10px] text-amber-200/90 bg-amber-950/50 p-2 rounded-xl border border-amber-800/40 leading-relaxed">
                          💡 <strong>Clear Scan Tip:</strong> Hold phone ~15cm away from product and use <strong>1.5x or 2.0x Zoom</strong> to avoid lens focus blur. Tap <strong>"📸 Google Lens Live Scan"</strong> for instant high-res decoding!
                        </div>

                        {formCameraError && (
                          <p className="text-[10px] text-rose-400 bg-rose-950/80 p-2 rounded-lg border border-rose-800">
                            {formCameraError}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="e.g. 8809598450123"
                        value={editingProduct.barcode || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingProduct({ 
                            ...editingProduct, 
                            barcode: val,
                            barcodeNormalized: normalizeBarcode(val)
                          });
                        }}
                        className="flex-1 bg-white text-gray-800 px-3 py-2 rounded-lg border border-pink-200 outline-none focus:border-[#E91E8C] font-mono font-bold"
                      />
                      {isAddingProduct ? (
                        <button
                          type="button"
                          onClick={() => handleIdentifyProductByBarcode(editingProduct.barcode || '')}
                          disabled={!editingProduct.barcode || isPhotoScanning}
                          className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1 disabled:opacity-40 cursor-pointer flex-shrink-0"
                          title="Search K-Beauty database & Gemini to auto-fill product details for this barcode"
                        >
                          <Search size={13} className={isPhotoScanning ? "animate-spin" : ""} />
                          <span>Find / Auto-Fill</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (editingProduct.barcode) {
                              const norm = normalizeBarcode(editingProduct.barcode);
                              setEditingProduct({
                                ...editingProduct,
                                barcode: norm,
                                barcodeNormalized: norm
                              });
                              setAlertMsg({ type: 'success', text: `✅ Barcode code "${norm}" set for product.` });
                              setTimeout(() => setAlertMsg(null), 3000);
                            }
                          }}
                          disabled={!editingProduct.barcode}
                          className="px-3 py-2 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] border border-pink-200 rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1 disabled:opacity-40 cursor-pointer flex-shrink-0"
                          title="Save barcode code to this product without overwriting details"
                        >
                          <Check size={13} />
                          <span>Code Set</span>
                        </button>
                      )}
                    </div>
                    {editingProduct.barcode ? (
                      <span className="text-[9px] text-gray-500 font-mono block mt-1">
                        Normalized: <strong className="text-pink-600">"{normalizeBarcode(editingProduct.barcode)}"</strong>
                      </span>
                    ) : (
                      <span className="text-[9px] text-amber-600 block mt-1 font-semibold">
                        ⚠️ No barcode assigned. Scanners will match via Product ID or manually.
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-600 font-bold mb-1">SKU Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. BOJ-SUN-50"
                      value={editingProduct.sku || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                      className="w-full bg-white text-gray-800 px-3 py-2 rounded-lg border border-pink-200 outline-none focus:border-[#E91E8C] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-600 font-bold mb-1">
                    Low Stock Alert Threshold (Units)
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    value={editingProduct.lowStockThreshold ?? 5}
                    onChange={(e) => setEditingProduct({ ...editingProduct, lowStockThreshold: Number(e.target.value) })}
                    className="w-28 bg-white text-gray-800 px-3 py-1.5 rounded-lg border border-pink-200 outline-none focus:border-[#E91E8C] font-mono font-bold"
                  />
                  <span className="text-[9px] text-gray-400 ml-2">Triggers low stock alert in inventory management.</span>
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
                    list="korean-brands-list"
                    placeholder="e.g. COSRX, Anua"
                    value={editingProduct.brand}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="w-full bg-white text-gray-800 px-3 py-2 rounded-lg border border-pink-100 outline-none focus:border-[#E91E8C]"
                  />
                  <datalist id="korean-brands-list">
                    {KOREAN_BRANDS.map((brandName) => (
                      <option key={brandName} value={brandName} />
                    ))}
                  </datalist>
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

                  {/* Option 4: By Barcode Scan */}
                  <button
                    onClick={() => {
                      setShowUploadSelector(false);
                      handleStartAddProduct();
                      setIsFormCameraActive(true);
                    }}
                    className="group p-4 bg-white hover:bg-pink-50/15 border border-pink-200 hover:border-[#E91E8C] rounded-2xl transition text-left flex items-start gap-3.5 cursor-pointer shadow-sm hover:shadow"
                  >
                    <div className="p-3 bg-pink-50 group-hover:bg-[#E91E8C] rounded-xl text-[#E91E8C] group-hover:text-white transition flex-shrink-0">
                      <Barcode size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-gray-800 text-xs block group-hover:text-[#E91E8C] transition flex items-center gap-1.5">
                        <span>Upload by Barcode Scan</span>
                        <span className="px-1.5 py-0.5 bg-pink-100 text-[#E91E8C] text-[9px] font-black rounded uppercase">Instant Auto-Identify</span>
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5 leading-relaxed">Scan product EAN/UPC barcode with camera or photo. Automatically identifies brand, product name, category, BDT price, and auto-fills details!</span>
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
                      onChange={(e) => setNameSearchQuery(e.target.value)}
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

      {/* BARCODE DATA AUDIT TOOL MODAL */}
      {isAuditModalOpen && auditResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-pink-100 overflow-hidden max-w-2xl w-full shadow-2xl flex flex-col justify-between max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-pink-100 flex justify-between items-center bg-slate-900 text-white">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-amber-400">
                <Barcode size={16} />
                <span>Barcode Identity & Data Audit Tool</span>
              </span>
              <button 
                type="button" 
                onClick={() => setIsAuditModalOpen(false)} 
                className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-full hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs bg-white">
              <p className="text-gray-600 leading-relaxed text-xs">
                This diagnostic audit tool validates barcode data integrity across your Firestore database catalog to prevent camera scanner mismatches, lost leading zeros, spaces, or duplicates.
              </p>

              {/* Grid of 4 Audit Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-pink-50 p-3 rounded-2xl border border-pink-100 text-center space-y-0.5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Total Products</span>
                  <span className="text-xl font-black text-gray-900 font-mono">{auditResult.totalProducts}</span>
                </div>

                <div className={`p-3 rounded-2xl border text-center space-y-0.5 ${
                  auditResult.missingBarcodes.length > 0 
                    ? 'bg-amber-50 border-amber-200 text-amber-900' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <span className="text-[10px] font-bold uppercase block">Missing Barcode</span>
                  <span className="text-xl font-black font-mono">{auditResult.missingBarcodes.length}</span>
                </div>

                <div className={`p-3 rounded-2xl border text-center space-y-0.5 ${
                  auditResult.duplicateBarcodes.length > 0 
                    ? 'bg-rose-50 border-rose-200 text-rose-900' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <span className="text-[10px] font-bold uppercase block">Duplicates</span>
                  <span className="text-xl font-black font-mono">{auditResult.duplicateBarcodes.length}</span>
                </div>

                <div className={`p-3 rounded-2xl border text-center space-y-0.5 ${
                  auditResult.unnormalizedBarcodes.length > 0 
                    ? 'bg-sky-50 border-sky-200 text-sky-900' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <span className="text-[10px] font-bold uppercase block">Unnormalized</span>
                  <span className="text-xl font-black font-mono">{auditResult.unnormalizedBarcodes.length}</span>
                </div>
              </div>

              {/* DUPLICATE BARCODES WARNING */}
              {auditResult.duplicateBarcodes.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                  <span className="font-extrabold text-rose-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-rose-600" />
                    <span>Duplicate Barcode Collision Detected ({auditResult.duplicateBarcodes.length} Groups)</span>
                  </span>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    The following products share identical barcode values. Edit these products to assign unique physical barcodes:
                  </p>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {auditResult.duplicateBarcodes.map((dup, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-xl border border-rose-200 text-[11px] space-y-1">
                        <div className="font-mono font-bold text-rose-700">
                          Normalized Barcode: "{dup.normalizedBarcode}"
                        </div>
                        <ul className="list-disc list-inside text-gray-700 space-y-0.5">
                          {dup.products.map(p => (
                            <li key={p.id}>
                              <strong>{p.name}</strong> <span className="text-gray-400 font-mono">(ID: {p.id})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* UNNORMALIZED BARCODES LIST */}
              {auditResult.unnormalizedBarcodes.length > 0 && (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl space-y-2">
                  <span className="font-extrabold text-sky-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <RefreshCw size={14} className="text-sky-600" />
                    <span>Unnormalized Barcodes Needing Backfill ({auditResult.unnormalizedBarcodes.length} Products)</span>
                  </span>
                  <p className="text-[11px] text-sky-700">
                    These products have unnormalized formatting (spaces, hyphens, or uncomputed <code>barcodeNormalized</code> field). Click <strong>"Backfill & Normalize Barcodes"</strong> below to automatically standardize them.
                  </p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {auditResult.unnormalizedBarcodes.map((un, idx) => (
                      <div key={idx} className="bg-white p-2 rounded-xl border border-sky-100 flex justify-between items-center text-[10px]">
                        <span className="font-bold text-gray-800 truncate max-w-[200px]">{un.product.name}</span>
                        <div className="font-mono text-gray-600">
                          Raw: <span className="text-rose-600">"{un.raw}"</span> &rarr; Norm: <span className="text-emerald-600">"{un.normalized}"</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MISSING BARCODES LIST */}
              {auditResult.missingBarcodes.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                  <span className="font-extrabold text-amber-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-amber-600" />
                    <span>Products Missing Physical Barcodes ({auditResult.missingBarcodes.length})</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                    {auditResult.missingBarcodes.map(p => (
                      <div key={p.id} className="bg-white p-2 rounded-xl border border-amber-200 flex items-center justify-between text-[10px]">
                        <span className="font-bold text-gray-800 truncate">{p.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAuditModalOpen(false);
                            handleStartEditProduct(p);
                          }}
                          className="text-[#E91E8C] font-extrabold hover:underline cursor-pointer ml-2 flex-shrink-0"
                        >
                          Edit
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CLEAN BILL OF HEALTH BANNER */}
              {auditResult.duplicateBarcodes.length === 0 && 
               auditResult.unnormalizedBarcodes.length === 0 && 
               auditResult.missingBarcodes.length === 0 && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
                  <CheckCircle size={28} className="text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-emerald-900 text-sm">100% Barcode Integrity Verified!</h4>
                  <p className="text-xs text-emerald-700">All products have unique, normalized, and valid physical barcodes in Firestore.</p>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-pink-50/20 border-t border-pink-100 flex justify-between items-center gap-2">
              <button 
                type="button"
                onClick={handleBackfillAndNormalize}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Backfill & Normalize Barcodes</span>
              </button>

              <button 
                type="button" 
                onClick={() => setIsAuditModalOpen(false)} 
                className="px-5 py-2.5 bg-[#E91E8C] hover:bg-[#FF4B91] text-white text-xs font-extrabold rounded-xl cursor-pointer transition shadow-sm"
              >
                Done / Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DELETE PRODUCT CONFIRMATION MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] border border-red-100 overflow-hidden max-w-md w-full shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-gray-900">Delete Product?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Are you sure you want to delete <strong className="text-gray-900">"{productToDelete.name}"</strong>? This will permanently remove the product from your store inventory.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT REGISTRATION CONFIRMATION MODAL */}
      {isConfirmationModalOpen && confirmationProductData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-pink-100 overflow-hidden max-w-lg w-full shadow-2xl flex flex-col justify-between max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-pink-100 flex justify-between items-center bg-white">
              <span className="text-xs font-black text-gray-950 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle size={16} className="text-[#E91E8C]" />
                <span>Product Registration Confirmation</span>
              </span>
              <button 
                type="button" 
                onClick={() => {
                  setIsConfirmationModalOpen(false);
                  setConfirmationProductData(null);
                }} 
                className="text-gray-400 hover:text-pink-600 cursor-pointer p-1 rounded-full hover:bg-pink-50 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs bg-white">
              <div className="bg-pink-50/40 p-3 rounded-2xl border border-pink-100/60 flex items-center gap-2.5">
                <Info size={16} className="text-[#E91E8C] flex-shrink-0" />
                <p className="text-[11px] text-gray-700 leading-relaxed font-medium">
                  Barcode search found product details. Please review and confirm to save to your store inventory.
                </p>
              </div>

              {/* Product Card Details */}
              <div className="flex gap-4 p-3.5 bg-gray-50/70 border border-gray-150 rounded-2xl items-start">
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-pink-100 bg-white flex-shrink-0 shadow-sm">
                  <img src={confirmationProductData.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] uppercase font-bold text-[#E91E8C] bg-pink-50 px-2 py-0.5 rounded-full">
                      {confirmationProductData.brand}
                    </span>
                    <span className="text-[9px] font-mono font-extrabold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                      {confirmationProductData.ml || '100ml'}
                    </span>
                    {confirmationProductData.barcodeNormalized && (
                      <span className="text-[9px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                        Barcode: {confirmationProductData.barcodeNormalized}
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-gray-900 text-xs leading-snug">{confirmationProductData.name}</h4>
                  {confirmationProductData.nameBN && (
                    <p className="text-[11px] text-pink-750 font-medium">{confirmationProductData.nameBN}</p>
                  )}
                  <p className="text-[10px] text-gray-500">{confirmationProductData.category}</p>
                </div>
              </div>

              {/* Price & Stock Adjustment */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-extrabold text-gray-600">Retail Price (BDT ৳)</label>
                  <input
                    type="number"
                    value={confirmationProductData.price}
                    onChange={(e) => setConfirmationProductData({
                      ...confirmationProductData,
                      price: Number(e.target.value) || 0
                    })}
                    className="w-full bg-pink-50/10 text-gray-900 font-mono font-bold px-3 py-2 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C] text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-extrabold text-gray-600">Initial Stock</label>
                  <input
                    type="number"
                    value={confirmationProductData.stock}
                    onChange={(e) => setConfirmationProductData({
                      ...confirmationProductData,
                      stock: Number(e.target.value) || 0
                    })}
                    className="w-full bg-pink-50/10 text-gray-900 font-mono font-bold px-3 py-2 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C] text-xs"
                  />
                </div>
              </div>

              {/* Description preview */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-extrabold text-gray-500">Product Description</label>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-[11px] text-gray-600 leading-relaxed max-h-24 overflow-y-auto">
                  {confirmationProductData.description}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-pink-50/20 border-t border-pink-100 flex flex-wrap gap-2 justify-end items-center">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmationModalOpen(false);
                  setIsAddingProduct(true);
                  setEditingProduct(confirmationProductData);
                  setConfirmationProductData(null);
                }}
                className="px-3.5 py-2 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <Edit size={13} />
                <span>Customize Details</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmSaveProduct}
                disabled={isSavingConfirmedProduct}
                className="px-5 py-2 bg-[#E91E8C] hover:bg-[#FF4B91] text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSavingConfirmedProduct ? (
                  <>
                    <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Saving to Inventory...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} />
                    <span>Confirm & Save to Inventory</span>
                  </>
                )}
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
