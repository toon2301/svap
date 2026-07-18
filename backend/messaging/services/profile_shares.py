from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.db import transaction

from accounts.services.user_blocks import (
    BlockedUserInteractionError,
    ensure_user_interaction_allowed,
    lock_users_for_update,
)

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
    if (
        target.id == actor.id
        or not target.is_active
        or target.is_staff
        or target.is_superuser
    ):
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


def _load_share_users(user_ids) -> dict[int, User]:
    return {
        user.id: user
        for user in User.objects.filter(id__in=user_ids).only(
            "id",
            "is_active",
            "is_public",
            "is_staff",
            "is_superuser",
            "first_name",
            "last_name",
            "company_name",
            "username",
            "slug",
            "user_type",
            "avatar",
            "is_verified",
        )
    }


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

    with transaction.atomic():
        actor_id = int(actor.id)
        shared_user_id = int(shared_user.id)
        locked_user_ids = {
            actor_id,
            shared_user_id,
            *targets_by_id.keys(),
        }
        lock_users_for_update(user_ids=locked_user_ids)

        users_by_id = _load_share_users(locked_user_ids)
        current_actor = users_by_id.get(actor_id)
        current_shared_user = users_by_id.get(shared_user_id)
        targets_by_id = {
            user_id: users_by_id[user_id]
            for user_id in targets_by_id
            if user_id in users_by_id
        }
        if (
            current_actor is None
            or not current_actor.is_active
            or current_shared_user is None
            or not current_shared_user.is_active
            or not current_shared_user.is_public
            or current_shared_user.is_staff
            or current_shared_user.is_superuser
        ):
            raise BlockedUserInteractionError("Shared profile is unavailable.")

        ensure_user_interaction_allowed(
            first_user_id=current_actor.id,
            second_user_id=current_shared_user.id,
        )

        sent: list[ProfileShareDelivery] = []
        failed: list[FailedProfileShareRecipient] = []
        metadata = {PROFILE_SHARE_METADATA_USER_ID: int(current_shared_user.id)}

        for user_id in normalized_ids:
            target = targets_by_id.get(user_id)
            if target is None or not _can_send_profile_share_to_target(
                actor=current_actor,
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
                    actor=current_actor,
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
