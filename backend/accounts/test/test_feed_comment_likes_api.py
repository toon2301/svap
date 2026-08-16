"""Lajk komentára – endpoint, viditeľnosť, notifikácie, GDPR mazanie.

Šiesty Like model appky; testy sledujú rovnaké scenáre ako
``test_feed_interactions_api`` pre lajk príspevku.
"""

from django.contrib.auth import get_user_model
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


def _user(name, *, is_public=True):
    return User.objects.create_user(
        username=name,
        email=f"{name}@example.com",
        password="StrongPass123",
        is_public=is_public,
    )


class FeedCommentLikeApiTests(APITestCase):
    def setUp(self):
        self.author = _user("fcl-author")
        self.commenter = _user("fcl-commenter")
        self.liker = _user("fcl-liker")
        self.post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Príspevok",
        )
        self.comment = FeedPostComment.objects.create(
            post=self.post, author=self.commenter, text="Komentár"
        )
        self.url = reverse(
            "accounts:feed_post_comment_like",
            args=[self.post.id, self.comment.id],
        )

    def test_like_and_unlike(self):
        self.client.force_authenticate(user=self.liker)

        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data,
            {"comment_id": self.comment.id, "is_liked_by_me": True, "likes_count": 1},
        )

        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {"comment_id": self.comment.id, "is_liked_by_me": False, "likes_count": 0},
        )
        self.assertEqual(FeedPostCommentLike.objects.count(), 0)

    def test_repeated_like_is_idempotent(self):
        self.client.force_authenticate(user=self.liker)

        first = self.client.post(self.url)
        second = self.client.post(self.url)

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        # Druhý lajk už nič nevytvára → 200, nie 201.
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data["likes_count"], 1)
        self.assertEqual(FeedPostCommentLike.objects.count(), 1)

    def test_self_like_is_allowed(self):
        """Rovnaké rozhodnutie ako FeedPostLike – komentár je obsah."""
        self.client.force_authenticate(user=self.commenter)

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            FeedPostCommentLike.objects.filter(
                comment=self.comment, user=self.commenter
            ).exists()
        )

    def test_unlike_without_like_is_noop(self):
        self.client.force_authenticate(user=self.liker)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["likes_count"], 0)

    def test_anonymous_is_rejected(self):
        response = self.client.post(self.url)

        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self.assertEqual(FeedPostCommentLike.objects.count(), 0)

    def test_like_on_invisible_post_returns_404(self):
        """Súkromný autor príspevku → komentár nie je dosiahnuteľný."""
        self.author.is_public = False
        self.author.save(update_fields=["is_public"])
        self.client.force_authenticate(user=self.liker)

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(FeedPostCommentLike.objects.count(), 0)

    def test_comment_from_another_post_returns_404(self):
        """comment_id sa musí viazať na post_id z URL, nie hocijaký komentár."""
        other_post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Iný",
        )
        url = reverse(
            "accounts:feed_post_comment_like",
            args=[other_post.id, self.comment.id],
        )
        self.client.force_authenticate(user=self.liker)

        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(FeedPostCommentLike.objects.count(), 0)


class FeedCommentLikeBlockingTests(APITestCase):
    """Blokovanie medzi LAJKUJÚCIM a AUTOROM KOMENTÁRA.

    Viditeľnosť príspevku tento pár nepokrýva: príspevok patrí tretej strane,
    voči ktorej blok neexistuje, takže `visible_feed_posts` ho prepustí.
    """

    def setUp(self):
        self.owner = _user("fclb-owner")       # tretia strana, verejný príspevok
        self.commenter = _user("fclb-commenter")
        self.liker = _user("fclb-liker")
        self.post = FeedPost.objects.create(
            author=self.owner,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Verejný príspevok",
        )
        self.comment = FeedPostComment.objects.create(
            post=self.post, author=self.commenter, text="Komentár"
        )
        self.url = reverse(
            "accounts:feed_post_comment_like",
            args=[self.post.id, self.comment.id],
        )

    def _block(self, blocker, blocked):
        from accounts.services.user_blocks import create_user_block

        create_user_block(blocker=blocker, blocked_user=blocked)

    def test_liker_blocked_by_comment_author_is_rejected(self):
        self._block(self.commenter, self.liker)
        self.client.force_authenticate(user=self.liker)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(FeedPostCommentLike.objects.count(), 0)
        self.assertEqual(
            Notification.objects.filter(
                type=NotificationType.FEED_POST_COMMENT_LIKED
            ).count(),
            0,
        )

    def test_liker_who_blocked_the_comment_author_is_rejected(self):
        """Blok platí obojsmerne – rovnako ako pri ostatných interakciách."""
        self._block(self.liker, self.commenter)
        self.client.force_authenticate(user=self.liker)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(FeedPostCommentLike.objects.count(), 0)

    def test_unrelated_block_does_not_affect_liking(self):
        """Blok voči NIEKOMU INÉMU lajk komentára blokovať nesmie."""
        stranger = _user("fclb-stranger")
        self._block(self.liker, stranger)
        self.client.force_authenticate(user=self.liker)

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FeedPostCommentLike.objects.count(), 1)


