from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("messaging", "0006_conversation_pinned_message"),
    ]

    operations = [
        migrations.AddField(
            model_name="conversationparticipant",
            name="pinned_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="conversationparticipant",
            index=models.Index(
                fields=["user", "pinned_at"],
                name="conv_part_user_pinned_idx",
            ),
        ),
    ]
