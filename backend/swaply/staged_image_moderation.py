"""
Preflight SafeSearch moderation for direct-to-S3 staging objects.

Usage in upload_complete views (after head_object, before DB create):

    from swaply.staged_image_moderation import moderate_staged_s3_image, ModerationRejectedError

    try:
        moderate_staged_s3_image(bucket, key)
    except ModerationRejectedError as e:
        return Response({"error": e.user_message, "code": e.code}, status=400)
    # RuntimeError (technical failure) propagates → DRF returns 500

Guarantees:
- Staging S3 object is deleted best-effort on rejection or decode failure.
- Logging never includes signed URLs, presigned fields, or personal data.
- ModerationRejectedError is raised only for content violations.
- RuntimeError is raised for unrecoverable technical failures.
"""

from __future__ import annotations

import io
import logging

import boto3
from django.conf import settings

logger = logging.getLogger("swaply")

IMAGE_MODERATION_REJECTED_CODE = "image_moderation_rejected"


class ModerationRejectedError(Exception):
    """Raised when preflight SafeSearch rejects an image."""

    code = IMAGE_MODERATION_REJECTED_CODE

    def __init__(self, user_message: str = "Fotka nebola prijatá kvôli nevhodnému obsahu."):
        super().__init__(user_message)
        self.user_message = user_message


def moderate_staged_s3_image(bucket: str, key: str) -> None:
    """
    Download staging S3 object, decode image, run SafeSearch.

    Raises:
        ModerationRejectedError – content violation; staging object deleted (best effort).
        RuntimeError            – technical failure (S3/Vision); object NOT deleted.
    """
    s3 = _s3_client()
    raw_bytes = _download(s3, bucket, key)
    image_bytes = _decode_to_webp(raw_bytes, s3, bucket, key)
    _run_safesearch(image_bytes, s3, bucket, key)


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
        region_name=getattr(settings, "AWS_S3_REGION_NAME", None),
    )


def _download(s3_client, bucket: str, key: str) -> bytes:
    try:
        obj = s3_client.get_object(Bucket=bucket, Key=key)
        return obj["Body"].read()
    except Exception as exc:
        logger.error(
            "staged_moderation: s3 download failed bucket=%s key_suffix=%s exc=%s",
            bucket,
            _safe_key_suffix(key),
            type(exc).__name__,
        )
        raise RuntimeError("Failed to download staging object for moderation.") from exc


def _decode_to_webp(raw_bytes: bytes, s3_client, bucket: str, key: str) -> bytes:
    """Decode raw image bytes → normalized WebP. HEIC-compatible via pillow-heif."""
    from PIL import Image, ImageOps

    try:
        from pillow_heif import register_heif_opener
        register_heif_opener()
    except Exception:
        pass

    try:
        pil = Image.open(io.BytesIO(raw_bytes))
        pil.load()
        try:
            pil = ImageOps.exif_transpose(pil)
        except Exception:
            pass
        if pil.mode not in ("RGB", "RGBA"):
            pil = pil.convert("RGB")
        out = io.BytesIO()
        pil.save(out, format="WEBP", quality=85)
        return out.getvalue()
    except Exception as exc:
        logger.warning(
            "staged_moderation: image decode failed key_suffix=%s exc=%s",
            _safe_key_suffix(key),
            type(exc).__name__,
        )
        _best_effort_delete(s3_client, bucket, key)
        raise ModerationRejectedError(
            "Obrázok sa nepodarilo spracovať. Skúste iný formát."
        ) from exc


def _run_safesearch(image_bytes: bytes, s3_client, bucket: str, key: str) -> None:
    from django.core.exceptions import ValidationError as DjangoValidationError
    from swaply.image_moderation import check_image_safety

    try:
        check_image_safety(io.BytesIO(image_bytes))
    except DjangoValidationError as exc:
        if getattr(exc, "code", None) == IMAGE_MODERATION_REJECTED_CODE:
            # Content violation — delete staging object and reject upload
            _best_effort_delete(s3_client, bucket, key)
            raise ModerationRejectedError() from exc
        # Technical failure from check_image_safety (fail-closed mode)
        logger.error(
            "staged_moderation: safesearch technical failure key_suffix=%s",
            _safe_key_suffix(key),
        )
        raise RuntimeError("SafeSearch technical failure.") from exc


def _best_effort_delete(s3_client, bucket: str, key: str) -> None:
    try:
        s3_client.delete_object(Bucket=bucket, Key=key)
        logger.info(
            "staged_moderation: deleted staging object bucket=%s key_suffix=%s",
            bucket,
            _safe_key_suffix(key),
        )
    except Exception as exc:
        logger.error(
            "staged_moderation: cleanup failed bucket=%s key_suffix=%s exc=%s",
            bucket,
            _safe_key_suffix(key),
            type(exc).__name__,
        )


def _safe_key_suffix(key: str, n: int = 30) -> str:
    """Return last n chars of key for logging – never includes bucket/prefix with personal data."""
    if not key:
        return ""
    return key[-n:]
