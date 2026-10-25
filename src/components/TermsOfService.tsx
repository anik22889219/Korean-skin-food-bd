import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  FileCheck, ShieldCheck, Truck, RefreshCw, AlertTriangle, 
  Sparkles, Scale, Mail, Phone, MapPin, ChevronRight, ArrowLeft,
  CheckCircle2, DollarSign, HeartHandshake
} from 'lucide-react';
import { SeoHead } from './SeoHead';
import { buildStaticPageSeo } from '../services/seoService';

export const TermsOfService: React.FC = () => {
  const termsSeo = React.useMemo(() => buildStaticPageSeo(
    'Terms of Service - Store Policies & Authenticity Terms',
    'Review Korean Skin Food Bangladesh terms of service. Understand our 100% genuine Seoul import guarantee, shipping rates, cash on delivery, and return policies.',
    '/terms-of-service',
    ['Terms of Service', 'Korean Skin Food terms', 'K-Beauty store policy Bangladesh', 'Authenticity guarantee Dhaka']
  ), []);

  const sections = [
    { id: 'authenticity', title: '1. 100% Genuine Import Guarantee' },
    { id: 'orders-pricing', title: '2. Pricing, Currency & Orders' },
    { id: 'shipping-delivery', title: '3. Shipping & Cash on Delivery' },
    { id: 'returns-refunds', title: '4. Returns, Exchanges & Refunds' },
    { id: 'skincare-disclaimer', title: '5. Skincare Advice & Disclaimer' },
    { id: 'accounts-conduct', title: '6. User, Wholesale & Creator Accounts' },
    { id: 'intellectual-property', title: '7. Intellectual Property' },
    { id: 'governing-law', title: '8. Governing Law & Jurisdiction' },
    { id: 'contact', title: '9. Customer Care & Inquiries' }
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full bg-[#FFFBFD] text-gray-800 min-h-screen py-8 md:py-12">
      <SeoHead metadata={termsSeo} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <Link to="/" className="hover:text-[#E91E8C] transition-colors">Home</Link>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-gray-900 font-bold">Terms of Service</span>
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
              <span>Customer Agreement &amp; Store Terms</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Terms of Service
            </h1>
            <p className="text-sm md:text-base text-pink-100 font-medium leading-relaxed">
              Welcome to Korean Skin Food Bangladesh. Please read these terms carefully before placing an order or using our online store. By using our website and services, you agree to these legal conditions.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-pink-100">
              <span className="bg-white/15 px-3 py-1 rounded-lg">Effective: 2026 / Ongoing</span>
              <span className="bg-white/15 px-3 py-1 rounded-lg">Governed by: Laws of Bangladesh</span>
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
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-pink-50 hover:text-[#E91E8C] transition-colors flex items-center justify-between group"
                  >
                    <span>{sec.title}</span>
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-[#E91E8C] group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </nav>
            </div>

            {/* Authenticity Pill */}
            <div className="bg-gradient-to-br from-pink-50 to-white border border-pink-100/70 rounded-2xl p-5 shadow-sm space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#E91E8C]/10 text-[#E91E8C] flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">
                100% Genuine Imported Skincare
              </h4>
              <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                Directly imported from licensed Korean cosmeceutical laboratories in Seoul. Every bottle is authenticated with genuine batch barcodes and manufacturer seals.
              </p>
            </div>
          </aside>

          {/* Right Main Legal Articles */}
          <main className="lg:col-span-8 bg-white border border-pink-100/70 rounded-3xl p-6 sm:p-10 shadow-sm space-y-12">

            {/* 1. Authenticity Guarantee */}
            <section id="authenticity" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  100% Genuine Import Guarantee
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed">
                Korean Skin Food Bangladesh guarantees that every single product listed on our store is 100% genuine and sourced directly from licensed cosmetic laboratories and authorized brand channels in Seoul, South Korea.
              </p>
              <div className="bg-pink-50/30 border border-pink-100/60 p-4 rounded-2xl space-y-2 text-xs sm:text-sm text-gray-700">
                <p className="font-semibold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#E91E8C]" />
                  Money-Back Authenticity Commitment
                </p>
                <p className="text-gray-600 text-xs leading-relaxed">
                  If any product purchased through Korean Skin Food Bangladesh is ever verified to be counterfeit by authorized laboratory analysis, we will provide a 100% instant refund with our sincere apologies.
                </p>
              </div>
            </section>

            {/* 2. Pricing, Currency & Orders */}
            <section id="orders-pricing" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Pricing, Currency &amp; Order Acceptance
                </h2>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-gray-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                  <span><strong>Bangladeshi Taka (BDT):</strong> All prices are displayed in Bangladeshi Taka (৳ / BDT) and reflect direct import duties and statutory fees.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                  <span><strong>Price Adjustments:</strong> While we endeavor to keep prices stable, fluctuations in international exchange rates (KRW/USD/BDT) or shipping tariffs may lead to price changes without prior notice. The price shown at order checkout is final for that order.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                  <span><strong>Order Verification:</strong> Orders may require phone or SMS confirmation before shipment to verify recipient availability and delivery address details. We reserve the right to cancel unconfirmed or fraudulent orders.</span>
                </li>
              </ul>
            </section>

            {/* 3. Shipping & Cash on Delivery */}
            <section id="shipping-delivery" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Shipping Rates &amp; Cash on Delivery (COD)
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed">
                We deliver nationwide across all 64 districts in Bangladesh with standard cash on delivery:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="border border-pink-100 p-4 rounded-2xl bg-pink-50/30 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-pink-600 block">Inside Dhaka</span>
                  <span className="text-base font-extrabold text-gray-900 block">৳80 COD</span>
                  <p className="text-gray-500 text-[11px]">Delivery in 24 to 48 hours right to your address.</p>
                </div>
                <div className="border border-pink-100 p-4 rounded-2xl bg-pink-50/30 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-pink-600 block">Outside Dhaka</span>
                  <span className="text-base font-extrabold text-gray-900 block">৳150 COD</span>
                  <p className="text-gray-500 text-[11px]">Delivered in 3 to 5 business days via Steadfast/Paperfly.</p>
                </div>
                <div className="border border-emerald-100 p-4 rounded-2xl bg-emerald-50/40 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Free Shipping</span>
                  <span className="text-base font-extrabold text-emerald-900 block">Above ৳2,000</span>
                  <p className="text-emerald-700 text-[11px]">Applied automatically on cart totals reaching ৳2,000.</p>
                </div>
              </div>
            </section>

            {/* 4. Returns, Exchanges & Refunds */}
            <section id="returns-refunds" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Returns, Exchanges &amp; Refunds Policy
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed">
                Because skincare and cosmetic formulations are personal health products, specific hygiene standards apply to all returns:
              </p>
              <div className="space-y-3 text-xs sm:text-sm text-gray-700 bg-pink-50/20 p-5 rounded-2xl border border-pink-100/50">
                <div className="flex items-start gap-2.5">
                  <RefreshCw size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900">Damaged, Leaking or Incorrect Items:</span> If an item arrives damaged in transit or differs from your order, notify us within <strong>48 hours</strong> of receipt with a photo/video of the unopened product and courier slip. We will replace or refund it immediately at zero additional delivery cost.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900">Hygiene &amp; Safety Restriction:</span> For sanitary reasons, skincare products that have been unsealed, opened, swatched, or used are <strong>non-returnable and non-refundable</strong> unless proven defective by manufacturer batch.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <DollarSign size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900">Refund Processing:</span> Approved refunds will be transferred within 5 to 7 business days via bKash, Nagad, or original payment method.
                  </div>
                </div>
              </div>
            </section>

            {/* 5. Skincare Advice & Disclaimer */}
            <section id="skincare-disclaimer" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  5
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Skincare Consultation &amp; Cosmeceutical Disclaimer
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed">
                Skincare recommendations provided through our customer desk, website chatbot, or WhatsApp advisors are for cosmetic education and routine guidance only.
              </p>
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 text-xs sm:text-sm text-amber-900 space-y-2">
                <div className="font-bold flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span>Important Patch-Testing Notice</span>
                </div>
                <p className="text-amber-800 text-xs leading-relaxed">
                  Individual skin biology differs. Always perform a 24-hour patch test on your inner arm or behind your ear prior to full facial application, particularly when beginning formulations with active ingredients (such as Vitamin C, AHA/BHA, Retinoids, or high-percentage Niacinamide). Korean Skin Food BD is not liable for allergic reactions resulting from individual ingredient sensitivities.
                </p>
              </div>
            </section>

            {/* 6. User, Wholesale & Creator Accounts */}
            <section id="accounts-conduct" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  6
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  User Accounts, Wholesale &amp; Creator Program
                </h2>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                  <span><strong>Account Security:</strong> You are responsible for safeguarding your login credentials and ensuring all shipping information is accurate.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                  <span><strong>Wholesale Partners:</strong> B2B and wholesale customers agree to maintain minimum order quantities (MOQ), respect manufacturer MSRP boundaries, and honor agreed payment terms.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                  <span><strong>Creator Affiliates:</strong> Creators enrolled in our program agree to provide honest, authentic product feedback and adhere to social media advertising disclosure guidelines.</span>
                </li>
              </ul>
            </section>

            {/* 7. Intellectual Property */}
            <section id="intellectual-property" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  7
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Intellectual Property
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed">
                All digital assets, original product photography, Bengali educational translations, branding graphics, logos, and website layouts are proprietary property of Korean Skin Food Bangladesh or licensed by brand manufacturers. Unauthorized scraping, copying, or commercial re-publication is strictly prohibited without written consent.
              </p>
            </section>

            {/* 8. Governing Law & Jurisdiction */}
            <section id="governing-law" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  8
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Governing Law &amp; Jurisdiction
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed">
                These Terms of Service and any contractual disputes arising from transactions on this platform shall be governed by, and construed in accordance with, the laws of the People&apos;s Republic of Bangladesh. All disputes will be subject to the exclusive jurisdiction of the competent courts of Dhaka, Bangladesh.
              </p>
            </section>

            {/* 9. Customer Care & Inquiries */}
            <section id="contact" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  9
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Customer Care &amp; Support Desk
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed">
                If you have questions about our terms, order tracking, or require assistance:
              </p>

              <div className="bg-pink-50/50 border border-pink-100 rounded-2xl p-5 space-y-3 text-xs font-semibold text-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E91E8C] text-white flex items-center justify-center shrink-0">
                    <Mail size={15} />
                  </div>
                  <div>
                    <span className="block text-[10px] text-pink-600 uppercase tracking-wider font-bold">Email Support</span>
                    <a href="mailto:koreanskinfood.bd@gmail.com" className="hover:text-[#E91E8C] text-gray-900 font-bold transition-colors">
                      koreanskinfood.bd@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Phone size={15} />
                  </div>
                  <div>
                    <span className="block text-[10px] text-emerald-600 uppercase tracking-wider font-bold">WhatsApp / Direct Line</span>
                    <a href="tel:+8801755837545" className="hover:text-emerald-700 text-gray-900 font-bold font-mono transition-colors">
                      +880 1755-837545
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                    <MapPin size={15} />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">Store &amp; Office</span>
                    <span className="text-gray-900 font-bold">Banani Road 11, Dhaka, Bangladesh</span>
                  </div>
                </div>
              </div>
            </section>

          </main>
        </div>

        {/* Bottom Back Button & Quick Links */}
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

      </div>
    </div>
  );
};
