import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
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
  Settings,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
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

const TYPE_LABELS = {
  video_liked: 'Likes',
  webcam_upload_complete: 'Uploads',
  recording_analyzed: 'Analysis',
  analysis_run_completed: 'Analysis',
  points_earned: 'Points',
  video_view_limit_reached: 'Privacy',
  video_auto_privated: 'Privacy',
  user_promoted: 'Admin',
  new_user_registered: 'Users',
  system_announcement: 'System',
};

const LIMIT = 20;

const NotificationCenter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // 'all' | 'selected' | notificationId

  const filterType = searchParams.get('type') || '';
  const filterUnread = searchParams.get('unread') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const offset = (page - 1) * LIMIT;

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await NotificationService.getNotifications({
        limit: LIMIT,
        offset,
        unreadOnly: filterUnread,
        type: filterType || null,
      });
      if (!mountedRef.current) return;
      setNotifications(data.results);
      setTotal(data.total);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message || 'Failed to load notifications');
      setNotifications([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [offset, filterUnread, filterType]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const updateParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined || value === false) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    if (updates.page === undefined && !Object.prototype.hasOwnProperty.call(updates, 'page')) {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
    setSelectedIds(new Set());
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await NotificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setSelectedIds(new Set());
    } catch {
      // silently fail
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDeleteAll = async () => {
    setConfirmDelete('all');
  };

  const handleConfirmDelete = async () => {
    if (confirmDelete === 'all') {
      setMarkingAll(true);
      try {
        await NotificationService.deleteAllNotifications();
        setNotifications([]);
        setTotal(0);
        setSelectedIds(new Set());
      } catch {
        // silently fail
      } finally {
        setMarkingAll(false);
        setConfirmDelete(null);
      }
    } else if (typeof confirmDelete === 'number') {
      try {
        await NotificationService.deleteNotification(confirmDelete);
        setNotifications((prev) => prev.filter((n) => n.id !== confirmDelete));
        setTotal((prev) => prev - 1);
      } catch {
        // silently fail
      } finally {
        setConfirmDelete(null);
      }
    } else if (confirmDelete === 'selected') {
      for (const id of selectedIds) {
        try { await NotificationService.deleteNotification(id); } catch { /* skip */ }
      }
      setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      setTotal((prev) => prev - selectedIds.size);
      setSelectedIds(new Set());
      setConfirmDelete(null);
    }
  };

  const handleMarkSelectedRead = async () => {
    for (const id of selectedIds) {
      try {
        await NotificationService.markAsRead(id);
      } catch {
        // skip
      }
    }
    setNotifications((prev) =>
      prev.map((n) => (selectedIds.has(n.id) ? { ...n, is_read: true } : n))
    );
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) {
      try {
        await NotificationService.deleteNotification(id);
      } catch {
        // skip
      }
    }
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    setTotal((prev) => prev - selectedIds.size);
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getIcon = (notificationType) => {
    const iconName = NotificationService.NOTIFICATION_ICONS[notificationType] || 'Bell';
    const Icon = ICON_MAP[iconName] || Bell;
    const colorClass = ICON_COLORS[notificationType] || 'text-gray-400 bg-gray-500/10';
    return (
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
        <Icon size={18} />
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell size={24} className="text-brand-400" />
          Notifications
          {total > 0 && (
            <span className="text-sm font-normal text-gray-400">({total} total)</span>
          )}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll || notifications.every((n) => n.is_read)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors disabled:opacity-30"
          >
            {markingAll ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCheck size={14} />
            )}
            Mark All Read
          </button>
          <Link
            to="/dashboard/notification-settings"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors"
          >
            <Settings size={14} />
            Settings
          </Link>
          <button
            onClick={handleDeleteAll}
            disabled={notifications.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-30"
          >
            <Trash2 size={14} />
            Clear All
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-brand-600/10 border border-brand-500/20 rounded-lg">
          <span className="text-sm text-brand-300">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <button
            onClick={handleMarkSelectedRead}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-green-300 bg-green-500/10 hover:bg-green-500/20 rounded-md transition-colors"
          >
            <Check size={12} /> Mark Read
          </button>
          <button
            onClick={() => setConfirmDelete('selected')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors"
          >
            <Trash2 size={12} /> Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-1 text-gray-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Notification list */}
      <div className="bg-elevated rounded-xl border border-elevated-border shadow-md overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="text-gray-400 animate-spin" />
            <p className="text-sm text-gray-500">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <BellOff size={40} className="text-red-500/50" />
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={loadNotifications}
              className="px-4 py-2 text-sm bg-surface-600 text-gray-200 rounded-lg hover:bg-surface-500"
            >
              Try Again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <BellOff size={48} className="text-gray-600" />
            <p className="text-lg text-gray-400">No notifications yet</p>
            <p className="text-sm text-gray-500">
              {filterUnread
                ? 'You have no unread notifications.'
                : 'We will notify you when something happens.'}
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 px-4 py-4 border-b border-elevated-border last:border-b-0 transition-colors ${
                  !notification.is_read ? 'bg-brand-600/5' : ''
                }`}
              >
                <div className="flex items-center pt-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(notification.id)}
                    onChange={() => handleToggleSelect(notification.id)}
                    className="w-4 h-4 rounded border-surface-500 bg-surface-600 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                </div>
                <button
                  onClick={() => handleToggleSelect(notification.id)}
                  className="flex-1 flex items-start gap-3 min-w-0 text-left"
                >
                  {getIcon(notification.notification_type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm leading-snug ${
                          !notification.is_read ? 'text-white font-medium' : 'text-gray-300'
                        }`}
                      >
                        {notification.title}
                      </p>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap shrink-0 pt-0.5">
                        {notification.relative_time || ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{notification.message}</p>
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0 pt-1">
                  {!notification.is_read && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await NotificationService.markAsRead(notification.id);
                        setNotifications((prev) =>
                          prev.map((n) =>
                            n.id === notification.id ? { ...n, is_read: true } : n
                          )
                        );
                      }}
                      className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-surface-600 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(notification.id);
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-surface-600 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => updateParams({ page: page - 1 })}
            disabled={page <= 1}
            className="p-2 text-gray-400 hover:text-white hover:bg-surface-600 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => updateParams({ page: p })}
              className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                p === page
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-surface-600'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => updateParams({ page: page + 1 })}
            disabled={page >= totalPages}
            className="p-2 text-gray-400 hover:text-white hover:bg-surface-600 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-elevated border border-elevated-border rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-white text-lg font-semibold mb-2">Confirm Delete</h3>
            <p className="text-gray-400 text-sm mb-6">
              {confirmDelete === 'all'
                ? 'Are you sure you want to delete ALL notifications? This cannot be undone.'
                : confirmDelete === 'selected'
                ? `Delete ${selectedIds.size} selected notification(s)?`
                : 'Delete this notification?'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-surface-600 hover:bg-surface-500 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
