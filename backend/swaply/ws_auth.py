from urllib.parse import parse_qs

from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
import logging

from accounts.authentication import SwaplyJWTAuthentication


def _get_cookie(headers, name: str) -> str | None:
    try:
        cookie_header = None
        for k, v in headers:
            if k == b"cookie":
                cookie_header = v.decode("utf-8", errors="ignore")
                break
        if not cookie_header:
            return None
        parts = [p.strip() for p in cookie_header.split(";") if p.strip()]
        for p in parts:
            if "=" not in p:
                continue
            k, val = p.split("=", 1)
            if k.strip() == name:
                return val.strip()
    except Exception:
        return None
    return None


class JwtAuthMiddleware(BaseMiddleware):
    """
    JWT auth pre WebSocket (Channels).

    Čistý cookie auth model:
    - akceptuj iba cookie `access_token=...`
    """

    def __init__(self, inner):
        super().__init__(inner)
        self._auth = SwaplyJWTAuthentication()
        self._logger = logging.getLogger(__name__)

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        user = AnonymousUser()
        auth_error = None

        try:
            qs = parse_qs(
                (scope.get("query_string") or b"").decode("utf-8", errors="ignore")
            )
            token = None
            token = _get_cookie(scope.get("headers") or [], "access_token")

            if token:
                # get_validated_token je sync a je OK; get_user robí DB/cache operácie,
                # preto ho musíme spustiť mimo async event loop.
                validated = self._auth.get_validated_token(token)
                user = await database_sync_to_async(self._auth.get_user)(validated)
            else:
                auth_error = "missing_token"
        except Exception as e:
            user = AnonymousUser()
            auth_error = f"{type(e).__name__}: {e}"

        scope["user"] = user
        # len pre debug / troubleshooting (nepoužíva sa v produkcii logike)
        scope["ws_auth_error"] = auth_error

        # Debug log v DEV: pomôže zistiť prečo WS končí WSREJECT
        try:
            path = scope.get("path")
            uid = (
                getattr(user, "id", None)
                if getattr(user, "is_authenticated", False)
                else None
            )
            self._logger.info(
                "WS auth: path=%s authenticated=%s user_id=%s error=%s",
                path,
                getattr(user, "is_authenticated", False),
                uid,
                auth_error,
            )
        except Exception:
            pass
        return await super().__call__(scope, receive, send)
