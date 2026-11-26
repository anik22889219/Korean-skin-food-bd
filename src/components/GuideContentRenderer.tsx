import React from 'react';

function renderInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic text-gray-700">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

interface GuideContentRendererProps {
  content: string;
}

export const GuideContentRenderer: React.FC<GuideContentRendererProps> = ({ content }) => {
  const blocks = (content || '').split(/\n\s*\n/);

  return (
    <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed space-y-5">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('### ')) {
          return (
            <h2
              key={idx}
              className="text-xl sm:text-2xl font-bold text-gray-900 pt-4 border-b border-pink-50 pb-2"
            >
              {renderInlineFormatting(trimmed.replace(/^###\s+/, ''))}
            </h2>
          );
        }

        if (trimmed.startsWith('#### ')) {
          return (
            <h3 key={idx} className="text-base sm:text-lg font-bold text-gray-800 pt-2">
              {renderInlineFormatting(trimmed.replace(/^####\s+/, ''))}
            </h3>
          );
        }

        if (trimmed.startsWith('*Disclaimer:') || trimmed.startsWith('Disclaimer:')) {
          const clean = trimmed
            .replace(/^\*Disclaimer:\s*/i, 'Medical Disclaimer: ')
            .replace(/^Disclaimer:\s*/i, 'Medical Disclaimer: ')
            .replace(/\*$/, '');
          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-pink-50/40 border border-pink-100/60 text-xs text-gray-500 italic mt-6"
            >
              {clean}
            </div>
          );
        }

        const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
        const isBulletList = lines.length > 0 && lines.every((l) => /^[-*•]\s+/.test(l));
        if (isBulletList) {
          return (
            <ul key={idx} className="space-y-2 pl-5 list-disc text-sm sm:text-base text-gray-700">
              {lines.map((line, lIdx) => (
                <li key={lIdx} className="leading-relaxed">
                  {renderInlineFormatting(line.replace(/^[-*•]\s+/, ''))}
                </li>
              ))}
            </ul>
          );
        }

        const isOrderedList = lines.length > 0 && lines.every((l) => /^([0-9]+|[০-৯]+)[.)]\s+/.test(l));
        if (isOrderedList) {
          return (
            <ol key={idx} className="space-y-2.5 pl-5 list-decimal text-sm sm:text-base text-gray-700">
              {lines.map((line, lIdx) => (
                <li key={lIdx} className="leading-relaxed">
                  {renderInlineFormatting(line.replace(/^([0-9]+|[০-৯]+)[.)]\s+/, ''))}
                </li>
              ))}
            </ol>
          );
        }

        // Mixed heading + lines inside same paragraph block
        if (lines.length > 1 && lines[0].startsWith('#### ')) {
          return (
            <div key={idx} className="space-y-2.5">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 pt-2">
                {renderInlineFormatting(lines[0].replace(/^####\s+/, ''))}
              </h3>
              {lines.slice(1).map((line, lIdx) => {
                if (/^[-*•]\s+/.test(line)) {
                  return (
                    <div key={lIdx} className="flex items-start gap-2 pl-2 text-sm sm:text-base text-gray-700">
                      <span className="text-[#E91E8C] font-bold mt-0.5">•</span>
                      <span>{renderInlineFormatting(line.replace(/^[-*•]\s+/, ''))}</span>
                    </div>
                  );
                }
                return (
                  <p key={lIdx} className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    {renderInlineFormatting(line)}
                  </p>
                );
              })}
            </div>
          );
        }

        return (
          <p key={idx} className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">
            {renderInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
};
