from __future__ import annotations

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.signing import BadSignature, SignatureExpired, dumps, loads
from django.urls import reverse

LOCAL_UPLOAD_SALT = "portfolio.local-upload.v1"
LOCAL_UPLOAD_EXPIRES_SECONDS = 120


def local_portfolio_upload_enabled() -> bool:
    return bool(getattr(settings, "DEBUG", False)) and not bool(
        getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    )


def make_local_upload_fields(
    *, item_id: int, key: str, size_bytes: int
) -> dict[str, str]:
    token = dumps(
        {
            "item_id": item_id,
            "key": key,
            "size_bytes": size_bytes,
        },
        salt=LOCAL_UPLOAD_SALT,
    )
    return {"key": key, "token": token}


def local_upload_url(request) -> str:
    path = reverse("accounts:portfolio_image_local_upload")
    return request.build_absolute_uri(path)


def parse_local_upload_token(token: str, *, max_age: int) -> dict | None:
    try:
        payload = loads(token, salt=LOCAL_UPLOAD_SALT, max_age=max_age)
    except (BadSignature, SignatureExpired, TypeError, ValueError):
        return None
    return payload if isinstance(payload, dict) else None


def is_safe_portfolio_upload_key(key: str, *, item_id: int) -> bool:
    normalized = (key or "").replace("\\", "/").strip()
    if normalized != key or not normalized:
        return False
    if normalized.startswith("/") or "\x00" in normalized:
        return False
    if any(part in ("", ".", "..") for part in normalized.split("/")):
        return False
    return normalized.startswith(f"uploads/portfolio/{item_id}/")


def save_local_upload(key: str, uploaded_file) -> bool:
    if default_storage.exists(key):
        default_storage.delete(key)
    saved_key = default_storage.save(key, uploaded_file)
    if saved_key == key:
        return True
    default_storage.delete(saved_key)
    return False
