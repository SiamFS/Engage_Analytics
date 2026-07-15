import ApiService from './ApiService';

class FeedbackService {
  static _cache = {};
  static _inProgress = {};

  static async getActiveQuestions() {
    return ApiService.get('feedback/questions/');
  }

  static async submitFeedback(data) {
    ApiService.cancelRequest('feedback/submit');
    return ApiService.post('feedback/submit/', data);
  }

  static async getUserFeedbackHistory(limit = 20, offset = 0) {
    return ApiService.get(`feedback/history/?limit=${limit}&offset=${offset}`);
  }

  static async adminGetAllFeedback(params = {}) {
    const q = new URLSearchParams();
    if (params.limit) q.set('limit', params.limit);
    if (params.offset) q.set('offset', params.offset);
    if (params.search) q.set('search', params.search);
    if (params.rating) q.set('rating', params.rating);
    if (params.is_bug_report) q.set('is_bug_report', params.is_bug_report);
    if (params.user_id) q.set('user_id', params.user_id);
    const qs = q.toString();
    return ApiService.get(`admin/feedback/${qs ? '?' + qs : ''}`);
  }

  static async adminGetFeedbackDetail(feedbackId) {
    return ApiService.get(`admin/feedback/${feedbackId}/`);
  }

  static async adminDeleteFeedback(feedbackId) {
    ApiService.cancelRequest(`admin/feedback/${feedbackId}`);
    return ApiService.delete(`admin/feedback/${feedbackId}/`);
  }

  static async adminGetFeedbackAnalytics() {
    return ApiService.get('admin/feedback/analytics/');
  }

  static async adminGetQuestions() {
    return ApiService.get('admin/feedback/questions/');
  }

  static async adminCreateQuestion(data) {
    return ApiService.post('admin/feedback/questions/', data);
  }

  static async adminUpdateQuestion(questionId, data) {
    return ApiService.patch(`admin/feedback/questions/${questionId}/`, data);
  }

  static async adminDeleteQuestion(questionId) {
    return ApiService.delete(`admin/feedback/questions/${questionId}/`);
  }

  static async adminReorderQuestions(orderData) {
    return ApiService.post('admin/feedback/questions/reorder/', { order: orderData });
  }
}

export default FeedbackService;
