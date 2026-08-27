"""Feed Fáza 2b – API testy interakcií: lajk, komentáre, nahlásenie."""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import (
    FeedPost,
    FeedPostComment,
    FeedPostLike,
    FeedPostReport,
    Notification,
    NotificationType,
    UserBlock,
)

User = get_user_model()


def _user(name, *, is_public=True):
    return User.objects.create_user(
        username=name, email=f"{name}@example.com", password="StrongPass123",
        is_public=is_public,
    )


def _free_post(author, caption="Ahoj feed!"):
    return FeedPost.objects.create(
        author=author, post_type=FeedPost.PostType.FREE_POST, caption=caption
    )


class FeedPostLikeApiTests(APITestCase):
    def setUp(self):
        self.author = _user("feed-like-author")
        self.liker = _user("feed-like-liker")
        self.post = _free_post(self.author)

    def _url(self, post=None):
        return reverse("accounts:feed_post_like", args=[(post or self.post).id])

    def test_like_creates_row_and_returns_payload(self):
        self.client.force_authenticate(user=self.liker)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self._url())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data,
            {"post_id": self.post.id, "is_liked_by_me": True, "likes_count": 1},
        )
        self.assertEqual(FeedPostLike.objects.count(), 1)

    def test_duplicate_like_is_idempotent(self):
        self.client.force_authenticate(user=self.liker)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self._url())
            response = self.client.post(self._url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(FeedPostLike.objects.count(), 1)
        self.assertEqual(response.data["likes_count"], 1)

    def test_unlike_removes_row(self):
        FeedPostLike.objects.create(post=self.post, user=self.liker)
        self.client.force_authenticate(user=self.liker)

        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {"post_id": self.post.id, "is_liked_by_me": False, "likes_count": 0},
        )
        self.assertEqual(FeedPostLike.objects.count(), 0)

    def test_self_like_is_allowed(self):
        self.client.force_authenticate(user=self.author)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(self._url())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_like_invisible_post_returns_404(self):
        private_author = _user("feed-like-private", is_public=False)
        hidden_post = _free_post(private_author)
        self.client.force_authenticate(user=self.liker)
        self.assertEqual(
            self.client.post(self._url(hidden_post)).status_code,
            status.HTTP_404_NOT_FOUND,
        )

        blocked_author = _user("feed-like-blocker")
        blocked_post = _free_post(blocked_author)
        UserBlock.objects.create(blocker=blocked_author, blocked_user=self.liker)
        self.assertEqual(
            self.client.post(self._url(blocked_post)).status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_like_requires_authentication(self):
        self.assertEqual(
            self.client.post(self._url()).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )


class FeedPostLikeNotificationTests(APITestCase):
    def setUp(self):
        self.author = _user("feed-liknotif-author")
        self.liker = _user("feed-liknotif-liker")
        self.post = _free_post(self.author)
        self.url = reverse("accounts:feed_post_like", args=[self.post.id])

    def _notifications(self):
        return Notification.objects.filter(
            user=self.author, type=NotificationType.FEED_POST_LIKED
        )

    def test_like_creates_notification_once(self):
        self.client.force_authenticate(user=self.liker)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self.url)

        self.assertEqual(self._notifications().count(), 1)
        notification = self._notifications().get()
        self.assertEqual(notification.actor_id, self.liker.id)
        self.assertEqual(notification.data["post_id"], self.post.id)

    def test_self_like_creates_no_notification(self):
        self.client.force_authenticate(user=self.author)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self.url)
        self.assertEqual(Notification.objects.count(), 0)

    def test_unlike_and_relike_does_not_duplicate_notification(self):
        self.client.force_authenticate(user=self.liker)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self.url)
            self.client.delete(self.url)
            self.client.post(self.url)

        # Dedup cez data__post_id + actor – autor nedostane spam z unlike+like.
        self.assertEqual(self._notifications().count(), 1)


