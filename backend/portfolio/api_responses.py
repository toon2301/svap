"""Zdieľané API odpovede pre portfolio views.

User-facing 404 hlášky boli duplicitne definované vo views.py aj image_views.py –
jediná definícia bráni rozídeniu textov medzi endpointmi.
"""

from rest_framework import status
from rest_framework.response import Response


def user_not_found() -> Response:
    return Response(
        {"error": "Pouzivatel nebol najdeny"},
        status=status.HTTP_404_NOT_FOUND,
    )


def portfolio_item_not_found() -> Response:
    return Response(
        {"error": "Polozka portfolia nebola najdena"},
        status=status.HTTP_404_NOT_FOUND,
    )
