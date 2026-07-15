import React, { useState, useEffect, useRef } from 'react';
import { Spinner, Alert, Modal } from 'flowbite-react';
import { Trash2, Download, Eye, Camera, RefreshCw } from 'lucide-react';
import VideoService from '../../../../utils/VideoService';
import getPlaceholderImage from '../../../../utils/getPlaceholderImage';

const RecordedVideos = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await VideoService.adminGetWebcamRecordings();
      if (isMounted.current) {
        setRecordings(data || []);
      }
    } catch (err) {
      console.error('Error fetching recordings:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to load recordings');
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const openDeleteModal = (recording) => {
    setDeleteTarget(recording);
    setDeleteModalOpen(true);
  };

  const handleDeleteRecording = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await VideoService.adminDeleteWebcamRecording(deleteTarget.id);
      if (isMounted.current) {
        setSuccess('Recording deleted successfully');
        setRecordings(prev => prev.filter(r => r.id !== deleteTarget.id));
        setDeleteModalOpen(false);
        setDeleteTarget(null);
      }
    } catch (err) {
      console.error('Error deleting recording:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to delete recording');
      }
    } finally {
      if (isMounted.current) setDeleting(false);
    }
  };

  const handleViewRecording = (url) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadRecording = async (recording) => {
    if (!recording.recording_url || downloadingId) return;
    setDownloadingId(recording.id);
    try {
      const response = await fetch(recording.recording_url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = recording.filename || `recording-${recording.id}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download recording. The URL may have expired.');
    } finally {
      if (isMounted.current) setDownloadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      'completed': 'bg-green-600/20 text-green-300',
      'processing': 'bg-yellow-600/20 text-yellow-300',
      'failed': 'bg-red-600/20 text-red-300',
    };
    return `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-surface-600 text-gray-400'}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch { return 'N/A'; }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-600/20">
            <Camera size={20} className="text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Webcam Recordings</h1>
        </div>
        <button onClick={fetchRecordings} disabled={loading} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors disabled:opacity-50" type="button">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="card-base bg-elevated border-elevated-border p-5">
        {error && (
          <Alert color="failure" onDismiss={() => setError(null)} className="mb-4 rounded-lg border border-red-800/40">
            {error}
          </Alert>
        )}
        {success && (
          <Alert color="success" onDismiss={() => setSuccess(null)} className="mb-4 rounded-lg border border-green-800/40">
            {success}
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="xl" className="fill-brand-500" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-elevated-border">
                  <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Preview</th>
                  <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Filename</th>
                  <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Video</th>
                  <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Recorder</th>
                  <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-elevated-border">
                {recordings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                      <Camera size={32} className="mx-auto mb-2 text-gray-600" />
                      No recordings found
                    </td>
                  </tr>
                ) : (
                  recordings.map(recording => (
                    <tr key={recording.id} className="hover:bg-surface-600 transition-colors">
                      <td className="px-5 py-3">
                        {recording.thumbnail_url ? (
                          <img src={recording.thumbnail_url} alt={recording.filename} loading="lazy" className="w-16 h-10 object-cover rounded-lg border border-elevated-border" />
                        ) : (
                          <div className="w-16 h-10 bg-surface-600 rounded-lg flex items-center justify-center border border-elevated-border">
                            <Camera size={16} className="text-gray-500" />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-white font-medium truncate max-w-[160px]">
                        {recording.filename || `Recording #${recording.id}`}
                      </td>
                      <td className="px-5 py-3 text-gray-400 hidden md:table-cell truncate max-w-[150px]">
                        {recording.video?.title || 'Unknown'}
                      </td>
                      <td className="px-5 py-3 text-gray-400 hidden lg:table-cell truncate max-w-[150px]">
                        {recording.recorder?.email || 'Unknown'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={getStatusBadge(recording.upload_status)}>Upload: {recording.upload_status}</span>
                          <span className={getStatusBadge(recording.analysis_status)}>Analysis: {recording.analysis_status}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">
                        {formatDate(recording.recording_date)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => handleViewRecording(recording.recording_url)} disabled={!recording.recording_url} className="p-1.5 rounded-lg bg-brand-600/20 text-brand-300 hover:bg-brand-600/30 transition-colors disabled:opacity-30" title="View" type="button">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => handleDownloadRecording(recording)} disabled={!recording.recording_url || downloadingId === recording.id} className="p-1.5 rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500 transition-colors disabled:opacity-30" title="Download" type="button">
                            {downloadingId === recording.id ? <Spinner size="sm" /> : <Download size={14} />}
                          </button>
                          <button onClick={() => openDeleteModal(recording)} className="p-1.5 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 transition-colors" title="Delete" type="button">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal show={deleteModalOpen} onClose={() => !deleting && setDeleteModalOpen(false)} theme={{ content: { inner: 'relative flex max-h-[90dvh] flex-col rounded-lg bg-elevated shadow' } }}>
        <Modal.Header className="bg-elevated text-white border-b border-elevated-border rounded-t-xl">
          <span className="text-white">Delete Recording</span>
        </Modal.Header>
        <Modal.Body className="bg-elevated text-white">
          <p className="mb-2">Are you sure you want to delete this recording?</p>
          {deleteTarget && (
            <p className="text-gray-400 text-sm mb-4">
              &quot;{deleteTarget.filename || `Recording #${deleteTarget.id}`}&quot;
            </p>
          )}
          <p className="text-red-400 text-sm">This action cannot be undone. All emotion analysis data for this recording will also be removed.</p>
        </Modal.Body>
        <Modal.Footer className="bg-elevated border-t border-elevated-border">
          <button onClick={handleDeleteRecording} disabled={deleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50" type="button">
            {deleting && <Spinner size="sm" className="mr-2 inline" />}
            Delete Permanently
          </button>
          <button onClick={() => setDeleteModalOpen(false)} disabled={deleting} className="px-4 py-2 text-sm font-medium text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors" type="button">
            Cancel
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default RecordedVideos;
