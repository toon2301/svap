"""
OAuth views pre Swaply
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from allauth.socialaccount.models import SocialAccount
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from rest_framework_simplejwt.tokens import RefreshToken
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def oauth_callback_view(request):
    """
    Custom OAuth callback endpoint pre integráciu s frontend
    """
    try:
        # Získaj token z query parametrov
        token = request.GET.get('token')
        if not token:
            return Response({
                'error': 'Chýba token parameter'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Získaj social account pomocou tokenu
        # Toto je zjednodušená implementácia - v reálnom prípade by sme potrebovali
        # správne spracovať OAuth flow s Google
        try:
            social_account = SocialAccount.objects.filter(
                extra_data__contains=token
            ).first()
            
            if not social_account:
                return Response({
                    'error': 'Neplatný token'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user = social_account.user
            
            # Generovanie JWT tokenov
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            # Import serializer pre user data
            from ..serializers import UserProfileSerializer
            
            return Response({
                'message': 'OAuth prihlásenie úspešné',
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'access': str(access_token),
                    'refresh': str(refresh)
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"OAuth callback error: {str(e)}")
            return Response({
                'error': 'Chyba pri spracovaní OAuth tokenu'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"OAuth callback general error: {str(e)}")
        return Response({
            'error': 'Chyba pri OAuth callback'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def google_login_url_view(request):
    """
    Vráti Google OAuth login URL
    """
    try:
        from django.conf import settings
        
        # Získaj Google OAuth credentials
        client_id = settings.GOOGLE_OAUTH2_CLIENT_ID
        if not client_id:
            return Response({
                'error': 'Google OAuth nie je nakonfigurované'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Frontend callback URL - musí byť frontend URL, nie backend
        frontend_callback = 'http://localhost:3000/auth/callback/'
        
        # Django allauth callback URL
        backend_callback = request.build_absolute_uri('/accounts/google/login/callback/')
        
        # Vytvor Google OAuth URL s URL encoding
        import urllib.parse
        encoded_callback = urllib.parse.quote(backend_callback, safe='')
        encoded_state = urllib.parse.quote(frontend_callback, safe='')
        
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={client_id}&"
            f"redirect_uri={encoded_callback}&"
            f"scope=openid%20email%20profile&"
            f"response_type=code&"
            f"access_type=online&"
            f"state={encoded_state}"
        )
        
        return Response({
            'auth_url': auth_url,
            'redirect_uri': backend_callback,
            'frontend_callback': frontend_callback
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Google login URL error: {str(e)}")
        return Response({
            'error': 'Chyba pri vytváraní Google login URL'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
