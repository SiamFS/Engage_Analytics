import ApiService from './ApiService';

class NotificationService {
  static _cache = {
    unreadCount: null,
    unreadCountTime: 0,
    notifications: null,
    notificationsTime: 0,
    inProgress: {}
  };

  static CACHE_TTL_UNREAD = 30_000;
  static CACHE_TTL_LIST = 60_000;

  static _isFresh(timestamp, ttl) {
    return timestamp > 0 && (Date.now() - timestamp) < ttl;
  }

  static clearCache() {
    this._cache.unreadCount = null;
    this._cache.unreadCountTime = 0;
    this._cache.notifications = null;
    this._cache.notificationsTime = 0;
    this._cache.inProgress = {};
  }

  static async getUnreadCount(forceRefresh = false) {
    if (!forceRefresh && this._isFresh(this._cache.unreadCountTime, this.CACHE_TTL_UNREAD)) {
      return this._cache.unreadCount;
    }

    try {
      const response = await ApiService.get('notifications/unread-count/');
      const count = response?.count ?? 0;
      this._cache.unreadCount = count;
      this._cache.unreadCountTime = Date.now();
      return count;
    } catch {
      if (this._cache.unreadCount !== null) return this._cache.unreadCount;
      return 0;
    }
  }

  static async getNotifications(params = {}) {
    const { limit = 20, offset = 0, unreadOnly = false, type = null } = params;
    const cacheKey = `notifications_${limit}_${offset}_${unreadOnly}_${type}`;

    if (offset === 0 && this._isFresh(this._cache.notificationsTime, this.CACHE_TTL_LIST)) {
      return this._cache.notifications;
    }

    if (this._cache.inProgress[cacheKey]) {
      return await this._cache.inProgress[cacheKey];
    }

    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit);
    queryParams.append('offset', offset);
    if (unreadOnly) queryParams.append('unread_only', 'true');
    if (type) queryParams.append('type', type);

    this._cache.inProgress[cacheKey] = ApiService.get(`notifications/?${queryParams.toString()}`);
    try {
      const response = await this._cache.inProgress[cacheKey];
      const result = {
        results: Array.isArray(response?.results) ? response.results : [],
        total: response?.total || 0,
        limit: response?.limit || limit,
        offset: response?.offset || offset,
      };
      if (offset === 0) {
        this._cache.notifications = result;
        this._cache.notificationsTime = Date.now();
      }
      return result;
    } catch {
      if (offset === 0 && this._cache.notifications) return this._cache.notifications;
      return { results: [], total: 0, limit, offset };
    } finally {
      delete this._cache.inProgress[cacheKey];
    }
  }

  static async markAsRead(notificationId) {
    await ApiService.post(`notifications/${notificationId}/read/`, {});
    this.clearCache();
  }

  static async markAllAsRead() {
    await ApiService.post('notifications/read-all/', {});
    this.clearCache();
  }

  static async deleteNotification(notificationId) {
    await ApiService.delete(`notifications/${notificationId}/`);
    this.clearCache();
  }

  static async archiveNotification(notificationId) {
    await ApiService.post(`notifications/${notificationId}/archive/`, {});
    this.clearCache();
  }

  static async getPreferences() {
    return await ApiService.get('notification-preferences/');
  }

  static async updatePreferences(preferences) {
    return await ApiService.put('notification-preferences/', preferences);
  }

  static NOTIFICATION_ICONS = {
    video_liked: 'Heart',
    webcam_upload_complete: 'Camera',
    recording_analyzed: 'Brain',
    analysis_run_completed: 'CheckCircle2',
    points_earned: 'Award',
    video_view_limit_reached: 'EyeOff',
    video_auto_privated: 'Lock',
    user_promoted: 'Shield',
    new_user_registered: 'UserPlus',
    system_announcement: 'Megaphone',
    upload_request_submitted: 'Upload',
    upload_request_approved: 'CheckCircle',
    upload_request_rejected: 'XCircle',
    upload_request_processing: 'RefreshCw',
    upload_request_completed: 'BarChart3',
    upload_request_cancelled: 'XCircle',
    upload_request_comment: 'MessageSquare',
  };

  static NOTIFICATION_COLORS = {
    video_liked: 'text-red-400',
    webcam_upload_complete: 'text-blue-400',
    recording_analyzed: 'text-purple-400',
    analysis_run_completed: 'text-green-400',
    points_earned: 'text-yellow-400',
    video_view_limit_reached: 'text-orange-400',
    video_auto_privated: 'text-gray-400',
    user_promoted: 'text-blue-400',
    new_user_registered: 'text-green-400',
    system_announcement: 'text-pink-400',
    upload_request_submitted: 'text-blue-400',
    upload_request_approved: 'text-green-400',
    upload_request_rejected: 'text-red-400',
    upload_request_processing: 'text-purple-400',
    upload_request_completed: 'text-green-400',
    upload_request_cancelled: 'text-gray-400',
    upload_request_comment: 'text-yellow-400',
  };
}

export default NotificationService;
