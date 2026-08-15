import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CreatorProfile, CreatorStatus, CreatorReel, CreatorReelStatus, CreatorPointSettings, ReelMetricAuditLog } from '../types';
import { subscribeToAllReelsForAdmin, updateReelStatusByAdmin, deleteCreatorReel } from '../services/creatorReelService';
import { updateAdminVerifiedMetrics, refreshFacebookApiMetricsApi } from '../services/facebookMetricsService';
import { 
  getCreatorPointSettings, 
  saveCreatorPointSettings, 
  recalculateAllCreatorsPointsAndLevels, 
  getReelMetricAuditLogs
} from '../services/creatorPointService';
import { 
  Sparkles, 
  CheckCircle2, 
  ShieldAlert, 
  ShieldCheck,
  Zap, 
  Video, 
  AlertCircle,
  UserCheck,
  Crown,
  Settings,
  History,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LeaderboardView } from './LeaderboardView';
import { CreatorDetailsModal } from './CreatorDetailsModal';
import { AdminCreatorsTab } from './creatorAdmin/AdminCreatorsTab';
import { AdminReelsTab } from './creatorAdmin/AdminReelsTab';
import { AdminSettingsTab } from './creatorAdmin/AdminSettingsTab';
import { AdminAuditLogsTab } from './creatorAdmin/AdminAuditLogsTab';
import { AdminManualMetricsModal } from './creatorAdmin/AdminManualMetricsModal';
import { AdminRejectionModal } from './creatorAdmin/AdminRejectionModal';
import { AdminVideoPlayerModal } from './creatorAdmin/AdminVideoPlayerModal';

