"""Termination endpoint for active skill requests."""

import logging

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..models import SkillRequest, SkillRequestStatus, SkillRequestTermination
from ..serializers import SkillRequestSerializer, SkillRequestTerminateSerializer
from ..services.notifications import create_skill_request_terminated_notification
from ..services.skill_request_transitions import lock_skill_request_for_transition
from ..services.user_blocks import BlockedUserInteractionError
from .skill_requests import _skill_requests_cache_invalidate_for_user

logger = logging.getLogger(__name__)

TERMINABLE_STATUSES = (
    SkillRequestStatus.ACCEPTED,
    SkillRequestStatus.COMPLETION_REQUESTED,
)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def skill_request_terminate_view(request, request_id: int):
    """
    POST /skill-requests/<id>/terminate/

    Either party can end an active exchange without marking it completed.
    """
    payload = SkillRequestTerminateSerializer(data=request.data)
    if not payload.is_valid():
        return Response(payload.errors, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        try:
            obj = lock_skill_request_for_transition(request_id=request_id)
        except (SkillRequest.DoesNotExist, BlockedUserInteractionError):
            return Response(
                {"error": "Žiadosť neexistuje."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user.id not in (obj.requester_id, obj.recipient_id):
            return Response(
                {"error": "Nemáš prístup."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if obj.status not in TERMINABLE_STATUSES:
            return Response(
                {"error": "Ukončiť môžeš iba aktívnu výmenu."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        termination = SkillRequestTermination.objects.create(
            skill_request=obj,
            terminated_by=request.user,
            reason=payload.validated_data["reason"],
            description=payload.validated_data.get("description", ""),
        )
        obj.status = SkillRequestStatus.TERMINATED
        obj.save(update_fields=["status", "updated_at"])

        try:
            _skill_requests_cache_invalidate_for_user(obj.requester)
            _skill_requests_cache_invalidate_for_user(obj.recipient)
        except Exception:
            pass

        def notify_other_party():
            try:
                create_skill_request_terminated_notification(
                    skill_request=obj,
                    termination=termination,
                    actor=request.user,
                )
            except Exception:
                logger.exception(
                    "Skill request termination notification dispatch failed",
                    extra={
                        "skill_request_id": getattr(obj, "id", None),
                        "requester_id": getattr(obj, "requester_id", None),
                        "recipient_id": getattr(obj, "recipient_id", None),
                    },
                )

        transaction.on_commit(notify_other_party)

        return Response(
            SkillRequestSerializer(obj, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
