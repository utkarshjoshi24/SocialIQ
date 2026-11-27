import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.name || 'Utkarsh',
    email: user?.email || 'utkarsh@socialiq.app',
  });
  const [saveStatus, setSaveStatus] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    setSaveStatus('Profile updated successfully.');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const initial = (profile.name || 'U').charAt(0).toUpperCase();

  return (
    <main className="flex-1 px-6 py-6 max-w-3xl w-full mx-auto flex flex-col gap-6">
      {/* Page Heading */}
      <div>
        <h1 className="font-headline text-headline-lg text-on-surface">Settings</h1>
        <p className="font-body text-body-md text-text-secondary mt-1">
          Manage your profile, workspace preferences, and data.
        </p>
      </div>

      {/* Profile Section */}
      <section className="bg-surface border border-outline-variant rounded-lg p-6 flex flex-col gap-5">
        <h2 className="font-title text-headline-md text-on-surface">Profile</h2>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-container text-on-primary-container font-title text-headline-md flex items-center justify-center border border-primary/30 shadow-sm">
            {initial}
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded bg-surface-elevated border border-outline text-on-surface font-label text-label-md hover:bg-surface-hover transition-colors"
          >
            Update Picture
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Full Name</span>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="rounded bg-surface-elevated border border-outline px-3 py-2 font-body text-body-md text-on-surface focus:border-primary focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Email Address</span>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="rounded bg-surface-elevated border border-outline px-3 py-2 font-body text-body-md text-on-surface focus:border-primary focus:outline-none"
              />
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded bg-primary text-on-primary font-label text-title-sm font-medium hover:opacity-95 shadow-sm"
            >
              Save Profile
            </button>
            {saveStatus && (
              <span className="font-mono text-mono-sm text-success flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                {saveStatus}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Account Section */}
      <section className="bg-surface border border-outline-variant rounded-lg p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-title text-headline-md text-on-surface">Account</h2>
          <p className="font-body text-body-sm text-text-secondary mt-0.5">
            User ID: <span className="font-mono text-xs">{user?._id || 'local_user'}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-primary-container text-on-primary-container border border-primary/20 font-label text-label-md">
            Creator Pro
          </span>
          <button
            type="button"
            onClick={logout}
            className="px-3 py-1 rounded bg-surface-elevated border border-outline text-error hover:bg-error-container/30 font-label text-label-md"
          >
            Sign Out
          </button>
        </div>
      </section>

      {/* Appearance Section */}
      <section className="bg-surface border border-outline-variant rounded-lg p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-title text-headline-md text-on-surface">Appearance</h2>
          <p className="font-body text-body-sm text-text-secondary mt-0.5">SocialIQ is dark-first by default.</p>
        </div>
        <div className="inline-flex p-1 rounded bg-background-secondary border border-outline-variant">
          <button
            type="button"
            className="px-3 py-1 rounded-sm bg-surface-elevated text-primary font-label text-label-md shadow-sm"
          >
            Dark (Default)
          </button>
          <button
            type="button"
            disabled
            className="px-3 py-1 rounded-sm text-text-muted font-label text-label-md opacity-50 cursor-not-allowed"
          >
            Light
          </button>
        </div>
      </section>

      {/* Data Management Section */}
      <section className="bg-surface border border-outline-variant rounded-lg p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-title text-headline-md text-on-surface">Data</h2>
          <p className="font-body text-body-sm text-text-secondary mt-0.5">
            Export your complete posts archive or wipe workspace metrics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => alert('Exporting dataset archive...')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-surface-elevated border border-outline text-on-surface font-label text-label-md hover:bg-surface-hover transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Data</span>
          </button>
          <button
            type="button"
            onClick={() => alert('Data deletion requires confirmation in production settings.')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-surface-elevated border border-error/30 text-error font-label text-label-md hover:bg-error-container/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span>Delete Data</span>
          </button>
        </div>
      </section>
    </main>
  );
}
