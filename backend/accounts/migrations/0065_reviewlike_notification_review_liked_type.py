import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0064_notification_review_reply_created_type"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReviewLike",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Vytvorené"),
                ),
                (
                    "review",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="likes",
                        to="accounts.review",
                        verbose_name="Recenzia",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="review_likes",
                        to="accounts.user",
                        verbose_name="Používateľ",
                    ),
                ),
            ],
            options={
                "verbose_name": "Páči sa mi recenzia",
                "verbose_name_plural": "Páči sa mi recenzie",
                "ordering": ["-created_at", "-id"],
            },
        ),
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
                    ("review_liked", "Páči sa mi recenzia"),
                    ("skill_request_rejected", "Žiadosť zamietnutá"),
                    ("skill_request_cancelled", "Žiadosť zrušená"),
                    ("group_invitation", "Pozvánka do skupiny"),
                ],
                max_length=50,
                verbose_name="Typ",
            ),
        ),
        migrations.AddConstraint(
            model_name="reviewlike",
            constraint=models.UniqueConstraint(
                fields=("review", "user"),
                name="unique_review_like_per_user",
            ),
        ),
        migrations.AddIndex(
            model_name="reviewlike",
            index=models.Index(
                fields=["review", "created_at"],
                name="acc_revlike_review_created_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="reviewlike",
            index=models.Index(
                fields=["user", "created_at"],
                name="acc_revlike_user_created_idx",
            ),
        ),
    ]
