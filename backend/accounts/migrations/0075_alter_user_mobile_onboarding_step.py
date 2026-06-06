from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0074_alter_user_mobile_onboarding_step"),
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
                    ("help_request", "Help request"),
                ],
                default="home",
                max_length=20,
                verbose_name="Mobile onboarding step",
            ),
        ),
    ]
