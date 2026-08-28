"""Spoľahlivé naplánovanie párovania novo vytvorenej karty."""

from __future__ import annotations

import logging

from django.db import transaction

from accounts.models import OfferWatchMatchOutbox

logger = logging.getLogger(__name__)


def schedule_offer_watch_matching(*, offer_id: int) -> None:
    """Ulož trvalý intent a enqueue vykonaj až po úspešnom DB commite."""

    normalized_offer_id = int(offer_id)
    OfferWatchMatchOutbox.objects.get_or_create(offer_id=normalized_offer_id)

    def _enqueue() -> None:
        try:
            from accounts.offer_watch_tasks import process_offer_watch_matches_task

            process_offer_watch_matches_task.delay(offer_id=normalized_offer_id)
        except Exception:
            logger.warning(
                "Offer watch matching task could not be enqueued; "
                "the durable matching intent remains pending.",
                extra={"offer_id": normalized_offer_id},
                exc_info=True,
            )

    transaction.on_commit(_enqueue)
