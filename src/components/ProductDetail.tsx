import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productService } from '../services/productService';
import { useProduct, useProducts } from '../hooks/queries/products';
import { reviewService } from '../services/reviewService';
import { posService } from '../services/posService';
import { Product, ProductReview, Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWholesaleCart } from '../context/WholesaleCartContext';
import { db } from '../services/firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { fetchSiteSettings, formatWhatsAppNumber } from '../services/chatbotService';
import { analytics } from '../services/analyticsService';
import { themeService, DEFAULT_GLOBAL_THEME } from '../services/themeService';
import { GlobalThemeSettings } from '../types/theme';
import { 
  ShoppingBag, ChevronRight, Star, Heart, CheckCircle, ArrowLeft, ShieldCheck, 
  RefreshCw, MessageSquare, Camera, ThumbsUp, Image as ImageIcon, X, Upload, 
  Wand2, Check, AlertCircle, Filter, SlidersHorizontal, Lock, User as UserIcon, MessageCircle,
  Share2, Copy, Sparkles, Send, ExternalLink, Plus, Minus, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductDetailSkeleton } from './Skeletons';
import { ProductCard } from './ProductCard';
import { getRetailPrice, getRetailOriginalPrice, hasRetailDiscount, getWholesalePrice } from '../utils/pricing';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, addToCart } = useCart();
  const { addToWholesaleCart } = useWholesaleCart();
  const { user, profile, signInWithGoogle, isAdmin } = useAuth();

  const { data: product, isLoading: isProductLoading, isError } = useProduct(id);
  const { data: allProducts = [] } = useProducts();

  const [activeTab, setActiveTab] = useState<'desc' | 'ingredients' | 'how-to'>('desc');
  const [selectedMainImage, setSelectedMainImage] = useState<string>('');
  const [whatsappNumber, setWhatsappNumber] = useState('8801755837545');
  const [globalTheme, setGlobalTheme] = useState<GlobalThemeSettings>(DEFAULT_GLOBAL_THEME);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync main image when product changes
  useEffect(() => {
    if (product?.image) {
      setSelectedMainImage(product.image);
    }
  }, [product?.id, product?.image]);

  // Related products calculated dynamically from cached allProducts
  const relatedProducts = useMemo(() => {
    if (!product || !allProducts.length) return [];
    const filtered = allProducts
      .filter(p => p.id !== product.id && (p.category === product.category || p.brand === product.brand))
      .slice(0, 4);
    return filtered.length > 0 ? filtered : allProducts.filter(p => p.id !== product.id).slice(0, 4);
  }, [product, allProducts]);

  // Quantity State (Default: 1)
  const [quantity, setQuantity] = useState<number>(1);
  const [quantityInput, setQuantityInput] = useState<string>('1');

  // Wholesale Tier Selection State ('1-49' default, or '50+')
  const [selectedWholesaleTier, setSelectedWholesaleTier] = useState<'1-49' | '50+'>('1-49');

  const wholesalePrice1_49 = useMemo(() => getWholesalePrice(product, 1), [product]);
  const wholesalePrice50Plus = useMemo(() => getWholesalePrice(product, 50), [product]);

  // Quantity Change Handlers
  const handleQuantityChange = (newQty: number) => {
    const maxStock = product?.stock && product.stock > 0 ? product.stock : 9999;
    const clamped = Math.max(1, Math.min(newQty, maxStock));
    setQuantity(clamped);
    setQuantityInput(String(clamped));
    if (clamped >= 50) {
      setSelectedWholesaleTier('50+');
    } else if (selectedWholesaleTier === '50+' && clamped < 50) {
      setSelectedWholesaleTier('1-49');
    }
  };

  const handleQuantityInputChange = (val: string) => {
    setQuantityInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1) {
      const maxStock = product?.stock && product.stock > 0 ? product.stock : 9999;
      const clamped = Math.min(num, maxStock);
      setQuantity(clamped);
      if (clamped >= 50) {
        setSelectedWholesaleTier('50+');
      } else if (selectedWholesaleTier === '50+' && clamped < 50) {
        setSelectedWholesaleTier('1-49');
      }
    }
  };

  const handleQuantityInputBlur = () => {
    const num = parseInt(quantityInput, 10);
    const maxStock = product?.stock && product.stock > 0 ? product.stock : 9999;
    if (isNaN(num) || num < 1) {
      setQuantity(1);
      setQuantityInput('1');
      if (selectedWholesaleTier === '50+') {
        setSelectedWholesaleTier('1-49');
      }
    } else {
      const clamped = Math.min(num, maxStock);
      setQuantity(clamped);
      setQuantityInput(String(clamped));
    }
  };

  const isWholesaleUser = profile?.wholesaleAccess === true;
  const currentWholesalePrice = selectedWholesaleTier === '50+' || quantity >= 50 
    ? wholesalePrice50Plus 
    : wholesalePrice1_49;
  const activeUnitPrice = isWholesaleUser 
    ? currentWholesalePrice 
    : getRetailPrice(product);

  // Subscribe to Global Theme for store logo and branding
  useEffect(() => {
    const unsubscribe = themeService.subscribeGlobal((gt) => {
      setGlobalTheme(gt);
    });
    return () => unsubscribe();
  }, []);

  // Load site settings for WhatsApp contact number
  useEffect(() => {
    async function loadSettings() {
      const settings = await fetchSiteSettings();
      if (settings && settings.whatsappNumber) {
        setWhatsappNumber(settings.whatsappNumber);
      }
    }
    loadSettings();
  }, []);

  // Social Share Handlers
  const handleCopyProductLink = async () => {
    const currentUrl = window.location.href;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShareFacebook = () => {
    const currentUrl = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  const handleShareWhatsAppSocial = () => {
    if (!product) return;
    const currentUrl = window.location.href;
    const priceText = `৳${getRetailPrice(product)}`;
    const text = `🌸 *${product.name}* (${product.brand})\n💰 Price: ${priceText}\n✨ Check out this authentic Korean skincare product at Korean Skin Food BD:\n${currentUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareMessenger = () => {
    const currentUrl = window.location.href;
    // Messenger web share
    window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(currentUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(currentUrl)}`, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  const handleShareTelegram = () => {
    if (!product) return;
    const currentUrl = window.location.href;
    const text = `🌸 ${product.name} - Korean Skin Food BD`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareTwitter = () => {
    if (!product) return;
    const currentUrl = window.location.href;
    const text = `Check out ${product.name} by ${product.brand} on Korean Skin Food BD! ✨🇰🇷 #KoreanSkincare #KBeauty`;
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleSharePinterest = () => {
    if (!product) return;
    const currentUrl = window.location.href;
    const imageUrl = selectedMainImage || product.image;
    const description = `${product.name} - Authentic Korean Skincare from Korean Skin Food BD`;
    window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(currentUrl)}&media=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(description)}`, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (!product) return;
    const currentUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on Korean Skin Food BD`,
          url: currentUrl
        });
      } catch (err) {
        // User dismissed or share failed
        console.log('Share canceled or error:', err);
      }
    } else {
      handleCopyProductLink();
    }
  };

  // Send WhatsApp message template with product details
  const handleWhatsAppOrder = () => {
    if (!product) return;

    const unitPrice = isWholesaleUser ? currentWholesalePrice : getRetailPrice(product);
    const totalAmount = unitPrice * quantity;
    const pageUrl = window.location.href;

    const summaryText = 
      `🌸 *Order Inquiry - Korean Skin Food BD* 🌸\n` +
      `--------------------------------------\n` +
      `📦 *Product Name:* ${product.name}\n` +
      `🏷️ *Brand:* ${product.brand}\n` +
      `💰 *Unit Price:* ৳${unitPrice.toLocaleString()} BDT\n` +
      `🔢 *Quantity:* ${quantity} pcs\n` +
      `💳 *Total Estimated:* ৳${totalAmount.toLocaleString()} BDT\n` +
      (isWholesaleUser ? `🏢 *Wholesale Tier:* ${selectedWholesaleTier === '50+' || quantity >= 50 ? 'Bulk 50+ pcs' : 'Wholesale 1-49 pcs'}\n` : '') +
      `📁 *Category:* ${product.category}\n` +
      `⚡ *Availability:* ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}\n` +
      `🔗 *Product Link:* ${pageUrl}\n` +
      `--------------------------------------\n` +
      `Hello! I would like to order ${quantity} unit(s) of this product.`;

    const encodedSummary = encodeURIComponent(summaryText);
    const targetNumber = formatWhatsAppNumber(whatsappNumber);
    const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodedSummary}`;

    window.open(whatsappUrl, '_blank');
  };

  // Product Reviews State
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Verified Purchaser State
  const [isVerifiedPurchaser, setIsVerifiedPurchaser] = useState(false);
  const [verifiedOrderInfo, setVerifiedOrderInfo] = useState<Order | null>(null);

  // Review Submission Form State
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [newTitle, setNewTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  // Review Filters & Sorting
  const [filterRating, setFilterRating] = useState<number | 'all' | 'photos'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'highest' | 'lowest' | 'helpful'>('latest');

  // Photo Lightbox Modal
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  // Tracked Product ID Ref Guard to prevent re-render double-firing
  const trackedProductIdRef = useRef<string | null>(null);

  // Scroll to top and track ViewContent / view_item once per product load
  useEffect(() => {
    if (!id) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [id]);

  useEffect(() => {
    if (product && trackedProductIdRef.current !== product.id) {
      trackedProductIdRef.current = product.id;
      analytics.trackViewItem(product);
    }
    if (product) {
      const pageTitle = product.metaTitle || (product as any).seoTitle || `${product.name} | Korean Skin Food BD`;
      document.title = pageTitle;
      if (product.metaDescription) {
        let metaTag = document.querySelector('meta[name="description"]');
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('name', 'description');
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', product.metaDescription);
      }
    }
  }, [product]);

  // If query failed completely after loading and no product found, redirect gracefully
  useEffect(() => {
    if (!isProductLoading && !product && id) {
      navigate('/', { replace: true });
    }
  }, [isProductLoading, product, id, navigate]);

  // Subscribe to Product Reviews
  useEffect(() => {
    if (!product?.id) return;

    setLoadingReviews(true);
    const unsubscribe = reviewService.subscribeReviews(product.id, (loadedReviews) => {
      setReviews(loadedReviews);
      setLoadingReviews(false);
    });

    return () => unsubscribe();
  }, [product?.id]);

  // Check if current user is a Verified Purchaser for this product
  useEffect(() => {
    if (!product) {
      setIsVerifiedPurchaser(false);
      setVerifiedOrderInfo(null);
      return;
    }

    const checkOrdersForProduct = (allOrders: Order[]) => {
      const userEmailLower = user?.email?.toLowerCase().trim();
      const userUid = user?.uid;
      const userPhoneClean = profile?.phone?.trim();

      const matchingOrder = allOrders.find(ord => {
        const matchEmail = userEmailLower && ord.customerEmail && ord.customerEmail.toLowerCase().trim() === userEmailLower;
        const matchUid = ord.customer_uid && ord.customer_uid === userUid;
        const matchPhone = userPhoneClean && ord.customerPhone && ord.customerPhone.trim() === userPhoneClean;

        if (matchEmail || matchUid || matchPhone) {
          // Check if order contains this item
          return ord.items.some(item => 
            item.productId === product.id || 
            item.name.toLowerCase().trim() === product.name.toLowerCase().trim()
          );
        }
        return false;
      });

      if (matchingOrder) {
        setIsVerifiedPurchaser(true);
        setVerifiedOrderInfo(matchingOrder);
      } else if (isAdmin) {
        // Admins/staff accounts also get verified purchaser privilege for testing & store management
        setIsVerifiedPurchaser(true);
      } else {
        setIsVerifiedPurchaser(false);
        setVerifiedOrderInfo(null);
      }
    };

    if (!user || !user.uid) {
      // If user is not logged in, skip the Firestore query entirely
      const localOrders = posService.getOrders();
      checkOrdersForProduct(localOrders);
      return;
    }

    // Query Firestore orders belonging to current logged-in user
    const q = query(collection(db, 'orders'), where('customer_uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ords: Order[] = [];
      snapshot.forEach(docSnap => {
        ords.push({ id: docSnap.id, ...docSnap.data() } as Order);
      });
      checkOrdersForProduct(ords);
    }, (err) => {
      // Fallback check using posService local cache
      const localOrders = posService.getOrders();
      checkOrdersForProduct(localOrders);
    });

    return () => unsubscribe();
  }, [user, product, profile?.phone, isAdmin]);

  // Handle Photo Attachment
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should not exceed 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setNewPhotos(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !newComment.trim()) return;

    setIsSubmittingReview(true);
    setReviewSuccessMsg(null);

    try {
      const reviewerName = profile?.name || user?.displayName || 'K-Beauty Customer';
      
      await reviewService.addReview({
        productId: product.id,
        userId: user?.uid || 'guest',
        userName: reviewerName,
        userEmail: user?.email || '',
        rating: newRating,
        title: newTitle.trim(),
        comment: newComment.trim(),
        photos: newPhotos,
        isVerifiedPurchaser: isVerifiedPurchaser
      });

      setReviewSuccessMsg('Thank you! Your verified review and photos have been posted successfully.');
      setNewComment('');
      setNewTitle('');
      setNewPhotos([]);
      setShowReviewForm(false);
      setTimeout(() => setReviewSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Failed to post review:', err);
      alert('Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Filter & Sort Reviews
  const filteredAndSortedReviews = useMemo(() => {
    let result = [...reviews];

    // Filtering
    if (filterRating === 'photos') {
      result = result.filter(r => r.photos && r.photos.length > 0);
    } else if (typeof filterRating === 'number') {
      result = result.filter(r => Math.floor(r.rating) === filterRating);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'highest') {
        return b.rating - a.rating;
      } else if (sortBy === 'lowest') {
        return a.rating - b.rating;
      } else if (sortBy === 'helpful') {
        return (b.helpfulCount || 0) - (a.helpfulCount || 0);
      }
      return 0;
    });

    return result;
  }, [reviews, filterRating, sortBy]);

  // Rating Statistics Breakdown
  const ratingStats = useMemo(() => {
    if (reviews.length === 0) {
      return {
        avg: product?.rating || 4.8,
        total: product?.reviewsCount || 0,
        distribution: { 5: 85, 4: 10, 3: 5, 2: 0, 1: 0 },
        verifiedCount: 0,
        withPhotosCount: 0
      };
    }

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalScore = 0;
    let verifiedCount = 0;
    let withPhotosCount = 0;

    reviews.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1|2|3|4|5;
      counts[star] = (counts[star] || 0) + 1;
      totalScore += r.rating;
      if (r.isVerifiedPurchaser) verifiedCount++;
      if (r.photos && r.photos.length > 0) withPhotosCount++;
    });

    const total = reviews.length;
    const avg = Number((totalScore / total).toFixed(1));

    const distribution = {
      5: Math.round((counts[5] / total) * 100),
      4: Math.round((counts[4] / total) * 100),
      3: Math.round((counts[3] / total) * 100),
      2: Math.round((counts[2] / total) * 100),
      1: Math.round((counts[1] / total) * 100),
    };

    return { avg, total, distribution, verifiedCount, withPhotosCount };
  }, [reviews, product]);

  if (!product) {
    return <ProductDetailSkeleton />;
  }

  const discountPercent = product.discountPrice 
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100) 
    : 0;

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 py-8 md:px-8 lg:px-12 space-y-10">
      
      {/* Lightbox Modal for Review Photos */}
      <AnimatePresence>
        {activeLightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setActiveLightboxImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
              <img 
                src={activeLightboxImage} 
                alt="Full preview" 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" 
              />
              <button
                onClick={() => setActiveLightboxImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-pink-300 font-bold p-2 bg-white/10 hover:bg-white/20 rounded-full transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Breadcrumb navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
        <Link to="/" className="hover:text-[#E91E8C] transition">Home</Link>
        <ChevronRight size={12} />
        <Link to="/" className="hover:text-[#E91E8C] transition">Skincare Catalog</Link>
        <ChevronRight size={12} />
        <span className="text-gray-500 font-bold">{product.brand}</span>
        <ChevronRight size={12} />
        <span className="text-[#E91E8C] font-extrabold truncate max-w-[150px] md:max-w-xs">
          {language === 'en' ? product.name : product.nameBN}
        </span>
      </nav>

      {/* 2. Main Product Info Column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start bg-white p-6 md:p-8 rounded-[32px] border border-pink-100 shadow-sm">
        
        {/* Left Column: Product Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-pink-50/5 border border-pink-100 rounded-2xl overflow-hidden p-4 group">
            <img 
              src={selectedMainImage || product.image || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=600'} 
              alt={product.imageAltText || product.name} 
              className="w-full h-full object-cover rounded-xl shadow-sm transition group-hover:scale-105 duration-300"
              referrerPolicy="no-referrer"
            />
            {discountPercent > 0 && (
              <span className="absolute left-6 top-6 bg-[#E91E8C] text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow-sm animate-bounce">
                -{discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Multi-Image Gallery Picker */}
          {product.images && product.images.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedMainImage(product.image)}
                className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                  (selectedMainImage === product.image || !selectedMainImage)
                    ? 'border-[#E91E8C] ring-2 ring-[#E91E8C]/15 scale-95' 
                    : 'border-pink-100 hover:border-pink-300'
                }`}
              >
                <img src={product.image || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=200'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
              {product.images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedMainImage(imgUrl)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedMainImage === imgUrl 
                      ? 'border-[#E91E8C] ring-2 ring-[#E91E8C]/15 scale-95' 
                      : 'border-pink-100 hover:border-pink-300'
                  }`}
                >
                  <img src={imgUrl || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=200'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between text-[11px] text-gray-400 bg-pink-50/10 p-3.5 rounded-xl border border-pink-100/30">
            <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-500" /> 100% Authentic Import</span>
            <span className="flex items-center gap-1"><RefreshCw size={13} className="text-pink-500" /> 7-Day Refund Guard</span>
          </div>

          {/* Social Media Sharing & Brand Logo Section (Desktop: Below Image) */}
          <div id="product_social_share_section" className="hidden lg:block bg-gradient-to-br from-pink-50/60 via-white to-pink-50/30 rounded-2xl p-4 border border-pink-100/90 shadow-2xs space-y-3">
            {/* Top Brand Logo & Share Title */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-pink-100/60">
              <div className="flex items-center gap-2.5">
                {globalTheme.logoUrl && globalTheme.logoUrl.trim() !== '' ? (
                  <img 
                    src={globalTheme.logoUrl} 
                    alt={globalTheme.logoText || "Korean Skin Food BD"} 
                    className="h-7 w-auto object-contain shrink-0 rounded-sm" 
                  />
                ) : (
                  <div className="w-7 h-7 bg-gradient-to-tr from-[#E91E8C] to-[#FF62B2] rounded-lg flex items-center justify-center text-white shadow-xs shadow-pink-500/20 shrink-0">
                    <Wand2 size={13} />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-black text-gray-900 leading-tight tracking-tight">
                    {language === 'bn' ? 'পণ্যটি শেয়ার করুন' : 'Share This Product'}
                  </h4>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {language === 'bn' ? 'বন্ধু ও পরিবারের সাথে বিউটি সিক্রেট শেয়ার করুন' : 'Spread the authentic K-Beauty glow'}
                  </p>
                </div>
              </div>

              {/* Native share on mobile / quick action */}
              <button
                type="button"
                onClick={handleNativeShare}
                id="btn_product_native_share"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E91E8C] bg-pink-50 hover:bg-pink-100 px-2.5 py-1 rounded-full border border-pink-200 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                title="Share"
              >
                <Share2 size={12} />
                <span className="hidden sm:inline">{language === 'bn' ? 'শেয়ার' : 'Share'}</span>
              </button>
            </div>

            {/* Social Share Buttons Row */}
            <div className="flex items-center flex-wrap gap-2 pt-0.5">
              {/* Facebook */}
              <button
                type="button"
                id="btn_share_facebook"
                onClick={handleShareFacebook}
                title="Share on Facebook"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white border border-[#1877F2]/20 transition-all duration-200 shadow-2xs hover:scale-110 active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>

              {/* WhatsApp */}
              <button
                type="button"
                id="btn_share_whatsapp"
                onClick={handleShareWhatsAppSocial}
                title="Share on WhatsApp"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/25 transition-all duration-200 shadow-2xs hover:scale-110 active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
              </button>

              {/* Messenger */}
              <button
                type="button"
                id="btn_share_messenger"
                onClick={handleShareMessenger}
                title="Share on Messenger"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00B2FF]/10 via-[#006AFF]/10 to-[#E91E8C]/10 hover:from-[#00B2FF] hover:via-[#006AFF] hover:to-[#E91E8C] text-[#0084FF] hover:text-white border border-[#0084FF]/20 transition-all duration-200 shadow-2xs hover:scale-110 active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.077.299 2.222.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26 6.559-6.963 3.13 3.259 5.889-3.259-6.56 6.963z"/>
                </svg>
              </button>

              {/* Telegram */}
              <button
                type="button"
                id="btn_share_telegram"
                onClick={handleShareTelegram}
                title="Share on Telegram"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white border border-[#229ED9]/25 transition-all duration-200 shadow-2xs hover:scale-110 active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.562 8.161c-.18.868-1.503 6.985-2.184 10.316-.288 1.411-.849 1.637-1.393 1.685-1.183.104-2.079-.74-3.228-1.493-1.8-1.179-2.817-1.912-4.564-3.063-2.019-1.33-.71-2.062.44-3.257.301-.313 5.534-5.074 5.635-5.506.013-.054.024-.255-.096-.361-.12-.107-.297-.071-.425-.042-.181.041-3.067 1.95-8.66 5.727-.82.564-1.562.839-2.227.824-.733-.016-2.144-.416-3.193-.757-1.287-.419-2.31-.641-2.221-1.353.046-.371.558-.751 1.536-1.141 6.02-2.622 10.038-4.352 12.054-5.19 5.748-2.392 6.941-2.808 7.722-2.822.172-.003.555.04.804.242.21.171.269.402.296.564.028.163.064.526.035.795z"/>
                </svg>
              </button>

              {/* X / Twitter */}
              <button
                type="button"
                id="btn_share_twitter"
                onClick={handleShareTwitter}
                title="Post to X (Twitter)"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900/10 hover:bg-slate-950 text-slate-800 hover:text-white border border-slate-900/15 transition-all duration-200 shadow-2xs hover:scale-110 active:scale-95 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>

              {/* Pinterest */}
              <button
                type="button"
                id="btn_share_pinterest"
                onClick={handleSharePinterest}
                title="Pin on Pinterest"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#E60023]/10 hover:bg-[#E60023] text-[#E60023] hover:text-white border border-[#E60023]/20 transition-all duration-200 shadow-2xs hover:scale-110 active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.621 0 11.988-5.367 11.988-11.987C24.004 5.367 18.638 0 12.017 0z"/>
                </svg>
              </button>

              {/* Copy Link Button */}
              <button
                type="button"
                id="btn_copy_product_link"
                onClick={handleCopyProductLink}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold transition-all duration-200 shadow-2xs border cursor-pointer ${
                  copiedLink
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                    : 'bg-pink-50/80 hover:bg-[#E91E8C] text-[#E91E8C] hover:text-white border-pink-200/80 hover:border-[#E91E8C]'
                }`}
                title="Copy Product Link"
              >
                {copiedLink ? (
                  <>
                    <Check size={14} className="animate-in zoom-in" />
                    <span>{language === 'bn' ? 'কপি হয়েছে!' : 'Link Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>{language === 'bn' ? 'লিংক কপি' : 'Copy Link'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Skincare Specs and Add to Cart */}
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="text-xs uppercase font-extrabold text-[#E91E8C] bg-pink-50/70 border border-pink-100 px-3 py-1 rounded-full tracking-wider">
              {product.brand}
            </span>
            <h2 className="text-2xl font-black text-gray-950 tracking-tight leading-tight">
              {language === 'en' ? product.name : product.nameBN}
            </h2>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill={i < Math.floor(ratingStats.avg) ? "currentColor" : "none"} />
                ))}
              </div>
              <span className="text-xs font-bold text-gray-800">{ratingStats.avg}</span>
              <a href="#reviews-section" className="text-xs text-[#E91E8C] hover:underline font-bold">
                ({ratingStats.total} customer reviews)
              </a>
            </div>
          </div>

          {/* Pricing Box */}
          {profile?.wholesaleAccess ? (
            <div id="product-wholesale-pricing-box" className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/50 rounded-2xl sm:rounded-3xl border-2 border-amber-300 shadow-sm space-y-3.5">
              {/* Top Header Badge & Stock */}
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider shadow-2xs">
                  <Building2 size={13} /> {language === 'bn' ? 'হোলসেল এক্সেস সক্রিয়' : 'Wholesale Access Active'}
                </span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  product.stock > 0 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-red-50 text-red-700 border-red-100'
                }`}>
                  {product.stock > 0 ? `${language === 'bn' ? 'স্টক' : 'Stock'}: ${product.stock}` : (language === 'bn' ? 'স্টক শেষ' : 'Out of Stock')}
                </span>
              </div>

              {/* Prices Side-by-Side: Retail Price (normal user style) + Wholesale Price (1-49 pcs or 50+) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                {/* Retail Price Column (shown like normal user) */}
                <div className="p-3 bg-white/95 rounded-xl border border-amber-200/90 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      {language === 'bn' ? 'খুচরা মূল্য (Retail)' : 'Regular Retail'}
                    </span>
                    {hasRetailDiscount(product) && (
                      <span className="text-[9px] font-black text-[#E91E8C] bg-pink-50 px-1.5 py-0.2 rounded border border-pink-100 uppercase">
                        -{discountPercent}% OFF
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-xl sm:text-2xl font-black text-slate-800">
                      ৳{getRetailPrice(product).toLocaleString()}
                    </span>
                    {hasRetailDiscount(product) && (
                      <span className="text-xs text-gray-400 line-through">
                        ৳{getRetailOriginalPrice(product).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Wholesale Price Column (shows 1-49 price by default, or 50+ when selected) */}
                <div className="p-3 bg-gradient-to-br from-amber-100/90 to-amber-50/90 rounded-xl border-2 border-amber-400 space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-amber-950 font-black uppercase tracking-wider flex items-center gap-1">
                      {language === 'bn' ? 'পাইকারি মূল্য' : 'Wholesale Price'}
                      <span className="text-amber-800 font-extrabold font-mono">
                        ({selectedWholesaleTier === '50+' || quantity >= 50 ? '50+ pcs' : '1–49 pcs'})
                      </span>
                    </span>
                    <span className="text-[9px] font-extrabold bg-amber-500/20 text-amber-900 px-1.5 py-0.2 rounded">
                      {selectedWholesaleTier === '50+' || quantity >= 50 ? 'Tier 2' : 'Tier 1'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-xl sm:text-2xl font-black text-amber-950">
                      ৳{(selectedWholesaleTier === '50+' || quantity >= 50 ? wholesalePrice50Plus : wholesalePrice1_49).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-amber-800 font-sans font-bold">/ unit</span>
                  </div>
                </div>
              </div>

              {/* 50+ Price Button to toggle/show 50+ wholesale price */}
              <div className="pt-0.5 flex items-center gap-2">
                <button
                  type="button"
                  id="btn_toggle_wholesale_50plus"
                  onClick={() => {
                    if (selectedWholesaleTier === '50+') {
                      setSelectedWholesaleTier('1-49');
                      if (quantity >= 50) {
                        setQuantity(1);
                        setQuantityInput('1');
                      }
                    } else {
                      setSelectedWholesaleTier('50+');
                      if (quantity < 50) {
                        setQuantity(50);
                        setQuantityInput('50');
                      }
                    }
                  }}
                  className={`flex-1 py-2.5 px-3.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-between border cursor-pointer ${
                    selectedWholesaleTier === '50+' || quantity >= 50
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm ring-2 ring-amber-400/40'
                      : 'bg-white hover:bg-amber-100/70 text-amber-950 border-amber-300 shadow-2xs hover:border-amber-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={14} className={selectedWholesaleTier === '50+' || quantity >= 50 ? 'text-slate-950 fill-current' : 'text-amber-600'} />
                    <span>{language === 'bn' ? '৫০+ বাল্ক মূল্য (50+ Price)' : '50+ Bulk Tier Price'}</span>
                  </span>
                  <span className="font-mono font-black text-sm">
                    ৳{wholesalePrice50Plus.toLocaleString()}
                  </span>
                </button>

                {(selectedWholesaleTier === '50+' || quantity >= 50) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWholesaleTier('1-49');
                      setQuantity(1);
                      setQuantityInput('1');
                    }}
                    className="py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer shrink-0"
                    title="Reset to 1-49 Tier"
                  >
                    {language === 'bn' ? '১–৪৯ মূল্য' : '1–49 Tier'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-pink-50/15 rounded-2xl border border-pink-100/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Authorized Price</span>
                {hasRetailDiscount(product) ? (
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-2xl font-black text-[#E91E8C]">৳{getRetailPrice(product)}</span>
                    <span className="text-sm text-gray-400 line-through">৳{getRetailOriginalPrice(product)}</span>
                  </div>
                ) : (
                  <span className="text-2xl font-black text-slate-900 font-mono">৳{getRetailPrice(product)} BDT</span>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Availability</span>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  product.stock > 0 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-red-50 text-red-700 border-red-100'
                }`}>
                  {product.stock > 0 ? `In Stock (${product.stock} left)` : 'Out of Stock'}
                </span>
              </div>
            </div>
          )}

          {/* Skin Type Suitability */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Target Skin suitability</span>
            <div className="flex flex-wrap gap-1.5">
              {product.skinTypes && product.skinTypes.map(st => (
                <span key={st} className="text-[10px] bg-white border border-pink-100 text-pink-700 font-bold px-3 py-1 rounded-full shadow-sm">
                  {st} Skin
                </span>
              ))}
            </div>
          </div>

          {/* Detailed Description Tabs */}
          <div className="space-y-4 pt-2">
            <div className="flex border-b border-pink-50 text-xs font-bold">
              <button 
                onClick={() => setActiveTab('desc')}
                className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${activeTab === 'desc' ? 'border-[#E91E8C] text-[#E91E8C]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
              >
                Formula description
              </button>
              <button 
                onClick={() => setActiveTab('ingredients')}
                className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${activeTab === 'ingredients' ? 'border-[#E91E8C] text-[#E91E8C]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
              >
                Key Active Ingredients
              </button>
            </div>

            <div className="text-xs text-gray-600 leading-relaxed bg-pink-50/5 p-4 rounded-2xl border border-pink-100/30">
              {activeTab === 'desc' && (
                <p>{language === 'en' ? product.description : product.descriptionBN}</p>
              )}
              {activeTab === 'ingredients' && (
                <p>Features hyper-stabilized skincare concentrates designed specifically to calm skin cells and balance sebum hydration under tropical humidity. Free of parabens, phthalates, or synthesized mineral oils.</p>
              )}
            </div>
          </div>

          {/* Quantity Selector Section (Above Add to Basket CTA) */}
          <div id="product_quantity_selector_section" className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <label htmlFor="product-qty-input" className="flex items-center gap-1.5">
                <span>{language === 'bn' ? 'পরিমাণ (Quantity):' : 'Select Quantity:'}</span>
              </label>
              {product.stock > 0 && (
                <span className="text-[11px] text-slate-400 font-medium font-mono">
                  {language === 'bn' ? `স্টকে আছে: ${product.stock} টি` : `${product.stock} units available`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Stepper Controls with Typeable Input */}
              <div className="inline-flex items-center bg-pink-50/40 border-2 border-pink-100 rounded-2xl p-1 shadow-2xs">
                <button
                  type="button"
                  id="btn_decrement_qty"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="w-10 h-10 rounded-xl bg-white hover:bg-[#E91E8C] hover:text-white text-slate-700 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-700 flex items-center justify-center transition-all duration-150 border border-pink-100 shadow-2xs cursor-pointer active:scale-95 disabled:cursor-not-allowed"
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>

                <input
                  id="product-qty-input"
                  type="number"
                  min={1}
                  max={product.stock > 0 ? product.stock : 9999}
                  value={quantityInput}
                  onChange={(e) => handleQuantityInputChange(e.target.value)}
                  onBlur={handleQuantityInputBlur}
                  className="w-16 sm:w-20 text-center font-mono font-black text-base text-slate-900 bg-transparent focus:outline-none focus:ring-0 appearance-none [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label="Quantity"
                />

                <button
                  type="button"
                  id="btn_increment_qty"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={product.stock > 0 && quantity >= product.stock}
                  className="w-10 h-10 rounded-xl bg-white hover:bg-[#E91E8C] hover:text-white text-slate-700 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-700 flex items-center justify-center transition-all duration-150 border border-pink-100 shadow-2xs cursor-pointer active:scale-95 disabled:cursor-not-allowed"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Live Subtotal Display */}
              <div className="flex-1 bg-gradient-to-r from-pink-50/60 to-white p-2.5 px-3.5 rounded-2xl border border-pink-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500">
                  {language === 'bn' ? 'মোট আনুমানিক:' : 'Total Subtotal:'}
                </span>
                <span className="font-mono font-black text-base sm:text-lg text-[#E91E8C]">
                  ৳{(activeUnitPrice * quantity).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Add to Basket CTA */}
          <div className="space-y-3 pt-1">
            {profile?.wholesaleAccess && product && (
              <button
                type="button"
                id="btn_add_to_wholesale_cart"
                onClick={() => {
                  addToWholesaleCart(product, quantity);
                  navigate('/wholesale/checkout');
                }}
                disabled={product.stock <= 0}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-2xl cursor-pointer transition shadow-md shadow-amber-200/50 flex items-center justify-center gap-2.5 disabled:opacity-40 text-sm active:scale-[0.99]"
              >
                <Building2 size={18} />
                <span>
                  {language === 'bn' 
                    ? `হোলসেল কার্টে যোগ ও চেকআউট করুন (${quantity} পিস)` 
                    : `Order Wholesale & Proceed to Checkout (${quantity} pcs)`}
                </span>
              </button>
            )}

            <button
              onClick={() => addToCart(product, quantity)}
              disabled={product.stock <= 0}
              className="w-full py-4 bg-[#E91E8C] hover:bg-[#d0177c] text-white font-extrabold rounded-2xl cursor-pointer transition shadow-md shadow-pink-100 flex items-center justify-center gap-2.5 disabled:opacity-40 text-sm active:scale-[0.99]"
            >
              <ShoppingBag size={18} />
              <span>
                {product.stock > 0 
                  ? (quantity > 1 ? `Add ${quantity} to Skincare Basket` : "Add to Skincare Basket") 
                  : "Restocking soon"}
              </span>
            </button>

            {/* Order via WhatsApp CTA */}
            <button
              onClick={handleWhatsAppOrder}
              type="button"
              className="w-full py-3.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white font-extrabold rounded-2xl cursor-pointer transition shadow-md shadow-emerald-100 flex items-center justify-center gap-2.5 text-sm"
            >
              <MessageCircle size={19} className="fill-white" />
              <span>Order via WhatsApp ({quantity} pcs)</span>
            </button>
          </div>

          {/* Social Media Sharing & Brand Logo Section (Mobile Only: Below Order Buttons) */}
          <div id="product_social_share_section_mobile" className="lg:hidden bg-gradient-to-br from-pink-50/60 via-white to-pink-50/30 rounded-2xl p-4 border border-pink-100/90 shadow-2xs space-y-3 mt-4">
            {/* Top Brand Logo & Share Title */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-pink-100/60">
              <div className="flex items-center gap-2.5">
                {globalTheme.logoUrl && globalTheme.logoUrl.trim() !== '' ? (
                  <img 
                    src={globalTheme.logoUrl} 
                    alt={globalTheme.logoText || "Korean Skin Food BD"} 
                    className="h-7 w-auto object-contain shrink-0 rounded-sm" 
                  />
                ) : (
                  <div className="w-7 h-7 bg-gradient-to-tr from-[#E91E8C] to-[#FF62B2] rounded-lg flex items-center justify-center text-white shadow-xs shadow-pink-500/20 shrink-0">
                    <Wand2 size={13} />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-black text-gray-900 leading-tight tracking-tight">
                    {language === 'bn' ? 'পণ্যটি শেয়ার করুন' : 'Share This Product'}
                  </h4>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {language === 'bn' ? 'বন্ধু ও পরিবারের সাথে বিউটি সিক্রেট শেয়ার করুন' : 'Spread the authentic K-Beauty glow'}
                  </p>
                </div>
              </div>

              {/* Native share on mobile */}
              <button
                type="button"
                onClick={handleNativeShare}
                id="btn_product_native_share_mobile"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E91E8C] bg-pink-50 hover:bg-pink-100 px-2.5 py-1 rounded-full border border-pink-200 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                title="Share"
              >
                <Share2 size={12} />
                <span>{language === 'bn' ? 'শেয়ার' : 'Share'}</span>
              </button>
            </div>

            {/* Social Share Buttons Row */}
            <div className="flex items-center flex-wrap gap-2 pt-0.5">
              {/* Facebook */}
              <button
                type="button"
                id="btn_share_facebook_mobile"
                onClick={handleShareFacebook}
                title="Share on Facebook"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white border border-[#1877F2]/20 transition-all duration-200 shadow-2xs hover:scale-110 active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>

              {/* WhatsApp */}
              <button
                type="button"
                id="btn_share_whatsapp_mobile"
                onClick={handleShareWhatsAppSocial}
                title="Share on WhatsApp"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/25 transition-all duration-200 shadow-2xs hover:scale-110 active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
              </button>

              {/* Messenger */}
              <button
                type="button"
                id="btn_share_messenger_mobile"
                onClick={handleShareMessenger}
                title="Share on Messenger"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00B2FF]/10 via-[#006AFF]/10 to-[#E91E8C]/10 hover:from-[#00B2FF] hover:via-[#006AFF] hover:to-[#E91E8C] text-[#0084FF] hover:text-white border border-[#0084FF]/20 transition-all duration-200 shadow-2xs hover:scale-110 active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.077.299 2.222.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26 6.559-6.963 3.13 3.259 5.889-3.259-6.56 6.963z"/>
                </svg>
              </button>

              {/* Telegram */}
              <button
                type="button"
                id="btn_share_telegram_mobile"
                onClick={handleShareTelegram}
                title="Share on Telegram"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white border border-[#229ED9]/25 transition-all duration-200 shadow-2xs hover:scale-110 active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.562 8.161c-.18.868-1.503 6.985-2.184 10.316-.288 1.411-.849 1.637-1.393 1.685-1.183.104-2.079-.74-3.228-1.493-1.8-1.179-2.817-1.912-4.564-3.063-2.019-1.33-.71-2.062.44-3.257.301-.313 5.534-5.074 5.635-5.506.013-.054.024-.255-.096-.361-.12-.107-.297-.071-.425-.042-.181.041-3.067 1.95-8.66 5.727-.82.564-1.562.839-2.227.824-.733-.016-2.144-.416-3.193-.757-1.287-.419-2.31-.641-2.221-1.353.046-.371.558-.751 1.536-1.141 6.02-2.622 10.038-4.352 12.054-5.19 5.748-2.392 6.941-2.808 7.722-2.822.172-.003.555.04.804.242.21.171.269.402.296.564.028.163.064.526.035.795z"/>
                </svg>
              </button>

              {/* X / Twitter */}
              <button
                type="button"
                id="btn_share_twitter_mobile"
                onClick={handleShareTwitter}
                title="Post to X (Twitter)"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900/10 hover:bg-slate-950 text-slate-800 hover:text-white border border-slate-900/15 transition-all duration-200 shadow-2xs hover:scale-110 active:scale-95 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>

              {/* Pinterest */}
              <button
                type="button"
                id="btn_share_pinterest_mobile"
                onClick={handleSharePinterest}
                title="Pin on Pinterest"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#E60023]/10 hover:bg-[#E60023] text-[#E60023] hover:text-white border border-[#E60023]/20 transition-all duration-200 shadow-2xs hover:scale-110 active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.621 0 11.988-5.367 11.988-11.987C24.004 5.367 18.638 0 12.017 0z"/>
                </svg>
              </button>

              {/* Copy Link Button */}
              <button
                type="button"
                id="btn_copy_product_link_mobile"
                onClick={handleCopyProductLink}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold transition-all duration-200 shadow-2xs border cursor-pointer ${
                  copiedLink
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                    : 'bg-pink-50/80 hover:bg-[#E91E8C] text-[#E91E8C] hover:text-white border-pink-200/80 hover:border-[#E91E8C]'
                }`}
                title="Copy Product Link"
              >
                {copiedLink ? (
                  <>
                    <Check size={14} className="animate-in zoom-in" />
                    <span>{language === 'bn' ? 'কপি হয়েছে!' : 'Link Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>{language === 'bn' ? 'লিংক কপি' : 'Copy Link'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Verified Product Reviews & Rating Section */}
      <div id="reviews-section" className="bg-white p-6 md:p-8 rounded-[32px] border border-pink-100 shadow-sm space-y-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-pink-100 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold rounded-full uppercase tracking-wider flex items-center gap-1">
                <CheckCircle size={11} /> 100% Verified Buyer Feedback
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 mt-1">
              <MessageSquare className="text-[#E91E8C]" size={22} />
              <span>Customer Reviews & Photos</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Read authentic feedback and skin transformation photos submitted by verified buyers in Bangladesh.
            </p>
          </div>

          {/* Write Review Trigger Button */}
          <div>
            {user ? (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-5 py-2.5 bg-[#E91E8C] hover:bg-[#d0177c] text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Camera size={15} />
                <span>{showReviewForm ? 'Cancel Review' : 'Write a Verified Review'}</span>
              </button>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="px-4 py-2.5 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] border border-pink-200 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                <Lock size={14} />
                <span>Log in to Leave a Review</span>
              </button>
            )}
          </div>
        </div>

        {/* Success Toast */}
        {reviewSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-600" />
            <span>{reviewSuccessMsg}</span>
          </div>
        )}

        {/* Review Form (Collapsible) */}
        <AnimatePresence>
          {showReviewForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-pink-50/20 border border-pink-100 p-6 rounded-3xl space-y-6 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-pink-100/80 pb-3">
                <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                  <Wand2 size={16} className="text-[#E91E8C]" />
                  <span>Share Your Skincare Experience</span>
                </h4>

                {/* Verified Purchaser Status Indicator */}
                {isVerifiedPurchaser ? (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                    <CheckCircle size={12} /> Verified Purchaser
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                    <AlertCircle size={12} /> General Reviewer
                  </span>
                )}
              </div>

              {!isVerifiedPurchaser && (
                <div className="p-3 bg-amber-50/80 border border-amber-100 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Note:</strong> We couldn't find a past order for this product under your logged-in email ({user?.email}). Verified Purchaser badges are automatically awarded when you complete an order.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Star Rating Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Your Rating (1 to 5 Stars)
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-amber-400 hover:scale-125 transition transform cursor-pointer"
                      >
                        <Star 
                          size={24} 
                          fill={(hoverRating || newRating) >= star ? 'currentColor' : 'none'} 
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-gray-700 ml-2">
                      {hoverRating || newRating} / 5 Stars
                    </span>
                  </div>
                </div>

                {/* Review Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Review Headline / Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Noticeable glow in 2 weeks! Very lightweight"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-white text-xs text-gray-800 px-3.5 py-2.5 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/15 transition"
                  />
                </div>

                {/* Detailed Feedback Textarea */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Your Review & Skin Results <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe how the product feels on your skin, hydration, fragrance, finish, or tropical weather suitability..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full bg-white text-xs text-gray-800 p-3.5 border border-pink-100 rounded-xl outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/15 transition leading-relaxed resize-none"
                  />
                </div>

                {/* Photo Attachments Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Attach Photos (Product bottle, texture, or skin result)
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Upload File Button */}
                    <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-pink-200 bg-white hover:bg-pink-50/50 flex flex-col items-center justify-center cursor-pointer transition text-pink-500 gap-1 hover:border-[#E91E8C]">
                      <Upload size={18} />
                      <span className="text-[10px] font-bold">Add Photo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                      />
                    </label>

                    {/* Previews of attached photos */}
                    {newPhotos.map((photo, index) => (
                      <div key={index} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-pink-200 shadow-xs group">
                        <img src={photo} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-red-600 transition"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-4 py-2.5 text-xs text-gray-600 font-bold hover:bg-pink-50 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview || !newComment.trim()}
                    className="px-6 py-2.5 bg-[#E91E8C] hover:bg-[#d0177c] text-white font-bold text-xs rounded-xl transition shadow-md shadow-pink-100 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingReview ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    <span>{isSubmittingReview ? 'Posting Review...' : 'Submit Review'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rating Breakdown & Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-pink-50/20 rounded-3xl border border-pink-100">
          
          {/* Average Rating Block */}
          <div className="md:col-span-1 text-center md:text-left flex flex-col justify-center space-y-2 border-b md:border-b-0 md:border-r border-pink-100/80 pb-6 md:pb-0 md:pr-6">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Average Rating</span>
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <span className="text-4xl font-black text-gray-900 font-mono">{ratingStats.avg}</span>
              <span className="text-sm font-bold text-gray-400">/ 5.0</span>
            </div>
            
            <div className="flex text-amber-400 justify-center md:justify-start">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill={i < Math.floor(ratingStats.avg) ? "currentColor" : "none"} />
              ))}
            </div>

            <p className="text-xs text-gray-500 pt-1">
              Based on <strong className="text-gray-800">{ratingStats.total}</strong> authentic customer reviews ({ratingStats.verifiedCount} verified buyers)
            </p>
          </div>

          {/* Distribution Bars */}
          <div className="md:col-span-2 space-y-2 flex flex-col justify-center">
            {[5, 4, 3, 2, 1].map((star) => {
              const pct = ratingStats.distribution[star as 1|2|3|4|5] || 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 w-12 text-gray-600 font-bold shrink-0">
                    <span>{star}</span>
                    <Star size={11} className="text-amber-400" fill="currentColor" />
                  </div>
                  <div className="flex-1 h-2 bg-pink-100/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-400 to-[#E91E8C] rounded-full transition-all duration-500" 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-[11px] text-gray-500 font-bold shrink-0">{pct}%</span>
                </div>
              );
            })}
          </div>

        </div>

        {/* Filter & Sorting Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {/* Rating Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Filter size={12} /> Filter:
            </span>
            <button
              onClick={() => setFilterRating('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                filterRating === 'all' 
                  ? 'bg-[#E91E8C] text-white shadow-xs' 
                  : 'bg-pink-50/50 text-gray-600 hover:bg-pink-100'
              }`}
            >
              All ({reviews.length})
            </button>
            <button
              onClick={() => setFilterRating('photos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                filterRating === 'photos' 
                  ? 'bg-[#E91E8C] text-white shadow-xs' 
                  : 'bg-pink-50/50 text-gray-600 hover:bg-pink-100'
              }`}
            >
              <Camera size={13} />
              <span>With Photos ({ratingStats.withPhotosCount})</span>
            </button>
            {[5, 4, 3].map((star) => (
              <button
                key={star}
                onClick={() => setFilterRating(star)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  filterRating === star 
                    ? 'bg-[#E91E8C] text-white shadow-xs' 
                    : 'bg-pink-50/50 text-gray-600 hover:bg-pink-100'
                }`}
              >
                <span>{star}</span>
                <Star size={11} fill="currentColor" className="text-amber-400" />
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-pink-50/40 border border-pink-100 text-xs font-bold text-gray-800 rounded-xl px-3 py-1.5 outline-none focus:border-[#E91E8C]"
            >
              <option value="latest">Most Recent</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4 pt-2">
          {loadingReviews ? (
            <div className="py-12 text-center text-xs text-gray-400 font-medium space-y-2">
              <RefreshCw className="mx-auto animate-spin text-[#E91E8C]" size={20} />
              <p>Loading verified product reviews...</p>
            </div>
          ) : filteredAndSortedReviews.length === 0 ? (
            <div className="text-center py-12 bg-pink-50/10 rounded-2xl border border-dashed border-pink-200 space-y-3">
              <MessageSquare className="mx-auto text-pink-300" size={32} />
              <p className="text-xs font-extrabold text-gray-700">No reviews found matching the selected filter</p>
              <button
                onClick={() => { setFilterRating('all'); setSortBy('latest'); }}
                className="px-4 py-2 bg-pink-100 text-[#E91E8C] text-xs font-bold rounded-xl hover:bg-pink-200 transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-pink-100/70">
              {filteredAndSortedReviews.map((rev) => {
                const userVoted = user && rev.helpfulVoters?.includes(user.uid || user.email || '');

                return (
                  <div key={rev.id} className="py-5 first:pt-0 last:pb-0 space-y-3">
                    {/* Reviewer Meta */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-pink-100 text-[#E91E8C] font-extrabold text-xs flex items-center justify-center shrink-0">
                          {rev.userName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-gray-900">{rev.userName}</span>
                            {rev.isVerifiedPurchaser && (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[9px] font-extrabold rounded-full flex items-center gap-1">
                                <CheckCircle size={10} /> Verified Purchaser
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex text-amber-400">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={11} fill={i < Math.floor(rev.rating) ? "currentColor" : "none"} />
                              ))}
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">
                              {new Date(rev.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Helpful Button */}
                      <button
                        onClick={() => reviewService.toggleHelpful(rev.id, user?.uid || user?.email || 'anon-visitor')}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                          userVoted 
                            ? 'bg-pink-100 border-[#E91E8C] text-[#E91E8C]' 
                            : 'bg-white border-pink-100 text-gray-500 hover:border-pink-300'
                        }`}
                      >
                        <ThumbsUp size={12} className={userVoted ? 'fill-current' : ''} />
                        <span>Helpful ({rev.helpfulCount || 0})</span>
                      </button>
                    </div>

                    {/* Headline Title */}
                    {rev.title && (
                      <h5 className="font-extrabold text-xs text-gray-900">{rev.title}</h5>
                    )}

                    {/* Comment Body */}
                    <p className="text-xs text-gray-700 leading-relaxed bg-pink-50/10 p-3.5 rounded-2xl border border-pink-50">
                      {rev.comment}
                    </p>

                    {/* Photos Gallery */}
                    {rev.photos && rev.photos.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto pt-1">
                        {rev.photos.map((photoUrl, pIdx) => (
                          <div
                            key={pIdx}
                            onClick={() => setActiveLightboxImage(photoUrl)}
                            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-pink-200 cursor-pointer hover:opacity-90 transition shrink-0 group"
                          >
                            <img src={photoUrl} alt={`Review photo ${pIdx + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                              <ImageIcon size={16} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 4. Related products row */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Discover More K-Beauty</h3>
          <p className="text-xs text-gray-400 mt-0.5">Handpicked related skin nourishment formulations.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {relatedProducts.map((p) => (
            <ProductCard 
              key={p.id} 
              product={p} 
              onQuickView={(prod) => navigate(`/product/${prod.id}`)}
            />
          ))}
        </div>
      </div>

    </div>
  );
};
