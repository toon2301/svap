from django.contrib.auth import get_user_model
from django.urls import reverse
from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import OfferedSkill
from portfolio.models import PortfolioImage, PortfolioItem

User = get_user_model()


class PortfolioCrudApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="portfolio-crud-owner",
            email="portfolio-crud-owner@example.com",
            password="testpass123",
            first_name="Portfolio",
            last_name="Owner",
            user_type="individual",
            is_public=True,
            slug="portfolio-crud-owner",
        )
        self.visitor = User.objects.create_user(
            username="portfolio-crud-visitor",
            email="portfolio-crud-visitor@example.com",
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

    def _payload(self, **overrides):
        data = {
            "title": "Fresh portfolio item",
            "category": "other",
            "description": "Short plain text.",
        }
        data.update(overrides)
        return data

    def test_portfolio_write_endpoints_require_authentication(self):
        item = self._item()

        post_response = self.client.post(
            reverse("accounts:portfolio_list"),
            data=self._payload(),
            format="json",
        )
        patch_response = self.client.patch(
            reverse("accounts:portfolio_detail", args=[item.id]),
            data={"title": "Updated"},
            format="json",
        )
        delete_response = self.client.delete(
            reverse("accounts:portfolio_detail", args=[item.id])
        )

        self.assertEqual(post_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(patch_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(delete_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_portfolio_item_for_current_user(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:portfolio_list"),
            data=self._payload(title="  Trimmed title  "),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = PortfolioItem.objects.get(id=response.data["id"])
        self.assertEqual(item.owner, self.owner)
        self.assertEqual(item.title, "Trimmed title")
        self.assertEqual(item.category, "other")
        self.assertEqual(item.description, "Short plain text.")
        self.assertIsNone(item.cover_image)
        self.assertEqual(item.images.count(), 0)
        self.assertIsNone(response.data["cover_image"])
        self.assertEqual(response.data["images"], [])

    def test_create_portfolio_item_sets_sort_order_server_side(self):
        self._item(sort_order=3)
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:portfolio_list"),
            data=self._payload(sort_order=0),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(
            reverse("accounts:portfolio_list"),
            data=self._payload(title="Next item"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["sort_order"], 4)
        self.assertEqual(
            PortfolioItem.objects.get(id=response.data["id"]).sort_order,
            4,
        )

    def test_create_portfolio_item_requires_title(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:portfolio_list"),
            data={"category": "other", "description": "Text"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("title", response.data)

    def test_create_portfolio_item_rejects_blank_title(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:portfolio_list"),
            data=self._payload(title="   "),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("title", response.data)

    def test_create_portfolio_item_rejects_invalid_category(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:portfolio_list"),
            data=self._payload(category="not-a-real-category"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("category", response.data)

    def test_create_portfolio_item_allows_other_category(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:portfolio_list"),
            data=self._payload(category="  other  "),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["category"], "other")

    def test_create_portfolio_item_allows_blank_description(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:portfolio_list"),
            data=self._payload(description="   "),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["description"], "")

    def test_create_portfolio_item_rejects_html_description(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:portfolio_list"),
            data=self._payload(description="<b>Rich text</b>"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("description", response.data)

    def test_create_portfolio_item_allows_plain_text_punctuation(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:portfolio_list"),
            data=self._payload(
                title="O'Brien; create & share",
                description="It's a portfolio; semicolons are fine.",
            ),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "O'Brien; create & share")
        self.assertEqual(
            response.data["description"],
            "It's a portfolio; semicolons are fine.",
        )

    def test_create_portfolio_item_allows_own_related_offer(self):
        offer = OfferedSkill.objects.create(
            user=self.owner,
            category="Craft",
            subcategory="Painting",
            description="Walls",
        )
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:portfolio_list"),
            data=self._payload(related_offer=offer.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["related_offer"]["id"], offer.id)
        self.assertEqual(
            PortfolioItem.objects.get(id=response.data["id"]).related_offer,
            offer,
        )

    def test_create_portfolio_item_rejects_foreign_related_offer(self):
        offer = OfferedSkill.objects.create(
            user=self.visitor,
            category="Craft",
            subcategory="Painting",
            description="Walls",
        )
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:portfolio_list"),
            data=self._payload(related_offer=offer.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("related_offer", response.data)

    def test_patch_own_portfolio_item_updates_allowed_fields(self):
        offer = OfferedSkill.objects.create(
            user=self.owner,
            category="Craft",
            subcategory="Painting",
            description="Walls",
        )
        item = self._item(sort_order=7)
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            reverse("accounts:portfolio_detail", args=[item.id]),
            data={
                "title": "  Updated item  ",
                "category": "other",
                "description": "  Updated description.  ",
                "related_offer": offer.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.owner, self.owner)
        self.assertEqual(item.sort_order, 7)
        self.assertEqual(item.title, "Updated item")
        self.assertEqual(item.category, "other")
        self.assertEqual(item.description, "Updated description.")
        self.assertEqual(item.related_offer, offer)
        self.assertEqual(response.data["related_offer"]["id"], offer.id)

    def test_patch_related_offer_null_clears_relation(self):
        offer = OfferedSkill.objects.create(
            user=self.owner,
            category="Craft",
            subcategory="Painting",
            description="Walls",
        )
        item = self._item(related_offer=offer)
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            reverse("accounts:portfolio_detail", args=[item.id]),
            data={"related_offer": None},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertIsNone(item.related_offer)
        self.assertIsNone(response.data["related_offer"])

    def test_patch_foreign_portfolio_item_returns_not_found(self):
        item = self._item(title="Original")
        self.client.force_authenticate(user=self.visitor)

        response = self.client.patch(
            reverse("accounts:portfolio_detail", args=[item.id]),
            data={"title": "Visitor update"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        item.refresh_from_db()
        self.assertEqual(item.title, "Original")

    def test_patch_rejects_blocked_fields(self):
        item = self._item(sort_order=2)
        cover = self._image(item)
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            reverse("accounts:portfolio_detail", args=[item.id]),
            data={
                "owner": self.visitor.id,
                "sort_order": 0,
                "cover_image": cover.id,
                "images": [cover.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("owner", response.data)
        self.assertIn("sort_order", response.data)
        self.assertIn("cover_image", response.data)
        self.assertIn("images", response.data)
        item.refresh_from_db()
        self.assertEqual(item.owner, self.owner)
        self.assertEqual(item.sort_order, 2)
        self.assertIsNone(item.cover_image)

    def test_delete_own_portfolio_item_hard_deletes_item_and_images(self):
        item = self._item()
        image = self._image(item)
        self.client.force_authenticate(user=self.owner)

        response = self.client.delete(
            reverse("accounts:portfolio_detail", args=[item.id])
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PortfolioItem.objects.filter(id=item.id).exists())
        self.assertFalse(PortfolioImage.objects.filter(id=image.id).exists())

    def test_delete_own_portfolio_item_deletes_image_storage_keys(self):
        item = self._item()
        image = self._image(
            item,
            approved_key="media/portfolio/approved.webp",
            thumbnail_key="media/portfolio/thumb.webp",
            medium_key="media/portfolio/medium.webp",
            large_key="media/portfolio/large.webp",
            pending_key="uploads/portfolio/pending.jpg",
        )
        self.client.force_authenticate(user=self.owner)

        with patch("portfolio.views.delete_storage_keys") as delete_mock:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.delete(
                    reverse("accounts:portfolio_detail", args=[item.id])
                )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PortfolioImage.objects.filter(id=image.id).exists())
        keys = delete_mock.call_args.args[0]
        self.assertIn("uploads/portfolio/pending.jpg", keys)
        self.assertIn("media/portfolio/thumb.webp", keys)
        self.assertIn("media/portfolio/medium.webp", keys)
        self.assertIn("media/portfolio/large.webp", keys)
        self.assertIn("media/portfolio/approved.webp", keys)

    def test_delete_foreign_portfolio_item_returns_not_found(self):
        item = self._item()
        self.client.force_authenticate(user=self.visitor)

        response = self.client.delete(
            reverse("accounts:portfolio_detail", args=[item.id])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(PortfolioItem.objects.filter(id=item.id).exists())

    def test_owner_list_includes_portfolio_item_without_images(self):
        self._item(title="No photos yet")

        self.client.force_authenticate(user=self.owner)
        response = self.client.get(reverse("accounts:portfolio_list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "No photos yet")
        self.assertIsNone(response.data[0]["cover_image"])
        self.assertEqual(response.data[0]["images"], [])

    def test_visitor_list_hides_portfolio_item_without_approved_cover(self):
        self._item(title="No public cover")

        self.client.force_authenticate(user=self.visitor)
        response = self.client.get(
            reverse("accounts:dashboard_user_portfolio", args=[self.owner.id])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
