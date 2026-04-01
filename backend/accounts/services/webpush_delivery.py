from __future__ import annotations

import json
import logging
from dataclasses import dataclass

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from accounts.services.webpush_subscriptions import (
    get_active_web_push_subscriptions_for_users,
    mark_web_push_delivery_failure,
    mark_web_push_delivery_success,
)
from messaging.models import Message

logger = logging.getLogger(__name__)

MESSAGE_PUSH_TYPE = "message_push"
MESSAGE_PUSH_TITLE = "Nova sprava"
MESSAGE_PUSH_BODY = "Mas novu spravu v aplikacii Swaply."
MESSAGE_PUSH_TTL_SECONDS = 60
MESSAGE_PUSH_TAG_PREFIX = "messages-conversation-"
TEMPORARY_PUSH_STATUS_CODES = {408, 425, 429, 500, 502, 503, 504}
GONE_PUSH_STATUS_CODES = {404, 410}


class WebPushSubscriptionGone(Exception):
    pass


class TemporaryWebPushDeliveryError(Exception):
    pass


class PermanentWebPushDeliveryError(Exception):
    pass


@dataclass(frozen=True)
class MessagePushDeliveryResult:
    delivered_count: int = 0
    retry_subscription_ids: tuple[int, ...] = ()


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


def _get_web_push_vapid_private_key() -> str:
    value = (getattr(settings, "WEB_PUSH_VAPID_PRIVATE_KEY", "") or "").strip()
    if not value:
        raise ImproperlyConfigured("WEB_PUSH_VAPID_PRIVATE_KEY is not configured.")
    return value


def _get_web_push_vapid_subject() -> str:
    value = (getattr(settings, "WEB_PUSH_VAPID_SUBJECT", "") or "").strip()
    if not value:
        raise ImproperlyConfigured("WEB_PUSH_VAPID_SUBJECT is not configured.")
    return value


def _import_pywebpush():
    try:
        from pywebpush import WebPushException, webpush
    except ImportError as exc:
        raise ImproperlyConfigured("pywebpush is not installed.") from exc
    return webpush, WebPushException


def ensure_web_push_delivery_ready() -> None:
    _get_web_push_vapid_private_key()
    _get_web_push_vapid_subject()


def build_message_push_payload(*, message: Message) -> dict[str, object]:
    conversation_id = int(message.conversation_id)
    return {
        "type": MESSAGE_PUSH_TYPE,
        "conversationId": conversation_id,
        "url": f"/dashboard/messages?conversationId={conversation_id}",
        "title": MESSAGE_PUSH_TITLE,
        "body": MESSAGE_PUSH_BODY,
        "tag": f"{MESSAGE_PUSH_TAG_PREFIX}{conversation_id}",
    }


def send_web_push_request(
    *,
    endpoint: str,
    p256dh: str,
    auth: str,
    payload: dict[str, object],
):
    webpush, WebPushException = _import_pywebpush()

    try:
        return webpush(
            subscription_info={
                "endpoint": endpoint,
                "keys": {
                    "p256dh": p256dh,
                    "auth": auth,
                },
            },
            data=json.dumps(payload, separators=(",", ":")),
            vapid_private_key=_get_web_push_vapid_private_key(),
            vapid_claims={"sub": _get_web_push_vapid_subject()},
            ttl=MESSAGE_PUSH_TTL_SECONDS,
        )
    except WebPushException as exc:
        response = getattr(exc, "response", None)
        status_code = getattr(response, "status_code", None)
        if status_code in GONE_PUSH_STATUS_CODES:
            raise WebPushSubscriptionGone(
                f"Push subscription is gone (status={status_code})."
            ) from exc
        if status_code in TEMPORARY_PUSH_STATUS_CODES:
            raise TemporaryWebPushDeliveryError(
                f"Temporary web push failure (status={status_code})."
            ) from exc
        raise PermanentWebPushDeliveryError(
            f"Permanent web push failure (status={status_code})."
        ) from exc
    except requests.RequestException as exc:
        raise TemporaryWebPushDeliveryError("Temporary web push network failure.") from exc


def deliver_message_push(
    *,
    message_id: int,
    recipient_user_ids,
    subscription_ids=None,
) -> MessagePushDeliveryResult:
    normalized_recipient_ids = _normalize_positive_ids(recipient_user_ids)
    if not normalized_recipient_ids:
        return MessagePushDeliveryResult()

    try:
        ensure_web_push_delivery_ready()
    except ImproperlyConfigured:
        logger.exception(
            "Web push delivery skipped because configuration is invalid.",
            extra={"message_id": int(message_id)},
        )
        return MessagePushDeliveryResult()

    message = (
        Message.objects.filter(id=message_id)
        .only("id", "conversation_id")
        .first()
    )
    if message is None:
        return MessagePushDeliveryResult()

    payload = build_message_push_payload(message=message)
    subscriptions = list(
        get_active_web_push_subscriptions_for_users(
            user_ids=normalized_recipient_ids,
            subscription_ids=subscription_ids,
        )
    )
    if not subscriptions:
        return MessagePushDeliveryResult()

    retry_subscription_ids: list[int] = []
    delivered_count = 0

    for subscription in subscriptions:
        try:
            endpoint = subscription.endpoint
            p256dh = subscription.p256dh
            auth = subscription.auth
        except ImproperlyConfigured:
            logger.exception(
                "Web push subscription could not be decrypted.",
                extra={
                    "subscription_id": subscription.id,
                    "user_id": subscription.user_id,
                },
            )
            mark_web_push_delivery_failure(subscription=subscription)
            continue

        try:
            send_web_push_request(
                endpoint=endpoint,
                p256dh=p256dh,
                auth=auth,
                payload=payload,
            )
        except ImproperlyConfigured:
            logger.exception(
                "Web push delivery skipped because sender configuration is invalid.",
                extra={"message_id": int(message_id)},
            )
            return MessagePushDeliveryResult(
                delivered_count=delivered_count,
                retry_subscription_ids=tuple(sorted(set(retry_subscription_ids))),
            )
        except WebPushSubscriptionGone:
            mark_web_push_delivery_failure(subscription=subscription, deactivate=True)
            logger.info(
                "Web push subscription deactivated after permanent gone response.",
                extra={
                    "subscription_id": subscription.id,
                    "user_id": subscription.user_id,
                },
            )
        except TemporaryWebPushDeliveryError:
            mark_web_push_delivery_failure(subscription=subscription)
            retry_subscription_ids.append(subscription.id)
            logger.warning(
                "Temporary web push delivery failure will be retried.",
                extra={
                    "subscription_id": subscription.id,
                    "user_id": subscription.user_id,
                    "message_id": int(message_id),
                },
            )
        except PermanentWebPushDeliveryError:
            mark_web_push_delivery_failure(subscription=subscription)
            logger.warning(
                "Permanent web push delivery failure without subscription deactivation.",
                extra={
                    "subscription_id": subscription.id,
                    "user_id": subscription.user_id,
                    "message_id": int(message_id),
                },
            )
        else:
            mark_web_push_delivery_success(subscription=subscription)
            delivered_count += 1

    return MessagePushDeliveryResult(
        delivered_count=delivered_count,
        retry_subscription_ids=tuple(sorted(set(retry_subscription_ids))),
    )
