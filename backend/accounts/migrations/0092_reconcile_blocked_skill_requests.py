from django.db import migrations, models
from django.db.models import Exists, OuterRef, Q, Subquery
from django.utils import timezone


PENDING = "pending"
ACCEPTED = "accepted"
COMPLETION_REQUESTED = "completion_requested"
CANCELLED = "cancelled"
TERMINATED = "terminated"
INTERACTION_UNAVAILABLE = "interaction_unavailable"
BATCH_SIZE = 500


def reconcile_blocked_skill_requests(apps, schema_editor):
    SkillRequest = apps.get_model("accounts", "SkillRequest")
    SkillRequestTermination = apps.get_model(
        "accounts", "SkillRequestTermination"
    )
    UserBlock = apps.get_model("accounts", "UserBlock")

    pair_blocks = UserBlock.objects.filter(
        Q(
            blocker_id=OuterRef("requester_id"),
            blocked_user_id=OuterRef("recipient_id"),
        )
        | Q(
            blocker_id=OuterRef("recipient_id"),
            blocked_user_id=OuterRef("requester_id"),
        )
    ).order_by("created_at", "id")

    now = timezone.now()
    SkillRequest.objects.annotate(
        pair_is_blocked=Exists(pair_blocks)
    ).filter(pair_is_blocked=True, status=PENDING).update(
        status=CANCELLED,
        updated_at=now,
    )

    last_pk = 0
    while True:
        rows = list(
            SkillRequest.objects.annotate(
                pair_is_blocked=Exists(pair_blocks),
                blocking_user_id=Subquery(pair_blocks.values("blocker_id")[:1]),
            )
            .filter(
                pair_is_blocked=True,
                status__in=(ACCEPTED, COMPLETION_REQUESTED),
                pk__gt=last_pk,
            )
            .order_by("pk")
            .values("pk", "blocking_user_id")[:BATCH_SIZE]
        )
        if not rows:
            break

        SkillRequestTermination.objects.bulk_create(
            [
                SkillRequestTermination(
                    skill_request_id=row["pk"],
                    terminated_by_id=row["blocking_user_id"],
                    reason=INTERACTION_UNAVAILABLE,
                    description="",
                )
                for row in rows
                if row["blocking_user_id"]
            ],
            batch_size=BATCH_SIZE,
            ignore_conflicts=True,
        )
        request_ids = [row["pk"] for row in rows]
        SkillRequest.objects.filter(pk__in=request_ids).update(
            status=TERMINATED,
            updated_at=now,
        )
        last_pk = rows[-1]["pk"]


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("accounts", "0091_userblock"),
    ]

    operations = [
        migrations.AlterField(
            model_name="skillrequesttermination",
            name="reason",
            field=models.CharField(
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
                    (
                        INTERACTION_UNAVAILABLE,
                        "Interakcia už nie je dostupná",
                    ),
                ],
                max_length=40,
                verbose_name="Dôvod",
            ),
        ),
        migrations.RunPython(
            reconcile_blocked_skill_requests,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
