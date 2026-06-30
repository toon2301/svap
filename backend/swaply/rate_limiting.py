"""
Rate limiting utilities pre Swaply
"""

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils import timezone
from functools import wraps
import hashlib
import json
import logging
import time
from rest_framework.exceptions import Throttled

logger = logging.getLogger(__name__)


class RateLimitExceeded(Throttled):
    """Exception pre prekročenie rate limitu"""

    default_detail = "Prekročili ste limit požiadaviek. Skúste to prosím neskôr."
    extra_detail = "Rate limit exceeded."

    def __init__(self, wait=None, detail=None, code=None):
        self.wait = wait
        if detail is not None:
            self.detail = detail
        if code is not None:
            self.code = code


class RateLimiter:
    """
    Jednoduchý rate limiter používajúci Django cache
    """

    def __init__(self, max_attempts=5, window_minutes=15, block_minutes=60):
        self.max_attempts = max_attempts
        self.window_minutes = window_minutes
        self.block_minutes = block_minutes

    def get_key(self, identifier, action):
        """
        Generuje cache key pre rate limiting
        """
        # Hash slúži len na skrátenie cache key (nie na kryptografickú bezpečnosť).
        return f"rate_limit:{action}:{hashlib.md5(identifier.encode(), usedforsecurity=False).hexdigest()}"

    def is_allowed(self, identifier, action):
        """
        Kontroluje, či je akcia povolená
        """
        key = self.get_key(identifier, action)
        try:
            data = cache.get(key, {"attempts": 0, "first_attempt": None})
        except Exception as e:
            fail_open = bool(getattr(settings, "RATE_LIMIT_FAIL_OPEN", settings.DEBUG))
            logger.warning(
                "Rate limiter cache.get failed",
                extra={"fail_open": fail_open, "action": action},
                exc_info=e,
            )
            return fail_open

        now = timezone.now()

        # Ak je prvý pokus, inicializuj
        if data["first_attempt"] is None:
            data["first_attempt"] = now
            data["attempts"] = 1
            try:
                cache.set(key, data, timeout=self.window_minutes * 60)
            except Exception as e:
                logger.warning("Rate limiter cache.set failed (init)", exc_info=e)
            return True

        # Ak je okno vypršané, resetuj
        if (now - data["first_attempt"]).total_seconds() > self.window_minutes * 60:
            data = {"attempts": 1, "first_attempt": now}
            try:
                cache.set(key, data, timeout=self.window_minutes * 60)
            except Exception as e:
                logger.warning(
                    "Rate limiter cache.set failed (reset window)", exc_info=e
                )
            return True

        # Ak je počet pokusov prekročený, zablokuj
        if data["attempts"] >= self.max_attempts:
            # Nastav dlhšie blokovanie
            try:
                cache.set(key, data, timeout=self.block_minutes * 60)
            except Exception as e:
                logger.warning("Rate limiter cache.set failed (block)", exc_info=e)
            return False

        # Inkrementuj počet pokusov
        data["attempts"] += 1
        try:
            cache.set(key, data, timeout=self.window_minutes * 60)
        except Exception as e:
            logger.warning("Rate limiter cache.set failed (increment)", exc_info=e)
        return True

    def get_remaining_attempts(self, identifier, action):
        """
        Vráti počet zostávajúcich pokusov
        """
        key = self.get_key(identifier, action)
        try:
            data = cache.get(key, {"attempts": 0, "first_attempt": None})
        except Exception as e:
            logger.warning("Rate limiter cache.get failed (remaining)", exc_info=e)
            return self.max_attempts

        if data["first_attempt"] is None:
            return self.max_attempts

        now = timezone.now()
        if (now - data["first_attempt"]).total_seconds() > self.window_minutes * 60:
            return self.max_attempts

        return max(0, self.max_attempts - data["attempts"])

    def get_reset_time(self, identifier, action):
        """
        Vráti čas, kedy sa rate limit resetuje
        """
        key = self.get_key(identifier, action)
        try:
            data = cache.get(key, {"attempts": 0, "first_attempt": None})
        except Exception as e:
            logger.warning("Rate limiter cache.get failed (reset_time)", exc_info=e)
            return None

        if data["first_attempt"] is None:
            return None

        return data["first_attempt"] + timezone.timedelta(minutes=self.window_minutes)


