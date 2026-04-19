import pathlib
import uuid

from django.db import migrations, models

import swaply.validators


def message_image_upload_to(instance, filename):
    suffix = pathlib.Path(filename or "").suffix.lower()
    safe_suffix = suffix if suffix else ".jpg"
    conversation_id = instance.conversation_id or "pending"
    return f"messages/{conversation_id}/{uuid.uuid4().hex}{safe_suffix}"


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0004_conversationparticipant_hidden_at"),
    ]

    operations = [
        migrations.AlterField(
            model_name="message",
            name="text",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="message",
            name="image",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to=message_image_upload_to,
                validators=[swaply.validators.validate_image_file],
            ),
        ),
    ]
