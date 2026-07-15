import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Button } from 'flowbite-react';
import { TrendingUp, Upload as UploadIcon, Users, Video, BarChart2, Camera, Activity, MessageSquareText, Star, FileUp } from 'lucide-react';
import AdRow from '../../Shared/AdRow/AdRow';
import { 
  StatsOverview, 
  formatVideosForAdRow, 
  AnalyticsPreview,
  UserStatsOverview
} from '../../Shared/DashboardComponents/DashboardComponents';
import UserPointsCard from './User/UserPointsCard';
import FeedbackService from '../../../utils/FeedbackService';

const DashboardHome = ({ user, stats }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [feedbackCount, setFeedbackCount] = useState(0);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user?.role === 'user') {
      FeedbackService.getUserFeedbackHistory(1, 0).then(res => {
        if (Array.isArray(res)) setFeedbackCount(res.length);
      }).catch(() => {});
    }
  }, [user]);

  const totalVideos = stats?.totalVideos || 0;
  const hasVideos = totalVideos > 0;

  const popularVideosForAdRow = formatVideosForAdRow(stats?.popularVideos, true);
  
  let displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  if (displayName.length > 15) {
    displayName = displayName.split(' ')[0] || displayName.substring(0, 15);
  }

  const isAdmin = user?.role === 'admin';
  const isCompany = user?.role === 'company';
  const canUpload = isAdmin || isCompany;
  const isViewer = user?.role === 'user';

  let welcomeMessage;
  if (isAdmin) {
    welcomeMessage = isMobile ? "Manage videos and users" : "Manage your videos and platform users from your admin dashboard.";
  } else if (isCompany) {
    welcomeMessage = isMobile ? "Manage your content" : "Upload and manage your company's video content.";
  } else {
    welcomeMessage = isMobile ? "Your video activity today" : "Here's what's happening with your video activity today.";
  }
      
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
             Welcome back, {displayName}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {welcomeMessage}
          </p>
        </div>
        {canUpload && (
          <Button
            color="blue"
            className="bg-brand-600 hover:bg-brand-700 focus:ring-0 rounded-xl"
            as={Link}
            to="/dashboard/upload"
          >
            <UploadIcon size={18} className="mr-2" />
            Upload New Video
          </Button>
        )}
      </div>

      {isAdmin && (
        <div className="bg-gradient-to-br from-brand-900/30 to-indigo-900/20 border border-brand-800/30 rounded-xl p-5 shadow-md">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            Admin Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link to="/dashboard/role-management" className="flex items-center gap-3 p-3 rounded-lg bg-surface-600 hover:bg-surface-500 border border-elevated-border transition-all duration-200">
              <Users size={18} className="text-brand-400 shrink-0" />
              <span className="text-sm text-gray-200">Manage Users</span>
            </Link>
            <Link to="/dashboard/videos" className="flex items-center gap-3 p-3 rounded-lg bg-surface-600 hover:bg-surface-500 border border-elevated-border transition-all duration-200">
              <Video size={18} className="text-brand-400 shrink-0" />
              <span className="text-sm text-gray-200">Manage Videos</span>
            </Link>
            <Link to="/dashboard/recorded-videos" className="flex items-center gap-3 p-3 rounded-lg bg-surface-600 hover:bg-surface-500 border border-elevated-border transition-all duration-200">
              <Camera size={18} className="text-brand-400 shrink-0" />
              <span className="text-sm text-gray-200">Webcam Recordings</span>
            </Link>
          </div>
        </div>
      )}

      {isCompany && (
        <>
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-800/30 rounded-xl p-5 shadow-md">
            <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <Activity size={18} className="text-indigo-400" />
              Emotion Analytics
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              View audience emotional reactions to your video ads.
            </p>
            <Button as={Link} to="/dashboard/detailed-analytics" color="light" size="sm" className="bg-surface-600 hover:bg-surface-500 text-white border-0 focus:ring-0 rounded-lg">
              <BarChart2 size={16} className="mr-2" />
              View Emotion Analytics
            </Button>
          </div>
          <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border border-yellow-800/30 rounded-xl p-5 shadow-md">
            <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <FileUp size={18} className="text-yellow-400" />
              Upload Requests
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Submit and track video upload requests for admin approval.
            </p>
            <Button as={Link} to="/dashboard/upload-requests" color="light" size="sm" className="bg-surface-600 hover:bg-surface-500 text-white border-0 focus:ring-0 rounded-lg">
              <BarChart2 size={16} className="mr-2" />
              View Upload Requests
            </Button>
          </div>
          <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border border-yellow-800/30 rounded-xl p-5 shadow-md">
            <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <MessageSquareText size={18} className="text-yellow-400" />
              Ad Feedback
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              View audience feedback and ratings for your ads.
            </p>
            <Button as={Link} to="/dashboard/survey" color="light" size="sm" className="bg-surface-600 hover:bg-surface-500 text-white border-0 focus:ring-0 rounded-lg">
              <Star size={16} className="mr-2" />
              View Feedback
            </Button>
          </div>
        </>
      )}

      {isViewer && <UserPointsCard compact={true} />}

      {isViewer && feedbackCount > 0 && (
        <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border border-yellow-800/30 rounded-xl p-5 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <MessageSquareText size={18} className="text-yellow-400" />
                Your Ad Feedback
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                You've rated {feedbackCount} ad{feedbackCount !== 1 ? 's' : ''}.
              </p>
            </div>
            <Button as={Link} to="/dashboard/my-feedback" color="light" size="sm" className="bg-surface-600 hover:bg-surface-500 text-white border-0 focus:ring-0 rounded-lg">
              View History
            </Button>
          </div>
        </div>
      )}

      {isViewer ? (
        <UserStatsOverview />
      ) : (
        <StatsOverview stats={stats} />
      )}

      {!isViewer && (
        <div>
          {hasVideos && popularVideosForAdRow.length > 0 ? (
            <AdRow
              title="Popular Videos"
              ads={popularVideosForAdRow}
              linkTo="/dashboard/analytics"
              isVideoSection={true}
              icon={<TrendingUp size={20} className="text-gray-400"/>}
            />
          ) : (
            hasVideos && (
              <div className="card-base bg-elevated border-elevated-border p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-gray-400" /> Popular Videos
                </h2>
                <p className="text-center py-6 text-gray-500 text-sm">No popular videos to display yet.</p>
              </div>
            )
          )}
        </div>
      )}
    
      {!isViewer && <AnalyticsPreview hasVideos={hasVideos} />}
    </div>
  );
};

DashboardHome.propTypes = {
  user: PropTypes.shape({
    displayName: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string
  }),
  stats: PropTypes.shape({
    totalVideos: PropTypes.number,
    totalViews: PropTypes.number,
    totalLikes: PropTypes.number,
    storageUsed: PropTypes.number,
    recentVideos: PropTypes.arrayOf(PropTypes.object),
    popularVideos: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
};

export default DashboardHome;
