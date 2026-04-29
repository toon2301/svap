from django.db import migrations, models

import messaging.models
import swaply.validators


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0008_group_conversations"),
    ]

    operations = [
        migrations.AlterField(
            model_name="conversation",
            name="avatar",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to=messaging.models.conversation_avatar_upload_to,
                validators=[swaply.validators.validate_image_file],
            ),
        ),
        migrations.AlterField(
            model_name="message",
            name="image",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to=messaging.models.message_image_upload_to,
                validators=[swaply.validators.validate_image_file],
            ),
        ),
    ]
