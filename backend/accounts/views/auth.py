"""
Autentifikačné views pre Swaply
"""

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
)
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import transaction
from django.core.cache import cache
import logging
import os
from django.conf import settings
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
import hashlib

from swaply.rate_limiting import (
    login_rate_limit,
    register_rate_limit,
    email_verification_rate_limit,
    resend_verification_rate_limit,
    api_rate_limit,
)
from swaply.audit_logger import (
    log_login_success,
    log_login_failed,
    log_registration_success,
    log_email_verification_success,
    log_email_verification_failed,
    audit_api_access,
)

from ..models import UserProfile
from ..serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    EmailVerificationSerializer,
    ResendVerificationSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)

# Account lockout configuration
LOGIN_FAILURE_MAX_ATTEMPTS = 5
LOGIN_FAILURE_WINDOW_MINUTES = 15
ACCOUNT_LOCKOUT_MINUTES = 15


def _auth_cookie_debug_enabled() -> bool:
    """
    Bezpečná diagnostika pre problémy so starými/duplicitnými cookies.
    Zapína sa iba explicitne:
    - DEBUG=True, alebo
    - env AUTH_COOKIE_DEBUG=true/1/yes
    """
    if getattr(settings, "DEBUG", False):
        return True
    v = (os.getenv("AUTH_COOKIE_DEBUG") or "").strip().lower()
    return v in ("true", "1", "yes")


def _fingerprint_secret(value: str) -> str:
    """Nezvratný fingerprint (bez úniku tokenu)."""
    try:
        h = hashlib.sha256(value.encode("utf-8")).hexdigest()
        return h[:10]
    except Exception:
        return "ERR"


def _log_cookie_header_diagnostics(request, *, where: str) -> None:
    """
    Loguje iba metadáta z raw Cookie headera (počty a fingerprinty),
    aby sme vedeli odhaliť duplicitné cookies s rovnakým menom.
    NIKDY neloguje priamo tokeny.
    """
    if not _auth_cookie_debug_enabled():
        return
    raw = request.META.get("HTTP_COOKIE") or ""
    if not raw:
        logger.info("AUTH_COOKIE_DEBUG %s: no Cookie header", where)
        return

    # Very small, safe parse: split on ';' and count duplicates by name.
    parts = [p.strip() for p in raw.split(";") if p.strip()]
    by_name: dict[str, list[str]] = {}
    for p in parts:
        if "=" not in p:
            continue
        name, val = p.split("=", 1)
        name = name.strip()
        if not name:
            continue
        by_name.setdefault(name, []).append(val)

    interesting = ("access_token", "refresh_token", "auth_state", "csrftoken")
    summary = {}
    for name in interesting:
        vals = by_name.get(name) or []
        if not vals:
            continue
        summary[name] = {
            "count": len(vals),
            "lengths": [len(v) for v in vals[:3]],
            "fp": [_fingerprint_secret(v) for v in vals[:3]],
        }

    logger.info(
        "AUTH_COOKIE_DEBUG %s: cookie_counts=%s",
        where,
        summary if summary else {"note": "no interesting cookies present"},
    )


def _is_cross_site_cookie_env() -> bool:
    """True ak bežíme v Railway / test cross-origin (FE a BE na rôznych doménach)."""
    v = (os.getenv("RAILWAY") or os.getenv("CROSS_SITE_COOKIES") or "").strip().lower()
    if v in ("true", "1", "yes"):
        return True
    # Ak je nastavený HTTPS frontend origin, ide o oddelený FE/BE – cookie musia byť cross-site
    frontend = (os.getenv("FRONTEND_ORIGIN") or "").strip()
    return frontend.startswith("https://")


def _auth_cookie_kwargs() -> dict:
    """
    Bezpečné defaulty pre JWT cookies.
    - Cross-site (Railway/test): SameSite=None, Secure=True – cookie sa posiela cross-origin.
    - Produkcia (svaply.com): access SameSite=None, refresh Strict; Secure=True.
    - Lokál (DEBUG): Lax, Secure=False.
    """
    is_prod = not getattr(settings, "DEBUG", False)
    cross_site = _is_cross_site_cookie_env()
    if cross_site:
        return {
            "httponly": True,
            "secure": True,
            "samesite": "None",
            "path": "/",
        }
    return {
        "httponly": True,
        "secure": True if is_prod else False,
        "samesite": "None" if is_prod else "Lax",
        "path": "/",
    }


