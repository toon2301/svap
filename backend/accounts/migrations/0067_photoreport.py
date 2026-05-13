from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0066_offeredskilllike_notification_offer_liked_type"),
    ]

    operations = [
        migrations.CreateModel(
            name="PhotoReport",
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
                    "reported_avatar_name",
                    models.CharField(
                        blank=True,
                        default="",
                        max_length=255,
                        verbose_name="Nazov nahlaseneho avataru",
                    ),
                ),
                ("reason", models.CharField(max_length=100, verbose_name="Dovod")),
                ("description", models.TextField(blank=True, verbose_name="Popis")),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Vytvorene"),
                ),
                (
                    "is_resolved",
                    models.BooleanField(default=False, verbose_name="Vyriesene"),
                ),
                (
                    "offer_image",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reports",
                        to="accounts.offeredskillimage",
                        verbose_name="Nahlasena fotka ponuky",
                    ),
                ),
                (
                    "reported_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="photo_reports_sent",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Nahlasil",
                    ),
                ),
                (
                    "reported_user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="avatar_reports_received",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Nahlaseny pouzivatel avatara",
                    ),
                ),
            ],
            options={
                "verbose_name": "Nahlasenie fotky",
                "verbose_name_plural": "Nahlasenia fotiek",
                "ordering": ["-created_at"],
                "constraints": [
                    models.CheckConstraint(
                        check=(
                            models.Q(
                                offer_image__isnull=False,
                                reported_user__isnull=True,
                            )
                            | models.Q(
                                offer_image__isnull=True,
                                reported_user__isnull=False,
                                reported_avatar_name__gt="",
                            )
                        ),
                        name="photo_report_has_exactly_one_target",
                    ),
                    models.CheckConstraint(
                        check=(
                            models.Q(reported_user__isnull=True)
                            | ~models.Q(reported_user=models.F("reported_by"))
                        ),
                        name="photo_report_cannot_report_own_avatar",
                    ),
                    models.UniqueConstraint(
                        condition=models.Q(offer_image__isnull=False),
                        fields=("offer_image", "reported_by"),
                        name="unique_photo_report_per_offer_image",
                    ),
                    models.UniqueConstraint(
                        condition=models.Q(reported_user__isnull=False),
                        fields=("reported_user", "reported_avatar_name", "reported_by"),
                        name="unique_photo_report_per_avatar",
                    ),
                ],
                "indexes": [
                    models.Index(
                        fields=["offer_image", "created_at"],
                        name="acc_photo_rep_offer_cr_idx",
                    ),
                    models.Index(
                        fields=["reported_user", "created_at"],
                        name="acc_photo_rep_user_cr_idx",
                    ),
                    models.Index(
                        fields=["reported_by", "created_at"],
                        name="acc_photo_rep_by_cr_idx",
                    ),
                    models.Index(
                        fields=["is_resolved", "created_at"],
                        name="acc_photo_rep_res_cr_idx",
                    ),
                ],
            },
        ),
    ]
