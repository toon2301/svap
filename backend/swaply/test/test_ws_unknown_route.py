"""Neznáma cesta WebSocketu sa zatvorí hneď a bez výnimky (nález 236).

Bez záverečnej cesty `URLRouter` na cestu, ktorú aplikácia nepozná (napr. `/ws/unknown/`), vyhodí
`ValueError: No route found for path ...`. `daphne` to zapíše do logu ako "Exception inside application"
s celým výpisom a odpovie HTTP 500, a to aj neprihlásenému volajúcemu, takže ktokoľvek z internetu môže plniť
log a držať spojenie približne sekundu. Tieto testy stráži, aby sa neznáma cesta zatvorila hneď kódom 4404
a aby záverečná cesta nezachytila známu cestu `/ws/notifications/` (poradie ciest).
"""

import time

import pytest
from asgiref.sync import async_to_sync
from channels.routing import URLRouter
from channels.security.websocket import OriginValidator
from channels.testing import WebsocketCommunicator

from swaply.routing import websocket_urlpatterns
from swaply.ws_auth import JwtAuthMiddleware

ALLOWED_ORIGIN = b"https://allowed.example.com"
# Skutočné zatvorenie trvá milisekundy; pád cez výnimku trval približne sekundu.
MAX_REJECT_SECONDS = 1.0


def _app():
    """Produkčný reťazec WebSocketu (kontrola originu, prihlásenie, smerovanie) s jedným povoleným originom."""
    return OriginValidator(
        JwtAuthMiddleware(URLRouter(websocket_urlpatterns)),
        ["https://allowed.example.com"],
    )


async def _connect(path):
    """Pokus o spojenie; vracia `(prijaté, kód zatvorenia alebo odpoveď, trvanie v sekundách)`."""
    communicator = WebsocketCommunicator(
        _app(), path, headers=[(b"origin", ALLOWED_ORIGIN)]
    )
    started = time.perf_counter()
    connected, detail = await communicator.connect(timeout=MAX_REJECT_SECONDS)
    elapsed = time.perf_counter() - started
    await communicator.disconnect()
    return connected, detail, elapsed


@pytest.mark.parametrize(
    "path",
    [
        "/ws/unknown/",
        "/ws/",
        "/ws/notifications",
        "/ws/notifications/extra/",
        "/ws/notifications/%00",
        "/ws/new%0Aline/",
        "/unknown/",
    ],
)
def test_unknown_path_is_closed_immediately_without_an_exception(path):
    """Neznáma cesta sa neprijme a zatvorí sa kódom 4404; nevznikne výnimka z routeru."""
    connected, code, elapsed = async_to_sync(_connect)(path)

    assert connected is False
    assert code == 4404
    assert elapsed < MAX_REJECT_SECONDS


def test_known_path_is_not_taken_over_by_the_final_route():
    """Známa cesta ostáva pri svojom konzumentovi: bez tokenu ju odmietne prihlásenie (4401), nie záverečná cesta (4404)."""
    connected, code, _ = async_to_sync(_connect)("/ws/notifications/")

    assert connected is False
    assert code == 4401
