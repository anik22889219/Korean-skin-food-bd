import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { applyForCreatorProfile } from '../services/creatorService';
import { 
  Sparkles, 
  Star, 
  Zap, 
  Award, 
  Gift, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  ArrowRight, 
  HelpCircle, 
  UserCheck, 
  Share2, 
  Camera, 
  Heart, 
  Video, 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  Send,
  Lock,
  Globe,
  MessageCircle,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
];

const CREATOR_TIERS = [
  {
    level: 1,
    name: 'K-Beauty Novice',
    points: '0 - 99 pts',
    color: 'from-slate-100 to-slate-200 text-slate-800 border-slate-300',
    badgeBg: 'bg-slate-800 text-white',
    perks: ['Access to Creator Dashboard', 'Submit Facebook & Instagram Reels', 'Track live engagement points'],
  },
  {
    level: 2,
    name: 'Glow Enthusiast',
    points: '100 - 499 pts',
    color: 'from-emerald-50 to-teal-100 text-emerald-900 border-emerald-200',
    badgeBg: 'bg-emerald-600 text-white',
    perks: ['Free Mini Skincare Discovery Box', '5% Personal Store Discount', 'Public Creator Profile badge'],
  },
  {
    level: 3,
    name: 'Skin Specialist',
    points: '500 - 1,499 pts',
    color: 'from-blue-50 to-indigo-100 text-blue-900 border-blue-200',
    badgeBg: 'bg-blue-600 text-white',
    perks: ['Full-Sized Korean Serum or Sunscreen PR', '10% Personal Discount', 'Community Featured Spotlight'],
  },
  {
    level: 4,
    name: 'Radiant Star',
    points: '1,500 - 3,499 pts',
    color: 'from-purple-50 to-pink-100 text-purple-900 border-purple-200',
    badgeBg: 'bg-purple-600 text-white',
    perks: ['Premium Seoul Skincare Hamper', 'Reels featured on Store Home', 'Exclusive Affiliate Coupon Code'],
  },
  {
    level: 5,
    name: 'K-Beauty Icon',
    points: '3,500 - 7,499 pts',
    color: 'from-amber-50 to-orange-100 text-amber-900 border-amber-200',
    badgeBg: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white',
    perks: ['Bi-Monthly Full Skincare PR Package', 'Cash Bonus Rewards for Top Content', 'VIP Product Launch Invites'],
  },
  {
    level: 6,
    name: 'Glow Ambassador',
    points: '7,500+ pts',
    color: 'from-rose-100 via-pink-100 to-amber-100 text-rose-950 border-rose-300 shadow-md',
    badgeBg: 'bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 text-white',
    perks: ['Official Brand Ambassador Contract', 'Maximum Monthly Cash Monetization', 'Custom Sponsored Campaigns'],
  },
];

const FAQS = [
  {
    q: 'Who can apply to become a creator?',
    a: 'Anyone in Bangladesh passionate about skincare, Korean beauty cosmetics, barrier repair routines, and video creation! Whether you have 500 followers or 50,000, we value genuine reviews, engaging video reels, and aesthetic skincare content.',
  },
  {
    q: 'How does the Creator Points & Monetization system work?',
    a: 'Once approved, you post Facebook or Instagram reels reviewing or demonstrating authentic Korean skincare products. Submit your reel link on your creator dashboard. Our verified system tracks your views, likes, and comments, converting them into Creator Points to unlock reward tiers and cash out bonuses.',
  },
  {
    q: 'How do I receive free Korean Skincare PR Boxes?',
    a: 'Approved creators who reach Level 2 (Glow Enthusiast) and above receive complimentary authentic Korean skincare products imported straight from Seoul delivered via courier to your doorstep across Bangladesh.',
  },
  {
    q: 'How long does the application approval take?',
    a: 'Our admin team reviews submissions usually within 24 to 48 hours. Once approved, you will see your active creator dashboard and receive confirmation via WhatsApp or phone.',
  },
  {
    q: 'Is there any fee or cost to join the creator program?',
    a: 'No! Joining the Korean Skin Food BD Creator Program is 100% free. We invest in creators who create authentic, high-quality skincare content.',
  },
];