def rate_limit(
    max_attempts=5,
    window_minutes=15,
    block_minutes=60,
    action="default",
    message=None,
):
    """
    Decorator pre rate limiting
    """
    if message is None:
        message = "Príliš veľa pokusov. Skúste to znovu neskôr."

    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Skontroluj, či je rate limiting povolený
            from django.conf import settings

            if not getattr(settings, "RATE_LIMITING_ENABLED", True) or getattr(
                settings, "RATE_LIMIT_DISABLED", False
            ):
                return view_func(request, *args, **kwargs)

            # Perf: for authenticated, read-only requests, rate limiting adds significant latency
            # (Redis roundtrips) while providing little value. Keep rate limiting for unauth and
            # state-changing methods.
            try:
                if (
                    getattr(request, "method", "").upper() in {"GET", "HEAD", "OPTIONS"}
                    and hasattr(request, "user")
                    and getattr(request.user, "is_authenticated", False)
                ):
                    return view_func(request, *args, **kwargs)
            except Exception:
                pass

            # Povoliť bypass podľa cesty (užitočné pre testovacie scenáre)
            try:
                allow_paths = set(getattr(settings, "RATE_LIMIT_ALLOW_PATHS", []) or [])
                if getattr(request, "path", None) in allow_paths:
                    return view_func(request, *args, **kwargs)
            except Exception:
                pass

            # Per-action overrides (napr. pre testy)
            try:
                overrides = getattr(settings, "RATE_LIMIT_OVERRIDES", {}) or {}
                if action in overrides:
                    cfg = overrides[action] or {}
                    local_max_attempts = int(cfg.get("max_attempts", max_attempts))
                    local_window_minutes = int(
                        cfg.get("window_minutes", window_minutes)
                    )
                    local_block_minutes = int(cfg.get("block_minutes", block_minutes))
                else:
                    local_max_attempts = max_attempts
                    local_window_minutes = window_minutes
                    local_block_minutes = block_minutes
            except Exception:
                # Fallback na pôvodné hodnoty
                local_max_attempts = max_attempts
                local_window_minutes = window_minutes
                local_block_minutes = block_minutes

            # Získaj identifikátor (IP adresa alebo user ID).
            # Pre anonymných použijeme spoofing-odolnú klientovu IP (trusted-hop
            # XFF), nie surový REMOTE_ADDR (za proxy = IP proxy pre všetkých).
            if hasattr(request, "user") and request.user.is_authenticated:
                identifier = f"user:{request.user.id}"
            else:
                identifier = f"ip:{get_client_ip(request)}"

            limiter = RateLimiter(
                local_max_attempts, local_window_minutes, local_block_minutes
            )

            # Timing: rate limiting overhead (cache/redis) per request
            _t0_rl = time.perf_counter()
            if not limiter.is_allowed(identifier, action):
                _rl_ms = (time.perf_counter() - _t0_rl) * 1000.0
                try:
                    st = getattr(request, "_server_timing", None)
                    if not isinstance(st, dict):
                        st = {}
                    st["rl"] = _rl_ms
                    request._server_timing = st
                except Exception:
                    pass
                remaining = limiter.get_remaining_attempts(identifier, action)
                reset_time = limiter.get_reset_time(identifier, action)

                logger.warning(
                    f"Rate limit exceeded for {identifier} on action {action}",
                    extra={
                        "identifier": identifier,
                        "action": action,
                        "remaining_attempts": remaining,
                        "reset_time": reset_time,
                        "request_path": request.path,
                        "request_method": request.method,
                    },
                )

                return JsonResponse(
                    {
                        # Shape V+: "error" je ľudský string; "message" alias.
                        "error": message,
                        "message": message,
                        "code": "RATE_LIMITED",
                        "remaining_attempts": remaining,
                        "reset_time": reset_time.isoformat() if reset_time else None,
                        "timestamp": timezone.now().isoformat(),
                    },
                    status=429,
                )

            _rl_ms = (time.perf_counter() - _t0_rl) * 1000.0
            try:
                st = getattr(request, "_server_timing", None)
                if not isinstance(st, dict):
                    st = {}
                # keep the max if multiple decorators/middlewares set it
                prev = st.get("rl")
                if prev is None or _rl_ms > float(prev):
                    st["rl"] = _rl_ms
                request._server_timing = st
            except Exception:
                pass

            return view_func(request, *args, **kwargs)

        return wrapper

    return decorator


