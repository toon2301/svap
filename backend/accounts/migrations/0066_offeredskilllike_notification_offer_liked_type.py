import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0065_reviewlike_notification_review_liked_type"),
    ]

    operations = [
        migrations.CreateModel(
            name="OfferedSkillLike",
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
                    "offer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="offer_likes",
                        to="accounts.offeredskill",
                        verbose_name="Ponuka",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="offered_skill_likes",
                        to="accounts.user",
                        verbose_name="Používateľ",
                    ),
                ),
            ],
            options={
                "verbose_name": "Páči sa mi ponuka",
                "verbose_name_plural": "Páči sa mi ponuky",
                "ordering": ["-created_at", "-id"],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("offer", "user"),
                        name="unique_offer_like_per_user",
                    )
                ],
                "indexes": [
                    models.Index(
                        fields=["offer", "created_at"],
                        name="acc_offlike_offer_cr_idx",
                    ),
                    models.Index(
                        fields=["user", "created_at"],
                        name="acc_offlike_user_cr_idx",
                    ),
                ],
            },
        ),
        migrations.AlterField(
            model_name="notification",
            name="type",
            field=models.CharField(
                choices=[
                    ("offer_liked", "Páči sa mi ponuka"),
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
    ]
