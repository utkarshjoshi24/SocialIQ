import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import HeroVisual from '../components/three/HeroVisual';
import useTilt from '../hooks/useTilt';

// Every claim below describes a feature that exists in the app
const FEATURES = [
  {
    icon: 'upload_file',
    title: 'CSV import with validation',
    text: 'Upload up to 10,000 posts at once. Every row is checked — dates, platforms, hours, metrics, duplicates — and bad rows are reported, not silently dropped.',
    accent: 'text-primary',
  },
  {
    icon: 'monitoring',
    title: 'Analytics dashboard',
    text: 'Views, reach, engagement rate and performance score, with trends, format and category breakdowns, a day × hour heatmap and a correlation matrix.',
    accent: 'text-secondary',
  },
  {
    icon: 'lightbulb',
    title: 'Rule-based insights',
    text: 'Plain-language findings drawn from your own data, with minimum sample sizes so one lucky post never becomes a "trend".',
    accent: 'text-success',
  },
  {
    icon: 'online_prediction',
    title: 'Performance prediction',
    text: 'A Decision Tree model estimates Low, Medium or High performance from pre-publication details only — before you hit post.',
    accent: 'text-primary',
  },
  {
    icon: 'compare_arrows',
    title: 'Side-by-side compare',
    text: 'Compare months, platforms, content types or categories across ten metrics, with differences and percentage change.',
    accent: 'text-secondary',
  },
  {
    icon: 'lock',
    title: 'Private workspace',
    text: 'Your posts stay in your own account: hashed passwords, token authentication and per-user data isolation.',
    accent: 'text-warning',
  },
];

const STEPS = [
  { label: 'DATA', title: 'Bring your posts', text: 'Import a CSV export or add posts by hand.' },
  { label: 'ANALYSIS', title: 'See what performs', text: 'Statistics, breakdowns and correlations update instantly.' },
  { label: 'INSIGHT', title: 'Decide what to post next', text: 'Read the insights, compare segments and predict new ideas.' },
];

const STACK = ['React', 'Three.js', 'Express', 'MongoDB', 'pandas', 'scikit-learn', 'Flask'];

const Logo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="12" width="5" height="9" rx="1.5" fill="#22D3EE" />
    <rect x="10" y="7" width="5" height="14" rx="1.5" fill="#A78BFA" />
    <rect x="17" y="3" width="4" height="18" rx="1.5" fill="#F5F7FA" fillOpacity="0.85" />
  </svg>
);

