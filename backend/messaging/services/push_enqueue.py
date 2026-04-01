from __future__ import annotations

from importlib import import_module
import logging

from django.db import transaction

logger = logging.getLogger(__name__)


class _LazyDeliverMessagePushTask:
    @staticmethod
    def delay(*args, **kwargs):
        task_module = import_module("swaply.tasks.webpush")
        return task_module.deliver_message_push_task.delay(*args, **kwargs)


deliver_message_push_task = _LazyDeliverMessagePushTask()


def _normalize_positive_ids(values) -> tuple[int, ...]:
    normalized: list[int] = []
    for value in values or []:
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            continue
        if parsed > 0:
            normalized.append(parsed)
    return tuple(sorted(set(normalized)))


def schedule_message_push_delivery(*, message_id: int, recipient_user_ids) -> None:
    normalized_recipient_ids = _normalize_positive_ids(recipient_user_ids)
    if not normalized_recipient_ids:
        return

    def _enqueue() -> None:
        try:
            deliver_message_push_task.delay(
                message_id=int(message_id),
                recipient_user_ids=list(normalized_recipient_ids),
            )
        except Exception:
            logger.warning(
                "Web push delivery task could not be enqueued.",
                extra={
                    "message_id": int(message_id),
                    "recipient_count": len(normalized_recipient_ids),
                },
                exc_info=True,
            )

    transaction.on_commit(_enqueue)
