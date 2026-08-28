"""Celery delivery and recovery for offer-watch in-app notifications."""

from __future__ import annotations

from celery import shared_task

from accounts.models import OfferWatchNotification
from accounts.services.offer_watch_notification_delivery import (
    deliver_offer_watch_notification,
)

_DELIVERY_RECOVERY_BATCH_SIZE = 100


@shared_task(
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    time_limit=60,
)
def deliver_offer_watch_notification_task(self, *, candidate_id: int) -> bool:
    return deliver_offer_watch_notification(candidate_id=int(candidate_id))


@shared_task(
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    time_limit=30,
)
def recover_pending_offer_watch_notifications_task(self) -> int:
    candidate_ids = list(
        OfferWatchNotification.objects.filter(processed_at__isnull=True)
        .order_by("matched_at", "id")
        .values_list("id", flat=True)[:_DELIVERY_RECOVERY_BATCH_SIZE]
    )
    for candidate_id in candidate_ids:
        deliver_offer_watch_notification_task.delay(candidate_id=candidate_id)
    return len(candidate_ids)
