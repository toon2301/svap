from rest_framework import serializers

from .models import (
    OfferedSkill,
    Review,
    SkillRequest,
    User,
)


class SkillRequestCreateSerializer(serializers.Serializer):
    """Vytvorenie žiadosti o kartu."""

    offer_id = serializers.IntegerField()

    def validate_offer_id(self, value):
        try:
            offer = OfferedSkill.objects.select_related("user").get(id=value)
        except OfferedSkill.DoesNotExist:
            raise serializers.ValidationError("Karta neexistuje.")

        request = self.context.get("request")
        if (
            request
            and getattr(request, "user", None)
            and offer.user_id == request.user.id
        ):
            raise serializers.ValidationError("Nemôžeš požiadať o vlastnú kartu.")

        self.context["offer_obj"] = offer
        return value


class SkillRequestSerializer(serializers.ModelSerializer):
    """Read serializer pre žiadosti."""

    requester_display_name = serializers.CharField(
        source="requester.display_name", read_only=True
    )
    recipient_display_name = serializers.CharField(
        source="recipient.display_name", read_only=True
    )

    offer_is_seeking = serializers.BooleanField(
        source="offer.is_seeking", read_only=True
    )
    offer_is_hidden = serializers.BooleanField(source="offer.is_hidden", read_only=True)
    offer_category = serializers.CharField(source="offer.category", read_only=True)
    offer_subcategory = serializers.CharField(
        source="offer.subcategory", read_only=True
    )
    offer_description = serializers.CharField(
        source="offer.description", read_only=True
    )

    requester_summary = serializers.SerializerMethodField()
    recipient_summary = serializers.SerializerMethodField()
    offer_summary = serializers.SerializerMethodField()

    def _avatar_url(self, user: User):
        try:
            if getattr(user, "avatar", None) and hasattr(user.avatar, "url"):
                request = self.context.get("request")
                url = user.avatar.url
                return request.build_absolute_uri(url) if request else url
        except Exception:
            return None
        return None

    def get_requester_summary(self, obj):
        u = getattr(obj, "requester", None)
        if not u:
            return None
        return {
            "id": u.id,
            "display_name": getattr(u, "display_name", None),
            "slug": getattr(u, "slug", None),
            "avatar_url": self._avatar_url(u),
        }

    def get_recipient_summary(self, obj):
        u = getattr(obj, "recipient", None)
        if not u:
            return None
        return {
            "id": u.id,
            "display_name": getattr(u, "display_name", None),
            "slug": getattr(u, "slug", None),
            "avatar_url": self._avatar_url(u),
        }

    def get_offer_summary(self, obj):
        offer = getattr(obj, "offer", None)
        if not offer:
            return None
        owner = getattr(offer, "user", None)
        request = self.context.get("request")
        already_reviewed = False
        if request and request.user.is_authenticated:
            # Prefer bulk precomputed set from view to avoid N+1 queries.
            if "reviewed_offer_ids" in self.context:
                try:
                    already_reviewed = offer.id in (self.context.get("reviewed_offer_ids") or set())
                except Exception:
                    already_reviewed = False
            else:
                already_reviewed = Review.objects.filter(
                    reviewer=request.user, offer=offer
                ).exists()
        return {
            "id": offer.id,
            "subcategory": getattr(offer, "subcategory", "") or "",
            "is_seeking": bool(getattr(offer, "is_seeking", False)),
            "is_hidden": bool(getattr(offer, "is_hidden", False)),
            "price_from": getattr(offer, "price_from", None),
            "price_currency": getattr(offer, "price_currency", "") or "€",
            "owner": (
                {
                    "id": getattr(owner, "id", None),
                    "slug": getattr(owner, "slug", None),
                }
                if owner is not None
                else None
            ),
            "already_reviewed": already_reviewed,
        }

    def to_representation(self, instance):
        """Override to ensure SerializerMethodField values are included."""
        ret = super().to_representation(instance)
        # Explicitly add summary fields
        ret["requester_summary"] = self.get_requester_summary(instance)
        ret["recipient_summary"] = self.get_recipient_summary(instance)
        ret["offer_summary"] = self.get_offer_summary(instance)
        return ret

    class Meta:
        model = SkillRequest
        fields = [
            "id",
            "status",
            "hidden_by_requester",
            "hidden_by_recipient",
            "created_at",
            "updated_at",
            "requester",
            "recipient",
            "offer",
            "requester_display_name",
            "recipient_display_name",
            "offer_is_seeking",
            "offer_is_hidden",
            "offer_category",
            "offer_subcategory",
            "offer_description",
            "requester_summary",
            "recipient_summary",
            "offer_summary",
        ]
        read_only_fields = fields
