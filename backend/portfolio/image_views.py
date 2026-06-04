import os
import uuid
import logging

import boto3
from django.conf import settings
from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from .image_storage import delete_storage_keys, image_storage_keys
from .models import PortfolioImage, PortfolioItem
from .serializers import PortfolioImageSerializer

MAX_PORTFOLIO_IMAGES = 8
UPLOAD_EXPIRES_SECONDS = 120
PROCESSING_ENQUEUE_ERROR = (
    "Spracovanie fotky sa nepodarilo spustit. Skus fotku nahrat znova."
)

logger = logging.getLogger(__name__)


def _portfolio_item_not_found():
    return Response(
        {"error": "Polozka portfolia nebola najdena"},
        status=status.HTTP_404_NOT_FOUND,
    )


def _get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
        region_name=getattr(settings, "AWS_S3_REGION_NAME", None),
    )


def _allowed_extensions():
    return [
        ext.strip().lower()
        for ext in getattr(
            settings,
            "ALLOWED_IMAGE_EXTENSIONS",
            [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"],
        )
    ]


def _max_image_bytes() -> int:
    try:
        max_mb = int(getattr(settings, "IMAGE_MAX_SIZE_MB", 5))
    except Exception:
        max_mb = 5
    return max_mb * 1024 * 1024


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

    max_bytes = _max_image_bytes()
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
    if ext not in _allowed_extensions():
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

    filename, content_type, _size_bytes, error_response = _validate_upload_metadata(
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
    key = f"uploads/portfolio/{item_id}/{uuid.uuid4().hex}{ext}"
    try:
        presigned = _get_s3_client().generate_presigned_post(
            Bucket=bucket,
            Key=key,
            Conditions=[
                ["content-length-range", 1, _max_image_bytes()],
            ],
            ExpiresIn=UPLOAD_EXPIRES_SECONDS,
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
            "expires_in": UPLOAD_EXPIRES_SECONDS,
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
    if ext not in _allowed_extensions():
        return Response(
            {"error": "Neplatny typ suboru."},
            status=status.HTTP_400_BAD_REQUEST,
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
            {"error": "Upload nebol najdeny."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    size_bytes = int(head.get("ContentLength") or 0)
    if size_bytes <= 0 or size_bytes > _max_image_bytes():
        delete_storage_keys([key])
        return Response(
            {"error": "Neplatny subor."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    content_type = str(head.get("ContentType") or "")
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
