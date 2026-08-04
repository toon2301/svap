"""Notifikácie k recenziám (nová, odpoveď, lajk)."""

from __future__ import annotations

from accounts.models import Notification, NotificationType

from ..notification_core import create_notification


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
            "reviewed_user_id": review.reviewed_user_id,
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
            "reviewed_user_id": review.reviewed_user_id,
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
            "reviewed_user_id": review.reviewed_user_id,
            "from_user_id": actor.id,
        },
    )
