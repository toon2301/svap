from rest_framework import serializers

from .models import Notification, NotificationType


class NotificationSerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()
    target_url = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "title",
            "body",
            "data",
            "actor",
            "skill_request",
            "conversation",
            "group_invitation",
            "target_url",
            "is_read",
            "created_at",
            "read_at",
        ]
        read_only_fields = fields

    def get_actor(self, obj):
        actor = getattr(obj, "actor", None)
        if actor is None:
            return None

        avatar_url = None
        try:
            if actor.avatar and hasattr(actor.avatar, "url"):
                request = self.context.get("request")
                avatar_url = (
                    request.build_absolute_uri(actor.avatar.url)
                    if request
                    else actor.avatar.url
                )
        except Exception:
            avatar_url = None

        return {
            "id": actor.id,
            "display_name": getattr(actor, "display_name", "") or "",
            "slug": getattr(actor, "slug", None),
            "user_type": getattr(actor, "user_type", None),
            "avatar_url": avatar_url,
        }

    def get_target_url(self, obj):
        if obj.type == NotificationType.GROUP_INVITATION and obj.conversation_id:
            return f"/dashboard/messages?conversationId={obj.conversation_id}"
        if obj.type == NotificationType.SKILL_REQUEST:
            return "/dashboard/requests"
        if obj.type == NotificationType.SKILL_REQUEST_ACCEPTED:
            return "/dashboard/requests?status=active&tab=sent"
        if obj.type == NotificationType.SKILL_REQUEST_REJECTED:
            return "/dashboard/requests?status=cancelled&tab=sent"
        if obj.type == NotificationType.SKILL_REQUEST_COMPLETION_REQUESTED:
            return "/dashboard/requests?status=active&tab=sent"
        if obj.type == NotificationType.SKILL_REQUEST_COMPLETED:
            return "/dashboard/requests?status=completed&tab=received"
        if obj.type == NotificationType.SKILL_REQUEST_TERMINATED:
            tab = "received"
            skill_request = getattr(obj, "skill_request", None)
            if skill_request is not None and obj.user_id == skill_request.requester_id:
                tab = "sent"
            return f"/dashboard/requests?status=cancelled&tab={tab}"
        if obj.type == NotificationType.OFFER_LIKED:
            data = obj.data if isinstance(obj.data, dict) else {}
            try:
                offer_id = int(data.get("offer_id") or 0)
            except (TypeError, ValueError):
                offer_id = 0
            if offer_id > 0:
                return f"/dashboard/profile?highlight={offer_id}&side=back"
        if obj.type in (
            NotificationType.REVIEW_CREATED,
            NotificationType.REVIEW_REPLY_CREATED,
            NotificationType.REVIEW_LIKED,
        ):
            data = obj.data if isinstance(obj.data, dict) else {}
            try:
                offer_id = int(data.get("offer_id") or 0)
            except (TypeError, ValueError):
                offer_id = 0
            try:
                review_id = int(data.get("review_id") or 0)
            except (TypeError, ValueError):
                review_id = 0
            if offer_id > 0:
                if review_id > 0:
                    target_url = f"/dashboard/offers/{offer_id}/reviews?review_id={review_id}"
                    if obj.type == NotificationType.REVIEW_REPLY_CREATED:
                        return f"{target_url}&modal=owner_response"
                    return target_url
                return f"/dashboard/offers/{offer_id}/reviews"
        return None
