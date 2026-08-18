"""Zoznam ľudí, čo dali lajk – príspevok aj komentár.

Verejné rovnako ako obsah sám, ale blok sa rešpektuje OBOJSMERNE a len voči
konkrétnemu divákovi: iný divák toho istého človeka v zozname vidí.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import (
    FeedPost,
    FeedPostComment,
    FeedPostCommentLike,
    FeedPostLike,
    UserBlock,
)

User = get_user_model()


def _user(name, *, is_public=True):
    return User.objects.create_user(
        username=name,
        email=f"{name}@example.com",
        password="StrongPass123",
        is_public=is_public,
    )


class FeedPostLikersTests(APITestCase):
    def setUp(self):
        self.author = _user("likers-author")
        self.first = _user("likers-first")
        self.second = _user("likers-second")
        self.bystander = _user("likers-bystander")
        self.post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Ahoj",
        )
        # Poradie vzniku určuje poradie v zozname (najnovší prvý).
        FeedPostLike.objects.create(post=self.post, user=self.first)
        FeedPostLike.objects.create(post=self.post, user=self.second)
        self.url = reverse("accounts:feed_post_likers", args=[self.post.id])

    def _ids(self, response):
        return [item["id"] for item in response.data["results"]]

    def test_lists_likers_newest_first(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._ids(response), [self.second.id, self.first.id])

    def test_payload_carries_user_summary(self):
        response = self.client.get(self.url)

        entry = response.data["results"][0]
        for field in ("id", "display_name", "slug", "avatar_url"):
            self.assertIn(field, entry)

    def test_anonymous_sees_the_list(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_blocked_user_is_hidden_from_that_viewer_only(self):
        UserBlock.objects.create(blocker=self.bystander, blocked_user=self.first)

        self.client.force_authenticate(user=self.bystander)
        self.assertEqual(self._ids(self.client.get(self.url)), [self.second.id])

        # Nezúčastnený divák ho vidí ďalej – blok je vzťah dvojice.
        self.client.force_authenticate(user=self.author)
        self.assertEqual(
            self._ids(self.client.get(self.url)), [self.second.id, self.first.id]
        )

    def test_block_works_in_the_other_direction_too(self):
        UserBlock.objects.create(blocker=self.first, blocked_user=self.bystander)
        self.client.force_authenticate(user=self.bystander)

        self.assertEqual(self._ids(self.client.get(self.url)), [self.second.id])

    def test_invisible_post_is_not_found(self):
        self.author.is_public = False
        self.author.save(update_fields=["is_public"])

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_pagination_splits_the_list(self):
        # Rozostup v čase je nutný: pri zhodnom `created_at` prejde cursor do
        # offsetového režimu a test by meral rozlíšenie hodín, nie stránkovanie.
        for index in range(3):
            FeedPostLike.objects.create(post=self.post, user=_user(f"likers-x{index}"))

        base = timezone.now() - timedelta(hours=1)
        for index, like_id in enumerate(
            FeedPostLike.objects.filter(post=self.post)
            .order_by("id")
            .values_list("id", flat=True)
        ):
            FeedPostLike.objects.filter(pk=like_id).update(
                created_at=base + timedelta(minutes=index)
            )

        collected: list[int] = []
        url = f"{self.url}?page_size=2"
        pages = 0
        while url and pages < 10:
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            collected.extend(self._ids(response))
            next_url = response.data["next"]
            url = "/api" + next_url.split("/api", 1)[1] if next_url else None
            pages += 1

        # Päť lajkov po dvoch = tri stránky, nič sa nezopakovalo ani nestratilo.
        self.assertEqual(pages, 3)
        self.assertEqual(len(collected), 5)
        self.assertEqual(len(set(collected)), 5)


class FeedCommentLikersTests(APITestCase):
    def setUp(self):
        self.author = _user("clikers-author")
        self.liker = _user("clikers-liker")
        self.blocked = _user("clikers-blocked")
        self.post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Ahoj",
        )
        self.comment = FeedPostComment.objects.create(
            post=self.post, author=self.author, text="Komentar"
        )
        FeedPostCommentLike.objects.create(comment=self.comment, user=self.liker)
        FeedPostCommentLike.objects.create(comment=self.comment, user=self.blocked)
        self.url = reverse(
            "accounts:feed_post_comment_likers", args=[self.post.id, self.comment.id]
        )

    def test_lists_comment_likers(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["id"] for item in response.data["results"]],
            [self.blocked.id, self.liker.id],
        )

    def test_respects_blocking(self):
        viewer = _user("clikers-viewer")
        UserBlock.objects.create(blocker=viewer, blocked_user=self.blocked)
        self.client.force_authenticate(user=viewer)

        response = self.client.get(self.url)

        self.assertEqual(
            [item["id"] for item in response.data["results"]], [self.liker.id]
        )

    def test_unknown_comment_is_not_found(self):
        response = self.client.get(
            reverse("accounts:feed_post_comment_likers", args=[self.post.id, 999999])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_comment_of_an_invisible_post_is_not_found(self):
        self.author.is_public = False
        self.author.save(update_fields=["is_public"])

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class FeedLikersPrivacyTests(APITestCase):
    """Súkromný účet sa v zozname lajkov neukáže – okrem seba samého."""

    def setUp(self):
        self.author = _user("priv-author")
        self.public_liker = _user("priv-public")
        self.private_liker = _user("priv-private", is_public=False)
        self.bystander = _user("priv-bystander")
        self.post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Verejny prispevok",
        )
        FeedPostLike.objects.create(post=self.post, user=self.public_liker)
        FeedPostLike.objects.create(post=self.post, user=self.private_liker)
        self.url = reverse("accounts:feed_post_likers", args=[self.post.id])

    def _ids(self, response):
        return [item["id"] for item in response.data["results"]]

    def test_private_liker_is_hidden_from_others(self):
        self.client.force_authenticate(user=self.bystander)

        self.assertEqual(self._ids(self.client.get(self.url)), [self.public_liker.id])

    def test_private_liker_is_hidden_from_anonymous(self):
        self.assertEqual(self._ids(self.client.get(self.url)), [self.public_liker.id])

    def test_private_liker_sees_themselves(self):
        self.client.force_authenticate(user=self.private_liker)

        ids = self._ids(self.client.get(self.url))

        self.assertIn(self.private_liker.id, ids)
        self.assertIn(self.public_liker.id, ids)

    def test_inactive_liker_is_hidden(self):
        self.public_liker.is_active = False
        self.public_liker.save(update_fields=["is_active"])

        self.assertEqual(self._ids(self.client.get(self.url)), [])

    def test_comment_likers_hide_private_accounts_too(self):
        comment = FeedPostComment.objects.create(
            post=self.post, author=self.author, text="Komentar"
        )
        FeedPostCommentLike.objects.create(comment=comment, user=self.private_liker)
        FeedPostCommentLike.objects.create(comment=comment, user=self.public_liker)
        url = reverse(
            "accounts:feed_post_comment_likers", args=[self.post.id, comment.id]
        )
        self.client.force_authenticate(user=self.bystander)

        response = self.client.get(url)

        self.assertEqual(
            [item["id"] for item in response.data["results"]], [self.public_liker.id]
        )
