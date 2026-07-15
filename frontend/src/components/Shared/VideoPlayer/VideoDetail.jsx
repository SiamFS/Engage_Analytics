import React, { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import {  
  Modal,
  TextInput,
  Alert,
  Button as FlowbiteButton,
  Badge
} from 'flowbite-react';
import { 
  ThumbsUp, 
  ThumbsDown,
  Share2, 
  ArrowLeft,
  Calendar,
  Tag,
  Copy, 
  Link as LinkIcon,
  Edit,
  Trash,
  Eye,
  EyeOff,
  BarChart2 as ChartBar,
  User,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
} from 'recharts';
import VideoService from '../../../utils/VideoService';
import VideoPlayer from '../../Shared/VideoPlayer/VideoPlayer';
import { LoadingState, ErrorState } from '../../Shared/VideoLoadingStates/VideoLoadingStates';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import getPlaceholderImage from '../../../utils/getPlaceholderImage';
import FeedbackPopup from '../../Shared/FeedbackPopup/FeedbackPopup';

const MODAL_THEME = { content: { inner: 'relative flex max-h-[90dvh] flex-col rounded-lg bg-elevated shadow' } };
const PRIMARY_BUTTON_CLASS = "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0";
const ACTION_BUTTON_CLASS = "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200";

const ShareModal = ({ isOpen, onClose, videoId, videoTitle }) => {
  const [shareUrl, setShareUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && videoId) {
      setIsLoading(true);
      setError('');
      setIsCopied(false);
      
      const generateShareLink = async () => {
        try {
          const shareResult = VideoService.createVideoShare(videoId);
          const response = await (shareResult instanceof Promise ? shareResult : Promise.resolve(shareResult));
          if (response?.share_url) {
            setShareUrl(response.share_url);
          } else {
            setError('Could not generate share link.');
          }
        } catch (err) {
          const message = err?.response?.data?.error || err?.message || 'Failed to create share link. Please try again.';
          setError(message);
          console.error('Share link creation failed:', err);
        } finally {
          setIsLoading(false);
        }
      };
      
      generateShareLink();
    }
  }, [isOpen, videoId]);

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 3000);
        })
        .catch(err => {
          console.error('Failed to copy:', err);
          setError('Failed to copy to clipboard. Please try manually selecting the link.');
        });
    }
  };

  return (
    <Modal show={isOpen} onClose={onClose} size="md" theme={MODAL_THEME}>
      <Modal.Header className="bg-elevated text-white border-b border-elevated-border rounded-t-xl">
        <p className="text-white text-lg font-semibold">Share &quot;{videoTitle}&quot;</p>
      </Modal.Header>
      <Modal.Body className="bg-elevated text-gray-300">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert color="failure" className="mb-4 rounded-lg border border-red-800/40">
                {error}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
            <span className="ml-3 text-gray-400 text-sm">Generating share link...</span>
          </div>
        ) : (
          <>
            {!error && shareUrl && (
              <>
                <p className="mb-4 text-sm text-gray-400">Share this video with others using this unique link:</p>
                <div className="flex items-center gap-2">
                  <TextInput
                    icon={LinkIcon}
                    value={shareUrl}
                    readOnly
                    className="flex-1"
                    onChange={() => {}}
                  />
                  <button
                    onClick={copyToClipboard}
                    className={`${PRIMARY_BUTTON_CLASS} shrink-0 ${isCopied ? 'bg-green-600 text-white' : 'bg-brand-600 hover:bg-brand-500 text-white'}`}
                    type="button"
                  >
                    {isCopied ? (
                      <><Copy size={16} /><span>Copied!</span></>
                    ) : (
                      <><Copy size={16} /><span>Copy</span></>
                    )}
                  </button>
                </div>
                
                <AnimatePresence>
                  {isCopied && (
                    <motion.p 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-2 text-sm text-green-400"
                    >
                      Link copied to clipboard!
                    </motion.p>
                  )}
                </AnimatePresence>
                
                <div className="mt-6 p-3 rounded-lg bg-surface-600/40 border border-elevated-border/30">
                  <p className="text-xs text-gray-500">
                    Anyone with this link can view this video.
                  </p>
                </div>
              </>
            )}
            {error && !shareUrl && <div className="h-4" />}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

ShareModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  videoId: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  videoTitle: PropTypes.string
};

