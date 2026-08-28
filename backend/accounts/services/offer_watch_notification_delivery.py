"""Transactional delivery of persisted offer-watch notification candidates."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from accounts.models import OfferWatchNotification, OfferedSkill
from accounts.services.notification_events.offer_watches import (
    create_offer_watch_match_notification,
)
from accounts.services.offer_watch_matching import matching_watches_for_offer


@transaction.atomic
def deliver_offer_watch_notification(*, candidate_id: int) -> bool:
    """Resolve one candidate exactly once and return whether a notification was made."""

    try:
        candidate = OfferWatchNotification.objects.select_for_update().get(
            pk=int(candidate_id)
        )
    except OfferWatchNotification.DoesNotExist:
        return False

    if candidate.processed_at is not None:
        return False

    try:
        offer = OfferedSkill.objects.select_related("user").get(pk=candidate.offer_id)
    except OfferedSkill.DoesNotExist:
        # The candidate normally disappears through CASCADE. Keep the queued task
        # harmless if it races with deletion.
        return False

    matching_watch = (
        matching_watches_for_offer(offer=offer)
        .select_for_update()
        .filter(user_id=candidate.user_id)
        .first()
    )
    processed_at = timezone.now()
    if matching_watch is None:
        candidate.processed_at = processed_at
        candidate.save(update_fields=["processed_at"])
        return False

    notification = create_offer_watch_match_notification(
        user=matching_watch.user,
        offer=offer,
    )
    candidate.watch = matching_watch
    candidate.processed_at = processed_at
    update_fields = ["watch", "processed_at"]
    if notification is not None:
        candidate.notified_at = processed_at
        update_fields.append("notified_at")
    candidate.save(update_fields=update_fields)
    return notification is not None
