from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0003_reset_legacy_messaging_tables"),
    ]

    operations = [
        migrations.AddField(
            model_name="conversationparticipant",
            name="hidden_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="conversationparticipant",
            index=models.Index(
                fields=["user", "hidden_at"],
                name="conv_part_user_hidden_idx",
            ),
        ),
    ]
