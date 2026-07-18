"""Viewer-aware serialization for profile-share messages."""

from collections.abc import Callable

from django.contrib.auth import get_user_model

from accounts.services.user_blocks import exclude_blocked_users
from ..models import Message
from ..services.profile_shares import PROFILE_SHARE_METADATA_USER_ID
from .offer_share_serialization import _positive_metadata_int

User = get_user_model()


def _collect_profile_share_ids(messages: list[Message]) -> set[int]:
    user_ids: set[int] = set()
    for message in messages:
        if getattr(message, "message_type", None) != Message.Type.PROFILE_SHARE:
            continue
        user_id = _positive_metadata_int(
            getattr(message, "metadata", None),
            PROFILE_SHARE_METADATA_USER_ID,
        )
        if user_id is not None:
            user_ids.add(user_id)
    return user_ids


def _profile_share_cache(context, current_message, parent_instance):
    cache = context.get("_profile_share_user_cache")
    if cache is not None:
        return cache

    try:
        messages = list(parent_instance) if parent_instance is not None else []
    except TypeError:
        messages = []
    if not messages:
        messages = [current_message]

    user_ids = _collect_profile_share_ids(messages)
    if not user_ids:
        context["_profile_share_user_cache"] = {}
        return {}

    request = context.get("request")
    viewer_id = getattr(getattr(request, "user", None), "id", None)
    users = (
        User.objects.filter(
            id__in=user_ids,
            is_active=True,
            is_public=True,
        )
        .exclude(is_staff=True)
        .exclude(is_superuser=True)
    )
    users = exclude_blocked_users(users, viewer_user_id=viewer_id).only(
        "id",
        "first_name",
        "last_name",
        "company_name",
        "username",
        "slug",
        "user_type",
        "avatar",
    )
    cache = {int(user.id): user for user in users}
    context["_profile_share_user_cache"] = cache
    return cache


def serialize_profile_share_message(
    *,
    message: Message,
    context: dict,
    parent_instance,
    serialize_user_brief: Callable,
):
    if message.is_deleted or message.message_type != Message.Type.PROFILE_SHARE:
        return None

    shared_user_id = _positive_metadata_int(
        message.metadata,
        PROFILE_SHARE_METADATA_USER_ID,
    )
    if shared_user_id is None:
        return None

    shared_user = _profile_share_cache(
        context,
        message,
        parent_instance,
    ).get(shared_user_id)
    if shared_user is None:
        return None
    return serialize_user_brief(shared_user, context.get("request"))
