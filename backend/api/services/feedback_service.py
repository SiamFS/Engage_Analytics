import logging
from django.db.models import Avg, Count
from django.db.models.functions import TruncDate

from api.models import FeedbackResponse, SurveyQuestion

logger = logging.getLogger(__name__)


class FeedbackService:

    @staticmethod
    def get_active_questions():
        return SurveyQuestion.objects.filter(is_active=True).order_by("order", "id")

    @staticmethod
    def has_submitted_feedback(user, video=None):
        qs = FeedbackResponse.objects.filter(user=user)
        if video:
            qs = qs.filter(video=video)
        return qs.exists()

    @staticmethod
    def get_user_feedback(user, limit=20, offset=0):
        qs = FeedbackResponse.objects.filter(user=user).select_related("video").order_by("-submitted_at")
        total = qs.count()
        return qs[offset:offset + limit], total

    @staticmethod
    def calculate_analytics():
        base = FeedbackResponse.objects.all()
        total = base.count()

        agg = base.aggregate(avg_rating=Avg("rating"))
        avg_rating = round(agg["avg_rating"], 2) if agg["avg_rating"] else 0.0

        rating_dist = {str(i): base.filter(rating=i).count() for i in range(1, 6)}

        completed = base.filter(completed_at__isnull=False).count()
        completion_rate = round(completed / total * 100, 1) if total else 0.0

        trend_qs = (
            base.annotate(date=TruncDate("submitted_at"))
            .values("date")
            .annotate(count=Count("id"), avg_rating=Avg("rating"))
            .order_by("-date")[:30]
        )
        recent_trend = [
            {
                "date": str(item["date"]),
                "count": item["count"],
                "avg_rating": round(item["avg_rating"], 2) if item["avg_rating"] else 0,
            }
            for item in trend_qs
        ]

        return {
            "total_responses": total,
            "average_rating": avg_rating,
            "rating_distribution": rating_dist,
            "completion_rate": completion_rate,
            "recent_trend": recent_trend,
        }
