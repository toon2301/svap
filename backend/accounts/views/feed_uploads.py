"""Upload fotky pre FeedPost (Fáza 1) – rovnaký reťazec ako portfólio:
init (presigned S3 POST) → klient nahrá do stagingu → complete (head_object +
SafeSearch moderácia) → Celery WEBP varianty.

Rozdiely oproti portfóliu: max 1 fotka (polia žijú priamo na FeedPost),
len pre FREE_POST, bez local-upload presign fallbacku (dev-only vetva
portfólia je naviazaná na portfolio kľúče; spracovanie local storage podporuje).
"""

import logging
import os
import uuid

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from portfolio.image_storage import delete_storage_keys
from portfolio.image_storage import get_s3_client as _get_s3_client
from portfolio.local_upload import local_portfolio_upload_enabled
from portfolio.upload_constraints import allowed_image_extensions, max_image_bytes
from swaply.rate_limiting import api_rate_limit

from ..feed_image_processing import PROCESSING_ENQUEUE_ERROR
from ..models import FeedPost

logger = logging.getLogger(__name__)

UPLOAD_EXPIRES_SECONDS = 600
# Zhodné s FeedPost.image_original_filename.max_length.
MAX_ORIGINAL_FILENAME_LENGTH = 255


def _post_not_found():
    return Response(
        {"error": "Prispevok nebol najdeny."},
        status=status.HTTP_404_NOT_FOUND,
    )


def _get_own_free_post(request, post_id: int) -> FeedPost | None:
    try:
        return FeedPost.objects.get(
            id=post_id,
            author=request.user,
            post_type=FeedPost.PostType.FREE_POST,
        )
    except FeedPost.DoesNotExist:
        return None


