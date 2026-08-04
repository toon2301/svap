"""Notifikácie k žiadostiam o výmenu (skill requests).

``create_skill_request_notification`` zámerne obchádza in_app toggle a
dispatchuje Requests badge vlastnou cestou – detaily v docstringu funkcie.
"""

from __future__ import annotations

from django.db import transaction

from accounts.models import Notification, NotificationType

from ..notification_core import create_notification, dispatch_unread_badge


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
    dispatch_unread_badge(
        user_id=user_id,
        count_type=NotificationType.SKILL_REQUEST,
        cache_type=NotificationType.SKILL_REQUEST,
        ws_type="skill_request",
        notification=notification,
    )


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
