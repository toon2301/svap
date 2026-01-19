"""
ASGI config for swaply project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'swaply.settings')

# HTTP aplikácia (Django)
django_asgi_app = get_asgi_application()

try:
    from channels.routing import ProtocolTypeRouter, URLRouter
    from swaply.routing import websocket_urlpatterns
    from swaply.ws_auth import JwtAuthMiddleware

    application = ProtocolTypeRouter(
        {
            "http": django_asgi_app,
            "websocket": JwtAuthMiddleware(URLRouter(websocket_urlpatterns)),
        }
    )
except Exception:
    # Fail-open: ak Channels nie je dostupné, nech aspoň beží HTTP.
    application = django_asgi_app
