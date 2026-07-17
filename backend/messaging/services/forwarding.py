from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.db import transaction

from accounts.services.user_blocks import BlockedUserInteractionError

from ..models import Message
from .conversations import (
    SelfConversationNotAllowed,
    find_direct_conversation,
    send_direct_message,
)
from .message_requests import MessageRequestActionNotAllowed, MessageRequestLimitExceeded

User = get_user_model()

MAX_FORWARD_RECIPIENTS = 20


class MessageForwardError(Exception):
    pass


class MessageForwardSourceUnavailable(MessageForwardError):
    pass


@dataclass(frozen=True)
class ForwardedMessageDelivery:
    user_id: int
    conversation_id: int
    message: Message
    recipient_user_ids: tuple[int, ...]


@dataclass(frozen=True)
class FailedForwardRecipient:
    user_id: int
    code: str


@dataclass(frozen=True)
class MessageForwardResult:
    sent: tuple[ForwardedMessageDelivery, ...]
    failed: tuple[FailedForwardRecipient, ...]


def normalize_forward_recipient_ids(values) -> list[int]:
    seen: set[int] = set()
    result: list[int] = []
    for value in values:
        try:
            user_id = int(value)
        except (TypeError, ValueError):
            continue
        if user_id <= 0 or user_id in seen:
            continue
        seen.add(user_id)
        result.append(user_id)
    return result


@dataclass(frozen=True)
class ForwardImagePayload:
    data: bytes
    suffix: str


def _read_image_payload(source: Message) -> ForwardImagePayload | None:
    if not source.image:
        return None

    try:
        source.image.open("rb")
        data = source.image.read()
    except Exception as exc:
        raise MessageForwardSourceUnavailable("Source image is unavailable.") from exc
    finally:
        source.image.close()

    return ForwardImagePayload(
        data=data,
        suffix=Path(source.image.name or "").suffix.lower() or ".jpg",
    )


def _clone_image_file(payload: ForwardImagePayload | None) -> ContentFile | None:
    if payload is None:
        return None
    clone = ContentFile(payload.data)
    clone.name = f"forwarded{payload.suffix}"
    return clone


def _can_forward_to_target(*, actor, target) -> bool:
    if target.id == actor.id or target.is_staff or target.is_superuser:
        return False
    if target.is_public:
        return True
    try:
        return find_direct_conversation(
            actor=actor,
            target=target,
            require_started=True,
        ) is not None
    except SelfConversationNotAllowed:
        return False


def _forward_to_user(
    *,
    actor,
    source: Message,
    target,
    image_payload: ForwardImagePayload | None,
) -> ForwardedMessageDelivery:
    image = _clone_image_file(image_payload)
    result = send_direct_message(
        actor=actor,
        target=target,
        text=source.text or None,
        image=image,
    )
    return ForwardedMessageDelivery(
        user_id=int(target.id),
        conversation_id=int(result.conversation.id),
        message=result.message,
        recipient_user_ids=result.recipient_user_ids,
    )


def forward_message_to_recipients(
    *,
    actor,
    source_message: Message,
    recipient_user_ids: list[int],
) -> MessageForwardResult:
    if source_message.is_deleted or source_message.message_type != Message.Type.USER:
        raise MessageForwardSourceUnavailable("Message cannot be forwarded.")
    if not (source_message.text or source_message.image):
        raise MessageForwardSourceUnavailable("Message cannot be forwarded.")

    normalized_ids = normalize_forward_recipient_ids(recipient_user_ids)[:MAX_FORWARD_RECIPIENTS]
    image_payload = _read_image_payload(source_message)
    targets_by_id = {
        user.id: user
        for user in User.objects.filter(id__in=normalized_ids, is_active=True).only(
            "id",
            "is_active",
            "is_public",
            "is_staff",
            "is_superuser",
        )
    }

    sent: list[ForwardedMessageDelivery] = []
    failed: list[FailedForwardRecipient] = []

    for user_id in normalized_ids:
        target = targets_by_id.get(user_id)
        if target is None or not _can_forward_to_target(actor=actor, target=target):
            failed.append(FailedForwardRecipient(user_id=user_id, code="recipient_unavailable"))
            continue

        try:
            with transaction.atomic():
                sent.append(
                    _forward_to_user(
                        actor=actor,
                        source=source_message,
                        target=target,
                        image_payload=image_payload,
                    )
                )
        except (SelfConversationNotAllowed, BlockedUserInteractionError):
            failed.append(FailedForwardRecipient(user_id=user_id, code="recipient_unavailable"))
        except MessageRequestLimitExceeded:
            failed.append(FailedForwardRecipient(user_id=user_id, code="message_request_pending"))
        except MessageRequestActionNotAllowed:
            failed.append(FailedForwardRecipient(user_id=user_id, code="recipient_unavailable"))
        except MessageForwardSourceUnavailable:
            raise

    return MessageForwardResult(sent=tuple(sent), failed=tuple(failed))