def _auth_state_cookie_kwargs() -> dict:
    """Rovnaké bezpečnostné nastavenia ako access_token (HttpOnly, Secure, SameSite, Path)."""
    return _auth_cookie_kwargs()


# NOTE:
# Django's response cookie container is keyed by cookie name, so multiple set_cookie() calls
# for the same cookie name (even with different Path) overwrite each other in the response.
# To ensure reliable logout even if legacy cookies exist under different paths, logout_view
# additionally sends Clear-Site-Data: "cookies" (see below).
_AUTH_COOKIE_PATHS_TO_CLEAR = ("/",)


def _with_path(kwargs: dict, path: str) -> dict:
    k = dict(kwargs)
    k["path"] = path
    return k


def _set_auth_cookies(response, *, access: str, refresh: str) -> None:
    kwargs = _auth_cookie_kwargs()
    state_kwargs = _auth_state_cookie_kwargs()
    # Defensive: clear any legacy-path cookies first to prevent stale token precedence.
    _clear_auth_cookies(response)
    # Access token – kratšia životnosť
    response.set_cookie("access_token", access, max_age=15 * 60, **kwargs)
    # Refresh token – dlhšia životnosť
    # Cross-site (Railway): SameSite=None. Produkcia (svaply.com): Strict.
    refresh_kwargs = dict(kwargs)
    if not _is_cross_site_cookie_env() and not getattr(settings, "DEBUG", False):
        refresh_kwargs["samesite"] = "Strict"
    response.set_cookie(
        "refresh_token", refresh, max_age=7 * 24 * 60 * 60, **refresh_kwargs
    )
    # Stavový cookie pre UI (bez tokenov)
    response.set_cookie("auth_state", "1", max_age=7 * 24 * 60 * 60, **state_kwargs)


def _clear_auth_cookies(response) -> None:
    kwargs = _auth_cookie_kwargs()
    state_kwargs = _auth_state_cookie_kwargs()
    # delete_cookie nevie vždy nastaviť rovnaké samesite/secure v každej verzii, preto nastavíme expiráciu.
    refresh_kwargs = dict(kwargs)
    if not _is_cross_site_cookie_env() and not getattr(settings, "DEBUG", False):
        refresh_kwargs["samesite"] = "Strict"

    for path in _AUTH_COOKIE_PATHS_TO_CLEAR:
        response.set_cookie("access_token", "", max_age=0, **_with_path(kwargs, path))
        response.set_cookie(
            "refresh_token", "", max_age=0, **_with_path(refresh_kwargs, path)
        )
        response.set_cookie(
            "auth_state", "", max_age=0, **_with_path(state_kwargs, path)
        )


def _lock_keys_for_email(email: str):
    safe_email = (email or "").lower().strip()
    return (
        f"login_failures:{safe_email}",
        f"login_locked:{safe_email}",
    )


def is_account_locked(email: str) -> bool:
    if not email:
        return False
    # Lockout sa aplikuje len na existujúce účty
    try:
        if not User.objects.filter(email=email).exists():
            return False
    except Exception:
        return False
    _, lock_key = _lock_keys_for_email(email)
    try:
        return bool(cache.get(lock_key))
    except Exception as e:
        # Fail-open: ak cache nie je dostupná, radšej nelockuj a nepadni na 500.
        if getattr(settings, "DEBUG", False):
            logger.warning(f"Lockout cache.get failed for {lock_key}: {e}")
        else:
            logger.warning("Lockout cache.get failed")
        return False


