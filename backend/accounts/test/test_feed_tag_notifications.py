"""Feed – notifikácie pri označení používateľa v príspevku (feed_post_tagged)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import FeedPost, FeedPostTag, Notification, NotificationType
from accounts.notification_serializers import NotificationSerializer
from accounts.services.feed_tagging import apply_feed_post_tags
from accounts.services.notifications import NOTIFICATION_RETENTION_DAYS

User = get_user_model()


def _user(name, *, is_public=True):
    return User.objects.create_user(
        username=name, email=f"{name}@example.com", password="StrongPass123",
        is_public=is_public,
    )


def _post(author, caption="Ahoj feed!"):
    return FeedPost.objects.create(
        author=author, post_type=FeedPost.PostType.FREE_POST, caption=caption
    )


def _tag_notifications(user=None):
    qs = Notification.objects.filter(type=NotificationType.FEED_POST_TAGGED)
    return qs.filter(user=user) if user is not None else qs


class FeedPostTagNotificationTests(TestCase):
    def setUp(self):
        self.author = _user("feed-tagnotif-author")
        self.tagged = _user("feed-tagnotif-tagged")
        self.post = _post(self.author)

    def test_tagging_creates_notification_for_tagged_user(self):
        with self.captureOnCommitCallbacks(execute=True):
            apply_feed_post_tags(self.post, [self.tagged.id])

        notification = _tag_notifications(self.tagged).get()
        self.assertEqual(notification.actor_id, self.author.id)
        self.assertEqual(notification.data["post_id"], self.post.id)
        self.assertIn("označil", notification.body)

    def test_notification_target_url_points_to_post_permalink(self):
        with self.captureOnCommitCallbacks(execute=True):
            apply_feed_post_tags(self.post, [self.tagged.id])

        notification = _tag_notifications(self.tagged).get()
        data = NotificationSerializer(notification).data

        self.assertEqual(data["target_url"], f"/dashboard/feed/{self.post.id}")

    def test_self_tag_creates_no_notification(self):
        # Autor označí sám seba – v appke povolené, notifikácia nie.
        with self.captureOnCommitCallbacks(execute=True):
            apply_feed_post_tags(self.post, [self.author.id])

        self.assertEqual(FeedPostTag.objects.count(), 1)
        self.assertEqual(Notification.objects.count(), 0)

    def test_each_tagged_user_gets_own_notification(self):
        second = _user("feed-tagnotif-second")
        third = _user("feed-tagnotif-third")

        with self.captureOnCommitCallbacks(execute=True):
            apply_feed_post_tags(
                self.post, [self.tagged.id, second.id, third.id]
            )

        # Tri samostatné notifikácie, nie jedna spoločná.
        self.assertEqual(_tag_notifications().count(), 3)
        self.assertEqual(
            set(_tag_notifications().values_list("user_id", flat=True)),
            {self.tagged.id, second.id, third.id},
        )

    def test_self_tag_alongside_others_notifies_only_others(self):
        with self.captureOnCommitCallbacks(execute=True):
            apply_feed_post_tags(self.post, [self.author.id, self.tagged.id])

        self.assertEqual(FeedPostTag.objects.count(), 2)
        self.assertEqual(
            list(_tag_notifications().values_list("user_id", flat=True)),
            [self.tagged.id],
        )

    def test_repeated_tagging_creates_no_duplicate_notification(self):
        """Jeden tag = jedna notifikácia; opakované volanie tag preskočí."""
        with self.captureOnCommitCallbacks(execute=True):
            apply_feed_post_tags(self.post, [self.tagged.id])
            apply_feed_post_tags(self.post, [self.tagged.id])

        self.assertEqual(FeedPostTag.objects.count(), 1)
        self.assertEqual(_tag_notifications(self.tagged).count(), 1)

    def test_no_notification_when_transaction_rolls_back(self):
        from django.core.exceptions import ValidationError
        from django.db import transaction

        with self.captureOnCommitCallbacks(execute=True):
            try:
                with transaction.atomic():
                    apply_feed_post_tags(self.post, [self.tagged.id])
                    raise ValidationError("nieco zlyhalo neskor")
            except ValidationError:
                pass

        # on_commit sa pri rollbacku zahodí – žiadna notifikácia na neexistujúci tag.
        self.assertEqual(FeedPostTag.objects.count(), 0)
        self.assertEqual(Notification.objects.count(), 0)

    def test_retention_is_registered_for_purge_cycle(self):
        self.assertEqual(
            NOTIFICATION_RETENTION_DAYS[NotificationType.FEED_POST_TAGGED], 30
        )

    def test_notification_is_purged_after_retention_window(self):
        from datetime import timedelta

        from django.utils import timezone

        from accounts.services.notifications import purge_old_notifications

        with self.captureOnCommitCallbacks(execute=True):
            apply_feed_post_tags(self.post, [self.tagged.id])
        notification = _tag_notifications(self.tagged).get()
        Notification.objects.filter(pk=notification.pk).update(
            created_at=timezone.now() - timedelta(days=31)
        )

        purge_old_notifications(dry_run=False)

        self.assertEqual(_tag_notifications(self.tagged).count(), 0)


class FeedPostTagNotificationLifecycleTests(TestCase):
    """Zánik označeného/aktéra nesmie kolidovať s notifikáciou."""

    def test_anonymizing_tagged_user_removes_their_notification(self):
        from accounts.account_deletion import anonymize_user

        author = _user("feed-tagcycle-author")
        tagged = _user("feed-tagcycle-tagged")
        post = _post(author)
        with self.captureOnCommitCallbacks(execute=True):
            apply_feed_post_tags(post, [tagged.id])

        anonymize_user(tagged)

        # Notifikácie príjemcu zanikajú s jeho účtom; tag tiež (Fáza 1).
        self.assertEqual(_tag_notifications(tagged).count(), 0)
        self.assertEqual(FeedPostTag.objects.filter(tagged_user=tagged).count(), 0)
        # Príspevok patrí niekomu inému – ostáva.
        self.assertTrue(FeedPost.objects.filter(id=post.id).exists())

    def test_anonymizing_actor_scrubs_notification_of_tagged_user(self):
        from accounts.account_deletion import anonymize_user

        author = _user("feed-tagcycle2-author")
        tagged = _user("feed-tagcycle2-tagged")
        post = _post(author)
        with self.captureOnCommitCallbacks(execute=True):
            apply_feed_post_tags(post, [tagged.id])

        anonymize_user(author)

        # Notifikácia patrí označenému, takže sa nemaže – ale PII aktéra sa
        # scrubne na neutrálny text (rovnaký vzor ako iné feed notifikácie).
        notification = _tag_notifications(tagged).get()
        self.assertEqual(notification.title, "Zmazaný používateľ")
        self.assertEqual(notification.body, "Zmazaný používateľ")


class FeedPostTagNotificationApiTests(APITestCase):
    """Notifikácia vzniká aj cez reálne vytvorenie príspevku cez API."""

    def test_creating_post_with_tags_notifies_tagged_users(self):
        author = _user("feed-tagapi-author")
        tagged = _user("feed-tagapi-tagged")
        self.client.force_authenticate(user=author)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse("accounts:feed_posts"),
                data={
                    "post_type": "free_post",
                    "caption": "S označením",
                    "tagged_user_ids": [tagged.id],
                },
                format="json",
            )

        self.assertEqual(response.status_code, 201)
        notification = _tag_notifications(tagged).get()
        self.assertEqual(notification.data["post_id"], response.data["id"])

    def test_failed_post_creation_sends_no_tag_notification(self):
        from accounts.models import UserBlock

        author = _user("feed-tagapi2-author")
        tagged = _user("feed-tagapi2-tagged")
        blocked = _user("feed-tagapi2-blocked")
        UserBlock.objects.create(blocker=blocked, blocked_user=author)
        self.client.force_authenticate(user=author)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse("accounts:feed_posts"),
                data={
                    "post_type": "free_post",
                    "caption": "S označením",
                    "tagged_user_ids": [tagged.id, blocked.id],
                },
                format="json",
            )

        self.assertEqual(response.status_code, 400)
        # Celé vytvorenie sa rollbackne → nikto nedostane notifikáciu.
        self.assertEqual(Notification.objects.count(), 0)
        self.assertEqual(FeedPost.objects.count(), 0)
