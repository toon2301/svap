"""Profile like API views."""

import logging

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import ProfileLike
from accounts.realtime import notify_user
from accounts.services.notifications import create_profile_liked_notification
from accounts.services.user_blocks import (
    exclude_blocked_users,
    lock_user_pair_for_update,
    user_block_exists_between,
)
from swaply.rate_limiting import api_rate_limit

from .dashboard_views.public_profiles import _enforce_public_or_owner, _not_found

User = get_user_model()
logger = logging.getLogger(__name__)


def _profile_like_payload(*, profile_user_id: int, viewer_id: int) -> dict:
    return {
        "profile_user_id": profile_user_id,
        "is_profile_liked_by_me": ProfileLike.objects.filter(
            profile_user_id=profile_user_id,
            user_id=viewer_id,
        ).exists(),
        "profile_likes_count": ProfileLike.objects.filter(
            profile_user_id=profile_user_id,
        ).count(),
    }


def _dispatch_profile_like_change(profile_user_id: int) -> None:
    """
    Pošli WS count-update pre profile lajky vlastníkovi profilu.

    Odosiela sa pri KAŽDEJ úspešnej like/unlike akcii – zámerne NEZÁVISLE od toho,
    či vznikla notifikácia. `notification_created` event totiž nepríde pri vypnutých
    in-app notifikáciách, pri unlike (žiadna notifikácia) ani pri opakovanom lajku
    toho istého používateľa (dedup). Tento event zabezpečí živú aktualizáciu
    `profile_likes_count` aj v týchto prípadoch. `notify_user` je fail-open, takže
    zlyhanie realtime vrstvy nezhodí API request.
    """
    count = ProfileLike.objects.filter(profile_user_id=profile_user_id).count()
    notify_user(
        int(profile_user_id),
        {
            "type": "profile_like_changed",
            "profile_user_id": int(profile_user_id),
            "profile_likes_count": int(count),
        },
    )


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def profile_like_view(request, user_id: int):
    """
    POST enables a profile like, DELETE removes it.

    The endpoint is idempotent and follows profile visibility rules. Users cannot
    like their own profile; this is enforced here and by a DB check constraint.
    """
    try:
        profile_users = User.objects.only(
            "id",
            "is_active",
            "is_public",
            "slug",
            "first_name",
            "last_name",
            "company_name",
            "username",
            "user_type",
        )
        profile_user = exclude_blocked_users(
            profile_users,
            viewer_user_id=request.user.id,
        ).get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return _not_found()

    privacy_resp = _enforce_public_or_owner(request, profile_user)
    if privacy_resp is not None:
        return privacy_resp

    if int(profile_user.id) == int(request.user.id):
        return Response(
            {"error": "Nemozes dat like vlastnemu profilu."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.method == "POST":

        def notify_profile_owner():
            try:
                create_profile_liked_notification(
                    profile_user=profile_user,
                    actor=request.user,
                )
            except Exception:
                logger.exception(
                    "Profile like notification dispatch failed",
                    extra={
                        "profile_user_id": getattr(profile_user, "id", None),
                        "actor_id": getattr(request.user, "id", None),
                    },
                )

        with transaction.atomic():
            lock_user_pair_for_update(
                first_user_id=request.user.id,
                second_user_id=profile_user.id,
            )
            if user_block_exists_between(
                first_user_id=request.user.id,
                second_user_id=profile_user.id,
            ):
                return _not_found()
            _, created = ProfileLike.objects.get_or_create(
                profile_user=profile_user,
                user=request.user,
            )
            if created:
                transaction.on_commit(notify_profile_owner)
            # Count-update ide VŽDY (aj pri opakovanom lajku / vypnutých notifikáciách),
            # oddelene od notifikácie – viď _dispatch_profile_like_change.
            profile_user_id = profile_user.id
            transaction.on_commit(
                lambda: _dispatch_profile_like_change(profile_user_id)
            )

        payload = _profile_like_payload(
            profile_user_id=profile_user.id,
            viewer_id=request.user.id,
        )
        return Response(
            payload,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    ProfileLike.objects.filter(profile_user=profile_user, user=request.user).delete()
    # Unlike nevytvára žiadnu notifikáciu → count-update pošleme priamo, nech sa
    # `profile_likes_count` u vlastníka živo aktualizuje aj po odobratí lajku.
    profile_user_id = profile_user.id
    transaction.on_commit(lambda: _dispatch_profile_like_change(profile_user_id))
    payload = _profile_like_payload(
        profile_user_id=profile_user.id,
        viewer_id=request.user.id,
    )
    return Response(payload, status=status.HTTP_200_OK)
