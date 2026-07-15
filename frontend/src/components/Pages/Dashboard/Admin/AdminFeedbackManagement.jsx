import React, { useState, useEffect, useCallback } from 'react';
import { Spinner, Modal } from 'flowbite-react';
import { MessageSquareText, Search, Trash2, Star, Eye, ArrowLeft, ArrowRight } from 'lucide-react';
import FeedbackService from '../../../../utils/FeedbackService';

const AdminFeedbackManagement = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const perPage = 20;

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = page * perPage;
      const res = await FeedbackService.adminGetAllFeedback({ limit: perPage, offset, search });
      setFeedback(res?.feedback || []);
      setTotal(res?.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput);
  };

  const handleDeleteConfirm = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await FeedbackService.adminDeleteFeedback(selected.id);
      setShowDeleteModal(false);
      setSelected(null);
      fetchFeedback();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by email or response..."
            className="w-full bg-surface-600 border border-surface-500 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg transition-colors">Search</button>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {loading && feedback.length === 0 ? (
        <div className="flex justify-center py-16"><Spinner size="xl" /></div>
      ) : feedback.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No feedback found.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-400 border-b border-surface-500">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Rating</th>
                        <th className="pb-3 pr-4 hidden sm:table-cell">Video</th>
                        <th className="pb-3 pr-4 hidden md:table-cell">Date</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-500/50">
                {feedback.map(fb => (
                  <tr key={fb.id} className="hover:bg-surface-600/30">
                    <td className="py-3 pr-4 text-white text-xs">{fb.user?.email || '—'}</td>
                    <td className="py-3 pr-4">
                      {fb.rating ? (
                        <div className="flex gap-0.5">
                          {Array.from({ length: fb.rating }, (_, i) => (
                            <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      ) : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="py-3 pr-4 text-gray-300 text-xs hidden sm:table-cell max-w-[150px] truncate">
                      {fb.video_title || '—'}
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs hidden md:table-cell">
                      {new Date(fb.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelected(fb)}
                          className="p-1.5 rounded-lg bg-surface-600 hover:bg-surface-500 text-gray-400 hover:text-white transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => { setSelected(fb); setShowDeleteModal(true); }}
                          className="p-1.5 rounded-lg bg-surface-600 hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-gray-400 text-sm">{total} total</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-surface-600 hover:bg-surface-500 disabled:opacity-40 text-white rounded-lg">
                  <ArrowLeft size={14} /> Prev
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-surface-600 hover:bg-surface-500 disabled:opacity-40 text-white rounded-lg">
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal show={selected && !showDeleteModal} onClose={() => setSelected(null)}
        theme={{ content: { inner: 'relative max-h-[90dvh] flex flex-col rounded-lg bg-elevated shadow' } }}>
        <Modal.Header><span className="text-white">Feedback Detail</span></Modal.Header>
        <Modal.Body className="text-gray-300 text-sm space-y-3">
          <p><span className="text-gray-400">User:</span> {selected?.user?.email}</p>
          <p><span className="text-gray-400">Video:</span> {selected?.video_title || 'N/A'}</p>
                          <p><span className="text-gray-400">Rating:</span> {selected?.rating || 'N/A'}</p>
                          <p><span className="text-gray-400">Date:</span> {selected?.submitted_at ? new Date(selected.submitted_at).toLocaleString() : 'N/A'}</p>
          <div>
            <p className="text-gray-400 mb-1">Responses:</p>
            <pre className="bg-surface-600 rounded-lg p-3 text-xs overflow-x-auto max-h-40">
              {JSON.stringify(selected?.responses, null, 2) || '{}'}
            </pre>
          </div>
        </Modal.Body>
      </Modal>

      <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)}
        theme={{ content: { inner: 'relative max-h-[90dvh] flex flex-col rounded-lg bg-elevated shadow' } }}>
        <Modal.Header><span className="text-white">Delete Feedback</span></Modal.Header>
        <Modal.Body>
          <p className="text-gray-300 text-sm">Are you sure you want to delete this feedback?</p>
        </Modal.Body>
        <Modal.Footer className="border-t border-elevated-border">
          <button onClick={handleDeleteConfirm} disabled={deleting}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <button onClick={() => setShowDeleteModal(false)}
            className="px-4 py-2 text-sm bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg">
            Cancel
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminFeedbackManagement;
