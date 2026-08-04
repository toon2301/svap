"""Notifikácie k lajkom ponuky, portfólia a profilu."""

from __future__ import annotations

from accounts.models import Notification, NotificationType

from ..notification_core import create_notification


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


def create_portfolio_liked_notification(*, item, actor) -> Notification | None:
    owner = getattr(item, "owner", None)
    if owner is None or getattr(owner, "id", None) == getattr(actor, "id", None):
        return None

    existing = (
        Notification.objects.filter(
            user=owner,
            type=NotificationType.PORTFOLIO_LIKED,
            data__portfolio_item_id=item.id,
            actor=actor,
        )
        .order_by("-created_at", "-id")
        .first()
    )
    if existing is not None:
        return existing

    return create_notification(
        user=owner,
        notif_type=NotificationType.PORTFOLIO_LIKED,
        title="Páči sa mi tvoje portfólio",
        body="",
        actor=actor,
        data={
            "portfolio_item_id": item.id,
        },
    )


def create_profile_liked_notification(*, profile_user, actor) -> Notification | None:
    if profile_user is None or getattr(profile_user, "id", None) == getattr(actor, "id", None):
        return None

    existing = (
        Notification.objects.filter(
            user=profile_user,
            type=NotificationType.PROFILE_LIKED,
            data__profile_user_id=profile_user.id,
            actor=actor,
        )
        .order_by("-created_at", "-id")
        .first()
    )
    if existing is not None:
        return existing

    return create_notification(
        user=profile_user,
        notif_type=NotificationType.PROFILE_LIKED,
        title="Paci sa mi tvoj profil",
        body="",
        actor=actor,
        data={
            "profile_user_id": profile_user.id,
            "from_user_id": actor.id,
        },
    )
