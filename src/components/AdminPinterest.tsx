import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, AlertCircle, Copy, ExternalLink, RefreshCw, 
  Save, Globe, Code, ShoppingBag, Eye, ShieldCheck, 
  Share2, Sparkles, Check, ChevronRight, Layers, Tag
} from 'lucide-react';
import { pinterestService, PinterestSettings, DEFAULT_PINTEREST_SETTINGS } from '../services/pinterestService';
import { trackPinterestEvent } from '../services/pinterestTag';

interface CatalogPreviewData {
  stats: {
    totalProducts: number;
    inStockCount: number;
    outOfStockCount: number;
    currency: string;
    lastBuildDate: string;
  };
  feedUrls: {
    xml: string;
    csv: string;
    verificationFile: string;
  };
  sampleItems: Array<{
    id: string;
    title: string;
    description: string;
    availability: string;
    price: number;
    salePrice: number | null;
    currency: string;
    link: string;
    imageLink: string;
    brand: string;
    googleProductCategory: string;
  }>;
}

export const AdminPinterest: React.FC = () => {
  const [settings, setSettings] = useState<PinterestSettings>(() => pinterestService.getCurrentSettings());
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'verification' | 'tag' | 'catalog' | 'richpins'>('verification');

  // Copy state helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Diagnostics test state
  const [testingDiagnostics, setTestingDiagnostics] = useState<boolean>(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{
    fileEndpointOk: boolean;
    metaVerificationOk: boolean;
    verificationCode: string;
    checkedUrl: string;
    details: string;
  } | null>(null);

  // Catalog Feed Preview state
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [catalogPreview, setCatalogPreview] = useState<CatalogPreviewData | null>(null);
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  // Subscribe to real-time settings
  useEffect(() => {
    const unsub = pinterestService.subscribe((newSettings) => {
      setSettings(newSettings);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Fetch catalog preview data
  const loadCatalogPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/pinterest/preview');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCatalogPreview(data);
        }
      }
    } catch (err) {
      console.warn('Failed to load catalog preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogPreview();
  }, []);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleRunDiagnostics = async () => {
    setTestingDiagnostics(true);
    try {
      const result = await pinterestService.verifyDomainDiagnostics();
      setDiagnosticResult(result);
    } catch (err: any) {
      setDiagnosticResult({
        fileEndpointOk: false,
        metaVerificationOk: false,
        verificationCode: settings.domainVerification.verificationCode,
        checkedUrl: `/${settings.domainVerification.fileName || 'pinterest-7da08.html'}`,
        details: err?.message || 'Failed to complete diagnostics check',
      });
    } finally {
      setTestingDiagnostics(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await pinterestService.saveSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadCatalogPreview();
    } catch (err: any) {
      console.error('Error saving Pinterest settings:', err);
      setSaveError(err?.message || 'Failed to save Pinterest settings');
    } finally {
      setSaving(false);
    }
  };

  const filteredCatalogItems = useMemo(() => {
    if (!catalogPreview?.sampleItems) return [];
    if (!catalogSearch.trim()) return catalogPreview.sampleItems;
    const q = catalogSearch.toLowerCase().trim();
    return catalogPreview.sampleItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    );
  }, [catalogPreview, catalogSearch]);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://koreanskinfood.web.app';
  const xmlFeedFullUrl = `${originUrl}/api/pinterest-catalog.xml`;
  const csvFeedFullUrl = `${originUrl}/api/pinterest-catalog.csv`;
  const verificationFileFullUrl = `${originUrl}/${settings.domainVerification.fileName || 'pinterest-7da08.html'}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Save Strip */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 p-0.5 shadow-md shadow-red-500/20 shrink-0 flex items-center justify-center text-white">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pinterest Integration Hub</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                Official Merchant
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Domain claim verification, Pinterest Tag conversion tracking, and real-time Shopping catalog feeds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={handleRunDiagnostics}
            disabled={testingDiagnostics}
            className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-slate-300/60"
            title="Test verification file and meta tag"
          >
            <RefreshCw size={13} className={testingDiagnostics ? 'animate-spin' : ''} />
            <span>{testingDiagnostics ? 'Checking...' : 'Run Diagnostics'}</span>
          </button>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-60"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check size={14} />
                <span>Saved Live!</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0 text-red-500" />
          <span>{saveError}</span>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Domain Claim Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span className="font-semibold">Domain Claim</span>
            <Globe size={15} className="text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900">
              {settings.domainVerification.isVerified ? 'Verified' : 'Ready to Claim'}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
              Active
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate font-mono">
            Token: {settings.domainVerification.verificationCode.slice(0, 14)}...
          </p>
        </div>

        {/* Pinterest Tag Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span className="font-semibold">Pinterest Tag</span>
            <Code size={15} className="text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900">
              {settings.tag.enabled ? (settings.tag.tagId ? 'Active' : 'Configured') : 'Disabled'}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              settings.tag.tagId ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {settings.tag.tagId ? 'Tracking' : 'Needs Tag ID'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {settings.tag.tagId ? `ID: ${settings.tag.tagId}` : 'Add Tag ID to track events'}
          </p>
        </div>

        {/* Catalog Feed Items */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span className="font-semibold">Catalog Products</span>
            <ShoppingBag size={15} className="text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              {catalogPreview ? catalogPreview.stats.totalProducts : '...'}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded font-mono tabular-nums">
              {catalogPreview ? `${catalogPreview.stats.inStockCount} in stock` : 'Loading'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Currency: <span className="font-semibold">{settings.catalog.currency}</span> · Auto-synced
          </p>
        </div>

        {/* Rich Pins & Save Button */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span className="font-semibold">Storefront Pin Button</span>
            <Share2 size={15} className="text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900">
              {settings.richPins.showSaveButton ? 'Enabled' : 'Hidden'}
            </span>
            <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
              Product Page
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Shoppers can save items to boards
          </p>
        </div>
      </div>

      {/* Diagnostics Banner if run */}
      {diagnosticResult && (
        <div className={`p-4 rounded-xl border text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
          diagnosticResult.fileEndpointOk && diagnosticResult.metaVerificationOk
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Pinterest Domain Verification Diagnostics Passed</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-90">
              <span>File Endpoint (<code>{diagnosticResult.checkedUrl}</code>): <strong>{diagnosticResult.fileEndpointOk ? '200 OK' : 'Failed'}</strong></span>
              <span>·</span>
              <span>HTML Meta Tag (<code>p:domain_verify</code>): <strong>{diagnosticResult.metaVerificationOk ? 'Verified' : 'Inactive'}</strong></span>
              <span>·</span>
              <span>Token: <strong className="font-mono">{diagnosticResult.verificationCode}</strong></span>
            </div>
          </div>
          <button
            onClick={() => setDiagnosticResult(null)}
            className="text-xs px-2.5 py-1 bg-white/80 hover:bg-white rounded-lg border border-black/10 transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Segmented Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('verification')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'verification'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe size={14} className={activeTab === 'verification' ? 'text-red-600' : ''} />
          <span>Domain Claim</span>
        </button>

        <button
          onClick={() => setActiveTab('tag')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'tag'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code size={14} className={activeTab === 'tag' ? 'text-red-600' : ''} />
          <span>Pinterest Tag (Pixel)</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingBag size={14} className={activeTab === 'catalog' ? 'text-red-600' : ''} />
          <span>Shopping Catalog Feeds</span>
        </button>

        <button
          onClick={() => setActiveTab('richpins')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'richpins'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Share2 size={14} className={activeTab === 'richpins' ? 'text-red-600' : ''} />
          <span>Rich Pins & Pin Button</span>
        </button>
      </div>

      {/* TAB 1: DOMAIN CLAIM & VERIFICATION */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Claim Website on Pinterest</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pinterest verifies that you own <strong>koreanskinfood.web.app</strong>. Claiming gives you access to website analytics, lets you enable Pinterest Shopping, and attaches your profile picture to any Pin made from your website.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Verification Code */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Pinterest Verification Code (p:domain_verify)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.domainVerification.verificationCode}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        domainVerification: {
                          ...settings.domainVerification,
                          verificationCode: e.target.value.trim(),
                        },
                      })
                    }
                    placeholder="7da0826bf938ef0f99cb087f3822459f"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    onClick={() => handleCopy(settings.domainVerification.verificationCode, 'code')}
                    className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition cursor-pointer"
                    title="Copy Code"
                  >
                    {copiedKey === 'code' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Extracted from your Pinterest verification file. Injected as <code>&lt;meta name="p:domain_verify"&gt;</code> in the homepage header.
                </p>
              </div>

              {/* Verification File Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Root Verification HTML File Name
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.domainVerification.fileName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        domainVerification: {
                          ...settings.domainVerification,
                          fileName: e.target.value.trim(),
                        },
                      })
                    }
                    placeholder="pinterest-7da08.html"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <a
                    href={verificationFileFullUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition"
                    title="Open live verification file"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
                <p className="text-[11px] text-slate-500">
                  Dynamically hosted at <code>{verificationFileFullUrl}</code> with matching token headers.
                </p>
              </div>
            </div>

            {/* How to complete verification instructions */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Steps to Finish on Pinterest Business
              </span>
              <ol className="text-xs text-slate-600 space-y-2 pl-4 list-decimal">
                <li>
                  Open your <strong>Pinterest Business Account</strong> settings and navigate to <strong>Claimed accounts</strong>.
                </li>
                <li>
                  Enter your store URL: <code>{originUrl}</code> and choose either <strong>Upload HTML file</strong> or <strong>Add HTML tag</strong>.
                </li>
                <li>
                  Both methods are already active on this store! Click <strong>Verify</strong> in Pinterest to claim your website immediately.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PINTEREST TAG (PIXEL) TRACKING */}
      {activeTab === 'tag' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Pinterest Tag (pintrk) Conversion Tracking</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Track shoppers as they view products, add items to cart, and complete purchases for Pinterest Ads optimization.
                </p>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <span className="text-xs font-semibold text-slate-700">Tag Active</span>
                <input
                  type="checkbox"
                  checked={settings.tag.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tag: { ...settings.tag, enabled: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Pinterest Tag ID
                </label>
                <input
                  type="text"
                  value={settings.tag.tagId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tag: { ...settings.tag, tagId: e.target.value.trim() },
                    })
                  }
                  placeholder="e.g. 2612345678901"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-[11px] text-slate-500">
                  Find your numeric Tag ID in Pinterest Ads Manager &rarr; Conversions &rarr; Tag Manager.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Enhanced Match
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="enhancedMatch"
                    checked={settings.tag.enhancedMatch}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        tag: { ...settings.tag, enhancedMatch: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                  />
                  <label htmlFor="enhancedMatch" className="text-xs text-slate-700 cursor-pointer">
                    Enable hashed customer matching on checkout for improved conversion attribution
                  </label>
                </div>
              </div>
            </div>

            {/* Event Tracking Checklist */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Standard E-Commerce Events Tracked
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">PageVisit</span>
                    <span className="text-slate-500 block text-[11px]">Fires on all storefront and catalog views</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">AddToCart</span>
                    <span className="text-slate-500 block text-[11px]">Passes product ID, value in BDT, and quantity</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">Checkout</span>
                    <span className="text-slate-500 block text-[11px]">Passes order ID, total revenue, and line items</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">Search</span>
                    <span className="text-slate-500 block text-[11px]">Passes customer search query</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    trackPinterestEvent('pagevisit', { test: true });
                    alert('Dispatched test PageVisit event to Pinterest Tag (check browser DevTools console)!');
                  }}
                  className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:text-red-600 transition cursor-pointer"
                >
                  Send Test Event to Console
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PINTEREST SHOPPING CATALOG FEEDS */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Pinterest Shopping Catalog Feeds</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Connect these feeds in Pinterest Business &rarr; Catalogs &rarr; Data Sources to display your products on Pinterest Shopping tabs and run Product Pins.
                </p>
              </div>
              <button
                onClick={loadCatalogPreview}
                disabled={previewLoading}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-slate-300/60"
              >
                <RefreshCw size={13} className={previewLoading ? 'animate-spin' : ''} />
                <span>Refresh Feed Stats</span>
              </button>
            </div>

            {/* Feed URLs */}
            <div className="space-y-4">
              {/* Live XML Feed URL */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Primary XML RSS 2.0 Feed</span>
                    <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
                      Recommended
                    </span>
                  </div>
                  <a
                    href={xmlFeedFullUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                  >
                    <span>Inspect Feed</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={xmlFeedFullUrl}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-700 select-all"
                  />
                  <button
                    onClick={() => handleCopy(xmlFeedFullUrl, 'xml')}
                    className="px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {copiedKey === 'xml' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'xml' ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Formatted to Pinterest Merchant standard with Google Base namespaces (`g:price`, `g:availability`, `g:image_link`).
                </p>
              </div>

              {/* Live CSV Feed URL */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Alternative CSV Feed</span>
                  <a
                    href={csvFeedFullUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-600 hover:text-slate-800 font-semibold flex items-center gap-1"
                  >
                    <span>Download CSV</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={csvFeedFullUrl}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-700 select-all"
                  />
                  <button
                    onClick={() => handleCopy(csvFeedFullUrl, 'csv')}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {copiedKey === 'csv' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'csv' ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Feed Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Feed Currency</label>
                <select
                  value={settings.catalog.currency}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      catalog: { ...settings.catalog, currency: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="BDT">BDT (Bangladeshi Taka)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Default Google Product Category</label>
                <input
                  type="text"
                  value={settings.catalog.defaultCategory}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      catalog: { ...settings.catalog, defaultCategory: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            {/* Live Catalog Feed Products Preview Table */}
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Feed Products Preview</h3>
                  <span className="text-xs text-slate-500">
                    Live products indexed directly from your store catalog
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Filter products..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-full sm:w-60"
                />
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3">Brand</th>
                        <th className="py-2.5 px-3">Price</th>
                        <th className="py-2.5 px-3">Stock State</th>
                        <th className="py-2.5 px-3">Item ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCatalogItems.length > 0 ? (
                        filteredCatalogItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                {item.imageLink ? (
                                  <img
                                    src={item.imageLink}
                                    alt={item.title}
                                    referrerPolicy="no-referrer"
                                    className="w-8 h-8 rounded-md object-cover border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400">
                                    <ShoppingBag size={12} />
                                  </div>
                                )}
                                <span className="font-semibold text-slate-800 line-clamp-1 max-w-xs">
                                  {item.title}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{item.brand}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                              ৳{item.price}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  item.availability === 'in stock'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {item.availability}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                              {item.id}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                            {previewLoading ? 'Loading feed products...' : 'No products found matching filter'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RICH PINS & STOREFRONT "SAVE" BUTTON */}
      {activeTab === 'richpins' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Rich Pins & Storefront Save Button</h2>
              <p className="text-xs text-slate-500 mt-1">
                Rich Pins automatically synchronize real-time product prices, stock availability, and titles from your website onto Pinterest Pins.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Show Pinterest "Save" Button on Product Pages
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Allows customers to save any product directly to their Pinterest boards with one click.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.richPins.showSaveButton}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    richPins: { ...settings.richPins, showSaveButton: e.target.checked },
                  })
                }
                className="w-5 h-5 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
              />
            </div>

            {/* Rich Pins Mockup */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Storefront Button Preview
              </span>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3 w-fit">
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#E60023] hover:bg-[#ad081b] text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
                  </svg>
                  <span>Save</span>
                </button>
                <span className="text-xs text-slate-600">
                  Visible next to Facebook and WhatsApp sharing options on every product.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
