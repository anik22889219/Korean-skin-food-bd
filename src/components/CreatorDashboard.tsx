import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  Video, 
  Eye, 
  Heart, 
  MessageSquare, 
  Award, 
  Zap, 
  Star, 
  User, 
  CheckCircle2, 
  TrendingUp, 
  PlusCircle, 
  Clock, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export const CreatorDashboard: React.FC = () => {
  const { creatorProfile } = useAuth();

  if (!creatorProfile) return null;

  const progressPercent = Math.min(
    100,
    Math.max(0, creatorProfile.levelProgress || 0)
  );

  return (
    <div className="space-y-6">
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
              <span>Publish Reel</span>
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
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Current Tier & Status</span>
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
              Level Progress
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
                  <CheckCircle2 size={13} /> Max Tier Achieved ({creatorProfile.levelName})
                </span>
              )}
            </span>
            <span>Next Goal: {creatorProfile.nextLevelPoints.toLocaleString()} pts</span>
          </div>
        </div>

        {/* Transparent Points Rules Explanation */}
        <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-3.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold shrink-0">
            <Zap size={14} className="text-amber-600 fill-amber-500" />
            <span>Point Calculation Rules:</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-amber-800 flex-wrap">
            <span className="bg-white/80 px-2 py-0.5 rounded-lg border border-amber-200/80">100 Views = 1 Point</span>
            <span className="bg-white/80 px-2 py-0.5 rounded-lg border border-amber-200/80">10 Likes = 2 Points</span>
            <span className="bg-white/80 px-2 py-0.5 rounded-lg border border-amber-200/80">1 Comment = 3 Points</span>
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
            <span className="text-[10px] font-black uppercase tracking-wider">Total Reels</span>
            <Video size={18} />
          </div>
          <div className="text-2xl font-black text-slate-900">{creatorProfile.totalReels}</div>
          <span className="text-[10px] text-pink-700 font-bold block">Published Videos</span>
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
            <h3 className="text-base font-black text-slate-900">Recent Reels</h3>
            <p className="text-xs text-slate-500">Your latest published skincare transformations and reviews</p>
          </div>
          <Link
            to="/creator/reels"
            className="text-xs font-black text-pink-600 hover:text-pink-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Empty State / Notice */}
        <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-3">
          <div className="w-14 h-14 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mx-auto border border-pink-200">
            <Video size={28} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-sm font-black text-slate-900">No Reels Published Yet</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Publish your first reel showcasing your Korean skincare routine. Reel upload and automated Facebook metrics tracking will be enabled in Step 2!
            </p>
          </div>
          <Link
            to="/creator/reels/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold rounded-xl shadow-md transition cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Go to Reel Upload</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
