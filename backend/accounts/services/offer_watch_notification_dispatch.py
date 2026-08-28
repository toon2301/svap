"""Best-effort enqueue backed by durable pending candidate rows."""

from __future__ import annotations

import logging

from django.db import transaction

logger = logging.getLogger(__name__)


def schedule_offer_watch_notification(*, candidate_id: int) -> None:
    normalized_candidate_id = int(candidate_id)

    def _enqueue() -> None:
        try:
            from accounts.offer_watch_notification_tasks import (
                deliver_offer_watch_notification_task,
            )

            deliver_offer_watch_notification_task.delay(
                candidate_id=normalized_candidate_id
            )
        except Exception:
            # The candidate is the durable intent. Beat recovery will enqueue it
            # after the broker becomes available again.
            logger.exception(
                "Offer watch notification enqueue failed; recovery will retry.",
                extra={"candidate_id": normalized_candidate_id},
            )

    transaction.on_commit(_enqueue)
