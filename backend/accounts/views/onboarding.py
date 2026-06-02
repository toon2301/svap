from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..authentication import invalidate_user_auth_cache
from ..models import MobileOnboardingStatus, User
from ..onboarding_serializers import MobileOnboardingStateSerializer


TERMINAL_STATUSES = {
    MobileOnboardingStatus.COMPLETED,
    MobileOnboardingStatus.SKIPPED,
}


def _state_payload(user):
    return {
        "version": 1,
        "status": user.mobile_onboarding_status,
        "step": user.mobile_onboarding_step,
    }


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def mobile_onboarding_view(request):
    serializer = MobileOnboardingStateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    next_status = serializer.validated_data["status"]
    next_step = serializer.validated_data["step"]

    with transaction.atomic():
        try:
            user = (
                User.objects.select_for_update()
                .only(
                    "id",
                    "mobile_onboarding_status",
                    "mobile_onboarding_step",
                )
                .get(pk=request.user.pk)
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        current_status = user.mobile_onboarding_status
        if current_status in TERMINAL_STATUSES and next_status != current_status:
            return Response(
                {"status": "Completed onboarding cannot be reopened."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            current_status != next_status
            or user.mobile_onboarding_step != next_step
        ):
            user.mobile_onboarding_status = next_status
            user.mobile_onboarding_step = next_step
            user.save(
                update_fields=[
                    "mobile_onboarding_status",
                    "mobile_onboarding_step",
                ]
            )
            invalidate_user_auth_cache(user.pk)

    return Response(_state_payload(user), status=status.HTTP_200_OK)
