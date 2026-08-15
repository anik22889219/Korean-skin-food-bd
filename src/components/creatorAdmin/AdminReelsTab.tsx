import React, { useState } from 'react';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Play, 
  Globe, 
  ExternalLink, 
  ShieldCheck, 
  Eye, 
  Heart, 
  MessageSquare, 
  Zap, 
  RefreshCw, 
  Trash2, 
  Tag 
} from 'lucide-react';
import { CreatorReel, CreatorProfile } from '../../types';

interface AdminReelsTabProps {
  reels: CreatorReel[];
  creators: CreatorProfile[];
  loading: boolean;
  updatingReelId: string | null;
  updatingMetricsId: string | null;
  onStatusChange: (reelId: string, status: 'approved' | 'published' | 'rejected') => Promise<void>;
  onOpenRejectionModal: (reel: CreatorReel) => void;
  onRefreshMetrics: (reelId: string) => Promise<void>;
  onOpenManualMetricsModal: (reel: CreatorReel) => void;
  onDeleteReel: (reelId: string) => Promise<void>;
  onPreviewVideo: (videoUrl: string) => void;
}

export const AdminReelsTab: React.FC<AdminReelsTabProps> = ({
  reels,
  creators,
  loading,
  updatingReelId,
  updatingMetricsId,
  onStatusChange,
  onOpenRejectionModal,
  onRefreshMetrics,
  onOpenManualMetricsModal,
  onDeleteReel,
  onPreviewVideo
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const pendingCount = reels.filter(r => r.status === 'pending').length;
  const approvedCount = reels.filter(r => r.status === 'approved' || r.status === 'published').length;
  const rejectedCount = reels.filter(r => r.status === 'rejected').length;

  const filteredReels = reels.filter(r => {
    const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus;
    const matchesSearch = !searchQuery.trim() || 
      r.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.productNames && r.productNames.some(p => p.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Reel Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Submissions</span>
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
            <XCircle size={12} /> Rejected
          </span>
          <div className="text-2xl font-black text-rose-900 mt-1">{rejectedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search reels by caption, tags, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase shrink-0">Filter Status:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending Review' },
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
      </div>

      {/* Reels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredReels.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium bg-white rounded-2xl border border-dashed border-slate-200">
            {loading ? 'Loading reels moderation database...' : 'No creator reels match your criteria.'}
          </div>
        ) : (
          filteredReels.map((reel) => {
            const creator = creators.find(c => c.creatorId === reel.creatorId || c.userId === reel.creatorUserId);

            const statusBadge = {
              pending: { bg: 'bg-amber-100 text-amber-900 border-amber-200', label: 'Pending Review' },
              approved: { bg: 'bg-emerald-100 text-emerald-900 border-emerald-200', label: 'Approved' },
              published: { bg: 'bg-purple-100 text-purple-900 border-purple-200', label: 'Published' },
              rejected: { bg: 'bg-rose-100 text-rose-900 border-rose-200', label: 'Rejected' },
            }[reel.status] || { bg: 'bg-slate-100 text-slate-800 border-slate-200', label: reel.status };

            return (
              <div key={reel.creatorReelId} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                <div>
                  {/* Creator Info Bar */}
                  <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img 
                        src={creator?.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
                        alt={creator?.displayName || 'Creator'} 
                        className="w-7 h-7 rounded-full object-cover border border-pink-200 shrink-0" 
                      />
                      <div className="truncate text-xs">
                        <span className="font-extrabold text-slate-900 block truncate">{creator?.displayName || reel.creatorUserId}</span>
                        <span className="text-[10px] text-pink-600 font-mono font-bold block truncate">@{creator?.username || 'creator'}</span>
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase border shrink-0 ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Video / Thumbnail Container */}
                  <div className="relative aspect-video bg-slate-900 overflow-hidden group">
                    {reel.videoUrl ? (
                      <video src={reel.videoUrl} className="w-full h-full object-cover opacity-90" preload="metadata" />
                    ) : (
                      <img src={reel.thumbnailUrl} alt={reel.caption} className="w-full h-full object-cover" />
                    )}

                    {reel.videoUrl && (
                      <button
                        onClick={() => onPreviewVideo(reel.videoUrl)}
                        className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-pink-600/90 text-white flex items-center justify-center shadow-xl hover:bg-pink-700 hover:scale-110 transition cursor-pointer"
                      >
                        <Play size={20} className="fill-white ml-0.5" />
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-black text-slate-900 text-xs line-clamp-2 leading-snug">
                      {reel.caption}
                    </h3>

                    {reel.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {reel.description}
                      </p>
                    )}

                    {reel.productNames && reel.productNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {reel.productNames.map((name, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-50 text-pink-800 text-[9px] font-bold border border-pink-100">
                            <Tag size={8} className="text-pink-600" /> {name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-1">
                      <a
                        href={reel.facebookPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        <Globe size={12} />
                        <span>Facebook Post Link</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>

                    {reel.adminNote && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[10px] text-rose-800">
                        <span className="font-extrabold block">Admin Feedback:</span>
                        <p>{reel.adminNote}</p>
                      </div>
                    )}

                    {/* Performance & Facebook Metrics Section */}
                    <div className="pt-2.5 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-700">
                        <span className="uppercase text-slate-400 font-mono text-[9px] tracking-wider">Facebook Performance</span>
                        {/* Source Badge */}
                        {reel.metricsSource === 'facebook_api' || reel.performance?.metricsSource === 'facebook_api' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black border border-emerald-200">
                            <Globe size={9} className="text-emerald-600" /> Facebook API
                          </span>
                        ) : reel.metricsSource === 'admin_verified' || reel.performance?.metricsSource === 'admin_verified' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[9px] font-black border border-blue-200">
                            <ShieldCheck size={9} className="text-blue-600" /> Admin Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold border border-slate-200">
                            <Clock size={9} /> Not Tracked
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-1 text-center bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs font-black">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Views</span>
                          <span className="text-slate-900 flex items-center justify-center gap-0.5">
                            <Eye size={10} className="text-slate-400" />
                            {reel.performance?.views || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Likes</span>
                          <span className="text-rose-600 flex items-center justify-center gap-0.5">
                            <Heart size={10} className="fill-rose-500 text-rose-500" />
                            {reel.performance?.likes || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Comments</span>
                          <span className="text-blue-600 flex items-center justify-center gap-0.5">
                            <MessageSquare size={10} className="text-blue-500" />
                            {reel.performance?.comments || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Points</span>
                          <span className="text-amber-600 flex items-center justify-center gap-0.5">
                            <Zap size={10} className="fill-amber-500 text-amber-500" />
                            {reel.performance?.points || 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1 pt-1">
                        <span className="text-[9px] text-slate-400 truncate">
                          Updated: {reel.metricsUpdatedAt || reel.performance?.metricsUpdatedAt 
                            ? new Date(reel.metricsUpdatedAt || reel.performance?.metricsUpdatedAt!).toLocaleDateString()
                            : 'Never'}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => onRefreshMetrics(reel.creatorReelId)}
                            disabled={updatingMetricsId === reel.creatorReelId}
                            title="Refresh Facebook Graph API Metrics"
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          >
                            <RefreshCw size={9} className={updatingMetricsId === reel.creatorReelId ? "animate-spin" : ""} />
                            <span>API</span>
                          </button>

                          <button
                            onClick={() => onOpenManualMetricsModal(reel)}
                            disabled={updatingMetricsId === reel.creatorReelId}
                            title="Manually update verified metrics"
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 border border-blue-200"
                          >
                            <ShieldCheck size={9} />
                            <span>Manual</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1">
                  <button
                    onClick={() => onDeleteReel(reel.creatorReelId)}
                    disabled={updatingReelId === reel.creatorReelId}
                    title="Delete Reel"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="flex items-center gap-1">
                    {reel.status !== 'approved' && reel.status !== 'published' && (
                      <button
                        onClick={() => onStatusChange(reel.creatorReelId, 'approved')}
                        disabled={updatingReelId === reel.creatorReelId}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 size={12} />
                        <span>Approve</span>
                      </button>
                    )}

                    {reel.status !== 'published' && (
                      <button
                        onClick={() => onStatusChange(reel.creatorReelId, 'published')}
                        disabled={updatingReelId === reel.creatorReelId}
                        className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles size={12} />
                        <span>Publish</span>
                      </button>
                    )}

                    {reel.status !== 'rejected' && (
                      <button
                        onClick={() => onOpenRejectionModal(reel)}
                        disabled={updatingReelId === reel.creatorReelId}
                        className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-extrabold rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <XCircle size={12} />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
