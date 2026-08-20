import { Link } from 'react-router-dom';
import { Shield, Upload, Search, Building, CheckCircle2, Lock } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8 animate-fade-in">
          <Lock className="w-3.5 h-3.5" />
          Zero-Knowledge Trust Infrastructure · SHA-256 · Public Auditability
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6 animate-slide-up">
          Verify Document Authenticity{' '}
          <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            Before You Trust It
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 animate-slide-up"
          style={{ animationDelay: '100ms' }}
        >
          An immutable audit trail for universities, legal firms, and enterprises. 
          Hash documents locally in your browser, anchor cryptographic proofs, and issue verifiable records.
        </p>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up"
          style={{ animationDelay: '200ms' }}
        >
          <Link
            to="/upload"
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-blue-500/20"
          >
            <Upload className="w-4 h-4" />
            Anchor as Issuer
          </Link>
          <Link
            to="/verify"
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900/60 text-slate-200 hover:text-white font-semibold text-sm transition-all duration-200"
          >
            <Search className="w-4 h-4" />
            Public Verification Portal
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="glass-card p-5 text-center rounded-2xl border border-slate-800">
            <Lock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <p className="text-xl font-bold text-white">Zero-Knowledge</p>
            <p className="text-xs text-slate-400 mt-1">Files Never Leave Your Device</p>
          </div>
          <div className="glass-card p-5 text-center rounded-2xl border border-slate-800">
            <Building className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <p className="text-xl font-bold text-white">Verified Issuers</p>
            <p className="text-xs text-slate-400 mt-1">Cryptographic Origin Attribution</p>
          </div>
          <div className="glass-card p-5 text-center rounded-2xl border border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
            <p className="text-xl font-bold text-white">Independent</p>
            <p className="text-xs text-slate-400 mt-1">Mathematical SHA-256 Audit Trail</p>
          </div>
        </div>
      </div>
    </section>
  );
}
