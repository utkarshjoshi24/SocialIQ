import React from 'react';
import {
  mockDescriptiveStats,
  mockContentAnalysis,
  mockCategoryAnalysis,
  mockDayAnalysis,
  mockCorrelationMatrix,
} from '../data/mockData';

// Heatmap days and hours
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = ['6a', '9a', '12p', '3p', '6p', '9p', '12a'];

// Heatmap density mapping (0: low, 1: mid-low, 2: mid-high, 3: peak)
const heatmapMatrix = [
  [0, 1, 1, 2, 2, 1, 0], // Mon
  [0, 1, 2, 2, 3, 2, 0], // Tue
  [1, 1, 2, 3, 3, 2, 1], // Wed
  [1, 2, 2, 3, 3, 3, 1], // Thu
  [1, 2, 3, 3, 3, 3, 2], // Fri (Peak)
  [0, 2, 2, 2, 2, 1, 1], // Sat
  [0, 1, 1, 2, 2, 1, 0], // Sun
];

const getHeatmapColor = (level) => {
  switch (level) {
    case 3:
      return 'bg-primary text-background font-bold';
    case 2:
      return 'bg-primary/60 text-on-surface';
    case 1:
      return 'bg-primary-container text-on-primary-container';
    default:
      return 'bg-surface-elevated text-text-muted border border-outline-variant';
  }
};

