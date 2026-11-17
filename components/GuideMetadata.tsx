import React from 'react';
import type { Guide } from '../types';
import { estimateReadingMinutes } from './ArticleEngagement';
import { parseMarkdown } from './Markdown';

export function guideFormatLabels(guide: Pick<Guide, 'body' | 'youtube'>): string[] {
  const labels = guide.youtube ? ['Video'] : [];
  const { hasCode, hasDiagrams } = parseMarkdown(guide.body);
  if (hasCode && hasDiagrams) labels.push('Code + Diagrams');
  else if (hasCode) labels.push('Code');
  else if (hasDiagrams) labels.push('Diagrams');
  return labels;
}

export const GuideMetadata = React.memo(function GuideMetadata({ guide }: { guide: Guide }) {
  return (
    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-xs font-normal text-slate-400">
      <span>{estimateReadingMinutes(guide.body)} min read</span>
      {guideFormatLabels(guide).map((label) => (
        <span key={label} className="rounded-sm border border-white/15 bg-navy-deep px-2 py-0.5 text-slate-300">{label}</span>
      ))}
    </span>
  );
});
