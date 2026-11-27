import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('utkarsh@socialiq.app');
  const [password, setPassword] = useState('password123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background text-on-background font-body antialiased">
      {/* Left Branding Showcase (Desktop) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-background-secondary border-r border-outline-variant relative overflow-hidden auth-grid">
        <Link to="/" className="flex items-center gap-2.5 z-10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="12" width="5" height="9" rx="1.5" fill="#22D3EE" />
            <rect x="10" y="7" width="5" height="14" rx="1.5" fill="#A78BFA" />
            <rect x="17" y="3" width="4" height="18" rx="1.5" fill="#F5F7FA" fillOpacity="0.85" />
          </svg>
          <span className="font-title text-headline-md tracking-wide text-on-surface">SOCIALIQ</span>
        </Link>

        {/* Hero Card */}
        <div className="z-10 max-w-sm bg-surface border border-outline rounded-lg p-6 kpi-depth kpi-glow-cyan flex flex-col gap-3">
          <span className="font-label text-label-md uppercase tracking-wider text-text-secondary">AVG ENGAGEMENT</span>
          <div className="flex items-baseline justify-between">
            <p className="font-kpi text-kpi-lg text-on-surface tabular-nums">6.84%</p>
            <span className="font-mono text-mono-sm text-success tabular-nums">+18.4%</span>
          </div>
          <p className="font-body text-body-sm text-text-secondary mt-1">
            Predictive modeling and precision analytics for modern content creators.
          </p>
        </div>

        <div className="z-10">
          <h2 className="font-headline text-headline-lg text-on-surface">Understand your content.</h2>
          <p className="font-headline text-headline-lg text-text-secondary">Create what performs.</p>
        </div>
      </div>

      {/* Right Sign-In Form */}
      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="font-headline text-headline-lg text-on-surface">Sign in to SocialIQ</h1>
            <p className="font-body text-body-sm text-text-secondary">Enter your workspace credentials to continue.</p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded bg-error-container border border-error/20 text-on-error-container font-body text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Email</span>
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
              <div className="flex items-center justify-between">
                <span className="font-label text-label-md text-text-secondary">Password</span>
                <a href="#forgot" className="font-label text-label-md text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded bg-surface-elevated border border-outline px-3 py-2.5 font-body text-body-md text-on-surface placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </label>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                defaultChecked
                className="rounded bg-surface-elevated border border-outline text-primary focus:ring-primary w-4 h-4"
              />
              <span className="font-body text-body-sm text-text-secondary">Remember me for 30 days</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full py-2.5 rounded bg-primary text-on-primary font-label text-title-sm font-medium hover:opacity-95 shadow-sm transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="font-body text-body-sm text-text-secondary text-center">
            Don't have a workspace?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Create account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
