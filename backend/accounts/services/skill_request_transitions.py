"""Transactional helpers for block-sensitive skill request transitions."""

from django.db.models import Q

from accounts.models import (
    SkillRequest,
    SkillRequestStatus,
    SkillRequestTermination,
    SkillRequestTerminationReason,
)
from accounts.services.user_blocks import (
    ensure_user_interaction_allowed,
    lock_user_pair_for_update,
)


SKILL_REQUEST_SELECT_RELATED = (
    "offer",
    "requester",
    "recipient",
    "proposed_offer",
    "proposed_offer__user",
)


def lock_skill_request_for_transition(
    *, request_id: int, enforce_interaction: bool = True
) -> SkillRequest:
    """Lock participants first, then return the locked, freshly loaded request."""
    participant_ids = (
        SkillRequest.objects.filter(pk=request_id)
        .values_list("requester_id", "recipient_id")
        .first()
    )
    if participant_ids is None:
        raise SkillRequest.DoesNotExist

    requester_id, recipient_id = participant_ids
    lock_user_pair_for_update(
        first_user_id=requester_id,
        second_user_id=recipient_id,
    )

    obj = (
        SkillRequest.objects.select_for_update(of=("self",))
        .select_related(*SKILL_REQUEST_SELECT_RELATED)
        .get(pk=request_id)
    )
    if (obj.requester_id, obj.recipient_id) != participant_ids:
        # Participants are immutable in application flows. Fail closed if
        # privileged/manual data manipulation races with this transition.
        raise SkillRequest.DoesNotExist

    if enforce_interaction:
        ensure_user_interaction_allowed(
            first_user_id=requester_id,
            second_user_id=recipient_id,
        )
    return obj


def close_open_skill_requests_for_blocked_pair(
    *, blocker_id: int, blocked_user_id: int
) -> int:
    """Close pending/active exchanges while the caller holds both user locks."""
    pair_filter = Q(requester_id=blocker_id, recipient_id=blocked_user_id) | Q(
        requester_id=blocked_user_id,
        recipient_id=blocker_id,
    )
    requests = list(
        SkillRequest.objects.select_for_update(of=("self",))
        .filter(
            pair_filter,
            status__in=(
                SkillRequestStatus.PENDING,
                SkillRequestStatus.ACCEPTED,
                SkillRequestStatus.COMPLETION_REQUESTED,
            ),
        )
        .order_by("pk")
    )

    for obj in requests:
        if obj.status == SkillRequestStatus.PENDING:
            obj.status = SkillRequestStatus.CANCELLED
        else:
            SkillRequestTermination.objects.get_or_create(
                skill_request=obj,
                defaults={
                    "terminated_by_id": blocker_id,
                    "reason": SkillRequestTerminationReason.INTERACTION_UNAVAILABLE,
                    "description": "",
                },
            )
            obj.status = SkillRequestStatus.TERMINATED
        obj.save(update_fields=["status", "updated_at"])

    return len(requests)
