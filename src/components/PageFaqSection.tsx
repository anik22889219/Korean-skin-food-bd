import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { PageSeoFaqItem } from '../types';

interface PageFaqSectionProps {
  faqs: PageSeoFaqItem[];
  heading?: string;
  subheading?: string;
}

export const PageFaqSection: React.FC<PageFaqSectionProps> = ({
  faqs,
  heading = 'Frequently Asked Questions',
  subheading = 'Quick answers verified by Korean Skin Food BD',
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!faqs || faqs.length === 0) return null;

  return (
    <section
      aria-label="Frequently Asked Questions"
      className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-10 border-t border-pink-100/80"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#E91E8C]">
            <HelpCircle size={15} />
            <span>{subheading}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            {heading}
          </h2>
        </div>

        <div className="divide-y divide-slate-200/80 border-y border-slate-200/80 bg-white">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="transition-colors">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full py-4 px-2 flex items-center justify-between gap-4 text-left cursor-pointer hover:text-[#E91E8C] transition-colors"
                >
                  <span className="text-sm md:text-[15px] font-semibold text-slate-900 leading-snug">
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#E91E8C]' : 'text-slate-400'
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-2 pb-4 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
