import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsService } from '../services/api';

// Comparison types; `noun` is used in selector labels ("Period A (Baseline)")
const MODES = [
  { type: 'date', label: 'Periods', noun: 'Period', plural: 'months' },
  { type: 'platform', label: 'Platforms', noun: 'Platform', plural: 'platforms' },
  { type: 'contentType', label: 'Content Types', noun: 'Format', plural: 'content types' },
  { type: 'category', label: 'Categories', noun: 'Category', plural: 'categories' },
];

// Hero cards (Stitch: Views, Reach, Engagement Rate)
const HERO_CARDS = [
  { key: 'total_views', title: 'Views' },
  { key: 'total_reach', title: 'Reach' },
  { key: 'average_engagement_rate', title: 'Engagement Rate' },
];

const formatValue = (value, unit) => {
  const n = Number(value) || 0;
  if (unit === 'percent') return `${n.toFixed(2)}%`;
  if (unit === 'score') return n.toFixed(1);
  return Math.round(n).toLocaleString();
};

// Hero cards use compact counts (e.g. 761.6K, as in the Stitch design) so A and B fit side by side
const compactFormatter = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const formatHeroValue = (value, unit) =>
  unit === 'count' || unit === 'number' ? compactFormatter.format(Number(value) || 0) : formatValue(value, unit);

const formatDifference = (metric) => {
  const d = Number(metric.difference) || 0;
  const sign = d > 0 ? '+' : d < 0 ? '−' : '';
  const abs = Math.abs(d);
  if (metric.unit === 'percent') return `${sign}${abs.toFixed(2)} pp`;
  if (metric.unit === 'score') return `${sign}${abs.toFixed(1)}`;
  return `${sign}${Math.round(abs).toLocaleString()}`;
};

const formatPercent = (metric) => {
  if (metric.percentChange === null || metric.percentChange === undefined) return 'N/A';
  const p = metric.percentChange;
  const sign = p > 0 ? '+' : p < 0 ? '−' : '';
  return `${sign}${Math.abs(p).toFixed(2)}%`;
};

const changeColor = (value) => {
  if (value === null || value === undefined || value === 0) return 'text-text-muted';
  return value > 0 ? 'text-success' : 'text-error';
};

const PageHeading = ({ children }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
    <div>
      <h1 className="font-headline text-headline-lg text-on-surface">Compare Performance</h1>
      <p className="font-body text-body-md text-text-secondary mt-1">
        Side-by-side benchmark across time periods, platforms, content formats, or categories.
      </p>
    </div>
    {children}
  </div>
);

const StatePanel = ({ icon, title, children }) => (
  <section className="bg-surface border border-outline-variant rounded-lg p-12 text-center flex flex-col items-center gap-3">
    <div className="w-12 h-12 rounded-full bg-surface-elevated border border-outline flex items-center justify-center text-text-muted">
      <span className="material-symbols-outlined text-[24px]">{icon}</span>
    </div>
    <h2 className="font-title text-headline-md text-on-surface">{title}</h2>
    {children}
  </section>
);

const ErrorBanner = ({ message, onRetry }) => (
  <div
    role="alert"
    className="p-4 rounded-lg bg-error-container border border-error/20 text-on-error-container font-body text-body-sm flex items-center justify-between gap-3"
  >
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-[20px]">error</span>
      <span>{message}</span>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="px-3 py-1 rounded bg-surface border border-outline text-on-surface hover:bg-surface-elevated font-label text-label-md"
      >
        Retry
      </button>
    )}
  </div>
);

const errorMessage = (err) =>
  err.status ? err.message : 'Could not reach the SocialIQ server. Check your connection and try again.';

/**
 * Default selection: for months, A = previous month (baseline) and B = latest month;
 * otherwise A and B are the two segments with the most posts.
 */
const defaultSelection = (type, list) => {
  if (list.length < 2) return { a: '', b: '' };
  return type === 'date' ? { a: list[1].value, b: list[0].value } : { a: list[0].value, b: list[1].value };
};

