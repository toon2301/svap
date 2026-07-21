"""
Skill request (Žiadosti) API views.
"""

import json
import logging
import os
from time import perf_counter
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.db import IntegrityError, transaction
from django.core.cache import cache

from swaply.rate_limiting import api_rate_limit

from ..models import (
    SkillRequest,
    SkillRequestStatus,
    OfferedSkill,
    User,
)
from ..models import Review
from ..serializers import (
    SkillRequestCreateSerializer,
    SkillRequestSerializer,
    NotificationSerializer,
)
from typing import Optional

from ..realtime import notify_user
from ..services.notifications import (
    create_skill_request_accepted_notification,
    create_skill_request_completed_notification,
    create_skill_request_completion_requested_notification,
    create_skill_request_rejected_notification,
)
from .notifications import _unread_cache_key, UNREAD_COUNT_CACHE_TTL_SECONDS

from .skill_request_helpers import (
    ACTIVE_SKILL_REQUEST_STATUSES,
    INACTIVE_SKILL_REQUEST_STATUSES,
    MAX_SKILL_REQUESTS,
    SKILL_REQUESTS_CACHE_TTL_SECONDS,
    _compute_skill_requests_payload,
    _skill_requests_cache_invalidate_for_user,
    _skill_requests_cache_key,
    _skill_requests_cache_refresh_for_user,
)
from ..services.notifications import create_skill_request_notification
from ..services.offer_visibility import offer_hidden_from_user
from ..services.user_blocks import lock_user_pair_for_update
# Re-export detail/completion views (presunuté do skill_requests_detail) pre
# spätnú kompatibilitu (views/__init__ ich importuje z .skill_requests).
from .skill_requests_detail import (  # noqa: F401
    skill_request_confirm_completion_view,
    skill_request_detail_view,
    skill_request_request_completion_view,
)

