from __future__ import annotations

from django.db import IntegrityError, transaction
from django.utils import timezone

from accounts.webpush_models import WebPushSubscription

from .settings import get_or_create_user_profile
from .webpush_crypto import (
    encrypt_web_push_value,
    hash_web_push_endpoint,
    normalize_web_push_endpoint,
    normalize_web_push_key,
)


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


def upsert_web_push_subscription(
    *,
    user,
    endpoint: str,
    p256dh: str,
    auth: str,
    user_agent: str = "",
    device_label: str = "",
):
    get_or_create_user_profile(user)
    normalized_endpoint = normalize_web_push_endpoint(endpoint)
    normalized_p256dh = normalize_web_push_key(p256dh, field_name="p256dh")
    normalized_auth = normalize_web_push_key(auth, field_name="auth")
    endpoint_hash = hash_web_push_endpoint(normalized_endpoint)
    now = timezone.now()

    defaults = {
        "user": user,
        "endpoint_encrypted": encrypt_web_push_value(normalized_endpoint),
        "p256dh_encrypted": encrypt_web_push_value(normalized_p256dh),
        "auth_encrypted": encrypt_web_push_value(normalized_auth),
        "user_agent": (user_agent or "").strip()[:512],
        "device_label": (device_label or "").strip()[:120],
        "is_active": True,
        "last_seen_at": now,
        "failure_count": 0,
        "last_failure_at": None,
    }

    for _ in range(2):
        try:
            with transaction.atomic():
                subscription, created = WebPushSubscription.objects.update_or_create(
                    endpoint_hash=endpoint_hash,
                    defaults=defaults,
                )
                return subscription, created
        except IntegrityError:
            continue

    with transaction.atomic():
        subscription = WebPushSubscription.objects.select_for_update().get(
            endpoint_hash=endpoint_hash
        )
        for field, value in defaults.items():
            setattr(subscription, field, value)
        subscription.save(update_fields=[*defaults.keys(), "updated_at"])
        return subscription, False


def delete_web_push_subscription(*, user, endpoint: str) -> int:
    endpoint_hash = hash_web_push_endpoint(endpoint)
    deleted, _ = WebPushSubscription.objects.filter(
        user=user,
        endpoint_hash=endpoint_hash,
    ).delete()
    return deleted


def get_active_web_push_subscriptions_for_users(
    *,
    user_ids,
    subscription_ids=None,
):
    normalized_user_ids = _normalize_positive_ids(user_ids)
    if not normalized_user_ids:
        return WebPushSubscription.objects.none()

    queryset = WebPushSubscription.objects.filter(
        user_id__in=normalized_user_ids,
        is_active=True,
        user__profile__push_notifications=True,
    ).only(
        "id",
        "user_id",
        "endpoint_encrypted",
        "p256dh_encrypted",
        "auth_encrypted",
        "is_active",
        "last_failure_at",
        "last_success_at",
        "failure_count",
    )

    if subscription_ids is not None:
        normalized_subscription_ids = _normalize_positive_ids(subscription_ids)
        if not normalized_subscription_ids:
            return WebPushSubscription.objects.none()
        queryset = queryset.filter(id__in=normalized_subscription_ids)

    return queryset.order_by("id")


def mark_web_push_delivery_success(*, subscription: WebPushSubscription) -> None:
    subscription.last_success_at = timezone.now()
    subscription.last_failure_at = None
    subscription.failure_count = 0
    subscription.save(
        update_fields=[
            "last_success_at",
            "last_failure_at",
            "failure_count",
            "updated_at",
        ]
    )


def mark_web_push_delivery_failure(
    *,
    subscription: WebPushSubscription,
    deactivate: bool = False,
) -> None:
    subscription.last_failure_at = timezone.now()
    subscription.failure_count = int(subscription.failure_count or 0) + 1

    update_fields = ["last_failure_at", "failure_count", "updated_at"]
    if deactivate and subscription.is_active:
        subscription.is_active = False
        update_fields.append("is_active")

    subscription.save(update_fields=update_fields)
