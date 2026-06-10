from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0079_user_desktop_onboarding_state"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="desktop_onboarding_step",
            field=models.CharField(
                choices=[
                    ("navigation", "Navigation"),
                    ("profile_icon", "Profile icon"),
                    ("profile_edit", "Profile edit"),
                    ("edit_form", "Edit form"),
                    ("search", "Search"),
                    ("help_request", "Help request"),
                    ("requests", "Requests"),
                    ("messages", "Messages"),
                    ("dashboard_finish", "Dashboard finish"),
                ],
                default="navigation",
                max_length=20,
                verbose_name="Desktop onboarding step",
            ),
        ),
    ]
