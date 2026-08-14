import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { applyForCreatorProfile } from '../services/creatorService';
import { 
  Sparkles, 
  Clock, 
  ShieldAlert, 
  UserCheck, 
  ArrowRight, 
  CheckCircle2, 
  Send, 
  Lock,
  Camera,
  Star,
  Zap,
  Award
} from 'lucide-react';
import { motion } from 'motion/react';

export const CreatorRoute: React.FC = () => {
  const { user, profile, creatorProfile, loading, signInWithGoogle } = useAuth();

  // Application form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(profile?.name || user?.displayName || '');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [profileImage, setProfileImage] = useState(profile?.photoURL || user?.photoURL || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-600">Verifying Creator Status...</p>
      </div>
    );
  }

  // Case 1: Not logged in -> Prompt to Sign In
  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 bg-slate-50/50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl border border-pink-100 p-8 shadow-xl shadow-pink-100/50 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-gradient-to-tr from-pink-500 to-rose-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-pink-500/30">
            <Sparkles size={36} />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-[11px] font-black uppercase tracking-wider">
              K-Beauty Creator Network
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">Sign In to Continue</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Join Korean Skin Food's exclusive Creator Program. Share skincare reels, earn points, level up, and gain rewards.
            </p>
          </div>

          <button
            onClick={signInWithGoogle}
            className="w-full py-3.5 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 hover:from-pink-700 hover:to-rose-600 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <UserCheck size={18} />
            <span>Sign In with Google</span>
          </button>
        </motion.div>
      </div>
    );
  }

  // Case 2: No Creator Profile yet -> Show Application Form
  if (!creatorProfile) {
    const handleApply = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!username.trim() || !displayName.trim()) {
        setErrorMsg('Username and Display Name are required.');
        return;
      }

      setIsSubmitting(true);
      setErrorMsg('');

      try {
        await applyForCreatorProfile({
          userId: user.uid,
          email: user.email || '',
          phone: phone || '',
          username: username.trim(),
          displayName: displayName.trim(),
          bio: bio.trim(),
          profileImage: profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        });
      } catch (err: any) {
        console.error('Creator application error:', err);
        setErrorMsg(err.message || 'Failed to submit creator application. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-pink-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl border border-pink-900/30 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5">
              <Star size={13} className="text-amber-400 fill-amber-400" /> Apply Now
            </span>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Become an Official K-Beauty Creator
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Showcase your glow transformation, test authentic Korean skincare products, publish reels, earn reward points, and unlock exclusive ambassador perks!
            </p>
          </div>
        </div>

        {/* Perks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-pink-50/60 p-5 rounded-2xl border border-pink-100 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-600 text-white flex items-center justify-center shrink-0">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase">Earn Engagement Points</h3>
              <p className="text-[11px] text-slate-600 mt-1">Get rewarded for views, likes, and genuine community interactions.</p>
            </div>
          </div>

          <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-100 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Award size={20} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase">Level Up Badges</h3>
              <p className="text-[11px] text-slate-600 mt-1">Advance from K-Beauty Novice to Glow Ambassador with unique creator tier perks.</p>
            </div>
          </div>

          <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-100 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase">Exclusive Product Box</h3>
              <p className="text-[11px] text-slate-600 mt-1">Approved creators receive early access samples directly from Seoul.</p>
            </div>
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 md:p-8">
          <h2 className="text-lg font-black text-slate-900 mb-1">Creator Profile Setup</h2>
          <p className="text-xs text-slate-500 mb-6">Complete your public creator handle and bio to submit for review.</p>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold mb-4">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleApply} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Unique Creator Handle (@username) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">@</span>
                  <input
                    type="text"
                    required
                    placeholder="skin_glow_queen"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="K-Beauty Glow Ambassador"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  placeholder="01711223344"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Profile Avatar Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={profileImage}
                  onChange={(e) => setProfileImage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Short Creator Bio
              </label>
              <textarea
                rows={3}
                placeholder="Share your skincare skin type, favorite routine, or social media handles..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 hover:from-pink-700 hover:to-rose-600 text-white text-xs font-black rounded-2xl shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition"
              >
                <Send size={16} />
                <span>{isSubmitting ? 'Submitting Application...' : 'Submit Creator Application'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Case 3: Status is Pending -> Show Pending Screen
  if (creatorProfile.status === 'pending') {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl border border-amber-200 p-8 shadow-xl shadow-amber-100/50 text-center space-y-6"
        >
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <Clock size={32} className="animate-pulse" />
          </div>

          <div>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider rounded-full border border-amber-200">
              Application Under Review
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-3">Welcome, @{creatorProfile.username}!</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Your Creator Application has been received and is currently being reviewed by the Korean Skin Food administration team.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Display Name:</span>
              <span className="font-bold text-slate-800">{creatorProfile.displayName}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Applied On:</span>
              <span className="font-bold text-slate-800">{new Date(creatorProfile.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Current Status:</span>
              <span className="font-black text-amber-600 uppercase">Pending Review</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            Once approved by our team, your Creator Dashboard access will unlock automatically.
          </p>
        </motion.div>
      </div>
    );
  }

  // Case 4: Status is Suspended -> Show Suspended Screen
  if (creatorProfile.status === 'suspended') {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl border border-rose-200 p-8 shadow-xl shadow-rose-100/50 text-center space-y-6"
        >
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert size={32} />
          </div>

          <div>
            <span className="px-3 py-1 bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider rounded-full border border-rose-200">
              Creator Account Suspended
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-3">Access Blocked</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Your creator profile (@{creatorProfile.username}) has been suspended by store administration. Creator actions and reel publishing are currently restricted.
            </p>
          </div>

          <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200 text-xs text-rose-800 text-left">
            <p className="font-extrabold mb-1">Need help?</p>
            <p className="text-[11px]">Please reach out to Korean Skin Food Support at support@koreanskinfood.bd or contact an HR manager to resolve this appeal.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Case 5: Status is Approved -> Grant Access to Creator Routes!
  return <Outlet />;
};
