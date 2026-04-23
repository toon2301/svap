from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0005_message_image_and_optional_text"),
    ]

    operations = [
        migrations.AddField(
            model_name="conversation",
            name="pinned_message",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="+",
                to="messaging.message",
            ),
        ),
    ]
