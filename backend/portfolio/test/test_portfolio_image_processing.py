import io
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from PIL import Image

from portfolio.image_processing import process_portfolio_image_record
from portfolio.models import PortfolioImage, PortfolioItem

User = get_user_model()


@override_settings(AWS_STORAGE_BUCKET_NAME="test-bucket", SAFESEARCH_ENABLED=False)
class PortfolioImageProcessingTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="portfolio-processing-owner",
            email="portfolio-processing-owner@example.com",
            password="testpass123",
        )
        self.item = PortfolioItem.objects.create(
            owner=self.owner,
            title="Kitchen",
            category="Craft",
            description="Cabinet work.",
        )

    def test_processing_approves_image_creates_variants_and_sets_initial_cover(self):
        pending_key = f"uploads/portfolio/{self.item.id}/work.jpg"
        image = PortfolioImage.objects.create(
            item=self.item,
            status=PortfolioImage.Status.PENDING,
            pending_key=pending_key,
        )
        s3 = FakeS3Client({pending_key: _jpeg_bytes()})

        with (
            patch("portfolio.image_processing._s3_client", return_value=s3),
            patch("portfolio.image_processing.check_image_safety") as safety_mock,
        ):
            process_portfolio_image_record(image.id)

        image.refresh_from_db()
        self.item.refresh_from_db()
        self.assertEqual(image.status, PortfolioImage.Status.APPROVED)
        self.assertTrue(image.thumbnail_key.endswith("-thumbnail.webp"))
        self.assertTrue(image.medium_key.endswith("-medium.webp"))
        self.assertTrue(image.large_key.endswith("-large.webp"))
        self.assertEqual(image.approved_key, image.large_key)
        self.assertEqual(image.content_type, "image/webp")
        self.assertGreater(image.width, 0)
        self.assertGreater(image.height, 0)
        self.assertEqual(self.item.cover_image_id, image.id)
        self.assertIn(image.thumbnail_key, s3.objects)
        self.assertIn(image.medium_key, s3.objects)
        self.assertIn(image.large_key, s3.objects)
        self.assertIn(pending_key, s3.deleted_keys)
        self.assertEqual(safety_mock.call_count, 1)

    def test_processing_rejects_invalid_image_and_deletes_pending_upload(self):
        pending_key = f"uploads/portfolio/{self.item.id}/broken.jpg"
        image = PortfolioImage.objects.create(
            item=self.item,
            status=PortfolioImage.Status.PENDING,
            pending_key=pending_key,
        )
        s3 = FakeS3Client({pending_key: b"not an image"})

        with patch("portfolio.image_processing._s3_client", return_value=s3):
            process_portfolio_image_record(image.id)

        image.refresh_from_db()
        self.item.refresh_from_db()
        self.assertEqual(image.status, PortfolioImage.Status.REJECTED)
        self.assertTrue(image.rejected_reason)
        self.assertIn(pending_key, s3.deleted_keys)
        self.assertIsNone(self.item.cover_image)


class FakeS3Client:
    def __init__(self, objects):
        self.objects = dict(objects)
        self.deleted_keys = []

    def get_object(self, *, Bucket, Key):
        return {"Body": io.BytesIO(self.objects[Key])}

    def upload_fileobj(self, fileobj, bucket, key, ExtraArgs=None):
        self.objects[key] = fileobj.read()

    def delete_object(self, *, Bucket, Key):
        self.deleted_keys.append(Key)
        self.objects.pop(Key, None)


def _jpeg_bytes() -> bytes:
    output = io.BytesIO()
    image = Image.new("RGB", (1200, 800), color=(120, 80, 40))
    image.save(output, format="JPEG")
    return output.getvalue()
