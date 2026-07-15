import React from 'react';
import PropTypes from 'prop-types';
import { TrendingUp, ThumbsUp, Play, Clock, User } from 'lucide-react';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import getPlaceholderImage from '../../../utils/getPlaceholderImage';

const AdCard = ({ ad, onPlayClick }) => {
  const getThumbnail = () => (ad.imageUrl || ad.thumbnail_url) || null;

  const formatDateString = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      const dateObject = parseISO(dateString);
      if (isValid(dateObject)) return formatDistanceToNow(dateObject, { addSuffix: true });
    } catch {
      console.error("Error parsing date:", dateString);
    }
    return 'Unknown date';
  };

  const createdAt = formatDateString(ad.upload_date);
  const placeholderSrc = getPlaceholderImage(400, 225, ad.title || 'Video');
  const videoUrl = ad.video_url || ad.videoUrl;
  const category = ad.category || '';
  const uploaderName = ad.uploader_name || ad.brand || '';

  return (
    <div className="group card-hover">
      <div className="relative aspect-video overflow-hidden rounded-t-xl">
        <img
          src={getThumbnail() || placeholderSrc}
          alt={ad.title || 'Video thumbnail'}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            if (e.target.src !== placeholderSrc) e.target.src = placeholderSrc;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface/80 via-surface/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {category && (
          <span className="badge-blue absolute top-2 left-2 backdrop-blur-sm">
            {category}
          </span>
        )}

        {onPlayClick && videoUrl && (
          <button
            onClick={(e) => { e.preventDefault(); onPlayClick(ad); }}
            aria-label={`Play ${ad.title}`}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-brand-600/90 hover:bg-brand-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg scale-75 group-hover:scale-100"
            type="button"
          >
            <Play size={22} className="text-white ml-0.5" />
          </button>
        )}
      </div>

      <div className="p-3 space-y-2">
        <h5 className="text-sm font-semibold text-white line-clamp-2 leading-snug" title={ad.title || 'Untitled Video'}>
          {ad.title || 'Untitled Video'}
        </h5>

        {uploaderName && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-surface-600 flex items-center justify-center shrink-0">
              <User size={10} className="text-gray-300" />
            </div>
            <span className="text-xs text-gray-500 truncate">{uploaderName}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Play size={11} className="shrink-0" />
              {ad.views != null ? ad.views.toLocaleString() : '0'}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp size={11} className="shrink-0" />
              {ad.likes != null ? ad.likes.toLocaleString() : '0'}
            </span>
          </div>
          <span className="flex items-center gap-1 truncate">
            <Clock size={11} className="shrink-0" />
            <span className="truncate">{createdAt}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

AdCard.propTypes = {
  ad: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    title: PropTypes.string,
    imageUrl: PropTypes.string,
    thumbnail_url: PropTypes.string,
    videoUrl: PropTypes.string,
    video_url: PropTypes.string,
    views: PropTypes.number,
    likes: PropTypes.number,
    upload_date: PropTypes.string,
    brand: PropTypes.string,
    uploader_name: PropTypes.string,
    category: PropTypes.string,
    featured: PropTypes.bool,
    popular: PropTypes.bool,
    description: PropTypes.string
  }).isRequired,
  onPlayClick: PropTypes.func
};

export default AdCard;
