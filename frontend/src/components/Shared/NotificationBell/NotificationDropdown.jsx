import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Heart,
  Camera,
  Brain,
  CheckCircle2,
  Award,
  EyeOff,
  Lock,
  Shield,
  UserPlus,
  Megaphone,
  CheckCheck,
  Trash2,
  Loader2,
  BellOff,
  ExternalLink,
} from 'lucide-react';
import NotificationService from '../../../utils/NotificationService';

const ICON_MAP = {
  Heart, Camera, Brain, CheckCircle2, Award, EyeOff, Lock, Shield, UserPlus, Megaphone,
};

const ICON_COLORS = {
  video_liked: 'text-red-400 bg-red-500/10',
  webcam_upload_complete: 'text-blue-400 bg-blue-500/10',
  recording_analyzed: 'text-purple-400 bg-purple-500/10',
  analysis_run_completed: 'text-green-400 bg-green-500/10',
  points_earned: 'text-yellow-400 bg-yellow-500/10',
  video_view_limit_reached: 'text-orange-400 bg-orange-500/10',
  video_auto_privated: 'text-gray-400 bg-gray-500/10',
  user_promoted: 'text-blue-400 bg-blue-500/10',
  new_user_registered: 'text-green-400 bg-green-500/10',
  system_announcement: 'text-pink-400 bg-pink-500/10',
};

const NotificationDropdown = ({ onClose, onViewAll, onCountUpdate }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const listRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await NotificationService.getNotifications({ limit: 8 });
      setNotifications(data.results);
      setTotal(data.total);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await NotificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      onCountUpdate(0);
    } catch {
      // silently fail
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkRead = async (notification) => {
    if (notification.is_read) return;
    try {
      await NotificationService.markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      const remaining = notifications.filter((n) => n.id !== notification.id && !n.is_read).length;
      onCountUpdate(remaining);
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (e, notificationId) => {
    e.stopPropagation();
    try {
      await NotificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setTotal((prev) => prev - 1);
    } catch {
      // silently fail
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await handleMarkRead(notification);
    }
    onClose();

    const data = notification.data || {};
    if (data.video_id) {
      navigate(`/video/${data.video_id}`);
    } else if (data.recording_id) {
      navigate('/dashboard/recorded-videos');
    } else {
      navigate('/dashboard/notifications');
    }
  };

  const getIcon = (notificationType) => {
    const iconName = NotificationService.NOTIFICATION_ICONS[notificationType] || 'Bell';
    const Icon = ICON_MAP[iconName] || Bell;
    const colorClass = ICON_COLORS[notificationType] || 'text-gray-400 bg-gray-500/10';
    return (
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon size={16} />
      </div>
    );
  };

  return (
    <div className="absolute right-0 mt-2 w-[360px] sm:w-[400px] bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-[100] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Bell size={16} className="text-blue-400" />
          Notifications
          {total > 0 && (
            <span className="text-xs text-gray-400 font-normal">({total})</span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll || notifications.every((n) => n.is_read)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-surface-600 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Mark all as read"
          >
            {markingAll ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <CheckCheck size={15} />
            )}
          </button>
        </div>
      </div>

      <div
        ref={listRef}
        className="max-h-[380px] overflow-y-auto custom-scrollbar"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 size={24} className="text-gray-400 animate-spin" />
            <p className="text-sm text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <BellOff size={32} className="text-gray-600" />
            <p className="text-sm text-gray-400">No notifications yet</p>
            <p className="text-xs text-gray-500">We will let you know when something happens.</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-surface-500/50 transition-colors border-b border-elevated-border last:border-b-0 ${
                !notification.is_read ? 'bg-blue-900/10' : ''
              }`}
            >
              {getIcon(notification.notification_type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`text-sm leading-tight ${
                      !notification.is_read ? 'text-white font-medium' : 'text-gray-300'
                    }`}
                  >
                    {notification.title}
                  </p>
                  <button
                    onClick={(e) => handleDelete(e, notification.id)}
                    className="flex-shrink-0 p-0.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
                <p className="text-[10px] text-gray-500 mt-1">{notification.relative_time || ''}</p>
              </div>
            </button>
          ))
        )}
      </div>

      <div
        className="px-4 py-2.5 border-t border-gray-700 bg-gray-800/50"
      >
        <button
          onClick={onViewAll}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors font-medium"
        >
          <ExternalLink size={14} />
          View All Notifications
        </button>
      </div>
    </div>
  );
};

NotificationDropdown.propTypes = {
  onClose: PropTypes.func.isRequired,
  onViewAll: PropTypes.func.isRequired,
  onCountUpdate: PropTypes.func.isRequired,
};

export default NotificationDropdown;