export default function AnalyticsPage() {
  return (
    <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
      {/* Page Heading */}
      <div>
        <h1 className="font-headline text-headline-lg text-on-surface">Analytics</h1>
        <p className="font-body text-body-md text-text-secondary mt-1">
          Descriptive and diagnostic performance metrics across your dataset.
        </p>
      </div>

      {/* 1. Descriptive Statistics Section */}
      <section className="bg-surface border border-outline-variant rounded-lg overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
          <div>
            <h2 className="font-label text-label-md uppercase tracking-wider text-primary">Descriptive Statistics</h2>
            <p className="font-body text-body-sm text-text-secondary mt-0.5">Distribution summary across 148 published posts</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-background-secondary">
                <th className="px-5 py-3 font-label text-label-md uppercase tracking-wider text-text-muted">Metric</th>
                <th className="px-5 py-3 font-label text-label-md uppercase tracking-wider text-text-muted text-right">Mean</th>
                <th className="px-5 py-3 font-label text-label-md uppercase tracking-wider text-text-muted text-right">Median</th>
                <th className="px-5 py-3 font-label text-label-md uppercase tracking-wider text-text-muted text-right">Std. Dev</th>
                <th className="px-5 py-3 font-label text-label-md uppercase tracking-wider text-text-muted text-right">Minimum</th>
                <th className="px-5 py-3 font-label text-label-md uppercase tracking-wider text-text-muted text-right">Maximum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-mono text-mono-sm">
              {mockDescriptiveStats.map((row, idx) => (
                <tr key={idx} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="px-5 py-3 font-title text-body-sm text-on-surface font-medium">{row.metric}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-on-surface">{row.mean}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-text-secondary">{row.median}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-text-secondary">{row.std}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-text-muted">{row.min}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-primary font-medium">{row.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Content & Category Analysis Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Content Analysis */}
        <div className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-label text-label-md uppercase tracking-wider text-primary">Content Analysis</h2>
            <p className="font-title text-headline-md text-on-surface mt-0.5">Average engagement by format</p>
          </div>
          <div className="flex flex-col gap-4 my-auto">
            {mockContentAnalysis.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-body-sm">
                  <span className="font-title text-on-surface">{item.format}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-mono-sm text-primary tabular-nums">{item.avgEng}</span>
                    <span className="font-mono text-mono-sm text-text-muted">({item.count} posts)</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-background-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: item.width }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Analysis */}
        <div className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-label text-label-md uppercase tracking-wider text-secondary">Category Analysis</h2>
            <p className="font-title text-headline-md text-on-surface mt-0.5">Performance by content genre</p>
          </div>
          <div className="flex flex-col gap-4 my-auto">
            {mockCategoryAnalysis.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-body-sm">
                  <span className="font-title text-on-surface">{item.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-mono-sm text-secondary tabular-nums">{item.avgViews} views</span>
                    <span className="font-mono text-mono-sm text-text-muted">({item.eng})</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-background-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-secondary" style={{ width: item.width }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Time Analysis & Day Analysis Row */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
        {/* Time Analysis Heatmap (2 cols) */}
        <div className="xl:col-span-2 bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-label text-label-md uppercase tracking-wider text-primary">Time Analysis</h2>
              <p className="font-title text-headline-md text-on-surface mt-0.5">Engagement heatmap (Day × Hour)</p>
            </div>
            {/* Heatmap Legend */}
            <div className="flex items-center gap-1.5 font-mono text-mono-sm text-text-muted">
              <span>Low</span>
              <span className="w-3 h-3 rounded-sm bg-surface-elevated border border-outline-variant" />
              <span className="w-3 h-3 rounded-sm bg-primary-container" />
              <span className="w-3 h-3 rounded-sm bg-primary/60" />
              <span className="w-3 h-3 rounded-sm bg-primary" />
              <span>Peak</span>
            </div>
          </div>

          <div className="overflow-x-auto pt-2">
            <div className="min-w-[500px] flex flex-col gap-2">
              {/* Hour Labels */}
              <div className="grid grid-cols-8 gap-1.5 text-center font-mono text-mono-sm text-text-muted">
                <div></div>
                {hours.map((h) => (
                  <span key={h}>{h}</span>
                ))}
              </div>
              {/* Day Rows */}
              {days.map((day, dIdx) => (
                <div key={day} className="grid grid-cols-8 gap-1.5 items-center">
                  <span className="font-mono text-mono-sm text-text-secondary text-right pr-2">{day}</span>
                  {hours.map((_, hIdx) => {
                    const level = heatmapMatrix[dIdx][hIdx];
                    return (
                      <div
                        key={hIdx}
                        className={`h-8 rounded flex items-center justify-center font-mono text-[11px] transition-colors ${getHeatmapColor(
                          level
                        )}`}
                      >
                        {level === 3 ? '★' : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Day Analysis (1 col) */}
        <div className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col justify-between gap-4">
          <div>
            <h2 className="font-label text-label-md uppercase tracking-wider text-primary">Day Analysis</h2>
            <p className="font-title text-headline-md text-on-surface mt-0.5">Weekly volume distribution</p>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2">
            {mockDayAnalysis.map((item) => (
              <div key={item.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="font-mono text-mono-sm text-text-muted tabular-nums">{item.count}</span>
                <div className="w-full bg-background-secondary rounded-t overflow-hidden flex flex-col justify-end h-full">
                  <div
                    className={`w-full rounded-t transition-all duration-surface-enter ${
                      item.isPeak ? 'bg-primary' : 'bg-surface-elevated border-t border-outline'
                    }`}
                    style={{ height: item.height }}
                  />
                </div>
                <span className={`font-mono text-mono-sm ${item.isPeak ? 'text-primary font-bold' : 'text-text-muted'}`}>
                  {item.day}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-outline-variant text-body-sm text-text-secondary flex items-center justify-between">
            <span className="font-mono text-mono-sm text-primary">Friday leads volume (+32%)</span>
          </div>
        </div>
      </section>

      {/* 4. Correlation Analysis */}
      <section className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-label text-label-md uppercase tracking-wider text-primary">Correlation Analysis</h2>
          <p className="font-title text-headline-md text-on-surface mt-0.5">Pearson correlation matrix across engagement signals</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-center border-collapse">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="p-2.5 text-left font-label text-label-md text-text-muted uppercase">Metric</th>
                <th className="p-2.5 font-mono text-mono-sm text-text-muted">Views</th>
                <th className="p-2.5 font-mono text-mono-sm text-text-muted">Likes</th>
                <th className="p-2.5 font-mono text-mono-sm text-text-muted">Comments</th>
                <th className="p-2.5 font-mono text-mono-sm text-text-muted">Shares</th>
                <th className="p-2.5 font-mono text-mono-sm text-text-muted">Saves</th>
                <th className="p-2.5 font-mono text-mono-sm text-text-muted">Reach</th>
                <th className="p-2.5 font-mono text-mono-sm text-text-muted">Eng. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-mono text-mono-sm">
              {mockCorrelationMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-surface-elevated/30 transition-colors">
                  <td className="p-2.5 text-left font-title text-body-sm text-on-surface font-medium">{row.metric}</td>
                  <td className="p-2.5 tabular-nums text-text-secondary">{row.views}</td>
                  <td className="p-2.5 tabular-nums text-text-secondary">{row.likes}</td>
                  <td className="p-2.5 tabular-nums text-text-secondary">{row.comments}</td>
                  <td className="p-2.5 tabular-nums text-text-secondary">{row.shares}</td>
                  <td className="p-2.5 tabular-nums text-primary font-medium">{row.saves}</td>
                  <td className="p-2.5 tabular-nums text-text-secondary">{row.reach}</td>
                  <td className="p-2.5 tabular-nums text-secondary font-medium">{row.er}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
