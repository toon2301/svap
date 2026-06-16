from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..authentication import invalidate_user_auth_cache
from ..models import MobileOnboardingStatus, User
from ..onboarding_serializers import (
    DesktopCardFlipHintSerializer,
    DesktopOnboardingStateSerializer,
    MobileCardFlipHintSerializer,
    MobileOnboardingStateSerializer,
)


TERMINAL_STATUSES = {
    MobileOnboardingStatus.COMPLETED,
    MobileOnboardingStatus.SKIPPED,
}


def _state_payload(user, status_field, step_field):
    return {
        "version": 1,
        "status": getattr(user, status_field),
        "step": getattr(user, step_field),
    }


def _card_flip_hint_payload(user, own_field, foreign_field):
    return {
        "version": 1,
        "own_completed": bool(getattr(user, own_field)),
        "foreign_completed": bool(getattr(user, foreign_field)),
    }


def _mobile_card_flip_hint_payload(user):
    return _card_flip_hint_payload(
        user,
        "mobile_card_flip_hint_own_completed",
        "mobile_card_flip_hint_foreign_completed",
    )


def _desktop_card_flip_hint_payload(user):
    return _card_flip_hint_payload(
        user,
        "desktop_card_flip_hint_own_completed",
        "desktop_card_flip_hint_foreign_completed",
    )


def _update_onboarding_state(request, serializer_class, status_field, step_field):
    serializer = serializer_class(data=request.data)
    serializer.is_valid(raise_exception=True)

    next_status = serializer.validated_data["status"]
    next_step = serializer.validated_data["step"]

    with transaction.atomic():
        try:
            user = (
                User.objects.select_for_update()
                .only(
                    "id",
                    status_field,
                    step_field,
                )
                .get(pk=request.user.pk)
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        current_status = getattr(user, status_field)
        current_step = getattr(user, step_field)
        if (
            current_status in TERMINAL_STATUSES
            and (next_status != current_status or current_step != next_step)
        ):
            return Response(
                {"status": "Completed onboarding cannot be reopened."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            current_status != next_status
            or current_step != next_step
        ):
            setattr(user, status_field, next_status)
            setattr(user, step_field, next_step)
            user.save(
                update_fields=[
                    status_field,
                    step_field,
                ]
            )
            invalidate_user_auth_cache(user.pk)

    return Response(_state_payload(user, status_field, step_field), status=status.HTTP_200_OK)


def _update_card_flip_hint(request, serializer_class, own_field, foreign_field):
    serializer = serializer_class(data=request.data)
    serializer.is_valid(raise_exception=True)

    context = serializer.validated_data["context"]
    field = own_field if context == "own" else foreign_field

    with transaction.atomic():
        try:
            user = (
                User.objects.select_for_update()
                .only(
                    "id",
                    own_field,
                    foreign_field,
                )
                .get(pk=request.user.pk)
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not getattr(user, field):
            setattr(user, field, True)
            user.save(update_fields=[field])
            invalidate_user_auth_cache(user.pk)

    return user


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def mobile_onboarding_view(request):
    return _update_onboarding_state(
        request,
        MobileOnboardingStateSerializer,
        "mobile_onboarding_status",
        "mobile_onboarding_step",
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def desktop_onboarding_view(request):
    return _update_onboarding_state(
        request,
        DesktopOnboardingStateSerializer,
        "desktop_onboarding_status",
        "desktop_onboarding_step",
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def mobile_card_flip_hint_view(request):
    user = _update_card_flip_hint(
        request,
        MobileCardFlipHintSerializer,
        "mobile_card_flip_hint_own_completed",
        "mobile_card_flip_hint_foreign_completed",
    )
    if isinstance(user, Response):
        return user

    return Response(_mobile_card_flip_hint_payload(user), status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def desktop_card_flip_hint_view(request):
    user = _update_card_flip_hint(
        request,
        DesktopCardFlipHintSerializer,
        "desktop_card_flip_hint_own_completed",
        "desktop_card_flip_hint_foreign_completed",
    )
    if isinstance(user, Response):
        return user

    return Response(_desktop_card_flip_hint_payload(user), status=status.HTTP_200_OK)
