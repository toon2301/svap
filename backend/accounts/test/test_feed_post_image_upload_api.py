"""Feed Fáza 1 – testy uploadu fotky FeedPost-u (rovnaký reťazec ako portfólio)."""

from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import FeedPost

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

    def _complete_url(self, post=None):
        return reverse(
            "accounts:feed_post_image_upload_complete", args=[(post or self.post).id]
        )

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
        self.assertTrue(
            response.data["key"].startswith(f"uploads/feed/{self.post.id}/")
        )
        self.assertEqual(response.data["url"], "https://upload.example")

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

    def test_upload_init_blocked_when_photo_already_pending(self):
        FeedPost.objects.filter(id=self.post.id).update(
            image_status=FeedPost.ImageStatus.PENDING,
            image_pending_key="uploads/feed/x/y.jpg",
        )
        self.client.force_authenticate(user=self.author)
        response = self.client.post(
            self._init_url(),
            data={"filename": "photo.jpg", "size_bytes": 1024},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "feed_post_image_exists")

    def test_upload_complete_creates_pending_and_enqueues_processing(self):
        self.client.force_authenticate(user=self.author)
        key = f"uploads/feed/{self.post.id}/photo.jpg"
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
        self.post.refresh_from_db()
        self.assertEqual(self.post.image_status, FeedPost.ImageStatus.PENDING)
        self.assertEqual(self.post.image_pending_key, key)
        task_mock.delay.assert_called_once_with(self.post.id)

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
        key = f"uploads/feed/{self.post.id}/photo.jpg"
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
        self.post.refresh_from_db()
        self.assertEqual(self.post.image_status, "")  # žiadna fotka nevznikla
        delete_mock.assert_called_once_with([key])

    def test_upload_complete_requires_authentication(self):
        response = self.client.post(
            self._complete_url(),
            data={"key": "x", "filename": "x.jpg"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
