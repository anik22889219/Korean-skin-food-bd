import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { productService } from '../services/productService';
import { createCreatorReel } from '../services/creatorReelService';
import { cloudinaryService } from '../services/cloudinaryService';
import { Product } from '../types';
import { 
  Upload, 
  Video, 
  Sparkles, 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle2, 
  X, 
  Search, 
  Tag, 
  FileVideo, 
  Globe, 
  Link as LinkIcon, 
  Loader2,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CreatorReelUploadPage: React.FC = () => {
  const { user, creatorProfile, isApprovedCreator } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [facebookPostUrl, setFacebookPostUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // UI states
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Load products catalog for tagging
  useEffect(() => {
    setProducts(productService.getProducts());
    const unsub = productService.subscribe((prods) => setProducts(prods));
    return () => unsub();
  }, []);

  // Facebook URL regex validator
  const isValidFbUrl = (url: string) => {
    if (!url.trim()) return false;
    const fbRegex = /^(https?:\/\/)?(www\.|m\.)?(facebook\.com|fb\.watch|fb\.gg)\/.+/i;
    return fbRegex.test(url.trim());
  };

  // Handle local video file selection
  const handleFileSelect = async (file: File) => {
    setErrorMsg(null);

    // Validate file type
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/m4v', 'video/x-msvideo', 'video/mkv'];
    if (!file.type.startsWith('video/') && !validVideoTypes.some(t => file.type.includes(t) || file.name.endsWith('.mp4') || file.name.endsWith('.mov'))) {
      setErrorMsg('Please select a valid video file (MP4, MOV, WebM, M4V).');
      return;
    }

    // Validate size (max 100MB)
    const MAX_SIZE_MB = 100;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`Video file is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is ${MAX_SIZE_MB}MB.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Simulate smooth upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + 15;
        });
      }, 250);

      // Read as Data URL
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;

        try {
          // Upload to Cloudinary media library service
          const cloudAsset = await cloudinaryService.uploadImage(file.name, dataUrl, 'video');
          clearInterval(progressInterval);
          setUploadProgress(100);

          setVideoUrl((cloudAsset as any).secure_url || cloudAsset.url || dataUrl);
          if (!thumbnailUrl) {
            // Generate poster thumbnail placeholder
            setThumbnailUrl('https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=60');
          }
          setIsUploading(false);
        } catch (err: any) {
          clearInterval(progressInterval);
          console.warn('Cloudinary upload fallback to data URL:', err);
          // Fallback to local Data URL for preview & storage if direct Cloudinary API key isn't configured
          setVideoUrl(dataUrl);
          setUploadProgress(100);
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        clearInterval(progressInterval);
        setErrorMsg('Failed to read video file.');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing video upload.');
      setIsUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const toggleProductTag = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      setSelectedProductIds(selectedProductIds.filter((id) => id !== productId));
    } else {
      if (selectedProductIds.length >= 5) {
        setErrorMsg('You can tag up to 5 featured products per reel.');
        return;
      }
      setSelectedProductIds([...selectedProductIds, productId]);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!productSearch) return true;
    const term = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isApprovedCreator) {
      setErrorMsg('Only approved creators can upload reels. Your creator account status is currently: ' + (creatorProfile?.status || 'unregistered'));
      return;
    }

    if (!videoUrl) {
      setErrorMsg('Please upload a video file or provide a video URL.');
      return;
    }

    if (!caption.trim()) {
      setErrorMsg('Please enter a caption for your reel.');
      return;
    }

    if (!facebookPostUrl.trim()) {
      setErrorMsg('Please enter your Facebook Reel or Post URL.');
      return;
    }

    if (!isValidFbUrl(facebookPostUrl)) {
      setErrorMsg('Please enter a valid Facebook URL (e.g. https://facebook.com/reel/123456 or https://fb.watch/...)');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedProds = products.filter((p) => selectedProductIds.includes(p.id));
      const productNames = selectedProds.map((p) => p.name);

      await createCreatorReel({
        creatorId: creatorProfile?.creatorId || user?.uid || '',
        creatorUserId: user?.uid || '',
        videoUrl,
        thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=60',
        caption: caption.trim(),
        description: description.trim(),
        facebookPostUrl: facebookPostUrl.trim(),
        productIds: selectedProductIds,
        productNames,
      });

      setSuccessMsg('Reel submitted successfully! It is now pending admin moderation.');
      setTimeout(() => {
        navigate('/creator/reels');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to submit reel:', err);
      setErrorMsg(err.message || 'Failed to submit reel. Please try again.');
      setIsSubmitting(false);
    }
  };

  // If user is not an approved creator
  if (!isApprovedCreator) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pt-4">
        <Link 
          to="/creator/dashboard" 
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </Link>

        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-300">
            <AlertCircle size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h1 className="text-xl font-black text-amber-950">Creator Approval Required</h1>
            <p className="text-xs text-amber-800 leading-relaxed">
              You must be an approved K-Beauty Creator to publish reels.
              Your current status is: <span className="font-extrabold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900">{creatorProfile?.status || 'Pending'}</span>
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/creator/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition"
            >
              <span>View Creator Profile Status</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <Link 
        to="/creator/reels" 
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft size={14} />
        <span>Back to My Reels</span>
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-pink-500/20">
              <Upload size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">Upload Skincare Reel</h1>
              <p className="text-xs text-slate-500">Publish your product demo or review video to earn community points</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase flex items-center gap-1">
            <CheckCircle2 size={12} /> Approved Creator
          </span>
        </div>

        {/* Notifications */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-start gap-2.5"
            >
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="block">{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-700">
                <X size={16} />
              </button>
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2.5"
            >
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Video File Selection & Cloudinary Storage */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              1. Video File Upload <span className="text-rose-500">*</span>
            </label>

            {!videoUrl ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-pink-500 bg-pink-50/50 scale-[1.01]' 
                    : 'border-slate-200 hover:border-pink-300 hover:bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,.mp4,.mov,.webm,.m4v"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 rounded-3xl bg-pink-100 text-pink-600 flex items-center justify-center mx-auto mb-3 border border-pink-200">
                  <FileVideo size={28} />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-extrabold text-slate-900 block">
                    Click to browse or drag & drop video file here
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Supports MP4, MOV, WebM (Max size: 100MB)
                  </p>
                </div>

                {isUploading && (
                  <div className="mt-4 max-w-xs mx-auto space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>Uploading to Media Server...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-pink-500 to-rose-600 transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 bg-slate-900 p-4 rounded-3xl border border-slate-800">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video 
                    src={videoUrl} 
                    controls 
                    className="w-full h-full max-h-64 object-contain"
                  />
                </div>

                <div className="flex items-center justify-between px-2 pt-1 text-xs">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 size={14} /> Video Upload Ready
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setVideoUrl('');
                      setUploadProgress(0);
                    }}
                    className="text-rose-400 hover:text-rose-300 text-[11px] font-extrabold cursor-pointer"
                  >
                    Change Video
                  </button>
                </div>
              </div>
            )}

            {/* Direct Video URL Fallback */}
            {!videoUrl && (
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Or Paste Direct Video CDN Link:
                </span>
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    placeholder="https://res.cloudinary.com/... or https://..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Caption & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                2. Reel Caption / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={120}
                placeholder="e.g. My 7-Step Glass Skin Routine with Anua Heartleaf Toner ✨"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              />
              <span className="text-[10px] text-slate-400 block text-right mt-1">
                {caption.length}/120 characters
              </span>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                Reel Description (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Add skin type recommendations, steps, or product benefits..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              />
            </div>
          </div>

          {/* Section 3: Facebook Post / Reel URL */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              3. Facebook Post / Reel Link <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500">
              Paste the public Facebook Reel or Post URL where this video is published.
            </p>
            <div className="relative">
              <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                required
                placeholder="https://facebook.com/reel/123456789 or https://fb.watch/..."
                value={facebookPostUrl}
                onChange={(e) => setFacebookPostUrl(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 ${
                  facebookPostUrl && !isValidFbUrl(facebookPostUrl)
                    ? 'border-rose-300 bg-rose-50/20 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:ring-pink-500/20 focus:border-pink-500'
                }`}
              />
            </div>
            {facebookPostUrl && !isValidFbUrl(facebookPostUrl) && (
              <span className="text-[11px] text-rose-600 font-bold block">
                Must be a valid Facebook Reel or Post link starting with facebook.com, fb.watch, or fb.gg
              </span>
            )}
          </div>

          {/* Section 4: Tag Featured Skincare Products */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              4. Tag Featured Skincare Products (Optional)
            </label>

            {/* Selected Tags Pills */}
            {selectedProductIds.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-pink-50/50 border border-pink-100 rounded-2xl">
                {selectedProductIds.map((pid) => {
                  const prod = products.find((p) => p.id === pid);
                  if (!prod) return null;
                  return (
                    <span 
                      key={pid}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-pink-200 text-pink-900 text-xs font-bold shadow-xs"
                    >
                      <Tag size={12} className="text-pink-600" />
                      <span>{prod.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleProductTag(pid)}
                        className="text-pink-400 hover:text-pink-700 ml-1 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Product Search Filter */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog products to tag..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              />
            </div>

            {/* Product Selector Grid */}
            <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-white">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">No products match search term</div>
              ) : (
                filteredProducts.slice(0, 8).map((p) => {
                  const isTagged = selectedProductIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleProductTag(p.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition text-xs ${
                        isTagged ? 'bg-pink-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                        <div className="truncate">
                          <span className="font-bold text-slate-800 block truncate">{p.name}</span>
                          <span className="text-[10px] text-slate-400 block">{p.brand} · ৳{p.price}</span>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                        isTagged ? 'bg-pink-600 border-pink-600 text-white' : 'border-slate-300'
                      }`}>
                        {isTagged && <CheckCircle2 size={12} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting || isUploading || !videoUrl || !caption.trim() || !isValidFbUrl(facebookPostUrl)}
              className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer transition ${
                isSubmitting || isUploading || !videoUrl || !caption.trim() || !isValidFbUrl(facebookPostUrl)
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 hover:from-pink-700 hover:to-rose-700 shadow-pink-600/25 scale-[1.01]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Submitting Reel to Admin Queue...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Submit Reel for Admin Moderation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
