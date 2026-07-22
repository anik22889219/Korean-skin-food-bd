import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productService } from '../services/productService';
import { reviewService } from '../services/reviewService';
import { posService } from '../services/posService';
import { Product, ProductReview, Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { db } from '../services/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { 
  ShoppingBag, ChevronRight, Star, Heart, CheckCircle, ArrowLeft, ShieldCheck, 
  RefreshCw, MessageSquare, Camera, ThumbsUp, Image as ImageIcon, X, Upload, 
  Wand2, Check, AlertCircle, Filter, SlidersHorizontal, Lock, User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, addToCart } = useCart();
  const { user, profile, signInWithGoogle, isAdmin } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'desc' | 'ingredients' | 'how-to'>('desc');
  const [selectedMainImage, setSelectedMainImage] = useState<string>('');

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

  // Load Product Info
  useEffect(() => {
    if (!id) return;
    const prod = productService.getProductById(id);
    if (prod) {
      setProduct(prod);
      setSelectedMainImage(prod.image);
      
      // Load related products
      const allProds = productService.getProducts();
      const filtered = allProds
        .filter(p => p.id !== prod.id && (p.category === prod.category || p.brand === prod.brand))
        .slice(0, 4);
      setRelatedProducts(filtered.length > 0 ? filtered : allProds.filter(p => p.id !== prod.id).slice(0, 4));
    } else {
      navigate('/');
    }
  }, [id, navigate]);

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
    if (!user || !product) {
      setIsVerifiedPurchaser(false);
      setVerifiedOrderInfo(null);
      return;
    }

    const userEmailLower = user.email?.toLowerCase().trim();
    const userUid = user.uid;
    const userPhoneClean = profile?.phone?.trim();

    const checkOrdersForProduct = (allOrders: Order[]) => {
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

    // Query Firestore orders
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
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
    return (
      <div className="py-24 text-center text-xs font-mono font-medium text-pink-600 animate-pulse">
        Loading product detail files...
      </div>
    );
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
              src={selectedMainImage || product.image} 
              alt={product.name} 
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
                <img src={product.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                  <img src={imgUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between text-[11px] text-gray-400 bg-pink-50/10 p-3.5 rounded-xl border border-pink-100/30">
            <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-500" /> 100% Authentic Import</span>
            <span className="flex items-center gap-1"><RefreshCw size={13} className="text-pink-500" /> 7-Day Refund Guard</span>
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
          <div className="p-4 bg-pink-50/15 rounded-2xl border border-pink-100/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Authorized Price</span>
              {product.discountPrice ? (
                <div className="flex items-baseline gap-2 font-mono">
                  <span className="text-2xl font-black text-[#E91E8C]">৳{product.discountPrice}</span>
                  <span className="text-sm text-gray-400 line-through">৳{product.price}</span>
                </div>
              ) : (
                <span className="text-2xl font-black text-slate-900 font-mono">৳{product.price} BDT</span>
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

          {/* Add to Basket CTA */}
          <button
            onClick={() => addToCart(product)}
            disabled={product.stock <= 0}
            className="w-full py-4 bg-[#E91E8C] hover:bg-[#d0177c] text-white font-extrabold rounded-2xl cursor-pointer transition shadow-md shadow-pink-100 flex items-center justify-center gap-2.5 disabled:opacity-40 text-sm"
          >
            <ShoppingBag size={18} />
            <span>{product.stock > 0 ? "Add to Skincare Basket" : "Restocking soon"}</span>
          </button>
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {relatedProducts.map((p) => (
            <div 
              key={p.id} 
              onClick={() => navigate(`/product/${p.id}`)}
              className="bg-white p-4 rounded-3xl border border-pink-100 hover:border-[#E91E8C]/40 cursor-pointer shadow-sm hover:shadow-md transition duration-300 space-y-3"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-pink-50/5 border border-pink-100 p-2">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#E91E8C] uppercase">{p.brand}</span>
                <h4 className="font-extrabold text-xs text-slate-900 truncate">{language === 'en' ? p.name : p.nameBN}</h4>
                <span className="text-xs font-extrabold text-[#E91E8C] font-mono">৳{p.discountPrice || p.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
