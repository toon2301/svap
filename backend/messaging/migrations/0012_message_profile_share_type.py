from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0011_message_image_thumbnail"),
    ]

    operations = [
        migrations.AlterField(
            model_name="message",
            name="message_type",
            field=models.CharField(
                choices=[
                    ("user", "User"),
                    ("system", "System"),
                    ("group_invitation", "Group invitation"),
                    ("profile_share", "Profile share"),
                ],
                default="user",
                max_length=32,
            ),
        ),
    ]
