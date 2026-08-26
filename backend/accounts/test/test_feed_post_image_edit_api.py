"""Úprava fotiek už publikovaného príspevku – odobratie a dodatočné pridanie.

Odobratie má vlastný endpoint; pridanie ide existujúcim upload reťazcom, takže
sa tu overuje hlavne to, že na starom príspevku funguje rovnako ako na
čerstvom (žiadne časové okno) a že správne značí príspevok ako upravený.
"""

from datetime import timedelta
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import MAX_FEED_POST_IMAGES, FeedPost, FeedPostImage

User = get_user_model()


def _user(name):
    return User.objects.create_user(
        username=name,
        email=f"{name}@example.com",
        password="StrongPass123",
        is_public=True,
    )


def _s3_mock():
    s3 = Mock()
    s3.generate_presigned_post.return_value = {
        "url": "https://upload.example",
        "fields": {"key": "value"},
    }
    s3.head_object.return_value = {
        "ContentLength": 1024,
        "ContentType": "image/jpeg",
    }
    return s3


class FeedPostImageDeleteTests(APITestCase):
    def setUp(self):
        self.author = _user("img-del-author")
        self.stranger = _user("img-del-stranger")
        self.post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Text prispevku",
        )
        self.image = self._image(order=0)

    def _image(self, **fields):
        fields.setdefault("status", FeedPostImage.Status.APPROVED)
        fields.setdefault("approved_key", "media/feed/x/large.webp")
        return FeedPostImage.objects.create(post=self.post, **fields)

    def _url(self, image=None, post=None):
        return reverse(
            "accounts:feed_post_image_delete",
            args=[(post or self.post).id, (image or self.image).id],
        )

    def test_author_removes_a_photo(self):
        second = self._image(order=1)

        self.client.force_authenticate(user=self.author)
        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(FeedPostImage.objects.filter(pk=self.image.id).exists())
        # Ostatné fotky ostávajú nedotknuté.
        self.assertTrue(FeedPostImage.objects.filter(pk=second.id).exists())

    def test_removing_a_photo_marks_the_post_edited(self):
        self._image(order=1)

        self.client.force_authenticate(user=self.author)
        self.client.delete(self._url())

        self.post.refresh_from_db()
        self.assertIsNotNone(self.post.edited_at)

    def test_last_photo_can_go_when_the_post_has_text(self):
        self.client.force_authenticate(user=self.author)

        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.post.refresh_from_db()
        self.assertEqual(self.post.images.count(), 0)
        self.assertEqual(self.post.caption, "Text prispevku")

    def test_last_photo_cannot_go_when_the_post_has_no_text(self):
        self.post.caption = ""
        self.post.save(update_fields=["caption"])

        self.client.force_authenticate(user=self.author)
        response = self.client.delete(self._url())

        # Príspevok by ostal úplne prázdny – to isté pravidlo ako pri texte.
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "cannot_remove_last_content")
        self.assertTrue(FeedPostImage.objects.filter(pk=self.image.id).exists())
        self.post.refresh_from_db()
        self.assertIsNone(self.post.edited_at)

    def test_whitespace_only_caption_does_not_count_as_text(self):
        self.post.caption = "   "
        self.post.save(update_fields=["caption"])

        self.client.force_authenticate(user=self.author)
        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_a_rejected_photo_does_not_keep_the_post_alive(self):
        # Zamietnutá fotka sa nezobrazí nikomu, takže prázdny príspevok
        # nezachráni – nesmie povoliť odobratie tej poslednej zobraziteľnej.
        self.post.caption = ""
        self.post.save(update_fields=["caption"])
        self._image(order=1, status=FeedPostImage.Status.REJECTED)

        self.client.force_authenticate(user=self.author)
        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "cannot_remove_last_content")

    def test_a_pending_photo_keeps_the_post_alive(self):
        # Rozpracovaná fotka o chvíľu bude vonku a autor ju už vidí.
        self.post.caption = ""
        self.post.save(update_fields=["caption"])
        self._image(order=1, status=FeedPostImage.Status.PENDING)

        self.client.force_authenticate(user=self.author)
        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_stranger_cannot_remove_a_photo(self):
        self.client.force_authenticate(user=self.stranger)

        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(FeedPostImage.objects.filter(pk=self.image.id).exists())

    def test_anonymous_cannot_remove_a_photo(self):
        response = self.client.delete(self._url())

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_photo_of_another_post_is_not_found(self):
        other = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Iny",
        )

        self.client.force_authenticate(user=self.author)
        response = self.client.delete(self._url(post=other))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(FeedPostImage.objects.filter(pk=self.image.id).exists())

    def test_unknown_photo_is_not_found(self):
        self.client.force_authenticate(user=self.author)

        response = self.client.delete(
            reverse("accounts:feed_post_image_delete", args=[self.post.id, 999999])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_storage_cleanup_runs_for_the_removed_photo(self):
        self._image(order=1)
        self.client.force_authenticate(user=self.author)

        # Signál upratuje v `on_commit`, takže v testovej transakcii treba
        # callbacky spustiť explicitne.
        with patch("accounts.signals.default_storage.delete") as deleted:
            with self.captureOnCommitCallbacks(execute=True):
                self.client.delete(self._url())

        # Súbory upratuje post_delete signál – rovnako ako pri zmazaní celého
        # príspevku, takže tu netreba (ani sa nemá) mazať storage ručne.
        self.assertTrue(deleted.called)


@override_settings(
    AWS_STORAGE_BUCKET_NAME="test-bucket",
    IMAGE_MAX_SIZE_MB=5,
    ALLOWED_IMAGE_EXTENSIONS=[".jpg", ".jpeg", ".png", ".webp"],
    SAFESEARCH_ENABLED=False,
)
class FeedPostImageAddToExistingPostTests(APITestCase):
    """Bod 1 zadania: upload reťazec na DÁVNO publikovanom príspevku."""

    def setUp(self):
        self.author = _user("img-add-author")
        self.stranger = _user("img-add-stranger")
        self.post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Stary prispevok",
        )
        # Príspevok spred mesiaca – na úpravu žiadne časové okno nie je.
        FeedPost.objects.filter(pk=self.post.pk).update(
            created_at=timezone.now() - timedelta(days=30)
        )
        self.post.refresh_from_db()
        FeedPostImage.objects.create(
            post=self.post,
            order=0,
            status=FeedPostImage.Status.APPROVED,
            approved_key="media/feed/x/large.webp",
        )

    def _init(self):
        s3 = _s3_mock()
        with patch("accounts.views.feed_uploads._get_s3_client", return_value=s3):
            return self.client.post(
                reverse("accounts:feed_post_image_upload_init", args=[self.post.id]),
                data={"filename": "photo.jpg", "size_bytes": 1024},
                format="json",
            )

    def _complete(self, image_id, *, is_edit=None):
        payload = {
            "key": f"uploads/feed/{self.post.id}/{image_id}/photo.jpg",
            "filename": "photo.jpg",
        }
        if is_edit is not None:
            payload["is_edit"] = is_edit
        s3 = _s3_mock()
        with patch("accounts.views.feed_uploads._get_s3_client", return_value=s3):
            return self.client.post(
                reverse(
                    "accounts:feed_post_image_upload_complete",
                    args=[self.post.id, image_id],
                ),
                data=payload,
                format="json",
            )

    def test_author_adds_a_photo_to_a_month_old_post(self):
        self.client.force_authenticate(user=self.author)

        init = self._init()

        self.assertEqual(init.status_code, status.HTTP_200_OK)
        complete = self._complete(init.data["image_id"], is_edit=True)
        self.assertEqual(complete.status_code, status.HTTP_200_OK)
        self.assertEqual(self.post.images.count(), 2)
        # Nová fotka ide na KONIEC – poradie vychádza z existujúceho maxima.
        added = FeedPostImage.objects.get(pk=init.data["image_id"])
        self.assertEqual(added.order, 1)

    def test_adding_a_photo_by_editing_marks_the_post_edited(self):
        self.client.force_authenticate(user=self.author)
        init = self._init()

        self._complete(init.data["image_id"], is_edit=True)

        self.post.refresh_from_db()
        self.assertIsNotNone(self.post.edited_at)

    def test_upload_during_creation_does_not_mark_the_post_edited(self):
        # Composer fotku nahráva hneď po vytvorení príspevku – to je súčasť
        # vzniku, nie úprava, takže „(upravené)" sa objaviť nesmie.
        self.client.force_authenticate(user=self.author)
        init = self._init()

        self._complete(init.data["image_id"])

        self.post.refresh_from_db()
        self.assertIsNone(self.post.edited_at)

    def test_limit_counts_photos_the_post_already_has(self):
        for index in range(1, MAX_FEED_POST_IMAGES):
            FeedPostImage.objects.create(
                post=self.post,
                order=index,
                status=FeedPostImage.Status.APPROVED,
            )
        self.client.force_authenticate(user=self.author)

        response = self._init()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "feed_post_images_limit_reached")
        self.assertEqual(self.post.images.count(), MAX_FEED_POST_IMAGES)

    def test_room_left_below_the_limit_is_still_usable(self):
        for index in range(1, MAX_FEED_POST_IMAGES - 1):
            FeedPostImage.objects.create(
                post=self.post,
                order=index,
                status=FeedPostImage.Status.APPROVED,
            )
        self.client.force_authenticate(user=self.author)

        response = self._init()

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_stranger_cannot_add_a_photo_to_a_foreign_post(self):
        self.client.force_authenticate(user=self.stranger)

        response = self._init()

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.post.images.count(), 1)
