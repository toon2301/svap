from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0073_user_mobile_onboarding_state"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="mobile_onboarding_step",
            field=models.CharField(
                choices=[
                    ("home", "Home"),
                    ("profile_icon", "Profile icon"),
                    ("profile_edit", "Profile edit"),
                    ("edit_form", "Edit form"),
                    ("search", "Search"),
                ],
                default="home",
                max_length=20,
                verbose_name="Mobile onboarding step",
            ),
        ),
    ]
