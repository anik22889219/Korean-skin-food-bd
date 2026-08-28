import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, X, Copy, Check } from 'lucide-react';

interface PosPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export const PosPairingModal: React.FC<PosPairingModalProps> = ({
  isOpen,
  onClose,
  sessionId
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const pairingUrl = `${window.location.origin}/pos/scan/${sessionId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pairingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn print:hidden">
      <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-pink-100 shadow-2xl max-w-md w-full space-y-5 text-center relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition cursor-pointer"
          title="Close modal"
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 bg-pink-100/60 rounded-2xl flex items-center justify-center mx-auto text-[#E91E8C]">
          <Smartphone size={24} />
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-200 mb-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>Automatic Discovery Active</span>
          </div>
          <h3 className="text-lg font-black text-gray-900 tracking-tight">
            Mobile Barcode Scanner Link
          </h3>
          <p className="text-xs text-gray-500">
            Smartphones opening <strong>/admin/pos</strong> or <strong>/pos/scan</strong> connect automatically without scanning a QR code. Use the QR code below only as a fallback.
          </p>
        </div>

        {sessionId ? (
          <div className="bg-pink-50/30 border border-pink-100 p-5 rounded-2xl inline-block shadow-inner">
            <QRCodeSVG
              value={pairingUrl}
              size={180}
              bgColor={'#FFFFFF'}
              fgColor={'#E91E8C'}
              level={'H'}
            />
            <div className="flex items-center gap-1 mt-3 max-w-[240px] mx-auto">
              <div className="text-[10px] text-pink-600 font-mono font-bold truncate flex-1 bg-white px-2.5 py-1.5 rounded-lg border border-pink-100 shadow-2xs">
                {pairingUrl}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="bg-[#E91E8C] text-white p-1.5 rounded-lg hover:bg-pink-600 transition shrink-0 cursor-pointer"
                title="Copy scanner link"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-48 h-48 bg-pink-50 animate-pulse mx-auto rounded-2xl flex items-center justify-center">
            <span className="text-xs text-pink-400 font-semibold">Generating pairing session...</span>
          </div>
        )}

        <div className="bg-pink-50/50 p-4 rounded-2xl text-left border border-pink-100 text-xs text-gray-600 space-y-1.5">
          <span className="font-extrabold text-pink-700 uppercase text-[10px] block">
            Instructions for store staff:
          </span>
          <p className="leading-relaxed text-[11px]">
            1. Open Camera or Chrome on smartphone & scan this QR code.<br />
            2. Point mobile camera at product barcodes.<br />
            3. Cart on this register will update in <strong>real-time</strong>!
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full bg-[#E91E8C] hover:bg-[#FF4B91] text-white py-3 rounded-2xl font-bold text-xs transition cursor-pointer shadow-md shadow-pink-200"
        >
          Done / Close Modal
        </button>
      </div>
    </div>
  );
};
