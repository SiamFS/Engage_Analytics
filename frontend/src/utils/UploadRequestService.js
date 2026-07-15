import ApiService from './ApiService';

class UploadRequestService {
  static _cache = {
    list: null,
    listTime: 0,
    detail: {},
    inProgress: {},
  };

  static CACHE_TTL_LIST = 30_000;
  static CACHE_TTL_DETAIL = 60_000;

  static _isFresh(timestamp, ttl) {
    return timestamp > 0 && (Date.now() - timestamp) < ttl;
  }

  static clearCache() {
    this._cache.list = null;
    this._cache.listTime = 0;
    this._cache.detail = {};
    this._cache.inProgress = {};
  }

  static async getList(params = {}) {
    const { limit = 50, offset = 0, status = null, search = null, company_id = null, forceRefresh = false } = params;
    const cacheKey = `list_${limit}_${offset}_${status}_${search}`;

    if (!forceRefresh && offset === 0 && !status && !search && this._isFresh(this._cache.listTime, this.CACHE_TTL_LIST)) {
      return this._cache.list;
    }

    if (this._cache.inProgress[cacheKey]) {
      return await this._cache.inProgress[cacheKey];
    }

    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit);
    queryParams.append('offset', offset);
    if (status) queryParams.append('status', status);
    if (search) queryParams.append('search', search);
    if (company_id) queryParams.append('company_id', company_id);

    this._cache.inProgress[cacheKey] = ApiService.get(`upload-requests/?${queryParams.toString()}`);
    try {
      const response = await this._cache.inProgress[cacheKey];
      const result = {
        results: Array.isArray(response?.results) ? response.results : [],
        total: response?.total || 0,
        limit: response?.limit || limit,
        offset: response?.offset || offset,
      };
      if (offset === 0 && !status && !search) {
        this._cache.list = result;
        this._cache.listTime = Date.now();
      }
      return result;
    } catch {
      if (offset === 0 && this._cache.list) return this._cache.list;
      return { results: [], total: 0, limit, offset };
    } finally {
      delete this._cache.inProgress[cacheKey];
    }
  }

  static async getDetail(requestId, forceRefresh = false) {
    if (!forceRefresh && this._cache.detail[requestId] && this._isFresh(this._cache.detail[requestId]._fetchedAt, this.CACHE_TTL_DETAIL)) {
      return this._cache.detail[requestId];
    }

    const cacheKey = `detail_${requestId}`;
    if (this._cache.inProgress[cacheKey]) {
      return await this._cache.inProgress[cacheKey];
    }

    this._cache.inProgress[cacheKey] = ApiService.get(`upload-requests/${requestId}/`);
    try {
      const response = await this._cache.inProgress[cacheKey];
      response._fetchedAt = Date.now();
      this._cache.detail[requestId] = response;
      return response;
    } catch {
      if (this._cache.detail[requestId]) return this._cache.detail[requestId];
      throw new Error('Failed to fetch upload request details');
    } finally {
      delete this._cache.inProgress[cacheKey];
    }
  }

  static async create(data) {
    const response = await ApiService.post('upload-requests/', data);
    this.clearCache();
    return response;
  }

  static async update(requestId, data) {
    const response = await ApiService.patch(`upload-requests/${requestId}/`, data);
    delete this._cache.detail[requestId];
    return response;
  }

  static async submit(requestId) {
    const response = await ApiService.post(`upload-requests/${requestId}/submit/`, {});
    this.clearCache();
    return response;
  }

  static async cancel(requestId) {
    const response = await ApiService.post(`upload-requests/${requestId}/cancel/`, {});
    this.clearCache();
    return response;
  }

  static async getCompanyAnalytics() {
    return await ApiService.get('company/analytics/');
  }

  static async adminGetAllRequests(params = {}) {
    const { limit = 50, offset = 0, status = null, search = null, company_id = null } = params;
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit);
    queryParams.append('offset', offset);
    if (status) queryParams.append('status', status);
    if (search) queryParams.append('search', search);
    if (company_id) queryParams.append('company_id', company_id);

    const response = await ApiService.get(`admin/upload-requests/?${queryParams.toString()}`);
    return {
      results: Array.isArray(response?.results) ? response.results : [],
      total: response?.total || 0,
      limit: response?.limit || limit,
      offset: response?.offset || offset,
    };
  }

  static async adminGetDetail(requestId) {
    return await ApiService.get(`admin/upload-requests/${requestId}/`);
  }

  static async adminApprove(requestId, comment = '') {
    const response = await ApiService.post(`admin/upload-requests/${requestId}/approve/`, { comment });
    this.clearCache();
    return response;
  }

  static async adminReject(requestId, rejection_reason = '', suggestions = '', comment = '') {
    const response = await ApiService.post(`admin/upload-requests/${requestId}/reject/`, {
      rejection_reason,
      suggestions,
      comment,
    });
    this.clearCache();
    return response;
  }

  static async adminArchive(requestId) {
    const response = await ApiService.post(`admin/upload-requests/${requestId}/archive/`, {});
    this.clearCache();
    return response;
  }

  static async adminGetUsers(params = {}) {
    const { limit = 50, offset = 0, search = null, role = null, status = null, sort_by = '-date_joined' } = params;
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit);
    queryParams.append('offset', offset);
    queryParams.append('sort_by', sort_by);
    if (search) queryParams.append('search', search);
    if (role && role !== 'all') queryParams.append('role', role);
    if (status) queryParams.append('status', status);

    const response = await ApiService.get(`admin/users/?${queryParams.toString()}`);
    return {
      results: Array.isArray(response?.results) ? response.results : [],
      total: response?.total || 0,
      limit: response?.limit || limit,
      offset: response?.offset || offset,
    };
  }

  static async adminCreateUser(data) {
    const response = await ApiService.post('admin/users/', data);
    return response;
  }

  static async adminUpdateUser(userId, data) {
    return await ApiService.patch(`admin/users/${userId}/`, data);
  }

  static async adminDeleteUser(userId) {
    return await ApiService.delete(`admin/users/${userId}/`);
  }

  static async adminActivateUser(userId) {
    return await ApiService.post(`admin/users/${userId}/activate/`, {});
  }

  static async adminDeactivateUser(userId) {
    return await ApiService.post(`admin/users/${userId}/deactivate/`, {});
  }

  static async adminBulkAction(action, userIds) {
    return await ApiService.post('admin/users/bulk-action/', { action, user_ids: userIds });
  }

  static async adminGetCompanies() {
    return await ApiService.get('admin/companies/');
  }

  static STATUS_CONFIG = {
    draft: { label: 'Draft', color: 'gray', icon: 'FileText' },
    submitted: { label: 'Submitted', color: 'blue', icon: 'Send' },
    pending_review: { label: 'Pending Review', color: 'yellow', icon: 'Clock' },
    approved: { label: 'Approved', color: 'green', icon: 'CheckCircle' },
    rejected: { label: 'Rejected', color: 'red', icon: 'XCircle' },
    processing: { label: 'Processing', color: 'purple', icon: 'RefreshCw' },
    completed: { label: 'Completed', color: 'green', icon: 'CheckCircle2' },
    failed: { label: 'Failed', color: 'red', icon: 'AlertTriangle' },
    cancelled: { label: 'Cancelled', color: 'gray', icon: 'X' },
    archived: { label: 'Archived', color: 'gray', icon: 'Archive' },
  };
}

export default UploadRequestService;
