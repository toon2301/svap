from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import serializers

from swaply.validators import validate_image_file
from ..models import GroupInvitation, Message
from ..services.profile_shares import PROFILE_SHARE_METADATA_USER_ID
from .offer_share_serialization import (
    _positive_metadata_int,
    serialize_offer_share_message,
)

# Re-export pre spätnú kompatibilitu (presunuté do samostatných modulov).
from .user_serialization import (  # noqa: F401
    UserBriefSerializer,
    serialize_user_brief,
    _avatar_name_url,
    _avatar_url,
)
from .conversation_serializers import ConversationListItemSerializer  # noqa: F401

User = get_user_model()


def _validate_message_image(image):
    if not image:
        return
    try:
        validate_image_file(image)
        if hasattr(image, "seek"):
            image.seek(0)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({"image": list(exc.messages)}) from exc


def _reject_group_avatar_fields(serializer):
    data = getattr(serializer, "initial_data", {}) or {}
    blocked_fields = [field for field in ("avatar", "clear_avatar") if field in data]
    if blocked_fields:
        raise serializers.ValidationError(
            {field: "Group avatar is not supported." for field in blocked_fields}
        )


class OpenConversationSerializer(serializers.Serializer):
    target_user_id = serializers.IntegerField(min_value=1)


class ConversationListQuerySerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        max_length=100,
    )


class ConversationPinStateSerializer(serializers.Serializer):
    is_pinned = serializers.BooleanField(required=True)


class GroupConversationCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, trim_whitespace=True)
    invited_user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        max_length=49,
    )

    def validate_name(self, value):
        clean = (value or "").strip()
        if not clean:
            raise serializers.ValidationError("Názov skupiny je povinný.")
        return clean

    def validate(self, attrs):
        _reject_group_avatar_fields(self)
        return attrs


class GroupConversationUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, trim_whitespace=True, required=False)

    def validate_name(self, value):
        clean = (value or "").strip()
        if not clean:
            raise serializers.ValidationError("Názov skupiny je povinný.")
        return clean

    def validate(self, attrs):
        _reject_group_avatar_fields(self)
        return attrs


class GroupInviteSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(min_value=1)


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    text = serializers.SerializerMethodField()
    metadata = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    image_thumbnail_url = serializers.SerializerMethodField()
    has_image = serializers.SerializerMethodField()
    group_invitation = serializers.SerializerMethodField()
    profile_share = serializers.SerializerMethodField()
    offer_share = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "text",
            "image_url",
            "image_thumbnail_url",
            "has_image",
            "created_at",
            "edited_at",
            "is_deleted",
            "message_type",
            "metadata",
            "group_invitation",
            "profile_share",
            "offer_share",
        ]

    def get_sender(self, obj: Message):
        request = self.context.get("request")
        # serialize_user_brief anonymizovaného odosielateľa (is_active=False) vráti
        # is_deleted=True + prázdne meno/slug/avatar, takže neukáže ani nealtuje
        # surové "deleted-user-<uuid>".
        return serialize_user_brief(obj.sender, request)

    def get_text(self, obj: Message):
        if obj.is_deleted:
            return None
        return obj.text or None

    def get_metadata(self, obj: Message):
        if obj.message_type in (Message.Type.PROFILE_SHARE, Message.Type.OFFER_SHARE):
            return {}
        return obj.metadata or {}

    def get_image_url(self, obj: Message):
        if obj.is_deleted or not obj.image:
            return None

        request = self.context.get("request")
        url = reverse(
            "accounts:messaging_message_image",
            kwargs={
                "conversation_id": obj.conversation_id,
                "message_id": obj.id,
            },
        )
        return request.build_absolute_uri(url) if request else url

    def get_image_thumbnail_url(self, obj: Message):
        if obj.is_deleted or not obj.image or not obj.image_thumbnail:
            return None

        request = self.context.get("request")
        url = reverse(
            "accounts:messaging_message_image_thumbnail",
            kwargs={
                "conversation_id": obj.conversation_id,
                "message_id": obj.id,
            },
        )
        return request.build_absolute_uri(url) if request else url

    def get_has_image(self, obj: Message):
        return bool(not obj.is_deleted and obj.image)

    def get_group_invitation(self, obj: Message):
        if obj.message_type != Message.Type.GROUP_INVITATION:
            return None
        try:
            invitation = getattr(obj, "group_invitation", None)
        except GroupInvitation.DoesNotExist:
            invitation = None
        if invitation is None:
            invitation_id = (obj.metadata or {}).get("invitation_id")
            if not invitation_id:
                return None
            invitation = (
                GroupInvitation.objects.select_related("invited_user", "invited_by")
                .filter(id=invitation_id)
                .first()
            )
        if invitation is None:
            return None
        request = self.context.get("request")
        return {
            "id": invitation.id,
            "status": invitation.status,
            "invited_user": serialize_user_brief(invitation.invited_user, request),
            "invited_by": serialize_user_brief(invitation.invited_by, request),
            "can_respond": bool(
                request
                and getattr(request, "user", None)
                and request.user.id == invitation.invited_user_id
                and invitation.status == GroupInvitation.Status.PENDING
            ),
        }

    def get_profile_share(self, obj: Message):
        if obj.is_deleted or obj.message_type != Message.Type.PROFILE_SHARE:
            return None
        shared_user_id = _positive_metadata_int(
            obj.metadata, PROFILE_SHARE_METADATA_USER_ID
        )
        if shared_user_id is None:
            return None

        cache = self.context.setdefault("_profile_share_user_cache", {})
        if shared_user_id not in cache:
            cache[shared_user_id] = (
                User.objects.filter(
                    id=shared_user_id,
                    is_active=True,
                    is_public=True,
                )
                .exclude(is_staff=True)
                .exclude(is_superuser=True)
                .only(
                    "id",
                    "first_name",
                    "last_name",
                    "company_name",
                    "username",
                    "slug",
                    "user_type",
                    "avatar",
                )
                .first()
            )
        shared_user = cache.get(shared_user_id)
        if shared_user is None:
            return None
        return serialize_user_brief(shared_user, self.context.get("request"))

    def get_offer_share(self, obj: Message):
        return serialize_offer_share_message(
            message=obj,
            context=self.context,
            parent_instance=getattr(getattr(self, "parent", None), "instance", None),
            serialize_user_brief=serialize_user_brief,
        )


class SendMessageSerializer(serializers.Serializer):
    text = serializers.CharField(
        required=False, allow_blank=True, trim_whitespace=True, max_length=5000
    )
    image = serializers.ImageField(required=False, allow_null=True)

    def validate(self, attrs):
        text = (attrs.get("text") or "").strip()
        image = attrs.get("image")

        attrs["text"] = text

        if not text and not image:
            raise serializers.ValidationError("Either text or image is required.")
        _validate_message_image(image)

        return attrs


class PinMessageSerializer(serializers.Serializer):
    message_id = serializers.IntegerField(
        min_value=1,
        required=False,
        allow_null=True,
    )


class StartDirectMessageSerializer(serializers.Serializer):
    target_user_id = serializers.IntegerField(min_value=1)
    text = serializers.CharField(
        required=False, allow_blank=True, trim_whitespace=True, max_length=5000
    )
    image = serializers.ImageField(required=False, allow_null=True)

    def validate(self, attrs):
        text = (attrs.get("text") or "").strip()
        image = attrs.get("image")

        attrs["text"] = text

        if not text and not image:
            raise serializers.ValidationError("Either text or image is required.")
        _validate_message_image(image)

        return attrs


class MarkReadSerializer(serializers.Serializer):
    # body can be empty; keep explicit serializer for future extensibility
    pass


class MessagePresenceSerializer(serializers.Serializer):
    visible = serializers.BooleanField(required=True)
    active_conversation_id = serializers.IntegerField(
        min_value=1,
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        visible = bool(attrs.get("visible"))
        conversation_id = attrs.get("active_conversation_id")

        if visible and conversation_id is None:
            raise serializers.ValidationError(
                "active_conversation_id is required when visible is true."
            )

        if not visible:
            attrs["active_conversation_id"] = None

        return attrs
