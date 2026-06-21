from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0082_user_desktop_card_flip_hint"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="birth_date",
        ),
        migrations.RemoveField(
            model_name="user",
            name="gender",
        ),
    ]
