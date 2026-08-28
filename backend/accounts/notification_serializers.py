from rest_framework import serializers

from .models import Notification, NotificationType, OfferedSkill
from .search_visibility import searchable_user_q
from .services.user_blocks import exclude_blocked_users

_REVIEW_NOTIFICATION_TYPES = (
    NotificationType.REVIEW_CREATED,
    NotificationType.REVIEW_REPLY_CREATED,
    NotificationType.REVIEW_LIKED,
)


def existing_review_offer_ids(notifications) -> set[int]:
    """Množina offer_id z review-notifikácií, ktorých ponuka v DB reálne existuje.

    Slúži ako context pre ``NotificationSerializer`` pri serializácii ZOZNAMU:
    historicky kladné offer_id, ktorého ponuka už bola zmazaná, nesmie viesť na
    neexistujúcu ponuku – ``get_target_url`` použije fallback na profil. Jeden
    dotaz (``id__in``) pre celú stránku → žiadny N+1.
    """
    offer_ids: set[int] = set()
    for notification in notifications:
        if getattr(notification, "type", None) not in _REVIEW_NOTIFICATION_TYPES:
            continue
        data = notification.data if isinstance(notification.data, dict) else {}
        try:
            offer_id = int(data.get("offer_id") or 0)
        except (TypeError, ValueError):
            offer_id = 0
        if offer_id > 0:
            offer_ids.add(offer_id)
    if not offer_ids:
        return set()
    return set(
        OfferedSkill.objects.filter(id__in=offer_ids).values_list("id", flat=True)
    )


