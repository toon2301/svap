from __future__ import annotations

import logging

from celery import shared_task

from accounts.feed_image_processing import (
    mark_feed_image_processing_failed,
    process_feed_post_image_record,
)

logger = logging.getLogger(__name__)

_MAX_RETRIES = 5


def _is_final_attempt(task) -> bool:
    """True na poslednom pokuse (initial beh + _MAX_RETRIES retries) – vzor
    swaply.tasks.portfolio_images."""
    retries = getattr(getattr(task, "request", None), "retries", None)
    return isinstance(retries, int) and retries >= _MAX_RETRIES


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": _MAX_RETRIES},
    soft_time_limit=120,
    time_limit=150,
)
def process_feed_post_image(self, feed_post_id: int) -> None:
    """Asynchrónne spracovanie fotky FeedPost-u (vzor process_portfolio_image)."""
    try:
        process_feed_post_image_record(feed_post_id)
    except Exception:
        # Po vyčerpaní retries by fotka ostala navždy PENDING a staging súbor
        # ako orphan – na poslednom pokuse označ REJECTED a uprac staging.
        if _is_final_attempt(self):
            mark_feed_image_processing_failed(feed_post_id)
        raise
