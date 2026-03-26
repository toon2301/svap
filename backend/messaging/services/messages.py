from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction
from django.utils import timezone

from ..models import Conversation, ConversationParticipant, Message


class MessageServiceError(Exception):
    pass


class NotParticipant(MessageServiceError):
    pass


@dataclass(frozen=True)
class SendMessageResult:
    message: Message


def _ensure_participant(*, conversation: Conversation, user_id: int) -> ConversationParticipant:
    participant = (
        ConversationParticipant.objects.select_for_update()
        .filter(conversation=conversation, user_id=user_id)
        .first()
    )
    if not participant:
        raise NotParticipant("User is not a participant of this conversation.")
    return participant


def send_message(*, conversation: Conversation, sender, text: str) -> SendMessageResult:
    """
    Send a message in a conversation.

    - Requires sender to be a participant.
    - Updates conversation.last_message_at.
    """
    clean = (text or "").strip()
    if not clean:
        raise ValueError("Message text cannot be empty.")

    now = timezone.now()
    with transaction.atomic():
        convo = (
            Conversation.objects.select_for_update()
            .filter(id=conversation.id)
            .first()
        )
        if not convo:
            raise ValueError("Conversation not found.")

        _ensure_participant(conversation=convo, user_id=sender.id)

        msg = Message.objects.create(
            conversation=convo,
            sender=sender,
            text=clean,
            created_at=now,
        )
        convo.last_message_at = now
        convo.save(update_fields=["last_message_at", "updated_at"])
        return SendMessageResult(message=msg)


def mark_conversation_read(*, conversation: Conversation, user) -> ConversationParticipant:
    """
    Mark a conversation as read for the given user by updating last_read_at.
    """
    now = timezone.now()
    with transaction.atomic():
        participant = _ensure_participant(conversation=conversation, user_id=user.id)
        participant.last_read_at = now
        participant.save(update_fields=["last_read_at"])
        return participant

