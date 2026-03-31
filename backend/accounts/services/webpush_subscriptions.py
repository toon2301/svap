from django.db import IntegrityError, transaction
from django.utils import timezone

from accounts.webpush_models import WebPushSubscription

from .webpush_crypto import (
    encrypt_web_push_value,
    hash_web_push_endpoint,
    normalize_web_push_endpoint,
    normalize_web_push_key,
)


def upsert_web_push_subscription(
    *,
    user,
    endpoint: str,
    p256dh: str,
    auth: str,
    user_agent: str = "",
    device_label: str = "",
):
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