const RelatedVideoCard = ({ video, onClick }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-surface-600/60 backdrop-blur-sm border border-elevated-border/50 hover:bg-surface-500/60 hover:border-elevated-border transition-all duration-200 cursor-pointer rounded-xl overflow-hidden group"
    onClick={onClick}
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex gap-3 p-3">
      <div className="w-24 h-16 shrink-0 rounded-lg overflow-hidden">
        <img 
          src={video.thumbnail_url || getPlaceholderImage(400, 225, video.title)} 
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="min-w-0 flex-1">
        <h5 className="text-sm font-medium text-white line-clamp-2 leading-snug group-hover:text-brand-400 transition-colors">
          {video.title}
        </h5>
        <p className="text-xs text-gray-500 mt-1">
          {video.uploader_name || 'Creator'} &middot; {video.views || 0} views
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          {VideoService.formatRelativeTime(video.upload_date)}
        </p>
      </div>
    </div>
  </motion.div>
);

RelatedVideoCard.propTypes = {
  video: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string,
    thumbnail_url: PropTypes.string,
    uploader_name: PropTypes.string,
    uploader: PropTypes.shape({
      email: PropTypes.string
    }),
    views: PropTypes.number,
    upload_date: PropTypes.string
  }).isRequired,
  onClick: PropTypes.func.isRequired
};

