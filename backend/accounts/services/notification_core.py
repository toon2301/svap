"""
Jadro notifikácií (vyčlenené z notifications.py kvôli circular importu).

Cache/unread helpery, konštanty, in-app gate a create_notification (+ dispatch/trim).
Toto je LEAF modul – neimportuje z notifications ani notification_events, takže
notification_events môže bezpečne importovať odtiaľto bez cyklu.
"""

from __future__ import annotations

import logging
import os

from django.core.cache import cache
from django.db import transaction

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
