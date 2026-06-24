from __future__ import annotations

from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from swaply.rate_limiting import messaging_send_rate_limit
from ..models import Message
from ..services.forwarding import (
    MAX_FORWARD_RECIPIENTS,
    MessageForwardSourceUnavailable,
    forward_message_to_recipients,
    normalize_forward_recipient_ids,
)
from . import notification_dispatch
from .serializers import MessageSerializer
from .view_helpers import (
    _conversation_for_user_or_404,
    _conversation_unread_messages_count_for_user,
    _total_unread_messages_count_for_user_id,
)


class ForwardMessageSerializer(serializers.Serializer):
    recipient_user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
        max_length=MAX_FORWARD_RECIPIENTS,
    )

    def validate_recipient_user_ids(self, value):
        normalized = normalize_forward_recipient_ids(value)
        if not normalized:
            raise serializers.ValidationError("Vyberte aspoň jedného príjemcu.")
        return normalized


class ForwardMessageView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(messaging_send_rate_limit)
    def post(self, request, conversation_id: int, message_id: int):
        conversation = _conversation_for_user_or_404(
            conversation_id=conversation_id,
            user=request.user,
        )
        serializer = ForwardMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        source_message = get_object_or_404(
            Message.objects.select_related("conversation", "sender").filter(
                conversation_id=conversation.id,
                id=message_id,
                is_deleted=False,
                message_type=Message.Type.USER,
            )
        )

        try:
            result = forward_message_to_recipients(
                actor=request.user,
                source_message=source_message,
                recipient_user_ids=serializer.validated_data["recipient_user_ids"],
            )
        except MessageForwardSourceUnavailable:
            return Response(status=status.HTTP_404_NOT_FOUND)

        sent = []
        for delivery in result.sent:
            event = {
                "type": "messaging_message",
                "conversation_id": delivery.conversation_id,
                "message_id": delivery.message.id,
                "sender_id": request.user.id,
                "created_at": delivery.message.created_at.isoformat(),
            }
            for participant_id in delivery.recipient_user_ids:
                notification_dispatch.notify_user(
                    participant_id,
                    {
                        **event,
                        "total_unread_count": _total_unread_messages_count_for_user_id(
                            participant_id
                        ),
                        "conversation_unread_count": _conversation_unread_messages_count_for_user(
                            conversation_id=delivery.conversation_id,
                            user_id=participant_id,
                        ),
                    },
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
