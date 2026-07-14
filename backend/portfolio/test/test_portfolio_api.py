from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import OfferedSkill
from portfolio.models import PortfolioImage, PortfolioItem

User = get_user_model()


class PortfolioApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="portfolio-owner",
            email="portfolio-owner@example.com",
            password="testpass123",
            first_name="Portfolio",
            last_name="Owner",
            user_type="individual",
            is_public=True,
            slug="portfolio-owner",
        )
        self.visitor = User.objects.create_user(
            username="portfolio-visitor",
            email="portfolio-visitor@example.com",
            password="testpass123",
            first_name="Portfolio",
            last_name="Visitor",
            user_type="individual",
        )

    def _item(self, **overrides):
        data = {
            "owner": self.owner,
            "title": "Bathroom renovation",
            "category": "Craft",
            "description": "Clean tile work.",
            "sort_order": 0,
        }
        data.update(overrides)
        return PortfolioItem.objects.create(**data)

    def _image(self, item, **overrides):
        data = {
            "item": item,
            "order": 0,
            "status": PortfolioImage.Status.APPROVED,
            "approved_key": f"portfolio/{item.id}/image.jpg",
            "width": 1200,
            "height": 800,
        }
        data.update(overrides)
        return PortfolioImage.objects.create(**data)

    def _set_cover(self, item, image):
        item.cover_image = image
        item.save(update_fields=["cover_image", "updated_at"])
        return item

    def test_my_portfolio_requires_authentication(self):
        response = self.client.get(reverse("accounts:portfolio_list"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_owner_list_includes_pending_and_rejected_image_statuses_without_keys(self):
        item = self._item()
        approved = self._image(item, order=0)
        self._image(
            item,
            order=1,
            status=PortfolioImage.Status.PENDING,
            approved_key="",
            pending_key="uploads/portfolio/pending.jpg",
            original_filename="pending.jpg",
        )
        self._image(
            item,
            order=2,
            status=PortfolioImage.Status.REJECTED,
            approved_key="",
            rejected_reason="Rejected by moderation",
            original_filename="rejected.jpg",
        )
        self._set_cover(item, approved)

        self.client.force_authenticate(user=self.owner)
        response = self.client.get(reverse("accounts:portfolio_list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        payload = response.data[0]
        self.assertTrue(payload["is_featured"])
        self.assertEqual(
            payload["cover_image"]["status"], PortfolioImage.Status.APPROVED
        )
        # List obrázky nenesie (šetrí payload; detail má vlastný fetch).
        self.assertNotIn("images", payload)

        # Statusy + absencia interných kľúčov platia na detail endpointe.
        detail = self.client.get(
            reverse("accounts:portfolio_detail", args=[item.id])
        )
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        detail_payload = detail.data
        self.assertEqual(len(detail_payload["images"]), 3)
        self.assertEqual(
            [image["status"] for image in detail_payload["images"]],
            [
                PortfolioImage.Status.APPROVED,
                PortfolioImage.Status.PENDING,
                PortfolioImage.Status.REJECTED,
            ],
        )
        rejected = detail_payload["images"][2]
        self.assertEqual(rejected["rejected_reason"], "Rejected by moderation")
        for image in detail_payload["images"]:
            self.assertNotIn("approved_key", image)
            self.assertNotIn("pending_key", image)
            self.assertNotIn("thumbnail_key", image)
            self.assertNotIn("medium_key", image)
            self.assertNotIn("large_key", image)
            self.assertNotIn("original_filename", image)

    def test_owner_list_serializes_variant_urls_without_storage_keys(self):
        item = self._item()
        image = self._image(
            item,
            approved_key="media/portfolio/large.webp",
            thumbnail_key="media/portfolio/thumb.webp",
            medium_key="media/portfolio/medium.webp",
            large_key="media/portfolio/large.webp",
        )
        self._set_cover(item, image)

        self.client.force_authenticate(user=self.owner)
        # Obrázkové URL servíruje detail endpoint (list images nenesie).
        response = self.client.get(
            reverse("accounts:portfolio_detail", args=[item.id])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data["images"][0]
        # BOD 3: URL smerujú na privátny proxy endpoint (nie priama S3/media URL).
        proxy_base = "http://testserver" + reverse(
            "accounts:portfolio_image_file", args=[item.id, image.id]
        )
        self.assertEqual(payload["thumbnail_url"], f"{proxy_base}?variant=thumbnail")
        self.assertEqual(payload["medium_url"], f"{proxy_base}?variant=medium")
        self.assertEqual(payload["large_url"], f"{proxy_base}?variant=large")
        # image_url preferuje medium variant.
        self.assertEqual(payload["image_url"], f"{proxy_base}?variant=medium")
        # Interné S3 kľúče sa NIKDY neobjavia v odpovedi (ani v URL).
        self.assertNotIn("thumbnail_key", payload)
        self.assertNotIn("medium_key", payload)
        self.assertNotIn("large_key", payload)
        for url in (
            payload["thumbnail_url"],
            payload["medium_url"],
            payload["large_url"],
            payload["image_url"],
        ):
            self.assertNotIn("media/portfolio", url)

    def test_visitor_list_only_returns_public_items_with_approved_cover_and_images(
        self,
    ):
        first = self._item(title="First", sort_order=0)
        cover = self._image(first, order=0)
        self._image(
            first,
            order=1,
            status=PortfolioImage.Status.PENDING,
            approved_key="",
            pending_key="uploads/portfolio/pending.jpg",
        )
        self._image(
            first,
            order=2,
            status=PortfolioImage.Status.REJECTED,
            approved_key="",
            rejected_reason="Rejected by moderation",
        )
        self._set_cover(first, cover)

        hidden = self._item(title="Hidden without approved cover", sort_order=1)
        pending_cover = self._image(
            hidden,
            status=PortfolioImage.Status.PENDING,
            approved_key="",
            pending_key="uploads/portfolio/cover.jpg",
        )
        self._set_cover(hidden, pending_cover)

        self.client.force_authenticate(user=self.visitor)
        response = self.client.get(
            reverse("accounts:dashboard_user_portfolio", args=[self.owner.id])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        payload = response.data[0]
        self.assertEqual(payload["title"], "First")
        self.assertTrue(payload["is_featured"])
        self.assertNotIn("images", payload)
        self.assertNotIn("status", payload["cover_image"])

        # Visitor detail: len approved obrázky, bez owner-only polí.
        detail = self.client.get(
            reverse("accounts:portfolio_detail", args=[first.id])
        )
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(len(detail.data["images"]), 1)
        self.assertNotIn("rejected_reason", detail.data["images"][0])
        self.assertNotIn("status", detail.data["images"][0])

    def test_private_profile_portfolio_is_not_visible_to_visitor(self):
        self.owner.is_public = False
        self.owner.save(update_fields=["is_public"])

        self.client.force_authenticate(user=self.visitor)
        response = self.client.get(
            reverse("accounts:dashboard_user_portfolio", args=[self.owner.id])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_portfolio_detail_hides_item_without_approved_cover_from_visitor(self):
        item = self._item()
        pending_cover = self._image(
            item,
            status=PortfolioImage.Status.PENDING,
            approved_key="",
            pending_key="uploads/portfolio/cover.jpg",
        )
        self._set_cover(item, pending_cover)

        self.client.force_authenticate(user=self.visitor)
        response = self.client.get(reverse("accounts:portfolio_detail", args=[item.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_slug_portfolio_endpoint_returns_public_portfolio(self):
        item = self._item()
        self._set_cover(item, self._image(item))

        self.client.force_authenticate(user=self.visitor)
        response = self.client.get(
            reverse("accounts:dashboard_user_portfolio_by_slug", args=[self.owner.slug])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_related_offer_must_belong_to_portfolio_owner(self):
        other = User.objects.create_user(
            username="other-offer-owner",
            email="other-offer-owner@example.com",
            password="testpass123",
        )
        other_offer = OfferedSkill.objects.create(
            user=other,
            category="Craft",
            subcategory="Painting",
            description="Walls",
        )

        with self.assertRaises(ValidationError):
            self._item(related_offer=other_offer)

    def test_hidden_related_offer_is_not_serialized_for_visitor(self):
        offer = OfferedSkill.objects.create(
            user=self.owner,
            category="Craft",
            subcategory="Painting",
            description="Walls",
            is_hidden=True,
        )
        item = self._item(related_offer=offer)
        self._set_cover(item, self._image(item))

        self.client.force_authenticate(user=self.visitor)
        visitor_response = self.client.get(
            reverse("accounts:dashboard_user_portfolio", args=[self.owner.id])
        )
        self.assertEqual(visitor_response.status_code, status.HTTP_200_OK)
        self.assertIsNone(visitor_response.data[0]["related_offer"])

        self.client.force_authenticate(user=self.owner)
        owner_response = self.client.get(reverse("accounts:portfolio_list"))
        self.assertEqual(owner_response.status_code, status.HTTP_200_OK)
        self.assertEqual(owner_response.data[0]["related_offer"]["id"], offer.id)

    def test_cover_image_must_belong_to_same_portfolio_item(self):
        first = self._item(title="First")
        first_image = self._image(first)
        second = self._item(title="Second", sort_order=1)

        second.cover_image = first_image

        with self.assertRaises(ValidationError):
            second.save(update_fields=["cover_image", "updated_at"])

    def test_cover_image_is_validated_on_create(self):
        existing = self._item(title="Existing")
        existing_image = self._image(existing)

        with self.assertRaises(ValidationError):
            PortfolioItem.objects.create(
                owner=self.owner,
                title="New item",
                category="Craft",
                cover_image=existing_image,
            )
