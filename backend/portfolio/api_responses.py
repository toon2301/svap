"""Zdieľané API odpovede pre portfolio views.

User-facing 404 hlášky boli duplicitne definované vo views.py aj image_views.py –
jediná definícia bráni rozídeniu textov medzi endpointmi.

Error responses nesú okrem textu aj stabilný `code` – FE ho prekladá do jazykov
aplikácie, text v `error` ostáva ako fallback pre neznáme kódy (spätná
kompatibilita: tvar `{"error": ...}` sa nemení, `code` je additívny kľúč).
"""

from rest_framework import status
from rest_framework.response import Response


def error_response(message: str, *, code: str, status_code: int) -> Response:
    return Response({"error": message, "code": code}, status=status_code)


def user_not_found() -> Response:
    return error_response(
        "Pouzivatel nebol najdeny",
        code="user_not_found",
        status_code=status.HTTP_404_NOT_FOUND,
    )


def portfolio_item_not_found() -> Response:
    return error_response(
        "Polozka portfolia nebola najdena",
        code="portfolio_item_not_found",
        status_code=status.HTTP_404_NOT_FOUND,
    )


def portfolio_image_not_found() -> Response:
    """404 keď fotka neexistuje, ALE rodičovská položka áno.

    Odlišný `code` od `portfolio_item_not_found` umožňuje FE rozlíšiť „fotka už
    zmazaná" (tichý úspech) od „celá položka zmazaná" (návrat na zoznam).
    """
    return error_response(
        "Fotka portfolia nebola najdena.",
        code="portfolio_image_not_found",
        status_code=status.HTTP_404_NOT_FOUND,
    )


def serializer_error_response(errors) -> Response:
    """400 so serializer field errors + additívna mapa `codes` (field -> [code]).

    Pôvodný tvar `{field: [text, ...]}` ostáva nezmenený – `codes` je nový kľúč
    navyše, ktorý FE použije na preklad. DRF ErrorDetail nesie `code` atribút.
    Ak by kľúč `codes` kolidoval (odmietnuté extra pole s týmto názvom), kódy sa
    vynechajú a odpoveď degraduje na pôvodný tvar.
    """
    payload = dict(errors)
    if "codes" not in payload:
        payload["codes"] = {
            field: [
                str(getattr(detail, "code", None) or "invalid")
                for detail in details
            ]
            for field, details in errors.items()
            if isinstance(details, list)
        }
    return Response(payload, status=status.HTTP_400_BAD_REQUEST)
