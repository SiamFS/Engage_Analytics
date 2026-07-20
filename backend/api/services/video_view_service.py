from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone

from api.models import Video, VideoView
from api.services.notification_service import NotificationService

class VideoViewService:
    """Service for handling video view operations"""

    @classmethod
    def record_view(cls, video_id, user=None):
       
        video = get_object_or_404(Video, id=video_id)
        
        # Check if this video is accessible
        if video.visibility == "private" and (
            not user or not user.is_authenticated or video.uploader != user
        ):
            return video, None, False
        
        # Increment video views
        new_view_count = cls.increment_video_views(video)
        
        # Record user view if user is authenticated
        if user and user.is_authenticated:
            cls.record_user_view(video, user)
        
        # Check if privacy should be changed
        privacy_changed = False
        if cls.should_make_private(video):
            was_already_private = video.visibility == "private"
            made_private = cls.make_video_private(video)
            privacy_changed = True

            if made_private:
                reason = "view_limit" if (video.view_limit and video.views >= video.view_limit) else "expired"
                cls._notify_privacy_change(video, reason)
            
        return video, new_view_count, privacy_changed
    
    @staticmethod
    def increment_video_views(video):
        """Increment the view count for a video"""
        video.views = F("views") + 1
        video.save(update_fields=["views"])
        if video.view_limit:
            video.refresh_from_db()
            return video.views
        return Video.objects.filter(id=video.id).values_list("views", flat=True).first() or 0
    
    @staticmethod
    def record_user_view(video, user):
        """Record that a user has viewed a video"""
        if user and user.is_authenticated:
            VideoView.objects.get_or_create(
                video=video,
                viewer=user,
                defaults={"viewed_at": timezone.now()}
            )
    
    @staticmethod
    def should_make_private(video):
        """Check if a video should be made private based on rules"""
        # Check view limit
        if video.view_limit and video.views >= video.view_limit:
            return True

        # Check expiry time
        if video.auto_private_after and timezone.now() >= video.auto_private_after:
            return True

        return False
    
    @staticmethod
    def make_video_private(video):
        """Make a video private if it's not already"""
        if video.visibility != "private":
            video.visibility = "private"
            video.save(update_fields=["visibility"])
            return True
        return False

    @staticmethod
    def _notify_privacy_change(video, reason):
        if reason == "view_limit":
            NotificationService.notify_video_uploader(
                video,
                notification_type="video_view_limit_reached",
                title="View limit reached",
                message=f"Your video \"{video.title}\" has reached its view limit ({video.view_limit}) and has been set to private.",
                data={"video_id": video.id, "view_limit": video.view_limit, "views": video.views},
            )
        elif reason == "expired":
            NotificationService.notify_video_uploader(
                video,
                notification_type="video_auto_privated",
                title="Video auto-privated",
                message=f"Your video \"{video.title}\" has expired and has been set to private.",
                data={"video_id": video.id},
            )