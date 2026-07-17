import logging
from django.db import transaction
from api.models import ViewerProfile
from api.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class PointsService:
    @staticmethod
    def award_points_for_webcam_upload(user, points=5):
        """Awards points to a user for successfully uploading webcam data."""
        with transaction.atomic():
            profile, _ = ViewerProfile.objects.get_or_create(user=user)
            profile.points += points
            profile.points_earned += points
            profile.save(update_fields=["points", "points_earned"])
        NotificationService.create_notification(
            recipient=user,
            notification_type="points_earned",
            title=f"You earned {points} points!",
            message=f"You received {points} points for completing a webcam recording upload.",
            data={"points": points, "reason": "webcam_upload"},
        )
        return profile, points

    @staticmethod
    def award_points_for_feedback(user, points=3):
        """Awards points to a user for submitting ad feedback."""
        with transaction.atomic():
            profile, _ = ViewerProfile.objects.get_or_create(user=user)
            profile.points += points
            profile.points_earned += points
            profile.save(update_fields=["points", "points_earned"])
        NotificationService.create_notification(
            recipient=user,
            notification_type="points_earned",
            title=f"You earned {points} points!",
            message=f"You received {points} points for submitting ad feedback.",
            data={"points": points, "reason": "feedback"},
        )
        return profile, points