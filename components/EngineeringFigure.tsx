import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import * as Plot from '@observablehq/plot';
import type { EvidenceTier } from '../types';

export interface EngineeringDatum {
  category: string;
  series: string;
  count: number;
}

export interface EngineeringFigureProps {
  title: string;
  subtitle: string;
  caption: string;
  data: EngineeringDatum[];
  categoryLabel?: string;
  valueLabel?: string;
}

const SERIES_COLORS: Record<string, string> = {
  'Command check': '#E68249',
  'URL check': '#FFC08B',
  'Stated limitation': '#94A3B8',
};

export function summarizeEvidenceTiers(tiers: EvidenceTier[]): EngineeringDatum[] {
  const rows: EngineeringDatum[] = [];
  for (const tier of tiers) {
    let commandCount = 0;
    let urlCount = 0;
    let limitationCount = 0;
    for (const item of tier.claims) {
      if (item.kind === 'limitation') {
        limitationCount += 1;
      } else if (item.verifyKind === 'command') {
        commandCount += 1;
      } else {
        urlCount += 1;
      }
    }
    if (commandCount > 0) rows.push({ category: tier.title, series: 'Command check', count: commandCount });
    if (urlCount > 0) rows.push({ category: tier.title, series: 'URL check', count: urlCount });
    if (limitationCount > 0) rows.push({ category: tier.title, series: 'Stated limitation', count: limitationCount });
  }
  return rows;
}

export const EngineeringFigure: React.FC<EngineeringFigureProps> = ({
  title,
  subtitle,
  caption,
  data,
  categoryLabel = 'Evidence tier',
  valueLabel = 'Claims',
}) => {
  const figureId = useId();
  const plotRef = useRef<HTMLDivElement | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const categories = useMemo(
    () => Array.from(new Set(data.map((d) => d.category))),
    [data],
  );
  const seriesList = useMemo(
    () => Array.from(new Set(data.map((d) => d.series))),
    [data],
  );

  const selected = data[selectedIdx] ?? data[0];

  useEffect(() => {
    const container = plotRef.current;
    if (!container || data.length === 0) return;

    container.replaceChildren();
    const chart = Plot.plot({
      width: 720,
      height: Math.max(180, categories.length * 64 + 48),
      marginLeft: 224,
      marginRight: 28,
      marginTop: 20,
      marginBottom: 34,
      style: {
        background: 'transparent',
        color: '#CBD5E1',
        fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
        fontSize: '12px',
        maxWidth: '100%',
        height: 'auto',
      },
      x: {
        label: valueLabel,
        grid: true,
        nice: true,
        tickFormat: 'd',
      },
      y: {
        label: null,
        domain: categories,
      },
      color: {
        domain: seriesList,
        range: seriesList.map((s) => SERIES_COLORS[s] ?? '#F0975A'),
      },
      marks: [
        Plot.barX(
          data,
          Plot.stackX({
            x: 'count',
            y: 'category',
            fill: 'series',
            title: (d: EngineeringDatum) => `${d.category}::${d.series}`,
            fillOpacity: 1,
            insetInline: 1,
            rx: 2,
          }),
        ),
        Plot.ruleX([0], { stroke: '#475569' }),
      ],
    });

    container.appendChild(chart);
    return () => {
      chart.remove();
    };
  }, [categories, data, seriesList, valueLabel]);

  useEffect(() => {
    const container = plotRef.current;
    if (!container || !selected) return;
    const targetKey = `${selected.category}::${selected.series}`;
    const rects = Array.from(container.querySelectorAll('rect'));
    for (const rect of rects) {
      const key = rect.querySelector('title')?.textContent ?? '';
      if (!key) continue;
      const active = key === targetKey;
      rect.setAttribute('fill-opacity', active ? '1' : '0.32');
      rect.style.transition = 'fill-opacity 180ms ease';
    }
  }, [data, selected]);

  return (
    <figure
      aria-labelledby={`${figureId}-title`}
      className="mb-10 rounded-lg border border-copper-500/25 bg-navy-deep/70 p-6"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 id={`${figureId}-title`} className="text-lg font-semibold text-white">
            {title}
          </h3>
          <p className="text-xs font-mono text-slate-400">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-mono text-slate-300" aria-hidden="true">
          {seriesList.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-xs"
                style={{ backgroundColor: SERIES_COLORS[s] ?? '#F0975A' }}
              />
              {s}
            </span>
          ))}
        </div>
      </div>

      <div
        ref={plotRef}
        aria-hidden="true"
        className="w-full overflow-x-auto border-y border-white/10 py-3"
      />

      {selected && (
        <p className="sr-only" aria-live="polite">
          {selected.category}, {selected.series}: {selected.count} {valueLabel.toLowerCase()}.
        </p>
      )}

      <div className="mt-4 overflow-x-auto" tabIndex={0} aria-label={`${title} data table`}>
        <table className="w-full border-collapse text-left text-xs font-mono">
          <caption className="sr-only">{title}: {caption}</caption>
          <thead>
            <tr className="border-b border-white/15 text-slate-300">
              <th scope="col" className="py-2 pr-4 font-semibold">{categoryLabel}</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Verification type</th>
              <th scope="col" className="py-2 text-right font-semibold tabular-nums">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const isRowSelected = selected && row.category === selected.category && row.series === selected.series;
              return (
                <tr
                  key={`${row.category}-${row.series}`}
                  onClick={() => setSelectedIdx(idx)}
                  className={`cursor-pointer border-b border-white/5 transition-colors ${
                    isRowSelected ? 'bg-copper-500/12 text-white' : 'text-slate-300 hover:bg-white/[0.03] opacity-85'
                  }`}
                >
                  <th scope="row" className="py-1.5 pr-4 pl-2 font-normal text-white">
                    <button
                      type="button"
                      onClick={() => setSelectedIdx(idx)}
                      aria-pressed={Boolean(isRowSelected)}
                      className="inline-flex min-h-[44px] w-full items-center text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-copper-500"
                    >
                      {row.category}
                    </button>
                  </th>
                  <td className="py-1.5 pr-4">{row.series}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-copper-300">{row.count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <figcaption className="mt-3 text-xs leading-relaxed text-slate-400">
        {caption}
      </figcaption>
    </figure>
  );
};
