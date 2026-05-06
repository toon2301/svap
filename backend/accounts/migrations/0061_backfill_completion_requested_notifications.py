from django.db import migrations
from django.utils import timezone


NOTIFICATION_TYPE = "skill_request_completion_requested"
SKILL_REQUEST_STATUS = "completion_requested"


def backfill_completion_requested_notifications(apps, schema_editor):
    SkillRequest = apps.get_model("accounts", "SkillRequest")
    Notification = apps.get_model("accounts", "Notification")

    requests_qs = SkillRequest.objects.filter(status=SKILL_REQUEST_STATUS).values(
        "id",
        "requester_id",
        "recipient_id",
        "offer_id",
    )
    request_ids = [row["id"] for row in requests_qs]
    if not request_ids:
        return

    existing_request_ids = set(
        Notification.objects.filter(
            type=NOTIFICATION_TYPE,
            skill_request_id__in=request_ids,
        ).values_list("skill_request_id", flat=True)
    )

    now = timezone.now()
    batch = []
    for row in requests_qs.iterator(chunk_size=1000):
        if row["id"] in existing_request_ids:
            continue
        batch.append(
            Notification(
                user_id=row["requester_id"],
                actor_id=row["recipient_id"],
                skill_request_id=row["id"],
                type=NOTIFICATION_TYPE,
                title="Výmena označená ako dokončená",
                body="Výmena bola označená ako dokončená.",
                data={
                    "skill_request_id": row["id"],
                    "offer_id": row["offer_id"],
                    "completed_by_user_id": row["recipient_id"],
                },
                is_read=False,
                created_at=now,
            )
        )
        if len(batch) >= 1000:
            Notification.objects.bulk_create(batch)
            batch.clear()

    if batch:
        Notification.objects.bulk_create(batch)


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0060_notification_completion_requested_type"),
    ]

    operations = [
        migrations.RunPython(
            backfill_completion_requested_notifications,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
