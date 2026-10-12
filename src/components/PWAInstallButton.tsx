import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed standalone PWA, hide button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#E91E8C] to-[#FF4B91] px-3 py-2 text-xs font-bold text-white shadow-xs hover:opacity-95 transition cursor-pointer ${className}`}
        title="Install Korean Skin Food POS App for Offline Access"
      >
        <Download size={14} />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-2xl border border-pink-200 bg-pink-50/60 px-3 py-2 text-xs font-bold text-[#E91E8C] hover:bg-pink-100 transition cursor-pointer ${className}`}
        >
          <Smartphone size={14} />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-pink-100 animate-scaleIn text-left">
              <div className="flex items-center justify-between pb-3 border-b border-pink-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-[#E91E8C]">
                    <Smartphone size={18} />
                  </div>
                  <h3 className="text-sm font-black text-gray-900">Install on iPhone / iPad</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-gray-600">
                <div className="flex items-start gap-2.5 bg-pink-50/50 p-2.5 rounded-2xl border border-pink-100">
                  <span className="w-5 h-5 rounded-full bg-[#E91E8C] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                  <p>Tap the <strong>Share</strong> button (box with upward arrow) at the bottom of Safari.</p>
                </div>
                <div className="flex items-start gap-2.5 bg-pink-50/50 p-2.5 rounded-2xl border border-pink-100">
                  <span className="w-5 h-5 rounded-full bg-[#E91E8C] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                  <p>Scroll down in the action sheet and select <strong>Add to Home Screen</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5 bg-pink-50/50 p-2.5 rounded-2xl border border-pink-100">
                  <span className="w-5 h-5 rounded-full bg-[#E91E8C] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                  <p>Tap <strong>Add</strong> in the top right. The POS app is now installed with full offline support!</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-2xl bg-gray-900 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
