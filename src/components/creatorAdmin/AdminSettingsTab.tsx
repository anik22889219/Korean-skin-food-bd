import React from 'react';
import { 
  Settings, 
  RotateCw, 
  Save, 
  Zap, 
  Eye, 
  Heart, 
  MessageSquare, 
  Award 
} from 'lucide-react';
import { CreatorPointSettings } from '../../types';

interface AdminSettingsTabProps {
  pointSettings: CreatorPointSettings;
  savingSettings: boolean;
  recalculatingPoints: boolean;
  onChangeSettings: (newSettings: CreatorPointSettings) => void;
  onSaveSettings: () => Promise<void>;
  onRecalculatePoints: () => Promise<void>;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  pointSettings,
  savingSettings,
  recalculatingPoints,
  onChangeSettings,
  onSaveSettings,
  onRecalculatePoints
}) => {
  return (
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
            onClick={onRecalculatePoints}
            disabled={recalculatingPoints}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <RotateCw size={14} className={recalculatingPoints ? "animate-spin" : ""} />
            <span>Recalculate All Creators</span>
          </button>

          <button
            onClick={onSaveSettings}
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
                  onChange={(e) => onChangeSettings({ ...pointSettings, viewsPerPoint: Math.max(1, parseInt(e.target.value) || 1) })}
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
                  onChange={(e) => onChangeSettings({ ...pointSettings, pointsPerLikeBlock: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-16 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-center"
                />
                <span>points for every block of</span>
                <input
                  type="number"
                  min="1"
                  value={pointSettings.likesPerPoint}
                  onChange={(e) => onChangeSettings({ ...pointSettings, likesPerPoint: Math.max(1, parseInt(e.target.value) || 1) })}
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
                  onChange={(e) => onChangeSettings({ ...pointSettings, pointsPerComment: Math.max(1, parseInt(e.target.value) || 1) })}
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
                        onChangeSettings({ ...pointSettings, levels: updatedLevels });
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
                      onChangeSettings({ ...pointSettings, levels: updatedLevels });
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
  );
};
