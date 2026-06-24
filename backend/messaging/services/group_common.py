"""Spoločné typy, výnimky a helpery skupinových konverzácií.

Zdieľané medzi groups.py (životný cyklus) a group_invitations.py (pozvánky),
aby sa predišlo cirkulárnemu importu.
"""
from __future__ import annotations

from dataclasses import dataclass

from django.utils import timezone

from ..models import Conversation, ConversationParticipant, GroupInvitation, Message


MAX_GROUP_PARTICIPANTS = 50


class GroupServiceError(Exception):
    pass


class ConversationNotGroup(GroupServiceError):
    pass


class GroupNameRequired(GroupServiceError):
    pass


class GroupLimitExceeded(GroupServiceError):
    pass


class NotGroupOwner(GroupServiceError):
    pass


class NotActiveGroupMember(GroupServiceError):
    pass


class InvitationNotPending(GroupServiceError):
    pass


class CannotInviteSelf(GroupServiceError):
    pass


@dataclass(frozen=True)
class GroupMutationResult:
    conversation: Conversation
    participant_user_ids: tuple[int, ...]
    changed: bool = True


@dataclass(frozen=True)
class GroupInvitationResult:
    invitation: GroupInvitation
    message: Message | None
    participant_user_ids: tuple[int, ...]
    created: bool = True


def _active_or_invited_count(*, conversation: Conversation) -> int:
    return ConversationParticipant.objects.filter(
        conversation=conversation,
        status__in=[
            ConversationParticipant.Status.ACTIVE,
            ConversationParticipant.Status.INVITED,
        ],
    ).count()


def _active_participant_user_ids(*, conversation: Conversation) -> tuple[int, ...]:
    return tuple(
        ConversationParticipant.objects.filter(
            conversation=conversation,
            status=ConversationParticipant.Status.ACTIVE,
        ).values_list("user_id", flat=True)
    )


def _ensure_group(conversation: Conversation) -> None:
    if not conversation.is_group:
        raise ConversationNotGroup("Conversation is not a group.")


def ensure_active_group_member(*, conversation: Conversation, user_id: int) -> ConversationParticipant:
    _ensure_group(conversation)
    participant = (
        ConversationParticipant.objects.select_for_update()
        .filter(
            conversation=conversation,
            user_id=user_id,
            status=ConversationParticipant.Status.ACTIVE,
        )
        .first()
    )
    if participant is None:
        raise NotActiveGroupMember("User is not an active group member.")
    return participant


def ensure_group_owner(*, conversation: Conversation, user_id: int) -> ConversationParticipant:
    participant = ensure_active_group_member(conversation=conversation, user_id=user_id)
    if participant.role != ConversationParticipant.Role.OWNER:
        raise NotGroupOwner("Only the group owner can perform this action.")
    return participant


def _create_system_message(*, conversation: Conversation, actor, text: str, metadata=None) -> Message:
    now = timezone.now()
    message = Message.objects.create(
        conversation=conversation,
        sender=actor,
        text=text,
        message_type=Message.Type.SYSTEM,
        metadata=metadata or {},
        created_at=now,
    )
    conversation.last_message_at = now
    conversation.save(update_fields=["last_message_at", "updated_at"])
    return message
