import React, { useState, useEffect, useMemo } from 'react';
import { 
  Share2, RefreshCw, Copy, Check, ExternalLink, Download, 
  AlertCircle, CheckCircle2, ShieldAlert, Sparkles, Layers, 
  HelpCircle, ChevronDown, ChevronUp, Search, Eye, Globe, 
  Key, Database, ArrowUpRight, Filter
} from 'lucide-react';
import { 
  metaCatalogService, 
  MetaCatalogItem, 
  MetaCatalogSummary, 
  MetaCatalogSettings,
  MetaConnectionTestResult,
  MetaSyncResult 
} from '../services/metaCatalogService';

export const AdminMetaCatalog: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data state
  const [products, setProducts] = useState<MetaCatalogItem[]>([]);
  const [summary, setSummary] = useState<MetaCatalogSummary | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [settings, setSettings] = useState<MetaCatalogSettings>({
    catalogId: '',
    hasAccessToken: false,
    pixelId: '1181966467366737',
    currency: 'BDT',
    domainUrl: 'https://koreanskinfood.web.app',
    defaultCategory: 'Health & Beauty > Personal Care > Cosmetics > Skin Care',
    lastSyncAt: null,
    lastSyncStatus: 'idle',
    lastSyncResult: null
  });

  // Form state
  const [catalogIdInput, setCatalogIdInput] = useState<string>('');
  const [accessTokenInput, setAccessTokenInput] = useState<string>('');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [pixelIdInput, setPixelIdInput] = useState<string>('1181966467366737');
  const [domainUrlInput, setDomainUrlInput] = useState<string>('https://koreanskinfood.web.app');
  const [currencyInput, setCurrencyInput] = useState<string>('BDT');

  // Action states
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<MetaConnectionTestResult | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<MetaSyncResult | null>(null);

  // Copy feedback states
  const [copiedType, setCopiedType] = useState<'xml' | 'csv' | null>(null);

  // Table filtering
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock' | 'issues'>('all');

  // Accordion guide state
  const [activeGuideStep, setActiveGuideStep] = useState<number | null>(null);

  // Fetch data
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await metaCatalogService.getPreview();
      setProducts(data.products || []);
      setSummary(data.summary || null);
      setBaseUrl(data.baseUrl || (typeof window !== 'undefined' ? window.location.origin : ''));
      if (data.settings) {
        setSettings(data.settings);
        setCatalogIdInput(data.settings.catalogId || '');
        setPixelIdInput(data.settings.pixelId || '1181966467366737');
        setDomainUrlInput(data.settings.domainUrl || data.baseUrl || '');
        setCurrencyInput(data.settings.currency || 'BDT');
      }
    } catch (err: any) {
      console.error('[AdminMetaCatalog] Load error:', err);
      setError(err.message || 'Failed to fetch Meta Catalog preview');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Stock/Issue Filter
      if (stockFilter === 'in_stock' && item.availability !== 'in stock') return false;
      if (stockFilter === 'out_of_stock' && item.availability !== 'out of stock') return false;
      if (stockFilter === 'issues' && item.hasValidImage && item.hasValidPrice) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.title.toLowerCase().includes(q);
        const matchesBrand = item.brand.toLowerCase().includes(q);
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesBarcode = item.barcode.toLowerCase().includes(q);
        return matchesName || matchesBrand || matchesId || matchesBarcode;
      }
      return true;
    });
  }, [products, stockFilter, searchQuery]);

  const copyToClipboard = (text: string, type: 'xml' | 'csv') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await metaCatalogService.saveSettings({
        catalogId: catalogIdInput,
        accessToken: accessTokenInput || undefined,
        pixelId: pixelIdInput,
        domainUrl: domainUrlInput,
        currency: currencyInput
      });
      setSuccessMessage(res.message || 'Meta Catalog settings saved successfully');
      setAccessTokenInput(''); // Clear plain text input once saved
      await loadData(true);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setError(null);
    setTestResult(null);
    try {
      const res = await metaCatalogService.testConnection({
        catalogId: catalogIdInput || undefined,
        accessToken: accessTokenInput || undefined
      });
      setTestResult(res);
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Meta Graph API connection failed');
      setTestResult({
        success: false,
        message: err.message,
        error: err.message
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleTriggerSync = async () => {
    if (!catalogIdInput) {
      setError('Please provide a Meta Catalog ID first in settings');
      return;
    }
    if (!settings.hasAccessToken && !accessTokenInput) {
      setError('Please provide a Meta System User Access Token first');
      return;
    }

    setIsSyncing(true);
    setError(null);
    setSyncResult(null);
    try {
      const res = await metaCatalogService.triggerBatchSync({
        catalogId: catalogIdInput || undefined,
        accessToken: accessTokenInput || undefined
      });
      setSyncResult(res);
      setSuccessMessage(res.message);
      await loadData(true);
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      setError(err.message || 'Meta Catalog synchronization failed');
      setSyncResult({
        success: false,
        status: 'error',
        message: err.message,
        error: err.message
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const effectiveBaseUrl = (settings.domainUrl && settings.domainUrl.trim())
    ? settings.domainUrl.trim().replace(/\/+$/, '')
    : (domainUrlInput && domainUrlInput.trim())
      ? domainUrlInput.trim().replace(/\/+$/, '')
      : 'https://koreanskinfood.web.app';
  const xmlFeedUrl = `${effectiveBaseUrl}/meta-catalog.xml`;
  const csvFeedUrl = `${effectiveBaseUrl}/meta-catalog.csv`;

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>Admin</span>
            <span>/</span>
            <span>Integrations</span>
            <span>/</span>
            <span className="text-rose-600 font-semibold">Meta Catalog</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Share2 className="w-6 h-6 text-rose-500" />
            Meta Catalog & Commerce Hub
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time dynamic product feeds and Meta Graph API batch synchronization for Facebook & Instagram Shops and Dynamic Product Ads.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => loadData(false)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh Catalog Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              if (products.length === 0) {
                setError("No products available to export.");
                return;
              }
              const csv = metaCatalogService.generateCsv(products);
              metaCatalogService.downloadBlob(csv, "meta-catalog.csv", "text/csv;charset=utf-8;");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
            title="Download Meta Catalog CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Pushing to Meta...' : 'Sync Catalog Now'}
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Operation Notice</p>
            <p className="text-rose-700 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800 text-xs font-medium">Dismiss</button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Success</p>
            <p className="text-emerald-700 mt-0.5">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800 text-xs font-medium">Dismiss</button>
        </div>
      )}

      {/* Catalog Health Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Total Products</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {summary ? summary.totalProducts : '...'}
          </div>
          <div className="text-xs text-slate-400 mt-1">Active in store catalog</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-emerald-600">In Stock in Feed</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums">
            {summary ? summary.inStockCount : '...'}
          </div>
          <div className="text-xs text-slate-400 mt-1">Flagged as &quot;in stock&quot;</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-amber-600">Out of Stock in Feed</div>
          <div className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">
            {summary ? summary.outOfStockCount : '...'}
          </div>
          <div className="text-xs text-slate-400 mt-1">Preserved with pause flag</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-700">Ready for Meta</div>
          <div className="text-2xl font-bold text-rose-600 mt-1 tabular-nums">
            {summary ? `${summary.healthPercentage}%` : '...'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {summary ? `${summary.readyForMetaCount} of ${summary.totalProducts} verified` : 'Validating...'}
          </div>
        </div>
      </div>

      {/* 2-Column Split: Feed URLs on Left & Graph API Connection on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Scheduled Data Feed URLs (Recommended by Meta Commerce Manager) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Scheduled Data Feed URLs</h3>
                <p className="text-xs text-slate-500">Auto-fetched by Meta Commerce Manager on hourly or daily schedule</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold tracking-wide text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
              Live &amp; Dynamic
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Meta Commerce Manager can pull your products automatically using either feed URL. When products are updated or inventory drops to 0, the feed updates in real-time.
          </p>

          {/* XML Feed URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span className="flex items-center gap-1.5 font-semibold">
                XML RSS Feed (Meta &amp; Google Merchant format)
              </span>
              <a
                href={xmlFeedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 text-[11px]"
              >
                Inspect XML <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 truncate select-all">
                {xmlFeedUrl}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (products.length === 0) {
                    setError("No products available to export.");
                    return;
                  }
                  const xml = metaCatalogService.generateXml(products, effectiveBaseUrl);
                  metaCatalogService.downloadBlob(xml, "meta-catalog.xml", "application/xml;charset=utf-8;");
                }}
                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-sm"
                title="Download XML Feed"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Download
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(xmlFeedUrl, 'xml')}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedType === 'xml' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy URL
                  </>
                )}
              </button>
            </div>
          </div>

          {/* CSV Feed URL */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span className="flex items-center gap-1.5 font-semibold">
                CSV Data Feed (Commerce Manager Data Feed)
              </span>
              <a
                href={csvFeedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 text-[11px]"
              >
                View CSV <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 truncate select-all">
                {csvFeedUrl}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (products.length === 0) {
                    setError("No products available to export.");
                    return;
                  }
                  const csv = metaCatalogService.generateCsv(products);
                  metaCatalogService.downloadBlob(csv, "meta-catalog.csv", "text/csv;charset=utf-8;");
                }}
                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-sm"
                title="Download CSV Feed"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Download
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(csvFeedUrl, 'csv')}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedType === 'csv' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy URL
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              How Meta Uses This Feed:
            </div>
            <p className="text-amber-800 leading-normal">
              In Meta Commerce Manager, go to <strong>Catalogs &gt; Data Sources &gt; Add Items &gt; Data feed &gt; Scheduled feed</strong>. Paste the XML feed URL and set refresh to <strong>Hourly</strong> or <strong>Daily</strong>.
            </p>
          </div>
        </div>

        {/* Right Column: Meta Graph API Direct Sync Settings */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Meta Graph API Direct Sync</h3>
                <p className="text-xs text-slate-500">Push instant catalog item batches directly to Meta servers</p>
              </div>
            </div>
            {settings.hasAccessToken && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                <Check className="w-3 h-3" /> Token Active
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meta Catalog ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 102938475620192"
                  value={catalogIdInput}
                  onChange={(e) => setCatalogIdInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meta Pixel ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1181966467366737"
                  value={pixelIdInput}
                  onChange={(e) => setPixelIdInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Meta System User Access Token
                </label>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-[11px] text-slate-500 hover:text-slate-800"
                >
                  {showToken ? 'Hide Token' : 'Show Token'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder={settings.hasAccessToken ? '•••••••••••••••••••••••• (Leave blank to keep current)' : 'Paste EAAG... System User Access Token with catalog_management'}
                  value={accessTokenInput}
                  onChange={(e) => setAccessTokenInput(e.target.value)}
                  className="w-full px-3 py-2 pr-10 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
                />
                <Key className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Generated in Meta Business Settings &gt; System Users &gt; Generate Token with <code>catalog_management</code> permission.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Store Domain Base URL
                </label>
                <input
                  type="text"
                  placeholder="https://koreanskinfood.com"
                  value={domainUrlInput}
                  onChange={(e) => setDomainUrlInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catalog Currency
                </label>
                <select
                  value={currencyInput}
                  onChange={(e) => setCurrencyInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
                >
                  <option value="BDT">BDT (Bangladeshi Taka)</option>
                  <option value="USD">USD (US Dollar)</option>
                </select>
              </div>
            </div>

            {/* Test Connection Results Badge */}
            {testResult && (
              <div className={`p-3 rounded-xl border text-xs ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                <div className="font-semibold flex items-center gap-1.5">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                  {testResult.success ? 'Connection Verified' : 'Connection Failed'}
                </div>
                {testResult.catalog && (
                  <div className="mt-1.5 space-y-0.5 text-[11px] text-emerald-800">
                    <div><strong>Catalog Name:</strong> {testResult.catalog.name}</div>
                    <div><strong>Catalog ID:</strong> {testResult.catalog.id}</div>
                    <div><strong>Live Products in Meta:</strong> <span className="tabular-nums font-semibold">{testResult.catalog.productCount}</span></div>
                    {testResult.catalog.business && <div><strong>Business:</strong> {testResult.catalog.business}</div>}
                  </div>
                )}
                {!testResult.success && testResult.error && (
                  <p className="mt-1 text-rose-700">{testResult.error}</p>
                )}
              </div>
            )}

            {/* Sync Progress / Last Result */}
            {syncResult && (
              <div className={`p-3 rounded-xl border text-xs ${syncResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                <div className="font-semibold flex items-center gap-1.5">
                  {syncResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-amber-600" />}
                  {syncResult.message}
                </div>
                {syncResult.result?.syncLogs && syncResult.result.syncLogs.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto text-[11px] font-mono bg-white/70 p-2 rounded border border-slate-200">
                    {syncResult.result.syncLogs.map((log, i) => (
                      <div key={i} className="text-slate-700">{log}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Last Sync Timestamp */}
            {settings.lastSyncAt && !syncResult && (
              <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
                <span>Last Graph API Sync:</span>
                <span className="font-mono tabular-nums text-slate-700 font-medium">
                  {new Date(settings.lastSyncAt).toLocaleString()} ({settings.lastSyncStatus})
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Product Catalog Diagnostic & Live Table Preview */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-500" />
              Meta Feed Items Preview &amp; Verification
            </h3>
            <p className="text-xs text-slate-500">
              Live mapping of store items into Meta Commerce Manager standard fields.
            </p>
          </div>

          {/* Controls: Search and Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search products, brands, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 w-52"
              />
            </div>

            {/* Segmented Filter Controls (Interactive Buttons) */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setStockFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${stockFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                All ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('in_stock')}
                className={`px-2.5 py-1 rounded-md transition-colors ${stockFilter === 'in_stock' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                In Stock ({products.filter(p => p.availability === 'in stock').length})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('out_of_stock')}
                className={`px-2.5 py-1 rounded-md transition-colors ${stockFilter === 'out_of_stock' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Out of Stock ({products.filter(p => p.availability === 'out of stock').length})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('issues')}
                className={`px-2.5 py-1 rounded-md transition-colors ${stockFilter === 'issues' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Issues ({products.filter(p => !p.hasValidImage || !p.hasValidPrice).length})
              </button>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Item / Image</th>
                <th className="py-2.5 px-3">Product Name &amp; Brand</th>
                <th className="py-2.5 px-3 text-right">Price (BDT)</th>
                <th className="py-2.5 px-3 text-center">Availability</th>
                <th className="py-2.5 px-3 text-right">Stock</th>
                <th className="py-2.5 px-3">Google / FB Category</th>
                <th className="py-2.5 px-3 text-center">Meta Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading Meta Catalog items...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No products matching your search or filter.
                  </td>
                </tr>
              ) : (
                filteredProducts.slice(0, 50).map((prod) => (
                  <tr key={prod.id} className="hover:bg-rose-50/30 transition-colors">
                    {/* Image & ID */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {prod.imageLink ? (
                            <img
                              src={prod.imageLink}
                              alt={prod.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">No Img</span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 truncate max-w-[120px]" title={prod.id}>
                          {prod.id}
                        </div>
                      </div>
                    </td>

                    {/* Title & Brand */}
                    <td className="py-2 px-3 max-w-xs">
                      <div className="font-medium text-slate-900 truncate" title={prod.title}>
                        {prod.title}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-slate-700">{prod.brand}</span>
                        {prod.barcode && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-slate-400">GTIN: {prod.barcode}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-2 px-3 text-right whitespace-nowrap tabular-nums">
                      {prod.salePrice !== null ? (
                        <div>
                          <div className="font-bold text-rose-600">
                            ৳{prod.salePrice.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400 line-through">
                            ৳{prod.price.toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <div className="font-bold text-slate-900">
                          ৳{prod.price.toLocaleString()}
                        </div>
                      )}
                    </td>

                    {/* Availability */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span className={`inline-block font-medium text-[11px] ${prod.availability === 'in stock' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {prod.availability === 'in stock' ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>

                    {/* Stock Qty */}
                    <td className="py-2 px-3 text-right whitespace-nowrap tabular-nums font-mono">
                      {prod.inventory}
                    </td>

                    {/* Category */}
                    <td className="py-2 px-3 text-slate-600 max-w-xs truncate" title={prod.googleProductCategory}>
                      {prod.googleProductCategory.split('>').pop()?.trim() || prod.googleProductCategory}
                    </td>

                    {/* Meta Validation Status */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      {prod.hasValidImage && prod.hasValidPrice ? (
                        <span className="text-emerald-600 font-semibold text-[11px] inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold text-[11px] inline-flex items-center gap-1" title={!prod.hasValidImage ? 'Missing image' : 'Invalid price'}>
                          <AlertCircle className="w-3.5 h-3.5" /> Needs Fix
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredProducts.length > 50 && (
          <div className="text-center text-xs text-slate-500 pt-1">
            Showing first 50 of {filteredProducts.length} filtered products. All {products.length} products are included in the live feed.
          </div>
        )}
      </div>

      {/* Step-by-Step Meta Setup Guide (Interactive Accordion) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-rose-500" />
          How to Connect This Feed in Meta Commerce Manager
        </h3>
        <p className="text-xs text-slate-500">
          Follow these 4 simple steps to connect your Facebook Page, Instagram Shop, and Ad Catalog with this dynamic feed.
        </p>

        <div className="space-y-2.5 pt-2">
          {/* Step 1 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveGuideStep(activeGuideStep === 1 ? null : 1)}
              className="w-full flex items-center justify-between p-3.5 text-left bg-slate-50/70 hover:bg-slate-50 transition-colors"
            >
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] flex items-center justify-center font-bold">1</span>
                Open Meta Commerce Manager &amp; Select Your Catalog
              </span>
              {activeGuideStep === 1 ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {activeGuideStep === 1 && (
              <div className="p-4 bg-white text-xs text-slate-600 space-y-2 border-t border-slate-200 leading-relaxed">
                <p>
                  1. Visit <a href="https://business.facebook.com/commerce" target="_blank" rel="noreferrer" className="text-rose-600 underline font-medium">Meta Commerce Manager (business.facebook.com/commerce)</a>.
                </p>
                <p>
                  2. Select your business portfolio and choose your existing Catalog, or click <strong>&quot;Add Catalog&quot;</strong> and select <strong>&quot;E-commerce (Products)&quot;</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Step 2 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveGuideStep(activeGuideStep === 2 ? null : 2)}
              className="w-full flex items-center justify-between p-3.5 text-left bg-slate-50/70 hover:bg-slate-50 transition-colors"
            >
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] flex items-center justify-center font-bold">2</span>
                Add Data Source via Scheduled Feed (Paste XML URL)
              </span>
              {activeGuideStep === 2 ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {activeGuideStep === 2 && (
              <div className="p-4 bg-white text-xs text-slate-600 space-y-2 border-t border-slate-200 leading-relaxed">
                <p>
                  1. In the left menu of Commerce Manager, click <strong>Catalog &gt; Data Sources</strong>.
                </p>
                <p>
                  2. Click <strong>&quot;Add Items&quot;</strong> and select <strong>&quot;Data feed&quot;</strong>.
                </p>
                <p>
                  3. When asked how to upload, choose <strong>&quot;Scheduled feed&quot;</strong>.
                </p>
                <p>
                  4. Paste your XML feed URL from above: <code>{xmlFeedUrl}</code>
                </p>
                <p>
                  5. Leave username and password blank (feed is publicly accessible by Facebook crawler).
                </p>
              </div>
            )}
          </div>

          {/* Step 3 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveGuideStep(activeGuideStep === 3 ? null : 3)}
              className="w-full flex items-center justify-between p-3.5 text-left bg-slate-50/70 hover:bg-slate-50 transition-colors"
            >
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] flex items-center justify-center font-bold">3</span>
                Set Automatic Sync Schedule (Hourly / Daily)
              </span>
              {activeGuideStep === 3 ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {activeGuideStep === 3 && (
              <div className="p-4 bg-white text-xs text-slate-600 space-y-2 border-t border-slate-200 leading-relaxed">
                <p>
                  1. Choose <strong>Hourly</strong> or <strong>Daily</strong> schedule so Meta automatically pulls the latest prices and in-stock quantities.
                </p>
                <p>
                  2. Select default currency as <strong>BDT</strong> (Bangladeshi Taka).
                </p>
                <p>
                  3. Click <strong>&quot;Start Upload&quot;</strong>. Meta will process your products in 1–2 minutes!
                </p>
              </div>
            )}
          </div>

          {/* Step 4 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveGuideStep(activeGuideStep === 4 ? null : 4)}
              className="w-full flex items-center justify-between p-3.5 text-left bg-slate-50/70 hover:bg-slate-50 transition-colors"
            >
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] flex items-center justify-center font-bold">4</span>
                (Optional) Instant Real-Time Push via Meta Graph API
              </span>
              {activeGuideStep === 4 ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            {activeGuideStep === 4 && (
              <div className="p-4 bg-white text-xs text-slate-600 space-y-2 border-t border-slate-200 leading-relaxed">
                <p>
                  If you want to trigger instant updates without waiting for Meta&#39;s hourly schedule:
                </p>
                <p>
                  1. Go to Meta Business Settings &gt; Users &gt; System Users &gt; Create or select an Admin System User.
                </p>
                <p>
                  2. Click &quot;Generate New Token&quot;, select your Business app, and tick the <strong><code>catalog_management</code></strong> permission.
                </p>
                <p>
                  3. Paste the generated Access Token and your Catalog ID into the &quot;Meta Graph API Direct Sync&quot; form on this page and click &quot;Save Settings&quot;.
                </p>
                <p>
                  4. Now you can click <strong>&quot;Sync Catalog Now&quot;</strong> anytime to push immediate updates!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
