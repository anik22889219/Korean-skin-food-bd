import React from 'react';
import { FooterColumnsSettings, FooterLinkItem } from '../../types/theme';
import { DEFAULT_FOOTER_COLUMNS } from '../../services/themeService';
import {
  LayoutGrid,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Sparkles,
  RotateCcw,
  Link2
} from 'lucide-react';

interface FooterLinkManagerProps {
  footerColumns?: FooterColumnsSettings;
  onChange: (next: FooterColumnsSettings) => void;
}

const ROUTE_PRESETS: Array<{ label: string; to: string }> = [
  { label: 'Home Page (/)', to: '/' },
  { label: 'Shop All Skincare (/shop)', to: '/shop' },
  { label: 'Brands Directory (/brands)', to: '/brands' },
  { label: 'Skincare Guides (/guides)', to: '/guides' },
  { label: 'Become a Creator (/become-a-creator)', to: '/become-a-creator' },
  { label: 'Creator Leaderboard (/creator/leaderboard)', to: '/creator/leaderboard' },
  { label: 'About Us (/about-us)', to: '/about-us' },
  { label: 'Contact Us (/contact-us)', to: '/contact-us' },
  { label: 'Privacy Policy (/privacy-policy)', to: '/privacy-policy' },
  { label: 'Terms of Service (/terms-of-service)', to: '/terms-of-service' },
  { label: 'Wholesale Portal (/wholesale)', to: '/wholesale' },
  { label: 'My Profile & Orders (/profile)', to: '/profile' },
  { label: 'Sign In / Login (/login)', to: '/login' },
];

type ColumnKey = keyof FooterColumnsSettings;

const COLUMN_META: Array<{ key: ColumnKey; badge: string; desc: string }> = [
  { key: 'store', badge: 'Column 1', desc: 'Storefront catalog, brands directory, skincare guides & public trust links' },
  { key: 'partners', badge: 'Column 2', desc: 'Creators, wholesale portal, and customer account pages' },
  { key: 'legal', badge: 'Column 3', desc: 'About Us, Contact Us, Privacy Policy, and Terms of Service' },
];

