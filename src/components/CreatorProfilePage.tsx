import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateCreatorProfileData } from '../services/creatorService';
import { 
  User, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Award, 
  Zap, 
  ShieldCheck, 
  Camera, 
  Sparkles,
  MapPin,
  Share2,
  Gift,
  ExternalLink,
  ChevronRight,
  Flame,
  Globe,
  Instagram,
  Facebook,
  Youtube
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export const CreatorProfilePage: React.FC = () => {
  const { creatorProfile } = useAuth();

  const [displayName, setDisplayName] = useState(creatorProfile?.displayName || '');
  const [username, setUsername] = useState(creatorProfile?.username || '');
  const [bio, setBio] = useState(creatorProfile?.bio || '');
  const [phone, setPhone] = useState(creatorProfile?.phone || '');
  const [profileImage, setProfileImage] = useState(creatorProfile?.profileImage || '');
  const [shippingAddress, setShippingAddress] = useState(creatorProfile?.shippingAddress || '');
  const [instagram, setInstagram] = useState(creatorProfile?.socialLinks?.instagram || '');
  const [facebook, setFacebook] = useState(creatorProfile?.socialLinks?.facebook || '');
  const [tiktok, setTiktok] = useState(creatorProfile?.socialLinks?.tiktok || '');
  const [youtube, setYoutube] = useState(creatorProfile?.socialLinks?.youtube || '');

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!creatorProfile) return null;

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim()) {
      showToast('error', 'Display Name and Username are required.');
      return;
    }

    setIsSaving(true);
    try {
      await updateCreatorProfileData(creatorProfile.creatorId, {
        displayName: displayName.trim(),
        username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
        bio: bio.trim(),
        phone: phone.trim(),
        profileImage: profileImage.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        shippingAddress: shippingAddress.trim(),
        socialLinks: {
          instagram: instagram.trim(),
          facebook: facebook.trim(),
          tiktok: tiktok.trim(),
          youtube: youtube.trim()
        }
      });
      showToast('success', 'Creator profile and PR shipping address updated successfully!');
    } catch (err: any) {
      console.error('Failed to update creator profile:', err);
      showToast('error', err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-4 sm:right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-bold ${
              toast.type === 'success' 
                ? 'bg-emerald-950 text-emerald-200 border-emerald-800' 
                : 'bg-rose-950 text-rose-200 border-rose-800'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-pink-500 shadow-md shrink-0 bg-slate-100 relative group">
            <img 
              src={profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'} 
              alt={displayName} 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900">{creatorProfile.displayName}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                {creatorProfile.status}
              </span>
            </div>
            <p className="text-xs font-mono text-pink-600 font-bold">@{creatorProfile.username}</p>
            <p className="text-xs text-slate-500 mt-0.5">{creatorProfile.email}</p>
          </div>
        </div>

        {/* Readonly Tier Cards */}
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs w-full md:w-auto justify-around shrink-0">
          <div className="text-center px-3 border-r border-slate-200">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Level</span>
            <span className="font-black text-slate-900 text-sm">Lvl {creatorProfile.level}</span>
          </div>
          <div className="text-center px-3 border-r border-slate-200">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Points</span>
            <span className="font-black text-amber-600 text-sm">{creatorProfile.totalPoints} pts</span>
          </div>
          <div className="text-center px-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Reels</span>
            <span className="font-black text-purple-600 text-sm">{creatorProfile.totalReels || 0}</span>
          </div>
        </div>
      </div>

      {/* PR Package Notice Card */}
      <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl p-5 border border-pink-200/80 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#E91E8C] text-white flex items-center justify-center shrink-0 shadow-sm">
          <Gift size={20} />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-black text-slate-900">PR Skincare Delivery Box Address</h4>
          <p className="text-slate-600 leading-relaxed font-medium">
            Make sure your courier delivery address and phone number are strictly accurate so our Seoul dispatch team can courier new product launches, toner pads, and sunscreens directly to your doorstep.
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <User className="text-pink-600" size={20} />
            Edit Creator Information
          </h2>
          <p className="text-xs text-slate-500">Update your public creator handle, display name, social profiles, and PR box address.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Display Name *</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Creator Username (@handle) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone / WhatsApp Number (for PR Box Delivery) *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01700-000000"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Avatar Image URL</label>
              <input
                type="url"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Bio / Skin Type Philosophy</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 resize-none"
              placeholder="e.g. Oily & Acne-prone skin enthusiast • Reviewing authentic Korean sunscreens & Centella serums in Bengali"
            />
          </div>

          {/* Social Profiles Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Connected Social Handles & Channels</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Instagram size={16} className="text-pink-600 shrink-0" />
                <input
                  type="text"
                  placeholder="Instagram username (e.g. @skincare_glow)"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 outline-none w-full"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Facebook size={16} className="text-blue-600 shrink-0" />
                <input
                  type="text"
                  placeholder="Facebook page / profile URL"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 outline-none w-full"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Sparkles size={16} className="text-slate-800 shrink-0" />
                <input
                  type="text"
                  placeholder="TikTok username"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 outline-none w-full"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Youtube size={16} className="text-red-600 shrink-0" />
                <input
                  type="text"
                  placeholder="YouTube channel URL"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 outline-none w-full"
                />
              </div>
            </div>
          </div>

          {/* PR Box Courier Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              PR Box Shipping Delivery Address (House, Road, Area, City)
            </label>
            <textarea
              rows={2}
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="e.g. House #14, Road #2, Dhanmondi, Dhaka 1205"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 resize-none"
            />
          </div>

          {/* Readonly Performance Lock Banner */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
            <Lock size={18} className="text-slate-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-extrabold text-slate-800">Verified System Rewards</p>
              <p className="text-[11px] leading-relaxed">
                Your Level ({creatorProfile.levelName}), Points ({creatorProfile.totalPoints}), Reel Views, Likes, and Comments are calculated automatically upon review to guarantee transparent leaderboards.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
            <Link
              to="/creator/dashboard"
              className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1"
            >
              ← Back to Creator Studio
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 transition"
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving Changes...' : 'Save Creator Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
