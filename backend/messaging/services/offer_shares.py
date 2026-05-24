from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth import get_user_model

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
        except SelfConversationNotAllowed:
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
