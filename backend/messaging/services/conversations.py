from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from ..models import Conversation, ConversationParticipant, Message
from .push_enqueue import schedule_message_push_delivery

User = get_user_model()


class ConversationServiceError(Exception):
    pass


class SelfConversationNotAllowed(ConversationServiceError):
    pass


@dataclass(frozen=True)
class OpenConversationResult:
    conversation: Conversation
    created: bool


@dataclass(frozen=True)
class StartDirectMessageResult:
    conversation: Conversation
    created_conversation: bool
    message: Message
    recipient_user_ids: tuple[int, ...]


def _lock_users_for_direct_conversation(*, user_a_id: int, user_b_id: int) -> None:
    """
    Transaction-scoped lock to prevent duplicate 1:1 conversations under race.

    We lock user rows in a stable order to avoid deadlocks.
    """
    low, high = sorted([int(user_a_id), int(user_b_id)])
    list(
        User.objects.select_for_update()
        .filter(id__in=[low, high])
        .order_by("id")
        .values_list("id", flat=True)
    )


def _direct_conversation_queryset_for_pair(*, user_a_id: int, user_b_id: int):
    pair_ids = (
        ConversationParticipant.objects.filter(user_id__in=[user_a_id, user_b_id])
        .values("conversation_id")
        .annotate(users_count=Count("user_id", distinct=True))
        .filter(users_count=2)
        .values_list("conversation_id", flat=True)
    )
    return (
        Conversation.objects.filter(id__in=pair_ids)
        .annotate(pcount=Count("participants", distinct=True))
        .filter(pcount=2)
    )


def find_direct_conversation(*, actor: User, target: User, require_started: bool = False) -> Conversation | None:
    if actor.id == target.id:
        raise SelfConversationNotAllowed("Cannot open a conversation with self.")

    qs = _direct_conversation_queryset_for_pair(user_a_id=actor.id, user_b_id=target.id)
    if require_started:
        qs = qs.filter(last_message_at__isnull=False)
    return qs.order_by("-last_message_at", "-updated_at", "-id").first()


def open_or_create_direct_conversation(*, actor: User, target: User) -> OpenConversationResult:
    """
    Open or create a 1:1 conversation between actor and target.

    - Ensures at most 1 conversation exists for the pair by using row locks.
    - Creates Conversation + 2 participants if missing.
    """
    if actor.id == target.id:
        raise SelfConversationNotAllowed("Cannot open a conversation with self.")

    with transaction.atomic():
        _lock_users_for_direct_conversation(user_a_id=actor.id, user_b_id=target.id)
        existing = find_direct_conversation(actor=actor, target=target, require_started=False)
        if existing:
            return OpenConversationResult(conversation=existing, created=False)

        convo = Conversation.objects.create(created_by=actor)
        now = timezone.now()
        ConversationParticipant.objects.bulk_create(
            [
                ConversationParticipant(conversation=convo, user=actor, joined_at=now),
                ConversationParticipant(conversation=convo, user=target, joined_at=now),
            ]
        )
        return OpenConversationResult(conversation=convo, created=True)


def send_direct_message(*, actor: User, target: User, text: str) -> StartDirectMessageResult:
    clean = (text or "").strip()
    if not clean:
        raise ValueError("Message text cannot be empty.")
    if actor.id == target.id:
        raise SelfConversationNotAllowed("Cannot open a conversation with self.")

    now = timezone.now()
    with transaction.atomic():
        _lock_users_for_direct_conversation(user_a_id=actor.id, user_b_id=target.id)

        convo = find_direct_conversation(actor=actor, target=target, require_started=False)
        created_conversation = False

        if convo is None:
            convo = Conversation.objects.create(created_by=actor)
            ConversationParticipant.objects.bulk_create(
                [
                    ConversationParticipant(conversation=convo, user=actor, joined_at=now),
                    ConversationParticipant(conversation=convo, user=target, joined_at=now),
                ]
            )
            created_conversation = True

        msg = Message.objects.create(
            conversation=convo,
            sender=actor,
            text=clean,
            created_at=now,
        )
        convo.last_message_at = now
        convo.save(update_fields=["last_message_at", "updated_at"])
        recipient_user_ids = (int(target.id),)
        schedule_message_push_delivery(
            message_id=msg.id,
            recipient_user_ids=recipient_user_ids,
        )

        return StartDirectMessageResult(
            conversation=convo,
            created_conversation=created_conversation,
            message=msg,
            recipient_user_ids=recipient_user_ids,
        )

