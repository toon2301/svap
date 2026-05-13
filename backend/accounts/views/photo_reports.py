"""Photo report API views."""

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..models import OfferedSkillImage, PhotoReport

User = get_user_model()

MAX_REASON_LENGTH = 100
MAX_DESCRIPTION_LENGTH = 2000


def _validate_report_payload(request):
    reason = request.data.get("reason")
    if reason is None or (isinstance(reason, str) and not reason.strip()):
        return None, None, Response(
            {"error": "Pole reason je povinne a nesmie byt prazdne."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    reason = reason.strip() if isinstance(reason, str) else str(reason).strip()
    if len(reason) > MAX_REASON_LENGTH:
        return None, None, Response(
            {"error": "Dovod moze mat maximalne 100 znakov."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    description = request.data.get("description", "")
    if description is None:
        description = ""
    description = (
        description.strip() if isinstance(description, str) else str(description).strip()
    )
    if len(description) > MAX_DESCRIPTION_LENGTH:
        return None, None, Response(
            {"error": "Popis moze mat maximalne 2000 znakov."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return reason, description, None


def _duplicate_response():
    return Response(
        {"error": "Tuto fotku si uz nahlasil."},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _created_response():
    return Response(
        {"message": "Fotka bola nahlasena."},
        status=status.HTTP_201_CREATED,
    )


def _offer_image_has_reportable_file(image: OfferedSkillImage) -> bool:
    approved_key = (getattr(image, "approved_key", "") or "").strip()
    image_name = getattr(getattr(image, "image", None), "name", "") or ""
    return bool(approved_key or image_name)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def offer_image_report_view(request, skill_id: int, image_id: int):
    """Create a report for an offer image visible in the profile lightbox."""

    try:
        image = (
            OfferedSkillImage.objects.select_related("skill__user")
            .only(
                "id",
                "skill_id",
                "image",
                "status",
                "approved_key",
                "skill__id",
                "skill__user_id",
                "skill__is_hidden",
                "skill__user__id",
                "skill__user__is_public",
            )
            .get(id=image_id, skill_id=skill_id)
        )
    except OfferedSkillImage.DoesNotExist:
        return Response(
            {"error": "Fotka nebola najdena."}, status=status.HTTP_404_NOT_FOUND
        )

    offer = image.skill
    if offer.user_id == request.user.id:
        return Response(
            {"error": "Nahlasovanie vlastnej fotky nie je povolene."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if offer.is_hidden or not getattr(offer.user, "is_public", True):
        return Response(
            {"error": "Fotka nebola najdena."}, status=status.HTTP_404_NOT_FOUND
        )

    if image.status == OfferedSkillImage.Status.REJECTED or not _offer_image_has_reportable_file(image):
        return Response(
            {"error": "Fotka nebola najdena."}, status=status.HTTP_404_NOT_FOUND
        )

    reason, description, error_response = _validate_report_payload(request)
    if error_response is not None:
        return error_response

    if PhotoReport.objects.filter(offer_image=image, reported_by=request.user).exists():
        return _duplicate_response()

    try:
        with transaction.atomic():
            PhotoReport.objects.create(
                offer_image=image,
                reported_by=request.user,
                reason=reason,
                description=description,
            )
    except IntegrityError:
        return _duplicate_response()

    return _created_response()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def user_avatar_report_view(request, user_id: int):
    """Create a report for a public user's current profile avatar."""

    try:
        reported_user = User.objects.only("id", "is_active", "is_public", "avatar").get(
            id=user_id,
            is_active=True,
        )
    except User.DoesNotExist:
        return Response(
            {"error": "Fotka nebola najdena."}, status=status.HTTP_404_NOT_FOUND
        )

    if reported_user.id == request.user.id:
        return Response(
            {"error": "Nahlasovanie vlastnej fotky nie je povolene."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if not getattr(reported_user, "is_public", True):
        return Response(
            {"error": "Fotka nebola najdena."}, status=status.HTTP_404_NOT_FOUND
        )

    avatar_name = getattr(getattr(reported_user, "avatar", None), "name", "") or ""
    if not avatar_name:
        return Response(
            {"error": "Fotka nebola najdena."}, status=status.HTTP_404_NOT_FOUND
        )

    reason, description, error_response = _validate_report_payload(request)
    if error_response is not None:
        return error_response

    if PhotoReport.objects.filter(
        reported_user=reported_user,
        reported_avatar_name=avatar_name,
        reported_by=request.user,
    ).exists():
        return _duplicate_response()

    try:
        with transaction.atomic():
            PhotoReport.objects.create(
                reported_user=reported_user,
                reported_avatar_name=avatar_name,
                reported_by=request.user,
                reason=reason,
                description=description,
            )
    except IntegrityError:
        return _duplicate_response()

    return _created_response()
