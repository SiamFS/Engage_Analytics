from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0016_add_photo_url_and_devices_to_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='webcamrecording',
            name='liveness_data',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='webcamrecording',
            name='liveness_passed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='webcamrecording',
            name='liveness_score',
            field=models.FloatField(blank=True, null=True),
        ),
    ]
