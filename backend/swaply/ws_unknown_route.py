"""Záverečná cesta WebSocketu pre cesty, ktoré aplikácia nepozná (nález 236).

Bez nej `URLRouter` na neznámu cestu vyhodí `ValueError: No route found for path ...`. `daphne` to zapíše do
logu ako "Exception inside application" s celým výpisom a odpovie HTTP 500, a to aj neprihlásenému volajúcemu.
Tento konzument spojenie zatvorí hneď a bez výnimky.
"""

from channels.generic.websocket import AsyncWebsocketConsumer

# Vlastný kód zatvorenia z rozsahu 4000 až 4999, obdoba HTTP 404 (rovnako ako 4401 pri neprihlásenom spojení).
UNKNOWN_ROUTE_CLOSE_CODE = 4404


class UnknownRouteConsumer(AsyncWebsocketConsumer):
    """Konzument záverečnej cesty: každé spojenie hneď zatvorí."""

    async def connect(self):
        """Odmietni spojenie kódom 4404."""
        # Zatvorenie pred accept(): handshake sa neprijme, spojenie sa nedrží ani chvíľu.
        await self.close(code=UNKNOWN_ROUTE_CLOSE_CODE)
