from __future__ import annotations

import logging
import os
from datetime import timedelta

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from accounts.models import Notification, NotificationType
from accounts.realtime import notify_user
from accounts.serializers import NotificationSerializer

NOTIFICATION_FEED_LIMIT = 15
_DEFAULT_UNREAD_COUNT_CACHE_TTL_SECONDS = 60
_raw_unread_count_cache_ttl = (
    os.getenv(
        "UNREAD_COUNT_CACHE_TTL_SECONDS",
        str(_DEFAULT_UNREAD_COUNT_CACHE_TTL_SECONDS),
    )
    or str(_DEFAULT_UNREAD_COUNT_CACHE_TTL_SECONDS)
)
try:
    UNREAD_COUNT_CACHE_TTL_SECONDS = int(_raw_unread_count_cache_ttl)
except ValueError:
    logging.getLogger(__name__).warning(
        "Invalid UNREAD_COUNT_CACHE_TTL_SECONDS=%r; using default %s",
        _raw_unread_count_cache_ttl,
        _DEFAULT_UNREAD_COUNT_CACHE_TTL_SECONDS,
    )
    UNREAD_COUNT_CACHE_TTL_SECONDS = _DEFAULT_UNREAD_COUNT_CACHE_TTL_SECONDS
GENERAL_NOTIFICATION_UNREAD_TYPE = "all"
_RETENTION_TYPES = (NotificationType.GROUP_INVITATION,)
GENERAL_NOTIFICATION_EXCLUDED_TYPES = (NotificationType.SKILL_REQUEST,)


def _unread_cache_key(user_id: int, notif_type: str) -> str:
    return f"notif_unread_count:{int(user_id)}:{str(notif_type).strip()}"


def exclude_general_notification_types(queryset):
    return queryset.exclude(type__in=GENERAL_NOTIFICATION_EXCLUDED_TYPES)


def get_unread_count(*, user_id: int, notif_type: str | None = None) -> int:
    queryset = Notification.objects.filter(user_id=user_id, is_read=False)
    if notif_type and notif_type != "all":
        queryset = queryset.filter(type=notif_type)
    else:
        queryset = exclude_general_notification_types(queryset)
    try:
        return int(queryset.count())
    except Exception:
        return 0


def cache_unread_count(*, user_id: int, notif_type: str, count: int, ttl_seconds: int) -> None:
    try:
        cache.set(
            _unread_cache_key(user_id, notif_type),
            int(count),
            timeout=ttl_seconds,
        )
    except Exception:
        pass


def _trim_managed_notifications(*, user_id: int) -> None:
    keep_ids = list(
        Notification.objects.filter(user_id=user_id, type__in=_RETENTION_TYPES)
        .order_by("-created_at", "-id")
        .values_list("id", flat=True)[:NOTIFICATION_FEED_LIMIT]
    )
    if not keep_ids:
        return
    Notification.objects.filter(user_id=user_id, type__in=_RETENTION_TYPES).exclude(
        id__in=keep_ids
    ).delete()


def _dispatch_created_notification(notification_id: int, user_id: int) -> None:
    notification = (
        Notification.objects.select_related(
            "actor",
            "conversation",
            "group_invitation",
            "skill_request",
        )
        .filter(id=notification_id, user_id=user_id)
        .first()
    )
    if notification is None:
        return
    unread_count = get_unread_count(
        user_id=user_id,
        notif_type=GENERAL_NOTIFICATION_UNREAD_TYPE,
    )
    cache_unread_count(
        user_id=user_id,
        notif_type=GENERAL_NOTIFICATION_UNREAD_TYPE,
        count=unread_count,
        ttl_seconds=UNREAD_COUNT_CACHE_TTL_SECONDS,
    )
    notify_user(
        user_id,
        {
            "type": "notification_created",
            "notification": NotificationSerializer(notification).data,
            "unread_count": unread_count,
        },
    )


def _in_app_notifications_enabled(user) -> bool:
    """
    Rešpektuje používateľovu preferenciu in-app notifikácií.

    Pri vypnutí sa notifikácia VÔBEC neuloží (GDPR minimalizácia dát). Push
    notifikácie riadi samostatný push_notifications toggle a tento gate ich
    neovplyvňuje. Fail-open (default True), ak profil chýba alebo nastane chyba –
    nechceme ticho stratiť notifikáciu kvôli chybe čítania preferencie.
    """
    try:
        profile = getattr(user, "profile", None)
        if profile is None:
            return True
        return bool(profile.in_app_notifications)
    except Exception:
        return True


def create_notification(
    *,
    user,
    notif_type: str,
    title: str = "",
    body: str = "",
    actor=None,
    skill_request=None,
    conversation=None,
    group_invitation=None,
    data: dict | None = None,
) -> Notification | None:
    if not _in_app_notifications_enabled(user):
        return None

    notification = Notification.objects.create(
        user=user,
        type=notif_type,
        title=(title or "")[:120],
        body=body or "",
        data=data or {},
        actor=actor,
        skill_request=skill_request,
        conversation=conversation,
        group_invitation=group_invitation,
    )
    _trim_managed_notifications(user_id=user.id)
    transaction.on_commit(
        lambda: _dispatch_created_notification(notification.id, int(user.id))
    )
    return notification


# Retenčná politika (dni) podľa typu. Purge maže notifikácie staršie než limit
# (anchor = created_at, bez ohľadu na read stav – GDPR minimalizácia dát).
# Typy, ktoré tu NIE sú uvedené, sa NEmažú (bezpečný default pre neznáme typy).
NOTIFICATION_RETENTION_DAYS: dict[str, int] = {
    # Informačné / sociálne
    NotificationType.OFFER_LIKED: 30,
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


# Doménové create_*_notification funkcie sú vyčlenené do notification_events
# (dĺžka súboru). Re-export zachováva spätnú kompatibilitu importov.
from .notification_events import (  # noqa: E402, F401
    create_group_invitation_notification,
    create_offer_liked_notification,
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
