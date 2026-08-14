import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { CreatorProfile, CreatorStatus, CreatorReel, CreatorReelStatus, CreatorPointSettings, ReelMetricAuditLog } from '../types';
import { subscribeToAllReelsForAdmin, updateReelStatusByAdmin, deleteCreatorReel } from '../services/creatorReelService';
import { updateAdminVerifiedMetrics, refreshFacebookApiMetricsApi } from '../services/facebookMetricsService';
import { 
  getCreatorPointSettings, 
  saveCreatorPointSettings, 
  recalculateAllCreatorsPointsAndLevels, 
  calculateReelPoints,
  getReelMetricAuditLogs
} from '../services/creatorPointService';
import { 
  Sparkles, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  ShieldCheck,
  Zap, 
  Award, 
  Eye, 
  Heart, 
  Video, 
  RefreshCw, 
  AlertCircle,
  UserCheck,
  Building2,
  Crown,
  Play,
  X,
  ExternalLink,
  MessageSquare,
  Globe,
  Trash2,
  Send,
  Tag,
  Settings,
  History,
  Save,
  RotateCw,
  FileText,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LeaderboardView } from './LeaderboardView';
import { CreatorDetailsModal } from './CreatorDetailsModal';

export const AdminCreators: React.FC = () => {
  const { profile } = useAuth();
  
  // Tab state: 'creators' | 'reels' | 'leaderboard' | 'settings' | 'audits'
  const [activeTab, setActiveTab] = useState<'creators' | 'reels' | 'leaderboard' | 'settings' | 'audits'>('creators');

  // Creators State
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [loadingCreators, setLoadingCreators] = useState<boolean>(true);
  const [creatorSearchQuery, setCreatorSearchQuery] = useState<string>('');
  const [selectedCreatorStatus, setSelectedCreatorStatus] = useState<string>('all');
  const [updatingCreatorId, setUpdatingCreatorId] = useState<string | null>(null);
  const [creatorViewMode, setCreatorViewMode] = useState<'table' | 'grid'>('table');
  const [selectedCreatorDetails, setSelectedCreatorDetails] = useState<CreatorProfile | null>(null);

  // Reels State
  const [reels, setReels] = useState<CreatorReel[]>([]);
  const [loadingReels, setLoadingReels] = useState<boolean>(true);
  const [reelSearchQuery, setReelSearchQuery] = useState<string>('');
  const [selectedReelStatus, setSelectedReelStatus] = useState<string>('all');
  const [updatingReelId, setUpdatingReelId] = useState<string | null>(null);
  
  // Settings & Levels State (STEP 4)
  const [pointSettings, setPointSettings] = useState<CreatorPointSettings>({
    viewsPerPoint: 100,
    likesPerPoint: 10,
    pointsPerLikeBlock: 2,
    commentsPerPoint: 1,
    pointsPerComment: 3,
    levels: [
      { level: 1, name: "Beginner", minPoints: 0 },
      { level: 2, name: "Rising Creator", minPoints: 1000 },
      { level: 3, name: "Active Creator", minPoints: 5000 },
      { level: 4, name: "Pro Creator", minPoints: 15000 },
      { level: 5, name: "Elite Creator", minPoints: 30000 },
    ]
  });
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [recalculatingPoints, setRecalculatingPoints] = useState<boolean>(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<ReelMetricAuditLog[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState<boolean>(false);

  // Rejection Modal
  const [rejectingReel, setRejectingReel] = useState<CreatorReel | null>(null);
  const [rejectionNote, setRejectionNote] = useState<string>('');
  
  // Video Player Modal
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Manual Metrics Modal State (STEP 3 & 4)
  const [manualMetricsReel, setManualMetricsReel] = useState<CreatorReel | null>(null);
  const [manualViews, setManualViews] = useState<number>(0);
  const [manualLikes, setManualLikes] = useState<number>(0);
  const [manualComments, setManualComments] = useState<number>(0);
  const [manualReason, setManualReason] = useState<string>('');
  const [updatingMetricsId, setUpdatingMetricsId] = useState<string | null>(null);

  // Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAuthorized = profile?.role === 'super_admin' || profile?.role === 'hr' || profile?.role === 'admin';

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load point settings
  useEffect(() => {
    if (!isAuthorized) return;
    getCreatorPointSettings()
      .then((settings) => setPointSettings(settings))
      .catch((err) => console.error("Error loading point settings:", err));
  }, [isAuthorized]);

  // Load audit logs when audits tab is active
  useEffect(() => {
    if (!isAuthorized || activeTab !== 'audits') return;
    setLoadingAuditLogs(true);
    getReelMetricAuditLogs(50)
      .then((logs) => {
        setAuditLogs(logs);
        setLoadingAuditLogs(false);
      })
      .catch((err) => {
        console.error("Error loading audit logs:", err);
        setLoadingAuditLogs(false);
      });
  }, [isAuthorized, activeTab]);

  const handleOpenManualMetricsModal = (reel: CreatorReel) => {
    setManualMetricsReel(reel);
    setManualViews(reel.performance?.views || 0);
    setManualLikes(reel.performance?.likes || 0);
    setManualComments(reel.performance?.comments || 0);
    setManualReason('');
  };

  const handleSaveManualMetrics = async () => {
    if (!manualMetricsReel) return;
    setUpdatingMetricsId(manualMetricsReel.creatorReelId);
    try {
      await updateAdminVerifiedMetrics({
        creatorReelId: manualMetricsReel.creatorReelId,
        views: Number(manualViews),
        likes: Number(manualLikes),
        comments: Number(manualComments),
        metricsSource: 'admin_verified',
        adminId: profile?.displayName || profile?.email || 'Admin',
        reason: manualReason.trim() || 'Verified via Admin Dashboard',
      });
      showToast('success', 'Admin verified metrics updated & points recalculated successfully.');
      setManualMetricsReel(null);
    } catch (err: any) {
      console.error('Failed to update manual metrics:', err);
      showToast('error', err.message || 'Failed to update metrics.');
    } finally {
      setUpdatingMetricsId(null);
    }
  };

  const handleRefreshFacebookMetrics = async (reelId: string) => {
    setUpdatingMetricsId(reelId);
    try {
      const res = await refreshFacebookApiMetricsApi(reelId);
      if (res.success) {
        showToast('success', 'Successfully refreshed live Facebook API metrics.');
      } else if (res.apiAvailable === false) {
        showToast('error', res.message || 'Facebook API credentials not configured. Switched to Admin Verified mode.');
      } else {
        showToast('error', res.error || 'Failed to fetch Facebook API metrics.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to execute Facebook API request.');
    } finally {
      setUpdatingMetricsId(null);
    }
  };

  // Subscribe to creators
  useEffect(() => {
    if (!isAuthorized) {
      setLoadingCreators(false);
      return;
    }

    setLoadingCreators(true);
    const creatorsRef = collection(db, 'creators');

    const unsubscribe = onSnapshot(creatorsRef, (snapshot) => {
      const creatorList: CreatorProfile[] = [];
      snapshot.forEach((docSnap) => {
        creatorList.push(docSnap.data() as CreatorProfile);
      });

      const statusOrder: Record<string, number> = { pending: 1, approved: 2, suspended: 3 };
      creatorList.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

      setCreators(creatorList);
      setLoadingCreators(false);
    }, (error) => {
      console.error('[AdminCreators] Error loading creators:', error);
      handleFirestoreError(error, OperationType.LIST, 'creators', false);
      setLoadingCreators(false);
    });

    return () => unsubscribe();
  }, [isAuthorized]);

  // Subscribe to reels
  useEffect(() => {
    if (!isAuthorized) {
      setLoadingReels(false);
      return;
    }

    setLoadingReels(true);
    const unsubscribe = subscribeToAllReelsForAdmin((data) => {
      setReels(data);
      setLoadingReels(false);
    });

    return () => unsubscribe();
  }, [isAuthorized]);

  // Handle Creator Status Change
  const handleCreatorStatusChange = async (creatorId: string, newStatus: CreatorStatus) => {
    setUpdatingCreatorId(creatorId);
    try {
      const creatorRef = doc(db, 'creators', creatorId);
      const updatePayload = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(creatorRef, updatePayload);

      // Keep user role in sync when approving or updating creator
      try {
        const userRef = doc(db, 'users', creatorId);
        if (newStatus === 'approved') {
          await updateDoc(userRef, {
            role: 'creator',
            updatedAt: serverTimestamp()
          });
        }
      } catch (e) {
        console.warn('Could not sync user role doc:', e);
      }

      // Update local state if details modal is open
      setSelectedCreatorDetails(prev => prev && prev.creatorId === creatorId ? { ...prev, status: newStatus } : prev);

      showToast('success', `Creator request ${newStatus === 'approved' ? 'APPROVED' : newStatus.toUpperCase()} successfully!`);
    } catch (err: any) {
      console.error('Failed to update creator status:', err);
      handleFirestoreError(err, OperationType.UPDATE, `creators/${creatorId}`, false);
      showToast('error', 'Failed to update status. Check admin/HR permissions.');
    } finally {
      setUpdatingCreatorId(null);
    }
  };

  // Handle Reel Moderation Actions
  const handleReelStatusChange = async (reelId: string, newStatus: CreatorReelStatus, note?: string) => {
    setUpdatingReelId(reelId);
    try {
      await updateReelStatusByAdmin(reelId, newStatus, note);
      showToast('success', `Reel status updated to ${newStatus.toUpperCase()}`);
      if (rejectingReel?.creatorReelId === reelId) {
        setRejectingReel(null);
        setRejectionNote('');
      }
    } catch (err: any) {
      console.error('Failed to update reel status:', err);
      showToast('error', err.message || 'Failed to update reel status.');
    } finally {
      setUpdatingReelId(null);
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    if (!window.confirm('Are you sure you want to delete this reel submission?')) return;
    setUpdatingReelId(reelId);
    try {
      await deleteCreatorReel(reelId);
      showToast('success', 'Reel deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete reel:', err);
      showToast('error', 'Failed to delete reel');
    } finally {
      setUpdatingReelId(null);
    }
  };

  // Filtered Creators
  const filteredCreators = creators.filter((c) => {
    const matchesSearch = 
      (c.displayName && c.displayName.toLowerCase().includes(creatorSearchQuery.toLowerCase())) ||
      (c.username && c.username.toLowerCase().includes(creatorSearchQuery.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(creatorSearchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(creatorSearchQuery));

    const matchesStatus = selectedCreatorStatus === 'all' || c.status === selectedCreatorStatus;
    return matchesSearch && matchesStatus;
  });

  // Filtered Reels
  const filteredReels = reels.filter((r) => {
    const matchesSearch = 
      (r.caption && r.caption.toLowerCase().includes(reelSearchQuery.toLowerCase())) ||
      (r.description && r.description.toLowerCase().includes(reelSearchQuery.toLowerCase())) ||
      (r.productNames && r.productNames.some(p => p.toLowerCase().includes(reelSearchQuery.toLowerCase())));

    const matchesStatus = selectedReelStatus === 'all' || r.status === selectedReelStatus;
    return matchesSearch && matchesStatus;
  });

  // Metrics
  const pendingCreatorsCount = creators.filter((c) => c.status === 'pending').length;
  const approvedCreatorsCount = creators.filter((c) => c.status === 'approved').length;

  const pendingReelsCount = reels.filter((r) => r.status === 'pending').length;
  const approvedReelsCount = reels.filter((r) => r.status === 'approved' || r.status === 'published').length;

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await saveCreatorPointSettings(pointSettings);
      showToast('success', 'Creator point rules & level thresholds saved successfully.');
    } catch (err: any) {
      console.error('Failed to save point settings:', err);
      showToast('error', err.message || 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRecalculateAllPoints = async () => {
    if (!window.confirm('Recalculate points and creator levels across all creators based on verified reels?')) return;
    setRecalculatingPoints(true);
    try {
      const res = await recalculateAllCreatorsPointsAndLevels();
      showToast('success', `Recalculated points for ${res.updatedCreators} creators.`);
    } catch (err: any) {
      console.error('Failed to recalculate points:', err);
      showToast('error', err.message || 'Failed to recalculate points.');
    } finally {
      setRecalculatingPoints(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-rose-200 p-8 text-center shadow-xl">
          <ShieldAlert size={36} className="text-rose-600 mx-auto mb-3" />
          <h2 className="text-lg font-black text-slate-900 mb-1">Restricted Area</h2>
          <p className="text-xs text-slate-600">Store Admin or HR permissions required to manage creators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-bold ${
              notification.type === 'success' 
                ? 'bg-emerald-950 text-emerald-200 border-emerald-800' 
                : 'bg-rose-950 text-rose-200 border-rose-800'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Preview Modal */}
      <AnimatePresence>
        {previewVideoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewVideoUrl(null)}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl relative"
            >
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-800/80 text-white flex items-center justify-center hover:bg-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
              <div className="aspect-video bg-black flex items-center justify-center">
                <video src={previewVideoUrl} controls autoPlay className="w-full h-full object-contain" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
        {rejectingReel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-rose-600 font-extrabold text-sm">
                  <XCircle size={18} /> Reject Reel Submission
                </div>
                <button onClick={() => setRejectingReel(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Provide feedback or a rejection reason for <span className="font-bold text-slate-900">"{rejectingReel.caption}"</span>. The creator will see this message in their dashboard.
              </p>

              <textarea
                rows={3}
                placeholder="e.g. Video link is private or Facebook URL is invalid. Please re-upload with a public reel link."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setRejectingReel(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReelStatusChange(rejectingReel.creatorReelId, 'rejected', rejectionNote)}
                  disabled={updatingReelId === rejectingReel.creatorReelId}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Metrics Modal */}
      <AnimatePresence>
        {manualMetricsReel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setManualMetricsReel(null)}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Admin Verified Metrics</h3>
                    <p className="text-[11px] text-slate-500">Manually update performance stats & generate audit log</p>
                  </div>
                </div>
                <button
                  onClick={() => setManualMetricsReel(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
                <p className="font-bold">Mode B — Admin Verified Mode</p>
                <p className="text-[11px] text-blue-800 leading-snug">
                  Metrics entered here will be saved as verified, recorded in audit logs, and trigger creator points & level recalculation.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Verified Views Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={manualViews}
                    onChange={(e) => setManualViews(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                    placeholder="e.g. 15000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Verified Likes Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={manualLikes}
                    onChange={(e) => setManualLikes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                    placeholder="e.g. 1200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Verified Comments Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={manualComments}
                    onChange={(e) => setManualComments(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                    placeholder="e.g. 140"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Update Reason / Audit Note <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                    placeholder="e.g. Verified via Facebook Page Insights screenshot"
                  />
                </div>

                {/* Live Point Calculation Preview */}
                {(() => {
                  const calc = calculateReelPoints(
                    { views: manualViews, likes: manualLikes, comments: manualComments },
                    manualMetricsReel.status,
                    pointSettings
                  );
                  return (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1.5 text-xs text-amber-900">
                      <div className="flex items-center justify-between font-black text-amber-950">
                        <span className="flex items-center gap-1">
                          <Zap size={14} className="fill-amber-500 text-amber-500" />
                          <span>Calculated Reel Points:</span>
                        </span>
                        <span className="text-sm font-black text-amber-700">{calc.totalPoints} pts</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px] font-bold text-amber-800 pt-1 border-t border-amber-200/60">
                        <span>Views: +{calc.viewPoints} pts</span>
                        <span>Likes: +{calc.likePoints} pts</span>
                        <span>Comments: +{calc.commentPoints} pts</span>
                      </div>
                      {manualMetricsReel.status !== 'approved' && manualMetricsReel.status !== 'published' && (
                        <p className="text-[10px] text-rose-700 font-bold pt-1">
                          ⚠️ Note: Points will be credited once this reel is Approved or Published.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setManualMetricsReel(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveManualMetrics}
                  disabled={updatingMetricsId === manualMetricsReel.creatorReelId}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  <ShieldCheck size={14} />
                  <span>Save Verified Metrics</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-pink-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-pink-900/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 mb-2">
              <Sparkles size={12} className="text-pink-400" /> Creator Network Admin
            </span>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              Creator Applications & Performance Hub
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Manage creators, review reels, configure performance points, and view verification logs.
            </p>
          </div>

          {/* Top Level Nav Switch */}
          <div className="flex items-center bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto shrink-0 flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('creators')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'creators'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck size={14} />
              <span>Creators ({creators.length})</span>
              {pendingCreatorsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('reels')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'reels'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video size={14} />
              <span>Reel Moderation ({reels.length})</span>
              {pendingReelsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black">
                  {pendingReelsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'leaderboard'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy size={14} />
              <span>Leaderboard</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings size={14} />
              <span>Point Rules & Tiers</span>
            </button>

            <button
              onClick={() => setActiveTab('audits')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'audits'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History size={14} />
              <span>Audit Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= SECTION 1: CREATORS MANAGEMENT ================= */}
      {activeTab === 'creators' && (
        <div className="space-y-6">
          {/* Creator Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Applications</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{creators.length}</div>
            </div>

            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 shadow-xs">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block flex items-center gap-1">
                <Clock size={12} /> Pending Review
              </span>
              <div className="text-2xl font-black text-amber-900 mt-1">{pendingCreatorsCount}</div>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
                <CheckCircle2 size={12} /> Approved Creators
              </span>
              <div className="text-2xl font-black text-emerald-900 mt-1">{approvedCreatorsCount}</div>
            </div>

            <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200/80 shadow-xs">
              <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block flex items-center gap-1">
                <XCircle size={12} /> Suspended
              </span>
              <div className="text-2xl font-black text-rose-900 mt-1">{creators.filter(c => c.status === 'suspended').length}</div>
            </div>
          </div>

          {/* Filters & View Modes */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search creators by handle, name, or email..."
                value={creatorSearchQuery}
                onChange={(e) => setCreatorSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase shrink-0">Filter Status:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Pending Review' },
                { id: 'approved', label: 'Approved' },
                { id: 'suspended', label: 'Suspended' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCreatorStatus(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap border ${
                    selectedCreatorStatus === tab.id
                      ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
                <button
                  onClick={() => setCreatorViewMode('table')}
                  className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                    creatorViewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setCreatorViewMode('grid')}
                  className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                    creatorViewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Cards
                </button>
              </div>
            </div>
          </div>

          {/* Creators List / Grid */}
          {filteredCreators.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium bg-white rounded-2xl border border-dashed border-slate-200">
              {loadingCreators ? 'Loading creators database...' : 'No creator accounts match your criteria.'}
            </div>
          ) : creatorViewMode === 'table' ? (
            /* TABLE VIEW WITH ALL 10 REQUIRED FIELDS */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="px-4 py-3">Creator</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Level</th>
                      <th className="px-4 py-3">Points</th>
                      <th className="px-4 py-3 text-center">Reels</th>
                      <th className="px-4 py-3 text-right">Views</th>
                      <th className="px-4 py-3 text-right">Likes</th>
                      <th className="px-4 py-3 text-right">Comments</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredCreators.map((c) => (
                      <tr key={c.creatorId} className="hover:bg-slate-50/80 transition">
                        {/* 1. Creator */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={c.profileImage}
                              alt={c.displayName}
                              className="w-10 h-10 rounded-xl object-cover border border-pink-200 bg-slate-100 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-900 block truncate">{c.displayName}</span>
                              <span className="text-[11px] font-mono text-pink-600 font-bold block truncate">@{c.username}</span>
                              <span className="text-[10px] text-slate-400 block truncate">{c.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            c.status === 'approved' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : c.status === 'suspended'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {c.status}
                          </span>
                        </td>

                        {/* 3. Level */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-extrabold text-slate-800 block">Lvl {c.level}</span>
                          <span className="text-[10px] text-slate-500 block">{c.levelName}</span>
                        </td>

                        {/* 4. Points */}
                        <td className="px-4 py-3 whitespace-nowrap font-black text-amber-600">
                          <span className="flex items-center gap-1">
                            <Zap size={13} className="fill-amber-500 text-amber-500" />
                            {c.totalPoints.toLocaleString()}
                          </span>
                        </td>

                        {/* 5. Reels */}
                        <td className="px-4 py-3 text-center font-bold text-slate-700 whitespace-nowrap">
                          {c.totalReels}
                        </td>

                        {/* 6. Views */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                          {c.totalViews.toLocaleString()}
                        </td>

                        {/* 7. Likes */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                          {c.totalLikes.toLocaleString()}
                        </td>

                        {/* 8. Comments */}
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                          {c.totalComments.toLocaleString()}
                        </td>

                        {/* 9. Joined */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-400">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>

                        {/* 10. Actions */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedCreatorDetails(c)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1"
                              title="View full profile, reels & performance"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>

                            {c.status !== 'approved' && (
                              <button
                                onClick={() => handleCreatorStatusChange(c.creatorId, 'approved')}
                                disabled={updatingCreatorId === c.creatorId}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              >
                                <CheckCircle2 size={13} />
                                <span>Approve</span>
                              </button>
                            )}

                            {c.status !== 'suspended' && (
                              <button
                                onClick={() => handleCreatorStatusChange(c.creatorId, 'suspended')}
                                disabled={updatingCreatorId === c.creatorId}
                                className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-extrabold rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              >
                                <XCircle size={13} />
                                <span>Suspend</span>
                              </button>
                            )}

                            {c.status === 'suspended' && (
                              <button
                                onClick={() => handleCreatorStatusChange(c.creatorId, 'pending')}
                                disabled={updatingCreatorId === c.creatorId}
                                className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-extrabold rounded-xl transition cursor-pointer disabled:opacity-50"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* GRID CARD VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCreators.map((c) => (
                <div key={c.creatorId} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden border border-pink-200 bg-slate-100 shrink-0">
                        <img src={c.profileImage} alt={c.displayName} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold text-slate-900 text-sm truncate">{c.displayName}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                            c.status === 'approved' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : c.status === 'suspended'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-pink-600 font-bold block truncate">@{c.username}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{c.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs font-bold">
                      <span className="text-slate-600">Lvl {c.level}: {c.levelName}</span>
                      <span className="text-amber-600 font-black flex items-center gap-1">
                        <Zap size={12} className="fill-amber-500 text-amber-500" />
                        {c.totalPoints} pts
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded-xl border border-slate-100 text-[10px] font-mono text-center">
                      <div>
                        <span className="text-slate-400 block text-[8px] uppercase font-black">Views</span>
                        <span className="font-bold text-slate-800">{c.totalViews.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[8px] uppercase font-black">Likes</span>
                        <span className="font-bold text-slate-800">{c.totalLikes.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[8px] uppercase font-black">Comments</span>
                        <span className="font-bold text-slate-800">{c.totalComments.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedCreatorDetails(c)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1"
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {c.status !== 'approved' && (
                        <button
                          onClick={() => handleCreatorStatusChange(c.creatorId, 'approved')}
                          disabled={updatingCreatorId === c.creatorId}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          <CheckCircle2 size={13} />
                          <span>Approve</span>
                        </button>
                      )}

                      {c.status !== 'suspended' && (
                        <button
                          onClick={() => handleCreatorStatusChange(c.creatorId, 'suspended')}
                          disabled={updatingCreatorId === c.creatorId}
                          className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-extrabold rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          <XCircle size={13} />
                          <span>Suspend</span>
                        </button>
                      )}

                      {c.status === 'suspended' && (
                        <button
                          onClick={() => handleCreatorStatusChange(c.creatorId, 'pending')}
                          disabled={updatingCreatorId === c.creatorId}
                          className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-extrabold rounded-xl transition cursor-pointer disabled:opacity-50"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= SECTION 2: REEL MODERATION ================= */}
      {activeTab === 'reels' && (
        <div className="space-y-6">
          {/* Reel Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Submissions</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{reels.length}</div>
            </div>

            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 shadow-xs">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block flex items-center gap-1">
                <Clock size={12} /> Pending Moderation
              </span>
              <div className="text-2xl font-black text-amber-900 mt-1">{pendingReelsCount}</div>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
                <CheckCircle2 size={12} /> Approved / Published
              </span>
              <div className="text-2xl font-black text-emerald-900 mt-1">{approvedReelsCount}</div>
            </div>

            <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200/80 shadow-xs">
              <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block flex items-center gap-1">
                <XCircle size={12} /> Rejected
              </span>
              <div className="text-2xl font-black text-rose-900 mt-1">{reels.filter(r => r.status === 'rejected').length}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search reels by caption, tags, or description..."
                value={reelSearchQuery}
                onChange={(e) => setReelSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase shrink-0">Filter Status:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Pending Review' },
                { id: 'approved', label: 'Approved' },
                { id: 'published', label: 'Published' },
                { id: 'rejected', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedReelStatus(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap border ${
                    selectedReelStatus === tab.id
                      ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredReels.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 font-medium bg-white rounded-2xl border border-dashed border-slate-200">
                {loadingReels ? 'Loading reels moderation database...' : 'No creator reels match your criteria.'}
              </div>
            ) : (
              filteredReels.map((reel) => {
                const creator = creators.find(c => c.creatorId === reel.creatorId || c.userId === reel.creatorUserId);

                const statusBadge = {
                  pending: { bg: 'bg-amber-100 text-amber-900 border-amber-200', label: 'Pending Review' },
                  approved: { bg: 'bg-emerald-100 text-emerald-900 border-emerald-200', label: 'Approved' },
                  published: { bg: 'bg-purple-100 text-purple-900 border-purple-200', label: 'Published' },
                  rejected: { bg: 'bg-rose-100 text-rose-900 border-rose-200', label: 'Rejected' },
                }[reel.status] || { bg: 'bg-slate-100 text-slate-800 border-slate-200', label: reel.status };

                return (
                  <div key={reel.creatorReelId} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                      {/* Creator Info Bar */}
                      <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img 
                            src={creator?.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} 
                            alt={creator?.displayName || 'Creator'} 
                            className="w-7 h-7 rounded-full object-cover border border-pink-200 shrink-0" 
                          />
                          <div className="truncate text-xs">
                            <span className="font-extrabold text-slate-900 block truncate">{creator?.displayName || reel.creatorUserId}</span>
                            <span className="text-[10px] text-pink-600 font-mono font-bold block truncate">@{creator?.username || 'creator'}</span>
                          </div>
                        </div>

                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase border shrink-0 ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      </div>

                      {/* Video / Thumbnail Container */}
                      <div className="relative aspect-video bg-slate-900 overflow-hidden group">
                        {reel.videoUrl ? (
                          <video src={reel.videoUrl} className="w-full h-full object-cover opacity-90" preload="metadata" />
                        ) : (
                          <img src={reel.thumbnailUrl} alt={reel.caption} className="w-full h-full object-cover" />
                        )}

                        {reel.videoUrl && (
                          <button
                            onClick={() => setPreviewVideoUrl(reel.videoUrl)}
                            className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-pink-600/90 text-white flex items-center justify-center shadow-xl hover:bg-pink-700 hover:scale-110 transition cursor-pointer"
                          >
                            <Play size={20} className="fill-white ml-0.5" />
                          </button>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <h3 className="font-black text-slate-900 text-xs line-clamp-2 leading-snug">
                          {reel.caption}
                        </h3>

                        {reel.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {reel.description}
                          </p>
                        )}

                        {reel.productNames && reel.productNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {reel.productNames.map((name, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-50 text-pink-800 text-[9px] font-bold border border-pink-100">
                                <Tag size={8} className="text-pink-600" /> {name}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="pt-1">
                          <a
                            href={reel.facebookPostUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                          >
                            <Globe size={12} />
                            <span>Facebook Post Link</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>

                        {reel.adminNote && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[10px] text-rose-800">
                            <span className="font-extrabold block">Admin Feedback:</span>
                            <p>{reel.adminNote}</p>
                          </div>
                        )}

                        {/* Performance & Facebook Metrics Section (STEP 3) */}
                        <div className="pt-2.5 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-700">
                            <span className="uppercase text-slate-400 font-mono text-[9px] tracking-wider">Facebook Performance</span>
                            {/* Source Badge */}
                            {reel.metricsSource === 'facebook_api' || reel.performance?.metricsSource === 'facebook_api' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black border border-emerald-200">
                                <Globe size={9} className="text-emerald-600" /> Facebook API
                              </span>
                            ) : reel.metricsSource === 'admin_verified' || reel.performance?.metricsSource === 'admin_verified' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[9px] font-black border border-blue-200">
                                <ShieldCheck size={9} className="text-blue-600" /> Admin Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold border border-slate-200">
                                <Clock size={9} /> Not Tracked
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-4 gap-1 text-center bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs font-black">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Views</span>
                              <span className="text-slate-900 flex items-center justify-center gap-0.5">
                                <Eye size={10} className="text-slate-400" />
                                {reel.performance?.views || 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Likes</span>
                              <span className="text-rose-600 flex items-center justify-center gap-0.5">
                                <Heart size={10} className="fill-rose-500 text-rose-500" />
                                {reel.performance?.likes || 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Comments</span>
                              <span className="text-blue-600 flex items-center justify-center gap-0.5">
                                <MessageSquare size={10} className="text-blue-500" />
                                {reel.performance?.comments || 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">Points</span>
                              <span className="text-amber-600 flex items-center justify-center gap-0.5">
                                <Zap size={10} className="fill-amber-500 text-amber-500" />
                                {reel.performance?.points || 0}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1">
                            <span className="text-[9px] text-slate-400 truncate">
                              Updated: {reel.metricsUpdatedAt || reel.performance?.metricsUpdatedAt 
                                ? new Date(reel.metricsUpdatedAt || reel.performance?.metricsUpdatedAt!).toLocaleDateString()
                                : 'Never'}
                            </span>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleRefreshFacebookMetrics(reel.creatorReelId)}
                                disabled={updatingMetricsId === reel.creatorReelId}
                                title="Refresh Facebook Graph API Metrics"
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              >
                                <RefreshCw size={9} className={updatingMetricsId === reel.creatorReelId ? "animate-spin" : ""} />
                                <span>API</span>
                              </button>

                              <button
                                onClick={() => handleOpenManualMetricsModal(reel)}
                                disabled={updatingMetricsId === reel.creatorReelId}
                                title="Manually update verified metrics"
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 border border-blue-200"
                              >
                                <ShieldCheck size={9} />
                                <span>Manual</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1">
                      <button
                        onClick={() => handleDeleteReel(reel.creatorReelId)}
                        disabled={updatingReelId === reel.creatorReelId}
                        title="Delete Reel"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="flex items-center gap-1">
                        {reel.status !== 'approved' && reel.status !== 'published' && (
                          <button
                            onClick={() => handleReelStatusChange(reel.creatorReelId, 'approved')}
                            disabled={updatingReelId === reel.creatorReelId}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle2 size={12} />
                            <span>Approve</span>
                          </button>
                        )}

                        {reel.status !== 'published' && (
                          <button
                            onClick={() => handleReelStatusChange(reel.creatorReelId, 'published')}
                            disabled={updatingReelId === reel.creatorReelId}
                            className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <Sparkles size={12} />
                            <span>Publish</span>
                          </button>
                        )}

                        {reel.status !== 'rejected' && (
                          <button
                            onClick={() => {
                              setRejectingReel(reel);
                              setRejectionNote('');
                            }}
                            disabled={updatingReelId === reel.creatorReelId}
                            className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-extrabold rounded-lg transition cursor-pointer flex items-center gap-1"
                          >
                            <XCircle size={12} />
                            <span>Reject</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= SECTION 3: POINT RULES & LEVEL TIERS ================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black uppercase mb-1">
                <Settings size={12} /> Creator Point Engine
              </div>
              <h2 className="text-xl font-black text-slate-900">Point Conversion Rules & Level Thresholds</h2>
              <p className="text-xs text-slate-500">Configure how Facebook performance metrics translate into creator points and tier progression.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRecalculateAllPoints}
                disabled={recalculatingPoints}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <RotateCw size={14} className={recalculatingPoints ? "animate-spin" : ""} />
                <span>Recalculate All Creators</span>
              </button>

              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>Save Point Settings</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Point Formula Settings */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
                  <Zap size={20} className="fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Performance Point Formula</h3>
                  <p className="text-[11px] text-slate-500">Set point multipliers for verified Facebook views, likes, and comments</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Views Rule */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Eye size={14} className="text-blue-500" /> Views Point Rule
                  </span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <span>1 Point earned for every</span>
                    <input
                      type="number"
                      min="1"
                      value={pointSettings.viewsPerPoint}
                      onChange={(e) => setPointSettings({ ...pointSettings, viewsPerPoint: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-center"
                    />
                    <span>verified views.</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">Example: 15,000 views = {Math.floor(15000 / pointSettings.viewsPerPoint)} points</p>
                </div>

                {/* Likes Rule */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Heart size={14} className="text-rose-500 fill-rose-500" /> Likes Point Rule
                  </span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 flex-wrap">
                    <span>Earn</span>
                    <input
                      type="number"
                      min="1"
                      value={pointSettings.pointsPerLikeBlock}
                      onChange={(e) => setPointSettings({ ...pointSettings, pointsPerLikeBlock: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-16 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-center"
                    />
                    <span>points for every block of</span>
                    <input
                      type="number"
                      min="1"
                      value={pointSettings.likesPerPoint}
                      onChange={(e) => setPointSettings({ ...pointSettings, likesPerPoint: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-center"
                    />
                    <span>verified likes.</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">Example: 120 likes = {Math.floor(120 / pointSettings.likesPerPoint) * pointSettings.pointsPerLikeBlock} points</p>
                </div>

                {/* Comments Rule */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-purple-500" /> Comments Point Rule
                  </span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <span>Earn</span>
                    <input
                      type="number"
                      min="1"
                      value={pointSettings.pointsPerComment}
                      onChange={(e) => setPointSettings({ ...pointSettings, pointsPerComment: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-16 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-center"
                    />
                    <span>points per verified comment.</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">Example: 14 comments = {14 * pointSettings.pointsPerComment} points</p>
                </div>
              </div>
            </div>

            {/* 2. Level Tiers Thresholds */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-600 border border-pink-200 flex items-center justify-center font-bold">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Creator Level Thresholds</h3>
                  <p className="text-[11px] text-slate-500">Configure point minimums required for creators to unlock level tiers</p>
                </div>
              </div>

              <div className="space-y-3">
                {pointSettings.levels.map((lvl, index) => (
                  <div key={lvl.level} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 text-xs font-black flex items-center justify-center shrink-0">
                        L{lvl.level}
                      </span>
                      <div>
                        <input
                          type="text"
                          value={lvl.name}
                          onChange={(e) => {
                            const updatedLevels = [...pointSettings.levels];
                            updatedLevels[index].name = e.target.value;
                            setPointSettings({ ...pointSettings, levels: updatedLevels });
                          }}
                          className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      <span>Min Points:</span>
                      <input
                        type="number"
                        min="0"
                        value={lvl.minPoints}
                        onChange={(e) => {
                          const updatedLevels = [...pointSettings.levels];
                          updatedLevels[index].minPoints = Math.max(0, parseInt(e.target.value) || 0);
                          setPointSettings({ ...pointSettings, levels: updatedLevels });
                        }}
                        className="w-24 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-amber-700 text-right"
                      />
                      <span>pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION 4: AUDIT LOGS ================= */}
      {activeTab === 'audits' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-black uppercase mb-1">
                <History size={12} /> System Audit Trail
              </div>
              <h2 className="text-xl font-black text-slate-900">Reel Performance Verification Logs</h2>
              <p className="text-xs text-slate-500">Immutable record of admin manual metric overrides and points adjustments.</p>
            </div>

            <button
              onClick={() => {
                setLoadingAuditLogs(true);
                getReelMetricAuditLogs(50)
                  .then((logs) => { setAuditLogs(logs); setLoadingAuditLogs(false); })
                  .catch((err) => setLoadingAuditLogs(false));
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={12} className={loadingAuditLogs ? "animate-spin" : ""} />
              <span>Refresh Logs</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingAuditLogs ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400">
                Loading metric audit logs...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400">
                No admin verified metric adjustments logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Timestamp & Admin</th>
                      <th className="px-4 py-3">Reel ID</th>
                      <th className="px-4 py-3">Previous Metrics</th>
                      <th className="px-4 py-3">New Verified Metrics</th>
                      <th className="px-4 py-3">Point Delta</th>
                      <th className="px-4 py-3">Audit Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {auditLogs.map((log) => {
                      const prevPts = log.previousPerformance?.points || 0;
                      const newPts = log.newPerformance?.points || 0;
                      const diff = newPts - prevPts;

                      return (
                        <tr key={log.auditLogId} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-bold text-slate-900 block">{new Date(log.timestamp).toLocaleString()}</span>
                            <span className="text-[10px] text-blue-600 font-mono font-bold block">By: {log.adminId}</span>
                          </td>

                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                            {log.creatorReelId}
                          </td>

                          <td className="px-4 py-3 text-[11px]">
                            {log.previousPerformance ? (
                              <span>
                                {log.previousPerformance.views} views, {log.previousPerformance.likes} likes, {log.previousPerformance.comments} comments
                              </span>
                            ) : (
                              <span className="text-slate-400">Initial State</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-[11px] font-bold text-slate-900">
                            {log.newPerformance.views} views, {log.newPerformance.likes} likes, {log.newPerformance.comments} comments
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
                              diff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              <Zap size={10} className={diff >= 0 ? 'fill-emerald-500 text-emerald-500' : 'fill-rose-500 text-rose-500'} />
                              {diff >= 0 ? `+${diff}` : diff} pts
                            </span>
                          </td>

                          <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">
                            {log.reason || 'Admin verified metrics update'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= SECTION 5: LEADERBOARD VIEW ================= */}
      {activeTab === 'leaderboard' && (
        <LeaderboardView isAdminView={true} />
      )}

      {/* Creator Details Modal */}
      {selectedCreatorDetails && (
        <CreatorDetailsModal
          creator={selectedCreatorDetails}
          onClose={() => setSelectedCreatorDetails(null)}
          onUpdateStatus={async (creatorId, newStatus) => {
            await handleCreatorStatusChange(creatorId, newStatus);
            setSelectedCreatorDetails(prev => prev ? { ...prev, status: newStatus } : null);
          }}
        />
      )}
    </div>
  );
};