export const AdminCreators: React.FC = () => {
  const { profile } = useAuth();
  
  // Tab state: 'creators' | 'reels' | 'leaderboard' | 'settings' | 'audits'
  const [activeTab, setActiveTab] = useState<'creators' | 'reels' | 'leaderboard' | 'settings' | 'audits'>('creators');

  // Creators State
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [loadingCreators, setLoadingCreators] = useState<boolean>(true);
  const [updatingCreatorId, setUpdatingCreatorId] = useState<string | null>(null);
  const [selectedCreatorDetails, setSelectedCreatorDetails] = useState<CreatorProfile | null>(null);

  // Reels State
  const [reels, setReels] = useState<CreatorReel[]>([]);
  const [loadingReels, setLoadingReels] = useState<boolean>(true);
  const [updatingReelId, setUpdatingReelId] = useState<string | null>(null);
  const [updatingMetricsId, setUpdatingMetricsId] = useState<string | null>(null);
  
  // Settings & Levels State
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

  // Modal States
  const [rejectingReel, setRejectingReel] = useState<CreatorReel | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [manualMetricsReel, setManualMetricsReel] = useState<CreatorReel | null>(null);

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
  const fetchAuditLogs = () => {
    if (!isAuthorized) return;
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
  };

  useEffect(() => {
    if (activeTab === 'audits') {
      fetchAuditLogs();
    }
  }, [isAuthorized, activeTab]);

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

  const handleSaveManualMetrics = async (views: number, likes: number, comments: number, reason: string) => {
    if (!manualMetricsReel) return;
    setUpdatingMetricsId(manualMetricsReel.creatorReelId);
    try {
      await updateAdminVerifiedMetrics({
        creatorReelId: manualMetricsReel.creatorReelId,
        views: Number(views),
        likes: Number(likes),
        comments: Number(comments),
        metricsSource: 'admin_verified',
        adminId: profile?.displayName || profile?.email || 'Admin',
        reason: reason.trim() || 'Verified via Admin Dashboard',
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

  const pendingCreatorsCount = creators.filter((c) => c.status === 'pending').length;
  const pendingReelsCount = reels.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
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

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-pink-950 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-pink-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs font-black uppercase tracking-wider mb-1">
            <Crown size={14} className="text-pink-400" /> Admin Command Center
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Sparkles className="text-pink-400" size={28} />
            Creator Hub Management
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-xl">
            Review creator applications, moderate Facebook reel submissions, manage server-authoritative points rules, and inspect audit logs.
          </p>
        </div>

        {/* Global Summary Stats */}
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] font-black text-pink-300 uppercase block">Pending Creators</span>
            <span className="text-xl font-black text-white">{pendingCreatorsCount}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] font-black text-pink-300 uppercase block">Pending Reels</span>
            <span className="text-xl font-black text-white">{pendingReelsCount}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('creators')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 border whitespace-nowrap ${
            activeTab === 'creators'
              ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <UserCheck size={16} />
          <span>Creator Accounts</span>
          {pendingCreatorsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-white text-pink-600 rounded-full text-[10px] font-black">
              {pendingCreatorsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reels')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 border whitespace-nowrap ${
            activeTab === 'reels'
              ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Video size={16} />
          <span>Reel Moderation</span>
          {pendingReelsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-white text-pink-600 rounded-full text-[10px] font-black">
              {pendingReelsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 border whitespace-nowrap ${
            activeTab === 'leaderboard'
              ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Trophy size={16} />
          <span>Leaderboard</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 border whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Settings size={16} />
          <span>Points & Levels</span>
        </button>

        <button
          onClick={() => setActiveTab('audits')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 border whitespace-nowrap ${
            activeTab === 'audits'
              ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <History size={16} />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'creators' && (
        <AdminCreatorsTab
          creators={creators}
          loading={loadingCreators}
          updatingCreatorId={updatingCreatorId}
          onStatusChange={handleCreatorStatusChange}
          onViewDetails={(creator) => setSelectedCreatorDetails(creator)}
        />
      )}

      {activeTab === 'reels' && (
        <AdminReelsTab
          reels={reels}
          creators={creators}
          loading={loadingReels}
          updatingReelId={updatingReelId}
          updatingMetricsId={updatingMetricsId}
          onStatusChange={handleReelStatusChange}
          onOpenRejectionModal={(reel) => setRejectingReel(reel)}
          onRefreshMetrics={handleRefreshFacebookMetrics}
          onOpenManualMetricsModal={(reel) => setManualMetricsReel(reel)}
          onDeleteReel={handleDeleteReel}
          onPreviewVideo={(url) => setPreviewVideoUrl(url)}
        />
      )}

      {activeTab === 'leaderboard' && (
        <LeaderboardView isAdminView={true} />
      )}

      {activeTab === 'settings' && (
        <AdminSettingsTab
          pointSettings={pointSettings}
          savingSettings={savingSettings}
          recalculatingPoints={recalculatingPoints}
          onChangeSettings={setPointSettings}
          onSaveSettings={handleSaveSettings}
          onRecalculatePoints={handleRecalculateAllPoints}
        />
      )}

      {activeTab === 'audits' && (
        <AdminAuditLogsTab
          auditLogs={auditLogs}
          loading={loadingAuditLogs}
          onRefresh={fetchAuditLogs}
        />
      )}

      {/* MODALS */}
      <AnimatePresence>
        {manualMetricsReel && (
          <AdminManualMetricsModal
            reel={manualMetricsReel}
            pointSettings={pointSettings}
            updating={updatingMetricsId === manualMetricsReel.creatorReelId}
            onClose={() => setManualMetricsReel(null)}
            onSave={handleSaveManualMetrics}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rejectingReel && (
          <AdminRejectionModal
            reel={rejectingReel}
            updating={updatingReelId === rejectingReel.creatorReelId}
            onClose={() => setRejectingReel(null)}
            onConfirmReject={async (note) => {
              await handleReelStatusChange(rejectingReel.creatorReelId, 'rejected', note);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewVideoUrl && (
          <AdminVideoPlayerModal
            videoUrl={previewVideoUrl}
            onClose={() => setPreviewVideoUrl(null)}
          />
        )}
      </AnimatePresence>

      {/* Creator Details Drawer / Modal */}
      {selectedCreatorDetails && (
        <CreatorDetailsModal
          creator={selectedCreatorDetails}
          isOpen={Boolean(selectedCreatorDetails)}
          onClose={() => setSelectedCreatorDetails(null)}
          onApprove={() => handleCreatorStatusChange(selectedCreatorDetails.creatorId, 'approved')}
          onSuspend={() => handleCreatorStatusChange(selectedCreatorDetails.creatorId, 'suspended')}
          onReactivate={() => handleCreatorStatusChange(selectedCreatorDetails.creatorId, 'pending')}
        />
      )}
    </div>
  );
};