logger = logging.getLogger(__name__)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_requests_view(request):
    """
    GET: vráti {received: [], sent: []}
    POST: vytvorí žiadosť o kartu (offer_id)
    """
    if request.method == "GET":
        status_param = request.query_params.get("status")
        # Cache-first: avoids DB connect cost on Railway.
        t_cache0 = perf_counter()
        cached = None
        try:
            cached = cache.get(_skill_requests_cache_key(request.user.id, status_param))
        except Exception:
            cached = None
        cache_ms = (perf_counter() - t_cache0) * 1000.0
        if isinstance(cached, dict) and "received" in cached and "sent" in cached:
            try:
                base_req = getattr(request, "_request", request)
                st = getattr(base_req, "_server_timing", None)
                if not isinstance(st, dict):
                    st = {}
                st["skillreq_cache"] = cache_ms
                base_req._server_timing = st
            except Exception:
                pass
            return Response(cached, status=status.HTTP_200_OK)

        # Cold-cache fallback (should be rare once write-through is active)
        t_build0 = perf_counter()
        payload = _compute_skill_requests_payload(viewer=request.user, request=request, status_param=status_param)
        t_build1 = perf_counter()
        try:
            cache.set(_skill_requests_cache_key(request.user.id, status_param), payload, timeout=SKILL_REQUESTS_CACHE_TTL_SECONDS)
        except Exception:
            pass
        try:
            base_req = getattr(request, "_request", request)
            st = getattr(base_req, "_server_timing", None)
            if not isinstance(st, dict):
                st = {}
            st["skillreq_build"] = (t_build1 - t_build0) * 1000.0
            base_req._server_timing = st
        except Exception:
            pass
        return Response(payload, status=status.HTTP_200_OK)

    # POST
    create_serializer = SkillRequestCreateSerializer(
        data=request.data, context={"request": request}
    )
    if not create_serializer.is_valid():
        return Response(create_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    offer = create_serializer.context.get("offer_obj")
    proposed_offer = create_serializer.context.get("proposed_offer_obj")
    if not offer:
        return Response(
            {"error": "Karta neexistuje."}, status=status.HTTP_400_BAD_REQUEST
        )

    recipient_id = offer.user_id

    created = False
    try:
        with transaction.atomic():
            # Global order: users, offers, then requests. Re-read every object
            # validated before the transaction so the backend remains authoritative.
            lock_user_pair_for_update(
                first_user_id=request.user.id,
                second_user_id=recipient_id,
            )
            offer_ids = {offer.id}
            if proposed_offer is not None:
                offer_ids.add(proposed_offer.id)
            locked_offers = {
                current.id: current
                for current in OfferedSkill.objects.select_for_update(of=("self",))
                .select_related("user")
                .filter(id__in=offer_ids)
                .order_by("id")
            }
            offer = locked_offers.get(offer.id)
            if offer is None or offer.user_id != recipient_id:
                return Response(
                    {"offer_id": ["Karta neexistuje."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            recipient = offer.user
            if (
                offer_hidden_from_user(offer, request.user)
                or not recipient.is_active
                or recipient.is_staff
                or recipient.is_superuser
            ):
                return Response(
                    {"offer_id": ["Karta neexistuje."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if proposed_offer is not None:
                proposed_offer = locked_offers.get(proposed_offer.id)
                if (
                    proposed_offer is None
                    or proposed_offer.user_id != request.user.id
                    or proposed_offer.is_hidden
                    or proposed_offer.is_seeking
                ):
                    return Response(
                        {"proposed_offer_id": ["Vybraná karta neexistuje."]},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Robustné aj keď už v DB existujú duplicity (legacy dáta):
            # nikdy nepoužívaj .get() na requester+offer.
            qs = (
                SkillRequest.objects.select_for_update(of=("self",))
                .select_related("offer", "requester", "recipient", "proposed_offer", "proposed_offer__user")
                .filter(requester=request.user, offer=offer)
                .order_by("-updated_at", "-id")
            )
            existing = list(qs)

            # 1) Ak existuje aspoň 1 aktívna žiadosť, vráť ju (nezakladaj novú).
            active = next((r for r in existing if r.status in ACTIVE_SKILL_REQUEST_STATUSES), None)
            if active is not None:
                return Response(
                    SkillRequestSerializer(active, context={"request": request}).data,
                    status=status.HTTP_200_OK,
                )

            # 2) Ak existujú iba neaktívne žiadosti, NEre-open – vytvor úplne novú.
            try:
                obj = SkillRequest.objects.create(
                    requester=request.user,
                    recipient=recipient,
                    offer=offer,
                    proposed_offer=proposed_offer,
                    proposal_description=create_serializer.validated_data.get(
                        "proposal_description", ""
                    ),
                    proposal_price_from=create_serializer.validated_data.get(
                        "proposal_price_from"
                    ),
                    proposal_price_currency=create_serializer.validated_data.get(
                        "proposal_price_currency", ""
                    ),
                    proposal_price_negotiable=create_serializer.validated_data.get(
                        "proposal_price_negotiable", False
                    ),
                    proposal_experience_value=create_serializer.validated_data.get(
                        "proposal_experience_value"
                    ),
                    proposal_experience_unit=create_serializer.validated_data.get(
                        "proposal_experience_unit", ""
                    ),
                    status=SkillRequestStatus.PENDING,
                )
                created = True
            except IntegrityError:
                # Partial unique constraint race (active-only): parallel request created an active row.
                obj = (
                    SkillRequest.objects.select_related(
                        "offer", "requester", "recipient", "proposed_offer", "proposed_offer__user"
                    )
                    .filter(
                        requester=request.user,
                        offer=offer,
                        status__in=ACTIVE_SKILL_REQUEST_STATUSES,
                    )
                    .order_by("-updated_at", "-id")
                    .first()
                )
                if not obj:
                    raise
                return Response(
                    SkillRequestSerializer(obj, context={"request": request}).data,
                    status=status.HTTP_200_OK,
                )
    except IntegrityError:
        # Safety net: if a DB-level race happens outside the inner block, return existing request.
        obj = (
            SkillRequest.objects.select_related(
                "offer", "requester", "recipient", "proposed_offer", "proposed_offer__user"
            )
            .filter(requester=request.user, offer=offer)
            .order_by("-updated_at", "-id")
            .first()
        )
        if not obj:
            raise
        return Response(
            SkillRequestSerializer(obj, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    # Notifikácia pre vlastníka karty – cez service (jednotné vytváranie:
    # rešpektuje in_app_notifications, dispatch Requests badge cez on_commit).
    try:
        create_skill_request_notification(
            skill_request=obj,
            actor=request.user,
            proposed_offer=proposed_offer,
        )
    except Exception:
        # Fail-open: samotná žiadosť je dôležitejšia ako notifikácia,
        # ale produkčne potrebujeme vidieť, keď badge/realtime vetva zlyhá.
        logger.exception(
            "Skill request notification dispatch failed",
            extra={
                "requester_id": getattr(request.user, "id", None),
                "recipient_id": getattr(recipient, "id", None),
                "offer_id": getattr(offer, "id", None),
                "skill_request_id": getattr(obj, "id", None),
            },
        )

    # Invalidácia cache pre oboch účastníkov (rýchle, bez DB)
    try:
        _skill_requests_cache_invalidate_for_user(request.user)
        _skill_requests_cache_invalidate_for_user(recipient)
    except Exception:
        pass

    return Response(
        SkillRequestSerializer(obj, context={"request": request}).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_requests_status_view(request):
    """
    GET /skill-requests/status/?offer_ids=1,2,3
    Vráti mapu: { "1": "pending", ... }
    """
    raw = (request.query_params.get("offer_ids") or "").strip()
    if not raw:
        return Response({}, status=status.HTTP_200_OK)

    ids = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            ids.append(int(part))
        except Exception:
            continue

    if not ids:
        return Response({}, status=status.HTTP_200_OK)

    # Bezpečné aj pri legacy duplicitách: vráť 1 status na offer_id.
    qs = SkillRequest.objects.filter(requester=request.user, offer_id__in=ids).order_by(
        "-updated_at", "-id"
    )
    best_by_offer: dict[int, SkillRequest] = {}
    for r in qs:
        oid = int(r.offer_id) if r.offer_id else None
        if not oid:
            continue
        current = best_by_offer.get(oid)
        if current is None:
            best_by_offer[oid] = r
            continue

        # Preferuj aktívny status nad neaktívnym; inak nechaj najnovší podľa ordering.
        cur_active = current.status in ACTIVE_SKILL_REQUEST_STATUSES
        r_active = r.status in ACTIVE_SKILL_REQUEST_STATUSES
        if r_active and not cur_active:
            best_by_offer[oid] = r

    result = {str(oid): obj.status for oid, obj in best_by_offer.items()}
    return Response(result, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_requests_proposed_status_view(request):
    """
    GET /skill-requests/proposed-status/?offer_ids=1,2,3
    Vrati mapu stavov pre ziadosti, kde dana karta vystupuje ako proposed_offer.
    Pouziva sa na profile odosielatela pomoci, aby prijemca videl spravny stav CTA.
    """
    raw = (request.query_params.get("offer_ids") or "").strip()
    if not raw:
        return Response({}, status=status.HTTP_200_OK)

    ids = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            ids.append(int(part))
        except Exception:
            continue

    if not ids:
        return Response({}, status=status.HTTP_200_OK)

    qs = SkillRequest.objects.filter(
        recipient=request.user,
        proposed_offer_id__in=ids,
    ).exclude(proposed_offer_id__isnull=True).order_by("-updated_at", "-id")

    best_by_offer: dict[int, SkillRequest] = {}
    for r in qs:
        oid = int(r.proposed_offer_id) if r.proposed_offer_id else None
        if not oid:
            continue
        current = best_by_offer.get(oid)
        if current is None:
            best_by_offer[oid] = r
            continue

        cur_active = current.status in ACTIVE_SKILL_REQUEST_STATUSES
        r_active = r.status in ACTIVE_SKILL_REQUEST_STATUSES
        if r_active and not cur_active:
            best_by_offer[oid] = r

    result = {str(oid): obj.status for oid, obj in best_by_offer.items()}
    return Response(result, status=status.HTTP_200_OK)
