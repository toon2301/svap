from django.urls import re_path

from accounts.consumers import NotificationConsumer
from swaply.ws_unknown_route import UnknownRouteConsumer

websocket_urlpatterns = [
    # Channels scope['path'] môže mať aj vedúce '/', preto povoľme oba tvary.
    re_path(r"^/?ws/notifications/$", NotificationConsumer.as_asgi()),
    # Záverečná cesta MUSÍ ostať posledná: zachytí čokoľvek, čo nezachytila žiadna predchádzajúca
    # (aj cestu s koncom riadka, preto `(?s)`), a hneď ju zatvorí. Bez nej router vyhodí výnimku (nález 236).
    re_path(r"(?s)^.*$", UnknownRouteConsumer.as_asgi()),
]
