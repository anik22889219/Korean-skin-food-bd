import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  User, 
  Video, 
  Upload, 
  Trophy, 
  Sparkles, 
  Star,
  Zap,
  Award,
  ChevronRight
} from 'lucide-react';

export const CreatorLayout: React.FC = () => {
  const { creatorProfile } = useAuth();

  const navItems = [
    { to: '/creator/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/creator/profile', label: 'My Profile', icon: User },
    { to: '/creator/reels', label: 'My Reels', icon: Video },
    { to: '/creator/reels/upload', label: 'Upload Reel', icon: Upload },
    { to: '/creator/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Banner Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-pink-950 to-slate-900 text-white border-b border-pink-900/30 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-pink-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Sparkles size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wide text-white uppercase">Creator Hub</span>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-black border border-pink-500/30 uppercase">
                  Level {creatorProfile?.level || 1}: {creatorProfile?.levelName || 'K-Beauty Novice'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full text-xs font-black">
              <Zap size={14} className="text-amber-400 fill-amber-400" />
              <span>{creatorProfile?.totalPoints || 0} Points</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto scrollbar-none">
          <nav className="flex items-center gap-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `
                    flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer border
                    ${isActive 
                      ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-600 shadow-md shadow-pink-500/20' 
                      : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100'
                    }
                  `}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};
