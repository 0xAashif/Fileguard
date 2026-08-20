import { useState, useRef, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, Search, UploadCloud, Loader2, FileText } from 'lucide-react';
import { verifyByFile, verifyByHash } from '../lib/api.js';

export default function VerifySection() {
  const [tab, setTab] = useState('file'); // 'file' | 'hash'
  const [state, setState] = useState('idle'); // idle | loading | result
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [hashInput, setHashInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

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
      setError(err.response?.data?.error || err.message);
      setState('idle');
    }
  }, []);

  // ── Verify by Hash ──
  const handleHashVerify = async () => {
    const cleaned = hashInput.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(cleaned)) {
      setError('Invalid hash. Must be a 64-character hexadecimal string.');
      return;
    }
    setState('loading');
    setError('');
    try {
      const data = await verifyByHash(cleaned);
      setResult(data);
      setState('result');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setState('idle');
    }
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
    return (
      <div className="max-w-2xl mx-auto animate-slide-up">
        <div className={`
          glass-card p-8 text-center
          ${isAuthentic ? 'glow-accent border-emerald-500/30' : 'glow-danger border-rose-500/30'}
        `}>
          <div className={`
            inline-flex items-center justify-center p-4 rounded-2xl mb-4
            ${isAuthentic ? 'bg-emerald-500/10' : 'bg-rose-500/10'}
          `}>
            {isAuthentic
              ? <ShieldCheck className="w-10 h-10 text-emerald-400" />
              : <ShieldAlert className="w-10 h-10 text-rose-400" />
            }
          </div>

          <h2 className={`text-2xl font-bold mb-2 ${isAuthentic ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isAuthentic ? 'Document is Authentic ✓' : 'Document Not Found ✗'}
          </h2>

          <p className="text-slate-400 text-sm mb-6">{result.message}</p>

          {isAuthentic && result.document && (
            <div className="text-left space-y-3 p-4 rounded-xl bg-dark-800/50 border border-glass-border">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">File</span>
                <span className="text-white">{result.document.fileName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <span className="text-emerald-400 font-medium">{result.document.status}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Verified</span>
                <span className="text-white">{result.document.verificationCount} times</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">First Anchored</span>
                <span className="text-white">{new Date(result.document.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          <button
            onClick={reset}
            className="mt-6 px-6 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-sm"
          >
            Verify Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Verify Integrity</h2>
        <p className="text-slate-400 text-sm">
          Check if a document has been tampered with since it was anchored.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-dark-800/80 border border-glass-border mb-8">
        <button
          onClick={() => { setTab('file'); setError(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'file' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Verify by File
        </button>
        <button
          onClick={() => { setTab('hash'); setError(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'hash' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          Verify by Hash
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'file' ? (
        <div
          className={`glass-card p-10 text-center cursor-pointer transition-all ${
            dragActive ? 'border-cyan-400/50 bg-cyan-400/5 glow-cyan' : ''
          } ${state === 'loading' ? 'pointer-events-none opacity-70' : ''}`}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileVerify(e.dataTransfer?.files?.[0]); }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onClick={() => state !== 'loading' && inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFileVerify(e.target.files?.[0])} />
          {state === 'loading' ? (
            <Loader2 className="w-10 h-10 text-cyan-400 mx-auto animate-spin" />
          ) : (
            <>
              <UploadCloud className={`w-10 h-10 mx-auto mb-3 ${dragActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <p className="text-white font-medium">Drop file to verify</p>
              <p className="text-slate-500 text-sm mt-1">We'll compute its hash and check against anchored records</p>
            </>
          )}
        </div>
      ) : (
        <div className="glass-card p-6 space-y-4">
          <label className="block">
            <span className="text-xs text-slate-500 mb-1.5 block">SHA-256 Hash</span>
            <input
              type="text"
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              placeholder="Enter 64-character hex hash..."
              className="w-full px-4 py-3 rounded-xl bg-dark-800/80 border border-glass-border text-white font-mono text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              maxLength={64}
            />
          </label>
          <p className="text-xs text-slate-600">{hashInput.length}/64 characters</p>
          <button
            onClick={handleHashVerify}
            disabled={hashInput.length !== 64 || state === 'loading'}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-dark-950 font-semibold text-sm transition-all"
          >
            {state === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Verify Hash
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-4 text-rose-400 text-sm text-center animate-fade-in">{error}</p>
      )}
    </div>
  );
}
