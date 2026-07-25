from django.db import migrations
from django.db.models import OuterRef, Subquery


def backfill_reviewed_user(apps, schema_editor):
    """Doplní reviewed_user z offer.user pre existujúce recenzie.

    Pred touto zmenou bol Review.offer NOT NULL, takže všetky existujúce recenzie
    majú ponuku a vieme z nej odvodiť hodnoteného používateľa. Používame korelovaný
    Subquery (nie join vo F-výraze), aby UPDATE fungoval na sqlite aj postgres.
    """
    Review = apps.get_model("accounts", "Review")
    OfferedSkill = apps.get_model("accounts", "OfferedSkill")

    owner_subquery = OfferedSkill.objects.filter(pk=OuterRef("offer_id")).values(
        "user_id"
    )[:1]
    Review.objects.filter(
        reviewed_user__isnull=True, offer__isnull=False
    ).update(reviewed_user_id=Subquery(owner_subquery))

    # Overenie: každá recenzia s existujúcou ponukou musí mať vyplneného
    # hodnoteného používateľa. Ak nie, prechod zastavíme (nekonzistentné dáta).
    remaining = Review.objects.filter(
        reviewed_user__isnull=True, offer__isnull=False
    ).count()
    if remaining:
        raise RuntimeError(
            f"Backfill reviewed_user zlyhal: {remaining} recenzií s ponukou stále "
            "nemá reviewed_user."
        )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0093_review_reviewed_user_and_offer_setnull"),
    ]

    operations = [
        migrations.RunPython(
            backfill_reviewed_user,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
