import re

from django.urls import reverse
from rest_framework import serializers

from accounts.models import OfferedSkill

from .constants import PORTFOLIO_CATEGORY_CHOICES, normalize_portfolio_category
from .image_storage import variant_storage_key
from .models import PortfolioImage, PortfolioItem, PortfolioItemLike

HTML_TAG_RE = re.compile(r"<[^>]+>")
PORTFOLIO_WRITE_FIELDS = {"title", "category", "description", "related_offer"}


def _validate_plain_text(value: str, *, allow_blank: bool) -> str:
    # Explicitné `code` – FE prekladá chyby podľa stabilného kódu (text je fallback).
    value = (value or "").strip()
    if not allow_blank and not value:
        raise serializers.ValidationError("Toto pole je povinne.", code="required")
    if value and HTML_TAG_RE.search(value):
        raise serializers.ValidationError(
            "HTML nie je povolene.", code="html_not_allowed"
        )
    return value


def _proxy_image_url(request, image: PortfolioImage, variant: str) -> str:
    """Absolútna URL na privátny proxy endpoint – nie priama S3 URL.

    Servírovanie aj autorizáciu rieši PortfolioImageFileView (stream cez
    FileResponse, rovnaký vzor ako MessageImageView). Serializer tu len skladá
    URL pre daný variant, takže obrázky nie sú verejne dostupné priamou S3 URL.
    """
    path = reverse("accounts:portfolio_image_file", args=[image.item_id, image.id])
    url = f"{path}?variant={variant}"
    return request.build_absolute_uri(url) if request else url


def _approved_variant_url(
    request, image: PortfolioImage, variant: str
) -> str | None:
    """Proxy URL pre variant – len ak je obrázok APPROVED a jeho S3 kľúč existuje.

    Ktoré polia tvoria variant, určuje zdieľané mapovanie v image_storage
    (PORTFOLIO_VARIANT_KEY_FIELDS) – rovnaké, podľa ktorého proxy view vyberá
    kľúč na servírovanie.
    """
    if image.status != PortfolioImage.Status.APPROVED:
        return None
    if not variant_storage_key(image, variant):
        return None
    return _proxy_image_url(request, image, variant)


def _legacy_original_url(request, image: PortfolioImage) -> str | None:
    """Fallback pre staré obrázky uložené v ImageField (bez WebP variantov)."""
    if image.status == PortfolioImage.Status.REJECTED:
        return None
    if not variant_storage_key(image, "original"):
        return None
    return _proxy_image_url(request, image, "original")


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
        request = self.context.get("request")
        return (
            _approved_variant_url(request, obj, "medium")
            or _approved_variant_url(request, obj, "large")
            or _legacy_original_url(request, obj)
        )

    def get_thumbnail_url(self, obj):
        return _approved_variant_url(self.context.get("request"), obj, "thumbnail")

    def get_medium_url(self, obj):
        return _approved_variant_url(self.context.get("request"), obj, "medium")

    def get_large_url(self, obj):
        request = self.context.get("request")
        return _approved_variant_url(request, obj, "large") or _legacy_original_url(
            request, obj
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
            raise serializers.ValidationError(
                "Neplatna kategoria portfolia.", code="invalid_category"
            )
        return category

    def validate_description(self, value):
        return _validate_plain_text(value, allow_blank=True)


class PortfolioItemSerializer(serializers.ModelSerializer):
    is_featured = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()
    related_offer = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked_by_me = serializers.SerializerMethodField()

    class Meta:
        model = PortfolioItem
        fields = [
            "id",
            "title",
            "category",
            "description",
            "sort_order",
            "is_featured",
            "can_manage",
            "related_offer",
            "cover_image",
            "images",
            "likes_count",
            "is_liked_by_me",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "title",
            "category",
            "description",
            "sort_order",
            "likes_count",
            "is_liked_by_me",
            "created_at",
            "updated_at",
        ]

    def get_is_featured(self, obj):
        return obj.id == self.context.get("featured_item_id")

    def get_can_manage(self, obj):
        return bool(self.context.get("is_owner", False))

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
        # List payload obrázky nenesie (grid číta len cover_image; detail si ich
        # fetchne samostatne) – early return bez DB prístupu, aby pri vypnutom
        # include_images nevznikol N+1 cez obj.images.all().
        if not self.context.get("include_images", True):
            return []
        images = getattr(obj, "prefetched_portfolio_images", None)
        if images is None:
            images = obj.images.all()
        return PortfolioImageSerializer(images, many=True, context=self.context).data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context.get("include_images", True):
            data.pop("images", None)
        return data

    def get_likes_count(self, obj):
        annotated_count = getattr(obj, "_likes_count", None)
        if annotated_count is not None:
            return int(annotated_count)
        return obj.portfolio_likes.count()

    def get_is_liked_by_me(self, obj):
        liked_item_ids = self.context.get("liked_portfolio_item_ids")
        if liked_item_ids is not None:
            return obj.id in liked_item_ids

        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False):
            return False
        return PortfolioItemLike.objects.filter(item=obj, user=user).exists()
