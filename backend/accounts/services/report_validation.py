"""Spoločné pravidlá pre nahlasovacie endpointy (recenzia, fotka, profil, príspevok).

Dôvod „iné" nenesie žiadnu informáciu sám o sebe – bez popisu nemá moderátor
z čoho vychádzať. Preto je pri ňom popis povinný, a vynucuje sa to na backende,
nie len vo FE formulári (FE guard sa dá obísť priamym volaním API).
"""

from rest_framework import status
from rest_framework.response import Response

# Stabilný kód dôvodu „iné" – FE ho posiela vo všetkých štyroch modaloch
# (od zjednotenia reason kódov posiela FE hodnotu, nie preložený text).
OTHER_REASON_CODE = "other"


def requires_description(reason: str) -> bool:
    """Vyžaduje daný dôvod povinný popis?"""
    return str(reason or "").strip().lower() == OTHER_REASON_CODE


def description_required_response() -> Response:
    return Response(
        {
            "error": "Pri dôvode „iné\" je popis povinný.",
            "code": "description_required",
        },
        status=status.HTTP_400_BAD_REQUEST,
    )
