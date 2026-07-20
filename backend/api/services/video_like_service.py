from django.db import IntegrityError
from django.db.models import F
from django.shortcuts import get_object_or_404

from api.models import Video, VideoLike
from api.services.notification_service import NotificationService

class VideoLikeService:
    """Service for handling video like operations"""

    @classmethod
    def toggle_like(cls, video_id, user):
        """
        Toggle like status for a video.
        
        Args:
            video_id: The ID of the video
            user: The user performing the like/unlike
            
        Returns:
            tuple: (video, liked, like_count)
        """
        if not user or not user.is_authenticated:
            return None, False, 0

        video = get_object_or_404(Video, id=video_id)

        try:
            like, created = VideoLike.objects.get_or_create(video=video, user=user)
        except IntegrityError:
            like = VideoLike.objects.get(video=video, user=user)
            created = False

        if created:
            return cls.add_like(video, like)
        else:
            return cls.remove_like(video, like)
    
    @staticmethod
    def add_like(video, like):
        """Add a like to a video"""
        video.likes = F("likes") + 1
        video.save(update_fields=["likes"])
        likes_count = Video.objects.filter(id=video.id).values_list("likes", flat=True).first() or 0

        if like.user_id and video.uploader_id != like.user_id:
            liker_name = like.user.get_full_name() or like.user.email if like.user else "Someone"
            NotificationService.create_notification(
                recipient=video.uploader,
                notification_type="video_liked",
                title="Your video got a like!",
                message=f"{liker_name} liked your video \"{video.title}\".",
                data={"video_id": video.id, "liker_id": like.user_id},
            )

        return video, True, likes_count
    
    @staticmethod
    def remove_like(video, like):
        """Remove a like from a video"""
        like.delete()
        video.likes = F("likes") - 1
        video.save(update_fields=["likes"])
        likes_count = Video.objects.filter(id=video.id).values_list("likes", flat=True).first() or 0
        return video, False, likes_count