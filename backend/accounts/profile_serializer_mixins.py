"""
Mixiny pre UserProfileSerializer (vyčlenené z profile_serializers.py kvôli dĺžke).

- ProfileComputedFieldsMixin: SerializerMethodField gettery + timing helper.
- ProfilePrivacyMixin: to_representation (object-aware privacy filter pre non-ownerov).
- ProfileValidationMixin: per-field validate_* + globálna validate().

Field-deklarácie a Meta ostávajú na UserProfileSerializer (DRF metaclass zbiera
declared fields len z tried s _declared_fields), tieto mixiny nesú iba metódy.
MRO: UserProfileSerializer(ProfileValidationMixin, ProfilePrivacyMixin,
ProfileComputedFieldsMixin, ModelSerializer) — super() vo validate()/to_representation()
korektne dosiahne ModelSerializer.
"""

from time import perf_counter

from django.db.models import Q
from rest_framework import serializers

from swaply.image_metadata import strip_image_metadata
from swaply.validators import (
    BioValidator,
    HtmlSanitizer,
    NameValidator,
    PhoneValidator,
    URLValidator,
)

from .models import (
    FavoriteUser,
    Notification,
    NotificationType,
    SkillRequest,
    SkillRequestStatus,
    UserType,
)
from .name_normalization import (
    build_individual_display_name,
    clean_name_value,
    normalize_profile_name_fields,
)
from .services.entitlements import get_entitlements_for_user


class ProfileComputedFieldsMixin:
    """SerializerMethodField gettery + timing helper pre /me serializáciu."""

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

    def get_has_password(self, obj):
        """True ak má účet použiteľné heslo (False pre OAuth účty bez hesla)."""
        try:
            return bool(obj.has_usable_password())
        except Exception:
            return True

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


class ProfilePrivacyMixin:
    """Object-aware privacy filter: non-owner nevidí citlivé polia."""

    def to_representation(self, instance):
        """
        Object-aware privacy filter:
        - Owner vidí všetko.
        - Ne-owner:
          - nikdy nevracaj: email
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
        ret.pop("has_password", None)
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

        if not getattr(instance, "job_title_visible", False):
            ret.pop("job_title", None)

        if hasattr(instance, "contact_email_visible"):
            if not getattr(instance, "contact_email_visible", False):
                ret.pop("contact_email", None)
        else:
            # No visibility flag exists -> never return contact email for non-owners
            ret.pop("contact_email", None)

        self._record_me_serializer_timing("me_serialize_privacy_filter", t_privacy0)
        return ret


class ProfileValidationMixin:
    """Per-field validate_* + globálna validate() pre profil."""

    def validate_first_name(self, value):
        """Validácia mena"""
        if value:
            # NameValidator je allowlist (len písmená/čísla/medzery/pomlčky) –
            # nebezpečné znaky pre HTML/SQL injekciu sám odmietne. Neblokujeme
            # legitímne mená kvôli zhode s SQL kľúčovým slovom.
            return NameValidator.validate_name(value, "Meno")
        return value

    def validate_last_name(self, value):
        """Validácia priezviska"""
        if value:
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

    def validate_avatar(self, value):
        """GDPR: odstráň EXIF/GPS metadáta z avatara pred uložením do storage.

        Beží až po štandardnej validácii obrázka (veľkosť/typ/SafeSearch);
        pri neúspechu stripu ponecháme originál (fail-open, nerozbije upload).
        """
        if not value:
            return value
        stripped = strip_image_metadata(value)
        return stripped if stripped is not None else value

    def validate_phone(self, value):
        """Validácia telefónu"""
        if value:
            # PhoneValidator povolí len číslice/+/-/()/medzery – iné znaky odmietne.
            return PhoneValidator.validate_phone(value)
        return value

    def validate_website(self, value):
        """Validácia a normalizácia webovej stránky (doplní https:// ak chýba schéma)"""
        if value:
            # URLValidator je skutočný guard: blokuje nebezpečné schémy
            # (javascript:, data:, …) a vyžaduje platnú http(s) URL. Legitímnu URL
            # s bežným slovom v ceste (napr. /update) už neblokujeme.
            return URLValidator.normalize_url(value, "Webová stránka")
        return value

    def validate_additional_websites(self, value):
        """Validácia a normalizácia dodatočných webov"""
        if not value:
            return value
        normalized = []
        for i, url in enumerate(value):
            url = (url or "").strip()
            if not url:
                continue
            url = URLValidator.normalize_url(url, f"Web {i + 2}")
            normalized.append(url)
        return normalized

    def validate_linkedin(self, value):
        """Validácia LinkedIn URL"""
        if value:
            return URLValidator.validate_url(value, "LinkedIn")
        return value

    def validate_facebook(self, value):
        """Validácia Facebook URL"""
        if value:
            return URLValidator.validate_url(value, "Facebook")
        return value

    def validate_instagram(self, value):
        """Validácia Instagram URL"""
        if value:
            return URLValidator.validate_url(value, "Instagram")
        return value

    def validate_youtube(self, value):
        """Validácia YouTube URL"""
        if value:
            return URLValidator.validate_url(value, "YouTube")
        return value

    def validate_bio(self, value):
        """Validácia bio textu"""
        if value:
            # Sanitizácia HTML/XSS cez bleach (odstráni <script>, nebezpečné tagy).
            # Neblokujeme legitímny text s bežnými slovami ako "update"/"select" –
            # SQL injekcia nehrozí, ORM používa parametrizované dotazy.
            sanitized = HtmlSanitizer.sanitize_html(value)
            return BioValidator.validate_bio(sanitized)
        return value

    def validate_location(self, value):
        """Validácia lokácie"""
        if value:
            # Sanitizácia HTML/XSS namiesto blokovania bežných slov (viď validate_bio).
            value = HtmlSanitizer.sanitize_html(value)
            if len(value.strip()) > 25:
                raise serializers.ValidationError(
                    "Lokácia môže mať maximálne 25 znakov"
                )
            return value.strip()
        return value

    def validate_district(self, value):
        """Validácia okresu v profile používateľa"""
        if value:
            # Sanitizácia HTML/XSS namiesto blokovania bežných slov (viď validate_bio).
            value = HtmlSanitizer.sanitize_html(value)
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
            # Odstránenie medzier a čiarky
            value = value.replace(" ", "").replace(",", "").strip()
            # Dĺžka: povolené 8 až 14 číslic
            if not value.isdigit():
                raise serializers.ValidationError("IČO môže obsahovať iba číslice")
            if len(value) < 8 or len(value) > 14:
                raise serializers.ValidationError("IČO musí mať 8 až 14 číslic")
            return value
        return value
