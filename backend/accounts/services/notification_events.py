"""
Doménové create_*_notification funkcie (vyčlenené z services/notifications.py
kvôli dĺžke <500 r.). Jadro (create_notification, dispatch, unread count, cache,
in_app gate) žije v notification_core (leaf) a tieto funkcie ho volajú – tým sa
vyhýbame circular importu s notifications hubom.

Re-export cez services/notifications zachováva spätnú kompatibilitu importov
`from accounts.services.notifications import create_*_notification` v ostatnom kóde.
"""

from __future__ import annotations

from django.db import transaction

from accounts.models import Notification, NotificationType
from accounts.realtime import notify_user
from accounts.serializers import NotificationSerializer

from .notification_core import (
    UNREAD_COUNT_CACHE_TTL_SECONDS,
    cache_unread_count,
    create_notification,
    get_unread_count,
)


def create_group_invitation_notification(*, invitation, actor) -> Notification | None:
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


def _skill_request_kind(skill_request) -> str:
    offer = getattr(skill_request, "offer", None)
    if (
        getattr(skill_request, "proposal_description", "")
        or getattr(skill_request, "proposed_offer_id", None)
        or bool(getattr(offer, "is_seeking", False))
    ):
        return "help_offer"
    return "skill_request"


def _dispatch_skill_request_notification(notification_id: int, user_id: int) -> None:
    """
    Dispatch pre iniciálnu SKILL_REQUEST notifikáciu (Requests badge).

    SKILL_REQUEST je vylúčený z „all" feedu (patrí modulu Žiadosti), preto NEpoužíva
    generický notification_created event ani „all" počítadlo, ale vlastný
    skill_request WS event + skill_request cache – rovnaké správanie ako pôvodné
    _notify_unread_count vo views vrstve.
    """
    notification = (
        Notification.objects.select_related("actor", "skill_request")
        .filter(id=notification_id, user_id=user_id)
        .first()
    )
    unread_count = get_unread_count(
        user_id=user_id,
        notif_type=NotificationType.SKILL_REQUEST,
    )
    cache_unread_count(
        user_id=user_id,
        notif_type=NotificationType.SKILL_REQUEST,
        count=unread_count,
        ttl_seconds=UNREAD_COUNT_CACHE_TTL_SECONDS,
    )
    event = {"type": "skill_request", "unread_count": unread_count}
    if notification is not None:
        try:
            event["notification"] = NotificationSerializer(notification).data
        except Exception:
            pass
    notify_user(user_id, event)


def create_skill_request_notification(
    *, skill_request, actor, proposed_offer=None
) -> Notification:
    """
    Iniciálna notifikácia príjemcovi o novej žiadosti/ponuke pomoci.

    Centralizuje vytváranie (predtým priamy Notification.objects.create vo views)
    a dispatchuje Requests badge (skill_request WS event + cache) cez
    transaction.on_commit.

    ZÁMERNE NErešpektuje in_app_notifications toggle: skill_request je transakčná
    notifikácia (niekto čaká na odpoveď), preto badge musí chodiť vždy. Ostatné
    typy (recenzie, lajky, …) ostávajú gatované cez create_notification.
    """
    recipient = skill_request.recipient
    offer = skill_request.offer
    actor_name = (getattr(actor, "display_name", "") or "").strip() or "Používateľ"
    subject = getattr(offer, "subcategory", None) or getattr(offer, "category", "")
    if getattr(offer, "is_seeking", False):
        body = f"{actor_name} ponúka pomoc s kartou: {subject}"
    else:
        body = f"{actor_name} má záujem o ponuku: {subject}"

    notification = Notification.objects.create(
        user=recipient,
        type=NotificationType.SKILL_REQUEST,
        title="Nová žiadosť",
        body=body,
        data={
            "skill_request_id": skill_request.id,
            "offer_id": offer.id,
            "offer_is_seeking": bool(getattr(offer, "is_seeking", False)),
            "proposed_offer_id": getattr(proposed_offer, "id", None),
            "from_user_id": getattr(actor, "id", None),
        },
        actor=actor,
        skill_request=skill_request,
    )
    transaction.on_commit(
        lambda: _dispatch_skill_request_notification(
            notification.id, int(recipient.id)
        )
    )
    return notification


