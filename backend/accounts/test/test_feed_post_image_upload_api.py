"""Feed – testy uploadu fotiek príspevku (rovnaký reťazec ako portfólio).

Od Fázy 4.4 sú endpointy per-obrázok nad ``FeedPostImage`` (limit 5).
"""

from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import MAX_FEED_POST_IMAGES, FeedPost, FeedPostImage

User = get_user_model()


def _s3_mock(*, head=None):
    s3 = Mock()
    s3.generate_presigned_post.return_value = {
        "url": "https://upload.example",
        "fields": {"key": "value"},
    }
    s3.head_object.return_value = head or {
        "ContentLength": 1024,
        "ContentType": "image/jpeg",
    }
    return s3


@override_settings(
    AWS_STORAGE_BUCKET_NAME="test-bucket",
    IMAGE_MAX_SIZE_MB=5,
    ALLOWED_IMAGE_EXTENSIONS=[".jpg", ".jpeg", ".png", ".webp"],
    # Vytvorenie PENDING stavu a enqueue testujeme bez reálnej SafeSearch
    # moderácie (tá má vlastný test nižšie) – vzor portfolio upload testov.
    SAFESEARCH_ENABLED=False,
)
class FeedPostImageUploadApiTests(APITestCase):
    _cached_image = None

    def setUp(self):
        self.author = User.objects.create_user(
            username="feed-photo-author",
            email="feed-photo-author@example.com",
            password="testpass123",
            is_public=True,
        )
        self.visitor = User.objects.create_user(
            username="feed-photo-visitor",
            email="feed-photo-visitor@example.com",
            password="testpass123",
        )
        self.post = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.FREE_POST,
            caption="Post s fotkou",
        )

    def _init_url(self, post=None):
        return reverse(
            "accounts:feed_post_image_upload_init", args=[(post or self.post).id]
        )

    def _complete_url(self, image=None, post=None):
        image = image or self._image()
        return reverse(
            "accounts:feed_post_image_upload_complete",
            args=[(post or self.post).id, image.id],
        )

    def _image(self, post=None, **fields):
        """Záznam, aký by vytvoril upload-init (klient ho už má z odpovede)."""
        if getattr(self, "_cached_image", None) is None or post is not None:
            image = FeedPostImage.objects.create(post=post or self.post, **fields)
            if post is None:
                self._cached_image = image
            return image
        return self._cached_image

    def _staging_key(self, image=None, post=None):
        image = image or self._image()
        return f"uploads/feed/{(post or self.post).id}/{image.id}/photo.jpg"

    def test_upload_init_returns_presigned_payload_for_author(self):
        self.client.force_authenticate(user=self.author)
        s3 = _s3_mock()

        with patch("accounts.views.feed_uploads._get_s3_client", return_value=s3):
            response = self.client.post(
                self._init_url(),
                data={
                    "filename": "photo.jpg",
                    "content_type": "image/jpeg",
                    "size_bytes": 1024,
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        image_id = response.data["image_id"]
        self.assertTrue(
            response.data["key"].startswith(
                f"uploads/feed/{self.post.id}/{image_id}/"
            )
        )
        self.assertEqual(response.data["url"], "https://upload.example")
        # init vytvoril PENDING záznam – ten drží miesto v limite.
        self.assertTrue(
            FeedPostImage.objects.filter(
                id=image_id, post=self.post, status=FeedPostImage.Status.PENDING
            ).exists()
        )

    def test_upload_init_foreign_post_returns_not_found(self):
        self.client.force_authenticate(user=self.visitor)
        response = self.client.post(
            self._init_url(),
            data={"filename": "photo.jpg", "size_bytes": 1024},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_upload_init_rejected_for_shared_post(self):
        # Fotka je len pre FREE_POST – zdieľanie má vlastný snapshot náhľad.
        from accounts.models import OfferedSkill

        offer = OfferedSkill.objects.create(
            user=self.author, category="it-a-technologie", subcategory="Weby"
        )
        shared = FeedPost.objects.create(
            author=self.author,
            post_type=FeedPost.PostType.SHARED_OFFER,
            shared_offer=offer,
        )
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self._init_url(shared),
            data={"filename": "photo.jpg", "size_bytes": 1024},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_upload_init_blocked_at_the_image_limit(self):
        for index in range(MAX_FEED_POST_IMAGES):
            FeedPostImage.objects.create(
                post=self.post,
                order=index,
                status=FeedPostImage.Status.APPROVED,
            )
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self._init_url(),
            data={"filename": "photo.jpg", "size_bytes": 1024},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "feed_post_images_limit_reached")
        self.assertEqual(self.post.images.count(), MAX_FEED_POST_IMAGES)

    def test_pending_image_still_occupies_a_slot(self):
        """Rozpracovaná fotka miesto v limite drží – inak by sa opakovaným
        initom dalo nahrať viac než MAX_FEED_POST_IMAGES."""
        for index in range(MAX_FEED_POST_IMAGES):
            FeedPostImage.objects.create(
                post=self.post,
                order=index,
                status=FeedPostImage.Status.PENDING,
            )
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self._init_url(),
            data={"filename": "photo.jpg", "size_bytes": 1024},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejected_image_frees_a_slot(self):
        """Zamietnutá fotka sa do limitu nepočíta – používateľ smie skúsiť znova."""
        for index in range(MAX_FEED_POST_IMAGES):
            FeedPostImage.objects.create(
                post=self.post,
                order=index,
                status=FeedPostImage.Status.REJECTED,
            )
        self.client.force_authenticate(user=self.author)
        s3 = _s3_mock()
        with patch("accounts.views.feed_uploads._get_s3_client", return_value=s3):
            response = self.client.post(
                self._init_url(),
                data={"filename": "photo.jpg", "size_bytes": 1024},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_upload_complete_creates_pending_and_enqueues_processing(self):
        self.client.force_authenticate(user=self.author)
        key = self._staging_key()
        s3 = _s3_mock(head={"ContentLength": 2048, "ContentType": "image/jpeg"})

        with (
            patch("accounts.views.feed_uploads._get_s3_client", return_value=s3),
            patch(
                "swaply.tasks.feed_images.process_feed_post_image"
            ) as task_mock,
            self.captureOnCommitCallbacks(execute=True),
        ):
            response = self.client.post(
                self._complete_url(),
                data={"key": key, "filename": "photo.jpg"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        image = self._image()
        image.refresh_from_db()
        self.assertEqual(image.status, FeedPostImage.Status.PENDING)
        self.assertEqual(image.pending_key, key)
        task_mock.delay.assert_called_once_with(image.id)

    def test_upload_complete_rejects_wrong_key_prefix(self):
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self._complete_url(),
            data={"key": "uploads/portfolio/1/evil.jpg", "filename": "evil.jpg"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(SAFESEARCH_ENABLED=True)
    def test_upload_complete_rejected_by_moderation_cleans_staged_upload(self):
        # Rovnaký SafeSearch flow ako portfólio: moderácia zamietne → žiadny
        # PENDING stav, staging upload sa uprace.
        from swaply.staged_image_moderation import ModerationRejectedError

        self.client.force_authenticate(user=self.author)
        key = self._staging_key()
        s3 = _s3_mock(head={"ContentLength": 2048, "ContentType": "image/jpeg"})

        with (
            patch("accounts.views.feed_uploads._get_s3_client", return_value=s3),
            patch(
                "swaply.staged_image_moderation.moderate_staged_s3_image",
                side_effect=ModerationRejectedError("Nevhodny obsah."),
            ),
            patch("accounts.views.feed_uploads.delete_storage_keys") as delete_mock,
        ):
            response = self.client.post(
                self._complete_url(),
                data={"key": key, "filename": "photo.jpg"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "image_moderation_rejected")
        image = self._image()
        image.refresh_from_db()
        # Moderácia beží PRED zápisom – záznam ostáva bez staging kľúča.
        self.assertEqual(image.pending_key, "")
        delete_mock.assert_called_once_with([key])

    def test_upload_init_rejects_disallowed_extension(self):
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self._init_url(),
            data={"filename": "malware.exe", "size_bytes": 1024},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_init_rejects_oversized_file(self):
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self._init_url(),
            data={"filename": "big.jpg", "size_bytes": 6 * 1024 * 1024},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_complete_rejects_oversized_staged_file(self):
        # Veľkosť z head_object je zdroj pravdy – klient mohol pri inite klamať.
        self.client.force_authenticate(user=self.author)
        key = self._staging_key()
        s3 = _s3_mock(head={"ContentLength": 6 * 1024 * 1024, "ContentType": "image/jpeg"})

        with (
            patch("accounts.views.feed_uploads._get_s3_client", return_value=s3),
            patch("accounts.views.feed_uploads.delete_storage_keys") as delete_mock,
        ):
            response = self.client.post(
                self._complete_url(),
                data={"key": key, "filename": "photo.jpg"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        image = self._image()
        image.refresh_from_db()
        self.assertEqual(image.pending_key, "")
        delete_mock.assert_called_once_with([key])

    def test_upload_complete_enqueue_failure_marks_rejected_and_cleans_staging(self):
        self.client.force_authenticate(user=self.author)
        key = self._staging_key()
        s3 = _s3_mock(head={"ContentLength": 2048, "ContentType": "image/jpeg"})

        with (
            patch("accounts.views.feed_uploads._get_s3_client", return_value=s3),
            patch(
                "swaply.tasks.feed_images.process_feed_post_image.delay",
                side_effect=RuntimeError("broker down"),
            ),
            patch("accounts.views.feed_uploads.delete_storage_keys") as delete_mock,
            self.captureOnCommitCallbacks(execute=True),
        ):
            response = self.client.post(
                self._complete_url(),
                data={"key": key, "filename": "photo.jpg"},
                format="json",
            )

        # Odpoveď je 200 (DB zápis prešiel), ale post nesmie ostať navždy PENDING.
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        image = self._image()
        image.refresh_from_db()
        self.assertEqual(image.status, FeedPostImage.Status.REJECTED)
        delete_mock.assert_called_once_with([key])

    def test_upload_complete_truncates_overlong_filename(self):
        self.client.force_authenticate(user=self.author)
        key = self._staging_key()
        s3 = _s3_mock(head={"ContentLength": 2048, "ContentType": "image/jpeg"})
        long_name = "a" * 400 + ".jpg"

        with (
            patch("accounts.views.feed_uploads._get_s3_client", return_value=s3),
            patch("swaply.tasks.feed_images.process_feed_post_image"),
            self.captureOnCommitCallbacks(execute=True),
        ):
            response = self.client.post(
                self._complete_url(),
                data={"key": key, "filename": long_name},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.post.refresh_from_db()
        image = self._image()
        image.refresh_from_db()
        self.assertLessEqual(len(image.original_filename), 255)

    @override_settings(SAFESEARCH_ENABLED=True)
    def test_upload_complete_moderation_outage_fails_closed(self):
        # Výpadok moderácie: fotku neprijmeme a staging uprataeme (fail-closed).
        self.client.force_authenticate(user=self.author)
        key = self._staging_key()
        s3 = _s3_mock(head={"ContentLength": 2048, "ContentType": "image/jpeg"})

        with (
            patch("accounts.views.feed_uploads._get_s3_client", return_value=s3),
            patch(
                "swaply.staged_image_moderation.moderate_staged_s3_image",
                side_effect=RuntimeError("vision api down"),
            ),
            patch("accounts.views.feed_uploads.delete_storage_keys") as delete_mock,
        ):
            response = self.client.post(
                self._complete_url(),
                data={"key": key, "filename": "photo.jpg"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        image = self._image()
        image.refresh_from_db()
        self.assertEqual(image.pending_key, "")
        delete_mock.assert_called_once_with([key])

    def test_retry_upload_after_rejection_clears_stale_processed_at(self):
        self.client.force_authenticate(user=self.author)
        image = self._image(
            status=FeedPostImage.Status.REJECTED,
            rejected_reason="Nevhodny obsah.",
            processed_at=timezone.now(),
        )
        key = self._staging_key(image)
        s3 = _s3_mock(head={"ContentLength": 2048, "ContentType": "image/jpeg"})

        with (
            patch("accounts.views.feed_uploads._get_s3_client", return_value=s3),
            patch("swaply.tasks.feed_images.process_feed_post_image"),
            self.captureOnCommitCallbacks(execute=True),
        ):
            response = self.client.post(
                self._complete_url(),
                data={"key": key, "filename": "retry.jpg"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        image.refresh_from_db()
        self.assertEqual(image.status, FeedPostImage.Status.PENDING)
        # Starý čas spracovania by tvrdil, že tento nový upload je už vybavený.
        self.assertIsNone(image.processed_at)

    def test_upload_complete_requires_authentication(self):
        response = self.client.post(
            self._complete_url(),
            data={"key": "x", "filename": "x.jpg"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
