from __future__ import annotations

from django.core.cache import cache
from django.db import transaction

from accounts.models import Notification, NotificationType
from accounts.realtime import notify_user
from accounts.serializers import NotificationSerializer

NOTIFICATION_FEED_LIMIT = 15
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
    notify_user(
        user_id,
        {
            "type": "notification_created",
            "notification": NotificationSerializer(notification).data,
            "unread_count": get_unread_count(user_id=user_id),
        },
    )


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
) -> Notification:
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


def create_group_invitation_notification(*, invitation, actor) -> Notification:
    conversation = invitation.conversation
    return create_notification(
        user=invitation.invited_user,
        notif_type=NotificationType.GROUP_INVITATION,
        title="Pozvánka do skupiny",
        body="Dostali ste pozvánku do skupinového chatu.",
        actor=actor,
        conversation=conversation,
        group_invitation=invitation,
        data={
            "conversation_id": conversation.id,
            "group_invitation_id": invitation.id,
            "from_user_id": actor.id,
        },
    )


def create_skill_request_accepted_notification(*, skill_request, actor) -> Notification:
    actor_name = (getattr(actor, "display_name", "") or "").strip() or "Používateľ"
    return create_notification(
        user=skill_request.requester,
        notif_type=NotificationType.SKILL_REQUEST_ACCEPTED,
        title="Žiadosť prijatá",
        body=f"{actor_name} prijal tvoju žiadosť.",
        actor=actor,
        skill_request=skill_request,
        data={
            "skill_request_id": skill_request.id,
            "offer_id": skill_request.offer_id,
            "accepted_by_user_id": actor.id,
        },
    )


def create_skill_request_completion_requested_notification(
    *, skill_request, actor
) -> Notification:
    existing = (
        Notification.objects.filter(
            user=skill_request.requester,
            type=NotificationType.SKILL_REQUEST_COMPLETION_REQUESTED,
            skill_request=skill_request,
        )
        .order_by("-created_at", "-id")
        .first()
    )
    if existing is not None:
        return existing

    actor_name = (getattr(actor, "display_name", "") or "").strip() or "Používateľ"
    return create_notification(
        user=skill_request.requester,
        notif_type=NotificationType.SKILL_REQUEST_COMPLETION_REQUESTED,
        title="Výmena označená ako dokončená",
        body=f"{actor_name} označil výmenu ako dokončenú.",
        actor=actor,
        skill_request=skill_request,
        data={
            "skill_request_id": skill_request.id,
            "offer_id": skill_request.offer_id,
            "completed_by_user_id": actor.id,
        },
    )


def create_skill_request_completed_notification(*, skill_request, actor) -> Notification:
    existing = (
        Notification.objects.filter(
            user=skill_request.recipient,
            type=NotificationType.SKILL_REQUEST_COMPLETED,
            skill_request=skill_request,
        )
        .order_by("-created_at", "-id")
        .first()
    )
    if existing is not None:
        return existing

    actor_name = (getattr(actor, "display_name", "") or "").strip() or "Používateľ"
    return create_notification(
        user=skill_request.recipient,
        notif_type=NotificationType.SKILL_REQUEST_COMPLETED,
        title="Dokončenie výmeny potvrdené",
        body=f"{actor_name} potvrdil dokončenie výmeny.",
        actor=actor,
        skill_request=skill_request,
        data={
            "skill_request_id": skill_request.id,
            "offer_id": skill_request.offer_id,
            "confirmed_by_user_id": actor.id,
        },
    )


def create_review_created_notification(*, review, actor) -> Notification | None:
    offer = getattr(review, "offer", None)
    owner = getattr(offer, "user", None)
    if owner is None or getattr(owner, "id", None) == getattr(actor, "id", None):
        return None

    actor_name = (getattr(actor, "display_name", "") or "").strip() or "Používateľ"
    return create_notification(
        user=owner,
        notif_type=NotificationType.REVIEW_CREATED,
        title="Nová recenzia",
        body=f"{actor_name} napísal recenziu na tvoju kartu.",
        actor=actor,
        data={
            "review_id": review.id,
            "offer_id": review.offer_id,
            "from_user_id": actor.id,
        },
    )


def create_review_reply_notification(*, review, actor) -> Notification | None:
    reviewer = getattr(review, "reviewer", None)
    if reviewer is None or getattr(reviewer, "id", None) == getattr(actor, "id", None):
        return None

    existing = (
        Notification.objects.filter(
            user=reviewer,
            type=NotificationType.REVIEW_REPLY_CREATED,
            data__review_id=review.id,
        )
        .order_by("-created_at", "-id")
        .first()
    )
    if existing is not None:
        return existing

    actor_name = (getattr(actor, "display_name", "") or "").strip() or "Používateľ"
    return create_notification(
        user=reviewer,
        notif_type=NotificationType.REVIEW_REPLY_CREATED,
        title="Odpoveď na recenziu",
        body=f"{actor_name} odpovedal na tvoju recenziu.",
        actor=actor,
        data={
            "review_id": review.id,
            "offer_id": review.offer_id,
            "from_user_id": actor.id,
        },
    )
