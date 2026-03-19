"""
Skill request (Žiadosti) API views.
"""

import json
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
    Notification,
    NotificationType,
)
from ..models import Review
from ..serializers import (
    SkillRequestCreateSerializer,
    SkillRequestSerializer,
    NotificationSerializer,
)
from typing import Optional

from ..realtime import notify_user
from .notifications import _unread_cache_key, UNREAD_COUNT_CACHE_TTL_SECONDS

MAX_SKILL_REQUESTS = 100
SKILL_REQUESTS_CACHE_TTL_SECONDS = int(os.getenv("SKILL_REQUESTS_CACHE_TTL_SECONDS", "120") or "120")


def _skill_requests_cache_key(user_id: int, status_param: str | None) -> str:
    s = (status_param or "").strip().lower()
    return f"skill_requests_v1:{int(user_id)}:{s}"


_SKILLREQ_STATUS_KEYS: tuple[str, ...] = (
    "",
    "pending",
    "accepted,completion_requested",
    "completed",
    "cancelled,rejected",
)


def _compute_skill_requests_payload(*, viewer, request, status_param: str | None):
    received = SkillRequest.objects.filter(
        recipient=viewer,
        hidden_by_recipient=False,
    ).select_related("requester", "recipient", "offer", "offer__user")
    sent = SkillRequest.objects.filter(
        requester=viewer,
        hidden_by_requester=False,
    ).select_related("requester", "recipient", "offer", "offer__user")

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

    received_ser = SkillRequestSerializer(
        received_list, many=True, context={"request": request, "reviewed_offer_ids": reviewed_offer_ids}
    )
    sent_ser = SkillRequestSerializer(
        sent_list, many=True, context={"request": request, "reviewed_offer_ids": reviewed_offer_ids}
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


def _notify_unread_count(user_id: int, notif: Optional[Notification] = None) -> None:
    try:
        unread = Notification.objects.filter(
            user_id=user_id,
            type=NotificationType.SKILL_REQUEST,
            is_read=False,
        ).count()
    except Exception:
        unread = 0
    try:
        cache.set(
            _unread_cache_key(user_id, NotificationType.SKILL_REQUEST),
            int(unread),
            timeout=UNREAD_COUNT_CACHE_TTL_SECONDS,
        )
    except Exception:
        pass

    event = {
        "type": "skill_request",
        "unread_count": unread,
    }
    if notif is not None:
        try:
            event["notification"] = NotificationSerializer(notif).data
        except Exception:
            pass

    notify_user(user_id, event)


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
    if not offer:
        return Response(
            {"error": "Karta neexistuje."}, status=status.HTTP_400_BAD_REQUEST
        )

    recipient = offer.user

    created = False
    try:
        with transaction.atomic():
            try:
                obj = SkillRequest.objects.select_related(
                    "offer", "requester", "recipient"
                ).get(requester=request.user, offer=offer)
                # Re-open pri zrušení / zamietnutí
                if obj.status in (
                    SkillRequestStatus.CANCELLED,
                    SkillRequestStatus.REJECTED,
                ):
                    obj.status = SkillRequestStatus.PENDING
                    obj.recipient = recipient
                    # Ak bola žiadosť predtým „skrytá“ (vymazaná zo zoznamu),
                    # pri opätovnom odoslaní ju musíme znovu zviditeľniť obom stranám.
                    obj.hidden_by_requester = False
                    obj.hidden_by_recipient = False
                    obj.save(
                        update_fields=[
                            "status",
                            "recipient",
                            "hidden_by_requester",
                            "hidden_by_recipient",
                            "updated_at",
                        ]
                    )
                else:
                    return Response(
                        SkillRequestSerializer(obj, context={"request": request}).data,
                        status=status.HTTP_200_OK,
                    )
            except SkillRequest.DoesNotExist:
                try:
                    obj = SkillRequest.objects.create(
                        requester=request.user,
                        recipient=recipient,
                        offer=offer,
                        status=SkillRequestStatus.PENDING,
                    )
                    created = True
                except IntegrityError:
                    # Unique constraint race: (requester, offer) already created by a parallel request.
                    obj = SkillRequest.objects.select_related(
                        "offer", "requester", "recipient"
                    ).get(requester=request.user, offer=offer)
                    return Response(
                        SkillRequestSerializer(obj, context={"request": request}).data,
                        status=status.HTTP_200_OK,
                    )
    except IntegrityError:
        # Safety net: if a DB-level race happens outside the inner block, return existing request.
        obj = SkillRequest.objects.select_related(
            "offer", "requester", "recipient"
        ).get(requester=request.user, offer=offer)
        return Response(
            SkillRequestSerializer(obj, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    # Notifikácia pre vlastníka karty
    try:
        if offer.is_seeking:
            title = "Nová žiadosť"
            body = f"{request.user.display_name} ponúka pomoc s kartou: {offer.subcategory or offer.category}"
        else:
            title = "Nová žiadosť"
            body = f"{request.user.display_name} má záujem o ponuku: {offer.subcategory or offer.category}"

        notif = Notification.objects.create(
            user=recipient,
            type=NotificationType.SKILL_REQUEST,
            title=title,
            body=body,
            data={
                "skill_request_id": obj.id,
                "offer_id": offer.id,
                "offer_is_seeking": bool(offer.is_seeking),
                "from_user_id": request.user.id,
            },
            skill_request=obj,
        )
        _notify_unread_count(recipient.id, notif)
    except Exception:
        # fail-open: žiadosť je dôležitejšia ako notifikácia
        pass

    # Invalidate caches for both participants
    try:
        _skill_requests_cache_refresh_for_user(request.user, request)
        _skill_requests_cache_refresh_for_user(recipient, request)
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

    qs = SkillRequest.objects.filter(requester=request.user, offer_id__in=ids)
    result = {str(r.offer_id): r.status for r in qs}
    return Response(result, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_request_detail_view(request, request_id: int):
    """
    PATCH /skill-requests/<id>/
    Body: { action: 'accept'|'reject'|'cancel'|'hide' }
    """
    with transaction.atomic():
        try:
            obj = SkillRequest.objects.select_for_update().select_related(
                "offer", "requester", "recipient"
            ).get(id=request_id)
        except SkillRequest.DoesNotExist:
            return Response(
                {"error": "Žiadosť neexistuje."}, status=status.HTTP_404_NOT_FOUND
            )

        # AuthZ
        if request.user.id not in (obj.requester_id, obj.recipient_id):
            return Response(
                {"error": "Nemáš prístup."}, status=status.HTTP_403_FORBIDDEN
            )

        raw_action = (
            request.data.get("action")
            if hasattr(request, "data") and request.data
            else None
        )
        if raw_action is None and getattr(request, "_request", None):
            try:
                body = getattr(request._request, "body", b"")
                if body:
                    data = json.loads(
                        body.decode("utf-8") if isinstance(body, bytes) else body
                    )
                    raw_action = data.get("action")
            except Exception:
                pass
        action = (
            (raw_action or "").strip().lower()
            if isinstance(raw_action, str)
            else ""
        )
        if not raw_action or action not in {"accept", "reject", "cancel", "hide"}:
            return Response(
                {"error": "Neplatná akcia."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Recipient môže accept/reject, requester môže cancel
        if action in {"accept", "reject"} and request.user.id != obj.recipient_id:
            return Response(
                {"error": "Nemáš oprávnenie."}, status=status.HTTP_403_FORBIDDEN
            )
        if action == "cancel" and request.user.id != obj.requester_id:
            return Response(
                {"error": "Nemáš oprávnenie."}, status=status.HTTP_403_FORBIDDEN
            )
        # Hide môže urobiť len účastník žiadosti (už overené) a len na svojej strane

        if action == "hide":
            # Bezpečnosť: dovoľ len pre odmietnuté alebo zrušené.
            if obj.status not in (
                SkillRequestStatus.REJECTED,
                SkillRequestStatus.CANCELLED,
            ):
                return Response(
                    {
                        "error": "Žiadosť môžeš skryť len ak je zrušená alebo zamietnutá."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if request.user.id == obj.requester_id:
                if not obj.hidden_by_requester:
                    obj.hidden_by_requester = True
                    obj.save(update_fields=["hidden_by_requester", "updated_at"])
            elif request.user.id == obj.recipient_id:
                if not obj.hidden_by_recipient:
                    obj.hidden_by_recipient = True
                    obj.save(update_fields=["hidden_by_recipient", "updated_at"])
            # Refresh caches after hide
            try:
                _skill_requests_cache_refresh_for_user(obj.requester, request)
                _skill_requests_cache_refresh_for_user(obj.recipient, request)
            except Exception:
                pass
            return Response(
                SkillRequestSerializer(obj, context={"request": request}).data,
                status=status.HTTP_200_OK,
            )

        # Stavové prechody
        if action == "accept" and obj.status == SkillRequestStatus.PENDING:
            obj.status = SkillRequestStatus.ACCEPTED
            obj.save(update_fields=["status", "updated_at"])
        elif action == "reject" and obj.status == SkillRequestStatus.PENDING:
            obj.status = SkillRequestStatus.REJECTED
            obj.save(update_fields=["status", "updated_at"])
        elif action == "cancel" and obj.status == SkillRequestStatus.PENDING:
            obj.status = SkillRequestStatus.CANCELLED
            obj.save(update_fields=["status", "updated_at"])

        try:
            _skill_requests_cache_refresh_for_user(obj.requester, request)
            _skill_requests_cache_refresh_for_user(obj.recipient, request)
        except Exception:
            pass
        else:
            # nič nemeníme, ale vrátime aktuálny stav
            return Response(
                SkillRequestSerializer(obj, context={"request": request}).data,
                status=status.HTTP_200_OK,
            )

        # Notifikácia pre druhú stranu (prijatie/zamietnutie)
        try:
            if obj.status == SkillRequestStatus.ACCEPTED:
                notif_type = NotificationType.SKILL_REQUEST_ACCEPTED
                title = "Žiadosť prijatá"
                body = f"{obj.recipient.display_name} prijal/a tvoju žiadosť."
                notif_user = obj.requester
            elif obj.status == SkillRequestStatus.REJECTED:
                notif_type = NotificationType.SKILL_REQUEST_REJECTED
                title = "Žiadosť zamietnutá"
                body = f"{obj.recipient.display_name} zamietol/a tvoju žiadosť."
                notif_user = obj.requester
            else:
                notif_type = NotificationType.SKILL_REQUEST_CANCELLED
                title = "Žiadosť zrušená"
                body = f"{obj.requester.display_name} zrušil/a žiadosť."
                notif_user = obj.recipient

            notif = Notification.objects.create(
                user=notif_user,
                type=notif_type,
                title=title,
                body=body,
                data={
                    "skill_request_id": obj.id,
                    "offer_id": obj.offer_id,
                },
                skill_request=obj,
            )
            # Badge aktualizujeme len pre SKILL_REQUEST typ (počet „neprečítaných žiadostí“)
            if notif_user and notif_user.id:
                _notify_unread_count(
                    notif_user.id,
                    notif if notif.type == NotificationType.SKILL_REQUEST else None,
                )
        except Exception:
            pass

            return Response(
                SkillRequestSerializer(obj, context={"request": request}).data,
                status=status.HTTP_200_OK,
            )
        return Response(
            SkillRequestSerializer(obj, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_request_request_completion_view(request, request_id: int):
    """
    POST /skill-requests/<id>/request-completion/

    Iba recipient (poskytovateľ) môže označiť spoluprácu ako dokončovanú.
    Povolené iba ak status == accepted.
    """
    with transaction.atomic():
        try:
            obj = SkillRequest.objects.select_for_update().select_related(
                "offer", "requester", "recipient"
            ).get(id=request_id)
        except SkillRequest.DoesNotExist:
            return Response(
                {"error": "Žiadosť neexistuje."}, status=status.HTTP_404_NOT_FOUND
            )

        # AuthZ: iba recipient (poskytovateľ)
        if request.user.id != obj.recipient_id:
            return Response(
                {"error": "Nemáš oprávnenie."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Stavová podmienka: iba z accepted
        if obj.status != SkillRequestStatus.ACCEPTED:
            return Response(
                {"error": "Žiadosť musí byť prijatá (accepted)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        obj.status = SkillRequestStatus.COMPLETION_REQUESTED
        obj.save(update_fields=["status", "updated_at"])

        return Response(
            SkillRequestSerializer(obj, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_request_confirm_completion_view(request, request_id: int):
    """
    POST /skill-requests/<id>/confirm-completion/

    Iba requester môže potvrdiť dokončenie spolupráce.
    Povolené iba ak status == completion_requested.
    """
    with transaction.atomic():
        try:
            obj = SkillRequest.objects.select_for_update().select_related(
                "offer", "requester", "recipient"
            ).get(id=request_id)
        except SkillRequest.DoesNotExist:
            return Response(
                {"error": "Žiadosť neexistuje."}, status=status.HTTP_404_NOT_FOUND
            )

        # AuthZ: iba requester
        if request.user.id != obj.requester_id:
            return Response(
                {"error": "Nemáš oprávnenie."}, status=status.HTTP_403_FORBIDDEN
            )

        # Stavová podmienka: iba z completion_requested
        if obj.status != SkillRequestStatus.COMPLETION_REQUESTED:
            return Response(
                {"error": "Žiadosť musí mať stav completion_requested."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        obj.status = SkillRequestStatus.COMPLETED
        obj.save(update_fields=["status", "updated_at"])

        return Response(
            SkillRequestSerializer(obj, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
