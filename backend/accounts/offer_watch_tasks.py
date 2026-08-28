"""Celery úlohy pre spoľahlivé párovanie nových kariet so sledovaniami."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from celery import shared_task
from django.conf import settings
from django.db.models import F, Q
from django.utils import timezone

from accounts.models import OfferWatchMatchOutbox, OfferWatchNotification, OfferedSkill
from accounts.services.offer_watch_matching import register_matches_for_new_offer
from accounts.services.offer_watch_notification_dispatch import (
    schedule_offer_watch_notification,
)

logger = logging.getLogger(__name__)
_MATCH_RECOVERY_BATCH_SIZE = 100


def _stale_match_claim_cutoff(now: datetime) -> datetime:
    return now - timedelta(seconds=settings.OFFER_WATCH_MATCH_STALE_CLAIM_SECONDS)


@shared_task(
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    time_limit=60,
)
def process_offer_watch_matches_task(self, *, offer_id: int) -> int:
    """Atomicky prevezmi intent a idempotentne ulož kandidátov zhody."""

    normalized_offer_id = int(offer_id)
    claimed_at = timezone.now()
    claimed_count = (
        OfferWatchMatchOutbox.objects.filter(offer_id=normalized_offer_id)
        .filter(
            Q(claimed_at__isnull=True)
            | Q(claimed_at__lt=_stale_match_claim_cutoff(claimed_at))
        )
        .update(
            claimed_at=claimed_at,
            attempt_count=F("attempt_count") + 1,
            last_attempt_at=claimed_at,
        )
    )
    if claimed_count == 0:
        return 0

    try:
        offer = OfferedSkill.objects.get(pk=normalized_offer_id)
        created_candidates = register_matches_for_new_offer(offer=offer)
    except OfferedSkill.DoesNotExist:
        OfferWatchMatchOutbox.objects.filter(
            offer_id=normalized_offer_id,
            claimed_at=claimed_at,
        ).delete()
        logger.info(
            "Offer watch matching skipped because the offer no longer exists.",
            extra={"offer_id": normalized_offer_id},
        )
        return 0
    except Exception:
        OfferWatchMatchOutbox.objects.filter(
            offer_id=normalized_offer_id,
            claimed_at=claimed_at,
        ).update(claimed_at=None)
        raise

    OfferWatchMatchOutbox.objects.filter(
        offer_id=normalized_offer_id,
        claimed_at=claimed_at,
    ).delete()
    pending_candidate_ids = list(
        OfferWatchNotification.objects.filter(
            offer_id=normalized_offer_id,
            processed_at__isnull=True,
        )
        .order_by("id")
        .values_list("id", flat=True)
    )
    for pending_candidate_id in pending_candidate_ids:
        schedule_offer_watch_notification(candidate_id=pending_candidate_id)
    created_count = len(created_candidates)
    logger.info(
        "Offer watch matching finished.",
        extra={
            "offer_id": normalized_offer_id,
            "created_candidate_count": created_count,
        },
    )
    return created_count


@shared_task(
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
    time_limit=30,
)
def recover_pending_offer_watch_matches_task(self) -> int:
    """Znovu enqueue neprevzaté a expirované trvalé matching intenty."""

    stale_claim_cutoff = _stale_match_claim_cutoff(timezone.now())
    offer_ids = list(
        OfferWatchMatchOutbox.objects.filter(
            Q(claimed_at__isnull=True) | Q(claimed_at__lt=stale_claim_cutoff)
        )
        .order_by("id")
        .values_list("offer_id", flat=True)[:_MATCH_RECOVERY_BATCH_SIZE]
    )
    for pending_offer_id in offer_ids:
        process_offer_watch_matches_task.delay(offer_id=pending_offer_id)
    return len(offer_ids)
