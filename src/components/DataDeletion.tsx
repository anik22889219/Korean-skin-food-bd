import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  Trash2,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  FileText,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Copy,
  Check,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { SeoHead } from './SeoHead';
import { buildStaticPageSeo } from '../services/seoService';
import { themeService, DEFAULT_GLOBAL_THEME } from '../services/themeService';
import { GlobalThemeSettings } from '../types/theme';

interface DeletionSection {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
}

interface DeletionStatusData {
  confirmationCode: string;
  status: 'pending' | 'in_progress' | 'completed';
  source?: string;
  requestedAt?: string;
  updatedAt?: string;
}

const DATA_DELETION_SECTIONS: DeletionSection[] = [
  {
    id: 'scope',
    title: '1. Data Covered by Deletion Requests',
    body: 'Korean Skin Food BD respects your right to control and permanently remove personal data associated with your account, Facebook Login or Meta app interactions, skincare consultations, and newsletter preferences. Upon a verified deletion request, we permanently erase or anonymize:',
    bullets: [
      'Account profile details (full name, email address, phone number, and profile avatar).',
      'Saved delivery addresses, wishlist items, skin profile quiz results, and AM/PM skincare routines.',
      'Creator program applications and social profile links (subject to active campaign settlement).',
      'Facebook/Meta app-scoped identifiers and consultation chat messages linked to your account.',
    ],
  },
  {
    id: 'facebook-app-steps',
    title: '2. Remove App Access via Facebook Settings',
    body: 'If you connected or interacted with Korean Skin Food BD using Facebook, you can revoke app access and initiate an automated deletion request directly from your Facebook account:',
    bullets: [
      'Log in to your Facebook account and open Settings & Privacy -> Settings.',
      'Select Apps and Websites (or Security and Login -> Apps and Websites) in the settings menu.',
      'Locate Korean Skin Food BD in your active apps list and click Remove.',
      'Check the option to delete all data and activity shared with Korean Skin Food BD, then confirm.',
      'Facebook will notify our deletion endpoint automatically and provide a confirmation link and tracking code.',
    ],
  },
  {
    id: 'direct-request',
    title: '3. Request Manual Deletion Directly',
    body: 'You do not need an automated form to delete your data. Contact our Privacy & Customer Care Desk through any of the official channels below using the email address or phone number associated with your Korean Skin Food BD account:',
    bullets: [
      'Send an email with the subject "Data Deletion Request" to our Privacy Desk.',
      'Include your full name, registered email address or phone number, and whether you signed in via Google or Facebook.',
      'For faster identity verification, send the request from your registered email address or verified WhatsApp number.',
    ],
  },
  {
    id: 'timeline',
    title: '4. Verification & Processing Timeline',
    body: 'To protect customers against unauthorized account removal, we verify ownership before erasing records. Once verified:',
    bullets: [
      'Acknowledgment: You receive confirmation within 48 business hours.',
      'Standard Completion: Account profiles, saved routines, wishlists, and social identifiers are permanently purged within 7 business days (maximum 30 days for backup rotation).',
      'Irreversible Action: Once completed, deleted accounts, loyalty points, and saved skincare profiles cannot be restored.',
    ],
  },
  {
    id: 'exceptions',
    title: '5. Statutory & Order Retention Exceptions',
    body: 'Certain limited transaction records may be retained strictly where required by Bangladesh commercial, tax, or fraud-prevention laws—such as finalized cash/courier invoices and dispute logs—for the minimum statutory retention period, isolated from marketing or promotional systems.',
  },
  {
    id: 'contact',
    title: '6. Privacy & Data Deletion Contact Desk',
    body: 'Reach out directly to our Data Protection & Customer Support team for any deletion request, confirmation code inquiry, or privacy question:',
  },
];

