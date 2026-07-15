import React, { useState, useEffect, useCallback } from 'react';
import { Spinner, Alert, Modal } from 'flowbite-react';
import { FileUp, Search, Eye, CheckCircle, XCircle, Archive, Clock, MessageSquare, Send } from 'lucide-react';
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

const AdminUploadRequests = () => {
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [actionComment, setActionComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const limit = 20;

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await UploadRequestService.adminGetAllRequests({
        limit,
        offset,
        status: statusFilter || null,
        search: search || null,
      });
      setRequests(result.results || []);
      setTotal(result.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter, search]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openDetail = async (req) => {
    try {
      const detail = await UploadRequestService.adminGetDetail(req.id);
      setSelectedRequest(detail);
      setDetailModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const updated = await UploadRequestService.adminApprove(selectedRequest.id, actionComment);
      setSelectedRequest(updated);
      setActionModal(null);
      setActionComment('');
      fetchRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const updated = await UploadRequestService.adminReject(
        selectedRequest.id, rejectReason, suggestions, actionComment
      );
      setSelectedRequest(updated);
      setActionModal(null);
      setRejectReason('');
      setSuggestions('');
      setActionComment('');
      fetchRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async (reqId) => {
    setActionLoading(true);
    try {
      await UploadRequestService.adminArchive(reqId);
      fetchRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-brand-600/20">
          <FileUp size={20} className="text-brand-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Upload Request Management</h1>
      </div>

      {error && (
        <Alert color="failure" onDismiss={() => setError(null)} className="mb-4 rounded-lg border border-red-800/40">
          {error}
        </Alert>
      )}

      <div className="bg-elevated border border-elevated-border rounded-xl p-5 shadow-md">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setOffset(0); fetchRequests(); } }}
                className="w-full pl-9 pr-3 py-2 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <button
              onClick={() => { setOffset(0); fetchRequests(); }}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors"
              type="button"
            >
              Search
            </button>
          </div>
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
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-elevated-border">
                    <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Title</th>
                    <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Company</th>
                    <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Submitted</th>
                    <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-elevated-border">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-surface-600 transition-colors">
                      <td className="px-5 py-3 text-white font-medium truncate max-w-[200px]">{req.title}</td>
                      <td className="px-5 py-3 text-gray-400 hidden md:table-cell">{req.company_name || req.company_email || 'N/A'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[req.status] || STATUS_STYLES.draft}`}>
                          {STATUS_LABELS[req.status] || req.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 hidden lg:table-cell">
                        {req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => openDetail(req)} className="p-1.5 rounded-lg bg-brand-600/20 text-brand-300 hover:bg-brand-600/30 transition-colors" title="View Details" type="button">
                            <Eye size={14} />
                          </button>
                          {(req.status === 'submitted' || req.status === 'pending_review') && (
                            <>
                              <button
                                onClick={() => { setSelectedRequest(req); setActionModal('approve'); setActionComment(''); }}
                                className="p-1.5 rounded-lg bg-green-600/20 text-green-300 hover:bg-green-600/30 transition-colors"
                                title="Approve"
                                type="button"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button
                                onClick={() => { setSelectedRequest(req); setActionModal('reject'); setRejectReason(''); setSuggestions(''); setActionComment(''); }}
                                className="p-1.5 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 transition-colors"
                                title="Reject"
                                type="button"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                          {!['archived', 'cancelled', 'completed'].includes(req.status) && (
                            <button
                              onClick={() => handleArchive(req.id)}
                              className="p-1.5 rounded-lg bg-gray-600/20 text-gray-300 hover:bg-gray-600/30 transition-colors"
                              title="Archive"
                              type="button"
                            >
                              <Archive size={14} />
                            </button>
                          )}
                        </div>
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
                  <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}
                    className="px-3 py-1.5 text-sm bg-surface-600 text-gray-300 rounded-lg hover:bg-surface-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    type="button">Previous</button>
                  <span className="px-3 py-1.5 text-sm text-gray-400">Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setOffset(Math.min((totalPages - 1) * limit, offset + limit))}
                    disabled={offset + limit >= total}
                    className="px-3 py-1.5 text-sm bg-surface-600 text-gray-300 rounded-lg hover:bg-surface-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    type="button">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal show={detailModal} onClose={() => { setDetailModal(false); setSelectedRequest(null); }}
        theme={{ content: { inner: 'relative flex max-h-[90dvh] flex-col rounded-lg bg-elevated shadow' } }}
        size="2xl">
        <Modal.Header className="bg-elevated text-white border-b border-elevated-border rounded-t-xl">
          <span className="text-white">Request Details</span>
        </Modal.Header>
        <Modal.Body className="bg-elevated text-white">
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{selectedRequest.title}</h3>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[selectedRequest.status]}`}>
                  {STATUS_LABELS[selectedRequest.status]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">Company:</span> <span className="text-white">{selectedRequest.company_email}</span></div>
                <div><span className="text-gray-400">Category:</span> <span className="text-white capitalize">{selectedRequest.category || '—'}</span></div>
                <div><span className="text-gray-400">Submitted:</span> <span className="text-white">{selectedRequest.submitted_at ? new Date(selectedRequest.submitted_at).toLocaleString() : '—'}</span></div>
                <div><span className="text-gray-400">Reviewed:</span> <span className="text-white">{selectedRequest.reviewed_at ? new Date(selectedRequest.reviewed_at).toLocaleString() : '—'}</span></div>
              </div>
              {selectedRequest.description && (
                <div>
                  <p className="text-gray-400 text-sm mb-1">Description</p>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedRequest.description}</p>
                </div>
              )}
              {selectedRequest.rejection_reason && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-800/40">
                  <p className="text-red-300 text-sm font-medium">Rejection Reason</p>
                  <p className="text-red-200 text-sm mt-1">{selectedRequest.rejection_reason}</p>
                  {selectedRequest.suggestions && (
                    <p className="text-yellow-200 text-sm mt-2"><span className="text-yellow-300">Suggestions:</span> {selectedRequest.suggestions}</p>
                  )}
                </div>
              )}
              {selectedRequest.admin_comment && selectedRequest.status !== 'rejected' && (
                <div className="p-3 rounded-lg bg-brand-600/10 border border-brand-600/20">
                  <p className="text-brand-300 text-sm font-medium">Admin Comment</p>
                  <p className="text-brand-200 text-sm mt-1">{selectedRequest.admin_comment}</p>
                </div>
              )}
              {selectedRequest.status_logs && selectedRequest.status_logs.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm font-medium mb-2">Status History</p>
                  <div className="space-y-1.5">
                    {selectedRequest.status_logs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                        <div>
                          <span className="text-gray-300">{STATUS_LABELS[log.from_status] || 'None'} → {STATUS_LABELS[log.to_status]}</span>
                          <span className="text-gray-500 ml-2">{log.changed_by ? `by ${log.changed_by}` : 'System'} · {new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-elevated border-t border-elevated-border">
          {(selectedRequest?.status === 'submitted' || selectedRequest?.status === 'pending_review') && (
            <>
              <button onClick={() => { setDetailModal(false); setActionModal('approve'); }}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors" type="button">
                <CheckCircle size={16} className="inline mr-1" /> Approve
              </button>
              <button onClick={() => { setDetailModal(false); setActionModal('reject'); }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors" type="button">
                <XCircle size={16} className="inline mr-1" /> Reject
              </button>
            </>
          )}
          <button onClick={() => { setDetailModal(false); setSelectedRequest(null); }}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors" type="button">
            Close
          </button>
        </Modal.Footer>
      </Modal>

      <Modal show={actionModal === 'approve'} onClose={() => setActionModal(null)}
        theme={{ content: { inner: 'relative flex max-h-[90dvh] flex-col rounded-lg bg-elevated shadow' } }}>
        <Modal.Header className="bg-elevated text-white border-b border-elevated-border rounded-t-xl">
          <span className="text-white">Approve Request</span>
        </Modal.Header>
        <Modal.Body className="bg-elevated text-white">
          <p className="mb-3 text-sm text-gray-300">Approve "{selectedRequest?.title}"?</p>
          <textarea
            value={actionComment}
            onChange={(e) => setActionComment(e.target.value)}
            placeholder="Optional comment for the company..."
            className="w-full p-3 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
            rows={3}
          />
        </Modal.Body>
        <Modal.Footer className="bg-elevated border-t border-elevated-border">
          <button onClick={handleApprove} disabled={actionLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50" type="button">
            {actionLoading ? 'Approving...' : 'Approve'}
          </button>
          <button onClick={() => setActionModal(null)}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors" type="button">
            Cancel
          </button>
        </Modal.Footer>
      </Modal>

      <Modal show={actionModal === 'reject'} onClose={() => setActionModal(null)}
        theme={{ content: { inner: 'relative flex max-h-[90dvh] flex-col rounded-lg bg-elevated shadow' } }}>
        <Modal.Header className="bg-elevated text-white border-b border-elevated-border rounded-t-xl">
          <span className="text-white">Reject Request</span>
        </Modal.Header>
        <Modal.Body className="bg-elevated text-white space-y-3">
          <p className="text-sm text-gray-300">Reject "{selectedRequest?.title}"?</p>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Rejection Reason <span className="text-red-400">*</span></label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this request is being rejected..."
              className="w-full p-3 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none"
              rows={3}
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Suggestions for Resubmission</label>
            <textarea
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              placeholder="What changes would make this request approvable?"
              className="w-full p-3 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Internal Comment (optional)</label>
            <textarea
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              placeholder="Internal note..."
              className="w-full p-3 bg-surface-600 border border-elevated-border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
              rows={2}
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-elevated border-t border-elevated-border">
          <button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50" type="button">
            {actionLoading ? 'Rejecting...' : 'Reject'}
          </button>
          <button onClick={() => setActionModal(null)}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors" type="button">
            Cancel
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminUploadRequests;
