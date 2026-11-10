import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  Play, 
  Copy, 
  Check, 
  Terminal, 
  ShieldCheck, 
  Zap, 
  Database, 
  Eye, 
  EyeOff,
  ShoppingCart, 
  ShoppingBag, 
  Sparkles,
  Info,
  X,
  Sliders,
  Save,
  Lock,
  Globe,
  CheckCheck
} from 'lucide-react';
import { analytics } from '../services/analyticsService';
import { 
  trackingSettingsService, 
  TrackingSettings, 
  validateGtmId, 
  validateGa4Id, 
  validatePixelId 
} from '../services/trackingSettingsService';

interface DiagnosticState {
  ga4: {
    id: string;
    enabled: boolean;
    isConfigured: boolean;
    source: string;
    loaded: boolean;
    scriptFound: boolean;
  };
  gtm: {
    id: string;
    enabled: boolean;
    loaded: boolean;
    isDataLayerActive: boolean;
    dataLayerLength: number;
    scriptFound: boolean;
    noscriptFound: boolean;
  };
  metaPixel: {
    id: string;
    enabled: boolean;
    source: string;
    loaded: boolean;
    scriptFound: boolean;
  };
  metaCapi: {
    enabled: boolean;
    testEventCode: string;
    hasToken: boolean;
  };
  environment: {
    isDev: boolean;
    origin: string;
    dispatchedEventsCount: number;
  };
}

interface CapiStatus {
  pixelId: string;
  hasToken: boolean;
  testEventCode?: string;
  enabled: boolean;
  status: string;
  checking: boolean;
}

interface DispatchedEventLog {
  id: string;
  eventType: string;
  eventId: string;
  timestamp: string;
  destinations: string[];
  payload: any;
  status: 'dispatched' | 'failed';
}

