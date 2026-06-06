from rest_framework import serializers

from .models import (
    OfferedSkill,
    Review,
    REVIEWABLE_SKILL_REQUEST_STATUSES,
    SkillRequest,
    SkillRequestTerminationReason,
    User,
)


class SkillRequestCreateSerializer(serializers.Serializer):
    """Vytvorenie žiadosti o kartu."""

    offer_id = serializers.IntegerField()
    proposed_offer_id = serializers.IntegerField(required=False, allow_null=True)
    proposal_description = serializers.CharField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )
    proposal_price_from = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    proposal_price_currency = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=8,
        trim_whitespace=True,
    )
    proposal_price_negotiable = serializers.BooleanField(required=False, default=False)
    proposal_experience_value = serializers.FloatField(
        required=False,
        allow_null=True,
        min_value=0,
        max_value=100,
    )
    proposal_experience_unit = serializers.ChoiceField(
        choices=("years", "months"),
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    def validate_offer_id(self, value):
        try:
            offer = OfferedSkill.objects.select_related("user").get(id=value)
        except OfferedSkill.DoesNotExist:
            raise serializers.ValidationError("Karta neexistuje.")

        request = self.context.get("request")
        requester_id = getattr(getattr(request, "user", None), "id", None)
        if (
            request
            and getattr(request, "user", None)
            and offer.user_id == requester_id
        ):
            raise serializers.ValidationError("Nemôžeš požiadať o vlastnú kartu.")

        owner = offer.user
        if (
            offer.is_hidden
            or not getattr(owner, "is_public", True)
            or not getattr(owner, "is_active", True)
            or getattr(owner, "is_staff", False)
            or getattr(owner, "is_superuser", False)
        ):
            raise serializers.ValidationError("Karta neexistuje.")

        self.context["offer_obj"] = offer
        return value

    def validate(self, attrs):
        offer = self.context.get("offer_obj")
        is_help_request = bool(getattr(offer, "is_seeking", False))

        description = (attrs.get("proposal_description") or "").strip()
        if is_help_request and not description:
            raise serializers.ValidationError(
                {"proposal_description": "Opis pomoci je povinný."}
            )
        if is_help_request and len(description) > 200:
            raise serializers.ValidationError(
                {"proposal_description": "Opis môže mať maximálne 200 znakov."}
            )
        attrs["proposal_description"] = description if is_help_request else ""

        if not is_help_request:
            attrs["proposed_offer_id"] = None
            attrs["proposal_price_from"] = None
            attrs["proposal_price_currency"] = ""
            attrs["proposal_price_negotiable"] = False
            attrs["proposal_experience_value"] = None
            attrs["proposal_experience_unit"] = ""
            self.context["proposed_offer_obj"] = None
            return attrs

        proposed_offer_id = attrs.get("proposed_offer_id")
        if proposed_offer_id:
            request = self.context.get("request")
            requester = getattr(request, "user", None)
            try:
                proposed_offer = OfferedSkill.objects.get(id=proposed_offer_id, user=requester)
            except OfferedSkill.DoesNotExist:
                raise serializers.ValidationError(
                    {"proposed_offer_id": "Vybraná karta neexistuje."}
                )

            if proposed_offer.is_hidden or proposed_offer.is_seeking:
                raise serializers.ValidationError(
                    {"proposed_offer_id": "Vyber kartu typu Ponúkam."}
                )

            self.context["proposed_offer_obj"] = proposed_offer
        else:
            attrs["proposed_offer_id"] = None
            self.context["proposed_offer_obj"] = None

        price_from = attrs.get("proposal_price_from")
        price_currency = (attrs.get("proposal_price_currency") or "").strip()
        attrs["proposal_price_negotiable"] = bool(
            attrs.get("proposal_price_negotiable", False)
        )
        if price_from is None:
            attrs["proposal_price_currency"] = ""
        else:
            if price_from < 0:
                raise serializers.ValidationError(
                    {"proposal_price_from": "Cena musí byť nezáporná."}
                )
            attrs["proposal_price_currency"] = price_currency or "€"

        experience_value = attrs.get("proposal_experience_value")
        experience_unit = attrs.get("proposal_experience_unit") or ""
        if experience_value is None:
            attrs["proposal_experience_unit"] = ""
        elif not experience_unit:
            raise serializers.ValidationError(
                {"proposal_experience_unit": "Jednotka praxe je povinná."}
            )

        return attrs


class SkillRequestTerminateSerializer(serializers.Serializer):
    """Payload na predčasné skončenie aktívnej výmeny."""

    reason = serializers.ChoiceField(choices=SkillRequestTerminationReason.choices)
    description = serializers.CharField(
        allow_blank=True,
        max_length=1000,
        required=False,
        trim_whitespace=True,
    )

    def validate_description(self, value):
        return (value or "").strip()


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
    proposed_offer_summary = serializers.SerializerMethodField()
    proposal_experience = serializers.SerializerMethodField()
    termination = serializers.SerializerMethodField()

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
        can_review = False
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
            can_review = (
                obj.requester_id == request.user.id
                and getattr(offer, "user_id", None) != request.user.id
                and obj.status in REVIEWABLE_SKILL_REQUEST_STATUSES
                and not already_reviewed
            )
        price_negotiable = bool(getattr(offer, "price_negotiable", False))
        return {
            "id": offer.id,
            "subcategory": getattr(offer, "subcategory", "") or "",
            "is_seeking": bool(getattr(offer, "is_seeking", False)),
            "is_hidden": bool(getattr(offer, "is_hidden", False)),
            "price_from": getattr(offer, "price_from", None),
            "price_currency": ""
            if price_negotiable
            else getattr(offer, "price_currency", "") or "€",
            "price_negotiable": price_negotiable,
            "owner": (
                {
                    "id": getattr(owner, "id", None),
                    "slug": getattr(owner, "slug", None),
                }
                if owner is not None
                else None
            ),
            "already_reviewed": already_reviewed,
            "can_review": can_review,
        }

    def get_proposed_offer_summary(self, obj):
        offer = getattr(obj, "proposed_offer", None)
        if not offer:
            return None
        owner = getattr(offer, "user", None)
        return {
            "id": offer.id,
            "category": getattr(offer, "category", "") or "",
            "subcategory": getattr(offer, "subcategory", "") or "",
            "description": getattr(offer, "description", "") or "",
            "is_seeking": bool(getattr(offer, "is_seeking", False)),
            "is_hidden": bool(getattr(offer, "is_hidden", False)),
            "price_from": getattr(offer, "price_from", None),
            "price_currency": getattr(offer, "price_currency", "") or "",
            "price_negotiable": bool(getattr(offer, "price_negotiable", False)),
            "owner": (
                {
                    "id": getattr(owner, "id", None),
                    "slug": getattr(owner, "slug", None),
                }
                if owner is not None
                else None
            ),
        }

    def get_proposal_experience(self, obj):
        if obj.proposal_experience_value is None or not obj.proposal_experience_unit:
            return None
        return {
            "value": obj.proposal_experience_value,
            "unit": obj.proposal_experience_unit,
        }

    def get_termination(self, obj):
        try:
            termination = obj.termination
        except Exception:
            return None
        terminated_by = getattr(termination, "terminated_by", None)
        return {
            "reason": termination.reason,
            "description": termination.description or "",
            "terminated_by": getattr(terminated_by, "id", None),
            "terminated_by_display_name": getattr(terminated_by, "display_name", "") or "",
            "created_at": termination.created_at,
        }

    def to_representation(self, instance):
        """Override to ensure SerializerMethodField values are included."""
        ret = super().to_representation(instance)
        # Explicitly add summary fields
        ret["requester_summary"] = self.get_requester_summary(instance)
        ret["recipient_summary"] = self.get_recipient_summary(instance)
        ret["offer_summary"] = self.get_offer_summary(instance)
        ret["proposed_offer_summary"] = self.get_proposed_offer_summary(instance)
        ret["proposal_experience"] = self.get_proposal_experience(instance)
        ret["termination"] = self.get_termination(instance)
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
            "proposed_offer",
            "proposal_description",
            "proposal_price_from",
            "proposal_price_currency",
            "proposal_price_negotiable",
            "proposal_experience_value",
            "proposal_experience_unit",
            "proposal_experience",
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
            "proposed_offer_summary",
            "termination",
        ]
        read_only_fields = fields
