"""Shared visibility rules for direct offer access."""

from accounts.services.user_blocks import user_block_exists_between


def offer_owner_blocked_from_user(offer, user) -> bool:
    """Return whether the offer owner and viewer are blocked in either direction."""
    viewer_id = getattr(user, "id", None)
    owner_id = getattr(offer, "user_id", None)
    if not viewer_id or not owner_id or int(viewer_id) == int(owner_id):
        return False
    return user_block_exists_between(
        first_user_id=viewer_id,
        second_user_id=owner_id,
    )


def offer_hidden_from_user(offer, user) -> bool:
    """Apply direct offer visibility without restricting the owner."""
    if getattr(offer, "user_id", None) == getattr(user, "id", None):
        return False
    return bool(
        offer.is_hidden
        or not getattr(offer.user, "is_public", True)
        or offer_owner_blocked_from_user(offer, user)
    )
