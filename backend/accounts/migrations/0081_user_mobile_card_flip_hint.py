from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0080_alter_user_desktop_onboarding_step"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="mobile_card_flip_hint_own_completed",
            field=models.BooleanField(
                default=False,
                verbose_name="Mobile card flip hint own completed",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="mobile_card_flip_hint_foreign_completed",
            field=models.BooleanField(
                default=False,
                verbose_name="Mobile card flip hint foreign completed",
            ),
        ),
    ]