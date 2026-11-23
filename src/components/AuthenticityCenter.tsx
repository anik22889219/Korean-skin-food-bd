import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Barcode,
  PackageCheck,
  Clock,
  AlertTriangle,
  Truck,
  MessageCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { SeoHead } from './SeoHead';
import { buildAuthenticitySeo } from '../services/seoService';
import { useCart } from '../context/CartContext';
import { themeService, DEFAULT_PAGES_THEME } from '../services/themeService';
import { AuthenticityPageThemeSettings } from '../types/theme';

export const AuthenticityCenter: React.FC = () => {
  const { language } = useCart();
  const isBn = language === 'bn';
  const seo = React.useMemo(() => buildAuthenticitySeo(), []);
  const [pageTheme, setPageTheme] = React.useState<AuthenticityPageThemeSettings>(
    () => themeService.getPagesTheme().authenticity || DEFAULT_PAGES_THEME.authenticity
  );

  React.useEffect(() => {
    return themeService.subscribePages((pages) => {
      if (pages?.authenticity) setPageTheme(pages.authenticity);
    });
  }, []);

  const inspectionChecklist = [
    {
      icon: PackageCheck,
      titleEN: '1. Outer Seal & Print Crispness',
      titleBN: '১. বাইরের সিল ও প্রিন্টের মান পরীক্ষা',
      descEN: 'Check that the tamper seal or shrink wrap is intact upon arrival, and Korean Hangul/English typography on the box and bottle is sharp without smudging or spelling errors.',
      descBN: 'ডেলিভারি পাওয়ার পর বক্সের সিল অক্ষত আছে কিনা দেখুন এবং বক্স ও বোতলের কোরিয়ান ও ইংরেজি লেখাগুলো স্পষ্ট কিনা যাচাই করুন।'
    },
    {
      icon: Barcode,
      titleEN: '2. Korean Batch Code & Date Format (MFG / EXP)',
      titleBN: '২. ব্যাচ কোড ও তারিখ (MFG / EXP / 까지 / 제조)',
      descEN: 'Most Korean skincare prints dates in YYYY.MM.DD order: "제조" (Je-jo) or "MFG" indicates manufacture date, while "까지" (Kka-ji) or "EXP" marks the unopened expiration date.',
      descBN: 'বেশিরভাগ কোরিয়ান প্রডাক্টে YYYY.MM.DD ফরম্যাটে তারিখ থাকে। "제조" / MFG মানে উৎপাদন তারিখ এবং "까지" / EXP মানে মেয়াদ শেষ হওয়ার তারিখ।'
    },
    {
      icon: Clock,
      titleEN: '3. PAO Symbol (Period After Opening)',
      titleBN: '৩. খোলার পর ব্যবহারের সময়সীমা (PAO: 6M / 12M)',
      descEN: 'Look for the open-jar icon (e.g. 6M or 12M). Once you unseal a product, follow the months shown—especially for oxidized-sensitive actives like Vitamin C or Retinoids.',
      descBN: 'খোলা কৌটার চিহ্নে 6M বা 12M লেখা থাকলে প্রডাক্টটি খোলার পর ৬ বা ১২ মাসের মধ্যে ব্যবহার করা ভালো—বিশেষত ভিটামিন সি বা রেটিনয়েডসের ক্ষেত্রে।'
    },
    {
      icon: ShieldCheck,
      titleEN: '4. 48-Hour Damaged or Wrong-Item Support',
      titleBN: '৪. ৪৮ ঘণ্টার মধ্যে ড্যামেজ বা ভুল পণ্যের সহায়তা',
      descEN: 'Keep the product sealed if something looks wrong. Contact us within 48 hours of delivery with clear photos or an unboxing video so our support team can assist promptly.',
      descBN: 'প্যাকেজ ভাঙা, লিক বা ভুল আইটেম পেলে প্রডাক্টের সিল না খুলে ডেলিভারির ৪৮ ঘণ্টার মধ্যে ছবি বা আনবক্সিং ভিডিওসহ আমাদের সাপোর্টে জানান।'
    }
  ];

  const policyCards = [
    {
      titleEN: 'Transparent COD Delivery',
      titleBN: 'স্বচ্ছ ক্যাশ অন ডেলিভারি',
      bodyEN: '৳80 inside Dhaka City (typically 24–48 hrs) and ৳150 outside Dhaka (typically 3–5 business days). Free delivery automatically applies on orders above ৳2,000.',
      bodyBN: 'ঢাকা সিটির ভেতরে ৳৮০ এবং ঢাকার বাইরে ৳১৫০। ৳২,০০০+ অর্ডারে ফ্রি ডেলিভারি প্রযোজ্য।'
    },
    {
      titleEN: 'Sealed Hygiene Policy',
      titleBN: 'সিল ও হাইজিন নীতিমালা',
      bodyEN: 'Because skincare items are personal care products, opened, swatched, or unsealed items cannot be returned unless a physical defect or courier damage occurred.',
      bodyBN: 'ব্যক্তিগত স্কিন কেয়ার পণ্য হওয়ায় সিল খোলা বা ব্যবহৃত পণ্য ফেরত নেওয়া হয় না, তবে ত্রুটি বা ড্যামেজ থাকলে সহায়তা করা হয়।'
    },
    {
      titleEN: '24-Hour Patch Test Reminder',
      titleBN: '২৪ ঘণ্টার প্যাচ টেস্ট পরামর্শ',
      bodyEN: 'Skin sensitivity varies per person. Always patch test exfoliating acids (AHA/BHA), Retinol, or high-strength Vitamin C along the jawline or inner wrist before full facial use.',
      bodyBN: 'প্রত্যেকের ত্বক আলাদা—AHA/BHA, রেটিনল বা উচ্চ মাত্রার ভিটামিন সি ব্যবহারের আগে কানের পেছনে বা হাতে ২৪ ঘণ্টা প্যাচ টেস্ট করুন।'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FFF5F8]/50 py-10 px-4 sm:px-6 lg:px-10">
      <SeoHead metadata={seo} />
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Hero Header */}
        <section className="bg-white rounded-3xl border border-pink-100 shadow-sm p-6 sm:p-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-pink-50 border border-pink-100 text-[#E91E8C] px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider">
            <ShieldCheck size={15} />
            <span>{isBn ? pageTheme.badgeBN : pageTheme.badgeEN}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">
            {isBn ? pageTheme.titleBN : pageTheme.titleEN}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
            {isBn ? pageTheme.subtitleBN : pageTheme.subtitleEN}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to={pageTheme.primaryCtaLink || '/shop'}
              className="px-5 py-2.5 bg-[#E91E8C] hover:bg-[#d8177f] text-white rounded-xl text-xs font-extrabold inline-flex items-center gap-2 transition shadow-sm"
            >
              <span>{isBn ? pageTheme.primaryCtaBN : pageTheme.primaryCtaEN}</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              to={pageTheme.secondaryCtaLink || '/contact-us'}
              className="px-5 py-2.5 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] border border-pink-200 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 transition"
            >
              <MessageCircle size={14} />
              <span>{isBn ? pageTheme.secondaryCtaBN : pageTheme.secondaryCtaEN}</span>
            </Link>
          </div>
        </section>

        {/* 4-Step Inspection Grid */}
        {pageTheme.showChecklist && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {inspectionChecklist.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="bg-white rounded-2xl border border-pink-100 p-6 shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 text-[#E91E8C] flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <h2 className="text-base font-black text-slate-900">
                    {isBn ? step.titleBN : step.titleEN}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {isBn ? step.descBN : step.descEN}
                  </p>
                </div>
              );
            })}
          </section>
        )}

        {/* Korean Date Code Quick Reference */}
        {pageTheme.showDateCodes && (
          <section className="bg-white rounded-3xl border border-pink-100 p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Barcode className="text-[#E91E8C]" size={20} />
              <h2 className="text-lg font-black text-slate-900">
                {isBn ? pageTheme.dateCodesHeadingBN : pageTheme.dateCodesHeadingEN}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-pink-50/40 border border-pink-100 space-y-1">
                <p className="font-mono font-black text-[#E91E8C] text-sm">제조 (Je-jo) / MFG</p>
                <p className="font-bold text-slate-800">{isBn ? 'উৎপাদনের তারিখ' : 'Manufacturing Date'}</p>
                <p className="text-slate-600 leading-relaxed">
                  {isBn
                    ? 'উদাহরণ: 20250615 제조 মানে ১৫ জুন ২০২৫ তারিখে তৈরি হয়েছে (খোলার আগে সাধারণত ২৪–৩৬ মাস মেয়াদ থাকে)।'
                    : 'Example: 20250615 제조 means manufactured on 15 June 2025 (do not confuse this with expiration date).'}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-1">
                <p className="font-mono font-black text-emerald-700 text-sm">까지 (Kka-ji) / EXP</p>
                <p className="font-bold text-slate-800">{isBn ? 'মেয়াদ উত্তীর্ণের তারিখ' : 'Expiration Date'}</p>
                <p className="text-slate-600 leading-relaxed">
                  {isBn
                    ? 'উদাহরণ: 20280310 까지 মানে ১০ মার্চ ২০২৮ পর্যন্ত সিলবদ্ধ অবস্থায় মেয়াদ থাকবে।'
                    : 'Example: 20280310 까지 means best used by 10 March 2028 while unopened.'}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-100 space-y-1">
                <p className="font-mono font-black text-amber-800 text-sm">6M / 12M / 24M</p>
                <p className="font-bold text-slate-800">{isBn ? 'খোলার পরের সময়সীমা' : 'Period After Opening'}</p>
                <p className="text-slate-600 leading-relaxed">
                  {isBn
                    ? 'সিল খোলার দিন থেকে কত মাসের মধ্যে পণ্যটি ব্যবহার করা নিরাপদ তা নির্দেশ করে।'
                    : 'Indicates how many months the formula stays optimal once exposed to air after opening.'}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Shipping, Returns & Patch-Test Cards */}
        {pageTheme.showPolicyCards && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {policyCards.map((card, i) => (
              <div key={i} className="bg-white rounded-2xl border border-pink-100 p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-[#E91E8C] font-black text-xs uppercase tracking-wider">
                  {i === 0 ? <Truck size={15} /> : i === 1 ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                  <span>{isBn ? card.titleBN : card.titleEN}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isBn ? card.bodyBN : card.bodyEN}
                </p>
              </div>
            ))}
          </section>
        )}

        {/* Footer Links Strip */}
        {pageTheme.showHelpBanner && (
          <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-black">
                {isBn ? pageTheme.helpTitleBN : pageTheme.helpTitleEN}
              </h3>
              <p className="text-xs text-slate-300">
                {isBn ? pageTheme.helpSubtitleBN : pageTheme.helpSubtitleEN}
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <Link
                to={pageTheme.helpSecondaryLink || '/terms-of-service'}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition"
              >
                {isBn ? pageTheme.helpSecondaryLabelBN : pageTheme.helpSecondaryLabelEN}
              </Link>
              <Link
                to={pageTheme.helpPrimaryLink || '/contact-us'}
                className="px-4 py-2 bg-[#E91E8C] hover:bg-[#d8177f] rounded-xl text-xs font-extrabold transition"
              >
                {isBn ? pageTheme.helpPrimaryLabelBN : pageTheme.helpPrimaryLabelEN}
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