export default function ComparePage() {
  const [compareMode, setCompareMode] = useState('date');
  const [options, setOptions] = useState(null);
  const [selection, setSelection] = useState({ a: '', b: '' });
  const [comparison, setComparison] = useState(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [optionsError, setOptionsError] = useState(null);
  const [compareError, setCompareError] = useState(null);
  // Separate counters so an in-flight comparison can never stall the options load (and vice versa)
  const optionsRequest = useRef(0);
  const compareRequest = useRef(0);

  const mode = MODES.find((m) => m.type === compareMode);
  const segmentOptions = options?.[compareMode] || [];

  // Load selector options for the current mode and pick a sensible default pair
  const loadOptions = useCallback(async () => {
    const id = ++optionsRequest.current;
    compareRequest.current++; // discard any comparison started for the previous selection
    setComparing(false);
    setOptionsLoading(true);
    setOptionsError(null);
    setComparison(null);
    try {
      const data = await analyticsService.compare({ type: compareMode });
      if (id !== optionsRequest.current) return;
      setOptions(data.options);
      setSelection(defaultSelection(compareMode, data.options[compareMode] || []));
    } catch (err) {
      if (id !== optionsRequest.current) return;
      setOptions(null);
      setOptionsError(errorMessage(err));
    } finally {
      if (id === optionsRequest.current) setOptionsLoading(false);
    }
  }, [compareMode]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // Run the comparison whenever both segments are chosen
  const runComparison = useCallback(async () => {
    if (!selection.a || !selection.b || selection.a === selection.b) return;
    const id = ++compareRequest.current;
    setComparing(true);
    setCompareError(null);
    try {
      const data = await analyticsService.compare({ type: compareMode, a: selection.a, b: selection.b });
      if (id !== compareRequest.current) return;
      setComparison(data.comparison);
    } catch (err) {
      if (id !== compareRequest.current) return;
      setComparison(null);
      setCompareError(errorMessage(err));
    } finally {
      if (id === compareRequest.current) setComparing(false);
    }
  }, [compareMode, selection.a, selection.b]);

  useEffect(() => {
    if (!optionsLoading) runComparison();
  }, [optionsLoading, runComparison]);

  // Reset in the same render as the mode change so no comparison runs with the
  // previous mode's selection (e.g. months sent as platforms)
  const switchMode = (type) => {
    if (type === compareMode) return;
    setOptionsLoading(true);
    setSelection({ a: '', b: '' });
    setComparison(null);
    setCompareError(null);
    setCompareMode(type);
  };

  const modeToggle = (
    <div className="inline-flex flex-wrap p-1 rounded bg-surface border border-outline-variant self-start">
      {MODES.map((m) => (
        <button
          key={m.type}
          type="button"
          onClick={() => switchMode(m.type)}
          className={`px-3 py-1 rounded-sm font-label text-label-md transition-colors ${
            compareMode === m.type ? 'bg-surface-elevated text-primary shadow-sm' : 'text-text-secondary hover:text-on-surface'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  // ----- Loading State -----
  if (optionsLoading) {
    return (
      <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
        <PageHeading>{modeToggle}</PageHeading>
        <div className="bg-surface border border-outline-variant rounded-lg p-4 h-24 animate-pulse" aria-busy="true" />
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface border border-outline-variant rounded-lg p-5 h-36 animate-pulse" />
          ))}
        </section>
      </main>
    );
  }

  // ----- Error State (options) -----
  if (optionsError) {
    return (
      <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
        <PageHeading>{modeToggle}</PageHeading>
        <ErrorBanner message={optionsError} onRetry={loadOptions} />
      </main>
    );
  }

  // ----- Empty State -----
  const hasPosts = (options?.date || []).length > 0;
  if (!hasPosts) {
    return (
      <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
        <PageHeading>{modeToggle}</PageHeading>
        <StatePanel icon="compare_arrows" title="No data to compare yet">
          <p className="font-body text-body-sm text-text-secondary max-w-sm">
            Upload a CSV dataset or add posts manually to compare periods, platforms, formats, and categories.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Link
              to="/upload"
              className="px-4 py-2 rounded bg-primary text-on-primary font-label text-title-sm font-medium hover:opacity-95"
            >
              Upload CSV
            </Link>
            <Link
              to="/posts"
              className="px-4 py-1.5 rounded bg-surface-elevated border border-outline text-primary font-label text-label-md hover:bg-surface-hover"
            >
              Add Posts
            </Link>
          </div>
        </StatePanel>
      </main>
    );
  }

  // ----- Not enough segments for this mode -----
  if (segmentOptions.length < 2) {
    return (
      <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
        <PageHeading>{modeToggle}</PageHeading>
        <StatePanel icon="compare_arrows" title={`Only one ${mode.noun.toLowerCase()} in your data`}>
          <p className="font-body text-body-sm text-text-secondary max-w-md">
            A comparison needs posts in at least two {mode.plural}. Your posts are all in{' '}
            {segmentOptions[0]?.label || 'a single group'}. Try another comparison type or add more posts.
          </p>
        </StatePanel>
      </main>
    );
  }

  const labelA = segmentOptions.find((o) => o.value === selection.a)?.label || 'A';
  const labelB = segmentOptions.find((o) => o.value === selection.b)?.label || 'B';
  const metrics = comparison?.status === 'ok' ? comparison.metrics : [];
  const metricByKey = Object.fromEntries(metrics.map((m) => [m.key, m]));

  const renderSelect = (side) => {
    const isA = side === 'a';
    const other = isA ? selection.b : selection.a;
    return (
      <div className="md:col-span-5 flex flex-col gap-1.5">
        <span className={`font-label text-label-md uppercase tracking-wider ${isA ? 'text-primary' : 'text-secondary'}`}>
          {mode.noun} {isA ? 'A (Baseline)' : 'B (Compared)'}
        </span>
        <select
          value={selection[side]}
          onChange={(e) => setSelection((prev) => ({ ...prev, [side]: e.target.value }))}
          className={`rounded bg-surface-elevated border border-outline px-3 py-2 font-body text-body-md text-on-surface focus:outline-none ${
            isA ? 'focus:border-primary' : 'focus:border-secondary'
          }`}
        >
          {segmentOptions.map((o) => (
            <option key={o.value} value={o.value} disabled={o.value === other}>
              {o.label} ({o.posts} post{o.posts === 1 ? '' : 's'})
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
      {/* Page Heading & Toggle */}
      <PageHeading>{modeToggle}</PageHeading>

      {/* Selector Bar */}
      <section className="bg-surface border border-outline-variant rounded-lg p-4 grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
        {renderSelect('a')}
        <div className="md:col-span-1 flex items-center justify-center pt-2 md:pt-5">
          <span className="w-8 h-8 rounded-full bg-surface-elevated border border-outline flex items-center justify-center font-mono text-mono-sm text-text-muted">
            vs
          </span>
        </div>
        {renderSelect('b')}
      </section>

      {compareError && <ErrorBanner message={compareError} onRetry={runComparison} />}

      {/* Segment empty (both chosen but one has no posts) */}
      {comparison && comparison.status !== 'ok' && (
        <StatePanel icon="info" title="Nothing to compare">
          <p className="font-body text-body-sm text-text-secondary max-w-md">
            {comparison.status === 'bothEmpty'
              ? `Neither ${labelA} nor ${labelB} has any posts.`
              : `${comparison.status === 'emptyA' ? labelA : labelB} has no posts, so a comparison would not be meaningful.`}
          </p>
        </StatePanel>
      )}

      {(metrics.length > 0 || comparing) && (
        <div className={`flex flex-col gap-6 ${comparing ? 'opacity-60 animate-pulse' : ''}`} aria-busy={comparing}>
          {/* Summary */}
          {comparison?.summary && (
            <section className="bg-surface border border-outline-variant rounded-lg p-4 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">insights</span>
                <p className="font-body text-body-sm text-on-surface leading-relaxed">
                  {comparison.summary}{' '}
                  <span className="text-text-muted">
                    ({labelA}: {comparison.segments.a.posts} posts · {labelB}: {comparison.segments.b.posts} posts.
                    Changes show B relative to A.)
                  </span>
                </p>
              </div>
              {comparison.warnings?.map((w) => (
                <div key={w} className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] text-warning shrink-0">warning</span>
                  <p className="font-body text-body-sm text-text-secondary">{w}</p>
                </div>
              ))}
            </section>
          )}

          {/* 3 Comparative KPI Cards with Split Ratio Bars */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {HERO_CARDS.map(({ key, title }) => {
              const m = metricByKey[key];
              const a = Number(m?.a) || 0;
              const b = Number(m?.b) || 0;
              const share = a + b > 0 ? (a / (a + b)) * 100 : 50;
              return (
                <article key={key} className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-label text-label-md uppercase tracking-wider text-text-secondary">{title}</span>
                    <span
                      className={`font-mono text-mono-sm tabular-nums ${changeColor(m?.percentChange)}`}
                      title={m?.note || 'Change of B relative to A'}
                    >
                      {m ? formatPercent(m) : '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-mono-sm text-primary uppercase truncate">{labelA}</p>
                      <p className="font-kpi text-kpi-lg text-on-surface tabular-nums" title={m ? formatValue(a, m.unit) : undefined}>
                        {m ? formatHeroValue(a, m.unit) : '—'}
                      </p>
                    </div>
                    <div className="text-right min-w-0">
                      <p className="font-mono text-mono-sm text-secondary uppercase truncate">{labelB}</p>
                      <p
                        className="font-title text-headline-md text-text-secondary tabular-nums"
                        title={m ? formatValue(b, m.unit) : undefined}
                      >
                        {m ? formatHeroValue(b, m.unit) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 pt-2">
                    <div className="h-2 rounded-full bg-background-secondary overflow-hidden flex">
                      {a + b > 0 && (
                        <>
                          <div className="bg-primary h-full" style={{ width: `${share}%` }}></div>
                          <div className="bg-secondary h-full" style={{ width: `${100 - share}%` }}></div>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
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
                    <th className="px-5 py-3 text-primary text-right">{labelA} (A)</th>
                    <th className="px-5 py-3 text-secondary text-right">{labelB} (B)</th>
                    <th className="px-5 py-3 text-text-muted text-right">Difference</th>
                    <th className="px-5 py-3 text-text-muted text-right">% Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant font-mono text-mono-sm">
                  {metrics.map((row) => (
                    <tr key={row.key} className="hover:bg-surface-elevated/40 transition-colors">
                      <td className="px-5 py-3 font-title text-body-sm text-on-surface font-medium">{row.label}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-on-surface">{formatValue(row.a, row.unit)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-text-secondary">{formatValue(row.b, row.unit)}</td>
                      <td className={`px-5 py-3 text-right tabular-nums font-medium ${changeColor(row.difference)}`}>
                        {formatDifference(row)}
                      </td>
                      <td
                        className={`px-5 py-3 text-right tabular-nums font-medium ${changeColor(row.percentChange)}`}
                        title={row.note || undefined}
                      >
                        {formatPercent(row)}
                        {row.note && <span className="block text-text-muted font-normal">{row.note}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
