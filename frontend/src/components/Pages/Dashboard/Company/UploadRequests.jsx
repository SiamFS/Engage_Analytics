import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Alert } from 'flowbite-react';
import { FileUp, Plus, Search, Eye, Clock } from 'lucide-react';
import { AuthContext } from '../../../../contexts/AuthProvider/AuthProvider';
import UploadRequestService from '../../../../utils/UploadRequestService';

const STATUS_STYLES = {
  draft: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  submitted: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  pending_review: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-300 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
  processing: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  failed: 'bg-red-500/20 text-red-300 border-red-500/30',
  cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  archived: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  archived: 'Archived',
};

const UploadRequests = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const isAdmin = user?.role === 'admin';

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = isAdmin ? 'adminGetAllRequests' : 'getList';
      const params = { limit, offset, status: statusFilter || null, search: search || null, forceRefresh: true };
      const result = await UploadRequestService[endpoint](params);
      setRequests(result.results || []);
      setTotal(result.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load upload requests');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, offset, statusFilter, search]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleSearch = (e) => {
    e.preventDefault();
    setOffset(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-600/20">
            <FileUp size={20} className="text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Upload Requests</h1>
        </div>
        {!isAdmin && (
          <button
            onClick={() => navigate('/dashboard/upload-requests/new')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
            type="button"
          >
            <Plus size={16} />
            New Upload Request
          </button>
        )}
      </div>

      {error && (
        <Alert color="failure" onDismiss={() => setError(null)} className="mb-4 rounded-lg border border-red-800/40">
          {error}
        </Alert>
      )}

      <div className="bg-elevated border border-elevated-border rounded-xl p-5 shadow-md">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={isAdmin ? "Search by title or company..." : "Search by title..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors">
              Search
            </button>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
            className="px-3 py-2 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="xl" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <FileUp size={40} className="mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No upload requests found</p>
            {!isAdmin && (
              <button
                onClick={() => navigate('/dashboard/upload-requests/new')}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors"
                type="button"
              >
                <Plus size={16} />
                Create your first upload request
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-elevated-border">
                    <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Title</th>
                    {isAdmin && <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Company</th>}
                    <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Category</th>
                    <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Submitted</th>
                    <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-elevated-border">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-surface-600 transition-colors">
                      <td className="px-5 py-3 text-white font-medium truncate max-w-[200px]">{req.title}</td>
                      {isAdmin && <td className="px-5 py-3 text-gray-400 hidden md:table-cell">{req.company_name || req.company_email || 'N/A'}</td>}
                      <td className="px-5 py-3 text-gray-400 hidden sm:table-cell capitalize">{req.category || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[req.status] || STATUS_STYLES.draft}`}>
                          {STATUS_LABELS[req.status] || req.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 hidden lg:table-cell">
                        {req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => navigate(`/dashboard/upload-requests/${req.id}`)}
                          className="p-1.5 rounded-lg bg-brand-600/20 text-brand-300 hover:bg-brand-600/30 transition-colors"
                          title="View Details"
                          type="button"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-elevated-border mt-4">
                <span className="text-sm text-gray-400">
                  Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="px-3 py-1.5 text-sm bg-surface-600 text-gray-300 rounded-lg hover:bg-surface-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    type="button"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-400">Page {currentPage} of {totalPages}</span>
                  <button
                    onClick={() => setOffset(Math.min((totalPages - 1) * limit, offset + limit))}
                    disabled={offset + limit >= total}
                    className="px-3 py-1.5 text-sm bg-surface-600 text-gray-300 rounded-lg hover:bg-surface-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UploadRequests;
