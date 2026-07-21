"""Shared user-blocking operations and queries."""

from collections.abc import Iterable

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q, QuerySet

from accounts.models import FavoriteUser, ProfileLike, UserBlock

User = get_user_model()


class BlockedUserInteractionError(Exception):
    """Raised when a blocked user pair attempts a protected interaction."""


def exclude_blocked_users(
    queryset: QuerySet,
    *,
    viewer_user_id: int | None,
    user_id_field: str = "pk",
) -> QuerySet:
    """Exclude users who have either side of a block with the viewer."""
    if not viewer_user_id:
        return queryset

    outgoing_ids = UserBlock.objects.filter(
        blocker_id=viewer_user_id,
    ).values("blocked_user_id")
    incoming_ids = UserBlock.objects.filter(
        blocked_user_id=viewer_user_id,
    ).values("blocker_id")
    return queryset.exclude(**{f"{user_id_field}__in": outgoing_ids}).exclude(
        **{f"{user_id_field}__in": incoming_ids}
    )


def lock_users_for_update(*, user_ids: Iterable[int]) -> None:
    """Lock users in stable order; caller must be inside transaction.atomic."""
    normalized_user_ids = sorted({int(user_id) for user_id in user_ids if user_id})
    if not normalized_user_ids:
        return

    list(
        User.objects.select_for_update()
        .filter(pk__in=normalized_user_ids)
        .order_by("pk")
        .values_list("pk", flat=True)
    )


def lock_user_pair_for_update(*, first_user_id: int, second_user_id: int) -> None:
    """Lock a user pair in stable order; caller must be inside transaction.atomic."""
    lock_users_for_update(user_ids=(first_user_id, second_user_id))


def remove_blocked_social_connections(
    *, first_user_id: int, second_user_id: int
) -> None:
    """Remove mutual favorites and profile likes without touching content likes."""
    pair_filter = Q(user_id=first_user_id, favorite_user_id=second_user_id) | Q(
        user_id=second_user_id,
        favorite_user_id=first_user_id,
    )
    FavoriteUser.objects.filter(pair_filter).delete()

    likes_filter = Q(user_id=first_user_id, profile_user_id=second_user_id) | Q(
        user_id=second_user_id,
        profile_user_id=first_user_id,
    )
    ProfileLike.objects.filter(likes_filter).delete()


def blocked_user_ids_for(*, user_id: int | None) -> set[int]:
    """Return all counterpart IDs blocked in either direction in one query."""
    if not user_id:
        return set()
    rows = UserBlock.objects.filter(
        Q(blocker_id=user_id) | Q(blocked_user_id=user_id)
    ).values_list("blocker_id", "blocked_user_id")
    return {
        blocked_id if blocker_id == user_id else blocker_id
        for blocker_id, blocked_id in rows
    }


def _schedule_skill_request_cache_invalidation(
    *, first_user_id: int, second_user_id: int
) -> None:
    """Drop cached skill-request payloads for a pair once the surrounding
    block/unblock transaction commits.

    The cached payload's ``can_review`` depends on the current block state, so
    every block AND unblock must invalidate it — even when no open request
    changed status. Registered as an ``on_commit`` hook so a concurrent read
    cannot repopulate the cache from the not-yet-committed state.
    """

    def _invalidate() -> None:
        from accounts.views.skill_request_helpers import (
            _skill_requests_cache_invalidate_for_user_id,
        )

        _skill_requests_cache_invalidate_for_user_id(first_user_id)
        _skill_requests_cache_invalidate_for_user_id(second_user_id)

    transaction.on_commit(_invalidate)


def _schedule_dashboard_user_skills_cache_invalidation(
    *, first_user_id: int, second_user_id: int
) -> None:
    """Bump the public-profile offers cache version for a pair once the
    block/unblock transaction commits.

    That cache embeds ``can_review`` for the viewer against the profiled
    owner's offers, which depends on the current block state. The cache is
    versioned per profiled (target) user, so both users must be bumped — each
    is the target when viewed by the other. ``on_commit`` mirrors
    _schedule_skill_request_cache_invalidation so a concurrent read cannot
    repopulate the new version from the not-yet-committed state.
    """

    def _invalidate() -> None:
        from accounts.views.dashboard_views.public_profiles import (
            invalidate_dashboard_user_skills_cache,
        )

        invalidate_dashboard_user_skills_cache(first_user_id)
        invalidate_dashboard_user_skills_cache(second_user_id)

    transaction.on_commit(_invalidate)


