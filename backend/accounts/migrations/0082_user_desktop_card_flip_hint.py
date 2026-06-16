from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0081_user_mobile_card_flip_hint"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="desktop_card_flip_hint_own_completed",
            field=models.BooleanField(
                default=False,
                verbose_name="Desktop card flip hint own completed",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="desktop_card_flip_hint_foreign_completed",
            field=models.BooleanField(
                default=False,
                verbose_name="Desktop card flip hint foreign completed",
            ),
        ),
    ]
