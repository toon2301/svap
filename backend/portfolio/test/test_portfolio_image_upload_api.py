from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from portfolio.models import PortfolioImage, PortfolioItem

User = get_user_model()


@override_settings(
    AWS_STORAGE_BUCKET_NAME="test-bucket",
    IMAGE_MAX_SIZE_MB=5,
    ALLOWED_IMAGE_EXTENSIONS=[".jpg", ".jpeg", ".png", ".webp"],
    # Tieto testy overujú vytvorenie PENDING záznamu a zaradenie spracovania,
    # nie SafeSearch moderáciu (tá má vlastné testy). Bez vypnutia by complete
    # view volal reálnu S3 moderáciu → NoCredentialsError.
    SAFESEARCH_ENABLED=False,
)
class PortfolioImageUploadApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="portfolio-image-owner",
            email="portfolio-image-owner@example.com",
            password="testpass123",
            is_public=True,
        )
        self.visitor = User.objects.create_user(
            username="portfolio-image-visitor",
            email="portfolio-image-visitor@example.com",
            password="testpass123",
        )
        self.item = PortfolioItem.objects.create(
            owner=self.owner,
            title="Bathroom renovation",
            category="Craft",
            description="Clean tile work.",
        )

    def _image(self, **overrides):
        data = {
            "item": self.item,
            "order": 0,
            "status": PortfolioImage.Status.APPROVED,
            "approved_key": f"media/portfolio/{self.item.id}/image.webp",
            "large_key": f"media/portfolio/{self.item.id}/image.webp",
        }
        data.update(overrides)
        return PortfolioImage.objects.create(**data)

    def test_upload_init_returns_presigned_payload_for_owner(self):
        self.client.force_authenticate(user=self.owner)
        s3 = _s3_mock()

        with patch("portfolio.image_views._get_s3_client", return_value=s3):
            response = self.client.post(
                reverse("accounts:portfolio_image_upload_init", args=[self.item.id]),
                data={
                    "filename": "work.jpg",
                    "content_type": "image/jpeg",
                    "size_bytes": 1024,
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            response.data["key"].startswith(f"uploads/portfolio/{self.item.id}/")
        )
        self.assertEqual(response.data["url"], "https://upload.example")
        self.assertEqual(s3.generate_presigned_post.call_count, 1)

    def test_upload_init_foreign_item_returns_not_found(self):
        self.client.force_authenticate(user=self.visitor)

        response = self.client.post(
            reverse("accounts:portfolio_image_upload_init", args=[self.item.id]),
            data={"filename": "work.jpg", "size_bytes": 1024},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_upload_init_rejects_when_active_image_limit_is_reached(self):
        for index in range(8):
            self._image(order=index)
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:portfolio_image_upload_init", args=[self.item.id]),
            data={"filename": "work.jpg", "size_bytes": 1024},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_complete_creates_pending_image_and_enqueues_processing(self):
        self.client.force_authenticate(user=self.owner)
        key = f"uploads/portfolio/{self.item.id}/work.jpg"
        s3 = _s3_mock(
            head={
                "ContentLength": 2048,
                "ContentType": "image/jpeg",
            }
        )

        with (
            patch("portfolio.image_views._get_s3_client", return_value=s3),
            patch(
                "swaply.tasks.portfolio_images.process_portfolio_image.delay"
            ) as delay_mock,
        ):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    reverse(
                        "accounts:portfolio_image_upload_complete",
                        args=[self.item.id],
                    ),
                    data={"key": key, "filename": "work.jpg"},
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        image = PortfolioImage.objects.get(id=response.data["id"])
        self.assertEqual(image.status, PortfolioImage.Status.PENDING)
        self.assertEqual(image.pending_key, key)
        self.assertEqual(image.size_bytes, 2048)
        self.assertEqual(delay_mock.call_count, 1)
        self.assertEqual(delay_mock.call_args.args[0], image.id)

    def test_upload_complete_failure_to_enqueue_marks_image_rejected_and_cleans_upload(
        self,
    ):
        self.client.force_authenticate(user=self.owner)
        key = f"uploads/portfolio/{self.item.id}/work.jpg"
        s3 = _s3_mock(
            head={
                "ContentLength": 2048,
                "ContentType": "image/jpeg",
            }
        )

        with (
            patch("portfolio.image_views._get_s3_client", return_value=s3),
            patch(
                "swaply.tasks.portfolio_images.process_portfolio_image.delay",
                side_effect=RuntimeError("queue down"),
            ),
            patch("portfolio.image_views.delete_storage_keys") as delete_mock,
        ):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    reverse(
                        "accounts:portfolio_image_upload_complete",
                        args=[self.item.id],
                    ),
                    data={"key": key, "filename": "work.jpg"},
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        image = PortfolioImage.objects.get(id=response.data["id"])
        self.assertEqual(image.status, PortfolioImage.Status.REJECTED)
        self.assertTrue(image.rejected_reason)
        self.assertEqual(delete_mock.call_count, 1)
        self.assertEqual(delete_mock.call_args.args[0], [key])

    def test_upload_complete_foreign_item_does_not_head_object(self):
        self.client.force_authenticate(user=self.visitor)
        s3 = _s3_mock()

        with patch("portfolio.image_views._get_s3_client", return_value=s3):
            response = self.client.post(
                reverse(
                    "accounts:portfolio_image_upload_complete",
                    args=[self.item.id],
                ),
                data={"key": f"uploads/portfolio/{self.item.id}/work.jpg"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(s3.head_object.call_count, 0)

    def test_upload_complete_rejects_invalid_key_prefix(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:portfolio_image_upload_complete", args=[self.item.id]),
            data={"key": "uploads/portfolio/999/work.jpg"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_set_cover_requires_approved_image(self):
        self.client.force_authenticate(user=self.owner)

        for image_status in (
            PortfolioImage.Status.PENDING,
            PortfolioImage.Status.REJECTED,
        ):
            with self.subTest(image_status=image_status):
                image = self._image(
                    status=image_status,
                    approved_key="",
                    large_key="",
                    pending_key=f"uploads/portfolio/{self.item.id}/{image_status}.jpg",
                )

                response = self.client.patch(
                    reverse(
                        "accounts:portfolio_image_cover",
                        args=[self.item.id, image.id],
                    ),
                    format="json",
                )

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.item.refresh_from_db()
                self.assertIsNone(self.item.cover_image)

    def test_set_cover_updates_cover_image_for_owner(self):
        image = self._image()
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            reverse("accounts:portfolio_image_cover", args=[self.item.id, image.id]),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertEqual(self.item.cover_image_id, image.id)
        self.assertEqual(response.data["cover_image"]["id"], image.id)

    def test_set_cover_foreign_user_returns_not_found(self):
        image = self._image()
        self.client.force_authenticate(user=self.visitor)

        response = self.client.patch(
            reverse("accounts:portfolio_image_cover", args=[self.item.id, image.id]),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.item.refresh_from_db()
        self.assertIsNone(self.item.cover_image)

    def test_delete_foreign_user_returns_not_found(self):
        image = self._image()
        self.client.force_authenticate(user=self.visitor)

        response = self.client.delete(
            reverse("accounts:portfolio_image_detail", args=[self.item.id, image.id])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(PortfolioImage.objects.filter(id=image.id).exists())

    def test_delete_cover_image_sets_next_approved_cover_and_deletes_storage(self):
        first = self._image(order=0, large_key="media/portfolio/first.webp")
        second = self._image(order=1, large_key="media/portfolio/second.webp")
        self.item.cover_image = first
        self.item.save(update_fields=["cover_image", "updated_at"])
        self.client.force_authenticate(user=self.owner)

        with patch("portfolio.image_views.delete_storage_keys") as delete_mock:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.delete(
                    reverse(
                        "accounts:portfolio_image_detail", args=[self.item.id, first.id]
                    )
                )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PortfolioImage.objects.filter(id=first.id).exists())
        self.item.refresh_from_db()
        self.assertEqual(self.item.cover_image_id, second.id)
        self.assertEqual(delete_mock.call_count, 1)
        self.assertIn("media/portfolio/first.webp", delete_mock.call_args.args[0])

    def test_delete_last_cover_image_sets_cover_null(self):
        image = self._image(order=0, large_key="media/portfolio/only.webp")
        self.item.cover_image = image
        self.item.save(update_fields=["cover_image", "updated_at"])
        self.client.force_authenticate(user=self.owner)

        with patch("portfolio.image_views.delete_storage_keys") as delete_mock:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.delete(
                    reverse(
                        "accounts:portfolio_image_detail", args=[self.item.id, image.id]
                    )
                )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.item.refresh_from_db()
        self.assertIsNone(self.item.cover_image)
        # Storage kľúče zmazaného obrázka sa naozaj odstránia (mock bol zavolaný).
        delete_mock.assert_called_once()
        self.assertIn("media/portfolio/only.webp", delete_mock.call_args.args[0])

    def test_reorder_images_endpoint_is_not_available(self):
        first = self._image(order=0, large_key="media/portfolio/first.webp")
        second = self._image(order=1, large_key="media/portfolio/second.webp")
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            f"/api/auth/portfolio/{self.item.id}/images/reorder/",
            data={"image_ids": [second.id, first.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            list(
                PortfolioImage.objects.filter(item=self.item)
                .order_by("order")
                .values_list("id", flat=True)
            ),
            [first.id, second.id],
        )

def _s3_mock(*, head=None):
    from unittest.mock import Mock

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
