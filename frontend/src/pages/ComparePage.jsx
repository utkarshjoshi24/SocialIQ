import React, { useState } from 'react';
import {
  mockComparePeriodA,
  mockComparePeriodB,
  mockCompareBreakdown,
} from '../data/mockData';

export default function ComparePage() {
  const [compareMode, setCompareMode] = useState('periods');
  const [periodA, setPeriodA] = useState('November 2026');
  const [periodB, setPeriodB] = useState('October 2026');

  return (
    <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
      {/* Page Heading & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-headline-lg text-on-surface">Compare Performance</h1>
          <p className="font-body text-body-md text-text-secondary mt-1">
            Side-by-side benchmark across time periods or content formats.
          </p>
        </div>
        <div className="inline-flex p-1 rounded bg-surface border border-outline-variant self-start">
          <button
            type="button"
            onClick={() => setCompareMode('periods')}
            className={`px-3 py-1 rounded-sm font-label text-label-md transition-colors ${
              compareMode === 'periods' ? 'bg-surface-elevated text-primary shadow-sm' : 'text-text-secondary hover:text-on-surface'
            }`}
          >
            Periods
          </button>
          <button
            type="button"
            onClick={() => setCompareMode('types')}
            className={`px-3 py-1 rounded-sm font-label text-label-md transition-colors ${
              compareMode === 'types' ? 'bg-surface-elevated text-primary shadow-sm' : 'text-text-secondary hover:text-on-surface'
            }`}
          >
            Content Types
          </button>
        </div>
      </div>

      {/* Selector Bar */}
      <section className="bg-surface border border-outline-variant rounded-lg p-4 grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
        <div className="md:col-span-5 flex flex-col gap-1.5">
          <span className="font-label text-label-md uppercase tracking-wider text-primary">
            {compareMode === 'periods' ? 'Period A (Primary)' : 'Format A (Primary)'}
          </span>
          <select
            value={periodA}
            onChange={(e) => setPeriodA(e.target.value)}
            className="rounded bg-surface-elevated border border-outline px-3 py-2 font-body text-body-md text-on-surface focus:border-primary focus:outline-none"
          >
            {compareMode === 'periods' ? (
              <>
                <option value="November 2026">November 2026</option>
                <option value="October 2026">October 2026</option>
                <option value="September 2026">September 2026</option>
              </>
            ) : (
              <>
                <option value="Reels">Reels</option>
                <option value="Carousels">Carousels</option>
                <option value="Videos">Videos</option>
              </>
            )}
          </select>
        </div>

        <div className="md:col-span-1 flex items-center justify-center pt-2 md:pt-5">
          <span className="w-8 h-8 rounded-full bg-surface-elevated border border-outline flex items-center justify-center font-mono text-mono-sm text-text-muted">
            vs
          </span>
        </div>

        <div className="md:col-span-5 flex flex-col gap-1.5">
          <span className="font-label text-label-md uppercase tracking-wider text-secondary">
            {compareMode === 'periods' ? 'Period B (Benchmark)' : 'Format B (Benchmark)'}
          </span>
          <select
            value={periodB}
            onChange={(e) => setPeriodB(e.target.value)}
            className="rounded bg-surface-elevated border border-outline px-3 py-2 font-body text-body-md text-on-surface focus:border-secondary focus:outline-none"
          >
            {compareMode === 'periods' ? (
              <>
                <option value="October 2026">October 2026</option>
                <option value="September 2026">September 2026</option>
                <option value="August 2026">August 2026</option>
              </>
            ) : (
              <>
                <option value="Images">Images</option>
                <option value="Videos">Videos</option>
                <option value="Carousels">Carousels</option>
              </>
            )}
          </select>
        </div>
      </section>

      {/* 3 Comparative KPI Cards with Split Ratio Bars */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        {/* Views */}
        <article className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-label text-label-md uppercase tracking-wider text-text-secondary">Views</span>
            <span className="font-mono text-mono-sm text-success tabular-nums">+41.2%</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-mono text-mono-sm text-primary uppercase">{periodA}</p>
              <p className="font-kpi text-kpi-lg text-on-surface tabular-nums">{mockComparePeriodA.views}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-mono-sm text-secondary uppercase">{periodB}</p>
              <p className="font-title text-headline-md text-text-secondary tabular-nums">{mockComparePeriodB.views}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 pt-2">
            <div className="h-2 rounded-full bg-background-secondary overflow-hidden flex">
              <div className="bg-primary h-full" style={{ width: '58%' }}></div>
              <div className="bg-secondary h-full" style={{ width: '42%' }}></div>
            </div>
          </div>
        </article>

        {/* Reach */}
        <article className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-label text-label-md uppercase tracking-wider text-text-secondary">Reach</span>
            <span className="font-mono text-mono-sm text-success tabular-nums">+39.4%</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-mono text-mono-sm text-primary uppercase">{periodA}</p>
              <p className="font-kpi text-kpi-lg text-on-surface tabular-nums">{mockComparePeriodA.reach}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-mono-sm text-secondary uppercase">{periodB}</p>
              <p className="font-title text-headline-md text-text-secondary tabular-nums">{mockComparePeriodB.reach}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 pt-2">
            <div className="h-2 rounded-full bg-background-secondary overflow-hidden flex">
              <div className="bg-primary h-full" style={{ width: '58%' }}></div>
              <div className="bg-secondary h-full" style={{ width: '42%' }}></div>
            </div>
          </div>
        </article>

        {/* Engagement Rate */}
        <article className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-label text-label-md uppercase tracking-wider text-text-secondary">Engagement Rate</span>
            <span className="font-mono text-mono-sm text-success tabular-nums">+0.92%</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-mono text-mono-sm text-primary uppercase">{periodA}</p>
              <p className="font-kpi text-kpi-lg text-on-surface tabular-nums">{mockComparePeriodA.er}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-mono-sm text-secondary uppercase">{periodB}</p>
              <p className="font-title text-headline-md text-text-secondary tabular-nums">{mockComparePeriodB.er}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 pt-2">
            <div className="h-2 rounded-full bg-background-secondary overflow-hidden flex">
              <div className="bg-primary h-full" style={{ width: '54%' }}></div>
              <div className="bg-secondary h-full" style={{ width: '46%' }}></div>
            </div>
          </div>
        </article>
      </section>

      {/* Full Metric Breakdown Table */}
      <section className="bg-surface border border-outline-variant rounded-lg overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-outline-variant">
          <h2 className="font-title text-headline-md text-on-surface">Full Metric Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-background-secondary font-label text-label-md uppercase tracking-wider">
                <th className="px-5 py-3 text-text-muted">Metric</th>
                <th className="px-5 py-3 text-primary text-right">{periodA} (A)</th>
                <th className="px-5 py-3 text-secondary text-right">{periodB} (B)</th>
                <th className="px-5 py-3 text-text-muted text-right">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-mono text-mono-sm">
              {mockCompareBreakdown.map((row, idx) => (
                <tr key={idx} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="px-5 py-3 font-title text-body-sm text-on-surface font-medium">{row.metric}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-on-surface">{row.a}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-text-secondary">{row.b}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-success font-medium">{row.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
