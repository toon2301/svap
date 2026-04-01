from __future__ import annotations

from celery import shared_task

from accounts.services.webpush_delivery import deliver_message_push

MAX_PUSH_RETRIES = 5
MAX_PUSH_RETRY_DELAY_SECONDS = 15 * 60


def _retry_delay_for_attempt(retries: int) -> int:
    attempt = max(int(retries or 0), 0)
    return min(60 * (2**attempt), MAX_PUSH_RETRY_DELAY_SECONDS)


@shared_task(bind=True, max_retries=MAX_PUSH_RETRIES)
def deliver_message_push_task(
    self,
    *,
    message_id: int,
    recipient_user_ids,
    subscription_ids=None,
) -> None:
    result = deliver_message_push(
        message_id=message_id,
        recipient_user_ids=recipient_user_ids,
        subscription_ids=subscription_ids,
    )
    if not result.retry_subscription_ids:
        return

    raise self.retry(
        kwargs={
            "message_id": int(message_id),
            "recipient_user_ids": list(recipient_user_ids or []),
            "subscription_ids": list(result.retry_subscription_ids),
        },
        countdown=_retry_delay_for_attempt(getattr(self.request, "retries", 0)),
    )
