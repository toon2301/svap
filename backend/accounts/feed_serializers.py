"""Serializéry pre feed (Fáza 2a – čítanie + vytvorenie príspevku).

Vzory: SearchUserResultSerializer (mini user payload s avatar_url),
PortfolioItemSerializer (is_liked_by_me cez context set – 1 dotaz na stránku,
anonym-guard → False; likes_count z anotácie).

Obrázky sa NIKDY neserializujú ako S3 kľúče – vždy ako URL na proxy view
(vzor portfolio/messaging: priama S3 URL je zablokovaná bucket policy).
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import serializers

from accounts.models import FeedPost, FeedPostComment

User = get_user_model()


class FeedUserSummarySerializer(serializers.ModelSerializer):
    """Mini payload používateľa (autor / označený / vlastník zdieľaného)."""

    display_name = serializers.CharField(read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "display_name", "slug", "user_type", "avatar_url"]

    def get_avatar_url(self, obj):
        # Rovnaký vzor ako SearchUserResultSerializer.get_avatar_url.
        try:
            if getattr(obj, "avatar", None) and hasattr(obj.avatar, "url"):
                request = self.context.get("request")
                url = obj.avatar.url
                return request.build_absolute_uri(url) if request else url
        except Exception:
            return None
        return None


class FeedPostCommentSerializer(serializers.ModelSerializer):
    """Komentár k príspevku – autor ako mini payload, can_delete pre FE.

    can_delete: autor komentára ALEBO autor príspevku (moderácia vlastnej
    nástenky) – rovnaká logika ako DELETE endpoint, nech FE nemusí duplikovať.
    """

    author = FeedUserSummarySerializer(read_only=True)
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = FeedPostComment
        fields = ["id", "text", "author", "can_delete", "created_at"]

    def get_can_delete(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False):
            return False
        post_author_id = self.context.get("post_author_id")
        return user.id == obj.author_id or user.id == post_author_id


class FeedPostSerializer(serializers.ModelSerializer):
    """Príspevok pre feed/detail/profilové zoznamy.

    Context:
    - request: na absolútne URL a viewer identitu
    - liked_feed_post_ids: set ID lajknutých príspevkov (1 dotaz na stránku);
      chýbajúci kľúč/anonym → False (anonym-guard vzor ako portfólio)
    """

    author = FeedUserSummarySerializer(read_only=True)
    image = serializers.SerializerMethodField()
    shared_content = serializers.SerializerMethodField()
    shared_content_unavailable = serializers.SerializerMethodField()
    tagged_users = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked_by_me = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()

    class Meta:
        model = FeedPost
        fields = [
            "id",
            "post_type",
            "caption",
            "author",
            "image",
            "shared_content",
            "shared_content_unavailable",
            "tagged_users",
            "likes_count",
            "comments_count",
            "is_liked_by_me",
            "can_manage",
            "created_at",
        ]

    # --- helpers -----------------------------------------------------------

    def _viewer_id(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            return int(user.id)
        return None

    def _absolute(self, path: str) -> str:
        request = self.context.get("request")
        return request.build_absolute_uri(path) if request else path

    # --- fields ------------------------------------------------------------

    def get_image(self, obj):
        """Fotka voľného príspevku – URL na proxy view, nie S3 kľúč.

        Verejne existuje len APPROVED fotka; autor navyše vidí stav
        PENDING/REJECTED (aby FE vedelo ukázať „spracováva sa"/dôvod
        zamietnutia) – rovnaká filozofia ako portfolio to_representation.
        """
        if obj.post_type != FeedPost.PostType.FREE_POST or not obj.image_status:
            return None
        is_author = self._viewer_id() == obj.author_id

        if obj.image_status == FeedPost.ImageStatus.APPROVED:
            base = reverse("accounts:feed_post_image_file", args=[obj.id])
            payload = {
                "thumbnail_url": self._absolute(f"{base}?variant=thumbnail"),
                "large_url": self._absolute(f"{base}?variant=large"),
                "width": obj.image_width,
                "height": obj.image_height,
            }
            if is_author:
                payload["status"] = obj.image_status
            return payload

        if not is_author:
            return None
        payload = {"status": obj.image_status}
        if obj.image_status == FeedPost.ImageStatus.REJECTED:
            payload["rejected_reason"] = obj.image_rejected_reason
        return payload

    def _shared_available(self, obj) -> bool:
        """Cache na inštancii – čítajú to get_shared_content aj *_unavailable."""
        cached = getattr(obj, "_shared_available_cache", None)
        if cached is None:
            cached = bool(obj.is_shared_content_currently_visible)
            obj._shared_available_cache = cached
        return cached

    @staticmethod
    def _live_title_and_category(post_type, source):
        """Aktuálne polia zo živého zdroja – zhodné odvodenie ako snapshot."""
        if post_type == FeedPost.PostType.SHARED_OFFER:
            return (source.subcategory or source.category), source.category
        return source.title, source.category

    def get_shared_content(self, obj):
        """Zdieľaný obsah: živé dáta kým zdroj existuje a je viditeľný.

        Kým zdroj žije, serializujú sa jeho AKTUÁLNE polia – premenovanie či
        zmena kategórie po zdieľaní sa tak prejaví. Snapshot slúži VÝHRADNE ako
        záloha pre nedostupný zdroj (zmazaný/skrytý/súkromný vlastník): vtedy
        ide von len snapshot, bez živého id (žiadny preklik) a bez profilového
        payloadu vlastníka.
        """
        if obj.post_type == FeedPost.PostType.FREE_POST:
            return None

        available = self._shared_available(obj)
        source = obj.shared_source
        owner = obj.shared_owner

        payload = {
            "type": (
                "offer"
                if obj.post_type == FeedPost.PostType.SHARED_OFFER
                else "portfolio_item"
            ),
            "title": obj.shared_title,
            "category": obj.shared_category,
            "id": None,
            "owner": None,
            # Meno vlastníka: naživo kým sa dá (sleduje premenovanie), snapshot
            # ako fallback (po GDPR scrube je neutralizovaný).
            "owner_display_name": (
                owner.display_name
                if available and owner is not None
                else obj.shared_owner_display_name
            ),
            "thumbnail_url": None,
        }
        if obj.shared_thumbnail_key:
            path = reverse("accounts:feed_post_shared_thumbnail", args=[obj.id])
            payload["thumbnail_url"] = self._absolute(path)
        # source je non-None vždy, keď available (property to garantuje), ale
        # guard drží serializér bezpečný aj pri budúcej zmene tej property.
        if available and source is not None:
            payload["title"], payload["category"] = self._live_title_and_category(
                obj.post_type, source
            )
            payload["id"] = source.pk
            payload["owner"] = FeedUserSummarySerializer(
                owner, context=self.context
            ).data
        return payload

    def get_shared_content_unavailable(self, obj):
        if obj.post_type == FeedPost.PostType.FREE_POST:
            return False
        return not self._shared_available(obj)

    def get_tagged_users(self, obj):
        # tags sú prefetchnuté so select_related("tagged_user") – žiadne N+1.
        return FeedUserSummarySerializer(
            [tag.tagged_user for tag in obj.tags.all()],
            many=True,
            context=self.context,
        ).data

    def get_likes_count(self, obj):
        annotated = getattr(obj, "_likes_count", None)
        if annotated is not None:
            return int(annotated)
        return obj.likes.count()

    def get_comments_count(self, obj):
        annotated = getattr(obj, "_comments_count", None)
        if annotated is not None:
            return int(annotated)
        return obj.comments.count()

    def get_is_liked_by_me(self, obj):
        liked_ids = self.context.get("liked_feed_post_ids")
        if liked_ids is None:
            return False
        return obj.id in liked_ids

    def get_can_manage(self, obj):
        return self._viewer_id() == obj.author_id
