"""Serializer zoznamu konverzácií (vyčlenené zo serializers.py pre dĺžku)."""
from __future__ import annotations

from django.db.models import QuerySet
from rest_framework import serializers

from accounts.name_normalization import get_canonical_display_name
from ..models import Conversation, ConversationParticipant, Message
from .user_serialization import _avatar_name_url, serialize_user_brief


class ConversationListItemSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    avatar_members = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()
    current_user_role = serializers.SerializerMethodField()
    current_user_status = serializers.SerializerMethodField()
    has_requestable_offers = serializers.SerializerMethodField()
    is_blocked_by_me = serializers.SerializerMethodField()
    message_request_role = serializers.SerializerMethodField()
    request_unseen = serializers.SerializerMethodField()
    requested_by_id = serializers.IntegerField(read_only=True, allow_null=True)
    requested_to_id = serializers.IntegerField(read_only=True, allow_null=True)
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
            "is_blocked_by_me",
            "request_status",
            "message_request_role",
            "requested_by_id",
            "requested_to_id",
            "accepted_at",
            "request_seen_at",
            "request_unseen",
            "last_read_at",
            "is_pinned",
            "has_unread",
            "unread_count",
            "updated_at",
        ]

    def _is_current_user_invited_group(self, obj: Conversation) -> bool:
        if not getattr(obj, "is_group", False):
            return False
        return (
            self.get_current_user_status(obj) == ConversationParticipant.Status.INVITED
        )

    def get_other_user(self, obj: Conversation):
        if getattr(obj, "is_group", False):
            return None
        request = self.context.get("request")
        annotated_other_user_id = getattr(obj, "other_user_id", None)
        if annotated_other_user_id:
            # Anonymizovaný/zmazaný účet (is_active=False): nevracaj meno/slug/avatar.
            # Frontend zobrazí preložené "Zmazaný používateľ" (rovnako ako pri liste).
            is_deleted = getattr(obj, "other_user_is_active", True) is False
            if is_deleted:
                return {
                    "id": annotated_other_user_id,
                    "display_name": "",
                    "slug": None,
                    "user_type": getattr(obj, "other_user_type", None),
                    "avatar_url": None,
                    "is_verified": False,
                    "is_deleted": True,
                }
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
                "is_verified": bool(getattr(obj, "other_user_is_verified", False)),
                "is_deleted": False,
            }

        me = request.user if request else None
        participants: (
            QuerySet[ConversationParticipant] | list[ConversationParticipant]
        ) = (
            getattr(obj, "_prefetched_participants", None)
            or getattr(obj, "participants", []).all()
        )
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
        if getattr(obj, "is_group", False):
            return None
        # Pre priame (1:1) konverzácie vráť avatar protistrany. Čerpáme z rovnakého
        # zdroja ako other_user (anotácia / serialize_user_brief), takže sa korektne
        # ošetria aj anonymizované účty (avatar_url=None) bez duplikovania logiky.
        other_user = self.get_other_user(obj)
        return other_user.get("avatar_url") if other_user else None

    def get_avatar_members(self, obj: Conversation):
        if not getattr(obj, "is_group", False):
            return []
        if self._is_current_user_invited_group(obj):
            return []
        request = self.context.get("request")
        me = request.user if request else None
        prefetched = getattr(obj, "_prefetched_participants", None)
        if prefetched is not None:
            participants = [
                participant
                for participant in prefetched
                if participant.status == ConversationParticipant.Status.ACTIVE
                and (me is None or participant.user_id != me.id)
            ]
        else:
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
        return [
            serialize_user_brief(participant.user, request)
            for participant in list(participants)[:4]
        ]

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
        participants = getattr(obj, "_prefetched_participants", None)
        if participants is None:
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
        participant = (
            ConversationParticipant.objects.filter(
                conversation=obj,
                user=request.user,
            )
            .only("role")
            .first()
        )
        return participant.role if participant else None

    def get_current_user_status(self, obj: Conversation):
        request = self.context.get("request")
        if not request or not getattr(request, "user", None):
            return None
        annotated_status = getattr(obj, "current_user_status", None)
        if annotated_status:
            return annotated_status
        participant = (
            ConversationParticipant.objects.filter(
                conversation=obj,
                user=request.user,
            )
            .only("status")
            .first()
        )
        return participant.status if participant else None

    def get_message_request_role(self, obj: Conversation):
        request = self.context.get("request")
        user_id = getattr(getattr(request, "user", None), "id", None)
        if not user_id or obj.is_group:
            return None
        if obj.request_status != Conversation.RequestStatus.PENDING:
            return None
        if obj.requested_by_id == user_id:
            return "sender"
        if obj.requested_to_id == user_id:
            return "recipient"
        return None

    def get_request_unseen(self, obj: Conversation) -> bool:
        request = self.context.get("request")
        user_id = getattr(getattr(request, "user", None), "id", None)
        if (
            not user_id
            or obj.is_group
            or obj.request_status != Conversation.RequestStatus.PENDING
            or obj.requested_to_id != user_id
            or obj.last_message_at is None
        ):
            return False
        return obj.request_seen_at is None or obj.last_message_at > obj.request_seen_at

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

    def get_is_blocked_by_me(self, obj: Conversation) -> bool:
        if getattr(obj, "is_group", False):
            return False
        return bool(getattr(obj, "is_blocked_by_me", False))

    def get_is_pinned(self, obj: Conversation) -> bool:
        return bool(getattr(obj, "is_pinned", False))
