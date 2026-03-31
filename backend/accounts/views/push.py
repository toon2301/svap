import logging

from django.core.exceptions import ImproperlyConfigured
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.push_serializers import (
    WebPushSubscriptionCreateSerializer,
    WebPushSubscriptionDeleteSerializer,
)
from accounts.services.webpush_crypto import get_web_push_vapid_public_key
from accounts.services.webpush_subscriptions import (
    delete_web_push_subscription,
    upsert_web_push_subscription,
)
from swaply.rate_limiting import api_rate_limit

logger = logging.getLogger(__name__)


def _push_unavailable_response() -> Response:
    return Response(
        {"error": "Push notifikácie momentálne nie sú dostupné."},
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def push_vapid_public_key_view(request):
    try:
        public_key = get_web_push_vapid_public_key()
    except ImproperlyConfigured:
        logger.exception("Web push VAPID public key is not configured correctly")
        return _push_unavailable_response()

    return Response({"public_key": public_key}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def push_subscriptions_view(request):
    serializer = WebPushSubscriptionCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"error": "Neplatné údaje", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    payload = serializer.validated_data["subscription"]

    try:
        _, created = upsert_web_push_subscription(
            user=request.user,
            endpoint=payload["endpoint"],
            p256dh=payload["keys"]["p256dh"],
            auth=payload["keys"]["auth"],
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            device_label=serializer.validated_data.get("device_label", ""),
        )
    except ValueError as exc:
        return Response(
            {"error": "Neplatné údaje", "details": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except ImproperlyConfigured:
        logger.exception("Web push subscription could not be stored")
        return _push_unavailable_response()

    return Response(
        {"ok": True, "created": created},
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def push_subscription_current_view(request):
    serializer = WebPushSubscriptionDeleteSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"error": "Neplatné údaje", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        deleted = delete_web_push_subscription(
            user=request.user,
            endpoint=serializer.validated_data["endpoint"],
        )
    except ValueError:
        return Response(
            {"error": "Neplatné údaje", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {"ok": True, "deleted": bool(deleted)},
        status=status.HTTP_200_OK,
    )
