import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  FileCheck, ShieldCheck, Scale, Mail, Phone, MapPin, ChevronRight, ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { SeoHead } from './SeoHead';
import { buildStaticPageSeo } from '../services/seoService';
import { themeService, DEFAULT_PAGES_THEME } from '../services/themeService';
import { TermsPageThemeSettings } from '../types/theme';

export const TermsOfService: React.FC = () => {
  const [termsTheme, setTermsTheme] = useState<TermsPageThemeSettings>(() => themeService.getPagesTheme().terms || DEFAULT_PAGES_THEME.terms);

  useEffect(() => {
    const unsub = themeService.subscribePages((pt) => {
      setTermsTheme(pt.terms || DEFAULT_PAGES_THEME.terms);
    });
    return () => unsub();
  }, []);

  const termsSeo = React.useMemo(() => buildStaticPageSeo(
    `${termsTheme.title} - Store Policies & Authenticity Terms`,
    termsTheme.subtitle,
    '/terms-of-service',
    ['Terms of Service', 'Korean Skin Food terms', 'K-Beauty store policy Bangladesh', 'Authenticity guarantee Dhaka']
  ), [termsTheme.title, termsTheme.subtitle]);

  const sections = termsTheme.sections && termsTheme.sections.length > 0
    ? termsTheme.sections
    : DEFAULT_PAGES_THEME.terms.sections;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const cleanPhone = (termsTheme.contactPhone || '+8801755837545').replace(/\s+/g, '');

  return (
    <div className="w-full bg-[#FFFBFD] text-gray-800 min-h-screen py-8 md:py-12">
      <SeoHead metadata={termsSeo} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <Link to="/" className="hover:text-[#E91E8C] transition-colors">Home</Link>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-gray-900 font-bold">{termsTheme.title}</span>
        </nav>

        {/* Hero Header Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E91E8C] via-pink-600 to-purple-700 text-white p-8 md:p-12 shadow-xl shadow-pink-500/10"
        >
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[11px] font-bold uppercase tracking-wider">
              <FileCheck size={14} className="text-pink-100" />
              <span>{termsTheme.heroBadge}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              {termsTheme.title}
            </h1>
            <p className="text-sm md:text-base text-pink-100 font-medium leading-relaxed">
              {termsTheme.subtitle}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-pink-100">
              <span className="bg-white/15 px-3 py-1 rounded-lg">{termsTheme.effectiveDateLabel}</span>
              <span className="bg-white/15 px-3 py-1 rounded-lg">{termsTheme.jurisdictionLabel}</span>
            </div>
          </div>
        </motion.div>

        {/* Content Layout: Sticky Nav + Terms Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Table of Contents */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
            <div className="bg-white border border-pink-100 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <Scale size={16} className="text-[#E91E8C]" />
                <span>Agreement Sections</span>
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

            {/* Authenticity Card */}
            {termsTheme.showAuthenticityCard && (
              <div className="bg-gradient-to-br from-pink-50 to-white border border-pink-100/70 rounded-2xl p-5 shadow-sm space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E91E8C]/10 text-[#E91E8C] flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">
                  {termsTheme.authenticityCardTitle}
                </h4>
                <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                  {termsTheme.authenticityCardBody}
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

                {sec.id === 'shipping-delivery' && termsTheme.showShippingRates && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="border border-pink-100 p-4 rounded-2xl bg-pink-50/30 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-pink-600 block">Inside Dhaka</span>
                      <span className="text-base font-extrabold text-gray-900 block">{termsTheme.insideDhakaRate}</span>
                      <p className="text-gray-500 text-[11px]">Delivery in 24 to 48 hours right to your address.</p>
                    </div>
                    <div className="border border-pink-100 p-4 rounded-2xl bg-pink-50/30 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-pink-600 block">Outside Dhaka</span>
                      <span className="text-base font-extrabold text-gray-900 block">{termsTheme.outsideDhakaRate}</span>
                      <p className="text-gray-500 text-[11px]">Delivered in 3 to 5 business days via Steadfast/Paperfly.</p>
                    </div>
                    <div className="border border-emerald-100 p-4 rounded-2xl bg-emerald-50/40 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Free Shipping</span>
                      <span className="text-base font-extrabold text-emerald-900 block">{termsTheme.freeShippingThreshold}</span>
                      <p className="text-emerald-700 text-[11px]">Applied automatically when cart total qualifies.</p>
                    </div>
                  </div>
                )}

                {idx === sections.length - 1 && (
                  <div className="bg-pink-50/50 border border-pink-100 rounded-2xl p-5 space-y-3 text-xs font-semibold text-gray-700 mt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E91E8C] text-white flex items-center justify-center shrink-0">
                        <Mail size={15} />
                      </div>
                      <div>
                        <span className="block text-[10px] text-pink-600 uppercase tracking-wider font-bold">Email Support</span>
                        <a href={`mailto:${termsTheme.contactEmail}`} className="hover:text-[#E91E8C] text-gray-900 font-bold transition-colors">
                          {termsTheme.contactEmail}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Phone size={15} />
                      </div>
                      <div>
                        <span className="block text-[10px] text-emerald-600 uppercase tracking-wider font-bold">WhatsApp / Direct Line</span>
                        <a href={`tel:${cleanPhone}`} className="hover:text-emerald-700 text-gray-900 font-bold font-mono transition-colors">
                          {termsTheme.contactPhone}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                        <MapPin size={15} />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">Store &amp; Office</span>
                        <span className="text-gray-900 font-bold">{termsTheme.contactAddress}</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            ))}
          </main>
        </div>

        {/* Bottom Back Button & Quick Links */}
        {termsTheme.showFooterNav && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-pink-100">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-[#E91E8C] transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Return to Shopping</span>
            </Link>

            <div className="flex items-center gap-4 text-xs font-semibold text-gray-600">
              <Link to="/privacy-policy" className="hover:text-[#E91E8C] transition-colors">
                Privacy Policy ›
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

