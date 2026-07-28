"""Retencia návštev profilu (Fáza 4.1).

Vzor prevzatý z ``accounts.services.notifications`` (retenčná konštanta + batch
purge). Maže podľa ``created_at`` (UTC datetime), NIE podľa ``visit_date`` –
90-dňová hranica je hrubá a nezávisí na lokálnom dni (viď prieskum: DB v UTC,
appka v Europe/Bratislava).
"""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from accounts.models import ProfileVisit

# Retencia (dni) pre návštevy profilu. Anchor = created_at (GDPR minimalizácia
# dát – staršie záznamy sa nedržia).
PROFILE_VISIT_RETENTION_DAYS = 90

_PURGE_BATCH_SIZE = 1000


def purge_old_profile_visits(*, dry_run: bool = True) -> int:
    """
    Zmaže návštevy staršie než ``PROFILE_VISIT_RETENTION_DAYS`` (anchor = created_at).

    Vracia počet (z)mazaných riadkov. Pri ``dry_run`` len spočíta (nič nemaže).
    Reálne mazanie beží v dávkach (scale-safe pri miliónoch riadkov). Bezpečné:
    ProfileVisit nemá žiadne child FK (leaf), takže žiadny cascade.
    """
    cutoff = timezone.now() - timedelta(days=PROFILE_VISIT_RETENTION_DAYS)
    base_qs = ProfileVisit.objects.filter(created_at__lt=cutoff)

    if dry_run:
        return base_qs.count()

    deleted_total = 0
    while True:
        # Explicitné order_by("id") – nezávisle od Meta.ordering (-created_at, -id).
        batch_ids = list(
            base_qs.order_by("id").values_list("id", flat=True)[:_PURGE_BATCH_SIZE]
        )
        if not batch_ids:
            break
        deleted_total += ProfileVisit.objects.filter(id__in=batch_ids).delete()[0]
    return deleted_total
