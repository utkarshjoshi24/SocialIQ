import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  mockOverviewKpis,
  mockTimeSeriesData,
  mockFormatPerformance,
  mockTopPosts,
  mockQuickInsights,
} from '../data/mockData';

export default function DashboardPage() {
  const [activeMetric, setActiveMetric] = useState('views');

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

  return (
    <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-headline-lg text-on-surface">Good evening, Utkarsh</h1>
          <p className="font-body text-body-md text-text-secondary mt-1">Here's how your content is performing.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface border border-outline-variant font-mono text-mono-sm text-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
            Synced 4m ago
          </span>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        {mockOverviewKpis.map((kpi, idx) => (
          <article
            key={idx}
            className="bg-surface border border-outline-variant rounded-lg p-5 kpi-depth flex flex-col justify-between gap-3 hover:border-outline transition-colors"
          >
            <header className="flex items-center justify-between">
              <h2 className="font-label text-label-md uppercase tracking-wider text-text-secondary">{kpi.label}</h2>
              <span className="material-symbols-outlined text-[18px] text-text-secondary">{kpi.icon}</span>
            </header>
            <div className="flex items-center justify-between gap-2">
              <p className="font-kpi text-kpi-lg-mobile md:text-kpi-lg text-on-surface tabular-nums">{kpi.value}</p>
              <span className="inline-flex items-center gap-1 font-mono text-mono-sm text-success tabular-nums">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                {kpi.delta}
              </span>
            </div>
          </article>
        ))}
      </section>

      {/* Main Charts Row */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
        {/* Performance Overview (2 cols) */}
        <div className="xl:col-span-2 bg-surface border border-outline-variant rounded-lg p-5 kpi-depth flex flex-col justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-title text-headline-md text-on-surface">Performance Overview</h2>
              <p className="font-body text-body-sm text-text-secondary">27-day trajectory across published content</p>
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
          <div className="w-full h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockTimeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      const data = payload[0].payload;
                      const val = payload[0].value;
                      return (
                        <div className="bg-surface-elevated border border-outline px-3 py-1.5 rounded shadow-lg text-on-surface font-mono text-mono-sm">
                          <span>{data.date}</span> · <span className="text-primary font-medium">{val.toLocaleString()}{metricConfig.unit}</span>
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
        </div>

        {/* Content Performance (1 col) */}
        <div className="bg-surface border border-outline-variant rounded-lg p-5 kpi-depth flex flex-col justify-between gap-4">
          <div>
            <h2 className="font-title text-headline-md text-on-surface">Content Performance</h2>
            <p className="font-body text-body-sm text-text-secondary">Average views per format</p>
          </div>

          <div className="flex flex-col gap-4 my-auto">
            {mockFormatPerformance.map((item, idx) => (
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

          <div className="pt-3 border-t border-outline-variant flex items-center justify-between">
            <span className="font-mono text-mono-sm text-text-muted">Reels lead by +42%</span>
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
              <p className="font-body text-body-sm text-text-secondary">Ranked by views and engagement efficiency</p>
            </div>
            <Link to="/posts" className="font-label text-label-md text-primary hover:underline">View all posts</Link>
          </div>

          <div className="flex flex-col divide-y divide-outline-variant">
            {mockTopPosts.map((post) => (
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
                        : 'bg-warning-container text-on-warning-container border-warning/20'
                    }`}
                  >
                    {post.tier}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Insights (1 col) */}
        <div className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-title text-headline-md text-on-surface">Quick Insights</h2>
            <Link to="/insights" className="font-label text-label-md text-primary hover:underline">All insights</Link>
          </div>

          <div className="flex flex-col gap-3">
            {mockQuickInsights.map((insight, idx) => (
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
        </div>
      </section>
    </main>
  );
}
