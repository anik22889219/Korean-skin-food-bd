import React from 'react';
import {
  PageThemeKey,
  PagesThemeSettings,
  FaqEntry,
  LegalArticleSection
} from '../../types/theme';
import {
  Info,
  Phone,
  Shield,
  FileText,
  Sparkles,
  Award,
  Layers,
  BookOpen,
  FileCheck,
  Package,
  LogIn,
  AlertTriangle,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Image as ImageIcon,
  ShieldCheck,
  Droplets,
  HeartPulse,
  ClipboardCheck,
  CalendarClock,
  CreditCard,
  CheckCircle2,
  Trophy,
  Building2,
  User as UserIcon
} from 'lucide-react';

interface PagesThemeEditorsProps {
  activePage: PageThemeKey;
  pagesTheme: PagesThemeSettings;
  onChange: (next: PagesThemeSettings) => void;
  openMediaPicker: (targetPath: string) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
}

const PAGE_HEADERS: Record<PageThemeKey, { title: string; route: string; desc: string; Icon: React.FC<{ size?: number }> }> = {
  about: {
    title: 'About Us Page',
    route: '/about-us',
    desc: 'Edit hero story, founders narrative, quality assurance visuals, community banners & section visibility.',
    Icon: Info,
  },
  contact: {
    title: 'Contact Us Page',
    route: '/contact-us',
    desc: 'Customize customer support channels, inquiry form labels, service promise bullets, and FAQs.',
    Icon: Phone,
  },
  privacy: {
    title: 'Privacy Policy Page',
    route: '/privacy-policy',
    desc: 'Manage policy intro banner, security guarantee card, all legal clauses & contact desk details.',
    Icon: Shield,
  },
  terms: {
    title: 'Terms of Service Page',
    route: '/terms-of-service',
    desc: 'Edit authenticity card, courier COD shipping rates, legal sections & jurisdiction statements.',
    Icon: FileText,
  },
  becomeCreator: {
    title: 'Become a Creator Page',
    route: '/become-a-creator',
    desc: 'Control creator hero copy, stat cards, 6 benefit cards, 4 onboarding steps, tiers header & FAQs.',
    Icon: Sparkles,
  },
  brandsIndex: {
    title: 'Brands Directory Page',
    route: '/brands',
    desc: 'Customize brand directory hero header, search placeholder, featured cards & catalog sections.',
    Icon: Award,
  },
  brandLanding: {
    title: 'Brand Landing Page (/brand/:slug)',
    route: '/brand/:brandSlug',
    desc: 'Set authenticity badge, default hero image, catalog headings, empty state CTA & brand FAQs.',
    Icon: Layers,
  },
  guidesIndex: {
    title: 'Skincare Guides Index Page',
    route: '/guides',
    desc: 'Edit bilingual English & Bengali guide library headlines, badges, filter tabs & read CTAs.',
    Icon: BookOpen,
  },
  guideDetail: {
    title: 'Guide Detail Page (/guide/:slug)',
    route: '/guide/:slug',
    desc: 'Configure bilingual switcher, active ingredients box title, FAQ headings & related products strip.',
    Icon: FileCheck,
  },
  productDetail: {
    title: 'Product Detail Page (/product/:id)',
    route: '/product/:id',
    desc: 'Edit trust badges, social share box, retail/wholesale/WhatsApp CTA labels & reviews/related sections.',
    Icon: Package,
  },
  login: {
    title: 'Login / Sign In Page',
    route: '/login',
    desc: 'Customize customer sign-in welcome headline, subtitle, Google button text & back-to-shop link.',
    Icon: LogIn,
  },
  notFound: {
    title: '404 Not Found Page',
    route: '/404',
    desc: 'Manage missing-page error badge, apology message & quick navigation shortcut labels.',
    Icon: AlertTriangle,
  },
  authenticity: {
    title: 'Authenticity & Inspection Center',
    route: '/authenticity',
    desc: 'Edit bilingual inspection hero copy, MFG/EXP date guide headings, checklist/policy toggles & support CTA banner.',
    Icon: ShieldCheck,
  },
  ingredients: {
    title: 'Ingredients Library (/ingredients & /ingredient/:slug)',
    route: '/ingredients',
    desc: 'Customize glossary badge, EN/BN titles, search placeholder, bottom quiz banner & ingredient detail disclaimer.',
    Icon: Droplets,
  },
  concerns: {
    title: 'Skin Concerns Library (/concerns & /concern/:slug)',
    route: '/concerns',
    desc: 'Control skin-concern directory headlines (EN/BN), card CTA text, detail disclaimers & ingredient/product toggles.',
    Icon: HeartPulse,
  },
  skinQuiz: {
    title: 'Skin Profile Quiz Page',
    route: '/skin-quiz',
    desc: 'Customize quiz badge, EN/BN headings, submit/reset buttons & matched shortlist results header/CTAs.',
    Icon: ClipboardCheck,
  },
  routineBuilder: {
    title: 'AM/PM Routine Builder Page',
    route: '/routine-builder',
    desc: 'Edit routine planner badge, EN/BN titles, AM/PM column headings, button labels & conflict/saved toggles.',
    Icon: CalendarClock,
  },
  checkout: {
    title: 'Retail Checkout Page',
    route: '/checkout',
    desc: 'Customize bilingual checkout headers, empty-cart prompt, COD payment copy, promo box & dispatch note.',
    Icon: CreditCard,
  },
  thankYou: {
    title: 'Order Confirmation / Thank You Page',
    route: '/thank-you',
    desc: 'Edit bilingual confirmation title, receipt/delivery headings, WhatsApp/print button labels & guest reward tip.',
    Icon: CheckCircle2,
  },
  creatorLeaderboard: {
    title: 'Creator Leaderboard Page',
    route: '/creator/leaderboard',
    desc: 'Customize ranking hero badge, headline, subtitle, search placeholder & period/criteria visibility.',
    Icon: Trophy,
  },
  wholesalePortal: {
    title: 'Wholesale Portal & B2B Checkout',
    route: '/wholesale',
    desc: 'Edit Wholesale Dashboard badge/subtitle, B2B checkout title/tier badge & authorization notice.',
    Icon: Building2,
  },
  profile: {
    title: 'Customer Account & Profile Page',
    route: '/profile',
    desc: 'Customize customer profile fallback name, tab labels & role/metrics visibility toggles.',
    Icon: UserIcon,
  },
};

