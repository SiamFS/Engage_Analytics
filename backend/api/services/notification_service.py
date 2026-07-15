from django.db import transaction
from django.utils import timezone
from api.models import Notification, User


class NotificationService:

    @classmethod
    def create_notification(cls, recipient, notification_type, title, message, data=None):
        if not recipient or not recipient.is_active:
            return None

        pref = getattr(recipient, "notification_preferences", None)
        if pref and not pref.in_app_notifications:
            return None

        return Notification.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            message=message,
            data=data or {},
        )

    @classmethod
    def notify_admins(cls, notification_type, title, message, data=None):
        admins = User.objects.filter(role="admin", is_active=True)
        created = []
        for admin in admins:
            n = cls.create_notification(admin, notification_type, title, message, data)
            if n:
                created.append(n)
        return created

    @classmethod
    def notify_video_uploader(cls, video, notification_type, title, message, data=None):
        if video.uploader and video.uploader.is_active:
            return cls.create_notification(
                video.uploader, notification_type, title, message, data
            )
        return None

    @classmethod
    def get_unread_count(cls, user):
        return Notification.objects.filter(recipient=user, is_read=False).count()

    @classmethod
    def get_notifications(cls, user, limit=20, offset=0, unread_only=False, notification_type=None):
        qs = Notification.objects.filter(recipient=user)
        if unread_only:
            qs = qs.filter(is_read=False)
        if notification_type:
            qs = qs.filter(notification_type=notification_type)
        total = qs.count()
        qs = qs.select_related("recipient")[offset : offset + limit]
        return list(qs), total

    @classmethod
    def mark_as_read(cls, notification_id, user):
        try:
            notification = Notification.objects.get(id=notification_id, recipient=user)
            notification.mark_as_read()
            return notification
        except Notification.DoesNotExist:
            return None

    @classmethod
    def mark_all_as_read(cls, user):
        updated = Notification.objects.filter(recipient=user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return updated

    @classmethod
    def delete_notification(cls, notification_id, user):
        try:
            notification = Notification.objects.get(id=notification_id, recipient=user)
            notification.delete()
            return True
        except Notification.DoesNotExist:
            return False

    @classmethod
    def archive_notification(cls, notification_id, user):
        try:
            notification = Notification.objects.get(id=notification_id, recipient=user)
            notification.is_archived = True
            notification.save(update_fields=["is_archived"])
            return notification
        except Notification.DoesNotExist:
            return None

    @classmethod
    def delete_all_notifications(cls, user):
        deleted, _ = Notification.objects.filter(recipient=user).delete()
        return deleted

    @classmethod
    def cleanup_old_notifications(cls, days=90):
        cutoff = timezone.now() - timezone.timedelta(days=days)
        deleted, _ = Notification.objects.filter(created_at__lt=cutoff, is_read=True).delete()
        return deleted
