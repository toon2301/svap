"""
Custom allauth views pre integráciu s frontend
"""

import logging
import urllib.parse

from allauth.socialaccount.models import SocialAccount
from django.http import HttpResponseRedirect
from django.shortcuts import redirect
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)


def google_callback_redirect(request):
    """
    Custom callback pre Google OAuth ktorý presmeruje na frontend s tokenmi
    """
    try:
        # Získaj authorization code
        code = request.GET.get("code")
        if not code:
            logger.error("No authorization code received")
            return redirect("/auth/callback/?error=no_code")

        # Získaj frontend callback URL zo state parametra
        frontend_callback = request.GET.get(
            "state", "http://localhost:3000/auth/callback/"
        )
        # Dekódovať URL ak je encoded
        try:
            frontend_callback = urllib.parse.unquote(frontend_callback)
        except Exception:
            # Fallback: nechaj pôvodnú hodnotu
            pass

        # Získaj alebo vytvor používateľa z Google údajov
        # Toto je zjednodušená implementácia - v reálnom prípade by sme použili allauth
        try:
            # Získaj social account
            social_account = SocialAccount.objects.filter(provider="google").first()

            if not social_account:
                logger.error("No Google social account found")
                return redirect(f"{frontend_callback}?error=no_social_account")

            user = social_account.user

            # Generuj JWT tokeny
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token

            # Vytvor redirect URL s tokenmi
            redirect_url = (
                f"{frontend_callback}?"
                f"token={str(access_token)}&"
                f"refresh_token={str(refresh)}&"
                f"user_id={user.id}"
            )

            from django.conf import settings

            if getattr(settings, "DEBUG", False):
                logger.info(
                    f"Google OAuth login successful for user {user.email}, redirecting to {redirect_url}"
                )
            else:
                logger.info(
                    "Google OAuth login successful",
                    extra={"user_id": getattr(user, "id", None)},
                )

            return HttpResponseRedirect(redirect_url)

        except Exception as e:
            logger.error(f"Error processing Google OAuth: {str(e)}")
            return redirect(f"{frontend_callback}?error=processing_failed")

    except Exception as e:
        logger.error(f"Google OAuth callback redirect error: {str(e)}")
        frontend_callback = request.GET.get("state", "/auth/callback/")
        return redirect(f"{frontend_callback}?error=oauth_failed")
