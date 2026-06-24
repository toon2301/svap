from __future__ import annotations

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from swaply.rate_limiting import api_rate_limit
from ..models import ConversationParticipant, GroupInvitation
from ..services.groups import (
    CannotInviteSelf,
    ConversationNotGroup,
    GroupLimitExceeded,
    GroupNameRequired,
    InvitationNotPending,
    NotActiveGroupMember,
    NotGroupOwner,
    create_group_conversation,
    delete_group,
    invite_user_to_group,
    leave_group,
    remove_group_member,
    respond_to_group_invitation,
    update_group_conversation,
)
from . import notification_dispatch
from .serializers import (
    GroupConversationCreateSerializer,
    GroupConversationUpdateSerializer,
    GroupInviteSerializer,
    MessageSerializer,
)
from .view_helpers import (
    _conversation_for_user_or_404,
    _conversation_unread_messages_count_for_user,
    _serialize_conversation_for_user,
    _total_unread_messages_count_for_user_id,
)

User = get_user_model()


def _group_error_response(exc: Exception):
    if isinstance(exc, GroupNameRequired):
        return Response({"error": "Názov skupiny je povinný."}, status=status.HTTP_400_BAD_REQUEST)
    if isinstance(exc, GroupLimitExceeded):
        return Response(
            {"error": "Skupina môže mať maximálne 50 účastníkov."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if isinstance(exc, CannotInviteSelf):
        return Response(
            {"error": "Nemôžete pozvať samého seba."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if isinstance(exc, InvitationNotPending):
        return Response(
            {"error": "Pozvánka už nie je čakajúca."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if isinstance(exc, NotGroupOwner):
        return Response({"error": "Nemáte oprávnenie."}, status=status.HTTP_403_FORBIDDEN)
    if isinstance(exc, (ConversationNotGroup, NotActiveGroupMember)):
        return Response({"error": "Nemáte prístup."}, status=status.HTTP_403_FORBIDDEN)
    return Response({"error": str(exc) or "Neplatná akcia."}, status=status.HTTP_400_BAD_REQUEST)


class GroupConversationCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(api_rate_limit)
    def post(self, request):
        serializer = GroupConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = create_group_conversation(
                actor=request.user,
                name=serializer.validated_data["name"],
                invited_user_ids=serializer.validated_data.get("invited_user_ids") or [],
            )
        except Exception as exc:
            return _group_error_response(exc)

        data = _serialize_conversation_for_user(
            request=request,
            conversation_id=result.conversation.id,
        )
        notify_ids = ConversationParticipant.objects.filter(
            conversation_id=result.conversation.id,
            status__in=[
                ConversationParticipant.Status.ACTIVE,
                ConversationParticipant.Status.INVITED,
            ],
        ).values_list("user_id", flat=True)
        for participant_id in notify_ids:
            if participant_id != request.user.id:
                notification_dispatch.notify_user(
                    int(participant_id),
                    {
                        "type": "messaging_group_updated",
                        "conversation_id": result.conversation.id,
                    },
                )
        return Response(data, status=status.HTTP_201_CREATED)


class GroupConversationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(api_rate_limit)
    def patch(self, request, conversation_id: int):
        convo = _conversation_for_user_or_404(conversation_id=conversation_id, user=request.user)
        serializer = GroupConversationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = update_group_conversation(
                conversation=convo,
                actor=request.user,
                name=serializer.validated_data.get("name"),
            )
        except Exception as exc:
            return _group_error_response(exc)

        if result.changed:
            event = {
                "type": "messaging_group_updated",
                "conversation_id": result.conversation.id,
            }
            for participant_id in result.participant_user_ids:
                notification_dispatch.notify_user(participant_id, event)

        data = _serialize_conversation_for_user(request=request, conversation_id=conversation_id)
        return Response(data, status=status.HTTP_200_OK)

    @method_decorator(api_rate_limit)
    def delete(self, request, conversation_id: int):
        convo = _conversation_for_user_or_404(conversation_id=conversation_id, user=request.user)
        try:
            result = delete_group(conversation=convo, actor=request.user)
        except Exception as exc:
            return _group_error_response(exc)

        event = {
            "type": "messaging_group_deleted",
            "conversation_id": conversation_id,
        }
        for participant_id in result.participant_user_ids:
            notification_dispatch.notify_user(participant_id, event)
        return Response(status=status.HTTP_204_NO_CONTENT)


class GroupInviteView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(api_rate_limit)
    def post(self, request, conversation_id: int):
        convo = _conversation_for_user_or_404(conversation_id=conversation_id, user=request.user)
        serializer = GroupInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target = get_object_or_404(
            User,
            id=serializer.validated_data["user_id"],
            is_active=True,
            is_public=True,
            is_staff=False,
            is_superuser=False,
        )

        try:
            result = invite_user_to_group(
                conversation=convo,
                actor=request.user,
                invited_user=target,
            )
        except Exception as exc:
            return _group_error_response(exc)

        event = {
            "type": "messaging_message",
            "conversation_id": convo.id,
            "message_id": result.message.id if result.message is not None else None,
            "sender_id": request.user.id,
            "created_at": result.message.created_at.isoformat() if result.message else "",
        }
        for participant_id in result.participant_user_ids:
            notification_dispatch.notify_user(
                participant_id,
                {
                    **event,
                    "total_unread_count": _total_unread_messages_count_for_user_id(participant_id),
                    "conversation_unread_count": _conversation_unread_messages_count_for_user(
                        conversation_id=convo.id,
                        user_id=participant_id,
                    ),
                },
            )

        return Response(
            MessageSerializer(result.message, context={"request": request}).data
            if result.message is not None
            else {},
            status=status.HTTP_201_CREATED if result.created else status.HTTP_200_OK,
        )


class GroupInvitationResponseView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(api_rate_limit)
    def post(self, request, invitation_id: int, action: str):
        invitation = get_object_or_404(GroupInvitation, id=invitation_id)
        if action not in {"accept", "decline"}:
            return Response({"error": "Neplatná akcia."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = respond_to_group_invitation(
                invitation=invitation,
                actor=request.user,
                accept=action == "accept",
            )
        except Exception as exc:
            return _group_error_response(exc)

        event = {
            "type": "messaging_group_invitation_updated",
            "conversation_id": result.conversation.id,
            "invitation_id": invitation_id,
            "accepted": action == "accept",
        }
        for participant_id in result.participant_user_ids:
            notification_dispatch.notify_user(participant_id, event)
        return Response(
            _serialize_conversation_for_user(
                request=request,
                conversation_id=result.conversation.id,
            ),
            status=status.HTTP_200_OK,
        )


class GroupMemberDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(api_rate_limit)
    def delete(self, request, conversation_id: int, user_id: int):
        convo = _conversation_for_user_or_404(conversation_id=conversation_id, user=request.user)
        try:
            result = remove_group_member(
                conversation=convo,
                actor=request.user,
                user_id=user_id,
            )
        except Exception as exc:
            return _group_error_response(exc)

        event = {
            "type": "messaging_group_members_updated",
            "conversation_id": conversation_id,
        }
        for participant_id in result.participant_user_ids + (user_id,):
            notification_dispatch.notify_user(participant_id, event)
        return Response(status=status.HTTP_204_NO_CONTENT)


class GroupLeaveView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(api_rate_limit)
    def post(self, request, conversation_id: int):
        convo = _conversation_for_user_or_404(conversation_id=conversation_id, user=request.user)
        try:
            result = leave_group(conversation=convo, actor=request.user)
        except Exception as exc:
            return _group_error_response(exc)

        event = {
            "type": "messaging_group_members_updated",
            "conversation_id": conversation_id,
        }
        for participant_id in result.participant_user_ids + (request.user.id,):
            notification_dispatch.notify_user(participant_id, event)
        return Response(status=status.HTTP_200_OK)
