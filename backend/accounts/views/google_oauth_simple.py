"""
Jednoduchá Google OAuth implementácia bez allauth závislostí
"""

import requests
from django.http import HttpResponseRedirect
from django.shortcuts import redirect
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
import logging
import urllib.parse
import os
import secrets
from django.core.cache import cache
from django.core import signing
from time import perf_counter

User = get_user_model()
logger = logging.getLogger(__name__)

_OAUTH_STATE_COOKIE_NAME = "google_oauth_state"
_OAUTH_STATE_COOKIE_SALT = "accounts.google_oauth_state"
_OAUTH_STATE_TTL_SECONDS = 10 * 60


def _oauth_trace_enabled():
    return os.getenv("OAUTH_TRACE", "").strip().lower() in {"1", "true", "yes", "on"}


def _oauth_trace(event, **fields):
    if not _oauth_trace_enabled():
        return
    try:
        safe = {k: v for k, v in fields.items()}
        logger.warning(f"OAUTH_TRACE {event} {safe}")
    except Exception:
        logger.warning(f"OAUTH_TRACE {event}")


def _normalize_frontend_callback(candidate: str | None, default_callback: str) -> str:
    candidate = candidate or default_callback
    try:
        parsed_default = urllib.parse.urlparse(default_callback)
        parsed_candidate = urllib.parse.urlparse(candidate)
        if (
            parsed_candidate.scheme != parsed_default.scheme
            or parsed_candidate.netloc != parsed_default.netloc
        ):
            return default_callback
    except Exception:
        return default_callback
    return candidate


def _oauth_state_cookie_path(backend_callback: str | None) -> str:
    try:
        path = urllib.parse.urlparse(backend_callback or "").path or "/"
    except Exception:
        path = "/"
    return path if path.startswith("/") else "/"


def _oauth_state_cookie_kwargs(backend_callback: str | None) -> dict:
    from .auth import _auth_state_cookie_kwargs

    kwargs = _auth_state_cookie_kwargs()
    kwargs["path"] = _oauth_state_cookie_path(backend_callback)
    return kwargs


def _set_oauth_state_cookie(
    response,
    *,
    oauth_state: str,
    frontend_callback: str,
    backend_callback: str | None,
) -> None:
    signed_payload = signing.dumps(
        {"state": oauth_state, "frontend_callback": frontend_callback},
        salt=_OAUTH_STATE_COOKIE_SALT,
    )
    response.set_cookie(
        _OAUTH_STATE_COOKIE_NAME,
        signed_payload,
        max_age=_OAUTH_STATE_TTL_SECONDS,
        **_oauth_state_cookie_kwargs(backend_callback),
    )


def _clear_oauth_state_cookie(
    response,
    *,
    backend_callback: str | None = None,
    request_path: str | None = None,
) -> None:
    cookie_target = backend_callback or request_path or "/"
    response.set_cookie(
        _OAUTH_STATE_COOKIE_NAME,
        "",
        max_age=0,
        **_oauth_state_cookie_kwargs(cookie_target),
    )


def _frontend_callback_from_state_cache(
    oauth_state: str | None, default_callback: str
) -> str:
    if not oauth_state:
        return default_callback
    try:
        cached = cache.get(f"oauth_state:{oauth_state}")
    except Exception:
        return default_callback
    if not cached:
        return default_callback
    return _normalize_frontend_callback(str(cached), default_callback)


