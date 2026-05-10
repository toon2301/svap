from __future__ import annotations

import mimetypes

from django.contrib.auth import get_user_model
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from swaply.rate_limiting import messaging_send_rate_limit
from ..models import Conversation, ConversationParticipant, Message
from ..services.conversations import SelfConversationNotAllowed, send_direct_message
from ..services.messages import (
    MessageNotFound,
    NotMessageAuthor,
    NotParticipant,
    delete_message_for_all,
    send_message,
)
from ..services.pins import InvalidPinnedMessage, set_conversation_pinned_message
from .notification_dispatch import notify_user
from .serializers import (
    MessageSerializer,
    PinMessageSerializer,
    SendMessageSerializer,
    StartDirectMessageSerializer,
)
from .view_helpers import (
    _can_open_direct_target,
    _conversation_for_user_or_404,
    _conversation_unread_messages_count_for_user,
    _participant_hidden_at_for_conversation,
    _participant_status_for_conversation,
    _peer_last_read_at_for_conversation,
    _serialize_pinned_message,
    _total_unread_messages_count_for_user,
    _total_unread_messages_count_for_user_id,
)

User = get_user_model()


class MessagePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class MessageListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    pagination_class = MessagePagination

    def get_conversation(self) -> Conversation:
        conversation = getattr(self, "_conversation", None)
        if conversation is None:
            conversation_id = int(self.kwargs["conversation_id"])
            conversation = _conversation_for_user_or_404(
                conversation_id=conversation_id,
                user=self.request.user,
            )
            self._conversation = conversation
        return conversation

    def get_queryset(self):
        convo = self.get_conversation()
        participant_status = _participant_status_for_conversation(
            conversation_id=convo.id,
            user_id=self.request.user.id,
        )
        hidden_at = _participant_hidden_at_for_conversation(
            conversation_id=convo.id,
            user_id=self.request.user.id,
        )
        qs = Message.objects.filter(conversation=convo)
        if convo.is_group and participant_status == ConversationParticipant.Status.INVITED:
            qs = qs.filter(
                message_type=Message.Type.GROUP_INVITATION,
                group_invitation__invited_user_id=self.request.user.id,
            )
        if hidden_at is not None:
            qs = qs.filter(created_at__gt=hidden_at)
        return qs.select_related(
            "sender",
            "group_invitation",
            "group_invitation__invited_user",
            "group_invitation__invited_by",
        ).order_by("-created_at", "-id")

    def list(self, request, *args, **kwargs):
        conversation = self.get_conversation()
        participant_status = _participant_status_for_conversation(
            conversation_id=conversation.id,
            user_id=request.user.id,
        )
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        peer_last_read_at = (
            None
            if conversation.is_group
            else _peer_last_read_at_for_conversation(
                conversation_id=conversation.id,
                user_id=request.user.id,
            )
        )
        peer_last_read_at_value = (
            peer_last_read_at.isoformat() if peer_last_read_at is not None else None
        )
        pinned_message_data = None
        if participant_status != ConversationParticipant.Status.INVITED:
            pinned_message_data = _serialize_pinned_message(
                request=request,
                conversation=conversation,
            )

        if page is not None:
            response = self.get_paginated_response(serializer.data)
            response.data["peer_last_read_at"] = peer_last_read_at_value
            response.data["pinned_message"] = pinned_message_data
            return response

        return Response(
            {
                "results": serializer.data,
                "peer_last_read_at": peer_last_read_at_value,
                "pinned_message": pinned_message_data,
            }
        )


class MessageImageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id: int, message_id: int):
        convo = _conversation_for_user_or_404(conversation_id=conversation_id, user=request.user)
        message = get_object_or_404(
            Message.objects.filter(
                conversation_id=convo.id,
                id=message_id,
                is_deleted=False,
            )
        )

        if not message.image:
            return Response(status=status.HTTP_404_NOT_FOUND)

        try:
            message.image.open("rb")
            image_file = message.image.file
        except Exception:
            return Response(status=status.HTTP_404_NOT_FOUND)

        content_type = (
            mimetypes.guess_type(message.image.name or "")[0] or "application/octet-stream"
        )
        response = FileResponse(image_file, content_type=content_type)
        response["Cache-Control"] = "private, max-age=3600"
        response["X-Content-Type-Options"] = "nosniff"
        return response


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(messaging_send_rate_limit)
    def post(self, request, conversation_id: int):
        convo = _conversation_for_user_or_404(conversation_id=conversation_id, user=request.user)
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = send_message(
                conversation=convo,
                sender=request.user,
                text=serializer.validated_data.get("text"),
                image=serializer.validated_data.get("image"),
            )
        except NotParticipant:
            # Do not leak existence; treat as not found
            return Response(status=status.HTTP_404_NOT_FOUND)

        event = {
            "type": "messaging_message",
            "conversation_id": convo.id,
            "message_id": result.message.id,
            "sender_id": request.user.id,
            "created_at": result.message.created_at.isoformat(),
        }
        for participant_id in result.recipient_user_ids:
            notify_user(
                participant_id,
                {
                    **event,
                    "total_unread_count": _total_unread_messages_count_for_user_id(
                        participant_id
                    ),
                    "conversation_unread_count": _conversation_unread_messages_count_for_user(
                        conversation_id=convo.id,
                        user_id=participant_id,
                    ),
                },
            )

        return Response(
            MessageSerializer(result.message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class DeleteMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id: int, message_id: int):
        convo = _conversation_for_user_or_404(conversation_id=conversation_id, user=request.user)

        try:
            result = delete_message_for_all(
                conversation=convo,
                message_id=message_id,
                actor=request.user,
            )
        except NotParticipant:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except MessageNotFound:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except NotMessageAuthor:
            return Response(status=status.HTTP_403_FORBIDDEN)

        total_unread_count = _total_unread_messages_count_for_user(request.user)

        if result.changed:
            event = {
                "type": "messaging_message_deleted",
                "conversation_id": convo.id,
                "message_id": result.message.id,
                "deleted_by_id": request.user.id,
            }
            for participant_id in result.participant_user_ids:
                notify_user(
                    participant_id,
                    {
                        **event,
                        "total_unread_count": _total_unread_messages_count_for_user_id(
                            participant_id
                        ),
                        "conversation_unread_count": _conversation_unread_messages_count_for_user(
                            conversation_id=convo.id,
                            user_id=participant_id,
                        ),
                    },
                )

        return Response(
            {
                "conversation_id": convo.id,
                "message": MessageSerializer(
                    result.message,
                    context={"request": request},
                ).data,
                "conversation_unread_count": _conversation_unread_messages_count_for_user(
                    conversation_id=convo.id,
                    user_id=request.user.id,
                ),
                "total_unread_count": total_unread_count,
            },
            status=status.HTTP_200_OK,
        )


class PinMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id: int):
        convo = _conversation_for_user_or_404(conversation_id=conversation_id, user=request.user)
        serializer = PinMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = set_conversation_pinned_message(
                conversation=convo,
                actor=request.user,
                message_id=serializer.validated_data.get("message_id"),
            )
        except NotParticipant:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except MessageNotFound:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except InvalidPinnedMessage as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        pinned_message_data = (
            MessageSerializer(result.pinned_message, context={"request": request}).data
            if result.pinned_message is not None
            else None
        )

        if result.changed:
            event = {
                "type": "messaging_pinned_message_updated",
                "conversation_id": convo.id,
                "pinned_message": pinned_message_data,
                "actor_id": request.user.id,
            }
            for participant_id in result.participant_user_ids:
                notify_user(participant_id, event)

        return Response(
            {
                "conversation_id": convo.id,
                "pinned_message": pinned_message_data,
            },
            status=status.HTTP_200_OK,
        )


class StartDirectMessageView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(messaging_send_rate_limit)
    def post(self, request):
        serializer = StartDirectMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_user_id = serializer.validated_data["target_user_id"]
        target = get_object_or_404(User, id=target_user_id, is_active=True)
        if not _can_open_direct_target(actor=request.user, target=target):
            return Response(status=status.HTTP_404_NOT_FOUND)

        try:
            result = send_direct_message(
                actor=request.user,
                target=target,
                text=serializer.validated_data.get("text"),
                image=serializer.validated_data.get("image"),
            )
        except SelfConversationNotAllowed:
            return Response(
                {"error": "Nemôžete začať konverzáciu sami so sebou."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event = {
            "type": "messaging_message",
            "conversation_id": result.conversation.id,
            "message_id": result.message.id,
            "sender_id": request.user.id,
            "created_at": result.message.created_at.isoformat(),
        }
        for participant_id in result.recipient_user_ids:
            notify_user(
                participant_id,
                {
                    **event,
                    "total_unread_count": _total_unread_messages_count_for_user_id(
                        participant_id
                    ),
                    "conversation_unread_count": _conversation_unread_messages_count_for_user(
                        conversation_id=result.conversation.id,
                        user_id=participant_id,
                    ),
                },
            )

        return Response(
            {
                "conversation_id": result.conversation.id,
                "conversation_created": result.created_conversation,
                "message": MessageSerializer(
                    result.message, context={"request": request}
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )
