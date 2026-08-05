"""Feed – zdieľanie príspevku ďalej (shared_feed_post).

Kľúčové pravidlo: reťazec zdieľaní sa NIKDY neukladá – každé zdieľanie sa pri
vzniku vyrieši priamo na koreňový zdroj, takže hĺbka je vždy najviac 1 krok.
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import (
    FeedPost,
    Notification,
    NotificationType,
    OfferedSkill,
    UserBlock,
)
from portfolio.models import PortfolioItem

User = get_user_model()


def _user(name, *, is_public=True):
    return User.objects.create_user(
        username=name, email=f"{name}@example.com", password="StrongPass123",
        is_public=is_public,
    )


def _free_post(author, caption="Pôvodný text"):
    return FeedPost.objects.create(
        author=author, post_type=FeedPost.PostType.FREE_POST, caption=caption
    )


def _reshare(author, source):
    return FeedPost.objects.create(
        author=author,
        post_type=FeedPost.PostType.SHARED_FEED_POST,
        shared_feed_post=source,
    )


@pytest.mark.django_db
class TestReshareRootResolution:
    def test_sharing_free_post_links_to_it_directly(self):
        origin_author, sharer = _user("rs-origin"), _user("rs-sharer")
        origin = _free_post(origin_author, caption="Ahoj svet")

        reshare = _reshare(sharer, origin)

        assert reshare.post_type == FeedPost.PostType.SHARED_FEED_POST
        assert reshare.shared_feed_post_id == origin.id
        assert reshare.shared_owner_id == origin_author.id
        assert reshare.shared_post_caption == "Ahoj svet"

    def test_sharing_a_shared_offer_inherits_the_offer(self):
        owner, sharer, second = _user("rs-owner"), _user("rs-s1"), _user("rs-s2")
        offer = OfferedSkill.objects.create(
            user=owner, category="it-a-technologie", subcategory="Programovanie"
        )
        first = FeedPost.objects.create(
            author=sharer,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )

        second_share = _reshare(second, first)

        # Ukazuje PRIAMO na ponuku, nie na medzičlánok.
        assert second_share.post_type == FeedPost.PostType.SHARED_OFFER
        assert second_share.shared_offer_id == offer.id
        assert second_share.shared_feed_post_id is None
        assert second_share.shared_owner_id == owner.id

    def test_sharing_a_shared_portfolio_item_inherits_the_item(self):
        owner, sharer, second = _user("rs-powner"), _user("rs-ps1"), _user("rs-ps2")
        item = PortfolioItem.objects.create(
            owner=owner, title="Weby", category="it-a-technologie"
        )
        first = FeedPost.objects.create(
            author=sharer,
            post_type=FeedPost.PostType.SHARED_PORTFOLIO_ITEM,
            shared_portfolio_item=item,
        )

        second_share = _reshare(second, first)

        assert second_share.post_type == FeedPost.PostType.SHARED_PORTFOLIO_ITEM
        assert second_share.shared_portfolio_item_id == item.id
        assert second_share.shared_feed_post_id is None

    def test_sharing_a_reshare_points_at_the_original_free_post(self):
        origin_author = _user("rs-chain-origin")
        origin = _free_post(origin_author, caption="Koreň")
        first = _reshare(_user("rs-chain-1"), origin)

        second = _reshare(_user("rs-chain-2"), first)

        assert second.shared_feed_post_id == origin.id
        assert second.shared_feed_post_id != first.id

    def test_chain_never_nests_deeper_than_one_step(self):
        origin_author = _user("rs-deep-origin")
        origin = _free_post(origin_author, caption="Koreň")

        current = origin
        for index in range(4):
            current = _reshare(_user(f"rs-deep-{index}"), current)
            # Po každom kroku ukazujeme stále na ten istý koreň.
            assert current.post_type == FeedPost.PostType.SHARED_FEED_POST
            assert current.shared_feed_post_id == origin.id
            assert current.shared_owner_id == origin_author.id

        # A koreň je naozaj voľný príspevok, nie ďalšie zdieľanie.
        assert current.shared_feed_post.post_type == FeedPost.PostType.FREE_POST

    def test_sharing_orphaned_share_inherits_snapshot(self):
        owner, sharer, second = _user("rs-orph-o"), _user("rs-orph-1"), _user("rs-orph-2")
        offer = OfferedSkill.objects.create(
            user=owner, category="it-a-technologie", subcategory="Programovanie"
        )
        first = FeedPost.objects.create(
            author=sharer,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        offer.delete()
        first.refresh_from_db()
        assert first.shared_offer_id is None

        second_share = _reshare(second, first)

        # Koreň už neexistuje → preberáme denormalizovaný snapshot, nie live dáta.
        assert second_share.post_type == FeedPost.PostType.SHARED_OFFER
        assert second_share.shared_offer_id is None
        assert second_share.shared_title == "Programovanie"
        assert second_share.shared_owner_id == owner.id

    def test_updating_shared_feed_post_also_flattens_to_root(self):
        """UPDATE musí sploštiť rovnako ako vznik – inak by tadiaľ vznikol reťazec."""
        origin_author = _user("rs-upd-origin")
        origin = _free_post(origin_author, caption="Koreň")
        middle = _reshare(_user("rs-upd-middle"), origin)

        other_author = _user("rs-upd-other")
        other = _free_post(other_author, caption="Iný koreň")
        reshare = _reshare(_user("rs-upd-sharer"), other)
        assert reshare.shared_feed_post_id == other.id

        # Prepneme zdroj na MEDZIČLÁNOK (zdieľanie), nie na voľný príspevok.
        reshare.shared_feed_post = middle
        reshare.save(update_fields=["shared_feed_post", "updated_at"])
        reshare.refresh_from_db()

        # Musí ukazovať na koreň, nie na medzičlánok, a snapshot musí patriť
        # vlastníkovi koreňa.
        assert reshare.shared_feed_post_id == origin.id
        assert reshare.shared_feed_post_id != middle.id
        assert reshare.shared_owner_id == origin_author.id
        assert reshare.shared_post_caption == "Koreň"

    def test_updating_shared_feed_post_to_shared_offer_inherits_offer(self):
        owner = _user("rs-upd2-owner")
        offer = OfferedSkill.objects.create(
            user=owner, category="it-a-technologie", subcategory="Programovanie"
        )
        middle = FeedPost.objects.create(
            author=_user("rs-upd2-middle"),
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        origin = _free_post(_user("rs-upd2-origin"))
        reshare = _reshare(_user("rs-upd2-sharer"), origin)

        reshare.shared_feed_post = middle
        reshare.save(update_fields=["shared_feed_post", "updated_at"])
        reshare.refresh_from_db()

        # Typ aj zdroj sa prevzali z medzičlánku → priamo ponuka.
        assert reshare.post_type == FeedPost.PostType.SHARED_OFFER
        assert reshare.shared_offer_id == offer.id
        assert reshare.shared_feed_post_id is None
        assert reshare.shared_owner_id == owner.id

    def test_reshare_requires_source(self):
        with pytest.raises(ValidationError) as exc:
            FeedPost.objects.create(
                author=_user("rs-nosrc"),
                post_type=FeedPost.PostType.SHARED_FEED_POST,
                shared_post_caption="Vymyslené",
            )
        assert exc.value.code == "shared_source_required"

    def test_self_share_is_allowed(self):
        author = _user("rs-self")
        origin = _free_post(author, caption="Moje")

        reshare = _reshare(author, origin)

        assert reshare.shared_feed_post_id == origin.id
        assert reshare.shared_owner_id == author.id


@pytest.mark.django_db
class TestReshareVisibility:
    @pytest.mark.parametrize("author_blocks", [True, False])
    def test_blocked_source_author_is_rejected(self, author_blocks):
        origin_author, sharer = _user("rs-blk-o"), _user("rs-blk-s")
        origin = _free_post(origin_author)
        if author_blocks:
            UserBlock.objects.create(blocker=origin_author, blocked_user=sharer)
        else:
            UserBlock.objects.create(blocker=sharer, blocked_user=origin_author)

        with pytest.raises(ValidationError):
            _reshare(sharer, origin)

    def test_private_source_author_is_rejected(self):
        origin_author = _user("rs-priv-o", is_public=False)
        origin = _free_post(origin_author)

        with pytest.raises(ValidationError):
            _reshare(_user("rs-priv-s"), origin)

    def test_inactive_source_author_is_rejected(self):
        origin_author = _user("rs-inact-o")
        origin = _free_post(origin_author)
        origin_author.is_active = False
        origin_author.save(update_fields=["is_active"])

        with pytest.raises(ValidationError):
            _reshare(_user("rs-inact-s"), origin)


@pytest.mark.django_db
class TestReshareSurvivesDeletion:
    def test_reshare_survives_original_post_deletion(self):
        origin_author, sharer = _user("rs-del-o"), _user("rs-del-s")
        origin = _free_post(origin_author, caption="Zmizne")
        reshare = _reshare(sharer, origin)

        origin.delete()
        reshare.refresh_from_db()

        assert FeedPost.objects.filter(id=reshare.id).exists()
        assert reshare.shared_feed_post_id is None
        assert reshare.shared_post_caption == "Zmizne"
        assert reshare.is_shared_content_currently_visible is False

    def test_visibility_property_follows_source_author(self):
        origin_author, sharer = _user("rs-vis-o"), _user("rs-vis-s")
        origin = _free_post(origin_author)
        reshare = _reshare(sharer, origin)
        assert reshare.is_shared_content_currently_visible is True

        origin_author.is_public = False
        origin_author.save(update_fields=["is_public"])
        reshare.refresh_from_db()

        assert reshare.is_shared_content_currently_visible is False


@pytest.mark.django_db
class TestReshareAccountDeletion:
    def test_deleting_source_author_scrubs_snapshot_caption(self):
        from accounts.account_deletion import anonymize_user

        origin_author, sharer = _user("rs-gdpr-o"), _user("rs-gdpr-s")
        origin_author.first_name = "Jana"
        origin_author.last_name = "Nováková"
        origin_author.save(update_fields=["first_name", "last_name"])
        origin = _free_post(origin_author, caption="Môj osobný text")
        reshare = _reshare(sharer, origin)

        anonymize_user(origin_author)
        reshare.refresh_from_db()

        # Zdieľanie patrí inému autorovi, takže ostáva – ale text ani meno
        # zmazaného používateľa v ňom nesmú prežiť.
        assert FeedPost.objects.filter(id=reshare.id).exists()
        assert reshare.shared_owner_display_name == "Zmazaný používateľ"
        assert reshare.shared_post_caption == ""
        assert "Nováková" not in str(reshare.shared_owner_display_name)


class FeedReshareApiTests(APITestCase):
    def setUp(self):
        self.origin_author = _user("rs-api-o")
        self.sharer = _user("rs-api-s")
        self.origin = _free_post(self.origin_author, caption="Pôvodný")
        self.url = reverse("accounts:feed_posts")

    def _share(self, post_id, **extra):
        return self.client.post(
            self.url,
            data={
                "post_type": "shared_feed_post",
                "shared_feed_post_id": post_id,
                **extra,
            },
            format="json",
        )

    def test_share_free_post_via_api(self):
        self.client.force_authenticate(user=self.sharer)
        with self.captureOnCommitCallbacks(execute=True):
            response = self._share(self.origin.id, caption="Pozrite na toto")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["post_type"], "shared_feed_post")
        shared = response.data["shared_content"]
        self.assertEqual(shared["type"], "feed_post")
        self.assertEqual(shared["caption"], "Pôvodný")
        self.assertEqual(shared["id"], self.origin.id)
        self.assertEqual(response.data["caption"], "Pozrite na toto")

    def test_share_invisible_post_returns_unified_error(self):
        private_author = _user("rs-api-priv", is_public=False)
        hidden = _free_post(private_author)
        self.client.force_authenticate(user=self.sharer)

        hidden_response = self._share(hidden.id)
        missing_response = self._share(999999)

        self.assertEqual(hidden_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(hidden_response.data["code"], "shared_source_missing")
        # Neviditeľný a neexistujúci sa nesmú dať rozlíšiť (enumeration).
        self.assertEqual(hidden_response.data, missing_response.data)

    def test_share_rejects_multiple_sources(self):
        offer = OfferedSkill.objects.create(
            user=self.origin_author, category="it-a-technologie", subcategory="X"
        )
        self.client.force_authenticate(user=self.sharer)
        response = self._share(self.origin.id, shared_offer_id=offer.id)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "unexpected_shared_source")

    def test_share_requires_source_id(self):
        self.client.force_authenticate(user=self.sharer)
        response = self.client.post(
            self.url, data={"post_type": "shared_feed_post"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "shared_source_required")


class FeedReshareNotificationTests(APITestCase):
    def setUp(self):
        self.origin_author = _user("rs-notif-o")
        self.sharer = _user("rs-notif-s")
        self.origin = _free_post(self.origin_author)
        self.url = reverse("accounts:feed_posts")

    def _share(self, post_id, user, caption=""):
        self.client.force_authenticate(user=user)
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(
                self.url,
                data={
                    "post_type": "shared_feed_post",
                    "shared_feed_post_id": post_id,
                    "caption": caption,
                },
                format="json",
            )

    def _notifications(self):
        return Notification.objects.filter(
            user=self.origin_author, type=NotificationType.FEED_POST_SHARED
        )

    def test_share_notifies_content_owner(self):
        response = self._share(self.origin.id, self.sharer)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        notification = self._notifications().get()
        self.assertEqual(notification.actor_id, self.sharer.id)
        self.assertEqual(notification.data["post_id"], response.data["id"])

    def test_self_share_creates_no_notification(self):
        response = self._share(self.origin.id, self.origin_author)

        # Status najprv: bez neho by test prešiel aj vtedy, keby zdieľanie
        # zlyhalo z úplne iného dôvodu a notifikácia nevznikla „správne".
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Notification.objects.count(), 0)

    def test_repeated_shares_create_separate_notifications(self):
        # Bez dedupu: každé zdieľanie je vlastná udalosť s vlastným komentárom.
        self._share(self.origin.id, self.sharer, caption="Prvýkrát")
        self._share(self.origin.id, self.sharer, caption="Druhýkrát")

        self.assertEqual(self._notifications().count(), 2)

    def test_notification_target_url_points_to_the_reshare(self):
        from accounts.notification_serializers import NotificationSerializer

        response = self._share(self.origin.id, self.sharer)
        notification = self._notifications().get()

        data = NotificationSerializer(notification).data
        self.assertEqual(data["target_url"], f"/dashboard/feed/{response.data['id']}")

    def test_sharing_an_offer_notifies_the_offer_owner(self):
        # Rovnaká notifikácia platí aj pre ostatné shared_* typy.
        offer = OfferedSkill.objects.create(
            user=self.origin_author, category="it-a-technologie", subcategory="X"
        )
        self.client.force_authenticate(user=self.sharer)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                self.url,
                data={"post_type": "shared_offer", "shared_offer_id": offer.id},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self._notifications().count(), 1)
