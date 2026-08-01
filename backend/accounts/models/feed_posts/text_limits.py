"""Spoločné dĺžkové limity textov feedu."""

from django.core.exceptions import ValidationError

MAX_TEXT_LENGTH = 500


def ensure_text_within_limit(value: str, *, field_label: str) -> None:
    """Vynúť dĺžku textu nezávisle od DB backendu.

    Samotné ``CharField(max_length=500)`` stačiť nemôže: Postgres varchar(500)
    limit vynúti, ale SQLite (testy) ho ignoruje – kontrola len na úrovni DB by
    teda platila v produkcii a v testoch nie. ``full_clean()`` zámerne
    nevoláme – validoval by aj zvyšok modelu a zmenil by existujúce správanie
    (prázdny caption dnes padá na DB CheckConstraint, nie na ValidationError).
    """
    if value and len(value) > MAX_TEXT_LENGTH:
        raise ValidationError(
            f"{field_label} môže mať najviac {MAX_TEXT_LENGTH} znakov.",
            code="max_length",
        )


# Spätne kompatibilný alias – pôvodný názov bol privátny.
_ensure_text_within_limit = ensure_text_within_limit