export const AdminAnalyticsHealth: React.FC = () => {
  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<DiagnosticState | null>(null);
  const [capiStatus, setCapiStatus] = useState<CapiStatus>({
    pixelId: '1181966473667367',
    hasToken: false,
    enabled: true,
    status: 'checking',
    checking: true,
  });

  // Settings State for Editing
  const [settings, setSettings] = useState<TrackingSettings>(() => trackingSettingsService.getCurrentSettings());
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);
  const [showToken, setShowToken] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Field validation states
  const [gtmError, setGtmError] = useState<string | null>(null);
  const [ga4Error, setGa4Error] = useState<string | null>(null);
  const [pixelError, setPixelError] = useState<string | null>(null);

  // Simulation & Logs
  const [testEventCode, setTestEventCode] = useState<string>('');
  const [eventLogs, setEventLogs] = useState<DispatchedEventLog[]>([]);
  const [isSimulating, setIsSimulating] = useState<string | null>(null);
  const [selectedLogForModal, setSelectedLogForModal] = useState<DispatchedEventLog | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  // Probe diagnostics from browser environment
  const runHealthCheck = useCallback(() => {
    try {
      const state = analytics.getHealthStatus();
      setDiagnostics(state as any);
      setLastCheckTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    } catch (e) {
      console.error('[Analytics Health] Diagnostics failed:', e);
    }
  }, []);

  // Probe server CAPI connectivity
  const checkCapiServer = useCallback(async () => {
    setCapiStatus(prev => ({ ...prev, checking: true }));
    try {
      const res = await fetch('/api/tracking/meta-capi/status');
      if (res.ok) {
        const data = await res.json();
        setCapiStatus({
          pixelId: data.pixelId || '1181966473667367',
          hasToken: Boolean(data.hasToken),
          testEventCode: data.testEventCode || '',
          enabled: data.enabled ?? true,
          status: !data.enabled ? 'disabled' : data.hasToken ? 'connected' : 'ready_for_credentials',
          checking: false,
        });
        if (data.testEventCode && !testEventCode) {
          setTestEventCode(data.testEventCode);
        }
      } else {
        setCapiStatus(prev => ({ ...prev, status: 'endpoint_ready', checking: false }));
      }
    } catch {
      setCapiStatus(prev => ({ ...prev, status: 'endpoint_ready', checking: false }));
    }
  }, [testEventCode]);

  // Initial load and real-time subscription to tracking settings
  useEffect(() => {
    const unsub = trackingSettingsService.subscribe((latest) => {
      setSettings(latest);
      if (latest.metaCapi.testEventCode && !testEventCode) {
        setTestEventCode(latest.metaCapi.testEventCode);
      }
    });

    runHealthCheck();
    checkCapiServer();

    // Auto-refresh diagnostics every 10 seconds while on this tab
    const interval = setInterval(() => {
      runHealthCheck();
    }, 10000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [runHealthCheck, checkCapiServer, testEventCode]);

  // Validate fields in real time
  const handleGtmChange = (val: string) => {
    const uppercase = val.toUpperCase().trim();
    setSettings(prev => ({ ...prev, gtm: { ...prev.gtm, containerId: uppercase } }));
    const v = validateGtmId(uppercase);
    setGtmError(v.isValid ? null : (v.message || 'Invalid format'));
  };

  const handleGa4Change = (val: string) => {
    const uppercase = val.toUpperCase().trim();
    setSettings(prev => ({ ...prev, ga4: { ...prev.ga4, measurementId: uppercase } }));
    const v = validateGa4Id(uppercase);
    setGa4Error(v.isValid ? null : (v.message || 'Invalid format'));
  };

  const handlePixelChange = (val: string) => {
    const cleaned = val.trim();
    setSettings(prev => ({ ...prev, metaPixel: { ...prev.metaPixel, pixelId: cleaned } }));
    const v = validatePixelId(cleaned);
    setPixelError(v.isValid ? null : (v.message || 'Invalid format'));
  };

  // Save Settings to Firestore & Server
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);

    // Validate active fields
    if (settings.gtm.enabled) {
      const gtmValidation = validateGtmId(settings.gtm.containerId);
      if (!gtmValidation.isValid) {
        setGtmError(gtmValidation.message || 'Invalid GTM ID');
        setIsSaving(false);
        return;
      }
    }

    if (settings.ga4.enabled) {
      const ga4Validation = validateGa4Id(settings.ga4.measurementId);
      if (!ga4Validation.isValid) {
        setGa4Error(ga4Validation.message || 'Invalid GA4 ID');
        setIsSaving(false);
        return;
      }
    }

    if (settings.metaPixel.enabled) {
      const pixelValidation = validatePixelId(settings.metaPixel.pixelId);
      if (!pixelValidation.isValid) {
        setPixelError(pixelValidation.message || 'Invalid Pixel ID');
        setIsSaving(false);
        return;
      }
    }

    try {
      const updated = await trackingSettingsService.saveSettings(settings);
      analytics.applySettingsUpdate(updated);
      runHealthCheck();
      await checkCapiServer();

      setSaveSuccessMessage('Tracking configuration successfully saved to Firestore and applied live across your entire website.');
      setTimeout(() => setSaveSuccessMessage(null), 6000);
    } catch (err: any) {
      console.error('[Analytics Health] Save error:', err);
      setSaveErrorMessage(err?.message || 'Failed to persist tracking settings to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler for running test simulations
  const handleSimulateEvent = async (type: 'page_view' | 'view_item' | 'add_to_cart' | 'purchase') => {
    setIsSimulating(type);
    try {
      const result = await analytics.sendTestSimulation(type, {
        testEventCode: testEventCode.trim() || undefined
      });

      const newLog: DispatchedEventLog = {
        id: `log_${Date.now()}`,
        eventType: result.eventType,
        eventId: result.eventId,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        destinations: result.destinations,
        payload: result.payload,
        status: result.success ? 'dispatched' : 'failed'
      };

      setEventLogs(prev => [newLog, ...prev.slice(0, 49)]);
      runHealthCheck();
    } catch (err: any) {
      console.error('[Analytics Health] Simulation error:', err);
    } finally {
      setIsSimulating(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isAdblockerSuspected = 
    diagnostics && 
    ((!diagnostics.ga4.loaded && !diagnostics.ga4.scriptFound) || 
     (!diagnostics.metaPixel.loaded && !diagnostics.metaPixel.scriptFound));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Admin</span>
            <span aria-hidden="true">/</span>
            <span>Integrations</span>
            <span aria-hidden="true">/</span>
            <span className="text-slate-900 dark:text-slate-200 font-medium">Analytics & Tracking Health</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-pink-600" />
            Analytics & Tracking Health Center
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Configure dynamic tracking IDs, verify connection status, inspect real-time dataLayer payloads, and simulate events across Google Tag Manager, GA4, Meta Pixel, and Server CAPI.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showSettingsDrawer ? 'Hide Settings' : 'Configure Tracking'}</span>
          </button>

          <button
            onClick={() => {
              runHealthCheck();
              checkCapiServer();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            title="Refresh status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <a
            href="https://tagmanager.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <span>GTM</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <span>GA4</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <a
            href="https://business.facebook.com/events_manager2"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#1877F2] rounded-lg hover:bg-[#166fe5] transition-colors shadow-sm"
          >
            <span>Meta Events</span>
            <ExternalLink className="w-3 h-3 text-blue-200" />
          </a>
        </div>
      </div>

      {/* Dynamic Save Notification Banner */}
      {saveSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
            <p className="font-semibold">{saveSuccessMessage}</p>
            <p className="text-emerald-700 dark:text-emerald-400">
              All storefront product pages, cart operations, checkout flows, and backend CAPI dispatchers are immediately using these updated settings.
            </p>
          </div>
        </div>
      )}

      {saveErrorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-3 animate-fade-in">
          <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
            <p className="font-semibold">Unable to save tracking configuration</p>
            <p className="text-rose-700 dark:text-rose-400">{saveErrorMessage}</p>
          </div>
        </div>
      )}

      {/* Adblocker or Privacy Shield Notice */}
      {isAdblockerSuspected && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Browser AdBlocker or Tracking Shield Detected
            </p>
            <p>
              Your browser extension (e.g. uBlock Origin, Brave Shield, or AdGuard) may be blocking outgoing tracking requests in this browser tab. Real website visitors without adblockers will be tracked normally. Temporarily pause your blocker if you want to test live outgoing browser pings on this device.
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Tracking Settings Editor Form */}
      {showSettingsDrawer && (
        <div className="bg-white dark:bg-slate-900 border border-pink-200 dark:border-pink-900/60 rounded-xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-pink-600" />
                Live Tracking Configuration Studio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Modifying and saving these credentials updates Firestore instantly. Changes take effect across all storefront sessions without requiring a rebuild or redeployment.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">
                Updated: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleTimeString() : 'Never'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Google Tag Manager (GTM) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <label className="text-sm font-bold text-slate-900 dark:text-white">
                      Google Tag Manager (GTM)
                    </label>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.gtm.enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, gtm: { ...prev.gtm, enabled: e.target.checked } }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Container ID:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GTM-T2SWSLZ8"
                    value={settings.gtm.containerId}
                    onChange={(e) => handleGtmChange(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono uppercase bg-white dark:bg-slate-800 border ${gtmError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'} rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-500`}
                  />
                  {gtmError && <p className="text-[11px] text-rose-500 mt-1">{gtmError}</p>}
                  <p className="text-[11px] text-slate-500 mt-1">
                    Primary container mounted globally in HTML &lt;head&gt; and noscript.
                  </p>
                </div>
              </div>

              {/* 2. Google Analytics 4 (GA4) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <label className="text-sm font-bold text-slate-900 dark:text-white">
                      Google Analytics 4 (GA4)
                    </label>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.ga4.enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, ga4: { ...prev.ga4, enabled: e.target.checked } }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Measurement ID:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. G-8DXKFYM3YQ"
                    value={settings.ga4.measurementId}
                    onChange={(e) => handleGa4Change(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono uppercase bg-white dark:bg-slate-800 border ${ga4Error ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'} rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-500`}
                  />
                  {ga4Error && <p className="text-[11px] text-rose-500 mt-1">{ga4Error}</p>}
                  <p className="text-[11px] text-slate-500 mt-1">
                    Collects route transitions, product views, and e-commerce conversions in BDT.
                  </p>
                </div>
              </div>

              {/* 3. Meta Pixel */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <label className="text-sm font-bold text-slate-900 dark:text-white">
                      Meta Browser Pixel
                    </label>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.metaPixel.enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, metaPixel: { ...prev.metaPixel, enabled: e.target.checked } }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Pixel ID:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1181966473667367"
                    value={settings.metaPixel.pixelId}
                    onChange={(e) => handlePixelChange(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border ${pixelError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'} rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-500`}
                  />
                  {pixelError && <p className="text-[11px] text-rose-500 mt-1">{pixelError}</p>}
                  <p className="text-[11px] text-slate-500 mt-1">
                    15–16 digit Facebook Dataset / Pixel ID for browser event reporting.
                  </p>
                </div>
              </div>

              {/* 4. Meta Conversions API (CAPI) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-600" />
                    <label className="text-sm font-bold text-slate-900 dark:text-white">
                      Meta Conversions API (Server CAPI)
                    </label>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.metaCapi.enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, metaCapi: { ...prev.metaCapi, enabled: e.target.checked } }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        System User Access Token:
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="text-[11px] text-pink-600 hover:text-pink-700 flex items-center gap-1 font-medium"
                      >
                        {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showToken ? 'Hide Token' : 'Show Token'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        placeholder="EAAG... (Generated from Meta Events Manager Settings)"
                        value={settings.metaCapi.accessToken || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, metaCapi: { ...prev.metaCapi, accessToken: e.target.value } }))}
                        className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-500 pr-8"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Meta Test Event Code (Optional for Testing):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TEST12345"
                      value={settings.metaCapi.testEventCode || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, metaCapi: { ...prev.metaCapi, testEventCode: e.target.value.toUpperCase() } }))}
                      className="w-full px-3 py-2 text-xs font-mono uppercase bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowSettingsDrawer(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSaving ? 'Saving to Database...' : 'Save & Apply Live to Website'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Primary Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Google Tag Manager (GTM) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tag Manager (GTM)</span>
            {!settings.gtm.enabled ? (
              <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                <XCircle className="w-3.5 h-3.5" /> Disabled
              </span>
            ) : diagnostics?.gtm.isDataLayerActive ? (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                <XCircle className="w-3.5 h-3.5" /> Standby
              </span>
            )}
          </div>

          <div>
            <div className="text-xs text-slate-500">Container ID</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                {diagnostics?.gtm.id || settings.gtm.containerId}
              </span>
              <button
                onClick={() => copyToClipboard(diagnostics?.gtm.id || settings.gtm.containerId, 'gtm-id')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                title="Copy Container ID"
              >
                {copiedId === 'gtm-id' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>dataLayer Items:</span>
              <span className="font-mono text-slate-900 dark:text-slate-200 tabular-nums">
                {diagnostics?.gtm.dataLayerLength || 0} events
              </span>
            </div>
            <div className="flex justify-between">
              <span>Script in &lt;head&gt;:</span>
              <span className={`font-mono ${diagnostics?.gtm.scriptFound ? 'text-emerald-600' : 'text-slate-400'}`}>
                {diagnostics?.gtm.scriptFound ? 'Present' : 'Not Found'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Noscript in &lt;body&gt;:</span>
              <span className={`font-mono ${diagnostics?.gtm.noscriptFound ? 'text-emerald-600' : 'text-slate-400'}`}>
                {diagnostics?.gtm.noscriptFound ? 'Present' : 'Not Found'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Google Analytics 4 (GA4) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Google Analytics 4</span>
            {!settings.ga4.enabled ? (
              <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                <XCircle className="w-3.5 h-3.5" /> Disabled
              </span>
            ) : diagnostics?.ga4.loaded ? (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" /> Standby
              </span>
            )}
          </div>

          <div>
            <div className="text-xs text-slate-500">Measurement ID</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                {diagnostics?.ga4.id || settings.ga4.measurementId}
              </span>
              <button
                onClick={() => copyToClipboard(diagnostics?.ga4.id || settings.ga4.measurementId, 'ga4-id')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                title="Copy Measurement ID"
              >
                {copiedId === 'ga4-id' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>gtag.js runtime:</span>
              <span className="font-mono text-slate-900 dark:text-slate-200">
                {diagnostics?.ga4.loaded ? 'Active' : 'Standby'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>SPA PageView:</span>
              <span className="font-mono text-emerald-600">Enabled</span>
            </div>
            <div className="flex justify-between">
              <span>Currency:</span>
              <span className="font-mono text-slate-900 dark:text-slate-200">BDT (৳)</span>
            </div>
          </div>
        </div>

        {/* 3. Meta Pixel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meta Pixel</span>
            {!settings.metaPixel.enabled ? (
              <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                <XCircle className="w-3.5 h-3.5" /> Disabled
              </span>
            ) : diagnostics?.metaPixel.loaded ? (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Initialized
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" /> Standby
              </span>
            )}
          </div>

          <div>
            <div className="text-xs text-slate-500">Pixel ID</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                {diagnostics?.metaPixel.id || settings.metaPixel.pixelId}
              </span>
              <button
                onClick={() => copyToClipboard(diagnostics?.metaPixel.id || settings.metaPixel.pixelId, 'pixel-id')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                title="Copy Pixel ID"
              >
                {copiedId === 'pixel-id' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>fbq.js version:</span>
              <span className="font-mono text-slate-900 dark:text-slate-200">2.0</span>
            </div>
            <div className="flex justify-between">
              <span>Deduplication:</span>
              <span className="font-mono text-emerald-600">eventID Sync</span>
            </div>
            <div className="flex justify-between">
              <span>Advanced Match:</span>
              <span className="font-mono text-emerald-600">SHA-256</span>
            </div>
          </div>
        </div>

        {/* 4. Meta Conversions API (CAPI) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Server CAPI</span>
            {!capiStatus.enabled ? (
              <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                <XCircle className="w-3.5 h-3.5" /> Disabled
              </span>
            ) : capiStatus.hasToken ? (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Live Ready
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400">
                <Zap className="w-3.5 h-3.5" /> Token Needed
              </span>
            )}
          </div>

          <div>
            <div className="text-xs text-slate-500">Dispatch Route</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-bold font-mono text-slate-900 dark:text-white truncate">
                /api/tracking/meta-capi
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Graph API:</span>
              <span className="font-mono text-slate-900 dark:text-slate-200">v19.0</span>
            </div>
            <div className="flex justify-between">
              <span>Deduplication:</span>
              <span className="font-mono text-emerald-600">Enforced</span>
            </div>
            <div className="flex justify-between">
              <span>Server Token:</span>
              <span className={`font-mono ${capiStatus.hasToken ? 'text-emerald-600' : 'text-slate-500'}`}>
                {capiStatus.hasToken ? 'Configured' : 'Needs Token'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Live Event Simulator */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-pink-600" />
              Live Event Dispatch Simulator
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Trigger real events directly into your browser's dataLayer, Google Tag Manager, GA4, and Meta Pixel to confirm end-to-end receipt.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Meta Test Code:</label>
            <input
              type="text"
              placeholder="e.g. TEST12345"
              value={testEventCode}
              onChange={(e) => setTestEventCode(e.target.value.toUpperCase())}
              className="px-3 py-1.5 text-xs font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-500 w-36"
            />
          </div>
        </div>

        {/* Action Trigger Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* 1. PageView */}
          <button
            onClick={() => handleSimulateEvent('page_view')}
            disabled={isSimulating !== null}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-pink-50 dark:hover:bg-pink-950/20 hover:border-pink-300 dark:hover:border-pink-800 transition-all text-center group disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Simulate PageView</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">page_view event</span>
            {isSimulating === 'page_view' && (
              <span className="text-[10px] text-pink-600 font-medium mt-1 animate-pulse">Dispatching...</span>
            )}
          </button>

          {/* 2. ViewItem */}
          <button
            onClick={() => handleSimulateEvent('view_item')}
            disabled={isSimulating !== null}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-pink-50 dark:hover:bg-pink-950/20 hover:border-pink-300 dark:hover:border-pink-800 transition-all text-center group disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Simulate ViewItem</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">view_item / ViewContent</span>
            {isSimulating === 'view_item' && (
              <span className="text-[10px] text-blue-600 font-medium mt-1 animate-pulse">Dispatching...</span>
            )}
          </button>

          {/* 3. AddToCart */}
          <button
            onClick={() => handleSimulateEvent('add_to_cart')}
            disabled={isSimulating !== null}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-pink-50 dark:hover:bg-pink-950/20 hover:border-pink-300 dark:hover:border-pink-800 transition-all text-center group disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Simulate AddToCart</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">add_to_cart (৳1,650)</span>
            {isSimulating === 'add_to_cart' && (
              <span className="text-[10px] text-purple-600 font-medium mt-1 animate-pulse">Dispatching...</span>
            )}
          </button>

          {/* 4. Purchase */}
          <button
            onClick={() => handleSimulateEvent('purchase')}
            disabled={isSimulating !== null}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all text-center group disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Simulate Purchase</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">purchase (৳1,730 + CAPI)</span>
            {isSimulating === 'purchase' && (
              <span className="text-[10px] text-emerald-600 font-medium mt-1 animate-pulse">Dispatching...</span>
            )}
          </button>
        </div>
      </div>

      {/* Live Dispatched Event Stream Log */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Live Session Dispatch Stream
            </h3>
            <span className="text-xs text-slate-500">
              · {eventLogs.length} events logged
            </span>
          </div>

          {eventLogs.length > 0 && (
            <button
              onClick={() => setEventLogs([])}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Clear Log
            </button>
          )}
        </div>

        {eventLogs.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Zap className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No simulated events dispatched in this session yet
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click any of the test buttons above to fire a live tracking event and inspect its exact payload here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Targets</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {eventLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {log.eventType}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                      {log.eventId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {log.destinations.map((dest, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded"
                          >
                            {dest}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLogForModal(log)}
                        className="text-xs text-pink-600 hover:text-pink-700 dark:text-pink-400 font-medium hover:underline"
                      >
                        Inspect Payload
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Helpful Technical Reference & Instructions */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs text-slate-600 dark:text-slate-400 space-y-3">
        <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-200 text-sm">
          <Info className="w-4 h-4 text-pink-600" />
          How Dynamic Tracking Works on Korean Skin Food
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">1. Google Tag Manager (GTM):</span>
            <p className="mt-1">
              Container <code className="text-pink-600 font-mono">{settings.gtm.containerId}</code> is dynamically loaded into HTML &lt;head&gt; and receives all standard <code className="font-mono">dataLayer.push</code> events.
            </p>
          </div>
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">2. Google Analytics 4 (GA4):</span>
            <p className="mt-1">
              Measurement ID <code className="text-pink-600 font-mono">{settings.ga4.measurementId}</code> tracks route navigation, searches, catalog browsing, and purchases in BDT currency.
            </p>
          </div>
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">3. Meta Browser Pixel:</span>
            <p className="mt-1">
              Pixel ID <code className="text-pink-600 font-mono">{settings.metaPixel.pixelId}</code> fires standard browser events with deterministic <code className="font-mono">eventID</code> keys.
            </p>
          </div>
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">4. Meta Server CAPI:</span>
            <p className="mt-1">
              Dispatches authenticated purchases directly to Meta Graph API v19.0 with deduplication and SHA-256 customer data matching.
            </p>
          </div>
        </div>
      </div>

      {/* Payload Modal */}
      {selectedLogForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-pink-600" />
                  Event Payload: {selectedLogForModal.eventType}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  ID: {selectedLogForModal.eventId}
                </span>
              </div>
              <button
                onClick={() => setSelectedLogForModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Dispatched Targets: {selectedLogForModal.destinations.join(', ')}</span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(selectedLogForModal.payload, null, 2), 'modal-payload')}
                  className="flex items-center gap-1 text-pink-600 hover:text-pink-700 font-medium"
                >
                  {copiedId === 'modal-payload' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy JSON</span>
                </button>
              </div>

              <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-80">
                {JSON.stringify(selectedLogForModal.payload, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLogForModal(null)}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
