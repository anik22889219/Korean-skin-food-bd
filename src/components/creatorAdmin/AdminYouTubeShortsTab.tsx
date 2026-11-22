import React, { useMemo, useState } from 'react';
import {
  Youtube,
  RefreshCw,
  Eye,
  EyeOff,
  Pin,
  PinOff,
  ArrowUp,
  ArrowDown,
  Tag,
  Search,
  Play,
  ExternalLink,
  Trash2,
  Save,
  Check,
  X,
  Edit3,
  Clock,
  SlidersHorizontal,
  ShoppingBag,
  Loader2,
  Plus,
} from 'lucide-react';
import {
  Product,
  YouTubeShortItem,
  YouTubeShortsDisplaySettings,
} from '../../types';
import { YouTubeAdminStatus } from '../../services/youtubeService';
import { getRetailPrice } from '../../utils/pricing';
import { getYouTubeEmbedUrl } from '../../utils/youtubeUrl';

interface AdminYouTubeShortsTabProps {
  shorts: YouTubeShortItem[];
  loading: boolean;
  syncing: boolean;
  ytStatus: YouTubeAdminStatus | null;
  displaySettings: YouTubeShortsDisplaySettings;
  products: Product[];
  onSyncNow: () => Promise<void>;
  onSaveDisplaySettings: (next: YouTubeShortsDisplaySettings) => Promise<void>;
  onUpdateShort: (
    videoId: string,
    patch: Partial<Pick<YouTubeShortItem, 'isVisible' | 'isPinned' | 'displayOrder' | 'customTitle' | 'taggedProductIds'>>
  ) => Promise<void>;
  onReorderShorts: (orderedVideoIds: string[]) => Promise<void>;
  onDeleteShort: (videoId: string) => Promise<void>;
  onOpenChannelConfig: () => void;
}

