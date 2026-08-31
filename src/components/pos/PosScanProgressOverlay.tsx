import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scan, 
  Sparkles, 
  Zap, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  Crosshair,
  Maximize2
} from 'lucide-react';

interface PosScanProgressOverlayProps {
  isScanning: boolean;
  isAnalyzingPhoto?: boolean;
  zoomLevel: number;
  onZoomChange: (newZoom: number) => void;
  onRefocus: () => void;
  onSwitchCamera: () => void;
  useFrontCamera: boolean;
  scanStatusMsg?: { type: 'success' | 'error'; text: string } | null;
}

export const PosScanProgressOverlay: React.FC<PosScanProgressOverlayProps> = ({
  isScanning,
  isAnalyzingPhoto = false,
  zoomLevel,
  onZoomChange,
  onRefocus,
  onSwitchCamera,
  useFrontCamera,
  scanStatusMsg
}) => {
  // Simulated frame sampling pulse counter for live visual scanning progress
  const [frameTick, setFrameTick] = useState<number>(0);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisStage, setAnalysisStage] = useState<string>('Initializing frame capture...');

  // Frame tick animation for visual scanning rhythm
  useEffect(() => {
    if (!isScanning || isAnalyzingPhoto) return;
    const interval = setInterval(() => {
      setFrameTick((prev) => (prev + 1) % 100);
    }, 80);
    return () => clearInterval(interval);
  }, [isScanning, isAnalyzingPhoto]);

  // Stepped progress simulation when deep lens/photo scan is running
  useEffect(() => {
    if (!isAnalyzingPhoto) {
      setAnalysisProgress(0);
      return;
    }

    setAnalysisProgress(15);
    setAnalysisStage('1/4 Capturing high-res frame...');

    const t1 = setTimeout(() => {
      setAnalysisProgress(45);
      setAnalysisStage('2/4 Enhancing contrast & lighting...');
    }, 280);

    const t2 = setTimeout(() => {
      setAnalysisProgress(78);
      setAnalysisStage('3/4 Decoding 1D/2D barcode pattern...');
    }, 620);

    const t3 = setTimeout(() => {
      setAnalysisProgress(95);
      setAnalysisStage('4/4 Matching product catalog database...');
    }, 980);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isAnalyzingPhoto]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 overflow-hidden select-none">
      {/* 1. TOP STATUS HUD & ACTIVE SCANNING GAUGE */}
      <div className="flex items-center justify-between gap-2 w-full">
        {/* Live scanning badge */}
        <div className="inline-flex items-center gap-1.5 bg-black/70 border border-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="tracking-wide">AI SCANNER LIVE</span>
          <span className="text-gray-400 font-mono text-[9px]">| 30 FPS</span>
        </div>

        {/* Camera Flip Quick Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSwitchCamera();
          }}
          className="pointer-events-auto bg-black/65 hover:bg-black/85 border border-white/20 text-white p-1.5 rounded-full backdrop-blur-md transition shadow-md cursor-pointer active:scale-95 flex items-center justify-center"
          title={`Switch to ${useFrontCamera ? 'Rear' : 'Front'} Camera`}
        >
          <RefreshCw size={13} className="text-pink-300" />
        </button>
      </div>

      {/* 2. CENTER TARGETING RETICLE & LASER SCAN SWEEP */}
      <div className="relative w-full aspect-square max-w-[210px] mx-auto flex items-center justify-center my-auto">
        {/* Reticle Outer Glowing Target Box */}
        <div className="absolute inset-0 border-2 border-white/25 rounded-2xl">
          {/* Top-Left Corner Bracket */}
          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-[#E91E8C] rounded-tl-lg shadow-[0_0_10px_#E91E8C]"></div>
          {/* Top-Right Corner Bracket */}
          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-[#E91E8C] rounded-tr-lg shadow-[0_0_10px_#E91E8C]"></div>
          {/* Bottom-Left Corner Bracket */}
          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-[#E91E8C] rounded-bl-lg shadow-[0_0_10px_#E91E8C]"></div>
          {/* Bottom-Right Corner Bracket */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-[#E91E8C] rounded-br-lg shadow-[0_0_10px_#E91E8C]"></div>
        </div>

        {/* Center Target Crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
          <Crosshair size={28} className="text-pink-400 animate-pulse" />
        </div>

        {/* Sweeping Laser Beam Animation */}
        {!isAnalyzingPhoto && (
          <motion.div
            className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-[#E91E8C] to-transparent shadow-[0_0_14px_#E91E8C,0_0_4px_#ffffff] rounded-full z-20 pointer-events-none"
            animate={{
              top: ['10%', '88%', '10%'],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        )}

        {/* Live Scan Rhythm Pulse Bar */}
        <div className="absolute -bottom-7 inset-x-0 flex flex-col items-center gap-1 text-center">
          <div className="w-28 h-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-xs">
            <div 
              className="h-full bg-gradient-to-r from-pink-500 to-emerald-400 transition-all duration-75 ease-out rounded-full"
              style={{ width: `${((frameTick % 50) / 50) * 100}%` }}
            />
          </div>
          <span className="text-[9px] font-bold text-white/90 drop-shadow-md tracking-wider uppercase">
            Align Barcode In Target
          </span>
        </div>
      </div>

      {/* 3. DEEP ANALYSIS MODAL OVERLAY (LENS / PHOTO SCANNING) */}
      <AnimatePresence>
        {isAnalyzingPhoto && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center text-white space-y-4"
          >
            {/* Radar Sweep / Analysis Spinner */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-pink-500/30 animate-ping opacity-50"></div>
              <div className="w-14 h-14 rounded-full border-3 border-transparent border-t-[#E91E8C] border-r-pink-300 animate-spin"></div>
              <Scan size={24} className="text-white absolute" />
            </div>

            <div className="space-y-1 w-full max-w-[240px]">
              <div className="flex items-center justify-between text-[11px] font-bold text-pink-300">
                <span>Analyzing Frame</span>
                <span className="font-mono text-emerald-400">{analysisProgress}%</span>
              </div>
              
              {/* Progress track */}
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#E91E8C] via-pink-400 to-emerald-400 rounded-full"
                  style={{ width: `${analysisProgress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.2 }}
                />
              </div>

              <p className="text-[10px] text-slate-300 font-mono text-left truncate pt-1">
                {analysisStage}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. BOTTOM QUICK IN-VIEW CAMERA CONTROLS (ZOOM & FOCUS) */}
      <div className="w-full flex items-center justify-between gap-1 pointer-events-auto pt-2">
        {/* Zoom Quick Selector */}
        <div className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/20 shadow-lg">
          <span className="text-[9px] font-bold text-gray-300 px-1">Zoom</span>
          {[1.0, 1.5, 2.0, 2.5].map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => onZoomChange(z)}
              className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black transition cursor-pointer ${
                zoomLevel === z
                  ? 'bg-[#E91E8C] text-white shadow-xs'
                  : 'bg-white/10 text-white/90 hover:bg-white/25'
              }`}
            >
              {z}x
            </button>
          ))}
        </div>

        {/* Refocus Target Action */}
        <button
          type="button"
          onClick={onRefocus}
          className="bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer shadow-lg flex items-center gap-1 active:scale-95"
          title="Trigger autofocus"
        >
          <Crosshair size={11} />
          <span>Refocus</span>
        </button>
      </div>
    </div>
  );
};
