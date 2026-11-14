import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { productService } from '../services/productService';
import {
  createCreatorReel,
  subscribeToCreatorReels,
  getCreatorUploadsTodayCount,
  DAILY_CREATOR_UPLOAD_LIMIT,
} from '../services/creatorReelService';
import {
  getCreatorDailyUploadQuota,
  uploadVideoToYouTube,
  CreatorYouTubeQuota,
} from '../services/youtubeService';
import { Product } from '../types';
import {
  Upload,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  X,
  Search,
  Tag,
  FileVideo,
  Globe,
  Loader2,
  Film,
  ShieldCheck,
  RefreshCw,
  Youtube,
  Clock,
  Lock,
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
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Local selected video file + metadata
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [localVideoMeta, setLocalVideoMeta] = useState<{
    duration: number;
    width: number;
    height: number;
  }>({ duration: 0, width: 0, height: 0 });

  // Daily Quota & YouTube Connection state
  const [quota, setQuota] = useState<CreatorYouTubeQuota | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [firestoreUsedToday, setFirestoreUsedToday] = useState<number>(0);
  const [loadingQuota, setLoadingQuota] = useState<boolean>(true);

  // UI states
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadPhase, setUploadPhase] = useState<
    'idle' | 'initializing' | 'uploading' | 'processing' | 'saving' | 'completed' | 'error'
  >('idle');
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

  // Load daily upload quota from server + live Firestore count
  useEffect(() => {
    if (!user) {
      setLoadingQuota(false);
      return;
    }

    let active = true;
    setLoadingQuota(true);
    setQuotaError(null);

    getCreatorDailyUploadQuota()
      .then((q) => {
        if (active) setQuota(q);
      })
      .catch((err) => {
        console.warn('Could not fetch YouTube upload quota:', err);
        if (active) setQuotaError(err?.message || 'Could not verify YouTube connection status.');
      })
      .finally(() => {
        if (active) setLoadingQuota(false);
      });

    const unsubReels = subscribeToCreatorReels(user.uid, (reels) => {
      if (active) {
        setFirestoreUsedToday(getCreatorUploadsTodayCount(reels));
      }
    });

    return () => {
      active = false;
      unsubReels();
    };
  }, [user]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const effectiveUsedToday = Math.max(quota?.usedToday || 0, firestoreUsedToday);
  const dailyLimitReached = effectiveUsedToday >= DAILY_CREATOR_UPLOAD_LIMIT;
  const youtubeConnected = quota ? quota.youtubeConnected : !loadingQuota && !quotaError;

  // Optional Facebook URL regex validator
  const isValidFbUrl = (url: string) => {
    if (!url.trim()) return true; // optional
    const fbRegex = /^(https?:\/\/)?(www\.|m\.)?(facebook\.com|fb\.watch|fb\.gg)\/.+/i;
    return fbRegex.test(url.trim());
  };

  // Helper to extract local video dimensions & duration from File
  const probeVideoFile = (file: File): Promise<{ duration: number; width: number; height: number }> => {
    return new Promise((resolve) => {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      const tempUrl = URL.createObjectURL(file);
      tempVideo.src = tempUrl;

      tempVideo.onloadedmetadata = () => {
        URL.revokeObjectURL(tempUrl);
        resolve({
          duration: Math.round(tempVideo.duration || 0),
          width: tempVideo.videoWidth || 0,
          height: tempVideo.videoHeight || 0,
        });
      };

      tempVideo.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        resolve({ duration: 0, width: 0, height: 0 });
      };
    });
  };

  // Handle local video file selection (preview only; actual YouTube upload happens on submit)
  const handleFileSelect = async (file: File) => {
    setErrorMsg(null);

    if (dailyLimitReached) {
      setErrorMsg('Daily limit reached: You can upload only 1 video per day. Please try again tomorrow.');
      return;
    }

    const validVideoTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/m4v',
      'video/x-msvideo',
      'video/mkv',
    ];
    const isVideoType =
      file.type.startsWith('video/') ||
      validVideoTypes.some(
        (t) =>
          file.type.includes(t) ||
          file.name.toLowerCase().endsWith('.mp4') ||
          file.name.toLowerCase().endsWith('.mov') ||
          file.name.toLowerCase().endsWith('.webm') ||
          file.name.toLowerCase().endsWith('.m4v')
      );

    if (!isVideoType) {
      setErrorMsg('Please select a valid video file format (MP4, MOV, WebM, M4V).');
      return;
    }

    // Validate size (max 150MB)
    const MAX_SIZE_MB = 150;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMsg(
        `Video file is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is ${MAX_SIZE_MB}MB.`
      );
      return;
    }

    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    const previewObjUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(previewObjUrl);
    setSelectedFile(file);
    setUploadPhase('idle');
    setUploadProgress(0);

    const meta = await probeVideoFile(file);
    setLocalVideoMeta(meta);
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
    return (
      p.name.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isApprovedCreator) {
      setErrorMsg(
        'Only approved creators can upload videos. Your creator account status is currently: ' +
          (creatorProfile?.status || 'unregistered')
      );
      return;
    }

    if (dailyLimitReached) {
      setErrorMsg('Daily upload limit reached (1 video/day). You can upload again tomorrow.');
      return;
    }

    if (!youtubeConnected) {
      setErrorMsg('YouTube channel is not connected yet. Please ask the store admin to connect YouTube in Admin -> Creator Hub.');
      return;
    }

    if (!selectedFile) {
      setErrorMsg('Please select a video file to upload to YouTube.');
      return;
    }

    if (!caption.trim()) {
      setErrorMsg('Please enter a video title / caption.');
      return;
    }

    if (facebookPostUrl.trim() && !isValidFbUrl(facebookPostUrl)) {
      setErrorMsg('Please enter a valid Facebook URL or leave it blank.');
      return;
    }

    setIsSubmitting(true);
    setUploadPhase('initializing');
    setUploadProgress(0);

    try {
      const selectedProds = products.filter((p) => selectedProductIds.includes(p.id));
      const productNames = selectedProds.map((p) => p.name);

      // Step 1: Upload directly to Admin's connected YouTube channel (Unpublished/Unlisted)
      const ytResult = await uploadVideoToYouTube(
        selectedFile,
        {
          title: caption.trim(),
          description: [
            description.trim(),
            productNames.length > 0 ? `Featured Products: ${productNames.join(', ')}` : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
          tags: ['kbeauty', 'skincare', 'koreanskinfoodbd', ...productNames.slice(0, 5)],
        },
        (percent, phase) => {
          setUploadProgress(percent);
          setUploadPhase(phase);
        }
      );

      // Step 2: Save reel entry in Firestore (status = 'pending', youtubePrivacyStatus = 'unlisted' | 'private')
      setUploadPhase('saving');
      await createCreatorReel({
        creatorId: creatorProfile?.creatorId || user?.uid || '',
        creatorUserId: user?.uid || '',
        videoUrl: ytResult.videoUrl,
        thumbnailUrl: ytResult.thumbnailUrl,
        uploadProvider: 'youtube',
        youtubeVideoId: ytResult.youtubeVideoId,
        youtubePrivacyStatus: ytResult.privacyStatus,
        youtubeChannelId: ytResult.channelId,
        youtubeChannelTitle: ytResult.channelTitle,
        resourceType: 'video',
        duration: localVideoMeta.duration,
        width: localVideoMeta.width,
        height: localVideoMeta.height,
        videoMetadata: {
          bytes: selectedFile.size,
          mimeType: selectedFile.type,
          aspectRatio:
            localVideoMeta.width && localVideoMeta.height
              ? `${localVideoMeta.width}:${localVideoMeta.height}`
              : undefined,
        },
        caption: caption.trim(),
        description: description.trim(),
        facebookPostUrl: facebookPostUrl.trim() || undefined,
        productIds: selectedProductIds,
        productNames,
      });

      setUploadPhase('completed');
      setUploadProgress(100);
      setSuccessMsg(
        'Video uploaded to YouTube (Unpublished) and submitted for Admin approval! Once approved, it will go Public on YouTube.'
      );
      setTimeout(() => {
        navigate('/creator/reels');
      }, 1800);
    } catch (err: any) {
      console.error('Failed to upload video to YouTube:', err);
      setUploadPhase('error');
      setErrorMsg(err.message || 'Failed to upload video to YouTube. Please try again.');
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
              You must be an approved K-Beauty Creator to upload videos. Your current status is:{' '}
              <span className="font-extrabold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                {creatorProfile?.status || 'Pending'}
              </span>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/20">
              <Youtube size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">Upload Creator Video to YouTube</h1>
              <p className="text-xs text-slate-500">
                Uploads directly to the store YouTube channel (unpublished until Admin approves)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase flex items-center gap-1 ${
                dailyLimitReached
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              <Clock size={12} /> Daily Limit: {effectiveUsedToday}/{DAILY_CREATOR_UPLOAD_LIMIT}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase flex items-center gap-1">
              <CheckCircle2 size={12} /> Approved Creator
            </span>
          </div>
        </div>

        {/* Daily Limit Banner */}
        {!loadingQuota && dailyLimitReached && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900">
            <Lock size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-black">Daily Upload Limit Reached (1 Video / Day)</p>
              <p className="text-rose-700 leading-relaxed">
                You have already uploaded 1 video today ({quota?.dhakaDate || 'today'}). Each creator can upload 1 video per day. Please come back tomorrow!
              </p>
            </div>
          </div>
        )}

        {/* YouTube Not Connected Warning */}
        {!loadingQuota && (!youtubeConnected || quotaError) && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-black">YouTube Channel Connection Issue</p>
              <p className="text-amber-800 leading-relaxed">
                {quotaError
                  ? quotaError
                  : quota?.tokenError
                  ? 'The store YouTube authorization needs to be reconnected by an Admin under Admin → Creator Hub before new videos can be uploaded.'
                  : 'The store YouTube channel is not connected yet. Please contact an Admin to connect the YouTube channel under Admin → Creator Hub.'}
              </p>
            </div>
          </div>
        )}

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
              <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-700">
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
          {/* Section 1: Local Video Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                1. Select Video File (Direct to YouTube) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600" /> Unpublished until Admin Approval
              </span>
            </div>

            {!selectedFile ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => {
                  if (!dailyLimitReached && youtubeConnected) {
                    fileInputRef.current?.click();
                  }
                }}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
                  dailyLimitReached || !youtubeConnected
                    ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                    : dragActive
                    ? 'border-red-500 bg-red-50/50 scale-[1.01] cursor-pointer'
                    : 'border-slate-200 hover:border-red-300 hover:bg-slate-50/50 cursor-pointer'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  disabled={dailyLimitReached || !youtubeConnected}
                  accept="video/*,.mp4,.mov,.webm,.m4v"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 border border-red-200">
                  <FileVideo size={28} />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-extrabold text-slate-900 block">
                    {dailyLimitReached
                      ? 'Daily upload limit reached (1/1 used today)'
                      : 'Click to browse or drag & drop video file here'}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Uploads directly to YouTube (MP4, MOV, WebM · Max 150MB · 1 video/day)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-900 p-4 rounded-3xl border border-slate-800">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  {localPreviewUrl && (
                    <video
                      src={localPreviewUrl}
                      controls
                      className="w-full h-full max-h-64 object-contain"
                    />
                  )}
                </div>

                {/* Selected Video Info */}
                <div className="bg-slate-800/80 rounded-2xl p-3 text-[11px] text-slate-300 space-y-1.5 border border-slate-700">
                  <div className="flex items-center justify-between font-bold text-white">
                    <span className="flex items-center gap-1.5 text-emerald-400 truncate">
                      <Film size={14} /> {selectedFile.name}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-slate-400">
                    <div>
                      <span className="block text-slate-500">Duration:</span>
                      <span className="font-bold text-slate-200">
                        {localVideoMeta.duration ? `${localVideoMeta.duration}s` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Resolution:</span>
                      <span className="font-bold text-slate-200">
                        {localVideoMeta.width && localVideoMeta.height
                          ? `${localVideoMeta.width}x${localVideoMeta.height}`
                          : 'Standard'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Initial YouTube Status:</span>
                      <span className="font-bold text-amber-300 uppercase">
                        Unpublished ({quota?.initialPrivacy || 'unlisted'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Upload Progress Bar during submission */}
                {(uploadPhase === 'initializing' ||
                  uploadPhase === 'uploading' ||
                  uploadPhase === 'processing' ||
                  uploadPhase === 'saving') && (
                  <div className="bg-slate-800 rounded-2xl p-4 space-y-2 border border-red-500/30">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-white">
                      <span className="flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-red-400" />
                        {uploadPhase === 'initializing'
                          ? 'Preparing YouTube upload session...'
                          : uploadPhase === 'uploading'
                          ? `Uploading directly to YouTube... ${uploadProgress}%`
                          : uploadPhase === 'processing'
                          ? 'YouTube finalizing video...'
                          : 'Saving to Admin moderation queue...'}
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(uploadProgress, 5)}%` }}
                      />
                    </div>
                  </div>
                )}

                {!isSubmitting && (
                  <div className="flex items-center justify-between px-2 pt-1 text-xs">
                    <span className="text-slate-400 text-[10px]">
                      Target Channel: {quota?.channelTitle || 'Official Store Channel'}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        if (localPreviewUrl) {
                          URL.revokeObjectURL(localPreviewUrl);
                        }
                        setLocalPreviewUrl(null);
                        setSelectedFile(null);
                        setLocalVideoMeta({ duration: 0, width: 0, height: 0 });
                        setUploadProgress(0);
                        setUploadPhase('idle');
                      }}
                      className="text-rose-400 hover:text-rose-300 text-[11px] font-extrabold cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw size={12} />
                      <span>Change Video</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Caption & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                2. Video Title / Caption <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                disabled={isSubmitting || dailyLimitReached}
                placeholder="e.g. My 7-Step Glass Skin Routine with Anua Heartleaf Toner ✨"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
              <span className="text-[10px] text-slate-400 block text-right mt-1">
                {caption.length}/100 characters
              </span>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1">
                Video Description (Optional)
              </label>
              <textarea
                rows={3}
                disabled={isSubmitting || dailyLimitReached}
                placeholder="Add skin type recommendations, steps, or product benefits..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>

          {/* Section 3: Optional Facebook Link */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              3. Facebook Post / Reel Link (Optional)
            </label>
            <p className="text-[11px] text-slate-500">
              If you also posted this reel on Facebook, paste the URL here (optional).
            </p>
            <div className="relative">
              <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                disabled={isSubmitting || dailyLimitReached}
                placeholder="https://facebook.com/reel/123456789 (optional)"
                value={facebookPostUrl}
                onChange={(e) => setFacebookPostUrl(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 ${
                  facebookPostUrl && !isValidFbUrl(facebookPostUrl)
                    ? 'border-rose-300 bg-rose-50/20 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:ring-red-500/20 focus:border-red-500'
                }`}
              />
            </div>
            {facebookPostUrl && !isValidFbUrl(facebookPostUrl) && (
              <span className="text-[11px] text-rose-600 font-bold block">
                Must be a valid Facebook link starting with facebook.com, fb.watch, or fb.gg
              </span>
            )}
          </div>

          {/* Section 4: Tag Featured Skincare Products */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              4. Tag Featured Skincare Products (Optional)
            </label>

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
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div className="truncate">
                          <span className="font-bold text-slate-800 block truncate">{p.name}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {p.brand} · ৳{p.price}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                          isTagged ? 'bg-pink-600 border-pink-600 text-white' : 'border-slate-300'
                        }`}
                      >
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
              disabled={
                isSubmitting ||
                dailyLimitReached ||
                !youtubeConnected ||
                !selectedFile ||
                !caption.trim() ||
                !isValidFbUrl(facebookPostUrl)
              }
              className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer transition ${
                isSubmitting ||
                dailyLimitReached ||
                !youtubeConnected ||
                !selectedFile ||
                !caption.trim() ||
                !isValidFbUrl(facebookPostUrl)
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-700 hover:to-pink-700 shadow-red-600/25 scale-[1.01]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Uploading to YouTube & Submitting...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Upload to YouTube (Unpublished) & Submit for Approval</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
