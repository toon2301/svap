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
        self.assertEqual(response.data["code"], "shared_source_missing")
        self.assertEqual(FeedPost.objects.count(), 0)

    def test_hidden_and_nonexistent_sources_are_indistinguishable(self):
        """Enumeration: „existuje, ale nevidíš" sa nesmie líšiť od „neexistuje"."""
        hidden = _offer(self.other, is_hidden=True)
        self.client.force_authenticate(user=self.author)

        hidden_response = self.client.post(
            self.url,
            data={"post_type": "shared_offer", "shared_offer_id": hidden.id},
            format="json",
        )
        missing_response = self.client.post(
            self.url,
            data={"post_type": "shared_offer", "shared_offer_id": 999999},
            format="json",
        )

        self.assertEqual(hidden_response.status_code, missing_response.status_code)
        self.assertEqual(hidden_response.data, missing_response.data)

    def test_private_owner_source_is_indistinguishable_from_missing(self):
        """Rovnaký enumeration guard aj pre súkromný profil vlastníka."""
        private_owner = _user("feed-create-private", is_public=False)
        offer = _offer(private_owner)
        self.client.force_authenticate(user=self.author)

        private_response = self.client.post(
            self.url,
            data={"post_type": "shared_offer", "shared_offer_id": offer.id},
            format="json",
        )
        missing_response = self.client.post(
            self.url,
            data={"post_type": "shared_offer", "shared_offer_id": 999999},
            format="json",
        )

        self.assertEqual(private_response.status_code, missing_response.status_code)
        self.assertEqual(private_response.data, missing_response.data)
        self.assertEqual(private_response.data["code"], "shared_source_missing")

    def test_own_hidden_offer_is_still_shareable(self):
        """Zjednotenie chyby nesmie zabiť legitímne zdieľanie vlastného obsahu."""
        offer = _offer(self.author, is_hidden=True)
        self.client.force_authenticate(user=self.author)

        response = self.client.post(
            self.url,
            data={"post_type": "shared_offer", "shared_offer_id": offer.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_boolean_shared_offer_id_is_rejected(self):
        # bool je podtrieda int – True by sa inak stalo ID 1.
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self.url,
            data={"post_type": "shared_offer", "shared_offer_id": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "shared_source_required")

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
        # Autor blokuje diváka.
        author_blocks = _user("feed-list-blocked-a")
        post_author_blocks = _free_post(author_blocks, caption="Autor blokuje")
        UserBlock.objects.create(blocker=author_blocks, blocked_user=self.viewer)
        # Divák blokuje autora (opačný smer).
        viewer_blocks = _user("feed-list-blocked-b")
        post_viewer_blocks = _free_post(viewer_blocks, caption="Divák blokuje")
        UserBlock.objects.create(blocker=self.viewer, blocked_user=viewer_blocks)

        post_ok = _free_post(self.public_author)

        self.client.force_authenticate(user=self.viewer)
        ids = self._result_ids(self.client.get(self.url))

        self.assertIn(post_ok.id, ids)
        self.assertNotIn(post_author_blocks.id, ids)
        self.assertNotIn(post_viewer_blocks.id, ids)

        # Anonym blokovanie nemá – vidí oba (anonym-safe no-op).
        self.client.force_authenticate(user=None)
        anon_ids = self._result_ids(self.client.get(self.url))
        self.assertIn(post_author_blocks.id, anon_ids)
        self.assertIn(post_viewer_blocks.id, anon_ids)

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


class FeedCountsApiTests(APITestCase):
    """Počty lajkov/komentárov pri oboch reverse vzťahoch naraz (fan-out)."""

    def test_likes_and_comments_counts_are_not_multiplied(self):
        from accounts.models import FeedPostComment, FeedPostLike

        author = _user("feed-counts-author")
        post = _free_post(author)
        likers = [_user(f"feed-counts-liker-{i}") for i in range(3)]
        commenters = [_user(f"feed-counts-commenter-{i}") for i in range(2)]
        for liker in likers:
            FeedPostLike.objects.create(post=post, user=liker)
        for commenter in commenters:
            FeedPostComment.objects.create(post=post, author=commenter, text="Ahoj")

        entry = self.client.get(reverse(LIST_URL_NAME)).data["results"][0]

        # 3 lajky × 2 komentáre by pri naivnom Count() dalo 6 a 6.
        self.assertEqual(entry["likes_count"], 3)
        self.assertEqual(entry["comments_count"], 2)

    def test_counts_are_zero_not_null_without_interactions(self):
        author = _user("feed-counts-empty")
        _free_post(author)

        entry = self.client.get(reverse(LIST_URL_NAME)).data["results"][0]

        self.assertEqual(entry["likes_count"], 0)
        self.assertEqual(entry["comments_count"], 0)

    def test_counts_are_correlated_per_post(self):
        """Každý príspevok má vlastné čísla – zlá korelácia (OuterRef) by
        rozliala počty jedného príspevku na ostatné."""
        from accounts.models import FeedPostComment, FeedPostLike

        author = _user("feed-counts-corr-author")
        busy = _free_post(author, caption="Populárny")
        quiet = _free_post(author, caption="Tichý")
        empty = _free_post(author, caption="Prázdny")

        for index in range(4):
            liker = _user(f"feed-counts-corr-liker-{index}")
            FeedPostLike.objects.create(post=busy, user=liker)
            if index < 3:
                FeedPostComment.objects.create(
                    post=busy, author=liker, text="Ahoj"
                )
            if index < 1:
                FeedPostLike.objects.create(post=quiet, user=liker)

        results = self.client.get(reverse(LIST_URL_NAME)).data["results"]
        by_id = {entry["id"]: entry for entry in results}

        self.assertEqual(by_id[busy.id]["likes_count"], 4)
        self.assertEqual(by_id[busy.id]["comments_count"], 3)
        self.assertEqual(by_id[quiet.id]["likes_count"], 1)
        self.assertEqual(by_id[quiet.id]["comments_count"], 0)
        self.assertEqual(by_id[empty.id]["likes_count"], 0)
        self.assertEqual(by_id[empty.id]["comments_count"], 0)

    def test_counts_do_not_cross_join_like_and_comment_tables(self):
        """Výkon: lajky/komentáre sa počítajú v subquery, nie krížovým joinom.

        Krížový join by pred agregáciou vyrobil lajky × komentáre riadkov;
        v subquery ostáva hlavný dotaz jeden riadok na príspevok.
        """
        import re

        from accounts.views.feed_posts import _annotated_queryset

        sql = str(_annotated_queryset().query)

        for table in ("accounts_feedpostlike", "accounts_feedpostcomment"):
            # Tabuľka sa v SQL musí vyskytovať (počítame ju), ale NIE ako JOIN.
            self.assertIn(table, sql)
            self.assertIsNone(
                re.search(rf'JOIN\s+"?{table}"?', sql, flags=re.IGNORECASE),
                f"{table} sa pripája cez JOIN – krížový súčin sa vrátil",
            )


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


class FeedSharedContentSerializationTests(APITestCase):
    """Živé dáta kým zdroj žije; snapshot výhradne pre nedostupný zdroj."""

    def setUp(self):
        self.owner = _user("feed-live-owner")
        self.sharer = _user("feed-live-sharer")

    def _shared_payload(self, post):
        response = self.client.get(
            reverse("accounts:feed_post_detail", args=[post.id])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data

    def test_visible_source_serializes_live_fields_not_snapshot(self):
        offer = _offer(self.owner, subcategory="Programovanie")
        post = FeedPost.objects.create(
            author=self.sharer,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        # Zdroj sa po zdieľaní premenuje – snapshot ostáva starý.
        offer.subcategory = "Grafika"
        offer.category = "dizajn"
        offer.save(update_fields=["subcategory", "category"])
        post.refresh_from_db()
        self.assertEqual(post.shared_title, "Programovanie")

        shared = self._shared_payload(post)["shared_content"]

        self.assertEqual(shared["title"], "Grafika")
        self.assertEqual(shared["category"], "dizajn")

    def test_unavailable_source_falls_back_to_snapshot(self):
        offer = _offer(self.owner, subcategory="Programovanie")
        post = FeedPost.objects.create(
            author=self.sharer,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        offer.subcategory = "Grafika"
        offer.is_hidden = True
        offer.save(update_fields=["subcategory", "is_hidden"])

        shared = self._shared_payload(post)["shared_content"]

        # Skrytý zdroj → snapshot, žiadny únik aktuálneho názvu ani preklik.
        self.assertEqual(shared["title"], "Programovanie")
        self.assertIsNone(shared["id"])
        self.assertIsNone(shared["owner"])

    def test_deleted_source_falls_back_to_snapshot(self):
        offer = _offer(self.owner, subcategory="Programovanie")
        post = FeedPost.objects.create(
            author=self.sharer,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        offer.delete()

        payload = self._shared_payload(post)

        self.assertTrue(payload["shared_content_unavailable"])
        self.assertEqual(payload["shared_content"]["title"], "Programovanie")

    def test_live_portfolio_item_serializes_current_title(self):
        item = PortfolioItem.objects.create(
            owner=self.owner, title="Weby", category="it-a-technologie"
        )
        post = FeedPost.objects.create(
            author=self.sharer,
            post_type=FeedPost.PostType.SHARED_PORTFOLIO_ITEM,
            shared_portfolio_item=item,
        )
        item.title = "Weby na mieru"
        item.save(update_fields=["title"])

        shared = self._shared_payload(post)["shared_content"]

        self.assertEqual(shared["title"], "Weby na mieru")


class FeedImageFileApiTests(APITestCase):
    """Obrázkové proxy endpointy – autorizácia musí sedieť s JSON API."""

    def setUp(self):
        self.author = _user("feed-img-author")
        self.viewer = _user("feed-img-viewer")
        self.owner = _user("feed-img-owner")

    def _image_url(self, post):
        return reverse("accounts:feed_post_image_file", args=[post.id])

    def _shared_thumb_url(self, post):
        return reverse("accounts:feed_post_shared_thumbnail", args=[post.id])

    def _shared_post(self, offer):
        post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        # Snapshot kľúč simulujeme priamo (upload flow tu netestujeme).
        FeedPost.objects.filter(pk=post.pk).update(
            shared_thumbnail_key="media/offers/1/thumb.webp"
        )
        post.refresh_from_db()
        return post

    def test_shared_thumbnail_404_when_source_hidden(self):
        """NÁLEZ 1: keď JSON hlási nedostupné, nesmie ísť von ani obrázok."""
        offer = _offer(self.owner)
        post = self._shared_post(offer)
        offer.is_hidden = True
        offer.save(update_fields=["is_hidden"])

        response = self.client.get(self._shared_thumb_url(post))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_shared_thumbnail_404_when_owner_goes_private(self):
        offer = _offer(self.owner)
        post = self._shared_post(offer)
        self.owner.is_public = False
        self.owner.save(update_fields=["is_public"])

        response = self.client.get(self._shared_thumb_url(post))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_shared_thumbnail_404_for_free_post(self):
        post = _free_post(self.author)
        response = self.client.get(self._shared_thumb_url(post))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_image_404_for_unapproved_photo_of_other_user(self):
        post = _free_post(self.author)
        FeedPost.objects.filter(pk=post.pk).update(
            image_status=FeedPost.ImageStatus.PENDING,
            image_pending_key="uploads/feed/1/x.jpg",
        )

        self.client.force_authenticate(user=self.viewer)
        response = self.client.get(self._image_url(post))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_image_404_when_author_is_private_for_other_viewer(self):
        private_author = _user("feed-img-private", is_public=False)
        post = _free_post(private_author)
        FeedPost.objects.filter(pk=post.pk).update(
            image_status=FeedPost.ImageStatus.APPROVED,
            image_approved_key="media/feed/1/large.webp",
        )

        response = self.client.get(self._image_url(post))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class FeedImageSerializationTests(APITestCase):
    """get_image: verejne len APPROVED, autor vidí aj stav spracovania."""

    def setUp(self):
        self.author = _user("feed-imgser-author")
        self.viewer = _user("feed-imgser-viewer")
        self.post = _free_post(self.author)

    def _set_image(self, **fields):
        FeedPost.objects.filter(pk=self.post.pk).update(**fields)

    def _detail(self):
        return self.client.get(
            reverse("accounts:feed_post_detail", args=[self.post.id])
        ).data

    def test_approved_image_exposes_absolute_urls(self):
        self._set_image(
            image_status=FeedPost.ImageStatus.APPROVED,
            image_approved_key="media/feed/1/large.webp",
            image_thumbnail_key="media/feed/1/thumb.webp",
            image_width=800,
            image_height=600,
        )

        image = self._detail()["image"]

        self.assertTrue(image["large_url"].startswith("http"))
        self.assertIn("variant=thumbnail", image["thumbnail_url"])
        self.assertEqual(image["width"], 800)
        # Cudzí divák stav spracovania nepotrebuje.
        self.assertNotIn("status", image)

    def test_pending_image_hidden_from_others_visible_to_author(self):
        self._set_image(
            image_status=FeedPost.ImageStatus.PENDING,
            image_pending_key="uploads/feed/1/x.jpg",
        )

        self.assertIsNone(self._detail()["image"])

        self.client.force_authenticate(user=self.author)
        image = self._detail()["image"]
        self.assertEqual(image["status"], FeedPost.ImageStatus.PENDING)

    def test_rejected_image_shows_reason_to_author_only(self):
        self._set_image(
            image_status=FeedPost.ImageStatus.REJECTED,
            image_rejected_reason="Nevhodny obsah.",
        )

        self.assertIsNone(self._detail()["image"])

        self.client.force_authenticate(user=self.author)
        image = self._detail()["image"]
        self.assertEqual(image["status"], FeedPost.ImageStatus.REJECTED)
        self.assertEqual(image["rejected_reason"], "Nevhodny obsah.")


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

    def test_tagged_posts_hidden_when_target_user_is_private(self):
        """NÁLEZ 2: história označení súkromného používateľa nesmie unikať."""
        from accounts.services.feed_tagging import apply_feed_post_tags

        private_target = _user("feed-tagged-private", is_public=False)
        post = _free_post(self.owner, caption="Verejný autor")
        apply_feed_post_tags(post, [private_target.id])

        # Autor príspevku je verejný, ale označený nie → anonym nevidí nič.
        self.assertEqual(
            self._result_ids(self.client.get(self._tagged_url(private_target))), []
        )
        # Sám označený svoju sekciu vidí.
        self.client.force_authenticate(user=private_target)
        self.assertEqual(
            self._result_ids(self.client.get(self._tagged_url(private_target))),
            [post.id],
        )

    def test_tagged_posts_hidden_when_target_user_blocks_viewer(self):
        from accounts.services.feed_tagging import apply_feed_post_tags

        target = _user("feed-tagged-blocker")
        post = _free_post(self.owner, caption="Verejný autor")
        apply_feed_post_tags(post, [target.id])
        UserBlock.objects.create(blocker=target, blocked_user=self.viewer)

        self.client.force_authenticate(user=self.viewer)
        self.assertEqual(
            self._result_ids(self.client.get(self._tagged_url(target))), []
        )

    def test_tagged_posts_empty_for_nonexistent_user(self):
        response = self.client.get(
            reverse("accounts:feed_user_tagged_posts", args=[999999])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._result_ids(response), [])

    def test_tagged_endpoint_has_no_n_plus_one(self):
        from accounts.services.feed_tagging import apply_feed_post_tags

        extra_users = [_user(f"feed-nplus-{i}") for i in range(3)]
        content_owner = _user("feed-nplus-owner")

        def make_tagged_post(caption, *, shared=False):
            if shared:
                post = FeedPost.objects.create(
                    author=self.owner,
                    post_type=FeedPost.PostType.SHARED_OFFER,
                    shared_offer=_offer(content_owner, subcategory=caption),
                )
            else:
                post = _free_post(self.owner, caption=caption)
            apply_feed_post_tags(
                post, [self.viewer.id] + [u.id for u in extra_users]
            )
            return post

        # Autentifikovaný divák: zapne aj is_liked_by_me dotaz a shared vetvu.
        self.client.force_authenticate(user=self.viewer)

        make_tagged_post("Prvý")
        make_tagged_post("PrvýShared", shared=True)
        with CaptureQueriesContext(connection) as small:
            self.client.get(self._tagged_url(self.viewer))

        for index in range(4):
            make_tagged_post(f"Ďalší {index}")
            make_tagged_post(f"ĎalšíShared {index}", shared=True)
        with CaptureQueriesContext(connection) as large:
            self.client.get(self._tagged_url(self.viewer))

        # Počet dotazov nesmie rásť s počtom príspevkov/tagov (prefetch, nie N+1).
        self.assertEqual(len(small.captured_queries), len(large.captured_queries))
