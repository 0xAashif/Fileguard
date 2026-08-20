import { useState } from 'react';
import { ShieldCheck, Copy, Check, RotateCcw, FileText, Clock, Hash, Blocks, Timer } from 'lucide-react';

/**
 * Formats bytes into human-readable string.
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function HashResult({ data, onReset }) {
  const [copied, setCopied] = useState(false);
  const doc = data.document;

  const copyHash = async () => {
    await navigator.clipboard.writeText(doc.originalHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      {/* Success Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 mb-4">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          {data.duplicate ? 'Already Secured' : 'Document Secured'}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {data.duplicate
            ? 'This file was already anchored with the same hash.'
            : 'SHA-256 fingerprint computed and anchored to blockchain.'}
        </p>
      </div>

      {/* Result Card */}
      <div className="glass-card p-6 glow-accent space-y-5">
        {/* File Name */}
        <div className="flex items-start gap-3">
          <FileText className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-slate-500 mb-0.5">File Name</p>
            <p className="text-white text-sm font-medium truncate">{doc.fileName}</p>
          </div>
        </div>

        {/* SHA-256 Hash */}
        <div className="flex items-start gap-3">
          <Hash className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-xs text-slate-500">SHA-256 Hash</p>
              <button
                onClick={copyHash}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-400 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="hash-text text-emerald-300/80 bg-dark-800/50 rounded-lg p-3 border border-glass-border">
              {doc.originalHash}
            </p>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <p className="text-xs text-slate-500 mb-1">File Size</p>
            <p className="text-sm text-white font-medium">{formatBytes(doc.fileSizeBytes)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Processing Time</p>
            <p className="text-sm text-white font-medium flex items-center gap-1">
              <Timer className="w-3 h-3 text-cyan-400" />
              {doc.processingTimeMs}ms
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Status</p>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
              {doc.status}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Algorithm</p>
            <p className="text-sm text-white font-mono">{doc.hashAlgorithm?.toUpperCase()}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <Blocks className="w-3 h-3" /> Blockchain TX
            </p>
            <p className="hash-text text-amber-300/70 text-[10px] truncate">
              {doc.originStampTxId || 'Pending...'}
            </p>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-2 pt-2 border-t border-glass-border">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <p className="text-xs text-slate-500">
            Anchored: {new Date(doc.createdAt || doc.originStampTimestamp).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-sm"
      >
        <RotateCcw className="w-4 h-4" />
        Upload Another Document
      </button>
    </div>
  );
}
