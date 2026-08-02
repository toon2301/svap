"""Feed Fáza 2a – API testy (vytvorenie, zoznam, detail, profilové zoznamy).

Validačná logika (viditeľnosť zdieľania, tagovanie) má vlastné testy z Fázy 1 –
tu sa testuje, že endpointy ju správne prepájajú (400 s kódom, nie 500),
viditeľnosť feedu (is_public, blokovanie, anonym), cursor stránkovanie
a absencia N+1.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import FeedPost, OfferedSkill, UserBlock
from accounts.services.feed_share_visibility import REASON_HIDDEN
from accounts.services.feed_tagging import REASON_TAG_BLOCKED
from portfolio.models import PortfolioItem

User = get_user_model()


def _user(name, *, is_public=True):
    return User.objects.create_user(
        username=name, email=f"{name}@example.com", password="StrongPass123",
        is_public=is_public,
    )


def _offer(user, subcategory="Programovanie", **kwargs):
    return OfferedSkill.objects.create(
        user=user, category="it-a-technologie", subcategory=subcategory, **kwargs
    )


def _free_post(author, caption="Ahoj feed!"):
    return FeedPost.objects.create(
        author=author, post_type=FeedPost.PostType.FREE_POST, caption=caption
    )


LIST_URL_NAME = "accounts:feed_posts"


class FeedPostCreateApiTests(APITestCase):
    def setUp(self):
        self.author = _user("feed-create-author")
        self.other = _user("feed-create-other")
        self.url = reverse(LIST_URL_NAME)

    def test_create_free_post(self):
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self.url,
            data={"post_type": "free_post", "caption": "Môj prvý post"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["post_type"], "free_post")
        self.assertEqual(response.data["caption"], "Môj prvý post")
        self.assertEqual(response.data["author"]["id"], self.author.id)
        self.assertIsNone(response.data["image"])
        self.assertIsNone(response.data["shared_content"])
        self.assertFalse(response.data["shared_content_unavailable"])
        self.assertTrue(response.data["can_manage"])
        self.assertFalse(response.data["is_liked_by_me"])

    def test_create_free_post_requires_caption(self):
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self.url, data={"post_type": "free_post"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "caption_required")

    def test_create_shared_offer_own(self):
        offer = _offer(self.author)
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self.url,
            data={"post_type": "shared_offer", "shared_offer_id": offer.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        shared = response.data["shared_content"]
        self.assertEqual(shared["type"], "offer")
        self.assertEqual(shared["id"], offer.id)
        self.assertEqual(shared["title"], "Programovanie")
        self.assertEqual(shared["owner"]["id"], self.author.id)
        self.assertFalse(response.data["shared_content_unavailable"])

    def test_create_shared_offer_foreign_public(self):
        offer = _offer(self.other)
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self.url,
            data={"post_type": "shared_offer", "shared_offer_id": offer.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["shared_content"]["owner"]["id"], self.other.id
        )

    def test_create_shared_portfolio_item(self):
        item = PortfolioItem.objects.create(
            owner=self.other, title="Weby na mieru", category="it-a-technologie"
        )
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self.url,
            data={
                "post_type": "shared_portfolio_item",
                "shared_portfolio_item_id": item.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        shared = response.data["shared_content"]
        self.assertEqual(shared["type"], "portfolio_item")
        self.assertEqual(shared["title"], "Weby na mieru")

    def test_create_shared_hidden_foreign_offer_returns_400_not_500(self):
        offer = _offer(self.other, is_hidden=True)
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self.url,
            data={"post_type": "shared_offer", "shared_offer_id": offer.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], REASON_HIDDEN)
        self.assertEqual(FeedPost.objects.count(), 0)

    def test_create_with_blocked_tag_returns_400_and_rolls_back(self):
        UserBlock.objects.create(blocker=self.other, blocked_user=self.author)
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self.url,
            data={
                "post_type": "free_post",
                "caption": "S označením",
                "tagged_user_ids": [self.other.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], REASON_TAG_BLOCKED)
        # Rollback – príspevok nesmie ostať bez tagov "napoly vytvorený".
        self.assertEqual(FeedPost.objects.count(), 0)

    def test_create_with_tags_returns_tagged_users(self):
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self.url,
            data={
                "post_type": "free_post",
                "caption": "S označením",
                "tagged_user_ids": [self.other.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tagged = response.data["tagged_users"]
        self.assertEqual([entry["id"] for entry in tagged], [self.other.id])

    def test_create_requires_authentication(self):
        response = self.client.post(
            self.url, data={"post_type": "free_post", "caption": "X"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_rejects_invalid_post_type(self):
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self.url, data={"post_type": "nonsense"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "invalid_post_type")

    def test_create_rejects_missing_shared_source_id(self):
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self.url, data={"post_type": "shared_offer"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "shared_source_required")

    def test_create_rejects_nonexistent_shared_offer(self):
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self.url,
            data={"post_type": "shared_offer", "shared_offer_id": 999999},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "shared_source_missing")

    def test_create_rejects_mismatched_source_combo(self):
        offer = _offer(self.author)
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self.url,
            data={
                "post_type": "free_post",
                "caption": "X",
                "shared_offer_id": offer.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "unexpected_shared_source")

    def test_create_rejects_overlong_caption(self):
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self.url,
            data={"post_type": "free_post", "caption": "x" * 501},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "max_length")


class FeedListApiTests(APITestCase):
    def setUp(self):
        self.public_author = _user("feed-list-public")
        self.private_author = _user("feed-list-private", is_public=False)
        self.viewer = _user("feed-list-viewer")
        self.url = reverse(LIST_URL_NAME)

    def _result_ids(self, response):
        return [item["id"] for item in response.data["results"]]

    def test_anonymous_sees_public_authors_only(self):
        visible = _free_post(self.public_author)
        _free_post(self.private_author, caption="Súkromný")

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._result_ids(response), [visible.id])

    def test_private_author_sees_own_posts_in_feed(self):
        own = _free_post(self.private_author, caption="Môj súkromný")
        self.client.force_authenticate(user=self.private_author)

        response = self.client.get(self.url)

        self.assertIn(own.id, self._result_ids(response))

    def test_authenticated_excludes_blocked_authors_both_directions(self):
        blocked_author = _user("feed-list-blocked")
        post_blocked = _free_post(blocked_author, caption="Od blokovaného")
        post_ok = _free_post(self.public_author)
        UserBlock.objects.create(blocker=blocked_author, blocked_user=self.viewer)

        self.client.force_authenticate(user=self.viewer)
        response = self.client.get(self.url)

        ids = self._result_ids(response)
        self.assertIn(post_ok.id, ids)
        self.assertNotIn(post_blocked.id, ids)
        # Anonym blokovanie nemá – vidí oba (anonym-safe no-op).
        self.client.force_authenticate(user=None)
        self.assertIn(post_blocked.id, self._result_ids(self.client.get(self.url)))

    def test_authenticated_excludes_posts_sharing_blocked_owners_content(self):
        content_owner = _user("feed-list-content-owner")
        sharer = _user("feed-list-sharer")
        offer = _offer(content_owner)
        shared_post = FeedPost.objects.create(
            author=sharer,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        UserBlock.objects.create(blocker=self.viewer, blocked_user=content_owner)

        self.client.force_authenticate(user=self.viewer)
        self.assertNotIn(shared_post.id, self._result_ids(self.client.get(self.url)))
        # Bez blokovania (anonym) je príspevok normálne viditeľný.
        self.client.force_authenticate(user=None)
        self.assertIn(shared_post.id, self._result_ids(self.client.get(self.url)))

    def test_shared_source_hidden_after_posting_serializes_snapshot_only(self):
        content_owner = _user("feed-list-hider")
        sharer = _user("feed-list-sharer2")
        offer = _offer(content_owner, subcategory="Grafika")
        post = FeedPost.objects.create(
            author=sharer,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        offer.is_hidden = True
        offer.save(update_fields=["is_hidden"])

        response = self.client.get(self.url)
        entry = next(
            item for item in response.data["results"] if item["id"] == post.id
        )

        self.assertTrue(entry["shared_content_unavailable"])
        shared = entry["shared_content"]
        # Len snapshot: žiadne živé id (preklik) ani profilový payload vlastníka.
        self.assertIsNone(shared["id"])
        self.assertIsNone(shared["owner"])
        self.assertEqual(shared["title"], "Grafika")
        self.assertEqual(shared["owner_display_name"], content_owner.display_name)

    def test_cursor_pagination_no_dups_or_gaps_when_new_post_arrives(self):
        base = timezone.now()
        posts = []
        for index in range(5):
            post = _free_post(self.public_author, caption=f"Post {index}")
            # Deterministické created_at (E najnovší … A najstarší).
            FeedPost.objects.filter(pk=post.pk).update(
                created_at=base - timedelta(minutes=5 - index)
            )
            posts.append(post)

        first_page = self.client.get(self.url, {"page_size": 2})
        self.assertEqual(
            self._result_ids(first_page), [posts[4].id, posts[3].id]
        )
        next_url = first_page.data["next"]
        self.assertIsNotNone(next_url)

        # Medzi requestmi pribudne nový (najnovší) príspevok.
        newcomer = _free_post(self.public_author, caption="Nový medzi stránkami")

        second_page = self.client.get(next_url)
        second_ids = self._result_ids(second_page)

        # Nadväzuje presne tam, kde prvá strana skončila: žiadna duplicita
        # z prvej strany, žiadne preskočenie, nový post starú stránku neposúva.
        self.assertEqual(second_ids, [posts[2].id, posts[1].id])
        self.assertNotIn(newcomer.id, second_ids)

    def test_feed_is_chronological_across_types(self):
        base = timezone.now()
        free = _free_post(self.public_author, caption="Voľný")
        offer = _offer(self.public_author)
        shared = FeedPost.objects.create(
            author=self.public_author,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        FeedPost.objects.filter(pk=free.pk).update(created_at=base - timedelta(hours=2))
        FeedPost.objects.filter(pk=shared.pk).update(
            created_at=base - timedelta(hours=1)
        )

        ids = self._result_ids(self.client.get(self.url))
        self.assertEqual(ids, [shared.id, free.id])


class FeedDetailApiTests(APITestCase):
    def setUp(self):
        self.author = _user("feed-detail-author")
        self.viewer = _user("feed-detail-viewer")

    def _url(self, post):
        return reverse("accounts:feed_post_detail", args=[post.id])

    def test_detail_visible_for_anonymous(self):
        post = _free_post(self.author)
        response = self.client.get(self._url(post))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], post.id)

    def test_detail_404_for_private_author(self):
        private_author = _user("feed-detail-private", is_public=False)
        post = _free_post(private_author)
        response = self.client.get(self._url(post))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # … ale autor sám svoj príspevok vidí.
        self.client.force_authenticate(user=private_author)
        self.assertEqual(
            self.client.get(self._url(post)).status_code, status.HTTP_200_OK
        )

    def test_detail_404_when_blocked(self):
        post = _free_post(self.author)
        UserBlock.objects.create(blocker=self.author, blocked_user=self.viewer)
        self.client.force_authenticate(user=self.viewer)
        response = self.client.get(self._url(post))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class FeedProfileListsApiTests(APITestCase):
    def setUp(self):
        self.owner = _user("feed-profile-owner")
        self.viewer = _user("feed-profile-viewer")

    def _posts_url(self, user):
        return reverse("accounts:feed_user_posts", args=[user.id])

    def _tagged_url(self, user):
        return reverse("accounts:feed_user_tagged_posts", args=[user.id])

    def _result_ids(self, response):
        return [item["id"] for item in response.data["results"]]

    def test_my_posts_returns_own_posts(self):
        mine = _free_post(self.owner, caption="Môj")
        _free_post(self.viewer, caption="Cudzí")

        self.client.force_authenticate(user=self.owner)
        response = self.client.get(self._posts_url(self.owner))

        self.assertEqual(self._result_ids(response), [mine.id])

    def test_private_profile_posts_hidden_from_others_but_not_owner(self):
        private_owner = _user("feed-profile-private", is_public=False)
        post = _free_post(private_owner, caption="Súkromný")

        # Cudzí (aj anonym) → prázdny zoznam, žiadny únik.
        self.assertEqual(
            self._result_ids(self.client.get(self._posts_url(private_owner))), []
        )
        # Vlastník vidí svoje.
        self.client.force_authenticate(user=private_owner)
        self.assertEqual(
            self._result_ids(self.client.get(self._posts_url(private_owner))),
            [post.id],
        )

    def test_tagged_posts_returns_posts_where_user_is_tagged(self):
        from accounts.services.feed_tagging import apply_feed_post_tags

        base = timezone.now()
        first = _free_post(self.owner, caption="Prvý")
        second = _free_post(self.owner, caption="Druhý")
        _free_post(self.owner, caption="Bez tagu")
        apply_feed_post_tags(first, [self.viewer.id])
        apply_feed_post_tags(second, [self.viewer.id])
        FeedPost.objects.filter(pk=first.pk).update(
            created_at=base - timedelta(hours=2)
        )
        FeedPost.objects.filter(pk=second.pk).update(
            created_at=base - timedelta(hours=1)
        )

        response = self.client.get(self._tagged_url(self.viewer))

        # Chronologicky (najnovší prvý), len otagované.
        self.assertEqual(self._result_ids(response), [second.id, first.id])

    def test_tagged_endpoint_has_no_n_plus_one(self):
        from accounts.services.feed_tagging import apply_feed_post_tags

        extra_users = [_user(f"feed-nplus-{i}") for i in range(3)]

        def make_tagged_post(caption):
            post = _free_post(self.owner, caption=caption)
            apply_feed_post_tags(
                post, [self.viewer.id] + [u.id for u in extra_users]
            )
            return post

        make_tagged_post("Prvý")
        with CaptureQueriesContext(connection) as small:
            self.client.get(self._tagged_url(self.viewer))

        for index in range(4):
            make_tagged_post(f"Ďalší {index}")
        with CaptureQueriesContext(connection) as large:
            self.client.get(self._tagged_url(self.viewer))

        # Počet dotazov nesmie rásť s počtom príspevkov/tagov (prefetch, nie N+1).
        self.assertEqual(len(small.captured_queries), len(large.captured_queries))
