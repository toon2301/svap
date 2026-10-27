"""Registrácia podpory HEIC/HEIF (pillow-heif) pri štarte aplikácie.

Fotky z iPhonu prichádzajú ako HEIC. Pillow ich otvorí až po `register_heif_opener()`, no validácia
`ImageField` v DRF (správy, avatar) beží skôr než akékoľvek spracovanie obrázka, ktoré opener
zaregistruje. Bez registrácie pri štarte preto HEIC prešiel len v procese, ktorý už predtým spracoval
iný obrázok, a inak zlyhal s „Uploadujte prosím obrázok…“ (nález 200).
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def register_heif_support() -> bool:
    """Zaregistruje HEIC/HEIF do Pillow (opakované volanie nič nepokazí).

    Vráti True, ak je podpora dostupná. Ak `pillow-heif` chýba alebo sa nenačíta, štart aplikácie
    nezhodí: zaloguje varovanie a vráti False (HEIC sa vtedy odmietne ako neplatný obrázok).
    """
    try:
        from pillow_heif import register_heif_opener

        register_heif_opener()
    except Exception as exc:
        logger.warning("HEIC/HEIF support is unavailable: pillow-heif could not be registered (%s).", exc)
        return False
    return True
