import React, { useState, useEffect } from 'react';
import { themeService, DEFAULT_HOME_THEME, DEFAULT_GLOBAL_THEME, DEFAULT_SHOP_THEME } from '../services/themeService';
import { HomeThemeSettings, GlobalThemeSettings, ShopThemeSettings, SectionKey, ReelItem } from '../types/theme';
import { productService } from '../services/productService';
import { Product } from '../types';
import { MediaLibraryModal } from './MediaLibraryModal';
import { 
  Palette, Layout, Home, Info, ShoppingBag, Phone, Save, Globe, Type,
  RotateCcw, Eye, ArrowUp, ArrowDown, EyeOff, Check, Image as ImageIcon,
  Sparkles, Layers, Sliders, ChevronDown, ChevronUp, Plus, Trash2, ExternalLink,
  Settings, Type as FontIcon, Shield, SlidersHorizontal, MessageCircle, Mail, Megaphone, Share2,
  Upload, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadFileToCloudinary } from '../services/cloudinaryService';

const SECTION_LABELS: Record<SectionKey, { name: string; desc: string }> = {
  hero: { name: 'Hero Banner & Shipping Calculator', desc: 'Main title, background image, CTAs, and live shipping calculator card' },
  featureIcons: { name: 'Feature Icons Bar', desc: 'Sourcing, listing, fast shipping, and fulfillment badge items' },
  founderStory: { name: "Founders' Story (A Legacy of Love & Light)", desc: 'Editorial story layout, founder photo, and quote' },
  botanicalEssentials: { name: 'Botanical Essentials Carousel', desc: 'Heritage favorites product showcase section' },
  qualityAssurance: { name: 'Quality Assurance (Global Standard)', desc: 'Warehouse inventory, direct logistics, and operations note' },
  validatedFormulations: { name: 'Validated Formulations Grid', desc: 'Precision science product collection grid' },
  sharedJourney: { name: 'Shared Journey of Radiance (Community)', desc: '4-column community photo gallery' },
  reachReliability: { name: 'Reach & Reliability (Bridging Continents)', desc: 'Transit statistics and South Korea operations photos' },
  communityLive: { name: 'Community Live (Facebook Reels)', desc: 'Social rhythm and video reels showcase' }
};

const COLOR_PRESETS = [
  { name: 'Korean Skin Food Pink', primary: '#E91E8C', secondary: '#FF62B2', bg: '#FFF5F8' },
  { name: 'Royal Velvet Rose', primary: '#C2185B', secondary: '#E91E63', bg: '#FDF2F8' },
  { name: 'Emerald Sanctuary', primary: '#059669', secondary: '#34D399', bg: '#ECFDF5' },
  { name: 'Royal Sapphire', primary: '#2563EB', secondary: '#60A5FA', bg: '#EFF6FF' },
  { name: 'Sunset Coral', primary: '#E11D48', secondary: '#FB7185', bg: '#FFF1F2' },
  { name: 'Midnight Luxury', primary: '#18181B', secondary: '#3F3F46', bg: '#FAFAFA' },
  { name: 'Amethyst Glow', primary: '#8B5CF6', secondary: '#C084FC', bg: '#F5F3FF' },
];

const HEADING_FONT_OPTIONS = [
  'Playfair Display',
  'Plus Jakarta Sans',
  'Inter',
  'Poppins',
  'Montserrat',
  'Merriweather',
  'Cinzel',
  'Lora',
  'Outfit',
  'Space Grotesk'
];

const BODY_FONT_OPTIONS = [
  'Plus Jakarta Sans',
  'Inter',
  'Roboto',
  'Poppins',
  'Open Sans',
  'Nunito',
  'Lato',
  'Work Sans'
];