export const DataDeletion: React.FC = () => {
  const [searchParams] = useSearchParams();
  const confirmationCodeParam = (searchParams.get('code') || '').trim();

  const [globalTheme, setGlobalTheme] = useState<GlobalThemeSettings>(() => themeService.getGlobalTheme());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusState, setStatusState] = useState<{
    loading: boolean;
    data: DeletionStatusData | null;
    error: string | null;
  }>({
    loading: Boolean(confirmationCodeParam),
    data: null,
    error: null,
  });

  useEffect(() => {
    const unsub = themeService.subscribeGlobal((gt) => {
      setGlobalTheme(gt);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!confirmationCodeParam) {
      setStatusState({ loading: false, data: null, error: null });
      return;
    }

    let cancelled = false;
    setStatusState({ loading: true, data: null, error: null });

    fetch(`/api/facebook/data-deletion/status?code=${encodeURIComponent(confirmationCodeParam)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.success) {
          throw new Error(body?.error || 'Confirmation code not found.');
        }
        if (!cancelled) {
          setStatusState({
            loading: false,
            data: {
              confirmationCode: body.confirmationCode,
              status: body.status || 'pending',
              source: body.source,
              requestedAt: body.requestedAt,
              updatedAt: body.updatedAt,
            },
            error: null,
          });
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setStatusState({
            loading: false,
            data: null,
            error: err?.message || 'Unable to verify confirmation code.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [confirmationCodeParam]);

  const dataDeletionSeo = React.useMemo(
    () =>
      buildStaticPageSeo(
        'User Data Deletion Instructions | Facebook & App Privacy',
        'Step-by-step instructions to request permanent deletion of your personal data and Facebook app data from Korean Skin Food BD.',
        '/data-deletion',
        [
          'Data Deletion',
          'Facebook Data Deletion',
          'Meta App Privacy',
          'Korean Skin Food BD data removal',
        ]
      ),
    []
  );

  const contactEmail = globalTheme.contactEmail || DEFAULT_GLOBAL_THEME.contactEmail || 'koreanskinfood.bd@gmail.com';
  const contactPhone = globalTheme.contactPhone || DEFAULT_GLOBAL_THEME.contactPhone || '+880 1755-837545';
  const contactAddress = globalTheme.contactAddress || DEFAULT_GLOBAL_THEME.contactAddress || 'Banani Road 11, Dhaka, Bangladesh';
  const messengerUrl = globalTheme.messengerUrl || DEFAULT_GLOBAL_THEME.messengerUrl || 'https://m.me/651561268050601';
  const cleanPhone = contactPhone.replace(/\s+/g, '');

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCopy = (value: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(value).then(() => {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1800);
      }).catch(() => {});
    }
  };

  const formatStatusLabel = (status: DeletionStatusData['status']) => {
    if (status === 'completed') return 'Completed — Data Purged';
    if (status === 'in_progress') return 'In Progress — Verification & Removal';
    return 'Pending Review — Request Received';
  };

  const formatIsoDate = (iso?: string) => {
    if (!iso) return 'N/A';
    try {
      return new Date(iso).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="w-full bg-[#FFFBFD] text-gray-800 min-h-screen py-8 md:py-12">
      <SeoHead metadata={dataDeletionSeo} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <Link to="/" className="hover:text-[#E91E8C] transition-colors">
            Home
          </Link>
          <ChevronRight size={14} className="text-gray-400" />
          <Link to="/privacy-policy" className="hover:text-[#E91E8C] transition-colors">
            Privacy Policy
          </Link>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-gray-900 font-bold">User Data Deletion</span>
        </nav>

        {/* Hero Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-500 via-[#E91E8C] to-rose-600 text-white p-8 md:p-12 shadow-xl shadow-pink-500/10"
        >
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-pink-100">
              <Trash2 size={14} className="text-pink-100 shrink-0" />
              <span>Meta &amp; Customer Privacy Compliance</span>
              <span aria-hidden="true">·</span>
              <span>Updated November 2026</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-balance">
              User Data Deletion Instructions
            </h1>
            <p className="text-sm md:text-base text-pink-100 font-medium leading-relaxed">
              Clear instructions for removing Facebook app access and permanently deleting your personal account information from Korean Skin Food Bangladesh.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3 text-xs font-semibold text-pink-100">
              <span>Applies to: Web Storefront, Facebook App &amp; Customer Accounts</span>
              <span aria-hidden="true">·</span>
              <span>Response within 48 hours</span>
            </div>
          </div>
        </motion.div>

        {/* Conditional Meta Callback Confirmation Status Banner (shown only when ?code= is provided) */}
        {confirmationCodeParam && (
          <section
            aria-live="polite"
            className="bg-white border border-pink-200 rounded-2xl p-6 shadow-sm space-y-3"
          >
            {statusState.loading ? (
              <div className="flex items-center gap-3 text-sm font-semibold text-gray-600">
                <Clock size={18} className="text-[#E91E8C] animate-spin shrink-0" />
                <span>Checking deletion request status for code <span className="font-mono tabular-nums text-gray-900">{confirmationCodeParam}</span>...</span>
              </div>
            ) : statusState.data ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>Meta Automated Data Deletion Request Verified</span>
                  </div>
                  <h2 className="text-lg font-black text-gray-900">
                    Status: {formatStatusLabel(statusState.data.status)}
                  </h2>
                  <p className="text-xs text-gray-600 font-medium">
                    Requested: <span className="font-semibold text-gray-800">{formatIsoDate(statusState.data.requestedAt)}</span>
                    <span className="mx-2" aria-hidden="true">·</span>
                    Last Updated: <span className="font-semibold text-gray-800">{formatIsoDate(statusState.data.updatedAt)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-pink-50/70 border border-pink-100 rounded-xl px-4 py-2.5 shrink-0">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Confirmation Code
                    </span>
                    <span className="text-sm font-bold font-mono tabular-nums text-gray-900">
                      {statusState.data.confirmationCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(statusState.data!.confirmationCode, 'code')}
                    className="p-2 rounded-lg hover:bg-white text-[#E91E8C] transition-colors cursor-pointer"
                    aria-label="Copy confirmation code"
                    title="Copy confirmation code"
                  >
                    {copiedKey === 'code' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h2 className="text-sm font-black text-gray-900">
                    Deletion Tracking Code Not Found
                  </h2>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    We could not locate an automated request matching code{' '}
                    <span className="font-mono font-bold text-gray-900">{confirmationCodeParam}</span>.
                    If you submitted a request via Facebook or email, please contact our Privacy Desk below with your code.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Content Layout: Sticky Table of Contents + Detailed Instructions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sticky Navigation */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
            <div className="bg-white border border-pink-100 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <FileText size={16} className="text-[#E91E8C]" />
                <span>Instructions Overview</span>
              </h3>
              <nav className="space-y-1.5 text-xs font-semibold text-gray-600">
                {DATA_DELETION_SECTIONS.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-pink-50 hover:text-[#E91E8C] transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <span>{sec.title}</span>
                    <ChevronRight
                      size={13}
                      className="text-gray-300 group-hover:text-[#E91E8C] group-hover:translate-x-0.5 transition-all"
                    />
                  </button>
                ))}
              </nav>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-white border border-pink-100/70 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="w-9 h-9 rounded-xl bg-[#E91E8C]/10 text-[#E91E8C] flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">
                Verified Data Removal Guarantee
              </h4>
              <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                Korean Skin Food BD processes every verified deletion request without hidden fees or lock-in, permanently erasing profile, routine, and social data.
              </p>
            </div>
          </aside>

          {/* Right Main Instructions Body */}
          <main className="lg:col-span-8 bg-white border border-pink-100/70 rounded-3xl p-6 sm:p-10 shadow-sm space-y-10">
            {DATA_DELETION_SECTIONS.map((sec, idx) => (
              <section key={sec.id} id={sec.id} className="space-y-4 scroll-mt-24">
                <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 text-[#E91E8C] flex items-center justify-center font-bold text-sm shrink-0">
                    {idx + 1}
                  </div>
                  <h2 className="text-lg md:text-xl font-black text-gray-900">
                    {sec.title.replace(/^\d+\.\s*/, '')}
                  </h2>
                </div>

                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {sec.body}
                </p>

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

                {idx === DATA_DELETION_SECTIONS.length - 1 && (
                  <div className="bg-pink-50/50 border border-pink-100 rounded-2xl p-5 space-y-4 text-xs font-semibold text-gray-700 mt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#E91E8C] text-white flex items-center justify-center shrink-0">
                          <Mail size={15} />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[10px] text-pink-600 uppercase tracking-wider font-bold">
                            Privacy &amp; Data Deletion Email
                          </span>
                          <a
                            href={`mailto:${contactEmail}?subject=${encodeURIComponent('Data Deletion Request - Korean Skin Food BD')}`}
                            className="hover:text-[#E91E8C] text-gray-900 font-bold transition-colors truncate block"
                          >
                            {contactEmail}
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(contactEmail, 'email')}
                        className="px-3 py-1.5 rounded-lg bg-white border border-pink-100 text-gray-700 hover:text-[#E91E8C] text-[11px] font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                      >
                        {copiedKey === 'email' ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedKey === 'email' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Phone size={15} />
                      </div>
                      <div>
                        <span className="block text-[10px] text-emerald-600 uppercase tracking-wider font-bold">
                          Customer Helpline / WhatsApp
                        </span>
                        <a
                          href={`tel:${cleanPhone}`}
                          className="hover:text-emerald-700 text-gray-900 font-bold font-mono tabular-nums transition-colors"
                        >
                          {contactPhone}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#0084FF] text-white flex items-center justify-center shrink-0">
                        <MessageSquare size={15} />
                      </div>
                      <div>
                        <span className="block text-[10px] text-[#0084FF] uppercase tracking-wider font-bold">
                          Facebook Messenger Support
                        </span>
                        <a
                          href={messengerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-[#0084FF] text-gray-900 font-bold transition-colors"
                        >
                          Message Korean Skin Food BD on Messenger
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                        <MapPin size={15} />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                          Registered Office
                        </span>
                        <span className="text-gray-900 font-bold">{contactAddress}</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            ))}
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
