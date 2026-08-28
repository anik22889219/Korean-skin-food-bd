import React from 'react';
import { Smartphone, X, Check, ArrowRight, AlertTriangle, Radio } from 'lucide-react';
import { ScannerConnectionInfo } from './types';

interface PosScannerNotificationProps {
  connectionInfo: ScannerConnectionInfo;
  isOpen: boolean;
  onDismiss: () => void;
  onOpenScanner: () => void;
  onAcceptPendingRequest?: () => void;
  onRejectPendingRequest?: () => void;
}

export const PosScannerNotification: React.FC<PosScannerNotificationProps> = ({
  connectionInfo,
  isOpen,
  onDismiss,
  onOpenScanner,
  onAcceptPendingRequest,
  onRejectPendingRequest
}) => {
  if (!isOpen) return null;

  const hasPending = Boolean(connectionInfo.pendingRequest);

  return (
    <aside 
      aria-label="Scanner Connection Notification"
      className="fixed top-4 right-4 z-50 max-w-sm w-full bg-white border border-pink-200 rounded-2xl shadow-xl shadow-pink-500/10 p-4 animate-slideDown print:hidden"
    >
      {hasPending ? (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
              <span className="p-1.5 bg-amber-50 rounded-xl border border-amber-200">
                <AlertTriangle size={16} />
              </span>
              <span>Scanner Connection Request</span>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-xs text-gray-600">
            <strong>{connectionInfo.pendingRequest?.mobileScannerName || 'A new mobile scanner'}</strong> is attempting to connect to this register.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onAcceptPendingRequest}
              className="flex-1 bg-[#E91E8C] hover:bg-[#FF4B91] text-white py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-xs shadow-pink-200"
            >
              <Check size={13} />
              <span>Allow New Scanner</span>
            </button>
            <button
              type="button"
              onClick={onRejectPendingRequest}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Reject
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <Smartphone size={15} className="text-emerald-600" />
              <span>Mobile Scanner Connected</span>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition"
              title="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-xs text-gray-600">
            <strong>{connectionInfo.scannerName || 'A mobile phone'}</strong> is now wireless-paired with this register. Scanned barcodes will sync to this cart instantly.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onOpenScanner();
                onDismiss();
              }}
              className="flex-1 bg-[#E91E8C] hover:bg-[#FF4B91] text-white py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shadow-pink-200"
            >
              <span>Open Scanner View</span>
              <ArrowRight size={13} />
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 py-1.5 px-3 rounded-xl text-xs font-medium transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