export const FooterLinkManager: React.FC<FooterLinkManagerProps> = ({ footerColumns, onChange }) => {
  const columns: FooterColumnsSettings = footerColumns || DEFAULT_FOOTER_COLUMNS;

  const updateColumnTitle = (colKey: ColumnKey, title: string) => {
    onChange({
      ...columns,
      [colKey]: {
        ...columns[colKey],
        title,
      },
    });
  };

  const updateLink = (colKey: ColumnKey, idx: number, patch: Partial<FooterLinkItem>) => {
    const nextLinks = [...columns[colKey].links];
    nextLinks[idx] = { ...nextLinks[idx], ...patch };
    onChange({
      ...columns,
      [colKey]: {
        ...columns[colKey],
        links: nextLinks,
      },
    });
  };

  const addLink = (colKey: ColumnKey) => {
    const newItem: FooterLinkItem = {
      id: `fl-${colKey}-${Date.now()}`,
      label: 'New Footer Link',
      to: '/shop',
      enabled: true,
      isExternal: false,
      highlight: false,
    };
    onChange({
      ...columns,
      [colKey]: {
        ...columns[colKey],
        links: [...columns[colKey].links, newItem],
      },
    });
  };

  const removeLink = (colKey: ColumnKey, idx: number) => {
    const nextLinks = columns[colKey].links.filter((_, i) => i !== idx);
    onChange({
      ...columns,
      [colKey]: {
        ...columns[colKey],
        links: nextLinks,
      },
    });
  };

  const moveLink = (colKey: ColumnKey, idx: number, dir: 'up' | 'down') => {
    const nextLinks = [...columns[colKey].links];
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= nextLinks.length) return;
    const temp = nextLinks[idx];
    nextLinks[idx] = nextLinks[targetIdx];
    nextLinks[targetIdx] = temp;
    onChange({
      ...columns,
      [colKey]: {
        ...columns[colKey],
        links: nextLinks,
      },
    });
  };

  const handleResetFooterColumns = () => {
    onChange(DEFAULT_FOOTER_COLUMNS);
  };

  return (
    <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm space-y-5 lg:col-span-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-100 pb-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <LayoutGrid size={17} className="text-[#E91E8C]" />
            <span>Dynamic Footer Links & Column Manager</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Rename column titles, toggle individual links on/off, reorder items, or add links to any page in your storefront.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetFooterColumns}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <RotateCcw size={13} />
          <span>Restore Default Footer Links</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {COLUMN_META.map(({ key, badge, desc }) => {
          const group = columns[key];
          return (
            <div key={key} className="bg-pink-50/20 border border-pink-100 rounded-2xl p-4 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#E91E8C] bg-pink-50 px-2.5 py-1 rounded-md border border-pink-100">
                    {badge}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {group.links.filter((l) => l.enabled).length} / {group.links.length} visible
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Column Heading</label>
                  <input
                    type="text"
                    value={group.title}
                    onChange={(e) => updateColumnTitle(key, e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-pink-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#E91E8C]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">{desc}</p>
                </div>

                <div className="space-y-2.5 pt-1">
                  {group.links.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className={`p-3 rounded-xl border transition space-y-2 ${
                        item.enabled
                          ? 'bg-white border-pink-100 shadow-2xs'
                          : 'bg-slate-50/80 border-slate-200 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) => updateLink(key, idx, { enabled: e.target.checked })}
                            className="w-3.5 h-3.5 accent-[#E91E8C] rounded cursor-pointer"
                          />
                          <span className="text-[11px] font-extrabold text-slate-700">
                            {item.enabled ? 'Visible' : 'Hidden'}
                          </span>
                        </label>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveLink(key, idx, 'up')}
                            disabled={idx === 0}
                            title="Move Up"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLink(key, idx, 'down')}
                            disabled={idx === group.links.length - 1}
                            title="Move Down"
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLink(key, idx)}
                            title="Delete Link"
                            className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Link Label</label>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateLink(key, idx, { label: e.target.value })}
                          placeholder="e.g. Shop All Skincare"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#E91E8C]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <Link2 size={10} /> Route / URL
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={item.to}
                            onChange={(e) => updateLink(key, idx, { to: e.target.value })}
                            placeholder="/shop or https://..."
                            className="flex-1 min-w-0 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-700 outline-none focus:bg-white focus:border-[#E91E8C]"
                          />
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                updateLink(key, idx, {
                                  to: e.target.value,
                                  isExternal: e.target.value.startsWith('http'),
                                });
                              }
                            }}
                            title="Choose Preset Route"
                            className="w-24 px-1.5 py-1.5 bg-pink-50 border border-pink-200 rounded-lg text-[10px] font-bold text-[#E91E8C] outline-none cursor-pointer"
                          >
                            <option value="">Presets...</option>
                            {ROUTE_PRESETS.map((preset) => (
                              <option key={preset.to} value={preset.to}>
                                {preset.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 text-[10px] font-bold text-slate-500">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!item.isExternal}
                            onChange={(e) => updateLink(key, idx, { isExternal: e.target.checked })}
                            className="w-3 h-3 accent-[#E91E8C] rounded cursor-pointer"
                          />
                          <ExternalLink size={10} />
                          <span>New Tab</span>
                        </label>

                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!item.highlight}
                            onChange={(e) => updateLink(key, idx, { highlight: e.target.checked })}
                            className="w-3 h-3 accent-[#E91E8C] rounded cursor-pointer"
                          />
                          <Sparkles size={10} className="text-[#E91E8C]" />
                          <span>Highlight</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => addLink(key)}
                className="w-full py-2.5 bg-white hover:bg-pink-50 text-[#E91E8C] border border-dashed border-pink-300 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Link to {group.title}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
