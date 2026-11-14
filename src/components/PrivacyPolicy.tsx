import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ShieldCheck, Lock, Mail, Phone, MapPin, 
  FileText, CheckCircle2, ChevronRight, ArrowLeft
} from 'lucide-react';
import { SeoHead } from './SeoHead';
import { buildStaticPageSeo } from '../services/seoService';
import { themeService, DEFAULT_PAGES_THEME } from '../services/themeService';
import { PrivacyPageThemeSettings } from '../types/theme';

export const PrivacyPolicy: React.FC = () => {
  const [privacyTheme, setPrivacyTheme] = useState<PrivacyPageThemeSettings>(() => themeService.getPagesTheme().privacy || DEFAULT_PAGES_THEME.privacy);

  useEffect(() => {
    const unsub = themeService.subscribePages((pt) => {
      setPrivacyTheme(pt.privacy || DEFAULT_PAGES_THEME.privacy);
    });
    return () => unsub();
  }, []);

  const privacySeo = React.useMemo(() => buildStaticPageSeo(
    `${privacyTheme.title} - Customer Data Protection & Trust`,
    privacyTheme.subtitle,
    '/privacy-policy',
    ['Privacy Policy', 'Data protection', 'Korean Skin Food BD privacy', 'Customer safety Bangladesh']
  ), [privacyTheme.title, privacyTheme.subtitle]);

  const sections = privacyTheme.sections && privacyTheme.sections.length > 0
    ? privacyTheme.sections
    : DEFAULT_PAGES_THEME.privacy.sections;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const cleanPhone = (privacyTheme.contactPhone || '+8801755837545').replace(/\s+/g, '');

  return (
    <div className="w-full bg-[#FFFBFD] text-gray-800 min-h-screen py-8 md:py-12">
      <SeoHead metadata={privacySeo} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <Link to="/" className="hover:text-[#E91E8C] transition-colors">Home</Link>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-gray-900 font-bold">{privacyTheme.title}</span>
        </nav>

        {/* Hero Header Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-500 via-[#E91E8C] to-rose-600 text-white p-8 md:p-12 shadow-xl shadow-pink-500/10"
        >
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck size={14} className="text-pink-100" />
              <span>{privacyTheme.heroBadge}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              {privacyTheme.title}
            </h1>
            <p className="text-sm md:text-base text-pink-100 font-medium leading-relaxed">
              {privacyTheme.subtitle}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-pink-100">
              <span className="bg-white/15 px-3 py-1 rounded-lg">{privacyTheme.lastUpdatedLabel}</span>
              <span className="bg-white/15 px-3 py-1 rounded-lg">{privacyTheme.appliesToLabel}</span>
            </div>
          </div>
        </motion.div>

        {/* Content Layout: Quick Jump Nav + Detailed Legal Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sticky Navigation on Large Screens */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
            <div className="bg-white border border-pink-100 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <FileText size={16} className="text-[#E91E8C]" />
                <span>Table of Contents</span>
              </h3>
              <nav className="space-y-1.5 text-xs font-semibold text-gray-600">
                {sections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-pink-50 hover:text-[#E91E8C] transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <span>{sec.title}</span>
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-[#E91E8C] group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </nav>
            </div>

            {/* Quick Assurance Box */}
            {privacyTheme.showGuaranteeBox && (
              <div className="bg-gradient-to-br from-pink-50 to-white border border-pink-100/70 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="w-9 h-9 rounded-xl bg-[#E91E8C]/10 text-[#E91E8C] flex items-center justify-center">
                  <Lock size={18} />
                </div>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">
                  {privacyTheme.guaranteeTitle}
                </h4>
                <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                  {privacyTheme.guaranteeBody}
                </p>
              </div>
            )}
          </aside>

          {/* Right Main Legal Articles */}
          <main className="lg:col-span-8 bg-white border border-pink-100/70 rounded-3xl p-6 sm:p-10 shadow-sm space-y-10">
            {sections.map((sec, idx) => (
              <section key={sec.id || idx} id={sec.id} className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm shrink-0">
                    {idx + 1}
                  </div>
                  <h2 className="text-lg md:text-xl font-black text-gray-900">
                    {sec.title.replace(/^\d+\.\s*/, '')}
                  </h2>
                </div>

                {sec.body && (
                  <p className="text-xs sm:text-sm text-gray-650 leading-relaxed whitespace-pre-line">
                    {sec.body}
                  </p>
                )}

                {sec.bullets && sec.bullets.length > 0 && (
                  <ul className="space-y-2.5 text-xs sm:text-sm text-gray-700 pt-1">
                    {sec.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {idx === sections.length - 1 && (
                  <div className="bg-pink-50/50 border border-pink-100 rounded-2xl p-5 space-y-3 text-xs font-semibold text-gray-700 mt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E91E8C] text-white flex items-center justify-center shrink-0">
                        <Mail size={15} />
                      </div>
                      <div>
                        <span className="block text-[10px] text-pink-600 uppercase tracking-wider font-bold">Email Desk</span>
                        <a href={`mailto:${privacyTheme.contactEmail}`} className="hover:text-[#E91E8C] text-gray-900 font-bold transition-colors">
                          {privacyTheme.contactEmail}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Phone size={15} />
                      </div>
                      <div>
                        <span className="block text-[10px] text-emerald-600 uppercase tracking-wider font-bold">Customer Helpline / WhatsApp</span>
                        <a href={`tel:${cleanPhone}`} className="hover:text-emerald-700 text-gray-900 font-bold font-mono transition-colors">
                          {privacyTheme.contactPhone}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                        <MapPin size={15} />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">Registered Office</span>
                        <span className="text-gray-900 font-bold">{privacyTheme.contactAddress}</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            ))}
          </main>
        </div>

        {/* Bottom Back Button & Quick Links */}
        {privacyTheme.showFooterNav && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-pink-100">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-[#E91E8C] transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Return to Shopping</span>
            </Link>

            <div className="flex items-center gap-4 text-xs font-semibold text-gray-600">
              <Link to="/terms-of-service" className="hover:text-[#E91E8C] transition-colors">
                Terms of Service ›
              </Link>
              <Link to="/contact-us" className="hover:text-[#E91E8C] transition-colors">
                Contact Us ›
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

