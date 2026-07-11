"""
Registrácia a e-mailová verifikácia (vyčlenené z auth.py kvôli dĺžke).

register_view, verify_email_view, resend_verification_view. Session/identity
views (login/logout/me/csrf/ping) ostávajú v auth.py. Re-export cez auth.py
zachováva `from .auth import register_view` v views/__init__.
"""

import logging
from time import perf_counter

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from swaply.audit_logger import (
    log_email_verification_failed,
    log_email_verification_success,
    log_registration_success,
)
from swaply.rate_limiting import (
    email_verification_rate_limit,
    register_rate_limit,
    resend_verification_rate_limit,
)

from ..serializers import (
    EmailVerificationSerializer,
    ResendVerificationSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)
from .auth_helpers import _record_auth_view_timing, _set_auth_cookies

User = get_user_model()
logger = logging.getLogger(__name__)


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

            email_verification_required = getattr(
                settings,
                "EMAIL_VERIFICATION_REQUIRED",
                False,
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
            if email_verification_required:
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
                    "message": (
                        "Registrácia bola úspešná. Skontrolujte si email a potvrďte registráciu."
                        if email_verification_required
                        else "Registrácia bola úspešná. Môžete sa prihlásiť."
                    ),
                    "user": user_data,
                    "email_sent": verification is not None,
                    "email_verification_required": email_verification_required,
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
        {"error": "Neplatné údaje", "details": serializer.errors, "validation_errors": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )




@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@email_verification_rate_limit
def verify_email_view(request):
    """Overenie email adresy pomocou tokenu"""
    # Podpora GET linku z emailu bez potreby CSRF (token v query stringu).
    # Token strip-ujeme: email klienty pri zalomení dlhého linku vedia do URL
    # vniesť whitespace/nový riadok → UUID lookup by inak skončil "Neplatný token".
    if request.method == "GET":
        token = (request.query_params.get("token") or request.GET.get("token") or "").strip()
        data = {"token": token} if token else {}
    else:
        data = request.data
        raw_token = data.get("token") if hasattr(data, "get") else None
        if isinstance(raw_token, str) and raw_token != raw_token.strip():
            data = {**data, "token": raw_token.strip()}

    # Idempotencia: jednorazový token často spotrebuje PRVÝ request, ktorý nie je
    # reálny klik používateľa – email klienty linky prefetchujú (Outlook SafeLinks,
    # Gmail proxy) a React StrictMode v deve spúšťa verify efekt dvakrát. Ak token
    # už bol úspešne použitý a účet JE overený, vráť success namiesto chyby
    # „token už bol použitý" (bez opätovného vydania auth cookies – tie patria
    # len prvému použitiu).
    token_value = data.get("token")
    if token_value:
        from ..models import EmailVerification

        try:
            existing = EmailVerification.objects.select_related("user").get(
                token=token_value
            )
        except Exception:
            existing = None
        if existing is not None and existing.is_used and existing.user.is_verified:
            return Response(
                {
                    "message": "Email bol úspešne overený",
                    "verified": True,
                    "already_verified": True,
                    "user": {
                        "id": existing.user.id,
                        "email": existing.user.email,
                        "username": existing.user.username,
                        "is_verified": existing.user.is_verified,
                    },
                },
                status=status.HTTP_200_OK,
            )

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

                try:
                    from ..authentication import warm_user_auth_cache_with_timing
                    from ..viewer_location_cache import (
                        warm_viewer_location_snapshot_cache,
                    )

                    warm_auth = warm_user_auth_cache_with_timing(verification.user)
                    t_viewer0 = perf_counter()
                    warm_viewer_ok = warm_viewer_location_snapshot_cache(
                        verification.user
                    )
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
        {"error": "Neplatné údaje", "details": serializer.errors, "validation_errors": serializer.errors},
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
        {"error": "Neplatné údaje", "details": serializer.errors, "validation_errors": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


