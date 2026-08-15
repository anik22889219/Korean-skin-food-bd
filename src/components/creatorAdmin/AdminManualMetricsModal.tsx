import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, X, Zap } from 'lucide-react';
import { CreatorReel, CreatorPointSettings } from '../../types';
import { calculateReelPoints } from '../../services/creatorPointService';

interface AdminManualMetricsModalProps {
  reel: CreatorReel;
  pointSettings: CreatorPointSettings;
  updating: boolean;
  onClose: () => void;
  onSave: (views: number, likes: number, comments: number, reason: string) => Promise<void>;
}

export const AdminManualMetricsModal: React.FC<AdminManualMetricsModalProps> = ({
  reel,
  pointSettings,
  updating,
  onClose,
  onSave
}) => {
  const [manualViews, setManualViews] = useState<number>(reel.performance?.views || 0);
  const [manualLikes, setManualLikes] = useState<number>(reel.performance?.likes || 0);
  const [manualComments, setManualComments] = useState<number>(reel.performance?.comments || 0);
  const [manualReason, setManualReason] = useState<string>('');

  const calc = calculateReelPoints(
    { views: manualViews, likes: manualLikes, comments: manualComments },
    reel.status,
    pointSettings
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(manualViews, manualLikes, manualComments, manualReason);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Verified Metrics (Mode B)</h3>
              <p className="text-[11px] text-slate-500 font-mono truncate max-w-[240px]">
                {reel.creatorReelId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition"
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

        <form onSubmit={handleSubmit} className="space-y-3">
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
              required
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              placeholder="e.g. Verified via Facebook Page Insights screenshot"
            />
          </div>

          {/* Live Point Calculation Preview */}
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
            {reel.status !== 'approved' && reel.status !== 'published' && (
              <p className="text-[10px] text-rose-700 font-bold pt-1">
                ⚠️ Note: Points will be credited once this reel is Approved or Published.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              <ShieldCheck size={14} />
              <span>{updating ? 'Saving...' : 'Save Verified Metrics'}</span>
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
