import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { themeService } from '../services/themeService';
import { Product } from '../types';
import { HomeThemeSettings, ReelItem } from '../types/theme';
import { MediaLibraryModal } from './MediaLibraryModal';
import { 
  Wand2, Image as ImageIcon, Copy, Check, MessageSquare, ThumbsUp, 
  Share2, Award, Sun, Heart, Smile, Plus, Trash2, Video, Save, 
  ExternalLink, Play, RefreshCw, Volume2, VolumeX, Sparkles, Globe, Film,
  Eye, X, Clock, Calendar, TrendingUp, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const getShelfLifeInfo = (createdAtStr?: string) => {
  if (!createdAtStr) return { days: 0, label: 'Today', badgeColor: 'bg-emerald-500 text-white', badgeLight: 'bg-emerald-50 text-emerald-800 border-emerald-200', status: 'Fresh Content' };
  
  const createdDate = new Date(createdAtStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (isNaN(diffDays)) {
    return { days: 0, label: 'Today', badgeColor: 'bg-emerald-500 text-white', badgeLight: 'bg-emerald-50 text-emerald-800 border-emerald-200', status: 'Fresh Content' };
  }

  if (diffDays <= 7) {
    return { days: diffDays, label: diffDays === 0 ? 'Today' : `${diffDays}d active`, badgeColor: 'bg-emerald-500 text-white', badgeLight: 'bg-emerald-50 text-emerald-800 border-emerald-200', status: 'Fresh Content' };
  } else if (diffDays <= 30) {
    return { days: diffDays, label: `${diffDays}d active`, badgeColor: 'bg-amber-500 text-white', badgeLight: 'bg-amber-50 text-amber-800 border-amber-200', status: 'Active Promo' };
  } else {
    return { days: diffDays, label: `${diffDays}d active`, badgeColor: 'bg-rose-500 text-white', badgeLight: 'bg-rose-50 text-rose-800 border-rose-200', status: 'Shelf-Life Expiring' };
  }
};

export const formatCompactNumber = (num?: number) => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const ReelPreviewCard: React.FC<{ reel: ReelItem }> = ({ reel }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const shelfLife = getShelfLifeInfo(reel.createdAt);

  const isFacebookReel = Boolean(
    reel.videoUrl && (
      reel.videoUrl.includes('facebook.com') || reel.videoUrl.includes('fb.watch')
    )
  );

  const isInstagramReel = Boolean(
    reel.videoUrl && (
      reel.videoUrl.includes('instagram.com') || reel.videoUrl.includes('instagr.am')
    )
  );

  const isYouTube = Boolean(
    reel.videoUrl && (
      reel.videoUrl.includes('youtube.com') || reel.videoUrl.includes('youtu.be')
    )
  );

  const isDirectVideo = Boolean(
    reel.videoUrl && (
      reel.videoUrl.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i) || reel.videoUrl.includes('cloudinary') || reel.videoUrl.endsWith('.mp4')
    )
  );

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-pink-100 overflow-hidden shadow-xs space-y-3 p-3 group">
      <div 
        className="relative aspect-[9/13] rounded-xl overflow-hidden bg-slate-900 cursor-pointer"
        onClick={isDirectVideo ? togglePlay : undefined}
      >
        {isDirectVideo ? (
          <>
            <video
              ref={videoRef}
              src={reel.videoUrl}
              poster={reel.coverUrl}
              autoPlay
              muted={isMuted}
              loop
              playsInline
              className="w-full h-full object-cover"
            />
            <button
              onClick={toggleMute}
              type="button"
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md hover:bg-[#E91E8C] transition"
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                <div className="w-12 h-12 rounded-full bg-[#E91E8C] text-white flex items-center justify-center shadow-lg">
                  <Play size={22} className="ml-0.5" />
                </div>
              </div>
            )}
          </>
        ) : isYouTube ? (
          <iframe
            src={reel.videoUrl}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="relative w-full h-full group/reel">
            <img 
              src={reel.coverUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop'} 
              alt={reel.title} 
              className="w-full h-full object-cover group-hover/reel:scale-105 transition duration-500" 
              referrerPolicy="no-referrer" 
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            {/* Top Badges: Platform + Shelf Life */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-1">
              <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold rounded-full border border-white/20 flex items-center gap-1">
                {isFacebookReel ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>Facebook Reel</span>
                  </>
                ) : isInstagramReel ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                    <span>Instagram Reel</span>
                  </>
                ) : (
                  <>
                    <Play size={10} className="fill-current text-[#E91E8C]" />
                    <span>Video Highlight</span>
                  </>
                )}
              </span>

              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black backdrop-blur-md shadow-xs flex items-center gap-1 ${shelfLife.badgeColor}`}>
                <Clock size={10} />
                <span>{shelfLife.label}</span>
              </span>
            </div>

            {/* Engagement Metrics Bottom Overlay */}
            <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-white/90 text-[10px] font-bold bg-black/50 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10">
              <div className="flex items-center gap-1">
                <Eye size={12} className="text-pink-400" />
                <span>{formatCompactNumber(reel.viewsCount)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart size={12} className="text-rose-400 fill-rose-400/30" />
                <span>{formatCompactNumber(reel.likesCount)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Share2 size={12} className="text-blue-400" />
                <span>{formatCompactNumber(reel.sharesCount)}</span>
              </div>
            </div>

            {(reel.postUrl || reel.videoUrl) && (
              <a
                href={reel.postUrl || reel.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 group/btn"
              >
                <div className="w-14 h-14 rounded-full bg-[#E91E8C] text-white flex items-center justify-center shadow-xl group-hover/btn:scale-110 group-hover/btn:bg-[#FF4B91] transition duration-300">
                  <Play size={24} className="ml-1 fill-current" />
                </div>
                <span className="mt-2 text-[10px] font-extrabold bg-black/60 px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm group-hover/btn:bg-[#E91E8C] transition flex items-center gap-1">
                  <span>{reel.postUrl ? 'View Facebook Post' : 'Watch Reel'}</span>
                  <ExternalLink size={10} />
                </span>
              </a>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between px-1">
          <a
            href={reel.postUrl || reel.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-extrabold text-slate-900 hover:text-[#E91E8C] transition line-clamp-1"
          >
            {reel.title || 'Social Post'}
          </a>
          {(reel.postUrl || reel.videoUrl) && (
            <a
              href={reel.postUrl || reel.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-[#E91E8C] font-bold hover:underline flex items-center gap-0.5 shrink-0 ml-1"
            >
              <span>{reel.postUrl ? 'View Post' : 'Watch'}</span>
              <ExternalLink size={10} />
            </a>
          )}
        </div>
        {reel.createdAt && (
          <div className="text-[10px] text-slate-500 px-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Calendar size={10} className="text-slate-400" />
              <span>Added {reel.createdAt}</span>
            </span>
            <span className="font-extrabold text-slate-600">{shelfLife.status}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const AdminSocial: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Settings
  const [tone, setTone] = useState<'korean_vibes' | 'dermatology' | 'weather_promo' | 'influencer'>('korean_vibes');
  const [postCopy, setPostCopy] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Firestore Theme & Reels Management
  const [theme, setTheme] = useState<HomeThemeSettings>(themeService.getHomeTheme());
  const [isSavingReels, setIsSavingReels] = useState(false);
  const [reelsSaveSuccess, setReelsSaveSuccess] = useState(false);
  const [mediaPickerIndex, setMediaPickerIndex] = useState<number | null>(null);

  // Add Reel Popup Modal states
  const [isAddReelModalOpen, setIsAddReelModalOpen] = useState(false);
  const [addModalMediaPickerOpen, setAddModalMediaPickerOpen] = useState(false);
  const [newReelForm, setNewReelForm] = useState<Partial<ReelItem>>({
    title: '',
    videoUrl: '',
    postUrl: '',
    coverUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop',
    createdAt: new Date().toISOString().split('T')[0],
    viewsCount: 0,
    likesCount: 0,
    sharesCount: 0
  });

  // Live Reel Preview States
  const [previewReel, setPreviewReel] = useState<ReelItem | null>(null);
  const [showAllReelsPreview, setShowAllReelsPreview] = useState(false);

  useEffect(() => {
    const loaded = productService.getProducts();
    setProducts(loaded);
    if (loaded.length > 0) {
      setSelectedProduct(loaded[0]);
      generateDefaultPost(loaded[0], 'korean_vibes');
    }

    const unsub = themeService.subscribe((updatedTheme) => {
      setTheme(updatedTheme);
    });
    return () => unsub();
  }, []);

  const generateDefaultPost = (p: Product, t: typeof tone) => {
    switch (t) {
      case 'korean_vibes':
        setPostCopy(`🌸 K-Beauty Secret Alert! 🌸\n\nBring the effortless, glowing Glass Skin trend straight from Seoul to Dhaka! The authentic [${p.brand}] ${p.name} is now available in Bangladesh.\n\n💧 Lightweight hydration\n🌟 Minimizes pores and feeds skin nutrients\n🛡️ 100% Imported & Genuine\n\n🛍️ Shop now on cash on delivery across Bangladesh! Special offer: ৳${p.discountPrice || p.price} BDT only.\n\n#KBeautyBangladesh #GlassSkin #KoreanSkincare #AuthenticCosmetics`);
        break;
      case 'dermatology':
        setPostCopy(`🔬 Clinically Audited Formulation 🔬\n\nDealing with skin barrier irritation under Dhaka's pollution? It's time to let science restore your skin cells. The [${p.brand}] ${p.name} is rich in cell-repairing active complexes.\n\n👩‍⚕️ Recommended for: Dry, sensitive, and compromised skin barriers.\n✨ Key Benefits: Deep cellular hydration, balanced pH levels, and natural barrier protection.\n\n✅ Buy 100% Genuine Korean Cosmetics. Tap link to view complete ingredients profile.\n\n#DermatologyApproved #BarrierRepair #KoreanSkinCare #AuthenticBD`);
        break;
      case 'weather_promo':
        setPostCopy(`☀️ Beat Dhaka's Heat & Humidity! ☀️\n\nSweaty, greasy skin? Keep your pores fresh and oil-free with [${p.brand}] ${p.name}. Specially designed lightweight Korean hydration that doesn't clog your pores under heavy humidity.\n\n🍃 Deep, weightless nourishment\n💦 Non-sticky fresh feel\n💥 Current Special Promo: ৳${p.discountPrice || p.price} BDT!\n\n🚀 Cash on delivery island-wide in Bangladesh.\n\n#SummerSkincare #DhakaBeauty #SweatProofSkincare #KBeautyBD`);
        break;
      case 'influencer':
        setPostCopy(`✨ POV: You finally unlocked the holy grail of Korean Skincare... ✨\n\nI’ve been testing the [${p.brand}] ${p.name} and honestly? My skin has never looked this plump and juicy. 😍 It absorbs instantly and leaves this gorgeous non-greasy dewiness.\n\nSwipe to see why this is trending all over Seoul! 👇 Available right now at Korean Skin Food BD.\n\n🏷️ Pricing: ৳${p.discountPrice || p.price} BDT\n\n#GlowingSkin #SkincareReview #KBeautyObsessed #KoreanSkinFoodBD`);
        break;
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      generateDefaultPost(selectedProduct, tone);
    }
  }, [tone, selectedProduct]);

  const handleGenerateWithAI = async () => {
    if (!selectedProduct) return;
    setIsGenerating(true);
    setCopied(false);

    try {
      const response = await fetch('/api/functions/generateProductContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct.id })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.result) {
          const result = data.result;
          let prefix = "";
          if (tone === 'weather_promo') prefix = "☀️ Beat Dhaka's Humid Heat! ☀️\n\n";
          else if (tone === 'dermatology') prefix = "🔬 Barrier-Repair Formulation 🔬\n\n";
          else if (tone === 'influencer') prefix = "✨ POV: Unlocking Glass Skin ✨\n\n";
          else prefix = "🌸 Seoul K-Beauty Secrets 🌸\n\n";

          setPostCopy(`${prefix}${result.productDescription || result.metaDescription}\n\n🏷️ Special Offer: ৳${selectedProduct.discountPrice || selectedProduct.price} BDT\n\n#KBeautyBangladesh #${selectedProduct.brand.replace(/\s+/g, '')} #GlassSkin`);
          return;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      generateDefaultPost(selectedProduct, tone);
    } catch (err) {
      console.warn("AI generation fallback to built-in templates:", err);
      generateDefaultPost(selectedProduct, tone);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(postCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveReelsToFirestore = async () => {
    setIsSavingReels(true);
    try {
      await themeService.saveHomeTheme(theme);
      setReelsSaveSuccess(true);
      setTimeout(() => setReelsSaveSuccess(false), 3000);
    } catch (err) {
      console.error("[AdminSocial] Error saving reels to Firestore:", err);
    } finally {
      setIsSavingReels(false);
    }
  };

  const handleOpenAddReelModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setNewReelForm({
      title: '',
      videoUrl: '',
      postUrl: '',
      coverUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop',
      createdAt: today,
      viewsCount: 0,
      likesCount: 0,
      sharesCount: 0
    });
    setIsAddReelModalOpen(true);
  };

  const handleAddReelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const createdReel: ReelItem = {
      id: `reel-${Date.now()}`,
      title: newReelForm.title?.trim() || `Social Reel #${(theme.communityLive?.reels?.length || 0) + 1}`,
      videoUrl: newReelForm.videoUrl?.trim() || '',
      postUrl: newReelForm.postUrl?.trim() || '',
      coverUrl: newReelForm.coverUrl?.trim() || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop',
      createdAt: newReelForm.createdAt || today,
      viewsCount: Number(newReelForm.viewsCount) || 0,
      likesCount: Number(newReelForm.likesCount) || 0,
      sharesCount: Number(newReelForm.sharesCount) || 0
    };

    setTheme({
      ...theme,
      communityLive: {
        ...theme.communityLive,
        reels: [...(theme.communityLive?.reels || []), createdReel]
      }
    });

    setIsAddReelModalOpen(false);
  };

  const handleDeleteReel = (index: number) => {
    const updated = (theme.communityLive?.reels || []).filter((_, i) => i !== index);
    setTheme({
      ...theme,
      communityLive: {
        ...theme.communityLive,
        reels: updated
      }
    });
  };

  const handleUpdateReel = (index: number, field: keyof ReelItem, value: any) => {
    const reels = [...(theme.communityLive?.reels || [])];
    if (reels[index]) {
      reels[index] = { ...reels[index], [field]: value };
      setTheme({
        ...theme,
        communityLive: {
          ...theme.communityLive,
          reels
        }
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Selector and Options Header */}
      <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
        <div className="lg:col-span-2 space-y-1">
          <h4 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <ThumbsUp className="text-[#E91E8C]" size={16} />
            <span>Social Media Copywriting Studio</span>
          </h4>
          <p className="text-xs text-gray-500">
            Craft high-engagement posts for Facebook and Instagram with custom targeted beauty hooks.
          </p>
        </div>

        <div>
          <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Selected Skincare</label>
          <select
            value={selectedProduct?.id || ''}
            onChange={(e) => {
              const found = products.find(p => p.id === e.target.value);
              if (found) setSelectedProduct(found);
            }}
            className="w-full bg-pink-50/10 text-xs text-gray-800 px-3 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>
                [{p.brand}] {p.name.slice(0, 30)}...
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Target Strategy/Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as any)}
            className="w-full bg-pink-50/10 text-xs text-gray-800 px-3 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
          >
            <option value="korean_vibes">🌸 Seoul Glass Skin Vibe</option>
            <option value="dermatology">🔬 Dermatology Barrier Science</option>
            <option value="weather_promo">☀️ Dhaka Summer Heat Promo</option>
            <option value="influencer">✨ POV Skincare Review</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 cols: Editor */}
        <div className="lg:col-span-5 bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-pink-50 pb-3">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Social Copy Composer</span>
              <button
                onClick={handleGenerateWithAI}
                disabled={isGenerating || !selectedProduct}
                className="px-3 py-1.5 bg-[#E91E8C] hover:bg-[#FF4B91] text-white text-[10px] font-bold rounded-lg cursor-pointer transition flex items-center gap-1 shadow-sm"
              >
                <Wand2 size={11} className={isGenerating ? "animate-spin" : ""} />
                <span>{isGenerating ? "Rewriting Copy..." : "Optimize with Gemini"}</span>
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Post Caption</label>
              <textarea
                value={postCopy}
                onChange={(e) => setPostCopy(e.target.value)}
                rows={12}
                className="w-full bg-pink-50/5 text-xs text-gray-800 p-4 border border-pink-100 rounded-2xl outline-none focus:border-[#E91E8C] focus:ring-2 focus:ring-[#E91E8C]/10 leading-relaxed font-sans"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={handleCopyToClipboard}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white hover:bg-pink-50 text-gray-800 border-2 border-pink-100 hover:border-pink-200 font-bold rounded-xl cursor-pointer transition text-xs shadow-sm"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span className="text-emerald-700">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy size={14} className="text-[#E91E8C]" />
                  <span>Copy Caption Text</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right 7 cols: Mockups Feed Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* FACEBOOK FEED CARD */}
            <div className="bg-[#f0f2f5] p-4 rounded-[24px] border border-gray-200 space-y-3 font-sans">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block px-1">Facebook feed preview</span>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-[#E91E8C] rounded-full border border-pink-200 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">K</div>
                  <div>
                    <h5 className="font-bold text-xs text-gray-900 leading-tight">Korean Skin Food BD</h5>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">Sponsored · 🌐</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-800 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto pr-1">
                  {postCopy}
                </p>

                {selectedProduct && (
                  <div className="border border-gray-100 rounded-lg overflow-hidden bg-gray-50">
                    <img src={selectedProduct.image} alt="" className="w-full h-44 object-cover" referrerPolicy="no-referrer" />
                    <div className="p-3 bg-[#f2f3f5] border-t border-gray-150 flex justify-between items-center text-[11px]">
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wide">{selectedProduct.brand}</span>
                        <h6 className="font-extrabold text-gray-900 mt-0.5 leading-none">{selectedProduct.name}</h6>
                      </div>
                      <span className="bg-white px-3 py-1.5 rounded font-bold border border-gray-200 text-gray-800 text-[10px] shadow-sm whitespace-nowrap">SHOP NOW</span>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-150 pt-2.5 flex justify-around text-gray-500 text-[10px] font-bold">
                  <span className="flex items-center gap-1 cursor-pointer hover:text-blue-600"><ThumbsUp size={12} /> Like</span>
                  <span className="flex items-center gap-1 cursor-pointer hover:text-gray-800"><MessageSquare size={12} /> Comment</span>
                  <span className="flex items-center gap-1 cursor-pointer hover:text-gray-800"><Share2 size={12} /> Share</span>
                </div>
              </div>
            </div>

            {/* INSTAGRAM FEED CARD */}
            <div className="bg-white p-4 rounded-[24px] border border-pink-100 shadow-sm space-y-3 font-sans">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block px-1">Instagram feed preview</span>
              
              <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden space-y-3 pb-3">
                <div className="flex items-center gap-2 p-3 pb-1">
                  <div className="w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600">
                    <div className="w-full h-full bg-white rounded-full p-0.5">
                      <div className="w-full h-full bg-[#E91E8C] rounded-full flex items-center justify-center text-white font-extrabold text-xs">K</div>
                    </div>
                  </div>
                  <div>
                    <h5 className="font-extrabold text-[11px] text-gray-900 leading-none">koreanskinfood.bd</h5>
                    <span className="text-[9px] text-gray-500 leading-none mt-1 block">Seoul, South Korea</span>
                  </div>
                </div>

                {selectedProduct && (
                  <div className="aspect-square bg-gray-50">
                    <img src={selectedProduct.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}

                <div className="flex justify-between items-center px-3 text-gray-800">
                  <div className="flex gap-3">
                    <Heart size={16} className="cursor-pointer hover:text-red-500" />
                    <MessageSquare size={16} className="cursor-pointer hover:text-gray-500" />
                    <Share2 size={16} className="cursor-pointer hover:text-gray-500" />
                  </div>
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                </div>

                <div className="px-3 space-y-1.5 text-[11px] leading-relaxed">
                  <span className="font-bold block text-gray-900">182 likes</span>
                  <p className="text-gray-800 line-clamp-3">
                    <strong className="text-gray-900 mr-1.5">koreanskinfood.bd</strong>
                    {postCopy}
                  </p>
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider block pt-0.5">2 Hours Ago</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* DEDICATED FIRESTORE REELS & VIDEO HIGHLIGHTS MANAGER FORM */}
      <div className="bg-white p-6 md:p-8 rounded-[28px] border-2 border-pink-150 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-pink-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Film className="text-[#E91E8C]" size={20} />
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Facebook & Instagram Reels Manager
              </h3>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <Globe size={10} /> Firestore Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Input Facebook Reel share links (<code className="bg-pink-50 px-1 py-0.5 rounded text-[#E91E8C]">facebook.com/share/r/...</code>), Instagram Reel URLs, or direct MP4 files. Saved reels update on the landing page in real time!
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowAllReelsPreview(true)}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
            >
              <Eye size={15} className="text-[#E91E8C]" />
              <span>Preview Live Storefront</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddReelModal}
              className="px-4 py-2.5 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-pink-200 cursor-pointer shadow-xs hover:shadow-sm"
            >
              <Plus size={15} />
              <span>Add New Reel</span>
            </button>

            <button
              type="button"
              onClick={handleSaveReelsToFirestore}
              disabled={isSavingReels}
              className="px-5 py-2.5 bg-[#E91E8C] hover:bg-[#FF4B91] text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingReels ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Saving to Firestore...</span>
                </>
              ) : reelsSaveSuccess ? (
                <>
                  <Check size={15} className="text-emerald-300" />
                  <span>Saved & Live on Landing Page!</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Save Reels to Firestore</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Header Section Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-pink-50/20 p-4 rounded-2xl border border-pink-100">
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1">Section Subtitle</label>
            <input
              type="text"
              value={theme.communityLive?.subtitle || ''}
              onChange={(e) => setTheme({
                ...theme,
                communityLive: {
                  ...theme.communityLive,
                  subtitle: e.target.value
                }
              })}
              placeholder="e.g. COMMUNITY LIVE"
              className="w-full bg-white border border-pink-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold outline-none focus:border-[#E91E8C]"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1">Section Main Title</label>
            <input
              type="text"
              value={theme.communityLive?.title || ''}
              onChange={(e) => setTheme({
                ...theme,
                communityLive: {
                  ...theme.communityLive,
                  title: e.target.value
                }
              })}
              placeholder="e.g. Facebook Reels & Beauty Moments"
              className="w-full bg-white border border-pink-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold outline-none focus:border-[#E91E8C]"
            />
          </div>
        </div>

        {/* Reels Items Form List */}
        <div className="space-y-4">
          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center justify-between">
            <span>Reels List ({(theme.communityLive?.reels || []).length} Active Reels)</span>
            <span className="text-[10px] text-pink-600 normal-case font-normal">Reels play automatically muted with sound toggle!</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(theme.communityLive?.reels || []).map((reel, idx) => (
              <div key={reel.id || idx} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3 relative group">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#E91E8C] text-white flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span>Reel #{idx + 1}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewReel(reel)}
                      className="px-2.5 py-1 bg-pink-100 hover:bg-pink-200 text-[#E91E8C] rounded-lg text-[10px] font-extrabold transition flex items-center gap-1 cursor-pointer"
                      title="Preview how this reel renders on the storefront"
                    >
                      <Eye size={12} />
                      <span>Preview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteReel(idx)}
                      className="text-slate-400 hover:text-red-500 transition p-1 cursor-pointer"
                      title="Delete Reel"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-700 font-extrabold mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Share2 size={12} className="text-[#E91E8C]" />
                      <span>Social Link (সোশ্যাল লিঙ্ক - Facebook / Instagram / TikTok)</span>
                    </span>
                    <span className="text-[9px] text-[#E91E8C] font-bold">Social Post URL</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={reel.postUrl || ''}
                      onChange={(e) => handleUpdateReel(idx, 'postUrl', e.target.value)}
                      placeholder="https://www.facebook.com/... or Instagram/TikTok post link"
                      className="flex-1 bg-white border border-pink-200 focus:border-[#E91E8C] rounded-xl p-2 text-xs font-semibold outline-none"
                    />
                    {reel.postUrl && (
                      <a
                        href={reel.postUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1.5 bg-pink-100 text-[#E91E8C] rounded-xl text-[10px] font-bold flex items-center justify-center hover:bg-pink-200 transition"
                        title="Open Social Link"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-600 font-bold mb-1">Video Link (Facebook Share/Reel Link or .mp4)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={reel.videoUrl}
                      onChange={(e) => handleUpdateReel(idx, 'videoUrl', e.target.value)}
                      placeholder="https://www.facebook.com/share/r/..."
                      className="flex-1 bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none focus:border-[#E91E8C]"
                    />
                    {reel.videoUrl && (
                      <a
                        href={reel.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1.5 bg-pink-100 text-[#E91E8C] rounded-xl text-[10px] font-bold flex items-center justify-center hover:bg-pink-200 transition"
                        title="Open Link"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-600 font-bold mb-1">Cover Image / Poster URL</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={reel.coverUrl}
                      onChange={(e) => handleUpdateReel(idx, 'coverUrl', e.target.value)}
                      placeholder="Poster thumbnail image URL"
                      className="flex-1 bg-white border border-slate-200 rounded-xl p-2 text-xs outline-none focus:border-[#E91E8C]"
                    />
                    <button
                      type="button"
                      onClick={() => setMediaPickerIndex(idx)}
                      className="px-2.5 py-1.5 bg-[#E91E8C] text-white rounded-xl text-[10px] font-bold hover:bg-[#FF4B91] transition cursor-pointer"
                    >
                      Media
                    </button>
                  </div>
                </div>

                {/* Poster Preview */}
                {reel.coverUrl && (
                  <div className="mt-2 h-24 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 relative">
                    <img src={reel.coverUrl} alt="" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 flex items-center justify-center text-white bg-black/30">
                      <div className="w-8 h-8 rounded-full bg-[#E91E8C] flex items-center justify-center shadow">
                        <Play size={14} className="ml-0.5" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Shelf-Life & Engagement Metrics Panel */}
                <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      <Activity size={12} className="text-[#E91E8C]" />
                      <span>Shelf-Life & Metrics</span>
                    </span>

                    {(() => {
                      const info = getShelfLifeInfo(reel.createdAt);
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${info.badgeLight}`}>
                          {info.status} • {info.label}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold mb-0.5 flex items-center gap-1">
                        <Calendar size={10} className="text-slate-400" />
                        <span>Date Added</span>
                      </label>
                      <input
                        type="date"
                        value={reel.createdAt || new Date().toISOString().split('T')[0]}
                        onChange={(e) => handleUpdateReel(idx, 'createdAt', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-bold outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold mb-0.5 flex items-center gap-1">
                        <Eye size={10} className="text-pink-500" />
                        <span>Views Count</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={reel.viewsCount ?? 0}
                        onChange={(e) => handleUpdateReel(idx, 'viewsCount', parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-bold outline-none focus:border-[#E91E8C]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold mb-0.5 flex items-center gap-1">
                        <Heart size={10} className="text-rose-500" />
                        <span>Likes</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={reel.likesCount ?? 0}
                        onChange={(e) => handleUpdateReel(idx, 'likesCount', parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-bold outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold mb-0.5 flex items-center gap-1">
                        <Share2 size={10} className="text-blue-500" />
                        <span>Shares</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={reel.sharesCount ?? 0}
                        onChange={(e) => handleUpdateReel(idx, 'sharesCount', parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 font-bold outline-none focus:border-[#E91E8C]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Reel Action Card */}
            <button
              type="button"
              onClick={handleOpenAddReelModal}
              className="p-6 bg-pink-50/40 hover:bg-pink-50 border-2 border-dashed border-pink-200 hover:border-[#E91E8C] rounded-2xl flex flex-col items-center justify-center gap-3 transition group cursor-pointer min-h-[320px]"
            >
              <div className="w-12 h-12 rounded-full bg-white shadow-xs group-hover:scale-110 group-hover:bg-[#E91E8C] text-[#E91E8C] group-hover:text-white flex items-center justify-center transition">
                <Plus size={24} />
              </div>
              <div className="text-center">
                <span className="font-extrabold text-slate-800 group-hover:text-[#E91E8C] text-sm block transition">
                  + Add New Reel
                </span>
                <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                  Click to open popup form
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Save Bar Footer */}
        <div className="pt-4 border-t border-pink-100 flex justify-end">
          <button
            type="button"
            onClick={handleSaveReelsToFirestore}
            disabled={isSavingReels}
            className="w-full sm:w-auto px-8 py-3 bg-[#E91E8C] hover:bg-[#FF4B91] text-white rounded-xl text-sm font-extrabold shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSavingReels ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Saving to Firestore...</span>
              </>
            ) : reelsSaveSuccess ? (
              <>
                <Check size={16} className="text-emerald-300" />
                <span>Reels Saved & Synchronized to Firestore!</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save All Reels to Firestore</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cloudinary / Device Media Modal for Reel Cards */}
      <MediaLibraryModal
        isOpen={mediaPickerIndex !== null}
        onClose={() => setMediaPickerIndex(null)}
        onSelectImage={(url) => {
          if (mediaPickerIndex !== null) {
            handleUpdateReel(mediaPickerIndex, 'coverUrl', url);
            setMediaPickerIndex(null);
          }
        }}
        title="Select Cover Image for Reel"
      />

      {/* Popup Form Modal for Adding a New Reel */}
      <AnimatePresence>
        {isAddReelModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-pink-100 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl relative my-auto"
            >
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-pink-50 via-white to-pink-50/50 border-b border-pink-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#E91E8C] text-white flex items-center justify-center shadow-md shadow-pink-200">
                    <Film size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-snug flex items-center gap-2">
                      <span>Add New Reel Promotion</span>
                      <span className="text-[10px] font-extrabold bg-pink-100 text-[#E91E8C] px-2 py-0.5 rounded-full">New Reel Form</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Fill in video URL, cover thumbnail, and initial metrics to feature on storefront.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddReelModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-pink-100 text-slate-500 hover:text-[#E91E8C] flex items-center justify-center transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleAddReelSubmit} className="p-6 overflow-y-auto space-y-5">
                {/* Social Link Field */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1 flex items-center gap-1.5">
                    <Share2 size={14} className="text-[#E91E8C]" />
                    <span>Social Link (সোশ্যাল লিঙ্ক - Facebook / Instagram / TikTok Post URL) *</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newReelForm.postUrl || ''}
                      onChange={(e) => setNewReelForm({ ...newReelForm, postUrl: e.target.value })}
                      placeholder="https://www.facebook.com/permalink.php?story_fbid=... or post URL"
                      className="flex-1 bg-slate-50/60 border border-slate-200 focus:bg-white rounded-xl p-3 text-xs text-slate-800 font-bold outline-none focus:border-[#E91E8C] transition"
                    />
                  </div>
                  <p className="text-[10px] text-[#E91E8C] font-medium mt-1">
                    🔗 When customers click this Reel post on the store, they will be taken directly to your social link!
                  </p>
                </div>

                {/* Video Link */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1 flex items-center gap-1.5">
                    <Video size={14} className="text-[#E91E8C]" />
                    <span>Video URL (Facebook Share/Reel Link, Instagram, or MP4) *</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newReelForm.videoUrl || ''}
                      onChange={(e) => setNewReelForm({ ...newReelForm, videoUrl: e.target.value })}
                      placeholder="https://www.facebook.com/share/r/1Epn8LCGMT/ or .mp4 URL"
                      className="flex-1 bg-slate-50/60 border border-slate-200 focus:bg-white rounded-xl p-3 text-xs text-slate-800 font-bold outline-none focus:border-[#E91E8C] transition"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Tip: Direct Facebook Share/Reels links will render as interactive video reels with built-in mute/unmute control!
                  </p>
                </div>

                {/* Cover Image / Poster */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-[#E91E8C]" />
                      <span>Cover Image / Poster Thumbnail URL</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAddModalMediaPickerOpen(true)}
                      className="text-[10px] font-extrabold text-[#E91E8C] bg-pink-50 hover:bg-pink-100 px-2.5 py-1 rounded-lg border border-pink-200 transition cursor-pointer flex items-center gap-1"
                    >
                      <ImageIcon size={12} />
                      <span>Choose from Library / Cloudinary</span>
                    </button>
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="text"
                      value={newReelForm.coverUrl || ''}
                      onChange={(e) => setNewReelForm({ ...newReelForm, coverUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="flex-1 bg-slate-50/60 border border-slate-200 focus:bg-white rounded-xl p-3 text-xs text-slate-800 font-bold outline-none focus:border-[#E91E8C] transition"
                    />
                    {newReelForm.coverUrl && (
                      <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden shrink-0 bg-slate-100">
                        <img src={newReelForm.coverUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Date Added & Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1 flex items-center gap-1">
                      <Calendar size={12} className="text-slate-500" />
                      <span>Date Added</span>
                    </label>
                    <input
                      type="date"
                      value={newReelForm.createdAt || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setNewReelForm({ ...newReelForm, createdAt: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold outline-none focus:border-[#E91E8C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1 flex items-center gap-1">
                      <Eye size={12} className="text-pink-500" />
                      <span>Initial Views Count</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newReelForm.viewsCount ?? 0}
                      onChange={(e) => setNewReelForm({ ...newReelForm, viewsCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold outline-none focus:border-[#E91E8C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1 flex items-center gap-1">
                      <Heart size={12} className="text-rose-500" />
                      <span>Initial Likes Count</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newReelForm.likesCount ?? 0}
                      onChange={(e) => setNewReelForm({ ...newReelForm, likesCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold outline-none focus:border-[#E91E8C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1 flex items-center gap-1">
                      <Share2 size={12} className="text-blue-500" />
                      <span>Initial Shares Count</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newReelForm.sharesCount ?? 0}
                      onChange={(e) => setNewReelForm({ ...newReelForm, sharesCount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold outline-none focus:border-[#E91E8C]"
                    />
                  </div>
                </div>

                {/* Submit Action Bar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddReelModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#E91E8C] hover:bg-[#FF4B91] text-white text-xs font-extrabold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Add Reel to Storefront</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Media Library Modal for Add Reel Modal */}
      <MediaLibraryModal
        isOpen={addModalMediaPickerOpen}
        onClose={() => setAddModalMediaPickerOpen(false)}
        onSelectImage={(url) => {
          setNewReelForm((prev) => ({ ...prev, coverUrl: url }));
          setAddModalMediaPickerOpen(false);
        }}
        title="Select Cover Image for New Reel"
      />

      {/* Live Storefront Reel Preview Modal */}
      <AnimatePresence>
        {(previewReel || showAllReelsPreview) && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-50 border border-pink-100 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-white border-b border-pink-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-[#E91E8C] flex items-center justify-center">
                    <Eye size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-none">
                      {previewReel ? `Reel Preview: ${previewReel.title || 'Untitled Reel'}` : 'Storefront Reels Section Live Preview'}
                    </h3>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      This is how customers will see your video highlights & reels on the live storefront.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewReel(null);
                    setShowAllReelsPreview(false);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-pink-100 text-slate-600 hover:text-[#E91E8C] flex items-center justify-center transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content - Live Mockup Container */}
              <div className="p-6 overflow-y-auto bg-pink-50/20 space-y-4">
                <div className="text-center space-y-1 mb-4">
                  <span className="text-[10px] font-extrabold text-[#E91E8C] uppercase tracking-widest">
                    {theme.communityLive?.subtitle || 'COMMUNITY LIVE'}
                  </span>
                  <h2 className="text-lg font-black text-slate-900">
                    {theme.communityLive?.title || 'Facebook Reels & Beauty Moments'}
                  </h2>
                </div>

                {previewReel ? (
                  <div className="max-w-xs mx-auto">
                    <ReelPreviewCard reel={previewReel} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {(theme.communityLive?.reels || []).map((r, i) => (
                      <ReelPreviewCard key={r.id || i} reel={r} />
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-white border-t border-pink-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewReel(null);
                    setShowAllReelsPreview(false);
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