export const AdminThemeEditor: React.FC = () => {
  // Active Subpage Tab: 'global' | 'home' | 'about' | 'shop' | 'contact'
  const [activeTab, setActiveTab] = useState<'global' | 'home' | 'about' | 'shop' | 'contact'>('global');

  // Theme State
  const [theme, setTheme] = useState<HomeThemeSettings>(DEFAULT_HOME_THEME);
  const [globalTheme, setGlobalTheme] = useState<GlobalThemeSettings>(DEFAULT_GLOBAL_THEME);
  const [shopTheme, setShopTheme] = useState<ShopThemeSettings>(DEFAULT_SHOP_THEME);
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>('hero');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Media Library Modal state
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [activeMediaTarget, setActiveMediaTarget] = useState<string | null>(null);

  // Live Preview Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Direct Device Upload states for Favicon & Logo
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const faviconInputRef = React.useRef<HTMLInputElement>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  // Products list for selection
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Subscribe to theme service
    const unsubscribeHome = themeService.subscribe((data) => {
      setTheme(data);
    });
    const unsubscribeGlobal = themeService.subscribeGlobal((data) => {
      setGlobalTheme(data);
    });
    const unsubscribeShop = themeService.subscribeShop((data) => {
      setShopTheme(data);
    });
    setAllProducts(productService.getProducts());
    return () => {
      unsubscribeHome();
      unsubscribeGlobal();
      unsubscribeShop();
    };
  }, []);

  // Home Save handler
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await themeService.saveHomeTheme(theme);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save home theme:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Home Reset handler
  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all Home Page theme settings to brand defaults?')) {
      await themeService.resetToDefault();
    }
  };

  // Global Save handler
  const handleSaveGlobal = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await themeService.saveGlobalTheme(globalTheme);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save global theme:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Global Reset handler
  const handleResetGlobal = async () => {
    if (confirm('Are you sure you want to reset all Global Settings (Favicon, Logo, Theme Color, Fonts, Contacts) to brand defaults?')) {
      await themeService.resetGlobalToDefault();
    }
  };

  // Direct Device Upload for Favicon
  const handleFaviconDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFavicon(true);
    try {
      const res = await uploadFileToCloudinary(file, {
        folder: 'theme_favicons',
        resourceType: 'image'
      });
      if (res?.secureUrl) {
        setGlobalTheme((prev) => ({ ...prev, faviconUrl: res.secureUrl }));
      }
    } catch (err) {
      console.error('Failed to upload favicon:', err);
      alert('Failed to upload favicon from device. Please try again.');
    } finally {
      setIsUploadingFavicon(false);
      if (e.target) e.target.value = '';
    }
  };

  // Direct Device Upload for Brand Logo
  const handleLogoDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const res = await uploadFileToCloudinary(file, {
        folder: 'theme_logos',
        resourceType: 'image'
      });
      if (res?.secureUrl) {
        setGlobalTheme((prev) => ({ ...prev, logoUrl: res.secureUrl }));
      }
    } catch (err) {
      console.error('Failed to upload logo:', err);
      alert('Failed to upload logo from device. Please try again.');
    } finally {
      setIsUploadingLogo(false);
      if (e.target) e.target.value = '';
    }
  };

  // Shop Save handler
  const handleSaveShop = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await themeService.saveShopTheme(shopTheme);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save shop theme:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Shop Reset handler
  const handleResetShop = async () => {
    if (confirm('Are you sure you want to reset Shop Page settings to defaults?')) {
      await themeService.resetShopToDefault();
    }
  };

  // Section Order handlers
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...theme.sectionOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    setTheme({ ...theme, sectionOrder: newOrder });
  };

  const toggleSectionEnabled = (key: SectionKey) => {
    setTheme({
      ...theme,
      [key]: {
        ...theme[key],
        enabled: !theme[key].enabled
      }
    });
  };

  // Image selection helper
  const openMediaPicker = (targetPath: string) => {
    setActiveMediaTarget(targetPath);
    setMediaModalOpen(true);
  };

  const handleSelectMediaUrl = (url: string) => {
    if (!activeMediaTarget) return;

    if (activeMediaTarget === 'shopBannerUrl') {
      setShopTheme((prev) => ({ ...prev, heroBannerUrl: url }));
      setActiveMediaTarget(null);
      return;
    }

    if (activeMediaTarget.startsWith('global.')) {
      const field = activeMediaTarget.replace('global.', '') as keyof GlobalThemeSettings;
      setGlobalTheme((prev) => ({ ...prev, [field]: url }));
      setActiveMediaTarget(null);
      return;
    }

    // Parse target path like "hero.backgroundImageUrl" or "sharedJourney.photos.0.imageUrl"
    const parts = activeMediaTarget.split('.');
    const updated = JSON.parse(JSON.stringify(theme));

    let curr = updated;
    for (let i = 0; i < parts.length - 1; i++) {
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = url;

    setTheme(updated);
    setActiveMediaTarget(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-6 md:p-8 rounded-[28px] text-white shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#E91E8C] text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full tracking-wider shadow-sm">
              Live Theme Customizer
            </span>
            <span className="text-pink-300 text-xs font-semibold">Korean Skin Food BD</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-serif tracking-tight text-white flex items-center gap-2">
            <Palette className="text-[#E91E8C]" size={28} />
            <span>Theme Editor Deck</span>
          </h1>
          <p className="text-slate-300 text-xs mt-1 max-w-xl font-sans">
            Customize sections, typography, background banners, product collections, and layout order for your digital flagship store.
          </p>
        </div>

        {/* Global Save / Reset / Preview Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="flex-1 md:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700 cursor-pointer shadow-sm"
          >
            <Eye size={15} className="text-pink-400" />
            <span>Live Preview</span>
          </button>

          <button
            onClick={activeTab === 'global' ? handleResetGlobal : handleReset}
            title="Reset theme settings to default"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition border border-slate-700 cursor-pointer shadow-sm"
          >
            <RotateCcw size={15} />
          </button>

          <button
            onClick={activeTab === 'global' ? handleSaveGlobal : handleSave}
            disabled={isSaving}
            className="flex-1 md:flex-none px-6 py-2.5 bg-[#E91E8C] hover:bg-pink-600 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-lg shadow-pink-900/30 cursor-pointer disabled:opacity-50"
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving Changes...' : activeTab === 'global' ? 'Save Global Settings' : 'Save Theme Changes'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm"
        >
          <Check size={18} className="text-emerald-600" />
          <span>{activeTab === 'global' ? 'Global theme settings saved successfully! Site favicon, logo & colors updated.' : 'Theme changes saved successfully! The live homepage has automatically updated.'}</span>
        </motion.div>
      )}

      {/* Subpage Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-pink-100 shadow-sm flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('global')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'global'
              ? 'bg-[#E91E8C] text-white shadow-md'
              : 'text-gray-600 hover:text-[#E91E8C] hover:bg-pink-50/50'
          }`}
        >
          <Globe size={15} />
          <span>Global Setting</span>
          <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full uppercase">Favicon & Logo</span>
        </button>

        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'home'
              ? 'bg-[#E91E8C] text-white shadow-md'
              : 'text-gray-600 hover:text-[#E91E8C] hover:bg-pink-50/50'
          }`}
        >
          <Home size={15} />
          <span>Home Page</span>
          <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Sections</span>
        </button>

        <button
          onClick={() => setActiveTab('about')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'about'
              ? 'bg-[#E91E8C] text-white shadow-md'
              : 'text-gray-600 hover:text-[#E91E8C] hover:bg-pink-50/50'
          }`}
        >
          <Info size={15} />
          <span>About Us Page</span>
          <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Structure</span>
        </button>

        <button
          onClick={() => setActiveTab('shop')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'shop'
              ? 'bg-[#E91E8C] text-white shadow-md'
              : 'text-gray-600 hover:text-[#E91E8C] hover:bg-pink-50/50'
          }`}
        >
          <ShoppingBag size={15} />
          <span>Shop Page</span>
          <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Structure</span>
        </button>

        <button
          onClick={() => setActiveTab('contact')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'contact'
              ? 'bg-[#E91E8C] text-white shadow-md'
              : 'text-gray-600 hover:text-[#E91E8C] hover:bg-pink-50/50'
          }`}
        >
          <Phone size={15} />
          <span>Contact Us Page</span>
          <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Structure</span>
        </button>
      </div>

      {/* SUBPAGE: GLOBAL SETTINGS */}
      {activeTab === 'global' && (
        <div className="space-y-6">
          {/* Global Header Banner / Info */}
          <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-pink-100 text-[#E91E8C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                  Global Branding & Theme System
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Globe className="text-[#E91E8C]" size={20} />
                <span>গ্লোবাল সেটিং (Global Settings)</span>
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                Configure site favicon, brand logo, master theme colors, font families, hotlines, and announcement bar across the entire application.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleResetGlobal}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Reset Defaults</span>
              </button>
              <button
                onClick={handleSaveGlobal}
                disabled={isSaving}
                className="px-5 py-2 bg-[#E91E8C] hover:bg-pink-600 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-pink-200 cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isSaving ? 'Saving...' : 'Save Global Settings'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Favicon Setting */}
            <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 text-[#E91E8C] flex items-center justify-center font-bold">
                    <Globe size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">ফেভিকন সেটিং (Favicon Setting)</h3>
                    <p className="text-[11px] text-slate-500">Browser tab icon (.ico, .png, or image link)</p>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">Tab Icon</span>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">Favicon Image URL</label>
                
                {/* Hidden File Input for Favicon */}
                <input
                  type="file"
                  ref={faviconInputRef}
                  onChange={handleFaviconDeviceUpload}
                  accept="image/png,image/jpeg,image/x-icon,image/svg+xml,image/webp"
                  className="hidden"
                />

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={globalTheme.faviconUrl}
                    onChange={(e) => setGlobalTheme({ ...globalTheme, faviconUrl: e.target.value })}
                    placeholder="https://example.com/favicon.png"
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#E91E8C] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={isUploadingFavicon}
                    className="px-3 py-2.5 bg-pink-50 text-[#E91E8C] hover:bg-pink-100 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                    title="Upload from local device"
                  >
                    <Upload size={14} className={isUploadingFavicon ? 'animate-bounce' : ''} />
                    <span>{isUploadingFavicon ? 'Uploading...' : 'Device'}</span>
                  </button>
                  <button
                    onClick={() => openMediaPicker('global.faviconUrl')}
                    className="px-3 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <ImageIcon size={14} />
                    <span>Media</span>
                  </button>
                </div>

                {/* Browser Tab Simulation Preview */}
                <div className="mt-4 p-3 bg-slate-100 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-2">
                    Browser Tab Preview:
                  </span>
                  <div className="max-w-xs bg-slate-200/80 p-1.5 rounded-t-xl flex items-center gap-2 border-b border-slate-300 shadow-inner">
                    <div className="bg-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-slate-800 shadow-sm max-w-full truncate">
                      <img
                        src={globalTheme.faviconUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDV9JqR2f8TTBJG32wqldTxeJQRLC1xolU3UBXhjlG8xqiFFHmPa8s7VOmDWPNYjyf-t6OqEzaveZ7B4b0qSnfSfsjMLerSO2S0r_L5h7hWtHIb0PQcNOU9xzM5hr44aKCbKYO0mcXsLe818N0R-AA3Zj14exAmZCen73zfHV8MVDMbR9l4MQjyLLTF_Ar2OIbFnMMc-hSVV4yFDshte5KzLe5iLA2SY-A8gSFkM3MlXUpPyZu37-bDXliWJF5e0ujz-d6-bUCf01w'}
                        alt="Favicon preview"
                        className="w-4 h-4 rounded object-cover shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDV9JqR2f8TTBJG32wqldTxeJQRLC1xolU3UBXhjlG8xqiFFHmPa8s7VOmDWPNYjyf-t6OqEzaveZ7B4b0qSnfSfsjMLerSO2S0r_L5h7hWtHIb0PQcNOU9xzM5hr44aKCbKYO0mcXsLe818N0R-AA3Zj14exAmZCen73zfHV8MVDMbR9l4MQjyLLTF_Ar2OIbFnMMc-hSVV4yFDshte5KzLe5iLA2SY-A8gSFkM3MlXUpPyZu37-bDXliWJF5e0ujz-d6-bUCf01w';
                        }}
                      />
                      <span className="truncate">{globalTheme.siteTitle || 'Korean Skin Food BD'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Brand Logo & Header Customization */}
            <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <ImageIcon size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">লোগো ও হেডার ব্র্যান্ডিং (Logo Settings)</h3>
                    <p className="text-[11px] text-slate-500">Custom image logo or styled brand title & tagline</p>
                  </div>
                </div>
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-bold">Header</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Logo Image URL (Optional)</label>
                  
                  {/* Hidden File Input for Brand Logo */}
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={handleLogoDeviceUpload}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                  />

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={globalTheme.logoUrl}
                      onChange={(e) => setGlobalTheme({ ...globalTheme, logoUrl: e.target.value })}
                      placeholder="Leave blank to use Text Logo below"
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#E91E8C] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="px-3 py-2.5 bg-pink-50 text-[#E91E8C] hover:bg-pink-100 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                      title="Upload from local device"
                    >
                      <Upload size={14} className={isUploadingLogo ? 'animate-bounce' : ''} />
                      <span>{isUploadingLogo ? 'Uploading...' : 'Device'}</span>
                    </button>
                    <button
                      onClick={() => openMediaPicker('global.logoUrl')}
                      className="px-3 py-2.5 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <ImageIcon size={14} />
                      <span>Media</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Brand Name / Logo Text</label>
                    <input
                      type="text"
                      value={globalTheme.logoText}
                      onChange={(e) => setGlobalTheme({ ...globalTheme, logoText: e.target.value })}
                      placeholder="e.g. Korean Skin Food BD"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#E91E8C] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Brand Tagline</label>
                    <input
                      type="text"
                      value={globalTheme.logoTagline}
                      onChange={(e) => setGlobalTheme({ ...globalTheme, logoTagline: e.target.value })}
                      placeholder="e.g. K-BEAUTY COSMECEUTICALS"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#E91E8C] outline-none"
                    />
                  </div>
                </div>

                {/* Live Logo Preview Box */}
                <div className="mt-3 p-4 bg-slate-900 rounded-2xl text-white flex items-center justify-between shadow-md">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-pink-400 font-extrabold block mb-1">Live Header Logo Preview</span>
                    {globalTheme.logoUrl ? (
                      <img src={globalTheme.logoUrl} alt="Custom Logo" className="h-9 object-contain" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E91E8C] to-purple-600 flex items-center justify-center text-white font-extrabold text-sm">
                          K
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-white tracking-tight leading-none">{globalTheme.logoText || 'Korean Skin Food BD'}</h4>
                          <span className="text-[9px] text-pink-300 font-bold tracking-widest uppercase block mt-0.5">{globalTheme.logoTagline || 'K-BEAUTY COSMECEUTICALS'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 font-mono">Live</span>
                </div>
              </div>
            </div>

            {/* 3. Theme Color Scheme Engine */}
            <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 text-[#E91E8C] flex items-center justify-center font-bold">
                    <Palette size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">থিম কালার সেটিং (Theme Color Palette)</h3>
                    <p className="text-[11px] text-slate-500">Pick primary accent, gradient highlight, background tint, and dark accents</p>
                  </div>
                </div>
                <span className="text-[10px] bg-pink-100 text-[#E91E8C] px-2.5 py-0.5 rounded-full font-extrabold uppercase">Live CSS Variables</span>
              </div>

              {/* Preset Palettes Quick Chooser */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Quick Theme Preset Palettes (এক ক্লিকে কালার স্কিম থিম চেঞ্জ করুন):</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setGlobalTheme({
                        ...globalTheme,
                        primaryColor: preset.primary,
                        secondaryColor: preset.secondary,
                        backgroundColor: preset.bg
                      })}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        globalTheme.primaryColor === preset.primary
                          ? 'border-[#E91E8C] bg-pink-50/80 shadow-sm text-slate-900'
                          : 'border-slate-200 hover:border-pink-300 bg-white text-slate-700'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: preset.primary }} />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                {/* Primary Theme Color */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-800">Primary Color</label>
                    <input
                      type="color"
                      value={globalTheme.primaryColor || '#E91E8C'}
                      onChange={(e) => setGlobalTheme({ ...globalTheme, primaryColor: e.target.value })}
                      className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 overflow-hidden"
                    />
                  </div>
                  <input
                    type="text"
                    value={globalTheme.primaryColor}
                    onChange={(e) => setGlobalTheme({ ...globalTheme, primaryColor: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                  />
                  <span className="text-[10px] text-slate-500 block">Main buttons, badges & active states</span>
                </div>

                {/* Secondary Color */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-800">Secondary / Gradient</label>
                    <input
                      type="color"
                      value={globalTheme.secondaryColor || '#FF62B2'}
                      onChange={(e) => setGlobalTheme({ ...globalTheme, secondaryColor: e.target.value })}
                      className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 overflow-hidden"
                    />
                  </div>
                  <input
                    type="text"
                    value={globalTheme.secondaryColor}
                    onChange={(e) => setGlobalTheme({ ...globalTheme, secondaryColor: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                  />
                  <span className="text-[10px] text-slate-500 block">Gradients, hovers & subtle highlights</span>
                </div>

                {/* Accent / Dark Color */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-800">Accent / Dark Text</label>
                    <input
                      type="color"
                      value={globalTheme.accentColor || '#0F172A'}
                      onChange={(e) => setGlobalTheme({ ...globalTheme, accentColor: e.target.value })}
                      className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 overflow-hidden"
                    />
                  </div>
                  <input
                    type="text"
                    value={globalTheme.accentColor}
                    onChange={(e) => setGlobalTheme({ ...globalTheme, accentColor: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                  />
                  <span className="text-[10px] text-slate-500 block">Dark section headers & typography</span>
                </div>

                {/* Background Tint */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-800">Background Tint</label>
                    <input
                      type="color"
                      value={globalTheme.backgroundColor || '#FFF5F8'}
                      onChange={(e) => setGlobalTheme({ ...globalTheme, backgroundColor: e.target.value })}
                      className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 overflow-hidden"
                    />
                  </div>
                  <input
                    type="text"
                    value={globalTheme.backgroundColor}
                    onChange={(e) => setGlobalTheme({ ...globalTheme, backgroundColor: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
                  />
                  <span className="text-[10px] text-slate-500 block">Soft background tint for cards</span>
                </div>
              </div>

              {/* Live Swatch Preview */}
              <div className="p-4 rounded-2xl border border-pink-100 flex flex-wrap items-center justify-between gap-3" style={{ backgroundColor: globalTheme.backgroundColor || '#FFF5F8' }}>
                <div>
                  <h4 className="font-extrabold text-xs" style={{ color: globalTheme.accentColor || '#0F172A' }}>Live Palette Preview Sample</h4>
                  <p className="text-[11px]" style={{ color: globalTheme.accentColor || '#0F172A', opacity: 0.8 }}>This is how your chosen background and buttons will look to customers.</p>
                </div>
                <button
                  style={{ backgroundColor: globalTheme.primaryColor || '#E91E8C' }}
                  className="px-5 py-2 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition hover:opacity-90"
                >
                  Sample Primary Button
                </button>
              </div>
            </div>

            {/* 4. Font Family & Typography */}
            <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <FontIcon size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">ফন্ট ফ্যামিলি সেটিং (Typography & Font Family)</h3>
                    <p className="text-[11px] text-slate-500">Google Fonts selection for headings and body content</p>
                  </div>
                </div>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold">Google Fonts</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Heading Font Family (শিরোনাম ফন্ট)</label>
                  <select
                    value={globalTheme.headingFont}
                    onChange={(e) => setGlobalTheme({ ...globalTheme, headingFont: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:ring-2 focus:ring-[#E91E8C] outline-none"
                  >
                    {HEADING_FONT_OPTIONS.map((font) => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Body Font Family (বডি লেখা ফন্ট)</label>
                  <select
                    value={globalTheme.bodyFont}
                    onChange={(e) => setGlobalTheme({ ...globalTheme, bodyFont: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:ring-2 focus:ring-[#E91E8C] outline-none"
                  >
                    {BODY_FONT_OPTIONS.map((font) => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Font Specimen Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Live Font Specimen Preview:</span>
                <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: `'${globalTheme.headingFont || 'Playfair Display'}', serif` }}>
                  {globalTheme.siteTitle || 'Korean Skin Food BD'} — Radiance & Heritage
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed" style={{ fontFamily: `'${globalTheme.bodyFont || 'Plus Jakarta Sans'}', sans-serif` }}>
                  100% Authentic Korean Cosmeceuticals directly imported from Seoul, South Korea. Pure botanical formulations verified for Bengali skin tones.
                </p>
              </div>
            </div>

            {/* 5. Site Identity & Contact Information */}
            <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Shield size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">সাইট ইনফো ও যোগাযোগ (Site Info & Hotline)</h3>
                    <p className="text-[11px] text-slate-500">Store title, meta tagline, currency symbol and contact details</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Site Title / Browser Tab Title</label>
                    <input
                      type="text"
                      value={globalTheme.siteTitle}
                      onChange={(e) => setGlobalTheme({ ...globalTheme, siteTitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#E91E8C] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Currency Symbol</label>
                    <input
                      type="text"
                      value={globalTheme.currencySymbol}
                      onChange={(e) => setGlobalTheme({ ...globalTheme, currencySymbol: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 text-center focus:ring-2 focus:ring-[#E91E8C] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Site Meta Tagline / Subtitle</label>
                  <input
                    type="text"
                    value={globalTheme.siteTagline}
                    onChange={(e) => setGlobalTheme({ ...globalTheme, siteTagline: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#E91E8C] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Hotline / WhatsApp Phone</label>
                    <input
                      type="text"
                      value={globalTheme.contactPhone}
                      onChange={(e) => setGlobalTheme({ ...globalTheme, contactPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#E91E8C] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Support Email Address</label>
                    <input
                      type="text"
                      value={globalTheme.contactEmail}
                      onChange={(e) => setGlobalTheme({ ...globalTheme, contactEmail: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#E91E8C] outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Social Media Links & Announcement Bar */}
            <div className="bg-white p-6 rounded-[24px] border border-pink-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Megaphone size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">অ্যানাউন্সমেন্ট ও সোশ্যাল লিঙ্ক (Social & Announcement)</h3>
                    <p className="text-[11px] text-slate-500">Top announcement marquee bar and official social profiles</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-pink-50/50 rounded-2xl border border-pink-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Megaphone size={14} className="text-[#E91E8C]" />
                      <span>Enable Top Announcement Bar</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={globalTheme.enableAnnouncement}
                      onChange={(e) => setGlobalTheme({ ...globalTheme, enableAnnouncement: e.target.checked })}
                      className="w-4 h-4 accent-[#E91E8C] rounded cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    value={globalTheme.announcementText}
                    onChange={(e) => setGlobalTheme({ ...globalTheme, announcementText: e.target.value })}
                    placeholder="e.g. ✨ FREE shipping inside Dhaka for orders over ৳2,000! ✨"
                    className="w-full px-3.5 py-2 bg-white border border-pink-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#E91E8C] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Facebook Page URL</label>
                    <input
                      type="text"
                      value={globalTheme.facebookUrl}
                      onChange={(e) => setGlobalTheme({ ...globalTheme, facebookUrl: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#E91E8C] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Instagram URL</label>
                    <input
                      type="text"
                      value={globalTheme.instagramUrl}
                      onChange={(e) => setGlobalTheme({ ...globalTheme, instagramUrl: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#E91E8C] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Footer Copyright / Slogan Text</label>
                  <input
                    type="text"
                    value={globalTheme.footerText}
                    onChange={(e) => setGlobalTheme({ ...globalTheme, footerText: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#E91E8C] outline-none"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUBPAGE: HOME PAGE THEME EDITOR */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          
          {/* Section Ordering & Control Overview Card */}
          <div className="bg-white p-5 rounded-[24px] border border-pink-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                  <Layers size={18} className="text-[#E91E8C]" />
                  <span>Home Page Sections & Order</span>
                </h3>
                <p className="text-[11px] text-gray-500">Re-order sections using arrows or toggle visibilities on/off.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {theme.sectionOrder.map((secKey, idx) => {
                const sec = theme[secKey];
                const meta = SECTION_LABELS[secKey];
                const isExpanded = expandedSection === secKey;

                return (
                  <div
                    key={secKey}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      sec.enabled
                        ? 'bg-pink-50/20 border-pink-200'
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-[#E91E8C]/10 text-[#E91E8C] text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{meta?.name || secKey}</p>
                          <p className="text-[9px] text-gray-400 font-semibold">{sec.enabled ? 'Enabled' : 'Hidden'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Move Up */}
                        <button
                          onClick={() => moveSection(idx, 'up')}
                          disabled={idx === 0}
                          title="Move Up"
                          className="p-1 text-gray-400 hover:text-[#E91E8C] disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp size={14} />
                        </button>

                        {/* Move Down */}
                        <button
                          onClick={() => moveSection(idx, 'down')}
                          disabled={idx === theme.sectionOrder.length - 1}
                          title="Move Down"
                          className="p-1 text-gray-400 hover:text-[#E91E8C] disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown size={14} />
                        </button>

                        {/* Toggle Enable */}
                        <button
                          onClick={() => toggleSectionEnabled(secKey)}
                          title={sec.enabled ? 'Hide Section' : 'Show Section'}
                          className={`p-1 rounded-md transition cursor-pointer ${
                            sec.enabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {sec.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>

                        {/* Expand Editor */}
                        <button
                          onClick={() => setExpandedSection(isExpanded ? null : secKey)}
                          className="p-1.5 bg-white rounded-lg border border-pink-100 text-[#E91E8C] text-[10px] font-bold cursor-pointer hover:bg-pink-50 transition ml-1"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DETAILED SECTION EDITORS */}
          <div className="space-y-4">
            
            {/* 1. HERO BANNER EDITOR */}
            <div className="bg-white rounded-[24px] border border-pink-100 overflow-hidden shadow-sm">
              <div
                onClick={() => setExpandedSection(expandedSection === 'hero' ? null : 'hero')}
                className="p-5 bg-gradient-to-r from-pink-50/40 to-white flex items-center justify-between cursor-pointer border-b border-pink-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E91E8C] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Hero Section & Shipping Calculator</h3>
                    <p className="text-[10px] text-gray-500 font-semibold">Title, background image, CTAs, and dropshipping cargo rates</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${theme.hero.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {theme.hero.enabled ? 'Visible' : 'Hidden'}
                  </span>
                  {expandedSection === 'hero' ? <ChevronUp size={18} className="text-[#E91E8C]" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {expandedSection === 'hero' && (
                <div className="p-6 space-y-5 bg-white text-xs">
                  <div className="flex items-center gap-2 pb-3 border-b border-pink-50">
                    <input
                      type="checkbox"
                      id="hero-enabled"
                      checked={theme.hero.enabled}
                      onChange={(e) => setTheme({ ...theme, hero: { ...theme.hero, enabled: e.target.checked } })}
                      className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus:ring-[#E91E8C]"
                    />
                    <label htmlFor="hero-enabled" className="font-extrabold text-gray-800 cursor-pointer">
                      Enable Hero Section on Home Page
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Badge Text</label>
                      <input
                        type="text"
                        value={theme.hero.badgeText}
                        onChange={(e) => setTheme({ ...theme, hero: { ...theme.hero, badgeText: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Title Line 1</label>
                      <input
                        type="text"
                        value={theme.hero.titleLine1}
                        onChange={(e) => setTheme({ ...theme, hero: { ...theme.hero, titleLine1: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Title Highlight Badge</label>
                      <input
                        type="text"
                        value={theme.hero.titleHighlight}
                        onChange={(e) => setTheme({ ...theme, hero: { ...theme.hero, titleHighlight: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Title Line 2</label>
                      <input
                        type="text"
                        value={theme.hero.titleLine2}
                        onChange={(e) => setTheme({ ...theme, hero: { ...theme.hero, titleLine2: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Subtitle / Description</label>
                    <textarea
                      rows={2}
                      value={theme.hero.subtitle}
                      onChange={(e) => setTheme({ ...theme, hero: { ...theme.hero, subtitle: e.target.value } })}
                      className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Primary Button Text & Link</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={theme.hero.primaryButtonText}
                          onChange={(e) => setTheme({ ...theme, hero: { ...theme.hero, primaryButtonText: e.target.value } })}
                          placeholder="Get Started Free"
                          className="w-1/2 bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                        />
                        <input
                          type="text"
                          value={theme.hero.primaryButtonLink}
                          onChange={(e) => setTheme({ ...theme, hero: { ...theme.hero, primaryButtonLink: e.target.value } })}
                          placeholder="/shop"
                          className="w-1/2 bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Secondary Button Text & Link</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={theme.hero.secondaryButtonText}
                          onChange={(e) => setTheme({ ...theme, hero: { ...theme.hero, secondaryButtonText: e.target.value } })}
                          placeholder="Learn More"
                          className="w-1/2 bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                        />
                        <input
                          type="text"
                          value={theme.hero.secondaryButtonLink}
                          onChange={(e) => setTheme({ ...theme, hero: { ...theme.hero, secondaryButtonLink: e.target.value } })}
                          placeholder="/about-us"
                          className="w-1/2 bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hero Image */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Hero Background Image URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={theme.hero.backgroundImageUrl}
                        onChange={(e) => setTheme({ ...theme, hero: { ...theme.hero, backgroundImageUrl: e.target.value } })}
                        className="flex-1 bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                      <button
                        type="button"
                        onClick={() => openMediaPicker('hero.backgroundImageUrl')}
                        className="px-4 py-2.5 bg-[#E91E8C] text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer hover:bg-pink-600 transition"
                      >
                        <ImageIcon size={14} />
                        <span>Media Library</span>
                      </button>
                    </div>
                  </div>

                  {/* Shipping Calculator Card sub-settings */}
                  <div className="bg-pink-50/20 p-4 rounded-2xl border border-pink-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-gray-900">Shipping Calculator Card Settings</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={theme.hero.showShippingCalculator}
                          onChange={(e) => setTheme({ ...theme, hero: { ...theme.hero, showShippingCalculator: e.target.checked } })}
                          className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus:ring-[#E91E8C]"
                        />
                        <span className="font-bold text-xs text-gray-700">Show Card</span>
                      </label>
                    </div>

                    {theme.hero.showShippingCalculator && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                        <div>
                          <label className="block text-gray-600 font-semibold mb-1">Card Title</label>
                          <input
                            type="text"
                            value={theme.hero.calculatorTitle}
                            onChange={(e) => setTheme({ ...theme, hero: { ...theme.hero, calculatorTitle: e.target.value } })}
                            className="w-full bg-white border border-pink-100 rounded-xl p-2 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-600 font-semibold mb-1">Cargo Name</label>
                          <input
                            type="text"
                            value={theme.hero.cargoName}
                            onChange={(e) => setTheme({ ...theme, hero: { ...theme.hero, cargoName: e.target.value } })}
                            className="w-full bg-white border border-pink-100 rounded-xl p-2 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-600 font-semibold mb-1">Button Text</label>
                          <input
                            type="text"
                            value={theme.hero.calculateButtonText}
                            onChange={(e) => setTheme({ ...theme, hero: { ...theme.hero, calculateButtonText: e.target.value } })}
                            className="w-full bg-white border border-pink-100 rounded-xl p-2 outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. FEATURE ICONS EDITOR */}
            <div className="bg-white rounded-[24px] border border-pink-100 overflow-hidden shadow-sm">
              <div
                onClick={() => setExpandedSection(expandedSection === 'featureIcons' ? null : 'featureIcons')}
                className="p-5 bg-gradient-to-r from-pink-50/40 to-white flex items-center justify-between cursor-pointer border-b border-pink-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E91E8C] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Feature Icons Bar</h3>
                    <p className="text-[10px] text-gray-500 font-semibold">5 service badges (sourcing, multi-store, shipping, fulfillment)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${theme.featureIcons.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {theme.featureIcons.enabled ? 'Visible' : 'Hidden'}
                  </span>
                  {expandedSection === 'featureIcons' ? <ChevronUp size={18} className="text-[#E91E8C]" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {expandedSection === 'featureIcons' && (
                <div className="p-6 space-y-4 bg-white text-xs">
                  <div className="flex items-center gap-2 pb-3 border-b border-pink-50">
                    <input
                      type="checkbox"
                      id="feat-enabled"
                      checked={theme.featureIcons.enabled}
                      onChange={(e) => setTheme({ ...theme, featureIcons: { ...theme.featureIcons, enabled: e.target.checked } })}
                      className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus:ring-[#E91E8C]"
                    />
                    <label htmlFor="feat-enabled" className="font-extrabold text-gray-800 cursor-pointer">
                      Enable Feature Icons Bar
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {theme.featureIcons.items.map((item, index) => (
                      <div key={item.id} className="p-3 bg-pink-50/15 rounded-2xl border border-pink-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-700">Badge #{index + 1}</span>
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) => {
                              const updatedItems = [...theme.featureIcons.items];
                              updatedItems[index].enabled = e.target.checked;
                              setTheme({ ...theme, featureIcons: { ...theme.featureIcons, items: updatedItems } });
                            }}
                            className="w-3.5 h-3.5 text-[#E91E8C] rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 font-semibold">Title</label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const updatedItems = [...theme.featureIcons.items];
                              updatedItems[index].title = e.target.value;
                              setTheme({ ...theme, featureIcons: { ...theme.featureIcons, items: updatedItems } });
                            }}
                            className="w-full bg-white border border-pink-100 rounded-lg p-1.5 outline-none font-medium"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. FOUNDERS STORY EDITOR */}
            <div className="bg-white rounded-[24px] border border-pink-100 overflow-hidden shadow-sm">
              <div
                onClick={() => setExpandedSection(expandedSection === 'founderStory' ? null : 'founderStory')}
                className="p-5 bg-gradient-to-r from-pink-50/40 to-white flex items-center justify-between cursor-pointer border-b border-pink-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E91E8C] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Founders' Story (A Legacy of Love & Light)</h3>
                    <p className="text-[10px] text-gray-500 font-semibold">Brand origins, founder quote, heritage council label</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${theme.founderStory.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {theme.founderStory.enabled ? 'Visible' : 'Hidden'}
                  </span>
                  {expandedSection === 'founderStory' ? <ChevronUp size={18} className="text-[#E91E8C]" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {expandedSection === 'founderStory' && (
                <div className="p-6 space-y-4 bg-white text-xs">
                  <div className="flex items-center gap-2 pb-3 border-b border-pink-50">
                    <input
                      type="checkbox"
                      id="fs-enabled"
                      checked={theme.founderStory.enabled}
                      onChange={(e) => setTheme({ ...theme, founderStory: { ...theme.founderStory, enabled: e.target.checked } })}
                      className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus:ring-[#E91E8C]"
                    />
                    <label htmlFor="fs-enabled" className="font-extrabold text-gray-800 cursor-pointer">
                      Enable Founders' Story Section
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Section Subtitle</label>
                      <input
                        type="text"
                        value={theme.founderStory.subtitle}
                        onChange={(e) => setTheme({ ...theme, founderStory: { ...theme.founderStory, subtitle: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Headline</label>
                      <input
                        type="text"
                        value={theme.founderStory.title}
                        onChange={(e) => setTheme({ ...theme, founderStory: { ...theme.founderStory, title: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Founder Quote (Italicized)</label>
                    <textarea
                      rows={2}
                      value={theme.founderStory.quote}
                      onChange={(e) => setTheme({ ...theme, founderStory: { ...theme.founderStory, quote: e.target.value } })}
                      className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Story Paragraph</label>
                    <textarea
                      rows={2}
                      value={theme.founderStory.body}
                      onChange={(e) => setTheme({ ...theme, founderStory: { ...theme.founderStory, body: e.target.value } })}
                      className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Established Year Badge</label>
                      <input
                        type="text"
                        value={theme.founderStory.estYear}
                        onChange={(e) => setTheme({ ...theme, founderStory: { ...theme.founderStory, estYear: e.target.value } })}
                        placeholder="Est. 2014"
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Signoff Council Label</label>
                      <input
                        type="text"
                        value={theme.founderStory.councilLabel}
                        onChange={(e) => setTheme({ ...theme, founderStory: { ...theme.founderStory, councilLabel: e.target.value } })}
                        placeholder="THE HERITAGE COUNCIL"
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Founder Photo URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={theme.founderStory.founderImageUrl}
                        onChange={(e) => setTheme({ ...theme, founderStory: { ...theme.founderStory, founderImageUrl: e.target.value } })}
                        className="flex-1 bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                      <button
                        type="button"
                        onClick={() => openMediaPicker('founderStory.founderImageUrl')}
                        className="px-4 py-2.5 bg-[#E91E8C] text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer hover:bg-pink-600 transition"
                      >
                        <ImageIcon size={14} />
                        <span>Media Library</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. BOTANICAL ESSENTIALS EDITOR */}
            <div className="bg-white rounded-[24px] border border-pink-100 overflow-hidden shadow-sm">
              <div
                onClick={() => setExpandedSection(expandedSection === 'botanicalEssentials' ? null : 'botanicalEssentials')}
                className="p-5 bg-gradient-to-r from-pink-50/40 to-white flex items-center justify-between cursor-pointer border-b border-pink-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E91E8C] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    4
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Botanical Essentials (Heritage Favorites)</h3>
                    <p className="text-[10px] text-gray-500 font-semibold">Carousel product showcase section</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${theme.botanicalEssentials.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {theme.botanicalEssentials.enabled ? 'Visible' : 'Hidden'}
                  </span>
                  {expandedSection === 'botanicalEssentials' ? <ChevronUp size={18} className="text-[#E91E8C]" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {expandedSection === 'botanicalEssentials' && (
                <div className="p-6 space-y-4 bg-white text-xs">
                  <div className="flex items-center gap-2 pb-3 border-b border-pink-50">
                    <input
                      type="checkbox"
                      id="be-enabled"
                      checked={theme.botanicalEssentials.enabled}
                      onChange={(e) => setTheme({ ...theme, botanicalEssentials: { ...theme.botanicalEssentials, enabled: e.target.checked } })}
                      className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus:ring-[#E91E8C]"
                    />
                    <label htmlFor="be-enabled" className="font-extrabold text-gray-800 cursor-pointer">
                      Enable Botanical Essentials Section
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={theme.botanicalEssentials.subtitle}
                        onChange={(e) => setTheme({ ...theme, botanicalEssentials: { ...theme.botanicalEssentials, subtitle: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Headline</label>
                      <input
                        type="text"
                        value={theme.botanicalEssentials.title}
                        onChange={(e) => setTheme({ ...theme, botanicalEssentials: { ...theme.botanicalEssentials, title: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">CTA Button Text</label>
                      <input
                        type="text"
                        value={theme.botanicalEssentials.buttonText}
                        onChange={(e) => setTheme({ ...theme, botanicalEssentials: { ...theme.botanicalEssentials, buttonText: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. QUALITY ASSURANCE EDITOR */}
            <div className="bg-white rounded-[24px] border border-pink-100 overflow-hidden shadow-sm">
              <div
                onClick={() => setExpandedSection(expandedSection === 'qualityAssurance' ? null : 'qualityAssurance')}
                className="p-5 bg-gradient-to-r from-pink-50/40 to-white flex items-center justify-between cursor-pointer border-b border-pink-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E91E8C] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    5
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Quality Assurance (A Global Standard of Integrity)</h3>
                    <p className="text-[10px] text-gray-500 font-semibold">Warehouse inventory precision, direct cargo logistics, and operations note</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${theme.qualityAssurance.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {theme.qualityAssurance.enabled ? 'Visible' : 'Hidden'}
                  </span>
                  {expandedSection === 'qualityAssurance' ? <ChevronUp size={18} className="text-[#E91E8C]" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {expandedSection === 'qualityAssurance' && (
                <div className="p-6 space-y-4 bg-white text-xs">
                  <div className="flex items-center gap-2 pb-3 border-b border-pink-50">
                    <input
                      type="checkbox"
                      id="qa-enabled"
                      checked={theme.qualityAssurance.enabled}
                      onChange={(e) => setTheme({ ...theme, qualityAssurance: { ...theme.qualityAssurance, enabled: e.target.checked } })}
                      className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus:ring-[#E91E8C]"
                    />
                    <label htmlFor="qa-enabled" className="font-extrabold text-gray-800 cursor-pointer">
                      Enable Quality Assurance Section
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={theme.qualityAssurance.subtitle}
                        onChange={(e) => setTheme({ ...theme, qualityAssurance: { ...theme.qualityAssurance, subtitle: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Headline</label>
                      <input
                        type="text"
                        value={theme.qualityAssurance.title}
                        onChange={(e) => setTheme({ ...theme, qualityAssurance: { ...theme.qualityAssurance, title: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Description Paragraph</label>
                    <textarea
                      rows={2}
                      value={theme.qualityAssurance.description}
                      onChange={(e) => setTheme({ ...theme, qualityAssurance: { ...theme.qualityAssurance, description: e.target.value } })}
                      className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                    />
                  </div>

                  {/* Main QA Image */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Main Logistics Image URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={theme.qualityAssurance.mainImageUrl}
                        onChange={(e) => setTheme({ ...theme, qualityAssurance: { ...theme.qualityAssurance, mainImageUrl: e.target.value } })}
                        className="flex-1 bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                      <button
                        type="button"
                        onClick={() => openMediaPicker('qualityAssurance.mainImageUrl')}
                        className="px-4 py-2.5 bg-[#E91E8C] text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer hover:bg-pink-600 transition"
                      >
                        <ImageIcon size={14} />
                        <span>Media Library</span>
                      </button>
                    </div>
                  </div>

                  {/* Operations Note Card */}
                  <div className="bg-pink-50/20 p-4 rounded-2xl border border-pink-100 space-y-3">
                    <span className="font-extrabold text-gray-900 block">Operations Floating Glass Note Card</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-gray-600 mb-1">Quote</label>
                        <input
                          type="text"
                          value={theme.qualityAssurance.opsNoteQuote}
                          onChange={(e) => setTheme({ ...theme, qualityAssurance: { ...theme.qualityAssurance, opsNoteQuote: e.target.value } })}
                          className="w-full bg-white border border-pink-100 rounded-xl p-2 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-gray-600 mb-1">Note Image URL</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={theme.qualityAssurance.opsNoteImageUrl}
                            onChange={(e) => setTheme({ ...theme, qualityAssurance: { ...theme.qualityAssurance, opsNoteImageUrl: e.target.value } })}
                            className="flex-1 bg-white border border-pink-100 rounded-xl p-2 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => openMediaPicker('qualityAssurance.opsNoteImageUrl')}
                            className="px-3 py-2 bg-[#E91E8C] text-white rounded-xl text-[11px] font-bold cursor-pointer"
                          >
                            Media
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. VALIDATED FORMULATIONS EDITOR */}
            <div className="bg-white rounded-[24px] border border-pink-100 overflow-hidden shadow-sm">
              <div
                onClick={() => setExpandedSection(expandedSection === 'validatedFormulations' ? null : 'validatedFormulations')}
                className="p-5 bg-gradient-to-r from-pink-50/40 to-white flex items-center justify-between cursor-pointer border-b border-pink-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E91E8C] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    6
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Validated Formulations (Precision Science)</h3>
                    <p className="text-[10px] text-gray-500 font-semibold">Featured products grid</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${theme.validatedFormulations.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {theme.validatedFormulations.enabled ? 'Visible' : 'Hidden'}
                  </span>
                  {expandedSection === 'validatedFormulations' ? <ChevronUp size={18} className="text-[#E91E8C]" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {expandedSection === 'validatedFormulations' && (
                <div className="p-6 space-y-4 bg-white text-xs">
                  <div className="flex items-center gap-2 pb-3 border-b border-pink-50">
                    <input
                      type="checkbox"
                      id="vf-enabled"
                      checked={theme.validatedFormulations.enabled}
                      onChange={(e) => setTheme({ ...theme, validatedFormulations: { ...theme.validatedFormulations, enabled: e.target.checked } })}
                      className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus:ring-[#E91E8C]"
                    />
                    <label htmlFor="vf-enabled" className="font-extrabold text-gray-800 cursor-pointer">
                      Enable Validated Formulations Section
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={theme.validatedFormulations.subtitle}
                        onChange={(e) => setTheme({ ...theme, validatedFormulations: { ...theme.validatedFormulations, subtitle: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Headline</label>
                      <input
                        type="text"
                        value={theme.validatedFormulations.title}
                        onChange={(e) => setTheme({ ...theme, validatedFormulations: { ...theme.validatedFormulations, title: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">CTA Button Text</label>
                      <input
                        type="text"
                        value={theme.validatedFormulations.buttonText}
                        onChange={(e) => setTheme({ ...theme, validatedFormulations: { ...theme.validatedFormulations, buttonText: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 7. SHARED JOURNEY (GALLERY) EDITOR */}
            <div className="bg-white rounded-[24px] border border-pink-100 overflow-hidden shadow-sm">
              <div
                onClick={() => setExpandedSection(expandedSection === 'sharedJourney' ? null : 'sharedJourney')}
                className="p-5 bg-gradient-to-r from-pink-50/40 to-white flex items-center justify-between cursor-pointer border-b border-pink-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E91E8C] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    7
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Shared Journey of Radiance (Community Gallery)</h3>
                    <p className="text-[10px] text-gray-500 font-semibold">4 community photos with optional hover callout</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${theme.sharedJourney.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {theme.sharedJourney.enabled ? 'Visible' : 'Hidden'}
                  </span>
                  {expandedSection === 'sharedJourney' ? <ChevronUp size={18} className="text-[#E91E8C]" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {expandedSection === 'sharedJourney' && (
                <div className="p-6 space-y-4 bg-white text-xs">
                  <div className="flex items-center gap-2 pb-3 border-b border-pink-50">
                    <input
                      type="checkbox"
                      id="sj-enabled"
                      checked={theme.sharedJourney.enabled}
                      onChange={(e) => setTheme({ ...theme, sharedJourney: { ...theme.sharedJourney, enabled: e.target.checked } })}
                      className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus:ring-[#E91E8C]"
                    />
                    <label htmlFor="sj-enabled" className="font-extrabold text-gray-800 cursor-pointer">
                      Enable Community Gallery
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={theme.sharedJourney.subtitle}
                        onChange={(e) => setTheme({ ...theme, sharedJourney: { ...theme.sharedJourney, subtitle: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Headline</label>
                      <input
                        type="text"
                        value={theme.sharedJourney.title}
                        onChange={(e) => setTheme({ ...theme, sharedJourney: { ...theme.sharedJourney, title: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>
                  </div>

                  {/* 4 Community Photos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {theme.sharedJourney.photos.map((photo, idx) => (
                      <div key={photo.id} className="p-3 bg-pink-50/15 rounded-2xl border border-pink-100 space-y-2">
                        <span className="font-extrabold text-gray-800">Photo #{idx + 1}</span>
                        <div>
                          <label className="block text-[10px] text-gray-500 font-semibold">Image URL</label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={photo.imageUrl}
                              onChange={(e) => {
                                const newPhotos = [...theme.sharedJourney.photos];
                                newPhotos[idx].imageUrl = e.target.value;
                                setTheme({ ...theme, sharedJourney: { ...theme.sharedJourney, photos: newPhotos } });
                              }}
                              className="flex-1 bg-white border border-pink-100 rounded-lg p-1.5 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => openMediaPicker(`sharedJourney.photos.${idx}.imageUrl`)}
                              className="px-2.5 py-1.5 bg-[#E91E8C] text-white rounded-lg text-[10px] font-bold"
                            >
                              Media
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 font-semibold">Hover Text Overlay (Optional)</label>
                          <input
                            type="text"
                            value={photo.hoverText || ''}
                            onChange={(e) => {
                              const newPhotos = [...theme.sharedJourney.photos];
                              newPhotos[idx].hoverText = e.target.value;
                              setTheme({ ...theme, sharedJourney: { ...theme.sharedJourney, photos: newPhotos } });
                            }}
                            placeholder="e.g. Our Core Team"
                            className="w-full bg-white border border-pink-100 rounded-lg p-1.5 outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 8. REACH & RELIABILITY EDITOR */}
            <div className="bg-white rounded-[24px] border border-pink-100 overflow-hidden shadow-sm">
              <div
                onClick={() => setExpandedSection(expandedSection === 'reachReliability' ? null : 'reachReliability')}
                className="p-5 bg-gradient-to-r from-pink-50/40 to-white flex items-center justify-between cursor-pointer border-b border-pink-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E91E8C] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    8
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Reach & Reliability (Bridging Continents)</h3>
                    <p className="text-[10px] text-gray-500 font-semibold">Transit & integrity stat badges, Seoul hub photos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${theme.reachReliability.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {theme.reachReliability.enabled ? 'Visible' : 'Hidden'}
                  </span>
                  {expandedSection === 'reachReliability' ? <ChevronUp size={18} className="text-[#E91E8C]" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {expandedSection === 'reachReliability' && (
                <div className="p-6 space-y-4 bg-white text-xs">
                  <div className="flex items-center gap-2 pb-3 border-b border-pink-50">
                    <input
                      type="checkbox"
                      id="rr-enabled"
                      checked={theme.reachReliability.enabled}
                      onChange={(e) => setTheme({ ...theme, reachReliability: { ...theme.reachReliability, enabled: e.target.checked } })}
                      className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus:ring-[#E91E8C]"
                    />
                    <label htmlFor="rr-enabled" className="font-extrabold text-gray-800 cursor-pointer">
                      Enable Reach & Reliability Section
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={theme.reachReliability.subtitle}
                        onChange={(e) => setTheme({ ...theme, reachReliability: { ...theme.reachReliability, subtitle: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Headline</label>
                      <input
                        type="text"
                        value={theme.reachReliability.title}
                        onChange={(e) => setTheme({ ...theme, reachReliability: { ...theme.reachReliability, title: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Description Paragraph</label>
                    <textarea
                      rows={2}
                      value={theme.reachReliability.description}
                      onChange={(e) => setTheme({ ...theme, reachReliability: { ...theme.reachReliability, description: e.target.value } })}
                      className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                    />
                  </div>

                  {/* 3 Photos */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Operations Hub Image</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={theme.reachReliability.image1Url}
                          onChange={(e) => setTheme({ ...theme, reachReliability: { ...theme.reachReliability, image1Url: e.target.value } })}
                          className="flex-1 bg-pink-50/10 border border-pink-100 rounded-xl p-2 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => openMediaPicker('reachReliability.image1Url')}
                          className="px-2.5 py-2 bg-[#E91E8C] text-white rounded-xl text-[10px] font-bold"
                        >
                          Media
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Distribution Center Image</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={theme.reachReliability.image2Url}
                          onChange={(e) => setTheme({ ...theme, reachReliability: { ...theme.reachReliability, image2Url: e.target.value } })}
                          className="flex-1 bg-pink-50/10 border border-pink-100 rounded-xl p-2 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => openMediaPicker('reachReliability.image2Url')}
                          className="px-2.5 py-2 bg-[#E91E8C] text-white rounded-xl text-[10px] font-bold"
                        >
                          Media
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Leadership Team Image</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={theme.reachReliability.image3Url}
                          onChange={(e) => setTheme({ ...theme, reachReliability: { ...theme.reachReliability, image3Url: e.target.value } })}
                          className="flex-1 bg-pink-50/10 border border-pink-100 rounded-xl p-2 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => openMediaPicker('reachReliability.image3Url')}
                          className="px-2.5 py-2 bg-[#E91E8C] text-white rounded-xl text-[10px] font-bold"
                        >
                          Media
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 9. COMMUNITY LIVE (REELS) EDITOR */}
            <div className="bg-white rounded-[24px] border border-pink-100 overflow-hidden shadow-sm">
              <div
                onClick={() => setExpandedSection(expandedSection === 'communityLive' ? null : 'communityLive')}
                className="p-5 bg-gradient-to-r from-pink-50/40 to-white flex items-center justify-between cursor-pointer border-b border-pink-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#E91E8C] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    9
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Community Live (Social Rhythm)</h3>
                    <p className="text-[10px] text-gray-500 font-semibold">Facebook reels & social media video highlights</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${theme.communityLive.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {theme.communityLive.enabled ? 'Visible' : 'Hidden'}
                  </span>
                  {expandedSection === 'communityLive' ? <ChevronUp size={18} className="text-[#E91E8C]" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {expandedSection === 'communityLive' && (
                <div className="p-6 space-y-4 bg-white text-xs">
                  <div className="flex items-center gap-2 pb-3 border-b border-pink-50">
                    <input
                      type="checkbox"
                      id="cl-enabled"
                      checked={theme.communityLive.enabled}
                      onChange={(e) => setTheme({ ...theme, communityLive: { ...theme.communityLive, enabled: e.target.checked } })}
                      className="w-4 h-4 text-[#E91E8C] rounded border-gray-300 focus:ring-[#E91E8C]"
                    />
                    <label htmlFor="cl-enabled" className="font-extrabold text-gray-800 cursor-pointer">
                      Enable Community Live Section
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={theme.communityLive.subtitle}
                        onChange={(e) => setTheme({ ...theme, communityLive: { ...theme.communityLive, subtitle: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Headline</label>
                      <input
                        type="text"
                        value={theme.communityLive.title}
                        onChange={(e) => setTheme({ ...theme, communityLive: { ...theme.communityLive, title: e.target.value } })}
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">View All Link Text</label>
                      <input
                        type="text"
                        value={theme.communityLive.viewAllLinkText || ''}
                        onChange={(e) => setTheme({ ...theme, communityLive: { ...theme.communityLive, viewAllLinkText: e.target.value } })}
                        placeholder="View All Moments"
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">View All Link URL (Facebook/Instagram Page)</label>
                      <input
                        type="text"
                        value={theme.communityLive.viewAllLinkUrl || ''}
                        onChange={(e) => setTheme({ ...theme, communityLive: { ...theme.communityLive, viewAllLinkUrl: e.target.value } })}
                        placeholder="https://facebook.com/koreanskinfoodbd"
                        className="w-full bg-pink-50/10 border border-pink-100 rounded-xl p-2.5 outline-none focus:border-[#E91E8C]"
                      />
                    </div>
                  </div>

                  {/* Dynamic Reels Cards Header */}
                  <div className="flex items-center justify-between pt-2 border-t border-pink-50">
                    <div>
                      <span className="font-extrabold text-gray-900 text-xs">Reels & Video Highlights ({theme.communityLive.reels.length})</span>
                      <p className="text-[10px] text-gray-500">Upload video links (.mp4, Facebook Reel links, or Media assets). Frontend auto-plays muted!</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newReel: ReelItem = {
                          id: `reel-${Date.now()}`,
                          title: `New Reel Highlight #${theme.communityLive.reels.length + 1}`,
                          videoUrl: '',
                          coverUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop'
                        };
                        setTheme({
                          ...theme,
                          communityLive: {
                            ...theme.communityLive,
                            reels: [...theme.communityLive.reels, newReel]
                          }
                        });
                      }}
                      className="px-3 py-1.5 bg-[#E91E8C] text-white rounded-xl text-[10px] font-extrabold hover:bg-[#FF4B91] transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Reel Video</span>
                    </button>
                  </div>

                  {/* Reels Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {theme.communityLive.reels.map((reel, idx) => (
                      <div key={reel.id} className="p-3.5 bg-pink-50/15 rounded-2xl border border-pink-100 space-y-2.5 relative">
                        <div className="flex items-center justify-between border-b border-pink-50 pb-1.5">
                          <span className="font-extrabold text-slate-800 text-xs">Reel #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newReels = theme.communityLive.reels.filter((_, i) => i !== idx);
                              setTheme({ ...theme, communityLive: { ...theme.communityLive, reels: newReels } });
                            }}
                            className="text-gray-400 hover:text-red-500 transition p-1"
                            title="Delete Reel"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div>
                          <label className="block text-[10px] text-gray-700 font-extrabold mb-1">Social Link (সোশ্যাল লিঙ্ক - Facebook / Instagram / TikTok Post URL)</label>
                          <input
                            type="text"
                            value={reel.postUrl || ''}
                            onChange={(e) => {
                              const newReels = [...theme.communityLive.reels];
                              newReels[idx].postUrl = e.target.value;
                              setTheme({ ...theme, communityLive: { ...theme.communityLive, reels: newReels } });
                            }}
                            placeholder="https://www.facebook.com/... or Instagram/TikTok post URL"
                            className="w-full bg-white border border-pink-200 rounded-lg p-1.5 outline-none focus:border-[#E91E8C]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-gray-500 font-semibold mb-1">Video Link (.mp4, Cloudinary, or Facebook/YouTube Reel URL)</label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={reel.videoUrl}
                              onChange={(e) => {
                                const newReels = [...theme.communityLive.reels];
                                newReels[idx].videoUrl = e.target.value;
                                setTheme({ ...theme, communityLive: { ...theme.communityLive, reels: newReels } });
                              }}
                              placeholder="https://...mp4 or FB Reel URL"
                              className="flex-1 bg-white border border-pink-100 rounded-lg p-1.5 outline-none focus:border-[#E91E8C]"
                            />
                            <button
                              type="button"
                              onClick={() => openMediaPicker(`communityLive.reels.${idx}.videoUrl`)}
                              className="px-2.5 py-1 bg-[#E91E8C] text-white rounded-lg text-[10px] font-bold hover:bg-[#FF4B91] transition cursor-pointer"
                            >
                              Media
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-gray-500 font-semibold mb-1">Cover Image / Poster URL</label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={reel.coverUrl}
                              onChange={(e) => {
                                const newReels = [...theme.communityLive.reels];
                                newReels[idx].coverUrl = e.target.value;
                                setTheme({ ...theme, communityLive: { ...theme.communityLive, reels: newReels } });
                              }}
                              placeholder="Poster thumbnail image URL"
                              className="flex-1 bg-white border border-pink-100 rounded-lg p-1.5 outline-none focus:border-[#E91E8C]"
                            />
                            <button
                              type="button"
                              onClick={() => openMediaPicker(`communityLive.reels.${idx}.coverUrl`)}
                              className="px-2.5 py-1 bg-[#E91E8C] text-white rounded-lg text-[10px] font-bold hover:bg-[#FF4B91] transition cursor-pointer"
                            >
                              Media
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* SUBPAGES FOR OTHER 3 PAGES (STRUCTURE / PLACEHOLDERS) */}
      {activeTab === 'about' && (
        <div className="bg-white p-8 rounded-[28px] border border-pink-100 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto text-[#E91E8C]">
            <Info size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">About Us Page Theme Editor</h2>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            This structure is ready for the About Us page layout. Custom section editing system for heritage history, mission statement, and team specs will be integrated in the next module.
          </p>
          <div className="pt-2">
            <span className="px-4 py-1.5 bg-pink-50 text-[#E91E8C] text-xs font-bold rounded-full border border-pink-200 inline-block">
              Structure Reserved • Home Page Customizer Ready
            </span>
          </div>
        </div>
      )}

      {activeTab === 'shop' && (
        <div className="bg-white p-6 md:p-8 rounded-[28px] border border-pink-100 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-pink-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-[#E91E8C]">
                <ShoppingBag size={24} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">Shop Category Page Theme</h2>
                <p className="text-xs text-gray-500">Customize hero titles, editorial quotes, banner image, and default pagination settings.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetShop}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Reset Defaults</span>
              </button>
              <button
                type="button"
                onClick={handleSaveShop}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-[#E91E8C] hover:bg-[#FF4B91] transition cursor-pointer shadow-md shadow-pink-200 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hero Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-gray-800">Category Page Title</label>
              <input
                type="text"
                value={shopTheme.heroTitle}
                onChange={(e) => setShopTheme({ ...shopTheme, heroTitle: e.target.value })}
                placeholder="e.g. The Apothecary"
                className="w-full bg-pink-50/20 border border-pink-200 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#E91E8C]"
              />
            </div>

            {/* Hero Subtitle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-gray-800">Category Page Subtitle</label>
              <input
                type="text"
                value={shopTheme.heroSubtitle}
                onChange={(e) => setShopTheme({ ...shopTheme, heroSubtitle: e.target.value })}
                placeholder="Subtitle description..."
                className="w-full bg-pink-50/20 border border-pink-200 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#E91E8C]"
              />
            </div>

            {/* Hero Banner Background Image URL */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-extrabold text-gray-800">Hero Header Banner Image URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shopTheme.heroBannerUrl}
                  onChange={(e) => setShopTheme({ ...shopTheme, heroBannerUrl: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 bg-pink-50/20 border border-pink-200 rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none focus:border-[#E91E8C]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setActiveMediaTarget('shopBannerUrl');
                    setMediaModalOpen(true);
                  }}
                  className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] text-xs font-bold rounded-xl border border-pink-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  <ImageIcon size={14} />
                  <span>Media Library</span>
                </button>
              </div>
            </div>

            {/* Editorial Sidebar Quote */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-extrabold text-gray-800">Editorial Sidebar Wisdom Quote</label>
              <textarea
                rows={2}
                value={shopTheme.quoteText}
                onChange={(e) => setShopTheme({ ...shopTheme, quoteText: e.target.value })}
                placeholder='"Skin is the mirror of your soul..."'
                className="w-full bg-pink-50/20 border border-pink-200 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#E91E8C]"
              />
            </div>

            {/* Quote Author */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-gray-800">Quote Author / Source Label</label>
              <input
                type="text"
                value={shopTheme.quoteAuthor}
                onChange={(e) => setShopTheme({ ...shopTheme, quoteAuthor: e.target.value })}
                placeholder="e.g. Korean Skin Food Wisdom"
                className="w-full bg-pink-50/20 border border-pink-200 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#E91E8C]"
              />
            </div>

            {/* Products per page */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-gray-800">Products Per Page Load</label>
              <select
                value={shopTheme.itemsPerPage}
                onChange={(e) => setShopTheme({ ...shopTheme, itemsPerPage: Number(e.target.value) })}
                className="w-full bg-pink-50/20 border border-pink-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#E91E8C] cursor-pointer"
              >
                <option value={8}>8 Products</option>
                <option value={12}>12 Products (Recommended)</option>
                <option value={16}>16 Products</option>
                <option value={24}>24 Products</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="bg-white p-8 rounded-[28px] border border-pink-100 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto text-[#E91E8C]">
            <Phone size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Contact Us Page Theme Editor</h2>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            This structure is ready for the Contact Us page layout. Custom section editing system for office address, customer support hotline, and map widget will be integrated in the next module.
          </p>
          <div className="pt-2">
            <span className="px-4 py-1.5 bg-pink-50 text-[#E91E8C] text-xs font-bold rounded-full border border-pink-200 inline-block">
              Structure Reserved • Home Page Customizer Ready
            </span>
          </div>
        </div>
      )}

      {/* Cloudinary Media Library Modal */}
      <MediaLibraryModal
        isOpen={mediaModalOpen}
        onClose={() => {
          setMediaModalOpen(false);
          setActiveMediaTarget(null);
        }}
        onSelectImage={handleSelectMediaUrl}
        title="Select Theme Image Asset"
      />

      {/* Live Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex flex-col p-2 md:p-6">
          <div className="bg-slate-900 text-white p-4 rounded-t-3xl flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Eye className="text-[#E91E8C]" size={20} />
              <span className="font-extrabold text-sm">Live Theme Preview</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-pink-300 hover:text-white flex items-center gap-1 font-bold"
              >
                <span>Open in New Tab</span>
                <ExternalLink size={12} />
              </a>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
          <div className="flex-1 bg-[#fff8f5] overflow-y-auto rounded-b-3xl">
            <iframe
              src="/"
              className="w-full h-full border-none"
              title="Home Page Live Storefront Preview"
            />
          </div>
        </div>
      )}

    </div>
  );
};
