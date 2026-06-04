import re

from django.conf import settings
from rest_framework import serializers

from accounts.models import OfferedSkill

from .constants import PORTFOLIO_CATEGORY_CHOICES, normalize_portfolio_category
from .models import PortfolioImage, PortfolioItem

HTML_TAG_RE = re.compile(r"<[^>]+>")
PORTFOLIO_WRITE_FIELDS = {"title", "category", "description", "related_offer"}


def _validate_plain_text(value: str, *, allow_blank: bool) -> str:
    value = (value or "").strip()
    if not allow_blank and not value:
        raise serializers.ValidationError("Toto pole je povinne.")
    if value and HTML_TAG_RE.search(value):
        raise serializers.ValidationError("HTML nie je povolene.")
    return value


def _build_media_url(request, key: str) -> str:
    base = (getattr(settings, "MEDIA_URL", "/media/") or "/media/").rstrip("/") + "/"
    normalized_key = key.lstrip("/")
    if base.startswith("/"):
        local_prefix = base.lstrip("/")
        if normalized_key.startswith(local_prefix):
            normalized_key = normalized_key[len(local_prefix) :]
    url = f"{base}{normalized_key}"
    return request.build_absolute_uri(url) if request else url


def _image_key(image: PortfolioImage, *fields: str) -> str:
    for field in fields:
        key = (getattr(image, field, "") or "").strip()
        if key:
            return key
    return ""


def _legacy_image_url(request, image: PortfolioImage) -> str | None:
    if image.status == PortfolioImage.Status.REJECTED:
        return None

    image_field = getattr(image, "image", None)
    image_name = (getattr(image_field, "name", "") or "").strip()
    if image_name:
        try:
            url = image_field.url
        except Exception:
            return None
        return request.build_absolute_uri(url) if request else url

    return None


def _image_url_for_fields(
    request,
    image: PortfolioImage,
    *fields: str,
    legacy_fallback: bool = False,
) -> str | None:
    if image.status == PortfolioImage.Status.APPROVED:
        key = _image_key(image, *fields)
        if key:
            return _build_media_url(request, key)
    if legacy_fallback:
        return _legacy_image_url(request, image)
    return None


def _image_url(request, image: PortfolioImage) -> str | None:
    return _image_url_for_fields(
        request,
        image,
        "medium_key",
        "large_key",
        "approved_key",
        legacy_fallback=True,
    )


class PortfolioImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    medium_url = serializers.SerializerMethodField()
    large_url = serializers.SerializerMethodField()

    class Meta:
        model = PortfolioImage
        fields = [
            "id",
            "image_url",
            "thumbnail_url",
            "medium_url",
            "large_url",
            "order",
            "width",
            "height",
            "status",
            "rejected_reason",
        ]
        read_only_fields = [
            "id",
            "order",
            "width",
            "height",
            "status",
            "rejected_reason",
        ]

    def get_image_url(self, obj):
        return _image_url(self.context.get("request"), obj)

    def get_thumbnail_url(self, obj):
        return _image_url_for_fields(
            self.context.get("request"),
            obj,
            "thumbnail_key",
        )

    def get_medium_url(self, obj):
        return _image_url_for_fields(
            self.context.get("request"),
            obj,
            "medium_key",
        )

    def get_large_url(self, obj):
        return _image_url_for_fields(
            self.context.get("request"),
            obj,
            "large_key",
            "approved_key",
            legacy_fallback=True,
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context.get("is_owner", False):
            data.pop("status", None)
            data.pop("rejected_reason", None)
        elif data.get("status") != PortfolioImage.Status.REJECTED:
            data.pop("rejected_reason", None)
        return data


class RelatedOfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = OfferedSkill
        fields = ["id", "category", "subcategory", "is_seeking"]
        read_only_fields = fields


class PortfolioItemWriteSerializer(serializers.ModelSerializer):
    related_offer = serializers.PrimaryKeyRelatedField(
        queryset=OfferedSkill.objects.none(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = PortfolioItem
        fields = ["title", "category", "description", "related_offer"]
        extra_kwargs = {
            "title": {"required": True, "allow_blank": False},
            "category": {"required": True, "allow_blank": False},
            "description": {"required": False, "allow_blank": True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            self.fields["related_offer"].queryset = OfferedSkill.objects.filter(
                user=user
            )

    def to_internal_value(self, data):
        if not hasattr(data, "keys"):
            raise serializers.ValidationError("Ocakava sa objekt.")
        extra_fields = set(data.keys()) - PORTFOLIO_WRITE_FIELDS
        if extra_fields:
            raise serializers.ValidationError(
                {
                    field: ["Toto pole nie je povolene."]
                    for field in sorted(extra_fields)
                }
            )
        return super().to_internal_value(data)

    def validate_title(self, value):
        return _validate_plain_text(value, allow_blank=False)

    def validate_category(self, value):
        category = normalize_portfolio_category(
            _validate_plain_text(value, allow_blank=False)
        )
        if category not in PORTFOLIO_CATEGORY_CHOICES:
            raise serializers.ValidationError("Neplatna kategoria portfolia.")
        return category

    def validate_description(self, value):
        return _validate_plain_text(value, allow_blank=True)


class PortfolioItemSerializer(serializers.ModelSerializer):
    is_featured = serializers.SerializerMethodField()
    related_offer = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()

    class Meta:
        model = PortfolioItem
        fields = [
            "id",
            "title",
            "category",
            "description",
            "sort_order",
            "is_featured",
            "related_offer",
            "cover_image",
            "images",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "title",
            "category",
            "description",
            "sort_order",
            "created_at",
            "updated_at",
        ]

    def get_is_featured(self, obj):
        return obj.id == self.context.get("featured_item_id")

    def get_related_offer(self, obj):
        offer = getattr(obj, "related_offer", None)
        if offer is None:
            return None
        if not self.context.get("is_owner", False) and getattr(
            offer, "is_hidden", False
        ):
            return None
        return RelatedOfferSerializer(offer, context=self.context).data

    def get_cover_image(self, obj):
        cover = getattr(obj, "cover_image", None)
        if cover is None:
            return None
        if (
            not self.context.get("is_owner", False)
            and cover.status != PortfolioImage.Status.APPROVED
        ):
            return None
        return PortfolioImageSerializer(cover, context=self.context).data

    def get_images(self, obj):
        images = getattr(obj, "prefetched_portfolio_images", None)
        if images is None:
            images = obj.images.all()
        return PortfolioImageSerializer(images, many=True, context=self.context).data