def create_skill_request_accepted_notification(
    *, skill_request, actor
) -> Notification | None:
    actor_name = (getattr(actor, "display_name", "") or "").strip() or "Používateľ"
    request_kind = _skill_request_kind(skill_request)
    is_help_offer = request_kind == "help_offer"
    return create_notification(
        user=skill_request.requester,
        notif_type=NotificationType.SKILL_REQUEST_ACCEPTED,
        title="Tvoja ponuka bola prijatá" if is_help_offer else "Žiadosť prijatá",
        body=(
            f"{actor_name} prijal tvoju ponuku pomoci."
            if is_help_offer
            else f"{actor_name} prijal tvoju žiadosť."
        ),
        actor=actor,
        skill_request=skill_request,
        data={
            "skill_request_id": skill_request.id,
            "offer_id": skill_request.offer_id,
            "accepted_by_user_id": actor.id,
            "request_kind": request_kind,
        },
    )


def create_skill_request_rejected_notification(
    *, skill_request, actor
) -> Notification | None:
    actor_name = (getattr(actor, "display_name", "") or "").strip() or "Používateľ"
    request_kind = _skill_request_kind(skill_request)
    is_help_offer = request_kind == "help_offer"
    return create_notification(
        user=skill_request.requester,
        notif_type=NotificationType.SKILL_REQUEST_REJECTED,
        title="Tvoja ponuka bola odmietnutá" if is_help_offer else "Žiadosť odmietnutá",
        body=(
            f"{actor_name} odmietol tvoju ponuku pomoci."
            if is_help_offer
            else f"{actor_name} odmietol tvoju žiadosť."
        ),
        actor=actor,
        skill_request=skill_request,
        data={
            "skill_request_id": skill_request.id,
            "offer_id": skill_request.offer_id,
            "rejected_by_user_id": actor.id,
            "request_kind": request_kind,
        },
    )


def create_skill_request_completion_requested_notification(
    *, skill_request, actor
) -> Notification | None:
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


def create_skill_request_completed_notification(
    *, skill_request, actor
) -> Notification | None:
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


def create_skill_request_terminated_notification(
    *, skill_request, termination, actor
) -> Notification | None:
    recipient = (
        skill_request.recipient
        if getattr(actor, "id", None) == skill_request.requester_id
        else skill_request.requester
    )
    actor_name = (getattr(actor, "display_name", "") or "").strip() or "Používateľ"
    return create_notification(
        user=recipient,
        notif_type=NotificationType.SKILL_REQUEST_TERMINATED,
        title="Výmena skončila",
        body=f"{actor_name} skončil výmenu.",
        actor=actor,
        skill_request=skill_request,
        data={
            "skill_request_id": skill_request.id,
            "offer_id": skill_request.offer_id,
            "terminated_by_user_id": actor.id,
            "termination_reason": termination.reason,
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


def create_review_liked_notification(*, review, actor) -> Notification | None:
    reviewer = getattr(review, "reviewer", None)
    if reviewer is None or getattr(reviewer, "id", None) == getattr(actor, "id", None):
        return None

    existing = (
        Notification.objects.filter(
            user=reviewer,
            type=NotificationType.REVIEW_LIKED,
            data__review_id=review.id,
            data__from_user_id=actor.id,
        )
        .order_by("-created_at", "-id")
        .first()
    )
    if existing is not None:
        return existing

    actor_name = (getattr(actor, "display_name", "") or "").strip() or "Používateľ"
    return create_notification(
        user=reviewer,
        notif_type=NotificationType.REVIEW_LIKED,
        title="Páči sa mi tvoja recenzia",
        body=f"{actor_name} označil tvoju recenziu ako páči sa mi.",
        actor=actor,
        data={
            "review_id": review.id,
            "offer_id": review.offer_id,
            "from_user_id": actor.id,
        },
    )


def create_offer_liked_notification(*, offer, actor) -> Notification | None:
    owner = getattr(offer, "user", None)
    if owner is None or getattr(owner, "id", None) == getattr(actor, "id", None):
        return None

    existing = (
        Notification.objects.filter(
            user=owner,
            type=NotificationType.OFFER_LIKED,
            data__offer_id=offer.id,
            actor=actor,
        )
        .order_by("-created_at", "-id")
        .first()
    )
    if existing is not None:
        return existing

    return create_notification(
        user=owner,
        notif_type=NotificationType.OFFER_LIKED,
        title="Páči sa mi tvoja ponuka",
        body="",
        actor=actor,
        data={
            "offer_id": offer.id,
        },
    )
