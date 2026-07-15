"""Shared user-blocking operations and queries."""

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q, QuerySet

from accounts.models import FavoriteUser, ProfileLike, UserBlock

User = get_user_model()


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


def lock_user_pair_for_update(*, first_user_id: int, second_user_id: int) -> None:
    """Lock a user pair in stable order; caller must be inside transaction.atomic."""
    list(
        User.objects.select_for_update()
        .filter(pk__in=(first_user_id, second_user_id))
        .order_by("pk")
        .values_list("pk", flat=True)
    )


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
    return user_block, created


def delete_user_block(*, blocker, blocked_user_id: int) -> bool:
    """Delete only the caller's outgoing block and report whether it existed."""
    deleted_count, _ = UserBlock.objects.filter(
        blocker=blocker,
        blocked_user_id=blocked_user_id,
    ).delete()
    return deleted_count > 0


def user_block_exists_between(*, first_user_id: int, second_user_id: int) -> bool:
    """Return whether either user has blocked the other."""
    if not first_user_id or not second_user_id or first_user_id == second_user_id:
        return False

    return UserBlock.objects.filter(
        Q(blocker_id=first_user_id, blocked_user_id=second_user_id)
        | Q(blocker_id=second_user_id, blocked_user_id=first_user_id)
    ).exists()


def outgoing_user_blocks(*, blocker) -> QuerySet[UserBlock]:
    """Return blocks created by one owner with target data loaded."""
    return UserBlock.objects.filter(blocker=blocker).select_related("blocked_user")
