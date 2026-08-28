import React, { useState, useRef, useEffect } from 'react';
import { Smartphone, QrCode, PowerOff, CheckCircle2, AlertCircle, ChevronDown, ExternalLink } from 'lucide-react';
import { ScannerConnectionInfo } from './types';

interface PosScannerStatusBadgeProps {
  connectionInfo: ScannerConnectionInfo;
  onOpenScanner: () => void;
  onOpenQrModal: () => void;
  onDisconnectScanner: () => void;
}

export const PosScannerStatusBadge: React.FC<PosScannerStatusBadgeProps> = ({
  connectionInfo,
  onOpenScanner,
  onOpenQrModal,
  onDisconnectScanner
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const isConnected = connectionInfo.isConnected;

  // Calculate friendly last active time
  const getLastSeenText = () => {
    if (!connectionInfo.lastSeenAt) return 'Active just now';
    const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(connectionInfo.lastSeenAt).getTime()) / 1000));
    if (diffSeconds < 10) return 'Active just now';
    if (diffSeconds < 60) return `Active ${diffSeconds}s ago`;
    const minutes = Math.floor(diffSeconds / 60);
    return `Active ${minutes}m ago`;
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className={`px-3 py-1.5 rounded-2xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs ${
          isConnected
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
        }`}
        title="Mobile Scanner Connection Status"
      >
        <span className="relative flex h-2 w-2">
          {isConnected ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </>
          ) : (
            <span className="inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
          )}
        </span>

        <Smartphone size={14} className={isConnected ? 'text-emerald-600' : 'text-gray-400'} />

        <span className="hidden sm:inline">
          {isConnected ? (connectionInfo.scannerName || 'Scanner Connected') : 'Mobile Scanner'}
        </span>

        <span className="sm:hidden">
          {isConnected ? 'Scanner 🟢' : 'Scanner ⚪'}
        </span>

        <ChevronDown size={12} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-pink-100 shadow-xl p-4 z-50 text-xs space-y-3 animate-scaleIn">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="font-extrabold text-gray-900 flex items-center gap-1.5">
              <Smartphone size={14} className="text-[#E91E8C]" />
              <span>Wireless Mobile Scanner</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {isConnected ? 'Active' : 'Disconnected'}
            </span>
          </div>

          {isConnected ? (
            <div className="space-y-2 text-gray-600 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
              <div className="flex justify-between">
                <span className="text-gray-500">Device:</span>
                <span className="font-semibold text-gray-800 truncate max-w-[140px]">
                  {connectionInfo.scannerName || 'Connected Phone'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Heartbeat:</span>
                <span className="font-mono text-emerald-700">{getLastSeenText()}</span>
              </div>
              <div className="flex justify-between text-[11px] text-gray-400 pt-0.5 border-t border-emerald-100/60">
                <span>Scanner ID:</span>
                <span className="font-mono">{connectionInfo.scannerId?.substring(0, 14)}...</span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 space-y-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <p className="font-medium text-gray-700">No scanner currently linked.</p>
              <p className="text-[11px] leading-relaxed">
                Open <strong>/admin/pos</strong> on any smartphone — it connects automatically!
              </p>
            </div>
          )}

          <div className="space-y-1.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                onOpenScanner();
              }}
              className="w-full bg-[#E91E8C] hover:bg-[#FF4B91] text-white py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shadow-pink-200"
            >
              <ExternalLink size={13} />
              <span>Open Scanner View</span>
            </button>

            {isConnected && (
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onDisconnectScanner();
                }}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-1.5 rounded-xl font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <PowerOff size={12} />
                <span>Disconnect Mobile Phone</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                onOpenQrModal();
              }}
              className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 py-1.5 rounded-xl font-medium transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <QrCode size={12} />
              <span>Show QR / Code (Fallback)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
