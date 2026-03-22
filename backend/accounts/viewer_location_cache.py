import logging
import os

from django.contrib.auth import get_user_model
from django.core.cache import cache

logger = logging.getLogger(__name__)

_VIEWER_LOCATION_CACHE_TTL_SECONDS = int(
    os.getenv("SEARCH_VIEWER_LOCATION_CACHE_TTL_SECONDS", "3600") or "3600"
)


def _viewer_location_cache_key(user_id: int) -> str:
    return f"search_viewer_geo_v1:{int(user_id)}"


def _normalize_viewer_location(location, district) -> tuple[str, str]:
    return ((location or "").strip(), (district or "").strip())


def _serialize_viewer_location_snapshot(user) -> dict:
    location = getattr(user, "location", None)
    district = getattr(user, "district", None)
    normalized = _normalize_viewer_location(location, district)
    return {"location": normalized[0], "district": normalized[1]}


def _parse_viewer_location_snapshot(data) -> tuple[str, str] | None:
    if not isinstance(data, dict):
        return None
    return _normalize_viewer_location(
        data.get("location", ""),
        data.get("district", ""),
    )


def invalidate_viewer_location_snapshot_cache(user_id: int | None) -> None:
    if not user_id:
        return
    try:
        cache.delete(_viewer_location_cache_key(int(user_id)))
    except Exception as exc:
        logger.warning(
            "Viewer location cache invalidation failed for user_id=%s: %s",
            user_id,
            exc,
        )


def warm_viewer_location_snapshot_cache(user) -> bool:
    if _VIEWER_LOCATION_CACHE_TTL_SECONDS <= 0 or user is None:
        return False

    try:
        user_id = int(getattr(user, "pk", None) or getattr(user, "id", None) or 0)
    except Exception:
        user_id = 0
    if user_id <= 0:
        return False

    payload = _serialize_viewer_location_snapshot(user)
    try:
        cache.set(
            _viewer_location_cache_key(user_id),
            payload,
            timeout=_VIEWER_LOCATION_CACHE_TTL_SECONDS,
        )
        return True
    except Exception as exc:
        logger.warning(
            "Viewer location cache warm-up failed for user_id=%s: %s",
            user_id,
            exc,
        )
        return False


def get_viewer_location_snapshot(user) -> tuple[str, str]:
    if user is None:
        return ("", "")

    try:
        user_id = int(getattr(user, "pk", None) or getattr(user, "id", None) or 0)
    except Exception:
        user_id = 0
    if user_id <= 0:
        return ("", "")

    is_lazy = bool(getattr(user, "_swaply_auth_lazy", False))
    is_fully_loaded = bool(getattr(user, "_swaply_auth_fully_loaded", True))

    if not is_lazy or is_fully_loaded:
        snapshot = _normalize_viewer_location(
            getattr(user, "location", None),
            getattr(user, "district", None),
        )
        warm_viewer_location_snapshot_cache(user)
        return snapshot

    if _VIEWER_LOCATION_CACHE_TTL_SECONDS > 0:
        try:
            cached_snapshot = _parse_viewer_location_snapshot(
                cache.get(_viewer_location_cache_key(user_id))
            )
        except Exception:
            cached_snapshot = None
        if cached_snapshot is not None:
            return cached_snapshot

    User = get_user_model()
    try:
        location, district = (
            User.objects.filter(pk=user_id).values_list("location", "district").get()
        )
    except User.DoesNotExist:
        return ("", "")

    snapshot = _normalize_viewer_location(location, district)
    if _VIEWER_LOCATION_CACHE_TTL_SECONDS > 0:
        try:
            cache.set(
                _viewer_location_cache_key(user_id),
                {"location": snapshot[0], "district": snapshot[1]},
                timeout=_VIEWER_LOCATION_CACHE_TTL_SECONDS,
            )
        except Exception:
            pass
    return snapshot
