import React, { useState } from 'react';
import { mockInsights } from '../data/mockData';

const categories = ['All', 'Performance', 'Content', 'Timing', 'Category', 'Engagement'];

export default function InsightsPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredInsights = activeCategory === 'All'
    ? mockInsights
    : mockInsights.filter((item) => item.category === activeCategory);

  return (
    <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
      {/* Page Heading & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-headline-lg text-on-surface">Insights</h1>
          <p className="font-body text-body-md text-text-secondary mt-1">
            Actionable findings from your content data.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded bg-surface border border-outline-variant self-start">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-sm font-label text-label-md transition-colors ${
                activeCategory === cat
                  ? 'bg-surface-elevated text-primary shadow-sm'
                  : 'text-text-secondary hover:text-on-surface'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        {filteredInsights.map((insight) => (
          <article
            key={insight.id}
            className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col justify-between gap-4 hover:border-outline transition-colors"
          >
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="font-label text-label-md uppercase tracking-wider text-text-secondary">
                  {insight.category}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label text-label-md border ${insight.badgeColor}`}
                >
                  {insight.badge}
                </span>
              </div>
              <h2 className="font-title text-headline-md text-on-surface leading-snug">{insight.title}</h2>
              <p className="font-body text-body-sm text-text-secondary leading-relaxed">{insight.description}</p>
            </div>

            <div className="pt-3 border-t border-outline-variant flex items-center justify-between">
              <span className="font-mono text-mono-sm text-primary tabular-nums font-medium">{insight.metric}</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${insight.dotColor}`}></span>
                <span className="font-mono text-mono-sm text-text-muted">Verified</span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
