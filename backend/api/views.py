import uuid
import logging
import threading
from django.conf import settings
from django.db.models import F, Max
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response

logger = logging.getLogger(__name__)

# Constants
AUTH_REQUIRED_MESSAGE = "Authentication required"

from api.models import (
    ViewerProfile,
    Video,
    VideoView,
    VideoLike,
    VideoShare,
    WebcamRecording,
    EmotionFrame,
    VideoEmotionSummary,
    AnalysisRunLog,
    EMOTION_CLASSES,
    UploadRequest,
)
from api.serializers import (
    FilenameSerializer,
    OnboardingSerializer,
    VideoSerializer,
    VideoFeedSerializer,
    VideoDetailSerializer,
    VideoShareSerializer,
    UserPointsSerializer,
    VideoSearchQuerySerializer,
    CategoryQuerySerializer,
    VideoEmotionSummarySerializer,
    AnalysisRunLogSerializer,
    WebcamRecordingSerializer,
    UploadRequestListSerializer,
    UploadRequestDetailSerializer,
    UploadRequestCreateSerializer,
)
from api.services import (
    PointsService,
    VideoUploadService,
    WebcamUploadService,
    VideoViewService,
    VideoLikeService,
    VideoShareService,
    EmotionAnalysisService,
)
from api.utils import safe_int_param
from api.permissions import IsAdmin, IsCompanyOrAdmin, IsCompanyOrAdminOrOwner
from api.services.cache_service import CacheService
from api.services.upload_request_service import UploadRequestService


