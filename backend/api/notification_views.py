from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import IsAdmin
from api.serializers import (
    NotificationSerializer,
    NotificationPreferenceSerializer,
    UnreadCountSerializer,
)
from api.services.notification_service import NotificationService
from api.models import UserNotificationPreference, Notification
from api.utils import safe_int_param


class UnreadNotificationCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = NotificationService.get_unread_count(request.user)
        return Response({"count": count})


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = safe_int_param(request, "limit", 20, 1, 50)
        offset = safe_int_param(request, "offset", 0, 0)
        unread_only = request.query_params.get("unread_only", "").lower() == "true"
        notification_type = request.query_params.get("type", None)

        notifications, total = NotificationService.get_notifications(
            request.user,
            limit=limit,
            offset=offset,
            unread_only=unread_only,
            notification_type=notification_type,
        )
        serializer = NotificationSerializer(notifications, many=True)
        return Response({
            "results": serializer.data,
            "total": total,
            "limit": limit,
            "offset": offset,
        })


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        notification = NotificationService.mark_as_read(notification_id, request.user)
        if notification is None:
            return Response(
                {"detail": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(NotificationSerializer(notification).data)


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = NotificationService.mark_all_as_read(request.user)
        return Response({"updated": updated})


class NotificationDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, notification_id):
        deleted = NotificationService.delete_notification(notification_id, request.user)
        if not deleted:
            return Response(
                {"detail": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationDeleteAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        deleted = NotificationService.delete_all_notifications(request.user)
        return Response({"deleted": deleted})


class NotificationArchiveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        notification = NotificationService.archive_notification(
            notification_id, request.user
        )
        if notification is None:
            return Response(
                {"detail": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(NotificationSerializer(notification).data)


class NotificationPreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pref, _ = UserNotificationPreference.objects.get_or_create(user=request.user)
        return Response(NotificationPreferenceSerializer(pref).data)

    def put(self, request):
        pref, _ = UserNotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminNotificationListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        limit = safe_int_param(request, "limit", 50, 1, 200)
        offset = safe_int_param(request, "offset", 0, 0)
        recipient_id = request.query_params.get("recipient_id", None)

        qs = Notification.objects.all()
        if recipient_id:
            qs = qs.filter(recipient_id=recipient_id)
        total = qs.count()
        notifications = qs.select_related("recipient")[offset : offset + limit]
        serializer = NotificationSerializer(notifications, many=True, context={"reveal_recipient": True})
        return Response({
            "results": serializer.data,
            "total": total,
            "limit": limit,
            "offset": offset,
        })
