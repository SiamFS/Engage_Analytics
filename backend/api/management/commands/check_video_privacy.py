from django.core.management.base import BaseCommand
from django.db.models import F
from django.utils import timezone
from api.models import Video
from api.services import VideoViewService

class Command(BaseCommand):
    help = 'Check and update video privacy based on limits and expiry dates'
    
    def handle(self, *args, **kwargs):
        self._update_expired_videos()
        self._update_view_limited_videos()
    
    def _update_expired_videos(self):
        """Update videos that have passed their expiration date."""
        now = timezone.now()
        expired_videos = Video.objects.filter(
            auto_private_after__lte=now,
            visibility__in=['public', 'unlisted']
        )
        expired_count = expired_videos.update(visibility='private')
        self.stdout.write(f'Updated {expired_count} expired videos')
    
    def _update_view_limited_videos(self):
        """Update videos that have reached their view limit."""
        updated = Video.objects.filter(
            view_limit__isnull=False,
            view_limit__gt=0,
            views__gte=F("view_limit"),
            visibility__in=["public", "unlisted"],
        ).update(visibility="private")
        self.stdout.write(f'Updated {updated} videos that reached view limit')