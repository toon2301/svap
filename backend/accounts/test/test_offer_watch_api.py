from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import OfferWatch, OfferWatchNotification, OfferedSkill
from accounts.services.offer_watches import create_offer_watch


User = get_user_model()


class OfferWatchApiTests(APITestCase):
    def setUp(self):
        self.user = self._create_user("owner")
        self.other = self._create_user("other")
        self.client.force_authenticate(user=self.user)
        self.list_url = reverse("accounts:offer_watches")

    @staticmethod
    def _create_user(suffix):
        return User.objects.create_user(
            username=f"watch-api-{suffix}",
            email=f"watch-api-{suffix}@example.com",
            password="StrongPass123",
            is_verified=True,
        )

    @staticmethod
    def _payload(**overrides):
        payload = {
            "category": "Domácnosť a služby",
            "subcategory": "Maliarske práce",
            "is_seeking": False,
            "country_code": "SK",
            "district_code": "nitra",
            "price_min": "10.00",
            "price_max": "100.00",
            "price_currency": "€",
        }
        payload.update(overrides)
        return payload

    def _create_watch(self, *, user=None, **overrides):
        payload = self._payload(**overrides)
        payload["price_min"] = (
            Decimal(payload["price_min"])
            if payload["price_min"] is not None
            else None
        )
        payload["price_max"] = (
            Decimal(payload["price_max"])
            if payload["price_max"] is not None
            else None
        )
        return create_offer_watch(user=user or self.user, **payload)

    @staticmethod
    def _detail_url(watch):
        return reverse("accounts:offer_watch_detail", args=[watch.id])

    def test_endpoints_require_authentication(self):
        watch = self._create_watch()
        detail_url = self._detail_url(watch)
        self.client.force_authenticate(user=None)

        responses = (
            self.client.get(self.list_url),
            self.client.post(self.list_url, self._payload(), format="json"),
            self.client.get(detail_url),
            self.client.patch(detail_url, {"subcategory": "Upratovanie"}, format="json"),
            self.client.delete(detail_url),
        )

        for response in responses:
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_normalizes_values_and_hides_internal_fields(self):
        response = self.client.post(
            self.list_url,
            self._payload(country_code=" sk ", district_code=" NITRA "),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["country_code"], "SK")
        self.assertEqual(response.data["district_code"], "nitra")
        self.assertEqual(response.data["district_label"], "Nitra")
        self.assertEqual(response.data["price_min"], "10.00")
        self.assertNotIn("user", response.data)
        self.assertNotIn("slot", response.data)
        watch = OfferWatch.objects.get(pk=response.data["id"])
        self.assertEqual(watch.user, self.user)
        self.assertEqual(watch.slot, 1)

    def test_list_contains_only_current_user_watches_in_newest_first_order(self):
        older = self._create_watch(subcategory="Maliarske práce")
        newer = self._create_watch(subcategory="Upratovanie")
        self._create_watch(user=self.other, subcategory="Cudzia karta")

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["id"] for item in response.data],
            [newer.id, older.id],
        )

    def test_create_rejects_internal_and_unknown_fields(self):
        for field, value in (
            ("user", self.other.id),
            ("slot", 5),
            ("created_at", "2020-01-01T00:00:00Z"),
            ("status", "paused"),
        ):
            with self.subTest(field=field):
                response = self.client.post(
                    self.list_url,
                    self._payload(**{field: value}),
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(
                    response.data["code"],
                    "offer_watch_validation_failed",
                )
                self.assertIn(field, response.data)

        self.assertFalse(OfferWatch.objects.filter(user=self.user).exists())

    def test_create_rejects_invalid_filter_combinations(self):
        cases = (
            ({"country_code": "ZZ"}, "country_code"),
            ({"country_code": "CZ", "district_code": "nitra"}, "district_code"),
            ({"price_min": "-1.00"}, "price_min"),
            ({"price_max": "-1.00"}, "price_max"),
            ({"price_min": "101.00", "price_max": "100.00"}, "price_max"),
            ({"price_currency": ""}, "price_currency"),
            ({"price_currency": "EUR"}, "price_currency"),
            ({"category": ""}, "category"),
            ({"subcategory": ""}, "subcategory"),
            ({"category": "a" * 101}, "category"),
            ({"district_code": "a" * 81}, "district_code"),
        )

        for overrides, error_field in cases:
            with self.subTest(overrides=overrides):
                response = self.client.post(
                    self.list_url,
                    self._payload(**overrides),
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(
                    response.data["code"],
                    "offer_watch_validation_failed",
                )
                self.assertIn(error_field, response.data)

        self.assertFalse(OfferWatch.objects.filter(user=self.user).exists())

    def test_create_accepts_country_without_district_registry(self):
        response = self.client.post(
            self.list_url,
            self._payload(
                country_code="IT",
                district_code="",
                price_min=None,
                price_max=None,
                price_currency="",
            ),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["country_code"], "IT")
        self.assertEqual(response.data["district_code"], "")
        self.assertEqual(response.data["district_label"], "")

    def test_duplicate_returns_stable_error_code(self):
        self._create_watch()

        response = self.client.post(
            self.list_url,
            self._payload(country_code=" sk ", district_code="NITRA"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "duplicate_offer_watch")
        self.assertEqual(OfferWatch.objects.filter(user=self.user).count(), 1)

    def test_same_filters_with_different_type_are_allowed(self):
        first = self.client.post(self.list_url, self._payload(), format="json")
        second = self.client.post(
            self.list_url,
            self._payload(is_seeking=True),
            format="json",
        )

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(OfferWatch.objects.filter(user=self.user).count(), 2)

    def test_sixth_watch_returns_stable_limit_error(self):
        for index in range(5):
            self._create_watch(subcategory=f"Podkategória {index}")

        response = self.client.post(
            self.list_url,
            self._payload(subcategory="Šieste sledovanie"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "offer_watch_limit_reached")
        self.assertEqual(OfferWatch.objects.filter(user=self.user).count(), 5)

    def test_detail_returns_owned_watch(self):
        watch = self._create_watch()

        response = self.client.get(self._detail_url(watch))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], watch.id)
        self.assertEqual(response.data["district_label"], "Nitra")

    def test_foreign_watch_is_hidden_for_read_update_and_delete(self):
        foreign_watch = self._create_watch(user=self.other)
        detail_url = self._detail_url(foreign_watch)

        responses = (
            self.client.get(detail_url),
            self.client.patch(
                detail_url,
                {"subcategory": "Zmenená"},
                format="json",
            ),
            self.client.delete(detail_url),
        )

        for response in responses:
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
            self.assertEqual(response.data["code"], "offer_watch_not_found")
        foreign_watch.refresh_from_db()
        self.assertEqual(foreign_watch.subcategory, "Maliarske práce")

    def test_missing_watch_returns_same_not_found_contract(self):
        response = self.client.get(
            reverse("accounts:offer_watch_detail", args=[999999])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["code"], "offer_watch_not_found")

    def test_unsupported_methods_return_method_not_allowed(self):
        watch = self._create_watch()

        responses = (
            self.client.put(
                self._detail_url(watch),
                self._payload(),
                format="json",
            ),
            self.client.delete(self.list_url),
            self.client.post(
                self._detail_url(watch),
                self._payload(),
                format="json",
            ),
        )

        for response in responses:
            self.assertEqual(
                response.status_code,
                status.HTTP_405_METHOD_NOT_ALLOWED,
            )

    def test_partial_update_changes_only_supplied_filter_and_timestamp(self):
        watch = self._create_watch()
        known_past = timezone.now() - timedelta(days=1)
        OfferWatch.objects.filter(pk=watch.pk).update(updated_at=known_past)
        watch.refresh_from_db()
        original_updated_at = watch.updated_at

        response = self.client.patch(
            self._detail_url(watch),
            {"subcategory": "Upratovanie"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        watch.refresh_from_db()
        self.assertEqual(watch.subcategory, "Upratovanie")
        self.assertEqual(watch.category, "Domácnosť a služby")
        self.assertGreater(watch.updated_at, original_updated_at)

    def test_semantic_noop_update_preserves_updated_at(self):
        watch = self._create_watch()
        original_updated_at = watch.updated_at

        response = self.client.patch(
            self._detail_url(watch),
            {"country_code": " sk ", "district_code": "NITRA"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        watch.refresh_from_db()
        self.assertEqual(watch.updated_at, original_updated_at)

    def test_empty_patch_is_rejected_without_changing_watch(self):
        watch = self._create_watch()
        original_updated_at = watch.updated_at

        response = self.client.patch(
            self._detail_url(watch),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["code"],
            "offer_watch_validation_failed",
        )
        watch.refresh_from_db()
        self.assertEqual(watch.updated_at, original_updated_at)

    def test_update_can_clear_district_and_complete_price_filter(self):
        watch = self._create_watch()

        response = self.client.patch(
            self._detail_url(watch),
            {
                "district_code": "",
                "price_min": None,
                "price_max": None,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        watch.refresh_from_db()
        self.assertEqual(watch.district_code, "")
        self.assertIsNone(watch.price_min)
        self.assertIsNone(watch.price_max)
        self.assertEqual(watch.price_currency, "")
        self.assertEqual(response.data["district_label"], "")

    def test_country_change_rejects_stale_district_and_preserves_data(self):
        watch = self._create_watch()
        original_updated_at = watch.updated_at

        response = self.client.patch(
            self._detail_url(watch),
            {"country_code": "CZ"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["code"],
            "offer_watch_validation_failed",
        )
        self.assertIn("district_code", response.data)
        watch.refresh_from_db()
        self.assertEqual(watch.country_code, "SK")
        self.assertEqual(watch.district_code, "nitra")
        self.assertEqual(watch.updated_at, original_updated_at)

    def test_country_and_district_can_be_changed_together(self):
        watch = self._create_watch()

        response = self.client.patch(
            self._detail_url(watch),
            {"country_code": " cz ", "district_code": "Brno město"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        watch.refresh_from_db()
        self.assertEqual(watch.country_code, "CZ")
        self.assertEqual(watch.district_code, "brno-mesto")
        self.assertEqual(response.data["district_label"], "Brno-město")

    def test_update_to_duplicate_is_rejected_and_original_is_preserved(self):
        first = self._create_watch(subcategory="Maliarske práce")
        second = self._create_watch(subcategory="Upratovanie")
        original_updated_at = second.updated_at

        response = self.client.patch(
            self._detail_url(second),
            {"subcategory": first.subcategory},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "duplicate_offer_watch")
        second.refresh_from_db()
        self.assertEqual(second.subcategory, "Upratovanie")
        self.assertEqual(second.updated_at, original_updated_at)

    def test_delete_keeps_candidate_and_clears_its_watch_reference(self):
        watch = self._create_watch()
        offer = OfferedSkill.objects.create(
            user=self.other,
            category=watch.category,
            subcategory=watch.subcategory,
            description="",
            detailed_description="",
            country_code="SK",
            district_code="nitra",
            district="Nitra",
            is_seeking=False,
        )
        candidate = OfferWatchNotification.objects.create(
            user=self.user,
            watch=watch,
            offer=offer,
        )

        response = self.client.delete(self._detail_url(watch))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(OfferWatch.objects.filter(pk=watch.pk).exists())
        candidate.refresh_from_db()
        self.assertIsNone(candidate.watch_id)
        self.assertEqual(candidate.offer_id, offer.id)

    def test_deleted_slot_is_reused_by_next_create(self):
        first = self._create_watch(subcategory="Prvá")
        second = self._create_watch(subcategory="Druhá")
        self.client.delete(self._detail_url(first))

        response = self.client.post(
            self.list_url,
            self._payload(subcategory="Tretia"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = OfferWatch.objects.get(pk=response.data["id"])
        self.assertEqual(created.slot, 1)
        self.assertEqual(second.slot, 2)
