import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { analyticsService } from '../services/api';

// Heatmap hours for Stitch layout (7 columns)
const heatmapHourLabels = ['6a', '9a', '12p', '3p', '6p', '9p', '12a'];

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

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Filter state
  const [platform, setPlatform] = useState('All');
  const [contentType, setContentType] = useState('All');
  const [category, setCategory] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (platform !== 'All') params.platform = platform;
      if (contentType !== 'All') params.contentType = contentType;
      if (category !== 'All') params.category = category;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await analyticsService.getAnalytics(params);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [platform, contentType, category, startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Extract filter options
  const filterOptions = data?.filterOptions || {};
  const platforms = filterOptions.platforms || [];
  const contentTypes = filterOptions.contentTypes || [];
  const categories = filterOptions.categories || [];

  const totalPosts = data?.totalPosts || 0;

  // Filter Bar (shared by the results and "no results" views)
  const filterBar = (
    <section className="bg-surface border border-outline-variant rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Platform */}
      <select
        value={platform}
        onChange={(e) => setPlatform(e.target.value)}
        className="w-full px-3 py-2 rounded bg-surface-elevated border border-outline text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
      >
        <option value="All">All Platforms</option>
        {platforms.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      {/* Content Type */}
      <select
        value={contentType}
        onChange={(e) => setContentType(e.target.value)}
        className="w-full px-3 py-2 rounded bg-surface-elevated border border-outline text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
      >
        <option value="All">All Types</option>
        {contentTypes.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* Category */}
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full px-3 py-2 rounded bg-surface-elevated border border-outline text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
      >
        <option value="All">All Categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* Start Date */}
      <input
        type="date"
        value={startDate}
        max={endDate || undefined}
        aria-label="Start date"
        onChange={(e) => setStartDate(e.target.value)}
        className="w-full px-3 py-2 rounded bg-surface-elevated border border-outline text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
        placeholder="Start date"
      />

      {/* End Date */}
      <input
        type="date"
        value={endDate}
        min={startDate || undefined}
        aria-label="End date"
        onChange={(e) => setEndDate(e.target.value)}
        className="w-full px-3 py-2 rounded bg-surface-elevated border border-outline text-on-surface font-body text-body-md focus:border-primary focus:outline-none"
        placeholder="End date"
      />
    </section>
  );

  const filtersActive =
    platform !== 'All' || contentType !== 'All' || category !== 'All' || Boolean(startDate) || Boolean(endDate);

  const resetFilters = () => {
    setPlatform('All');
    setContentType('All');
    setCategory('All');
    setStartDate('');
    setEndDate('');
  };

  // ----- Loading State -----
  if (loading) {
    return (
      <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-headline text-headline-lg text-on-surface">Analytics</h1>
          <p className="font-body text-body-md text-text-secondary mt-1">Loading analytics…</p>
        </div>
        {data ? filterBar : <div className="bg-surface border border-outline-variant rounded-lg p-5 animate-pulse h-20" />}
        <div className="bg-surface border border-outline-variant rounded-lg p-5 animate-pulse h-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-surface border border-outline-variant rounded-lg p-5 animate-pulse h-52" />
          <div className="bg-surface border border-outline-variant rounded-lg p-5 animate-pulse h-52" />
        </div>
      </main>
    );
  }

  // ----- Error State -----
  if (error) {
    return (
      <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-headline text-headline-lg text-on-surface">Analytics</h1>
          <p className="font-body text-body-md text-text-secondary mt-1">
            Descriptive and diagnostic performance metrics across your dataset.
          </p>
        </div>
        {data && filterBar}
        <div className="p-4 rounded-lg bg-error-container border border-error/20 text-on-error-container font-body text-body-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchAnalytics}
            className="px-3 py-1 rounded bg-surface border border-outline text-on-surface hover:bg-surface-elevated font-label text-label-md"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  // ----- No Results State (filters matched nothing, but the dataset has posts) -----
  if (data?.isEmpty && data.datasetPosts > 0) {
    return (
      <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-headline text-headline-lg text-on-surface">Analytics</h1>
          <p className="font-body text-body-md text-text-secondary mt-1">
            Descriptive and diagnostic performance metrics across your dataset.
          </p>
        </div>
        {filterBar}
        <section className="bg-surface border border-outline-variant rounded-lg p-12 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-surface-elevated border border-outline flex items-center justify-center text-text-muted">
            <span className="material-symbols-outlined text-[24px]">filter_alt_off</span>
          </div>
          <h2 className="font-title text-headline-md text-on-surface">No posts match these filters</h2>
          <p className="font-body text-body-sm text-text-secondary max-w-sm">
            None of your {data.datasetPosts} posts fall within the selected platform, type, category and date range.
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-2 px-4 py-1.5 rounded bg-surface-elevated border border-outline text-primary font-label text-label-md hover:bg-surface-hover"
            >
              Reset Filters
            </button>
          )}
        </section>
      </main>
    );
  }

  // ----- Empty / No-Data State -----
  if (!data || data.isEmpty) {
    return (
      <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-headline text-headline-lg text-on-surface">Analytics</h1>
          <p className="font-body text-body-md text-text-secondary mt-1">
            Descriptive and diagnostic performance metrics across your dataset.
          </p>
        </div>
        <section className="bg-surface border border-outline-variant rounded-lg p-12 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-surface-elevated border border-outline flex items-center justify-center text-text-muted">
            <span className="material-symbols-outlined text-[24px]">query_stats</span>
          </div>
          <h2 className="font-title text-headline-md text-on-surface">No analytics data</h2>
          <p className="font-body text-body-sm text-text-secondary max-w-sm">
            Your dataset is empty. Upload a CSV or add posts to generate analytics.
          </p>
        </section>
      </main>
    );
  }

  // ----- Live Data -----
  const descriptiveStats = data.descriptiveStats || [];
  const contentAnalysis = data.contentAnalysis || [];
  const categoryAnalysis = data.categoryAnalysis || [];
  const dayAnalysis = data.dayAnalysis || [];
  const heatmapMatrix = data.heatmapMatrix || [];
  const correlationMatrix = data.correlationMatrix || [];

  // Compute day lead text
  const peakDay = dayAnalysis.find((d) => d.isPeak);
  const dayLeadText = peakDay && peakDay.count > 0
    ? `${peakDay.fullDay || peakDay.day} leads volume`
    : '';

  return (
    <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
      {/* Page Heading */}
      <div>
        <h1 className="font-headline text-headline-lg text-on-surface">Analytics</h1>
        <p className="font-body text-body-md text-text-secondary mt-1">
          Descriptive and diagnostic performance metrics across your dataset.
        </p>
      </div>

      {filterBar}

      {/* 1. Descriptive Statistics Section */}
      {descriptiveStats.length > 0 && (
        <section className="bg-surface border border-outline-variant rounded-lg overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <div>
              <h2 className="font-label text-label-md uppercase tracking-wider text-primary">Descriptive Statistics</h2>
              <p className="font-body text-body-sm text-text-secondary mt-0.5">Distribution summary across {totalPosts} published posts</p>
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
                {descriptiveStats.map((row, idx) => (
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
      )}

      {/* 2. Content & Category Analysis Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Content Analysis */}
        <div className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-label text-label-md uppercase tracking-wider text-primary">Content Analysis</h2>
            <p className="font-title text-headline-md text-on-surface mt-0.5">Average engagement by format</p>
          </div>
          {contentAnalysis.length > 0 ? (
            <div className="flex flex-col gap-4 my-auto">
              {contentAnalysis.map((item, idx) => (
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
          ) : (
            <div className="flex-1 flex items-center justify-center py-8 text-text-muted font-body text-body-sm">
              No content analysis data.
            </div>
          )}
        </div>

        {/* Category Analysis */}
        <div className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-label text-label-md uppercase tracking-wider text-secondary">Category Analysis</h2>
            <p className="font-title text-headline-md text-on-surface mt-0.5">Performance by content genre</p>
          </div>
          {categoryAnalysis.length > 0 ? (
            <div className="flex flex-col gap-4 my-auto">
              {categoryAnalysis.map((item, idx) => (
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
          ) : (
            <div className="flex-1 flex items-center justify-center py-8 text-text-muted font-body text-body-sm">
              No category analysis data.
            </div>
          )}
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
                {heatmapHourLabels.map((h) => (
                  <span key={h}>{h}</span>
                ))}
              </div>
              {/* Day Rows */}
              {dayLabels.map((day, dIdx) => (
                <div key={day} className="grid grid-cols-8 gap-1.5 items-center">
                  <span className="font-mono text-mono-sm text-text-secondary text-right pr-2">{day}</span>
                  {heatmapHourLabels.map((_, hIdx) => {
                    const level = heatmapMatrix[dIdx]?.[hIdx] ?? 0;
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

          {dayAnalysis.length > 0 ? (
            <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2">
              {dayAnalysis.map((item) => (
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
          ) : (
            <div className="flex-1 flex items-center justify-center py-8 text-text-muted font-body text-body-sm">
              No day analysis data.
            </div>
          )}

          <div className="pt-3 border-t border-outline-variant text-body-sm text-text-secondary flex items-center justify-between">
            <span className="font-mono text-mono-sm text-primary">{dayLeadText}</span>
          </div>
        </div>
      </section>

      {/* 4. Correlation Analysis */}
      {correlationMatrix.length > 0 && (
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
                {correlationMatrix.map((row, idx) => (
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
      )}
    </main>
  );
}
