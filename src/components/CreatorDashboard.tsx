import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  Video, 
  Eye, 
  Heart, 
  MessageSquare, 
  Award, 
  Zap, 
  User, 
  CheckCircle2, 
  PlusCircle, 
  Clock, 
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  XCircle,
  ExternalLink,
  Globe,
  Play,
  X,
  RefreshCw,
  Tag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CreatorReel } from '../types';
import { subscribeToCreatorReels } from '../services/creatorReelService';

export const CreatorDashboard: React.FC = () => {
  const { creatorProfile, user } = useAuth();
  const [reels, setReels] = useState<CreatorReel[]>([]);
  const [loadingReels, setLoadingReels] = useState<boolean>(true);
  const [reelsError, setReelsError] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  const fetchReels = () => {
    if (!creatorProfile?.userId && !user?.uid) return;
    const targetUserId = creatorProfile?.userId || user?.uid;
    if (!targetUserId) return;

    setLoadingReels(true);
    setReelsError(null);

    try {
      const unsubscribe = subscribeToCreatorReels(targetUserId, (data) => {
        setReels(data);
        setLoadingReels(false);
      });
      return unsubscribe;
    } catch (err: any) {
      console.error('Error fetching creator reels:', err);
      setReelsError(err.message || 'Failed to load your submitted reels.');
      setLoadingReels(false);
    }
  };

  useEffect(() => {
    const unsub = fetchReels();
    return () => {
      if (unsub) unsub();
    };
  }, [creatorProfile?.userId, user?.uid]);

  if (!creatorProfile) return null;

  const progressPercent = Math.min(
    100,
    Math.max(0, creatorProfile.levelProgress || 0)
  );

  return (
    <div className="space-y-6">
      {/* Video Preview Modal */}
      <AnimatePresence>
        {previewVideoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewVideoUrl(null)}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl relative"
            >
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-800/80 text-white flex items-center justify-center hover:bg-slate-700 cursor-pointer transition"
                title="Close video preview"
              >
                <X size={16} />
              </button>
              <div className="aspect-video bg-black flex items-center justify-center">
                <video src={previewVideoUrl} controls autoPlay className="w-full h-full object-contain" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Profile Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-pink-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-pink-900/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl overflow-hidden border-2 border-pink-400/50 shadow-lg shrink-0 bg-slate-800">
                <img 
                  src={creatorProfile.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'} 
                  alt={creatorProfile.displayName} 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 p-1.5 bg-pink-600 text-white rounded-xl shadow-md border border-pink-400">
                <ShieldCheck size={14} />
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-white">{creatorProfile.displayName}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={11} /> Approved Creator
                </span>
              </div>
              <p className="text-xs font-mono text-pink-300 font-bold">@{creatorProfile.username}</p>
              {creatorProfile.bio && (
                <p className="text-xs text-slate-300 max-w-lg line-clamp-2">{creatorProfile.bio}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <Link
              to="/creator/reels/upload"
              className="flex-1 md:flex-initial px-5 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <PlusCircle size={16} />
              <span>Submit Reel</span>
            </Link>
            <Link
              to="/creator/profile"
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl border border-white/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <User size={15} />
              <span>Edit Profile</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Level & Progress Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/20 flex items-center justify-center shrink-0">
              <Award size={28} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Current Tier & Level</span>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                💎 {creatorProfile.levelName}
                <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Level {creatorProfile.level}
                </span>
              </h2>
            </div>
          </div>

          <div className="text-left sm:text-right bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase block tracking-wider">Total Verified Points</span>
            <span className="text-2xl font-black text-amber-600 flex items-center gap-1 sm:justify-end">
              <Zap size={20} className="fill-amber-500 text-amber-500" />
              {creatorProfile.totalPoints.toLocaleString()} <span className="text-xs font-bold text-slate-500">pts</span>
            </span>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5 font-extrabold">
              Level Progression
            </span>
            <span className="font-mono font-black text-pink-600">{progressPercent}%</span>
          </div>

          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-0.5">
            <span>
              {creatorProfile.nextLevelName ? (
                <>
                  <span className="font-bold text-slate-900">
                    {(creatorProfile.pointsRemaining ?? Math.max(0, creatorProfile.nextLevelPoints - creatorProfile.totalPoints)).toLocaleString()} points
                  </span>{' '}
                  to {creatorProfile.nextLevelName}
                </>
              ) : (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} /> Max Level Achieved ({creatorProfile.levelName})
                </span>
              )}
            </span>
            <span>Next Level: {creatorProfile.nextLevelPoints.toLocaleString()} pts</span>
          </div>
        </div>

        {/* Transparent Points Rules Explanation */}
        <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-3.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold shrink-0">
            <Zap size={14} className="text-amber-600 fill-amber-500" />
            <span>Point System Rules:</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-amber-800 flex-wrap">
            <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200/80 font-bold">100 Views = 1 Point</span>
            <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200/80 font-bold">10 Likes = 2 Points</span>
            <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-amber-200/80 font-bold">1 Comment = 3 Points</span>
          </div>
        </div>
      </div>

      {/* 3. Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Points */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white p-5 rounded-2xl border border-amber-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Points</span>
            <Zap size={18} className="fill-amber-500 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{creatorProfile.totalPoints}</div>
          <span className="text-[10px] text-amber-700 font-bold block">Reward Balance</span>
        </div>

        {/* Total Reels */}
        <div className="bg-gradient-to-br from-pink-500/10 via-pink-500/5 to-white p-5 rounded-2xl border border-pink-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-pink-600">
            <span className="text-[10px] font-black uppercase tracking-wider">Approved Reels</span>
            <Video size={18} />
          </div>
          <div className="text-2xl font-black text-slate-900">{creatorProfile.totalReels}</div>
          <span className="text-[10px] text-pink-700 font-bold block">Earning Videos</span>
        </div>

        {/* Total Views */}
        <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-white p-5 rounded-2xl border border-blue-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Views</span>
            <Eye size={18} />
          </div>
          <div className="text-2xl font-black text-slate-900">{creatorProfile.totalViews}</div>
          <span className="text-[10px] text-blue-700 font-bold block">Video Impressions</span>
        </div>

        {/* Total Likes */}
        <div className="bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-white p-5 rounded-2xl border border-rose-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Likes</span>
            <Heart size={18} className="fill-rose-500 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{creatorProfile.totalLikes}</div>
          <span className="text-[10px] text-rose-700 font-bold block">Community Hearts</span>
        </div>

        {/* Total Comments */}
        <div className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-white p-5 rounded-2xl border border-purple-200/80 shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-[10px] font-black uppercase tracking-wider">Comments</span>
            <MessageSquare size={18} />
          </div>
          <div className="text-2xl font-black text-slate-900">{creatorProfile.totalComments}</div>
          <span className="text-[10px] text-purple-700 font-bold block">Discussions</span>
        </div>
      </div>

      {/* 4. Recent Reels List Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Your Submitted Reels</h3>
            <p className="text-xs text-slate-500">Live metrics, points calculation, and review status for each Facebook reel</p>
          </div>
          <Link
            to="/creator/reels/upload"
            className="text-xs font-black text-pink-600 hover:text-pink-700 flex items-center gap-1"
          >
            <span>Submit New Reel</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Loading State */}
        {loadingReels ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-pulse">
                <div className="aspect-video bg-slate-200 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                <div className="h-3 bg-slate-200 rounded-md w-1/2" />
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-8 bg-slate-200 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : reelsError ? (
          /* Error State */
          <div className="py-10 px-4 text-center rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <AlertCircle size={24} />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-sm font-black text-slate-900">Failed to Load Reels</h4>
              <p className="text-xs text-slate-600">{reelsError}</p>
            </div>
            <button
              onClick={fetchReels}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Retry</span>
            </button>
          </div>
        ) : reels.length === 0 ? (
          /* Empty State */
          <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-3">
            <div className="w-14 h-14 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mx-auto border border-pink-200">
              <Video size={28} />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-sm font-black text-slate-900">No Reels Submitted Yet</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Submit your first Facebook reel featuring Korean skincare products. Once approved by our team, your performance metrics will automatically earn points toward higher creator levels!
              </p>
            </div>
            <Link
              to="/creator/reels/upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold rounded-xl shadow-md transition cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>Submit Your First Reel</span>
            </Link>
          </div>
        ) : (
          /* Real Reels List */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reels.map((reel) => {
              const isEarning = reel.status === 'approved' || reel.status === 'published';
              return (
                <div key={reel.creatorReelId} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-md hover:border-pink-300 transition flex flex-col justify-between">
                  <div>
                    {/* Video / Thumbnail Container */}
                    <div className="relative aspect-video bg-slate-900 overflow-hidden group">
                      {reel.videoUrl ? (
                        <video 
                          src={reel.videoUrl} 
                          className="w-full h-full object-cover opacity-90" 
                          preload="metadata" 
                        />
                      ) : reel.thumbnailUrl ? (
                        <img 
                          src={reel.thumbnailUrl} 
                          alt={reel.caption} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                          <Video size={32} className="text-slate-600 mb-1" />
                          <span className="text-[10px] font-bold">Facebook Reel</span>
                        </div>
                      )}

                      {/* Play Button Overlay if video URL available */}
                      {reel.videoUrl && (
                        <button
                          onClick={() => setPreviewVideoUrl(reel.videoUrl)}
                          className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-pink-600/90 text-white flex items-center justify-center shadow-xl hover:bg-pink-700 hover:scale-110 transition cursor-pointer"
                          title="Play video preview"
                        >
                          <Play size={20} className="fill-white ml-0.5" />
                        </button>
                      )}

                      {/* Status Badge overlay */}
                      <div className="absolute top-2.5 right-2.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border shadow-sm ${
                          reel.status === 'approved' || reel.status === 'published'
                            ? 'bg-emerald-500 text-white border-emerald-400'
                            : reel.status === 'rejected'
                            ? 'bg-rose-500 text-white border-rose-400'
                            : 'bg-amber-500 text-white border-amber-400'
                        }`}>
                          {reel.status === 'published' ? 'Published' : reel.status === 'approved' ? 'Approved' : reel.status === 'rejected' ? 'Rejected' : 'Pending Review'}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Caption & Date */}
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-snug" title={reel.caption}>
                          {reel.caption}
                        </h4>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-[10px] text-slate-400 font-mono">
                            Submitted: {new Date(reel.createdAt).toLocaleDateString()}
                          </span>
                          {reel.approvedAt && (
                            <span className="text-[10px] text-emerald-600 font-bold">
                              Approved: {new Date(reel.approvedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Product Tags if any */}
                      {reel.productNames && reel.productNames.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {reel.productNames.map((name, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-50 text-pink-800 text-[9px] font-bold border border-pink-100">
                              <Tag size={8} className="text-pink-600" /> {name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Admin Note / Rejection Reason */}
                      {reel.adminNote && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[10px] text-rose-900 space-y-0.5">
                          <span className="font-bold block flex items-center gap-1 text-rose-700">
                            <AlertCircle size={11} /> Admin Feedback:
                          </span>
                          <p className="leading-snug">{reel.adminNote}</p>
                        </div>
                      )}

                      {/* Facebook Post Link */}
                      <div>
                        <a
                          href={reel.facebookPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          <Globe size={13} className="text-blue-500" />
                          <span className="truncate max-w-[220px]">View on Facebook</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>

                      {/* Metrics Performance Counter */}
                      <div className="grid grid-cols-4 gap-1 text-center bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-xs font-black">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Views</span>
                          <span className="text-slate-900 flex items-center justify-center gap-0.5 mt-0.5">
                            <Eye size={11} className="text-slate-400" />
                            {(reel.performance?.views || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Likes</span>
                          <span className="text-rose-600 flex items-center justify-center gap-0.5 mt-0.5">
                            <Heart size={11} className="fill-rose-500 text-rose-500" />
                            {(reel.performance?.likes || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Comments</span>
                          <span className="text-blue-600 flex items-center justify-center gap-0.5 mt-0.5">
                            <MessageSquare size={11} className="text-blue-500" />
                            {(reel.performance?.comments || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Points</span>
                          <span className={`flex items-center justify-center gap-0.5 mt-0.5 ${isEarning ? 'text-amber-600' : 'text-slate-400'}`}>
                            <Zap size={11} className={isEarning ? "fill-amber-500 text-amber-500" : "text-slate-400"} />
                            {isEarning ? (reel.performance?.points || 0).toLocaleString() : 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!isEarning && (
                    <div className="px-4 pb-3 pt-0">
                      <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200/60 leading-snug">
                        ⏳ Points will be credited once approved by the review team.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};


