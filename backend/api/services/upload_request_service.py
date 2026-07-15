from django.db import transaction
from django.utils import timezone
from django.db.models import Count, Q

from api.models import UploadRequest, UploadRequestStatusLog, User, Video, EmotionFrame
from api.services.notification_service import NotificationService

VALID_TRANSITIONS = {
    "draft": ["submitted", "cancelled", "archived"],
    "submitted": ["pending_review", "cancelled", "archived"],
    "pending_review": ["approved", "rejected", "cancelled", "archived"],
    "approved": ["processing", "archived"],
    "rejected": ["draft", "archived"],
    "processing": ["completed", "failed"],
    "completed": ["archived"],
    "failed": ["draft", "archived"],
    "cancelled": ["archived"],
    "archived": [],
}

STATUS_NOTIFICATION_MAP = {
    "submitted": ("upload_request_submitted", "Upload Request Submitted", "Your upload request has been submitted for review."),
    "approved": ("upload_request_approved", "Upload Request Approved", "Your upload request has been approved and is being processed."),
    "rejected": ("upload_request_rejected", "Upload Request Rejected", "Your upload request has been reviewed and was not approved."),
    "processing": ("upload_request_processing", "Analysis In Progress", "Emotion analysis is now running on your approved video."),
    "completed": ("upload_request_completed", "Analysis Complete", "Emotion analysis is complete. View your results now."),
    "cancelled": ("upload_request_cancelled", "Upload Request Cancelled", "Your upload request has been cancelled."),
}

ADMIN_NOTIFICATION_MAP = {
    ("submitted", False): ("upload_request_submitted", "New Upload Request", "A new upload request has been submitted and requires review."),
    ("submitted", True): ("upload_request_submitted", "Upload Request Resubmitted", "A previously rejected upload request has been resubmitted."),
}


