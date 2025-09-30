"""
Custom Google OAuth views pre Swaply
"""
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from django.conf import settings
from django.http import HttpResponseRedirect
from django.urls import reverse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def google_login_view(request):
    """
    Custom Google login view
    """
    try:
        # Získaj Google OAuth credentials
        client_id = settings.GOOGLE_OAUTH2_CLIENT_ID
        if not client_id:
            return Response({
                'error': 'Google OAuth nie je nakonfigurované'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Frontend callback URL
        frontend_callback = request.GET.get('callback', request.build_absolute_uri('/auth/callback/'))
        
        # Django allauth callback URL
        backend_callback = request.build_absolute_uri('/accounts/google/login/callback/')
        
        # Vytvor Google OAuth URL
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={client_id}&"
            f"redirect_uri={backend_callback}&"
            f"scope=openid%20email%20profile&"
            f"response_type=code&"
            f"access_type=online&"
            f"state={frontend_callback}"
        )
        
        return HttpResponseRedirect(auth_url)
        
    except Exception as e:
        logger.error(f"Google login view error: {str(e)}")
        return Response({
            'error': 'Chyba pri prihlásení cez Google'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def google_callback_view(request):
    """
    Custom Google OAuth callback view
    """
    try:
        from allauth.socialaccount.models import SocialApp
        from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
        from allauth.socialaccount.providers.oauth2.client import OAuth2Client
        from rest_framework_simplejwt.tokens import RefreshToken
        
        # Získaj authorization code
        code = request.GET.get('code')
        if not code:
            return HttpResponseRedirect('/auth/callback/?error=missing_code')
        
        # Získaj frontend callback URL
        frontend_callback = request.GET.get('state', '/auth/callback/')
        
        # Získaj Google SocialApp
        try:
            social_app = SocialApp.objects.get(provider='google')
        except SocialApp.DoesNotExist:
            return HttpResponseRedirect(f'{frontend_callback}?error=google_app_not_configured')
        
        # Vytvor OAuth2 client
        client = OAuth2Client(
            request,
            social_app.client_id,
            social_app.secret,
            GoogleOAuth2Adapter.access_token_url,
            GoogleOAuth2Adapter.authorize_url,
            GoogleOAuth2Adapter.profile_url
        )
        
        # Vymen authorization code za access token
        token = client.get_access_token(code)
        
        # Získaj používateľské údaje
        extra_data = client.get_profile_info(token)
        
        # Získaj alebo vytvor používateľa
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        email = extra_data.get('email')
        if not email:
            return HttpResponseRedirect(f'{frontend_callback}?error=no_email')
        
        # Skús nájsť existujúceho používateľa
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Vytvor nového používateľa
            user = User.objects.create_user(
                username=email.split('@')[0],
                email=email,
                first_name=extra_data.get('given_name', ''),
                last_name=extra_data.get('family_name', ''),
                is_verified=True  # Google používatelia sú automaticky overení
            )
        
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
        
        logger.info(f"Google OAuth login successful for user {user.email}")
        
        return HttpResponseRedirect(redirect_url)
        
    except Exception as e:
        logger.error(f"Google OAuth callback error: {str(e)}")
        frontend_callback = request.GET.get('state', '/auth/callback/')
        return HttpResponseRedirect(f'{frontend_callback}?error=oauth_failed')
