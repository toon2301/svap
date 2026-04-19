from __future__ import annotations

from dataclasses import dataclass

from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone

from ..models import Conversation, ConversationParticipant, Message
from .push_enqueue import schedule_message_push_delivery


class MessageServiceError(Exception):
    pass


class NotParticipant(MessageServiceError):
    pass


class MessageNotFound(MessageServiceError):
    pass


class NotMessageAuthor(MessageServiceError):
    pass


@dataclass(frozen=True)
class SendMessageResult:
    message: Message
    recipient_user_ids: tuple[int, ...]


@dataclass(frozen=True)
class DeleteMessageResult:
    message: Message
    participant_user_ids: tuple[int, ...]
    changed: bool


@dataclass(frozen=True)
class HideConversationResult:
    participant: ConversationParticipant
    changed: bool


def _ensure_participant(*, conversation: Conversation, user_id: int) -> ConversationParticipant:
    participant = (
        ConversationParticipant.objects.select_for_update()
        .filter(conversation=conversation, user_id=user_id)
        .first()
    )
    if not participant:
        raise NotParticipant("User is not a participant of this conversation.")
    return participant


def send_message(
    *,
    conversation: Conversation,
    sender,
    text: str | None = None,
    image=None,
) -> SendMessageResult:
    """
    Send a message in a conversation.

    - Requires sender to be a participant.
    - Updates conversation.last_message_at.
    """
    clean = (text or "").strip()
    if not clean and not image:
        raise ValueError("Message must contain text or an image.")

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
            image=image,
            created_at=now,
        )
        recipient_user_ids = tuple(
            ConversationParticipant.objects.filter(conversation=convo)
            .exclude(user_id=sender.id)
            .values_list("user_id", flat=True)
        )
        convo.last_message_at = now
        convo.save(update_fields=["last_message_at", "updated_at"])
        schedule_message_push_delivery(
            message_id=msg.id,
            recipient_user_ids=recipient_user_ids,
        )
        return SendMessageResult(
            message=msg,
            recipient_user_ids=recipient_user_ids,
        )


def mark_conversation_read(*, conversation: Conversation, user) -> ConversationParticipant:
    """
    Mark a conversation as read for the given user by updating last_read_at.
    """
    now = timezone.now()
    participant = (
        ConversationParticipant.objects.only("id", "conversation_id", "user_id", "last_read_at")
        .filter(conversation_id=conversation.id, user_id=user.id)
        .first()
    )
    if not participant:
        raise NotParticipant("User is not a participant of this conversation.")

    updated = ConversationParticipant.objects.filter(id=participant.id).update(
        last_read_at=now
    )
    if not updated:
        raise NotParticipant("User is not a participant of this conversation.")

    participant.last_read_at = now
    return participant


def delete_message_for_all(
    *,
    conversation: Conversation,
    message_id: int,
    actor,
) -> DeleteMessageResult:
    """
    Soft-delete a message for every conversation participant.

    The message row stays in the database and is exposed to clients as
    `is_deleted=true` with `text=null`.
    """
    with transaction.atomic():
        convo = (
            Conversation.objects.select_for_update()
            .filter(id=conversation.id)
            .first()
        )
        if not convo:
            raise ValueError("Conversation not found.")

        _ensure_participant(conversation=convo, user_id=actor.id)

        message = (
            Message.objects.select_for_update()
            .select_related("sender")
            .filter(conversation_id=convo.id, id=message_id)
            .first()
        )
        if not message:
            raise MessageNotFound("Message not found.")

        if message.sender_id != actor.id:
            raise NotMessageAuthor("Only the author can delete this message.")

        participant_user_ids = tuple(
            ConversationParticipant.objects.filter(conversation_id=convo.id).values_list(
                "user_id",
                flat=True,
            )
        )

        if message.is_deleted:
            return DeleteMessageResult(
                message=message,
                participant_user_ids=participant_user_ids,
                changed=False,
            )

        image_name = getattr(message.image, "name", "") or ""

        Message.objects.filter(id=message.id, is_deleted=False).update(
            is_deleted=True,
            text="",
            image="",
        )
        message.is_deleted = True
        message.text = ""
        if image_name:
            message.image.name = ""
            transaction.on_commit(lambda: default_storage.delete(image_name))

        return DeleteMessageResult(
            message=message,
            participant_user_ids=participant_user_ids,
            changed=True,
        )


def hide_conversation_for_user(
    *,
    conversation: Conversation,
    user,
) -> HideConversationResult:
    """
    Hide a conversation only for the current participant.

    Hidden conversations disappear from the caller's list until a newer message
    arrives. Existing history remains in the database.
    """
    now = timezone.now()

    with transaction.atomic():
        convo = (
            Conversation.objects.select_for_update()
            .filter(id=conversation.id)
            .first()
        )
        if not convo:
            raise ValueError("Conversation not found.")

        participant = _ensure_participant(conversation=convo, user_id=user.id)

        already_hidden = (
            participant.hidden_at is not None
            and convo.last_message_at is not None
            and participant.hidden_at >= convo.last_message_at
        )
        if already_hidden:
            return HideConversationResult(participant=participant, changed=False)

        ConversationParticipant.objects.filter(id=participant.id).update(
            hidden_at=now,
            last_read_at=now,
        )
        participant.hidden_at = now
        participant.last_read_at = now

        return HideConversationResult(participant=participant, changed=True)

