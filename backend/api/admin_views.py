import logging
from django.db.models import Count
from django.http import Http404
from django.shortcuts import get_object_or_404

from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from firebase_admin import auth as firebase_auth

from api.models import User, Video, CompanyProfile, ViewerProfile, WebcamRecording, UploadRequest
from django.db.models import Sum, Q
from api.serializers import (
    UserSerializer,
    UserSearchSerializer,
    AdminActionSerializer,
    VideoSerializer,
    VideoFeedSerializer,
    WebcamRecordingSerializer,
    AdminPointsSerializer,
    UserManagementSerializer,
    UserCreateSerializer,
    UploadRequestListSerializer,
    UploadRequestDetailSerializer,
    UploadRequestActionSerializer,
)
from api.permissions import IsAdmin
from api.services.azure_storage_service import AzureStorageService
from api.services.cache_service import CacheService
from api.services.emotion_analysis_service import EmotionAnalysisService
from api.services.notification_service import NotificationService
from api.services.upload_request_service import UploadRequestService
from api.utils import safe_int_param

logger = logging.getLogger(__name__)


class UserSearchView(generics.GenericAPIView):
    """API endpoint to search for users by email. Only accessible by admin users."""

    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = UserSerializer

    def get(self, request):
        params_serializer = UserSearchSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        email = params_serializer.validated_data["email"].strip().lower()

        try:
            user = User.objects.get(email__iexact=email)
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )


