"""
Skill image upload views (vyčlenené z skills.py kvôli dĺžke).

S3 presigned upload (init/complete) pre obrázky ponúk + S3 klient. Ostatné skill
views (list/detail/images/image-detail) ostávajú v skills.py.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..models import OfferedSkill, OfferedSkillImage
from .skill_helpers import _skills_list_cache_invalidate


def _get_s3_client():
    import boto3
    from django.conf import settings

    return boto3.client(
        "s3",
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
        region_name=getattr(settings, "AWS_S3_REGION_NAME", None),
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_images_upload_init_view(request, skill_id):
    """
    Init direct-to-S3 upload for offer images.

    Returns a presigned POST payload:
      { url, fields, key, expires_in }
    Client uploads to S3 under `uploads/` prefix, then calls complete endpoint.
    """
    from django.conf import settings
    import os
    import uuid

    try:
        skill = OfferedSkill.objects.get(id=skill_id, user=request.user)
    except OfferedSkill.DoesNotExist:
        return Response({"error": "Zručnosť nebola nájdená"}, status=status.HTTP_404_NOT_FOUND)

    if skill.images.count() >= 6:
        return Response(
            {"error": "Maximálny počet obrázkov je 6"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    filename = str(request.data.get("filename") or "").strip()
    content_type = str(request.data.get("content_type") or "").strip()
    try:
        size_bytes = int(request.data.get("size_bytes") or 0)
    except Exception:
        size_bytes = 0

    if not filename or size_bytes <= 0:
        return Response({"error": "Neplatný súbor."}, status=status.HTTP_400_BAD_REQUEST)

    # Enforce max size (reuse same limit as validator)
    try:
        max_mb = int(getattr(settings, "IMAGE_MAX_SIZE_MB", 5))
    except Exception:
        max_mb = 5
    if size_bytes > max_mb * 1024 * 1024:
        return Response(
            {"error": f"Obrázok je príliš veľký. Maximálna veľkosť je {max_mb}MB."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    ext = os.path.splitext(filename)[1].lower()
    allowed_extensions = [
        e.strip().lower()
        for e in getattr(
            settings,
            "ALLOWED_IMAGE_EXTENSIONS",
            [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"],
        )
    ]
    if ext not in allowed_extensions:
        return Response(
            {"error": "Neplatný typ súboru."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    if not bucket:
        return Response({"error": "Storage nie je nakonfigurované."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Randomized key under uploads/; include skill_id for easy server-side validation
    key = f"uploads/offers/{skill_id}/{uuid.uuid4().hex}{ext}"

    expires_in = 120
    try:
        s3 = _get_s3_client()
        presigned = s3.generate_presigned_post(
            Bucket=bucket,
            Key=key,
            Conditions=[
                ["content-length-range", 1, max_mb * 1024 * 1024],
            ],
            ExpiresIn=expires_in,
        )
    except Exception:
        return Response(
            {"error": "Nepodarilo sa pripraviť upload."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "url": presigned.get("url"),
            "fields": presigned.get("fields", {}),
            "key": key,
            "expires_in": expires_in,
            "content_type": content_type or None,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_images_upload_complete_view(request, skill_id):
    """
    Confirm a direct-to-S3 upload and create DB record as PENDING.
    Enqueues background processing (HEIC decode, resize, SafeSearch, move to media/).
    """
    from django.conf import settings
    import os

    try:
        skill = OfferedSkill.objects.get(id=skill_id, user=request.user)
    except OfferedSkill.DoesNotExist:
        return Response({"error": "Zručnosť nebola nájdená"}, status=status.HTTP_404_NOT_FOUND)

    if skill.images.count() >= 6:
        return Response(
            {"error": "Maximálny počet obrázkov je 6"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    key = str(request.data.get("key") or "").strip()
    if not key:
        return Response({"error": "Chýba key."}, status=status.HTTP_400_BAD_REQUEST)

    expected_prefix = f"uploads/offers/{skill_id}/"
    if not key.startswith(expected_prefix):
        return Response({"error": "Neplatný key."}, status=status.HTTP_400_BAD_REQUEST)

    ext = os.path.splitext(key)[1].lower()
    allowed_extensions = [
        e.strip().lower()
        for e in getattr(
            settings,
            "ALLOWED_IMAGE_EXTENSIONS",
            [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"],
        )
    ]
    if ext not in allowed_extensions:
        return Response({"error": "Neplatný typ súboru."}, status=status.HTTP_400_BAD_REQUEST)

    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    if not bucket:
        return Response({"error": "Storage nie je nakonfigurované."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Verify object exists in S3 and capture metadata
    try:
        s3 = _get_s3_client()
        head = s3.head_object(Bucket=bucket, Key=key)
    except Exception:
        return Response({"error": "Upload nebol nájdený."}, status=status.HTTP_400_BAD_REQUEST)

    size_bytes = int(head.get("ContentLength") or 0)
    content_type = str(head.get("ContentType") or "")

    max_bytes = getattr(settings, "SKILL_IMAGE_MAX_BYTES", 10 * 1024 * 1024)
    if size_bytes > max_bytes:
        return Response({"error": "Súbor je príliš veľký."}, status=status.HTTP_400_BAD_REQUEST)

    # Preflight SafeSearch moderation — before creating any DB record
    if getattr(settings, "SAFESEARCH_ENABLED", False):
        try:
            from swaply.staged_image_moderation import (
                ModerationRejectedError,
                moderate_staged_s3_image,
            )
            moderate_staged_s3_image(bucket, key)
        except ModerationRejectedError as e:
            # Orphan cleanup: zmaž odmietnutý staging objekt (uploads/ prefix) zo S3,
            # nech neostane navždy (best-effort, rovnaký vzor ako
            # process_offered_skill_image pri rejecte).
            try:
                s3.delete_object(Bucket=bucket, Key=key)
            except Exception:
                pass
            return Response(
                {"error": e.user_message, "code": e.code},
                status=status.HTTP_400_BAD_REQUEST,
            )

    order = skill.images.count()
    img = OfferedSkillImage.objects.create(
        skill=skill,
        order=order,
        status=OfferedSkillImage.Status.PENDING,
        pending_key=key,
        approved_key="",
        original_filename=str(request.data.get("filename") or ""),
        content_type=content_type,
        size_bytes=size_bytes or None,
    )
    _skills_list_cache_invalidate(request.user.id)

    # Enqueue background job (lazy import to avoid hard dependency if worker not deployed yet)
    try:
        from swaply.tasks.offer_images import process_offered_skill_image

        process_offered_skill_image.delay(img.id)
    except Exception:
        # Fail-open: record stays pending; can be retried manually by admin/command later
        pass

    return Response(
        {
            "id": img.id,
            "status": img.status,
            "order": img.order,
        },
        status=status.HTTP_201_CREATED,
    )
