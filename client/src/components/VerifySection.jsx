import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  UploadCloud,
  Loader2,
  FileText,
  Building,
  Hash,
  Download,
  Share2,
  Check,
} from 'lucide-react';
import { verifyByFile, verifyByHash } from '../lib/api.js';
import { generateCertificatePDF } from '../lib/certificateGenerator.js';

export default function VerifySection() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState('file'); // 'file' | 'hash'
  const [state, setState] = useState('idle'); // idle | loading | result
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [hashInput, setHashInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const inputRef = useRef(null);

  // Auto-verify if hash parameter is present in URL query
  useEffect(() => {
    const hashParam = searchParams.get('hash');
    if (hashParam && /^[a-f0-9]{64}$/i.test(hashParam.trim())) {
      setHashInput(hashParam.trim());
      setTab('hash');
      executeHashVerification(hashParam.trim());
    }
  }, [searchParams]);

  const executeHashVerification = async (hashToVerify) => {
    setState('loading');
    setError('');
    try {
      const data = await verifyByHash(hashToVerify.toLowerCase());
      setResult(data);
      setState('result');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message);
      setState('idle');
    }
  };

  // ── Verify by File ──
  const handleFileVerify = useCallback(async (file) => {
    if (!file) return;
    setState('loading');
    setError('');
    try {
      const data = await verifyByFile(file);
      setResult(data);
      setState('result');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message);
      setState('idle');
    }
  }, []);

  // ── Verify by Hash ──
  const handleHashVerify = async () => {
    const cleaned = hashInput.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(cleaned)) {
      setError('Invalid hash. Must be a 64-character SHA-256 hexadecimal string.');
      return;
    }
    executeHashVerification(cleaned);
  };

  const handleDownloadCertificate = async () => {
    if (!result?.document) return;
    setDownloading(true);
    try {
      await generateCertificatePDF(result.document);
    } catch (err) {
      console.error('Failed to generate PDF certificate:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!result?.document?.originalHash) return;
    const url = `${window.location.origin}/verify?hash=${result.document.originalHash}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const reset = () => {
    setState('idle');
    setResult(null);
    setError('');
    setHashInput('');
  };

  // ── Result Display ──
  if (state === 'result' && result) {
    const isAuthentic = result.verified;
    const doc = result.document;

    return (
      <div className="max-w-2xl mx-auto animate-slide-up">
        <div
          className={`glass-card p-8 rounded-2xl text-center border ${
            isAuthentic ? 'border-blue-500/30 bg-blue-500/5' : 'border-red-500/30 bg-red-500/5'
          }`}
        >
          <div
            className={`inline-flex items-center justify-center p-4 rounded-2xl mb-4 ${
              isAuthentic ? 'bg-blue-500/10' : 'bg-red-500/10'
            }`}
          >
            {isAuthentic ? (
              <ShieldCheck className="w-12 h-12 text-blue-400" />
            ) : (
              <ShieldAlert className="w-12 h-12 text-red-400" />
            )}
          </div>

          <h2 className={`text-2xl font-bold mb-2 ${isAuthentic ? 'text-white' : 'text-red-400'}`}>
            {isAuthentic ? 'Cryptographically Authentic' : 'Verification Failed'}
          </h2>

          <p className="text-slate-400 text-sm mb-6">{result.message}</p>

          {isAuthentic && doc && (
            <div className="text-left space-y-3 p-5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-blue-400" /> Verified Issuer
                </span>
                <span className="text-white font-semibold text-sm">{doc.issuerName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Document Name</span>
                <span className="text-white font-medium truncate max-w-[220px]">{doc.fileName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cryptographic Hash</span>
                <span className="font-mono text-slate-300">
                  {doc.originalHash.slice(0, 12)}...{doc.originalHash.slice(-12)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Anchor Timestamp</span>
                <span className="text-slate-200">
                  {new Date(doc.originStampTimestamp || doc.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Ledger Status</span>
                <span className="text-blue-400 font-semibold uppercase">{doc.status}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-slate-400">
                <span>Audit Verifications</span>
                <span>{doc.verificationCount} total checks</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {isAuthentic && (
              <>
                <button
                  onClick={handleDownloadCertificate}
                  disabled={downloading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Download PDF Certificate</span>
                </button>
                <button
                  onClick={handleCopyShareLink}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-xl text-xs transition-all"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Share Proof Link'}</span>
                </button>
              </>
            )}
            <button
              onClick={reset}
              className="py-3 px-4 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs transition-all"
            >
              Verify Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Public Document Verification</h2>
        <p className="text-slate-400 text-sm">
          Independently verify any document against the cryptographic registry without creating an account.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-900/80 border border-slate-800 mb-8">
        <button
          onClick={() => {
            setTab('file');
            setError('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'file'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Verify by File
        </button>
        <button
          onClick={() => {
            setTab('hash');
            setError('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'hash'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          Verify by SHA-256 Hash
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'file' ? (
        <div
          className={`glass-card p-10 text-center cursor-pointer rounded-2xl border transition-all ${
            dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800'
          } ${state === 'loading' ? 'pointer-events-none opacity-70' : ''}`}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFileVerify(e.dataTransfer?.files?.[0]);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileVerify(e.target.files?.[0])}
          />
          {state === 'loading' ? (
            <div className="space-y-3">
              <Loader2 className="w-10 h-10 text-blue-400 mx-auto animate-spin" />
              <p className="text-white text-sm font-medium">Computing local hash and querying registry...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-white font-medium text-sm">Drop document here to verify authenticity</p>
              <p className="text-slate-400 text-xs">Zero-Knowledge: The file is hashed in your browser only</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card p-8 rounded-2xl border border-slate-800 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Enter 64-Character SHA-256 Hash
            </label>
            <input
              type="text"
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              placeholder="e.g. e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleHashVerify}
            disabled={state === 'loading' || !hashInput.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {state === 'loading' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>Verify Cryptographic Record</span>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center">
          {error}
        </div>
      )}
    </div>
  );
}
