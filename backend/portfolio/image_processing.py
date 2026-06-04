from __future__ import annotations

import io
import os
from datetime import datetime, timezone

import boto3
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction

from swaply.image_moderation import check_image_safety

from .models import PortfolioImage, PortfolioItem


def _s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
        region_name=getattr(settings, "AWS_S3_REGION_NAME", None),
    )


def _now():
    return datetime.now(timezone.utc)


def _register_heif_support() -> None:
    try:
        from pillow_heif import register_heif_opener

        register_heif_opener()
    except Exception:
        return


def _normalize_image_mode(image):
    if image.mode in ("RGBA", "LA"):
        return image
    if image.mode == "P" and "transparency" in image.info:
        return image.convert("RGBA")
    if image.mode != "RGB":
        return image.convert("RGB")
    return image


def _decode_image(raw_bytes: bytes):
    from PIL import Image, ImageOps

    _register_heif_support()
    with Image.open(io.BytesIO(raw_bytes)) as source:
        source.load()
        return ImageOps.exif_transpose(source).copy()


def _variant_bytes(
    source, *, max_side: int, quality: int
) -> tuple[bytes, tuple[int, int]]:
    image = source.copy()
    image.thumbnail((max_side, max_side))
    image = _normalize_image_mode(image)

    output = io.BytesIO()
    image.save(output, format="WEBP", quality=quality, method=6)
    return output.getvalue(), image.size


def _variant_settings() -> dict[str, int]:
    return {
        "thumbnail": int(os.getenv("PORTFOLIO_IMAGE_THUMBNAIL_MAX_SIDE", "480")),
        "medium": int(os.getenv("PORTFOLIO_IMAGE_MEDIUM_MAX_SIDE", "1200")),
        "large": int(os.getenv("PORTFOLIO_IMAGE_LARGE_MAX_SIDE", "2048")),
        "quality": int(os.getenv("PORTFOLIO_IMAGE_WEBP_QUALITY", "82")),
    }


def _delete_s3_key(s3, bucket: str, key: str) -> None:
    if not key:
        return
    try:
        s3.delete_object(Bucket=bucket, Key=key)
    except Exception:
        pass


def _reject_image(
    image_id: int, *, reason: str, pending_key: str, s3, bucket: str
) -> None:
    with transaction.atomic():
        try:
            image = PortfolioImage.objects.select_for_update().get(id=image_id)
        except PortfolioImage.DoesNotExist:
            _delete_s3_key(s3, bucket, pending_key)
            return

        if image.status == PortfolioImage.Status.APPROVED:
            return
        image.status = PortfolioImage.Status.REJECTED
        image.rejected_reason = reason
        image.processed_at = _now()
        image.save(update_fields=["status", "rejected_reason", "processed_at"])

    _delete_s3_key(s3, bucket, pending_key)


def _upload_variant(s3, bucket: str, key: str, payload: bytes) -> None:
    s3.upload_fileobj(
        io.BytesIO(payload),
        bucket,
        key,
        ExtraArgs={"ContentType": "image/webp"},
    )


def process_portfolio_image_record(portfolio_image_id: int) -> None:
    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    if not bucket:
        raise RuntimeError("AWS_STORAGE_BUCKET_NAME not configured")

    with transaction.atomic():
        try:
            image = (
                PortfolioImage.objects.select_for_update()
                .select_related("item")
                .get(id=portfolio_image_id)
            )
        except PortfolioImage.DoesNotExist:
            return

        if image.status in (
            PortfolioImage.Status.APPROVED,
            PortfolioImage.Status.REJECTED,
        ):
            return

        pending_key = (image.pending_key or "").strip()
        item_id = image.item_id
        if not pending_key:
            raise RuntimeError("pending_key missing")

    s3 = _s3_client()
    raw_bytes = s3.get_object(Bucket=bucket, Key=pending_key)["Body"].read()

    try:
        decoded = _decode_image(raw_bytes)
    except Exception:
        _reject_image(
            portfolio_image_id,
            reason="Neplatny alebo nepodporovany format obrazka.",
            pending_key=pending_key,
            s3=s3,
            bucket=bucket,
        )
        return

    settings_map = _variant_settings()
    thumbnail_bytes, _thumbnail_size = _variant_bytes(
        decoded,
        max_side=settings_map["thumbnail"],
        quality=settings_map["quality"],
    )
    medium_bytes, _medium_size = _variant_bytes(
        decoded,
        max_side=settings_map["medium"],
        quality=settings_map["quality"],
    )
    large_bytes, large_size = _variant_bytes(
        decoded,
        max_side=settings_map["large"],
        quality=settings_map["quality"],
    )

    try:
        check_image_safety(io.BytesIO(large_bytes))
    except ValidationError:
        _reject_image(
            portfolio_image_id,
            reason="Obrazok bol zamietnuty kvoli nevhodnemu obsahu.",
            pending_key=pending_key,
            s3=s3,
            bucket=bucket,
        )
        return

    key_prefix = f"media/portfolio/{item_id}/{os.urandom(16).hex()}"
    thumbnail_key = f"{key_prefix}-thumbnail.webp"
    medium_key = f"{key_prefix}-medium.webp"
    large_key = f"{key_prefix}-large.webp"
    uploaded_keys: list[str] = []

    try:
        for key, payload in (
            (thumbnail_key, thumbnail_bytes),
            (medium_key, medium_bytes),
            (large_key, large_bytes),
        ):
            _upload_variant(s3, bucket, key, payload)
            uploaded_keys.append(key)
    except Exception:
        for key in uploaded_keys:
            _delete_s3_key(s3, bucket, key)
        raise

    _delete_s3_key(s3, bucket, pending_key)

    with transaction.atomic():
        try:
            image = PortfolioImage.objects.select_for_update().get(
                id=portfolio_image_id
            )
        except PortfolioImage.DoesNotExist:
            for key in uploaded_keys:
                _delete_s3_key(s3, bucket, key)
            return

        if image.status in (
            PortfolioImage.Status.APPROVED,
            PortfolioImage.Status.REJECTED,
        ):
            for key in uploaded_keys:
                _delete_s3_key(s3, bucket, key)
            return

        image.status = PortfolioImage.Status.APPROVED
        image.thumbnail_key = thumbnail_key
        image.medium_key = medium_key
        image.large_key = large_key
        image.approved_key = large_key
        image.content_type = "image/webp"
        image.size_bytes = len(large_bytes)
        image.width = large_size[0]
        image.height = large_size[1]
        image.processed_at = _now()
        image.rejected_reason = ""
        image.save(
            update_fields=[
                "status",
                "thumbnail_key",
                "medium_key",
                "large_key",
                "approved_key",
                "content_type",
                "size_bytes",
                "width",
                "height",
                "processed_at",
                "rejected_reason",
            ]
        )

        item = PortfolioItem.objects.select_for_update().get(id=image.item_id)
        if item.cover_image_id is None:
            item.cover_image = image
            item.save(update_fields=["cover_image", "updated_at"])
