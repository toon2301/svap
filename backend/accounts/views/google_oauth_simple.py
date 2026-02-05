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
            backend_callback = request.build_absolute_uri('/api/oauth/google/callback/')
        
        # Vytvor Google OAuth URL
        params = {
            'client_id': client_id,
            'redirect_uri': backend_callback,
            'scope': 'openid email profile',
            'response_type': 'code',
            'access_type': 'online',
            'prompt': 'select_account',
            'state': frontend_callback
        }
        
        # Debug log - zobraz callback URL
        logger.info(f"Google OAuth callback URL: {backend_callback}")
        
        # URL encode parametre
        query_string = urllib.parse.urlencode(params)
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query_string}"
        
        logger.info(f"Google OAuth auth URL: {auth_url}")
        
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
            backend_callback = request.build_absolute_uri('/api/oauth/google/callback/')
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
        
        token_response = requests.post(token_url, data=token_data)
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
        user_info_response = requests.get(
            user_info_url,
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
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
            # Aktualizuj meno a priezvisko z Google profilu len ak:
            # 1. Používateľ NEPOUŽIL flag name_modified_by_user (t.j. flag je False)
            # 2. A meno je prázdne alebo null (kombinácia riešení 1 + 2)
            google_first_name = user_info.get('given_name', '')
            google_last_name = user_info.get('family_name', '')
            
            # Kontroluj zmeny PRED aktualizáciou
            name_changed = False
            
            # Ak používateľ manuálne upravil meno, neprepíšeme ho z Google
            if not user.name_modified_by_user:
                # Aktualizuj len ak je pole prázdne (kombinácia 1 + 2)
                if google_first_name and (not user.first_name or user.first_name.strip() == ''):
                    user.first_name = google_first_name
                    name_changed = True
                if google_last_name and (not user.last_name or user.last_name.strip() == ''):
                    user.last_name = google_last_name
                    name_changed = True
                
                # Ulož zmeny ak sa niečo zmenilo
                if name_changed:
                    user.save()
                    logger.info(f"Updated user profile via Google OAuth (empty fields only): {email} - {user.first_name} {user.last_name}")
            else:
                # Používateľ manuálne upravil meno - zachovať jeho zmeny
                logger.info(f"User {email} has manually modified name, skipping OAuth name update")
                
        except User.DoesNotExist:
            # Vytvor nového používateľa
            username = email.split('@')[0]
            # Zabezpeč, že username je unikátne
            counter = 1
            original_username = username
            while User.objects.filter(username=username).exists():
                username = f"{original_username}{counter}"
                counter += 1
            
            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=user_info.get('given_name', ''),
                last_name=user_info.get('family_name', ''),
                is_active=True  # Aktivuj používateľa
            )
            
            logger.info(f"Created new user via Google OAuth: {email}")
        
        # Generuj JWT tokeny
        refresh = RefreshToken.for_user(user)
        access_token_jwt = refresh.access_token

        # Cross-origin: ak frontend je na inej doméne, cookies sa nepošlú – pridaj tokeny do URL
        from urllib.parse import urlparse
        try:
            frontend_host = urlparse(frontend_callback).netloc
            backend_host = request.get_host().split(':')[0]
            cross_origin = frontend_host != backend_host
        except Exception:
            cross_origin = False

        base_params = f"oauth=success&user_id={user.id}"
        if cross_origin:
            # Fallback pre cross-origin: frontend uloží tokeny a pošle Authorization header
            redirect_url = (
                f"{frontend_callback}?"
                f"{base_params}&"
                f"token={urllib.parse.quote(str(access_token_jwt))}&"
                f"refresh_token={urllib.parse.quote(str(refresh))}"
            )
        else:
            redirect_url = f"{frontend_callback}?{base_params}"

        logger.info(f"Google OAuth login successful for user {user.email}")

        resp = HttpResponseRedirect(redirect_url)
        try:
            from .auth import _auth_cookie_kwargs
            kwargs = _auth_cookie_kwargs()
            resp.set_cookie("access_token", str(access_token_jwt), max_age=60 * 60, **kwargs)
            resp.set_cookie("refresh_token", str(refresh), max_age=7 * 24 * 60 * 60, **kwargs)
            state_kwargs = dict(kwargs)
            state_kwargs["httponly"] = False
            resp.set_cookie("auth_state", "1", max_age=7 * 24 * 60 * 60, **state_kwargs)
        except Exception as e:
            logger.error(f"Failed to set OAuth auth cookies: {e}")
        return resp
        
    except Exception as e:
        logger.error(f"Google OAuth callback error: {str(e)}")
        default_callback = getattr(settings, 'FRONTEND_CALLBACK_URL', 'http://localhost:3000/auth/callback/')
        frontend_callback = request.GET.get('state', default_callback)
        return redirect(f'{frontend_callback}?error=oauth_failed')