def _validated_frontend_callback_from_state_cookie(
    request, *, oauth_state: str, default_callback: str
) -> str:
    signed_cookie = request.COOKIES.get(_OAUTH_STATE_COOKIE_NAME)
    if not signed_cookie:
        _oauth_trace("google_callback_invalid_state_cookie_missing")
        raise ValueError("missing_cookie")

    try:
        payload = signing.loads(
            signed_cookie,
            salt=_OAUTH_STATE_COOKIE_SALT,
            max_age=_OAUTH_STATE_TTL_SECONDS,
        )
    except signing.SignatureExpired as exc:
        _oauth_trace("google_callback_invalid_state_cookie_expired")
        raise ValueError("expired_cookie") from exc
    except signing.BadSignature as exc:
        _oauth_trace("google_callback_invalid_state_cookie_bad_signature")
        raise ValueError("bad_cookie_signature") from exc

    frontend_callback = _normalize_frontend_callback(
        str(payload.get("frontend_callback") or ""), default_callback
    )
    cookie_state = str(payload.get("state") or "")
    if not cookie_state or not secrets.compare_digest(cookie_state, oauth_state):
        _oauth_trace("google_callback_invalid_state_cookie_mismatch")
        raise ValueError("state_mismatch")

    return frontend_callback


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def google_login_view(request):
    """
    Jednoduchá Google OAuth login view
    """
    try:
        _oauth_trace(
            "google_login_start",
            path=request.path,
            has_callback=bool(request.GET.get("callback")),
            host=request.get_host(),
        )
        # Získaj Google OAuth credentials z environment premenných
        client_id = getattr(settings, "GOOGLE_OAUTH2_CLIENT_ID", None)

        # Odmietni prázdne alebo placeholder hodnoty
        if not client_id or client_id.strip() in {
            "",
            "dummy-client-id",
            "your-google-client-id",
        }:
            logger.error("Google OAuth Client ID nie je nastavený v settings")
            return Response(
                {"error": "Google OAuth Client ID nie je nastavený"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        default_frontend_callback = getattr(
            settings, "FRONTEND_CALLBACK_URL", "http://localhost:3000/auth/callback"
        )
        # Frontend callback môže prísť v query parameteri `callback`, ale musí byť na povolenej origin.
        frontend_callback = _normalize_frontend_callback(
            request.GET.get("callback", default_frontend_callback),
            default_frontend_callback,
        )
        try:
            from urllib.parse import urlparse

            parsed_default = urlparse(default_frontend_callback)
            parsed_candidate = urlparse(frontend_callback)
            # Povoliť len rovnakú scheme+host ako default callback (ochrana proti open redirect)
            if (
                parsed_candidate.scheme != parsed_default.scheme
                or parsed_candidate.netloc != parsed_default.netloc
            ):
                frontend_callback = default_frontend_callback
        except Exception:
            frontend_callback = default_frontend_callback

        # Zostav redirect_uri – preferuj hodnotu zo settings, inak dynamicky podľa hostiteľa
        preferred_backend_callback = getattr(settings, "BACKEND_CALLBACK_URL", None)
        if preferred_backend_callback:
            backend_callback = preferred_backend_callback
        else:
            backend_callback = request.build_absolute_uri("/api/oauth/google/callback/")

        # Vytvor Google OAuth URL
        # OAuth state: náhodná hodnota viazaná na callback (anti-CSRF + anti-open-redirect)
        oauth_state = secrets.token_urlsafe(32)
        try:
            cache.set(f"oauth_state:{oauth_state}", frontend_callback, timeout=10 * 60)
        except Exception:
            # Ak cache nie je dostupná, fallback na default callback (bez custom callbacku)
            frontend_callback = default_frontend_callback
            try:
                cache.set(
                    f"oauth_state:{oauth_state}", frontend_callback, timeout=10 * 60
                )
            except Exception:
                pass

        params = {
            "client_id": client_id,
            "redirect_uri": backend_callback,
            "scope": "openid email profile",
            "response_type": "code",
            "access_type": "online",
            "prompt": "select_account",
            "state": oauth_state,
        }

        # Debug log - zobraz callback URL
        logger.info(f"Google OAuth callback URL: {backend_callback}")

        # URL encode parametre
        query_string = urllib.parse.urlencode(params)
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query_string}"

        # Neloguj celý auth_url (obsahuje state), stačí base informácia
        logger.info("Google OAuth auth URL prepared")
        _oauth_trace(
            "google_login_redirect",
            backend_callback=backend_callback,
            callback_origin=urllib.parse.urlparse(frontend_callback).netloc,
        )

        response = HttpResponseRedirect(auth_url)
        try:
            _set_oauth_state_cookie(
                response,
                oauth_state=oauth_state,
                frontend_callback=frontend_callback,
                backend_callback=backend_callback,
            )
        except Exception as e:
            _oauth_trace("google_login_state_cookie_failed", error=str(e)[:120])
            logger.error(f"Google login state cookie error: {str(e)}")
            return Response(
                {"error": "Chyba pri prihlásení cez Google"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return response

    except Exception as e:
        _oauth_trace("google_login_exception", error=str(e)[:120])
        logger.error(f"Google login view error: {str(e)}")
        return Response(
            {"error": "Chyba pri prihlásení cez Google"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def google_callback_view(request):
    """
    Google OAuth callback view
    """
    try:
        _oauth_trace(
            "google_callback_start",
            path=request.path,
            has_code=bool(request.GET.get("code")),
            has_state=bool(request.GET.get("state")),
            host=request.get_host(),
        )
        # Získaj authorization code
        code = request.GET.get("code")
        if not code:
            _oauth_trace("google_callback_no_code")
            logger.error("No authorization code received")
            return redirect("http://localhost:3000/auth/callback/?error=no_code")

        default_callback = getattr(
            settings, "FRONTEND_CALLBACK_URL", "http://localhost:3000/auth/callback/"
        )
        oauth_state = request.GET.get("state")

        # CSRF ochrana: state musí byť prítomný a musí zodpovedať hodnote v cache
        if not oauth_state or not oauth_state.strip():
            _oauth_trace("google_callback_invalid_state_missing")
            logger.warning("Google OAuth callback: state parameter missing")
            response = redirect(f"{default_callback}?error=invalid_state")
            _clear_oauth_state_cookie(response, request_path=request.path)
            return response
        try:
            frontend_callback = _validated_frontend_callback_from_state_cookie(
                request,
                oauth_state=oauth_state,
                default_callback=default_callback,
            )
            # Vymaž state z cache po overení (ochrana pred replay útokom)
            try:
                cache.delete(f"oauth_state:{oauth_state}")
            except Exception:
                pass
        except Exception:
            frontend_callback = _frontend_callback_from_state_cache(
                oauth_state, default_callback
            )
            _oauth_trace("google_callback_invalid_state_exception")
            logger.warning("Google OAuth callback: state cookie missing, invalid or expired")
            response = redirect(f"{frontend_callback}?error=invalid_state")
            _clear_oauth_state_cookie(response, request_path=request.path)
            return response

        # Získaj Google OAuth credentials z settings
        client_id = getattr(settings, "GOOGLE_OAUTH2_CLIENT_ID", None)
        client_secret = getattr(settings, "GOOGLE_OAUTH2_SECRET", None)

        if (
            not client_id
            or client_id.strip() in {"", "dummy-client-id", "your-google-client-id"}
        ) or (
            not client_secret
            or client_secret.strip()
            in {"", "dummy-secret", "your-google-client-secret"}
        ):
            logger.error("Google OAuth credentials not configured")
            return redirect(
                f"{frontend_callback}?error=google_credentials_not_configured"
            )

        # Vymen authorization code za access token
        token_url = "https://oauth2.googleapis.com/token"
        # Musí presne zodpovedať redirect_uri použitému v login kroku (použi rovnakú logiku)
        preferred_backend_callback = getattr(settings, "BACKEND_CALLBACK_URL", None)
        if preferred_backend_callback:
            backend_callback = preferred_backend_callback
        else:
            backend_callback = request.build_absolute_uri("/api/oauth/google/callback/")
        token_data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": backend_callback,
        }

        # Debug log (bez citlivých údajov)
        logger.info("Token exchange request initiated")
        logger.info(f"Client ID: {client_id[:10]}...")
        # Neloguj authorization code
        logger.info(f"Redirect URI: {token_data['redirect_uri']}")

        token_response = requests.post(token_url, data=token_data, timeout=10)
        if token_response.status_code != 200:
            _oauth_trace(
                "google_callback_token_exchange_failed",
                status=token_response.status_code,
            )
            logger.error(f"Token exchange failed: Status {token_response.status_code}")
            logger.error(f"Response: {token_response.text}")

            # Pokús sa parsovať JSON chybu
            try:
                error_json = token_response.json()
                error_message = error_json.get(
                    "error_description", error_json.get("error", "Unknown error")
                )
                logger.error(f"Google OAuth error: {error_message}")
            except Exception:
                error_message = token_response.text

            return redirect(
                f"{frontend_callback}?error=token_exchange_failed&details={error_message[:100]}"
            )

        token_json = token_response.json()
        access_token = token_json.get("access_token")

        if not access_token:
            _oauth_trace("google_callback_no_access_token")
            logger.error("No access token received")
            return redirect(f"{frontend_callback}?error=no_access_token")

        # Získaj používateľské údaje
        user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        user_info_response = requests.get(
            user_info_url,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )

        if user_info_response.status_code != 200:
            _oauth_trace(
                "google_callback_userinfo_failed",
                status=user_info_response.status_code,
            )
            logger.error(f"User info request failed: {user_info_response.text}")
            return redirect(f"{frontend_callback}?error=user_info_failed")

        user_info = user_info_response.json()
        email = user_info.get("email")

        if not email:
            _oauth_trace("google_callback_no_email")
            logger.error("No email in user info")
            return redirect(f"{frontend_callback}?error=no_email")

        # Získaj alebo vytvor používateľa
        try:
            user = User.objects.get(email=email)
            # Aktualizuj meno a priezvisko z Google profilu len ak:
            # 1. Používateľ NEPOUŽIL flag name_modified_by_user (t.j. flag je False)
            # 2. A meno je prázdne alebo null (kombinácia riešení 1 + 2)
            google_first_name = user_info.get("given_name", "")
            google_last_name = user_info.get("family_name", "")

            # Kontroluj zmeny PRED aktualizáciou
            name_changed = False

            # Ak používateľ manuálne upravil meno, neprepíšeme ho z Google
            if not user.name_modified_by_user:
                # Aktualizuj len ak je pole prázdne (kombinácia 1 + 2)
                if google_first_name and (
                    not user.first_name or user.first_name.strip() == ""
                ):
                    user.first_name = google_first_name
                    name_changed = True
                if google_last_name and (
                    not user.last_name or user.last_name.strip() == ""
                ):
                    user.last_name = google_last_name
                    name_changed = True

                # Ulož zmeny ak sa niečo zmenilo
                if name_changed:
                    user.save()
                    if getattr(settings, "DEBUG", False):
                        logger.info(
                            f"Updated user profile via Google OAuth (empty fields only): {email} - {user.first_name} {user.last_name}"
                        )
                    else:
                        logger.info(
                            "Updated user profile via Google OAuth (empty fields only)",
                            extra={"user_id": getattr(user, "id", None)},
                        )
            else:
                # Používateľ manuálne upravil meno - zachovať jeho zmeny
                if getattr(settings, "DEBUG", False):
                    logger.info(
                        f"User {email} has manually modified name, skipping OAuth name update"
                    )
                else:
                    logger.info(
                        "User has manually modified name, skipping OAuth name update",
                        extra={"user_id": getattr(user, "id", None)},
                    )

        except User.DoesNotExist:
            # Vytvor nového používateľa
            username = email.split("@")[0]
            # Zabezpeč, že username je unikátne
            counter = 1
            original_username = username
            while User.objects.filter(username=username).exists():
                username = f"{original_username}{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=user_info.get("given_name", ""),
                last_name=user_info.get("family_name", ""),
                is_active=True,  # Aktivuj používateľa
            )

            if getattr(settings, "DEBUG", False):
                logger.info(f"Created new user via Google OAuth: {email}")
            else:
                logger.info(
                    "Created new user via Google OAuth",
                    extra={"user_id": getattr(user, "id", None)},
                )

        # Generuj JWT tokeny
        refresh = RefreshToken.for_user(user)
        access_token_jwt = refresh.access_token

        # Cookie-only: tokeny NESMÚ byť v URL (ani pri cross-origin).
        redirect_url = f"{frontend_callback}?oauth=success&user_id={user.id}"

        if getattr(settings, "DEBUG", False):
            logger.info(f"Google OAuth login successful for user {user.email}")
        else:
            logger.info(
                "Google OAuth login successful",
                extra={"user_id": getattr(user, "id", None)},
            )

        resp = HttpResponseRedirect(redirect_url)
        try:
            from .auth import (
                _record_auth_view_timing,
                _set_auth_cookies,
                _auth_state_cookie_kwargs,
            )
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
                auth_user_cache_warm_verify_ok=1.0 if warm_auth["verify_ok"] else 0.0,
                viewer_location_cache_warm=warm_viewer_ms,
                viewer_location_cache_warm_ok=1.0 if warm_viewer_ok else 0.0,
            )
            _set_auth_cookies(resp, access=str(access_token_jwt), refresh=str(refresh))
            state_kwargs = _auth_state_cookie_kwargs()
            resp.set_cookie("auth_state", "1", max_age=7 * 24 * 60 * 60, **state_kwargs)
            _clear_oauth_state_cookie(resp, request_path=request.path)
            _oauth_trace(
                "google_callback_success",
                user_id=getattr(user, "id", None),
                redirect_target=frontend_callback,
            )
        except Exception as e:
            _oauth_trace("google_callback_set_cookie_failed", error=str(e)[:120])
            logger.error(f"Failed to set OAuth auth cookies: {e}")
        return resp

    except Exception as e:
        _oauth_trace("google_callback_exception", error=str(e)[:120])
        logger.error(f"Google OAuth callback error: {str(e)}")
        default_callback = getattr(
            settings, "FRONTEND_CALLBACK_URL", "http://localhost:3000/auth/callback/"
        )
        frontend_callback = default_callback
        try:
            oauth_state = request.GET.get("state")
            if oauth_state:
                frontend_callback = _frontend_callback_from_state_cache(
                    oauth_state, default_callback
                )
        except Exception:
            frontend_callback = default_callback
        response = redirect(f"{frontend_callback}?error=oauth_failed")
        _clear_oauth_state_cookie(response, request_path=request.path)
        return response
