"""
Helpery pre skill_requests views (vyčlenené z skill_requests.py kvôli dĺžke).

Cache kľúč/refresh/invalidácia zoznamu žiadostí a výpočet payloadu (received/sent).
Zdieľané stavové konštanty tiež žijú tu. (Vytváranie/dispatch skill_request
notifikácie žije v accounts/services/notifications.create_skill_request_notification.)
"""

import logging
import os

from django.core.cache import cache

from ..models import (
    Review,
    SkillRequest,
    SkillRequestStatus,
)
from ..serializers import SkillRequestSerializer
from ..services.user_blocks import blocked_user_ids_for

logger = logging.getLogger(__name__)

MAX_SKILL_REQUESTS = 100
SKILL_REQUESTS_CACHE_TTL_SECONDS = int(os.getenv("SKILL_REQUESTS_CACHE_TTL_SECONDS", "120") or "120")

ACTIVE_SKILL_REQUEST_STATUSES: tuple[str, ...] = (
    SkillRequestStatus.PENDING,
    SkillRequestStatus.ACCEPTED,
    SkillRequestStatus.COMPLETION_REQUESTED,
)

INACTIVE_SKILL_REQUEST_STATUSES: tuple[str, ...] = (
    SkillRequestStatus.REJECTED,
    SkillRequestStatus.CANCELLED,
    SkillRequestStatus.COMPLETED,
    SkillRequestStatus.TERMINATED,
)


def _skill_requests_cache_key(user_id: int, status_param: str | None) -> str:
    s = (status_param or "").strip().lower()
    return f"skill_requests_v2:{int(user_id)}:{s}"


_SKILLREQ_STATUS_KEYS: tuple[str, ...] = (
    "",
    "pending",
    "accepted,completion_requested",
    "completed",
    "cancelled,rejected,terminated",
)


def _compute_skill_requests_payload(*, viewer, request, status_param: str | None):
    received = SkillRequest.objects.filter(
        recipient=viewer,
        hidden_by_recipient=False,
    ).select_related(
        "requester",
        "recipient",
        "offer",
        "offer__user",
        "proposed_offer",
        "proposed_offer__user",
        "termination",
        "termination__terminated_by",
    )
    sent = SkillRequest.objects.filter(
        requester=viewer,
        hidden_by_requester=False,
    ).select_related(
        "requester",
        "recipient",
        "offer",
        "offer__user",
        "proposed_offer",
        "proposed_offer__user",
        "termination",
        "termination__terminated_by",
    )

    if status_param:
        status_values = [s.strip().lower() for s in status_param.split(",") if s.strip()]
        valid_statuses = {choice for choice, _ in SkillRequestStatus.choices}
        status_filter = [s for s in status_values if s in valid_statuses]
        if status_filter:
            received = received.filter(status__in=status_filter)
            sent = sent.filter(status__in=status_filter)

    received = received.order_by("-created_at")[:MAX_SKILL_REQUESTS]
    sent = sent.order_by("-created_at")[:MAX_SKILL_REQUESTS]

    received_list = list(received)
    sent_list = list(sent)

    offer_ids = [r.offer_id for r in received_list] + [r.offer_id for r in sent_list]
    offer_ids = [oid for oid in offer_ids if oid]
    reviewed_offer_ids = set()
    if offer_ids:
        reviewed_offer_ids = set(
            Review.objects.filter(reviewer=viewer, offer_id__in=offer_ids).values_list("offer_id", flat=True)
        )

    blocked_user_ids = blocked_user_ids_for(user_id=viewer.id)

    received_ser = SkillRequestSerializer(
        received_list,
        many=True,
        context={
            "request": request,
            "reviewed_offer_ids": reviewed_offer_ids,
            "blocked_user_ids": blocked_user_ids,
        },
    )
    sent_ser = SkillRequestSerializer(
        sent_list,
        many=True,
        context={
            "request": request,
            "reviewed_offer_ids": reviewed_offer_ids,
            "blocked_user_ids": blocked_user_ids,
        },
    )
    return {
        "received": list(received_ser.data),
        "sent": list(sent_ser.data),
    }


def _skill_requests_cache_refresh_for_user(user, request) -> None:
    # Write-through cache: keeps first navigation fast (no cold cache).
    for key in _SKILLREQ_STATUS_KEYS:
        status_param = key if key else None
        payload = _compute_skill_requests_payload(viewer=user, request=request, status_param=status_param)
        cache.set(_skill_requests_cache_key(user.id, key), payload, timeout=SKILL_REQUESTS_CACHE_TTL_SECONDS)


def _skill_requests_cache_invalidate_for_user_id(user_id: int) -> None:
    """
    Invaliduje cache žiadostí pre user_id. Bezpečné pre produkciu – len mazanie
    kľúčov, žiadne DB dotazy. Ďalší GET znovu vybuduje cache.
    """
    for key in _SKILLREQ_STATUS_KEYS:
        try:
            cache.delete(_skill_requests_cache_key(user_id, key))
        except Exception:
            pass


def _skill_requests_cache_invalidate_for_user(user) -> None:
    """Object-based wrapper okolo _skill_requests_cache_invalidate_for_user_id."""
    _skill_requests_cache_invalidate_for_user_id(user.id)
