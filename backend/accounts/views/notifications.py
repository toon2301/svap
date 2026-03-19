"""
Notifications API (pre badge + Requests module).
"""

import os
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.utils import timezone
from time import perf_counter
from django.db import connections
from django.core.cache import cache

from swaply.rate_limiting import api_rate_limit

from ..models import Notification, NotificationType
from ..serializers import NotificationSerializer
from ..realtime import notify_user


UNREAD_COUNT_CACHE_TTL_SECONDS = int(os.getenv("UNREAD_COUNT_CACHE_TTL_SECONDS", "60") or "60")


def _unread_cache_key(user_id: int, notif_type: str) -> str:
    return f"notif_unread_count:{int(user_id)}:{str(notif_type).strip()}"


def _send_unread_count(user_id: int) -> None:
    try:
        unread = Notification.objects.filter(
            user_id=user_id,
            type=NotificationType.SKILL_REQUEST,
            is_read=False,
        ).count()
    except Exception:
        unread = 0
    try:
        cache.set(
            _unread_cache_key(user_id, NotificationType.SKILL_REQUEST),
            int(unread),
            timeout=UNREAD_COUNT_CACHE_TTL_SECONDS,
        )
    except Exception:
        pass
    notify_user(user_id, {"type": "skill_request", "unread_count": unread})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def notifications_list_view(request):
    qs = Notification.objects.filter(user=request.user).order_by("-created_at")

    notif_type = (request.query_params.get("type") or "").strip()
    if notif_type:
        qs = qs.filter(type=notif_type)

    unread_only = (request.query_params.get("unread") or "").strip().lower()
    if unread_only in {"1", "true", "yes"}:
        qs = qs.filter(is_read=False)

    # jednoduché stránkovanie: limit
    try:
        limit = int(request.query_params.get("limit") or 50)
    except Exception:
        limit = 50
    limit = max(1, min(limit, 200))

    return Response(
        NotificationSerializer(qs[:limit], many=True).data, status=status.HTTP_200_OK
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def notifications_unread_count_view(request):
    notif_type = (
        request.query_params.get("type") or NotificationType.SKILL_REQUEST
    ).strip()

    # Fast-path: Redis cache hit avoids slow DB connect on Railway.
    cache_key = _unread_cache_key(request.user.id, notif_type)
    t_cache0 = perf_counter()
    try:
        cached = cache.get(cache_key)
    except Exception:
        cached = None
    cache_ms = (perf_counter() - t_cache0) * 1000.0
    if isinstance(cached, int):
        resp = Response({"count": int(cached)}, status=status.HTTP_200_OK)
        try:
            resp["X-Notif-Count-Source"] = "cache"
            resp["X-Notif-Cache-Ms"] = str(int(cache_ms))
            base_req = getattr(request, "_request", request)
            st = getattr(base_req, "_server_timing", None)
            if not isinstance(st, dict):
                st = {}
            st["unread_cache"] = cache_ms
            base_req._server_timing = st
        except Exception:
            pass
        return resp

    conn = connections["default"]
    was_none = False
    try:
        was_none = conn.connection is None
    except Exception:
        was_none = False

    t_conn0 = perf_counter()
    try:
        conn.ensure_connection()
    except Exception:
        # fail-open: query below will handle exception
        pass
    db_connect_ms = (perf_counter() - t_conn0) * 1000.0

    t_sql0 = perf_counter()
    try:
        count = Notification.objects.filter(
            user=request.user, type=notif_type, is_read=False
        ).count()
    except Exception:
        count = 0
    notif_sql_ms = (perf_counter() - t_sql0) * 1000.0
    db_ms = db_connect_ms + notif_sql_ms
    try:
        cache.set(cache_key, int(count), timeout=UNREAD_COUNT_CACHE_TTL_SECONDS)
    except Exception:
        pass
    resp = Response({"count": count}, status=status.HTTP_200_OK)
    # Timing headers (safe): allow diagnosing DB vs other overhead
    try:
        resp["X-Notif-Count-Ms"] = str(int(db_ms))
        resp["X-Notif-Count-Source"] = "db"
        # also expose to ServerTimingMiddleware aggregation
        base_req = getattr(request, "_request", request)  # DRF Request -> Django HttpRequest
        st = getattr(base_req, "_server_timing", None)
        if not isinstance(st, dict):
            st = {}
        st["db_connect"] = db_connect_ms
        st["notif_sql"] = notif_sql_ms
        st["notif_count"] = db_ms
        st["db_conn_new_notif"] = 0.1 if was_none else 0.0
        base_req._server_timing = st
    except Exception:
        pass
    return resp


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def notifications_mark_all_read_view(request):
    notif_type = (request.data.get("type") or NotificationType.SKILL_REQUEST).strip()
    now = timezone.now()
    try:
        Notification.objects.filter(
            user=request.user, type=notif_type, is_read=False
        ).update(is_read=True, read_at=now)
    except Exception:
        pass

    # Keep cache in sync (avoid DB hit in unread-count).
    try:
        cache.set(
            _unread_cache_key(request.user.id, notif_type),
            0,
            timeout=UNREAD_COUNT_CACHE_TTL_SECONDS,
        )
    except Exception:
        pass

    _send_unread_count(request.user.id)
    return Response({"ok": True}, status=status.HTTP_200_OK)
