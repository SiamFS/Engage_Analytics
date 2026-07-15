import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ArrowLeft, Clock, Eye, Play } from 'lucide-react';
import VideoService from '../../../../utils/VideoService';
import getPlaceholderImage from '../../../../utils/getPlaceholderImage';
import { LoadingState, ErrorState, EmptyState } from '../../../Shared/VideoLoadingStates/VideoLoadingStates';
import { AuthContext } from '../../../../contexts/AuthProvider/AuthProvider';

const UserWatchHistory = () => {
  const [watchHistory, setWatchHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  useEffect(() => {
    if (!user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  const fetchWatchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const historyData = await VideoService.getUserHistory();
      const publicVideos = historyData.filter(video => video.visibility === 'public');
      setWatchHistory(publicVideos);
    } catch (err) {
      console.error('Error fetching watch history:', err);
      setError('Failed to load your watch history. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchWatchHistory();
  }, [fetchWatchHistory]);
  
  const handleBack = () => {
    navigate('/dashboard');
  };
  
  if (loading) {
    return <LoadingState message="Loading your watch history..." />;
  }
  
  if (error) {
    return <ErrorState error={error} onRetry={fetchWatchHistory} />;
  }
  
  if (watchHistory.length === 0) {
    return (
      <EmptyState 
        title="No Watch History" 
        message="You haven't watched any videos yet. Start watching videos to build your history!"
        actionLink="/videos"
        actionText="Browse Videos"
      />
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto px-3 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-600/20">
              <History size={20} className="text-brand-400" />
            </div>
            Your Watch History
          </h1>
          <p className="text-sm text-gray-400 mt-1">{watchHistory.length} {watchHistory.length === 1 ? 'video' : 'videos'}</p>
        </div>
        <button onClick={handleBack} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors self-start" type="button">
          <ArrowLeft size={15} />
          Back
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {watchHistory.map(video => (
          <button 
            key={video.id} 
            className="group bg-elevated hover:bg-surface-600 rounded-xl border border-elevated-border hover:border-white/10 transition-all duration-200 hover:-translate-y-0.5 overflow-hidden w-full text-left shadow-md"
            onClick={() => navigate(`/video/${video.uuid || video.id}`)}
            type="button"
          >
            <div className="relative aspect-video overflow-hidden">
              <img 
                src={video.thumbnail_url || getPlaceholderImage(400, 225, video.title)} 
                alt={video.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-10 h-10 rounded-full bg-brand-600/90 flex items-center justify-center shadow-lg">
                  <Play size={18} className="text-white ml-0.5" />
                </div>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-brand-400 transition-colors">{video.title}</h3>
              <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{video.description || ''}</p>
              <div className="flex items-center text-gray-500 text-[11px] gap-3 pt-0.5">
                <span className="flex items-center gap-1">
                  <Eye size={11} />
                  {video.views || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {VideoService.formatRelativeTime(video.last_watched || video.upload_date)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default UserWatchHistory;
