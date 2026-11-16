"""Zoznam používateľov, ktorí dali lajk ponuke (nález 262, rozhodnutie R20 A).

Len čítanie. Zoznam lajkujúcich skladá spoločný pomocník `_likers_response`
z Nástenky (súkromné, neaktívne a blokované účty skrýva pred stránkovaním),
tu sa len rozhoduje, či ponuku smie divák vôbec vidieť.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..models import OfferedSkill, OfferedSkillLike
from ..services.offer_visibility import offer_hidden_from_user
from .feed_likes import _likers_response


def _offer_not_found() -> Response:
    """404 s rovnakým telom ako pri lajku ponuky, nech neprezradí existenciu."""
    return Response(
        {"error": "Ponuka nebola najdena"}, status=status.HTTP_404_NOT_FOUND
    )


@api_view(["GET"])
@permission_classes([AllowAny])
@api_rate_limit
def offer_likers_view(request, skill_id: int):
    """Kto dal lajk ponuke. Verejné rovnako ako ponuka vo vyhľadávaní.

    Ponuka musí byť pre diváka viditeľná: skrytá ponuka, neverejný vlastník
    alebo blok medzi divákom a vlastníkom dajú 404 (vlastník ju vidí vždy).
    `offer_hidden_from_user` nekontroluje, či je vlastník aktívny, preto sa
    tu overuje zvlášť, rovnako ako vo vyhľadávaní (`searchable_user_q`).
    """
    offer = OfferedSkill.objects.select_related("user").filter(id=skill_id).first()
    if (
        offer is None
        or not offer.user.is_active
        or offer_hidden_from_user(offer, request.user)
    ):
        return _offer_not_found()
    return _likers_response(request, OfferedSkillLike.objects.filter(offer=offer))
