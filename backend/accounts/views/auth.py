"""
Autentifikačné views pre Swaply
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import transaction
from django.core.cache import cache
import logging

from swaply.rate_limiting import login_rate_limit, register_rate_limit, email_verification_rate_limit
from swaply.audit_logger import (
    log_login_success, log_login_failed, log_registration_success,
    log_email_verification_success, log_email_verification_failed
)

from ..models import UserProfile
from ..serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer, 
    UserProfileSerializer,
    EmailVerificationSerializer,
    ResendVerificationSerializer
)

User = get_user_model()
logger = logging.getLogger(__name__)

# Account lockout configuration
LOGIN_FAILURE_MAX_ATTEMPTS = 5
LOGIN_FAILURE_WINDOW_MINUTES = 15
ACCOUNT_LOCKOUT_MINUTES = 15


def _lock_keys_for_email(email: str):
    safe_email = (email or '').lower().strip()
    return (
        f"login_failures:{safe_email}",
        f"login_locked:{safe_email}",
    )


def is_account_locked(email: str) -> bool:
    if not email:
        return False
    # Lockout sa aplikuje len na existujúce účty
    try:
        if not User.objects.filter(email=email).exists():
            return False
    except Exception:
        return False
    _, lock_key = _lock_keys_for_email(email)
    return bool(cache.get(lock_key))


def register_login_failure(email: str) -> bool:
    if not email:
        return False
    # Lockout sa aplikuje len na existujúce účty
    try:
        if not User.objects.filter(email=email).exists():
            return False
    except Exception:
        return False
    fail_key, lock_key = _lock_keys_for_email(email)
    data = cache.get(fail_key, {"attempts": 0})
    attempts = int(data.get("attempts", 0)) + 1
    cache.set(
        fail_key,
        {"attempts": attempts},
        timeout=LOGIN_FAILURE_WINDOW_MINUTES * 60,
    )
    if attempts >= LOGIN_FAILURE_MAX_ATTEMPTS:
        cache.set(lock_key, True, timeout=ACCOUNT_LOCKOUT_MINUTES * 60)
        return True
    return False


def reset_login_failures(email: str) -> None:
    if not email:
        return
    fail_key, lock_key = _lock_keys_for_email(email)
    cache.delete(fail_key)
    cache.delete(lock_key)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_csrf_token_view(request):
    """Získanie CSRF tokenu pre API volania"""
    from django.middleware.csrf import get_token
    csrf_token = get_token(request)
    return Response({
        'csrf_token': csrf_token
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
@register_rate_limit
def register_view(request):
    """Registrácia nového používateľa"""
    
    # Pre GET požiadavky vráť informácie o registračnom formulári
    if request.method == 'GET':
        from django.conf import settings
        return Response({
            'message': 'Registračný endpoint',
            'method': 'POST',
            'description': 'Pre registráciu použite POST metódu s údajmi o používateľovi',
            'required_fields': [
                'username', 'email', 'password', 'password_confirm',
                'user_type', 'birth_day', 'birth_month', 'birth_year', 'gender', 'captcha_token'
            ],
            'optional_fields': ['company_name', 'website'],
            'user_types': ['individual', 'company'],
            'captcha': {
                'enabled': getattr(settings, 'CAPTCHA_ENABLED', True),
                'site_key': getattr(settings, 'CAPTCHA_SITE_KEY', '')
            }
        }, status=status.HTTP_200_OK)
    
    # Pre POST požiadavky spracuj registráciu
    serializer = UserRegistrationSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        try:
            with transaction.atomic():
                user = serializer.save()
                
                # Log úspešnú registráciu
                ip_address = request.META.get('REMOTE_ADDR')
                user_agent = request.META.get('HTTP_USER_AGENT')
                log_registration_success(user, ip_address, user_agent)
                
                return Response({
                    'message': 'Registrácia bola úspešná. Skontrolujte si email a potvrďte registráciu.',
                    'user': UserProfileSerializer(user).data,
                    'email_sent': True
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            # Log error for debugging but don't expose details to client
            logger.error(f"Registration error: {str(e)}")
            return Response({
                'error': 'Chyba pri vytváraní účtu'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        'error': 'Neplatné údaje',
        'details': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
@login_rate_limit
def login_view(request):
    """Prihlásenie používateľa"""
    email = request.data.get('email')
    from django.conf import settings

    serializer = UserLoginSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Resetuj počítadlo neúspešných pokusov po úspechu
        reset_login_failures(email)

        # Generovanie JWT tokenov
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        # Log úspešné prihlásenie
        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT')
        log_login_success(user, ip_address, user_agent)
        
        return Response({
            'message': 'Prihlásenie bolo úspešné',
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'access': str(access_token),
                'refresh': str(refresh)
            }
        }, status=status.HTTP_200_OK)
    
    # Log neúspešné prihlásenie a registruj zlyhanie pre lockout
    email = request.data.get('email', 'unknown')
    ip_address = request.META.get('REMOTE_ADDR')
    user_agent = request.META.get('HTTP_USER_AGENT')
    log_login_failed(email, ip_address, user_agent)

    # Ak používateľ existuje a lockout je zapnutý, registruj zlyhanie a po prekročení prahu vráť 423
    user_email = request.data.get('email')
    if getattr(settings, 'ACCOUNT_LOCKOUT_ENABLED', True) and User.objects.filter(email=user_email).exists():
        if register_login_failure(user_email):
            return Response({
                'error': 'Účet je dočasne zablokovaný kvôli viacerým neúspešným pokusom. Skúste to neskôr.'
            }, status=423)
    
    return Response({
        'error': 'Neplatné prihlasovacie údaje',
        'details': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Odhlásenie používateľa"""
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        
        return Response({
            'message': 'Odhlásenie bolo úspešné'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        # Log error for debugging but don't expose details to client
        logger.error(f"Logout error: {str(e)}")
        return Response({
            'error': 'Chyba pri odhlasovaní'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Získanie informácií o aktuálnom používateľovi"""
    serializer = UserProfileSerializer(request.user)
    
    # Pre OAuth callback - vrátime aj tokeny
    if request.GET.get('with_tokens') == 'true':
        refresh = RefreshToken.for_user(request.user)
        access_token = refresh.access_token
        
        return Response({
            'user': serializer.data,
            'tokens': {
                'access': str(access_token),
                'refresh': str(refresh)
            }
        })
    
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
@email_verification_rate_limit
def verify_email_view(request):
    """Overenie email adresy pomocou tokenu"""
    # Podpora GET linku z emailu bez potreby CSRF (token v query stringu)
    if request.method == 'GET':
        token = request.query_params.get('token') or request.GET.get('token')
        data = {'token': token} if token else {}
    else:
        data = request.data
    serializer = EmailVerificationSerializer(data=data)
    
    if serializer.is_valid():
        try:
            if serializer.verify():
                # Log úspešnú verifikáciu
                ip_address = request.META.get('REMOTE_ADDR')
                user_agent = request.META.get('HTTP_USER_AGENT')
                # Získaj používateľa z tokenu
                from ..models import EmailVerification
                verification = EmailVerification.objects.get(token=serializer.validated_data['token'])
                log_email_verification_success(verification.user, ip_address, user_agent)
                
                # Generovanie JWT tokenov pre automatické prihlásenie
                from rest_framework_simplejwt.tokens import RefreshToken
                refresh = RefreshToken.for_user(verification.user)
                
                return Response({
                    'message': 'Email bol úspešne overený',
                    'verified': True,
                    'tokens': {
                        'access': str(refresh.access_token),
                        'refresh': str(refresh)
                    },
                    'user': {
                        'id': verification.user.id,
                        'email': verification.user.email,
                        'username': verification.user.username,
                        'is_verified': verification.user.is_verified
                    }
                }, status=status.HTTP_200_OK)
            else:
                # Log neúspešnú verifikáciu
                token = request.data.get('token', 'unknown')
                ip_address = request.META.get('REMOTE_ADDR')
                user_agent = request.META.get('HTTP_USER_AGENT')
                log_email_verification_failed(token, ip_address, user_agent, 'invalid_or_expired')
                
                return Response({
                    'error': 'Token je neplatný alebo expiroval',
                    'verified': False
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Email verification error: {str(e)}")
            return Response({
                'error': 'Chyba pri overovaní emailu'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        'error': 'Neplatné údaje',
        'details': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
@email_verification_rate_limit
def resend_verification_view(request):
    """Znovu odoslanie verifikačného emailu"""
    serializer = ResendVerificationSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            email = serializer.validated_data['email']
            user = User.objects.get(email=email)
            
            # Kontrola, či je používateľ už overený
            if user.is_verified:
                return Response({
                    'message': 'Používateľ je už overený',
                    'already_verified': True
                }, status=status.HTTP_200_OK)
            
            # Vytvorenie nového verifikačného tokenu
            from ..models import EmailVerification
            verification = EmailVerification.objects.create(user=user)
            
            # Odoslanie verifikačného emailu
            verification.send_verification_email(request)
            
            # Log znovu odoslanie
            ip_address = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT')
            logger.info(f"Resend verification email for user {user.email} from {ip_address}")
            
            return Response({
                'message': 'Verifikačný email bol znovu odoslaný',
                'email_sent': True
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({
                'error': 'Používateľ s týmto emailom neexistuje'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Resend verification error: {str(e)}")
            return Response({
                'error': 'Chyba pri odosielaní verifikačného emailu'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        'error': 'Neplatné údaje',
        'details': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)
