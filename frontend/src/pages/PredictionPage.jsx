import React, { useState } from 'react';
import { calculateMockPrediction } from '../data/mockData';

export default function PredictionPage() {
  const [params, setParams] = useState({
    platform: 'Instagram',
    content_type: 'Reel',
    category: 'Travel',
    caption_length: 120,
    hashtags_count: 7,
    duration_seconds: 28,
    posting_hour: 20,
    day_of_week: 'Friday',
  });

  const [result, setResult] = useState(() => calculateMockPrediction(params));
  const [isCalculating, setIsCalculating] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsCalculating(true);
    setTimeout(() => {
      const pred = calculateMockPrediction(params);
      setResult(pred);
      setIsCalculating(false);
    }, 250);
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'HIGH':
        return 'text-success';
      case 'LOW':
        return 'text-error';
      default:
        return 'text-warning';
    }
  };

  return (
    <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
      {/* Page Heading */}
      <div>
        <h1 className="font-headline text-headline-lg text-on-surface">Performance Prediction</h1>
        <p className="font-body text-body-md text-text-secondary mt-1">
          Estimate how a new post may perform based on historical patterns.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Input Form (7 cols) */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-surface border border-outline-variant rounded-lg p-6 flex flex-col gap-5"
        >
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <h2 className="font-title text-headline-md text-on-surface">Post Parameters</h2>
            <span className="font-mono text-mono-sm text-text-muted">8 features</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Platform */}
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Platform</span>
              <select
                value={params.platform}
                onChange={(e) => setParams({ ...params, platform: e.target.value })}
                className="rounded bg-surface-elevated border border-outline px-3 py-2 font-body text-body-md text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="Instagram">Instagram</option>
                <option value="YouTube">YouTube</option>
                <option value="LinkedIn">LinkedIn</option>
              </select>
            </label>

            {/* Content Type */}
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Content Type</span>
              <select
                value={params.content_type}
                onChange={(e) => setParams({ ...params, content_type: e.target.value })}
                className="rounded bg-surface-elevated border border-outline px-3 py-2 font-body text-body-md text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="Reel">Reel</option>
                <option value="Carousel">Carousel</option>
                <option value="Video">Video</option>
                <option value="Image">Image</option>
              </select>
            </label>

            {/* Category */}
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Category</span>
              <select
                value={params.category}
                onChange={(e) => setParams({ ...params, category: e.target.value })}
                className="rounded bg-surface-elevated border border-outline px-3 py-2 font-body text-body-md text-on-surface focus:border-primary focus:outline-none"
              >
                <option value="Travel">Travel</option>
                <option value="Tech">Tech</option>
                <option value="Education">Education</option>
                <option value="Community">Community</option>
                <option value="Lifestyle">Lifestyle</option>
              </select>
            </label>

            {/* Caption Length */}
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Caption Length (chars)</span>
              <input
                type="number"
                min="0"
                max="2200"
                value={params.caption_length}
                onChange={(e) => setParams({ ...params, caption_length: parseInt(e.target.value, 10) || 0 })}
                className="rounded bg-surface-elevated border border-outline px-3 py-2 font-body text-body-md text-on-surface focus:border-primary focus:outline-none"
              />
            </label>

            {/* Hashtag Count */}
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Hashtags Count</span>
              <input
                type="number"
                min="0"
                max="30"
                value={params.hashtags_count}
                onChange={(e) => setParams({ ...params, hashtags_count: parseInt(e.target.value, 10) || 0 })}
                className="rounded bg-surface-elevated border border-outline px-3 py-2 font-body text-body-md text-on-surface focus:border-primary focus:outline-none"
              />
            </label>

            {/* Duration */}
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Duration (seconds)</span>
              <input
                type="number"
                min="0"
                max="600"
                value={params.duration_seconds}
                onChange={(e) => setParams({ ...params, duration_seconds: parseInt(e.target.value, 10) || 0 })}
                className="rounded bg-surface-elevated border border-outline px-3 py-2 font-body text-body-md text-on-surface focus:border-primary focus:outline-none"
              />
            </label>

            {/* Posting Hour */}
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Posting Hour</span>
              <select
                value={params.posting_hour}
                onChange={(e) => setParams({ ...params, posting_hour: parseInt(e.target.value, 10) })}
                className="rounded bg-surface-elevated border border-outline px-3 py-2 font-body text-body-md text-on-surface focus:border-primary focus:outline-none"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>
                    {h.toString().padStart(2, '0')}:00 {h >= 12 ? 'PM' : 'AM'}
                  </option>
                ))}
              </select>
            </label>

            {/* Day of Week */}
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Day of Week</span>
              <select
                value={params.day_of_week}
                onChange={(e) => setParams({ ...params, day_of_week: e.target.value })}
                className="rounded bg-surface-elevated border border-outline px-3 py-2 font-body text-body-md text-on-surface focus:border-primary focus:outline-none"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isCalculating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-primary text-on-primary font-label text-title-sm font-medium hover:opacity-95 transition-opacity disabled:opacity-50 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">online_prediction</span>
              <span>{isCalculating ? 'Computing Prediction...' : 'Predict Performance'}</span>
            </button>
          </div>
        </form>

        {/* Prediction Result Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <section
            aria-label="Prediction Result"
            className="bg-surface border border-outline rounded-lg p-6 result-glow flex flex-col gap-5"
          >
            <div className="flex items-center justify-between">
              <span className="font-label text-label-md uppercase tracking-wider text-text-secondary">
                PREDICTED PERFORMANCE
              </span>
              <span className="px-2.5 py-0.5 rounded bg-surface-elevated border border-outline-variant font-mono text-mono-sm text-primary">
                Confidence: {result.confidence}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-4 py-2">
              <span
                className={`font-display text-display-lg-mobile md:text-display-lg tracking-tight ${getTierColor(
                  result.tier
                )}`}
              >
                {result.tier}
              </span>
              <div className="text-right">
                <span className="font-kpi text-kpi-lg text-on-surface tabular-nums">{result.score}</span>
                <span className="font-mono text-mono-sm text-text-muted"> / 100</span>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-background-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-surface-enter"
                style={{ width: `${result.score}%` }}
              />
            </div>

            <p className="font-body text-body-sm text-text-secondary leading-relaxed">{result.description}</p>

            <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
              <span className="font-label text-label-md text-text-muted">Model</span>
              <span className="font-mono text-mono-sm text-on-surface">{result.model}</span>
            </div>
          </section>

          {/* How This Works */}
          <section className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">info</span>
              <h2 className="font-title text-title-sm text-on-surface">How this works</h2>
            </div>
            <p className="font-body text-body-sm text-text-secondary leading-relaxed">
              Predictions are generated by evaluating your input parameters against decision thresholds learned from
              historical post performance patterns, content formats, and temporal distribution.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
