import uuid
from django.conf import settings

from rest_framework import serializers
from api.models import (
    ViewerProfile,
    User,
    CompanyProfile,
    Video,
    VideoView,
    VideoLike,
    VideoShare,
    WebcamRecording,
    EmotionFrame,
    VideoEmotionSummary,
    AnalysisRunLog,
    Notification,
    UserNotificationPreference,
    SurveyQuestion,
    FeedbackResponse,
    UploadRequest,
    UploadRequestStatusLog,
)

class FilenameSerializer(serializers.Serializer):
    filename = serializers.CharField(required=True)

class UserSearchSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

class VideoSearchQuerySerializer(serializers.Serializer):
    filename = serializers.CharField(required=True)

class CategoryQuerySerializer(serializers.Serializer):
    category = serializers.CharField(required=False, allow_blank=True)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=50, default=20)
    offset = serializers.IntegerField(required=False, min_value=0, default=0)


class OnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ViewerProfile
        fields = [
            "birthday",
            "gender",
            "country",
            "city",
            "education_level",
            "occupation",
            "content_preferences",
            "onboarding_completed",
        ]
        read_only_fields = ["onboarding_completed"]


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role"]
        read_only_fields = fields


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "firebase_uid",
            "is_active",
            "date_joined",
            "photo_url",
            "devices",
        ]
        read_only_fields = ["firebase_uid", "is_active", "date_joined", "role"]


class AdminActionSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=True)


class VideoSerializer(serializers.ModelSerializer):
    uploader = UserBasicSerializer(read_only=True)

    class Meta:
        model = Video
        fields = [
            "id",
            "title",
            "description",
            "category",
            "visibility",
            "video_url",
            "thumbnail_url",
            "upload_date",
            "uploader",
            "views",
            "likes",
            "duration",
            "view_limit",
            "auto_private_after",
        ]
        read_only_fields = [
            "id",
            "upload_date",
            "uploader",
            "video_url",
            "thumbnail_url",
            "views",
            "likes",
            "duration",
        ]


class VideoFeedSerializer(serializers.ModelSerializer):
    uploader = UserBasicSerializer(read_only=True)

    class Meta:
        model = Video
        fields = [
            "id",
            "uuid",
            "title",
            "thumbnail_url",
            "upload_date",
            "uploader",
            "views",
            "likes",
            "duration",
        ]
        read_only_fields = fields


class VideoDetailSerializer(serializers.ModelSerializer):
    uploader = UserBasicSerializer(read_only=True)
    is_liked = serializers.SerializerMethodField()
    frontend_url = serializers.SerializerMethodField()

    class Meta:
        model = Video
        fields = [
            "id",
            "uuid",
            "title",
            "description",
            "category",
            "visibility",
            "video_url",
            "thumbnail_url",
            "upload_date",
            "uploader",
            "views",
            "likes",
            "duration",
            "view_limit",
            "auto_private_after",
            "is_liked",
            "frontend_url",
        ]
        read_only_fields = fields

    def get_is_liked(self, obj):
        liked_ids = self.context.get("liked_video_ids")
        if liked_ids is not None:
            return obj.id in liked_ids
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return VideoLike.objects.filter(video=obj, user=request.user).exists()
        return False

    def get_frontend_url(self, obj):
        frontend_url = self.context.get("frontend_url") or settings.FRONTEND_URL
        return f"{frontend_url}/video/{obj.uuid}"


class VideoViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoView
        fields = ["id", "video", "viewer", "viewed_at"]
        read_only_fields = ["viewed_at"]


class VideoLikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoLike
        fields = ["id", "video", "user", "liked_at"]
        read_only_fields = ["liked_at"]


