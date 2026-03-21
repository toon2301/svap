import os
from time import perf_counter, time_ns

from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ...models import OfferedSkill

User = get_user_model()

DASHBOARD_USER_SKILLS_CACHE_TTL_SECONDS = int(
    os.getenv("DASHBOARD_USER_SKILLS_CACHE_TTL_SECONDS", "60") or "60"
)
DASHBOARD_USER_SKILLS_CACHE_VERSION_TTL_SECONDS = int(
    os.getenv("DASHBOARD_USER_SKILLS_CACHE_VERSION_TTL_SECONDS", "86400")
    or "86400"
)


def _not_found():
    # Do not disclose whether the profile exists or is private.
    return Response(
        {"error": "Pouzivatel nebol najdeny"},
        status=status.HTTP_404_NOT_FOUND,
    )


def _enforce_public_or_owner(request, user) -> Response | None:
    is_owner = bool(
        getattr(request.user, "is_authenticated", False) and user.id == request.user.id
    )
    if not is_owner and not getattr(user, "is_public", True):
        return _not_found()
    return None


def _record_dashboard_user_skills_timing(request, **entries) -> None:
    try:
        base_req = getattr(request, "_request", request)
        st = getattr(base_req, "_server_timing", None)
        if not isinstance(st, dict):
            st = {}
        st.update(entries)
        base_req._server_timing = st
    except Exception:
        pass


def _dashboard_user_skills_cache_version_key(target_user_id: int) -> str:
    return f"dashboard_user_skills_version_v1:{int(target_user_id)}"


def _dashboard_user_skills_cache_version(target_user_id: int) -> str:
    try:
        version = cache.get(_dashboard_user_skills_cache_version_key(target_user_id))
    except Exception:
        version = None
    return str(version or "1")


def _dashboard_user_skills_cache_key(
    *, target_user_id: int, viewer_user_id: int, is_owner: bool
) -> str:
    variant = "owner" if is_owner else "viewer"
    version = _dashboard_user_skills_cache_version(target_user_id)
    return (
        f"dashboard_user_skills_v2:{int(target_user_id)}:{variant}:"
        f"{int(viewer_user_id)}:{version}"
    )


def invalidate_dashboard_user_skills_cache(target_user_id: int | None) -> None:
    if not target_user_id:
        return
    try:
        cache.set(
            _dashboard_user_skills_cache_version_key(int(target_user_id)),
            str(time_ns()),
            timeout=DASHBOARD_USER_SKILLS_CACHE_VERSION_TTL_SECONDS,
        )
    except Exception:
        pass


def _dashboard_target_user_by_id(request, user_id: int):
    current_user = getattr(request, "user", None)
    if getattr(current_user, "is_authenticated", False) and int(current_user.id) == int(
        user_id
    ):
        return current_user
    return User.objects.only("id", "is_active", "is_public").get(
        id=user_id, is_active=True
    )


def _optimized_skills_serialize(request, skills_qs):
    """Use the optimized queryset and context for OfferedSkillSerializer."""
    from ..skills import _skills_list_context, _skills_list_queryset
    from ...serializers import OfferedSkillSerializer

    optimized = _skills_list_queryset(skills_qs)
    skills_list = list(optimized)
    offer_ids = [s.id for s in skills_list]
    ctx = {"request": request, **_skills_list_context(request, offer_ids)}
    return OfferedSkillSerializer(skills_list, many=True, context=ctx)


def _dashboard_user_skills_response(request, *, user):
    is_owner = bool(
        getattr(request.user, "is_authenticated", False) and user.id == request.user.id
    )
    viewer_user_id = int(getattr(request.user, "id", 0) or 0)
    cache_key = _dashboard_user_skills_cache_key(
        target_user_id=user.id,
        viewer_user_id=viewer_user_id,
        is_owner=is_owner,
    )

    t_cache0 = perf_counter()
    cached = None
    try:
        cached = cache.get(cache_key)
    except Exception:
        cached = None
    cache_get_ms = (perf_counter() - t_cache0) * 1000.0
    if isinstance(cached, list):
        _record_dashboard_user_skills_timing(
            request,
            dashboard_user_skills_cache_get=cache_get_ms,
            dashboard_user_skills_cache_set=0.0,
        )
        return Response(cached, status=status.HTTP_200_OK)

    t_qs0 = perf_counter()
    skills_qs = OfferedSkill.objects.filter(user_id=user.id).order_by("-updated_at")
    if not is_owner:
        skills_qs = skills_qs.filter(is_hidden=False)
    serializer = _optimized_skills_serialize(request, skills_qs)
    t_qs1 = perf_counter()

    t_ser0 = perf_counter()
    data = list(serializer.data)
    t_ser1 = perf_counter()

    t_cache_set0 = perf_counter()
    try:
        cache.set(cache_key, data, timeout=DASHBOARD_USER_SKILLS_CACHE_TTL_SECONDS)
    except Exception:
        pass
    cache_set_ms = (perf_counter() - t_cache_set0) * 1000.0

    _record_dashboard_user_skills_timing(
        request,
        dashboard_user_skills_cache_get=cache_get_ms,
        dashboard_user_skills_cache_set=cache_set_ms,
        dashboard_user_skills_qs=(t_qs1 - t_qs0) * 1000.0,
        dashboard_user_skills_serialize=(t_ser1 - t_ser0) * 1000.0,
    )
    return Response(data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_user_profile_detail_view(request, user_id: int):
    """
    Read-only profile detail for another user in dashboard/search.
    """
    try:
        user = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return _not_found()

    privacy_resp = _enforce_public_or_owner(request, user)
    if privacy_resp is not None:
        return privacy_resp

    from ...serializers import UserProfileSerializer

    serializer = UserProfileSerializer(user, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_user_profile_detail_by_slug_view(request, slug: str):
    """
    Read-only profile detail by slug.
    """
    try:
        user = User.objects.get(slug=slug, is_active=True)
    except User.DoesNotExist:
        return _not_found()

    privacy_resp = _enforce_public_or_owner(request, user)
    if privacy_resp is not None:
        return privacy_resp

    from ...serializers import UserProfileSerializer

    serializer = UserProfileSerializer(user, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_user_skills_view(request, user_id: int):
    """
    Read-only list of skills for another user in dashboard/search.
    """
    try:
        user = _dashboard_target_user_by_id(request, user_id)
    except User.DoesNotExist:
        return _not_found()

    privacy_resp = _enforce_public_or_owner(request, user)
    if privacy_resp is not None:
        return privacy_resp

    return _dashboard_user_skills_response(request, user=user)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_user_skills_by_slug_view(request, slug: str):
    """
    Read-only list of skills for another user by slug.
    """
    try:
        user = User.objects.only("id", "is_active", "is_public").get(
            slug=slug, is_active=True
        )
    except User.DoesNotExist:
        return _not_found()

    privacy_resp = _enforce_public_or_owner(request, user)
    if privacy_resp is not None:
        return privacy_resp

    return _dashboard_user_skills_response(request, user=user)
