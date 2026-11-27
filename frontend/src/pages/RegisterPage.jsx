import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('Utkarsh');
  const [email, setEmail] = useState('utkarsh@socialiq.app');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background text-on-background font-body antialiased">
      {/* Left Branding Showcase (Desktop) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-background-secondary border-r border-outline-variant relative overflow-hidden auth-grid-violet">
        <Link to="/dashboard" className="flex items-center gap-2.5 z-10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="12" width="5" height="9" rx="1.5" fill="#22D3EE" />
            <rect x="10" y="7" width="5" height="14" rx="1.5" fill="#A78BFA" />
            <rect x="17" y="3" width="4" height="18" rx="1.5" fill="#F5F7FA" fillOpacity="0.85" />
          </svg>
          <span className="font-title text-headline-md tracking-wide text-on-surface">SOCIALIQ</span>
        </Link>

        {/* Hero Card */}
        <div className="z-10 max-w-sm bg-surface border border-outline rounded-lg p-6 kpi-depth kpi-glow-violet flex flex-col gap-3">
          <span className="font-label text-label-md uppercase tracking-wider text-secondary">PREDICTION ENGINE</span>
          <div className="flex items-baseline justify-between">
            <p className="font-kpi text-kpi-lg text-on-surface tabular-nums">84 / 100</p>
            <span className="font-mono text-mono-sm text-primary tabular-nums">High Tier</span>
          </div>
          <p className="font-body text-body-sm text-text-secondary mt-1">
            Import historical CSVs or connect channels to benchmark performance before you publish.
          </p>
        </div>

        <div className="z-10">
          <h2 className="font-headline text-headline-lg text-on-surface">Data → Analysis → Insight.</h2>
          <p className="font-headline text-headline-lg text-text-secondary">Engineered for creators.</p>
        </div>
      </div>

      {/* Right Registration Form */}
      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="font-headline text-headline-lg text-on-surface">Create your workspace</h1>
            <p className="font-body text-body-sm text-text-secondary">
              Start analyzing your content performance in minutes.
            </p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Full Name</span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Utkarsh"
                className="rounded bg-surface-elevated border border-outline px-3 py-2.5 font-body text-body-md text-on-surface placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Work Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="utkarsh@socialiq.app"
                className="rounded bg-surface-elevated border border-outline px-3 py-2.5 font-body text-body-md text-on-surface placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="rounded bg-surface-elevated border border-outline px-3 py-2.5 font-body text-body-md text-on-surface placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </label>

            <button
              type="submit"
              className="mt-2 w-full py-2.5 rounded bg-primary text-on-primary font-label text-title-sm font-medium hover:opacity-95 shadow-sm transition-opacity"
            >
              Create Account
            </button>
          </form>

          <p className="font-body text-body-sm text-text-secondary text-center">
            Already have a workspace?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
