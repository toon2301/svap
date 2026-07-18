from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.db import transaction

from accounts.models import OfferedSkill
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
from .profile_shares import normalize_profile_share_recipient_ids

User = get_user_model()

MAX_OFFER_SHARE_RECIPIENTS = 20
OFFER_SHARE_METADATA_OFFER_ID = "shared_offer_id"


@dataclass(frozen=True)
class OfferShareDelivery:
    user_id: int
    conversation_id: int
    message: Message
    recipient_user_ids: tuple[int, ...]


@dataclass(frozen=True)
class FailedOfferShareRecipient:
    user_id: int
    code: str


@dataclass(frozen=True)
class OfferShareResult:
    sent: tuple[OfferShareDelivery, ...]
    failed: tuple[FailedOfferShareRecipient, ...]


def normalize_offer_share_recipient_ids(values) -> list[int]:
    return normalize_profile_share_recipient_ids(values)


def _can_send_offer_share_to_target(*, actor, target) -> bool:
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
        )
    }


def _shared_offer_is_available(*, shared_offer, owner) -> bool:
    return bool(
        not shared_offer.is_hidden
        and owner
        and owner.is_active
        and owner.is_public
        and not owner.is_staff
        and not owner.is_superuser
    )


def send_offer_share_to_recipients(
    *,
    actor,
    shared_offer,
    recipient_user_ids: list[int],
) -> OfferShareResult:
    normalized_ids = normalize_offer_share_recipient_ids(recipient_user_ids)[
        :MAX_OFFER_SHARE_RECIPIENTS
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
        original_owner_id = int(shared_offer.user_id)
        locked_user_ids = {
            actor_id,
            original_owner_id,
            *targets_by_id.keys(),
        }
        lock_users_for_update(user_ids=locked_user_ids)

        try:
            shared_offer = (
                OfferedSkill.objects.select_for_update()
                .only("id", "user_id", "is_hidden")
                .get(pk=shared_offer.id)
            )
        except OfferedSkill.DoesNotExist as exc:
            raise BlockedUserInteractionError("Shared offer is unavailable.") from exc

        users_by_id = _load_share_users(locked_user_ids)
        current_actor = users_by_id.get(actor_id)
        owner = users_by_id.get(int(shared_offer.user_id))
        targets_by_id = {
            user_id: users_by_id[user_id]
            for user_id in targets_by_id
            if user_id in users_by_id
        }
        if (
            current_actor is None
            or not current_actor.is_active
            or shared_offer.user_id != original_owner_id
            or not _shared_offer_is_available(
                shared_offer=shared_offer,
                owner=owner,
            )
        ):
            raise BlockedUserInteractionError("Shared offer is unavailable.")

        ensure_user_interaction_allowed(
            first_user_id=actor_id,
            second_user_id=owner.id,
        )

        sent: list[OfferShareDelivery] = []
        failed: list[FailedOfferShareRecipient] = []
        metadata = {OFFER_SHARE_METADATA_OFFER_ID: int(shared_offer.id)}

        for user_id in normalized_ids:
            target = targets_by_id.get(user_id)
            if target is None or not _can_send_offer_share_to_target(
                actor=actor,
                target=target,
            ):
                failed.append(
                    FailedOfferShareRecipient(
                        user_id=user_id, code="recipient_unavailable"
                    )
                )
                continue

            try:
                result = send_direct_message(
                    actor=actor,
                    target=target,
                    message_type=Message.Type.OFFER_SHARE,
                    metadata=metadata,
                )
            except (SelfConversationNotAllowed, BlockedUserInteractionError):
                failed.append(
                    FailedOfferShareRecipient(
                        user_id=user_id, code="recipient_unavailable"
                    )
                )
            except MessageRequestLimitExceeded:
                failed.append(
                    FailedOfferShareRecipient(
                        user_id=user_id, code="message_request_pending"
                    )
                )
            except MessageRequestActionNotAllowed:
                failed.append(
                    FailedOfferShareRecipient(
                        user_id=user_id, code="recipient_unavailable"
                    )
                )
            else:
                sent.append(
                    OfferShareDelivery(
                        user_id=int(target.id),
                        conversation_id=int(result.conversation.id),
                        message=result.message,
                        recipient_user_ids=result.recipient_user_ids,
                    )
                )

        return OfferShareResult(sent=tuple(sent), failed=tuple(failed))
