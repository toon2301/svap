from django.db import migrations, models


def mark_existing_users_completed(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.update(
        mobile_onboarding_status="completed",
        mobile_onboarding_step="edit_form",
    )


def reset_existing_users_to_default(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.update(
        mobile_onboarding_status="in_progress",
        mobile_onboarding_step="home",
    )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0072_skillrequest_help_proposal"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="mobile_onboarding_status",
            field=models.CharField(
                choices=[
                    ("in_progress", "In progress"),
                    ("completed", "Completed"),
                    ("skipped", "Skipped"),
                ],
                default="in_progress",
                max_length=20,
                verbose_name="Mobile onboarding status",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="mobile_onboarding_step",
            field=models.CharField(
                choices=[
                    ("home", "Home"),
                    ("profile_icon", "Profile icon"),
                    ("profile_edit", "Profile edit"),
                    ("edit_form", "Edit form"),
                ],
                default="home",
                max_length=20,
                verbose_name="Mobile onboarding step",
            ),
        ),
        migrations.RunPython(
            mark_existing_users_completed,
            reset_existing_users_to_default,
        ),
    ]
