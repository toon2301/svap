import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


def get_web_push_vapid_public_key() -> str:
    key = (getattr(settings, "WEB_PUSH_VAPID_PUBLIC_KEY", "") or "").strip()
    if not key:
        raise ImproperlyConfigured("WEB_PUSH_VAPID_PUBLIC_KEY is not configured.")
    return key


def normalize_web_push_endpoint(value: str) -> str:
    normalized = (value or "").strip()
    if not normalized:
        raise ValueError("Web push endpoint is required.")
    return normalized


def normalize_web_push_key(value: str, *, field_name: str) -> str:
    normalized = (value or "").strip()
    if not normalized:
        raise ValueError(f"Web push {field_name} is required.")
    return normalized


def hash_web_push_endpoint(endpoint: str) -> str:
    normalized = normalize_web_push_endpoint(endpoint)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _get_web_push_fernet() -> Fernet:
    raw_key = getattr(settings, "WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY", "") or ""
    key = raw_key.strip()
    if not key:
        raise ImproperlyConfigured(
            "WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY is not configured."
        )
    try:
        return Fernet(key.encode("utf-8"))
    except Exception as exc:
        raise ImproperlyConfigured(
            "WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY is invalid."
        ) from exc


def encrypt_web_push_value(value: str) -> str:
    normalized = (value or "").strip()
    if not normalized:
        return ""
    return _get_web_push_fernet().encrypt(normalized.encode("utf-8")).decode("utf-8")


def decrypt_web_push_value(value: str) -> str:
    if not value:
        return ""
    try:
        return _get_web_push_fernet().decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ImproperlyConfigured(
            "Stored web push subscription value cannot be decrypted."
        ) from exc
