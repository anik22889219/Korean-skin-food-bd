import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ShieldCheck, Lock, Eye, Database, Share2, 
  UserCheck, Bell, Mail, Phone, MapPin, 
  FileText, CheckCircle2, ChevronRight, Sparkles,
  HelpCircle, ArrowLeft
} from 'lucide-react';
import { SeoHead } from './SeoHead';
import { buildStaticPageSeo } from '../services/seoService';

export const PrivacyPolicy: React.FC = () => {
  const privacySeo = React.useMemo(() => buildStaticPageSeo(
    'Privacy Policy - Customer Data Protection & Trust',
    'Read Korean Skin Food Bangladesh privacy policy. Learn how we safeguard your personal information, delivery data, and skincare consultation details.',
    '/privacy-policy',
    ['Privacy Policy', 'Data protection', 'Korean Skin Food BD privacy', 'Customer safety Bangladesh']
  ), []);

  const sections = [
    { id: 'collection', title: '1. Information We Collect' },
    { id: 'usage', title: '2. How We Use Your Data' },
    { id: 'sharing', title: '3. Data Sharing & Couriers' },
    { id: 'cookies', title: '4. Cookies & Analytics' },
    { id: 'security', title: '5. Security & Retention' },
    { id: 'rights', title: '6. Your Rights & Choices' },
    { id: 'contact', title: '7. Privacy Contact Desk' },
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full bg-[#FFFBFD] text-gray-800 min-h-screen py-8 md:py-12">
      <SeoHead metadata={privacySeo} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <Link to="/" className="hover:text-[#E91E8C] transition-colors">Home</Link>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-gray-900 font-bold">Privacy Policy</span>
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
              <span>Customer Trust & Data Protection</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Privacy Policy
            </h1>
            <p className="text-sm md:text-base text-pink-100 font-medium leading-relaxed">
              We value the trust you place in Korean Skin Food Bangladesh. This policy transparently explains what data we collect, how we handle your orders and consultations, and how your privacy is vigorously safeguarded.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-pink-100">
              <span className="bg-white/15 px-3 py-1 rounded-lg">Last Updated: October 2026</span>
              <span className="bg-white/15 px-3 py-1 rounded-lg">Applies to: All Web & Store Users</span>
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
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-pink-50 hover:text-[#E91E8C] transition-colors flex items-center justify-between group"
                  >
                    <span>{sec.title}</span>
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-[#E91E8C] group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </nav>
            </div>

            {/* Quick Assurance Box */}
            <div className="bg-gradient-to-br from-pink-50 to-white border border-pink-100/70 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="w-9 h-9 rounded-xl bg-[#E91E8C]/10 text-[#E91E8C] flex items-center justify-center">
                <Lock size={18} />
              </div>
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">
                No Data Selling Guarantee
              </h4>
              <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                Korean Skin Food BD never sells, rents, or trades your personal information, phone numbers, or beauty consults to third-party telemarketers or external brokers.
              </p>
            </div>
          </aside>

          {/* Right Main Legal Articles */}
          <main className="lg:col-span-8 bg-white border border-pink-100/70 rounded-3xl p-6 sm:p-10 shadow-sm space-y-12">
            
            {/* Section 1: Information We Collect */}
            <section id="collection" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Information We Collect
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed font-normal">
                When you visit our online store, create an account, purchase authentic Korean skincare products, or chat with our beauty advisers, we may collect the following types of information:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 text-xs">
                <div className="bg-pink-50/40 p-4 rounded-xl border border-pink-100/50 space-y-1.5">
                  <span className="font-bold text-gray-900 block flex items-center gap-1.5">
                    <UserCheck size={14} className="text-[#E91E8C]" />
                    Personal Identifiers
                  </span>
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    Full name, delivery address, active phone number (used for courier OTP &amp; delivery verification), and email address.
                  </p>
                </div>

                <div className="bg-pink-50/40 p-4 rounded-xl border border-pink-100/50 space-y-1.5">
                  <span className="font-bold text-gray-900 block flex items-center gap-1.5">
                    <Database size={14} className="text-[#E91E8C]" />
                    Order &amp; Transaction Details
                  </span>
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    Purchased items, ordered quantities, invoice values (BDT), payment method (Cash on Delivery or MFS), and delivery status logs.
                  </p>
                </div>

                <div className="bg-pink-50/40 p-4 rounded-xl border border-pink-100/50 space-y-1.5">
                  <span className="font-bold text-gray-900 block flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#E91E8C]" />
                    Skincare Consultation Notes
                  </span>
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    Skin type (Dry, Oily, Combination, Sensitive) and specific concerns (Acne, Hyperpigmentation, Barrier Repair) voluntarily shared to tailor routine advice.
                  </p>
                </div>

                <div className="bg-pink-50/40 p-4 rounded-xl border border-pink-100/50 space-y-1.5">
                  <span className="font-bold text-gray-900 block flex items-center gap-1.5">
                    <Eye size={14} className="text-[#E91E8C]" />
                    Technical &amp; Device Data
                  </span>
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    IP address, device browser, preferred language, and anonymous navigation data to optimize site loading speed and mobile browsing.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: How We Use Your Data */}
            <section id="usage" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  How We Use Your Data
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed">
                We only process your personal information for lawful business purposes, including:
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-gray-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                  <span><strong>Fulfilling &amp; Delivering Orders:</strong> Packaging your genuine Seoul skincare products and dispatching them with regional courier services across Dhaka and Bangladesh.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                  <span><strong>Order Tracking &amp; Customer Support:</strong> Providing SMS, WhatsApp, or phone call notifications regarding delivery tracking, parcel dispatch, and order confirmations.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                  <span><strong>Personalized Skincare Consultations:</strong> Assisting you via WhatsApp or on-site chat to suggest suitable Korean serums, toners, and moisturizers for your skin goals.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                  <span><strong>Fraud Prevention:</strong> Detecting fraudulent orders, fake contact submissions, or automated bot activities to safeguard customers and inventory.</span>
                </li>
              </ul>
            </section>

            {/* Section 3: Data Sharing & Couriers */}
            <section id="sharing" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Data Sharing &amp; Third-Party Partners
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed">
                We strictly limit third-party disclosures to reputable partners essential to delivering your orders:
              </p>
              <div className="space-y-3 text-xs sm:text-sm text-gray-700 bg-pink-50/20 p-4 rounded-2xl border border-pink-100/40">
                <div className="flex items-start gap-2.5">
                  <Share2 size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900">Delivery Logistics:</span> We share only necessary recipient details (Customer Name, Contact Phone, and Delivery Address) with licensed Bangladeshi courier partners (e.g. Steadfast Courier, Paperfly, RedX) to execute deliveries.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Lock size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900">Secure Cloud Hosting:</span> Our website runs on encrypted Google Cloud &amp; Firebase data centers adhering to international ISO 27001 data protection standards.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-gray-900">Legal Compliance:</span> We may disclose information if formally required by law enforcement or competent judicial authorities of Bangladesh.
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Cookies & Analytics */}
            <section id="cookies" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Cookies &amp; Analytics
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed">
                Our web store uses lightweight browser storage and cookies to maintain your shopping cart items, remember your language preferences (English or Bengali), and measure site performance. We employ standard web analytics (e.g., Google Analytics 4 and Meta Conversions API) to understand popular K-Beauty trends. You can disable cookies in your browser settings at any time without impacting basic browsing.
              </p>
            </section>

            {/* Section 5: Security & Retention */}
            <section id="security" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  5
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Data Security &amp; Retention
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed">
                All communications with our store are encrypted end-to-end via Transport Layer Security (TLS/HTTPS). Internal database access is restricted by strict role-based access control (RBAC) to verified administrators only. We retain customer transaction records for the period required by Bangladesh tax regulations and trade guidelines.
              </p>
            </section>

            {/* Section 6: Your Rights & Choices */}
            <section id="rights" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  6
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Your Rights &amp; Choices
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed">
                As our esteemed customer, you hold full control over your personal data:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="border border-pink-100 p-3.5 rounded-xl bg-pink-50/20">
                  <span className="font-bold text-gray-900 block mb-1">Access &amp; Edit</span>
                  <p className="text-gray-600 text-[11px]">View and update your stored delivery address and details via your Customer Profile at any time.</p>
                </div>
                <div className="border border-pink-100 p-3.5 rounded-xl bg-pink-50/20">
                  <span className="font-bold text-gray-900 block mb-1">Opt-Out of Alerts</span>
                  <p className="text-gray-600 text-[11px]">Request to unsubscribe from promotional announcements or WhatsApp campaigns with a single reply.</p>
                </div>
                <div className="border border-pink-100 p-3.5 rounded-xl bg-pink-50/20">
                  <span className="font-bold text-gray-900 block mb-1">Account Deletion</span>
                  <p className="text-gray-600 text-[11px]">Request permanent deletion of your profile and consultation logs by contacting our privacy desk.</p>
                </div>
              </div>
            </section>

            {/* Section 7: Privacy Contact Desk */}
            <section id="contact" className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm">
                  7
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Privacy Contact Desk
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed">
                For questions regarding this policy, to request data correction, or to exercise your privacy rights, please reach out to our dedicated support team:
              </p>
              
              <div className="bg-pink-50/50 border border-pink-100 rounded-2xl p-5 space-y-3 text-xs font-semibold text-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E91E8C] text-white flex items-center justify-center shrink-0">
                    <Mail size={15} />
                  </div>
                  <div>
                    <span className="block text-[10px] text-pink-600 uppercase tracking-wider font-bold">Email Desk</span>
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
                    <span className="block text-[10px] text-emerald-600 uppercase tracking-wider font-bold">Customer Helpline / WhatsApp</span>
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
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">Registered Office</span>
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
            <Link to="/terms-of-service" className="hover:text-[#E91E8C] transition-colors">
              Terms of Service ›
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
