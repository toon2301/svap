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

    def test_create_portfolio_item_enforces_max_items_cap(self):
        self.client.force_authenticate(user=self.owner)
        # Strop znížime cez patch, aby test nemusel vytvárať 15 položiek.
        with patch("portfolio.views.MAX_PORTFOLIO_ITEMS", 2):
            for _ in range(2):
                ok = self.client.post(
                    reverse("accounts:portfolio_list"),
                    data=self._payload(),
                    format="json",
                )
                self.assertEqual(ok.status_code, status.HTTP_201_CREATED)

            over = self.client.post(
                reverse("accounts:portfolio_list"),
                data=self._payload(),
                format="json",
            )

        self.assertEqual(over.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", over.data)
        # Stabilný kód pre FE preklady (text v `error` je len fallback).
        self.assertEqual(over.data.get("code"), "portfolio_items_limit_reached")
        # Cudzí používateľ má vlastný strop (počet sa počíta per owner).
        self.assertEqual(PortfolioItem.objects.filter(owner=self.owner).count(), 2)

    def test_create_portfolio_item_cap_recheck_runs_under_owner_lock(self):
        """Regresia TOCTOU: súbežný create nesmie prekročiť strop.

        Race simulujeme deterministicky – "konkurenčný" request commitne položku
        medzi fail-fast checkom a získaním zámku. Re-check pod zámkom ju musí
        vidieť a request odmietnuť (namiesto vytvorenia položky nad limit).
        """
        self.client.force_authenticate(user=self.owner)

        from portfolio import views as portfolio_views

        original_lock = portfolio_views.lock_portfolio_owner

        def lock_then_simulate_concurrent_insert(user):
            original_lock(user)
            # Simulácia requestu, ktorý vyhral race (vložil položku skôr).
            self._item(title="Concurrent winner", sort_order=50)

        with patch("portfolio.views.MAX_PORTFOLIO_ITEMS", 1), patch(
            "portfolio.views.lock_portfolio_owner",
            side_effect=lock_then_simulate_concurrent_insert,
        ):
            response = self.client.post(
                reverse("accounts:portfolio_list"),
                data=self._payload(),
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        # Limit ostal dodržaný – existuje len položka "konkurenčného" requestu.
        self.assertEqual(
            PortfolioItem.objects.filter(owner=self.owner).count(), 1
        )

    def test_create_portfolio_item_cap_is_per_user(self):
        self.client.force_authenticate(user=self.owner)
        with patch("portfolio.views.MAX_PORTFOLIO_ITEMS", 1):
            first = self.client.post(
                reverse("accounts:portfolio_list"),
                data=self._payload(),
                format="json",
            )
            self.assertEqual(first.status_code, status.HTTP_201_CREATED)

            self.client.force_authenticate(user=self.visitor)
            # Iný používateľ nie je ovplyvnený stropom vlastníka.
            other = self.client.post(
                reverse("accounts:portfolio_list"),
                data=self._payload(),
                format="json",
            )
            self.assertEqual(other.status_code, status.HTTP_201_CREATED)

    def test_error_responses_carry_stable_codes_for_fe_translation(self):
        """`code`/`codes` sú additívne kľúče – pôvodný tvar odpovede sa nemení."""
        self.client.force_authenticate(user=self.owner)

        # Field validácia: kódy v additívnej mape `codes`, texty ostávajú.
        invalid = self.client.post(
            reverse("accounts:portfolio_list"),
            data=self._payload(
                title="<b>HTML</b>", category="not-a-real-category"
            ),
            format="json",
        )
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invalid.data["codes"]["title"], ["html_not_allowed"])
        self.assertEqual(invalid.data["codes"]["category"], ["invalid_category"])
        # Spätná kompatibilita: field -> [text] tvar nezmenený.
        self.assertIsInstance(invalid.data["title"], list)
        self.assertIn("HTML", str(invalid.data["title"][0]))

        # 404 s kódom.
        missing = self.client.get(
            reverse("accounts:portfolio_detail", args=[999999])
        )
        self.assertEqual(missing.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(missing.data.get("code"), "portfolio_item_not_found")
        self.assertIn("error", missing.data)

    def test_create_portfolio_item_rejects_description_over_500_chars(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:portfolio_list"),
            data=self._payload(description="x" * 501),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("description", response.data)

    def test_create_portfolio_item_accepts_description_at_500_chars(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            reverse("accounts:portfolio_list"),
            data=self._payload(description="x" * 500),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = PortfolioItem.objects.get(id=response.data["id"])
        self.assertEqual(len(item.description), 500)

    def test_delete_item_compacts_sort_order_of_remaining_items(self):
        first = self._item(title="First", sort_order=0)
        second = self._item(title="Second", sort_order=1)
        third = self._item(title="Third", sort_order=2)
        fourth = self._item(title="Fourth", sort_order=3)
        self.client.force_authenticate(user=self.owner)

        response = self.client.delete(
            reverse("accounts:portfolio_detail", args=[second.id])
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        remaining = list(
            PortfolioItem.objects.filter(owner=self.owner)
            .order_by("sort_order", "id")
            .values_list("id", "sort_order")
        )
        # Žiadne diery: poradie sa prečísluje na 0..n-1 so zachovaným poradím.
        self.assertEqual(
            remaining,
            [(first.id, 0), (third.id, 1), (fourth.id, 2)],
        )

    def test_reorder_works_after_delete_renumbering(self):
        first = self._item(title="First", sort_order=0)
        second = self._item(title="Second", sort_order=1)
        third = self._item(title="Third", sort_order=2)
        self.client.force_authenticate(user=self.owner)

        delete_response = self.client.delete(
            reverse("accounts:portfolio_detail", args=[second.id])
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        reorder_response = self.client.patch(
            reverse("accounts:portfolio_reorder"),
            data={"item_ids": [third.id, first.id]},
            format="json",
        )

        self.assertEqual(reorder_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            list(
                PortfolioItem.objects.filter(owner=self.owner)
                .order_by("sort_order", "id")
                .values_list("id", flat=True)
            ),
            [third.id, first.id],
        )

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

    def test_reorder_portfolio_items_updates_sort_order_and_featured(self):
        first = self._item(title="First", sort_order=0)
        second = self._item(title="Second", sort_order=1)
        third = self._item(title="Third", sort_order=2)
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            reverse("accounts:portfolio_reorder"),
            data={"item_ids": [third.id, first.id, second.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            list(
                PortfolioItem.objects.filter(owner=self.owner)
                .order_by("sort_order")
                .values_list("id", flat=True)
            ),
            [third.id, first.id, second.id],
        )
        self.assertEqual([item["id"] for item in response.data], [third.id, first.id, second.id])
        self.assertTrue(response.data[0]["is_featured"])
        self.assertFalse(response.data[1]["is_featured"])

    def test_reorder_portfolio_items_rejects_bad_duplicate_and_foreign_ids(self):
        first = self._item(title="First", sort_order=0)
        second = self._item(title="Second", sort_order=1)
        foreign = PortfolioItem.objects.create(
            owner=self.visitor,
            title="Foreign",
            category="other",
            description="",
            sort_order=0,
        )
        self.client.force_authenticate(user=self.owner)

        missing_response = self.client.patch(
            reverse("accounts:portfolio_reorder"),
            data={"item_ids": [second.id]},
            format="json",
        )
        duplicate_response = self.client.patch(
            reverse("accounts:portfolio_reorder"),
            data={"item_ids": [first.id, first.id]},
            format="json",
        )
        foreign_response = self.client.patch(
            reverse("accounts:portfolio_reorder"),
            data={"item_ids": [first.id, foreign.id]},
            format="json",
        )

        self.assertEqual(missing_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(duplicate_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(foreign_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            list(
                PortfolioItem.objects.filter(owner=self.owner)
                .order_by("sort_order")
                .values_list("id", flat=True)
            ),
            [first.id, second.id],
        )

    def test_owner_list_includes_portfolio_item_without_images(self):
        self._item(title="No photos yet")

        self.client.force_authenticate(user=self.owner)
        response = self.client.get(reverse("accounts:portfolio_list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "No photos yet")
        self.assertIsNone(response.data[0]["cover_image"])
        # List payload obrázky nenesie (grid číta len cover_image; detail má
        # vlastný fetch) – kľúč `images` v list odpovedi neexistuje.
        self.assertNotIn("images", response.data[0])

    def test_visitor_list_hides_portfolio_item_without_approved_cover(self):
        self._item(title="No public cover")

        self.client.force_authenticate(user=self.visitor)
        response = self.client.get(
            reverse("accounts:dashboard_user_portfolio", args=[self.owner.id])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
