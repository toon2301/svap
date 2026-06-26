from __future__ import annotations

import mimetypes

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from swaply.rate_limiting import messaging_send_rate_limit
from ..models import Conversation, ConversationParticipant, Message
from ..services.conversations import SelfConversationNotAllowed, send_direct_message
from ..services.message_requests import (
    MessageRequestActionNotAllowed,
    MessageRequestLimitExceeded,
    is_pending_message_request,
)
from ..services.messages import (
    MessageNotFound,
    NotMessageAuthor,
    NotParticipant,
    delete_message_for_all,
    send_message,
)
from ..services.pins import InvalidPinnedMessage, set_conversation_pinned_message
from . import notification_dispatch
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
    _serialize_conversation_for_user,
    _serialize_pinned_message,
    _total_unread_messages_count_for_user,
    unread_payload_for_recipients,
)

User = get_user_model()


def _message_request_send_error_response(exc: Exception):
    if isinstance(exc, MessageRequestLimitExceeded):
        return Response(
            {
                "code": "message_request_pending",
                "error": "Čakáte na prijatie konverzácie.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )
    if isinstance(exc, MessageRequestActionNotAllowed):
        return Response(status=status.HTTP_404_NOT_FOUND)
    raise exc


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
            # >= aby správa doručená presne v takte skrytia (created_at == hidden_at)
            # ostala viditeľná – konzistentné s viditeľnosťou konverzácie v sidebar.
            qs = qs.filter(created_at__gte=hidden_at)
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
            if conversation.is_group or is_pending_message_request(conversation)
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
        conversation_data = _serialize_conversation_for_user(
            request=request,
            conversation_id=conversation.id,
        )

        if page is not None:
            response = self.get_paginated_response(serializer.data)
            response.data["peer_last_read_at"] = peer_last_read_at_value
            response.data["pinned_message"] = pinned_message_data
            response.data["conversation"] = conversation_data
            return response

        return Response(
            {
                "results": serializer.data,
                "peer_last_read_at": peer_last_read_at_value,
                "pinned_message": pinned_message_data,
                "conversation": conversation_data,
            }
        )


_IMAGE_MEMBERSHIP_CACHE_TTL = 60


def _ensure_conversation_image_access(request, conversation_id: int) -> None:
    """
    Overí, že požadujúci smie čítať obrázky tejto konverzácie (členstvo).

    Pri scrollovaní histórie s obrázkami sa MessageImageView volá N-krát pre tú
    istú konverzáciu, preto pozitívny výsledok krátko cachujeme (60s) podľa
    (user_id, conversation_id) – ušetríme membership dotaz na každý obrázok.
    Cachujeme len pozitívny výsledok: nový člen tak dostane prístup okamžite a
    odobratému členovi prístup expiruje do 60s (členstvo sa mení zriedka).
    """
    cache_key = f"msg_img_access:{request.user.id}:{int(conversation_id)}"
    if cache.get(cache_key):
        return
    # Cache-miss: plný membership/visibility check (vyhodí 404 ak nemá prístup).
    _conversation_for_user_or_404(conversation_id=conversation_id, user=request.user)
    cache.set(cache_key, True, timeout=_IMAGE_MEMBERSHIP_CACHE_TTL)


def _message_image_response(request, conversation_id: int, message_id: int, field_name: str):
    """Serve a protected message image field after verifying conversation membership."""
    _ensure_conversation_image_access(request, conversation_id)
    message = get_object_or_404(
        Message.objects.filter(
            conversation_id=conversation_id,
            id=message_id,
            is_deleted=False,
        )
    )
    image_field = getattr(message, field_name, None)
    if not image_field:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        image_field.open("rb")
        image_file = image_field.file
    except Exception:
        return Response(status=status.HTTP_404_NOT_FOUND)

    content_type = mimetypes.guess_type(image_field.name or "")[0]
    if content_type is None and (image_field.name or "").lower().endswith(".webp"):
        content_type = "image/webp"
    content_type = content_type or "application/octet-stream"
    response = FileResponse(image_file, content_type=content_type)
    response["Cache-Control"] = "private, max-age=3600"
    response["X-Content-Type-Options"] = "nosniff"
    return response


class MessageImageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id: int, message_id: int):
        return _message_image_response(request, conversation_id, message_id, "image")


class MessageImageThumbnailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id: int, message_id: int):
        return _message_image_response(request, conversation_id, message_id, "image_thumbnail")


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
        except (MessageRequestLimitExceeded, MessageRequestActionNotAllowed) as exc:
            return _message_request_send_error_response(exc)

        event = {
            "type": "messaging_message",
            "conversation_id": convo.id,
            "message_id": result.message.id,
            "sender_id": request.user.id,
            "created_at": result.message.created_at.isoformat(),
        }
        unread_by_user = unread_payload_for_recipients(
            conversation_id=convo.id, recipient_user_ids=result.recipient_user_ids
        )
        for participant_id in result.recipient_user_ids:
            notification_dispatch.notify_user(
                participant_id,
                {**event, **unread_by_user[participant_id]},
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
            unread_by_user = unread_payload_for_recipients(
                conversation_id=convo.id, recipient_user_ids=result.participant_user_ids
            )
            for participant_id in result.participant_user_ids:
                notification_dispatch.notify_user(
                    participant_id,
                    {**event, **unread_by_user[participant_id]},
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
                notification_dispatch.notify_user(participant_id, event)

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
            # Rovnaká 404 odpoveď ako pri neexistujúcom používateľovi, aby sa cez
            # tento endpoint nedala zistiť existencia (private/staff) účtu.
            raise NotFound()

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
        except (MessageRequestLimitExceeded, MessageRequestActionNotAllowed) as exc:
            return _message_request_send_error_response(exc)

        event = {
            "type": "messaging_message",
            "conversation_id": result.conversation.id,
            "message_id": result.message.id,
            "sender_id": request.user.id,
            "created_at": result.message.created_at.isoformat(),
        }
        unread_by_user = unread_payload_for_recipients(
            conversation_id=result.conversation.id,
            recipient_user_ids=result.recipient_user_ids,
        )
        for participant_id in result.recipient_user_ids:
            notification_dispatch.notify_user(
                participant_id,
                {**event, **unread_by_user[participant_id]},
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
