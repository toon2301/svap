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


def review_hidden_from_user(review, user) -> bool:
    """Visibility for a review, robust to a deleted (SET_NULL) offer.

    While the offer exists, apply normal offer visibility. Once the offer was
    deleted (offer=None), the block / private-profile rules can no longer be read
    from ``offer.user``, so we enforce the SAME rules against the denormalized
    ``reviewed_user``. Without this an orphaned review could be used to bypass a
    block or a private profile.
    """
    offer = getattr(review, "offer", None)
    if offer is not None:
        return offer_hidden_from_user(offer, user)

    reviewed_user_id = getattr(review, "reviewed_user_id", None)
    if not reviewed_user_id:
        return False

    viewer_id = getattr(user, "id", None)
    if viewer_id and int(viewer_id) == int(reviewed_user_id):
        # Hodnotený používateľ vidí recenzie na seba vždy (ako vlastník ponuky).
        return False

    reviewed_user = getattr(review, "reviewed_user", None)
    if reviewed_user is not None and not getattr(reviewed_user, "is_public", True):
        return True

    return bool(
        viewer_id
        and user_block_exists_between(
            first_user_id=viewer_id,
            second_user_id=reviewed_user_id,
        )
    )
