import io
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from portfolio.models import PortfolioImage, PortfolioItem

User = get_user_model()


class PortfolioImageFileApiTests(APITestCase):
    def setUp(self):
        # Autorizácia proxy view sa cachuje (60s) podľa (user_id, item_id) –
        # vyčisti medzi testami, aby sa prístup neprenášal medzi scenármi.
        cache.clear()
        self.owner = User.objects.create_user(
            username="portfolio-file-owner",
            email="portfolio-file-owner@example.com",
            password="testpass123",
            is_public=True,
        )
        self.visitor = User.objects.create_user(
            username="portfolio-file-visitor",
            email="portfolio-file-visitor@example.com",
            password="testpass123",
        )
        self.item = PortfolioItem.objects.create(
            owner=self.owner,
            title="Bathroom renovation",
            category="Craft",
            description="Clean tile work.",
        )
        self.image = PortfolioImage.objects.create(
            item=self.item,
            order=0,
            status=PortfolioImage.Status.APPROVED,
            thumbnail_key=f"media/portfolio/{self.item.id}/x-thumbnail.webp",
            medium_key=f"media/portfolio/{self.item.id}/x-medium.webp",
            large_key=f"media/portfolio/{self.item.id}/x-large.webp",
            approved_key=f"media/portfolio/{self.item.id}/x-large.webp",
        )

    def _url(self, *, variant=None, image_id=None, item_id=None):
        url = reverse(
            "accounts:portfolio_image_file",
            args=[item_id or self.item.id, image_id or self.image.id],
        )
        return f"{url}?variant={variant}" if variant else url

    def _get_streamed(self, url):
        with patch(
            "portfolio.image_file_views.default_storage.open",
            return_value=io.BytesIO(b"webp-bytes"),
        ) as open_mock:
            response = self.client.get(url)
        return response, open_mock

    def test_owner_streams_default_large_variant(self):
        self.client.force_authenticate(user=self.owner)

        response, open_mock = self._get_streamed(self._url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        open_mock.assert_called_once_with(self.image.large_key, "rb")
        self.assertEqual(response["Content-Type"], "image/webp")
        self.assertEqual(response["Cache-Control"], "private, max-age=3600")
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")

    def test_variant_param_selects_thumbnail_key(self):
        self.client.force_authenticate(user=self.owner)

        response, open_mock = self._get_streamed(self._url(variant="thumbnail"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        open_mock.assert_called_once_with(self.image.thumbnail_key, "rb")

    def test_invalid_variant_falls_back_to_large(self):
        self.client.force_authenticate(user=self.owner)

        response, open_mock = self._get_streamed(self._url(variant="../../etc/passwd"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        open_mock.assert_called_once_with(self.image.large_key, "rb")

    def test_visitor_can_fetch_approved_image_of_public_profile(self):
        self.client.force_authenticate(user=self.visitor)

        response, open_mock = self._get_streamed(self._url(variant="medium"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        open_mock.assert_called_once_with(self.image.medium_key, "rb")

    def test_visitor_cannot_fetch_from_private_profile(self):
        self.owner.is_public = False
        self.owner.save(update_fields=["is_public"])
        self.client.force_authenticate(user=self.visitor)

        response, open_mock = self._get_streamed(self._url())

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        open_mock.assert_not_called()

    def test_visitor_cannot_fetch_pending_image(self):
        pending = PortfolioImage.objects.create(
            item=self.item,
            order=1,
            status=PortfolioImage.Status.PENDING,
            pending_key=f"uploads/portfolio/{self.item.id}/pending.jpg",
        )
        self.client.force_authenticate(user=self.visitor)

        response, open_mock = self._get_streamed(self._url(image_id=pending.id))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        open_mock.assert_not_called()

    def test_owner_can_fetch_pending_image_but_missing_key_is_404(self):
        pending = PortfolioImage.objects.create(
            item=self.item,
            order=1,
            status=PortfolioImage.Status.PENDING,
            pending_key=f"uploads/portfolio/{self.item.id}/pending.jpg",
        )
        self.client.force_authenticate(user=self.owner)

        # Owner prejde autorizáciou, no PENDING obrázok nemá large/medium/thumbnail
        # kľúč → 404 (žiadny variant na servírovanie).
        response, open_mock = self._get_streamed(self._url(image_id=pending.id))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        open_mock.assert_not_called()

    def test_unknown_image_returns_404(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self._url(image_id=999999))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unknown_item_returns_404(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self._url(item_id=999999))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_missing_storage_object_returns_404(self):
        self.client.force_authenticate(user=self.owner)

        with patch(
            "portfolio.image_file_views.default_storage.open",
            side_effect=FileNotFoundError("missing"),
        ):
            response = self.client.get(self._url())

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_requires_authentication(self):
        response = self.client.get(self._url())

        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_repeated_requests_use_cached_access_and_still_stream(self):
        self.client.force_authenticate(user=self.visitor)

        first, _ = self._get_streamed(self._url(variant="thumbnail"))
        # Druhý request tej istej položky ide cez cached autorizáciu (60s vzor
        # ako messaging) a stále streamuje správny variant.
        second, open_mock = self._get_streamed(self._url(variant="medium"))

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        open_mock.assert_called_once_with(self.image.medium_key, "rb")
