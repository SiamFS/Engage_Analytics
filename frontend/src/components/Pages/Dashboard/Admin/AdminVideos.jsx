import React, { useState, useEffect, useRef } from 'react';
import { Spinner, Alert, Modal } from 'flowbite-react';
import { Trash, Edit, Eye, Film } from 'lucide-react';
import VideoService from '../../../../utils/VideoService';
import { useNavigate } from 'react-router-dom';
import getPlaceholderImage from '../../../../utils/getPlaceholderImage';

const AdminVideos = () => {
  const [allVideos, setAllVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteVideoId, setDeleteVideoId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  
  const navigate = useNavigate();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (fetchAttempted) return;
    
    const fetchAllVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        setFetchAttempted(true);
        
        const response = await Promise.resolve(VideoService.adminGetAllVideos());
        
        if (isMounted.current) {
          const sortedVideos = response ? 
            [...response].sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date)) : 
            [];
          setAllVideos(sortedVideos);
        }
      } catch (err) {
        console.error('Error fetching videos:', err);
        if (isMounted.current) {
          setError('Failed to load videos. Please try again.');
        }
      } finally {
        if (isMounted.current) { setLoading(false); }
      }
    };

    fetchAllVideos();
  }, [fetchAttempted]);

  const openDeleteModal = (videoId) => {
    setDeleteVideoId(videoId);
    setDeleteModalOpen(true);
  };

  const handleDeleteVideo = async () => {
    try {
      setLoading(true);
      setError(null);
      await VideoService.adminDeleteVideo(deleteVideoId);
      
      if (isMounted.current) {
        setSuccess('Video successfully deleted');
        setAllVideos(allVideos.filter(video => video.id !== deleteVideoId));
        setDeleteModalOpen(false);
      }
    } catch (err) {
      console.error('Delete video error:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to delete video');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setDeleteVideoId(null);
      }
    }
  };

  const handleViewVideo = (videoId) => {
    navigate(`/video/${videoId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-brand-600/20">
          <Film size={20} className="text-brand-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Video Management</h1>
      </div>
      
      <div className="card-base bg-elevated border-elevated-border p-5">
        <h2 className="text-lg font-semibold text-white mb-5">All Videos</h2>
        
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
                  <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Thumbnail</th>
                  <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Title</th>
                  <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Uploader</th>
                  <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Visibility</th>
                  <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
                  <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Views</th>
                  <th className="px-5 py-3 text-gray-400 font-medium text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-elevated-border">
                {allVideos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                      <Film size={32} className="mx-auto mb-2 text-gray-600" />
                      No videos found
                    </td>
                  </tr>
                ) : (
                  allVideos.map(video => (
                    <tr key={video.id} className="hover:bg-surface-600 transition-colors">
                      <td className="px-5 py-3">
                        <img 
                          src={video.thumbnail_url || getPlaceholderImage(80, 45, video.title)} 
                          alt={video.title}
                          loading="lazy"
                          className="w-16 h-10 object-cover rounded-lg border border-elevated-border"
                        />
                      </td>
                      <td className="px-5 py-3 text-white font-medium truncate max-w-[200px]">
                        {video.title}
                      </td>
                      <td className="px-5 py-3 text-gray-400 hidden md:table-cell">
                        {video.uploader?.email || 'Unknown'}
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          video.visibility === 'public' 
                            ? 'bg-green-600/20 text-green-300' 
                            : 'bg-surface-600 text-gray-400'
                        }`}>
                          {video.visibility}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 hidden lg:table-cell">
                        {new Date(video.upload_date).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">
                        {video.views || 0}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => handleViewVideo(video.id)} className="p-1.5 rounded-lg bg-brand-600/20 text-brand-300 hover:bg-brand-600/30 transition-colors" title="View" type="button">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => navigate(`/dashboard/edit-video/${video.id}`)} className="p-1.5 rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500 transition-colors" title="Edit" type="button">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => openDeleteModal(video.id)} className="p-1.5 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 transition-colors" title="Delete" type="button">
                            <Trash size={14} />
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
      
      <Modal show={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} theme={{ content: { inner: 'relative flex max-h-[90dvh] flex-col rounded-lg bg-elevated shadow' } }}>
        <Modal.Header className="bg-elevated text-white border-b border-elevated-border rounded-t-xl">
          <span className="text-white">Delete Video</span>
        </Modal.Header>
        <Modal.Body className="bg-elevated text-white">
          <p className="mb-2">Are you sure you want to delete this video?</p>
          <p className="text-red-400 text-sm">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer className="bg-elevated border-t border-elevated-border">
          <button
            onClick={handleDeleteVideo}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            type="button"
          >
            {loading && <Spinner size="sm" className="mr-2 inline" />}
            Delete Video
          </button>
          <button
            onClick={() => setDeleteModalOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors"
            type="button"
          >
            Cancel
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminVideos;
