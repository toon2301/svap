"""
Notifications API (pre badge + Requests module).
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.utils import timezone
from time import perf_counter
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db import connections
from django.core.cache import cache

from swaply.rate_limiting import api_rate_limit

from ..models import Notification, NotificationType
from ..serializers import NotificationSerializer
from ..realtime import notify_user
from ..services.notifications import (
    GENERAL_NOTIFICATION_UNREAD_TYPE,
    NOTIFICATION_FEED_LIMIT,
    UNREAD_COUNT_CACHE_TTL_SECONDS,
    cache_unread_count,
    exclude_general_notification_types,
    get_unread_count,
    _unread_cache_key as service_unread_cache_key,
)


def _unread_cache_key(user_id: int, notif_type: str) -> str:
    return service_unread_cache_key(user_id, notif_type)


def _send_unread_count(user_id: int) -> None:
    unread = get_unread_count(user_id=user_id, notif_type=NotificationType.SKILL_REQUEST)
    cache_unread_count(
        user_id=user_id,
        notif_type=NotificationType.SKILL_REQUEST,
        count=unread,
        ttl_seconds=UNREAD_COUNT_CACHE_TTL_SECONDS,
    )
    notify_user(user_id, {"type": "skill_request", "unread_count": unread})


NOTIFICATION_FEED_MAX_PAGE_SIZE = 50

# Povolené hodnoty ?type= pre unread-count (enum typy + agregát "all").
_VALID_UNREAD_TYPES = frozenset(NotificationType.values) | {
    GENERAL_NOTIFICATION_UNREAD_TYPE
}


def _parse_notifications_page_params(request):
    """Spracuje ?page a ?page_size (rovnaké limity ako ostatné zoznamy)."""
    try:
        page = int(str(request.query_params.get("page", "1")).strip())
    except (TypeError, ValueError):
        page = 1
    if page < 1:
        page = 1

    page_size = NOTIFICATION_FEED_LIMIT
    raw_page_size = request.query_params.get("page_size")
    if raw_page_size is not None:
        try:
            page_size = int(str(raw_page_size).strip())
        except (TypeError, ValueError):
            page_size = NOTIFICATION_FEED_LIMIT
    if page_size <= 0:
        page_size = NOTIFICATION_FEED_LIMIT
    if page_size > NOTIFICATION_FEED_MAX_PAGE_SIZE:
        page_size = NOTIFICATION_FEED_MAX_PAGE_SIZE

    return page, page_size


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def notifications_list_view(request):
    qs = (
        Notification.objects.filter(user=request.user)
        .select_related("actor", "conversation", "group_invitation", "skill_request")
        .order_by("-created_at", "-id")
    )

    notif_type = (request.query_params.get("type") or "").strip()
    if notif_type and notif_type != "all":
        qs = qs.filter(type=notif_type)
    else:
        qs = exclude_general_notification_types(qs)

    unread_only = (request.query_params.get("unread") or "").strip().lower()
    if unread_only in {"1", "true", "yes"}:
        qs = qs.filter(is_read=False)

    # Opt-in stránkovanie cez ?page (offset/page-based, rovnaký vzor ako recenzie).
    # Umožňuje prístup k celej histórii, nielen k posledným N.
    if request.query_params.get("page") is not None:
        page, page_size = _parse_notifications_page_params(request)
        paginator = Paginator(qs, page_size)
        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page = 1
            page_obj = paginator.page(page)
        except EmptyPage:
            page = paginator.num_pages if paginator.num_pages > 0 else 1
            page_obj = paginator.page(page) if paginator.num_pages > 0 else []
        items = list(page_obj) if page_obj else []
        return Response(
            {
                "results": NotificationSerializer(
                    items, many=True, context={"request": request}
                ).data,
                "total": paginator.count,
                "page": page,
                "page_size": page_size,
                "total_pages": paginator.num_pages,
            },
            status=status.HTTP_200_OK,
        )

    # Spätná kompatibilita: bez ?page vraciame pôvodné ploché pole (limit-based).
    try:
        limit = int(request.query_params.get("limit") or NOTIFICATION_FEED_LIMIT)
    except Exception:
        limit = NOTIFICATION_FEED_LIMIT
    limit = max(1, min(limit, NOTIFICATION_FEED_MAX_PAGE_SIZE))

    return Response(
        NotificationSerializer(
            qs[:limit],
            many=True,
            context={"request": request},
        ).data,
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def notifications_unread_count_view(request):
    notif_type = (
        request.query_params.get("type") or NotificationType.SKILL_REQUEST
    ).strip()
    count_all = notif_type == "all"
    cache_type = GENERAL_NOTIFICATION_UNREAD_TYPE if count_all else notif_type

    # Neznámy typ: graceful 0 bez DB/cache (validácia vstupu + zabránenie
    # cache pollution junk kľúčmi na často-pollovanom badge endpointe).
    if notif_type not in _VALID_UNREAD_TYPES:
        return Response({"count": 0}, status=status.HTTP_200_OK)

    # Fast-path: Redis cache hit avoids slow DB connect on Railway.
    cache_key = _unread_cache_key(request.user.id, cache_type)
    t_cache0 = perf_counter()
    try:
        cached = cache.get(cache_key) if cache_key else None
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
        qs = Notification.objects.filter(user=request.user, is_read=False)
        if not count_all:
            qs = qs.filter(type=notif_type)
        else:
            qs = exclude_general_notification_types(qs)
        count = qs.count()
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
    count_all = notif_type == "all"
    try:
        qs = Notification.objects.filter(user=request.user, is_read=False)
        if not count_all:
            qs = qs.filter(type=notif_type)
        else:
            qs = exclude_general_notification_types(qs)
        qs.update(is_read=True, read_at=now)
        # Keep cache in sync (avoid DB hit in unread-count).
        cache_unread_count(
            user_id=request.user.id,
            notif_type=GENERAL_NOTIFICATION_UNREAD_TYPE if count_all else notif_type,
            count=0,
            ttl_seconds=UNREAD_COUNT_CACHE_TTL_SECONDS,
        )
    except Exception:
        pass

    if count_all:
        notify_user(request.user.id, {"type": "notification_read", "unread_count": 0})
    else:
        _send_unread_count(request.user.id)
    return Response({"ok": True}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def notifications_mark_read_view(request, notification_id: int):
    notification = (
        Notification.objects.only("id", "user_id", "type", "is_read", "read_at")
        .filter(id=notification_id, user=request.user)
        .first()
    )
    if notification is None:
        return Response(status=status.HTTP_404_NOT_FOUND)

    changed = False
    if not notification.is_read:
        now = timezone.now()
        changed = (
            Notification.objects.filter(
                id=notification.id,
                user=request.user,
                is_read=False,
            ).update(is_read=True, read_at=now)
            > 0
        )
        if changed:
            notification.is_read = True
            notification.read_at = now

    if notification.type == NotificationType.SKILL_REQUEST:
        unread = get_unread_count(
            user_id=request.user.id,
            notif_type=NotificationType.SKILL_REQUEST,
        )
        if changed:
            cache_unread_count(
                user_id=request.user.id,
                notif_type=NotificationType.SKILL_REQUEST,
                count=unread,
                ttl_seconds=UNREAD_COUNT_CACHE_TTL_SECONDS,
            )
            notify_user(
                request.user.id,
                {"type": "skill_request", "unread_count": unread},
            )
    else:
        unread = get_unread_count(user_id=request.user.id, notif_type="all")
        if changed:
            cache_unread_count(
                user_id=request.user.id,
                notif_type=GENERAL_NOTIFICATION_UNREAD_TYPE,
                count=unread,
                ttl_seconds=UNREAD_COUNT_CACHE_TTL_SECONDS,
            )
            notify_user(
                request.user.id,
                {"type": "notification_read", "unread_count": unread},
            )

    return Response(
        {
            "ok": True,
            "id": notification.id,
            "is_read": True,
            "read_at": notification.read_at.isoformat() if notification.read_at else None,
            "unread_count": unread,
        },
        status=status.HTTP_200_OK,
    )
