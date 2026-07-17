from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth import get_user_model

from accounts.services.user_blocks import BlockedUserInteractionError

from ..models import Message
from .conversations import (
    SelfConversationNotAllowed,
    find_direct_conversation,
    send_direct_message,
)
from .message_requests import (
    MessageRequestActionNotAllowed,
    MessageRequestLimitExceeded,
)

User = get_user_model()

MAX_PROFILE_SHARE_RECIPIENTS = 20
PROFILE_SHARE_METADATA_USER_ID = "shared_user_id"


@dataclass(frozen=True)
class ProfileShareDelivery:
    user_id: int
    conversation_id: int
    message: Message
    recipient_user_ids: tuple[int, ...]


@dataclass(frozen=True)
class FailedProfileShareRecipient:
    user_id: int
    code: str


@dataclass(frozen=True)
class ProfileShareResult:
    sent: tuple[ProfileShareDelivery, ...]
    failed: tuple[FailedProfileShareRecipient, ...]


def normalize_profile_share_recipient_ids(values) -> list[int]:
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


def _can_send_profile_share_to_target(*, actor, target) -> bool:
    if target.id == actor.id or target.is_staff or target.is_superuser:
        return False
    if target.is_public:
        return True
    try:
        return (
            find_direct_conversation(actor=actor, target=target, require_started=True)
            is not None
        )
    except SelfConversationNotAllowed:
        return False


def send_profile_share_to_recipients(
    *,
    actor,
    shared_user,
    recipient_user_ids: list[int],
) -> ProfileShareResult:
    normalized_ids = normalize_profile_share_recipient_ids(recipient_user_ids)[
        :MAX_PROFILE_SHARE_RECIPIENTS
    ]
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

    sent: list[ProfileShareDelivery] = []
    failed: list[FailedProfileShareRecipient] = []
    metadata = {PROFILE_SHARE_METADATA_USER_ID: int(shared_user.id)}

    for user_id in normalized_ids:
        target = targets_by_id.get(user_id)
        if target is None or not _can_send_profile_share_to_target(
            actor=actor,
            target=target,
        ):
            failed.append(
                FailedProfileShareRecipient(
                    user_id=user_id, code="recipient_unavailable"
                )
            )
            continue

        try:
            result = send_direct_message(
                actor=actor,
                target=target,
                message_type=Message.Type.PROFILE_SHARE,
                metadata=metadata,
            )
        except (SelfConversationNotAllowed, BlockedUserInteractionError):
            failed.append(
                FailedProfileShareRecipient(
                    user_id=user_id, code="recipient_unavailable"
                )
            )
        except MessageRequestLimitExceeded:
            failed.append(
                FailedProfileShareRecipient(
                    user_id=user_id, code="message_request_pending"
                )
            )
        except MessageRequestActionNotAllowed:
            failed.append(
                FailedProfileShareRecipient(
                    user_id=user_id, code="recipient_unavailable"
                )
            )
        else:
            sent.append(
                ProfileShareDelivery(
                    user_id=int(target.id),
                    conversation_id=int(result.conversation.id),
                    message=result.message,
                    recipient_user_ids=result.recipient_user_ids,
                )
            )

    return ProfileShareResult(sent=tuple(sent), failed=tuple(failed))
