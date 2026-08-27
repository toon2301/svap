"""Strict public serializers for saved offer and request watches."""

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .country_registry import normalize_offer_country_code
from .district_registry import get_offer_district_label
from .models import OfferWatch


class OfferWatchReadSerializer(serializers.ModelSerializer):
    """Public read contract without internal ownership and slot fields."""

    district_label = serializers.SerializerMethodField()

    class Meta:
        model = OfferWatch
        fields = (
            "id",
            "category",
            "subcategory",
            "is_seeking",
            "country_code",
            "district_code",
            "district_label",
            "price_min",
            "price_max",
            "price_currency",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_district_label(self, obj) -> str:
        if not obj.district_code:
            return ""
        return get_offer_district_label(obj.country_code, obj.district_code)


class OfferWatchWriteSerializer(serializers.Serializer):
    """Strict write contract; user, slot and workflow fields are never accepted."""

    ALLOWED_FIELDS = frozenset(
        {
            "category",
            "subcategory",
            "is_seeking",
            "country_code",
            "district_code",
            "price_min",
            "price_max",
            "price_currency",
        }
    )

    category = serializers.CharField(max_length=100, trim_whitespace=True)
    subcategory = serializers.CharField(max_length=100, trim_whitespace=True)
    is_seeking = serializers.BooleanField()
    country_code = serializers.CharField(max_length=2, trim_whitespace=True)
    district_code = serializers.CharField(
        max_length=80,
        required=False,
        allow_blank=True,
        default="",
        trim_whitespace=True,
    )
    price_min = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
        default=None,
    )
    price_max = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
        default=None,
    )
    price_currency = serializers.CharField(
        max_length=8,
        required=False,
        allow_blank=True,
        default="",
        trim_whitespace=True,
    )

    def to_internal_value(self, data):
        if hasattr(data, "keys"):
            unknown_fields = sorted(set(data.keys()) - self.ALLOWED_FIELDS)
            if unknown_fields:
                raise serializers.ValidationError(
                    {
                        field: [_("Toto pole nie je povolené.")]
                        for field in unknown_fields
                    }
                )
        return super().to_internal_value(data)

    def validate_country_code(self, value: str) -> str:
        normalized = normalize_offer_country_code(value)
        if not normalized:
            raise serializers.ValidationError(_("Vyber podporovanú krajinu."))
        return normalized

    def validate_district_code(self, value: str) -> str:
        return value.strip().lower()

    def validate(self, attrs):
        if self.partial and not attrs:
            raise serializers.ValidationError(
                _("Zadaj aspoň jedno pole, ktoré chceš upraviť.")
            )
        return attrs
