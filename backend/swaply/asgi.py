"""
ASGI config for swaply project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
import logging

from django.core.asgi import get_asgi_application

logger = logging.getLogger(__name__)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "swaply.settings")

# HTTP aplikácia (Django)
django_asgi_app = get_asgi_application()

try:
    from channels.routing import ProtocolTypeRouter, URLRouter
    from swaply.routing import websocket_urlpatterns
    from swaply.ws_auth import JwtAuthMiddleware

    logger.info("✅ Channels loaded successfully - WebSocket support enabled")
    logger.info(f"📡 WebSocket routes: {len(websocket_urlpatterns)} pattern(s)")

    application = ProtocolTypeRouter(
        {
            "http": django_asgi_app,
            "websocket": JwtAuthMiddleware(URLRouter(websocket_urlpatterns)),
        }
    )
    logger.info("🚀 ASGI application initialized with HTTP + WebSocket support")
except Exception as e:
    # Fail-open: ak Channels nie je dostupné, nech aspoň beží HTTP.
    logger.error(f"❌ Channels failed to load: {e}", exc_info=True)
    logger.warning("⚠️  Falling back to HTTP-only (no WebSocket support)")
    application = django_asgi_app
