"""
Skill request detail + completion views (vyčlenené z skill_requests.py kvôli dĺžke).

Detail (GET/accept/reject/cancel) a dvojkrokové dokončenie (request/confirm).
Ostatné (list/status/proposed) ostávajú v skill_requests.py.
"""

import json
import logging

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..models import SkillRequest, SkillRequestStatus
from ..serializers import SkillRequestSerializer
from ..services.notifications import (
    create_skill_request_accepted_notification,
    create_skill_request_completed_notification,
    create_skill_request_completion_requested_notification,
    create_skill_request_rejected_notification,
)
from .skill_request_helpers import _skill_requests_cache_invalidate_for_user

logger = logging.getLogger(__name__)


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
            obj = SkillRequest.objects.select_for_update(of=("self",)).select_related(
                "offer", "requester", "recipient", "proposed_offer", "proposed_offer__user"
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
                SkillRequestStatus.TERMINATED,
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
            try:
                _skill_requests_cache_invalidate_for_user(obj.requester)
                _skill_requests_cache_invalidate_for_user(obj.recipient)
            except Exception:
                pass
            return Response(
                SkillRequestSerializer(obj, context={"request": request}).data,
                status=status.HTTP_200_OK,
            )

        # Accept/reject iba na pending žiadosti – ak už nie je pending, vráť jasnú chybu
        if action in {"accept", "reject"} and obj.status != SkillRequestStatus.PENDING:
            if obj.status == SkillRequestStatus.CANCELLED:
                return Response(
                    {"error": "Žiadosť bola zrušená používateľom."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if obj.status == SkillRequestStatus.REJECTED:
                return Response(
                    {"error": "Žiadosť už bola zamietnutá."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if obj.status == SkillRequestStatus.ACCEPTED:
                return Response(
                    {"error": "Žiadosť už bola prijatá."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"error": "Žiadosť už nie je čakajúca."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Stavové prechody
        accepted_notification = False
        rejected_notification = False
        conversation_result = None
        if action == "accept" and obj.status == SkillRequestStatus.PENDING:
            obj.status = SkillRequestStatus.ACCEPTED
            obj.save(update_fields=["status", "updated_at"])
            accepted_notification = True
        elif action == "reject" and obj.status == SkillRequestStatus.PENDING:
            obj.status = SkillRequestStatus.REJECTED
            obj.save(update_fields=["status", "updated_at"])
            rejected_notification = True
        elif action == "cancel" and obj.status == SkillRequestStatus.PENDING:
            obj.status = SkillRequestStatus.CANCELLED
            obj.save(update_fields=["status", "updated_at"])

        try:
            _skill_requests_cache_invalidate_for_user(obj.requester)
            _skill_requests_cache_invalidate_for_user(obj.recipient)
        except Exception:
            pass

        if accepted_notification:

            def notify_requester_about_acceptance():
                try:
                    create_skill_request_accepted_notification(
                        skill_request=obj,
                        actor=obj.recipient,
                    )
                except Exception:
                    logger.exception(
                        "Skill request accepted notification dispatch failed",
                        extra={
                            "skill_request_id": getattr(obj, "id", None),
                            "requester_id": getattr(obj, "requester_id", None),
                            "recipient_id": getattr(obj, "recipient_id", None),
                        },
                    )

            transaction.on_commit(notify_requester_about_acceptance)

        if rejected_notification:

            def notify_requester_about_rejection():
                try:
                    create_skill_request_rejected_notification(
                        skill_request=obj,
                        actor=obj.recipient,
                    )
                except Exception:
                    logger.exception(
                        "Skill request rejected notification dispatch failed",
                        extra={
                            "skill_request_id": getattr(obj, "id", None),
                            "requester_id": getattr(obj, "requester_id", None),
                            "recipient_id": getattr(obj, "recipient_id", None),
                        },
                    )

            transaction.on_commit(notify_requester_about_rejection)

        response_data = dict(
            SkillRequestSerializer(obj, context={"request": request}).data
        )
        if conversation_result:
            response_data.update(conversation_result)
        return Response(response_data, status=status.HTTP_200_OK)


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
            obj = SkillRequest.objects.select_for_update(of=("self",)).select_related(
                "offer", "requester", "recipient", "proposed_offer", "proposed_offer__user"
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

        should_notify_completion_request = False
        if obj.status == SkillRequestStatus.ACCEPTED:
            obj.status = SkillRequestStatus.COMPLETION_REQUESTED
            obj.save(update_fields=["status", "updated_at"])
            should_notify_completion_request = True
        elif obj.status == SkillRequestStatus.COMPLETION_REQUESTED:
            # Idempotent retry: if the state already changed but notification was missed,
            # repair it without creating duplicates or changing the workflow.
            should_notify_completion_request = True
        else:
            return Response(
                {"error": "Žiadosť musí byť prijatá (accepted)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            _skill_requests_cache_invalidate_for_user(obj.requester)
            _skill_requests_cache_invalidate_for_user(obj.recipient)
        except Exception:
            pass

        def notify_requester_about_completion_request():
            try:
                create_skill_request_completion_requested_notification(
                    skill_request=obj,
                    actor=obj.recipient,
                )
            except Exception:
                logger.exception(
                    "Skill request completion notification dispatch failed",
                    extra={
                        "skill_request_id": getattr(obj, "id", None),
                        "requester_id": getattr(obj, "requester_id", None),
                        "recipient_id": getattr(obj, "recipient_id", None),
                    },
                )

        if should_notify_completion_request:
            transaction.on_commit(notify_requester_about_completion_request)

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
            obj = SkillRequest.objects.select_for_update(of=("self",)).select_related(
                "offer", "requester", "recipient", "proposed_offer", "proposed_offer__user"
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

        try:
            _skill_requests_cache_invalidate_for_user(obj.requester)
            _skill_requests_cache_invalidate_for_user(obj.recipient)
        except Exception:
            pass

        def notify_recipient_about_confirmed_completion():
            try:
                create_skill_request_completed_notification(
                    skill_request=obj,
                    actor=obj.requester,
                )
            except Exception:
                logger.exception(
                    "Skill request completed notification dispatch failed",
                    extra={
                        "skill_request_id": getattr(obj, "id", None),
                        "requester_id": getattr(obj, "requester_id", None),
                        "recipient_id": getattr(obj, "recipient_id", None),
                    },
                )


        transaction.on_commit(notify_recipient_about_confirmed_completion)

        return Response(
            SkillRequestSerializer(obj, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
