from __future__ import annotations

import io
import os
from datetime import datetime, timezone

import boto3
from celery import shared_task
from django.conf import settings
from django.db import transaction

from accounts.models import OfferedSkillImage
from swaply.image_moderation import check_image_safety


def _s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
        region_name=getattr(settings, "AWS_S3_REGION_NAME", None),
    )


def _now():
    return datetime.now(timezone.utc)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 5})
def process_offered_skill_image(self, offered_skill_image_id: int) -> None:
    """
    Background pipeline:
    - download from S3 `uploads/`
    - decode (incl. HEIC/HEIF), convert, resize/compress
    - SafeSearch moderation (on processed bytes)
    - upload processed to S3 `media/`
    - update DB status + keys
    """
    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    if not bucket:
        raise RuntimeError("AWS_STORAGE_BUCKET_NAME not configured")

    # Lock row to avoid double-processing
    with transaction.atomic():
        img = (
            OfferedSkillImage.objects.select_for_update()
            .select_related("skill")
            .get(id=offered_skill_image_id)
        )
        if img.status == OfferedSkillImage.Status.APPROVED:
            return
        if img.status == OfferedSkillImage.Status.REJECTED:
            return
        pending_key = (img.pending_key or "").strip()
        if not pending_key:
            raise RuntimeError("pending_key missing")

    s3 = _s3_client()
    obj = s3.get_object(Bucket=bucket, Key=pending_key)
    raw_bytes = obj["Body"].read()

    # Decode/convert with Pillow (HEIC support via pillow-heif if installed)
    from PIL import Image, ImageOps

    try:
        from pillow_heif import register_heif_opener

        register_heif_opener()
    except Exception:
        # If pillow-heif/libheif isn't available, HEIC will fail on Image.open -> handled below.
        pass

    try:
        pil = Image.open(io.BytesIO(raw_bytes))
        pil.load()

        # Normalize orientation based on EXIF before any resizing/conversion.
        # This makes sure portrait photos (including ones rotated in desktop editors)
        # are stored "physically" in the correct orientation and do not rely on EXIF.
        try:
            pil = ImageOps.exif_transpose(pil)
        except Exception:
            # If EXIF is missing or Pillow can't transpose, keep original.
            pass
    except Exception as e:
        with transaction.atomic():
            img = OfferedSkillImage.objects.select_for_update().get(id=offered_skill_image_id)
            img.status = OfferedSkillImage.Status.REJECTED
            img.rejected_reason = "Invalid or unsupported image format."
            img.processed_at = _now()
            img.save(update_fields=["status", "rejected_reason", "processed_at"])
        # Best-effort cleanup
        try:
            s3.delete_object(Bucket=bucket, Key=pending_key)
        except Exception:
            pass
        return

    # Normalize color mode for output
    if pil.mode not in ("RGB", "RGBA"):
        pil = pil.convert("RGB")

    # Create one "display" variant (kept simple; can add more sizes later)
    max_side = int(os.getenv("OFFER_IMAGE_MAX_SIDE", "1600"))
    pil.thumbnail((max_side, max_side))

    # Encode to WebP (good balance of size/quality)
    out = io.BytesIO()
    quality = int(os.getenv("OFFER_IMAGE_WEBP_QUALITY", "82"))
    pil.save(out, format="WEBP", quality=quality, method=6)
    processed_bytes = out.getvalue()

    # SafeSearch on processed bytes (avoids format incompatibilities)
    check_image_safety(io.BytesIO(processed_bytes))

    # Upload to media/
    key_base = f"media/offers/{img.skill_id}/{os.urandom(16).hex()}.webp"
    s3.upload_fileobj(
        io.BytesIO(processed_bytes),
        bucket,
        key_base,
        ExtraArgs={
            "ContentType": "image/webp",
        },
    )

    # Cleanup pending
    try:
        s3.delete_object(Bucket=bucket, Key=pending_key)
    except Exception:
        pass

    width, height = pil.size
    with transaction.atomic():
        img = OfferedSkillImage.objects.select_for_update().get(id=offered_skill_image_id)
        img.status = OfferedSkillImage.Status.APPROVED
        img.approved_key = key_base
        img.content_type = "image/webp"
        img.size_bytes = len(processed_bytes)
        img.width = width
        img.height = height
        img.processed_at = _now()
        img.rejected_reason = ""
        img.save(
            update_fields=[
                "status",
                "approved_key",
                "content_type",
                "size_bytes",
                "width",
                "height",
                "processed_at",
                "rejected_reason",
            ]
        )

