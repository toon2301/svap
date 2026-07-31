"""Spracovanie fotky FeedPost-u (Fáza 1).

ZÁMERNE znovupoužíva low-level helpery z ``portfolio.image_processing``
(decode + EXIF/GPS strip + WEBP varianty + storage upload/delete). Sú to čisté
funkcie bez väzby na PortfolioImage model – kópia by časom rozišla GDPR logiku
(EXIF strip) a moderáciu. Record-handling (select_for_update, status prechody)
je feed-špecifický, lebo fotka žije priamo na FeedPost (max 1), nie v child
tabuľke ako PortfolioImage.
"""

from __future__ import annotations

import io
import logging
import os

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from portfolio.image_processing import (
    _decode_image,
    _delete_local_key,
    _delete_s3_key,
    _read_local_key,
    _upload_local_variant,
    _upload_variant,
    _variant_bytes,
    _variant_settings,
)
from portfolio.image_storage import get_s3_client as _s3_client
from portfolio.local_upload import local_portfolio_upload_enabled
from swaply.image_moderation import check_image_safety

from accounts.models import FeedPost

logger = logging.getLogger(__name__)

PROCESSING_ENQUEUE_ERROR = "Spracovanie sa nepodarilo naplanovat."
PROCESSING_FAILED_REASON = "Spracovanie obrazka zlyhalo."


def _reject_feed_image(
    feed_post_id: int, *, reason: str, pending_key: str, delete_key
) -> None:
    with transaction.atomic():
        try:
            post = FeedPost.objects.select_for_update().get(id=feed_post_id)
        except FeedPost.DoesNotExist:
            delete_key(pending_key)
            return

        if post.image_status == FeedPost.ImageStatus.APPROVED:
            return
        post.image_status = FeedPost.ImageStatus.REJECTED
        post.image_rejected_reason = reason
        post.image_processed_at = timezone.now()
        post.save(
            update_fields=[
                "image_status",
                "image_rejected_reason",
                "image_processed_at",
                "updated_at",
            ]
        )

    delete_key(pending_key)


def mark_feed_image_processing_failed(feed_post_id: int) -> None:
    """Po vyčerpaní retries označ fotku REJECTED a uprac staging (inak by post
    ostal navždy PENDING a staging súbor ako orphan)."""
    try:
        post = FeedPost.objects.only("id", "image_pending_key").get(id=feed_post_id)
    except FeedPost.DoesNotExist:
        return

    pending_key = (post.image_pending_key or "").strip()
    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    if local_portfolio_upload_enabled():
        delete_key = _delete_local_key
    elif bucket:
        s3 = _s3_client()

        def delete_key(key, s3=s3, bucket=bucket):
            return _delete_s3_key(s3, bucket, key)

    else:  # storage nie je nakonfigurované – len označ REJECTED
        def delete_key(key):
            return None

    _reject_feed_image(
        feed_post_id,
        reason=PROCESSING_FAILED_REASON,
        pending_key=pending_key,
        delete_key=delete_key,
    )


def process_feed_post_image_record(feed_post_id: int) -> None:
    """Staging → decode → WEBP varianty (thumbnail + large) → APPROVED.

    Zrkadlí ``process_portfolio_image_record`` (vrátane druhej content-safety
    kontroly), len nad poľami FeedPost-u.
    """
    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    use_local_storage = local_portfolio_upload_enabled()
    if not bucket and not use_local_storage:
        raise RuntimeError("AWS_STORAGE_BUCKET_NAME not configured")

    with transaction.atomic():
        try:
            post = FeedPost.objects.select_for_update().get(id=feed_post_id)
        except FeedPost.DoesNotExist:
            return

        if post.image_status in (
            FeedPost.ImageStatus.APPROVED,
            FeedPost.ImageStatus.REJECTED,
        ):
            return

        pending_key = (post.image_pending_key or "").strip()
        if not pending_key:
            raise RuntimeError("image_pending_key missing")

    if use_local_storage:
        raw_bytes = _read_local_key(pending_key)
        delete_key = _delete_local_key
    else:
        s3 = _s3_client()
        raw_bytes = s3.get_object(Bucket=bucket, Key=pending_key)["Body"].read()

        def delete_key(key):
            return _delete_s3_key(s3, bucket, key)

    try:
        decoded = _decode_image(raw_bytes)
    except Exception:
        _reject_feed_image(
            feed_post_id,
            reason="Neplatny alebo nepodporovany format obrazka.",
            pending_key=pending_key,
            delete_key=delete_key,
        )
        return

    settings_map = _variant_settings()
    thumbnail_bytes, _thumbnail_size = _variant_bytes(
        decoded,
        max_side=settings_map["thumbnail"],
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
        _reject_feed_image(
            feed_post_id,
            reason="Obrazok bol zamietnuty kvoli nevhodnemu obsahu.",
            pending_key=pending_key,
            delete_key=delete_key,
        )
        return

    storage_prefix = "feed" if use_local_storage else "media/feed"
    key_prefix = f"{storage_prefix}/{feed_post_id}/{os.urandom(16).hex()}"
    thumbnail_key = f"{key_prefix}-thumbnail.webp"
    large_key = f"{key_prefix}-large.webp"
    uploaded_keys: list[str] = []

    try:
        for key, payload in (
            (thumbnail_key, thumbnail_bytes),
            (large_key, large_bytes),
        ):
            if use_local_storage:
                _upload_local_variant(key, payload)
            else:
                _upload_variant(s3, bucket, key, payload)
            uploaded_keys.append(key)
    except Exception:
        for key in uploaded_keys:
            delete_key(key)
        raise

    delete_key(pending_key)

    with transaction.atomic():
        try:
            post = FeedPost.objects.select_for_update().get(id=feed_post_id)
        except FeedPost.DoesNotExist:
            for key in uploaded_keys:
                delete_key(key)
            return

        if post.image_status in (
            FeedPost.ImageStatus.APPROVED,
            FeedPost.ImageStatus.REJECTED,
        ):
            for key in uploaded_keys:
                delete_key(key)
            return

        post.image_status = FeedPost.ImageStatus.APPROVED
        post.image_thumbnail_key = thumbnail_key
        post.image_approved_key = large_key
        post.image_content_type = "image/webp"
        post.image_size_bytes = len(large_bytes)
        post.image_width = large_size[0]
        post.image_height = large_size[1]
        post.image_processed_at = timezone.now()
        post.image_rejected_reason = ""
        post.save(
            update_fields=[
                "image_status",
                "image_thumbnail_key",
                "image_approved_key",
                "image_content_type",
                "image_size_bytes",
                "image_width",
                "image_height",
                "image_processed_at",
                "image_rejected_reason",
                "updated_at",
            ]
        )
