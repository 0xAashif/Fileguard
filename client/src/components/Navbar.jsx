import { NavLink } from 'react-router-dom';
import { Shield, Menu, X, User, LogOut, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getCurrentUser, logoutUser } from '../lib/api';
import AuthModal from './AuthModal';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    window.location.reload();
  };

  const linkClass = ({ isActive }) =>
    `relative px-3 py-2 text-sm font-medium transition-colors duration-200 ${
      isActive ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'
    }`;

  const activeBar = ({ isActive }) =>
    isActive ? (
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-blue-500 rounded-full" />
    ) : null;

  return (
    <>
      <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2.5 group">
              <div className="p-1.5 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                File<span className="text-blue-400">Guard</span>
              </span>
            </NavLink>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-2">
              <NavLink to="/" end className={linkClass}>
                {(props) => (<><span>Home</span>{activeBar(props)}</>)}
              </NavLink>
              <NavLink to="/upload" className={linkClass}>
                {(props) => (<><span>Anchor</span>{activeBar(props)}</>)}
              </NavLink>
              <NavLink to="/verify" className={linkClass}>
                {(props) => (<><span>Verify</span>{activeBar(props)}</>)}
              </NavLink>
              {user && (
                <NavLink to="/documents" className={linkClass}>
                  {(props) => (<><span>My Documents</span>{activeBar(props)}</>)}
                </NavLink>
              )}
            </div>

            {/* Auth Actions */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-medium text-white">{user.issuerName}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Issuer Sign In</span>
                </button>
              )}
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
            <div className="md:hidden pb-4 space-y-2 animate-fade-in border-t border-slate-800 pt-3">
              <NavLink to="/" end className="block px-3 py-2 text-sm text-slate-300 hover:text-white" onClick={() => setMobileOpen(false)}>Home</NavLink>
              <NavLink to="/upload" className="block px-3 py-2 text-sm text-slate-300 hover:text-white" onClick={() => setMobileOpen(false)}>Anchor</NavLink>
              <NavLink to="/verify" className="block px-3 py-2 text-sm text-slate-300 hover:text-white" onClick={() => setMobileOpen(false)}>Verify</NavLink>
              {user && (
                <NavLink to="/documents" className="block px-3 py-2 text-sm text-slate-300 hover:text-white" onClick={() => setMobileOpen(false)}>My Documents</NavLink>
              )}
              {!user ? (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-blue-400 font-semibold"
                >
                  Issuer Sign In
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-red-400"
                >
                  Sign Out ({user.issuerName})
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
