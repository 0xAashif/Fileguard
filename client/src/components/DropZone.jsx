import { useState, useRef, useCallback } from 'react';
import { UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import { uploadFile } from '../lib/api.js';
import HashResult from './HashResult.jsx';

export default function DropZone() {
  const [state, setState] = useState('idle'); // idle | dragging | uploading | success | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;

    setFileName(file.name);
    setState('uploading');
    setError('');

    try {
      const data = await uploadFile(file);
      setResult(data);
      setState('success');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(msg);
      setState('error');
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setState('idle');
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
  }, [handleFile]);

  const onDragOver = (e) => { e.preventDefault(); setState('dragging'); };
  const onDragLeave = () => setState('idle');

  const reset = () => {
    setState('idle');
    setResult(null);
    setError('');
    setFileName('');
    if (inputRef.current) inputRef.current.value = '';
  };

  // ── Success State ──
  if (state === 'success' && result) {
    return <HashResult data={result} onReset={reset} />;
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Upload & Secure</h2>
        <p className="text-slate-400 text-sm">
          Your file is never stored — only its cryptographic fingerprint is computed and anchored.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        className={`
          glass-card p-12 text-center cursor-pointer transition-all duration-300
          ${state === 'dragging' ? 'border-emerald-400/50 bg-emerald-400/5 glow-accent' : ''}
          ${state === 'error' ? 'border-rose-400/50' : ''}
          ${state === 'uploading' ? 'pointer-events-none opacity-70' : ''}
        `}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => state !== 'uploading' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {state === 'uploading' ? (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-emerald-400 mx-auto animate-spin" />
            <p className="text-white font-medium">Computing SHA-256 hash...</p>
            <p className="text-slate-500 text-sm">{fileName}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`
              p-4 rounded-2xl mx-auto w-fit transition-colors
              ${state === 'dragging' ? 'bg-emerald-500/20' : 'bg-white/5'}
            `}>
              <UploadCloud className={`w-10 h-10 ${state === 'dragging' ? 'text-emerald-400' : 'text-slate-500'}`} />
            </div>
            <div>
              <p className="text-white font-medium">
                {state === 'dragging' ? 'Release to upload' : 'Drag & drop your file here'}
              </p>
              <p className="text-slate-500 text-sm mt-1">or click to browse</p>
            </div>
            <p className="text-xs text-slate-600">Any file type · Up to 100MB</p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {state === 'error' && (
        <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-rose-300 font-medium text-sm">Upload Failed</p>
            <p className="text-rose-400/70 text-xs mt-1">{error}</p>
            <button onClick={reset} className="text-rose-300 text-xs underline mt-2 hover:text-white">
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
