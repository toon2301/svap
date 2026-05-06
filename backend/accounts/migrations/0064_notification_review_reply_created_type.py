from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0063_notification_review_created_type"),
    ]

    operations = [
        migrations.AlterField(
            model_name="notification",
            name="type",
            field=models.CharField(
                choices=[
                    ("skill_request", "Nová žiadosť"),
                    ("skill_request_accepted", "Žiadosť prijatá"),
                    (
                        "skill_request_completion_requested",
                        "Výmena označená ako dokončená",
                    ),
                    (
                        "skill_request_completed",
                        "Dokončenie výmeny potvrdené",
                    ),
                    ("review_created", "Nová recenzia"),
                    ("review_reply_created", "Odpoveď na recenziu"),
                    ("skill_request_rejected", "Žiadosť zamietnutá"),
                    ("skill_request_cancelled", "Žiadosť zrušená"),
                    ("group_invitation", "Pozvánka do skupiny"),
                ],
                max_length=50,
                verbose_name="Typ",
            ),
        ),
    ]
