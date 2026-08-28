"""In-app notifications for new cards matching a saved watch."""

from __future__ import annotations

from accounts.models import Notification, NotificationType

from ..notification_core import create_notification


def create_offer_watch_match_notification(*, user, offer) -> Notification | None:
    """Create the localized-on-frontend notification with minimal stable data."""

    return create_notification(
        user=user,
        notif_type=NotificationType.OFFER_WATCH_MATCH,
        title="Nová zhoda sledovania",
        body=(
            "Pribudol nový dopyt zodpovedajúci tvojmu sledovaniu."
            if offer.is_seeking
            else "Pribudla nová ponuka zodpovedajúca tvojmu sledovaniu."
        ),
        actor=offer.user,
        data={
            "offer_id": offer.id,
            "offer_is_seeking": bool(offer.is_seeking),
        },
    )
