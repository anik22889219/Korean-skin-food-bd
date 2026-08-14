import React, { useState, useEffect } from 'react';
import { 
  Trophy, Award, Crown, Sparkles, Eye, ThumbsUp, MessageSquare, 
  Video, Filter, RefreshCw, Calendar, Search, ChevronRight, UserCheck
} from 'lucide-react';
import { 
  getLeaderboard, 
  subscribeToLeaderboard, 
  LeaderboardPeriod, 
  PublicCreatorLeaderboardEntry 
} from '../services/creatorLeaderboardService';
import { PublicCreatorProfileModal } from './PublicCreatorProfileModal';

interface LeaderboardViewProps {
  isAdminView?: boolean;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ isAdminView = false }) => {
  const [period, setPeriod] = useState<LeaderboardPeriod>('all_time');
  const [leaderboard, setLeaderboard] = useState<PublicCreatorLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');
  
  // Selected creator for modal inspect
  const [selectedCreator, setSelectedCreator] = useState<PublicCreatorLeaderboardEntry | null>(null);

  useEffect(() => {
    setIsLoading(true);
    // Initial fetch
    getLeaderboard(period).then((data) => {
      setLeaderboard(data);
      setIsLoading(false);
    });

    // Real-time listener
    const unsubscribe = subscribeToLeaderboard(period, (data) => {
      setLeaderboard(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [period]);

  const filteredList = leaderboard.filter(item => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return item.displayName.toLowerCase().includes(term) || item.username.toLowerCase().includes(term);
  });

  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) {
      return {
        badge: 'bg-amber-500 text-white shadow-amber-200 shadow-md',
        border: 'border-amber-300 bg-amber-50/40',
        crown: 'text-amber-500',
        label: '🥇 1st Place'
      };
    }
    if (rank === 2) {
      return {
        badge: 'bg-slate-400 text-white shadow-slate-200 shadow-md',
        border: 'border-slate-300 bg-slate-50/40',
        crown: 'text-slate-400',
        label: '🥈 2nd Place'
      };
    }
    if (rank === 3) {
      return {
        badge: 'bg-amber-700 text-white shadow-amber-900/20 shadow-md',
        border: 'border-amber-200 bg-amber-50/20',
        crown: 'text-amber-700',
        label: '🥉 3rd Place'
      };
    }
    return {
      badge: 'bg-slate-100 text-slate-700 border border-slate-200',
      border: 'border-slate-200 bg-white hover:bg-slate-50',
      crown: 'text-slate-400',
      label: `#${rank}`
    };
  };

  const top3 = filteredList.slice(0, 3);
  const restList = filteredList.slice(3);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-purple-900/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider">
              <Crown size={14} className="text-amber-400" /> Official K-Beauty Ranking
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Trophy className="text-amber-400 fill-amber-400/20" size={32} />
              Creator Performance Leaderboard
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
              Real-time verified creator rankings based on total engagement points, Facebook video views, likes, and comments.
            </p>
          </div>

          {/* Period Selection Controls */}
          <div className="flex items-center bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 backdrop-blur-md self-start md:self-auto">
            <button
              onClick={() => setPeriod('all_time')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                period === 'all_time'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles size={14} /> All Time
            </button>
            <button
              onClick={() => setPeriod('this_month')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                period === 'this_month'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Calendar size={14} /> This Month
            </button>
            <button
              onClick={() => setPeriod('this_week')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                period === 'this_week'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ClockIcon size={14} /> This Week
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search creator name or username..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span>Ranking criteria:</span>
          <span className="font-extrabold text-slate-800">1. Points</span> →
          <span className="text-slate-600">2. Views</span> →
          <span className="text-slate-600">3. Likes</span> →
          <span className="text-slate-600">4. Comments</span>
        </div>
      </div>

      {/* TOP 3 PODIUM SECTION (ON LARGE SCREENS & CARDS ON MOBILE) */}
      {!isLoading && top3.length > 0 && !searchFilter && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* 2ND PLACE (Display 2nd first on desktop layout, or sorted 1st, 2nd, 3rd) */}
          {top3.map((creator) => {
            const badgeStyle = getRankBadgeStyle(creator.rank);
            return (
              <div
                key={creator.creatorId}
                onClick={() => setSelectedCreator(creator)}
                className={`rounded-3xl border ${badgeStyle.border} p-6 shadow-sm hover:shadow-md transition-all cursor-pointer relative flex flex-col justify-between group overflow-hidden`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={creator.profileImage}
                        alt={creator.displayName}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow bg-slate-100"
                      />
                      <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-black ${badgeStyle.badge}`}>
                        #{creator.rank}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-rose-600 transition-colors flex items-center gap-1">
                        {creator.displayName}
                      </h3>
                      <p className="text-xs font-bold text-rose-500">@{creator.username}</p>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-extrabold mt-1">
                        Lvl {creator.level} • {creator.levelName}
                      </span>
                    </div>
                  </div>
                  <Crown size={24} className={badgeStyle.crown} />
                </div>

                <div className="bg-white/80 backdrop-blur p-3 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Points</span>
                    <span className="text-base font-black text-rose-600 flex items-center gap-1">
                      <Sparkles size={14} /> {creator.totalPoints.toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-100 text-center text-[10px]">
                    <div>
                      <span className="text-slate-400 block font-bold">Views</span>
                      <span className="font-extrabold text-slate-800">{creator.totalViews.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">Likes</span>
                      <span className="font-extrabold text-slate-800">{creator.totalLikes.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">Comments</span>
                      <span className="font-extrabold text-slate-800">{creator.totalComments.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold">Reels</span>
                      <span className="font-extrabold text-slate-800">{creator.totalReels}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LEADERBOARD TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw size={28} className="animate-spin mx-auto text-rose-500" />
            <p className="text-xs font-bold">Loading verified creator rankings...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Trophy size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-800">No approved creators found for this timeframe.</p>
            <p className="text-xs text-slate-400">Rankings update automatically as creators submit and approve reels.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-16">Rank</th>
                  <th className="py-3.5 px-4">Creator</th>
                  <th className="py-3.5 px-4">Level</th>
                  <th className="py-3.5 px-4 text-right">Points</th>
                  <th className="py-3.5 px-4 text-right hidden sm:table-cell">Views</th>
                  <th className="py-3.5 px-4 text-right hidden md:table-cell">Likes</th>
                  <th className="py-3.5 px-4 text-right hidden lg:table-cell">Comments</th>
                  <th className="py-3.5 px-4 text-center hidden xl:table-cell">Reels</th>
                  <th className="py-3.5 px-4 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredList.map((creator) => {
                  const badgeStyle = getRankBadgeStyle(creator.rank);
                  return (
                    <tr
                      key={creator.creatorId}
                      onClick={() => setSelectedCreator(creator)}
                      className="hover:bg-rose-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Rank */}
                      <td className="py-4 px-4 text-center font-black">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-extrabold text-xs ${badgeStyle.badge}`}>
                          {creator.rank <= 3 ? (creator.rank === 1 ? '🥇' : creator.rank === 2 ? '🥈' : '🥉') : creator.rank}
                        </span>
                      </td>

                      {/* Creator Info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={creator.profileImage}
                            alt={creator.displayName}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-slate-100"
                          />
                          <div>
                            <div className="font-extrabold text-slate-900 group-hover:text-rose-600 transition-colors flex items-center gap-1.5">
                              {creator.displayName}
                            </div>
                            <div className="text-[11px] font-bold text-slate-400">@{creator.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Level */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-100">
                          <Award size={12} className="text-purple-600" />
                          Lvl {creator.level}: {creator.levelName}
                        </span>
                      </td>

                      {/* Points */}
                      <td className="py-4 px-4 text-right font-black text-rose-600 text-sm">
                        <div className="flex items-center justify-end gap-1">
                          <Sparkles size={14} className="text-rose-500" />
                          {creator.totalPoints.toLocaleString()}
                        </div>
                      </td>

                      {/* Views */}
                      <td className="py-4 px-4 text-right font-extrabold text-slate-800 hidden sm:table-cell">
                        <span className="flex items-center justify-end gap-1 text-slate-700">
                          <Eye size={13} className="text-blue-500" />
                          {creator.totalViews.toLocaleString()}
                        </span>
                      </td>

                      {/* Likes */}
                      <td className="py-4 px-4 text-right font-extrabold text-slate-800 hidden md:table-cell">
                        <span className="flex items-center justify-end gap-1 text-slate-700">
                          <ThumbsUp size={13} className="text-pink-500" />
                          {creator.totalLikes.toLocaleString()}
                        </span>
                      </td>

                      {/* Comments */}
                      <td className="py-4 px-4 text-right font-extrabold text-slate-800 hidden lg:table-cell">
                        <span className="flex items-center justify-end gap-1 text-slate-700">
                          <MessageSquare size={13} className="text-amber-500" />
                          {creator.totalComments.toLocaleString()}
                        </span>
                      </td>

                      {/* Reels */}
                      <td className="py-4 px-4 text-center font-extrabold text-slate-800 hidden xl:table-cell">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                          <Video size={12} className="text-slate-500" />
                          {creator.totalReels}
                        </span>
                      </td>

                      {/* Action Chevron */}
                      <td className="py-4 px-4 text-center text-slate-300 group-hover:text-rose-500">
                        <ChevronRight size={18} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Public Creator Profile Inspection Modal */}
      <PublicCreatorProfileModal
        creator={selectedCreator}
        isOpen={Boolean(selectedCreator)}
        onClose={() => setSelectedCreator(null)}
      />
    </div>
  );
};

function ClockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
