import React from 'react';
import { X, Trophy, Eye, ThumbsUp, MessageSquare, Video, Crown, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { PublicCreatorLeaderboardEntry } from '../services/creatorLeaderboardService';

interface PublicCreatorProfileModalProps {
  creator: PublicCreatorLeaderboardEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PublicCreatorProfileModal: React.FC<PublicCreatorProfileModalProps> = ({
  creator,
  isOpen,
  onClose
}) => {
  if (!isOpen || !creator) return null;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { label: '🥇 #1 Legend', color: 'bg-amber-500 text-white border-amber-400' };
    if (rank === 2) return { label: '🥈 #2 Master', color: 'bg-slate-300 text-slate-900 border-slate-200' };
    if (rank === 3) return { label: '🥉 #3 Specialist', color: 'bg-amber-700 text-white border-amber-600' };
    return { label: `#${rank} Top Creator`, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const rankBadge = getRankBadge(creator.rank);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Cover Banner */}
        <div className="h-32 bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 relative p-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${rankBadge.color}`}>
              {rankBadge.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all backdrop-blur-md"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile Header & Avatar */}
        <div className="px-6 pb-6 pt-0 relative flex-1 overflow-y-auto">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative">
              <img
                src={creator.profileImage}
                alt={creator.displayName}
                className="w-24 h-24 rounded-2xl border-4 border-white object-cover shadow-lg bg-slate-100"
              />
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow border border-white flex items-center gap-1">
                <Crown size={10} /> Lvl {creator.level}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Verified Points</div>
              <div className="text-2xl font-black text-rose-600 flex items-center justify-end gap-1">
                <Sparkles size={20} className="text-rose-500" />
                {creator.totalPoints.toLocaleString()} <span className="text-xs text-rose-400 font-bold">PTS</span>
              </div>
            </div>
          </div>

          {/* Public Profile Info */}
          <div className="space-y-1 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">{creator.displayName}</h2>
              <CheckCircle2 size={18} className="text-rose-500 fill-rose-50" />
            </div>
            <p className="text-xs font-bold text-rose-500">@{creator.username}</p>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100 mt-2">
              <Award size={14} className="text-purple-600" />
              <span>{creator.levelName}</span>
            </div>

            {creator.bio && (
              <p className="text-xs text-slate-600 mt-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
                "{creator.bio}"
              </p>
            )}
          </div>

          {/* Performance Summary Metrics Grid */}
          <div className="mt-6 space-y-2">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Public Performance Stats</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100 text-center">
                <Video size={18} className="text-rose-500 mx-auto mb-1" />
                <div className="text-base font-black text-slate-900">{creator.totalReels}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Reels</div>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 text-center">
                <Eye size={18} className="text-blue-500 mx-auto mb-1" />
                <div className="text-base font-black text-slate-900">{creator.totalViews.toLocaleString()}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Views</div>
              </div>

              <div className="p-3 bg-pink-50/60 rounded-2xl border border-pink-100 text-center">
                <ThumbsUp size={18} className="text-pink-500 mx-auto mb-1" />
                <div className="text-base font-black text-slate-900">{creator.totalLikes.toLocaleString()}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Likes</div>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-100 text-center">
                <MessageSquare size={18} className="text-amber-500 mx-auto mb-1" />
                <div className="text-base font-black text-slate-900">{creator.totalComments.toLocaleString()}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Comments</div>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Verified K-Beauty Creator</span>
            <span>Public Information Only</span>
          </div>
        </div>
      </div>
    </div>
  );
};
