from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from ..models import Conversation, ConversationParticipant, Message
from .image_thumbnails import attach_message_thumbnail
from .message_requests import prepare_pending_request_for_message
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


def _direct_conversation_queryset_for_pair(
    *, user_a_id: int, user_b_id: int, include_deleted: bool = False
):
    pair_ids = (
        ConversationParticipant.objects.filter(user_id__in=[user_a_id, user_b_id])
        .values("conversation_id")
        .annotate(users_count=Count("user_id", distinct=True))
        .filter(users_count=2)
        .values_list("conversation_id", flat=True)
    )
    qs = (
        Conversation.objects.filter(id__in=pair_ids, is_group=False)
        .annotate(pcount=Count("participants", distinct=True))
        .filter(pcount=2)
    )
    if not include_deleted:
        qs = qs.exclude(request_status=Conversation.RequestStatus.DELETED)
    return qs


def find_direct_conversation(
    *,
    actor: User,
    target: User,
    require_started: bool = False,
    include_deleted: bool = False,
) -> Conversation | None:
    if actor.id == target.id:
        raise SelfConversationNotAllowed("Cannot open a conversation with self.")

    qs = _direct_conversation_queryset_for_pair(
        user_a_id=actor.id,
        user_b_id=target.id,
        include_deleted=include_deleted,
    )
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
            if existing.request_status == Conversation.RequestStatus.PENDING:
                existing.request_status = Conversation.RequestStatus.ACCEPTED
                existing.accepted_at = timezone.now()
                existing.save(update_fields=["request_status", "accepted_at", "updated_at"])
            return OpenConversationResult(conversation=existing, created=False)

        convo = Conversation.objects.create(
            created_by=actor,
            request_status=Conversation.RequestStatus.ACCEPTED,
            accepted_at=timezone.now(),
        )
        now = timezone.now()
        ConversationParticipant.objects.bulk_create(
            [
                ConversationParticipant(conversation=convo, user=actor, joined_at=now),
                ConversationParticipant(conversation=convo, user=target, joined_at=now),
            ]
        )
        return OpenConversationResult(conversation=convo, created=True)


def send_direct_message(
    *,
    actor: User,
    target: User,
    text: str | None = None,
    image=None,
) -> StartDirectMessageResult:
    clean = (text or "").strip()
    if not clean and not image:
        raise ValueError("Message must contain text or an image.")
    if actor.id == target.id:
        raise SelfConversationNotAllowed("Cannot open a conversation with self.")

    now = timezone.now()
    with transaction.atomic():
        _lock_users_for_direct_conversation(user_a_id=actor.id, user_b_id=target.id)

        convo = find_direct_conversation(actor=actor, target=target, require_started=False)
        created_conversation = False

        if convo is None:
            convo = Conversation.objects.create(
                created_by=actor,
                request_status=Conversation.RequestStatus.PENDING,
                requested_by=actor,
                requested_to=target,
            )
            ConversationParticipant.objects.bulk_create(
                [
                    ConversationParticipant(conversation=convo, user=actor, joined_at=now),
                    ConversationParticipant(conversation=convo, user=target, joined_at=now),
                ]
            )
            created_conversation = True

        prepare_pending_request_for_message(
            conversation=convo,
            sender_id=actor.id,
            now=now,
        )

        msg = Message.objects.create(
            conversation=convo,
            sender=actor,
            text=clean,
            image=image,
            created_at=now,
        )
        attach_message_thumbnail(msg)
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

