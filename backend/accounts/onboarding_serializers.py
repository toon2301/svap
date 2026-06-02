from rest_framework import serializers

from .models import MobileOnboardingStatus, MobileOnboardingStep


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
            and attrs.get("step") != MobileOnboardingStep.EDIT_FORM
        ):
            raise serializers.ValidationError(
                {"step": "Completed onboarding must end on edit_form."}
            )
        return attrs