const FieldInput: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  mono?: boolean;
}> = ({ label, value, onChange, placeholder, mono }) => (
  <div className="space-y-1">
    <label className="block text-[11px] font-extrabold text-slate-700">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3.5 py-2 bg-pink-50/20 border border-pink-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#E91E8C] ${
        mono ? 'font-mono' : ''
      }`}
    />
  </div>
);

const FieldTextarea: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  placeholder?: string;
}> = ({ label, value, onChange, rows = 3, placeholder }) => (
  <div className="space-y-1">
    <label className="block text-[11px] font-extrabold text-slate-700">{label}</label>
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3.5 py-2 bg-pink-50/20 border border-pink-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#E91E8C] resize-y"
    />
  </div>
);

const ToggleRow: React.FC<{
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, desc, checked, onChange }) => (
  <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-pink-50/30 border border-pink-100 cursor-pointer hover:bg-pink-50/60 transition">
    <div>
      <span className="text-xs font-extrabold text-slate-800 block">{label}</span>
      {desc && <span className="text-[10px] text-slate-500 block">{desc}</span>}
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 accent-[#E91E8C] rounded cursor-pointer shrink-0"
    />
  </label>
);

const ImageInputField: React.FC<{
  label: string;
  value: string;
  mediaTarget: string;
  onChange: (val: string) => void;
  openMediaPicker: (path: string) => void;
}> = ({ label, value, mediaTarget, onChange, openMediaPicker }) => (
  <div className="space-y-1.5">
    <label className="block text-[11px] font-extrabold text-slate-700">{label}</label>
    <div className="flex gap-2 items-center">
      {value && (
        <img
          src={value}
          alt={label}
          className="w-10 h-10 rounded-lg object-cover border border-pink-200 shrink-0 bg-pink-50"
        />
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
        className="flex-1 min-w-0 px-3.5 py-2 bg-pink-50/20 border border-pink-200 rounded-xl text-xs font-mono text-slate-700 outline-none focus:bg-white focus:border-[#E91E8C]"
      />
      <button
        type="button"
        onClick={() => openMediaPicker(mediaTarget)}
        className="px-3 py-2 bg-pink-50 hover:bg-pink-100 text-[#E91E8C] text-xs font-bold rounded-xl border border-pink-200 transition cursor-pointer flex items-center gap-1.5 shrink-0"
      >
        <ImageIcon size={14} />
        <span>Media</span>
      </button>
    </div>
  </div>
);

const SectionBlock: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <div className="bg-slate-50/60 border border-pink-100 rounded-2xl p-5 space-y-4">
    <div className="border-b border-pink-100/80 pb-2.5">
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const FaqListEditor: React.FC<{
  faqs: FaqEntry[];
  onChange: (next: FaqEntry[]) => void;
}> = ({ faqs, onChange }) => (
  <div className="space-y-3">
    {faqs.map((faq, idx) => (
      <div key={faq.id || idx} className="bg-white p-4 rounded-xl border border-pink-100 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#E91E8C]">
            FAQ #{idx + 1}
          </span>
          <button
            type="button"
            onClick={() => onChange(faqs.filter((_, i) => i !== idx))}
            className="text-rose-500 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <Trash2 size={12} /> Remove
          </button>
        </div>
        <FieldInput
          label="Question"
          value={faq.question}
          onChange={(val) => {
            const copy = [...faqs];
            copy[idx] = { ...copy[idx], question: val };
            onChange(copy);
          }}
        />
        <FieldTextarea
          label="Answer"
          rows={2}
          value={faq.answer}
          onChange={(val) => {
            const copy = [...faqs];
            copy[idx] = { ...copy[idx], answer: val };
            onChange(copy);
          }}
        />
      </div>
    ))}
    <button
      type="button"
      onClick={() =>
        onChange([
          ...faqs,
          { id: `faq-${Date.now()}`, question: 'New Question', answer: 'Answer goes here...' },
        ])
      }
      className="px-4 py-2 bg-white hover:bg-pink-50 text-[#E91E8C] border border-dashed border-pink-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
    >
      <Plus size={14} /> Add FAQ Entry
    </button>
  </div>
);

const LegalSectionsEditor: React.FC<{
  sections: LegalArticleSection[];
  onChange: (next: LegalArticleSection[]) => void;
}> = ({ sections, onChange }) => (
  <div className="space-y-3">
    {sections.map((sec, idx) => (
      <div key={sec.id || idx} className="bg-white p-4 rounded-xl border border-pink-100 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#E91E8C]">
            Clause #{idx + 1}
          </span>
          <button
            type="button"
            onClick={() => onChange(sections.filter((_, i) => i !== idx))}
            className="text-rose-500 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <Trash2 size={12} /> Remove Clause
          </button>
        </div>
        <FieldInput
          label="Section Title"
          value={sec.title}
          onChange={(val) => {
            const copy = [...sections];
            copy[idx] = { ...copy[idx], title: val };
            onChange(copy);
          }}
        />
        <FieldTextarea
          label="Body Text"
          rows={3}
          value={sec.body}
          onChange={(val) => {
            const copy = [...sections];
            copy[idx] = { ...copy[idx], body: val };
            onChange(copy);
          }}
        />
        <FieldTextarea
          label="Bullet Points (optional — one bullet per line)"
          rows={3}
          value={(sec.bullets || []).join('\n')}
          placeholder="Optional list items, each on a new line..."
          onChange={(val) => {
            const copy = [...sections];
            const lines = val
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean);
            copy[idx] = { ...copy[idx], bullets: lines.length > 0 ? lines : undefined };
            onChange(copy);
          }}
        />
      </div>
    ))}
    <button
      type="button"
      onClick={() =>
        onChange([
          ...sections,
          { id: `sec-${Date.now()}`, title: `${sections.length + 1}. New Clause`, body: '' },
        ])
      }
      className="px-4 py-2 bg-white hover:bg-pink-50 text-[#E91E8C] border border-dashed border-pink-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
    >
      <Plus size={14} /> Add Policy / Terms Clause
    </button>
  </div>
);

export const PagesThemeEditors: React.FC<PagesThemeEditorsProps> = ({
  activePage,
  pagesTheme,
  onChange,
  openMediaPicker,
  onSave,
  onReset,
  isSaving,
}) => {
  const meta = PAGE_HEADERS[activePage];
  const HeaderIcon = meta.Icon;

  const updatePage = <K extends PageThemeKey>(key: K, patch: Partial<PagesThemeSettings[K]>) => {
    onChange({
      ...pagesTheme,
      [key]: {
        ...pagesTheme[key],
        ...patch,
      },
    });
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-[28px] border border-pink-100 space-y-6 shadow-sm">
      {/* Shared Top Bar for Active Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pink-100 pb-5">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center text-[#E91E8C] shrink-0">
            <HeaderIcon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold text-slate-900">{meta.title}</h2>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono text-[10px] font-bold">
                {meta.route}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{meta.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            <span>Reset This Page</span>
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-[#E91E8C] hover:bg-[#FF4B91] transition cursor-pointer shadow-md shadow-pink-200 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving...' : 'Save Page Changes'}</span>
          </button>
        </div>
      </div>

      {/* 1. ABOUT US */}
      {activePage === 'about' && (() => {
        const d = pagesTheme.about;
        const set = (patch: Partial<typeof d>) => updatePage('about', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Section Visibility Toggles" subtitle="Show or hide individual narrative sections on About Us">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <ToggleRow label="Hero Banner" checked={d.showHero} onChange={(v) => set({ showHero: v })} />
                <ToggleRow label="Founders' Story" checked={d.showFoundersStory} onChange={(v) => set({ showFoundersStory: v })} />
                <ToggleRow label="Heritage Essentials" checked={d.showHeritageEssentials} onChange={(v) => set({ showHeritageEssentials: v })} />
                <ToggleRow label="Quality Assurance" checked={d.showQualityAssurance} onChange={(v) => set({ showQualityAssurance: v })} />
                <ToggleRow label="Validated Science" checked={d.showValidatedScience} onChange={(v) => set({ showValidatedScience: v })} />
                <ToggleRow label="Human Connection" checked={d.showHumanConnection} onChange={(v) => set({ showHumanConnection: v })} />
                <ToggleRow label="Partnership Selection" checked={d.showPartnershipSelection} onChange={(v) => set({ showPartnershipSelection: v })} />
                <ToggleRow label="Shared Journey" checked={d.showSharedJourney} onChange={(v) => set({ showSharedJourney: v })} />
                <ToggleRow label="Reach & Reliability" checked={d.showReachReliability} onChange={(v) => set({ showReachReliability: v })} />
                <ToggleRow label="Bestselling Rituals" checked={d.showBestsellingRituals} onChange={(v) => set({ showBestsellingRituals: v })} />
                <ToggleRow label="Bottom CTA Banner" checked={d.showBottomBanner} onChange={(v) => set({ showBottomBanner: v })} />
              </div>
            </SectionBlock>

            <SectionBlock title="Hero Header & Editorial Image">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Hero Badge" value={d.heroBadge} onChange={(v) => set({ heroBadge: v })} />
                <FieldInput label="Headline Line 1" value={d.heroTitleLine1} onChange={(v) => set({ heroTitleLine1: v })} />
                <FieldInput label="Headline Highlight" value={d.heroTitleHighlight} onChange={(v) => set({ heroTitleHighlight: v })} />
                <FieldInput label="Primary CTA Text" value={d.heroPrimaryBtnText} onChange={(v) => set({ heroPrimaryBtnText: v })} />
                <FieldInput label="Secondary CTA Text" value={d.heroSecondaryBtnText} onChange={(v) => set({ heroSecondaryBtnText: v })} />
                <FieldInput label="Secondary CTA Link" value={d.heroSecondaryBtnLink} onChange={(v) => set({ heroSecondaryBtnLink: v })} mono />
              </div>
              <FieldTextarea label="Hero Subtitle" value={d.heroSubtitle} onChange={(v) => set({ heroSubtitle: v })} />
              <ImageInputField
                label="Hero Story Image URL"
                value={d.heroImageUrl}
                mediaTarget="pages.about.heroImageUrl"
                onChange={(v) => set({ heroImageUrl: v })}
                openMediaPicker={openMediaPicker}
              />
            </SectionBlock>

            <SectionBlock title="Founders' Story & Heritage Essentials">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Founders Eyebrow" value={d.foundersSubtitle} onChange={(v) => set({ foundersSubtitle: v })} />
                <FieldInput label="Founders Title" value={d.foundersTitle} onChange={(v) => set({ foundersTitle: v })} />
                <FieldInput label="Established Year Label" value={d.foundersEstYear} onChange={(v) => set({ foundersEstYear: v })} />
                <FieldInput label="Council / Team Label" value={d.foundersCouncilLabel} onChange={(v) => set({ foundersCouncilLabel: v })} />
              </div>
              <FieldTextarea label="Founders Pull Quote" rows={2} value={d.foundersQuote} onChange={(v) => set({ foundersQuote: v })} />
              <FieldTextarea label="Founders Narrative Body" rows={3} value={d.foundersBody} onChange={(v) => set({ foundersBody: v })} />
              <ImageInputField
                label="Founders Photo URL"
                value={d.foundersImageUrl}
                mediaTarget="pages.about.foundersImageUrl"
                onChange={(v) => set({ foundersImageUrl: v })}
                openMediaPicker={openMediaPicker}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <FieldInput label="Heritage Eyebrow" value={d.heritageSubtitle} onChange={(v) => set({ heritageSubtitle: v })} />
                <FieldInput label="Heritage Title" value={d.heritageTitle} onChange={(v) => set({ heritageTitle: v })} />
              </div>
            </SectionBlock>

            <SectionBlock title="Quality Assurance & Logistics">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="QA Eyebrow" value={d.qaSubtitle} onChange={(v) => set({ qaSubtitle: v })} />
                <FieldInput label="QA Title" value={d.qaTitle} onChange={(v) => set({ qaTitle: v })} />
                <FieldInput label="Operations Note Title" value={d.qaNoteTitle} onChange={(v) => set({ qaNoteTitle: v })} />
              </div>
              <FieldTextarea label="QA Description" rows={2} value={d.qaDescription} onChange={(v) => set({ qaDescription: v })} />
              <FieldTextarea label="Operations Note Quote" rows={2} value={d.qaNoteQuote} onChange={(v) => set({ qaNoteQuote: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageInputField
                  label="QA Showcase Image URL"
                  value={d.qaMainImageUrl}
                  mediaTarget="pages.about.qaMainImageUrl"
                  onChange={(v) => set({ qaMainImageUrl: v })}
                  openMediaPicker={openMediaPicker}
                />
                <ImageInputField
                  label="QA Note Thumbnail URL"
                  value={d.qaNoteImageUrl}
                  mediaTarget="pages.about.qaNoteImageUrl"
                  onChange={(v) => set({ qaNoteImageUrl: v })}
                  openMediaPicker={openMediaPicker}
                />
              </div>
            </SectionBlock>

            <SectionBlock title="Validation, Community & Bottom Callout">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Validated Science Eyebrow" value={d.validatedSubtitle} onChange={(v) => set({ validatedSubtitle: v })} />
                <FieldInput label="Validated Science Title" value={d.validatedTitle} onChange={(v) => set({ validatedTitle: v })} />
              </div>
              <FieldTextarea label="Validated Science Description" rows={2} value={d.validatedDescription} onChange={(v) => set({ validatedDescription: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Human Connection Eyebrow" value={d.humanSubtitle} onChange={(v) => set({ humanSubtitle: v })} />
                <FieldInput label="Human Connection Title" value={d.humanTitle} onChange={(v) => set({ humanTitle: v })} />
                <FieldInput label="Human Attribution" value={d.humanAttribution} onChange={(v) => set({ humanAttribution: v })} />
              </div>
              <FieldTextarea label="Human Connection Quote" rows={2} value={d.humanQuote} onChange={(v) => set({ humanQuote: v })} />
              <ImageInputField
                label="Human Connection Image URL"
                value={d.humanImageUrl}
                mediaTarget="pages.about.humanImageUrl"
                onChange={(v) => set({ humanImageUrl: v })}
                openMediaPicker={openMediaPicker}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <FieldInput label="Partnership Eyebrow" value={d.partnershipSubtitle} onChange={(v) => set({ partnershipSubtitle: v })} />
                <FieldInput label="Partnership Title" value={d.partnershipTitle} onChange={(v) => set({ partnershipTitle: v })} />
                <FieldInput label="Shared Journey Eyebrow" value={d.sharedJourneySubtitle} onChange={(v) => set({ sharedJourneySubtitle: v })} />
                <FieldInput label="Shared Journey Title" value={d.sharedJourneyTitle} onChange={(v) => set({ sharedJourneyTitle: v })} />
                <FieldInput label="Reach Eyebrow" value={d.reachSubtitle} onChange={(v) => set({ reachSubtitle: v })} />
                <FieldInput label="Reach Title" value={d.reachTitle} onChange={(v) => set({ reachTitle: v })} />
              </div>
              <FieldTextarea label="Reach Description" rows={2} value={d.reachDescription} onChange={(v) => set({ reachDescription: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Bestselling Eyebrow" value={d.bestsellingSubtitle} onChange={(v) => set({ bestsellingSubtitle: v })} />
                <FieldInput label="Bestselling Title" value={d.bestsellingTitle} onChange={(v) => set({ bestsellingTitle: v })} />
              </div>
              <FieldTextarea label="Bestselling Description" rows={2} value={d.bestsellingDescription} onChange={(v) => set({ bestsellingDescription: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-pink-100">
                <FieldInput label="Bottom Banner Eyebrow" value={d.bottomBannerSubtitle} onChange={(v) => set({ bottomBannerSubtitle: v })} />
                <FieldInput label="Bottom Banner Title" value={d.bottomBannerTitle} onChange={(v) => set({ bottomBannerTitle: v })} />
                <FieldInput label="Primary CTA Text" value={d.bottomPrimaryBtnText} onChange={(v) => set({ bottomPrimaryBtnText: v })} />
                <FieldInput label="Primary CTA Link" value={d.bottomPrimaryBtnLink} onChange={(v) => set({ bottomPrimaryBtnLink: v })} mono />
                <FieldInput label="Secondary CTA Text" value={d.bottomSecondaryBtnText} onChange={(v) => set({ bottomSecondaryBtnText: v })} />
                <FieldInput label="Secondary CTA Link" value={d.bottomSecondaryBtnLink} onChange={(v) => set({ bottomSecondaryBtnLink: v })} mono />
              </div>
              <FieldTextarea label="Bottom Banner Description" rows={2} value={d.bottomBannerDescription} onChange={(v) => set({ bottomBannerDescription: v })} />
            </SectionBlock>
          </div>
        );
      })()}

      {/* 2. CONTACT US */}
      {activePage === 'contact' && (() => {
        const d = pagesTheme.contact;
        const set = (patch: Partial<typeof d>) => updatePage('contact', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Header & Support Channels">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Badge Text" value={d.badgeText} onChange={(v) => set({ badgeText: v })} />
                <FieldInput label="Page Title" value={d.title} onChange={(v) => set({ title: v })} />
                <FieldInput label="Channels Card Heading" value={d.channelsHeading} onChange={(v) => set({ channelsHeading: v })} />
                <FieldInput label="WhatsApp Channel Label" value={d.whatsappLabel} onChange={(v) => set({ whatsappLabel: v })} />
                <FieldInput label="WhatsApp / Hotline Number" value={d.whatsappNumber} onChange={(v) => set({ whatsappNumber: v })} />
                <FieldInput label="Email Channel Label" value={d.emailLabel} onChange={(v) => set({ emailLabel: v })} />
                <FieldInput label="Support Email" value={d.emailAddress} onChange={(v) => set({ emailAddress: v })} />
                <FieldInput label="Location Label" value={d.locationLabel} onChange={(v) => set({ locationLabel: v })} />
                <FieldInput label="Location Address" value={d.locationAddress} onChange={(v) => set({ locationAddress: v })} />
              </div>
              <FieldTextarea label="Header Subtitle" value={d.subtitle} onChange={(v) => set({ subtitle: v })} />
            </SectionBlock>

            <SectionBlock title="Service Promise Box & Inquiry Form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleRow label="Show Service Promise Box" checked={d.showPromiseBox} onChange={(v) => set({ showPromiseBox: v })} />
                <ToggleRow label="Show Contact Inquiry Form" checked={d.showInquiryForm} onChange={(v) => set({ showInquiryForm: v })} />
              </div>
              <FieldInput label="Promise Box Heading" value={d.promiseHeading} onChange={(v) => set({ promiseHeading: v })} />
              <FieldTextarea
                label="Promises (one item per line)"
                rows={4}
                value={d.promises.join('\n')}
                onChange={(val) => set({ promises: val.split('\n').map((s) => s.trim()).filter(Boolean) })}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-pink-100">
                <FieldInput label="Form Heading" value={d.formHeading} onChange={(v) => set({ formHeading: v })} />
                <FieldInput label="Submit Button Text" value={d.formSubmitButtonText} onChange={(v) => set({ formSubmitButtonText: v })} />
                <FieldInput label="Success Title" value={d.successHeading} onChange={(v) => set({ successHeading: v })} />
              </div>
              <FieldTextarea label="Form Subtitle" rows={2} value={d.formSubtitle} onChange={(v) => set({ formSubtitle: v })} />
              <FieldTextarea label="Success Confirmation Message" rows={2} value={d.successMessage} onChange={(v) => set({ successMessage: v })} />
            </SectionBlock>

            <SectionBlock title="Contact FAQs">
              <ToggleRow label="Show FAQ Section" checked={d.showFaqs} onChange={(v) => set({ showFaqs: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="FAQ Heading" value={d.faqHeading} onChange={(v) => set({ faqHeading: v })} />
                <FieldInput label="FAQ Subtitle" value={d.faqSubtitle} onChange={(v) => set({ faqSubtitle: v })} />
              </div>
              <FaqListEditor faqs={d.faqs} onChange={(next) => set({ faqs: next })} />
            </SectionBlock>
          </div>
        );
      })()}

      {/* 3. PRIVACY POLICY */}
      {activePage === 'privacy' && (() => {
        const d = pagesTheme.privacy;
        const set = (patch: Partial<typeof d>) => updatePage('privacy', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Header & Metadata">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Hero Badge" value={d.heroBadge} onChange={(v) => set({ heroBadge: v })} />
                <FieldInput label="Page Title" value={d.title} onChange={(v) => set({ title: v })} />
                <FieldInput label="Last Updated Label" value={d.lastUpdatedLabel} onChange={(v) => set({ lastUpdatedLabel: v })} />
                <FieldInput label="Applies To Label" value={d.appliesToLabel} onChange={(v) => set({ appliesToLabel: v })} />
              </div>
              <FieldTextarea label="Intro Subtitle" value={d.subtitle} onChange={(v) => set({ subtitle: v })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleRow label="Show Privacy Guarantee Box" checked={d.showGuaranteeBox} onChange={(v) => set({ showGuaranteeBox: v })} />
                <ToggleRow label="Show Related Legal Nav Strip" checked={d.showFooterNav} onChange={(v) => set({ showFooterNav: v })} />
              </div>
              <FieldInput label="Guarantee Card Title" value={d.guaranteeTitle} onChange={(v) => set({ guaranteeTitle: v })} />
              <FieldTextarea label="Guarantee Card Body" rows={2} value={d.guaranteeBody} onChange={(v) => set({ guaranteeBody: v })} />
            </SectionBlock>

            <SectionBlock title="Privacy Policy Sections">
              <LegalSectionsEditor sections={d.sections} onChange={(next) => set({ sections: next })} />
            </SectionBlock>

            <SectionBlock title="Privacy Desk Contact">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FieldInput label="Email" value={d.contactEmail} onChange={(v) => set({ contactEmail: v })} />
                <FieldInput label="Phone" value={d.contactPhone} onChange={(v) => set({ contactPhone: v })} />
                <FieldInput label="Address" value={d.contactAddress} onChange={(v) => set({ contactAddress: v })} />
              </div>
            </SectionBlock>
          </div>
        );
      })()}

      {/* 4. TERMS OF SERVICE */}
      {activePage === 'terms' && (() => {
        const d = pagesTheme.terms;
        const set = (patch: Partial<typeof d>) => updatePage('terms', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Header, Authenticity & Courier COD Cards">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Hero Badge" value={d.heroBadge} onChange={(v) => set({ heroBadge: v })} />
                <FieldInput label="Page Title" value={d.title} onChange={(v) => set({ title: v })} />
                <FieldInput label="Effective Date Label" value={d.effectiveDateLabel} onChange={(v) => set({ effectiveDateLabel: v })} />
                <FieldInput label="Jurisdiction Label" value={d.jurisdictionLabel} onChange={(v) => set({ jurisdictionLabel: v })} />
              </div>
              <FieldTextarea label="Intro Subtitle" value={d.subtitle} onChange={(v) => set({ subtitle: v })} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ToggleRow label="Authenticity Highlight Card" checked={d.showAuthenticityCard} onChange={(v) => set({ showAuthenticityCard: v })} />
                <ToggleRow label="Shipping Rate Grid" checked={d.showShippingRates} onChange={(v) => set({ showShippingRates: v })} />
                <ToggleRow label="Related Legal Nav Strip" checked={d.showFooterNav} onChange={(v) => set({ showFooterNav: v })} />
              </div>
              <FieldInput label="Authenticity Card Title" value={d.authenticityCardTitle} onChange={(v) => set({ authenticityCardTitle: v })} />
              <FieldTextarea label="Authenticity Card Body" rows={2} value={d.authenticityCardBody} onChange={(v) => set({ authenticityCardBody: v })} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FieldInput label="Inside Dhaka Charge" value={d.insideDhakaRate} onChange={(v) => set({ insideDhakaRate: v })} />
                <FieldInput label="Outside Dhaka Charge" value={d.outsideDhakaRate} onChange={(v) => set({ outsideDhakaRate: v })} />
                <FieldInput label="Free Delivery Threshold" value={d.freeShippingThreshold} onChange={(v) => set({ freeShippingThreshold: v })} />
              </div>
            </SectionBlock>

            <SectionBlock title="Terms & Conditions Sections">
              <LegalSectionsEditor sections={d.sections} onChange={(next) => set({ sections: next })} />
            </SectionBlock>

            <SectionBlock title="Support Desk Contact">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FieldInput label="Email" value={d.contactEmail} onChange={(v) => set({ contactEmail: v })} />
                <FieldInput label="Phone" value={d.contactPhone} onChange={(v) => set({ contactPhone: v })} />
                <FieldInput label="Address" value={d.contactAddress} onChange={(v) => set({ contactAddress: v })} />
              </div>
            </SectionBlock>
          </div>
        );
      })()}

      {/* 5. BECOME A CREATOR */}
      {activePage === 'becomeCreator' && (() => {
        const d = pagesTheme.becomeCreator;
        const set = (patch: Partial<typeof d>) => updatePage('becomeCreator', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Hero Banner & CTAs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Hero Badge" value={d.heroBadge} onChange={(v) => set({ heroBadge: v })} />
                <FieldInput label="Headline Line 1" value={d.heroTitleLine1} onChange={(v) => set({ heroTitleLine1: v })} />
                <FieldInput label="Headline Highlight" value={d.heroTitleHighlight} onChange={(v) => set({ heroTitleHighlight: v })} />
                <FieldInput label="Primary CTA Text" value={d.primaryCtaText} onChange={(v) => set({ primaryCtaText: v })} />
                <FieldInput label="Secondary CTA Text" value={d.secondaryCtaText} onChange={(v) => set({ secondaryCtaText: v })} />
                <FieldInput label="Secondary CTA Route" value={d.secondaryCtaLink} onChange={(v) => set({ secondaryCtaLink: v })} mono />
              </div>
              <FieldTextarea label="Hero Subtitle" value={d.heroSubtitle} onChange={(v) => set({ heroSubtitle: v })} />
            </SectionBlock>

            <SectionBlock title="Hero Stats Strip">
              <ToggleRow label="Show Quick Stats Grid" checked={d.showStats} onChange={(v) => set({ showStats: v })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {d.stats.map((st, idx) => (
                  <div key={st.id || idx} className="bg-white p-3 rounded-xl border border-pink-100 space-y-2">
                    <FieldInput
                      label={`Stat #${idx + 1} Value`}
                      value={st.value}
                      onChange={(v) => {
                        const copy = [...d.stats];
                        copy[idx] = { ...copy[idx], value: v };
                        set({ stats: copy });
                      }}
                    />
                    <FieldInput
                      label={`Stat #${idx + 1} Label`}
                      value={st.label}
                      onChange={(v) => {
                        const copy = [...d.stats];
                        copy[idx] = { ...copy[idx], label: v };
                        set({ stats: copy });
                      }}
                    />
                  </div>
                ))}
              </div>
            </SectionBlock>

            <SectionBlock title="Program Perks">
              <ToggleRow label="Show Perks Grid" checked={d.showPerks} onChange={(v) => set({ showPerks: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Perks Eyebrow" value={d.perksEyebrow} onChange={(v) => set({ perksEyebrow: v })} />
                <FieldInput label="Perks Section Title" value={d.perksTitle} onChange={(v) => set({ perksTitle: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {d.perks.map((pk, idx) => (
                  <div key={pk.id || idx} className="bg-white p-3.5 rounded-xl border border-pink-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-[#E91E8C]">PERK #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => set({ perks: d.perks.filter((_, i) => i !== idx) })}
                        className="text-rose-500 text-[11px] font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <FieldInput
                      label="Title"
                      value={pk.title}
                      onChange={(v) => {
                        const copy = [...d.perks];
                        copy[idx] = { ...copy[idx], title: v };
                        set({ perks: copy });
                      }}
                    />
                    <FieldTextarea
                      label="Description"
                      rows={2}
                      value={pk.desc}
                      onChange={(v) => {
                        const copy = [...d.perks];
                        copy[idx] = { ...copy[idx], desc: v };
                        set({ perks: copy });
                      }}
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  set({
                    perks: [...d.perks, { id: `cp-${Date.now()}`, title: 'New Benefit', desc: 'Benefit details...' }],
                  })
                }
                className="px-4 py-2 bg-white hover:bg-pink-50 text-[#E91E8C] border border-dashed border-pink-300 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Add Creator Perk
              </button>
            </SectionBlock>

            <SectionBlock title="Onboarding Steps & Tiers Header">
              <ToggleRow label="Show 4-Step Process Block" checked={d.showSteps} onChange={(v) => set({ showSteps: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Steps Eyebrow" value={d.stepsEyebrow} onChange={(v) => set({ stepsEyebrow: v })} />
                <FieldInput label="Steps Title" value={d.stepsTitle} onChange={(v) => set({ stepsTitle: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {d.steps.map((st, idx) => (
                  <div key={st.id || idx} className="bg-white p-3.5 rounded-xl border border-pink-100 space-y-2">
                    <span className="text-[10px] font-black text-[#E91E8C]">STEP #{idx + 1}</span>
                    <FieldInput
                      label="Title"
                      value={st.title}
                      onChange={(v) => {
                        const copy = [...d.steps];
                        copy[idx] = { ...copy[idx], title: v };
                        set({ steps: copy });
                      }}
                    />
                    <FieldTextarea
                      label="Description"
                      rows={2}
                      value={st.desc}
                      onChange={(v) => {
                        const copy = [...d.steps];
                        copy[idx] = { ...copy[idx], desc: v };
                        set({ steps: copy });
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-pink-100 space-y-3">
                <ToggleRow label="Show Creator Tiers Roadmap" checked={d.showTiers} onChange={(v) => set({ showTiers: v })} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldInput label="Tiers Eyebrow" value={d.tiersEyebrow} onChange={(v) => set({ tiersEyebrow: v })} />
                  <FieldInput label="Tiers Title" value={d.tiersTitle} onChange={(v) => set({ tiersTitle: v })} />
                </div>
                <FieldInput label="Tiers Subtitle" value={d.tiersSubtitle} onChange={(v) => set({ tiersSubtitle: v })} />
              </div>
            </SectionBlock>

            <SectionBlock title="Application Form, FAQs & Bottom Banner">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Application Form Title" value={d.formTitle} onChange={(v) => set({ formTitle: v })} />
                <FieldInput label="Application Form Subtitle" value={d.formSubtitle} onChange={(v) => set({ formSubtitle: v })} />
              </div>
              <ToggleRow label="Show Creator FAQs" checked={d.showFaqs} onChange={(v) => set({ showFaqs: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="FAQs Eyebrow" value={d.faqsEyebrow} onChange={(v) => set({ faqsEyebrow: v })} />
                <FieldInput label="FAQs Title" value={d.faqsTitle} onChange={(v) => set({ faqsTitle: v })} />
              </div>
              <FaqListEditor faqs={d.faqs} onChange={(next) => set({ faqs: next })} />
              <div className="pt-3 border-t border-pink-100 space-y-3">
                <ToggleRow label="Show Bottom Support Banner" checked={d.showBottomBanner} onChange={(v) => set({ showBottomBanner: v })} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldInput label="Bottom Title" value={d.bottomTitle} onChange={(v) => set({ bottomTitle: v })} />
                  <FieldInput label="Bottom Subtitle" value={d.bottomSubtitle} onChange={(v) => set({ bottomSubtitle: v })} />
                  <FieldInput label="Messenger CTA Label" value={d.bottomMessengerLabel} onChange={(v) => set({ bottomMessengerLabel: v })} />
                  <FieldInput label="Messenger URL" value={d.bottomMessengerUrl} onChange={(v) => set({ bottomMessengerUrl: v })} mono />
                  <FieldInput label="Apply CTA Label" value={d.bottomApplyLabel} onChange={(v) => set({ bottomApplyLabel: v })} />
                </div>
              </div>
            </SectionBlock>
          </div>
        );
      })()}

      {/* 6. BRANDS DIRECTORY */}
      {activePage === 'brandsIndex' && (() => {
        const d = pagesTheme.brandsIndex;
        const set = (patch: Partial<typeof d>) => updatePage('brandsIndex', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Brands Directory Hero & Search">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Top Authenticity Badge" value={d.badgeText} onChange={(v) => set({ badgeText: v })} />
                <FieldInput label="Page Title" value={d.title} onChange={(v) => set({ title: v })} />
                <FieldInput label="Search Input Placeholder" value={d.searchPlaceholder} onChange={(v) => set({ searchPlaceholder: v })} />
              </div>
              <FieldTextarea label="Hero Subtitle" value={d.subtitle} onChange={(v) => set({ subtitle: v })} />
            </SectionBlock>

            <SectionBlock title="Section Headings & Visibility">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleRow label="Show Featured Flagships Section" checked={d.showFeaturedSection} onChange={(v) => set({ showFeaturedSection: v })} />
                <ToggleRow label="Show Complete Directory Grid" checked={d.showDirectorySection} onChange={(v) => set({ showDirectorySection: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FieldInput label="Featured Section Heading" value={d.featuredTitle} onChange={(v) => set({ featuredTitle: v })} />
                <FieldInput label="Featured Card CTA Label" value={d.featuredCtaLabel} onChange={(v) => set({ featuredCtaLabel: v })} />
                <FieldInput label="Complete Directory Heading" value={d.directoryTitle} onChange={(v) => set({ directoryTitle: v })} />
              </div>
            </SectionBlock>
          </div>
        );
      })()}

      {/* 7. BRAND LANDING PAGE */}
      {activePage === 'brandLanding' && (() => {
        const d = pagesTheme.brandLanding;
        const set = (patch: Partial<typeof d>) => updatePage('brandLanding', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Brand Page Hero & Fallback Artwork">
              <FieldInput label="Authenticity Badge Text" value={d.authenticityBadge} onChange={(v) => set({ authenticityBadge: v })} />
              <ImageInputField
                label="Default Brand Hero Banner URL"
                value={d.defaultHeroImage}
                mediaTarget="pages.brandLanding.defaultHeroImage"
                onChange={(v) => set({ defaultHeroImage: v })}
                openMediaPicker={openMediaPicker}
              />
            </SectionBlock>

            <SectionBlock title="Catalog Grid & Empty State Copy">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Catalog Heading Prefix" value={d.catalogHeadingPrefix} onChange={(v) => set({ catalogHeadingPrefix: v })} />
                <FieldInput label="Catalog Subtext" value={d.catalogSubtext} onChange={(v) => set({ catalogSubtext: v })} />
                <FieldInput label="Empty Shipment Title" value={d.emptyStateTitle} onChange={(v) => set({ emptyStateTitle: v })} />
                <FieldInput label="Empty CTA Button Label" value={d.emptyStateCtaLabel} onChange={(v) => set({ emptyStateCtaLabel: v })} />
                <FieldInput label="Empty CTA Route" value={d.emptyStateCtaLink} onChange={(v) => set({ emptyStateCtaLink: v })} mono />
              </div>
            </SectionBlock>

            <SectionBlock title="Signature Actives & Brand FAQs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleRow label="Show Signature Ingredients Badges" checked={d.showSignatureIngredients} onChange={(v) => set({ showSignatureIngredients: v })} />
                <ToggleRow label="Show Brand FAQs Accordion" checked={d.showFaqs} onChange={(v) => set({ showFaqs: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="FAQ Heading Prefix" value={d.faqHeadingPrefix} onChange={(v) => set({ faqHeadingPrefix: v })} />
                <FieldInput label="FAQ Subtext" value={d.faqSubtext} onChange={(v) => set({ faqSubtext: v })} />
              </div>
            </SectionBlock>
          </div>
        );
      })()}

      {/* 8. SKINCARE GUIDES INDEX */}
      {activePage === 'guidesIndex' && (() => {
        const d = pagesTheme.guidesIndex;
        const set = (patch: Partial<typeof d>) => updatePage('guidesIndex', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Display Options & Badge">
              <FieldInput label="Top Knowledge Base Badge" value={d.badgeText} onChange={(v) => set({ badgeText: v })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleRow label="Show EN / বাংলা Language Switcher" checked={d.showLanguageSwitcher} onChange={(v) => set({ showLanguageSwitcher: v })} />
                <ToggleRow label="Show Category Filter Tabs" checked={d.showCategoryTabs} onChange={(v) => set({ showCategoryTabs: v })} />
              </div>
            </SectionBlock>

            <SectionBlock title="English Copy">
              <FieldInput label="Page Title (English)" value={d.titleEN} onChange={(v) => set({ titleEN: v })} />
              <FieldTextarea label="Subtitle (English)" value={d.subtitleEN} onChange={(v) => set({ subtitleEN: v })} />
              <FieldInput label="Guide Card CTA Label (English)" value={d.readGuideLabelEN} onChange={(v) => set({ readGuideLabelEN: v })} />
            </SectionBlock>

            <SectionBlock title="Bengali Copy (বাংলা)">
              <FieldInput label="Page Title (Bengali)" value={d.titleBN} onChange={(v) => set({ titleBN: v })} />
              <FieldTextarea label="Subtitle (Bengali)" value={d.subtitleBN} onChange={(v) => set({ subtitleBN: v })} />
              <FieldInput label="Guide Card CTA Label (Bengali)" value={d.readGuideLabelBN} onChange={(v) => set({ readGuideLabelBN: v })} />
            </SectionBlock>
          </div>
        );
      })()}

      {/* 9. GUIDE DETAIL */}
      {activePage === 'guideDetail' && (() => {
        const d = pagesTheme.guideDetail;
        const set = (patch: Partial<typeof d>) => updatePage('guideDetail', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Article Reading & Actives Settings">
              <ToggleRow label="Show English / বাংলা Language Switcher" checked={d.showLanguageSwitcher} onChange={(v) => set({ showLanguageSwitcher: v })} />
              <FieldInput label="Featured Actives Box Title" value={d.featuredActivesHeading} onChange={(v) => set({ featuredActivesHeading: v })} />
            </SectionBlock>

            <SectionBlock title="Article FAQ Block">
              <ToggleRow label="Show Guide FAQs Accordion" checked={d.showFaqs} onChange={(v) => set({ showFaqs: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="FAQ Heading (English)" value={d.faqHeadingEN} onChange={(v) => set({ faqHeadingEN: v })} />
                <FieldInput label="FAQ Heading (Bengali)" value={d.faqHeadingBN} onChange={(v) => set({ faqHeadingBN: v })} />
              </div>
              <FieldInput label="FAQ Subtext" value={d.faqSubtext} onChange={(v) => set({ faqSubtext: v })} />
            </SectionBlock>

            <SectionBlock title="Recommended Products Carousel">
              <ToggleRow label="Show Recommended Products Strip" checked={d.showRelatedProducts} onChange={(v) => set({ showRelatedProducts: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Section Heading" value={d.relatedHeading} onChange={(v) => set({ relatedHeading: v })} />
                <FieldInput label="View All CTA Label" value={d.relatedCtaLabel} onChange={(v) => set({ relatedCtaLabel: v })} />
              </div>
              <FieldInput label="Section Subtext" value={d.relatedSubtext} onChange={(v) => set({ relatedSubtext: v })} />
            </SectionBlock>
          </div>
        );
      })()}

      {/* 10. PRODUCT DETAIL */}
      {activePage === 'productDetail' && (() => {
        const d = pagesTheme.productDetail;
        const set = (patch: Partial<typeof d>) => updatePage('productDetail', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Trust Guarantees & Social Share Card">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Trust Badge 1" value={d.trustBadge1} onChange={(v) => set({ trustBadge1: v })} />
                <FieldInput label="Trust Badge 2" value={d.trustBadge2} onChange={(v) => set({ trustBadge2: v })} />
              </div>
              <ToggleRow label="Show Social Share Box (Desktop & Mobile)" checked={d.showSocialShareBox} onChange={(v) => set({ showSocialShareBox: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Share Card Title" value={d.shareBoxTitle} onChange={(v) => set({ shareBoxTitle: v })} />
                <FieldInput label="Share Card Subtitle" value={d.shareBoxSubtitle} onChange={(v) => set({ shareBoxSubtitle: v })} />
              </div>
            </SectionBlock>

            <SectionBlock title="Add-to-Cart & Order CTA Labels">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FieldInput label="Retail Basket Button" value={d.addToBasketLabel} onChange={(v) => set({ addToBasketLabel: v })} />
                <FieldInput label="Wholesale Checkout Button" value={d.wholesaleCtaLabel} onChange={(v) => set({ wholesaleCtaLabel: v })} />
                <FieldInput label="WhatsApp Order Button" value={d.whatsappCtaLabel} onChange={(v) => set({ whatsappCtaLabel: v })} />
              </div>
            </SectionBlock>

            <SectionBlock title="Reviews & Related Products Sections">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleRow label="Show Verified Customer Reviews" checked={d.showReviewsSection} onChange={(v) => set({ showReviewsSection: v })} />
                <ToggleRow label="Show Related Products Row" checked={d.showRelatedSection} onChange={(v) => set({ showRelatedSection: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FieldInput label="Reviews Section Heading" value={d.reviewsHeading} onChange={(v) => set({ reviewsHeading: v })} />
                <FieldInput label="Related Products Heading" value={d.relatedHeading} onChange={(v) => set({ relatedHeading: v })} />
                <FieldInput label="Related Products Subtext" value={d.relatedSubtext} onChange={(v) => set({ relatedSubtext: v })} />
              </div>
            </SectionBlock>
          </div>
        );
      })()}

      {/* 11. LOGIN PAGE */}
      {activePage === 'login' && (() => {
        const d = pagesTheme.login;
        const set = (patch: Partial<typeof d>) => updatePage('login', patch);
        return (
          <SectionBlock title="Customer Sign-In Screen">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldInput label="Welcome Title" value={d.title} onChange={(v) => set({ title: v })} />
              <FieldInput label="Google Button Label" value={d.googleButtonText} onChange={(v) => set({ googleButtonText: v })} />
              <FieldInput label="Facebook Button Label" value={d.facebookButtonText || 'Continue with Facebook'} onChange={(v) => set({ facebookButtonText: v })} />
              <FieldInput label="Security Badge Text" value={d.securityBadgeText} onChange={(v) => set({ securityBadgeText: v })} />
              <FieldInput label="Back Link Label" value={d.backToShopLabel} onChange={(v) => set({ backToShopLabel: v })} />
              <FieldInput label="Back Link Target Route" value={d.backToShopLink} onChange={(v) => set({ backToShopLink: v })} mono />
            </div>
            <FieldTextarea label="Welcome Subtitle" value={d.subtitle} onChange={(v) => set({ subtitle: v })} />
          </SectionBlock>
        );
      })()}

      {/* 12. 404 NOT FOUND */}
      {activePage === 'notFound' && (() => {
        const d = pagesTheme.notFound;
        const set = (patch: Partial<typeof d>) => updatePage('notFound', patch);
        return (
          <SectionBlock title="404 Error Copy & Recovery Quick Links">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldInput label="Status Badge" value={d.badgeText} onChange={(v) => set({ badgeText: v })} />
              <FieldInput label="Headline" value={d.title} onChange={(v) => set({ title: v })} />
            </div>
            <FieldTextarea label="Error Description" value={d.description} onChange={(v) => set({ description: v })} />
            <ToggleRow label="Show Quick Storefront Recovery Buttons" checked={d.showQuickLinks} onChange={(v) => set({ showQuickLinks: v })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FieldInput label="Home Button Label" value={d.homeBtnLabel} onChange={(v) => set({ homeBtnLabel: v })} />
              <FieldInput label="Shop Button Label" value={d.shopBtnLabel} onChange={(v) => set({ shopBtnLabel: v })} />
              <FieldInput label="Brands Button Label" value={d.brandsBtnLabel} onChange={(v) => set({ brandsBtnLabel: v })} />
              <FieldInput label="Guides Button Label" value={d.guidesBtnLabel} onChange={(v) => set({ guidesBtnLabel: v })} />
            </div>
          </SectionBlock>
        );
      })()}

      {/* 13. AUTHENTICITY & INSPECTION CENTER */}
      {activePage === 'authenticity' && (() => {
        const d = pagesTheme.authenticity;
        const set = (patch: Partial<typeof d>) => updatePage('authenticity', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Section Visibility Toggles">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <ToggleRow label="4-Step Inspection Grid" checked={d.showChecklist} onChange={(v) => set({ showChecklist: v })} />
                <ToggleRow label="Korean Date Code Guide" checked={d.showDateCodes} onChange={(v) => set({ showDateCodes: v })} />
                <ToggleRow label="COD & Hygiene Policy Cards" checked={d.showPolicyCards} onChange={(v) => set({ showPolicyCards: v })} />
                <ToggleRow label="Bottom Help Banner" checked={d.showHelpBanner} onChange={(v) => set({ showHelpBanner: v })} />
              </div>
            </SectionBlock>

            <SectionBlock title="Hero Header (English & বাংলা)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Badge (English)" value={d.badgeEN} onChange={(v) => set({ badgeEN: v })} />
                <FieldInput label="Badge (বাংলা)" value={d.badgeBN} onChange={(v) => set({ badgeBN: v })} />
                <FieldInput label="Headline (English)" value={d.titleEN} onChange={(v) => set({ titleEN: v })} />
                <FieldInput label="Headline (বাংলা)" value={d.titleBN} onChange={(v) => set({ titleBN: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldTextarea label="Subtitle (English)" rows={3} value={d.subtitleEN} onChange={(v) => set({ subtitleEN: v })} />
                <FieldTextarea label="Subtitle (বাংলা)" rows={3} value={d.subtitleBN} onChange={(v) => set({ subtitleBN: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FieldInput label="Primary CTA (EN)" value={d.primaryCtaEN} onChange={(v) => set({ primaryCtaEN: v })} />
                <FieldInput label="Primary CTA (বাংলা)" value={d.primaryCtaBN} onChange={(v) => set({ primaryCtaBN: v })} />
                <FieldInput label="Primary CTA Route" value={d.primaryCtaLink} onChange={(v) => set({ primaryCtaLink: v })} mono />
                <FieldInput label="Secondary CTA (EN)" value={d.secondaryCtaEN} onChange={(v) => set({ secondaryCtaEN: v })} />
                <FieldInput label="Secondary CTA (বাংলা)" value={d.secondaryCtaBN} onChange={(v) => set({ secondaryCtaBN: v })} />
                <FieldInput label="Secondary CTA Route" value={d.secondaryCtaLink} onChange={(v) => set({ secondaryCtaLink: v })} mono />
              </div>
            </SectionBlock>

            <SectionBlock title="Date Codes Heading & Bottom Support Banner">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Date Codes Heading (EN)" value={d.dateCodesHeadingEN} onChange={(v) => set({ dateCodesHeadingEN: v })} />
                <FieldInput label="Date Codes Heading (বাংলা)" value={d.dateCodesHeadingBN} onChange={(v) => set({ dateCodesHeadingBN: v })} />
                <FieldInput label="Help Banner Title (EN)" value={d.helpTitleEN} onChange={(v) => set({ helpTitleEN: v })} />
                <FieldInput label="Help Banner Title (বাংলা)" value={d.helpTitleBN} onChange={(v) => set({ helpTitleBN: v })} />
                <FieldTextarea label="Help Banner Subtitle (EN)" rows={2} value={d.helpSubtitleEN} onChange={(v) => set({ helpSubtitleEN: v })} />
                <FieldTextarea label="Help Banner Subtitle (বাংলা)" rows={2} value={d.helpSubtitleBN} onChange={(v) => set({ helpSubtitleBN: v })} />
                <FieldInput label="Secondary Button (EN)" value={d.helpSecondaryLabelEN} onChange={(v) => set({ helpSecondaryLabelEN: v })} />
                <FieldInput label="Secondary Button (বাংলা)" value={d.helpSecondaryLabelBN} onChange={(v) => set({ helpSecondaryLabelBN: v })} />
                <FieldInput label="Secondary Button Route" value={d.helpSecondaryLink} onChange={(v) => set({ helpSecondaryLink: v })} mono />
                <FieldInput label="Primary Button (EN)" value={d.helpPrimaryLabelEN} onChange={(v) => set({ helpPrimaryLabelEN: v })} />
                <FieldInput label="Primary Button (বাংলা)" value={d.helpPrimaryLabelBN} onChange={(v) => set({ helpPrimaryLabelBN: v })} />
                <FieldInput label="Primary Button Route" value={d.helpPrimaryLink} onChange={(v) => set({ helpPrimaryLink: v })} mono />
              </div>
            </SectionBlock>
          </div>
        );
      })()}

      {/* 14. INGREDIENTS LIBRARY */}
      {activePage === 'ingredients' && (() => {
        const d = pagesTheme.ingredients;
        const set = (patch: Partial<typeof d>) => updatePage('ingredients', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Glossary Index Header & Search">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Top Badge Text" value={d.badgeText} onChange={(v) => set({ badgeText: v })} />
                <FieldInput label="Card CTA Label" value={d.cardCtaLabel} onChange={(v) => set({ cardCtaLabel: v })} />
                <FieldInput label="Title (English)" value={d.titleEN} onChange={(v) => set({ titleEN: v })} />
                <FieldInput label="Title (বাংলা)" value={d.titleBN} onChange={(v) => set({ titleBN: v })} />
                <FieldInput label="Search Placeholder (EN)" value={d.searchPlaceholderEN} onChange={(v) => set({ searchPlaceholderEN: v })} />
                <FieldInput label="Search Placeholder (বাংলা)" value={d.searchPlaceholderBN} onChange={(v) => set({ searchPlaceholderBN: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldTextarea label="Subtitle (English)" rows={2} value={d.subtitleEN} onChange={(v) => set({ subtitleEN: v })} />
                <FieldTextarea label="Subtitle (বাংলা)" rows={2} value={d.subtitleBN} onChange={(v) => set({ subtitleBN: v })} />
              </div>
            </SectionBlock>

            <SectionBlock title="Bottom Guidance Banner & Detail Page Settings">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleRow label="Show Bottom Quiz / Concerns Banner" checked={d.showBottomBanner} onChange={(v) => set({ showBottomBanner: v })} />
                <ToggleRow label="Show Matching Products on Detail Page" checked={d.showDetailRelatedProducts} onChange={(v) => set({ showDetailRelatedProducts: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Bottom Title (EN)" value={d.bottomTitleEN} onChange={(v) => set({ bottomTitleEN: v })} />
                <FieldInput label="Bottom Title (বাংলা)" value={d.bottomTitleBN} onChange={(v) => set({ bottomTitleBN: v })} />
                <FieldInput label="Secondary CTA Label" value={d.bottomSecondaryLabel} onChange={(v) => set({ bottomSecondaryLabel: v })} />
                <FieldInput label="Secondary CTA Route" value={d.bottomSecondaryLink} onChange={(v) => set({ bottomSecondaryLink: v })} mono />
                <FieldInput label="Primary CTA Label" value={d.bottomPrimaryLabel} onChange={(v) => set({ bottomPrimaryLabel: v })} />
                <FieldInput label="Primary CTA Route" value={d.bottomPrimaryLink} onChange={(v) => set({ bottomPrimaryLink: v })} mono />
              </div>
              <FieldTextarea label="Bottom Banner Subtitle" rows={2} value={d.bottomSubtitle} onChange={(v) => set({ bottomSubtitle: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-pink-100">
                <FieldInput label="Detail Page Badge" value={d.detailBadgeText} onChange={(v) => set({ detailBadgeText: v })} />
              </div>
              <FieldTextarea label="Detail Cosmetic Disclaimer" rows={2} value={d.detailDisclaimer} onChange={(v) => set({ detailDisclaimer: v })} />
            </SectionBlock>
          </div>
        );
      })()}

      {/* 15. SKIN CONCERNS LIBRARY */}
      {activePage === 'concerns' && (() => {
        const d = pagesTheme.concerns;
        const set = (patch: Partial<typeof d>) => updatePage('concerns', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Concerns Directory Header (EN & বাংলা)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Top Badge Text" value={d.badgeText} onChange={(v) => set({ badgeText: v })} />
                <FieldInput label="Card CTA Label" value={d.cardCtaLabel} onChange={(v) => set({ cardCtaLabel: v })} />
                <FieldInput label="Title (English)" value={d.titleEN} onChange={(v) => set({ titleEN: v })} />
                <FieldInput label="Title (বাংলা)" value={d.titleBN} onChange={(v) => set({ titleBN: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldTextarea label="Subtitle (English)" rows={2} value={d.subtitleEN} onChange={(v) => set({ subtitleEN: v })} />
                <FieldTextarea label="Subtitle (বাংলা)" rows={2} value={d.subtitleBN} onChange={(v) => set({ subtitleBN: v })} />
              </div>
            </SectionBlock>

            <SectionBlock title="Concern Detail Page (/concern/:slug)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleRow label="Show Key Focus Ingredients Box" checked={d.showDetailKeyIngredients} onChange={(v) => set({ showDetailKeyIngredients: v })} />
                <ToggleRow label="Show Matching Catalog Products" checked={d.showDetailRelatedProducts} onChange={(v) => set({ showDetailRelatedProducts: v })} />
              </div>
              <FieldInput label="Detail Badge Fallback Label" value={d.detailBadgeFallback} onChange={(v) => set({ detailBadgeFallback: v })} />
              <FieldTextarea label="Cosmetic Care Disclaimer" rows={2} value={d.detailDisclaimer} onChange={(v) => set({ detailDisclaimer: v })} />
            </SectionBlock>
          </div>
        );
      })()}

      {/* 16. SKIN PROFILE QUIZ */}
      {activePage === 'skinQuiz' && (() => {
        const d = pagesTheme.skinQuiz;
        const set = (patch: Partial<typeof d>) => updatePage('skinQuiz', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Quiz Hero & Buttons">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Badge Text" value={d.badgeText} onChange={(v) => set({ badgeText: v })} />
                <FieldInput label="Title (English)" value={d.titleEN} onChange={(v) => set({ titleEN: v })} />
                <FieldInput label="Title (বাংলা)" value={d.titleBN} onChange={(v) => set({ titleBN: v })} />
                <FieldInput label="Reset Button Label" value={d.resetButtonLabel} onChange={(v) => set({ resetButtonLabel: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldTextarea label="Subtitle (English)" rows={2} value={d.subtitleEN} onChange={(v) => set({ subtitleEN: v })} />
                <FieldTextarea label="Subtitle (বাংলা)" rows={2} value={d.subtitleBN} onChange={(v) => set({ subtitleBN: v })} />
              </div>
              <FieldInput label="Submit Quiz Button Label" value={d.submitButtonLabel} onChange={(v) => set({ submitButtonLabel: v })} />
            </SectionBlock>

            <SectionBlock title="Matched Shortlist Results Section">
              <ToggleRow label="Show Routine Builder & Add-to-Bag Result Buttons" checked={d.showResultsActions} onChange={(v) => set({ showResultsActions: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Results Heading" value={d.resultsHeading} onChange={(v) => set({ resultsHeading: v })} />
                <FieldInput label="Routine Builder CTA" value={d.routineBuilderCtaLabel} onChange={(v) => set({ routineBuilderCtaLabel: v })} />
                <FieldInput label="Add Top 4 CTA" value={d.addTopToBagCtaLabel} onChange={(v) => set({ addTopToBagCtaLabel: v })} />
              </div>
              <FieldTextarea label="Results Subtext" rows={2} value={d.resultsSubtext} onChange={(v) => set({ resultsSubtext: v })} />
            </SectionBlock>
          </div>
        );
      })()}

      {/* 17. ROUTINE BUILDER */}
      {activePage === 'routineBuilder' && (() => {
        const d = pagesTheme.routineBuilder;
        const set = (patch: Partial<typeof d>) => updatePage('routineBuilder', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Header & Quick Links">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Badge Text" value={d.badgeText} onChange={(v) => set({ badgeText: v })} />
                <FieldInput label="Title (English)" value={d.titleEN} onChange={(v) => set({ titleEN: v })} />
                <FieldInput label="Title (বাংলা)" value={d.titleBN} onChange={(v) => set({ titleBN: v })} />
                <FieldInput label="Quiz CTA Button Label" value={d.quizCtaLabel} onChange={(v) => set({ quizCtaLabel: v })} />
                <FieldInput label="Glossary CTA Button Label" value={d.glossaryCtaLabel} onChange={(v) => set({ glossaryCtaLabel: v })} />
              </div>
              <FieldTextarea label="Header Subtitle" rows={2} value={d.subtitle} onChange={(v) => set({ subtitle: v })} />
            </SectionBlock>

            <SectionBlock title="AM / PM Slots, Action Buttons & Toggles">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleRow label="Show Active Layering Conflict Warnings" checked={d.showLayeringWarnings} onChange={(v) => set({ showLayeringWarnings: v })} />
                <ToggleRow label="Show Saved Routines List" checked={d.showSavedRoutines} onChange={(v) => set({ showSavedRoutines: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="AM Column Title" value={d.amTitle} onChange={(v) => set({ amTitle: v })} />
                <FieldInput label="AM Column Subtitle" value={d.amSubtitle} onChange={(v) => set({ amSubtitle: v })} />
                <FieldInput label="PM Column Title" value={d.pmTitle} onChange={(v) => set({ pmTitle: v })} />
                <FieldInput label="PM Column Subtitle" value={d.pmSubtitle} onChange={(v) => set({ pmSubtitle: v })} />
                <FieldInput label="Save Routine Button" value={d.saveRoutineLabel} onChange={(v) => set({ saveRoutineLabel: v })} />
                <FieldInput label="Add to Cart Button" value={d.addToCartLabel} onChange={(v) => set({ addToCartLabel: v })} />
              </div>
            </SectionBlock>
          </div>
        );
      })()}

      {/* 18. CHECKOUT PAGE */}
      {activePage === 'checkout' && (() => {
        const d = pagesTheme.checkout;
        const set = (patch: Partial<typeof d>) => updatePage('checkout', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Checkout Header & Controls (EN & বাংলা)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleRow label="Show Guest Rewards Login Banner" checked={d.showGuestRewardsBanner} onChange={(v) => set({ showGuestRewardsBanner: v })} />
                <ToggleRow label="Show Inline Quick-Add Catalog on Empty Cart" checked={d.showQuickAdd} onChange={(v) => set({ showQuickAdd: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Title (English)" value={d.titleEN} onChange={(v) => set({ titleEN: v })} />
                <FieldInput label="Title (বাংলা)" value={d.titleBN} onChange={(v) => set({ titleBN: v })} />
                <FieldInput label="Subtitle (English)" value={d.subtitleEN} onChange={(v) => set({ subtitleEN: v })} />
                <FieldInput label="Subtitle (বাংলা)" value={d.subtitleBN} onChange={(v) => set({ subtitleBN: v })} />
                <FieldInput label="Copy Link Button (EN)" value={d.copyLinkLabelEN} onChange={(v) => set({ copyLinkLabelEN: v })} />
                <FieldInput label="Copy Link Button (বাংলা)" value={d.copyLinkLabelBN} onChange={(v) => set({ copyLinkLabelBN: v })} />
                <FieldInput label="Continue Shopping (EN)" value={d.continueShoppingLabelEN} onChange={(v) => set({ continueShoppingLabelEN: v })} />
                <FieldInput label="Continue Shopping (বাংলা)" value={d.continueShoppingLabelBN} onChange={(v) => set({ continueShoppingLabelBN: v })} />
              </div>
            </SectionBlock>

            <SectionBlock title="Empty Basket State">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Empty Basket Title (EN)" value={d.emptyTitleEN} onChange={(v) => set({ emptyTitleEN: v })} />
                <FieldInput label="Empty Basket Title (বাংলা)" value={d.emptyTitleBN} onChange={(v) => set({ emptyTitleBN: v })} />
                <FieldTextarea label="Empty Basket Subtitle (EN)" rows={2} value={d.emptySubtitleEN} onChange={(v) => set({ emptySubtitleEN: v })} />
                <FieldTextarea label="Empty Basket Subtitle (বাংলা)" rows={2} value={d.emptySubtitleBN} onChange={(v) => set({ emptySubtitleBN: v })} />
                <FieldInput label="Browse Shop Button (EN)" value={d.emptyShopBtnEN} onChange={(v) => set({ emptyShopBtnEN: v })} />
                <FieldInput label="Browse Shop Button (বাংলা)" value={d.emptyShopBtnBN} onChange={(v) => set({ emptyShopBtnBN: v })} />
              </div>
            </SectionBlock>

            <SectionBlock title="Payment, Promo & Order Summary Copy">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Payment Heading (EN)" value={d.paymentTitleEN} onChange={(v) => set({ paymentTitleEN: v })} />
                <FieldInput label="Payment Heading (বাংলা)" value={d.paymentTitleBN} onChange={(v) => set({ paymentTitleBN: v })} />
                <FieldInput label="COD Description (EN)" value={d.paymentCodDescEN} onChange={(v) => set({ paymentCodDescEN: v })} />
                <FieldInput label="COD Description (বাংলা)" value={d.paymentCodDescBN} onChange={(v) => set({ paymentCodDescBN: v })} />
                <FieldInput label="Promo Section Title (EN)" value={d.promoTitleEN} onChange={(v) => set({ promoTitleEN: v })} />
                <FieldInput label="Promo Section Title (বাংলা)" value={d.promoTitleBN} onChange={(v) => set({ promoTitleBN: v })} />
                <FieldInput label="Promo Input Placeholder (EN)" value={d.promoPlaceholderEN} onChange={(v) => set({ promoPlaceholderEN: v })} />
                <FieldInput label="Promo Input Placeholder (বাংলা)" value={d.promoPlaceholderBN} onChange={(v) => set({ promoPlaceholderBN: v })} />
                <FieldInput label="Summary Heading (EN)" value={d.summaryTitleEN} onChange={(v) => set({ summaryTitleEN: v })} />
                <FieldInput label="Summary Heading (বাংলা)" value={d.summaryTitleBN} onChange={(v) => set({ summaryTitleBN: v })} />
                <FieldInput label="Dispatch Footnote (EN)" value={d.dispatchNoteEN} onChange={(v) => set({ dispatchNoteEN: v })} />
                <FieldInput label="Dispatch Footnote (বাংলা)" value={d.dispatchNoteBN} onChange={(v) => set({ dispatchNoteBN: v })} />
              </div>
            </SectionBlock>
          </div>
        );
      })()}

      {/* 19. THANK YOU / ORDER CONFIRMATION */}
      {activePage === 'thankYou' && (() => {
        const d = pagesTheme.thankYou;
        const set = (patch: Partial<typeof d>) => updatePage('thankYou', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Order Confirmation Banner (EN & বাংলা)">
              <ToggleRow label="Show Guest Loyalty Rewards Tip Card" checked={d.showGuestRewardsTip} onChange={(v) => set({ showGuestRewardsTip: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Confirmed Headline (EN)" value={d.titleEN} onChange={(v) => set({ titleEN: v })} />
                <FieldInput label="Confirmed Headline (বাংলা)" value={d.titleBN} onChange={(v) => set({ titleBN: v })} />
                <FieldTextarea label="Confirmed Subtitle (EN)" rows={2} value={d.subtitleEN} onChange={(v) => set({ subtitleEN: v })} />
                <FieldTextarea label="Confirmed Subtitle (বাংলা)" rows={2} value={d.subtitleBN} onChange={(v) => set({ subtitleBN: v })} />
              </div>
            </SectionBlock>

            <SectionBlock title="Receipt Headings, Buttons & Missing Order Copy">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Delivery Section Heading (EN)" value={d.deliveryHeadingEN} onChange={(v) => set({ deliveryHeadingEN: v })} />
                <FieldInput label="Delivery Section Heading (বাংলা)" value={d.deliveryHeadingBN} onChange={(v) => set({ deliveryHeadingBN: v })} />
                <FieldInput label="Receipt Section Heading (EN)" value={d.receiptHeadingEN} onChange={(v) => set({ receiptHeadingEN: v })} />
                <FieldInput label="Receipt Section Heading (বাংলা)" value={d.receiptHeadingBN} onChange={(v) => set({ receiptHeadingBN: v })} />
                <FieldInput label="Print Receipt Button (EN)" value={d.printBtnEN} onChange={(v) => set({ printBtnEN: v })} />
                <FieldInput label="Print Receipt Button (বাংলা)" value={d.printBtnBN} onChange={(v) => set({ printBtnBN: v })} />
                <FieldInput label="WhatsApp Help Button (EN)" value={d.whatsappBtnEN} onChange={(v) => set({ whatsappBtnEN: v })} />
                <FieldInput label="WhatsApp Help Button (বাংলা)" value={d.whatsappBtnBN} onChange={(v) => set({ whatsappBtnBN: v })} />
                <FieldInput label="Continue Shopping Button (EN)" value={d.continueShoppingEN} onChange={(v) => set({ continueShoppingEN: v })} />
                <FieldInput label="Continue Shopping Button (বাংলা)" value={d.continueShoppingBN} onChange={(v) => set({ continueShoppingBN: v })} />
                <FieldInput label="Missing Receipt Title (EN)" value={d.notFoundTitleEN} onChange={(v) => set({ notFoundTitleEN: v })} />
                <FieldInput label="Missing Receipt Title (বাংলা)" value={d.notFoundTitleBN} onChange={(v) => set({ notFoundTitleBN: v })} />
              </div>
            </SectionBlock>
          </div>
        );
      })()}

      {/* 20. CREATOR LEADERBOARD */}
      {activePage === 'creatorLeaderboard' && (() => {
        const d = pagesTheme.creatorLeaderboard;
        const set = (patch: Partial<typeof d>) => updatePage('creatorLeaderboard', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Leaderboard Header & Display Toggles">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ToggleRow label="Show Period Switcher Tabs" checked={d.showPeriodTabs} onChange={(v) => set({ showPeriodTabs: v })} />
                <ToggleRow label="Show Creator Search Bar" checked={d.showSearchBar} onChange={(v) => set({ showSearchBar: v })} />
                <ToggleRow label="Show Ranking Criteria Strip" checked={d.showCriteriaStrip} onChange={(v) => set({ showCriteriaStrip: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Top Badge Text" value={d.badgeText} onChange={(v) => set({ badgeText: v })} />
                <FieldInput label="Leaderboard Title" value={d.title} onChange={(v) => set({ title: v })} />
                <FieldInput label="Search Input Placeholder" value={d.searchPlaceholder} onChange={(v) => set({ searchPlaceholder: v })} />
              </div>
              <FieldTextarea label="Header Subtitle" rows={2} value={d.subtitle} onChange={(v) => set({ subtitle: v })} />
            </SectionBlock>
          </div>
        );
      })()}

      {/* 21. WHOLESALE PORTAL & B2B CHECKOUT */}
      {activePage === 'wholesalePortal' && (() => {
        const d = pagesTheme.wholesalePortal;
        const set = (patch: Partial<typeof d>) => updatePage('wholesalePortal', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Wholesale Dashboard (/wholesale)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Dashboard Badge" value={d.dashboardBadge} onChange={(v) => set({ dashboardBadge: v })} />
                <FieldInput label="Place Order Button Label" value={d.placeOrderBtnLabel} onChange={(v) => set({ placeOrderBtnLabel: v })} />
              </div>
              <FieldTextarea label="Dashboard Default Subtitle" rows={2} value={d.dashboardSubtitle} onChange={(v) => set({ dashboardSubtitle: v })} />
            </SectionBlock>

            <SectionBlock title="Wholesale B2B Checkout (/wholesale/checkout)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldInput label="Breadcrumb Label" value={d.checkoutBreadcrumbLabel} onChange={(v) => set({ checkoutBreadcrumbLabel: v })} />
                <FieldInput label="Checkout Page Title" value={d.checkoutTitle} onChange={(v) => set({ checkoutTitle: v })} />
                <FieldInput label="Pricing Tier Badge" value={d.checkoutTierBadge} onChange={(v) => set({ checkoutTierBadge: v })} />
                <FieldInput label="Add Products Button Label" value={d.addProductsBtnLabel} onChange={(v) => set({ addProductsBtnLabel: v })} />
              </div>
              <ToggleRow label="Show Pending / Guest Wholesale Authorization Notice" checked={d.showAuthNotice} onChange={(v) => set({ showAuthNotice: v })} />
              <FieldInput label="Authorization Notice Title" value={d.authNoticeTitle} onChange={(v) => set({ authNoticeTitle: v })} />
              <FieldTextarea label="Authorization Notice Body" rows={2} value={d.authNoticeBody} onChange={(v) => set({ authNoticeBody: v })} />
            </SectionBlock>
          </div>
        );
      })()}

      {/* 22. CUSTOMER PROFILE PORTAL */}
      {activePage === 'profile' && (() => {
        const d = pagesTheme.profile;
        const set = (patch: Partial<typeof d>) => updatePage('profile', patch);
        return (
          <div className="space-y-6">
            <SectionBlock title="Customer Profile Header & Tab Labels (/profile)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleRow label="Show Quick Account Metrics (Orders, Spent, Points)" checked={d.showQuickMetrics} onChange={(v) => set({ showQuickMetrics: v })} />
                <ToggleRow label="Show Role Shortcut Banners (Admin, Creator, Wholesale)" checked={d.showRoleBanners} onChange={(v) => set({ showRoleBanners: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FieldInput label="Fallback Display Name" value={d.fallbackDisplayName} onChange={(v) => set({ fallbackDisplayName: v })} />
                <FieldInput label="Orders Tab Label" value={d.ordersTabLabel} onChange={(v) => set({ ordersTabLabel: v })} />
                <FieldInput label="Wishlist Tab Label" value={d.wishlistTabLabel} onChange={(v) => set({ wishlistTabLabel: v })} />
                <FieldInput label="Addresses Tab Label" value={d.addressesTabLabel} onChange={(v) => set({ addressesTabLabel: v })} />
                <FieldInput label="Skin & Routine Tab Label" value={d.routineTabLabel} onChange={(v) => set({ routineTabLabel: v })} />
                <FieldInput label="Loyalty Tab Label" value={d.loyaltyTabLabel} onChange={(v) => set({ loyaltyTabLabel: v })} />
                <FieldInput label="Reviews Tab Label" value={d.reviewsTabLabel} onChange={(v) => set({ reviewsTabLabel: v })} />
                <FieldInput label="Support Tab Label" value={d.supportTabLabel} onChange={(v) => set({ supportTabLabel: v })} />
                <FieldInput label="Account Info Tab Label" value={d.accountTabLabel} onChange={(v) => set({ accountTabLabel: v })} />
              </div>
            </SectionBlock>
          </div>
        );
      })()}
    </div>
  );
};
