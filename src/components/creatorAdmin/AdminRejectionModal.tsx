import React, { useState } from 'react';
import { motion } from 'motion/react';
import { XCircle, X } from 'lucide-react';
import { CreatorReel } from '../../types';

interface AdminRejectionModalProps {
  reel: CreatorReel;
  updating: boolean;
  onClose: () => void;
  onConfirmReject: (note: string) => Promise<void>;
}

export const AdminRejectionModal: React.FC<AdminRejectionModalProps> = ({
  reel,
  updating,
  onClose,
  onConfirmReject
}) => {
  const [rejectionNote, setRejectionNote] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmReject(rejectionNote);
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
        className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-rose-600">
            <XCircle size={20} />
            <h3 className="text-base font-black text-slate-900">Reject Reel Submission</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Provide constructive feedback to the creator explaining why this reel was not approved.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              Rejection Note / Feedback <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="e.g. Video did not feature products clearly, or caption was missing brand hashtags."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none font-medium"
            />
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
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
            >
              {updating ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
