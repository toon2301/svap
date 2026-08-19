"""Odpovede na komentáre – presne jedna úroveň vnorenia.

Odpoveď je stále ``FeedPostComment``, takže lajky, mazanie aj scroll-to-comment
fungujú bez zvláštnej vetvy; testy to overujú, nie predpokladajú.
"""

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import (
    FeedPost,
    FeedPostComment,
    FeedPostCommentLike,
    Notification,
    NotificationType,
)

User = get_user_model()


def _user(name):
    return User.objects.create_user(
        username=name,
        email=f"{name}@example.com",
        password="StrongPass123",
        is_public=True,
    )


class FeedCommentReplyTests(APITestCase):
    def setUp(self):
        self.post_author = _user("reply-post-author")
        self.commenter = _user("reply-commenter")
        self.replier = _user("reply-replier")
        self.post = FeedPost.objects.create(
            author=self.post_author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Ahoj",
        )
        self.parent = FeedPostComment.objects.create(
            post=self.post, author=self.commenter, text="Hlavny komentar"
        )
        self.url = reverse("accounts:feed_post_comments", args=[self.post.id])

    def _reply(self, text="Odpoved", parent=None, user=None):
        self.client.force_authenticate(user=user or self.replier)
        return self.client.post(
            self.url,
            {"text": text, "parent_comment_id": (parent or self.parent).id},
            format="json",
        )

    # --- vytvorenie ------------------------------------------------------

    def test_reply_is_created_and_linked(self):
        response = self._reply()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["parent_comment_id"], self.parent.id)
        self.assertTrue(
            FeedPostComment.objects.filter(
                parent_comment=self.parent, author=self.replier
            ).exists()
        )

    def test_reply_to_a_reply_is_rejected(self):
        first = self._reply()
        reply_id = first.data["id"]

        response = self.client.post(
            self.url,
            {"text": "Odpoved na odpoved", "parent_comment_id": reply_id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "reply_depth_exceeded")

    def test_reply_to_a_comment_of_another_post_is_rejected(self):
        other_post = FeedPost.objects.create(
            author=self.post_author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Iny",
        )
        foreign = FeedPostComment.objects.create(
            post=other_post, author=self.commenter, text="Cudzi"
        )
        self.client.force_authenticate(user=self.replier)

        response = self.client.post(
            self.url,
            {"text": "Odpoved", "parent_comment_id": foreign.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["code"], "reply_parent_missing")

    def test_unknown_parent_is_rejected(self):
        self.client.force_authenticate(user=self.replier)

        response = self.client.post(
            self.url, {"text": "Odpoved", "parent_comment_id": 999999}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_model_blocks_a_second_level_even_without_the_view(self):
        """Posledná poistka: priamy ORM zápis obíde view, model nie."""
        reply = FeedPostComment.objects.create(
            post=self.post,
            author=self.replier,
            text="Odpoved",
            parent_comment=self.parent,
        )

        with self.assertRaises(ValidationError) as exc:
            FeedPostComment.objects.create(
                post=self.post,
                author=self.replier,
                text="Hlbsie",
                parent_comment=reply,
            )
        self.assertEqual(exc.exception.code, "reply_depth_exceeded")

    # --- zoznam ----------------------------------------------------------

    def test_replies_are_nested_under_their_parent(self):
        self._reply(text="Prva odpoved")
        self._reply(text="Druha odpoved")
        FeedPostComment.objects.create(
            post=self.post, author=self.commenter, text="Druhy hlavny"
        )

        response = self.client.get(self.url)

        results = response.data["results"]
        # Zoznam nesie LEN vrcholové komentáre.
        self.assertEqual([item["text"] for item in results],
                         ["Hlavny komentar", "Druhy hlavny"])
        self.assertEqual(
            [reply["text"] for reply in results[0]["replies"]],
            ["Prva odpoved", "Druha odpoved"],
        )
        self.assertEqual(results[1]["replies"], [])

    def test_reply_payload_has_no_replies_field(self):
        self._reply()

        response = self.client.get(self.url)

        reply = response.data["results"][0]["replies"][0]
        self.assertNotIn("replies", reply)
        self.assertEqual(reply["parent_comment_id"], self.parent.id)

    def test_count_includes_replies(self):
        self._reply()
        self._reply(text="Dalsia")

        response = self.client.get(self.url)

        # Číslo pri ikone musí sedieť s `comments_count` na karte, ktorý
        # počíta všetky komentáre vrátane odpovedí.
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(len(response.data["results"]), 1)

    def test_post_author_can_delete_a_reply(self):
        reply_id = self._reply().data["id"]
        self.client.force_authenticate(user=self.post_author)

        response = self.client.delete(
            reverse(
                "accounts:feed_post_comment_delete", args=[self.post.id, reply_id]
            )
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_deleting_the_parent_removes_its_replies(self):
        reply_id = self._reply().data["id"]

        self.parent.delete()

        self.assertFalse(FeedPostComment.objects.filter(pk=reply_id).exists())

    def test_likes_work_on_replies_exactly_as_on_comments(self):
        reply_id = self._reply().data["id"]
        self.client.force_authenticate(user=self.post_author)

        response = self.client.post(
            reverse(
                "accounts:feed_post_comment_like", args=[self.post.id, reply_id]
            )
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["likes_count"], 1)
        self.assertTrue(FeedPostCommentLike.objects.filter(comment_id=reply_id).exists())

    # --- notifikácia -----------------------------------------------------

    def test_reply_notifies_the_parent_comment_author(self):
        with self.captureOnCommitCallbacks(execute=True):
            response = self._reply()
        reply_id = response.data["id"]

        notification = Notification.objects.filter(
            type=NotificationType.FEED_POST_COMMENT_REPLIED
        ).first()
        self.assertIsNotNone(notification)
        self.assertEqual(notification.user_id, self.commenter.id)
        self.assertEqual(notification.data["comment_id"], reply_id)
        self.assertEqual(notification.data["post_id"], self.post.id)

        # Autor príspevku o odpovedi pod cudzím komentárom notifikáciu nedostane.
        self.assertFalse(
            Notification.objects.filter(
                user=self.post_author,
                type=NotificationType.FEED_POST_COMMENT_REPLIED,
            ).exists()
        )
        # A ani „komentár k príspevku" – odpoveď je iná udalosť.
        self.assertFalse(
            Notification.objects.filter(
                type=NotificationType.FEED_POST_COMMENTED
            ).exists()
        )

    def test_self_reply_creates_no_notification(self):
        before = Notification.objects.count()

        with self.captureOnCommitCallbacks(execute=True):
            self._reply(user=self.commenter)

        self.assertEqual(Notification.objects.count(), before)

    def test_reply_notification_targets_the_reply_itself(self):
        with self.captureOnCommitCallbacks(execute=True):
            reply_id = self._reply().data["id"]

        self.client.force_authenticate(user=self.commenter)
        listed = self.client.get(reverse("accounts:notifications_list"))
        results = listed.data
        if isinstance(results, dict):
            results = results.get("results", [])
        payload = next(
            item
            for item in results
            if item["type"] == NotificationType.FEED_POST_COMMENT_REPLIED
        )

        # Ten istý tvar ako pri komentári – FE scroll-to-comment funguje bez
        # ďalšej práce aj pre odpoveď.
        self.assertEqual(
            payload["target_url"],
            f"/dashboard/feed/{self.post.id}?comment={reply_id}",
        )

    def test_plain_comment_still_notifies_the_post_author(self):
        self.client.force_authenticate(user=self.replier)

        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self.url, {"text": "Bezny komentar"}, format="json")

        self.assertTrue(
            Notification.objects.filter(
                user=self.post_author, type=NotificationType.FEED_POST_COMMENTED
            ).exists()
        )