class FeedCommentLikeSerializationTests(APITestCase):
    def setUp(self):
        self.author = _user("fcls-author")
        self.liker = _user("fcls-liker")
        self.post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Príspevok",
        )
        self.comment = FeedPostComment.objects.create(
            post=self.post, author=self.author, text="Komentár"
        )
        FeedPostCommentLike.objects.create(comment=self.comment, user=self.liker)
        self.url = reverse("accounts:feed_post_comments", args=[self.post.id])

    def test_liker_sees_own_like(self):
        self.client.force_authenticate(user=self.liker)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data["results"][0]
        self.assertEqual(payload["likes_count"], 1)
        self.assertTrue(payload["is_liked_by_me"])

    def test_other_user_sees_count_but_not_own_like(self):
        other = _user("fcls-other")
        self.client.force_authenticate(user=other)

        response = self.client.get(self.url)

        payload = response.data["results"][0]
        self.assertEqual(payload["likes_count"], 1)
        self.assertFalse(payload["is_liked_by_me"])

    def test_anonymous_sees_count_and_false_flag(self):
        """Anonym-guard: počet áno, osobný príznak vždy False."""
        response = self.client.get(self.url)

        payload = response.data["results"][0]
        self.assertEqual(payload["likes_count"], 1)
        self.assertFalse(payload["is_liked_by_me"])

    def test_new_comment_serializes_zero_likes(self):
        """Čerstvo vytvorený komentár nemá anotáciu – fallback musí dať 0."""
        self.client.force_authenticate(user=self.liker)

        response = self.client.post(self.url, data={"text": "Nový"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["likes_count"], 0)
        self.assertFalse(response.data["is_liked_by_me"])


class FeedCommentLikeNotificationTests(APITestCase):
    def setUp(self):
        self.author = _user("fcln-author")
        self.commenter = _user("fcln-commenter")
        self.liker = _user("fcln-liker")
        self.post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Príspevok",
        )
        self.comment = FeedPostComment.objects.create(
            post=self.post, author=self.commenter, text="Komentár"
        )
        self.url = reverse(
            "accounts:feed_post_comment_like",
            args=[self.post.id, self.comment.id],
        )

    def _notifications(self):
        return Notification.objects.filter(
            type=NotificationType.FEED_POST_COMMENT_LIKED
        )

    def test_like_notifies_comment_author(self):
        self.client.force_authenticate(user=self.liker)

        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self.url)

        notification = self._notifications().get()
        # Príjemca je autor KOMENTÁRA, nie autor príspevku.
        self.assertEqual(notification.user_id, self.commenter.id)
        self.assertEqual(notification.actor_id, self.liker.id)
        self.assertEqual(notification.data["post_id"], self.post.id)
        self.assertEqual(notification.data["comment_id"], self.comment.id)

    def test_self_like_creates_no_notification(self):
        self.client.force_authenticate(user=self.commenter)

        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self.url)

        self.assertEqual(self._notifications().count(), 0)

    def test_relike_does_not_duplicate_notification(self):
        """Dedup: unlike + like nesmie autora komentára spamovať."""
        self.client.force_authenticate(user=self.liker)

        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self.url)
        self.client.delete(self.url)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self.url)

        self.assertEqual(self._notifications().count(), 1)

    def test_second_liker_gets_own_notification(self):
        """Dedup je per aktér – iný používateľ notifikáciu dostane."""
        other = _user("fcln-other")
        self.client.force_authenticate(user=self.liker)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self.url)
        self.client.force_authenticate(user=other)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self.url)

        self.assertEqual(self._notifications().count(), 2)

    def test_target_url_points_to_post_permalink(self):
        self.client.force_authenticate(user=self.liker)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self.url)

        self.client.force_authenticate(user=self.commenter)
        response = self.client.get(reverse("accounts:notifications_list"))

        results = response.data
        if isinstance(results, dict):
            results = results.get("results", [])
        payload = next(
            item
            for item in results
            if item["type"] == NotificationType.FEED_POST_COMMENT_LIKED
        )
        # Notifikácia nesie aj `comment_id`, takže cieľ vedie priamo k
        # lajknutému komentáru – FE naň doscrolluje a krátko ho zvýrazní.
        # Predtým smerovala len na príspevok a používateľ si komentár musel
        # nájsť sám.
        self.assertEqual(
            payload["target_url"],
            f"/dashboard/feed/{self.post.id}?comment={self.comment.id}",
        )


class FeedCommentLikeAccountDeletionTests(APITestCase):
    """GDPR: User riadok sa len anonymizuje, takže CASCADE cez `user`
    nevystrelí – lajky sa musia mazať explicitne, ako pri FeedPostLike."""

    def test_deleting_account_removes_likes_under_foreign_comments(self):
        from accounts.account_deletion import anonymize_user

        owner = _user("fcld-owner")
        leaver = _user("fcld-leaver")
        post = FeedPost.objects.create(
            author=owner,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Príspevok",
        )
        foreign_comment = FeedPostComment.objects.create(
            post=post, author=owner, text="Cudzí komentár"
        )
        own_comment = FeedPostComment.objects.create(
            post=post, author=leaver, text="Vlastný komentár"
        )
        FeedPostCommentLike.objects.create(comment=foreign_comment, user=leaver)
        FeedPostCommentLike.objects.create(comment=own_comment, user=owner)

        anonymize_user(leaver)

        # Lajk odchádzajúceho pod cudzím komentárom je preč…
        self.assertFalse(
            FeedPostCommentLike.objects.filter(user=leaver).exists()
        )
        # …a cudzí lajk pod JEHO komentárom zanikol s komentárom (CASCADE).
        self.assertFalse(
            FeedPostCommentLike.objects.filter(comment_id=own_comment.id).exists()
        )
        self.assertFalse(
            FeedPostComment.objects.filter(author=leaver).exists()
        )

    def test_deleting_comment_cascades_to_its_likes(self):
        owner = _user("fcld-c-owner")
        liker = _user("fcld-c-liker")
        post = FeedPost.objects.create(
            author=owner,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Príspevok",
        )
        comment = FeedPostComment.objects.create(
            post=post, author=owner, text="Komentár"
        )
        FeedPostCommentLike.objects.create(comment=comment, user=liker)

        comment.delete()

        self.assertEqual(FeedPostCommentLike.objects.count(), 0)
