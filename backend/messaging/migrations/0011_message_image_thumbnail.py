from django.db import migrations, models

import messaging.models


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0010_message_requests"),
    ]

    operations = [
        migrations.AddField(
            model_name="message",
            name="image_thumbnail",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to=messaging.models.message_thumbnail_upload_to,
            ),
        ),
    ]
