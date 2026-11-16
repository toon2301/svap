"""Zoznam používateľov, ktorí dali lajk položke portfólia (nález 262, rozhodnutie R20 A).

Len čítanie. Viditeľnosť položky je tá istá ako pri jej lajkovaní
(`_get_likeable_portfolio_item`); zoznam lajkujúcich skladá spoločný pomocník
`_likers_response` z Nástenky (súkromné, neaktívne a blokované účty skrýva pred
stránkovaním).
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from accounts.views.feed_likes import _likers_response
from swaply.rate_limiting import api_rate_limit

from .api_responses import portfolio_item_not_found
from .models import PortfolioItemLike
from .views import _get_likeable_portfolio_item


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def portfolio_item_likers_view(request, item_id: int):
    """Kto dal lajk položke portfólia. Len pre prihláseného, rovnako ako portfólio.

    Položka musí byť pre diváka viditeľná: neexistujúca, neverejný alebo
    neaktívny vlastník, blok medzi divákom a vlastníkom a titulná fotka čakajúca
    na schválenie dajú 404 bez prezradenia, že položka existuje (vlastník vidí
    všetko).
    """
    item = _get_likeable_portfolio_item(request, item_id)
    if item is None:
        return portfolio_item_not_found()
    return _likers_response(request, PortfolioItemLike.objects.filter(item=item))