function formatCompactCount(num: number): string {
  const n = Number(num || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString();
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatSyncTimestamp(iso?: string | null): string {
  if (!iso) return 'Never synced yet';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Recently';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AdminYouTubeShortsTab: React.FC<AdminYouTubeShortsTabProps> = ({
  shorts,
  loading,
  syncing,
  ytStatus,
  displaySettings,
  products,
  onSyncNow,
  onSaveDisplaySettings,
  onUpdateShort,
  onReorderShorts,
  onDeleteShort,
  onOpenChannelConfig,
}) => {
  const [settingsDraft, setSettingsDraft] = useState<YouTubeShortsDisplaySettings>(displaySettings);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSectionSettings, setShowSectionSettings] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'visible' | 'hidden' | 'pinned'>('all');
  const [updatingVideoId, setUpdatingVideoId] = useState<string | null>(null);

  // Inline custom title edit state
  const [editingTitleVideoId, setEditingTitleVideoId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  // Tag Store Products modal state
  const [taggingShort, setTaggingShort] = useState<YouTubeShortItem | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [savingTags, setSavingTags] = useState(false);

  // Preview video modal state
  const [previewShort, setPreviewShort] = useState<YouTubeShortItem | null>(null);

  // Sync incoming displaySettings when not actively editing
  React.useEffect(() => {
    if (!settingsDirty) {
      setSettingsDraft(displaySettings);
    }
  }, [displaySettings, settingsDirty]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => {
      if (p.id) map.set(p.id, p);
    });
    return map;
  }, [products]);

  const visibleCount = useMemo(() => shorts.filter((s) => s.isVisible).length, [shorts]);
  const hiddenCount = useMemo(() => shorts.filter((s) => !s.isVisible).length, [shorts]);
  const pinnedCount = useMemo(() => shorts.filter((s) => s.isPinned).length, [shorts]);
  const taggedCount = useMemo(
    () => shorts.filter((s) => (s.taggedProductIds?.length || 0) > 0).length,
    [shorts]
  );

  const filteredShorts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shorts.filter((item) => {
      if (filterMode === 'visible' && !item.isVisible) return false;
      if (filterMode === 'hidden' && item.isVisible) return false;
      if (filterMode === 'pinned' && !item.isPinned) return false;
      if (!q) return true;

      const titleMatch =
        item.title.toLowerCase().includes(q) ||
        (item.customTitle && item.customTitle.toLowerCase().includes(q)) ||
        item.videoId.toLowerCase().includes(q);
      if (titleMatch) return true;

      return (item.taggedProductIds || []).some((pid) => {
        const prod = productMap.get(pid);
        return prod && (prod.name.toLowerCase().includes(q) || prod.brand?.toLowerCase().includes(q));
      });
    });
  }, [shorts, filterMode, searchQuery, productMap]);

  const filteredModalProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const sorted = [...products].sort((a, b) => {
      const aSelected = selectedProductIds.includes(a.id) ? 1 : 0;
      const bSelected = selectedProductIds.includes(b.id) ? 1 : 0;
      return bSelected - aSelected;
    });
    if (!q) return sorted.slice(0, 60);
    return sorted
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [products, productSearch, selectedProductIds]);

  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await onSaveDisplaySettings(settingsDraft);
      setSettingsDirty(false);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleVisible = async (item: YouTubeShortItem) => {
    setUpdatingVideoId(item.videoId);
    try {
      await onUpdateShort(item.videoId, { isVisible: !item.isVisible });
    } finally {
      setUpdatingVideoId(null);
    }
  };

  const handleTogglePin = async (item: YouTubeShortItem) => {
    setUpdatingVideoId(item.videoId);
    try {
      await onUpdateShort(item.videoId, { isPinned: !item.isPinned });
    } finally {
      setUpdatingVideoId(null);
    }
  };

  const handleMovePosition = async (videoId: string, direction: 'up' | 'down') => {
    const idx = shorts.findIndex((s) => s.videoId === videoId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= shorts.length) return;

    const copy = [...shorts];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);

    setUpdatingVideoId(videoId);
    try {
      await onReorderShorts(copy.map((s) => s.videoId));
    } finally {
      setUpdatingVideoId(null);
    }
  };

  const handleStartTitleEdit = (item: YouTubeShortItem) => {
    setEditingTitleVideoId(item.videoId);
    setEditingTitleValue(item.customTitle || item.title);
  };

  const handleSaveCustomTitle = async (item: YouTubeShortItem) => {
    const trimmed = editingTitleValue.trim();
    setUpdatingVideoId(item.videoId);
    try {
      const nextCustom = !trimmed || trimmed === item.title ? '' : trimmed;
      await onUpdateShort(item.videoId, { customTitle: nextCustom });
      setEditingTitleVideoId(null);
    } finally {
      setUpdatingVideoId(null);
    }
  };

  const openTagModal = (item: YouTubeShortItem) => {
    setTaggingShort(item);
    setSelectedProductIds([...(item.taggedProductIds || [])]);
    setProductSearch('');
  };

  const toggleProductTag = (productId: string) => {
    setSelectedProductIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      if (prev.length >= 6) return prev;
      return [...prev, productId];
    });
  };

  const handleSaveTaggedProducts = async () => {
    if (!taggingShort) return;
    setSavingTags(true);
    try {
      await onUpdateShort(taggingShort.videoId, { taggedProductIds: selectedProductIds });
      setTaggingShort(null);
    } finally {
      setSavingTags(false);
    }
  };

  const activeChannelLabel =
    displaySettings.lastSyncedChannelTitle ||
    ytStatus?.channelTitle ||
    ytStatus?.channelId ||
    'No Channel Configured';

  return (
    <div className="space-y-5">
      {/* Top Sync & Summary Control Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Youtube size={18} className="text-red-600 shrink-0" />
              <h2 className="text-base font-black text-slate-900">
                Channel YouTube Shorts & Homepage Community Live
              </h2>
            </div>
            <p className="text-xs text-slate-600 tabular-nums">
              Channel: <span className="font-bold text-slate-900">{activeChannelLabel}</span> · Last synced:{' '}
              <span className="font-semibold text-slate-800">{formatSyncTimestamp(displaySettings.lastSyncedAt)}</span> ·{' '}
              <span className="font-semibold text-slate-800">{shorts.length} synced</span> ·{' '}
              <span className="font-semibold text-emerald-700">{visibleCount} live</span> ·{' '}
              <span className="font-semibold text-pink-700">{pinnedCount} pinned</span> ·{' '}
              <span className="font-semibold text-slate-700">{taggedCount} shoppable</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenChannelConfig}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Youtube size={14} />
              <span>Channel Setup</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSectionSettings((prev) => !prev)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                showSectionSettings
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Section & Auto-Sync Settings</span>
            </button>

            <button
              type="button"
              onClick={onSyncNow}
              disabled={syncing}
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-black transition whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Syncing Shorts...' : 'Sync Channel Shorts Now'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Homepage Section & Auto-Sync Configuration */}
        {showSectionSettings && (
          <form onSubmit={handleSaveSettingsSubmit} className="pt-4 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Homepage Section Heading
                </label>
                <input
                  type="text"
                  value={settingsDraft.title}
                  onChange={(e) => {
                    setSettingsDraft({ ...settingsDraft, title: e.target.value });
                    setSettingsDirty(true);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                  placeholder="Community Live — YouTube Shorts"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Eyebrow Subtitle
                </label>
                <input
                  type="text"
                  value={settingsDraft.subtitle}
                  onChange={(e) => {
                    setSettingsDraft({ ...settingsDraft, subtitle: e.target.value });
                    setSettingsDirty(true);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                  placeholder="SHORTS & SKINCARE IN ACTION"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Channel Button Label
                </label>
                <input
                  type="text"
                  value={settingsDraft.viewAllLinkText}
                  onChange={(e) => {
                    setSettingsDraft({ ...settingsDraft, viewAllLinkText: e.target.value });
                    setSettingsDirty(true);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                  placeholder="View Channel"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  YouTube Channel / Shorts URL
                </label>
                <input
                  type="url"
                  value={settingsDraft.viewAllLinkUrl}
                  onChange={(e) => {
                    setSettingsDraft({ ...settingsDraft, viewAllLinkUrl: e.target.value });
                    setSettingsDirty(true);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                  placeholder="https://www.youtube.com/@yourchannel/shorts"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Max Shorts on Homepage
                </label>
                <select
                  value={settingsDraft.maxDisplayCount}
                  onChange={(e) => {
                    setSettingsDraft({ ...settingsDraft, maxDisplayCount: Number(e.target.value) });
                    setSettingsDirty(true);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                >
                  <option value={6}>6 Shorts</option>
                  <option value={9}>9 Shorts</option>
                  <option value={12}>12 Shorts</option>
                  <option value={24}>24 Shorts</option>
                  <option value={50}>Up to 50 Shorts</option>
                  <option value={200}>All Visible Shorts</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Auto-Sync Frequency
                </label>
                <select
                  value={settingsDraft.autoSyncIntervalMinutes}
                  onChange={(e) => {
                    setSettingsDraft({
                      ...settingsDraft,
                      autoSyncIntervalMinutes: Number(e.target.value),
                    });
                    setSettingsDirty(true);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                >
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every 1 hour</option>
                  <option value={360}>Every 6 hours</option>
                  <option value={1440}>Every 24 hours</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Short Video Duration Rule
                </label>
                <select
                  value={settingsDraft.maxShortDurationSeconds}
                  onChange={(e) => {
                    setSettingsDraft({
                      ...settingsDraft,
                      maxShortDurationSeconds: Number(e.target.value),
                    });
                    setSettingsDirty(true);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                >
                  <option value={60}>Classic Shorts (≤ 60 sec)</option>
                  <option value={180}>Extended Shorts (≤ 3 min)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Carousel Slide Interval (Seconds)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={2}
                    max={120}
                    step={1}
                    value={settingsDraft.carouselSlideIntervalSeconds ?? 6}
                    onChange={(e) => {
                      const val = Math.max(2, Math.min(120, Number(e.target.value) || 2));
                      setSettingsDraft({
                        ...settingsDraft,
                        carouselSlideIntervalSeconds: val,
                      });
                      setSettingsDirty(true);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30 tabular-nums"
                  />
                  <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap shrink-0">sec</span>
                </div>
              </div>

              <div className="flex flex-col justify-end gap-2 bg-slate-50 p-3 rounded-xl">
                <label className="flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer">
                  <span>Show Section on Homepage</span>
                  <input
                    type="checkbox"
                    checked={settingsDraft.enabled}
                    onChange={(e) => {
                      setSettingsDraft({ ...settingsDraft, enabled: e.target.checked });
                      setSettingsDirty(true);
                    }}
                    className="w-4 h-4 accent-pink-600 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer">
                  <span>Auto-Sync New Shorts</span>
                  <input
                    type="checkbox"
                    checked={settingsDraft.autoSyncEnabled}
                    onChange={(e) => {
                      setSettingsDraft({ ...settingsDraft, autoSyncEnabled: e.target.checked });
                      setSettingsDirty(true);
                    }}
                    className="w-4 h-4 accent-pink-600 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer">
                  <span>Auto-Slide Carousel</span>
                  <input
                    type="checkbox"
                    checked={settingsDraft.autoPlayCarousel}
                    onChange={(e) => {
                      setSettingsDraft({ ...settingsDraft, autoPlayCarousel: e.target.checked });
                      setSettingsDirty(true);
                    }}
                    className="w-4 h-4 accent-pink-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              {settingsDirty && (
                <button
                  type="button"
                  onClick={() => {
                    setSettingsDraft(displaySettings);
                    setSettingsDirty(false);
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Discard Changes
                </button>
              )}
              <button
                type="submit"
                disabled={savingSettings}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Save Display & Auto-Sync Settings</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search synced Shorts by title, video ID, or tagged product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all' as const, label: `All (${shorts.length})` },
            { id: 'visible' as const, label: `Visible (${visibleCount})` },
            { id: 'hidden' as const, label: `Hidden (${hiddenCount})` },
            { id: 'pinned' as const, label: `Pinned (${pinnedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                filterMode === tab.id
                  ? 'bg-pink-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shorts Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs font-semibold text-slate-500">
          Loading synced YouTube Shorts...
        </div>
      ) : filteredShorts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
          <Youtube size={32} className="text-red-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900">
              {shorts.length === 0 ? 'No YouTube Shorts Synced Yet' : 'No Shorts Match Your Filter'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {shorts.length === 0
                ? 'Connect or configure your YouTube channel above, then click "Sync Channel Shorts Now" to pull all Shorts into Admin Creators.'
                : 'Try switching filter tabs or clearing your search query.'}
            </p>
          </div>
          {shorts.length === 0 && (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={syncing}
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-black transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              <span>Sync Channel Shorts Now</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredShorts.map((item) => {
            const isBusy = updatingVideoId === item.videoId;
            const globalIdx = shorts.findIndex((s) => s.videoId === item.videoId);
            const taggedProducts = (item.taggedProductIds || [])
              .map((pid) => productMap.get(pid))
              .filter((p): p is Product => Boolean(p));
            const effectiveTitle = item.customTitle || item.title;

            return (
              <div
                key={item.videoId}
                className={`bg-white rounded-2xl border overflow-hidden shadow-xs flex flex-col transition ${
                  item.isVisible ? 'border-slate-200' : 'border-slate-200 opacity-75'
                }`}
              >
                {/* 9:16 Poster Preview */}
                <div className="relative aspect-[9/12] bg-slate-900 overflow-hidden group">
                  <img
                    src={item.thumbnailUrl || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`}
                    alt={effectiveTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.dataset.fallback) {
                        img.dataset.fallback = '1';
                        img.src = `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

                  {/* Top status text & duration */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[11px] font-bold text-white">
                    <span className="bg-black/65 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                      {item.isPinned ? 'Pinned' : item.isVisible ? 'Live on Home' : 'Hidden'}
                    </span>
                    {item.durationSeconds > 0 && (
                      <span className="bg-black/65 backdrop-blur-sm px-2 py-1 rounded-lg tabular-nums flex items-center gap-1">
                        <Clock size={11} />
                        {formatDuration(item.durationSeconds)}
                      </span>
                    )}
                  </div>

                  {/* Center Play Preview Trigger */}
                  <button
                    type="button"
                    onClick={() => setPreviewShort(item)}
                    className="absolute inset-0 flex items-center justify-center cursor-pointer"
                    title="Preview Short"
                  >
                    <span className="w-12 h-12 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                      <Play size={20} className="ml-0.5 fill-current" />
                    </span>
                  </button>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    {/* Editable Title */}
                    {editingTitleVideoId === item.videoId ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editingTitleValue}
                          onChange={(e) => setEditingTitleValue(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-slate-50 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                          maxLength={280}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveCustomTitle(item)}
                          disabled={isBusy}
                          className="p-1.5 rounded-lg bg-emerald-600 text-white cursor-pointer"
                          title="Save title"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTitleVideoId(null)}
                          className="p-1.5 rounded-lg bg-slate-200 text-slate-700 cursor-pointer"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-black text-slate-900 line-clamp-2 leading-snug">
                          {effectiveTitle}
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleStartTitleEdit(item)}
                          className="p-1 text-slate-400 hover:text-slate-800 shrink-0 cursor-pointer"
                          title="Edit display title"
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                    )}

                    {/* Clean Unboxed Telemetry Row */}
                    <p className="text-[11px] font-semibold text-slate-600 tabular-nums">
                      {formatCompactCount(item.viewsCount)} views · {formatCompactCount(item.likesCount)} likes ·{' '}
                      {formatCompactCount(item.commentsCount)} comments
                    </p>

                    {/* Shop the Video Tagged Products Preview */}
                    <div className="bg-slate-50 rounded-xl p-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <ShoppingBag size={12} className="text-pink-600" />
                          <span>Shop the Video ({taggedProducts.length}/6)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => openTagModal(item)}
                          className="text-[11px] font-black text-pink-600 hover:text-pink-700 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Tag size={11} />
                          <span>{taggedProducts.length > 0 ? 'Edit Products' : 'Tag Products'}</span>
                        </button>
                      </div>

                      {taggedProducts.length > 0 ? (
                        <div className="space-y-1.5">
                          {taggedProducts.slice(0, 3).map((prod) => (
                            <div
                              key={prod.id}
                              className="flex items-center gap-2 bg-white rounded-lg p-1.5"
                            >
                              <img
                                src={prod.image}
                                alt={prod.name}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded object-cover bg-slate-100 shrink-0"
                              />
                              <span className="text-[11px] font-semibold text-slate-800 truncate flex-1">
                                {prod.name}
                              </span>
                              <span className="text-[11px] font-black text-slate-900 tabular-nums shrink-0">
                                ৳{getRetailPrice(prod)}
                              </span>
                            </div>
                          ))}
                          {taggedProducts.length > 3 && (
                            <p className="text-[10px] font-semibold text-slate-500 px-1">
                              +{taggedProducts.length - 3} more products tagged
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          No store products tagged yet. Tag products so shoppers can buy directly below this Short.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Control Bar */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleVisible(item)}
                        disabled={isBusy}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1 ${
                          item.isVisible
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={item.isVisible ? 'Hide from homepage' : 'Show on homepage'}
                      >
                        {item.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                        <span>{item.isVisible ? 'Visible' : 'Hidden'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePin(item)}
                        disabled={isBusy}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1 ${
                          item.isPinned
                            ? 'bg-pink-50 text-pink-700 hover:bg-pink-100'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={item.isPinned ? 'Unpin from top' : 'Pin to top'}
                      >
                        {item.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                        <span>{item.isPinned ? 'Pinned' : 'Pin'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMovePosition(item.videoId, 'up')}
                        disabled={isBusy || globalIdx <= 0}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-35 cursor-pointer"
                        title="Move Earlier"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMovePosition(item.videoId, 'down')}
                        disabled={isBusy || globalIdx === -1 || globalIdx >= shorts.length - 1}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-35 cursor-pointer"
                        title="Move Later"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <a
                        href={item.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                        title="Open on YouTube"
                      >
                        <ExternalLink size={13} />
                      </a>
                      <button
                        type="button"
                        onClick={() => onDeleteShort(item.videoId)}
                        disabled={isBusy}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                        title="Remove from list"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Tagging Modal */}
      {taggingShort && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setTaggingShort(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShoppingBag size={18} className="text-pink-600 shrink-0" />
                  <span>Tag Store Products (Shop the Video)</span>
                </h3>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {taggingShort.customTitle || taggingShort.title} · {selectedProductIds.length}/6 selected
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTaggingShort(null)}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search Korean skincare products by name, brand, category, or barcode..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredModalProducts.map((prod) => {
                const isSelected = selectedProductIds.includes(prod.id);
                const limitReached = !isSelected && selectedProductIds.length >= 6;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    disabled={limitReached}
                    onClick={() => toggleProductTag(prod.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-pink-50 ring-1 ring-pink-300'
                        : 'bg-slate-50 hover:bg-slate-100 disabled:opacity-45'
                    }`}
                  >
                    <img
                      src={prod.image}
                      alt={prod.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-cover bg-white shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {prod.brand || 'K-Beauty'} · {prod.category}
                      </p>
                    </div>
                    <span className="text-xs font-black text-slate-900 tabular-nums shrink-0">
                      ৳{getRetailPrice(prod)}
                    </span>
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-pink-600 text-white' : 'bg-white text-slate-500'
                      }`}
                    >
                      {isSelected ? <Check size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                );
              })}
              {filteredModalProducts.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-8">
                  No catalog products match "{productSearch}".
                </p>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-white">
              <span className="text-xs font-semibold text-slate-600 tabular-nums">
                {selectedProductIds.length} of 6 max products tagged
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTaggingShort(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTaggedProducts}
                  disabled={savingTags}
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-black cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingTags ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Save Tagged Products</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9:16 Video Preview Modal */}
      {previewShort && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewShort(null)}
        >
          <div
            className="bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-slate-800">
              <p className="text-xs font-bold text-white truncate">
                {previewShort.customTitle || previewShort.title}
              </p>
              <button
                type="button"
                onClick={() => setPreviewShort(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer shrink-0"
              >
                <X size={15} />
              </button>
            </div>
            <div className="aspect-[9/16] bg-black">
              <iframe
                src={getYouTubeEmbedUrl(previewShort.videoId, {
                  autoplay: true,
                  mute: false,
                  controls: true,
                  loop: true,
                })}
                title={previewShort.customTitle || previewShort.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
