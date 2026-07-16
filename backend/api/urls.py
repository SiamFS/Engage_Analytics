from django.urls import path
from api.views import (
    OnboardingAPIView,
    UploadVideoView,
    VideoFeedView,
    VideoDetailView,
    RecordVideoViewAPI,
    ToggleVideoLikeAPI,
    CreateVideoShareAPI,
    UserHistoryAPI,
    WebcamUploadView,
    UserLikedVideosAPI,
    VideoSearchView,
    UserPointsView,
    VideoRecommendationsView,
    FeaturedCarouselVideosView,
    CategoryVideosView,
    TrendingVideosView,
    RecentVideosView,
    PopularVideosView,
    WebcamUploadCompleteView,
    RunEmotionAnalysisView,
    EmotionAnalysisStatusView,
    VideoEmotionSummaryView,
    VideoEmotionRecordingsView,
    MyEmotionView,
    UserWebcamRecordingsView,
    UserProfileView,
    UserDeviceView,
    HealthCheckView,
    UploadRequestListCreateView,
    UploadRequestDetailView,
    UploadRequestSubmitView,
    UploadRequestCancelView,
    CompanyAnalyticsView,
)
from api.admin_views import (
    UserSearchView,
    PromoteToAdminView,
    VideoManagementView,
    VideoStatsView,
    WebcamRecordingsView,
    DeleteWebcamRecordingView,
    AdminPointsView,
    AdminUploadRequestListView,
    AdminUploadRequestDetailView,
    AdminUploadRequestApproveView,
    AdminUploadRequestRejectView,
    AdminUploadRequestArchiveView,
    AdminUserManagementView,
    AdminUserDetailView,
    AdminUserActivateView,
    AdminUserDeactivateView,
    AdminUserBulkActionView,
    AdminCompanyListView,
)
from api.feedback_views import (
    ActiveSurveyQuestionsView,
    AdminSurveyQuestionsView,
    AdminSurveyReorderView,
    SubmitFeedbackView,
    FeedbackPendingCheckView,
    UserFeedbackHistoryView,
    AdminFeedbackListView,
    AdminFeedbackDetailView,
    FeedbackAnalyticsView,
)
from api.notification_views import (
    UnreadNotificationCountView,
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationDeleteView,
    NotificationDeleteAllView,
    NotificationArchiveView,
    NotificationPreferenceView,
    AdminNotificationListView,
)