class OnboardingAPIView(generics.UpdateAPIView):
    """API endpoint for handling user onboarding and providing recommendations."""

    permission_classes = [IsAuthenticated]
    serializer_class = OnboardingSerializer

    def get_object(self):
        viewer_profile, _ = ViewerProfile.objects.get_or_create(user=self.request.user)
        return viewer_profile

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.validated_data["onboarding_completed"] = True
        serializer.save()

        # Generate video recommendations based on updated preferences
        limit = safe_int_param(request, "limit", 10, 1, 50)
        recommendations = Video.get_recommendations_for_user(request.user, limit)

        # Create response with profile and recommendations
        response_data = {
            "profile": serializer.data,
            "recommendations": VideoFeedSerializer(recommendations, many=True).data,
        }

        return Response(response_data, status=status.HTTP_200_OK)

    def get(self, request, *args, **kwargs):
        """Get user profile and recommendations."""
        profile = self.get_object()
        profile_serializer = self.get_serializer(profile)

        # Generate video recommendations
        limit = safe_int_param(request, "limit", 10, 1, 50)
        recommendations = Video.get_recommendations_for_user(request.user, limit)

        # Create response with profile and recommendations
        response_data = {
            "profile": profile_serializer.data,
            "recommendations": VideoFeedSerializer(recommendations, many=True).data,
        }

        return Response(response_data, status=status.HTTP_200_OK)

    def handle_exception(self, exc):
        """Convert any authentication-related exceptions to 401 status."""
        if isinstance(exc, (AuthenticationFailed, PermissionError)):
            return Response(
                {"error": AUTH_REQUIRED_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED
            )
        return super().handle_exception(exc)


class VideoFeedView(generics.ListAPIView):
    """List all publicly available videos for feed."""

    serializer_class = VideoFeedSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        limit = safe_int_param(self.request, "limit", 50, 1, 100)
        offset = safe_int_param(self.request, "offset", 0, 0)
        return CacheService.cached_feed(limit, offset, lambda: Video._public_available_qs())


class VideoDetailView(generics.RetrieveAPIView):
    """Retrieve detailed information about a specific video."""

    queryset = Video.objects.all()
    serializer_class = VideoDetailSerializer
    permission_classes = [AllowAny]
    lookup_url_kwarg = "video_identifier"

    def get_video_by_id(self, video_id):
        """Get video by numeric ID."""
        return get_object_or_404(Video, id=int(video_id))

    def get_video_by_token(self, token):
        """Get video by share token and update access count."""
        share = get_object_or_404(VideoShare, share_token=token, active=True)

        share.access_count = F("access_count") + 1
        share.save(update_fields=["access_count"])

        self._via_share_token = True
        return share.video

    def is_valid_uuid(self, identifier):
        try:
            uuid.UUID(identifier, version=4)
            return True
        except ValueError:
            return False

    def get_object(self):
        self._via_share_token = False
        identifier = self.kwargs.get(self.lookup_url_kwarg)
        if not identifier:
            raise Http404("Video identifier is required")

        # Case 1: Numeric ID
        if identifier.isdigit():
            video = self.get_video_by_id(identifier)
            is_available = self.check_video_availability(video)
            if not is_available:
                return Response(
                    {"error": "This video is no longer available"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return video

        # Case 2: Video UUID or share token
        if self.is_valid_uuid(identifier):
            try:
                video = get_object_or_404(Video, uuid=identifier)
                return video
            except Http404:
                pass
            try:
                video = self.get_video_by_token(identifier)
                return video
            except Http404:
                raise Http404("Video not found")

        # Case 3: Invalid format
        raise Http404("Invalid video identifier format")

    def check_video_availability(self, video):
        """Check if the video is available for viewing."""
        # Share token grants access only for public and unlisted videos
        if getattr(self, '_via_share_token', False):
            return video.visibility != "private"

        # Admin users can always view videos
        if self.request.user.is_authenticated and self.request.user.role == "admin":
            return True

        # Owner can view their own videos regardless of visibility
        if self.request.user.is_authenticated and video.uploader == self.request.user:
            return True

        # Checking if video is private
        if video.visibility == "private":
            return False

        return True

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["frontend_url"] = settings.FRONTEND_URL
        return context

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()

            if isinstance(instance, Response):
                return instance

            if isinstance(instance, Video) and not self.check_video_availability(
                instance
            ):
                return Response(
                    {"error": "This video is no longer available"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Http404 as e:
            logger.error("Http404 exception occurred: %s", str(e))
            return Response({"error": "Resource not found"}, status=status.HTTP_404_NOT_FOUND)


class RecordVideoViewAPI(generics.CreateAPIView):
    """Record a view for a video."""

    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        video_id = kwargs.get("video_id")
        
        # Use VideoViewService to handle the business logic
        _, new_view_count, privacy_changed = VideoViewService.record_view(
            video_id, request.user
        )
        
        # If the view_count is None, it means the video is private and inaccessible
        if new_view_count is None:
            return Response(
                {"error": "Video is private"}, status=status.HTTP_403_FORBIDDEN
            )

        if privacy_changed:
            CacheService.invalidate_video_lists()

        return Response(
            {
                "success": True,
                "message": "View recorded",
                "views": new_view_count,
                "privacy_changed": privacy_changed,
            },
            status=status.HTTP_200_OK,
        )


class ToggleVideoLikeAPI(generics.CreateAPIView):
    """Toggle like status for a video."""

    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        video_id = kwargs.get("video_id")
        
        # Use VideoLikeService to handle the business logic
        video, liked, like_count = VideoLikeService.toggle_like(video_id, request.user)
        
        if not video:
            return Response(
                {"error":AUTH_REQUIRED_MESSAGE},
                status=status.HTTP_401_UNAUTHORIZED
            )

        CacheService.invalidate_video_lists()

        return Response(
            {
                "liked": liked,
                "message": f"Video {'liked' if liked else 'unliked'} successfully.",
                "likes": like_count,
            }
        )

    def handle_exception(self, exc):
        if isinstance(exc, (AuthenticationFailed, PermissionError)):
            return Response(
                {"error": AUTH_REQUIRED_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED
            )
        return super().handle_exception(exc)


class CreateVideoShareAPI(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VideoShareSerializer

    def create(self, request, *args, **kwargs):
        video_id = kwargs.get("video_id")

        share = VideoShareService.create_share(video_id, request.user)

        if share is None:
            return Response(
                {"error": "This video cannot be shared because it is private."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(
            share, context={"request": request, "frontend_url": settings.FRONTEND_URL}
        )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def handle_exception(self, exc):
        if isinstance(exc, (AuthenticationFailed, PermissionError)):
            return Response(
                {"error": AUTH_REQUIRED_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED
            )
        return super().handle_exception(exc)


class UserHistoryAPI(generics.ListAPIView):
    """List videos the user has viewed."""

    permission_classes = [IsAuthenticated]
    serializer_class = VideoDetailSerializer

    def get_queryset(self):
        user = self.request.user
        limit = safe_int_param(self.request, "limit", 50, 1, 100)
        offset = safe_int_param(self.request, "offset", 0, 0)

        viewed_video_ids = (
            VideoView.objects.filter(viewer=user)
            .values("video_id")
            .annotate(last_viewed=Max("viewed_at"))
            .order_by("-last_viewed")
            .values_list("video_id", flat=True)
        )

        if offset > 0:
            viewed_video_ids = viewed_video_ids[offset:]

        return Video.objects.select_related("uploader").filter(id__in=viewed_video_ids)[:limit]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["frontend_url"] = settings.FRONTEND_URL
        return context

    def handle_exception(self, exc):
        """Convert any authentication-related exceptions to 401 status."""
        if isinstance(exc, (AuthenticationFailed, PermissionError)):
            return Response(
                {"error": AUTH_REQUIRED_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED
            )
        return super().handle_exception(exc)


class UserLikedVideosAPI(generics.ListAPIView):
    """List videos the user has liked."""

    permission_classes = [IsAuthenticated]
    serializer_class = VideoDetailSerializer

    def get_queryset(self):
        user = self.request.user
        limit = safe_int_param(self.request, "limit", 50, 1, 100)
        offset = safe_int_param(self.request, "offset", 0, 0)

        liked_video_ids = (
            VideoLike.objects.filter(user=user)
            .order_by("-liked_at")
            .values_list("video_id", flat=True)
        )

        if offset > 0:
            liked_video_ids = liked_video_ids[offset:]

        return Video.objects.select_related("uploader").filter(id__in=liked_video_ids)[:limit]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["frontend_url"] = settings.FRONTEND_URL
        return context


class UploadVideoView(generics.CreateAPIView):

    permission_classes = [IsAuthenticated, IsCompanyOrAdmin]
    serializer_class = VideoSerializer

    def create(self, request, *args, **kwargs):
        filename_serializer = FilenameSerializer(data=request.data)
        filename_serializer.is_valid(raise_exception=True)
        filename = filename_serializer.validated_data["filename"]

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # Use the service layer to prepare upload URLs and save metadata
            (
                video_upload_url,
                video_view_url,
                thumbnail_upload_url,
                thumbnail_view_url,
            ) = VideoUploadService.prepare_video_upload(filename)

            VideoUploadService.save_video_metadata(
                serializer, self.request.user, video_view_url, thumbnail_view_url
            )

            CacheService.invalidate_video_lists()

            return Response(
                {
                    "video_upload_url": video_upload_url,
                    "thumbnail_upload_url": thumbnail_upload_url,
                    "message": "SAS tokens generated successfully",
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            logger.error(f"An error occurred during video upload:{str(e)}", exc_info=True)
            return Response(
                {"error": "An internal error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class WebcamUploadView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        video_id = kwargs.get("video_id")
        video = get_object_or_404(Video, id=video_id)

        filename_serializer = FilenameSerializer(data=request.data)
        filename_serializer.is_valid(raise_exception=True)
        filename = filename_serializer.validated_data["filename"]

        try:
            upload_url, view_url = WebcamUploadService.prepare_webcam_upload(filename)
            if not upload_url:
                logger.error("WebcamUploadService.prepare_webcam_upload returned None — Azure may not be configured")
                return Response(
                    {"error": "Upload service is temporarily unavailable. Please try again later."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            recording = WebcamUploadService.create_webcam_recording(
                video, request.user, filename, view_url
            )
            if not recording:
                logger.error("WebcamUploadService.create_webcam_recording returned None")
                return Response(
                    {"error": "Failed to create recording entry. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            profile, points_awarded = PointsService.award_points_for_webcam_upload(
                request.user
            )

            return Response(
                {
                    "upload_url": upload_url,
                    "recording_id": recording.id,
                    "message": f"Successfully generated upload link. {points_awarded} points awarded.",
                    "total_points": profile.points,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            logger.error(f"An error occurred during webcam upload:{str(e)}", exc_info=True)
            return Response(
                {"error": "An internal error occurred. Please try again later."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VideoSearchView(generics.ListAPIView):
    serializer_class = VideoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        params_serializer = VideoSearchQuerySerializer(data=self.request.query_params)
        params_serializer.is_valid(raise_exception=True)
        filename = params_serializer.validated_data["filename"]

        parts = filename.split("?")[0].split("/")
        base_filename = parts[-1] if parts else filename

        videos = Video.objects.filter(video_url__contains=base_filename)

        if self.request.user.role != "admin":
            videos = videos.filter(uploader=self.request.user)

        if not videos:
            return videos

        limit = safe_int_param(self.request, "limit", 50, 1, 100)
        offset = safe_int_param(self.request, "offset", 0, 0)
        return videos[offset:offset + limit]


class UserPointsView(generics.RetrieveAPIView):

    permission_classes = [IsAuthenticated]
    serializer_class = UserPointsSerializer

    def get_object(self):
        profile, _ = ViewerProfile.objects.get_or_create(user=self.request.user)
        return profile

    def handle_exception(self, exc):
        if isinstance(exc, (AuthenticationFailed, PermissionError)):
            return Response(
                {"error": AUTH_REQUIRED_MESSAGE}, status=status.HTTP_401_UNAUTHORIZED
            )
        return super().handle_exception(exc)


class VideoRecommendationsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = VideoFeedSerializer

    def get_queryset(self):
        limit = safe_int_param(self.request, "limit", 20, 1, 50)
        offset = safe_int_param(self.request, "offset", 0, 0)
        user_id = self.request.user.pk
        return CacheService.cached_recommendations(
            user_id, limit, offset,
            lambda: Video.get_recommendations_for_user(self.request.user, limit, offset),
        )


class FeaturedCarouselVideosView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = VideoFeedSerializer

    def get_queryset(self):
        limit = safe_int_param(self.request, "limit", 5, 1, 10)
        return CacheService.cached_featured(
            limit,
            lambda: Video.get_featured_carousel_videos(limit),
        )


class CategoryVideosView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = VideoFeedSerializer

    def get_queryset(self):
        params_serializer = CategoryQuerySerializer(data=self.request.query_params)
        params_serializer.is_valid(raise_exception=True)
        qs = params_serializer.validated_data
        category = qs.get("category", "")
        limit = qs["limit"]
        offset = qs["offset"]

        return Video.get_category_videos(category, limit, offset)


class TrendingVideosView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = VideoFeedSerializer

    def get_queryset(self):
        limit = safe_int_param(self.request, "limit", 20, 1, 50)
        offset = safe_int_param(self.request, "offset", 0, 0)
        return CacheService.cached_trending(
            limit, offset,
            lambda: Video.get_trending_videos(limit, offset),
        )


class RecentVideosView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = VideoFeedSerializer

    def get_queryset(self):
        limit = safe_int_param(self.request, "limit", 20, 1, 50)
        offset = safe_int_param(self.request, "offset", 0, 0)

        return Video.get_recently_uploaded_videos(limit, offset)


class PopularVideosView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = VideoFeedSerializer

    def get_queryset(self):
        limit = safe_int_param(self.request, "limit", 20, 1, 50)
        offset = safe_int_param(self.request, "offset", 0, 0)

        return Video.get_popular_videos(limit, offset)


def _frame_to_dict(frame):
    return {
        "t": frame.t_seconds,
        "angry": frame.angry,
        "disgust": frame.disgust,
        "fear": frame.fear,
        "happy": frame.happy,
        "neutral": frame.neutral,
        "sad": frame.sad,
        "surprise": frame.surprise,
        "dominant": frame.dominant,
        "confidence": frame.confidence,
    }


class WebcamUploadCompleteView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, video_id, recording_id):
        try:
            Video.objects.get(id=video_id)
        except Video.DoesNotExist:
            return Response(
                {"error": "Video not found"}, status=status.HTTP_404_NOT_FOUND
            )

        recording = WebcamUploadService.mark_upload_complete(recording_id, request.user)
        if not recording:
            return Response(
                {"error": "Recording not found"}, status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            {"status": "completed", "upload_status": recording.upload_status}
        )


class RunEmotionAnalysisView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        def _run():
            try:
                EmotionAnalysisService.run(trigger="manual")
            except Exception:
                logger.exception("Manual emotion analysis run failed")
            finally:
                from django.db import close_old_connections

                close_old_connections()

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()
        return Response({"status": "started"}, status=status.HTTP_202_ACCEPTED)


class EmotionAnalysisStatusView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        run = AnalysisRunLog.objects.first()
        if not run:
            return Response(
                {"status": "idle", "processed": 0, "total": 0, "trigger": None}
            )
        return Response(AnalysisRunLogSerializer(run).data)


class VideoEmotionSummaryView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsCompanyOrAdminOrOwner]
    serializer_class = VideoEmotionSummarySerializer

    def get(self, request, video_id):
        video = get_object_or_404(Video, id=video_id)
        self.check_object_permissions(request, video)

        summary = getattr(video, "emotion_summary", None)
        if not summary:
            total_recordings = WebcamRecording.objects.filter(video=video).count()
            completed_recordings = WebcamRecording.objects.filter(
                video=video, upload_status="completed"
            ).count()
            failed_recordings = WebcamRecording.objects.filter(
                video=video, analysis_status="failed"
            ).count()
            no_faces_recordings = WebcamRecording.objects.filter(
                video=video, analysis_status="completed"
            ).exclude(emotion_frames__isnull=True).count()
            no_faces_recordings = WebcamRecording.objects.filter(
                video=video, analysis_status="completed"
            ).count() - no_faces_recordings
            return Response(
                {
                    "distribution": {e: 0.0 for e in EMOTION_CLASSES},
                    "timeline": [],
                    "total_frames": 0,
                    "analyzed_recordings": 0,
                    "total_recordings": total_recordings,
                    "completed_recordings": completed_recordings,
                    "failed_recordings": failed_recordings,
                    "no_faces_recordings": no_faces_recordings,
                }
            )
        return Response(VideoEmotionSummarySerializer(summary).data)


class VideoEmotionRecordingsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsCompanyOrAdminOrOwner]

    def get(self, request, video_id):
        video = get_object_or_404(Video, id=video_id)
        self.check_object_permissions(request, video)

        reveal_viewer = request.user.role == "admin"

        recordings = WebcamRecording.objects.filter(
            video=video
        ).prefetch_related("emotion_frames").order_by("-recording_date")

        data = []
        for recording in recordings:
            frames = list(recording.emotion_frames.all().order_by("t_seconds"))

            entry = {
                "recording_id": recording.id,
                "filename": recording.filename,
                "recording_url": recording.recording_url,
                "thumbnail_url": recording.thumbnail_url,
                "analysis_status": recording.analysis_status,
                "upload_status": recording.upload_status,
                "analysis_error": recording.analysis_error,
            }
            if reveal_viewer:
                entry["viewer_id"] = recording.recorder_id

            if frames:
                distribution = {e: 0.0 for e in EMOTION_CLASSES}
                for frame in frames:
                    for e in EMOTION_CLASSES:
                        distribution[e] += getattr(frame, e)
                distribution = {
                    e: round(distribution[e] / len(frames), 4) for e in EMOTION_CLASSES
                }

                timeline = [_frame_to_dict(f) for f in frames]
                duration = max((f.t_seconds for f in frames), default=0)

                entry["distribution"] = distribution
                entry["timeline"] = timeline
                entry["duration"] = round(duration, 2)
            else:
                entry["distribution"] = {e: 0.0 for e in EMOTION_CLASSES}
                entry["timeline"] = []
                entry["duration"] = 0

            data.append(entry)

        return Response(data)


class MyEmotionView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, video_id):
        video = get_object_or_404(Video, id=video_id)

        frames = EmotionFrame.objects.filter(
            video=video, viewer=request.user
        ).order_by("t_seconds")

        timeline = [_frame_to_dict(f) for f in frames]
        distribution = {e: 0.0 for e in EMOTION_CLASSES}
        for frame in frames:
            for e in EMOTION_CLASSES:
                distribution[e] += getattr(frame, e)
        if frames:
            distribution = {
                e: round(distribution[e] / len(frames), 4) for e in EMOTION_CLASSES
            }

        return Response({"distribution": distribution, "timeline": timeline})


class UserWebcamRecordingsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WebcamRecordingSerializer

    def get_queryset(self):
        return WebcamRecording.objects.filter(
            recorder=self.request.user
        ).select_related("video", "recorder", "video__uploader").order_by("-recording_date")


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from api.serializers import UserSerializer
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        from api.serializers import UserSerializer
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)


class UserDeviceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(request.user.devices or [])

    def post(self, request):
        device_id = request.data.get("id")
        device_name = request.data.get("name")
        if not device_id or not device_name:
            return Response(
                {"error": "id and name are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        devices = request.user.devices or []
        existing = next((d for d in devices if d.get("id") == device_id), None)
        now = timezone.now().isoformat()
        if existing:
            existing["name"] = device_name
            existing["lastActive"] = now
        else:
            if len([d for d in devices if d.get("id")]) >= 5:
                return Response(
                    {"error": "Maximum device limit reached (5). Please remove a device first.", "code": "MAX_DEVICES_REACHED"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            devices.append({"id": device_id, "name": device_name, "lastActive": now})
        request.user.devices = devices
        request.user.save(update_fields=["devices"])
        return Response(devices, status=status.HTTP_200_OK)

    def delete(self, request):
        device_id = request.query_params.get("device_id")
        if not device_id:
            return Response(
                {"error": "device_id query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        devices = request.user.devices or []
        devices = [d for d in devices if d.get("id") != device_id]
        request.user.devices = devices
        request.user.save(update_fields=["devices"])
        return Response(devices)


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db import connection
        from django.conf import settings

        checks = {}

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                checks["db"] = cursor.fetchone() is not None
        except Exception:
            checks["db"] = False

        try:
            firebase_admin = __import__("firebase_admin", fromlist=["credential"])
            checks["firebase"] = bool(firebase_admin._apps)
        except Exception:
            checks["firebase"] = False

        checks["azure"] = bool(settings.AZURE_STORAGE_ACCOUNT_NAME and settings.AZURE_STORAGE_ACCOUNT_KEY)
        checks["huggingface"] = bool(settings.HF_API_TOKEN)

        all_ok = all(checks.values())
        status_code = status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE

        response_data = {"status": "healthy" if all_ok else "degraded"}
        response_data.update(checks)

        return Response(response_data, status=status_code)


class UploadRequestListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyOrAdmin]

    def get(self, request):
        limit = safe_int_param(request, "limit", 50, 1, 200)
        offset = safe_int_param(request, "offset", 0, 0)
        status_filter = request.query_params.get("status", None)

        if request.user.role == "admin":
            requests, total = UploadRequestService.get_all_requests(
                status=status_filter, limit=limit, offset=offset
            )
        else:
            requests, total = UploadRequestService.get_company_requests(
                request.user, status=status_filter, limit=limit, offset=offset
            )

        serializer = UploadRequestListSerializer(requests, many=True)
        return Response({
            "results": serializer.data,
            "total": total,
            "limit": limit,
            "offset": offset,
        })

    def post(self, request):
        serializer = UploadRequestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        upload_request = UploadRequestService.create_draft(
            request.user, serializer.validated_data
        )
        result = UploadRequestDetailSerializer(upload_request).data
        return Response(result, status=status.HTTP_201_CREATED)


class UploadRequestDetailView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyOrAdmin]

    def get(self, request, request_id):
        upload_request = UploadRequestService.get_request_detail(request_id, request.user)
        if not upload_request:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if upload_request.company != request.user and request.user.role != "admin":
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UploadRequestDetailSerializer(upload_request)
        return Response(serializer.data)

    def patch(self, request, request_id):
        upload_request = UploadRequestService.get_request_detail(request_id, request.user)
        if not upload_request:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            updated = UploadRequestService.update_draft(
                upload_request, request.data, request.user
            )
            serializer = UploadRequestDetailSerializer(updated)
            return Response(serializer.data)
        except (PermissionError, ValueError) as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UploadRequestSubmitView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyOrAdmin]

    def post(self, request, request_id):
        upload_request = UploadRequestService.get_request_detail(request_id, request.user)
        if not upload_request:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            updated = UploadRequestService.submit(upload_request, request.user)
            serializer = UploadRequestDetailSerializer(updated)
            return Response(serializer.data)
        except (PermissionError, ValueError) as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UploadRequestCancelView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyOrAdmin]

    def post(self, request, request_id):
        upload_request = UploadRequestService.get_request_detail(request_id, request.user)
        if not upload_request:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            updated = UploadRequestService.cancel(upload_request, request.user)
            serializer = UploadRequestDetailSerializer(updated)
            return Response(serializer.data)
        except (PermissionError, ValueError) as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CompanyAnalyticsView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyOrAdmin]

    def get(self, request):
        if request.user.role == "admin":
            company_id = request.query_params.get("company_id", None)
            if company_id:
                company = get_object_or_404(User, id=company_id, role="company")
                data = UploadRequestService.get_company_analytics(company)
            else:
                data = UploadRequestService.get_company_analytics(request.user)
        else:
            data = UploadRequestService.get_company_analytics(request.user)

        return Response(data)
