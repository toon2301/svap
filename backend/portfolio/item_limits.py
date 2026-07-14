"""Limit počtu položiek portfólia (vyčlenené z views.py kvôli 500-riadkovému limitu).

Strop MAX_PORTFOLIO_ITEMS ostáva vo views.py (jediný zdroj pravdy + spätná
kompatibilita s testami, ktoré ho patchujú cez portfolio.views); helpery tu
dostávajú limit ako parameter.
"""

from django.contrib.auth import get_user_model
from rest_framework import status

from .api_responses import error_response
from .models import PortfolioItem

User = get_user_model()


def lock_portfolio_owner(user) -> None:
    """Zamkne riadok vlastníka – serializuje súbežné create-y toho istého používateľa.

    Volať v transaction.atomic. Zámok na User riadku (rodič položiek) namiesto
    select_for_update na položkách, lebo pri 0 položkách by nebolo čo zamknúť
    (phantom insert by obišiel zámok). Rovnaká filozofia ako zámok PortfolioItem
    (rodiča obrázkov) pri limite fotiek v image_views.
    """
    User.objects.select_for_update().only("id").get(pk=user.pk)


def reached_portfolio_items_limit(user, limit: int) -> bool:
    return PortfolioItem.objects.filter(owner=user).count() >= limit


def portfolio_items_limit_response(limit: int):
    return error_response(
        f"Dosiahol si maximalny pocet poloziek portfolia ({limit}).",
        code="portfolio_items_limit_reached",
        status_code=status.HTTP_400_BAD_REQUEST,
    )
