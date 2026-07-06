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
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import connections
import logging
from time import perf_counter
from django.conf import settings
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie

from swaply.rate_limiting import (
    login_rate_limit,
    api_rate_limit,
)
from swaply.audit_logger import (
    log_login_success,
    log_login_failed,
    audit_api_access,
)

from ..serializers import (
    UserLoginSerializer,
    UserProfileSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)

# Helpery vyčlenené do auth_helpers (dĺžka auth.py). Re-export (noqa) zachováva
# `from .auth import <helper>` pre ostatný kód.
from .auth_helpers import (  # noqa: E402, F401
    ACCOUNT_LOCKOUT_MINUTES,
    LOGIN_FAILURE_MAX_ATTEMPTS,
    LOGIN_FAILURE_WINDOW_MINUTES,
    _access_token_lifetime_seconds,
    _auth_cookie_debug_enabled,
    _auth_cookie_kwargs,
    _auth_state_cookie_kwargs,
    _clear_auth_cookies,
    _fingerprint_secret,
    _is_cross_site_cookie_env,
    _lock_keys_for_email,
    _log_cookie_header_diagnostics,
    _me_user_queryset,
    _record_auth_view_timing,
    _set_auth_cookies,
    _set_auth_session_headers,
    _with_path,
    is_account_locked,
    register_login_failure,
    reset_login_failures,
)

# Re-export registrácia/verifikácia (presunuté do auth_registration_views) pre
# spätnú kompatibilitu (views/__init__ ich importuje z .auth).
from .auth_registration_views import (  # noqa: E402, F401
    register_view,
    resend_verification_view,
    verify_email_view,
)


@api_view(["GET"])
@authentication_classes([])  # CSRF endpoint musí fungovať aj s neplatnými auth cookies
@permission_classes([AllowAny])
@ensure_csrf_cookie
def get_csrf_token_view(request):
    """Získanie CSRF tokenu pre API volania"""
    csrf_token = get_token(request)
    return Response({"csrf_token": csrf_token}, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([])  # login je verejný endpoint
@permission_classes([AllowAny])
@login_rate_limit
def login_view(request):
    """Prihlásenie používateľa"""
    import traceback

    email = request.data.get("email")

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

            try:
                from ..authentication import warm_user_auth_cache_with_timing
                from ..viewer_location_cache import warm_viewer_location_snapshot_cache

                warm_auth = warm_user_auth_cache_with_timing(user)
                t_viewer0 = perf_counter()
                warm_viewer_ok = warm_viewer_location_snapshot_cache(user)
                warm_viewer_ms = (perf_counter() - t_viewer0) * 1000.0
                _record_auth_view_timing(
                    request,
                    auth_user_cache_warm=float(warm_auth["duration_ms"]),
                    auth_user_cache_warm_ok=1.0 if warm_auth["ok"] else 0.0,
                    auth_user_cache_warm_verify=float(warm_auth["verify_ms"]),
                    auth_user_cache_warm_verify_ok=1.0
                    if warm_auth["verify_ok"]
                    else 0.0,
                    viewer_location_cache_warm=warm_viewer_ms,
                    viewer_location_cache_warm_ok=1.0 if warm_viewer_ok else 0.0,
                )
            except Exception:
                pass

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
            _set_auth_session_headers(resp)
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
        {"error": "Neplatné prihlasovacie údaje", "details": serializer.errors, "validation_errors": serializer.errors},
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
    t_view0 = perf_counter()
    _log_cookie_header_diagnostics(request, where="me_view")
    user = getattr(request, "user", None)
    if not user or not getattr(user, "is_authenticated", False):
        return Response(
            {"detail": "Authentication credentials were not provided."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    db_conn = connections["default"]
    t_db_connect0 = perf_counter()
    db_conn.ensure_connection()
    t_db_connect1 = perf_counter()
    t_db0 = perf_counter()
    try:
        user = _me_user_queryset().get(pk=user.pk)
    except User.DoesNotExist:
        from ..authentication import invalidate_user_auth_cache

        invalidate_user_auth_cache(getattr(user, "pk", None))
        resp = Response(
            {"detail": "Authentication credentials were not provided."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
        _clear_auth_cookies(resp)
        return resp
    t_db1 = perf_counter()
    t_serialize0 = perf_counter()
    serializer_context = {"request": request, "_me_serializer_timing": {}}
    serializer = UserProfileSerializer(user, context=serializer_context)
    serializer_data = serializer.data
    serializer_timing = serializer_context.get("_me_serializer_timing", {})
    t_serialize1 = perf_counter()
    t_response0 = perf_counter()
    resp = Response(serializer_data)
    # Identity endpoint must never be cached (prevents stale-user / old-account effects behind proxies/CDNs).
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    resp["Vary"] = "Cookie"
    _set_auth_session_headers(resp)
    t_response1 = perf_counter()
    _record_auth_view_timing(
        request,
        me_db_connect=(t_db_connect1 - t_db_connect0) * 1000.0,
        me_db_query=(t_db1 - t_db0) * 1000.0,
        me_db_get=(t_db1 - t_db_connect0) * 1000.0,
        me_serialize=(t_serialize1 - t_serialize0) * 1000.0,
        me_response_build=(t_response1 - t_response0) * 1000.0,
        me_total=(t_response1 - t_view0) * 1000.0,
        **serializer_timing,
    )
    return resp


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
