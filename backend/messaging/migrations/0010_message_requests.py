from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("messaging", "0009_upload_to_model_functions"),
    ]

    operations = [
        migrations.AddField(
            model_name="conversation",
            name="request_status",
            field=models.CharField(
                choices=[
                    ("accepted", "Accepted"),
                    ("pending", "Pending"),
                    ("deleted", "Deleted"),
                ],
                db_index=True,
                default="accepted",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="conversation",
            name="requested_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="sent_message_requests",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="conversation",
            name="requested_to",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="received_message_requests",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="conversation",
            name="accepted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="conversation",
            name="request_seen_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="conversation",
            index=models.Index(
                fields=["requested_to", "request_status", "last_message_at"],
                name="conv_req_to_status_last_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="conversation",
            index=models.Index(
                fields=["requested_by", "requested_to", "request_status"],
                name="conv_req_pair_status_idx",
            ),
        ),
    ]
