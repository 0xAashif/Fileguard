import { useState, useRef, useCallback, useEffect } from 'react';
import { UploadCloud, Loader2, AlertCircle, ShieldCheck, Lock } from 'lucide-react';
import { uploadFile, getCurrentUser } from '../lib/api.js';
import HashResult from './HashResult.jsx';
import AuthModal from './AuthModal.jsx';

export default function DropZone() {
  const [state, setState] = useState('idle'); // idle | dragging | uploading | hashing | anchoring | success | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;

      const currentUser = getCurrentUser();
      if (!currentUser) {
        setAuthModalOpen(true);
        return;
      }

      setFileName(file.name);
      setState('uploading');
      setError('');

      try {
        const data = await uploadFile(file, (progress) => {
          if (progress.status === 'hashing') {
            setState('hashing');
          } else if (progress.status === 'anchoring') {
            setState('anchoring');
          }
        });
        setResult(data);
        setState('success');
      } catch (err) {
        const msg =
          err.response?.data?.message || err.response?.data?.error || err.message;
        setError(msg);
        setState('error');
      }
    },
    []
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setState('idle');
      const file = e.dataTransfer?.files?.[0];
      handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = (e) => {
    e.preventDefault();
    setState('dragging');
  };
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

  const isWorking = ['uploading', 'hashing', 'anchoring'].includes(state);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Cryptographic Document Registry</h2>
        <p className="text-zinc-400 text-sm">
          Zero-Knowledge Architecture: Files are hashed in your browser and never leave your machine.
        </p>
      </div>

      {/* Drop Zone Card */}
      <div
        className={`
          glass-card p-12 text-center cursor-pointer transition-all duration-200 relative overflow-hidden
          ${state === 'dragging' ? 'border-amber-500 bg-amber-500/5' : ''}
          ${state === 'error' ? 'border-red-500/50 bg-red-500/5' : ''}
          ${isWorking ? 'pointer-events-none opacity-80' : ''}
        `}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !isWorking && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {isWorking ? (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-amber-400 mx-auto animate-spin" />
            <p className="text-white font-medium">
              {state === 'hashing' && 'Computing SHA-256 in browser (Zero-Knowledge)...'}
              {state === 'anchoring' && 'Registering cryptographic proof on ledger...'}
              {state === 'uploading' && 'Preparing cryptographic session...'}
            </p>
            <p className="text-zinc-400 text-sm">{fileName}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl mx-auto w-fit transition-colors ${
                state === 'dragging' ? 'bg-amber-500/10' : 'bg-white/5'
              }`}
            >
              <UploadCloud
                className={`w-10 h-10 ${
                  state === 'dragging' ? 'text-amber-400' : 'text-zinc-400'
                }`}
              />
            </div>
            <div>
              <p className="text-white font-medium">
                {state === 'dragging' ? 'Release document to anchor' : 'Drag & drop file to anchor'}
              </p>
              <p className="text-zinc-400 text-sm mt-1">or click to browse from device</p>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-zinc-500 pt-2">
              <span>Client-Side SHA-256</span>
              <span>•</span>
              <span>100% Zero-Knowledge Privacy</span>
            </div>
          </div>
        )}
      </div>

      {/* Issuer Status Banner */}
      <div className="mt-4 p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between text-xs text-zinc-400">
        {user ? (
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>
              Anchoring as verified issuer: <strong className="text-white">{user.issuerName}</strong> ({user.email})
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Issuer sign-in required to anchor documents under verified organization identity.</span>
            </div>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="text-amber-400 hover:underline font-semibold ml-2 shrink-0"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {state === 'error' && (
        <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-medium text-sm">Action Failed</p>
            <p className="text-red-400/80 text-xs mt-1">{error}</p>
            <button
              onClick={reset}
              className="text-red-300 text-xs underline mt-2 hover:text-white"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(userData) => {
          setUser(userData);
        }}
      />
    </div>
  );
}