class FeedPostCommentsApiTests(APITestCase):
    def setUp(self):
        self.author = _user("feed-comm-author")
        self.commenter = _user("feed-comm-commenter")
        self.post = _free_post(self.author)

    def _url(self, post=None):
        return reverse("accounts:feed_post_comments", args=[(post or self.post).id])

    def _delete_url(self, comment):
        return reverse(
            "accounts:feed_post_comment_detail",
            args=[comment.post_id, comment.id],
        )

    def test_create_comment(self):
        self.client.force_authenticate(user=self.commenter)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                self._url(), data={"text": "Super príspevok!"}, format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["text"], "Super príspevok!")
        self.assertEqual(response.data["author"]["id"], self.commenter.id)
        self.assertTrue(response.data["can_delete"])
        self.assertEqual(FeedPostComment.objects.count(), 1)

    def test_create_comment_requires_text(self):
        self.client.force_authenticate(user=self.commenter)
        response = self.client.post(self._url(), data={"text": "  "}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "text_required")

    def test_create_comment_enforces_500_char_limit(self):
        self.client.force_authenticate(user=self.commenter)
        response = self.client.post(
            self._url(), data={"text": "x" * 501}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "max_length")
        self.assertEqual(FeedPostComment.objects.count(), 0)

    def test_create_comment_accepts_exactly_500_chars(self):
        # Hranica musí PREJSŤ – limit je „najviac 500", nie „menej ako 500".
        self.client.force_authenticate(user=self.commenter)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                self._url(), data={"text": "x" * 500}, format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["text"]), 500)
        self.assertEqual(FeedPostComment.objects.count(), 1)

    def test_create_comment_requires_authentication(self):
        response = self.client.post(self._url(), data={"text": "X"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_comment_on_invisible_post_returns_404(self):
        private_author = _user("feed-comm-private", is_public=False)
        hidden_post = _free_post(private_author)
        self.client.force_authenticate(user=self.commenter)
        response = self.client.post(
            self._url(hidden_post), data={"text": "X"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_comment_on_post_of_blocking_author_returns_404(self):
        blocked_author = _user("feed-comm-blocker")
        blocked_post = _free_post(blocked_author)
        UserBlock.objects.create(blocker=blocked_author, blocked_user=self.commenter)
        self.client.force_authenticate(user=self.commenter)

        response = self.client.post(
            self._url(blocked_post), data={"text": "X"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(FeedPostComment.objects.count(), 0)

    def test_list_comments_chronologically_with_cursor(self):
        for index in range(3):
            FeedPostComment.objects.create(
                post=self.post, author=self.commenter, text=f"Komentár {index}"
            )

        first_page = self.client.get(self._url(), {"page_size": 2})

        self.assertEqual(first_page.status_code, status.HTTP_200_OK)
        texts = [item["text"] for item in first_page.data["results"]]
        self.assertEqual(texts, ["Komentár 0", "Komentár 1"])  # najstarší prvý
        # Anonym: can_delete False, autor payload prítomný.
        self.assertFalse(first_page.data["results"][0]["can_delete"])

        second_page = self.client.get(first_page.data["next"])
        self.assertEqual(
            [item["text"] for item in second_page.data["results"]], ["Komentár 2"]
        )

    def test_delete_own_comment(self):
        comment = FeedPostComment.objects.create(
            post=self.post, author=self.commenter, text="Môj komentár"
        )
        self.client.force_authenticate(user=self.commenter)

        response = self.client.delete(self._delete_url(comment))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(FeedPostComment.objects.count(), 0)

    def test_post_author_can_delete_foreign_comment(self):
        # Moderácia vlastnej nástenky – autor príspevku maže cudzí komentár.
        comment = FeedPostComment.objects.create(
            post=self.post, author=self.commenter, text="Nevhodný komentár"
        )
        self.client.force_authenticate(user=self.author)

        response = self.client.delete(self._delete_url(comment))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(FeedPostComment.objects.count(), 0)

    def test_third_user_cannot_delete_comment(self):
        comment = FeedPostComment.objects.create(
            post=self.post, author=self.commenter, text="Cudzí komentár"
        )
        third = _user("feed-comm-third")
        self.client.force_authenticate(user=third)

        response = self.client.delete(self._delete_url(comment))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(FeedPostComment.objects.count(), 1)

    def test_delete_comment_wrong_post_returns_404(self):
        other_post = _free_post(self.author, caption="Iný post")
        comment = FeedPostComment.objects.create(
            post=self.post, author=self.commenter, text="Komentár"
        )
        self.client.force_authenticate(user=self.commenter)

        response = self.client.delete(
            reverse(
                "accounts:feed_post_comment_detail",
                args=[other_post.id, comment.id],
            )
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class FeedPostCommentNotificationTests(APITestCase):
    def setUp(self):
        self.author = _user("feed-commnotif-author")
        self.commenter = _user("feed-commnotif-commenter")
        self.post = _free_post(self.author)
        self.url = reverse("accounts:feed_post_comments", args=[self.post.id])

    def _notifications(self):
        return Notification.objects.filter(
            user=self.author, type=NotificationType.FEED_POST_COMMENTED
        )

    def test_every_comment_creates_notification_without_dedup(self):
        self.client.force_authenticate(user=self.commenter)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self.url, data={"text": "Prvý"}, format="json")
            self.client.post(self.url, data={"text": "Druhý"}, format="json")

        # Každý komentár nesie nový obsah → žiadny dedup (na rozdiel od lajku).
        self.assertEqual(self._notifications().count(), 2)

    def test_self_comment_creates_no_notification(self):
        self.client.force_authenticate(user=self.author)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(self.url, data={"text": "Môj vlastný"}, format="json")
        self.assertEqual(Notification.objects.count(), 0)


class FeedPostReportApiTests(APITestCase):
    def setUp(self):
        self.author = _user("feed-report-author")
        self.reporter = _user("feed-report-reporter")
        self.post = _free_post(self.author)

    def _url(self, post=None):
        return reverse("accounts:feed_post_report", args=[(post or self.post).id])

    def test_report_creates_row(self):
        self.client.force_authenticate(user=self.reporter)
        response = self.client.post(
            self._url(),
            data={"reason": "spam", "description": "Reklamný obsah"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report = FeedPostReport.objects.get()
        self.assertEqual(report.post_id, self.post.id)
        self.assertEqual(report.reported_by_id, self.reporter.id)
        self.assertFalse(report.is_resolved)

    def test_duplicate_report_returns_friendly_400(self):
        FeedPostReport.objects.create(
            post=self.post, reported_by=self.reporter, reason="spam"
        )
        self.client.force_authenticate(user=self.reporter)

        response = self.client.post(
            self._url(), data={"reason": "spam znova"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("uz nahlasil", response.data["error"])
        self.assertEqual(FeedPostReport.objects.count(), 1)

    def test_report_with_other_reason_requires_description(self):
        """Dôvod „iné" bez popisu nenesie moderátorovi žiadnu informáciu."""
        self.client.force_authenticate(user=self.reporter)

        response = self.client.post(
            self._url(), data={"reason": "other", "description": "   "}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "description_required")
        self.assertEqual(FeedPostReport.objects.count(), 0)

    def test_report_with_other_reason_and_description_succeeds(self):
        self.client.force_authenticate(user=self.reporter)

        response = self.client.post(
            self._url(),
            data={"reason": "other", "description": "Podvodná ponuka"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FeedPostReport.objects.get().description, "Podvodná ponuka")

    def test_other_reasons_do_not_require_description(self):
        self.client.force_authenticate(user=self.reporter)

        response = self.client.post(
            self._url(), data={"reason": "spam"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_report_requires_reason(self):
        self.client.force_authenticate(user=self.reporter)
        response = self.client.post(self._url(), data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_report_invisible_post_returns_404(self):
        private_author = _user("feed-report-private", is_public=False)
        hidden_post = _free_post(private_author)
        self.client.force_authenticate(user=self.reporter)
        response = self.client.post(
            self._url(hidden_post), data={"reason": "spam"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_report_post_of_blocking_author_returns_404(self):
        blocked_author = _user("feed-report-blocker")
        blocked_post = _free_post(blocked_author)
        UserBlock.objects.create(blocker=blocked_author, blocked_user=self.reporter)
        self.client.force_authenticate(user=self.reporter)

        response = self.client.post(
            self._url(blocked_post), data={"reason": "spam"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(FeedPostReport.objects.count(), 0)

    def test_report_creates_no_notification(self):
        self.client.force_authenticate(user=self.reporter)
        self.client.post(self._url(), data={"reason": "spam"}, format="json")
        self.assertEqual(Notification.objects.count(), 0)


class FeedInteractionsAccountDeletionTests(APITestCase):
    """Konzistencia s existujúcim GDPR flow (rozhodnutia z Fázy 1)."""

    def test_deleted_user_interactions_and_notifications_are_cleaned(self):
        from accounts.account_deletion import anonymize_user

        author = _user("feed-del-author")
        actor = _user("feed-del-actor")
        post = _free_post(author)

        # Interakcie + notifikácie cez skutočné API volania.
        self.client.force_authenticate(user=actor)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(reverse("accounts:feed_post_like", args=[post.id]))
            self.client.post(
                reverse("accounts:feed_post_comments", args=[post.id]),
                data={"text": "Komentár pred zmazaním"},
                format="json",
            )
        report = FeedPostReport.objects.create(
            post=post, reported_by=actor, reason="spam"
        )

        anonymize_user(actor)

        # Aktérov obsah preč (konvencia Fázy 1)…
        self.assertFalse(FeedPostLike.objects.filter(user=actor).exists())
        self.assertFalse(FeedPostComment.objects.filter(author=actor).exists())
        # …nahlásenie ostáva (moderačný audit), autorove notifikácie od aktéra
        # sú scrubnuté na neutrálny text (nie zmazané – patria autorovi).
        self.assertTrue(FeedPostReport.objects.filter(id=report.id).exists())
        for notification in Notification.objects.filter(user=author):
            self.assertEqual(notification.title, "Zmazaný používateľ")

    def test_author_deletion_removes_notifications_actor_received(self):
        from accounts.account_deletion import anonymize_user

        author = _user("feed-del2-author")
        actor = _user("feed-del2-actor")
        post = _free_post(author)

        self.client.force_authenticate(user=actor)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(reverse("accounts:feed_post_like", args=[post.id]))

        anonymize_user(author)

        # Autorove notifikácie zanikli s účtom, jeho príspevky tiež (CASCADE
        # cez purge) – lajky/komentáre na nich zanikajú s príspevkom.
        self.assertFalse(Notification.objects.filter(user=author).exists())
        self.assertFalse(FeedPost.objects.filter(id=post.id).exists())
        self.assertFalse(FeedPostLike.objects.filter(post_id=post.id).exists())


class FeedCommentNotificationTargetTests(APITestCase):
    """Notifikácia o komentári musí doviesť ku KONKRÉTNEMU komentáru."""

    def setUp(self):
        self.author = _user("notif-target-author")
        self.commenter = _user("notif-target-commenter")
        self.post = _free_post(self.author)

    def _notification_payload(self, notification):
        """Nájde notifikáciu v odpovedi zoznamu.

        Endpoint vracia raz stránkovaný objekt s ``results``, inokedy priamy
        zoznam (podľa nastavenia stránkovania) – test sa nesmie viazať na
        jeden z tvarov.
        """
        listed = self.client.get(reverse("accounts:notifications_list"))
        results = listed.data
        if isinstance(results, dict):
            results = results.get("results", [])
        return next(item for item in results if item["id"] == notification.id)

    def test_notification_carries_comment_id_and_targets_it(self):
        self.client.force_authenticate(user=self.commenter)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse("accounts:feed_post_comments", args=[self.post.id]),
                {"text": "Ahoj"},
                format="json",
            )
        comment_id = response.data["id"]

        notification = Notification.objects.filter(
            user=self.author, type=NotificationType.FEED_POST_COMMENTED
        ).first()
        self.assertIsNotNone(notification)
        self.assertEqual(notification.data["comment_id"], comment_id)

        self.client.force_authenticate(user=self.author)
        payload = self._notification_payload(notification)
        self.assertEqual(
            payload["target_url"],
            f"/dashboard/feed/{self.post.id}?comment={comment_id}",
        )

    def test_other_feed_notifications_keep_the_plain_permalink(self):
        """Bez comment_id sa cieľ nemení – lajk vedie na príspevok ako doteraz."""
        self.client.force_authenticate(user=self.commenter)
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post(reverse("accounts:feed_post_like", args=[self.post.id]))

        notification = Notification.objects.filter(
            user=self.author, type=NotificationType.FEED_POST_LIKED
        ).first()
        self.client.force_authenticate(user=self.author)
        payload = self._notification_payload(notification)
        self.assertEqual(payload["target_url"], f"/dashboard/feed/{self.post.id}")
