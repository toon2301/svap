"""Stable API error responses for offer create and update operations."""

from rest_framework import status
from rest_framework.response import Response


DESCRIPTION_TOO_LONG_CODE = "offer_description_too_long"
DUPLICATE_OFFER_CODE = "duplicate_offer"
OFFER_LIMIT_REACHED_CODE = "offer_limit_reached"
OFFER_COUNTRY_REQUIRED_CODE = "offer_country_required"
VALIDATION_FAILED_CODE = "offer_validation_failed"


def duplicate_offer_response() -> Response:
    return Response(
        {
            "code": DUPLICATE_OFFER_CODE,
            "error": "Takúto ponuku alebo dopyt už máš vytvorený.",
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


def offer_limit_reached_response(*, skill_type: str) -> Response:
    return Response(
        {
            "code": OFFER_LIMIT_REACHED_CODE,
            "error": f'Môžeš mať maximálne 3 karty v sekcii "{skill_type}".',
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


def serializer_validation_error_response(errors) -> Response:
    description_errors = errors.get("description", []) if hasattr(errors, "get") else []
    country_errors = errors.get("country_code", []) if hasattr(errors, "get") else []
    has_description_length_error = any(
        getattr(error, "code", None) == "max_length" for error in description_errors
    )
    has_country_required_error = any(
        getattr(error, "code", None) == "required" for error in country_errors
    )
    if has_description_length_error:
        code = DESCRIPTION_TOO_LONG_CODE
        message = "Krátky opis môže obsahovať maximálne 150 znakov."
    elif has_country_required_error:
        code = OFFER_COUNTRY_REQUIRED_CODE
        message = "Vyber krajinu ponuky alebo dopytu."
    else:
        code = VALIDATION_FAILED_CODE
        message = "Skontroluj vyplnené údaje a skús to znova."

    # Keep existing top-level field errors for backwards compatibility;
    # code is the stable contract consumed by the current UI.
    payload = dict(errors)
    payload.update({"code": code, "error": message})
    return Response(payload, status=status.HTTP_400_BAD_REQUEST)