const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [viewRecorded, setViewRecorded] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [visibilityModalOpen, setVisibilityModalOpen] = useState(false);
  const [myEmotion, setMyEmotion] = useState(null);
  const [myEmotionLoading, setMyEmotionLoading] = useState(false);
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const feedbackTimerRef = useRef(null);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        setViewRecorded(false);
        
        const videoDataResult = VideoService.getVideoDetails(id);
        const videoData = await (videoDataResult instanceof Promise ? videoDataResult : Promise.resolve(videoDataResult));
        setVideo(videoData);
        setLiked(!!videoData.is_liked);
        
        fetchRelatedVideos(videoData);
        fetchMyEmotion(videoData?.id);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching video details:', error);
        const errorResponse = error.response || {};
        const errorStatus = errorResponse.status;
        let errorMessage = 'Failed to load video. Please try again later.';
        
        if (errorStatus === 404) {
          errorMessage = 'Video not found or link has expired.';
        } else if (errorStatus === 403) {
          errorMessage = 'This video is private or no longer available.';
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    };

    const fetchRelatedVideos = async (currentVideo) => {
      if (!currentVideo) return;

      const currentId = currentVideo.id;
      const currentCategory = currentVideo.category;
      const currentUploaderEmail = currentVideo.uploader?.email;

      try {
        const videoFeedResult = VideoService.getVideoFeed();
        const videoFeed = await (videoFeedResult instanceof Promise ? videoFeedResult : Promise.resolve(videoFeedResult));

        if (!Array.isArray(videoFeed)) {
          setRelatedVideos([]);
          return;
        }

        const others = videoFeed.filter(v => v && v.id !== currentId);

        const sameCategory = others.filter(v =>
          currentCategory && v.category && v.category === currentCategory
        );

        const sameUploader = others.filter(v =>
          currentUploaderEmail && v.uploader?.email === currentUploaderEmail && !sameCategory.some(sc => sc.id === v.id)
        );

        const scored = sameCategory.concat(sameUploader).map(v => ({
          ...v,
          _score: sameCategory.some(sc => sc.id === v.id) ? 1 : 0.5,
        }));

        scored.sort((a, b) => {
          if (b._score !== a._score) return b._score - a._score;
          return (b.views || 0) - (a.views || 0);
        });

        setRelatedVideos(scored.slice(0, 4));
      } catch (relatedError) {
        console.error('Error fetching related videos:', relatedError);
        setRelatedVideos([]);
      }
    };

    const fetchMyEmotion = async (videoId) => {
      if (!videoId) return;
      setMyEmotionLoading(true);
      try {
        const data = await VideoService.getMyEmotion(videoId);
        setMyEmotion(data && (data.timeline?.length || data.distribution) ? data : null);
      } catch (err) {
        console.error('Error fetching my emotion data:', err);
      } finally {
        setMyEmotionLoading(false);
      }
    };

    if (id) {
      fetchVideoDetails();
    } else {
      setError('Invalid video ID');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
    };
  }, []);

  const handleBack = () => {
    navigate(-1); 
  };

  const recordView = useCallback(async () => {
    const pk = video?.id;
    if (!pk || viewRecorded) return;
    
    try {
      const recordResult = VideoService.recordVideoView(pk);
      await (recordResult instanceof Promise ? recordResult : Promise.resolve(recordResult));
      setViewRecorded(true);
      
      setVideo(prev => ({
        ...prev,
        views: (prev.views || 0) + 1
      }));
    } catch (error) {
      console.error('Error recording view:', error);
    }
  }, [video?.id, viewRecorded]);

  const handleLike = async () => {
    const pk = video?.id;
    if (!pk) return;
    if (!user) {
      navigate('/login');
      return;
    }

    const prevLiked = liked;
    const prevLikes = video.likes || 0;
    setLiked(!prevLiked);
    setVideo(prev => ({
      ...prev,
      likes: prevLiked ? Math.max(0, prevLikes - 1) : prevLikes + 1,
    }));

    try {
      const likeResult = VideoService.toggleVideoLike(pk);
      const response = await (likeResult instanceof Promise ? likeResult : Promise.resolve(likeResult));

      if (response) {
        setLiked(response.liked);
        setVideo(prev => ({
          ...prev,
          likes: response.likes,
        }));
      }
    } catch (error) {
      console.error('Error liking video:', error);
      setLiked(prevLiked);
      setVideo(prev => ({
        ...prev,
        likes: prevLikes,
      }));
    }
  };

  const handleShare = () => {
    setShareModalOpen(true);
  };

  const handleVideoEnded = () => {
    feedbackTimerRef.current = setTimeout(() => {
      setShowFeedbackPopup(true);
    }, 2000);
  };

  const handleUploadFlowDone = () => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    setShowFeedbackPopup(true);
  };

  const handleToggleVisibility = async () => {
    const pk = video?.id;
    if (!pk) return;
    try {
      const newVisibility = video.visibility === 'private' ? 'public' : 'private';
      const visibilityResult = VideoService.adminUpdateVideoVisibility(pk, newVisibility);
      await (visibilityResult instanceof Promise ? visibilityResult : Promise.resolve(visibilityResult));
      setVideo({
        ...video,
        visibility: newVisibility
      });
      setError(null);
    } catch (error) {
      console.error('Error updating video visibility:', error);
      setError('Failed to update video visibility. Please try again.');
    }
  };

  const handleDeleteVideo = async () => {
    const pk = video?.id;
    if (!pk) return;
    try {
      const deleteResult = VideoService.adminDeleteVideo(pk);
      await (deleteResult instanceof Promise ? deleteResult : Promise.resolve(deleteResult));
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Error deleting video:', error);
      setError('Failed to delete video. Please try again.');
      setDeleteModalOpen(false);
    }
  };

  const renderMyEmotion = () => {
    if (myEmotionLoading) return null;
    if (!myEmotion || !myEmotion.timeline || myEmotion.timeline.length === 0) return null;

    const emotionKeys = [
      { key: 'happy', label: 'Happy', color: '#22c55e' },
      { key: 'neutral', label: 'Neutral', color: '#64748b' },
      { key: 'sad', label: 'Sad', color: '#3b82f6' },
      { key: 'angry', label: 'Angry', color: '#ef4444' },
      { key: 'surprise', label: 'Surprise', color: '#f59e0b' },
      { key: 'fear', label: 'Fear', color: '#a855f7' },
      { key: 'disgust', label: 'Disgust', color: '#8b5cf6' },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-600/60 backdrop-blur-sm rounded-xl border border-elevated-border/50 p-5 mt-6"
      >
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <ChartBar size={16} className="text-brand-400" />
          Your Reaction
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={myEmotion.timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(59,68,87)" strokeOpacity={0.5} />
            <XAxis dataKey="t" stroke="#767d95" tickFormatter={(t) => `${t}s`} tick={{ fontSize: 11 }} />
            <YAxis stroke="#767d95" domain={[0, 1]} tick={{ fontSize: 11 }} />
            <RTooltip 
              formatter={(v) => `${(v * 100).toFixed(0)}%`} 
              labelFormatter={(t) => `${t}s`}
              contentStyle={{ backgroundColor: '#1a1d29', border: '1px solid rgb(59,68,87)', borderRadius: '8px' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            {emotionKeys.map((e) => (
              <Line
                key={e.key}
                type="monotone"
                dataKey={e.key}
                name={e.label}
                stroke={e.color}
                dot={false}
                isAnimationActive={false}
                strokeWidth={1.5}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    );
  };

  const formattedDate = video?.upload_date 
    ? new Date(video.upload_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '';

  const isAdmin = user?.role === 'admin';

  if (loading) {
    return <LoadingState message="Loading video..." />;
  }

  if (error) {
    return (
      <ErrorState 
        error={error} 
        onBack={handleBack}
      />
    );
  }

  if (!video) {
    return (
      <ErrorState 
        error="Video not found" 
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden shadow-2xl relative"
          >
            <button
              onClick={() => window.history.length > 1 ? window.history.back() : navigate('/videos')}
              className="absolute top-4 left-4 z-40 flex items-center gap-1.5 bg-surface/70 backdrop-blur-sm hover:bg-surface-600 text-white px-3 py-1.5 rounded-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              type="button"
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
              <span className="text-xs font-medium hidden sm:inline">Back</span>
            </button>
            <VideoPlayer 
              videoUrl={video.video_url}
              thumbnailUrl={video.thumbnail_url}
              title={video.title}
              videoId={video?.id}
              onPlay={recordView}
              onEnded={handleVideoEnded}
              onUploadFlowDone={handleUploadFlowDone}
            />
          </motion.div>

          {isAdmin && (
            <div className="bg-surface-600/60 backdrop-blur-sm rounded-xl border border-elevated-border/50 p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                Admin Controls
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigate(`/dashboard/edit-video/${id}`)}
                  className={`${ACTION_BUTTON_CLASS} bg-brand-600/20 text-brand-300 hover:bg-brand-600/30 border border-brand-600/30`}
                  type="button"
                >
                  <Edit size={14} /> Edit
                </button>
                <button
                  onClick={() => setDeleteModalOpen(true)}
                  className={`${ACTION_BUTTON_CLASS} bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-600/30`}
                  type="button"
                >
                  <Trash size={14} /> Delete
                </button>
                <button
                  onClick={() => setVisibilityModalOpen(true)}
                  className={`${ACTION_BUTTON_CLASS} bg-surface-600 text-gray-300 hover:bg-surface-500 border border-elevated-border/50`}
                  type="button"
                >
                  {video?.visibility === 'private' ? <Eye size={14} /> : <EyeOff size={14} />}
                  {video?.visibility === 'private' ? 'Make Public' : 'Make Private'}
                </button>
              </div>
            </div>
          )}

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-600/60 backdrop-blur-sm rounded-xl border border-elevated-border/50 p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-white mb-2">{video.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Eye size={13} /> {video.views || 0} views</span>
                  <span className="flex items-center gap-1"><Calendar size={13} /> {formattedDate}</span>
                  {video.category && (
                    <span className="flex items-center gap-1"><Tag size={13} /> {video.category}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleLike}
                  className={`${ACTION_BUTTON_CLASS} ${
                    liked
                    ? 'bg-brand-600/20 text-brand-300 border border-brand-600/30'
                    : 'bg-surface-600 text-gray-300 border border-elevated-border/50 hover:bg-surface-500'
                  }`}
                  type="button"
                >
                  <ThumbsUp size={15} fill={liked ? 'currentColor' : 'none'} className={liked ? 'text-brand-400' : ''} />
                  {video.likes || 0}
                </button>
                <button
                  onClick={handleShare}
                  className={`${ACTION_BUTTON_CLASS} bg-surface-600 text-gray-300 border border-elevated-border/50 hover:bg-surface-500`}
                  type="button"
                >
                  <Share2 size={15} /> Share
                </button>
              </div>
            </div>

            <hr className="border-elevated-border/50 my-4" />

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-surface-500 overflow-hidden shrink-0 flex items-center justify-center">
                {video.uploader?.avatar_url ? (
                  <img src={video.uploader.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={18} className="text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {video.uploader_name || video.uploader?.email || 'Video Creator'}
                </p>
                <p className="text-xs text-brand-400 flex items-center gap-1">
                  <ChartBar size={12} />
                  Engage Analytics
                </p>
              </div>
            </div>

            <div className="bg-surface-500/30 rounded-xl p-4 border border-elevated-border/20">
              <h2 className="text-sm font-semibold text-white mb-2">Description</h2>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                {video.description || 'No description provided.'}
              </p>
            </div>

            {renderMyEmotion()}
          </motion.div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Related Videos
            </h3>
            
            <div className="space-y-3">
              {relatedVideos.length > 0 ? (
                relatedVideos.map(relatedVideo => (
                  <RelatedVideoCard 
                    key={relatedVideo.id}
                    video={relatedVideo}
                    onClick={() => navigate(`/video/${relatedVideo.uuid || relatedVideo.id}`)} 
                  />
                ))
              ) : (
                <div className="text-center text-gray-500 text-sm p-6 bg-surface-600/40 rounded-xl border border-elevated-border/30">
                  No related videos found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ShareModal 
        isOpen={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
        videoId={video?.id}
        videoTitle={video.title} 
      />
      
      <Modal show={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} theme={MODAL_THEME}>
        <Modal.Header className="bg-elevated text-white border-b border-elevated-border rounded-t-xl">
          <span className="text-white">Delete Video</span>
        </Modal.Header>
        <Modal.Body className="bg-elevated text-white">
          <p className="mb-2">Are you sure you want to delete &quot;{video?.title}&quot;?</p>
          <p className="text-red-400 text-sm">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer className="bg-elevated border-t border-elevated-border">
          <FlowbiteButton color="failure" onClick={handleDeleteVideo} className="!bg-red-600 hover:!bg-red-700">
            Delete Permanently
          </FlowbiteButton>
          <FlowbiteButton color="gray" onClick={() => setDeleteModalOpen(false)} className="!bg-surface-600 hover:!bg-surface-500 !text-white">
            Cancel
          </FlowbiteButton>
        </Modal.Footer>
      </Modal>
      
      <Modal show={visibilityModalOpen} onClose={() => setVisibilityModalOpen(false)} theme={MODAL_THEME}>
        <Modal.Header className="bg-elevated text-white border-b border-elevated-border rounded-t-xl">
          <span className="text-white">Change Visibility</span>
        </Modal.Header>
        <Modal.Body className="bg-elevated text-white">
          <p className="mb-2">
            Are you sure you want to make this video <strong>{video?.visibility === 'private' ? 'public' : 'private'}</strong>?
          </p>
          <p className="text-gray-400 text-sm">
            {video?.visibility === 'private'
              ? 'Anyone with the link will be able to view this video.'
              : 'Only you and admins will be able to view this video.'}
          </p>
        </Modal.Body>
        <Modal.Footer className="bg-elevated border-t border-elevated-border">
          <FlowbiteButton color="blue" onClick={() => { setVisibilityModalOpen(false); handleToggleVisibility(); }} className="!bg-brand-600 hover:!bg-brand-700">
            Confirm
          </FlowbiteButton>
          <FlowbiteButton color="gray" onClick={() => setVisibilityModalOpen(false)} className="!bg-surface-600 hover:!bg-surface-500 !text-white">
            Cancel
          </FlowbiteButton>
        </Modal.Footer>
      </Modal>

      {showFeedbackPopup && (
        <FeedbackPopup
          videoId={video?.id}
          onClose={() => setShowFeedbackPopup(false)}
          onComplete={() => setShowFeedbackPopup(false)}
        />
      )}
    </div>
  );
};

export default VideoDetail;
