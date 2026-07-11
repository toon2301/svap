import os
import uuid
import logging
import mimetypes

from django.conf import settings
from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from .api_responses import portfolio_item_not_found as _portfolio_item_not_found
from .image_storage import delete_storage_keys, image_storage_keys
from .image_storage import get_s3_client as _get_s3_client
from .local_upload import (
    LOCAL_UPLOAD_EXPIRES_SECONDS,
    local_portfolio_upload_enabled,
    local_upload_url,
    make_local_upload_fields,
)
from .models import PortfolioImage, PortfolioItem
from .serializers import PortfolioImageSerializer
from .upload_constraints import allowed_image_extensions, max_image_bytes

MAX_PORTFOLIO_IMAGES = 8
PROCESSING_ENQUEUE_ERROR = (
    "Spracovanie fotky sa nepodarilo spustit. Skus fotku nahrat znova."
)

logger = logging.getLogger(__name__)


def _active_images_q():
    return Q(status=PortfolioImage.Status.PENDING) | Q(
        status=PortfolioImage.Status.APPROVED
    )


def _public_file_q():
    return (
        Q(large_key__gt="")
        | Q(approved_key__gt="")
        | (Q(image__isnull=False) & ~Q(image=""))
    )


def _active_images_count(item: PortfolioItem) -> int:
    return item.images.filter(_active_images_q()).count()


def _next_image_order(item: PortfolioItem) -> int:
    current_max = item.images.aggregate(value=Max("order"))["value"]
    return 0 if current_max is None else current_max + 1


