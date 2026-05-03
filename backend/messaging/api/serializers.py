from __future__ import annotations

from django.core.files.storage import default_storage
from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from django.urls import reverse
from rest_framework import serializers

from accounts.name_normalization import get_canonical_display_name
from ..models import Conversation, ConversationParticipant, GroupInvitation, Message

User = get_user_model()


def _reject_group_avatar_fields(serializer):
    data = getattr(serializer, "initial_data", {}) or {}
    blocked_fields = [field for field in ("avatar", "clear_avatar") if field in data]
    if blocked_fields:
        raise serializers.ValidationError(
            {
                field: "Group avatar is not supported."
                for field in blocked_fields
            }
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


class UserBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    display_name = serializers.CharField()
    slug = serializers.CharField(allow_null=True, required=False)
    user_type = serializers.CharField(allow_null=True, required=False)
    avatar_url = serializers.CharField(allow_null=True, required=False)


def serialize_user_brief(user, request=None):
    return {
        "id": user.id,
        "display_name": getattr(user, "display_name", "") or "",
        "slug": getattr(user, "slug", None),
        "user_type": getattr(user, "user_type", None),
        "avatar_url": _avatar_url(request, user),
    }


def _avatar_url(request, user) -> str | None:
    try:
        avatar = getattr(user, "avatar", None)
        if avatar and hasattr(avatar, "url"):
            url = avatar.url
            return request.build_absolute_uri(url) if request else url
    except Exception:
        return None
    return None


def _avatar_name_url(request, avatar_name: str | None) -> str | None:
    if not avatar_name:
        return None
    try:
        url = default_storage.url(avatar_name)
        return request.build_absolute_uri(url) if request else url
    except Exception:
        return None


class ConversationListItemSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    avatar_members = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()
    current_user_role = serializers.SerializerMethodField()
    current_user_status = serializers.SerializerMethodField()
    has_requestable_offers = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    last_message_sender_id = serializers.SerializerMethodField()
    last_message_is_deleted = serializers.SerializerMethodField()
    last_message_has_image = serializers.SerializerMethodField()
    last_message_type = serializers.SerializerMethodField()
    is_pinned = serializers.SerializerMethodField()
    last_read_at = serializers.DateTimeField(read_only=True, allow_null=True)
    has_unread = serializers.BooleanField(read_only=True)
    unread_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Conversation
        fields = [
            "id",
            "last_message_at",
            "last_message_preview",
            "last_message_sender_id",
            "last_message_is_deleted",
            "last_message_has_image",
            "last_message_type",
            "other_user",
            "is_group",
            "name",
            "avatar_url",
            "avatar_members",
            "participants",
            "participant_count",
            "current_user_role",
            "current_user_status",
            "has_requestable_offers",
            "last_read_at",
            "is_pinned",
            "has_unread",
            "unread_count",
            "updated_at",
        ]

    def _is_current_user_invited_group(self, obj: Conversation) -> bool:
        if not getattr(obj, "is_group", False):
            return False
        return self.get_current_user_status(obj) == ConversationParticipant.Status.INVITED

    def get_other_user(self, obj: Conversation):
        if getattr(obj, "is_group", False):
            return None
        request = self.context.get("request")
        annotated_other_user_id = getattr(obj, "other_user_id", None)
        if annotated_other_user_id:
            return {
                "id": annotated_other_user_id,
                "display_name": get_canonical_display_name(
                    user_type=getattr(obj, "other_user_type", "") or "",
                    first_name=getattr(obj, "other_user_first_name", "") or "",
                    last_name=getattr(obj, "other_user_last_name", "") or "",
                    company_name=getattr(obj, "other_user_company_name", "") or "",
                    username=getattr(obj, "other_user_username", "") or "",
                ),
                "slug": getattr(obj, "other_user_slug", None),
                "user_type": getattr(obj, "other_user_type", None),
                "avatar_url": _avatar_name_url(
                    request, getattr(obj, "other_user_avatar_name", None)
                ),
            }

        me = request.user if request else None
        participants: QuerySet[ConversationParticipant] | list[ConversationParticipant] = getattr(
            obj, "_prefetched_participants", None
        ) or getattr(obj, "participants", []).all()
        other = None
        for p in participants:
            if me is None or p.user_id != me.id:
                other = p.user
                break
        if other is None:
            return None
        return serialize_user_brief(other, request)

    def get_avatar_url(self, obj: Conversation):
        # Group avatars are always composed from member avatars on the client.
        return None

    def get_avatar_members(self, obj: Conversation):
        if not getattr(obj, "is_group", False):
            return []
        if self._is_current_user_invited_group(obj):
            return []
        request = self.context.get("request")
        me = request.user if request else None
        participants = (
            ConversationParticipant.objects.filter(
                conversation=obj,
                status=ConversationParticipant.Status.ACTIVE,
            )
            .select_related("user")
            .order_by("role", "joined_at", "id")
        )
        if me is not None:
            participants = participants.exclude(user_id=me.id)
        return [serialize_user_brief(participant.user, request) for participant in participants[:4]]

    def get_participant_count(self, obj: Conversation) -> int:
        if not getattr(obj, "is_group", False):
            return 2
        if self._is_current_user_invited_group(obj):
            return 0
        annotated_count = getattr(obj, "participant_count", None)
        if annotated_count is not None:
            return int(annotated_count)
        return ConversationParticipant.objects.filter(
            conversation=obj,
            status=ConversationParticipant.Status.ACTIVE,
        ).count()

    def get_participants(self, obj: Conversation):
        if not getattr(obj, "is_group", False):
            return []
        if self._is_current_user_invited_group(obj):
            return []
        request = self.context.get("request")
        participants = (
            ConversationParticipant.objects.filter(
                conversation=obj,
                status__in=[
                    ConversationParticipant.Status.ACTIVE,
                    ConversationParticipant.Status.INVITED,
                ],
            )
            .select_related("user")
            .order_by("role", "status", "joined_at", "id")
        )
        return [
            {
                **serialize_user_brief(participant.user, request),
                "role": participant.role,
                "status": participant.status,
            }
            for participant in participants
        ]

    def get_current_user_role(self, obj: Conversation):
        request = self.context.get("request")
        if not request or not getattr(request, "user", None):
            return None
        annotated_role = getattr(obj, "current_user_role", None)
        if annotated_role:
            return annotated_role
        participant = ConversationParticipant.objects.filter(
            conversation=obj,
            user=request.user,
        ).only("role").first()
        return participant.role if participant else None

    def get_current_user_status(self, obj: Conversation):
        request = self.context.get("request")
        if not request or not getattr(request, "user", None):
            return None
        annotated_status = getattr(obj, "current_user_status", None)
        if annotated_status:
            return annotated_status
        participant = ConversationParticipant.objects.filter(
            conversation=obj,
            user=request.user,
        ).only("status").first()
        return participant.status if participant else None

    def get_last_message_preview(self, obj: Conversation):
        if self._is_current_user_invited_group(obj):
            return None
        if getattr(obj, "last_message_is_deleted", False):
            return None
        preview = getattr(obj, "last_message_preview", None)
        return preview or None

    def get_last_message_sender_id(self, obj: Conversation):
        if self._is_current_user_invited_group(obj):
            return None
        return getattr(obj, "last_message_sender_id", None)

    def get_last_message_is_deleted(self, obj: Conversation) -> bool:
        if self._is_current_user_invited_group(obj):
            return False
        return bool(getattr(obj, "last_message_is_deleted", False))

    def get_last_message_has_image(self, obj: Conversation) -> bool:
        if self._is_current_user_invited_group(obj):
            return False
        return bool(getattr(obj, "last_message_has_image", False))

    def get_last_message_type(self, obj: Conversation):
        if self._is_current_user_invited_group(obj):
            return Message.Type.GROUP_INVITATION
        return getattr(obj, "last_message_type", None)

    def get_has_requestable_offers(self, obj: Conversation) -> bool:
        return bool(getattr(obj, "has_requestable_offers", False))

    def get_is_pinned(self, obj: Conversation) -> bool:
        return bool(getattr(obj, "is_pinned", False))


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    text = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    has_image = serializers.SerializerMethodField()
    group_invitation = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "text",
            "image_url",
            "has_image",
            "created_at",
            "edited_at",
            "is_deleted",
            "message_type",
            "metadata",
            "group_invitation",
        ]

    def get_sender(self, obj: Message):
        request = self.context.get("request")
        u = obj.sender
        return {
            "id": u.id,
            "display_name": getattr(u, "display_name", "") or "",
            "slug": getattr(u, "slug", None),
            "user_type": getattr(u, "user_type", None),
            "avatar_url": _avatar_url(request, u),
        }

    def get_text(self, obj: Message):
        if obj.is_deleted:
            return None
        return obj.text or None

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


class SendMessageSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True, max_length=5000)
    image = serializers.ImageField(required=False, allow_null=True)

    def validate(self, attrs):
        text = (attrs.get("text") or "").strip()
        image = attrs.get("image")

        attrs["text"] = text

        if not text and not image:
            raise serializers.ValidationError("Either text or image is required.")

        return attrs


class PinMessageSerializer(serializers.Serializer):
    message_id = serializers.IntegerField(
        min_value=1,
        required=False,
        allow_null=True,
    )


class StartDirectMessageSerializer(serializers.Serializer):
    target_user_id = serializers.IntegerField(min_value=1)
    text = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True, max_length=5000)
    image = serializers.ImageField(required=False, allow_null=True)

    def validate(self, attrs):
        text = (attrs.get("text") or "").strip()
        image = attrs.get("image")

        attrs["text"] = text

        if not text and not image:
            raise serializers.ValidationError("Either text or image is required.")

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

