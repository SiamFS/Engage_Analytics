import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { Play, X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import VideoPlayer from '../VideoPlayer/VideoPlayer';
import getPlaceholderImage from '../../../utils/getPlaceholderImage';

const HeroBillboard = ({ videos }) => {
  const [showVideo, setShowVideo] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const navigate = useNavigate();

  if (!videos || !videos.length) return null;

  const currentVideo = videos[currentIndex];

  useEffect(() => {
    let timer;
    if (autoplay && videos.length > 1) {
      timer = setInterval(() => setCurrentIndex((prev) => (prev + 1) % videos.length), 5000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [autoplay, videos.length]);

  useEffect(() => { if (showVideo) setAutoplay(false); }, [showVideo]);

  const getThumbnailUrl = () => currentVideo.thumbnail_url || getPlaceholderImage(1200, 600, currentVideo.title || 'Featured Video');

  const handlePlayClick = () => {
    if (currentVideo.video_url) setShowVideo(true);
    else navigate(`/video/${currentVideo.uuid || currentVideo.id}`);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
    setAutoplay(false);
    setTimeout(() => setAutoplay(true), 10000);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
    setAutoplay(false);
    setTimeout(() => setAutoplay(true), 10000);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setAutoplay(false);
    setTimeout(() => setAutoplay(true), 10000);
  };

  return (
    <div className="relative overflow-hidden mb-10 rounded-2xl">
      <div className="relative aspect-[16/9] md:aspect-[21/9] lg:aspect-[3/1]">
        <img
          src={getThumbnailUrl()}
          alt={currentVideo.title}
          className="w-full h-full object-cover transition-opacity duration-500"
          onError={(e) => { e.target.onerror = null; e.target.src = getPlaceholderImage(1200, 600, currentVideo.title || 'Featured Video'); }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-surface/80 via-surface/30 to-surface/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
      </div>

      <div className="absolute bottom-0 left-0 p-6 sm:p-10 md:p-12 w-full md:w-3/4 z-10">
        <div className="mb-2 flex items-center gap-2">
          <span className="badge-blue backdrop-blur-sm uppercase tracking-wider">
            {currentVideo.category || 'Featured'}
          </span>
          {currentVideo.views > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-300">
              <Eye size={12} />
              {currentVideo.views.toLocaleString()} views
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 text-white drop-shadow-lg">
          {currentVideo.title}
        </h1>

        <p className="text-sm sm:text-base md:text-lg mb-4 text-gray-200 line-clamp-2 max-w-2xl drop-shadow hidden sm:block">
          {currentVideo.description || 'No description available for this video.'}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handlePlayClick}
            className="btn-primary btn-lg rounded-xl"
            type="button"
          >
            <Play size={18} />
            {currentVideo.video_url ? 'Watch Now' : 'Go to Video'}
          </button>

          <Link to={`/video/${currentVideo.uuid || currentVideo.id}`}>
            <button
              className="btn-secondary btn-lg rounded-xl"
              type="button"
            >
              View Details
            </button>
          </Link>
        </div>
      </div>

      {videos.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute top-1/2 left-4 -translate-y-1/2 bg-black/40 hover:bg-brand-600/80 backdrop-blur-sm text-white p-2.5 rounded-full transition-all duration-200 z-20 shadow-lg hover:scale-105"
            aria-label="Previous video"
            type="button"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToNext}
            className="absolute top-1/2 right-4 -translate-y-1/2 bg-black/40 hover:bg-brand-600/80 backdrop-blur-sm text-white p-2.5 rounded-full transition-all duration-200 z-20 shadow-lg hover:scale-105"
            aria-label="Next video"
            type="button"
          >
            <ChevronRight size={20} />
          </button>
          <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
            {videos.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-full ${
                  currentIndex === index
                    ? 'w-6 h-2 bg-brand-500 shadow-sm shadow-brand-500/50'
                    : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${index + 1}`}
                type="button"
              />
            ))}
          </div>
        </>
      )}

      {showVideo && currentVideo.video_url && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl">
            <button
              onClick={() => setShowVideo(false)}
              className="absolute -top-12 right-0 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full p-2 transition-all duration-200"
              aria-label="Close video"
              type="button"
            >
              <X size={20} />
            </button>
            <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10">
              <VideoPlayer
                videoUrl={currentVideo.video_url}
                thumbnailUrl={getThumbnailUrl()}
                title={currentVideo.title}
                autoPlay={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

HeroBillboard.propTypes = {
  videos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      thumbnail_url: PropTypes.string,
      video_url: PropTypes.string,
      category: PropTypes.string,
      views: PropTypes.number,
      likes: PropTypes.number,
    })
  ).isRequired
};

export default HeroBillboard;