urlpatterns = [
    path("onboarding/", OnboardingAPIView.as_view(), name="onboarding"),
    # Video endpoints
    path("upload-video/", UploadVideoView.as_view(), name="upload-video"),
    path("video-feed/", VideoFeedView.as_view(), name="video-feed"),
    path(
        "video/<str:video_identifier>/", VideoDetailView.as_view(), name="video-detail"
    ),
    path("search/videos/", VideoSearchView.as_view(), name="search-videos"),
    # Video interaction endpoints
    path(
        "videos/<int:video_id>/view/",
        RecordVideoViewAPI.as_view(),
        name="record-video-view",
    ),
    path(
        "videos/<int:video_id>/like/",
        ToggleVideoLikeAPI.as_view(),
        name="toggle-video-like",
    ),
    path(
        "videos/<int:video_id>/share/",
        CreateVideoShareAPI.as_view(),
        name="create-video-share",
    ),
    path(
        "videos/<int:video_id>/webcam-upload/",
        WebcamUploadView.as_view(),
        name="webcam-upload",
    ),
    path(
        "videos/<int:video_id>/webcam-upload/<int:recording_id>/complete/",
        WebcamUploadCompleteView.as_view(),
        name="webcam-upload-complete",
    ),
    # User endpoints
    path("user/history/", UserHistoryAPI.as_view(), name="user-history"),
    path("user/liked/", UserLikedVideosAPI.as_view(), name="user-liked-videos"),
    path("user/points/", UserPointsView.as_view(), name="user-points"),
    path("user/profile/", UserProfileView.as_view(), name="user-profile"),
    path("user/devices/", UserDeviceView.as_view(), name="user-devices"),
    # Recommendation endpoints
    path(
        "recommendations/",
        VideoRecommendationsView.as_view(),
        name="video-recommendations",
    ),
    path(
        "featured-carousel/",
        FeaturedCarouselVideosView.as_view(),
        name="featured-carousel-videos",
    ),
    path("category-videos/", CategoryVideosView.as_view(), name="category-videos"),
    path("trending-videos/", TrendingVideosView.as_view(), name="trending-videos"),
    path("recent-videos/", RecentVideosView.as_view(), name="recent-videos"),
    path("popular-videos/", PopularVideosView.as_view(), name="popular-videos"),
    # User-facing webcam recordings
    path(
        "webcam-recordings/",
        UserWebcamRecordingsView.as_view(),
        name="user-webcam-recordings",
    ),
    # Admin endpoints
    path("admin/users/search/", UserSearchView.as_view(), name="admin-user-search"),
    path(
        "admin/users/promote/", PromoteToAdminView.as_view(), name="admin-promote-user"
    ),
    path("admin/videos/", VideoManagementView.as_view(), name="admin-videos-list"),
    path(
        "admin/videos/<int:video_id>/",
        VideoManagementView.as_view(),
        name="admin-video",
    ),
    path("admin/video-stats/", VideoStatsView.as_view(), name="admin-video-stats"),
    path(
        "admin/webcam-recordings/",
        WebcamRecordingsView.as_view(),
        name="admin-webcam-recordings",
    ),
    path(
        "admin/webcam-recordings/<int:recording_id>/",
        DeleteWebcamRecordingView.as_view(),
        name="admin-delete-webcam-recording",
    ),
    # Emotion analysis admin endpoints
    path(
        "admin/run-emotion-analysis/",
        RunEmotionAnalysisView.as_view(),
        name="admin-run-emotion-analysis",
    ),
    path(
        "admin/emotion-analysis-status/",
        EmotionAnalysisStatusView.as_view(),
        name="admin-emotion-analysis-status",
    ),
    # Per-video emotion analytics
    path(
        "video/<int:video_id>/emotion-summary/",
        VideoEmotionSummaryView.as_view(),
        name="video-emotion-summary",
    ),
    path(
        "video/<int:video_id>/emotion/recordings/",
        VideoEmotionRecordingsView.as_view(),
        name="video-emotion-recordings",
    ),
    path(
        "video/<int:video_id>/my-emotion/",
        MyEmotionView.as_view(),
        name="video-my-emotion",
    ),
    # Notification endpoints
    path(
        "notifications/unread-count/",
        UnreadNotificationCountView.as_view(),
        name="notification-unread-count",
    ),
    path(
        "notifications/",
        NotificationListView.as_view(),
        name="notification-list",
    ),
    path(
        "notifications/<int:notification_id>/read/",
        NotificationMarkReadView.as_view(),
        name="notification-mark-read",
    ),
    path(
        "notifications/read-all/",
        NotificationMarkAllReadView.as_view(),
        name="notification-mark-all-read",
    ),
    path(
        "notifications/delete-all/",
        NotificationDeleteAllView.as_view(),
        name="notification-delete-all",
    ),
    path(
        "notifications/<int:notification_id>/",
        NotificationDeleteView.as_view(),
        name="notification-delete",
    ),
    path(
        "notifications/<int:notification_id>/archive/",
        NotificationArchiveView.as_view(),
        name="notification-archive",
    ),
    path(
        "notification-preferences/",
        NotificationPreferenceView.as_view(),
        name="notification-preferences",
    ),
    # Admin notification management
    path(
        "admin/notifications/",
        AdminNotificationListView.as_view(),
        name="admin-notification-list",
    ),
    # Admin points
    path("admin/points/", AdminPointsView.as_view(), name="admin-points"),
    # Feedback endpoints
    path("feedback/questions/", ActiveSurveyQuestionsView.as_view(), name="active-survey-questions"),
    path("feedback/submit/", SubmitFeedbackView.as_view(), name="submit-feedback"),
    path("feedback/pending/", FeedbackPendingCheckView.as_view(), name="feedback-pending"),
    path("feedback/history/", UserFeedbackHistoryView.as_view(), name="user-feedback-history"),
    path("admin/feedback/questions/", AdminSurveyQuestionsView.as_view(), name="admin-survey-questions"),
    path("admin/feedback/questions/<int:question_id>/", AdminSurveyQuestionsView.as_view(), name="admin-survey-question-detail"),
    path("admin/feedback/questions/reorder/", AdminSurveyReorderView.as_view(), name="admin-survey-reorder"),
    path("admin/feedback/", AdminFeedbackListView.as_view(), name="admin-feedback-list"),
    path("admin/feedback/<int:feedback_id>/", AdminFeedbackDetailView.as_view(), name="admin-feedback-detail"),
    path("admin/feedback/analytics/", FeedbackAnalyticsView.as_view(), name="admin-feedback-analytics"),
    # Health check
    path("health/", HealthCheckView.as_view(), name="health-check"),
    # Upload request endpoints (company + admin)
    path("upload-requests/", UploadRequestListCreateView.as_view(), name="upload-request-list-create"),
    path("upload-requests/<int:request_id>/", UploadRequestDetailView.as_view(), name="upload-request-detail"),
    path("upload-requests/<int:request_id>/submit/", UploadRequestSubmitView.as_view(), name="upload-request-submit"),
    path("upload-requests/<int:request_id>/cancel/", UploadRequestCancelView.as_view(), name="upload-request-cancel"),
    # Company analytics
    path("company/analytics/", CompanyAnalyticsView.as_view(), name="company-analytics"),
    # Admin upload request management
    path("admin/upload-requests/", AdminUploadRequestListView.as_view(), name="admin-upload-request-list"),
    path("admin/upload-requests/<int:request_id>/", AdminUploadRequestDetailView.as_view(), name="admin-upload-request-detail"),
    path("admin/upload-requests/<int:request_id>/approve/", AdminUploadRequestApproveView.as_view(), name="admin-upload-request-approve"),
    path("admin/upload-requests/<int:request_id>/reject/", AdminUploadRequestRejectView.as_view(), name="admin-upload-request-reject"),
    path("admin/upload-requests/<int:request_id>/archive/", AdminUploadRequestArchiveView.as_view(), name="admin-upload-request-archive"),
    # Admin user management
    path("admin/users/", AdminUserManagementView.as_view(), name="admin-user-list"),
    path("admin/users/<int:user_id>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("admin/users/<int:user_id>/activate/", AdminUserActivateView.as_view(), name="admin-user-activate"),
    path("admin/users/<int:user_id>/deactivate/", AdminUserDeactivateView.as_view(), name="admin-user-deactivate"),
    path("admin/users/bulk-action/", AdminUserBulkActionView.as_view(), name="admin-user-bulk-action"),
    # Admin company list (for dropdowns)
    path("admin/companies/", AdminCompanyListView.as_view(), name="admin-company-list"),
]