def _validate_upload_metadata(request):
    filename = str(request.data.get("filename") or "").strip()
    content_type = str(request.data.get("content_type") or "").strip()
    try:
        size_bytes = int(request.data.get("size_bytes") or 0)
    except Exception:
        size_bytes = 0

    if not filename or size_bytes <= 0:
        return (
            None,
            None,
            0,
            Response(
                {"error": "Neplatny subor."},
                status=status.HTTP_400_BAD_REQUEST,
            ),
        )

    max_bytes = max_image_bytes()
    if size_bytes > max_bytes:
        return (
            None,
            None,
            0,
            Response(
                {
                    "error": (
                        "Obrazok je prilis velky. Maximalna velkost je "
                        f"{max_bytes // (1024 * 1024)}MB."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            ),
        )

    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_image_extensions():
        return (
            None,
            None,
            0,
            Response(
                {"error": "Neplatny typ suboru."},
                status=status.HTTP_400_BAD_REQUEST,
            ),
        )

    return filename, content_type, size_bytes, None


def _serialize_image(request, image: PortfolioImage):
    return PortfolioImageSerializer(
        image,
        context={"request": request, "is_owner": True},
    ).data


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def portfolio_image_upload_init_view(request, item_id: int):
    try:
        item = PortfolioItem.objects.only("id", "owner_id").get(
            id=item_id,
            owner=request.user,
        )
    except PortfolioItem.DoesNotExist:
        return _portfolio_item_not_found()

    if _active_images_count(item) >= MAX_PORTFOLIO_IMAGES:
        return Response(
            {"error": "Maximalny pocet fotiek portfolia je 8."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    filename, content_type, size_bytes, error_response = _validate_upload_metadata(
        request
    )
    if error_response is not None:
        return error_response

    ext = os.path.splitext(filename)[1].lower()
    key = f"uploads/portfolio/{item_id}/{uuid.uuid4().hex}{ext}"
    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    if not bucket:
        if local_portfolio_upload_enabled():
            return Response(
                {
                    "url": local_upload_url(request),
                    "fields": make_local_upload_fields(
                        item_id=item_id,
                        key=key,
                        size_bytes=size_bytes,
                    ),
                    "key": key,
                    "expires_in": LOCAL_UPLOAD_EXPIRES_SECONDS,
                    "content_type": content_type or None,
                },
                status=status.HTTP_200_OK,
            )
        return Response(
            {"error": "Storage nie je nakonfigurovane."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        presigned = _get_s3_client().generate_presigned_post(
            Bucket=bucket,
            Key=key,
            Conditions=[
                ["content-length-range", 1, max_image_bytes()],
            ],
            ExpiresIn=LOCAL_UPLOAD_EXPIRES_SECONDS,
        )
    except Exception:
        return Response(
            {"error": "Nepodarilo sa pripravit upload."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "url": presigned.get("url"),
            "fields": presigned.get("fields", {}),
            "key": key,
            "expires_in": LOCAL_UPLOAD_EXPIRES_SECONDS,
            "content_type": content_type or None,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def portfolio_image_upload_complete_view(request, item_id: int):
    try:
        PortfolioItem.objects.only("id", "owner_id").get(
            id=item_id,
            owner=request.user,
        )
    except PortfolioItem.DoesNotExist:
        return _portfolio_item_not_found()

    filename = str(request.data.get("filename") or "").strip()
    key = str(request.data.get("key") or "").strip()
    if not key:
        return Response({"error": "Chyba key."}, status=status.HTTP_400_BAD_REQUEST)

    expected_prefix = f"uploads/portfolio/{item_id}/"
    if not key.startswith(expected_prefix):
        return Response(
            {"error": "Neplatny key."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    ext = os.path.splitext(key)[1].lower()
    if ext not in allowed_image_extensions():
        return Response(
            {"error": "Neplatny typ suboru."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", None)
    if bucket:
        try:
            head = _get_s3_client().head_object(Bucket=bucket, Key=key)
        except Exception:
            return Response(
                {"error": "Upload nebol najdeny."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        size_bytes = int(head.get("ContentLength") or 0)
        content_type = str(head.get("ContentType") or "")
    elif local_portfolio_upload_enabled():
        from django.core.files.storage import default_storage

        if not default_storage.exists(key):
            return Response(
                {"error": "Upload nebol najdeny."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        size_bytes = int(default_storage.size(key) or 0)
        content_type = mimetypes.guess_type(filename or key)[0] or ""
    else:
        return Response(
            {"error": "Storage nie je nakonfigurovane."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if size_bytes <= 0 or size_bytes > max_image_bytes():
        delete_storage_keys([key])
        return Response(
            {"error": "Neplatny subor."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Preflight SafeSearch moderation before creating any DB record.
    if bucket and getattr(settings, "SAFESEARCH_ENABLED", False):
        try:
            from swaply.staged_image_moderation import (
                ModerationRejectedError,
                moderate_staged_s3_image,
            )
            moderate_staged_s3_image(bucket, key)
        except ModerationRejectedError as e:
            # Defense-in-depth orphan cleanup (rovnaký vzor ako skills_upload):
            # moderate_staged_s3_image staging objekt už best-effort maže, no ak
            # by ten delete zlyhal, DB záznam ešte neexistuje (post_delete signál
            # sa nespustí), takže by staging upload ostal navždy (náklady + GDPR).
            delete_storage_keys([key])
            return Response(
                {"error": e.user_message, "code": e.code},
                status=status.HTTP_400_BAD_REQUEST,
            )

    with transaction.atomic():
        try:
            item = PortfolioItem.objects.select_for_update().get(
                id=item_id,
                owner=request.user,
            )
        except PortfolioItem.DoesNotExist:
            return _portfolio_item_not_found()
        if _active_images_count(item) >= MAX_PORTFOLIO_IMAGES:
            transaction.on_commit(lambda: delete_storage_keys([key]))
            return Response(
                {"error": "Maximalny pocet fotiek portfolia je 8."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        image = PortfolioImage.objects.create(
            item=item,
            order=_next_image_order(item),
            status=PortfolioImage.Status.PENDING,
            pending_key=key,
            original_filename=filename,
            content_type=content_type,
            size_bytes=size_bytes,
        )

        def enqueue_processing():
            try:
                if local_portfolio_upload_enabled():
                    from portfolio.image_processing import process_portfolio_image_record

                    process_portfolio_image_record(image.id)
                else:
                    from swaply.tasks.portfolio_images import process_portfolio_image

                    process_portfolio_image.delay(image.id)
            except Exception as exc:
                logger.exception(
                    "Failed to enqueue portfolio image processing",
                    extra={
                        "portfolio_image_id": image.id,
                        "portfolio_item_id": item_id,
                        "error": str(exc),
                    },
                )
                processed_at = timezone.now()
                image.status = PortfolioImage.Status.REJECTED
                image.rejected_reason = PROCESSING_ENQUEUE_ERROR
                image.processed_at = processed_at
                PortfolioImage.objects.filter(
                    id=image.id,
                    status=PortfolioImage.Status.PENDING,
                ).update(
                    status=image.status,
                    rejected_reason=image.rejected_reason,
                    processed_at=processed_at,
                )
                delete_storage_keys([key])

        transaction.on_commit(enqueue_processing)

    image.refresh_from_db()
    return Response(
        {
            "id": image.id,
            "status": image.status,
            "order": image.order,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def portfolio_image_detail_view(request, item_id: int, image_id: int):
    with transaction.atomic():
        try:
            item = PortfolioItem.objects.select_for_update().get(
                id=item_id,
                owner=request.user,
            )
        except PortfolioItem.DoesNotExist:
            return _portfolio_item_not_found()

        try:
            image = item.images.select_for_update().get(id=image_id)
        except PortfolioImage.DoesNotExist:
            return Response(
                {"error": "Fotka portfolia nebola najdena."},
                status=status.HTTP_404_NOT_FOUND,
            )

        keys = image_storage_keys(image)
        was_cover = item.cover_image_id == image.id
        image.delete()

        if was_cover:
            fallback = (
                item.images.filter(status=PortfolioImage.Status.APPROVED)
                .filter(_public_file_q())
                .order_by("order", "id")
                .first()
            )
            item.cover_image = fallback
            item.save(update_fields=["cover_image", "updated_at"])

        transaction.on_commit(lambda: delete_storage_keys(keys))

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def portfolio_image_cover_view(request, item_id: int, image_id: int):
    with transaction.atomic():
        try:
            item = PortfolioItem.objects.select_for_update().get(
                id=item_id,
                owner=request.user,
            )
        except PortfolioItem.DoesNotExist:
            return _portfolio_item_not_found()

        try:
            image = item.images.select_for_update().get(id=image_id)
        except PortfolioImage.DoesNotExist:
            return Response(
                {"error": "Fotka portfolia nebola najdena."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if image.status != PortfolioImage.Status.APPROVED or not (
            image.large_key or image.approved_key or getattr(image.image, "name", "")
        ):
            return Response(
                {"error": "Titulna fotka musi byt schvalena."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.cover_image = image
        item.save(update_fields=["cover_image", "updated_at"])

    return Response(
        {"cover_image": _serialize_image(request, image)},
        status=status.HTTP_200_OK,
    )