class UploadRequestService:

    @classmethod
    def get_company_requests(cls, company, status=None, limit=50, offset=0):
        qs = UploadRequest.objects.filter(company=company)
        if status:
            qs = qs.filter(status=status)
        total = qs.count()
        requests = qs.order_by("-created_at")[offset:offset + limit]
        return list(requests), total

    @classmethod
    def get_all_requests(cls, status=None, search=None, company_id=None, limit=50, offset=0):
        qs = UploadRequest.objects.select_related("company", "reviewed_by").all()
        if status:
            qs = qs.filter(status=status)
        if company_id:
            qs = qs.filter(company_id=company_id)
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(company__email__icontains=search) |
                Q(company__first_name__icontains=search) |
                Q(company__last_name__icontains=search)
            )
        total = qs.count()
        requests = qs.order_by("-created_at")[offset:offset + limit]
        return list(requests), total

    @classmethod
    def get_request_detail(cls, request_id, user=None):
        qs = UploadRequest.objects.select_related("company", "reviewed_by", "video").prefetch_related("status_logs__changed_by")
        if user and user.role != "admin":
            qs = qs.filter(company=user)
        return qs.filter(id=request_id).first()

    @classmethod
    @transaction.atomic
    def create_draft(cls, company, data):
        request = UploadRequest.objects.create(
            company=company,
            title=data.get("title"),
            description=data.get("description", ""),
            category=data.get("category", ""),
            filename=data.get("filename", ""),
            status="draft",
        )
        cls._log_status(request, None, "draft", company)
        return request

    @classmethod
    @transaction.atomic
    def update_draft(cls, request_obj, data, user):
        if request_obj.company != user and user.role != "admin":
            raise PermissionError("You do not have permission to update this request.")
        if request_obj.status not in ("draft", "rejected"):
            raise ValueError("Only draft or rejected requests can be edited.")

        for field in ("title", "description", "category", "filename"):
            if field in data:
                setattr(request_obj, field, data[field])
        request_obj.save(update_fields=["title", "description", "category", "filename", "updated_at"])
        return request_obj

    @classmethod
    @transaction.atomic
    def submit(cls, request_obj, user):
        if request_obj.company != user:
            raise PermissionError("You do not have permission to submit this request.")
        if request_obj.status not in ("draft", "rejected"):
            raise ValueError("Only draft or rejected requests can be submitted.")

        old_status = request_obj.status
        request_obj.status = "submitted"
        request_obj.submitted_at = timezone.now()
        request_obj.save(update_fields=["status", "submitted_at", "updated_at"])
        cls._log_status(request_obj, old_status, "submitted", user)

        is_resubmission = old_status == "rejected"
        notif_type, notif_title, notif_message = STATUS_NOTIFICATION_MAP["submitted"]
        NotificationService.create_notification(
            recipient=user,
            notification_type=notif_type,
            title=notif_title,
            message=notif_message,
            data={"upload_request_id": request_obj.id},
        )

        admin_key = ("submitted", is_resubmission)
        if admin_key in ADMIN_NOTIFICATION_MAP:
            a_type, a_title, a_message = ADMIN_NOTIFICATION_MAP[admin_key]
            NotificationService.notify_admins(
                notification_type=a_type,
                title=a_title,
                message=f"{user.get_full_name() or user.email}: {request_obj.title}",
                data={"upload_request_id": request_obj.id, "company_email": user.email},
            )

        return request_obj

    @classmethod
    @transaction.atomic
    def approve(cls, request_obj, admin, comment=""):
        if request_obj.status != "submitted" and request_obj.status != "pending_review":
            raise ValueError("Only submitted requests can be approved.")

        from_status = request_obj.status
        request_obj.status = "approved"
        request_obj.reviewed_by = admin
        request_obj.admin_comment = comment
        request_obj.reviewed_at = timezone.now()
        request_obj.save(update_fields=["status", "reviewed_by", "admin_comment", "reviewed_at", "updated_at"])
        cls._log_status(request_obj, from_status, "approved", admin, comment)

        notif_type, notif_title, notif_message = STATUS_NOTIFICATION_MAP["approved"]
        NotificationService.create_notification(
            recipient=request_obj.company,
            notification_type=notif_type,
            title=notif_title,
            message=notif_message,
            data={"upload_request_id": request_obj.id},
        )

        return request_obj

    @classmethod
    @transaction.atomic
    def reject(cls, request_obj, admin, rejection_reason="", suggestions="", comment=""):
        if request_obj.status not in ("submitted", "pending_review"):
            raise ValueError("Only submitted requests can be rejected.")

        from_status = request_obj.status
        request_obj.status = "rejected"
        request_obj.reviewed_by = admin
        request_obj.rejection_reason = rejection_reason
        request_obj.suggestions = suggestions
        request_obj.admin_comment = comment
        request_obj.reviewed_at = timezone.now()
        request_obj.save(update_fields=[
            "status", "reviewed_by", "rejection_reason", "suggestions",
            "admin_comment", "reviewed_at", "updated_at",
        ])
        cls._log_status(request_obj, from_status, "rejected", admin, rejection_reason or comment)

        notif_type, notif_title, notif_message = STATUS_NOTIFICATION_MAP["rejected"]
        NotificationService.create_notification(
            recipient=request_obj.company,
            notification_type=notif_type,
            title=notif_title,
            message=f"{notif_message} Reason: {rejection_reason or 'Not specified'}",
            data={
                "upload_request_id": request_obj.id,
                "rejection_reason": rejection_reason,
                "suggestions": suggestions,
            },
        )

        return request_obj

    @classmethod
    @transaction.atomic
    def cancel(cls, request_obj, user):
        if request_obj.company != user and user.role != "admin":
            raise PermissionError("You do not have permission to cancel this request.")
        if request_obj.status in ("completed", "archived", "cancelled"):
            raise ValueError("This request cannot be cancelled.")

        from_status = request_obj.status
        request_obj.status = "cancelled"
        request_obj.save(update_fields=["status", "updated_at"])
        cls._log_status(request_obj, from_status, "cancelled", user)

        notif_type, notif_title, notif_message = STATUS_NOTIFICATION_MAP["cancelled"]
        NotificationService.create_notification(
            recipient=request_obj.company,
            notification_type=notif_type,
            title=notif_title,
            message=notif_message,
            data={"upload_request_id": request_obj.id},
        )

        return request_obj

    @classmethod
    @transaction.atomic
    def mark_processing(cls, request_obj):
        if request_obj.status != "approved":
            raise ValueError("Only approved requests can be processed.")

        from_status = request_obj.status
        request_obj.status = "processing"
        request_obj.save(update_fields=["status", "updated_at"])
        cls._log_status(request_obj, from_status, "processing", None)

        notif_type, notif_title, notif_message = STATUS_NOTIFICATION_MAP["processing"]
        NotificationService.create_notification(
            recipient=request_obj.company,
            notification_type=notif_type,
            title=notif_title,
            message=notif_message,
            data={"upload_request_id": request_obj.id},
        )

        return request_obj

    @classmethod
    @transaction.atomic
    def mark_completed(cls, request_obj):
        if request_obj.status != "processing":
            raise ValueError("Only processing requests can be marked completed.")

        from_status = request_obj.status
        request_obj.status = "completed"
        request_obj.completed_at = timezone.now()
        request_obj.save(update_fields=["status", "completed_at", "updated_at"])
        cls._log_status(request_obj, from_status, "completed", None)

        notif_type, notif_title, notif_message = STATUS_NOTIFICATION_MAP["completed"]
        NotificationService.create_notification(
            recipient=request_obj.company,
            notification_type=notif_type,
            title=notif_title,
            message=notif_message,
            data={"upload_request_id": request_obj.id},
        )

        return request_obj

    @classmethod
    @transaction.atomic
    def mark_failed(cls, request_obj):
        if request_obj.status != "processing":
            raise ValueError("Only processing requests can be marked failed.")

        from_status = request_obj.status
        request_obj.status = "failed"
        request_obj.save(update_fields=["status", "updated_at"])
        cls._log_status(request_obj, from_status, "failed", None)

        return request_obj

    @classmethod
    @transaction.atomic
    def archive(cls, request_obj, user):
        if request_obj.status == "archived":
            raise ValueError("Request is already archived.")

        from_status = request_obj.status
        request_obj.status = "archived"
        request_obj.save(update_fields=["status", "updated_at"])
        cls._log_status(request_obj, from_status, "archived", user)

        return request_obj

    @classmethod
    def get_company_analytics(cls, company):
        qs = UploadRequest.objects.filter(company=company)
        total = qs.count()
        by_status = qs.values("status").annotate(count=Count("id"))
        status_counts = {item["status"]: item["count"] for item in by_status}

        completed_qs = qs.filter(status="completed")
        completed_count = completed_qs.count()

        total_frames = 0
        if completed_count > 0:
            video_ids = list(completed_qs.filter(video__isnull=False).values_list("video_id", flat=True))
            if video_ids:
                frame_count = EmotionFrame.objects.filter(video_id__in=video_ids).count()
                total_frames = frame_count

        return {
            "total_requests": total,
            "draft": status_counts.get("draft", 0),
            "submitted": status_counts.get("submitted", 0),
            "pending_review": status_counts.get("pending_review", 0),
            "approved": status_counts.get("approved", 0),
            "rejected": status_counts.get("rejected", 0),
            "processing": status_counts.get("processing", 0),
            "completed": completed_count,
            "failed": status_counts.get("failed", 0),
            "cancelled": status_counts.get("cancelled", 0),
            "archived": status_counts.get("archived", 0),
            "total_frames": total_frames,
        }

    @classmethod
    def _log_status(cls, request_obj, from_status, to_status, changed_by, comment=""):
        UploadRequestStatusLog.objects.create(
            upload_request=request_obj,
            from_status=from_status,
            to_status=to_status,
            changed_by=changed_by,
            comment=comment,
        )
