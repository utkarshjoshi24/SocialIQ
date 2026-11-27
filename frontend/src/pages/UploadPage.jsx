import React, { useState, useRef } from 'react';
import { mockCsvPreviewRows } from '../data/mockData';

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle | uploading | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setUploadStatus('error');
      setErrorMessage('Please upload a valid .csv file format.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadStatus('uploading');
    setUploadProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadStatus('success');
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
      {/* Page Heading */}
      <div>
        <h1 className="font-headline text-headline-lg text-on-surface">Import Data</h1>
        <p className="font-body text-body-md text-text-secondary mt-1">
          Upload your social media performance dataset.
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <section
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`bg-surface border-2 border-dashed rounded-lg p-10 dot-grid flex flex-col items-center justify-center text-center gap-4 transition-colors ${
          dragActive
            ? 'border-primary bg-surface-elevated/80'
            : 'border-outline hover:border-outline/80'
        }`}
      >
        <div className="w-12 h-12 rounded-lg bg-surface-elevated border border-outline flex items-center justify-center text-primary shadow-sm">
          <span className="material-symbols-outlined text-[24px]">description</span>
        </div>

        <div>
          <h2 className="font-title text-headline-md text-on-surface">
            {selectedFile ? selectedFile.name : 'Drop your CSV file here'}
          </h2>
          <p className="font-body text-body-sm text-text-secondary mt-1">
            {selectedFile
              ? `${(selectedFile.size / 1024).toFixed(1)} KB · Ready to analyze`
              : 'or browse from your computer · Max 50 MB'}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="csv-file-input"
        />

        {uploadStatus === 'idle' && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary text-on-primary font-label text-title-sm font-medium hover:opacity-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            <span>Browse CSV File</span>
          </button>
        )}

        {/* Uploading Progress */}
        {uploadStatus === 'uploading' && (
          <div className="w-full max-w-xs flex flex-col gap-2">
            <div className="flex items-center justify-between font-mono text-mono-sm text-text-secondary">
              <span>Validating schema...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-background-secondary overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success State */}
        {uploadStatus === 'success' && (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-success-container text-on-success-container border border-success/20 font-label text-label-md">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>CSV Verified & Ready</span>
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-text-muted hover:text-on-surface font-label text-label-md underline"
            >
              Upload another
            </button>
          </div>
        )}

        {/* Error State */}
        {uploadStatus === 'error' && (
          <div className="flex flex-col items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-error-container text-on-error-container border border-error/20 font-label text-label-md">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{errorMessage}</span>
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-text-muted hover:text-on-surface font-label text-label-md underline"
            >
              Try again
            </button>
          </div>
        )}
      </section>

      {/* Supported Columns Spec */}
      <section className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-3">
        <div>
          <h2 className="font-title text-headline-md text-on-surface">Supported Columns</h2>
          <p className="font-body text-body-sm text-text-secondary">
            Ensure your uploaded CSV contains the following standard headers for optimal analytics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1 font-mono text-mono-sm">
          {[
            'post_id',
            'date',
            'platform',
            'content_type',
            'category',
            'caption_length',
            'hashtags_count',
            'duration_seconds',
            'posting_hour',
            'views',
            'likes',
            'comments',
            'shares',
            'saves',
            'reach',
          ].map((col) => (
            <span
              key={col}
              className="px-2.5 py-1 rounded bg-surface-elevated border border-outline text-on-surface"
            >
              {col}
            </span>
          ))}
        </div>
      </section>

      {/* Sample Preview Table */}
      <section className="bg-surface border border-outline-variant rounded-lg overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
          <div>
            <h2 className="font-title text-headline-md text-on-surface">Dataset Preview</h2>
            <p className="font-body text-body-sm text-text-secondary mt-0.5">Sample rows parsed from CSV</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-background-secondary font-label text-label-md uppercase tracking-wider text-text-muted">
                <th className="px-5 py-3">post_id</th>
                <th className="px-4 py-3">platform</th>
                <th className="px-4 py-3">content_type</th>
                <th className="px-4 py-3">category</th>
                <th className="px-4 py-3 text-right">views</th>
                <th className="px-4 py-3 text-right">likes</th>
                <th className="px-5 py-3 text-right">status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-mono text-mono-sm">
              {mockCsvPreviewRows.map((row) => (
                <tr key={row.post_id} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-on-surface">{row.post_id}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.platform}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.content_type}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.category}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-on-surface">{row.views}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-on-surface">{row.likes}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-container text-on-success-container border border-success/20 font-label text-label-md">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