def _validate_upload_metadata(request):
    """Rovnaká validácia ako portfólio upload-init (filename/veľkosť/prípona)."""
    filename = str(request.data.get("filename") or "").strip()
    content_type = str(request.data.get("content_type") or "").strip()
    try:
        size_bytes = int(request.data.get("size_bytes") or 0)
    except (TypeError, ValueError):
        size_bytes = 0

    if not filename:
        return None, None, 0, Response(
            {"error": "Chyba filename."}, status=status.HTTP_400_BAD_REQUEST
        )

    max_bytes = max_image_bytes()
    if size_bytes <= 0 or size_bytes > max_bytes:
        return None, None, 0, Response(
            {
                "error": (
                    "Neplatna velkost suboru. Maximum je "
                    f"{max_bytes // (1024 * 1024)}MB."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_image_extensions():
        return None, None, 0, Response(
            {"error": "Neplatny typ suboru."}, status=status.HTTP_400_BAD_REQUEST
        )

    return filename, content_type, size_bytes, None


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def feed_post_image_upload_init_view(request, post_id: int):
    post = _get_own_free_post(request, post_id)
    if post is None:
        return _post_not_found()

    # Max 1 fotka: nový upload je možný, len ak post fotku nemá alebo bola
    # zamietnutá (retry). PENDING/APPROVED blokuje druhý upload.
    if post.image_status in (
        FeedPost.ImageStatus.PENDING,
        FeedPost.ImageStatus.APPROVED,
    ):
        return Response(
            {"error": "Prispevok uz fotku ma.", "code": "feed_post_image_exists"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    filename, content_type, size_bytes, error_response = _validate_upload_metadata(
        request
    )
    if error_response is not None:
        return error_response

    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    if not bucket:
        return Response(
            {"error": "Storage nie je nakonfigurovane."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    ext = os.path.splitext(filename)[1].lower()
    key = f"uploads/feed/{post_id}/{uuid.uuid4().hex}{ext}"
    try:
        presigned = _get_s3_client().generate_presigned_post(
            Bucket=bucket,
            Key=key,
            Conditions=[
                ["content-length-range", 1, max_image_bytes()],
            ],
            ExpiresIn=UPLOAD_EXPIRES_SECONDS,
        )
    except Exception:
        logger.exception(
            "Failed to generate feed image presigned upload",
            extra={"feed_post_id": post_id},
        )
        return Response(
            {"error": "Nepodarilo sa pripravit upload."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "url": presigned.get("url"),
            "fields": presigned.get("fields", {}),
            "key": key,
            "expires_in": UPLOAD_EXPIRES_SECONDS,
            "content_type": content_type or None,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def feed_post_image_upload_complete_view(request, post_id: int):
    if _get_own_free_post(request, post_id) is None:
        return _post_not_found()

    filename = str(request.data.get("filename") or "").strip()
    key = str(request.data.get("key") or "").strip()
    if not key:
        return Response({"error": "Chyba key."}, status=status.HTTP_400_BAD_REQUEST)

    expected_prefix = f"uploads/feed/{post_id}/"
    if not key.startswith(expected_prefix):
        return Response(
            {"error": "Neplatny key."}, status=status.HTTP_400_BAD_REQUEST
        )

    ext = os.path.splitext(key)[1].lower()
    if ext not in allowed_image_extensions():
        return Response(
            {"error": "Neplatny typ suboru."}, status=status.HTTP_400_BAD_REQUEST
        )

    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    if not bucket:
        return Response(
            {"error": "Storage nie je nakonfigurovane."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        head = _get_s3_client().head_object(Bucket=bucket, Key=key)
    except Exception:
        return Response(
            {"error": "Upload nebol najdeny."}, status=status.HTTP_400_BAD_REQUEST
        )
    size_bytes = int(head.get("ContentLength") or 0)
    content_type = str(head.get("ContentType") or "")

    if size_bytes <= 0 or size_bytes > max_image_bytes():
        delete_storage_keys([key])
        return Response(
            {"error": "Neplatny subor."}, status=status.HTTP_400_BAD_REQUEST
        )

    # Preflight SafeSearch moderácia pred zápisom do DB (vzor portfólia).
    if getattr(settings, "SAFESEARCH_ENABLED", False):
        # Import MIMO try – keby zlyhal vnútri, except vetva by odkazovala na
        # nedefinovaný ModerationRejectedError (NameError namiesto čistej chyby).
        from swaply.staged_image_moderation import (
            ModerationRejectedError,
            moderate_staged_s3_image,
        )

        try:
            moderate_staged_s3_image(bucket, key)
        except ModerationRejectedError as e:
            # Defense-in-depth orphan cleanup (rovnaký vzor ako portfólio).
            delete_storage_keys([key])
            return Response(
                {"error": e.user_message, "code": e.code},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            # Výpadok moderácie nesmie nechať staging objekt visieť ani vrátiť
            # neošetrenú 500 – fotku neprijmeme (fail-closed, ako pri rejectnutí).
            logger.exception(
                "Feed image moderation failed",
                extra={"feed_post_id": post_id},
            )
            delete_storage_keys([key])
            return Response(
                {"error": "Nepodarilo sa overit obrazok. Skuste to znova."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    with transaction.atomic():
        try:
            post = FeedPost.objects.select_for_update().get(
                id=post_id,
                author=request.user,
                post_type=FeedPost.PostType.FREE_POST,
            )
        except FeedPost.DoesNotExist:
            transaction.on_commit(lambda: delete_storage_keys([key]))
            return _post_not_found()

        if post.image_status in (
            FeedPost.ImageStatus.PENDING,
            FeedPost.ImageStatus.APPROVED,
        ):
            transaction.on_commit(lambda: delete_storage_keys([key]))
            return Response(
                {"error": "Prispevok uz fotku ma.", "code": "feed_post_image_exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        post.image_status = FeedPost.ImageStatus.PENDING
        post.image_pending_key = key
        # Klientom poslaný názov orež na dĺžku poľa – inak by save() spadol na
        # DataError (názov je len kozmetický údaj, nie dôvod odmietnuť upload).
        post.image_original_filename = filename[:MAX_ORIGINAL_FILENAME_LENGTH]
        post.image_content_type = content_type
        post.image_size_bytes = size_bytes
        post.image_rejected_reason = ""
        # Retry po zamietnutí: starý čas spracovania by inak ostal a tváril sa,
        # že tento (ešte nespracovaný) PENDING upload je už vybavený.
        post.image_processed_at = None
        post.save(
            update_fields=[
                "image_status",
                "image_pending_key",
                "image_original_filename",
                "image_content_type",
                "image_size_bytes",
                "image_rejected_reason",
                "image_processed_at",
                "updated_at",
            ]
        )

        def enqueue_processing(post_id=post.id, key=key):
            try:
                if local_portfolio_upload_enabled():
                    from accounts.feed_image_processing import (
                        process_feed_post_image_record,
                    )

                    process_feed_post_image_record(post_id)
                else:
                    from swaply.tasks.feed_images import process_feed_post_image

                    process_feed_post_image.delay(post_id)
            except Exception as exc:
                logger.exception(
                    "Failed to enqueue feed post image processing",
                    extra={"feed_post_id": post_id, "error": str(exc)},
                )
                processed_at = timezone.now()
                FeedPost.objects.filter(
                    id=post_id,
                    image_status=FeedPost.ImageStatus.PENDING,
                ).update(
                    image_status=FeedPost.ImageStatus.REJECTED,
                    image_rejected_reason=PROCESSING_ENQUEUE_ERROR,
                    image_processed_at=processed_at,
                )
                delete_storage_keys([key])

        transaction.on_commit(enqueue_processing)

    post.refresh_from_db()
    return Response(
        {
            "id": post.id,
            "image_status": post.image_status,
        },
        status=status.HTTP_200_OK,
    )
