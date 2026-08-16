"""Zmazanie vlastného príspevku (DELETE /feed/posts/<id>/).

Právo mazať má IBA autor – rovnaká definícia ako `can_manage` v serializeri,
podľa ktorého sa na FE zobrazuje položka menu.
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import (
    FeedPost,
    FeedPostComment,
    FeedPostLike,
    FeedPostReport,
    FeedPostTag,
)

User = get_user_model()


def _user(name):
    return User.objects.create_user(
        username=name,
        email=f"{name}@example.com",
        password="StrongPass123",
        is_public=True,
    )


class FeedPostDeleteTests(APITestCase):
    def setUp(self):
        self.author = _user("del-author")
        self.other = _user("del-other")
        self.post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Zmaz ma",
        )

    def _url(self, post=None):
        return reverse("accounts:feed_post_detail", args=[(post or self.post).id])

    def test_author_deletes_own_post(self):
        self.client.force_authenticate(user=self.author)

        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(FeedPost.objects.filter(pk=self.post.pk).exists())

    def test_related_rows_go_with_the_post(self):
        FeedPostLike.objects.create(post=self.post, user=self.other)
        FeedPostComment.objects.create(
            post=self.post, author=self.other, text="Komentar"
        )
        FeedPostTag.objects.create(post=self.post, tagged_user=self.other)
        FeedPostReport.objects.create(
            post=self.post, reported_by=self.other, reason="spam", description=""
        )
        self.client.force_authenticate(user=self.author)

        self.client.delete(self._url())

        self.assertFalse(FeedPostLike.objects.filter(post_id=self.post.pk).exists())
        self.assertFalse(FeedPostComment.objects.filter(post_id=self.post.pk).exists())
        self.assertFalse(FeedPostTag.objects.filter(post_id=self.post.pk).exists())
        self.assertFalse(FeedPostReport.objects.filter(post_id=self.post.pk).exists())

    def test_reshare_by_someone_else_survives_as_unavailable(self):
        """Zdieľanie je cudzí obsah – nesmie zmiznúť s originálom."""
        reshare = FeedPost.objects.create(
            author=self.other,
            post_type=FeedPost.PostType.SHARED_FEED_POST,
            shared_feed_post=self.post,
        )
        self.client.force_authenticate(user=self.author)

        self.client.delete(self._url())

        reshare.refresh_from_db()
        self.assertIsNone(reshare.shared_feed_post_id)

    def test_someone_else_cannot_delete(self):
        self.client.force_authenticate(user=self.other)

        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(FeedPost.objects.filter(pk=self.post.pk).exists())

    def test_anonymous_cannot_delete(self):
        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(FeedPost.objects.filter(pk=self.post.pk).exists())

    def test_missing_post_is_not_found(self):
        self.client.force_authenticate(user=self.author)

        response = self.client.delete(
            reverse("accounts:feed_post_detail", args=[999999])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_repeated_delete_is_not_found(self):
        self.client.force_authenticate(user=self.author)
        self.client.delete(self._url())

        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_still_works_for_anonymous(self):
        """DELETE na tej istej ceste nesmie zavrieť verejný permalink."""
        response = self.client.get(self._url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.post.id)

    def test_can_manage_matches_who_may_delete(self):
        """Menu na FE sa riadi `can_manage` – musí sedieť s právom mazať."""
        self.client.force_authenticate(user=self.author)
        self.assertTrue(self.client.get(self._url()).data["can_manage"])

        self.client.force_authenticate(user=self.other)
        self.assertFalse(self.client.get(self._url()).data["can_manage"])
