"""Stráž proti prázdnym multipart nahrávaniam (súbor, ktorý klient nedoručil).

WebKit v iOS/Safari (hlásené od verzie 26.5, potvrdené aj na iOS 27.0.1) pošle pri
nahrávaní súboru cez XHR/fetch požiadavku s hlavičkou `multipart/form-data`, ale
s PRÁZDNYM telom (`Content-Length: 0`). Taká požiadavka by vyzerala ako „žiadne
údaje“: profil by sa uložil naprázdno a správa by zlyhala všeobecnou hláškou
„Neplatné údaje“. Modul prázdne nahrávanie rozpozná, zaloguje (bez osobných
údajov) a vráti jednoznačný kód, ktorý frontend preloží do zrozumiteľnej hlášky.
"""

from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.response import Response

logger = logging.getLogger(__name__)

EMPTY_AVATAR_UPLOAD = "empty_avatar_upload"
EMPTY_MESSAGE_UPLOAD = "empty_message_upload"

_UPLOAD_METHODS = ("POST", "PUT", "PATCH")
_MAX_LOGGED_USER_AGENT = 160


def is_empty_multipart_request(request, *, methods=_UPLOAD_METHODS) -> bool:
    """Vráti True, ak požiadavka hlási `multipart/form-data`, no nenesie žiadne pole ani súbor.

    Zámerne ide len o úplne prázdne telo: multipart s aspoň jedným poľom (napr. len
    `text`) je platná požiadavka a prechádza ďalej do validácie.
    """
    content_type = str(getattr(request, "content_type", "") or "").lower()
    return (
        request.method in methods
        and content_type.startswith("multipart/form-data")
        and not request.data
    )


def empty_multipart_response(request, code: str) -> Response:
    """Zaloguje prázdne nahrávanie a vráti HTTP 400 s kódom pre frontend.

    Log nenesie osobné údaje ani identitu používateľa, len technické okolnosti
    (cesta, metóda, `Content-Length`, skrátený user-agent), aby sa dalo overiť,
    z akých zariadení prázdne nahrávania prichádzajú.
    """
    user_agent = str(request.META.get("HTTP_USER_AGENT", ""))[:_MAX_LOGGED_USER_AGENT]
    logger.warning(
        "Empty multipart upload (client sent no body): code=%s path=%s method=%s "
        "content_length=%s user_agent=%s",
        code,
        request.path,
        request.method,
        request.META.get("CONTENT_LENGTH", ""),
        user_agent,
    )
    return Response({"code": code}, status=status.HTTP_400_BAD_REQUEST)
