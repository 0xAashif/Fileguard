import { Link } from 'react-router-dom';
import { Shield, Upload, Search, Cpu, Database, Lock } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center px-4">
      {/* Background Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-8 animate-fade-in">
          <Lock className="w-3.5 h-3.5" />
          Zero-RAM Stream Hashing · SHA-256 · Blockchain Anchored
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6 animate-slide-up">
          Protect Your Documents{' '}
          <br className="hidden sm:block" />
          with{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Cryptographic Proof
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
          Upload any document. FileGuard computes its SHA-256 fingerprint using zero-memory 
          streaming and anchors it to the blockchain — creating tamper-proof, independently 
          verifiable proof of integrity.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <Link
            to="/upload"
            className="group flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-semibold text-sm transition-all duration-200 glow-accent"
          >
            <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            Upload & Secure
          </Link>
          <Link
            to="/verify"
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-sm transition-all duration-200"
          >
            <Search className="w-4 h-4" />
            Verify Integrity
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto stagger">
          <div className="glass-card p-4 text-center animate-fade-in">
            <Cpu className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">0 MB</p>
            <p className="text-xs text-slate-500 mt-1">RAM Used Per Upload</p>
          </div>
          <div className="glass-card p-4 text-center animate-fade-in">
            <Shield className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">SHA-256</p>
            <p className="text-xs text-slate-500 mt-1">Cryptographic Hashing</p>
          </div>
          <div className="glass-card p-4 text-center animate-fade-in">
            <Database className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">Bitcoin</p>
            <p className="text-xs text-slate-500 mt-1">Blockchain Anchored</p>
          </div>
        </div>
      </div>
    </section>
  );
}
