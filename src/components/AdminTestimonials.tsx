import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  MessageSquareQuote,
  Check,
  X,
  Search,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Reply,
  ShieldCheck,
  MapPin,
  Copy,
  Trash2,
  Link2,
  Unlink,
  Building2,
  ChevronRight,
} from 'lucide-react';
import {
  GoogleBusinessLocationOption,
  GoogleBusinessProfileData,
  GoogleBusinessReview,
} from '../types';
import {
  EMPTY_GOOGLE_BUSINESS_DATA,
  googleBusinessService,
} from '../services/googleBusinessService';

export const AdminTestimonials: React.FC = () => {
  const [profileData, setProfileData] = useState<GoogleBusinessProfileData>(() =>
    googleBusinessService.getProfileData()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectingGmb, setIsConnectingGmb] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Location selector when Google Business account has multiple locations
  const [availableLocations, setAvailableLocations] = useState<GoogleBusinessLocationOption[]>([]);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [connectedGoogleEmail, setConnectedGoogleEmail] = useState<string | null>(() =>
    googleBusinessService.getConnectedEmail()
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [replyFilter, setReplyFilter] = useState<'all' | 'replied' | 'unreplied'>('all');

  // Reply modal + confirmation state
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [reviewToReply, setReviewToReply] = useState<GoogleBusinessReview | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isConfirmReplyOpen, setIsConfirmReplyOpen] = useState(false);
  const [pendingDeleteReplyReview, setPendingDeleteReplyReview] =
    useState<GoogleBusinessReview | null>(null);

  // Disconnect / purge confirmation modal
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);

  // Optional Place ID sync fallback (when GBP API approval is pending in Google Cloud)
  const [showPlaceIdSync, setShowPlaceIdSync] = useState(false);
  const [placeIdInput, setPlaceIdInput] = useState('');

  // Notification Toast & clipboard
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    googleBusinessService
      .getProfile()
      .then((data) => {
        if (isMounted && data) {
          setProfileData(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load Google Business Profile reviews:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_BUSINESS_OAUTH_SUCCESS') {
        showToast('Google Business Profile authorized! Syncing reviews...', 'info');
        googleBusinessService
          .fetchOAuthLocations()
          .then(async (result) => {
            if (result.locations.length > 0) {
              const syncRes = await googleBusinessService.syncOAuthLocationReviews(result.locations[0]);
              setProfileData(syncRes.data);
              showToast(syncRes.message || `Connected & synced ${syncRes.data.reviews.length} genuine reviews!`, 'success');
            }
          })
          .catch((err) => {
            showToast(err?.message || 'Failed to sync Google Business locations.', 'error');
          });
      } else if (event.data?.type === 'GOOGLE_BUSINESS_OAUTH_ERROR') {
        showToast(event.data.error || 'Google Business authorization failed.', 'error');
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => {
      isMounted = false;
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 5000);
  };

  const isGmbConnected =
    profileData.connectionMethod === 'google_business_oauth' ||
    profileData.connectionMethod === 'google_places_api' ||
    (profileData.reviews && profileData.reviews.length > 0);

  // Connect Google My Business (GMB) via Google OAuth
  const handleConnectGoogleBusiness = async () => {
    setIsConnectingGmb(true);
    try {
      const result = await googleBusinessService.connectWithGoogleOAuth();
      setConnectedGoogleEmail(result.email || null);

      if (!result.locations || result.locations.length === 0) {
        showToast(
          result.message ||
            'Connected to Google, but no Google Business Profile locations were found on this account.',
          'info'
        );
        return;
      }

      if (result.locations.length === 1) {
        // Automatically sync the single verified GMB location
        const syncRes = await googleBusinessService.syncOAuthLocationReviews(result.locations[0]);
        setProfileData(syncRes.data);
        showToast(
          syncRes.message ||
            `Connected and synced ${syncRes.data.reviews.length} genuine GMB reviews!`
        );
      } else {
        setAvailableLocations(result.locations);
        setIsLocationPickerOpen(true);
      }
    } catch (err: any) {
      if (err?.needsApiAccess) {
        setShowPlaceIdSync(true);
      }
      showToast(
        err?.message || 'Could not connect Google Business Profile. Please check permissions.',
        'error'
      );
    } finally {
      setIsConnectingGmb(false);
    }
  };

  // Pick a specific GMB location from multi-location account
  const handleSelectLocation = async (loc: GoogleBusinessLocationOption) => {
    setIsSyncing(true);
    try {
      const syncRes = await googleBusinessService.syncOAuthLocationReviews(loc);
      setProfileData(syncRes.data);
      setIsLocationPickerOpen(false);
      showToast(
        syncRes.message || `Synced ${syncRes.data.reviews.length} genuine reviews from ${loc.title}.`
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to sync selected location reviews.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Refresh / Re-sync reviews from connected GMB location
  const handleSyncReviews = async () => {
    setIsSyncing(true);
    try {
      if (!googleBusinessService.hasOAuthToken() && profileData.connectionMethod !== 'google_places_api') {
        await handleConnectGoogleBusiness();
        return;
      }
      const res = await googleBusinessService.syncWithMaps();
      if (res.data) {
        setProfileData(res.data);
      }
      if (res.success) {
        showToast(res.message || 'Google Business Profile reviews synced successfully!');
      } else {
        showToast(res.message || 'Please connect your Google Business Profile first.', 'info');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to sync Google Business reviews.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync via Place ID / Business Search (if server Places API is enabled)
  const handlePlaceIdSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeIdInput.trim()) return;
    setIsSyncing(true);
    try {
      const res = await googleBusinessService.syncByPlaceIdOrSearch(placeIdInput.trim());
      setProfileData(res.data);
      setShowPlaceIdSync(false);
      showToast(res.message || 'Google Business reviews synced!');
    } catch (err: any) {
      showToast(err?.message || 'Place ID sync failed.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Disconnect & remove all reviews
  const handleConfirmDisconnect = async () => {
    setIsSyncing(true);
    try {
      const cleared = await googleBusinessService.disconnectAndClearReviews();
      setProfileData(cleared || EMPTY_GOOGLE_BUSINESS_DATA);
      setConnectedGoogleEmail(null);
      setIsDisconnectModalOpen(false);
      showToast('Google Business Profile disconnected and all cached/dummy reviews removed.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to disconnect.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Open Reply Modal
  const handleOpenReplyModal = (rev: GoogleBusinessReview) => {
    setReviewToReply(rev);
    setReplyText(rev.reply?.text || '');
    setIsConfirmReplyOpen(false);
    setIsReplyModalOpen(true);
  };

  // Step 1 of Reply: ask explicit confirmation before mutating Google Business Profile data
  const handleRequestReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !reviewToReply) return;
    setIsConfirmReplyOpen(true);
  };

  // Step 2 of Reply: execute GMB API reply
  const handleConfirmPublishReply = async () => {
    if (!reviewToReply || !reviewToReply.reviewName) {
      showToast('Missing Google review resource ID. Please reconnect and sync GMB first.', 'error');
      return;
    }
    setIsSubmittingReply(true);
    try {
      if (!googleBusinessService.hasOAuthToken()) {
        await googleBusinessService.connectWithGoogleOAuth();
      }
      const res = await googleBusinessService.replyToGmbReview(
        reviewToReply.reviewName,
        replyText.trim()
      );
      setProfileData(res.data);
      setIsConfirmReplyOpen(false);
      setIsReplyModalOpen(false);
      setReviewToReply(null);
      showToast(res.message || 'Reply published to your Google Business Profile!');
    } catch (err: any) {
      showToast(err?.message || 'Failed to publish reply to Google Business Profile.', 'error');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Execute Delete Reply after confirmation
  const handleConfirmDeleteReply = async () => {
    if (!pendingDeleteReplyReview?.reviewName) return;
    setIsSubmittingReply(true);
    try {
      if (!googleBusinessService.hasOAuthToken()) {
        await googleBusinessService.connectWithGoogleOAuth();
      }
      const res = await googleBusinessService.deleteGmbReply(
        pendingDeleteReplyReview.reviewName
      );
      setProfileData(res.data);
      setPendingDeleteReplyReview(null);
      showToast(res.message || 'Reply removed from Google Business Profile.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete reply.', 'error');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleCopyReviewLink = () => {
    if (!profileData.writeReviewUrl) return;
    navigator.clipboard.writeText(profileData.writeReviewUrl);
    setCopiedLink(true);
    showToast('Google Review link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const reviews = profileData.reviews || [];

  const filteredReviews = useMemo(() => {
    let list = reviews;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.authorName.toLowerCase().includes(q) ||
          r.text.toLowerCase().includes(q)
      );
    }

    if (ratingFilter !== 'all') {
      const star = parseInt(ratingFilter, 10);
      list = list.filter((r) => Math.round(r.rating) === star);
    }

    if (replyFilter === 'replied') {
      list = list.filter((r) => Boolean(r.reply?.text));
    } else if (replyFilter === 'unreplied') {
      list = list.filter((r) => !r.reply?.text);
    }

    return list;
  }, [reviews, searchQuery, ratingFilter, replyFilter]);

  const repliedCount = reviews.filter((r) => Boolean(r.reply?.text)).length;
  const fiveStarCount =
    profileData.ratingBreakdown?.fiveStar ||
    reviews.filter((r) => Math.round(r.rating) === 5).length;

  return (
    <div className="space-y-6">
      {/* TOP HERO OVERVIEW CARD */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-100/40 via-pink-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center flex-wrap gap-2 mb-1.5 text-xs font-bold">
              {isGmbConnected ? (
                <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  GMB Connected{connectedGoogleEmail ? ` (${connectedGoogleEmail})` : ''}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Not Connected to Google Business Profile
                </span>
              )}
              {profileData.address && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    {profileData.address}
                  </span>
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              Customer Review
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Connect directly with your Google My Business (Google Business Profile) account to display only genuine customer reviews on your storefront and reply directly to customers.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleConnectGoogleBusiness}
              disabled={isConnectingGmb || isSyncing}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 rounded-xl border border-slate-300 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>
                {isConnectingGmb
                  ? 'Connecting...'
                  : isGmbConnected
                    ? 'Reconnect Google Business'
                    : 'Connect Google Business Profile'}
              </span>
            </button>

            {isGmbConnected && (
              <button
                type="button"
                onClick={handleSyncReviews}
                disabled={isSyncing || isConnectingGmb}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync GMB Reviews'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyReviewLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200 cursor-pointer"
              title="Copy public Google review link for customers"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Review Link'}</span>
            </button>

            {profileData.googleMapsUrl && (
              <a
                href={profileData.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Maps</span>
              </a>
            )}

            {isGmbConnected && (
              <button
                type="button"
                onClick={() => setIsDisconnectModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-200 cursor-pointer"
                title="Disconnect GMB and clear synced reviews"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            )}
          </div>
        </div>

        {/* METRICS & RATING CARDS (Real GMB Data Only — Zero Dummy Numbers) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100/80">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shadow-sm shadow-amber-200">
              ★
            </div>
            <div>
              <span className="text-slate-500 font-medium block">GMB Overall Rating</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900 font-mono tabular-nums">
                  {profileData.overallRating > 0 ? profileData.overallRating.toFixed(1) : '—'}
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
              <span className="text-slate-500 font-medium block">Total GMB Reviews</span>
              <span className="text-xl font-black text-slate-900 font-mono tabular-nums">
                {profileData.totalReviewsCount || reviews.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100/80">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-slate-500 font-medium block">5-Star Reviews</span>
              <span className="text-xl font-black text-emerald-700 font-mono tabular-nums">
                {fiveStarCount}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-rose-50/60 rounded-2xl border border-rose-100/80">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm shadow-rose-200">
              <Reply className="w-5 h-5" />
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Owner Replies</span>
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
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* OPTIONAL PLACE ID FALLBACK BAR */}
      {showPlaceIdSync && (
        <form
          onSubmit={handlePlaceIdSync}
          className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs"
        >
          <div className="flex-1">
            <p className="font-bold text-amber-900">
              Sync by Google Place ID or Business Name (Fallback)
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              If Google Business Profile API access is still pending on your Cloud project, you can sync verified reviews using your Google Place ID (if Places API is enabled on the server).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={placeIdInput}
              onChange={(e) => setPlaceIdInput(e.target.value)}
              placeholder="e.g. ChIJ... or Korean Skin Food BD"
              className="px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 w-64 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="submit"
              disabled={isSyncing}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
            >
              Sync Place
            </button>
            <button
              type="button"
              onClick={() => setShowPlaceIdSync(false)}
              className="p-2 text-amber-700 hover:bg-amber-100 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* FILTER & SEARCH BAR */}
      {reviews.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer name or review text..."
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

          <div className="flex items-center flex-wrap gap-2.5 w-full sm:w-auto">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
              {['all', '5', '4', '3', '2', '1'].map((val) => (
                <button
                  key={val}
                  onClick={() => setRatingFilter(val)}
                  className={`px-2.5 py-1 font-medium rounded-lg transition-all ${
                    ratingFilter === val
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {val === 'all' ? 'All Stars' : `${val}★`}
                </button>
              ))}
            </div>

            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs">
              <button
                onClick={() => setReplyFilter('all')}
                className={`px-3 py-1 font-medium rounded-lg transition-all ${
                  replyFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setReplyFilter('unreplied')}
                className={`px-3 py-1 font-medium rounded-lg transition-all ${
                  replyFilter === 'unreplied'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Needs Reply
              </button>
              <button
                onClick={() => setReplyFilter('replied')}
                className={`px-3 py-1 font-medium rounded-lg transition-all ${
                  replyFilter === 'replied'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Replied
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEWS GRID / EMPTY STATE */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-5 border border-slate-200 animate-pulse space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-200" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-slate-200 shadow-sm">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-pink-50 text-rose-600 flex items-center justify-center border border-pink-100">
              <Building2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {reviews.length === 0
                ? 'Connect Your Google Business Profile'
                : 'No matching reviews found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
              {reviews.length === 0
                ? 'All dummy reviews have been removed. Connect your Google My Business account to automatically pull and display only your genuine customer reviews.'
                : 'No Google Business reviews match your current search or star filter.'}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {reviews.length === 0 ? (
                <>
                  <button
                    type="button"
                    onClick={handleConnectGoogleBusiness}
                    disabled={isConnectingGmb}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Link2 className="w-4 h-4" />
                    <span>
                      {isConnectingGmb
                        ? 'Connecting...'
                        : 'Connect Google Business Profile'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPlaceIdSync((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 cursor-pointer"
                  >
                    <span>Sync via Place ID</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setRatingFilter('all');
                    setReplyFilter('all');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReviews.map((review) => {
              const hasReply = Boolean(review.reply?.text);
              const canReplyViaGmb = Boolean(review.reviewName && review.source === 'google_business_api');

              return (
                <div
                  key={review.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group"
                >
                  <div>
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
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                              <Check className="w-3 h-3" />
                              Google Verified
                            </span>
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

                      {canReplyViaGmb && (
                        <button
                          onClick={() => handleOpenReplyModal(review)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Reply on Google Business Profile"
                        >
                          <Reply className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed mb-4 whitespace-pre-line">
                      {review.text ? `"${review.text}"` : <span className="italic text-slate-400">Star rating only (no written comment)</span>}
                    </p>
                  </div>

                  {/* Owner Reply Block */}
                  <div className="pt-3 border-t border-slate-100">
                    {hasReply ? (
                      <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 text-xs">
                        <div className="flex items-center justify-between mb-1 text-[11px]">
                          <span className="font-bold text-rose-600 flex items-center gap-1">
                            <Reply className="w-3 h-3" />
                            Response from {profileData.businessName}
                          </span>
                          <span className="text-slate-400">
                            {review.reply?.replyDate || 'Recently'}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {review.reply?.text}
                        </p>
                        {canReplyViaGmb && (
                          <div className="flex items-center gap-3 mt-1.5">
                            <button
                              onClick={() => handleOpenReplyModal(review)}
                              className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                            >
                              Edit Reply
                            </button>
                            <button
                              onClick={() => setPendingDeleteReplyReview(review)}
                              className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                            >
                              Delete Reply
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>No response sent yet</span>
                        {canReplyViaGmb && (
                          <button
                            onClick={() => handleOpenReplyModal(review)}
                            className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
                          >
                            <Reply className="w-3 h-3" />
                            Reply on Google
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* GMB LOCATION PICKER MODAL */}
      {isLocationPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Select Your Google Business Location
                </h3>
                <p className="text-xs text-slate-500">
                  Choose which Google Business Profile location to sync reviews from.
                </p>
              </div>
              <button
                onClick={() => setIsLocationPickerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 max-h-80 overflow-y-auto">
              {availableLocations.map((loc) => (
                <button
                  key={loc.locationName}
                  type="button"
                  disabled={isSyncing}
                  onClick={() => handleSelectLocation(loc)}
                  className="w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/40 transition-all flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{loc.title}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {loc.address || loc.accountDisplayName}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OWNER REPLY MODAL + EXPLICIT CONFIRMATION STEP */}
      {isReplyModalOpen && reviewToReply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
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
                    Publishes directly to your Google Business Profile
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsReplyModalOpen(false);
                  setIsConfirmReplyOpen(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs text-slate-700 italic">
              "{reviewToReply.text || `${reviewToReply.rating}★ rating`}"
            </div>

            {!isConfirmReplyOpen ? (
              <form onSubmit={handleRequestReplySubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Your Google Business Reply
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Thank the customer for their review..."
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
                    className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
                  >
                    Review & Publish
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                  <p className="font-bold text-amber-900">
                    Confirm Publishing Reply to Google Business Profile?
                  </p>
                  <p className="text-amber-800">
                    This will publicly post your response to <strong>{reviewToReply.authorName}</strong>'s review on Google Maps and Google Search.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmReplyOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingReply}
                    onClick={handleConfirmPublishReply}
                    className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    {isSubmittingReply && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Confirm & Publish Reply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE REPLY CONFIRMATION MODAL */}
      {pendingDeleteReplyReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Delete Reply on Google?
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              This will permanently remove your owner response to{' '}
              <strong>{pendingDeleteReplyReview.authorName}</strong> from your Google Business Profile.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setPendingDeleteReplyReview(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReply}
                onClick={handleConfirmDeleteReply}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                {isSubmittingReply ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCONNECT & CLEAR REVIEWS CONFIRMATION MODAL */}
      {isDisconnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Unlink className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Disconnect Google Business Profile?
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              This will disconnect your Google Business Profile and clear all synced reviews from the storefront until you reconnect.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsDisconnectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleConfirmDisconnect}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                {isSyncing ? 'Disconnecting...' : 'Confirm Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTestimonials;
