import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { name: 'Overview', path: '/dashboard', icon: 'grid_view' },
  { name: 'Posts', path: '/posts', icon: 'article' },
  { name: 'Analytics', path: '/analytics', icon: 'bar_chart' },
  { name: 'Insights', path: '/insights', icon: 'lightbulb' },
  { name: 'Prediction', path: '/prediction', icon: 'online_prediction' },
  { name: 'Compare', path: '/compare', icon: 'compare_arrows' },
  { name: 'Upload', path: '/upload', icon: 'upload_file' },
];

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Find page title for mobile or breadcrumb if needed
  const currentNav = navItems.find((item) => item.path === location.pathname);

  return (
    <div className="min-h-screen flex bg-background text-on-background font-body antialiased">
      {/* Persistent Left Sidebar (Desktop) */}
      <aside className="w-56 shrink-0 bg-background-secondary border-r border-outline-variant hidden lg:flex flex-col justify-between min-h-screen sticky top-0">
        <div className="p-4 flex flex-col gap-6">
          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2.5 px-2 py-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="12" width="5" height="9" rx="1.5" fill="#22D3EE" />
              <rect x="10" y="7" width="5" height="14" rx="1.5" fill="#A78BFA" />
              <rect x="17" y="3" width="4" height="18" rx="1.5" fill="#F5F7FA" fillOpacity="0.85" />
            </svg>
            <span className="font-title text-headline-md tracking-wide text-on-surface">SOCIALIQ</span>
          </NavLink>

          {/* Nav Items */}
          <nav aria-label="Primary navigation" className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-1.5 rounded transition-colors duration-state-change ${
                    isActive
                      ? 'bg-surface-elevated text-on-surface border border-outline font-label text-title-sm shadow-sm'
                      : 'text-text-secondary hover:text-on-surface hover:bg-surface-elevated font-body text-body-md border border-transparent'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Profile & Settings */}
        <div className="p-4 border-t border-outline-variant flex flex-col gap-2">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-1.5 rounded transition-colors duration-state-change ${
                isActive
                  ? 'bg-surface-elevated text-on-surface border border-outline font-label text-title-sm'
                  : 'text-text-secondary hover:text-on-surface hover:bg-surface-elevated font-body text-body-md border border-transparent'
              }`
            }
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            <span>Settings</span>
          </NavLink>

          <NavLink
            to="/settings"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-md bg-surface border border-outline-variant hover:border-outline transition-colors duration-state-change"
          >
            <span className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container font-title text-label-md flex items-center justify-center shrink-0">
              U
            </span>
            <div className="min-w-0">
              <p className="font-title text-body-sm text-on-surface truncate">Utkarsh</p>
              <p className="font-mono text-mono-sm text-text-muted truncate">Creator Pro</p>
            </div>
          </NavLink>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-background-secondary border-r border-outline-variant p-4 flex flex-col justify-between transform transition-transform duration-200 lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <NavLink
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-2 py-1"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="12" width="5" height="9" rx="1.5" fill="#22D3EE" />
                <rect x="10" y="7" width="5" height="14" rx="1.5" fill="#A78BFA" />
                <rect x="17" y="3" width="4" height="18" rx="1.5" fill="#F5F7FA" fillOpacity="0.85" />
              </svg>
              <span className="font-title text-headline-md tracking-wide text-on-surface">SOCIALIQ</span>
            </NavLink>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded text-text-secondary hover:text-on-surface"
              aria-label="Close navigation"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded ${
                    isActive
                      ? 'bg-surface-elevated text-on-surface border border-outline font-label text-title-sm'
                      : 'text-text-secondary hover:text-on-surface hover:bg-surface-elevated font-body text-body-md'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="pt-4 border-t border-outline-variant flex flex-col gap-2">
          <NavLink
            to="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded text-text-secondary hover:text-on-surface hover:bg-surface-elevated"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            <span>Settings</span>
          </NavLink>
        </div>
      </div>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Compact Sticky Top Header */}
        <header className="h-14 sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-outline-variant px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded bg-surface border border-outline-variant text-text-secondary hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">menu</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="font-mono text-mono-sm text-text-muted">Workspace</span>
              <span className="text-text-muted">/</span>
              <span className="font-title text-body-sm text-on-surface">Utkarsh Studio</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Range Selector Pill */}
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-surface border border-outline-variant hover:border-outline text-text-secondary hover:text-on-surface font-body text-body-sm transition-colors duration-state-change"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">calendar_today</span>
              <span className="tabular-nums whitespace-nowrap">Nov 1 – 27</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              aria-label="Notifications"
              className="relative inline-flex items-center justify-center w-9 h-9 rounded bg-surface text-text-secondary border border-outline-variant hover:bg-surface-elevated hover:text-on-surface transition-colors duration-state-change"
            >
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              <span
                role="status"
                aria-label="Unread notifications"
                className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary"
              />
            </button>

            {/* Profile Avatar Button */}
            <NavLink
              to="/settings"
              aria-label="Profile settings"
              className="w-8 h-8 rounded-full bg-surface-elevated border border-outline flex items-center justify-center font-title text-label-md text-on-surface hover:border-primary/40 transition-colors"
            >
              U
            </NavLink>
          </div>
        </header>

        {/* Scrollable Canvas */}
        <Outlet />
      </div>
    </div>
  );
}
