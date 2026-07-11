"""
Notification service – verejný re-export hub.

Jadro (create_notification, dispatch, cache/unread helpery, in-app gate, konštanty)
žije v notification_core; doménové create_*_notification v notification_events.
Tento modul ich re-exportuje kvôli spätnej kompatibilite importov
`from accounts.services.notifications import ...` a drží retenčnú politiku + purge.

notification_core aj notification_events importujú z notification_core (leaf) –
tento hub neimportuje nikto, takže žiadny circular import (BOD 22).
"""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from accounts.models import Notification, NotificationType

from .notification_core import (  # noqa: F401
    GENERAL_NOTIFICATION_EXCLUDED_TYPES,
    GENERAL_NOTIFICATION_UNREAD_TYPE,
    NOTIFICATION_FEED_LIMIT,
    UNREAD_COUNT_CACHE_TTL_SECONDS,
    _dispatch_created_notification,
    _in_app_notifications_enabled,
    _trim_managed_notifications,
    _unread_cache_key,
    cache_unread_count,
    create_notification,
    exclude_general_notification_types,
    get_unread_count,
)

# Retenčná politika (dni) podľa typu. Purge maže notifikácie staršie než limit
# (anchor = created_at, bez ohľadu na read stav – GDPR minimalizácia dát).
# Typy, ktoré tu NIE sú uvedené, sa NEmažú (bezpečný default pre neznáme typy).
NOTIFICATION_RETENTION_DAYS: dict[str, int] = {
    # Informačné / sociálne
    NotificationType.OFFER_LIKED: 30,
    NotificationType.PORTFOLIO_LIKED: 30,
    NotificationType.PROFILE_LIKED: 30,
    NotificationType.REVIEW_LIKED: 30,
    # Dôležité (status výmeny / recenzie)
    NotificationType.REVIEW_CREATED: 60,
    NotificationType.REVIEW_REPLY_CREATED: 60,
    NotificationType.SKILL_REQUEST_ACCEPTED: 60,
    NotificationType.SKILL_REQUEST_REJECTED: 60,
    NotificationType.SKILL_REQUEST_CANCELLED: 60,
    NotificationType.SKILL_REQUEST_COMPLETED: 60,
    NotificationType.SKILL_REQUEST_TERMINATED: 60,
    # Transakčné (niekto čaká na akciu)
    NotificationType.SKILL_REQUEST: 90,
    NotificationType.SKILL_REQUEST_COMPLETION_REQUESTED: 90,
    NotificationType.GROUP_INVITATION: 90,
}

_PURGE_BATCH_SIZE = 1000


def purge_old_notifications(*, dry_run: bool = True) -> dict[str, int]:
    """
    Zmaže notifikácie staršie než retenčný limit ich typu (anchor = created_at).

    Vracia počet (z)mazaných riadkov per typ. Pri dry_run len spočíta (nič nemaže).
    Reálne mazanie beží v dávkach (scale-safe pri miliónoch riadkov). Bezpečné:
    Notification nemá žiadne child FK (je čistý leaf), takže žiadny cascade.
    """
    now = timezone.now()
    summary: dict[str, int] = {}

    for notif_type, days in NOTIFICATION_RETENTION_DAYS.items():
        cutoff = now - timedelta(days=days)
        base_qs = Notification.objects.filter(type=notif_type, created_at__lt=cutoff)

        if dry_run:
            summary[notif_type] = base_qs.count()
            continue

        deleted_total = 0
        while True:
            batch_ids = list(base_qs.values_list("id", flat=True)[:_PURGE_BATCH_SIZE])
            if not batch_ids:
                break
            deleted_total += Notification.objects.filter(id__in=batch_ids).delete()[0]
        summary[notif_type] = deleted_total

    return summary


# Doménové create_*_notification funkcie žijú v notification_events (importuje
# notification_core, NIE tento hub -> žiadny cyklus). Re-export pre kompatibilitu.
from .notification_events import (  # noqa: E402, F401
    create_group_invitation_notification,
    create_offer_liked_notification,
    create_portfolio_liked_notification,
    create_profile_liked_notification,
    create_review_created_notification,
    create_review_liked_notification,
    create_review_reply_notification,
    create_skill_request_accepted_notification,
    create_skill_request_completed_notification,
    create_skill_request_completion_requested_notification,
    create_skill_request_notification,
    create_skill_request_rejected_notification,
    create_skill_request_terminated_notification,
)