# Prednastavené rate limitery pre rôzne akcie
# Login: max 10 pokusov za minútu per IP
login_rate_limit = rate_limit(
    max_attempts=10,
    window_minutes=1,
    block_minutes=5,
    action="login",
    message="Príliš veľa pokusov. Skúste znova o chvíľu.",
)
register_rate_limit = rate_limit(
    max_attempts=3, window_minutes=15, block_minutes=30, action="register"
)
# Password reset request: max 5 pokusov za hodinu per IP
password_reset_rate_limit = rate_limit(
    max_attempts=5, window_minutes=60, block_minutes=60, action="password_reset"
)
password_reset_confirm_rate_limit = rate_limit(
    max_attempts=10,
    window_minutes=60,
    block_minutes=60,
    action="password_reset_confirm",
)
password_reset_verify_rate_limit = rate_limit(
    max_attempts=20,
    window_minutes=60,
    block_minutes=60,
    action="password_reset_verify",
)
email_verification_rate_limit = rate_limit(
    max_attempts=5, window_minutes=15, block_minutes=60, action="email_verification"
)
# Resend verification email: max 3 pokusy za hodinu per IP
resend_verification_rate_limit = rate_limit(
    max_attempts=3, window_minutes=60, block_minutes=60, action="resend_verification"
)
api_rate_limit = rate_limit(
    max_attempts=1000, window_minutes=60, block_minutes=60, action="api"
)
# Vyhľadávanie je drahšie na DB než bežné endpointy. Vlastný bucket (action="search")
# oddelený od zdieľaného "api": vyčerpanie searchu nezablokuje ostatné endpointy a
# naopak. Limit sa týka anonymných (prihlásené GET-y rate_limit aj tak preskakuje),
# preto je prísnejší než zdieľaný api=1000/h, no stále pohodlný pre bežné prehliadanie.
search_rate_limit = rate_limit(
    max_attempts=300,
    window_minutes=60,
    block_minutes=60,
    action="search",
    message="Príliš veľa vyhľadávaní. Skúste to prosím o chvíľu.",
)
# Zmazanie účtu / žiadosť o zmazanie: citlivá akcia – prísny limit per IP.
account_deletion_rate_limit = rate_limit(
    max_attempts=5, window_minutes=60, block_minutes=60, action="account_deletion"
)
email_check_rate_limit = rate_limit(
    max_attempts=30, window_minutes=10, block_minutes=30, action="email_check"
)
contact_form_rate_limit = rate_limit(
    max_attempts=5,
    window_minutes=60,
    block_minutes=60,
    action="contact_form",
    message="Príliš veľa pokusov. Skúste to neskôr.",
)
messaging_open_rate_limit = rate_limit(
    max_attempts=30,
    window_minutes=5,
    block_minutes=15,
    action="messaging_open",
    message="Prilis vela pokusov o otvorenie konverzacii. Skuste to prosim znova neskor.",
)
messaging_send_rate_limit = rate_limit(
    max_attempts=120,
    window_minutes=5,
    block_minutes=10,
    action="messaging_send",
    message="Prilis vela odoslanych sprav. Skuste to prosim znova neskor.",
)
messaging_mark_read_rate_limit = rate_limit(
    max_attempts=300,
    window_minutes=5,
    block_minutes=5,
    action="messaging_mark_read",
    message="Prilis vela poziadaviek na oznacenie sprav ako precitanych. Skuste to prosim znova neskor.",
)
# Prijatie/odmietnutie ziadosti o spravu – akcne operacie, limit zhodny s open.
messaging_request_action_rate_limit = rate_limit(
    max_attempts=30,
    window_minutes=5,
    block_minutes=15,
    action="messaging_request_action",
    message="Prilis vela pokusov o spravu ziadosti. Skuste to prosim znova neskor.",
)


def get_client_ip(request):
    """
    Vráti klientovu IP adresu odolnú voči X-Forwarded-For spoofingu.

    X-Forwarded-For má tvar ``klient, proxy1, proxy2, ...``. Ľavé položky vie
    klient ľubovoľne sfalšovať (pošle vlastnú hlavičku), preto NEberieme leftmost.
    Berieme položku na pozícii podľa počtu dôveryhodných proxy
    (``settings.TRUSTED_PROXY_HOPS``) sprava – tie pridáva výhradne naša
    infraštruktúra (Railway edge / interný proxy), takže ich klient neovplyvní.

    Fail-safe: ak je TRUSTED_PROXY_HOPS=0, XFF chýba alebo nemá dostatok položiek,
    spadneme na REMOTE_ADDR (nie na spoofovateľnú hodnotu).
    """
    remote_addr = (request.META.get("REMOTE_ADDR") or "").strip()

    hops = getattr(settings, "TRUSTED_PROXY_HOPS", 0) or 0
    if hops > 0:
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR") or ""
        parts = [part.strip() for part in forwarded.split(",") if part.strip()]
        if len(parts) >= hops:
            candidate = parts[-hops]
            if candidate:
                return candidate

    return remote_addr or "unknown"
