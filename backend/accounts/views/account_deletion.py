"""
GDPR – self-service zmazanie účtu (anonymizácia).

Dva flow zdieľajú jednu anonymizačnú funkciu (accounts.account_deletion):
  - heslový účet:   DELETE /api/auth/account/            (heslo v body)
  - OAuth účet:     POST   /api/auth/account/request-deletion/  → email s odkazom
                    POST   /api/auth/account/confirm-deletion/  → token z emailu
"""

import logging

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import account_deletion_rate_limit

from ..account_deletion import anonymize_user
from ..models import AccountDeletionRequest
from .auth import _clear_auth_cookies

logger = logging.getLogger(__name__)


# POZN.: Používame POST (nie DELETE) zámerne. DELETE s JSON telom je v reálnych
# prehliadačoch + Next.js rewrites proxy nespoľahlivé (request "visí" a timeoutne),
# zatiaľ čo POST s telom funguje rovnako spoľahlivo ako login/profile flow.
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@account_deletion_rate_limit
def delete_account_view(request):
    """
    Zmazanie vlastného účtu pre používateľa S HESLOM.
    Vyžaduje heslo v body ako re-autentifikáciu (ochrana proti session hijack).
    """
    user = request.user

    # Účty bez hesla (OAuth) musia použiť email-potvrdzovací flow.
    if not user.has_usable_password():
        return Response(
            {
                "error": "Účet nemá heslo. Použite potvrdenie cez email.",
                "code": "password_not_set",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    password = request.data.get("password") or ""
    if not password or not user.check_password(password):
        return Response(
            {"error": "Nesprávne heslo."}, status=status.HTTP_403_FORBIDDEN
        )

    anonymize_user(user)

    resp = Response(
        {"message": "Účet bol zmazaný."}, status=status.HTTP_200_OK
    )
    _clear_auth_cookies(resp)
    return resp


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@account_deletion_rate_limit
def request_account_deletion_view(request):
    """
    Krok 1 (OAuth/bez hesla): pošle email s jednorazovým odkazom na potvrdenie
    NEZVRATNÉHO zmazania účtu. Odpoveď je neutrálna (neprezrádza nič navyše).
    """
    user = request.user
    try:
        deletion_request = AccountDeletionRequest.objects.create(user=user)
        deletion_request.send_deletion_email()
    except Exception:
        logger.error("Account deletion request failed")

    return Response(
        {
            "message": "Ak je to možné, poslali sme ti potvrdzovací email "
            "s odkazom na zmazanie účtu."
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@authentication_classes([])  # potvrdzuje sa tokenom z emailu, bez session
@permission_classes([AllowAny])
@account_deletion_rate_limit
def confirm_account_deletion_view(request):
    """Krok 2 (OAuth/bez hesla): potvrdí zmazanie účtu cez token z emailu."""
    token = str(request.data.get("token") or "").strip()
    if not token:
        return Response(
            {"error": "Chýba token."}, status=status.HTTP_400_BAD_REQUEST
        )

    # Celá operácia (lock tokenu → anonymizácia → označenie tokenu) je v JEDNEJ
    # transakcii: buď oboje uspeje, alebo sa oboje rollbackne. select_for_update
    # zamkne riadok proti súbežnému použitiu toho istého tokenu (dvojklik/race).
    try:
        with transaction.atomic():
            try:
                deletion_request = (
                    AccountDeletionRequest.objects.select_for_update()
                    .select_related("user")
                    .get(token=token)
                )
            except (AccountDeletionRequest.DoesNotExist, ValueError, ValidationError):
                return Response(
                    {"error": "Neplatný alebo expirovaný odkaz."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if deletion_request.is_used or deletion_request.is_expired():
                return Response(
                    {"error": "Odkaz expiroval alebo už bol použitý."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            anonymize_user(deletion_request.user)

            # Token "spáľ" až po úspešnej anonymizácii (v tej istej transakcii).
            deletion_request.is_used = True
            deletion_request.used_at = timezone.now()
            deletion_request.save(update_fields=["is_used", "used_at"])
    except Exception:
        logger.error("Account deletion confirm failed")
        return Response(
            {"error": "Zmazanie účtu zlyhalo. Skúste to znova neskôr."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {"message": "Účet bol zmazaný."}, status=status.HTTP_200_OK
    )
