import React, { useState, useRef } from 'react';
import { uploadService } from '../services/api';
import { mockCsvPreviewRows } from '../data/mockData';

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [generalError, setGeneralError] = useState('');
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

  const processFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setGeneralError('Invalid file format. Please upload a .csv file.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setGeneralError('');
    setIsUploading(true);

    try {
      const res = await uploadService.uploadCSV(file);
      setUploadResult(res);
    } catch (err) {
      setGeneralError(err.message || 'Failed to process CSV file.');
      setUploadResult(null);
    } finally {
      setIsUploading(false);
    }
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
    setUploadResult(null);
    setGeneralError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const previewList = uploadResult?.preview || mockCsvPreviewRows;
  const totalRows = uploadResult?.totalRows ?? 148;
  const validRows = uploadResult?.validRows ?? 148;
  const invalidRows = uploadResult?.invalidRows ?? 0;
  const importedRows = uploadResult?.importedRows ?? 148;
  const errorsList = uploadResult?.errors || [];

  return (
    <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto flex flex-col gap-6">
      {/* Page Heading */}
      <div>
        <h1 className="font-headline text-headline-lg text-on-surface">Import Data</h1>
        <p className="font-body text-body-md text-text-secondary mt-1">
          Upload your social media performance dataset.
        </p>
      </div>

      {/* Error Alert */}
      {generalError && (
        <div className="p-4 rounded-lg bg-error-container border border-error/20 text-on-error-container font-body text-body-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{generalError}</span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1 rounded bg-surface border border-outline text-on-surface hover:bg-surface-elevated font-label text-label-md"
          >
            Clear
          </button>
        </div>
      )}

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
              ? `${(selectedFile.size / 1024).toFixed(1)} KB · ${
                  isUploading ? 'Processing & validating...' : 'Uploaded & parsed'
                }`
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

        {!selectedFile && !isUploading && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary text-on-primary font-label text-title-sm font-medium hover:opacity-95 shadow-sm transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            <span>Browse CSV File</span>
          </button>
        )}

        {/* Uploading Spinner */}
        {isUploading && (
          <div className="flex items-center gap-2 text-primary font-mono text-mono-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span>Validating rows & inserting records...</span>
          </div>
        )}

        {/* Upload Success Badge */}
        {uploadResult && (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-success-container text-on-success-container border border-success/20 font-label text-label-md">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>
                {importedRows > 0 ? `Successfully imported ${importedRows} posts` : 'Validation complete'}
              </span>
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-text-muted hover:text-on-surface font-label text-label-md underline"
            >
              Upload another CSV
            </button>
          </div>
        )}
      </section>

      {/* Supported Columns Spec */}
      <section className="bg-surface border border-outline-variant rounded-lg p-5 flex flex-col gap-3">
        <h2 className="font-label text-label-md uppercase tracking-wider text-text-secondary">Supported Columns</h2>
        <div className="flex flex-wrap gap-2">
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
              className="px-2.5 py-1 rounded bg-surface-elevated border border-outline-variant font-mono text-mono-sm text-on-surface"
            >
              {col}
            </span>
          ))}
        </div>
      </section>

      {/* Row Metrics Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-surface border border-outline-variant rounded-lg p-4 flex items-center justify-between">
          <span className="font-label text-label-md text-text-secondary">Rows detected</span>
          <span className="font-kpi text-headline-lg text-on-surface tabular-nums">
            {totalRows.toLocaleString()}
          </span>
        </div>

        <div className="bg-surface border border-outline-variant rounded-lg p-4 flex items-center justify-between">
          <span className="font-label text-label-md text-text-secondary">Valid rows</span>
          <span className="font-kpi text-headline-lg text-success tabular-nums">
            {validRows.toLocaleString()}
          </span>
        </div>

        <div className="bg-surface border border-outline-variant rounded-lg p-4 flex items-center justify-between">
          <span className="font-label text-label-md text-text-secondary">Invalid rows</span>
          <span className={`font-kpi text-headline-lg tabular-nums ${invalidRows > 0 ? 'text-error' : 'text-text-muted'}`}>
            {invalidRows.toLocaleString()}
          </span>
        </div>

        <div className="bg-surface border border-outline-variant rounded-lg p-4 flex items-center justify-between">
          <span className="font-label text-label-md text-text-secondary">Imported</span>
          <span className="font-kpi text-headline-lg text-primary tabular-nums">
            {importedRows.toLocaleString()}
          </span>
        </div>
      </section>

      {/* Validation Errors Table (if any invalid rows) */}
      {errorsList.length > 0 && (
        <section className="bg-surface border border-error/30 rounded-lg overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-error/20 bg-error-container/20 flex items-center justify-between">
            <span className="font-title text-title-sm text-error flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span>Validation Errors ({errorsList.length} rows rejected)</span>
            </span>
          </div>
          <div className="p-4 flex flex-col gap-2 max-h-60 overflow-y-auto">
            {errorsList.map((err, idx) => (
              <div
                key={idx}
                className="p-3 rounded bg-surface-elevated border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-body-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-mono-sm text-primary">Row {err.row}</span>
                  <span className="font-mono text-mono-sm text-text-muted">({err.postId})</span>
                </div>
                <div className="text-error font-body text-body-sm flex flex-wrap gap-2">
                  {err.errors.map((msg, mIdx) => (
                    <span key={mIdx}>• {msg}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dataset Preview Table */}
      <section className="bg-surface border border-outline-variant rounded-lg overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 border-b border-outline-variant flex items-center justify-between">
          <span className="font-title text-title-sm text-on-surface">
            {selectedFile ? `Dataset Preview (${selectedFile.name})` : 'Dataset Preview (Sample Format)'}
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded bg-primary text-on-primary font-label text-label-md font-medium hover:opacity-95 shadow-sm"
          >
            {selectedFile ? 'Replace File' : 'Import CSV'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-background-secondary font-mono text-mono-sm text-text-muted">
                <th className="px-4 py-2.5">post_id</th>
                <th className="px-4 py-2.5">platform</th>
                <th className="px-4 py-2.5">content_type</th>
                <th className="px-4 py-2.5">category</th>
                <th className="px-4 py-2.5 text-right">views</th>
                <th className="px-4 py-2.5 text-right">likes</th>
                <th className="px-4 py-2.5 text-right">status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-mono text-mono-sm">
              {previewList.map((row, idx) => (
                <tr key={idx} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-on-surface">{row.post_id}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.platform}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.content_type}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.category}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-on-surface">
                    {Number(row.views || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-on-surface">
                    {Number(row.likes || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label text-label-md ${
                        row.status === 'Valid'
                          ? 'bg-success-container text-on-success-container border border-success/20'
                          : 'bg-error-container text-on-error-container border border-error/20'
                      }`}
                    >
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
