from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from ..models import Conversation, ConversationParticipant

User = get_user_model()


class ConversationServiceError(Exception):
    pass


class SelfConversationNotAllowed(ConversationServiceError):
    pass


@dataclass(frozen=True)
class OpenConversationResult:
    conversation: Conversation
    created: bool


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

        pair_ids = (
            ConversationParticipant.objects.filter(user_id__in=[actor.id, target.id])
            .values("conversation_id")
            .annotate(users_count=Count("user_id", distinct=True))
            .filter(users_count=2)
            .values_list("conversation_id", flat=True)
        )
        existing = (
            Conversation.objects.filter(id__in=pair_ids)
            .annotate(pcount=Count("participants", distinct=True))
            .filter(pcount=2)
            .order_by("-last_message_at", "-updated_at", "-id")
            .first()
        )
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

