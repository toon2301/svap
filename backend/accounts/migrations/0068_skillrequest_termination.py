from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0067_photoreport"),
    ]

    operations = [
        migrations.AlterField(
            model_name="skillrequest",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Čaká na odpoveď"),
                    ("accepted", "Prijaté"),
                    ("rejected", "Zamietnuté"),
                    ("cancelled", "Zrušené"),
                    ("completion_requested", "Completion requested"),
                    ("completed", "Completed"),
                    ("terminated", "Ukončené bez dokončenia"),
                ],
                default="pending",
                max_length=25,
                verbose_name="Stav",
            ),
        ),
        migrations.CreateModel(
            name="SkillRequestTermination",
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
                    "reason",
                    models.CharField(
                        choices=[
                            ("no_response", "Druhá strana nereaguje"),
                            ("no_time", "Nemám čas pokračovať"),
                            ("changed_circumstances", "Zmena okolností"),
                            ("could_not_agree", "Nepodarilo sa dohodnúť"),
                            (
                                "communication_issue",
                                "Nie som spokojný s komunikáciou",
                            ),
                            (
                                "meeting_not_happened",
                                "Stretnutie / realizácia neprebehla",
                            ),
                            ("trust_concerns", "Mám obavy z dôveryhodnosti"),
                            ("other", "Iné"),
                        ],
                        max_length=40,
                        verbose_name="Dôvod",
                    ),
                ),
                (
                    "description",
                    models.TextField(blank=True, max_length=1000, verbose_name="Popis"),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Vytvorené"),
                ),
                (
                    "skill_request",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="termination",
                        to="accounts.skillrequest",
                        verbose_name="Výmena",
                    ),
                ),
                (
                    "terminated_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="skill_request_terminations",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Ukončil",
                    ),
                ),
            ],
            options={
                "verbose_name": "Ukončenie výmeny",
                "verbose_name_plural": "Ukončenia výmen",
                "ordering": ["-created_at", "-id"],
                "indexes": [
                    models.Index(
                        fields=["reason", "created_at"],
                        name="acc_req_term_reason_cr_idx",
                    ),
                    models.Index(
                        fields=["terminated_by", "created_at"],
                        name="acc_req_term_by_cr_idx",
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
                    (
                        "skill_request_terminated",
                        "Výmena ukončená bez dokončenia",
                    ),
                    ("group_invitation", "Pozvánka do skupiny"),
                ],
                max_length=50,
                verbose_name="Typ",
            ),
        ),
    ]
