import tempfile
from io import BytesIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from portfolio.models import PortfolioImage, PortfolioItem

User = get_user_model()


class PortfolioLocalUploadApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="portfolio-local-owner",
            email="portfolio-local-owner@example.com",
            password="testpass123",
            is_public=True,
        )
        self.item = PortfolioItem.objects.create(
            owner=self.owner,
            title="Local portfolio",
            category="Craft",
            description="Local upload test.",
        )

    def test_upload_init_uses_local_storage_fallback_in_debug_without_bucket(self):
        self.client.force_authenticate(user=self.owner)

        with override_settings(DEBUG=True, AWS_STORAGE_BUCKET_NAME=""):
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
        self.assertEqual(
            response.data["url"],
            "http://testserver"
            + reverse("accounts:portfolio_image_local_upload"),
        )
        self.assertTrue(
            response.data["key"].startswith(f"uploads/portfolio/{self.item.id}/")
        )
        self.assertIn("token", response.data["fields"])

    def test_local_upload_url_resolves_with_accounts_namespace(self):
        # REGRESIA (BOD 3 z review): portfolio.urls je includnutý v accounts/urls.py
        # (app_name="accounts") BEZ vlastného namespace → správny názov je
        # "accounts:portfolio_image_local_upload", NIE bare názov. Tento test bráni
        # chybnej "oprave" reverse() na bare názov (tá by spôsobila NoReverseMatch).
        from portfolio.local_upload import local_upload_url

        url = local_upload_url(RequestFactory().get("/"))  # nesmie hodiť NoReverseMatch
        self.assertTrue(url.endswith("/api/auth/portfolio/images/local-upload/"))

    def test_upload_init_keeps_storage_error_outside_debug_without_bucket(self):
        self.client.force_authenticate(user=self.owner)

        with override_settings(DEBUG=False, AWS_STORAGE_BUCKET_NAME=""):
            response = self.client.post(
                reverse("accounts:portfolio_image_upload_init", args=[self.item.id]),
                data={
                    "filename": "work.jpg",
                    "content_type": "image/jpeg",
                    "size_bytes": 1024,
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    def test_local_upload_complete_creates_approved_image_without_s3(self):
        self.client.force_authenticate(user=self.owner)
        image_bytes = _jpeg_bytes()

        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(
                DEBUG=True,
                AWS_STORAGE_BUCKET_NAME="",
                MEDIA_ROOT=media_root,
                SAFESEARCH_ENABLED=False,
            ):
                init_response = self.client.post(
                    reverse(
                        "accounts:portfolio_image_upload_init",
                        args=[self.item.id],
                    ),
                    data={
                        "filename": "work.jpg",
                        "content_type": "image/jpeg",
                        "size_bytes": len(image_bytes),
                    },
                    format="json",
                )
                self.assertEqual(init_response.status_code, status.HTTP_200_OK)

                upload_response = self.client.post(
                    reverse("accounts:portfolio_image_local_upload"),
                    data={
                        **init_response.data["fields"],
                        "file": SimpleUploadedFile(
                            "work.jpg",
                            image_bytes,
                            content_type="image/jpeg",
                        ),
                    },
                )
                self.assertEqual(upload_response.status_code, status.HTTP_204_NO_CONTENT)

                with patch("portfolio.image_processing.check_image_safety"):
                    with self.captureOnCommitCallbacks(execute=True):
                        complete_response = self.client.post(
                            reverse(
                                "accounts:portfolio_image_upload_complete",
                                args=[self.item.id],
                            ),
                            data={
                                "key": init_response.data["key"],
                                "filename": "work.jpg",
                            },
                            format="json",
                        )

                self.assertEqual(complete_response.status_code, status.HTTP_201_CREATED)
                image = PortfolioImage.objects.get(id=complete_response.data["id"])
                self.item.refresh_from_db()
                self.assertEqual(image.status, PortfolioImage.Status.APPROVED)
                self.assertEqual(self.item.cover_image_id, image.id)
                self.assertTrue(image.thumbnail_key.startswith("portfolio/"))
                self.assertTrue(image.medium_key.startswith("portfolio/"))
                self.assertTrue(image.large_key.startswith("portfolio/"))
                self.assertFalse(default_storage.exists(init_response.data["key"]))

    def test_local_upload_rejects_invalid_token(self):
        with override_settings(DEBUG=True, AWS_STORAGE_BUCKET_NAME=""):
            response = self.client.post(
                reverse("accounts:portfolio_image_local_upload"),
                data={
                    "key": f"uploads/portfolio/{self.item.id}/work.jpg",
                    "token": "bad-token",
                    "file": SimpleUploadedFile(
                        "work.jpg",
                        _jpeg_bytes(),
                        content_type="image/jpeg",
                    ),
                },
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_local_upload_rejects_size_that_does_not_match_signed_token(self):
        self.client.force_authenticate(user=self.owner)
        image_bytes = _jpeg_bytes()

        with override_settings(DEBUG=True, AWS_STORAGE_BUCKET_NAME=""):
            init_response = self.client.post(
                reverse("accounts:portfolio_image_upload_init", args=[self.item.id]),
                data={
                    "filename": "work.jpg",
                    "content_type": "image/jpeg",
                    "size_bytes": 1024,
                },
                format="json",
            )
            self.assertEqual(init_response.status_code, status.HTTP_200_OK)

            response = self.client.post(
                reverse("accounts:portfolio_image_local_upload"),
                data={
                    **init_response.data["fields"],
                    "file": SimpleUploadedFile(
                        "work.jpg",
                        image_bytes,
                        content_type="image/jpeg",
                    ),
                },
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


def _jpeg_bytes() -> bytes:
    output = BytesIO()
    image = Image.new("RGB", (1200, 800), color=(120, 80, 40))
    image.save(output, format="JPEG")
    return output.getvalue()
