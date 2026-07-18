from __future__ import annotations

from collections.abc import Callable

from django.conf import settings
from django.db.models import Prefetch

from accounts.models import OfferedSkill, OfferedSkillImage
from accounts.services.user_blocks import exclude_blocked_users
from ..models import Message
from ..services.offer_shares import OFFER_SHARE_METADATA_OFFER_ID


def _positive_metadata_int(metadata: dict | None, key: str) -> int | None:
    if not isinstance(metadata, dict):
        return None
    try:
        value = int((metadata or {}).get(key))
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


def _offer_image_url(request, offer: OfferedSkill) -> str | None:
    images = getattr(offer, "_share_approved_images", None)
    if images is None:
        images = offer.images.filter(
            status=OfferedSkillImage.Status.APPROVED
        ).order_by("order", "id")

    for image in images:
        url = None
        approved_key = (getattr(image, "approved_key", "") or "").strip()
        if approved_key:
            base = getattr(settings, "MEDIA_URL", "/media/")
            url = f"{base}{approved_key.lstrip('/')}"
        else:
            image_field = getattr(image, "image", None)
            if image_field and hasattr(image_field, "url"):
                url = image_field.url

        if url:
            return request.build_absolute_uri(url) if request else url

    return None


def _collect_offer_share_ids(messages: list[Message]) -> set[int]:
    offer_ids: set[int] = set()
    for message in messages:
        if getattr(message, "message_type", None) != Message.Type.OFFER_SHARE:
            continue
        offer_id = _positive_metadata_int(
            getattr(message, "metadata", None),
            OFFER_SHARE_METADATA_OFFER_ID,
        )
        if offer_id is not None:
            offer_ids.add(offer_id)
    return offer_ids


def _get_offer_share_cache(
    context: dict,
    current_message: Message,
    parent_instance,
) -> dict[int, OfferedSkill]:
    cache = context.get("_offer_share_offer_cache")
    if cache is not None:
        return cache

    try:
        messages = list(parent_instance) if parent_instance is not None else []
    except TypeError:
        messages = []
    if not messages:
        messages = [current_message]

    offer_ids = _collect_offer_share_ids(messages)
    if not offer_ids:
        context["_offer_share_offer_cache"] = {}
        return {}

    offers = (
        OfferedSkill.objects.filter(
            id__in=offer_ids,
            is_hidden=False,
            user__is_active=True,
            user__is_public=True,
        )
        .exclude(user__is_staff=True)
        .exclude(user__is_superuser=True)
    )
    request = context.get("request")
    viewer_id = getattr(getattr(request, "user", None), "id", None)
    offers = (
        exclude_blocked_users(
            offers,
            viewer_user_id=viewer_id,
            user_id_field="user_id",
        )
        .select_related("user")
        .only(
            "id",
            "category",
            "subcategory",
            "description",
            "location",
            "district",
            "is_hidden",
            "user_id",
            "user__id",
            "user__first_name",
            "user__last_name",
            "user__company_name",
            "user__username",
            "user__slug",
            "user__user_type",
            "user__avatar",
        )
        .prefetch_related(
            Prefetch(
                "images",
                queryset=OfferedSkillImage.objects.filter(
                    status=OfferedSkillImage.Status.APPROVED
                )
                .only("id", "skill_id", "image", "order", "status", "approved_key")
                .order_by("order", "id"),
                to_attr="_share_approved_images",
            )
        )
    )
    cache = {int(offer.id): offer for offer in offers}
    context["_offer_share_offer_cache"] = cache
    return cache


def serialize_offer_share_message(
    *,
    message: Message,
    context: dict,
    parent_instance,
    serialize_user_brief: Callable,
):
    if message.is_deleted or message.message_type != Message.Type.OFFER_SHARE:
        return None

    shared_offer_id = _positive_metadata_int(
        message.metadata, OFFER_SHARE_METADATA_OFFER_ID
    )
    if shared_offer_id is None:
        return None

    offer = _get_offer_share_cache(context, message, parent_instance).get(shared_offer_id)
    if offer is None:
        return None

    title = (
        (getattr(offer, "description", "") or "").strip()
        or (getattr(offer, "subcategory", "") or "").strip()
        or (getattr(offer, "category", "") or "").strip()
    )
    location = (
        (getattr(offer, "location", "") or "").strip()
        or (getattr(offer, "district", "") or "").strip()
        or None
    )
    request = context.get("request")
    return {
        "id": offer.id,
        "title": title,
        "category": offer.category,
        "subcategory": offer.subcategory,
        "image_url": _offer_image_url(request, offer),
        "location": location,
        "owner": serialize_user_brief(offer.user, request),
    }