class PromoteToAdminView(generics.CreateAPIView):
    """API endpoint to promote a user to admin role. Only accessible by admin users."""

    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = AdminActionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        current_user = request.user

        try:
            firebase_auth.get_user(current_user.firebase_uid)

            target_user_id = serializer.validated_data.get("user_id")
            target_user = get_object_or_404(User, id=target_user_id)

            if target_user.role == "admin":
                return Response(
                    {"message": "User is already an admin"}, status=status.HTTP_200_OK
                )

            # Store old role to handle profile changes
            old_role = target_user.role

            # Update role in database
            target_user.role = "admin"
            target_user.save()

            if old_role == "company":
                CompanyProfile.objects.filter(user=target_user).delete()
            elif old_role == "user":
                ViewerProfile.objects.filter(user=target_user).delete()

            NotificationService.create_notification(
                recipient=target_user,
                notification_type="user_promoted",
                title="You are now an admin!",
                message=f"You have been promoted to admin by {request.user.get_full_name() or request.user.email}.",
                data={"promoted_by": request.user.id},
            )

            return Response(
                {
                    "message": f"Successfully promoted {target_user.email} to admin",
                    "user": UserSerializer(target_user).data,
                }
            )

        except Http404:
            raise
        except Exception as e:
            error_str = str(e).lower()
            if "firebase" in error_str or "auth" in error_str:
                logger.error(f"Firebase auth error during promotion: {e}")
                return Response(
                    {"error": "Firebase authentication failed. Please try again."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            logger.exception(f"Unexpected error during promotion: {e}")
            return Response(
                {"error": "An unexpected error occurred during promotion."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class VideoManagementView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = VideoSerializer
    queryset = Video.objects.select_related("uploader").all().order_by("-upload_date")

    def get(self, request, video_id=None):
        if video_id:
            video = self.get_object_by_id(video_id)
            serializer = self.get_serializer(video)
            return Response(serializer.data)
        else:
            limit = safe_int_param(request, "limit", 50, 1, 200)
            offset = safe_int_param(request, "offset", 0, 0)
            videos = self.get_queryset()[offset:offset + limit]
            serializer = self.get_serializer(videos, many=True)
            return Response(serializer.data)

    def patch(self, request, video_id):
        video = self.get_object_by_id(video_id)
        serializer = self.get_serializer(video, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            CacheService.invalidate_video_lists()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, video_id):
        video = self.get_object_by_id(video_id)
        video.delete()
        CacheService.invalidate_video_lists()
        return Response(
            {"message": "Video successfully deleted"}, status=status.HTTP_204_NO_CONTENT
        )

    def get_object_by_id(self, video_id):
        """Helper method to get a video by ID with proper error handling"""
        return get_object_or_404(Video, id=video_id)


class VideoStatsView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def retrieve(self, request, *args, **kwargs):
        total_videos = Video.objects.count()
        public_videos = Video.objects.filter(visibility="public").count()
        private_videos = Video.objects.filter(visibility="private").count()
        unlisted_videos = Video.objects.filter(visibility="unlisted").count()

        categories = (
            Video.objects.exclude(category="")
            .values("category")
            .annotate(count=Count("id"))
        )

        most_viewed = Video.objects.select_related("uploader").order_by("-views")[:5]
        most_viewed_serializer = VideoFeedSerializer(most_viewed, many=True)

        most_liked = Video.objects.select_related("uploader").order_by("-likes")[:5]
        most_liked_serializer = VideoFeedSerializer(most_liked, many=True)

        recent_videos = Video.objects.select_related("uploader").order_by("-upload_date")[:5]
        recent_serializer = VideoFeedSerializer(recent_videos, many=True)

        return Response(
            {
                "total_videos": total_videos,
                "visibility": {
                    "public": public_videos,
                    "private": private_videos,
                    "unlisted": unlisted_videos,
                },
                "categories": categories,
                "most_viewed": most_viewed_serializer.data,
                "most_liked": most_liked_serializer.data,
                "recent": recent_serializer.data,
            }
        )


class WebcamRecordingsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = WebcamRecordingSerializer
    queryset = (
        WebcamRecording.objects.all()
        .select_related("video", "recorder", "video__uploader")
        .order_by("-recording_date")
    )

    def get_queryset(self):
        queryset = super().get_queryset()

        user_id = self.request.query_params.get("user_id")
        video_id = self.request.query_params.get("video_id")
        status = self.request.query_params.get("status")

        if user_id:
            queryset = queryset.filter(recorder_id=user_id)

        if video_id:
            queryset = queryset.filter(video_id=video_id)

        if status:
            queryset = queryset.filter(upload_status=status)

        limit = safe_int_param(self.request, "limit", 50, 1, 200)
        offset = safe_int_param(self.request, "offset", 0, 0)
        return queryset[offset:offset + limit]


class DeleteWebcamRecordingView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = WebcamRecording.objects.all()
    lookup_url_kwarg = "recording_id"

    def destroy(self, request, *args, **kwargs):
        recording = self.get_object()
        recording_id = recording.id
        video_id = recording.video_id

        AzureStorageService.delete_blob_from_url(recording.recording_url)
        if recording.thumbnail_url:
            AzureStorageService.delete_blob_from_url(recording.thumbnail_url)

        recording.delete()

        EmotionAnalysisService._aggregate_video(video_id)

        return Response(
            {"message": f"Recording {recording_id} deleted successfully"},
            status=status.HTTP_200_OK,
        )


class AdminPointsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = AdminPointsSerializer

    def get(self, request):
        limit = safe_int_param(request, "limit", 50, 1, 200)
        offset = safe_int_param(request, "offset", 0, 0)

        base_qs = ViewerProfile.objects.select_related("user").filter(
            user__role="user", points__gt=0
        )
        total = base_qs.count()
        page = base_qs.order_by("-points")[offset:offset + limit]

        aggregate = base_qs.aggregate(
            total_points=Sum("points"),
        )

        total_points = aggregate["total_points"] or 0
        serializer = self.get_serializer(page, many=True)
        return Response({
            "profiles": serializer.data,
            "total": total,
            "total_users": total,
            "total_points": total_points,
            "total_points_value": total_points * ViewerProfile.POINTS_VALUE_RATE,
        })


class AdminUploadRequestListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        limit = safe_int_param(request, "limit", 50, 1, 200)
        offset = safe_int_param(request, "offset", 0, 0)
        status_filter = request.query_params.get("status", None)
        search = request.query_params.get("search", None)
        company_id = request.query_params.get("company_id", None)

        requests, total = UploadRequestService.get_all_requests(
            status=status_filter,
            search=search,
            company_id=company_id,
            limit=limit,
            offset=offset,
        )
        serializer = UploadRequestListSerializer(requests, many=True)
        return Response({
            "results": serializer.data,
            "total": total,
            "limit": limit,
            "offset": offset,
        })


class AdminUploadRequestDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, request_id):
        upload_request = UploadRequestService.get_request_detail(request_id, request.user)
        if not upload_request:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UploadRequestDetailSerializer(upload_request)
        return Response(serializer.data)


class AdminUploadRequestApproveView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, request_id):
        upload_request = UploadRequestService.get_request_detail(request_id, request.user)
        if not upload_request:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UploadRequestActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated = UploadRequestService.approve(
                upload_request,
                request.user,
                comment=serializer.validated_data.get("comment", ""),
            )
            result = UploadRequestDetailSerializer(updated).data
            return Response(result)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminUploadRequestRejectView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, request_id):
        upload_request = UploadRequestService.get_request_detail(request_id, request.user)
        if not upload_request:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UploadRequestActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated = UploadRequestService.reject(
                upload_request,
                request.user,
                rejection_reason=serializer.validated_data.get("rejection_reason", ""),
                suggestions=serializer.validated_data.get("suggestions", ""),
                comment=serializer.validated_data.get("comment", ""),
            )
            result = UploadRequestDetailSerializer(updated).data
            return Response(result)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminUploadRequestArchiveView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, request_id):
        upload_request = UploadRequestService.get_request_detail(request_id, request.user)
        if not upload_request:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            updated = UploadRequestService.archive(upload_request, request.user)
            result = UploadRequestDetailSerializer(updated).data
            return Response(result)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminUserManagementView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        limit = safe_int_param(request, "limit", 50, 1, 200)
        offset = safe_int_param(request, "offset", 0, 0)
        search = request.query_params.get("search", None)
        role_filter = request.query_params.get("role", None)
        status_filter = request.query_params.get("status", None)
        sort_by = request.query_params.get("sort_by", "-date_joined")

        qs = User.objects.all().select_related("company_profile")

        if search:
            qs = qs.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(company_profile__company_name__icontains=search)
            )

        if role_filter and role_filter != "all":
            qs = qs.filter(role=role_filter)

        if status_filter == "active":
            qs = qs.filter(is_active=True)
        elif status_filter == "inactive":
            qs = qs.filter(is_active=False)

        allowed_sorts = {
            "email": "email",
            "-email": "-email",
            "first_name": "first_name",
            "-first_name": "-first_name",
            "role": "role",
            "-role": "-role",
            "date_joined": "date_joined",
            "-date_joined": "-date_joined",
            "last_login": "last_login",
            "-last_login": "-last_login",
        }
        order = allowed_sorts.get(sort_by, "-date_joined")

        total = qs.count()
        users = qs.order_by(order)[offset:offset + limit]
        serializer = UserManagementSerializer(users, many=True)
        return Response({
            "results": serializer.data,
            "total": total,
            "limit": limit,
            "offset": offset,
        })

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            from firebase_admin import auth as firebase_auth
        except ImportError:
            logger.warning("Firebase Admin SDK not available, creating Django user only")
            user = serializer.save()
            result = UserManagementSerializer(user).data
            return Response(result, status=status.HTTP_201_CREATED)

        email = serializer.validated_data.get("email")
        password = serializer.validated_data.get("password") or ""
        first_name = serializer.validated_data.get("first_name", "")
        last_name = serializer.validated_data.get("last_name", "")
        role = serializer.validated_data.get("role", "user")

        try:
            fb_user = firebase_auth.create_user(
                email=email,
                password=password,
                display_name=f"{first_name} {last_name}".strip(),
                email_verified=True,
            )
        except Exception as e:
            logger.error(f"Failed to create Firebase user: {e}")
            return Response(
                {"detail": f"Failed to create Firebase account: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer.validated_data["firebase_uid"] = fb_user.uid
        user = serializer.save()

        NotificationService.create_notification(
            recipient=user,
            notification_type="system_announcement",
            title="Account Created",
            message=f"Your account has been created by an administrator.",
        )

        result = UserManagementSerializer(user).data
        return Response(result, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, user_id):
        user = get_object_or_404(User.objects.select_related("company_profile"), id=user_id)
        serializer = UserManagementSerializer(user)
        return Response(serializer.data)

    def patch(self, request, user_id):
        user = get_object_or_404(User, id=user_id)

        allowed_fields = ["first_name", "last_name", "email", "role", "is_active"]
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}

        if "role" in update_data:
            if user.id == request.user.id and update_data["role"] != "admin":
                return Response(
                    {"error": "You cannot change your own role."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            old_role = user.role
            new_role = update_data["role"]
            if old_role == "company" and new_role != "company":
                CompanyProfile.objects.filter(user=user).delete()
            elif old_role == "user" and new_role != "user":
                ViewerProfile.objects.filter(user=user).delete()
            if old_role != "company" and new_role == "company":
                CompanyProfile.objects.get_or_create(user=user)

        serializer = UserManagementSerializer(user, data=update_data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()

        return Response(serializer.data)

    def delete(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        if user.id == request.user.id:
            return Response(
                {"error": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        firebase_uid = user.firebase_uid
        user.delete()
        try:
            from firebase_admin import auth as firebase_auth
            firebase_auth.delete_user(firebase_uid)
        except Exception:
            logger.warning(f"Failed to delete Firebase user {firebase_uid}")
        return Response({"message": "User deleted successfully."}, status=status.HTTP_200_OK)


class AdminUserActivateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        user.is_active = True
        user.save(update_fields=["is_active"])
        try:
            from firebase_admin import auth as firebase_auth
            firebase_auth.update_user(user.firebase_uid, disabled=False)
        except Exception:
            logger.warning(f"Failed to enable Firebase user {user.firebase_uid}")
        return Response({"message": "User activated successfully."})


class AdminUserDeactivateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        if user.id == request.user.id:
            return Response(
                {"error": "You cannot deactivate your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=["is_active"])
        try:
            from firebase_admin import auth as firebase_auth
            firebase_auth.update_user(user.firebase_uid, disabled=True)
        except Exception:
            logger.warning(f"Failed to disable Firebase user {user.firebase_uid}")
        return Response({"message": "User deactivated successfully."})


class AdminUserBulkActionView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        action = request.data.get("action")
        user_ids = request.data.get("user_ids", [])

        if not action or not user_ids:
            return Response(
                {"detail": "action and user_ids are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_ids = [uid for uid in user_ids if uid != request.user.id]

        if action == "activate":
            users = User.objects.filter(id__in=user_ids)
            count = users.update(is_active=True)
            for u in users:
                try:
                    from firebase_admin import auth as firebase_auth
                    firebase_auth.update_user(u.firebase_uid, disabled=False)
                except Exception:
                    pass
            updated = count
        elif action == "deactivate":
            users = User.objects.filter(id__in=user_ids)
            count = users.update(is_active=False)
            for u in users:
                try:
                    from firebase_admin import auth as firebase_auth
                    firebase_auth.update_user(u.firebase_uid, disabled=True)
                except Exception:
                    pass
            updated = count
        elif action == "delete":
            users = User.objects.filter(id__in=user_ids)
            firebase_uids = list(users.values_list("firebase_uid", flat=True))
            updated = users.count()
            users.delete()
            for uid in firebase_uids:
                try:
                    from firebase_admin import auth as firebase_auth
                    firebase_auth.delete_user(uid)
                except Exception:
                    pass
        else:
            return Response(
                {"detail": f"Unknown action: {action}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"message": f"Action '{action}' applied to {updated} user(s)."})


class AdminCompanyListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        companies = User.objects.filter(role="company").values("id", "email", "first_name", "last_name")
        return Response(list(companies))