class VideoShareSerializer(serializers.ModelSerializer):
    share_url = serializers.SerializerMethodField()

    class Meta:
        model = VideoShare
        fields = [
            "id",
            "video",
            "created_by",
            "share_token",
            "created_at",
            "access_count",
            "active",
            "share_url",
        ]
        read_only_fields = ["created_at", "access_count", "share_token"]

    def get_share_url(self, obj):
        frontend_url = self.context.get("frontend_url") or settings.FRONTEND_URL
        return f"{frontend_url}/video/{obj.share_token}"


class UserPointsSerializer(serializers.ModelSerializer):
    points_value = serializers.SerializerMethodField()
    conversion_rate = serializers.SerializerMethodField()

    class Meta:
        model = ViewerProfile
        fields = [
            "points",
            "points_earned",
            "points_redeemed",
            "points_value",
            "conversion_rate",
        ]
        read_only_fields = fields

    def get_points_value(self, obj):
        return obj.calculate_points_value()

    def get_conversion_rate(self, obj):
        return 10


class AdminPointsSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    points_value = serializers.SerializerMethodField()
    conversion_rate = serializers.SerializerMethodField()

    class Meta:
        model = ViewerProfile
        fields = [
            "user",
            "points",
            "points_earned",
            "points_redeemed",
            "points_value",
            "conversion_rate",
        ]
        read_only_fields = fields

    def get_points_value(self, obj):
        return obj.calculate_points_value()

    def get_conversion_rate(self, obj):
        return 10


class WebcamRecordingSerializer(serializers.ModelSerializer):
    recorder = UserBasicSerializer(read_only=True)
    video = VideoFeedSerializer(read_only=True)
    video_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = WebcamRecording
        fields = [
            "id",
            "video",
            "video_id",
            "recorder",
            "filename",
            "recording_date",
            "upload_status",
            "upload_completed_at",
            "recording_url",
            "thumbnail_url",
            "analysis_status",
            "analysis_error",
        ]
        read_only_fields = fields


class VideoEmotionSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoEmotionSummary
        fields = [
            "distribution",
            "timeline",
            "total_frames",
            "analyzed_recordings",
            "updated_at",
        ]
        read_only_fields = fields


class EmotionRecordingSerializer(serializers.ModelSerializer):
    recording_id = serializers.IntegerField(source="id")

    class Meta:
        model = WebcamRecording
        fields = [
            "recording_id",
            "filename",
            "recording_date",
            "analysis_status",
        ]
        read_only_fields = fields


class NotificationSerializer(serializers.ModelSerializer):
    relative_time = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "data",
            "is_read",
            "is_archived",
            "created_at",
            "read_at",
            "relative_time",
        ]
        read_only_fields = fields

    def get_relative_time(self, obj):
        return self._relative_time(obj.created_at)

    @staticmethod
    def _relative_time(dt):
        from django.utils import timezone
        now = timezone.now()
        diff = now - dt
        if diff.total_seconds() < 0:
            return "just now"
        if diff.days > 0:
            return f"{diff.days}d ago"
        hours = diff.seconds // 3600
        if hours > 0:
            return f"{hours}h ago"
        minutes = diff.seconds // 60
        if minutes > 0:
            return f"{minutes}m ago"
        return "just now"


class UnreadCountSerializer(serializers.Serializer):
    count = serializers.IntegerField()


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotificationPreference
        fields = [
            "email_notifications",
            "push_notifications",
            "in_app_notifications",
            "marketing_notifications",
            "security_notifications",
            "quiet_hours_start",
            "quiet_hours_end",
            "digest_frequency",
        ]


class AnalysisRunLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisRunLog
        fields = [
            "id",
            "trigger",
            "status",
            "processed",
            "total",
            "error",
            "started_at",
            "finished_at",
        ]
        read_only_fields = fields


class SurveyQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyQuestion
        fields = [
            "id",
            "question_text",
            "question_type",
            "options",
            "order",
            "is_required",
            "is_active",
            "section",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class FeedbackResponseSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    video_title = serializers.SerializerMethodField()

    class Meta:
        model = FeedbackResponse
        fields = [
            "id",
            "user",
            "video",
            "video_title",
            "responses",
            "rating",
            "is_anonymous",
            "is_bug_report",
            "consent_to_improve",
            "source",
            "submitted_at",
            "completed_at",
        ]
        read_only_fields = ["id", "submitted_at"]

    def get_video_title(self, obj):
        return obj.video.title if obj.video else None


class FeedbackSubmitSerializer(serializers.Serializer):
    video = serializers.IntegerField(required=False, allow_null=True)
    responses = serializers.JSONField(default=dict)
    rating = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=5)
    is_anonymous = serializers.BooleanField(default=False)
    is_bug_report = serializers.BooleanField(default=False)
    consent_to_improve = serializers.BooleanField(default=False)
    source = serializers.ChoiceField(choices=FeedbackResponse.FEEDBACK_SOURCES, default="post_analysis")


class FeedbackAnalyticsSerializer(serializers.Serializer):
    total_responses = serializers.IntegerField()
    average_rating = serializers.FloatField()
    rating_distribution = serializers.DictField(child=serializers.IntegerField())
    completion_rate = serializers.FloatField()
    bug_report_count = serializers.IntegerField()
    consent_rate = serializers.FloatField()
    recent_trend = serializers.ListField(child=serializers.DictField())


class UserManagementSerializer(serializers.ModelSerializer):
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "date_joined",
            "last_login",
            "company_name",
            "photo_url",
            "devices",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]

    def get_company_name(self, obj):
        if obj.role == "company" and hasattr(obj, "company_profile"):
            return obj.company_profile.company_name
        return None


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    company_name = serializers.CharField(required=False, allow_blank=True)
    photo_url = serializers.URLField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "role",
            "password",
            "is_active",
            "company_name",
            "photo_url",
        ]

    def create(self, validated_data):
        company_name = validated_data.pop("company_name", "")
        password = validated_data.pop("password", None)
        firebase_uid = validated_data.pop("firebase_uid", "")
        if not firebase_uid:
            firebase_uid = f"managed_{uuid.uuid4().hex[:24]}"
        user = User(firebase_uid=firebase_uid, **validated_data)
        if password:
            user.set_password(password)
        user.save()
        if validated_data.get("role") == "company" and company_name:
            CompanyProfile.objects.create(user=user, company_name=company_name)
        return user


class UploadRequestListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = UploadRequest
        fields = [
            "id",
            "title",
            "category",
            "status",
            "status_display",
            "created_at",
            "updated_at",
            "submitted_at",
            "reviewed_at",
            "completed_at",
        ]
        read_only_fields = fields


class UploadRequestDetailSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    company_email = serializers.EmailField(source="company.email", read_only=True)
    company_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    video_id = serializers.IntegerField(source="video.id", read_only=True, allow_null=True)
    status_logs = serializers.SerializerMethodField()

    class Meta:
        model = UploadRequest
        fields = [
            "id",
            "title",
            "description",
            "category",
            "filename",
            "status",
            "status_display",
            "admin_comment",
            "rejection_reason",
            "suggestions",
            "company_email",
            "company_name",
            "reviewed_by_name",
            "video_id",
            "submitted_at",
            "reviewed_at",
            "completed_at",
            "created_at",
            "updated_at",
            "status_logs",
        ]
        read_only_fields = fields

    def get_company_name(self, obj):
        if hasattr(obj.company, "company_profile"):
            return obj.company.company_profile.company_name
        return None

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.email
        return None

    def get_status_logs(self, obj):
        logs = obj.status_logs.all().select_related("changed_by")
        return [
            {
                "from_status": log.from_status,
                "to_status": log.to_status,
                "changed_by": log.changed_by.get_full_name() or log.changed_by.email if log.changed_by else None,
                "comment": log.comment,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ]


class UploadRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadRequest
        fields = ["title", "description", "category", "filename"]


class UploadRequestActionSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True, default="")
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default="")
    suggestions = serializers.CharField(required=False, allow_blank=True, default="")
