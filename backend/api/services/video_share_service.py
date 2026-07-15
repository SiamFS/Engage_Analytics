import logging
from django.conf import settings
from django.db.models import F
from django.shortcuts import get_object_or_404

from api.models import Video, VideoShare

logger = logging.getLogger(__name__)

class VideoShareService:
    """Service for handling video share operations"""

    @staticmethod
    def _is_shareable(video):
        return video.visibility != "private"

    @classmethod
    def create_share(cls, video_id, user):
        if not user or not user.is_authenticated:
            return None

        video = get_object_or_404(Video, id=video_id)
        if not cls._is_shareable(video):
            logger.warning(
                "User %s attempted to share private video %s", user.email, video_id
            )
            return None

        share = VideoShare.objects.create(video=video, created_by=user)
        return share
    
    @classmethod
    def get_share_url(cls, share, frontend_url=None):
        base_url = frontend_url or settings.FRONTEND_URL
        return f"{base_url}/video/{share.share_token}"
    
    @classmethod
    def increment_access_count(cls, share_token):
        share = get_object_or_404(VideoShare, share_token=share_token, active=True)
        share.access_count = F("access_count") + 1
        share.save(update_fields=["access_count"])
        share.refresh_from_db(fields=["access_count"])
        return share, share.video