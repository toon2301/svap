"""
Povolené Origin hodnoty pre WebSocket spojenia (CSWSH ochrana).

WS handshake z prehliadača posiela `Origin` hlavičku = origin stránky, ktorá
spojenie otvára (teda frontend doména), nie backend host. Preto sa povolené
originy odvodzujú od rovnakých frontend originov, ktoré už používa REST CORS
(`CORS_ALLOWED_ORIGINS` + `FRONTEND_ORIGIN` + WS env premenné), a NIE od
`ALLOWED_HOSTS` (tie obsahujú backend hosty a v cross-site režime by legitímne
FE spojenie odmietli).

Funkcia číta hodnoty z `django.conf.settings` až pri volaní, takže rešpektuje
aj produkčné prepisy (`swaply.settings_production` prepisuje CORS_ALLOWED_ORIGINS
po načítaní base settings).
"""

from __future__ import annotations

import logging
import os
from urllib.parse import urlparse

from django.conf import settings

logger = logging.getLogger("swaply")

# Env premenné, ktoré môžu obsahovať explicitný frontend / WS origin.
_FRONTEND_ORIGIN_ENV_NAMES = (
    "FRONTEND_ORIGIN",
    "BACKEND_WS_ORIGIN",
    "NEXT_PUBLIC_BACKEND_WS_ORIGIN",
)


def _normalize_origin(value: str | None) -> str | None:
    """Vráti origin v tvare `scheme://host[:port]` alebo None ak je nevalidný."""
    raw = (value or "").strip().rstrip("/")
    if not raw:
        return None
    parsed = urlparse(raw)
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def get_websocket_allowed_origins() -> list[str]:
    """
    Zostav zoznam povolených WS originov pre `channels` OriginValidator.

    Zdroje (v poradí): CORS_ALLOWED_ORIGINS, FRONTEND_ORIGIN / *_WS_ORIGIN env,
    a v DEBUG režime lokálne dev originy ako fallback.
    """
    origins: list[str] = []

    def _add(value: str | None) -> None:
        normalized = _normalize_origin(value)
        if normalized and normalized not in origins:
            origins.append(normalized)

    for value in getattr(settings, "CORS_ALLOWED_ORIGINS", []) or []:
        _add(value)

    for env_name in _FRONTEND_ORIGIN_ENV_NAMES:
        _add(os.getenv(env_name))

    if getattr(settings, "DEBUG", False):
        for value in ("http://localhost:3000", "http://127.0.0.1:3000"):
            _add(value)

    if not origins:
        # Prázdny zoznam by viedol k odmietnutiu VŠETKÝCH WS spojení. To je
        # bezpečné (fail-closed), ale takmer iste ide o chybnú konfiguráciu.
        logger.error(
            "WebSocket allowed origins je prázdny – všetky WS spojenia budú "
            "odmietnuté. Nastav CORS_ALLOWED_ORIGINS alebo FRONTEND_ORIGIN."
        )

    return origins
