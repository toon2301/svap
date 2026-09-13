"""Použi pre nové avatary anonymné a nemenné UUID storage kľúče."""

import accounts.avatar_images
import swaply.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    """Zmeň generovanie názvu avatara bez úpravy existujúcich súborov."""

    dependencies = [
        ("accounts", "0121_offer_watch_notification_delivery"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="avatar",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to=accounts.avatar_images.avatar_upload_to,
                validators=[swaply.validators.validate_image_file],
                verbose_name="Profilová fotka",
            ),
        ),
    ]
