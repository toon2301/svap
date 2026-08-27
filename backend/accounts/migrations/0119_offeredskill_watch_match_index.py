from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0118_feed_edited_at"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="offeredskill",
            index=models.Index(
                fields=[
                    "is_hidden",
                    "is_seeking",
                    "country_code",
                    "category",
                    "subcategory",
                    "-created_at",
                ],
                name="acc_off_skill_watch_match_idx",
            ),
        ),
    ]
