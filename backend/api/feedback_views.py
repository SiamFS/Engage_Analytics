import logging
from django.db.models import Count, Avg, Q
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import SurveyQuestion, FeedbackResponse, Video
from api.serializers import (
    SurveyQuestionSerializer,
    FeedbackResponseSerializer,
    FeedbackSubmitSerializer,
    FeedbackAnalyticsSerializer,
)
from api.permissions import IsAdmin
from api.utils import safe_int_param

logger = logging.getLogger(__name__)


class ActiveSurveyQuestionsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SurveyQuestionSerializer

    def get_queryset(self):
        return SurveyQuestion.objects.filter(is_active=True)


class AdminSurveyQuestionsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = SurveyQuestionSerializer

    def get(self, request, question_id=None):
        if question_id:
            try:
                question = SurveyQuestion.objects.get(id=question_id)
                serializer = self.get_serializer(question)
                return Response(serializer.data)
            except SurveyQuestion.DoesNotExist:
                return Response({"error": "Question not found"}, status=404)
        questions = SurveyQuestion.objects.all().order_by("order", "id")
        serializer = self.get_serializer(questions, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, question_id):
        try:
            question = SurveyQuestion.objects.get(id=question_id)
        except SurveyQuestion.DoesNotExist:
            return Response({"error": "Question not found"}, status=404)
        serializer = self.get_serializer(question, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, question_id):
        try:
            question = SurveyQuestion.objects.get(id=question_id)
            question.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except SurveyQuestion.DoesNotExist:
            return Response({"error": "Question not found"}, status=404)


class AdminSurveyReorderView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        order_data = request.data.get("order", [])
        if not isinstance(order_data, list):
            return Response({"error": "order must be a list of {id, order} objects"}, status=400)
        for item in order_data:
            qid = item.get("id")
            orderval = item.get("order")
            if qid and orderval is not None:
                SurveyQuestion.objects.filter(id=qid).update(order=orderval)
        return Response({"message": "Order updated"})


class SubmitFeedbackView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FeedbackSubmitSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        video = None
        if data.get("video"):
            try:
                video = Video.objects.get(id=data["video"])
            except Video.DoesNotExist:
                pass

        existing = FeedbackResponse.objects.filter(
            user=request.user, video=video
        ).first()
        if existing:
            existing.responses = data.get("responses", {})
            existing.rating = data.get("rating")
            existing.is_anonymous = data.get("is_anonymous", False)
            existing.source = data.get("source", "post_analysis")
            existing.completed_at = timezone.now()
            existing.save()
            out = FeedbackResponseSerializer(existing, context={"request": request})
            return Response(out.data)

        feedback = FeedbackResponse.objects.create(
            user=request.user,
            video=video,
            responses=data.get("responses", {}),
            rating=data.get("rating"),
            is_anonymous=data.get("is_anonymous", False),
            source=data.get("source", "post_analysis"),
            completed_at=timezone.now(),
        )
        out = FeedbackResponseSerializer(feedback, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)


class FeedbackPendingCheckView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        video_id = request.query_params.get("video")
        qs = FeedbackResponse.objects.filter(user=request.user)
        if video_id:
            qs = qs.filter(video_id=video_id)
        return Response({"has_feedback": qs.exists()})


class UserFeedbackHistoryView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FeedbackResponseSerializer

    def get_queryset(self):
        qs = FeedbackResponse.objects.filter(user=self.request.user).select_related("video", "user")
        limit = safe_int_param(self.request, "limit", 20, 1, 100)
        offset = safe_int_param(self.request, "offset", 0, 0)
        return qs[offset:offset + limit]


class AdminFeedbackListView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = FeedbackResponseSerializer

    def get(self, request):
        qs = FeedbackResponse.objects.select_related("user", "video").all()

        user_id = request.query_params.get("user_id")
        video_id = request.query_params.get("video_id")
        rating = request.query_params.get("rating")
        search = request.query_params.get("search")

        if user_id:
            qs = qs.filter(user_id=user_id)
        if video_id:
            qs = qs.filter(video_id=video_id)
        if rating:
            qs = qs.filter(rating=rating)
        if search:
            qs = qs.filter(
                Q(user__email__icontains=search)
                | Q(responses__icontains=search)
            )

        qs = qs.order_by("-submitted_at")
        limit = safe_int_param(request, "limit", 50, 1, 200)
        offset = safe_int_param(request, "offset", 0, 0)
        total = qs.count()
        page = qs[offset:offset + limit]
        serializer = self.get_serializer(page, many=True)
        return Response({
            "feedback": serializer.data,
            "total": total,
        })


class AdminFeedbackDetailView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = FeedbackResponseSerializer

    def get(self, request, feedback_id):
        try:
            fb = FeedbackResponse.objects.select_related("user", "video").get(id=feedback_id)
            return Response(self.get_serializer(fb).data)
        except FeedbackResponse.DoesNotExist:
            return Response({"error": "Feedback not found"}, status=404)

    def delete(self, request, feedback_id):
        try:
            fb = FeedbackResponse.objects.get(id=feedback_id)
            fb.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except FeedbackResponse.DoesNotExist:
            return Response({"error": "Feedback not found"}, status=404)


class FeedbackAnalyticsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        base = FeedbackResponse.objects.all()
        total = base.count()

        agg = base.aggregate(
            avg_rating=Avg("rating"),
        )
        avg_rating = round(agg["avg_rating"], 2) if agg["avg_rating"] else 0.0

        rating_dist = {}
        for i in range(1, 6):
            rating_dist[str(i)] = base.filter(rating=i).count()

        completed = base.filter(completed_at__isnull=False).count()
        completion_rate = round(completed / total * 100, 1) if total else 0.0

        consent_count = base.filter(consent_to_improve=True).count()
        consent_rate = round(consent_count / total * 100, 1) if total else 0.0

        from django.db.models.functions import TruncDate
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

        data = {
            "total_responses": total,
            "average_rating": avg_rating,
            "rating_distribution": rating_dist,
            "completion_rate": completion_rate,
            "consent_rate": consent_rate,
            "recent_trend": recent_trend,
        }
        return Response(data)
