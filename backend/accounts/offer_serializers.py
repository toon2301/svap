from django.conf import settings
from django.db.models import Avg, Count
from rest_framework import serializers

from swaply.validators import SecurityValidator

from .models import (
    OfferedSkill,
    OfferedSkillLike,
    Review,
    SkillRequest,
    SkillRequestStatus,
)
from .district_registry import (
    get_offer_district_label,
    is_valid_offer_district_code,
    normalize_offer_country_code,
    resolve_offer_district_code,
)


class OfferedSkillSerializer(serializers.ModelSerializer):
    """Serializátor pre ponúkané zručnosti"""

    experience = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    price_from = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    price_currency = serializers.CharField(required=False, allow_blank=True)
    country_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    district_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    district = serializers.CharField(required=False, allow_blank=True)
    district_label = serializers.SerializerMethodField()
    urgency = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    duration_type = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    # Meno používateľa prehľadne pre vyhľadávanie / listingy (read-only)
    user_display_name = serializers.CharField(
        source="user.display_name", read_only=True
    )
    # ID používateľa pre identifikáciu vlastných ponúk vo vyhľadávaní
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    # Typ účtu majiteľa karty (individual/company) – pre odlíšenie osobný vs firemný účet
    owner_user_type = serializers.CharField(source="user.user_type", read_only=True)
    # Slug a avatar majiteľa pre odkaz na profil vo vyhľadávaní
    owner_slug = serializers.SerializerMethodField()
    owner_avatar_url = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()
    already_reviewed = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked_by_me = serializers.SerializerMethodField()
    my_request_status = serializers.SerializerMethodField()

    class Meta:
        model = OfferedSkill
        fields = [
            "id",
            "category",
            "subcategory",
            "description",
            "detailed_description",
            "experience_value",
            "experience_unit",
            "experience",
            "tags",
            "images",
            "price_from",
            "price_currency",
            "price_negotiable",
            "country_code",
            "district_code",
            "district",
            "district_label",
            "location",
            "opening_hours",
            "is_seeking",
            "urgency",
            "duration_type",
            "is_hidden",
            "created_at",
            "updated_at",
            "user_display_name",
            "user_id",
            "owner_user_type",
            "owner_slug",
            "owner_avatar_url",
            "can_review",
            "already_reviewed",
            "average_rating",
            "reviews_count",
            "likes_count",
            "is_liked_by_me",
            "my_request_status",
            "district_label",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "user_display_name",
            "user_id",
            "owner_user_type",
            "owner_slug",
            "owner_avatar_url",
            "can_review",
            "already_reviewed",
            "average_rating",
            "reviews_count",
            "likes_count",
            "is_liked_by_me",
            "my_request_status",
        ]

    def get_my_request_status(self, obj):
        """Stav žiadosti aktuálneho používateľa pre túto ponuku (pending/accepted/rejected/cancelled)."""
        m = self.context.get("request_status_by_offer_id")
        if not m or not isinstance(m, dict):
            return None
        return m.get(obj.id)

    def get_owner_slug(self, obj):
        """Slug majiteľa pre odkaz na profil."""
        user = getattr(obj, "user", None)
        if user is None:
            return None
        return getattr(user, "slug", None)

    def get_owner_avatar_url(self, obj):
        """URL avatara majiteľa pre hlavičku autora vo vyhľadávaní."""
        user = getattr(obj, "user", None)
        if user is None:
            return None
        request = self.context.get("request")
        try:
            if getattr(user, "avatar", None) and hasattr(user.avatar, "url"):
                url = user.avatar.url
                return request.build_absolute_uri(url) if request else url
        except Exception:
            return None
        return None

    def get_experience(self, obj):
        """Vráti experience ako objekt (ak existuje)"""
        if obj.experience_value is not None and obj.experience_unit:
            return {"value": obj.experience_value, "unit": obj.experience_unit}
        return None

    def get_images(self, obj):
        """Vráti zoznam obrázkov s absolútnou URL.

        BC:
        - Staré záznamy používajú ImageField (`img.image.url`).
        - Nové asynchrónne spracovanie používa `approved_key` a `status`.
        """
        request = self.context.get("request")
        is_owner = bool(
            request
            and getattr(request, "user", None)
            and getattr(request.user, "is_authenticated", False)
            and getattr(obj, "user_id", None) == request.user.id
        )
        results = []
        try:
            for img in getattr(obj, "images", []).all():
                url = None
                status = getattr(img, "status", None)
                if not is_owner and status not in (None, "approved"):
                    continue

                # Prefer approved_key when present and approved
                approved_key = (getattr(img, "approved_key", "") or "").strip()
                if approved_key and (status == "approved" or status is None):
                    base = getattr(settings, "MEDIA_URL", "/media/")
                    url = f"{base}{approved_key.lstrip('/')}"
                    if request:
                        url = request.build_absolute_uri(url)
                elif img.image and hasattr(img.image, "url") and (status != "rejected"):
                    # Legacy fallback (and also works for approved ImageField uploads)
                    url = img.image.url
                    if request:
                        url = request.build_absolute_uri(url)
                item = {
                    "id": img.id,
                    "image_url": url,
                    "order": img.order,
                    "status": status,
                }
                if is_owner:
                    item["rejected_reason"] = getattr(img, "rejected_reason", "") or ""
                results.append(item)
        except Exception:
            pass
        return results

    def get_district_label(self, obj):
        country_code = normalize_offer_country_code(getattr(obj, "country_code", ""))
        district_code = getattr(obj, "district_code", "") or ""
        label = get_offer_district_label(country_code, district_code)
        if label:
            return label
        return (getattr(obj, "district", "") or "").strip() or None

    def _get_review_stats(self, obj):
        # Preferuj annotované hodnoty (_avg_rating, _reviews_count) z optimalizovaného querysetu
        if hasattr(obj, "_avg_rating") and hasattr(obj, "_reviews_count"):
            return {"avg": obj._avg_rating, "cnt": obj._reviews_count}
        if not hasattr(self, "_review_stats_cache"):
            self._review_stats_cache = {}
        key = obj.pk if obj.pk is not None else id(obj)
        if key not in self._review_stats_cache:
            self._review_stats_cache[key] = obj.reviews.aggregate(
                avg=Avg("rating"),
                cnt=Count("id"),
            )
        return self._review_stats_cache[key]

    def get_average_rating(self, obj):
        agg = self._get_review_stats(obj)
        if agg["cnt"] == 0:
            return None
        avg_val = agg["avg"]
        if avg_val is None:
            return None
        return round(float(avg_val), 1)

    def get_reviews_count(self, obj):
        agg = self._get_review_stats(obj)
        return agg["cnt"] or 0

    def get_likes_count(self, obj):
        annotated_count = getattr(obj, "_likes_count", None)
        if annotated_count is not None:
            return int(annotated_count)
        return obj.offer_likes.count()

    def get_is_liked_by_me(self, obj):
        liked_offer_ids = self.context.get("liked_offer_ids")
        if liked_offer_ids is not None:
            return obj.id in liked_offer_ids

        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False):
            return False
        return OfferedSkillLike.objects.filter(offer=obj, user=user).exists()

    def get_can_review(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if obj.user_id == request.user.id:
            return False
        reviewed_offer_ids = self.context.get("reviewed_offer_ids")
        if reviewed_offer_ids is not None:
            if obj.id in reviewed_offer_ids:
                return False
        elif Review.objects.filter(reviewer=request.user, offer=obj).exists():
            return False
        if "can_review_offer_ids" in self.context:
            return obj.id in self.context["can_review_offer_ids"]
        return SkillRequest.objects.filter(
            requester=request.user,
            offer=obj,
            status=SkillRequestStatus.COMPLETED,
        ).exists()

    def get_already_reviewed(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if "reviewed_offer_ids" in self.context:
            return obj.id in self.context["reviewed_offer_ids"]
        return Review.objects.filter(
            reviewer=request.user,
            offer=obj,
        ).exists()

    def validate_district(self, value):
        """Validácia okresu - normalizuje prázdne hodnoty"""
        if value is None:
            return ""
        return value.strip() if isinstance(value, str) else ""

    def validate_country_code(self, value):
        if value in (None, ""):
            return ""
        normalized = normalize_offer_country_code(value)
        if not normalized:
            raise serializers.ValidationError("Neplatná krajina ponuky")
        return normalized

    def validate_district_code(self, value):
        if value in (None, ""):
            return ""
        return str(value).strip().lower()

    def validate_description(self, value):
        """Validácia popisu"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            if len(value) > 100:
                raise serializers.ValidationError("Popis môže mať maximálne 100 znakov")
        return value

    def validate_detailed_description(self, value):
        """Validácia podrobného popisu"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            if len(value) > 1000:
                raise serializers.ValidationError(
                    "Podrobný popis môže mať maximálne 1000 znakov"
                )
        return value

    def validate_tags(self, value):
        """Validácia tagov"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Tagy musia byť pole")
        if len(value) > 5:
            raise serializers.ValidationError("Môžeš pridať maximálne 5 tagov")
        # Validácia jednotlivých tagov
        validated_tags = []
        for tag in value:
            if not isinstance(tag, str):
                continue
            tag = tag.strip()
            if tag:
                if len(tag) > 15:
                    raise serializers.ValidationError(
                        f"Tag '{tag}' môže mať maximálne 15 znakov"
                    )
                # Odstránenie duplikátov (case-insensitive)
                tag_lower = tag.lower()
                if not any(t.lower() == tag_lower for t in validated_tags):
                    validated_tags.append(tag)
        return validated_tags

    def validate_experience_value(self, value):
        """Validácia hodnoty praxe"""
        if value is not None:
            if value < 0 or value > 100:
                raise serializers.ValidationError("Dĺžka praxe musí byť medzi 0 a 100")
        return value

    def validate(self, attrs):
        """Globálna validácia"""
        instance = getattr(self, "instance", None)

        # Ak je zadaná experience_value, musí byť aj experience_unit
        experience_value = attrs.get("experience_value")
        experience_unit = attrs.get("experience_unit")

        if experience_value is not None and not experience_unit:
            raise serializers.ValidationError(
                {
                    "experience_unit": "Jednotka praxe je povinná, ak je zadaná hodnota praxe"
                }
            )

        if not experience_value and experience_unit:
            attrs["experience_unit"] = ""  # Vyčistiť jednotku ak nie je hodnota

        price_negotiable = attrs.get(
            "price_negotiable",
            bool(getattr(instance, "price_negotiable", False)) if instance else False,
        )
        if price_negotiable:
            attrs["price_from"] = None
            attrs["price_currency"] = ""
        else:
            price_from = attrs.get("price_from")
            if price_from is not None and price_from < 0:
                raise serializers.ValidationError({"price_from": "Cena musí byť nezáporná"})
            if price_from is None:
                attrs["price_currency"] = ""
            elif not attrs.get("price_currency"):
                attrs["price_currency"] = "€"

        district_fields_present = instance is None or any(
            key in attrs for key in ("country_code", "district_code", "district")
        )

        country_code = attrs.get(
            "country_code",
            normalize_offer_country_code(getattr(instance, "country_code", "")),
        )
        district_code = attrs.get(
            "district_code",
            (getattr(instance, "district_code", "") or "").strip().lower(),
        )
        district = attrs.get("district")
        if district is None:
            district = (getattr(instance, "district", "") or "").strip()

        if not district_fields_present:
            return attrs

        if district_code:
            if not country_code:
                raise serializers.ValidationError(
                    {"country_code": "Krajina je povinná, ak je zadaný okres"}
                )
            if not is_valid_offer_district_code(country_code, district_code):
                raise serializers.ValidationError({"district_code": "Neplatný okres pre zvolenú krajinu"})
            attrs["country_code"] = country_code
            attrs["district_code"] = district_code
            attrs["district"] = get_offer_district_label(country_code, district_code)
        elif district:
            if not country_code:
                raise serializers.ValidationError(
                    {"country_code": "Krajina je povinná, ak je zadaný okres"}
                )
            resolved_code, resolved_label = resolve_offer_district_code(country_code, district)
            if not resolved_code:
                raise serializers.ValidationError({"district": "Neplatný okres pre zvolenú krajinu"})
            attrs["country_code"] = country_code
            attrs["district_code"] = resolved_code
            attrs["district"] = resolved_label
        elif "district" in attrs or "district_code" in attrs:
            attrs["district_code"] = ""
            attrs["district"] = ""
            if country_code:
                attrs["country_code"] = country_code

        return attrs

    def validate_location(self, value):
        """Validácia lokality"""
        if value:
            value = SecurityValidator.validate_input_safety(value)
            value = value.strip()
            if len(value) > 35:
                raise serializers.ValidationError("Miesto môže mať maximálne 35 znakov")
        return value


class OfferedSkillSearchSerializer(OfferedSkillSerializer):
    """Serializer pre /api/auth/search/ – dopĺňa relevance_score z annotate."""

    relevance_score = serializers.SerializerMethodField()

    class Meta(OfferedSkillSerializer.Meta):
        fields = OfferedSkillSerializer.Meta.fields + ["relevance_score"]

    def get_relevance_score(self, obj):
        try:
            return int(getattr(obj, "relevance_score", 0) or 0)
        except Exception:
            return 0
