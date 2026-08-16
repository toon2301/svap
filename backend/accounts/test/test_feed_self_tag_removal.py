"""Odstránenie vlastného označenia v príspevku (DELETE .../tags/me/).

Súkromná akcia označeného: príspevok ostáva, mizne len jeho tag. Kľúčové je,
že si ho nemôže odstrániť nikto iný – ani autor príspevku – a že sa pritom
neprezradí, či tam cudzí tag vôbec je.
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import (
    FeedPost,
    FeedPostTag,
    Notification,
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


class FeedSelfTagRemovalTests(APITestCase):
    def setUp(self):
        self.author = _user("tag-author")
        self.tagged = _user("tag-tagged")
        self.stranger = _user("tag-stranger")
        self.post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Ahoj",
        )
        self.tag = FeedPostTag.objects.create(post=self.post, tagged_user=self.tagged)

    def _url(self, post=None):
        return reverse("accounts:feed_post_self_tag", args=[(post or self.post).id])

    def test_tagged_user_removes_own_tag(self):
        self.client.force_authenticate(user=self.tagged)

        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(FeedPostTag.objects.filter(pk=self.tag.pk).exists())
        # Príspevok ostáva – odstraňuje sa označenie, nie obsah.
        self.assertTrue(FeedPost.objects.filter(pk=self.post.pk).exists())

    def test_post_author_cannot_remove_someone_elses_tag(self):
        self.client.force_authenticate(user=self.author)

        response = self.client.delete(self._url())

        # 404, nie 403: 403 by potvrdilo, že cudzí tag na príspevku je.
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(FeedPostTag.objects.filter(pk=self.tag.pk).exists())

    def test_stranger_cannot_remove_someone_elses_tag(self):
        self.client.force_authenticate(user=self.stranger)

        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(FeedPostTag.objects.filter(pk=self.tag.pk).exists())

    def test_invisible_post_returns_not_found(self):
        """Blokovanie skryje príspevok, takže ani tag sa cez neho nedá riešiť."""
        UserBlock.objects.create(blocker=self.author, blocked_user=self.tagged)
        self.client.force_authenticate(user=self.tagged)

        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(FeedPostTag.objects.filter(pk=self.tag.pk).exists())

    def test_private_author_post_returns_not_found(self):
        self.author.is_public = False
        self.author.save(update_fields=["is_public"])
        self.client.force_authenticate(user=self.tagged)

        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_repeated_removal_is_a_friendly_not_found(self):
        self.client.force_authenticate(user=self.tagged)
        self.client.delete(self._url())

        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", response.data)

    def test_anonymous_is_rejected(self):
        response = self.client.delete(self._url())

        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self.assertTrue(FeedPostTag.objects.filter(pk=self.tag.pk).exists())

    def test_removal_creates_no_notification(self):
        before = Notification.objects.count()
        self.client.force_authenticate(user=self.tagged)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        # Súkromná akcia – nikoho neupozorňuje, ani autora príspevku.
        self.assertEqual(Notification.objects.count(), before)

    def test_other_tags_on_the_same_post_survive(self):
        second = _user("tag-second")
        other_tag = FeedPostTag.objects.create(post=self.post, tagged_user=second)
        self.client.force_authenticate(user=self.tagged)

        self.client.delete(self._url())

        self.assertTrue(FeedPostTag.objects.filter(pk=other_tag.pk).exists())
        self.assertFalse(FeedPostTag.objects.filter(pk=self.tag.pk).exists())
