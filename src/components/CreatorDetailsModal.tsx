import React, { useState } from 'react';
import { 
  X, CheckCircle2, XCircle, Clock, ShieldAlert, Award, Zap, Eye, Heart, 
  MessageSquare, Video, ExternalLink, Globe, Play, Phone, Mail, Calendar, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CreatorProfile, CreatorStatus, CreatorReel, ReelMetricAuditLog } from '../types';

interface CreatorDetailsModalProps {
  creator: CreatorProfile | null;
  isOpen: boolean;
  onClose: () => void;
  reels: CreatorReel[];
  auditLogs?: ReelMetricAuditLog[];
  onUpdateStatus: (creatorId: string, status: CreatorStatus) => Promise<void>;
  onPreviewVideo?: (videoUrl: string) => void;
}

export const CreatorDetailsModal: React.FC<CreatorDetailsModalProps> = ({
  creator,
  isOpen,
  onClose,
  reels,
  auditLogs = [],
  onUpdateStatus,
  onPreviewVideo,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'reels' | 'history'>('profile');
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  if (!isOpen || !creator) return null;

  const creatorReels = reels.filter(
    (r) => r.creatorId === creator.creatorId || r.creatorUserId === creator.userId
  );

  const creatorAudits = auditLogs.filter((a) =>
    creatorReels.some((r) => r.creatorReelId === a.creatorReelId)
  );

  const handleStatusChange = async (newStatus: CreatorStatus) => {
    setUpdatingStatus(true);
    try {
      await onUpdateStatus(creator.creatorId, newStatus);
    } catch (err) {
      console.error('Failed to update creator status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const statusBadge = {
    pending: { bg: 'bg-amber-100 text-amber-900 border-amber-200', label: 'Pending Review' },
    approved: { bg: 'bg-emerald-100 text-emerald-900 border-emerald-200', label: 'Approved' },
    suspended: { bg: 'bg-rose-100 text-rose-900 border-rose-200', label: 'Suspended' },
  }[creator.status] || { bg: 'bg-slate-100 text-slate-800 border-slate-200', label: creator.status };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-pink-950 to-slate-900 p-6 text-white relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4 min-w-0 pr-8">
              <img
                src={creator.profileImage}
                alt={creator.displayName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-pink-400 bg-slate-900 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-white truncate">{creator.displayName}</h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${statusBadge.bg}`}>
                    {statusBadge.label}
                  </span>
                </div>
                <p className="text-xs text-pink-400 font-mono font-bold mt-0.5">@{creator.username}</p>
                <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1"><Award size={12} className="text-pink-400" /> Lvl {creator.level}: {creator.levelName}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-bold text-amber-400"><Zap size={12} className="fill-amber-400" /> {creator.totalPoints.toLocaleString()} pts</span>
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 self-start md:self-center pt-2 md:pt-0">
              {creator.status !== 'approved' && (
                <button
                  onClick={() => handleStatusChange('approved')}
                  disabled={updatingStatus}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 size={14} />
                  <span>Approve</span>
                </button>
              )}

              {creator.status !== 'suspended' && (
                <button
                  onClick={() => handleStatusChange('suspended')}
                  disabled={updatingStatus}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                >
                  <XCircle size={14} />
                  <span>Suspend</span>
                </button>
              )}

              {creator.status === 'suspended' && (
                <button
                  onClick={() => handleStatusChange('pending')}
                  disabled={updatingStatus}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                >
                  <Clock size={14} />
                  <span>Reactivate (Pending)</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 pt-3 flex items-center gap-2 overflow-x-auto">
            {[
              { id: 'profile', label: 'Profile Overview', icon: UserCheck },
              { id: 'stats', label: 'Statistics & Level', icon: Award },
              { id: 'reels', label: `Reels & Facebook Links (${creatorReels.length})`, icon: Video },
              { id: 'history', label: 'Activity History', icon: Calendar },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-t-2xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 border-t border-x ${
                    activeTab === tab.id
                      ? 'bg-white text-pink-600 border-slate-200 border-b-white -mb-px shadow-xs'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Body */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* TAB 1: PROFILE OVERVIEW */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Contact & Identity</span>
                    <div className="space-y-2 text-xs font-bold text-slate-700">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-slate-400" />
                        <span>Email:</span>
                        <span className="text-slate-900 font-mono">{creator.email || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-slate-400" />
                        <span>Phone:</span>
                        <span className="text-slate-900 font-mono">{creator.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span>Joined:</span>
                        <span className="text-slate-900 font-mono">{new Date(creator.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Level & Tier Progress</span>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-700">Lvl {creator.level}: {creator.levelName}</span>
                        <span className="text-pink-600 font-black">{creator.levelProgress || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-pink-500 to-rose-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, creator.levelProgress || 0))}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Next Level Target: <span className="font-bold text-slate-900">{creator.nextLevelPoints || 100} pts</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Creator Bio / Description</span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {creator.bio || 'No bio provided.'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: STATISTICS & LEVEL */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Reels</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{creator.totalReels || 0}</div>
                  </div>

                  <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 text-center">
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block flex items-center justify-center gap-1">
                      <Eye size={12} /> Total Views
                    </span>
                    <div className="text-2xl font-black text-blue-900 mt-1">{(creator.totalViews || 0).toLocaleString()}</div>
                  </div>

                  <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200 text-center">
                    <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block flex items-center justify-center gap-1">
                      <Heart size={12} className="fill-rose-500 text-rose-500" /> Total Likes
                    </span>
                    <div className="text-2xl font-black text-rose-900 mt-1">{(creator.totalLikes || 0).toLocaleString()}</div>
                  </div>

                  <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 text-center">
                    <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider block flex items-center justify-center gap-1">
                      <MessageSquare size={12} /> Comments
                    </span>
                    <div className="text-2xl font-black text-purple-900 mt-1">{(creator.totalComments || 0).toLocaleString()}</div>
                  </div>
                </div>

                <div className="p-5 bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-purple-500/10 rounded-2xl border border-amber-200/80 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">Verified Point Total</span>
                    <div className="text-3xl font-black text-amber-950 flex items-center gap-2 mt-0.5">
                      <Zap size={24} className="fill-amber-500 text-amber-500" />
                      {(creator.totalPoints || 0).toLocaleString()} <span className="text-sm font-bold text-amber-800">Points</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Current Rank Tier</span>
                    <div className="text-lg font-black text-pink-700 mt-0.5">Lvl {creator.level}: {creator.levelName}</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: REELS & FACEBOOK LINKS */}
            {activeTab === 'reels' && (
              <div className="space-y-4">
                {creatorReels.length === 0 ? (
                  <div className="p-8 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No reels uploaded by this creator yet.
                  </div>
                ) : (
                  creatorReels.map((reel) => (
                    <div key={reel.creatorReelId} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                        <div className="font-extrabold text-xs text-slate-900">{reel.caption}</div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 self-start sm:self-auto ${
                          reel.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          reel.status === 'published' ? 'bg-purple-100 text-purple-800' :
                          reel.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {reel.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-bold bg-white p-2 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block">Views</span>
                          <span>{reel.performance?.views || 0}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block">Likes</span>
                          <span className="text-rose-600">{reel.performance?.likes || 0}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block">Comments</span>
                          <span className="text-blue-600">{reel.performance?.comments || 0}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block">Points</span>
                          <span className="text-amber-600 font-black">+{reel.performance?.points || 0} pts</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <a
                          href={reel.facebookPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline"
                        >
                          <Globe size={12} />
                          <span>View Facebook Reel</span>
                          <ExternalLink size={10} />
                        </a>

                        {reel.videoUrl && onPreviewVideo && (
                          <button
                            onClick={() => onPreviewVideo(reel.videoUrl)}
                            className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 font-extrabold text-[10px] rounded-lg cursor-pointer flex items-center gap-1 border border-pink-200"
                          >
                            <Play size={10} className="fill-pink-600 text-pink-600" /> Preview Video
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 4: ACTIVITY HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-xs font-black text-slate-900 block">Account Milestones</span>
                  <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                    <p className="flex items-center justify-between">
                      <span>Account Applied:</span>
                      <span className="font-mono text-slate-900">{new Date(creator.createdAt).toLocaleString()}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>Last Profile Update:</span>
                      <span className="font-mono text-slate-900">{new Date(creator.updatedAt || creator.createdAt).toLocaleString()}</span>
                    </p>
                  </div>
                </div>

                <span className="text-xs font-black text-slate-900 block pt-2">Verification & Performance Audit Logs</span>
                {creatorAudits.length === 0 ? (
                  <div className="p-6 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No manual metric audit logs recorded for this creator's reels yet.
                  </div>
                ) : (
                  creatorAudits.map((log) => (
                    <div key={log.auditLogId} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>Reel: {log.creatorReelId}</span>
                        <span className="text-blue-600 font-mono text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        <span className="font-bold">Verified Metrics:</span> {log.newPerformance?.views} views, {log.newPerformance?.likes} likes, {log.newPerformance?.comments} comments
                      </p>
                      <p className="text-[10px] text-slate-400 italic">Reason: {log.reason || 'Admin metric verification'}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