export const BecomeCreatorPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, creatorProfile, loading, signInWithGoogle } = useAuth();

  // Application form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(profile?.name || user?.displayName || '');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [niche, setNiche] = useState('Glass Skin & Hydration');
  const [profileImage, setProfileImage] = useState(profile?.photoURL || user?.photoURL || PRESET_AVATARS[0]);
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const scrollToForm = () => {
    const el = document.getElementById('apply_form_section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('Please sign in with Google first before submitting your application.');
      return;
    }
    if (!username.trim() || !displayName.trim()) {
      setErrorMsg('Username and Display Name are required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Phone / WhatsApp number is required so our team can contact you for PR deliveries.');
      return;
    }
    if (!agreedTerms) {
      setErrorMsg('Please accept the Creator Program Guidelines to continue.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await applyForCreatorProfile({
        userId: user.uid,
        email: user.email || '',
        phone: phone.trim(),
        username: username.trim(),
        displayName: displayName.trim(),
        bio: bio.trim() || `Passionate K-Beauty creator focusing on ${niche}.`,
        profileImage: profileImage || PRESET_AVATARS[0],
        facebookUrl: facebookUrl.trim(),
        instagramUrl: instagramUrl.trim(),
        niche: niche.trim(),
      });
      setSuccessMsg(true);
    } catch (err: any) {
      console.error('Creator application error:', err);
      setErrorMsg(err.message || 'Failed to submit creator application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="become_creator_page" className="min-h-screen bg-gradient-to-b from-[#FFF0F5]/70 via-white to-[#FFF5F8]/40 pb-20">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-10 pb-16 md:pt-16 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="absolute -top-24 right-0 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-rose-300/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-24 w-80 h-80 bg-gradient-to-tr from-purple-400/15 to-pink-300/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-100 border border-pink-200/80 text-pink-700 text-xs font-black uppercase tracking-wider shadow-xs">
            <Sparkles size={14} className="text-pink-600 animate-pulse" />
            <span>Official K-Beauty Creator Network</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight leading-[1.1]">
            Turn Your Skincare Passion Into <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#E91E8C] via-rose-500 to-purple-600 bg-clip-text text-transparent">
              Rewards, PR Gifts & Fame
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed">
            Join Korean Skin Food BD's exclusive Creator Program. Create authentic Facebook & Instagram reels, earn verified engagement points, climb the live leaderboard, and get free imported cosmeceuticals straight from Seoul.
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-2">
            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-pink-100 shadow-xs">
              <span className="text-xl sm:text-2xl font-black text-[#E91E8C]">100%</span>
              <p className="text-[11px] font-bold text-gray-600 uppercase mt-0.5">Seoul Genuine</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-pink-100 shadow-xs">
              <span className="text-xl sm:text-2xl font-black text-purple-600">6 Tiers</span>
              <p className="text-[11px] font-bold text-gray-600 uppercase mt-0.5">Progressive Levels</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-pink-100 shadow-xs">
              <span className="text-xl sm:text-2xl font-black text-emerald-600">Free PR</span>
              <p className="text-[11px] font-bold text-gray-600 uppercase mt-0.5">Product Hampers</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-pink-100 shadow-xs">
              <span className="text-xl sm:text-2xl font-black text-amber-600">Cash & Perks</span>
              <p className="text-[11px] font-bold text-gray-600 uppercase mt-0.5">Monetization</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={scrollToForm}
              className="px-8 py-4 bg-gradient-to-r from-[#E91E8C] via-rose-500 to-[#E91E8C] hover:from-pink-700 hover:to-rose-600 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-pink-500/25 flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Sparkles size={18} />
              <span>Apply to Become a Creator</span>
              <ArrowRight size={18} />
            </button>

            <Link
              to="/creator/leaderboard"
              className="px-6 py-4 bg-white hover:bg-pink-50 text-gray-800 hover:text-pink-600 font-extrabold text-sm sm:text-base rounded-2xl border border-pink-200/80 shadow-xs flex items-center gap-2 transition-all"
            >
              <Flame size={18} className="text-amber-500" />
              <span>View Live Leaderboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. PROGRAM PERKS & BENEFITS */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-black uppercase text-[#E91E8C] tracking-widest block mb-1">
            Why Join Our Creator Squad
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Everything You Need to Grow & Shine
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#E91E8C] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Gift size={24} />
            </div>
            <h3 className="text-base font-extrabold text-gray-900">Authentic Seoul PR Boxes</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
              Receive 100% genuine imported Korean skincare products (sun creams, snail mucin, barrier serums, cleansers) delivered straight to your door across Bangladesh.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap size={24} />
            </div>
            <h3 className="text-base font-extrabold text-gray-900">Points on Views & Likes</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
              Every Facebook Reel you share generates points based on verified views, likes, and comments. Turn your audience engagement into measurable creator credit.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Award size={24} />
            </div>
            <h3 className="text-base font-extrabold text-gray-900">6-Tier Level Progression</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
              Advance from Novice to Glow Ambassador. Higher tiers unlock personal store discounts, exclusive creator hampers, and paid sponsorship opportunities.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <TrendingUp size={24} />
            </div>
            <h3 className="text-base font-extrabold text-gray-900">Live Public Leaderboard</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
              Get showcased on the Korean Skin Food BD store leaderboard. Gain new followers, build credibility as a trusted skincare advisor, and gain industry recognition.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Video size={24} />
            </div>
            <h3 className="text-base font-extrabold text-gray-900">Home Store Showcase</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
              Top performing reels are featured in our Community Live carousel right on our website homepage, seen by thousands of daily skincare shoppers in BD.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MessageCircle size={24} />
            </div>
            <h3 className="text-base font-extrabold text-gray-900">VIP Creator WhatsApp Group</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
              Connect directly with Korean beauty specialists, get product formulation guides, early news on new Seoul arrivals, and priority admin support.
            </p>
          </div>
        </div>
      </section>

      {/* 3. STEP-BY-STEP PROCESS */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-black uppercase text-pink-400 tracking-widest block mb-1">
              Easy 4-Step Process
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              How to Become an Official Creator
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 relative">
              <span className="w-8 h-8 rounded-xl bg-pink-600 text-white font-black text-xs flex items-center justify-center mb-4 shadow-md">
                1
              </span>
              <h3 className="text-sm font-black text-white">Apply with Your Profile</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Fill out the quick creator registration form below with your handle, phone, and skincare niche.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 relative">
              <span className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center mb-4 shadow-md">
                2
              </span>
              <h3 className="text-sm font-black text-white">Admin Verification</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Our team reviews your submission within 24-48 hours and activates your verified Creator Account.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 relative">
              <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center mb-4 shadow-md">
                3
              </span>
              <h3 className="text-sm font-black text-white">Create & Post Reels</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Create engaging Facebook & Instagram reels testing Korean skincare, and submit the link in your dashboard.
              </p>
            </div>

            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 relative">
              <span className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center mb-4 shadow-md">
                4
              </span>
              <h3 className="text-sm font-black text-white">Earn Points & PR Gifts</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Climb the 6 tiers, level up to Glow Ambassador, claim free PR boxes, and earn cash rewards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CREATOR TIERS MATRIX */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-black uppercase text-[#E91E8C] tracking-widest block mb-1">
            Progression Roadmap
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Creator Tiers & Exclusive Perks
          </h2>
          <p className="text-xs text-gray-600 mt-2">
            The more quality reels you post and engagement you generate, the higher your tier and rewards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CREATOR_TIERS.map((tier) => (
            <div 
              key={tier.level}
              className={`rounded-3xl p-6 border bg-gradient-to-br ${tier.color} transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${tier.badgeBg}`}>
                  Level {tier.level}
                </span>
                <span className="text-xs font-mono font-black">{tier.points}</span>
              </div>

              <h3 className="text-lg font-black">{tier.name}</h3>

              <div className="mt-4 pt-4 border-t border-black/10 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wider opacity-70">Tier Privileges:</p>
                <ul className="space-y-1.5">
                  {tier.perks.map((perk, i) => (
                    <li key={i} className="text-xs font-semibold flex items-start gap-2">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5 opacity-80" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. INTERACTIVE REGISTRATION & APPLICATION FORM */}
      <section id="apply_form_section" className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl border border-pink-100 shadow-xl overflow-hidden">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#E91E8C] via-rose-500 to-purple-600 p-8 text-white relative">
            <div className="relative z-10">
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
                <Sparkles size={13} /> Official Registration
              </span>
              <h2 className="text-2xl sm:text-3xl font-black">Creator Application Form</h2>
              <p className="text-xs text-white/90 mt-1">
                Fill in your creator handle, social links, and phone number to apply for review.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8">

            {/* Case A: Not logged in */}
            {!user && (
              <div className="py-8 text-center space-y-6 max-w-md mx-auto">
                <div className="w-16 h-16 bg-pink-100 text-[#E91E8C] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <UserCheck size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Sign In with Google to Apply</h3>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                    We use Google Sign-In to verify creator identities and securely manage your dashboard and analytics.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="w-full py-4 bg-gradient-to-r from-[#E91E8C] via-rose-500 to-[#E91E8C] hover:from-pink-700 hover:to-rose-600 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <UserCheck size={18} />
                  <span>Sign In with Google</span>
                </button>
              </div>
            )}

            {/* Case B: User logged in and ALREADY a creator */}
            {user && creatorProfile && (
              <div className="py-6 space-y-6">
                {creatorProfile.status === 'pending' && (
                  <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <Clock size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-black">Application Under Review</h3>
                        <p className="text-xs text-amber-800 mt-0.5">
                          Hello @{creatorProfile.username}! Your creator profile has been submitted and is currently being evaluated by our team.
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-amber-700 leading-relaxed pt-2 border-t border-amber-200/80">
                      Reviews usually complete within 24 to 48 hours. Once approved, you can immediately start submitting reels and earning points!
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Link
                        to="/creator/profile"
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition"
                      >
                        View My Submitted Profile
                      </Link>
                      <a
                        href="https://m.me/651561268050601"
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-white text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition hover:bg-amber-100"
                      >
                        Contact Support on Messenger
                      </a>
                    </div>
                  </div>
                )}

                {creatorProfile.status === 'approved' && (
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-black">You are an Official Verified Creator! 🎉</h3>
                        <p className="text-xs text-emerald-800">
                          Welcome back, <strong>{creatorProfile.displayName}</strong> (@{creatorProfile.username}) • Tier: <strong>{creatorProfile.levelName}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                      <div className="p-3 bg-white rounded-xl border border-emerald-100">
                        <span className="font-mono font-black text-emerald-700 text-lg">{creatorProfile.totalPoints}</span>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Points</p>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-emerald-100">
                        <span className="font-mono font-black text-emerald-700 text-lg">Level {creatorProfile.level}</span>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Current Tier</p>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-emerald-100">
                        <span className="font-mono font-black text-emerald-700 text-lg">{creatorProfile.totalReels}</span>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Reels</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <Link
                        to="/creator/dashboard"
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Sparkles size={14} />
                        <span>Go to Creator Dashboard</span>
                      </Link>
                      <Link
                        to="/creator/reels/upload"
                        className="px-5 py-2.5 bg-[#E91E8C] hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Video size={14} />
                        <span>Upload New Reel</span>
                      </Link>
                      <Link
                        to="/creator/leaderboard"
                        className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-xl text-xs font-bold transition"
                      >
                        Check Leaderboard
                      </Link>
                    </div>
                  </div>
                )}

                {creatorProfile.status === 'suspended' && (
                  <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="text-rose-600" size={24} />
                      <h3 className="text-base font-black">Creator Account Suspended</h3>
                    </div>
                    <p className="text-xs text-rose-700">
                      Your creator account is currently suspended. Please contact the administrative support team to resolve this issue.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Case C: User logged in, has NO creator profile yet -> Render Application Form */}
            {user && !creatorProfile && (
              <>
                {successMsg ? (
                  <div className="py-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={36} />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">Application Submitted Successfully!</h3>
                    <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                      Thank you for applying to become a Korean Skin Food BD Creator. Our team will review your profile and social channels within 24-48 hours.
                    </p>
                    <div className="pt-4 flex justify-center gap-3">
                      <button
                        onClick={() => navigate('/creator/dashboard')}
                        className="px-6 py-3 bg-[#E91E8C] text-white text-xs font-bold rounded-xl shadow-md"
                      >
                        Go to Creator Portal
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleApply} className="space-y-6">
                    {errorMsg && (
                      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold">
                        {errorMsg}
                      </div>
                    )}

                    {/* Choose Avatar */}
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">
                        Creator Profile Picture
                      </label>
                      <div className="flex items-center gap-4 flex-wrap">
                        <img 
                          src={profileImage || PRESET_AVATARS[0]} 
                          alt="Avatar Preview" 
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E91E8C] shadow-sm shrink-0" 
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          {PRESET_AVATARS.map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setProfileImage(url)}
                              className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition ${
                                profileImage === url ? 'border-[#E91E8C] scale-105 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Unique Creator Handle (@username) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">@</span>
                          <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            placeholder="e.g. glowing_mim"
                            className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#E91E8C] focus:ring-2 focus:ring-pink-100 outline-none transition"
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Lowercase letters, numbers, and underscores only</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Full Name / Channel Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Mim Akter"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#E91E8C] focus:ring-2 focus:ring-pink-100 outline-none transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Phone / WhatsApp Number (for PR Box Delivery) *
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 01700-000000"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#E91E8C] focus:ring-2 focus:ring-pink-100 outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Primary Skincare Focus / Niche *
                        </label>
                        <select
                          value={niche}
                          onChange={(e) => setNiche(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#E91E8C] focus:ring-2 focus:ring-pink-100 outline-none transition"
                        >
                          <option value="Glass Skin & Hydration">Glass Skin & Hydration</option>
                          <option value="Acne & Barrier Repair">Acne & Barrier Repair</option>
                          <option value="Korean Sunscreen Reviews">Korean Sunscreen Reviews</option>
                          <option value="Anti-Aging & Retinol">Anti-Aging & Retinol</option>
                          <option value="Brightening & Niacinamide">Brightening & Niacinamide</option>
                          <option value="Daily Routine Vlogs">Daily Skincare Routine Vlogs</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Facebook Profile or Page Link (for Reel Tracking)
                        </label>
                        <input
                          type="url"
                          value={facebookUrl}
                          onChange={(e) => setFacebookUrl(e.target.value)}
                          placeholder="https://facebook.com/yourprofile"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#E91E8C] focus:ring-2 focus:ring-pink-100 outline-none transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Instagram Profile Link (Optional)
                        </label>
                        <input
                          type="url"
                          value={instagramUrl}
                          onChange={(e) => setInstagramUrl(e.target.value)}
                          placeholder="https://instagram.com/yourusername"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#E91E8C] focus:ring-2 focus:ring-pink-100 outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Short Creator Bio / Introduction
                      </label>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us a little bit about your skincare journey and why you want to review Korean Skin Food BD products..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#E91E8C] focus:ring-2 focus:ring-pink-100 outline-none transition resize-none"
                      />
                    </div>

                    {/* Terms Agreement */}
                    <div className="p-4 bg-pink-50/50 rounded-2xl border border-pink-100 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="terms_agree"
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-[#E91E8C] rounded border-pink-300 focus:ring-[#E91E8C] cursor-pointer"
                      />
                      <label htmlFor="terms_agree" className="text-xs text-gray-700 font-medium cursor-pointer">
                        I agree to the <strong>Korean Skin Food BD Creator Guidelines</strong>. I will create honest, authentic skincare reviews and follow community standards.
                      </label>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-gradient-to-r from-[#E91E8C] via-rose-500 to-[#E91E8C] hover:from-pink-700 hover:to-rose-600 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Submitting Your Application...</span>
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          <span>Submit Creator Application</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}

          </div>
        </div>
      </section>

      {/* 6. FAQ ACCORDION SECTION */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-black uppercase text-[#E91E8C] tracking-widest block mb-1">
            Questions & Answers
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div 
                key={index}
                className="bg-white rounded-2xl border border-pink-100/80 shadow-xs overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-gray-900 hover:text-[#E91E8C] transition"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle size={16} className="text-[#E91E8C] shrink-0" />
                    {faq.q}
                  </span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-6 pb-4 pt-1 text-xs text-gray-600 leading-relaxed font-medium border-t border-pink-50"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. BOTTOM INSPIRATION CALLOUT */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-purple-50 p-8 rounded-3xl border border-pink-100 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-left space-y-1">
            <h3 className="text-lg font-black text-gray-900">Have Questions Before Applying?</h3>
            <p className="text-xs text-gray-600 font-medium">
              Talk directly with our Creator Management team on WhatsApp or Messenger.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://m.me/651561268050601"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 bg-[#1877F2] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <MessageCircle size={16} />
              <span>Messenger Chat</span>
            </a>
            <button
              onClick={scrollToForm}
              className="px-5 py-3 bg-[#E91E8C] hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <Sparkles size={16} />
              <span>Apply Now</span>
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
