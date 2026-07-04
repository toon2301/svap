from rest_framework import serializers

from .models import User
from .profile_serializer_mixins import (
    ProfileComputedFieldsMixin,
    ProfilePrivacyMixin,
    ProfileValidationMixin,
)


class UserProfileSerializer(
    ProfileValidationMixin,
    ProfilePrivacyMixin,
    ProfileComputedFieldsMixin,
    serializers.ModelSerializer,
):
    """Serializátor pre profil používateľa"""

    # Explicitne CharField, aby DRF URLField neodmietol vstup bez schémy pred normalizáciou
    website = serializers.CharField(required=False, allow_blank=True, max_length=200)
    additional_websites = serializers.ListField(
        child=serializers.CharField(allow_blank=True, max_length=200),
        required=False,
        allow_empty=True,
    )

    # avatar ostáva zapisovateľné (ImageField na modeli)
    # avatar_url poskytuje plnú URL pre klienta
    avatar_url = serializers.SerializerMethodField()
    completed_cooperations_count = serializers.SerializerMethodField()
    unread_skill_request_count = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    entitlements = serializers.SerializerMethodField()
    mobile_onboarding = serializers.SerializerMethodField()
    desktop_onboarding = serializers.SerializerMethodField()
    mobile_card_flip_hint = serializers.SerializerMethodField()
    desktop_card_flip_hint = serializers.SerializerMethodField()
    # Či má účet použiteľné heslo (vs. OAuth bez hesla) – pre UI zmazania účtu.
    has_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "user_type",
            "subscription_tier",
            "phone",
            "phone_visible",
            "contact_email",
            "contact_email_visible",
            "bio",
            "avatar",
            "avatar_url",
            "location",
            "district",
            "ico",
            "ico_visible",
            "job_title",
            "job_title_visible",
            "company_name",
            "website",
            "additional_websites",
            "linkedin",
            "facebook",
            "instagram",
            "youtube",
            "is_verified",
            "is_public",
            "created_at",
            "updated_at",
            "profile_completeness",
            "slug",
            "name_modified_by_user",
            "completed_cooperations_count",
            "unread_skill_request_count",
            "is_favorited",
            "entitlements",
            "mobile_onboarding",
            "desktop_onboarding",
            "mobile_card_flip_hint",
            "desktop_card_flip_hint",
            "has_password",
        ]
        read_only_fields = [
            "id",
            "email",
            "has_password",
            "subscription_tier",
            "is_verified",
            "created_at",
            "updated_at",
            "profile_completeness",
            "slug",
            "name_modified_by_user",
            "completed_cooperations_count",
            "unread_skill_request_count",
            "is_favorited",
            "entitlements",
            "mobile_onboarding",
            "desktop_onboarding",
            "mobile_card_flip_hint",
            "desktop_card_flip_hint",
        ]

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if not validated_data:
            return instance

        update_fields = set(validated_data.keys())
        update_fields.add("updated_at")
        instance.save(update_fields=list(update_fields))
        return instance
