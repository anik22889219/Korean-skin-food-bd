import React, { useState, useEffect, useMemo } from 'react';
import { 
  Star, MessageSquareQuote, Plus, Edit2, Trash2, Check, X, 
  Search, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, 
  Reply, Sparkles, ShieldCheck, MapPin, ThumbsUp, User, 
  Filter, Copy, Share2, Eye, EyeOff, Image as ImageIcon,
  MessageCircle, Heart, Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleBusinessProfileData, GoogleBusinessReview, Product } from '../types';
import { googleBusinessService, VERIFIED_GOOGLE_BUSINESS_DATA } from '../services/googleBusinessService';
import { useProducts } from '../hooks/queries/products';
import { MediaLibraryModal } from './MediaLibraryModal';

export const AdminTestimonials: React.FC = () => {
  const { profile } = useAuth();
  const isAdminOrSuperAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const { data: products = [] } = useProducts();

  // Profile data & reviews state
  const [profileData, setProfileData] = useState<GoogleBusinessProfileData>(() =>
    googleBusinessService.getProfileData()
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [replyFilter, setReplyFilter] = useState<'all' | 'replied' | 'unreplied'>('all');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<GoogleBusinessReview | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [reviewToReply, setReviewToReply] = useState<GoogleBusinessReview | null>(null);
  const [replyText, setReplyText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State for Add / Edit Testimonial
  const [formAuthorName, setFormAuthorName] = useState('');
  const [formAuthorPhotoUrl, setFormAuthorPhotoUrl] = useState('');
  const [formRating, setFormRating] = useState<number>(5);
  const [formRelativeTime, setFormRelativeTime] = useState('Recently');
  const [formProductPurchased, setFormProductPurchased] = useState('');
  const [formText, setFormText] = useState('');
  const [formIsVerifiedCustomer, setFormIsVerifiedCustomer] = useState(true);
  const [formIsLocalGuide, setFormIsLocalGuide] = useState(false);
  const [formReplyText, setFormReplyText] = useState('');

  // Notification Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let isMounted = true;
    googleBusinessService.getProfile().then((data) => {
      if (isMounted && data) {
        setProfileData(data);
      }
    }).catch((err) => {
      console.warn('Failed to load initial reviews:', err);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync with Google Maps
  const handleSyncGoogle = async () => {
    setIsSyncing(true);
    try {
      const result = await googleBusinessService.syncWithMaps();
      if (result.data) {
        setProfileData(result.data);
      }
      showToast(result.message || 'Google Business Profile synchronized successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to sync with Google Business Profile.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    let list = profileData.reviews || [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.authorName.toLowerCase().includes(q) ||
          r.text.toLowerCase().includes(q) ||
          (r.productPurchased && r.productPurchased.toLowerCase().includes(q))
      );
    }

    if (ratingFilter !== 'all') {
      const star = parseInt(ratingFilter);
      list = list.filter((r) => r.rating === star);
    }

    if (replyFilter === 'replied') {
      list = list.filter((r) => !!r.reply && !!r.reply.text);
    } else if (replyFilter === 'unreplied') {
      list = list.filter((r) => !r.reply || !r.reply.text);
    }

    return list;
  }, [profileData.reviews, searchQuery, ratingFilter, replyFilter]);

  // Open Create Modal
  const handleOpenAddModal = () => {
    setEditingReview(null);
    setFormAuthorName('');
    setFormAuthorPhotoUrl('');
    setFormRating(5);
    setFormRelativeTime('Just now');
    setFormProductPurchased('');
    setFormText('');
    setFormIsVerifiedCustomer(true);
    setFormIsLocalGuide(false);
    setFormReplyText('');
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (rev: GoogleBusinessReview) => {
    setEditingReview(rev);
    setFormAuthorName(rev.authorName);
    setFormAuthorPhotoUrl(rev.authorPhotoUrl || '');
    setFormRating(rev.rating || 5);
    setFormRelativeTime(rev.relativeTimeDescription || 'Recently');
    setFormProductPurchased(rev.productPurchased || '');
    setFormText(rev.text || '');
    setFormIsVerifiedCustomer(rev.isVerifiedCustomer ?? true);
    setFormIsLocalGuide(rev.isLocalGuide ?? false);
    setFormReplyText(rev.reply?.text || '');
    setIsAddEditModalOpen(true);
  };

  // Save Testimonial / Review
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAuthorName.trim() || !formText.trim()) {
      showToast('Please provide both reviewer name and feedback text.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const currentReviews = [...(profileData.reviews || [])];

      if (editingReview) {
        // Update existing
        const updatedList = currentReviews.map((r) => {
          if (r.id === editingReview.id) {
            return {
              ...r,
              authorName: formAuthorName.trim(),
              authorPhotoUrl: formAuthorPhotoUrl.trim() || undefined,
              rating: formRating,
              relativeTimeDescription: formRelativeTime.trim() || 'Recently',
              productPurchased: formProductPurchased.trim() || undefined,
              text: formText.trim(),
              isVerifiedCustomer: formIsVerifiedCustomer,
              isLocalGuide: formIsLocalGuide,
              reply: formReplyText.trim()
                ? {
                    text: formReplyText.trim(),
                    replyDate: r.reply?.replyDate || 'Recently',
                  }
                : undefined,
            };
          }
          return r;
        });

        const newProfile = { ...profileData, reviews: updatedList };
        await googleBusinessService.updateProfile(newProfile);
        setProfileData(newProfile);
        showToast(`Testimonial from "${formAuthorName}" updated.`);
      } else {
        // Create new
        const newReview: GoogleBusinessReview = {
          id: `g-rev-${Date.now()}`,
          authorName: formAuthorName.trim(),
          authorPhotoUrl: formAuthorPhotoUrl.trim() || undefined,
          rating: formRating,
          relativeTimeDescription: formRelativeTime.trim() || 'Just now',
          publishTime: new Date().toISOString(),
          isVerifiedCustomer: formIsVerifiedCustomer,
          isLocalGuide: formIsLocalGuide,
          productPurchased: formProductPurchased.trim() || undefined,
          text: formText.trim(),
          likesCount: 0,
          reply: formReplyText.trim()
            ? {
                text: formReplyText.trim(),
                replyDate: 'Just now',
              }
            : undefined,
        };

        const updatedList = [newReview, ...currentReviews];
        const newTotal = (profileData.totalReviewsCount || 0) + 1;
        const newProfile = {
          ...profileData,
          totalReviewsCount: newTotal,
          reviews: updatedList,
        };

        await googleBusinessService.updateProfile(newProfile);
        setProfileData(newProfile);
        showToast(`New testimonial from "${formAuthorName}" added.`);
      }

      setIsAddEditModalOpen(false);
    } catch (err: any) {
      showToast(`Error saving review: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Reply Modal
  const handleOpenReplyModal = (rev: GoogleBusinessReview) => {
    setReviewToReply(rev);
    setReplyText(rev.reply?.text || '');
    setIsReplyModalOpen(true);
  };

  // Save Store Reply
  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewToReply) return;

    setIsSaving(true);
    try {
      const updatedList = (profileData.reviews || []).map((r) => {
        if (r.id === reviewToReply.id) {
          return {
            ...r,
            reply: replyText.trim()
              ? {
                  text: replyText.trim(),
                  replyDate: 'Just now',
                }
              : undefined,
          };
        }
        return r;
      });

      const newProfile = { ...profileData, reviews: updatedList };
      await googleBusinessService.updateProfile(newProfile);
      setProfileData(newProfile);
      showToast(`Official reply updated for "${reviewToReply.authorName}".`);
      setIsReplyModalOpen(false);
      setReviewToReply(null);
    } catch (err: any) {
      showToast(`Failed to save reply: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Review
  const handleDeleteReview = async (reviewId: string) => {
    setIsSaving(true);
    try {
      const updatedList = (profileData.reviews || []).filter((r) => r.id !== reviewId);
      const newTotal = Math.max(0, (profileData.totalReviewsCount || 0) - 1);
      const newProfile = {
        ...profileData,
        totalReviewsCount: newTotal,
        reviews: updatedList,
      };

      await googleBusinessService.updateProfile(newProfile);
      setProfileData(newProfile);
      showToast('Testimonial deleted.');
      setDeleteConfirmId(null);
    } catch (err: any) {
      showToast(`Failed to delete: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Copy Google Review Link
  const handleCopyReviewLink = () => {
    if (!profileData.writeReviewUrl) return;
    navigator.clipboard.writeText(profileData.writeReviewUrl);
    setCopiedLink(true);
    showToast('Google Review link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const repliedCount = (profileData.reviews || []).filter((r) => !!r.reply?.text).length;

  return (
    <div className="space-y-6">
      {/* TOP HERO OVERVIEW CARD */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-100/40 via-pink-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-amber-600">
              <span className="flex items-center gap-1 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                Google Verified Profile
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                {profileData.address || 'Banani, Dhaka'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              Customer Testimonials & Google Reviews
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Curate customer love, manage 4.9★ Google Business reviews, reply to verified shopper feedback, and showcase authentic Seoul beauty experiences.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            <button
              onClick={handleCopyReviewLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200"
              title="Copy public Google review link for customers"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Review Link'}</span>
            </button>

            <button
              onClick={handleSyncGoogle}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200"
              title="Sync with Google Business grounding data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-rose-600' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync with Google'}</span>
            </button>

            <a
              href={profileData.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Google Maps</span>
            </a>

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Testimonial</span>
            </button>
          </div>
        </div>

        {/* METRICS & RATING CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100/80">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shadow-sm shadow-amber-200">
              ★
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Overall Rating</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900 font-mono tabular-nums">
                  {profileData.overallRating || 4.9}
                </span>
                <span className="text-slate-400 font-bold">/ 5.0</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100/80">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200">
              <MessageSquareQuote className="w-5 h-5" />
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Total Reviews</span>
              <span className="text-xl font-black text-slate-900 font-mono tabular-nums">
                {profileData.totalReviewsCount || 148}+
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100/80">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-slate-500 font-medium block">5-Star Satisfaction</span>
              <span className="text-xl font-black text-emerald-700 font-mono tabular-nums">
                {profileData.ratingBreakdown?.fiveStar || 139} (94%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-rose-50/60 rounded-2xl border border-rose-100/80">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm shadow-rose-200">
              <Reply className="w-5 h-5" />
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Store Responses</span>
              <span className="text-xl font-black text-rose-700 font-mono tabular-nums">
                {repliedCount} Replied
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TOAST ALERT */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-2xl border flex items-center justify-between text-xs transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span className="font-semibold">{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, review, or product..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2.5 w-full sm:w-auto">
          {/* Rating filter */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
            <button
              onClick={() => setRatingFilter('all')}
              className={`px-3 py-1 font-medium rounded-lg transition-all ${
                ratingFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Stars
            </button>
            <button
              onClick={() => setRatingFilter('5')}
              className={`px-3 py-1 font-medium rounded-lg transition-all flex items-center gap-1 ${
                ratingFilter === '5' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>5★</span>
            </button>
            <button
              onClick={() => setRatingFilter('4')}
              className={`px-3 py-1 font-medium rounded-lg transition-all flex items-center gap-1 ${
                ratingFilter === '4' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>4★</span>
            </button>
          </div>

          {/* Reply status filter */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
            <button
              onClick={() => setReplyFilter('all')}
              className={`px-3 py-1 font-medium rounded-lg transition-all ${
                replyFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setReplyFilter('unreplied')}
              className={`px-3 py-1 font-medium rounded-lg transition-all ${
                replyFilter === 'unreplied' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Needs Reply
            </button>
            <button
              onClick={() => setReplyFilter('replied')}
              className={`px-3 py-1 font-medium rounded-lg transition-all ${
                replyFilter === 'replied' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Replied
            </button>
          </div>
        </div>
      </div>

      {/* REVIEWS GRID / LIST */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Star className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No testimonials found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {searchQuery
                ? `No reviews match "${searchQuery}". Try clearing search filter.`
                : 'No reviews match the selected filter.'}
            </p>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Add Customer Testimonial
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReviews.map((review) => {
              const hasReply = !!review.reply && !!review.reply.text;

              return (
                <div
                  key={review.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group"
                >
                  <div>
                    {/* Header: User details + Rating + Actions */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {review.authorPhotoUrl ? (
                          <img
                            src={review.authorPhotoUrl}
                            alt={review.authorName}
                            className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shadow-2xs shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs uppercase">
                            {review.authorName.slice(0, 2)}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 leading-none">
                              {review.authorName}
                            </h4>
                            {review.isVerifiedCustomer && (
                              <span
                                title="Verified Google Customer"
                                className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md"
                              >
                                <Check className="w-3 h-3" />
                                Verified
                              </span>
                            )}
                            {review.isLocalGuide && (
                              <span
                                title="Google Local Guide"
                                className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md"
                              >
                                <Award className="w-3 h-3 text-amber-500" />
                                Local Guide
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                            <div className="flex text-amber-400">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= review.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <span aria-hidden="true">·</span>
                            <span>{review.relativeTimeDescription}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Menu buttons */}
                      <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                        <button
                          onClick={() => handleOpenReplyModal(review)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Reply to Review"
                        >
                          <Reply className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(review)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Review"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(review.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Review"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Product Purchased Tag */}
                    {review.productPurchased && (
                      <div className="mb-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-50 text-rose-700 border border-pink-100 text-[11px] font-semibold">
                        <span>🛍️</span>
                        <span className="truncate">{review.productPurchased}</span>
                      </div>
                    )}

                    {/* Review Commentary Body */}
                    <p className="text-xs text-slate-700 leading-relaxed mb-4 whitespace-pre-line">
                      "{review.text}"
                    </p>
                  </div>

                  {/* Owner Reply Block */}
                  <div className="pt-3 border-t border-slate-100">
                    {hasReply ? (
                      <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 text-xs">
                        <div className="flex items-center justify-between mb-1 text-[11px]">
                          <span className="font-bold text-rose-600 flex items-center gap-1">
                            <Reply className="w-3 h-3" />
                            Response from Korean Skin Food BD
                          </span>
                          <span className="text-slate-400">{review.reply?.replyDate || 'Recently'}</span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {review.reply?.text}
                        </p>
                        <button
                          onClick={() => handleOpenReplyModal(review)}
                          className="text-[10px] text-indigo-600 hover:underline mt-1 font-semibold block"
                        >
                          Edit Reply
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>No response sent yet</span>
                        <button
                          onClick={() => handleOpenReplyModal(review)}
                          className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-bold hover:underline"
                        >
                          <Reply className="w-3 h-3" />
                          Reply as Store Owner
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD / EDIT TESTIMONIAL MODAL */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Star className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingReview ? 'Edit Testimonial / Review' : 'Add Customer Testimonial'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Featured customer rating and testimonial for store trust.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="space-y-4 pt-4 text-xs">
              {/* Reviewer Name & Photo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Customer Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formAuthorName}
                    onChange={(e) => setFormAuthorName(e.target.value)}
                    placeholder="e.g. Nusrat Jahan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Timeframe Label
                  </label>
                  <input
                    type="text"
                    value={formRelativeTime}
                    onChange={(e) => setFormRelativeTime(e.target.value)}
                    placeholder="e.g. 2 days ago, 1 week ago"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Avatar Photo URL */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Customer Photo / Avatar URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formAuthorPhotoUrl}
                    onChange={(e) => setFormAuthorPhotoUrl(e.target.value)}
                    placeholder="https://... or select from media library"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsMediaModalOpen(true)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 flex items-center gap-1.5 shrink-0 font-medium"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Media
                  </button>
                </div>
              </div>

              {/* Star Rating & Product Purchased */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Star Rating (1 to 5) <span className="text-rose-600">*</span>
                  </label>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormRating(star)}
                        className="p-1 text-slate-300 hover:text-amber-400 transition-colors"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= formRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="font-bold text-slate-700 font-mono ml-1">{formRating} Stars</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Product Purchased / Referenced
                  </label>
                  <input
                    type="text"
                    value={formProductPurchased}
                    onChange={(e) => setFormProductPurchased(e.target.value)}
                    placeholder="e.g. COSRX Snail Mucin & Sunscreen"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Testimonial / Review Content <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Share customer's genuine experience with your K-Beauty products..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              {/* Badges Toggle */}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsVerifiedCustomer}
                    onChange={(e) => setFormIsVerifiedCustomer(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-slate-700">Verified Customer Badge</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsLocalGuide}
                    onChange={(e) => setFormIsLocalGuide(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="font-semibold text-slate-700">Google Local Guide Badge</span>
                </label>
              </div>

              {/* Store Reply Field */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Official Store Reply (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formReplyText}
                  onChange={(e) => setFormReplyText(e.target.value)}
                  placeholder="Thank you for trusting Korean Skin Food BD!..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingReview ? 'Save Changes' : 'Create Testimonial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OWNER REPLY MODAL */}
      {isReplyModalOpen && reviewToReply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Reply className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Reply to {reviewToReply.authorName}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Official response from Korean Skin Food BD
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReplyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs text-slate-700 italic">
              "{reviewToReply.text}"
            </div>

            <form onSubmit={handleSaveReply} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Your Response Text
                </label>
                <textarea
                  required
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Thank the customer for their review and share skincare guidance..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReplyModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Delete Testimonial?</h3>
            <p className="text-xs text-slate-500 mb-5">
              This review will be removed from your customer testimonials.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteReview(deleteConfirmId)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOUDINARY MEDIA LIBRARY MODAL */}
      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectImage={(url) => {
          setFormAuthorPhotoUrl(url);
          setIsMediaModalOpen(false);
        }}
        title="Select Customer Avatar Photo"
      />
    </div>
  );
};
export default AdminTestimonials;
