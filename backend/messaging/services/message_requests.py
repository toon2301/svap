from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from ..models import Conversation, Message

PENDING_REQUEST_MESSAGE_LIMIT = 2


class MessageRequestError(Exception):
    pass


class MessageRequestLimitExceeded(MessageRequestError):
    pass


class MessageRequestActionNotAllowed(MessageRequestError):
    pass


@dataclass(frozen=True)
class MessageRequestMutationResult:
    conversation: Conversation
    total_unseen_count: int


def is_pending_message_request(conversation: Conversation) -> bool:
    return (
        not conversation.is_group
        and conversation.request_status == Conversation.RequestStatus.PENDING
    )


def prepare_pending_request_for_message(
    *,
    conversation: Conversation,
    sender_id: int,
    now=None,
) -> None:
    if not is_pending_message_request(conversation):
        return

    if conversation.requested_to_id == sender_id:
        accepted_at = now or timezone.now()
        conversation.request_status = Conversation.RequestStatus.ACCEPTED
        conversation.accepted_at = accepted_at
        conversation.request_seen_at = accepted_at
        conversation.save(
            update_fields=[
                "request_status",
                "accepted_at",
                "request_seen_at",
                "updated_at",
            ]
        )
        return

    if conversation.requested_by_id != sender_id:
        raise MessageRequestActionNotAllowed("Message request sender is invalid.")

    sent_count = Message.objects.filter(
        conversation=conversation,
        sender_id=sender_id,
        is_deleted=False,
    ).count()
    if sent_count >= PENDING_REQUEST_MESSAGE_LIMIT:
        raise MessageRequestLimitExceeded("Message request limit reached.")


def accept_message_request(
    *, conversation: Conversation, user
) -> MessageRequestMutationResult:
    requested_by_id = conversation.requested_by_id
    requested_to_id = conversation.requested_to_id
    if not requested_by_id or not requested_to_id:
        raise MessageRequestActionNotAllowed("Message request cannot be accepted.")

    with transaction.atomic():
        from accounts.services.user_blocks import (
            lock_users_and_ensure_interaction_allowed,
        )

        # Let BlockedUserInteractionError propagate so the view can answer with
        # the neutral `recipient_unavailable` code (mapped on the client to
        # "you can't message this user"), instead of a bare 404 that surfaced as
        # a raw status. Other invalid-accept cases still raise
        # MessageRequestActionNotAllowed below.
        lock_users_and_ensure_interaction_allowed(
            first_user_id=requested_by_id,
            second_user_id=requested_to_id,
        )

        convo = (
            Conversation.objects.select_for_update().filter(id=conversation.id).first()
        )
        if (
            convo is None
            or convo.is_group
            or convo.request_status != Conversation.RequestStatus.PENDING
            or convo.requested_to_id != user.id
        ):
            raise MessageRequestActionNotAllowed("Message request cannot be accepted.")

        now = timezone.now()
        convo.request_status = Conversation.RequestStatus.ACCEPTED
        convo.accepted_at = now
        convo.request_seen_at = now
        convo.save(
            update_fields=[
                "request_status",
                "accepted_at",
                "request_seen_at",
                "updated_at",
            ]
        )

    return MessageRequestMutationResult(
        conversation=convo,
        total_unseen_count=count_unseen_message_requests_for_user(user=user),
    )


def delete_message_request(
    *, conversation: Conversation, user
) -> MessageRequestMutationResult:
    with transaction.atomic():
        convo = (
            Conversation.objects.select_for_update().filter(id=conversation.id).first()
        )
        if (
            convo is None
            or convo.is_group
            or convo.request_status != Conversation.RequestStatus.PENDING
            or convo.requested_to_id != user.id
        ):
            raise MessageRequestActionNotAllowed("Message request cannot be deleted.")

        now = timezone.now()
        convo.request_status = Conversation.RequestStatus.DELETED
        convo.request_seen_at = now
        convo.save(update_fields=["request_status", "request_seen_at", "updated_at"])

    return MessageRequestMutationResult(
        conversation=convo,
        total_unseen_count=count_unseen_message_requests_for_user(user=user),
    )


def count_unseen_message_requests_for_user(*, user) -> int:
    return int(
        Conversation.objects.filter(
            is_group=False,
            requested_to=user,
            request_status=Conversation.RequestStatus.PENDING,
            last_message_at__isnull=False,
        )
        .filter(
            Q(request_seen_at__isnull=True)
            | Q(last_message_at__gt=F("request_seen_at"))
        )
        .count()
    )


def mark_message_requests_seen_for_user(*, user) -> int:
    now = timezone.now()
    return int(
        Conversation.objects.filter(
            is_group=False,
            requested_to=user,
            request_status=Conversation.RequestStatus.PENDING,
            last_message_at__isnull=False,
        )
        .filter(
            Q(request_seen_at__isnull=True)
            | Q(last_message_at__gt=F("request_seen_at"))
        )
        .update(request_seen_at=now)
    )
