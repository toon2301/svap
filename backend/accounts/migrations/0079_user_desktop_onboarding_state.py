from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0078_alter_user_mobile_onboarding_step"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="desktop_onboarding_status",
            field=models.CharField(
                choices=[
                    ("in_progress", "In progress"),
                    ("completed", "Completed"),
                    ("skipped", "Skipped"),
                ],
                default="in_progress",
                max_length=20,
                verbose_name="Desktop onboarding status",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="desktop_onboarding_step",
            field=models.CharField(
                choices=[
                    ("navigation", "Navigation"),
                    ("profile_icon", "Profile icon"),
                ],
                default="navigation",
                max_length=20,
                verbose_name="Desktop onboarding step",
            ),
        ),
    ]
