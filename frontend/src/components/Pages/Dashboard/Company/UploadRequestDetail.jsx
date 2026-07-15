import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, Alert } from 'flowbite-react';
import { ArrowLeft, FileUp, Clock, User, CheckCircle, XCircle, Send, Trash2 } from 'lucide-react';
import { AuthContext } from '../../../../contexts/AuthProvider/AuthProvider';
import UploadRequestService from '../../../../utils/UploadRequestService';

const STATUS_STYLES = {
  draft: 'bg-gray-500/20 text-gray-300',
  submitted: 'bg-blue-500/20 text-blue-300',
  pending_review: 'bg-yellow-500/20 text-yellow-300',
  approved: 'bg-green-500/20 text-green-300',
  rejected: 'bg-red-500/20 text-red-300',
  processing: 'bg-purple-500/20 text-purple-300',
  completed: 'bg-emerald-500/20 text-emerald-300',
  failed: 'bg-red-500/20 text-red-300',
  cancelled: 'bg-gray-500/20 text-gray-400',
  archived: 'bg-gray-500/10 text-gray-500',
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

const UploadRequestDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = user?.role === 'admin';

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = isAdmin
        ? await UploadRequestService.adminGetDetail(id)
        : await UploadRequestService.getDetail(id, true);
      setRequest(data);
    } catch (err) {
      setError(err.message || 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      const updated = await UploadRequestService.submit(id);
      setRequest(updated);
    } catch (err) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const updated = await UploadRequestService.cancel(id);
      setRequest(updated);
    } catch (err) {
      setError(err.message || 'Failed to cancel request');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert color="failure" className="mb-4 rounded-lg border border-red-800/40">
          {error}
        </Alert>
        <button onClick={() => navigate('/dashboard/upload-requests')} className="text-brand-400 hover:text-brand-300 text-sm" type="button">
          Back to Upload Requests
        </button>
      </div>
    );
  }

  if (!request) {
    return <div className="text-center py-12 text-gray-400">Request not found.</div>;
  }

  const canSubmit = request.status === 'draft' || request.status === 'rejected';
  const canCancel = !['completed', 'archived', 'cancelled'].includes(request.status);

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/dashboard/upload-requests')}
        className="mb-4 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        type="button"
      >
        <ArrowLeft size={16} />
        Back to Upload Requests
      </button>

      <div className="bg-elevated border border-elevated-border rounded-xl p-6 shadow-md">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-600/20">
              <FileUp size={20} className="text-brand-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{request.title}</h1>
              <p className="text-sm text-gray-400">
                Created {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_STYLES[request.status] || STATUS_STYLES.draft}`}>
            {STATUS_LABELS[request.status] || request.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-surface-600 rounded-lg">
          {request.category && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Category</p>
              <p className="text-white text-sm capitalize mt-1">{request.category}</p>
            </div>
          )}
          {isAdmin && request.company_email && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Company</p>
              <p className="text-white text-sm mt-1">{request.company_email}</p>
            </div>
          )}
          {request.submitted_at && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Submitted</p>
              <p className="text-white text-sm mt-1">{new Date(request.submitted_at).toLocaleString()}</p>
            </div>
          )}
          {request.reviewed_at && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Reviewed</p>
              <p className="text-white text-sm mt-1">{new Date(request.reviewed_at).toLocaleString()}</p>
            </div>
          )}
          {request.reviewed_by_name && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Reviewed By</p>
              <p className="text-white text-sm mt-1">{request.reviewed_by_name}</p>
            </div>
          )}
          {request.completed_at && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Completed</p>
              <p className="text-white text-sm mt-1">{new Date(request.completed_at).toLocaleString()}</p>
            </div>
          )}
        </div>

        {request.description && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Description</h3>
            <p className="text-gray-400 text-sm whitespace-pre-wrap">{request.description}</p>
          </div>
        )}

        {request.rejection_reason && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-800/40">
            <h3 className="text-sm font-medium text-red-300 mb-1">Rejection Reason</h3>
            <p className="text-red-200 text-sm">{request.rejection_reason}</p>
            {request.suggestions && (
              <>
                <h4 className="text-sm font-medium text-yellow-300 mt-3 mb-1">Suggestions</h4>
                <p className="text-yellow-200 text-sm">{request.suggestions}</p>
              </>
            )}
          </div>
        )}

        {request.admin_comment && request.status !== 'rejected' && (
          <div className="mb-6 p-4 rounded-lg bg-brand-600/10 border border-brand-600/20">
            <h3 className="text-sm font-medium text-brand-300 mb-1">Admin Comment</h3>
            <p className="text-brand-200 text-sm">{request.admin_comment}</p>
          </div>
        )}

        {request.status_logs && request.status_logs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Clock size={14} />
              Status History
            </h3>
            <div className="space-y-2">
              {request.status_logs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-gray-300">
                      {STATUS_LABELS[log.from_status] || 'None'} → {STATUS_LABELS[log.to_status]}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {log.changed_by ? `by ${log.changed_by}` : 'System'} · {new Date(log.created_at).toLocaleString()}
                    </p>
                    {log.comment && <p className="text-gray-400 text-xs mt-0.5">{log.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-5 border-t border-elevated-border">
          {canSubmit && (
            <button
              onClick={handleSubmit}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50"
              type="button"
            >
              {actionLoading ? <Spinner size="sm" /> : <Send size={16} />}
              Submit for Review
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors disabled:opacity-50"
              type="button"
            >
              <XCircle size={16} />
              Cancel Request
            </button>
          )}
          {request.video_id && (
            <button
              onClick={() => navigate(`/dashboard/detailed-analytics?videoId=${request.video_id}`)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              type="button"
            >
              <CheckCircle size={16} />
              View Analysis
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadRequestDetail;
