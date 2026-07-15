import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Button } from 'flowbite-react';
import {
  Play,
  ThumbsUp,
  BarChart2,
  Activity as ViewsIcon,
  Clock
} from 'lucide-react';

export const StatsCard = ({ title, value, icon: Icon, color }) => (
  <div className="card-base bg-elevated border-elevated-border hover:border-white/20 p-5 hover:-translate-y-0.5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <h5 className="text-2xl font-bold tracking-tight text-white mt-1.5">
          {(typeof value === 'number' ? value.toLocaleString() : value) || '0'}
        </h5>
      </div>
      <div className={`p-3.5 rounded-xl`} style={{backgroundColor: `color-mix(in srgb, var(--color-${color}-500) 10%, transparent)`}}>
        {Icon && <Icon size={22} style={{color: `var(--color-${color}-400)`}} />}
      </div>
    </div>
  </div>
);

StatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  icon: PropTypes.elementType,
  color: PropTypes.string.isRequired,
};

export const StorageCard = ({ storageUsed }) => {
  const getStorageColor = (percentage) => {
    if (percentage >= 90) return 'red';
    if (percentage >= 75) return 'yellow';
    return 'blue';
  };

  const storageColor = getStorageColor(storageUsed);

  return (
    <div className="card-base bg-elevated border-elevated-border hover:border-white/20 p-5 hover:-translate-y-0.5 group">
      <div>
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-medium text-gray-400">Storage Used</p>
          <span className="text-sm font-semibold text-white">{storageUsed}%</span>
        </div>
        <div className="h-2.5 bg-surface-600 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              storageColor === 'red' ? 'bg-red-500' :
              storageColor === 'yellow' ? 'bg-yellow-500' :
              'bg-brand-500'
            }`}
            style={{ width: `${Math.min(storageUsed, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

StorageCard.propTypes = {
  storageUsed: PropTypes.number.isRequired,
};

export const EmptyAdRow = ({ title, icon, linkPath, linkText }) => (
  <div className="card-base bg-elevated border-elevated-border p-6">
    <h2 className="text-xl font-bold text-white mb-4 flex items-center">
      {icon && <span className="mr-2">{icon}</span>}
      {title}
    </h2>
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-full bg-surface-600 flex items-center justify-center mx-auto mb-4">
        <Play size={28} className="text-gray-500" />
      </div>
      <p className="text-gray-400 mb-5">You haven&apos;t uploaded any videos yet.</p>
      <Button color="blue" size="sm" className="bg-brand-600 hover:bg-brand-700 focus:ring-0" as={Link} to={linkPath}>
        {linkText}
      </Button>
    </div>
  </div>
);

EmptyAdRow.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.node,
  linkPath: PropTypes.string.isRequired,
  linkText: PropTypes.string.isRequired,
};

export const AnalyticsPreview = ({ hasVideos }) => (
  hasVideos && (
    <div className="card-base bg-elevated border-elevated-border p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-bold text-white flex items-center">
          <BarChart2 size={20} className="mr-2 text-brand-400"/> Quick Analytics
        </h2>
        <Link to="/dashboard/analytics">
          <Button color="gray" size="xs" pill className="bg-surface-600 hover:bg-surface-500 text-gray-200 border-0 focus:ring-0">
            View Detailed Analytics
          </Button>
        </Link>
      </div>
      <div className="relative h-64 bg-surface-600/50 rounded-xl border border-elevated-border flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <svg viewBox="0 0 400 200" className="w-full h-full">
            <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points="0,150 40,120 80,140 120,80 160,100 200,40 240,60 280,30 320,50 360,20 400,40" />
            <polyline fill="none" stroke="#22c55e" strokeWidth="2" points="0,180 40,160 80,170 120,130 160,140 200,90 240,100 280,70 320,80 360,50 400,60" />
          </svg>
        </div>
        <div className="text-center relative z-10">
          <BarChart2 size={40} className="mx-auto mb-2 text-gray-500" />
          <p className="text-gray-400 text-sm">Analytics data will appear here</p>
        </div>
      </div>
    </div>
  )
);

AnalyticsPreview.propTypes = {
  hasVideos: PropTypes.bool.isRequired,
};

export const formatVideosForAdRow = (videos, isPopular = false) => {
  if (!Array.isArray(videos)) return [];
  return videos.map((video, index) => ({
    id: video.id || video._id || `fallback-video-${index}`,
    title: video.title || 'Untitled Video',
    thumbnail_url: video.thumbnail_url || video.imageUrl,
    video_url: video.video_url || video.videoUrl,
    upload_date: video.upload_date,
    views: video.views || 0,
    likes: video.likes || 0,
    duration: video.duration || '00:00',
    featured: isPopular || video.featured || false,
    popular: isPopular || video.popular || false,
    description: video.description || '',
    brand: video.brand || '',
    uploader_name: video.uploader_name || '',
  }));
};

export const StatsOverview = ({ stats }) => {
  const { totalVideos, totalViews, totalLikes, storageUsed } = stats;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard title="Total Videos" value={totalVideos} icon={Play} color="blue" />
      <StatsCard title="Total Views" value={totalViews} icon={ViewsIcon} color="green" />
      <StatsCard title="Total Likes" value={totalLikes} icon={ThumbsUp} color="purple" />
      <StorageCard storageUsed={storageUsed} />
    </div>
  );
};

StatsOverview.propTypes = {
  stats: PropTypes.shape({
    totalVideos: PropTypes.number.isRequired,
    totalViews: PropTypes.number.isRequired,
    totalLikes: PropTypes.number.isRequired,
    storageUsed: PropTypes.number.isRequired,
  }).isRequired,
};

export const UserStatsOverview = () => {
  return (
    <div className="mb-6">
      <div className="bg-gradient-to-br from-brand-900/30 to-indigo-900/20 border border-brand-800/40 rounded-xl p-5 shadow-md">
        <h2 className="text-lg font-semibold text-white mb-2">Your Activity</h2>
        <p className="text-gray-400 text-sm mb-4">
          Use the links in the sidebar to access your watch history and liked videos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/dashboard/history" className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg bg-surface-600 hover:bg-surface-500 text-white transition-all duration-200 hover:-translate-y-0.5">
            <Clock className="mr-2 h-4 w-4 text-brand-400" />
            View Watch History
          </Link>
          <Link to="/dashboard/liked-videos" className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg bg-surface-600 hover:bg-surface-500 text-white transition-all duration-200 hover:-translate-y-0.5">
            <ThumbsUp className="mr-2 h-4 w-4 text-purple-400" />
            View Liked Videos
          </Link>
        </div>
      </div>
    </div>
  );
};
