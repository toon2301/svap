"""
Notifications API (pre badge + Requests module).
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.utils import timezone

from swaply.rate_limiting import api_rate_limit

from ..models import Notification, NotificationType
from ..serializers import NotificationSerializer
from ..realtime import notify_user


def _send_unread_count(user_id: int) -> None:
    try:
        unread = Notification.objects.filter(
            user_id=user_id,
            type=NotificationType.SKILL_REQUEST,
            is_read=False,
        ).count()
    except Exception:
        unread = 0
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
    try:
        count = Notification.objects.filter(
            user=request.user, type=notif_type, is_read=False
        ).count()
    except Exception:
        count = 0
    return Response({"count": count}, status=status.HTTP_200_OK)


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

    _send_unread_count(request.user.id)
    return Response({"ok": True}, status=status.HTTP_200_OK)