def existing_offer_watch_targets(notifications, *, viewer_user_id: int) -> dict[int, str]:
    """Return safe owner identifiers for currently visible matched offers."""

    offer_ids: set[int] = set()
    for notification in notifications:
        if getattr(notification, "type", None) != NotificationType.OFFER_WATCH_MATCH:
            continue
        data = notification.data if isinstance(notification.data, dict) else {}
        try:
            offer_id = int(data.get("offer_id") or 0)
        except (TypeError, ValueError):
            offer_id = 0
        if offer_id > 0:
            offer_ids.add(offer_id)
    if not offer_ids:
        return {}

    offers = OfferedSkill.objects.select_related("user").filter(
        searchable_user_q("user__"),
        id__in=offer_ids,
        is_hidden=False,
    )
    offers = exclude_blocked_users(
        offers,
        viewer_user_id=viewer_user_id,
        user_id_field="user_id",
    )
    return {
        offer.id: (getattr(offer.user, "slug", None) or str(offer.user_id))
        for offer in offers
    }


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

        # Anonymizovaný/zmazaný účet (is_active=False): nevracaj meno/slug/avatar
        # (sú anonymizované na "deleted-user-<uuid>"). Frontend zobrazí preložené
        # "Zmazaný používateľ". Rovnaký vzor ako messaging serialize_user_brief.
        is_deleted = not getattr(actor, "is_active", True)

        avatar_url = None
        if not is_deleted:
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
            "display_name": "" if is_deleted else (getattr(actor, "display_name", "") or ""),
            "slug": None if is_deleted else getattr(actor, "slug", None),
            "user_type": getattr(actor, "user_type", None),
            "avatar_url": avatar_url,
            "is_deleted": is_deleted,
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
        if obj.type == NotificationType.PROFILE_LIKED:
            actor = getattr(obj, "actor", None)
            if actor is not None and getattr(actor, "is_active", True):
                identifier = (getattr(actor, "slug", None) or "").strip() or str(actor.id)
                return f"/dashboard/users/{identifier}"
            data = obj.data if isinstance(obj.data, dict) else {}
            try:
                actor_id = int(data.get("from_user_id") or 0)
            except (TypeError, ValueError):
                actor_id = 0
            if actor_id > 0:
                return f"/dashboard/users/{actor_id}"
        if obj.type == NotificationType.OFFER_LIKED:
            data = obj.data if isinstance(obj.data, dict) else {}
            try:
                offer_id = int(data.get("offer_id") or 0)
            except (TypeError, ValueError):
                offer_id = 0
            if offer_id > 0:
                return f"/dashboard/profile?highlight={offer_id}&side=back"
        if obj.type == NotificationType.OFFER_WATCH_MATCH:
            data = obj.data if isinstance(obj.data, dict) else {}
            try:
                offer_id = int(data.get("offer_id") or 0)
            except (TypeError, ValueError):
                offer_id = 0
            if offer_id <= 0:
                return None

            targets = self.context.get("offer_watch_targets")
            if targets is not None:
                identifier = targets.get(offer_id)
            else:
                # Realtime serialization happens immediately after transactional
                # revalidation and has no list context.
                actor = getattr(obj, "actor", None)
                identifier = None
                if actor is not None and getattr(actor, "is_active", True):
                    identifier = (getattr(actor, "slug", None) or "").strip()
                    identifier = identifier or str(actor.id)
            if identifier:
                return f"/dashboard/users/{identifier}?highlight={offer_id}"
            return None
        if obj.type == NotificationType.PORTFOLIO_LIKED:
            data = obj.data if isinstance(obj.data, dict) else {}
            try:
                item_id = int(data.get("portfolio_item_id") or 0)
            except (TypeError, ValueError):
                item_id = 0
            if item_id > 0:
                return f"/dashboard/users/{obj.user_id}/portfolio/{item_id}"
        if obj.type in (
            NotificationType.FEED_POST_LIKED,
            NotificationType.FEED_POST_COMMENTED,
            NotificationType.FEED_POST_COMMENT_REPLIED,
            NotificationType.FEED_POST_TAGGED,
            NotificationType.FEED_POST_SHARED,
            NotificationType.FEED_POST_COMMENT_LIKED,
        ):
            # Všetky feed typy vedú na permalink príspevku – identifikátor
            # nesie data.post_id (rovnaký vzor ako OFFER_LIKED/PORTFOLIO_LIKED).
            # Platí to aj pre lajk komentára: komentáre sú na permalinku
            # rozbalené, takže príjemcu to dovedie rovno k nim.
            data = obj.data if isinstance(obj.data, dict) else {}
            try:
                post_id = int(data.get("post_id") or 0)
            except (TypeError, ValueError):
                post_id = 0
            if post_id > 0:
                # Pri komentári doveď príjemcu rovno k nemu – FE podľa toho
                # doscrolluje a krátko ho zvýrazní.
                try:
                    comment_id = int(data.get("comment_id") or 0)
                except (TypeError, ValueError):
                    comment_id = 0
                if comment_id > 0:
                    return f"/dashboard/feed/{post_id}?comment={comment_id}"
                return f"/dashboard/feed/{post_id}"
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
            # Historicky kladné offer_id ešte neznamená, že ponuka existuje – mohla
            # byť odvtedy zmazaná. Pri serializácii zoznamu dostaneme cez context
            # množinu reálne existujúcich offer_id (jeden dotaz). Ak context chýba
            # (napr. realtime push čerstvej notifikácie, kde je ponuka aktuálna),
            # zachováme pôvodné správanie.
            existing_offer_ids = self.context.get("existing_review_offer_ids")
            offer_exists = offer_id > 0 and (
                existing_offer_ids is None or offer_id in existing_offer_ids
            )
            if offer_exists:
                if review_id > 0:
                    target_url = f"/dashboard/offers/{offer_id}/reviews?review_id={review_id}"
                    if obj.type == NotificationType.REVIEW_REPLY_CREATED:
                        return f"{target_url}&modal=owner_response"
                    return target_url
                return f"/dashboard/offers/{offer_id}/reviews"
            # Ponuka neexistuje (zmazaná) alebo offer_id v data chýba → nasmerujeme
            # na profil recenzovaného používateľa (rovnaký fallback pre obe situácie).
            try:
                reviewed_user_id = int(data.get("reviewed_user_id") or 0)
            except (TypeError, ValueError):
                reviewed_user_id = 0
            if review_id > 0 and reviewed_user_id > 0:
                return f"/dashboard/users/{reviewed_user_id}"
        return None
