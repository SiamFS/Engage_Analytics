import React, { useState, useEffect, useRef } from 'react';
import { Button, Spinner, Alert, Badge } from 'flowbite-react';
import { BarChart2, Upload, VideoIcon, ArrowRight, Activity, Film, Camera, ClipboardList, Star, MessageSquareText } from 'lucide-react';
import VideoService from '../../../../utils/VideoService';
import FeedbackService from '../../../../utils/FeedbackService';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '../../../Shared/DashboardComponents/DashboardComponents';

const AdminDashboard = () => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [adminStats, setAdminStats] = useState({
    totalVideos: 0,
    totalWebcamRecordings: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const [runStatus, setRunStatus] = useState(null);
  const [feedbackAnalytics, setFeedbackAnalytics] = useState(null);

  const navigate = useNavigate();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (fetchAttempted) return;

    const fetchDashboardData = async () => {
      try {
        setStatsLoading(true);
        setFetchAttempted(true);

        let videos = [];
        let recordings = [];

        const [videosResponse, recordingsResponse, statsResponse, statusResponse, feedbackResponse] = await Promise.allSettled([
          VideoService.adminGetAllVideos(),
          VideoService.adminGetWebcamRecordings(),
          VideoService.adminGetVideoStats(),
          VideoService.getEmotionAnalysisStatus(),
          FeedbackService.adminGetFeedbackAnalytics(),
        ]);

        if (videosResponse.status === 'fulfilled' && Array.isArray(videosResponse.value)) {
          videos = videosResponse.value;
        }

        if (recordingsResponse.status === 'fulfilled' && Array.isArray(recordingsResponse.value)) {
          recordings = recordingsResponse.value;
        }

        if (statsResponse.status === 'fulfilled' && statsResponse.value) {
          const { totalVideos, totalWebcamRecordings } = statsResponse.value;
          setAdminStats({
            totalVideos: totalVideos || 0,
            totalWebcamRecordings: totalWebcamRecordings || 0
          });
        }

        if (isMounted.current) {
          setAdminStats({
            totalVideos: videos.length || 0,
            totalWebcamRecordings: recordings.length || 0
          });
        }

        if (statusResponse.status === 'fulfilled' && statusResponse.value) {
          setRunStatus(statusResponse.value);
        }

        if (feedbackResponse.status === 'fulfilled' && feedbackResponse.value) {
          setFeedbackAnalytics(feedbackResponse.value);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        if (isMounted.current) {
          setError('Failed to load dashboard data. Please try again.');
        }
      } finally {
        if (isMounted.current) {
          setStatsLoading(false);
        }
      }
    };

    fetchDashboardData();
  }, [fetchAttempted]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const statusBadge = () => {
    if (!runStatus) return <Badge color="gray" className="!bg-surface-600 !text-gray-300">Never run</Badge>;
    if (runStatus.status === 'running') return <Badge color="warning" className="animate-pulse !bg-yellow-600/40 !text-yellow-300">Running</Badge>;
    if (runStatus.status === 'done') return <Badge color="success" className="!bg-green-600/40 !text-green-300">Completed</Badge>;
    if (runStatus.status === 'failed') return <Badge color="failure" className="!bg-red-600/40 !text-red-300">Failed</Badge>;
    return <Badge color="gray" className="!bg-surface-600 !text-gray-300">Idle</Badge>;
  };

  const progressText =
    runStatus && runStatus.status === 'running'
      ? `${runStatus.processed || 0} / ${runStatus.total || 0} recordings`
      : runStatus
      ? `Last run: ${runStatus.processed || 0}/${runStatus.total || 0} recordings`
      : 'No runs yet';

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
        <p className="text-sm text-gray-400">
          {isMobile ? "Manage platform stats & content" : "View platform statistics and manage your site."}
        </p>
      </div>

      {error && (
        <Alert color="failure" onDismiss={() => setError(null)} className="mb-4 rounded-xl border border-red-800/40">
          {error}
        </Alert>
      )}

      {success && (
        <Alert color="success" onDismiss={() => setSuccess(null)} className="mb-4 rounded-xl border border-green-800/40">
          {success}
        </Alert>
      )}

      {statsLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="xl" className="fill-brand-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatsCard
            title="Total Videos"
            value={adminStats.totalVideos}
            icon={Film}
            color="blue"
          />
          <StatsCard
            title="Webcam Recordings"
            value={adminStats.totalWebcamRecordings}
            icon={Camera}
            color="green"
          />
          {feedbackAnalytics && (
            <StatsCard
              title="Ad Feedback Responses"
              value={feedbackAnalytics.total_responses}
              icon={MessageSquareText}
              color="yellow"
            />
          )}
        </div>
      )}

      <div className="card-base bg-elevated border-elevated-border p-6">
        <h2 className="text-lg font-bold text-white mb-5">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/dashboard/upload')}
            className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-brand-600/20 to-brand-700/10 border border-brand-600/30 hover:border-brand-500/60 transition-all duration-200 hover:-translate-y-0.5 group"
            type="button"
          >
            <div className="p-2.5 rounded-lg bg-brand-600/20 group-hover:bg-brand-600/30 transition-colors">
              <Upload size={20} className="text-brand-400" />
            </div>
            <span className="text-sm font-medium text-white">Upload Video</span>
          </button>
          <button
            onClick={() => navigate('/dashboard/videos')}
            className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-700/10 border border-purple-600/30 hover:border-purple-500/60 transition-all duration-200 hover:-translate-y-0.5 group"
            type="button"
          >
            <div className="p-2.5 rounded-lg bg-purple-600/20 group-hover:bg-purple-600/30 transition-colors">
              <VideoIcon size={20} className="text-purple-400" />
            </div>
            <span className="text-sm font-medium text-white">Manage Videos</span>
          </button>
          <button
            onClick={() => navigate('/dashboard/recorded-videos')}
            className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-green-600/20 to-green-700/10 border border-green-600/30 hover:border-green-500/60 transition-all duration-200 hover:-translate-y-0.5 group"
            type="button"
          >
            <div className="p-2.5 rounded-lg bg-green-600/20 group-hover:bg-green-600/30 transition-colors">
              <Camera size={20} className="text-green-400" />
            </div>
            <span className="text-sm font-medium text-white">Recordings</span>
          </button>
          <button
            onClick={() => navigate('detailed-analytics')}
            className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-amber-600/20 to-amber-700/10 border border-amber-600/30 hover:border-amber-500/60 transition-all duration-200 hover:-translate-y-0.5 group"
            type="button"
          >
            <div className="p-2.5 rounded-lg bg-amber-600/20 group-hover:bg-amber-600/30 transition-colors">
              <BarChart2 size={20} className="text-amber-400" />
            </div>
            <span className="text-sm font-medium text-white">Emotion Analytics</span>
          </button>
          <button
            onClick={() => navigate('/dashboard/survey')}
            className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-yellow-600/20 to-yellow-700/10 border border-yellow-600/30 hover:border-yellow-500/60 transition-all duration-200 hover:-translate-y-0.5 group"
            type="button"
          >
            <div className="p-2.5 rounded-lg bg-yellow-600/20 group-hover:bg-yellow-600/30 transition-colors">
              <ClipboardList size={20} className="text-yellow-400" />
            </div>
            <span className="text-sm font-medium text-white">Survey Management</span>
          </button>
        </div>
      </div>

      <div className="card-base bg-elevated border-elevated-border p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-600/20">
              <Activity size={18} className="text-brand-400" />
            </div>
            Emotion Analysis
          </h2>
          <div className="flex items-center gap-3">
            {statusBadge()}
            <span className="text-xs text-gray-400">{progressText}</span>
            <Button color="blue" size="xs" onClick={() => navigate('detailed-analytics')} className="bg-brand-600 hover:bg-brand-700 focus:ring-0">
              Detailed <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>

        {runStatus ? (
          <div className="bg-surface-600 rounded-xl border border-elevated-border p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{runStatus.processed || 0}</p>
                <p className="text-xs text-gray-400 mt-1">Recordings Processed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{runStatus.total || 0}</p>
                <p className="text-xs text-gray-400 mt-1">Total Recordings</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {runStatus.finished_at
                    ? new Date(runStatus.finished_at).toLocaleDateString()
                    : '\u2014'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Last Run</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-surface-600 rounded-xl border border-elevated-border p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-surface-600 flex items-center justify-center mx-auto mb-4">
                <BarChart2 size={32} className="text-gray-500" />
              </div>
              <p className="text-gray-400 text-sm mb-1">No analysis runs yet.</p>
              <p className="text-gray-500 text-xs">Go to <span className="text-brand-400 font-medium">Emotion Analytics</span> to trigger your first analysis.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