def create_user_block(*, blocker, blocked_user) -> tuple[UserBlock, bool]:
    """Create a directional block, returning an existing row when repeated."""
    if blocker.pk == blocked_user.pk:
        raise ValueError("A user cannot block their own account.")

    with transaction.atomic():
        lock_user_pair_for_update(
            first_user_id=blocker.pk,
            second_user_id=blocked_user.pk,
        )
        user_block, created = UserBlock.objects.get_or_create(
            blocker=blocker,
            blocked_user=blocked_user,
        )
        remove_blocked_social_connections(
            first_user_id=blocker.pk,
            second_user_id=blocked_user.pk,
        )
        # Import locally to keep the accounts model/service layer independent
        # from messaging during Django app initialization.
        from messaging.services.message_requests import (
            close_pending_message_request_for_user_pair,
        )

        close_pending_message_request_for_user_pair(
            first_user_id=blocker.pk,
            second_user_id=blocked_user.pk,
        )
        from accounts.services.skill_request_transitions import (
            close_open_skill_requests_for_blocked_pair,
        )

        close_open_skill_requests_for_blocked_pair(
            blocker_id=blocker.pk,
            blocked_user_id=blocked_user.pk,
        )

        # Import locally for the same reason as the message-request import
        # above: keep accounts independent of messaging at Django app load.
        from messaging.services.group_invitations import (
            close_open_group_invitations_for_blocked_pair,
        )

        close_open_group_invitations_for_blocked_pair(
            blocker_id=blocker.pk,
            blocked_user_id=blocked_user.pk,
        )

        # Always invalidate, not only when an open request was closed: the
        # cached can_review flag depends on the block state itself.
        _schedule_skill_request_cache_invalidation(
            first_user_id=blocker.pk,
            second_user_id=blocked_user.pk,
        )
        _schedule_dashboard_user_skills_cache_invalidation(
            first_user_id=blocker.pk,
            second_user_id=blocked_user.pk,
        )
    return user_block, created


def delete_user_block(*, blocker, blocked_user_id: int) -> bool:
    """Delete only the caller's outgoing block and report whether it existed."""
    with transaction.atomic():
        lock_user_pair_for_update(
            first_user_id=blocker.pk,
            second_user_id=blocked_user_id,
        )
        deleted_count, _ = UserBlock.objects.filter(
            blocker=blocker,
            blocked_user_id=blocked_user_id,
        ).delete()
        if deleted_count:
            # Unblocking can turn can_review back on, so drop the cached
            # payloads for both users the same way blocking does.
            _schedule_skill_request_cache_invalidation(
                first_user_id=blocker.pk,
                second_user_id=blocked_user_id,
            )
            _schedule_dashboard_user_skills_cache_invalidation(
                first_user_id=blocker.pk,
                second_user_id=blocked_user_id,
            )
    return deleted_count > 0


def user_block_exists_between(*, first_user_id: int, second_user_id: int) -> bool:
    """Return whether either user has blocked the other."""
    if not first_user_id or not second_user_id or first_user_id == second_user_id:
        return False

    return UserBlock.objects.filter(
        Q(blocker_id=first_user_id, blocked_user_id=second_user_id)
        | Q(blocker_id=second_user_id, blocked_user_id=first_user_id)
    ).exists()


def ensure_user_interaction_allowed(
    *, first_user_id: int, second_user_id: int
) -> None:
    """Reject an interaction when either user has blocked the other."""
    if user_block_exists_between(
        first_user_id=first_user_id,
        second_user_id=second_user_id,
    ):
        raise BlockedUserInteractionError("User interaction is unavailable.")


def lock_users_and_ensure_interaction_allowed(
    *, first_user_id: int, second_user_id: int
) -> None:
    """Serialize block-sensitive writes and enforce the current block state."""
    lock_user_pair_for_update(
        first_user_id=first_user_id,
        second_user_id=second_user_id,
    )
    ensure_user_interaction_allowed(
        first_user_id=first_user_id,
        second_user_id=second_user_id,
    )


def outgoing_user_blocks(*, blocker) -> QuerySet[UserBlock]:
    """Return blocks created by one owner with target data loaded."""
    return UserBlock.objects.filter(blocker=blocker).select_related("blocked_user")
