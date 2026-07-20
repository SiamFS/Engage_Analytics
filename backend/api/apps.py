from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        from backend.firebase import get_firebase_app
        get_firebase_app()
        self._register_signals()

    def _register_signals(self):
        from django.db.models.signals import pre_delete
        from django.dispatch import receiver
        import logging

        logger = logging.getLogger(__name__)

        @receiver(pre_delete, sender="api.Video")
        def cleanup_video_blobs(sender, instance, **kwargs):
            from api.services.azure_storage_service import AzureStorageService
            if instance.video_url:
                AzureStorageService.delete_blob_from_url(instance.video_url)
            if instance.thumbnail_url:
                AzureStorageService.delete_blob_from_url(instance.thumbnail_url)

        @receiver(pre_delete, sender="api.WebcamRecording")
        def cleanup_recording_blobs(sender, instance, **kwargs):
            from api.services.azure_storage_service import AzureStorageService
            if instance.recording_url:
                AzureStorageService.delete_blob_from_url(instance.recording_url)
            if instance.thumbnail_url:
                AzureStorageService.delete_blob_from_url(instance.thumbnail_url)
