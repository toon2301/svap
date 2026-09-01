"""Verejné API endpointy pre bezpečný reset hesla."""

import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import AllowAny

from swaply.rate_limiting import (
    password_reset_confirm_rate_limit,
    password_reset_rate_limit,
    password_reset_verify_rate_limit,
)

from ..models import User

logger = logging.getLogger(__name__)

PASSWORD_RESET_REQUEST_MESSAGE = (
    "Ak účet s touto emailovou adresou existuje a je aktívny, "
    "pošleme vám odkaz na reset hesla."
)


def _password_reset_request_response() -> JsonResponse:
    """Vráti neutrálnu odpoveď, ktorá neprezrádza stav ani existenciu účtu."""
    return JsonResponse(
        {"message": PASSWORD_RESET_REQUEST_MESSAGE},
        status=status.HTTP_200_OK,
    )


def _enqueue_password_reset_email(*, user_id: int) -> None:
    """Zaradí odoslanie e-mailu na pozadie; nikdy nevyhodí výnimku.

    Zlyhanie fronty (výpadok brokera) NESMIE ovplyvniť odpoveď: keby sa z neho
    stala chyba 500, líšila by sa od neutrálnej odpovede pri neexistujúcom účte
    a útočník by z toho vyčítal, že účet existuje. Používateľ preto dostane
    rovnakú vetu vždy a stopa po probléme ostáva len v logu.
    """
    try:
        # Lokálny import drží view nezávislé od Celery pri štarte (rovnaký vzor
        # ako `services.bug_reports.schedule_bug_report_notification`).
        from accounts.password_reset_tasks import send_password_reset_email_task

        send_password_reset_email_task.delay(user_id=user_id)
    except Exception:
        logger.warning(
            "Password reset email could not be enqueued.", exc_info=True
        )


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@password_reset_rate_limit
def password_reset_request_view(request):
    """Pošle reset aktívnemu účtu a ostatným vráti rovnakú neutrálnu odpoveď."""
    email = request.data.get("email")

    if not isinstance(email, str) or not email.strip():
        return JsonResponse(
            {"error": "Email je povinný"}, status=status.HTTP_400_BAD_REQUEST
        )

    email = email.strip()
    try:
        validate_email(email)
    except DjangoValidationError:
        return JsonResponse(
            {"error": "Zadajte platnú emailovú adresu"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Neaktívny a neexistujúci účet musia mať navonok totožné správanie.
    #
    # Odoslanie e-mailu beží MIMO tohto requestu: synchrónne odosielanie cez
    # SMTP trvalo pri existujúcom účte rádovo dlhšie než odmietnutie
    # neexistujúceho, takže samo o sebe prezrádzalo existenciu účtu – a jeho
    # zlyhanie navyše vracalo 500 tam, kde neexistujúci účet dostal 200.
    # Odteraz je odpoveď za VŠETKÝCH okolností tá istá (účet existuje /
    # neexistuje / je neaktívny / odoslanie zlyhá) a čokoľvek sa stane na
    # pozadí, deje sa to až po nej.
    user = User.objects.filter(email__iexact=email, is_active=True).only("pk").first()
    if user is not None:
        _enqueue_password_reset_email(user_id=user.pk)

    return _password_reset_request_response()


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@password_reset_confirm_rate_limit
def password_reset_confirm_view(request, uidb64, token):
    """Nastaví nové heslo iba aktívnemu používateľovi s platným tokenom."""
    new_password = request.data.get("password")

    if not new_password:
        return JsonResponse(
            {"error": "Heslo je povinné"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Dekóduj uid
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid, is_active=True)
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
        validate_password(new_password, user=user)
    except DjangoValidationError as exc:
        return JsonResponse(
            {"error": "Heslo nespĺňa bezpečnostné požiadavky", "details": list(exc.messages)},
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
@authentication_classes([])
@permission_classes([AllowAny])
@password_reset_verify_rate_limit
def password_reset_verify_token_view(request, uidb64, token):
    """Overí token len pre účet, ktorý je v čase kontroly stále aktívny."""
    try:
        # Dekóduj uid
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid, is_active=True)
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

    return JsonResponse({"valid": True}, status=status.HTTP_200_OK)
