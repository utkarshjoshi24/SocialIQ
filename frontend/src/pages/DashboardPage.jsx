import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { analyticsService } from '../services/api';
import TiltCard from '../components/TiltCard';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeMetric, setActiveMetric] = useState('views');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.getAnalytics();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Configure colors based on selected metric
  const getMetricConfig = () => {
    switch (activeMetric) {
      case 'reach':
        return {
          key: 'reach',
          color: '#A78BFA',
          gradientId: 'violetArea',
          formatY: (val) => `${(val / 1000).toFixed(0)}K`,
          unit: '',
        };
      case 'engagement':
        return {
          key: 'engagement',
          color: '#34D399',
          gradientId: 'greenArea',
          formatY: (val) => `${val}%`,
          unit: '% ER',
        };
      default:
        return {
          key: 'views',
          color: '#22D3EE',
          gradientId: 'cyanArea',
          formatY: (val) => `${(val / 1000).toFixed(0)}K`,
          unit: '',
        };
    }
  };

  const metricConfig = getMetricConfig();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.name?.split(' ')[0] || 'there';

  // ----- Loading State -----
  if (loading) {
    return (
      <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-headline text-headline-lg text-on-surface">{greeting()}, {userName}</h1>
          <p className="font-body text-body-md text-text-secondary mt-1">Loading your dashboard…</p>
        </div>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-surface border border-outline-variant rounded-lg p-5 kpi-depth animate-pulse">
              <div className="h-3 bg-surface-elevated rounded w-24 mb-4" />
              <div className="h-8 bg-surface-elevated rounded w-20" />
            </div>
          ))}
        </section>
        <div className="bg-surface border border-outline-variant rounded-lg p-5 kpi-depth animate-pulse h-80" />
      </main>
    );
  }

  // ----- Error State -----
  if (error) {
    return (
      <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-headline text-headline-lg text-on-surface">{greeting()}, {userName}</h1>
          <p className="font-body text-body-md text-text-secondary mt-1">Here's how your content is performing.</p>
        </div>
        <div className="p-4 rounded-lg bg-error-container border border-error/20 text-on-error-container font-body text-body-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchDashboard}
            className="px-3 py-1 rounded bg-surface border border-outline text-on-surface hover:bg-surface-elevated font-label text-label-md"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  // ----- Empty / No-Data State -----
  if (!data || data.isEmpty) {
    return (
      <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-headline text-headline-lg text-on-surface">{greeting()}, {userName}</h1>
          <p className="font-body text-body-md text-text-secondary mt-1">Here's how your content is performing.</p>
        </div>
        <section className="bg-surface border border-outline-variant rounded-lg p-12 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-surface-elevated border border-outline flex items-center justify-center text-text-muted">
            <span className="material-symbols-outlined text-[24px]">bar_chart</span>
          </div>
          <h2 className="font-title text-headline-md text-on-surface">No data yet</h2>
          <p className="font-body text-body-sm text-text-secondary max-w-sm">
            Upload a CSV dataset or add posts manually to see your analytics dashboard come alive.
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
        </section>
      </main>
    );
  }

  // ----- Live Data -----
  const kpiCards = data.overviewKpiCards || [];
  const timeSeries = data.timeSeries || [];
  const formatPerformance = data.formatPerformance || [];
  const topPosts = data.topPosts || [];
  const quickInsights = data.quickInsights || [];
  const totalPosts = data.totalPosts || 0;

  // Compute content lead insight for footer
  const contentLeadText = formatPerformance.length >= 2
    ? (() => {
        const top = formatPerformance[0];
        const runner = formatPerformance[1];
        if (top && runner && top.percentage > 0 && runner.percentage > 0) {
          const diff = Math.round(((top.percentage - runner.percentage) / runner.percentage) * 100);
          return diff > 0 ? `${top.format} lead by +${diff}%` : `${top.format} leads your library`;
        }
        return top ? `${top.format} leads your library` : '';
      })()
    : formatPerformance.length === 1
      ? `${formatPerformance[0].format} leads your library`
      : '';

  return (
    <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-headline-lg text-on-surface">{greeting()}, {userName}</h1>
          <p className="font-body text-body-md text-text-secondary mt-1">Here's how your content is performing.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface border border-outline-variant font-mono text-mono-sm text-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
            {totalPosts} posts analyzed
          </span>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-stretch">
        {kpiCards.map((kpi, idx) => (
          <TiltCard
            key={idx}
            className="bg-surface border border-outline-variant rounded-lg p-5 kpi-depth flex flex-col justify-between gap-3 hover:border-outline"
          >
            <header className="flex items-center justify-between">
              <h2 className="font-label text-label-md uppercase tracking-wider text-text-secondary">{kpi.label}</h2>
              <span className="material-symbols-outlined text-[18px] text-text-secondary">{kpi.icon}</span>
            </header>
            <div className="flex flex-col gap-1">
              <p className="font-kpi text-kpi-lg-mobile md:text-kpi-lg text-on-surface tabular-nums">{kpi.value}</p>
              {kpi.caption && (
                <span className="font-mono text-mono-sm text-text-muted tabular-nums">{kpi.caption}</span>
              )}
            </div>
          </TiltCard>
        ))}
      </section>

      {/* Main Charts Row */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
        {/* Performance Overview (2 cols) */}
        <div className="xl:col-span-2 bg-surface border border-outline-variant rounded-lg p-5 kpi-depth depth-hover flex flex-col justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-title text-headline-md text-on-surface">Performance Overview</h2>
              <p className="font-body text-body-sm text-text-secondary">Trajectory across published content</p>
            </div>
            <div className="inline-flex p-1 rounded bg-background-secondary border border-outline-variant self-start" role="tablist">
              {['views', 'reach', 'engagement'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveMetric(tab)}
                  className={`px-3 py-1 rounded-sm font-label text-label-md capitalize transition-colors ${
                    activeMetric === tab
                      ? 'bg-surface-elevated text-primary'
                      : 'text-text-secondary hover:text-on-surface'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Recharts Area Chart */}
          {timeSeries.length > 0 ? (
            <div className="w-full h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cyanArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#22D3EE" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="violetArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="greenArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34D399" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#34D399" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    minTickGap={28}
                    stroke="#1D2028"
                    tick={{ fill: '#828B99', fontSize: 11, fontFamily: 'Spline Sans Mono, monospace' }}
                    tickLine={false}
                    axisLine={{ stroke: '#1D2028' }}
                  />
                  <YAxis
                    stroke="#1D2028"
                    tick={{ fill: '#828B99', fontSize: 11, fontFamily: 'Spline Sans Mono, monospace' }}
                    tickLine={false}
                    axisLine={{ stroke: '#1D2028' }}
                    tickFormatter={metricConfig.formatY}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        const val = payload[0].value;
                        return (
                          <div className="bg-surface-elevated border border-outline px-3 py-1.5 rounded shadow-lg text-on-surface font-mono text-mono-sm">
                            <span>{d.date}</span> · <span className="text-primary font-medium">{val.toLocaleString()}{metricConfig.unit}</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={metricConfig.key}
                    stroke={metricConfig.color}
                    strokeWidth={2.2}
                    fill={`url(#${metricConfig.gradientId})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="w-full h-64 flex items-center justify-center text-text-muted font-body text-body-sm">
              <span>Not enough data points for a chart yet.</span>
            </div>
          )}
        </div>

        {/* Content Performance (1 col) */}
        <div className="bg-surface border border-outline-variant rounded-lg p-5 kpi-depth depth-hover flex flex-col justify-between gap-4">
          <div>
            <h2 className="font-title text-headline-md text-on-surface">Content Performance</h2>
            <p className="font-body text-body-sm text-text-secondary">Average views per format</p>
          </div>

          {formatPerformance.length > 0 ? (
            <div className="flex flex-col gap-4 my-auto">
              {formatPerformance.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="font-title text-on-surface">{item.format}</span>
                    <span className={`font-mono text-mono-sm tabular-nums ${item.textColor}`}>{item.avgViews}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-background-secondary overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-muted font-body text-body-sm">
              No content format data available.
            </div>
          )}

          <div className="pt-3 border-t border-outline-variant flex items-center justify-between">
            <span className="font-mono text-mono-sm text-text-muted">{contentLeadText}</span>
            <Link to="/analytics" className="font-label text-label-md text-primary hover:underline">Full analysis</Link>
          </div>
        </div>
      </section>

      {/* Bottom Grid: Top Performing Posts & Quick Insights */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
        {/* Top Performing Posts (2 cols) */}
        <div className="xl:col-span-2 bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-title text-headline-md text-on-surface">Top Performing Posts</h2>
              <p className="font-body text-body-sm text-text-secondary">Ranked by views · tier from performance score</p>
            </div>
            <Link to="/posts" className="font-label text-label-md text-primary hover:underline">View all posts</Link>
          </div>

          {topPosts.length > 0 ? (
            <div className="flex flex-col divide-y divide-outline-variant">
              {topPosts.map((post) => (
                <div key={post.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded bg-surface-elevated border border-outline flex items-center justify-center shrink-0">
                      <span className={`material-symbols-outlined text-[18px] ${post.iconColor}`}>{post.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-title text-title-sm text-on-surface truncate">{post.title}</p>
                      <p className="font-body text-body-sm text-text-secondary">{post.type} · {post.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 shrink-0">
                    <div className="text-right">
                      <p className="font-mono text-mono-sm text-on-surface tabular-nums">{post.views}</p>
                      <p className="font-label text-label-md text-text-muted">Views</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="font-mono text-mono-sm text-success tabular-nums">{post.er}</p>
                      <p className="font-label text-label-md text-text-muted">ER</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label text-label-md border ${
                        post.tier === 'High'
                          ? 'bg-success-container text-on-success-container border-success/20'
                          : post.tier === 'Medium'
                            ? 'bg-warning-container text-on-warning-container border-warning/20'
                            : 'bg-error-container text-on-error-container border-error/20'
                      }`}
                    >
                      {post.tier}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-text-muted font-body text-body-sm">
              No top posts to display yet.
            </div>
          )}
        </div>

        {/* Quick Insights (1 col) */}
        <div className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-title text-headline-md text-on-surface">Quick Insights</h2>
            <Link to="/insights" className="font-label text-label-md text-primary hover:underline">All insights</Link>
          </div>

          {quickInsights.length > 0 ? (
            <div className="flex flex-col gap-3">
              {quickInsights.map((insight, idx) => (
                <div key={idx} className="p-3.5 rounded bg-surface-elevated border border-outline-variant">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${insight.dotColor}`}></span>
                    <span className={`font-label text-label-md uppercase tracking-wider ${insight.tagColor}`}>{insight.tag}</span>
                  </div>
                  <p className="font-body text-body-sm text-on-surface">
                    {insight.text.split(insight.highlight)[0]}
                    <span className={`font-mono ${insight.tagColor}`}>{insight.highlight}</span>
                    {insight.text.split(insight.highlight)[1]}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-8 text-text-muted font-body text-body-sm">
              <p>Upload more posts to generate insights.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
