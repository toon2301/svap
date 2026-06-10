from rest_framework import serializers

from .models import DesktopOnboardingStep, MobileOnboardingStatus, MobileOnboardingStep

COMPLETED_ONBOARDING_STEPS = {
    MobileOnboardingStep.EDIT_FORM,
    MobileOnboardingStep.SEARCH,
    MobileOnboardingStep.HELP_REQUEST,
    MobileOnboardingStep.REQUESTS,
    MobileOnboardingStep.MESSAGES,
    MobileOnboardingStep.DASHBOARD_FINISH,
}


class MobileOnboardingStateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=MobileOnboardingStatus.choices)
    step = serializers.ChoiceField(choices=MobileOnboardingStep.choices)

    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise serializers.ValidationError("Expected an object.")

        unknown_fields = set(data) - {"status", "step"}
        if unknown_fields:
            raise serializers.ValidationError(
                {field: "Unknown field." for field in sorted(unknown_fields)}
            )

        return super().to_internal_value(data)

    def validate(self, attrs):
        if (
            attrs.get("status") == MobileOnboardingStatus.COMPLETED
            and attrs.get("step") not in COMPLETED_ONBOARDING_STEPS
        ):
            raise serializers.ValidationError(
                {"step": "Completed onboarding must end on a terminal step."}
            )
        return attrs


COMPLETED_DESKTOP_ONBOARDING_STEPS = {
    DesktopOnboardingStep.EDIT_FORM,
    DesktopOnboardingStep.SEARCH,
    DesktopOnboardingStep.HELP_REQUEST,
    DesktopOnboardingStep.REQUESTS,
    DesktopOnboardingStep.MESSAGES,
    DesktopOnboardingStep.DASHBOARD_FINISH,
    DesktopOnboardingStep.PROFILE_ICON,
}


class DesktopOnboardingStateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=MobileOnboardingStatus.choices)
    step = serializers.ChoiceField(choices=DesktopOnboardingStep.choices)

    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise serializers.ValidationError("Expected an object.")

        unknown_fields = set(data) - {"status", "step"}
        if unknown_fields:
            raise serializers.ValidationError(
                {field: "Unknown field." for field in sorted(unknown_fields)}
            )

        return super().to_internal_value(data)

    def validate(self, attrs):
        if (
            attrs.get("status") == MobileOnboardingStatus.COMPLETED
            and attrs.get("step") not in COMPLETED_DESKTOP_ONBOARDING_STEPS
        ):
            raise serializers.ValidationError(
                {"step": "Completed onboarding must end on a terminal step."}
            )
        return attrs
