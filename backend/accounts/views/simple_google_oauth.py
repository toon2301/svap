"""
Jednoduchá Google OAuth implementácia bez allauth
"""

import requests
from django.http import HttpResponseRedirect
from django.shortcuts import redirect
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
import logging
import urllib.parse

User = get_user_model()
logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([AllowAny])
def google_login_view(request):
    """
    Jednoduchá Google OAuth login view
    """
    try:
        # Získaj Google OAuth credentials z Django admin
        from allauth.socialaccount.models import SocialApp

        try:
            social_app = SocialApp.objects.get(provider="google")
            client_id = social_app.client_id
        except SocialApp.DoesNotExist:
            return Response(
                {"error": "Google OAuth nie je nakonfigurovaný v Django admin"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not client_id:
            return Response(
                {"error": "Google OAuth Client ID nie je nastavený"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Dynamicky získaj URL-ky z nastavení
        from django.conf import settings

        frontend_callback = getattr(
            settings, "FRONTEND_CALLBACK_URL", "http://localhost:3000/auth/callback/"
        )
        backend_callback = getattr(
            settings,
            "BACKEND_CALLBACK_URL",
            "http://localhost:8000/api/oauth/google/callback/",
        )

        # Vytvor Google OAuth URL
        params = {
            "client_id": client_id,
            "redirect_uri": backend_callback,
            "scope": "openid email profile",
            "response_type": "code",
            "access_type": "online",
            "state": frontend_callback,
        }

        # URL encode parametre
        query_string = urllib.parse.urlencode(params)
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query_string}"

        return HttpResponseRedirect(auth_url)

    except Exception as e:
        logger.error(f"Google login view error: {str(e)}")
        return Response(
            {"error": "Chyba pri prihlásení cez Google"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def google_callback_view(request):
    """
    Google OAuth callback view
    """
    try:
        # Získaj authorization code
        code = request.GET.get("code")
        if not code:
            logger.error("No authorization code received")
            return redirect("http://localhost:3000/auth/callback/?error=no_code")

        # Získaj frontend callback URL
        from django.conf import settings

        default_callback = getattr(
            settings, "FRONTEND_CALLBACK_URL", "http://localhost:3000/auth/callback/"
        )
        frontend_callback = request.GET.get("state", default_callback)

        # Získaj Google OAuth credentials z Django admin
        from allauth.socialaccount.models import SocialApp

        try:
            social_app = SocialApp.objects.get(provider="google")
            client_id = social_app.client_id
            client_secret = social_app.secret
        except SocialApp.DoesNotExist:
            logger.error("Google OAuth app not found in Django admin")
            return redirect(f"{frontend_callback}?error=google_app_not_configured")

        # Vymen authorization code za access token
        token_url = "https://oauth2.googleapis.com/token"
        backend_callback = getattr(
            settings,
            "BACKEND_CALLBACK_URL",
            "http://localhost:8000/api/oauth/google/callback/",
        )
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
        logger.info(f"Code: {code[:10]}...")
        logger.info(f"Redirect URI: {token_data['redirect_uri']}")

        token_response = requests.post(token_url, data=token_data, timeout=10)
        if token_response.status_code != 200:
            logger.error(f"Token exchange failed: Status {token_response.status_code}")
            logger.error(f"Response: {token_response.text}")
            logger.error(f"Request data: {token_data}")

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
            logger.error(f"User info request failed: {user_info_response.text}")
            return redirect(f"{frontend_callback}?error=user_info_failed")

        user_info = user_info_response.json()
        email = user_info.get("email")

        if not email:
            logger.error("No email in user info")
            return redirect(f"{frontend_callback}?error=no_email")

        # Získaj alebo vytvor používateľa
        try:
            user = User.objects.get(email=email)
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
                is_verified=True,  # Google používatelia sú automaticky overení
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

        # Vytvor redirect URL s tokenmi (URL encoded)
        redirect_url = (
            f"{frontend_callback}?"
            f"token={urllib.parse.quote(str(access_token_jwt))}&"
            f"refresh_token={urllib.parse.quote(str(refresh))}&"
            f"user_id={user.id}"
        )

        if getattr(settings, "DEBUG", False):
            logger.info(f"Google OAuth login successful for user {user.email}")
            logger.info(
                f"Redirecting to: {redirect_url[:200]}..."
            )  # obsahuje citlivé query parametre
        else:
            logger.info(
                "Google OAuth login successful",
                extra={"user_id": getattr(user, "id", None)},
            )

        return HttpResponseRedirect(redirect_url)

    except Exception as e:
        logger.error(f"Google OAuth callback error: {str(e)}")
        default_callback = getattr(
            settings, "FRONTEND_CALLBACK_URL", "http://localhost:3000/auth/callback/"
        )
        frontend_callback = request.GET.get("state", default_callback)
        return redirect(f"{frontend_callback}?error=oauth_failed")
