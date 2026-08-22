import { useState } from 'react';
import {
  ShieldCheck,
  Copy,
  Check,
  RotateCcw,
  FileText,
  Clock,
  Hash,
  Blocks,
  Building,
  Share2,
  Download,
  Loader2,
} from 'lucide-react';
import { generateCertificatePDF } from '../lib/certificateGenerator.js';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function HashResult({ data, onReset }) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const doc = data.document;

  const copyHash = async () => {
    await navigator.clipboard.writeText(doc.originalHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const copyVerificationLink = async () => {
    const url = `${window.location.origin}/verify?hash=${doc.originalHash}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadCertificate = async () => {
    setDownloading(true);
    try {
      await generateCertificatePDF(doc);
    } catch (err) {
      console.error('Failed to generate certificate:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      {/* Success Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center p-3 rounded-xl bg-amber-500/10 mb-4 border border-amber-500/20">
          <ShieldCheck className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          {data.duplicate ? 'Existing Record Found' : 'Cryptographic Proof Registered'}
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          {data.duplicate
            ? 'This exact document fingerprint is already anchored in the ledger.'
            : 'SHA-256 fingerprint anchored and associated with your verified issuer identity.'}
        </p>
      </div>

      {/* Result Card */}
      <div className="glass-card p-6 rounded-xl border border-zinc-800 space-y-5">
        {/* Issuer Info */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-zinc-400">Registered Issuer</span>
          </div>
          <span className="text-sm font-semibold text-white">{doc.issuerName || 'Verified Organization'}</span>
        </div>

        {/* File Name */}
        <div className="flex items-start gap-3">
          <FileText className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-zinc-400 mb-0.5">File Name</p>
            <p className="text-white text-sm font-medium truncate">{doc.fileName}</p>
          </div>
        </div>

        {/* SHA-256 Hash */}
        <div className="flex items-start gap-3">
          <Hash className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-zinc-400">Cryptographic SHA-256 Fingerprint</p>
              <button
                onClick={copyHash}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                {copiedHash ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedHash ? 'Copied!' : 'Copy Hash'}
              </button>
            </div>
            <p className="font-mono text-xs text-zinc-200 bg-zinc-900 rounded-lg p-3 border border-zinc-800 break-all select-all">
              {doc.originalHash}
            </p>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <p className="text-xs text-zinc-400 mb-1">File Size</p>
            <p className="text-sm text-white font-medium">{formatBytes(doc.fileSizeBytes)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Privacy Guarantee</p>
            <p className="text-xs text-emerald-400 font-medium">Zero-Knowledge</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Ledger Status</p>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {doc.status === 'mock' ? 'Simulated Ledger' : doc.status}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <p className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
              <Blocks className="w-3 h-3" /> OriginStamp Anchor ID
            </p>
            <p className="font-mono text-zinc-500 text-[11px] truncate bg-zinc-900/50 p-2 rounded-lg border border-zinc-800">
              {doc.originStampTxId || 'Pending ledger mining...'}
            </p>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Anchored: {new Date(doc.createdAt || doc.originStampTimestamp).toLocaleString()}</span>
          </div>
          <button
            onClick={copyVerificationLink}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium"
          >
            <Share2 className="w-3.5 h-3.5" />
            {copiedLink ? 'Link Copied!' : 'Share Public Verifier'}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleDownloadCertificate}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs transition-all disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>Download Verification Certificate (PDF)</span>
        </button>
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition-all border border-zinc-800"
        >
          <RotateCcw className="w-4 h-4" />
          Anchor Another
        </button>
      </div>
    </div>
  );
}
