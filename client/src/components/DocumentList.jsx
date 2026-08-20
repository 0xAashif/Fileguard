import { useState, useEffect } from 'react';
import { FileText, Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { getDocuments } from '../lib/api.js';
import { Link } from 'react-router-dom';

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
  anchored: 'bg-emerald-500/10 text-emerald-400',
  verified: 'bg-cyan-500/10 text-cyan-400',
  tampered: 'bg-rose-500/10 text-rose-400',
  pending: 'bg-amber-500/10 text-amber-400',
};

export default function DocumentList() {
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDocs = async (page = 1) => {
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

  useEffect(() => { fetchDocs(); }, []);

  // Client-side search filter
  const filtered = search
    ? documents.filter(d =>
        d.fileName?.toLowerCase().includes(search.toLowerCase()) ||
        d.originalHash?.includes(search.toLowerCase())
      )
    : documents;

  // ── Empty State ──
  if (!loading && documents.length === 0) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Anchored Documents</h2>
        <div className="glass-card p-12 text-center">
          <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium mb-2">No documents anchored yet</p>
          <p className="text-slate-600 text-sm mb-6">Upload your first document to create a tamper-proof record.</p>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-semibold text-sm transition-all"
          >
            Upload First Document
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Anchored Documents</h2>
          <p className="text-slate-500 text-sm mt-1">{pagination.total} documents secured</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or hash..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-800/80 border border-glass-border text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
          />
        </div>
      </div>

      {/* Document Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-glass-border">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider">File</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Hash</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Size</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-glass-border/50">
                    <td className="px-5 py-4" colSpan={5}>
                      <div className="h-4 bg-dark-700/50 rounded animate-pulse" style={{ width: `${60 + i * 8}%` }} />
                    </td>
                  </tr>
                ))
              ) : (
                filtered.map((doc) => (
                  <tr key={doc.id || doc._id} className="border-b border-glass-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-sm text-white truncate max-w-[180px]">{doc.fileName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="hash-text text-slate-400">{truncateHash(doc.originalHash)}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400 hidden md:table-cell">{formatBytes(doc.fileSizeBytes)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[doc.status] || 'text-slate-400'}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 hidden sm:table-cell">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-glass-border">
            <p className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchDocs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg border border-glass-border text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchDocs(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-1.5 rounded-lg border border-glass-border text-slate-400 hover:text-white disabled:opacity-30 transition-all"
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
