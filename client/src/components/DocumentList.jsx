import { useState, useEffect } from 'react';
import { FileText, Search, ChevronLeft, ChevronRight, Inbox, Lock, ExternalLink, ShieldCheck } from 'lucide-react';
import { getDocuments, getCurrentUser } from '../lib/api.js';
import { Link } from 'react-router-dom';
import AuthModal from './AuthModal.jsx';

function formatBytes(bytes) {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function truncateHash(hash) {
  if (!hash) return '—';
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

const statusColors = {
  anchored: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  verified: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  mock: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  tampered: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  pending: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
};

export default function DocumentList() {
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const fetchDocs = async (page = 1) => {
    const currentUser = getCurrentUser();
    setUser(currentUser);

    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getDocuments(page, 20);
      setDocuments(data.documents || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const filtered = search
    ? documents.filter(
        (d) =>
          d.fileName?.toLowerCase().includes(search.toLowerCase()) ||
          d.originalHash?.includes(search.toLowerCase())
      )
    : documents;

  if (!user && !loading) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in text-center py-12">
        <div className="glass-card p-10 rounded-xl border border-zinc-800">
          <Lock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Issuer Authentication Required</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Document registries are scoped to authenticated issuers. Sign in to view and audit your anchored records.
          </p>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm rounded-lg transition-colors"
          >
            Sign In as Issuer
          </button>
        </div>
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={() => fetchDocs()}
        />
      </div>
    );
  }

  if (!loading && documents.length === 0) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Issuer Document Registry</h2>
        <p className="text-zinc-400 text-sm text-center mb-8">
          Organization: <strong className="text-white">{user?.issuerName}</strong>
        </p>
        <div className="glass-card p-12 text-center rounded-xl">
          <Inbox className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-300 font-medium mb-2">No documents anchored yet</p>
          <p className="text-zinc-500 text-sm mb-6">
            Anchor your organization's first document to establish an immutable cryptographic record.
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-all"
          >
            Anchor First Document
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Anchored Records</h2>
          <p className="text-zinc-400 text-xs mt-1">
            Issuer: <strong className="text-amber-400">{user?.issuerName}</strong> • {pagination.total} records managed
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file or hash..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">File</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">SHA-256 Hash</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">Size</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ledger Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="px-5 py-4" colSpan={5}>
                      <div className="h-4 bg-zinc-800/50 rounded animate-pulse" style={{ width: `${50 + i * 10}%` }} />
                    </td>
                  </tr>
                ))
              ) : (
                filtered.map((doc) => (
                  <tr
                    key={doc.id || doc._id}
                    className="border-b border-zinc-800/50 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-sm font-medium text-white truncate max-w-[180px]">
                          {doc.fileName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell font-mono text-xs text-zinc-400">
                      {truncateHash(doc.originalHash)}
                    </td>
                    <td className="px-5 py-4 text-xs text-zinc-400 hidden md:table-cell">
                      {formatBytes(doc.fileSizeBytes)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[doc.status] || 'text-zinc-400'}`}>
                        {doc.status === 'mock' ? 'Simulated' : doc.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-zinc-400 hidden sm:table-cell">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchDocs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchDocs(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
