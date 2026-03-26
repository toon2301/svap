from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from rest_framework import serializers

from ..models import Conversation, ConversationParticipant, Message

User = get_user_model()


class OpenConversationSerializer(serializers.Serializer):
    target_user_id = serializers.IntegerField(min_value=1)


class UserBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    display_name = serializers.CharField()
    slug = serializers.CharField(allow_null=True, required=False)
    user_type = serializers.CharField(allow_null=True, required=False)
    avatar_url = serializers.CharField(allow_null=True, required=False)


def _avatar_url(request, user) -> str | None:
    try:
        avatar = getattr(user, "avatar", None)
        if avatar and hasattr(avatar, "url"):
            url = avatar.url
            return request.build_absolute_uri(url) if request else url
    except Exception:
        return None
    return None


class ConversationListItemSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    last_message_sender_id = serializers.IntegerField(read_only=True, allow_null=True)
    last_message_is_deleted = serializers.BooleanField(read_only=True)
    last_read_at = serializers.DateTimeField(read_only=True, allow_null=True)
    has_unread = serializers.BooleanField(read_only=True)

    class Meta:
        model = Conversation
        fields = [
            "id",
            "last_message_at",
            "last_message_preview",
            "last_message_sender_id",
            "last_message_is_deleted",
            "other_user",
            "last_read_at",
            "has_unread",
            "updated_at",
        ]

    def get_other_user(self, obj: Conversation):
        request = self.context.get("request")
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
        return {
            "id": other.id,
            "display_name": getattr(other, "display_name", "") or "",
            "slug": getattr(other, "slug", None),
            "user_type": getattr(other, "user_type", None),
            "avatar_url": _avatar_url(request, other),
        }

    def get_last_message_preview(self, obj: Conversation):
        if getattr(obj, "last_message_is_deleted", False):
            return None
        return getattr(obj, "last_message_preview", None)


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    text = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "conversation", "sender", "text", "created_at", "edited_at", "is_deleted"]

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
        return obj.text


class SendMessageSerializer(serializers.Serializer):
    text = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=5000)


class MarkReadSerializer(serializers.Serializer):
    # body can be empty; keep explicit serializer for future extensibility
    pass

