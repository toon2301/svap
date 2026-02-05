"""
Email availability check view pre Swaply
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from swaply.rate_limiting import email_check_rate_limit
from swaply.validators import EmailValidator, SecurityValidator
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@api_view(['GET'])
@authentication_classes([])  # Verejný endpoint – bez JWT, inak starý token spôsobí 401
@permission_classes([AllowAny])
@email_check_rate_limit
def check_email_availability_view(request, email):
    """Kontrola dostupnosti emailu pre registráciu"""
    try:
        # Bezpečnostná a formátová validácia vstupu
        safe_email = SecurityValidator.validate_input_safety(email)
        safe_email = EmailValidator.validate_email(safe_email)
        
        # Skontroluj, či email už existuje v databáze
        email_exists = User.objects.filter(email=safe_email).exists()
        
        return Response({
            'available': not email_exists,
            'email': safe_email,
            'message': 'Email je dostupný' if not email_exists else 'Email už je obsadený'
        }, status=status.HTTP_200_OK)
        
    except ValidationError as e:
        logger.warning(f"Email validation error: {str(e)}")
        return Response({
            'error': str(e),
            'available': False
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"Check email availability error: {str(e)}")
        return Response({
            'error': 'Chyba pri kontrole dostupnosti emailu',
            'available': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
