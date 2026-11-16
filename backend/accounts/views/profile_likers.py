"""Zoznam používateľov, ktorí dali lajk profilu (nález 262, rozhodnutie R20 A).

Len čítanie. Viditeľnosť profilu je tá istá ako pri jeho lajkovaní
(`profile_like_view`); zoznam lajkujúcich skladá spoločný pomocník
`_likers_response` z Nástenky (súkromné, neaktívne a blokované účty skrýva pred
stránkovaním).
"""

from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from accounts.models import ProfileLike
from accounts.services.user_blocks import exclude_blocked_users
from swaply.rate_limiting import api_rate_limit

from .dashboard_views.public_profiles import _enforce_public_or_owner, _not_found
from .feed_likes import _likers_response

User = get_user_model()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def profile_likers_view(request, user_id: int):
    """Kto dal lajk profilu. Len pre prihláseného, rovnako ako profil.

    Profil musí byť pre diváka viditeľný: neexistujúci alebo neaktívny účet,
    blok medzi divákom a vlastníkom a neverejný profil dajú rovnaké 404 bez
    prezradenia, že účet existuje (vlastník vidí zoznam vždy). Kontroly sú tie
    isté ako v `profile_like_view`.
    """
    profile_users = User.objects.only("id", "is_active", "is_public")
    try:
        profile_user = exclude_blocked_users(
            profile_users,
            viewer_user_id=request.user.id,
        ).get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return _not_found()

    privacy_resp = _enforce_public_or_owner(request, profile_user)
    if privacy_resp is not None:
        return privacy_resp

    return _likers_response(
        request, ProfileLike.objects.filter(profile_user=profile_user)
    )
