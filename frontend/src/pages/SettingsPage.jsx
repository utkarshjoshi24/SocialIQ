import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService, postService } from '../services/api';

// Same header as the CSV import template, so an export can be re-imported
const CSV_COLUMNS = [
  ['post_id', (p) => p.postId],
  ['date', (p) => (p.date ? new Date(p.date).toISOString().split('T')[0] : '')],
  ['platform', (p) => p.platform],
  ['content_type', (p) => p.contentType],
  ['category', (p) => p.category],
  ['caption_length', (p) => p.captionLength],
  ['hashtags_count', (p) => p.hashtagsCount],
  ['duration_seconds', (p) => p.durationSeconds],
  ['posting_hour', (p) => p.postingHour],
  ['views', (p) => p.views],
  ['likes', (p) => p.likes],
  ['comments', (p) => p.comments],
  ['shares', (p) => p.shares],
  ['saves', (p) => p.saves],
  ['reach', (p) => p.reach],
];

const csvCell = (value) => {
  let text = value === undefined || value === null ? '' : String(value);
  // Text starting with = + - @ (or tab/CR) is run as a formula by spreadsheet apps
  // (CSV injection); prefix it so it is shown as plain text. Numbers are never affected.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success' | 'error', message }
  const [isSaving, setIsSaving] = useState(false);
  const [dataStatus, setDataStatus] = useState(null);
  const [dataBusy, setDataBusy] = useState(false);

  // The user object may arrive after first render (AuthContext loads it asynchronously)
  useEffect(() => {
    setProfile({ name: user?.name || '', email: user?.email || '' });
  }, [user?.name, user?.email]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await authService.updateMe({ name: profile.name, email: profile.email });
      updateUser(res.user);
      setSaveStatus({ type: 'success', message: 'Profile saved.' });
    } catch (err) {
      setSaveStatus({ type: 'error', message: err.message || 'Could not save profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    setDataBusy(true);
    setDataStatus(null);
    try {
      const res = await postService.getAll({ sort: 'date' });
      const posts = res.data || [];
      if (posts.length === 0) {
        setDataStatus({ type: 'error', message: 'There are no posts to export yet.' });
        return;
      }
      const lines = [
        CSV_COLUMNS.map(([header]) => header).join(','),
        ...posts.map((p) => CSV_COLUMNS.map(([, get]) => csvCell(get(p))).join(',')),
      ];
      const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `socialiq-posts-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setDataStatus({ type: 'success', message: `Exported ${posts.length} posts as CSV.` });
    } catch (err) {
      setDataStatus({ type: 'error', message: err.message || 'Export failed.' });
    } finally {
      setDataBusy(false);
    }
  };

  const handleDeleteAll = async () => {
    const answer = window.prompt(
      'This permanently deletes ALL posts in your workspace and cannot be undone.\nType DELETE to confirm.'
    );
    if (answer !== 'DELETE') {
      if (answer !== null) setDataStatus({ type: 'error', message: 'Deletion cancelled: confirmation text did not match.' });
      return;
    }
    setDataBusy(true);
    setDataStatus(null);
    try {
      const res = await postService.deleteAll();
      setDataStatus({ type: 'success', message: `Deleted ${res.deletedCount} posts.` });
    } catch (err) {
      setDataStatus({ type: 'error', message: err.message || 'Deletion failed.' });
    } finally {
      setDataBusy(false);
    }
  };

  const StatusLine = ({ status }) =>
    status ? (
      <span
        role={status.type === 'error' ? 'alert' : 'status'}
        className={`font-mono text-mono-sm flex items-center gap-1 ${status.type === 'error' ? 'text-error' : 'text-success'}`}
      >
        <span className="material-symbols-outlined text-[16px]">{status.type === 'error' ? 'error' : 'check_circle'}</span>
        {status.message}
      </span>
    ) : null;

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
          <div className="min-w-0">
            <p className="font-title text-title-sm text-on-surface truncate">{user?.name}</p>
            <p className="font-mono text-mono-sm text-text-muted truncate">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Full Name</span>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="rounded bg-surface-elevated border border-outline px-3 py-2 font-body text-body-md text-on-surface focus:border-primary focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-label text-label-md text-text-secondary">Email Address</span>
              <input
                type="email"
                required
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="rounded bg-surface-elevated border border-outline px-3 py-2 font-body text-body-md text-on-surface focus:border-primary focus:outline-none"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded bg-primary text-on-primary font-label text-title-sm font-medium hover:opacity-95 shadow-sm disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save Profile'}
            </button>
            <StatusLine status={saveStatus} />
          </div>
        </form>
      </section>

      {/* Account Section */}
      <section className="bg-surface border border-outline-variant rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-title text-headline-md text-on-surface">Account</h2>
          <p className="font-body text-body-sm text-text-secondary mt-0.5 break-all">
            User ID: <span className="font-mono text-xs">{user?._id || '—'}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user?.createdAt && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-primary-container text-on-primary-container border border-primary/20 font-label text-label-md">
              Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            </span>
          )}
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
      <section className="bg-surface border border-outline-variant rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            Export all posts as a CSV (same columns as the import template) or permanently delete them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleExport}
            disabled={dataBusy}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-surface-elevated border border-outline text-on-surface font-label text-label-md hover:bg-surface-hover transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export Data</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={dataBusy}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-surface-elevated border border-error/30 text-error font-label text-label-md hover:bg-error-container/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span>Delete Data</span>
          </button>
          <StatusLine status={dataStatus} />
        </div>
      </section>
    </main>
  );
}
