from django.core.management.base import BaseCommand

from api.services import EmotionAnalysisService
from api.services.notification_service import NotificationService


class Command(BaseCommand):
    help = "Run batch emotion analysis on completed webcam recordings"

    def add_arguments(self, parser):
        parser.add_argument(
            "--trigger",
            type=str,
            default="cron",
            choices=["cron", "manual"],
            help="Trigger type recorded in the analysis run log.",
        )

    def handle(self, *args, **options):
        trigger = options.get("trigger", "cron")
        self.stdout.write(f"Starting emotion analysis (trigger={trigger})...")
        run_log = EmotionAnalysisService.run(trigger=trigger)
        self.stdout.write(
            f"Emotion analysis finished: status={run_log.status} "
            f"processed={run_log.processed}/{run_log.total}"
        )

        self.stdout.write("Cleaning up old notifications...")
        deleted = NotificationService.cleanup_old_notifications(days=90)
        self.stdout.write(f"Deleted {deleted} old notifications.")
