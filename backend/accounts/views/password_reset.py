"""
Password reset views pre Swaply
"""

from django.shortcuts import render, redirect
from django.contrib.auth.tokens import default_token_generator
from django.contrib.sites.shortcuts import get_current_site
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.conf import settings
from django.contrib import messages
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework import status
from swaply.rate_limiting import password_reset_rate_limit
from ..models import User
import logging

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([AllowAny])
@password_reset_rate_limit
def password_reset_request_view(request):
    """
    API endpoint pre požiadavku na reset hesla
    """
    email = request.data.get("email")

    if not email:
        return JsonResponse(
            {"error": "Email je povinný"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Pre bezpečnosť nevracajme chybu, že používateľ neexistuje
        return JsonResponse(
            {
                "message": "Ak email existuje v našej databáze, pošleme vám odkaz na reset hesla."
            },
            status=status.HTTP_200_OK,
        )

    try:
        # Generuj token pre reset hesla
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Zostav URL pre reset hesla
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

        # Vytvor email obsah
        subject = "[Swaply] Reset hesla"

        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #7C3AED;">Reset hesla - Swaply</h2>
                
                <p>Ahoj {user.first_name or 'používateľ'},</p>
                
                <p>Dostali sme požiadavku na reset hesla pre váš účet v Swaply.</p>
                
                <p>Ak ste túto požiadavku neposlali vy, ignorujte tento email.</p>
                
                <p>Pre nastavenie nového hesla kliknite na tlačidlo nižšie:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" 
                       style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Resetovať heslo
                    </a>
                </div>
                
                <p>Alebo skopírujte tento odkaz do prehliadača:</p>
                <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
                    {reset_url}
                </p>
                
                <p><strong>Dôležité:</strong> Tento odkaz platí len 24 hodín.</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                
                <p style="font-size: 12px; color: #666;">
                    Tento email bol odoslaný automaticky, neodpovedajte naň.<br>
                    Swaply - Výmenná platforma zručností
                </p>
            </div>
        </body>
        </html>
        """

        text_message = f"""
        Reset hesla - Swaply
        
        Ahoj {user.first_name or 'používateľ'},
        
        Dostali sme požiadavku na reset hesla pre váš účet v Swaply.
        
        Ak ste túto požiadavku neposlali vy, ignorujte tento email.
        
        Pre nastavenie nového hesla kliknite na odkaz:
        {reset_url}
        
        Dôležité: Tento odkaz platí len 24 hodín.
        
        --
        Tento email bol odoslaný automaticky, neodpovedajte naň.
        Swaply - Výmenná platforma zručností
        """

        # Pošli email
        send_mail(
            subject=subject,
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )

        if getattr(settings, "DEBUG", False):
            logger.info(f"Password reset email sent to {user.email}")
        else:
            logger.info("Password reset email sent")

        return JsonResponse(
            {
                "message": "Ak email existuje v našej databáze, pošleme vám odkaz na reset hesla."
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        if getattr(settings, "DEBUG", False):
            logger.error(f"Error sending password reset email: {e}")
        else:
            logger.error("Password reset email failed")
        return JsonResponse(
            {"error": "Chyba pri odosielaní emailu. Skúste to neskôr."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm_view(request, uidb64, token):
    """
    API endpoint pre potvrdenie reset hesla
    """
    new_password = request.data.get("password")

    if not new_password:
        return JsonResponse(
            {"error": "Heslo je povinné"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Dekóduj uid
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return JsonResponse(
            {"error": "Neplatný odkaz na reset hesla"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Skontroluj token
    if not default_token_generator.check_token(user, token):
        return JsonResponse(
            {"error": "Odkaz na reset hesla vypršal alebo je neplatný"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Nastav nové heslo
        user.set_password(new_password)
        user.save()

        if getattr(settings, "DEBUG", False):
            logger.info(f"Password reset successful for user {user.email}")
        else:
            logger.info("Password reset successful")

        return JsonResponse(
            {
                "message": "Heslo bolo úspešne zmenené. Môžete sa prihlásiť s novým heslom."
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        if getattr(settings, "DEBUG", False):
            logger.error(f"Error resetting password: {e}")
        else:
            logger.error("Password reset failed")
        return JsonResponse(
            {"error": "Chyba pri zmene hesla. Skúste to neskôr."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def password_reset_verify_token_view(request, uidb64, token):
    """
    API endpoint pre overenie platnosti tokenu
    """
    try:
        # Dekóduj uid
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return JsonResponse(
            {"valid": False, "error": "Neplatný odkaz na reset hesla"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Skontroluj token
    if not default_token_generator.check_token(user, token):
        return JsonResponse(
            {"valid": False, "error": "Odkaz na reset hesla vypršal alebo je neplatný"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return JsonResponse({"valid": True, "email": user.email}, status=status.HTTP_200_OK)
