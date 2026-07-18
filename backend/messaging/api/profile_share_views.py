from __future__ import annotations

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.services.user_blocks import (
    BlockedUserInteractionError,
    exclude_blocked_users,
)
from swaply.rate_limiting import messaging_send_rate_limit
from ..services.profile_shares import (
    MAX_PROFILE_SHARE_RECIPIENTS,
    normalize_profile_share_recipient_ids,
    send_profile_share_to_recipients,
)
from . import notification_dispatch
from .serializers import MessageSerializer
from .view_helpers import unread_payload_for_recipients

User = get_user_model()


class ProfileShareSendSerializer(serializers.Serializer):
    shared_user_id = serializers.IntegerField(min_value=1)
    recipient_user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
        max_length=MAX_PROFILE_SHARE_RECIPIENTS,
    )

    def validate_recipient_user_ids(self, value):
        normalized = normalize_profile_share_recipient_ids(value)
        if not normalized:
            raise serializers.ValidationError("Vyberte aspoň jedného príjemcu.")
        return normalized


class ProfileShareSendView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(messaging_send_rate_limit)
    def post(self, request):
        serializer = ProfileShareSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        shared_users = (
            User.objects.filter(
                id=serializer.validated_data["shared_user_id"],
                is_active=True,
                is_public=True,
            )
            .exclude(is_staff=True)
            .exclude(is_superuser=True)
        )
        shared_user = get_object_or_404(
            exclude_blocked_users(
                shared_users,
                viewer_user_id=request.user.id,
            ).only("id", "is_active", "is_public", "is_staff", "is_superuser")
        )

        try:
            result = send_profile_share_to_recipients(
                actor=request.user,
                shared_user=shared_user,
                recipient_user_ids=serializer.validated_data["recipient_user_ids"],
            )
        except BlockedUserInteractionError:
            return Response(
                {"detail": "Not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        sent = []
        for delivery in result.sent:
            event = {
                "type": "messaging_message",
                "conversation_id": delivery.conversation_id,
                "message_id": delivery.message.id,
                "sender_id": request.user.id,
                "created_at": delivery.message.created_at.isoformat(),
            }
            unread_by_user = unread_payload_for_recipients(
                conversation_id=delivery.conversation_id,
                recipient_user_ids=delivery.recipient_user_ids,
            )
            for participant_id in delivery.recipient_user_ids:
                notification_dispatch.notify_user(
                    participant_id,
                    {**event, **unread_by_user[participant_id]},
                )

            sent.append(
                {
                    "user_id": delivery.user_id,
                    "conversation_id": delivery.conversation_id,
                    "message": MessageSerializer(
                        delivery.message,
                        context={"request": request},
                    ).data,
                }
            )

        return Response(
            {
                "sent": sent,
                "failed": [
                    {"user_id": failure.user_id, "code": failure.code}
                    for failure in result.failed
                ],
            },
            status=status.HTTP_200_OK,
        )
