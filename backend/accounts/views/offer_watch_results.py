"""Read-only live results for the current user's saved offer watches."""

from django.utils.translation import gettext_lazy as _
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..offer_serializers import OfferedSkillSerializer
from ..services.offer_watch_matching import matching_offers_for_watch
from ..services.offer_watches import OfferWatchNotFound, get_offer_watch
from .skill_helpers import _skills_list_context, _skills_list_queryset


class OfferWatchResultsPagination(CursorPagination):
    """Stable batches for a live list where cards may appear or disappear."""

    page_size = 10
    ordering = ("-created_at", "-id")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def offer_watch_results_view(request, watch_id: int):
    """Return current visible matches for one watch owned by the caller."""

    try:
        watch = get_offer_watch(user=request.user, watch_id=watch_id)
    except OfferWatchNotFound:
        return Response(
            {
                "code": "offer_watch_not_found",
                "error": _("Sledovanie nebolo nájdené."),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    matches = _skills_list_queryset(matching_offers_for_watch(watch=watch))
    paginator = OfferWatchResultsPagination()
    page = paginator.paginate_queryset(
        matches,
        request,
        view=offer_watch_results_view,
    )
    offer_ids = [offer.id for offer in page]
    serializer = OfferedSkillSerializer(
        page,
        many=True,
        context={
            "request": request,
            **_skills_list_context(request, offer_ids),
        },
    )
    return paginator.get_paginated_response(serializer.data)