def register_login_failure(email: str) -> bool:
    if not email:
        return False
    # Lockout sa aplikuje len na existujúce účty
    try:
        if not User.objects.filter(email=email).exists():
            return False
    except Exception:
        return False
    fail_key, lock_key = _lock_keys_for_email(email)
    try:
        data = cache.get(fail_key, {"attempts": 0})
    except Exception as e:
        if getattr(settings, "DEBUG", False):
            logger.warning(f"Lockout cache.get failed for {fail_key}: {e}")
        else:
            logger.warning("Lockout cache.get failed")
        return False
    attempts = int(data.get("attempts", 0)) + 1
    try:
        cache.set(
            fail_key,
            {"attempts": attempts},
            timeout=LOGIN_FAILURE_WINDOW_MINUTES * 60,
        )
    except Exception as e:
        if getattr(settings, "DEBUG", False):
            logger.warning(f"Lockout cache.set failed for {fail_key}: {e}")
        else:
            logger.warning("Lockout cache.set failed")
        return False
    if attempts >= LOGIN_FAILURE_MAX_ATTEMPTS:
        try:
            cache.set(lock_key, True, timeout=ACCOUNT_LOCKOUT_MINUTES * 60)
        except Exception as e:
            if getattr(settings, "DEBUG", False):
                logger.warning(f"Lockout cache.set failed for {lock_key}: {e}")
            else:
                logger.warning("Lockout cache.set failed")
            return False
        return True
    return False


def reset_login_failures(email: str) -> None:
    if not email:
        return
    fail_key, lock_key = _lock_keys_for_email(email)
    try:
        cache.delete(fail_key)
    except Exception as e:
        if getattr(settings, "DEBUG", False):
            logger.warning(f"Lockout cache.delete failed for {fail_key}: {e}")
        else:
            logger.warning("Lockout cache.delete failed")
    try:
        cache.delete(lock_key)
    except Exception as e:
        if getattr(settings, "DEBUG", False):
            logger.warning(f"Lockout cache.delete failed for {lock_key}: {e}")
        else:
            logger.warning("Lockout cache.delete failed")


