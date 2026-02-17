"""
Custom allauth adapters pre Swaply
"""

from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from django.conf import settings
from django.http import HttpResponseRedirect
from django.urls import reverse
import logging

logger = logging.getLogger(__name__)


class CustomGoogleOAuth2Adapter(GoogleOAuth2Adapter):
    """
    Custom Google OAuth2 adapter pre integráciu s frontend
    """

    def complete_login(self, request, app, token, **kwargs):
        """
        Dokončí OAuth login a vráti správu do frontend
        """
        try:
            # Zavolaj pôvodný complete_login
            response = super().complete_login(request, app, token, **kwargs)

            # Získaj používateľa
            user = response.user

            # Ak je to nový používateľ, nastav základné údaje
            if user.is_new:
                # Nastav username ak nie je nastavené
                if not user.username:
                    user.username = user.email.split("@")[0]

                # Nastav ako overený používateľ
                user.is_verified = True
                user.save()

            # Generuj JWT tokeny
            from rest_framework_simplejwt.tokens import RefreshToken

            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token

            # Získaj frontend callback URL zo state parametra
            frontend_callback = request.GET.get("state", "/auth/callback/")

            # Vytvor redirect URL s tokenmi
            redirect_url = (
                f"{frontend_callback}?"
                f"token={str(access_token)}&"
                f"refresh_token={str(refresh)}&"
                f"user_id={user.id}"
            )

            logger.info(
                f"Google OAuth login successful for user {user.email}, redirecting to {redirect_url}"
            )

            return HttpResponseRedirect(redirect_url)

        except Exception as e:
            logger.error(f"Google OAuth complete_login error: {str(e)}")
            # V prípade chyby presmeruj na frontend s chybovou správou
            frontend_callback = request.GET.get("state", "/auth/callback/")
            error_url = f"{frontend_callback}?error=oauth_failed"
            return HttpResponseRedirect(error_url)
