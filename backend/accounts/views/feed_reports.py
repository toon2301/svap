"""Nahlásenie príspevku na nástenke.

Vyčlenené z ``feed_interactions`` – správanie nezmenené. Vzor a názov sedia
s ``photo_reports``/``user_reports``.
"""

import logging

from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..models import (
    FeedPostReport,
)
from .photo_reports import _validate_report_payload
from .feed_interaction_helpers import _get_visible_post, _post_not_found

logger = logging.getLogger(__name__)


def _report_duplicate_response() -> Response:
    return Response(
        {"error": "Tento prispevok si uz nahlasil."},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def feed_post_report_view(request, post_id: int):
    """Nahlásenie príspevku – bez notifikácie (len admin queue), 1× na usera."""
    post = _get_visible_post(request, post_id)
    if post is None:
        return _post_not_found()

    reason, description, error_response = _validate_report_payload(request)
    if error_response is not None:
        return error_response

    if FeedPostReport.objects.filter(post=post, reported_by=request.user).exists():
        return _report_duplicate_response()

    try:
        with transaction.atomic():
            FeedPostReport.objects.create(
                post=post,
                reported_by=request.user,
                reason=reason,
                description=description,
            )
    except IntegrityError:
        # Race dvoch requestov – UniqueConstraint je posledná poistka.
        return _report_duplicate_response()

    return Response(
        {"message": "Prispevok bol nahlaseny."}, status=status.HTTP_201_CREATED
    )
