import React, { useState } from 'react';
import { predictionService } from '../services/api';

// Values the trained Decision Tree knows (see analytics/models/model.pkl encoder).
// "Twitter/X" is mapped to the model's "Twitter" by the ML service.
const PLATFORMS = ['Instagram', 'YouTube', 'LinkedIn', 'Twitter/X'];
const CONTENT_TYPES = ['Reel', 'Carousel', 'Video', 'Image', 'Text'];
const CATEGORIES = ['Travel', 'Tech', 'Education', 'Community', 'Lifestyle', 'Finance', 'Health'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SELECT_FIELDS = [
  { key: 'platform', label: 'Platform' },
  { key: 'contentType', label: 'Content Type' },
  { key: 'category', label: 'Category' },
  { key: 'dayOfWeek', label: 'Day of Week' },
];

// Bounds mirror the existing input min/max attributes
const NUMERIC_FIELDS = [
  { key: 'captionLength', label: 'Caption length', max: 2200 },
  { key: 'hashtagsCount', label: 'Hashtags count', max: 30 },
  { key: 'durationSeconds', label: 'Duration', max: 600 },
  { key: 'postingHour', label: 'Posting hour', max: 23 },
];

const INITIAL_PARAMS = {
  platform: '',
  contentType: '',
  category: '',
  captionLength: '',
  hashtagsCount: '',
  durationSeconds: '',
  postingHour: '',
  dayOfWeek: '',
};

const inputClass = (hasError) =>
  `rounded bg-surface-elevated border px-3 py-2 font-body text-body-md text-on-surface focus:border-primary focus:outline-none ${
    hasError ? 'border-error' : 'border-outline'
  }`;

/**
 * Returns { payload, errors }. payload is only set when every field is valid,
 * so an invalid request is never sent.
 */
const validateParams = (params) => {
  const errors = {};
  const payload = {};

  for (const { key, label } of SELECT_FIELDS) {
    if (!params[key]) errors[key] = `${label} is required`;
    else payload[key] = params[key];
  }

  for (const { key, label, max } of NUMERIC_FIELDS) {
    const raw = String(params[key]).trim();
    if (raw === '') {
      errors[key] = `${label} is required`;
      continue;
    }
    const value = Number(raw);
    if (!Number.isInteger(value)) errors[key] = `${label} must be a whole number`;
    else if (value < 0) errors[key] = `${label} cannot be negative`;
    else if (value > max) errors[key] = `${label} must be ${max} or less`;
    else payload[key] = value;
  }

  return Object.keys(errors).length > 0 ? { payload: null, errors } : { payload, errors };
};

const FieldError = ({ message }) =>
  message ? <span className="font-body text-body-sm text-error">{message}</span> : null;

export default function PredictionPage() {
  const [params, setParams] = useState(INITIAL_PARAMS);
  // status: idle | loading | success | validation | error | unavailable
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');

  const isCalculating = status === 'loading';

  const updateParam = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isCalculating) return;

    const { payload, errors } = validateParams(params);
    if (!payload) {
      setFieldErrors(errors);
      setResult(null);
      setErrorMessage('Please correct the highlighted fields before predicting.');
      setStatus('validation');
      return;
    }

    setFieldErrors({});
    setErrorMessage('');
    setResult(null);
    setStatus('loading');

    try {
      const data = await predictionService.predict(payload);
      setResult(data);
      setStatus('success');
    } catch (err) {
      setResult(null);
      if (err.status === 400 && Array.isArray(err.data?.details)) {
        const serverErrors = {};
        for (const d of err.data.details) {
          if (d.field && !serverErrors[d.field]) serverErrors[d.field] = d.message;
        }
        setFieldErrors(serverErrors);
        setErrorMessage('The prediction service rejected some values. Please review the highlighted fields.');
        setStatus('validation');
      } else if (err.status === 503) {
        setErrorMessage('The prediction service is currently unavailable. Please try again in a moment.');
        setStatus('unavailable');
      } else if (err.data?.error) {
        setErrorMessage(err.data.error);
        setStatus('error');
      } else {
        // Network failure, or a proxy error with no JSON body (backend not running)
        setErrorMessage('Could not reach the SocialIQ server. Check your connection and try again.');
        setStatus('error');
      }
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'HIGH':
        return 'text-success';
      case 'LOW':
        return 'text-error';
      case 'MEDIUM':
        return 'text-warning';
      default:
        return 'text-text-muted';
    }
  };

  const tier = result?.prediction ? result.prediction.toUpperCase() : null;
  const score = typeof result?.score === 'number' ? result.score : null;

  const renderSelect = (key, label, options, placeholder, format = (o) => o) => (
    <label className="flex flex-col gap-1.5">
      <span className="font-label text-label-md text-text-secondary">{label}</span>
      <select
        value={params[key]}
        onChange={(e) => updateParam(key, e.target.value)}
        aria-invalid={Boolean(fieldErrors[key])}
        className={inputClass(fieldErrors[key])}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {format(o)}
          </option>
        ))}
      </select>
      <FieldError message={fieldErrors[key]} />
    </label>
  );

  const renderNumber = (key, label, max) => (
    <label className="flex flex-col gap-1.5">
      <span className="font-label text-label-md text-text-secondary">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max={max}
        step="1"
        value={params[key]}
        onChange={(e) => updateParam(key, e.target.value)}
        aria-invalid={Boolean(fieldErrors[key])}
        className={inputClass(fieldErrors[key])}
      />
      <FieldError message={fieldErrors[key]} />
    </label>
  );

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
          noValidate
          className="lg:col-span-7 bg-surface border border-outline-variant rounded-lg p-6 flex flex-col gap-5"
        >
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <h2 className="font-title text-headline-md text-on-surface">Post Parameters</h2>
            <span className="font-mono text-mono-sm text-text-muted">8 features</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {renderSelect('platform', 'Platform', PLATFORMS, 'Select platform')}
            {renderSelect('contentType', 'Content Type', CONTENT_TYPES, 'Select content type')}
            {renderSelect('category', 'Category', CATEGORIES, 'Select category')}
            {renderNumber('captionLength', 'Caption Length (chars)', 2200)}
            {renderNumber('hashtagsCount', 'Hashtags Count', 30)}
            {renderNumber('durationSeconds', 'Duration (seconds)', 600)}
            {renderSelect(
              'postingHour',
              'Posting Hour',
              Array.from({ length: 24 }, (_, h) => String(h)),
              'Select hour',
              (h) => `${h.padStart(2, '0')}:00 ${Number(h) >= 12 ? 'PM' : 'AM'}`
            )}
            {renderSelect('dayOfWeek', 'Day of Week', DAYS, 'Select day')}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isCalculating}
              aria-busy={isCalculating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-primary text-on-primary font-label text-title-sm font-medium hover:opacity-95 transition-opacity disabled:opacity-50 shadow-sm"
            >
              <span className={`material-symbols-outlined text-[18px] ${isCalculating ? 'animate-spin' : ''}`}>
                {isCalculating ? 'progress_activity' : 'online_prediction'}
              </span>
              <span>{isCalculating ? 'Computing Prediction...' : 'Predict Performance'}</span>
            </button>
          </div>
        </form>

        {/* Prediction Result Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-4 rounded-lg bg-error-container border border-error/20 text-on-error-container font-body text-body-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">
                {status === 'unavailable' ? 'cloud_off' : 'error'}
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          <section
            aria-label="Prediction Result"
            aria-live="polite"
            aria-busy={isCalculating}
            className={`bg-surface border border-outline rounded-lg p-6 result-glow flex flex-col gap-5 ${
              isCalculating ? 'animate-pulse' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-label text-label-md uppercase tracking-wider text-text-secondary">
                PREDICTED PERFORMANCE
              </span>
              <span
                title="Relative performance score from the Decision Tree's class mix. Not a probability."
                className="px-2.5 py-0.5 rounded bg-surface-elevated border border-outline-variant font-mono text-mono-sm text-primary whitespace-nowrap"
              >
                Relative score
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-4 py-2">
              <span
                className={`font-display text-display-lg-mobile md:text-display-lg tracking-tight ${getTierColor(tier)}`}
              >
                {tier || '—'}
              </span>
              <div className="text-right whitespace-nowrap">
                <span className="font-kpi text-kpi-lg text-on-surface tabular-nums">{score ?? '—'}</span>
                <span className="font-mono text-mono-sm text-text-muted"> / 100</span>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-background-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-surface-enter"
                style={{ width: `${score ?? 0}%` }}
              />
            </div>

            <p className="font-body text-body-sm text-text-secondary leading-relaxed">
              {status === 'success' && result?.message}
              {status === 'loading' && 'Running the Decision Tree model on your post parameters…'}
              {status !== 'success' &&
                status !== 'loading' &&
                'Fill in all post parameters and select Predict Performance to see the model’s estimate.'}
            </p>

            <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
              <span className="font-label text-label-md text-text-muted">Model</span>
              <span className="font-mono text-mono-sm text-on-surface">{result?.model || '—'}</span>
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
            <p className="font-body text-body-sm text-text-secondary leading-relaxed">
              The score (0–100) is a relative performance score derived from the model’s predicted class mix. It is not
              a probability.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
