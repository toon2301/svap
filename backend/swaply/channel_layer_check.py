"""
Startup kontrola konfigurácie Django Channels channel layer.

Pri split HTTP/WS deploymente (Railway: APP_SERVER_MODE=http vs ws) musí byť
channel layer zdieľaný cez Redis. `InMemoryChannelLayer` je per-proces, takže
`notify_user(...)` volaný z HTTP procesu by nikdy nedoručil event do WS procesu
a real-time notifikácie by ticho zlyhávali.

Kontrola len LOGUJE ERROR (nezhadzuje proces), aby nezablokovala štart appky.
"""

from __future__ import annotations

import logging

from django.conf import settings

logger = logging.getLogger("swaply")

_IN_MEMORY_BACKEND = "channels.layers.InMemoryChannelLayer"


def is_in_memory_channel_layer() -> bool:
    layers = getattr(settings, "CHANNEL_LAYERS", None) or {}
    default = layers.get("default") or {}
    return str(default.get("BACKEND", "")) == _IN_MEMORY_BACKEND


def warn_if_insecure_channel_layer() -> None:
    """Zaloguj ERROR ak produkcia (DEBUG=False) beží na InMemoryChannelLayer."""
    if getattr(settings, "DEBUG", False):
        return
    if not is_in_memory_channel_layer():
        return
    logger.error(
        "CHANNEL_LAYERS používa InMemoryChannelLayer pri DEBUG=False. Pri split "
        "HTTP/WS deploymente sa WS notifikácie medzi procesmi nedoručia. Nastav "
        "CHANNELS_REDIS_URL alebo REDIS_URL pre RedisChannelLayer."
    )
