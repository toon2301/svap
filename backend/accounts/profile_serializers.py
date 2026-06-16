from time import perf_counter

from django.db.models import Q
from rest_framework import serializers

from swaply.validators import (
    BioValidator,
    NameValidator,
    PhoneValidator,
    SecurityValidator,
    URLValidator,
)
from swaply.validators import HtmlSanitizer

from .models import (
    FavoriteUser,
    Notification,
    NotificationType,
    SkillRequest,
    SkillRequestStatus,
    User,
    UserType,
)
from .name_normalization import (
    build_individual_display_name,
    clean_name_value,
    normalize_profile_name_fields,
)
from .services.entitlements import get_entitlements_for_user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializátor pre profil používateľa"""

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
            "birth_date",
            "gender",
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
        read_only_fields = [
            "id",
            "email",
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

    def _record_me_serializer_timing(self, name, started_at):
        try:
            context = getattr(self, "context", None)
            if not isinstance(context, dict):
                return
            bucket = context.setdefault("_me_serializer_timing", {})
            if not isinstance(bucket, dict):
                return
            bucket[name] = (perf_counter() - started_at) * 1000.0
        except Exception:
            pass

    def get_completed_cooperations_count(self, obj):
        t0 = perf_counter()
        sent_count = getattr(obj, "_completed_sent_count", None)
        received_count = getattr(obj, "_completed_received_count", None)
        if sent_count is not None and received_count is not None:
            result = int(sent_count) + int(received_count)
            self._record_me_serializer_timing("me_serialize_completed_count", t0)
            return result
        result = SkillRequest.objects.filter(
            status=SkillRequestStatus.COMPLETED
        ).filter(
            Q(requester=obj) | Q(recipient=obj)
        ).count()
        self._record_me_serializer_timing("me_serialize_completed_count", t0)
        return result

    def get_unread_skill_request_count(self, obj):
        unread_count = getattr(obj, "_unread_skill_request_count", None)
        if unread_count is not None:
            return int(unread_count)
        return Notification.objects.filter(
            user=obj,
            type=NotificationType.SKILL_REQUEST,
            is_read=False,
        ).count()

    def get_entitlements(self, obj):
        return get_entitlements_for_user(obj)

    def get_mobile_onboarding(self, obj):
        return {
            "version": 1,
            "status": getattr(obj, "mobile_onboarding_status", "in_progress"),
            "step": getattr(obj, "mobile_onboarding_step", "home"),
        }

    def get_desktop_onboarding(self, obj):
        return {
            "version": 1,
            "status": getattr(obj, "desktop_onboarding_status", "in_progress"),
            "step": getattr(obj, "desktop_onboarding_step", "navigation"),
        }

    def get_mobile_card_flip_hint(self, obj):
        return {
            "version": 1,
            "own_completed": bool(
                getattr(obj, "mobile_card_flip_hint_own_completed", False)
            ),
            "foreign_completed": bool(
                getattr(obj, "mobile_card_flip_hint_foreign_completed", False)
            ),
        }

    def get_desktop_card_flip_hint(self, obj):
        return {
            "version": 1,
            "own_completed": bool(
                getattr(obj, "desktop_card_flip_hint_own_completed", False)
            ),
            "foreign_completed": bool(
                getattr(obj, "desktop_card_flip_hint_foreign_completed", False)
            ),
        }

    def get_avatar_url(self, obj):
        """Vráti plnú URL k avataru (ak existuje)."""
        t0 = perf_counter()
        try:
            if obj.avatar and hasattr(obj.avatar, "url"):
                request = self.context.get("request")
                url = obj.avatar.url
                if request:
                    result = request.build_absolute_uri(url)
                    self._record_me_serializer_timing("me_serialize_avatar_url", t0)
                    return result
                self._record_me_serializer_timing("me_serialize_avatar_url", t0)
                return url
        except Exception:
            self._record_me_serializer_timing("me_serialize_avatar_url", t0)
            return None
        self._record_me_serializer_timing("me_serialize_avatar_url", t0)
        return None

    def get_is_favorited(self, obj):
        request = (
            self.context.get("request")
            if isinstance(getattr(self, "context", None), dict)
            else None
        )
        viewer = getattr(request, "user", None) if request is not None else None
        if not getattr(viewer, "is_authenticated", False):
            return False
        if getattr(viewer, "id", None) == getattr(obj, "id", None):
            return False

        annotated = getattr(obj, "_is_favorited", None)
        if annotated is not None:
            return bool(annotated)

        return FavoriteUser.objects.filter(
            user_id=getattr(viewer, "id", None),
            favorite_user_id=getattr(obj, "id", None),
        ).exists()

    def to_representation(self, instance):
        """
        Object-aware privacy filter:
        - Owner vidí všetko.
        - Ne-owner:
          - nikdy nevracaj: email, birth_date, gender
          - phone len ak phone_visible=True
          - ico len ak ico_visible=True
          - contact_email len ak contact_email_visible=True (ak flag existuje), inak nikdy
        """
        t_super0 = perf_counter()
        ret = super().to_representation(instance)
        self._record_me_serializer_timing("me_serialize_representation", t_super0)

        t_privacy0 = perf_counter()
        request = self.context.get("request") if isinstance(getattr(self, "context", None), dict) else None
        viewer = getattr(request, "user", None) if request is not None else None
        is_owner = bool(
            viewer
            and getattr(viewer, "is_authenticated", False)
            and getattr(viewer, "id", None) == getattr(instance, "id", None)
        )
        if is_owner:
            self._record_me_serializer_timing("me_serialize_privacy_filter", t_privacy0)
            return ret

        # Never return these fields for non-owners
        ret.pop("email", None)
        ret.pop("birth_date", None)
        ret.pop("gender", None)
        ret.pop("unread_skill_request_count", None)
        ret.pop("subscription_tier", None)
        ret.pop("entitlements", None)
        ret.pop("mobile_onboarding", None)
        ret.pop("desktop_onboarding", None)
        ret.pop("mobile_card_flip_hint", None)
        ret.pop("desktop_card_flip_hint", None)

        # Conditional fields
        if not getattr(instance, "phone_visible", False):
            ret.pop("phone", None)

        if not getattr(instance, "ico_visible", False):
            ret.pop("ico", None)

        if hasattr(instance, "contact_email_visible"):
            if not getattr(instance, "contact_email_visible", False):
                ret.pop("contact_email", None)
        else:
            # No visibility flag exists -> never return contact email for non-owners
            ret.pop("contact_email", None)

        self._record_me_serializer_timing("me_serialize_privacy_filter", t_privacy0)
        return ret

    def validate_first_name(self, value):
        """Validácia mena"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return NameValidator.validate_name(value, "Meno")
        return value

    def validate_last_name(self, value):
        """Validácia priezviska"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return NameValidator.validate_name(value, "Priezvisko")
        return value

    def validate_user_type(self, value):
        """Povoľuje len individual alebo company – bezpečnostná validácia pre produkciu."""
        if value not in (UserType.INDIVIDUAL, UserType.COMPANY):
            raise serializers.ValidationError(
                "Typ účtu môže byť iba 'individual' alebo 'company'."
            )
        return value

    def validate(self, attrs):
        """Globálna validácia pre závislé polia (meno + limit počtu webov)."""
        validated = super().validate(attrs)
        instance = getattr(self, "instance", None)
        current_user_type = getattr(instance, "user_type", UserType.INDIVIDUAL)
        next_user_type = validated.get(
            "user_type",
            current_user_type,
        )
        current_first = (
            validated.get("first_name")
            if "first_name" in validated
            else (getattr(instance, "first_name", "") if instance else "")
        )
        current_last = (
            validated.get("last_name")
            if "last_name" in validated
            else (getattr(instance, "last_name", "") if instance else "")
        )
        current_company = (
            validated.get("company_name")
            if "company_name" in validated
            else (getattr(instance, "company_name", "") if instance else "")
        )
        if (
            next_user_type == UserType.COMPANY
            and current_user_type != UserType.COMPANY
            and "company_name" not in validated
        ):
            current_company = ""
        normalized_names = normalize_profile_name_fields(
            user_type=next_user_type,
            first_name=current_first,
            last_name=current_last,
            company_name=current_company,
        )
        if next_user_type == UserType.COMPANY and not clean_name_value(
            normalized_names["company_name"]
        ):
            raise serializers.ValidationError(
                {"company_name": "Názov firmy je povinný."}
            )

        # Ak sa mení first_name alebo last_name, skontroluj celkovú dĺžku
        if next_user_type == UserType.INDIVIDUAL and (
            "first_name" in validated or "last_name" in validated
        ):
            current_first = (
                validated.get("first_name")
                if "first_name" in validated
                else (getattr(instance, "first_name", "") if instance else "")
            )
            current_last = (
                validated.get("last_name")
                if "last_name" in validated
                else (getattr(instance, "last_name", "") if instance else "")
            )

            full_name = build_individual_display_name(current_first, current_last)
            if len(full_name) > 35:
                raise serializers.ValidationError(
                    {
                        "first_name": "Celé meno (meno a priezvisko) môže mať maximálne 35 znakov vrátane medzier."
                    }
                )

        # Limit počtu webov (hlavný web + dodatočné)
        website = validated.get("website")
        if website is None and instance is not None:
            website = getattr(instance, "website", "")
        additional = validated.get("additional_websites")
        if additional is None and instance is not None:
            additional = getattr(instance, "additional_websites", [])
        additional = additional or []
        additional = [w for w in additional if (w or "").strip()]
        total_websites = (1 if (website or "").strip() else 0) + len(additional)
        if total_websites > 5:
            raise serializers.ValidationError(
                {
                    "additional_websites": "Maximálny počet webových odkazov je 5 (hlavný web + dodatočné)."
                }
            )

        # Kategória a podkategória odstránené – ignorujeme prípadné vstupy
        if "category" in validated:
            validated.pop("category", None)
        if "category_sub" in validated:
            validated.pop("category_sub", None)

        name_or_type_changed = "user_type" in validated or any(
            field in validated for field in ("first_name", "last_name", "company_name")
        )
        if name_or_type_changed:
            validated.update(normalized_names)
        return validated

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if not validated_data:
            return instance

        update_fields = set(validated_data.keys())
        update_fields.add("updated_at")
        instance.save(update_fields=list(update_fields))
        return instance

    def validate_phone(self, value):
        """Validácia telefónu"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return PhoneValidator.validate_phone(value)
        return value

    def validate_website(self, value):
        """Validácia webovej stránky"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return URLValidator.validate_url(value, "Webová stránka")
        return value

    def validate_linkedin(self, value):
        """Validácia LinkedIn URL"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return URLValidator.validate_url(value, "LinkedIn")
        return value

    def validate_facebook(self, value):
        """Validácia Facebook URL"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return URLValidator.validate_url(value, "Facebook")
        return value

    def validate_instagram(self, value):
        """Validácia Instagram URL"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return URLValidator.validate_url(value, "Instagram")
        return value

    def validate_youtube(self, value):
        """Validácia YouTube URL"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            return URLValidator.validate_url(value, "YouTube")
        return value

    def validate_bio(self, value):
        """Validácia bio textu"""
        if value:
            # Najprv sanitizácia HTML
            sanitized = HtmlSanitizer.sanitize_html(value)
            # Potom bezpečnostná validácia na sanitizovanom texte
            sanitized = SecurityValidator.validate_input_safety(sanitized)
            return BioValidator.validate_bio(sanitized)
        return value

    def validate_location(self, value):
        """Validácia lokácie"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            if len(value.strip()) > 25:
                raise serializers.ValidationError(
                    "Lokácia môže mať maximálne 25 znakov"
                )
            return value.strip()
        return value

    def validate_district(self, value):
        """Validácia okresu v profile používateľa"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            # Okres je voľné textové pole, ale obmedzíme dĺžku kvôli UI / DB
            if len(value.strip()) > 100:
                raise serializers.ValidationError("Okres môže mať maximálne 100 znakov")
            return value.strip()
        return value

    def validate_job_title(self, value):
        """Validácia profesie (len pre osobný účet) – max 25 znakov"""
        if value:
            value = (value or "").strip()
            if len(value) > 25:
                raise serializers.ValidationError("Profesia môže mať maximálne 25 znakov")
            return value
        return value

    def validate_ico(self, value):
        """Validácia IČO"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            # Odstránenie medzier a čiarky
            value = value.replace(" ", "").replace(",", "").strip()
            # Dĺžka: povolené 8 až 14 číslic
            if not value.isdigit():
                raise serializers.ValidationError("IČO môže obsahovať iba číslice")
            if len(value) < 8 or len(value) > 14:
                raise serializers.ValidationError("IČO musí mať 8 až 14 číslic")
            return value
        return value
