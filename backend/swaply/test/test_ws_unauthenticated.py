"""
Neprihlásené WebSocket spojenie sa odmietne okamžite (nález 9).

Nález tvrdil, že spojenie bez tokenu (`missing_token`) server odmietne až po približne 31 s, takže by sa dalo
zahltiť neautentifikovanými spojeniami. Lokálne meranie to nepotvrdilo: daphne odpovie `403` za niekoľko
milisekúnd (priamo aj cez proxy Next 14 a Next 16). Tieto testy stráži, aby to tak ostalo: spojenie sa nesmie
prijať ani držať, kým sa zistí, kto je volajúci. Zvyšok bezpečnosti WebSocketu je v `test_ws_security.py`.
"""

import time

from asgiref.sync import async_to_sync
from channels.routing import URLRouter
from channels.security.websocket import OriginValidator
from channels.testing import WebsocketCommunicator

from swaply.routing import websocket_urlpatterns
from swaply.ws_auth import JwtAuthMiddleware

ALLOWED_ORIGIN = b"https://allowed.example.com"
# Rozumná horná hranica: skutočné odmietnutie trvá milisekundy, nález hovoril o desiatkach sekúnd.
MAX_REJECT_SECONDS = 1.0


def _app():
    """Produkčný reťazec WebSocketu (kontrola originu, prihlásenie, smerovanie) s jedným povoleným originom."""
    return OriginValidator(
        JwtAuthMiddleware(URLRouter(websocket_urlpatterns)),
        ["https://allowed.example.com"],
    )


async def _connect(path, cookie=None):
    """Pokus o spojenie; vracia `(prijaté, kód zatvorenia alebo odpoveď, trvanie v sekundách)`."""
    headers = [(b"origin", ALLOWED_ORIGIN)]
    if cookie:
        headers.append((b"cookie", cookie))
    communicator = WebsocketCommunicator(_app(), path, headers=headers)
    started = time.perf_counter()
    connected, detail = await communicator.connect(timeout=MAX_REJECT_SECONDS)
    elapsed = time.perf_counter() - started
    await communicator.disconnect()
    return connected, detail, elapsed


def test_connection_without_a_token_is_rejected_immediately():
    """Bez cookie s tokenom sa spojenie odmietne kódom 4401 a nikdy sa neprijme."""
    connected, code, elapsed = async_to_sync(_connect)("/ws/notifications/")

    assert connected is False
    assert code == 4401
    assert elapsed < MAX_REJECT_SECONDS


def test_connection_with_an_invalid_token_is_rejected_immediately():
    """Neplatný token sa odmietne rovnako rýchlo ako chýbajúci."""
    connected, code, elapsed = async_to_sync(_connect)(
        "/ws/notifications/", cookie=b"access_token=not.a.valid.jwt"
    )

    assert connected is False
    assert code == 4401
    assert elapsed < MAX_REJECT_SECONDS


def test_connection_with_an_empty_token_is_rejected_immediately():
    """Prázdna hodnota cookie je to isté ako chýbajúci token."""
    connected, code, elapsed = async_to_sync(_connect)(
        "/ws/notifications/", cookie=b"access_token="
    )

    assert connected is False
    assert code == 4401
    assert elapsed < MAX_REJECT_SECONDS
