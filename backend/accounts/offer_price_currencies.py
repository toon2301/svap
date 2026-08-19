"""Meny podporované cenami ponúk a uložených sledovaní."""

from typing import Any


SUPPORTED_OFFER_PRICE_CURRENCIES = ("€", "Kč", "$", "zł", "Ft")


def normalize_offer_price_currency(value: Any) -> str:
    """Vráť podporovanú menu bez okolitých medzier alebo prázdnu hodnotu."""
    normalized = str(value or "").strip()
    return normalized if normalized in SUPPORTED_OFFER_PRICE_CURRENCIES else ""
