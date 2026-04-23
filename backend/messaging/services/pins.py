from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction

from ..models import Conversation, ConversationParticipant, Message
from .messages import MessageNotFound, NotParticipant, _ensure_participant


class InvalidPinnedMessage(Exception):
    pass


@dataclass(frozen=True)
class SetPinnedMessageResult:
    conversation: Conversation
    pinned_message: Message | None
    participant_user_ids: tuple[int, ...]
    changed: bool


def set_conversation_pinned_message(
    *,
    conversation: Conversation,
    actor,
    message_id: int | None,
) -> SetPinnedMessageResult:
    with transaction.atomic():
        convo = (
            Conversation.objects.select_for_update()
            .filter(id=conversation.id)
            .first()
        )
        if not convo:
            raise ValueError("Conversation not found.")

        _ensure_participant(conversation=convo, user_id=actor.id)

        pinned_message = None
        if message_id is not None:
            pinned_message = (
                Message.objects.select_for_update()
                .select_related("sender")
                .filter(conversation_id=convo.id, id=message_id)
                .first()
            )
            if not pinned_message:
                raise MessageNotFound("Message not found.")
            if pinned_message.is_deleted:
                raise InvalidPinnedMessage("Deleted messages cannot be pinned.")

        next_pinned_message_id = pinned_message.id if pinned_message else None
        changed = convo.pinned_message_id != next_pinned_message_id

        if changed:
            Conversation.objects.filter(id=convo.id).update(
                pinned_message_id=next_pinned_message_id
            )
            convo.pinned_message_id = next_pinned_message_id

        participant_user_ids = tuple(
            ConversationParticipant.objects.filter(conversation_id=convo.id).values_list(
                "user_id",
                flat=True,
            )
        )

        return SetPinnedMessageResult(
            conversation=convo,
            pinned_message=pinned_message,
            participant_user_ids=participant_user_ids,
            changed=changed,
        )
