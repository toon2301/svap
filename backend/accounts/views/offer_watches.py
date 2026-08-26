"""Authenticated CRUD API for the current user's saved offer watches."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.translation import gettext_lazy as _
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..offer_watch_serializers import (
    OfferWatchReadSerializer,
    OfferWatchWriteSerializer,
)
from ..services.offer_watches import (
    OfferWatchDuplicate,
    OfferWatchLimitReached,
    OfferWatchNotFound,
    create_offer_watch,
    delete_offer_watch,
    get_offer_watch,
    offer_watches_for_user,
    update_offer_watch,
)


VALIDATION_FAILED_CODE = "offer_watch_validation_failed"
DUPLICATE_CODE = "duplicate_offer_watch"
LIMIT_REACHED_CODE = "offer_watch_limit_reached"
NOT_FOUND_CODE = "offer_watch_not_found"


def _error_response(*, code: str, message, response_status: int, errors=None):
    payload = dict(errors or {})
    payload.update({"code": code, "error": message})
    return Response(payload, status=response_status)


def _serializer_validation_response(errors):
    return _error_response(
        code=VALIDATION_FAILED_CODE,
        message=_("Skontroluj vyplnené údaje a skús to znova."),
        response_status=status.HTTP_400_BAD_REQUEST,
        errors=errors,
    )


def _model_validation_response(exc: DjangoValidationError):
    if hasattr(exc, "message_dict"):
        errors = {
            field: [str(message) for message in messages]
            for field, messages in exc.message_dict.items()
        }
    else:
        errors = {"non_field_errors": [str(message) for message in exc.messages]}
    return _serializer_validation_response(errors)


def _not_found_response():
    return _error_response(
        code=NOT_FOUND_CODE,
        message=_("Sledovanie nebolo nájdené."),
        response_status=status.HTTP_404_NOT_FOUND,
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def offer_watches_view(request):
    """List the caller's watches or create one in the first free slot."""

    if request.method == "GET":
        watches = offer_watches_for_user(user=request.user)
        return Response(
            OfferWatchReadSerializer(watches, many=True).data,
            status=status.HTTP_200_OK,
        )

    serializer = OfferWatchWriteSerializer(data=request.data)
    if not serializer.is_valid():
        return _serializer_validation_response(serializer.errors)

    try:
        watch = create_offer_watch(
            user=request.user,
            **serializer.validated_data,
        )
    except OfferWatchLimitReached:
        return _error_response(
            code=LIMIT_REACHED_CODE,
            message=_("Môžeš mať maximálne 5 sledovaní."),
            response_status=status.HTTP_400_BAD_REQUEST,
        )
    except OfferWatchDuplicate:
        return _error_response(
            code=DUPLICATE_CODE,
            message=_("Takéto sledovanie už máš vytvorené."),
            response_status=status.HTTP_400_BAD_REQUEST,
        )
    except DjangoValidationError as exc:
        return _model_validation_response(exc)

    return Response(
        OfferWatchReadSerializer(watch).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def offer_watch_detail_view(request, watch_id: int):
    """Read, partially update or delete one watch owned by the caller."""

    if request.method == "GET":
        try:
            watch = get_offer_watch(user=request.user, watch_id=watch_id)
        except OfferWatchNotFound:
            return _not_found_response()
        return Response(
            OfferWatchReadSerializer(watch).data,
            status=status.HTTP_200_OK,
        )

    if request.method == "DELETE":
        try:
            delete_offer_watch(user=request.user, watch_id=watch_id)
        except OfferWatchNotFound:
            return _not_found_response()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = OfferWatchWriteSerializer(
        data=request.data,
        partial=True,
    )
    if not serializer.is_valid():
        return _serializer_validation_response(serializer.errors)

    try:
        watch = update_offer_watch(
            user=request.user,
            watch_id=watch_id,
            **serializer.validated_data,
        )
    except OfferWatchNotFound:
        return _not_found_response()
    except OfferWatchDuplicate:
        return _error_response(
            code=DUPLICATE_CODE,
            message=_("Takéto sledovanie už máš vytvorené."),
            response_status=status.HTTP_400_BAD_REQUEST,
        )
    except DjangoValidationError as exc:
        return _model_validation_response(exc)

    return Response(
        OfferWatchReadSerializer(watch).data,
        status=status.HTTP_200_OK,
    )
