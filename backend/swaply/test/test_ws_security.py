"""
Testy WebSocket bezpečnosti:
- get_websocket_allowed_origins (BOD 1 – CSWSH)
- OriginValidator wiring (origin sa overuje pred autentifikáciou)
- channel layer startup kontrola (BOD 4)
"""

import logging
import os
from unittest.mock import patch

from asgiref.sync import async_to_sync
from django.test import override_settings

from swaply.channel_layer_check import (
    is_in_memory_channel_layer,
    warn_if_insecure_channel_layer,
)
from swaply.ws_origins import _normalize_origin, get_websocket_allowed_origins

_NO_FRONTEND_ENV = {
    "FRONTEND_ORIGIN": "",
    "BACKEND_WS_ORIGIN": "",
    "NEXT_PUBLIC_BACKEND_WS_ORIGIN": "",
}


# --------------------------------------------------------------------------- #
# get_websocket_allowed_origins
# --------------------------------------------------------------------------- #
def test_normalize_origin_strips_trailing_slash_and_rejects_invalid():
    assert _normalize_origin("https://fe.example.com/") == "https://fe.example.com"
    assert _normalize_origin("https://fe.example.com:8443") == "https://fe.example.com:8443"
    assert _normalize_origin("") is None
    assert _normalize_origin("not-a-url") is None
    assert _normalize_origin(None) is None


def test_allowed_origins_derived_from_cors():
    with override_settings(
        CORS_ALLOWED_ORIGINS=["https://fe.example.com/", "https://fe.example.com/"],
        DEBUG=False,
    ), patch.dict(os.environ, _NO_FRONTEND_ENV, clear=False):
        origins = get_websocket_allowed_origins()
    assert origins == ["https://fe.example.com"]


def test_allowed_origins_includes_frontend_env_vars():
    with override_settings(CORS_ALLOWED_ORIGINS=[], DEBUG=False), patch.dict(
        os.environ,
        {**_NO_FRONTEND_ENV, "NEXT_PUBLIC_BACKEND_WS_ORIGIN": "https://ws.example.com"},
        clear=False,
    ):
        origins = get_websocket_allowed_origins()
    assert "https://ws.example.com" in origins


def test_allowed_origins_adds_localhost_in_debug():
    with override_settings(CORS_ALLOWED_ORIGINS=[], DEBUG=True), patch.dict(
        os.environ, _NO_FRONTEND_ENV, clear=False
    ):
        origins = get_websocket_allowed_origins()
    assert "http://localhost:3000" in origins
    assert "http://127.0.0.1:3000" in origins


def test_allowed_origins_empty_logs_error_in_production():
    with override_settings(CORS_ALLOWED_ORIGINS=[], DEBUG=False), patch.dict(
        os.environ, _NO_FRONTEND_ENV, clear=False
    ), patch("swaply.ws_origins.logger") as mock_logger:
        origins = get_websocket_allowed_origins()
    assert origins == []
    assert mock_logger.error.called


# --------------------------------------------------------------------------- #
# OriginValidator wiring – origin sa overuje PRED autentifikáciou
# --------------------------------------------------------------------------- #
def _build_ws_app(allowed_origins):
    from channels.routing import URLRouter
    from channels.security.websocket import OriginValidator

    from swaply.routing import websocket_urlpatterns
    from swaply.ws_auth import JwtAuthMiddleware

    return OriginValidator(
        JwtAuthMiddleware(URLRouter(websocket_urlpatterns)),
        allowed_origins,
    )


async def _try_ws_connect(app, origin: bytes):
    from channels.testing import WebsocketCommunicator

    communicator = WebsocketCommunicator(
        app, "/ws/notifications/", headers=[(b"origin", origin)]
    )
    connected, detail = await communicator.connect()
    await communicator.disconnect()
    return connected, detail


def test_disallowed_origin_is_rejected_before_auth():
    app = _build_ws_app(["https://allowed.example.com"])
    connected, code = async_to_sync(_try_ws_connect)(app, b"https://evil.example.com")
    # OriginValidator (WebsocketDenier) zatvorí spojenie kódom 1000 – auth sa
    # vôbec nespustí (inak by to bolo 4401).
    assert connected is False
    assert code == 1000


def test_allowed_origin_reaches_auth_layer_and_rejects_unauthenticated():
    app = _build_ws_app(["https://allowed.example.com"])
    connected, code = async_to_sync(_try_ws_connect)(
        app, b"https://allowed.example.com"
    )
    # Origin prešiel → JwtAuthMiddleware/Consumer odmietne neautentifikované
    # spojenie kódom 4401 (dôkaz, že povolený origin nie je blokovaný).
    assert connected is False
    assert code == 4401


# --------------------------------------------------------------------------- #
# channel layer startup kontrola
# --------------------------------------------------------------------------- #
_IN_MEMORY = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
_REDIS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": ["redis://localhost:6379"]},
    }
}


def test_is_in_memory_channel_layer_detection():
    with override_settings(CHANNEL_LAYERS=_IN_MEMORY):
        assert is_in_memory_channel_layer() is True
    with override_settings(CHANNEL_LAYERS=_REDIS):
        assert is_in_memory_channel_layer() is False


def test_warns_when_in_memory_in_production():
    with override_settings(CHANNEL_LAYERS=_IN_MEMORY, DEBUG=False), patch(
        "swaply.channel_layer_check.logger"
    ) as mock_logger:
        warn_if_insecure_channel_layer()
    assert mock_logger.error.called


def test_no_warning_for_redis_in_production():
    with override_settings(CHANNEL_LAYERS=_REDIS, DEBUG=False), patch(
        "swaply.channel_layer_check.logger"
    ) as mock_logger:
        warn_if_insecure_channel_layer()
    assert not mock_logger.error.called


def test_no_warning_in_debug_even_with_in_memory():
    with override_settings(CHANNEL_LAYERS=_IN_MEMORY, DEBUG=True), patch(
        "swaply.channel_layer_check.logger"
    ) as mock_logger:
        warn_if_insecure_channel_layer()
    assert not mock_logger.error.called
