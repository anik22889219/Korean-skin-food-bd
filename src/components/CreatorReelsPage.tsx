import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToCreatorReels, deleteCreatorReel } from '../services/creatorReelService';
import { CreatorReel, CreatorReelStatus } from '../types';
import { 
  Video, 
  PlusCircle, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  Eye, 
  Heart, 
  MessageSquare, 
  Zap, 
  Tag, 
  Trash2, 
  Play, 
  X,
  Globe,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CreatorReelsPage: React.FC = () => {
  const { user, isApprovedCreator } = useAuth();
  const [reels, setReels] = useState<CreatorReel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeVideoModalUrl, setActiveVideoModalUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToCreatorReels(user.uid, (data) => {
      setReels(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleDelete = async (reelId: string) => {
    if (!window.confirm('Are you sure you want to delete this reel submission?')) return;
    setDeletingId(reelId);
    try {
      await deleteCreatorReel(reelId);
    } catch (err) {
      console.error('Failed to delete reel:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredReels = reels.filter((r) => {
    if (selectedStatus === 'all') return true;
    return r.status === selectedStatus;
  });

  const pendingCount = reels.filter((r) => r.status === 'pending').length;
  const approvedCount = reels.filter((r) => r.status === 'approved' || r.status === 'published').length;
  const rejectedCount = reels.filter((r) => r.status === 'rejected').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Video Modal Player */}
      <AnimatePresence>
        {activeVideoModalUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveVideoModalUrl(null)}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl relative"
            >
              <button
                onClick={() => setActiveVideoModalUrl(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-800/80 text-white flex items-center justify-center hover:bg-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="aspect-video bg-black flex items-center justify-center">
                <video src={activeVideoModalUrl} controls autoPlay className="w-full h-full object-contain" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-black uppercase mb-2">
              <Video size={12} /> Creator Video Reels
            </div>
            <h1 className="text-xl font-black text-slate-900">My Uploaded Reels</h1>
            <p className="text-xs text-slate-500">Track reel moderation status, views, and engagement metrics</p>
          </div>

          <Link
            to="/creator/reels/upload"
            className="px-4 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition shrink-0"
          >
            <PlusCircle size={16} />
            <span>Upload New Reel</span>
          </Link>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Uploads</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{reels.length}</div>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 shadow-xs">
          <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block flex items-center gap-1">
            <Clock size={12} /> Pending Moderation
          </span>
          <div className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</div>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 size={12} /> Approved / Published
          </span>
          <div className="text-2xl font-black text-emerald-900 mt-1">{approvedCount}</div>
        </div>

        <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200/80 shadow-xs">
          <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block flex items-center gap-1">
            <XCircle size={12} /> Needs Re-upload
          </span>
          <div className="text-2xl font-black text-rose-900 mt-1">{rejectedCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <span className="text-[11px] font-extrabold text-slate-400 uppercase shrink-0 px-2">Filter:</span>
        {[
          { id: 'all', label: 'All Reels' },
          { id: 'pending', label: 'Pending Moderation' },
          { id: 'approved', label: 'Approved' },
          { id: 'published', label: 'Published' },
          { id: 'rejected', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedStatus(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap border ${
              selectedStatus === tab.id
                ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reels Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
          Loading creator reels library...
        </div>
      ) : filteredReels.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 bg-pink-100 text-pink-600 rounded-3xl flex items-center justify-center mx-auto border border-pink-200">
            <Video size={32} />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-base font-black text-slate-900">No Reels Found</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {selectedStatus === 'all'
                ? "You haven't uploaded any skincare reels yet. Share your product reviews or routines to earn points!"
                : `No reels match the status '${selectedStatus}'.`}
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/creator/reels/upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition"
            >
              <PlusCircle size={16} />
              <span>Upload Your First Reel</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReels.map((reel) => {
            const statusConfig = {
              pending: { bg: 'bg-amber-100 text-amber-900 border-amber-200', icon: Clock, label: 'Pending Review' },
              approved: { bg: 'bg-emerald-100 text-emerald-900 border-emerald-200', icon: CheckCircle2, label: 'Approved' },
              published: { bg: 'bg-purple-100 text-purple-900 border-purple-200', icon: Sparkles, label: 'Published' },
              rejected: { bg: 'bg-rose-100 text-rose-900 border-rose-200', icon: XCircle, label: 'Rejected' },
            }[reel.status] || { bg: 'bg-slate-100 text-slate-800 border-slate-200', icon: Clock, label: reel.status };

            const StatusIcon = statusConfig.icon;

            return (
              <div 
                key={reel.creatorReelId} 
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-pink-300 transition"
              >
                <div>
                  {/* Thumbnail / Video Container */}
                  <div className="relative aspect-video bg-slate-900 overflow-hidden group">
                    {reel.videoUrl ? (
                      <video 
                        src={reel.videoUrl} 
                        className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition duration-300"
                        preload="metadata"
                      />
                    ) : (
                      <img 
                        src={reel.thumbnailUrl} 
                        alt={reel.caption} 
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                      />
                    )}

                    {/* Play Button Overlay */}
                    {reel.videoUrl && (
                      <button
                        onClick={() => setActiveVideoModalUrl(reel.videoUrl)}
                        className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-pink-600/90 text-white flex items-center justify-center shadow-xl hover:bg-pink-700 hover:scale-110 transition cursor-pointer"
                      >
                        <Play size={20} className="fill-white ml-0.5" />
                      </button>
                    )}

                    {/* Status Badge Overlay */}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border shadow-sm backdrop-blur-md ${statusConfig.bg}`}>
                        <StatusIcon size={12} />
                        <span>{statusConfig.label}</span>
                      </span>
                    </div>
                  </div>

                  {/* Reel Info */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-extrabold text-slate-900 text-sm line-clamp-2 leading-snug">
                      {reel.caption}
                    </h3>

                    {reel.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {reel.description}
                      </p>
                    )}

                    {/* Tagged Products */}
                    {reel.productNames && reel.productNames.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {reel.productNames.map((name, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-pink-50 text-pink-800 text-[10px] font-bold border border-pink-100">
                            <Tag size={10} className="text-pink-600" /> {name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Admin Note if Rejected */}
                    {reel.status === 'rejected' && reel.adminNote && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] text-rose-800 space-y-1">
                        <span className="font-black text-rose-900 block flex items-center gap-1">
                          <AlertCircle size={12} /> Admin Review Feedback:
                        </span>
                        <p>{reel.adminNote}</p>
                      </div>
                    )}

                    {/* Facebook Link & Metrics Source */}
                    <div className="pt-2 flex items-center justify-between gap-2">
                      <a
                        href={reel.facebookPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline truncate max-w-full"
                      >
                        <Globe size={13} className="shrink-0" />
                        <span className="truncate">View on Facebook</span>
                        <ExternalLink size={11} className="shrink-0" />
                      </a>

                      {/* Source Badge */}
                      {reel.metricsSource === 'facebook_api' || reel.performance?.metricsSource === 'facebook_api' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black border border-emerald-200 shrink-0">
                          <Globe size={9} className="text-emerald-600" /> Facebook API
                        </span>
                      ) : reel.metricsSource === 'admin_verified' || reel.performance?.metricsSource === 'admin_verified' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[9px] font-black border border-blue-200 shrink-0">
                          <ShieldCheck size={9} className="text-blue-600" /> Admin Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold border border-slate-200 shrink-0">
                          <Clock size={9} /> Not Tracked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Metrics & Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-slate-700" title="Views">
                        <Eye size={13} className="text-slate-400" />
                        {reel.performance?.views || 0}
                      </span>
                      <span className="flex items-center gap-1 text-rose-600" title="Likes">
                        <Heart size={13} className="text-rose-500 fill-rose-500" />
                        {reel.performance?.likes || 0}
                      </span>
                      <span className="flex items-center gap-1 text-blue-600" title="Comments">
                        <MessageSquare size={13} className="text-blue-500" />
                        {reel.performance?.comments || 0}
                      </span>
                      <span className="flex items-center gap-1 text-amber-600" title="Earned Points">
                        <Zap size={13} className="text-amber-500 fill-amber-500" />
                        {reel.performance?.points || 0} pts
                      </span>
                    </div>

                    <button
                      onClick={() => handleDelete(reel.creatorReelId)}
                      disabled={deletingId === reel.creatorReelId}
                      title="Delete Reel"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-400 font-medium">
                    Metrics updated:{' '}
                    <span className="font-semibold text-slate-600">
                      {reel.metricsUpdatedAt || reel.performance?.metricsUpdatedAt 
                        ? new Date(reel.metricsUpdatedAt || reel.performance?.metricsUpdatedAt!).toLocaleDateString() + ' ' + new Date(reel.metricsUpdatedAt || reel.performance?.metricsUpdatedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Pending admin review/sync'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
