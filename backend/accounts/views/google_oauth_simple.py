"""
Jednoduchá Google OAuth implementácia bez allauth závislostí
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
from django.db import IntegrityError
import logging
import urllib.parse
import os

User = get_user_model()
logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def google_login_view(request):
    """
    Jednoduchá Google OAuth login view
    """
    try:
        # Získaj Google OAuth credentials z environment premenných
        client_id = getattr(settings, 'GOOGLE_OAUTH2_CLIENT_ID', None)
        
        # Odmietni prázdne alebo placeholder hodnoty
        if not client_id or client_id.strip() in {'', 'dummy-client-id', 'your-google-client-id'}:
            logger.error("Google OAuth Client ID nie je nastavený v settings")
            return Response({
                'error': 'Google OAuth Client ID nie je nastavený'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Frontend callback môže prísť v query parameteri `callback`, inak fallback na settings
        frontend_callback = request.GET.get(
            'callback',
            getattr(settings, 'FRONTEND_CALLBACK_URL', 'http://localhost:3000/auth/callback')
        )

        # Zostav redirect_uri – preferuj hodnotu zo settings, inak dynamicky podľa hostiteľa
        preferred_backend_callback = getattr(settings, 'BACKEND_CALLBACK_URL', None)
        if preferred_backend_callback:
            backend_callback = preferred_backend_callback
        else:
            backend_callback = request.build_absolute_uri('/api/auth/google/callback')
        
        # Vytvor Google OAuth URL
        params = {
            'client_id': client_id,
            'redirect_uri': backend_callback,
            'scope': 'openid email profile',
            'response_type': 'code',
            'access_type': 'online',
            'state': frontend_callback
        }
        
        # URL encode parametre
        query_string = urllib.parse.urlencode(params)
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query_string}"
        
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
    Google OAuth callback view
    """
    try:
        # Získaj authorization code
        code = request.GET.get('code')
        if not code:
            logger.error("No authorization code received")
            return redirect('http://localhost:3000/auth/callback/?error=no_code')
        
        # Získaj frontend callback URL
        default_callback = getattr(settings, 'FRONTEND_CALLBACK_URL', 'http://localhost:3000/auth/callback/')
        frontend_callback = request.GET.get('state', default_callback)
        
        # Získaj Google OAuth credentials z settings
        client_id = getattr(settings, 'GOOGLE_OAUTH2_CLIENT_ID', None)
        client_secret = getattr(settings, 'GOOGLE_OAUTH2_SECRET', None)
        
        if (not client_id or client_id.strip() in {'', 'dummy-client-id', 'your-google-client-id'}) or \
           (not client_secret or client_secret.strip() in {'', 'dummy-secret', 'your-google-client-secret'}):
            logger.error("Google OAuth credentials not configured")
            return redirect(f'{frontend_callback}?error=google_credentials_not_configured')
        
        # Vymen authorization code za access token
        token_url = 'https://oauth2.googleapis.com/token'
        # Musí presne zodpovedať redirect_uri použitému v login kroku (použi rovnakú logiku)
        preferred_backend_callback = getattr(settings, 'BACKEND_CALLBACK_URL', None)
        if preferred_backend_callback:
            backend_callback = preferred_backend_callback
        else:
            backend_callback = request.build_absolute_uri('/api/auth/google/callback')
        token_data = {
            'client_id': client_id,
            'client_secret': client_secret,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': backend_callback
        }
        
        # Debug log (bez citlivých údajov)
        logger.info(f"Token exchange request initiated")
        logger.info(f"Client ID: {client_id[:10]}...")
        logger.info(f"Code: {code[:10]}...")
        logger.info(f"Redirect URI: {token_data['redirect_uri']}")
        
        try:
            token_response = requests.post(token_url, data=token_data, timeout=10)
        except requests.RequestException as req_err:
            logger.error(f"Token request exception: {str(req_err)}")
            return redirect(f"{frontend_callback}?error=token_request_exception")
        if token_response.status_code != 200:
            logger.error(f"Token exchange failed: Status {token_response.status_code}")
            logger.error(f"Response: {token_response.text}")
            
            # Pokús sa parsovať JSON chybu
            try:
                error_json = token_response.json()
                error_message = error_json.get('error_description', error_json.get('error', 'Unknown error'))
                logger.error(f"Google OAuth error: {error_message}")
            except:
                error_message = token_response.text
            
            return redirect(f'{frontend_callback}?error=token_exchange_failed&details={error_message[:100]}')
        
        token_json = token_response.json()
        access_token = token_json.get('access_token')
        
        if not access_token:
            logger.error("No access token received")
            return redirect(f'{frontend_callback}?error=no_access_token')
        
        # Získaj používateľské údaje
        user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
        try:
            user_info_response = requests.get(
                user_info_url,
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10
            )
        except requests.RequestException as req_err:
            logger.error(f"User info request exception: {str(req_err)}")
            return redirect(f"{frontend_callback}?error=user_info_request_exception")
        
        if user_info_response.status_code != 200:
            logger.error(f"User info request failed: {user_info_response.text}")
            return redirect(f'{frontend_callback}?error=user_info_failed')
        
        user_info = user_info_response.json()
        email = user_info.get('email')
        
        if not email:
            logger.error("No email in user info")
            return redirect(f'{frontend_callback}?error=no_email')
        
        # Získaj alebo vytvor používateľa
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Vytvor nového používateľa s unikátnym username
            base_username = email.split('@')[0] or 'user'
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            try:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=user_info.get('given_name', ''),
                    last_name=user_info.get('family_name', ''),
                    is_active=True
                )
                logger.info(f"Created new user via Google OAuth: {email}")
            except IntegrityError as ie:
                # Ak došlo k race condition na unique email/username, skúste načítať existujúceho
                logger.warning(f"IntegrityError on user create, retrying get by email: {str(ie)}")
                try:
                    user = User.objects.get(email=email)
                except User.DoesNotExist:
                    logger.error("User create failed and user not found on retry")
                    return redirect(f"{frontend_callback}?error=user_create_failed")
        
        # Generuj JWT tokeny
        try:
            refresh = RefreshToken.for_user(user)
            access_token_jwt = refresh.access_token
        except Exception as token_err:
            logger.error(f"JWT generation failed: {str(token_err)}")
            return redirect(f"{frontend_callback}?error=token_generation_failed")
        
        # Vytvor redirect URL s tokenmi
        redirect_url = (
            f"{frontend_callback}?"
            f"token={str(access_token_jwt)}&"
            f"refresh_token={str(refresh)}&"
            f"user_id={user.id}"
        )
        
        logger.info(f"Google OAuth login successful for user {user.email}")
        
        return HttpResponseRedirect(redirect_url)
        
    except Exception as e:
        logger.error(f"Google OAuth callback error: {str(e)}")
        default_callback = getattr(settings, 'FRONTEND_CALLBACK_URL', 'http://localhost:3000/auth/callback/')
        frontend_callback = request.GET.get('state', default_callback)
        return redirect(f'{frontend_callback}?error=oauth_failed')