function FeatureCard({ icon, title, text, accent }) {
  const tilt = useTilt(5);
  return (
    <article
      {...tilt}
      className="tilt-3d bg-surface border border-outline-variant rounded-lg p-6 flex flex-col gap-3 kpi-depth"
    >
      <span className="w-10 h-10 rounded-lg bg-surface-elevated border border-outline flex items-center justify-center">
        <span className={`material-symbols-outlined text-[22px] ${accent}`}>{icon}</span>
      </span>
      <h3 className="font-title text-headline-md text-on-surface">{title}</h3>
      <p className="font-body text-body-md text-text-secondary leading-relaxed">{text}</p>
    </article>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  const primaryCta = isAuthenticated
    ? { to: '/dashboard', label: 'Open dashboard' }
    : { to: '/register', label: 'Get started' };

  return (
    <div className="min-h-screen bg-background text-on-background font-body antialiased overflow-x-hidden">
      {/* Top navigation */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-outline-variant">
        <nav className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-headline text-[18px] tracking-wide text-on-surface">SOCIALIQ</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 font-label text-label-md text-text-secondary">
            <a href="#features" className="hover:text-on-surface transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-on-surface transition-colors">How it works</a>
          </div>
          <div className="flex items-center gap-2">
            {!isAuthenticated && (
              <Link
                to="/login"
                className="px-3 py-1.5 rounded font-label text-title-sm text-text-secondary hover:text-on-surface transition-colors"
              >
                Sign in
              </Link>
            )}
            <Link
              to={primaryCta.to}
              className="px-3.5 py-1.5 rounded bg-primary text-on-primary font-label text-title-sm font-medium hover:opacity-95 shadow-sm"
            >
              {primaryCta.label}
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div className="absolute inset-0 auth-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 pt-14 pb-10 lg:pt-20 lg:pb-16 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-4 items-center">
            <div className="flex flex-col gap-6 text-center lg:text-left items-center lg:items-start">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-outline-variant font-mono text-mono-sm text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                DATA → ANALYSIS → INSIGHT
              </span>
              <h1 className="font-display text-[38px] leading-[44px] sm:text-[52px] sm:leading-[58px] tracking-tight text-on-surface">
                Understand your content.
                <br />
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Predict what performs.
                </span>
              </h1>
              <p className="font-body text-[16px] leading-[26px] text-text-secondary max-w-[520px]">
                SocialIQ turns your post history into dashboards, plain-language insights and a machine-learning
                forecast for your next post — built for creators, college clubs and small social teams.
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <Link
                  to={primaryCta.to}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-primary text-on-primary font-label text-title-sm font-medium hover:opacity-95 shadow-[0_0_30px_rgba(34,211,238,0.25)]"
                >
                  <span>{primaryCta.label}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
                {!isAuthenticated && (
                  <Link
                    to="/login"
                    className="px-5 py-2.5 rounded bg-surface-elevated border border-outline text-on-surface font-label text-title-sm hover:bg-surface-hover"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>

            {/* 3D scene */}
            <div className="relative h-[340px] sm:h-[420px] lg:h-[520px]">
              <HeroVisual />
              <div className="float-slow absolute left-2 sm:left-6 bottom-6 px-3.5 py-2.5 rounded-lg bg-surface/80 backdrop-blur border border-outline-variant kpi-depth">
                <p className="font-label text-label-md uppercase tracking-wider text-text-secondary">Prediction</p>
                <p className="font-mono text-mono-sm text-on-surface">Low · Medium · <span className="text-success">High</span></p>
              </div>
              <div className="float-slow [animation-delay:-3s] hidden sm:block absolute right-2 sm:right-6 top-6 px-3.5 py-2.5 rounded-lg bg-surface/80 backdrop-blur border border-outline-variant kpi-depth">
                <p className="font-label text-label-md uppercase tracking-wider text-text-secondary">Engagement rate</p>
                <p className="font-mono text-mono-sm text-primary">(likes + comments + shares + saves) / reach</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16 lg:py-24 scroll-mt-20">
          <div className="max-w-[640px] mb-10">
            <p className="font-label text-label-md uppercase tracking-wider text-primary mb-2">Features</p>
            <h2 className="font-headline text-[30px] leading-[38px] text-on-surface">
              Everything you need to read your numbers
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-y border-outline-variant bg-background-secondary scroll-mt-16">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16 lg:py-24">
            <p className="font-label text-label-md uppercase tracking-wider text-secondary mb-2">How it works</p>
            <h2 className="font-headline text-[30px] leading-[38px] text-on-surface mb-10">Three steps, one workspace</h2>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STEPS.map((step, i) => (
                <li key={step.label} className="relative bg-surface border border-outline-variant rounded-lg p-6 flex flex-col gap-2">
                  <span className="font-mono text-mono-sm text-primary">
                    0{i + 1} · {step.label}
                  </span>
                  <h3 className="font-title text-headline-md text-on-surface">{step.title}</h3>
                  <p className="font-body text-body-md text-text-secondary">{step.text}</p>
                  {i < STEPS.length - 1 && (
                    <span className="hidden md:flex absolute -right-[22px] top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-surface-elevated border border-outline items-center justify-center text-text-muted">
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final call to action */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16 lg:py-24">
          <div className="relative overflow-hidden rounded-xl border border-outline bg-surface p-8 sm:p-12 text-center flex flex-col items-center gap-5 result-glow">
            <h2 className="font-headline text-[28px] leading-[36px] sm:text-[34px] sm:leading-[42px] text-on-surface max-w-[640px]">
              See what your content data has been trying to tell you
            </h2>
            <Link
              to={primaryCta.to}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-primary text-on-primary font-label text-title-sm font-medium hover:opacity-95"
            >
              <span>{primaryCta.label}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {STACK.map((tech) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 rounded bg-background-secondary border border-outline-variant font-mono text-mono-sm text-text-muted"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-mono-sm text-text-muted">
          <span className="flex items-center gap-2">
            <Logo /> SocialIQ — Social Media Analytics & Performance Prediction
          </span>
          <span>© {new Date().getFullYear()} SocialIQ</span>
        </div>
      </footer>
    </div>
  );
}
