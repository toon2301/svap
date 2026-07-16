"""Offer like API views."""

import logging

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..models import OfferedSkill, OfferedSkillLike
from ..services.notifications import create_offer_liked_notification
from ..services.offer_visibility import offer_hidden_from_user as _offer_hidden_from_user
from ..services.user_blocks import lock_user_pair_for_update
from .dashboard_views.public_profiles import invalidate_dashboard_user_skills_cache
from .skills import _skills_list_cache_invalidate

logger = logging.getLogger(__name__)


def _offer_like_payload(*, offer_id: int, user_id: int) -> dict:
    return {
        "offer_id": offer_id,
        "is_liked_by_me": OfferedSkillLike.objects.filter(
            offer_id=offer_id,
            user_id=user_id,
        ).exists(),
        "likes_count": OfferedSkillLike.objects.filter(offer_id=offer_id).count(),
    }


def _invalidate_offer_like_caches(owner_id: int | None) -> None:
    if not owner_id:
        return
    _skills_list_cache_invalidate(owner_id)
    invalidate_dashboard_user_skills_cache(owner_id)


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def offer_like_view(request, skill_id):
    """
    POST: Add a like to an offer.
    DELETE: Remove a like from an offer.

    The endpoint is idempotent: repeated POST keeps the like enabled,
    repeated DELETE keeps it disabled.
    """
    try:
        offer = OfferedSkill.objects.select_related("user").get(id=skill_id)
    except OfferedSkill.DoesNotExist:
        return Response(
            {"error": "Ponuka nebola najdena"}, status=status.HTTP_404_NOT_FOUND
        )

    if _offer_hidden_from_user(offer, request.user):
        return Response(
            {"error": "Ponuka nebola najdena"}, status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "POST":
        def notify_owner_about_like():
            try:
                create_offer_liked_notification(offer=offer, actor=request.user)
            except Exception:
                logger.exception(
                    "Offer like notification dispatch failed",
                    extra={
                        "offer_id": getattr(offer, "id", None),
                        "owner_id": getattr(offer, "user_id", None),
                        "actor_id": getattr(request.user, "id", None),
                    },
                )

        with transaction.atomic():
            lock_user_pair_for_update(
                first_user_id=request.user.id,
                second_user_id=offer.user_id,
            )
            if _offer_hidden_from_user(offer, request.user):
                return Response(
                    {"error": "Ponuka nebola najdena"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            _, created = OfferedSkillLike.objects.get_or_create(
                offer=offer,
                user=request.user,
            )
            if created:
                transaction.on_commit(notify_owner_about_like)

        _invalidate_offer_like_caches(offer.user_id)
        payload = _offer_like_payload(offer_id=offer.id, user_id=request.user.id)
        return Response(
            payload,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    deleted_count, _ = OfferedSkillLike.objects.filter(
        offer=offer,
        user=request.user,
    ).delete()
    if deleted_count:
        _invalidate_offer_like_caches(offer.user_id)
    payload = _offer_like_payload(offer_id=offer.id, user_id=request.user.id)
    return Response(payload, status=status.HTTP_200_OK)
