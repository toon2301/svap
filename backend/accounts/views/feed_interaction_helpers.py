"""Spoločné drobnosti pre feed interakcie – viditeľnosť príspevku a 404.

Vyčlenené z ``feed_interactions``, aby ich mohli zdieľať lajky, komentáre,
označenia aj nahlásenia bez krížových importov medzi nimi.
"""

import logging

from rest_framework import status
from rest_framework.response import Response


from ..models import (
    FeedPost,
)
from .feed_posts import visible_feed_posts

logger = logging.getLogger(__name__)


def _get_visible_post(request, post_id: int) -> FeedPost | None:
    return (
        visible_feed_posts(
            request.user,
            queryset=FeedPost.objects.select_related("author"),
        )
        .filter(pk=post_id)
        .first()
    )


def _post_not_found() -> Response:
    return Response(
        {"error": "Prispevok nebol najdeny."}, status=status.HTTP_404_NOT_FOUND
    )


def _comment_not_found() -> Response:
    return Response(
        {"error": "Komentar nebol najdeny."}, status=status.HTTP_404_NOT_FOUND
    )
