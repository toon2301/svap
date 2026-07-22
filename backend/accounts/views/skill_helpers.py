"""
Helpery pre skills views (vyčlenené z skills.py kvôli dĺžke).

Optimalizovaný list queryset (anti N+1), bulk kontext (can_review/reviewed/liked/
request_status), cache kľúč/invalidácia zoznamu a server-timing záznam.
"""

import os

from django.core.cache import cache
from django.db.models import Avg, Count

from ..models import (
    OfferedSkillLike,
    REVIEWABLE_SKILL_REQUEST_STATUSES,
    Review,
    SkillRequest,
    exclude_block_terminated_requests,
)
from ..services.user_blocks import blocked_user_ids_for

SKILLS_LIST_CACHE_TTL_SECONDS = int(
    os.getenv("SKILLS_LIST_CACHE_TTL_SECONDS", "60") or "60"
)


def _skills_list_queryset(base_qs):
    """Optimalizovaný queryset: select_related, prefetch_related, annotate – zníženie N+1."""
    return (
        base_qs.select_related("user")
        .prefetch_related("images")
        .annotate(
            _avg_rating=Avg("reviews__rating"),
            _reviews_count=Count("reviews", distinct=True),
            _likes_count=Count("offer_likes", distinct=True),
        )
    )


def _skills_list_context(request, offer_ids):
    """Bulk dotazy pre can_review, already_reviewed a request_status – namiesto N+1."""
    if not offer_ids:
        return {}
    user = getattr(request, "user", None)
    if user is None or not getattr(user, "is_authenticated", False):
        return {"liked_offer_ids": set()}
    reviewed = set(
        Review.objects.filter(offer_id__in=offer_ids, reviewer=user).values_list(
            "offer_id", flat=True
        )
    )
    blocked_user_ids = blocked_user_ids_for(user_id=user.id)
    can_review_qs = exclude_block_terminated_requests(
        SkillRequest.objects.filter(
            offer_id__in=offer_ids,
            requester=user,
            status__in=REVIEWABLE_SKILL_REQUEST_STATUSES,
        )
    )
    if blocked_user_ids:
        # Exclude offers owned by a blocked counterpart before building the set,
        # so can_review_offer_ids never carries a blocked-owner offer.
        can_review_qs = can_review_qs.exclude(offer__user_id__in=blocked_user_ids)
    can_review = set(can_review_qs.values_list("offer_id", flat=True))
    request_status_by_offer = dict(
        SkillRequest.objects.filter(
            requester=user, offer_id__in=offer_ids
        ).values_list("offer_id", "status")
    )
    liked_offer_ids = set(
        OfferedSkillLike.objects.filter(
            offer_id__in=offer_ids,
            user=user,
        ).values_list("offer_id", flat=True)
    )
    return {
        "reviewed_offer_ids": reviewed,
        "can_review_offer_ids": can_review,
        "request_status_by_offer_id": request_status_by_offer,
        "liked_offer_ids": liked_offer_ids,
        "blocked_user_ids": blocked_user_ids,
    }


def _skills_list_cache_key(user_id: int) -> str:
    return f"skills_list_v2:{int(user_id)}"


def _skills_list_cache_invalidate(user_id: int) -> None:
    try:
        cache.delete(_skills_list_cache_key(user_id))
    except Exception:
        pass


def _record_skills_timing(request, **entries) -> None:
    try:
        base_req = getattr(request, "_request", request)
        st = getattr(base_req, "_server_timing", None)
        if not isinstance(st, dict):
            st = {}
        st.update(entries)
        base_req._server_timing = st
    except Exception:
        pass