@api_view(["GET"])
@authentication_classes([])  # CSRF endpoint musí fungovať aj s neplatnými auth cookies
@permission_classes([AllowAny])
@ensure_csrf_cookie
def get_csrf_token_view(request):
    """Získanie CSRF tokenu pre API volania"""
    csrf_token = get_token(request)
    return Response({"csrf_token": csrf_token}, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([])  # register je verejný endpoint
@permission_classes([AllowAny])
@register_rate_limit
def register_view(request):
    """Registrácia nového používateľa"""

    # Pre GET požiadavky vráť informácie o registračnom formulári
    if request.method == "GET":
        return Response(
            {
                "message": "Registračný endpoint",
                "method": "POST",
                "description": "Pre registráciu použite POST metódu s údajmi o používateľovi",
                "required_fields": [
                    "username",
                    "email",
                    "password",
                    "password_confirm",
                    "user_type",
                    "birth_day",
                    "birth_month",
                    "birth_year",
                    "gender",
                    "captcha_token",
                ],
                "optional_fields": ["company_name", "website"],
                "user_types": ["individual", "company"],
                "captcha": {
                    "enabled": getattr(settings, "CAPTCHA_ENABLED", True),
                    "site_key": getattr(settings, "CAPTCHA_SITE_KEY", ""),
                },
            },
            status=status.HTTP_200_OK,
        )

    # Pre POST požiadavky spracuj registráciu
    if getattr(settings, "DEBUG", False):
        logger.info("📝 DEBUG REGISTRATION: Starting registration process")

    serializer = UserRegistrationSerializer(
        data=request.data, context={"request": request}
    )

    if serializer.is_valid():
        if getattr(settings, "DEBUG", False):
            logger.info("📝 DEBUG REGISTRATION: Serializer is valid")
        try:
            with transaction.atomic():
                if getattr(settings, "DEBUG", False):
                    logger.info("📝 DEBUG REGISTRATION: Entering transaction")

                user = serializer.save()
                if getattr(settings, "DEBUG", False):
                    logger.info(
                        f"📝 DEBUG REGISTRATION: User created - id={getattr(user, 'id', None)}"
                    )

                # Log úspešnú registráciu
                ip_address = request.META.get("REMOTE_ADDR")
                user_agent = request.META.get("HTTP_USER_AGENT")
                log_registration_success(user, ip_address, user_agent)
                if getattr(settings, "DEBUG", False):
                    logger.info(
                        "📝 DEBUG REGISTRATION: Registration logged successfully"
                    )

            # Odošli verifikačný email MIMO transakcie a s ochranou pred timeoutom
            import threading

            def _send_email_async(verification, request):
                try:
                    verification.send_verification_email(request)
                except Exception as email_error:
                    logger.warning(
                        "Verification email failed but registration succeeded",
                        extra={
                            "user_id": getattr(verification.user, "id", None),
                            "error": str(email_error),
                        },
                    )

            verification = None
            try:
                from accounts.models import EmailVerification

                verification = (
                    EmailVerification.objects.filter(user=user)
                    .order_by("-created_at")
                    .first()
                )
                if verification:
                    t = threading.Thread(
                        target=_send_email_async,
                        args=(verification, request),
                        daemon=True,
                    )
                    t.start()
            except Exception as e:
                logger.warning("Could not start email thread", extra={"error": str(e)})

            if getattr(settings, "DEBUG", False):
                logger.info(
                    "📝 DEBUG REGISTRATION: Transaction completed, returning response"
                )
            _prev_user = getattr(request, "user", None)
            request.user = user
            try:
                user_data = UserProfileSerializer(
                    user,
                    context={"request": request},
                ).data
            finally:
                request.user = _prev_user
            return Response(
                {
                    "message": "Registrácia bola úspešná. Skontrolujte si email a potvrďte registráciu.",
                    "user": user_data,
                    "email_sent": verification is not None,
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            # V produkcii neloguj serializer dáta / PII; v DEBUG ponechaj detail.
            if getattr(settings, "DEBUG", False):
                logger.error(f"📝 DEBUG REGISTRATION: Exception occurred - {str(e)}")
                logger.error(f"Registration error: {str(e)}")
                import traceback

                logger.error(
                    f"📝 DEBUG REGISTRATION: Traceback - {traceback.format_exc()}"
                )
            else:
                logger.error("Registration failed")
            return Response(
                {"error": "Chyba pri vytváraní účtu"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if getattr(settings, "DEBUG", False):
        logger.error(f"📝 DEBUG REGISTRATION: Serializer invalid - {serializer.errors}")
    return Response(
        {"error": "Neplatné údaje", "details": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@authentication_classes([])  # login je verejný endpoint
@permission_classes([AllowAny])
@login_rate_limit
def login_view(request):
    """Prihlásenie používateľa"""
    import traceback

    email = request.data.get("email")
    from django.conf import settings

    serializer = UserLoginSerializer(data=request.data)

    if serializer.is_valid():
        try:
            user = serializer.validated_data["user"]

            # Resetuj počítadlo neúspešných pokusov po úspechu
            reset_login_failures(email)

            # Generovanie JWT tokenov s custom RefreshToken
            from ..authentication import SwaplyRefreshToken

            refresh = SwaplyRefreshToken.for_user(user)
            access_token = refresh.access_token

            # Log úspešné prihlásenie
            ip_address = request.META.get("REMOTE_ADDR")
            user_agent = request.META.get("HTTP_USER_AGENT")
            log_login_success(user, ip_address, user_agent)

            # Pred serializáciou nastav request.user = user, aby serializer vrátil plné dáta (is_owner)
            _prev_user = getattr(request, "user", None)
            request.user = user
            try:
                user_data = UserProfileSerializer(
                    user,
                    context={"request": request},
                ).data
            finally:
                request.user = _prev_user

            resp = Response(
                {
                    "message": "Prihlásenie bolo úspešné",
                    "user": user_data,
                },
                status=status.HTTP_200_OK,
            )
            # Nastav HttpOnly cookies (čistý cookie model).
            try:
                _set_auth_cookies(resp, access=str(access_token), refresh=str(refresh))
            except Exception as e:
                logger.error(f"Failed to set auth cookies: {e}")
            return resp
        except Exception as e:
            logger.exception(
                "Login success path failed: %s\n%s",
                str(e),
                traceback.format_exc(),
            )
            raise

    # Log neúspešné prihlásenie a registruj zlyhanie pre lockout
    email = request.data.get("email", "unknown")
    ip_address = request.META.get("REMOTE_ADDR")
    user_agent = request.META.get("HTTP_USER_AGENT")
    log_login_failed(email, ip_address, user_agent)

    # Ak používateľ existuje a lockout je zapnutý, registruj zlyhanie a po prekročení prahu vráť 423
    user_email = request.data.get("email")
    if (
        getattr(settings, "ACCOUNT_LOCKOUT_ENABLED", True)
        and User.objects.filter(email=user_email).exists()
    ):
        if register_login_failure(user_email):
            return Response(
                {
                    "error": "Účet je dočasne zablokovaný kvôli viacerým neúspešným pokusom. Skúste to neskôr."
                },
                status=423,
            )

    return Response(
        {"error": "Neplatné prihlasovacie údaje", "details": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Odhlásenie používateľa"""
    try:
        refresh_token = request.COOKIES.get("refresh_token")
        if refresh_token:
            # Použi custom RefreshToken s Redis fallback
            from ..authentication import SwaplyRefreshToken

            try:
                token = SwaplyRefreshToken(refresh_token)
                token.blacklist()
            except Exception as blacklist_error:
                logger.warning(f"Token blacklisting failed: {blacklist_error}")
                # Pokračuj aj ak blacklisting zlyhá

        resp = Response(
            {"message": "Odhlásenie bolo úspešné"}, status=status.HTTP_200_OK
        )
        try:
            _clear_auth_cookies(resp)
        except Exception:
            pass
        # Robust logout: clear ALL cookies for this origin (covers legacy Path variants).
        # This prevents "still logged in" due to stale cookies under a different Path.
        resp["Clear-Site-Data"] = "\"cookies\""
        return resp
    except Exception as e:
        # Log error for debugging but don't expose details to client
        logger.error(f"Logout error: {str(e)}")
        return Response(
            {"error": "Chyba pri odhlasovaní"}, status=status.HTTP_400_BAD_REQUEST
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Získanie informácií o aktuálnom používateľovi"""
    _log_cookie_header_diagnostics(request, where="me_view")
    serializer = UserProfileSerializer(request.user, context={"request": request})
    resp = Response(serializer.data)
    # Identity endpoint must never be cached (prevents stale-user / old-account effects behind proxies/CDNs).
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    resp["Vary"] = "Cookie"
    return resp


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@email_verification_rate_limit
def verify_email_view(request):
    """Overenie email adresy pomocou tokenu"""
    # Podpora GET linku z emailu bez potreby CSRF (token v query stringu)
    if request.method == "GET":
        token = request.query_params.get("token") or request.GET.get("token")
        data = {"token": token} if token else {}
    else:
        data = request.data
    serializer = EmailVerificationSerializer(data=data)

    if serializer.is_valid():
        try:
            if serializer.verify():
                # Log úspešnú verifikáciu
                ip_address = request.META.get("REMOTE_ADDR")
                user_agent = request.META.get("HTTP_USER_AGENT")
                # Získaj používateľa z tokenu
                from ..models import EmailVerification

                verification = EmailVerification.objects.get(
                    token=serializer.validated_data["token"]
                )
                log_email_verification_success(
                    verification.user, ip_address, user_agent
                )

                # Generovanie JWT tokenov pre automatické prihlásenie
                from ..authentication import SwaplyRefreshToken

                refresh = SwaplyRefreshToken.for_user(verification.user)

                resp = Response(
                    {
                        "message": "Email bol úspešne overený",
                        "verified": True,
                        "user": {
                            "id": verification.user.id,
                            "email": verification.user.email,
                            "username": verification.user.username,
                            "is_verified": verification.user.is_verified,
                        },
                    },
                    status=status.HTTP_200_OK,
                )
                try:
                    _set_auth_cookies(
                        resp, access=str(refresh.access_token), refresh=str(refresh)
                    )
                except Exception:
                    pass
                return resp
            else:
                # Log neúspešnú verifikáciu
                token = request.data.get("token", "unknown")
                ip_address = request.META.get("REMOTE_ADDR")
                user_agent = request.META.get("HTTP_USER_AGENT")
                log_email_verification_failed(
                    token, ip_address, user_agent, "invalid_or_expired"
                )

                return Response(
                    {"error": "Token je neplatný alebo expiroval", "verified": False},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            if getattr(settings, "DEBUG", False):
                logger.error(f"Email verification error: {str(e)}")
            else:
                logger.error("Email verification failed")
            return Response(
                {"error": "Chyba pri overovaní emailu"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    return Response(
        {"error": "Neplatné údaje", "details": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@resend_verification_rate_limit
def resend_verification_view(request):
    """Znovu odoslanie verifikačného emailu"""
    serializer = ResendVerificationSerializer(data=request.data)

    if serializer.is_valid():
        try:
            email = serializer.validated_data["email"]
            user = User.objects.get(email=email)

            # Kontrola, či je používateľ už overený
            if user.is_verified:
                return Response(
                    {"message": "Používateľ je už overený", "already_verified": True},
                    status=status.HTTP_200_OK,
                )

            # Vytvorenie nového verifikačného tokenu
            from ..models import EmailVerification

            verification = EmailVerification.objects.create(user=user)

            # Odoslanie verifikačného emailu
            verification.send_verification_email(request)

            # Log znovu odoslanie
            if getattr(settings, "DEBUG", False):
                logger.info(f"Resend verification email for user {user.email}")
            else:
                logger.info(
                    "Resend verification email",
                    extra={"user_id": getattr(user, "id", None)},
                )

            return Response(
                {"message": "Verifikačný email bol znovu odoslaný", "email_sent": True},
                status=status.HTTP_200_OK,
            )

        except User.DoesNotExist:
            return Response(
                {
                    "message": "Ak tento email existuje v systéme, verifikačný email bol odoslaný.",
                    "email_sent": False,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            if getattr(settings, "DEBUG", False):
                logger.error(f"Resend verification error: {str(e)}")
            else:
                logger.error("Resend verification failed")
            return Response(
                {"error": "Chyba pri odosielaní verifikačného emailu"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    return Response(
        {"error": "Neplatné údaje", "details": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
@audit_api_access(endpoint_name="/api/auth/ping/")
def ping_view(request):
    """
    Autentifikovaný ping endpoint pre overenie prihlásenia.
    
    Bezpečnostné požiadavky:
    - Overená autentifikácia: IsAuthenticated permission
    - Explicitná autorizácia: IsAuthenticated zabezpečuje, že používateľ je prihlásený
    - Rate limiting: api_rate_limit zabezpečuje ochranu proti DoS
    - Auditovateľnosť: audit_api_access loguje všetky prístupy
    - Validácia vstupov: GET endpoint bez vstupov, user_id je získané z autentifikovaného request.user
    - Ochrana proti injection: Django REST Framework automaticky zabezpečuje
    """
    try:
        # Explicitná kontrola, že používateľ je autentifikovaný a aktívny
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"error": "Autentifikácia je vyžadovaná"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        
        # Kontrola, že používateľ je aktívny (dodatočná bezpečnostná kontrola)
        if not request.user.is_active:
            return Response(
                {"error": "Účet nie je aktívny"},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        # Bezpečné získanie user_id (integer, nie string, aby sa zabránilo injection)
        user_id = int(request.user.id)
        
        return Response(
            {
                "status": "ok",
                "user_id": user_id,
            },
            status=status.HTTP_200_OK,
        )
    except (ValueError, TypeError, AttributeError) as e:
        # Log chybu, ale nevracaj detaily používateľovi (security by default)
        logger.error(f"Ping endpoint error: {e}", exc_info=True)
        return Response(
            {"error": "Chyba pri spracovaní požiadavky"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    except Exception as e:
        # Všeobecná chyba - loguj, ale nevracaj detaily
        logger.error(f"Unexpected error in ping endpoint: {e}", exc_info=True)
        return Response(
            {"error": "Chyba pri spracovaní požiadavky"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
