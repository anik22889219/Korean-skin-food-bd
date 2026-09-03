import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Crown, Sparkles, ArrowRight, Award, Eye } from 'lucide-react';
import { getLeaderboard, PublicCreatorLeaderboardEntry } from '../services/creatorLeaderboardService';
import { PublicCreatorProfileModal } from './PublicCreatorProfileModal';

export const TopCreatorsSection: React.FC = () => {
  const navigate = useNavigate();
  const [topCreators, setTopCreators] = useState<PublicCreatorLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCreator, setSelectedCreator] = useState<PublicCreatorLeaderboardEntry | null>(null);

  useEffect(() => {
    getLeaderboard('all_time', 4).then((data) => {
      setTopCreators(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  if (!isLoading && topCreators.length === 0) {
    return null; // Don't render empty section if no creators yet
  }

  return (
    <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-purple-900/30 my-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider mb-2">
            <Crown size={12} className="text-amber-400" /> K-Beauty Ambassador Network
          </span>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <Trophy className="text-amber-400" size={24} />
            Top Performing K-Beauty Creators
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Meet our highest-ranked creators verified through real Facebook engagement & reel reviews.
          </p>
        </div>

        <button
          onClick={() => navigate('/creator/leaderboard')}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <span>View Full Leaderboard</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 animate-pulse h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {topCreators.map((creator) => {
            const isFirst = creator.rank === 1;
            return (
              <div
                key={creator.creatorId}
                onClick={() => setSelectedCreator(creator)}
                className={`bg-slate-800/80 hover:bg-slate-800 border ${
                  isFirst ? 'border-amber-400/60 bg-amber-950/20' : 'border-slate-700/80'
                } rounded-2xl p-4 transition-all cursor-pointer group flex flex-col justify-between`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={creator.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                      alt={creator.displayName}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-600 bg-slate-900"
                    />
                    <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                      creator.rank === 1 ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-200'
                    }`}>
                      #{creator.rank}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-white group-hover:text-rose-400 transition-colors truncate">
                      {creator.displayName}
                    </div>
                    <div className="text-[10px] text-rose-400 font-medium truncate">
                      @{creator.username}
                    </div>
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 text-[9px] font-bold mt-1">
                      <Award size={10} /> Lvl {creator.level}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <Eye size={12} className="text-blue-400" /> {creator.totalViews.toLocaleString()} views
                  </span>
                  <span className="font-black text-rose-400 flex items-center gap-1">
                    <Sparkles size={12} /> {creator.totalPoints.toLocaleString()} pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Public Creator Profile Inspection Modal */}
      <PublicCreatorProfileModal
        creator={selectedCreator}
        isOpen={Boolean(selectedCreator)}
        onClose={() => setSelectedCreator(null)}
      />
    </div>
  );
};
