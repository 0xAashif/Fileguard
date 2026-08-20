import { NavLink } from 'react-router-dom';
import { Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `relative px-3 py-2 text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'text-emerald-400'
        : 'text-slate-400 hover:text-white'
    }`;

  const activeBar = ({ isActive }) =>
    isActive ? (
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-emerald-400 rounded-full" />
    ) : null;

  return (
    <nav className="sticky top-0 z-50 glass-card rounded-none border-x-0 border-t-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              File<span className="text-emerald-400">Guard</span>
            </span>
          </NavLink>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              {(props) => (<><span>Home</span>{activeBar(props)}</>)}
            </NavLink>
            <NavLink to="/upload" className={linkClass}>
              {(props) => (<><span>Upload</span>{activeBar(props)}</>)}
            </NavLink>
            <NavLink to="/verify" className={linkClass}>
              {(props) => (<><span>Verify</span>{activeBar(props)}</>)}
            </NavLink>
            <NavLink to="/documents" className={linkClass}>
              {(props) => (<><span>Documents</span>{activeBar(props)}</>)}
            </NavLink>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1 animate-fade-in">
            <NavLink to="/" end className="block px-3 py-2 text-sm text-slate-300 hover:text-white" onClick={() => setMobileOpen(false)}>Home</NavLink>
            <NavLink to="/upload" className="block px-3 py-2 text-sm text-slate-300 hover:text-white" onClick={() => setMobileOpen(false)}>Upload</NavLink>
            <NavLink to="/verify" className="block px-3 py-2 text-sm text-slate-300 hover:text-white" onClick={() => setMobileOpen(false)}>Verify</NavLink>
            <NavLink to="/documents" className="block px-3 py-2 text-sm text-slate-300 hover:text-white" onClick={() => setMobileOpen(false)}>Documents</NavLink>
          </div>
        )}
      </div>
    </nav>
  );
}
