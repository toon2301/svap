from datetime import timedelta
from decimal import Decimal
from urllib.parse import urlsplit

from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import (
    OfferWatchNotification,
    OfferedSkill,
    UserBlock,
)
from accounts.services.offer_watches import (
    create_offer_watch,
    update_offer_watch,
)


User = get_user_model()
BASE_CATEGORY = "Domácnosť a služby"
BASE_SUBCATEGORY = "Maliarske práce"


class OfferWatchResultsApiTests(APITestCase):
    def setUp(self):
        self.user_counter = 0
        self.watcher = self._create_user("watcher")
        self.client.force_authenticate(user=self.watcher)
        self.watch = self._create_watch()

    def _create_user(self, label, **overrides):
        self.user_counter += 1
        values = {
            "username": f"watch-results-{label}-{self.user_counter}",
            "email": f"watch-results-{label}-{self.user_counter}@example.com",
            "password": "StrongPass123",
            "is_verified": True,
            "is_public": True,
        }
        values.update(overrides)
        return User.objects.create_user(**values)

    def _create_watch(self, *, user=None, **overrides):
        values = {
            "category": BASE_CATEGORY,
            "subcategory": BASE_SUBCATEGORY,
            "is_seeking": False,
            "country_code": "SK",
            "district_code": "",
            "price_min": None,
            "price_max": None,
            "price_currency": "",
        }
        values.update(overrides)
        return create_offer_watch(user=user or self.watcher, **values)

    def _create_offer(self, label, *, owner=None, **overrides):
        values = {
            "category": BASE_CATEGORY,
            "subcategory": BASE_SUBCATEGORY,
            "description": "",
            "detailed_description": "",
            "country_code": "SK",
            "district_code": "nitra",
            "district": "Nitra",
            "is_seeking": False,
            "price_from": None,
            "price_currency": "",
            "price_negotiable": False,
        }
        values.update(overrides)
        return OfferedSkill.objects.create(
            user=owner or self._create_user(label),
            **values,
        )

    @staticmethod
    def _url(watch):
        return reverse("accounts:offer_watch_results", args=[watch.id])

    @staticmethod
    def _relative_url(url):
        parsed = urlsplit(url)
        return f"{parsed.path}?{parsed.query}" if parsed.query else parsed.path

    @staticmethod
    def _result_ids(response):
        return [item["id"] for item in response.data["results"]]

    def test_results_require_authentication_and_only_allow_get(self):
        url = self._url(self.watch)
        post_response = self.client.post(url, {}, format="json")
        self.client.force_authenticate(user=None)
        anonymous_response = self.client.get(url)

        self.assertEqual(post_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(
            anonymous_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_missing_or_foreign_watch_is_hidden_behind_same_404(self):
        foreign_user = self._create_user("foreign")
        foreign_watch = self._create_watch(user=foreign_user)

        foreign_response = self.client.get(self._url(foreign_watch))
        missing_response = self.client.get(
            reverse("accounts:offer_watch_results", args=[999999])
        )

        for response in (foreign_response, missing_response):
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
            self.assertEqual(response.data["code"], "offer_watch_not_found")

    def test_empty_response_has_cursor_contract_and_no_side_effects(self):
        response = self.client.get(self._url(self.watch))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])
        self.assertIsNone(response.data["next"])
        self.assertIsNone(response.data["previous"])
        self.assertEqual(OfferWatchNotification.objects.count(), 0)

    def test_existing_offer_created_before_watch_is_returned_immediately(self):
        owner = self._create_user("older-owner")
        older_offer = self._create_offer("older", owner=owner)
        later_watcher = self._create_user("later-watcher")
        later_watch = self._create_watch(user=later_watcher)
        self.client.force_authenticate(user=later_watcher)

        response = self.client.get(self._url(later_watch))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._result_ids(response), [older_offer.id])
        self.assertEqual(OfferWatchNotification.objects.count(), 0)

    def test_exact_saved_filters_are_authoritative(self):
        matching = self._create_offer("matching")
        self._create_offer("category", category="Remeslá a výroba")
        self._create_offer("subcategory", subcategory="Upratovanie")
        self._create_offer("type", is_seeking=True)
        self._create_offer(
            "country",
            country_code="CZ",
            district_code="brno-mesto",
            district="Brno-město",
        )

        response = self.client.get(self._url(self.watch))

        self.assertEqual(self._result_ids(response), [matching.id])

    def test_district_watch_returns_only_exact_district(self):
        update_offer_watch(
            user=self.watcher,
            watch_id=self.watch.id,
            district_code="nitra",
        )
        nitra = self._create_offer("nitra")
        self._create_offer(
            "bratislava",
            district_code="bratislava-i",
            district="Bratislava I",
        )
        self._create_offer("without-district", district_code="", district="")

        response = self.client.get(self._url(self.watch))

        self.assertEqual(self._result_ids(response), [nitra.id])

    def test_price_range_is_inclusive_and_requires_compatible_fixed_price(self):
        update_offer_watch(
            user=self.watcher,
            watch_id=self.watch.id,
            price_min=Decimal("10.00"),
            price_max=Decimal("100.00"),
            price_currency="€",
        )
        minimum = self._create_offer(
            "minimum",
            price_from=Decimal("10.00"),
            price_currency="€",
        )
        maximum = self._create_offer(
            "maximum",
            price_from=Decimal("100.00"),
            price_currency="€",
        )
        self._create_offer(
            "below",
            price_from=Decimal("9.99"),
            price_currency="€",
        )
        self._create_offer(
            "above",
            price_from=Decimal("100.01"),
            price_currency="€",
        )
        self._create_offer(
            "wrong-currency",
            price_from=Decimal("50.00"),
            price_currency="$",
        )
        self._create_offer("without-price")
        self._create_offer(
            "negotiable",
            price_from=Decimal("50.00"),
            price_currency="€",
            price_negotiable=True,
        )

        response = self.client.get(self._url(self.watch))

        self.assertEqual(set(self._result_ids(response)), {minimum.id, maximum.id})

    def test_visibility_privacy_and_account_rules_are_rechecked_live(self):
        visible = self._create_offer("visible")
        self._create_offer("own", owner=self.watcher)
        self._create_offer("hidden", is_hidden=True)
        self._create_offer(
            "private",
            owner=self._create_user("private-owner", is_public=False),
        )
        self._create_offer(
            "inactive",
            owner=self._create_user("inactive-owner", is_active=False),
        )
        self._create_offer(
            "staff",
            owner=self._create_user("staff-owner", is_staff=True),
        )
        self._create_offer(
            "superuser",
            owner=self._create_user("superuser-owner", is_superuser=True),
        )

        response = self.client.get(self._url(self.watch))

        self.assertEqual(self._result_ids(response), [visible.id])

    def test_blocking_in_either_direction_excludes_offer(self):
        visible = self._create_offer("visible")
        blocked_owner = self._create_user("blocked-owner")
        blocking_owner = self._create_user("blocking-owner")
        self._create_offer("blocked", owner=blocked_owner)
        self._create_offer("blocking", owner=blocking_owner)
        UserBlock.objects.create(blocker=self.watcher, blocked_user=blocked_owner)
        UserBlock.objects.create(blocker=blocking_owner, blocked_user=self.watcher)

        response = self.client.get(self._url(self.watch))

        self.assertEqual(self._result_ids(response), [visible.id])

    def test_cursor_paginates_in_fixed_batches_of_ten_without_duplicates(self):
        offers = [self._create_offer(f"page-{index}") for index in range(23)]
        expected_ids = [offer.id for offer in reversed(offers)]

        first = self.client.get(f"{self._url(self.watch)}?page_size=50")
        second = self.client.get(self._relative_url(first.data["next"]))
        third = self.client.get(self._relative_url(second.data["next"]))

        self.assertEqual(len(first.data["results"]), 10)
        self.assertEqual(len(second.data["results"]), 10)
        self.assertEqual(len(third.data["results"]), 3)
        self.assertIsNone(first.data["previous"])
        self.assertIsNotNone(first.data["next"])
        self.assertIsNotNone(second.data["previous"])
        self.assertIsNone(third.data["next"])
        combined_ids = (
            self._result_ids(first)
            + self._result_ids(second)
            + self._result_ids(third)
        )
        self.assertEqual(combined_ids, expected_ids)
        self.assertEqual(len(combined_ids), len(set(combined_ids)))

    def test_cursor_keeps_deterministic_id_order_for_equal_timestamps(self):
        offers = [self._create_offer(f"same-time-{index}") for index in range(12)]
        shared_time = timezone.now() - timedelta(hours=1)
        OfferedSkill.objects.filter(
            id__in=[offer.id for offer in offers]
        ).update(created_at=shared_time)

        first = self.client.get(self._url(self.watch))
        second = self.client.get(self._relative_url(first.data["next"]))

        self.assertEqual(
            self._result_ids(first) + self._result_ids(second),
            sorted((offer.id for offer in offers), reverse=True),
        )

    def test_refresh_after_hidden_newest_fills_first_batch_with_next_offer(self):
        offers = [self._create_offer(f"hide-{index}") for index in range(11)]
        newest = offers[-1]
        oldest = offers[0]
        before = self.client.get(self._url(self.watch))
        self.assertNotIn(oldest.id, self._result_ids(before))

        newest.is_hidden = True
        newest.save(update_fields=["is_hidden"])
        after = self.client.get(self._url(self.watch))

        self.assertEqual(len(after.data["results"]), 10)
        self.assertNotIn(newest.id, self._result_ids(after))
        self.assertIn(oldest.id, self._result_ids(after))

    def test_offer_edit_hide_publish_and_delete_are_reflected_live(self):
        offer = self._create_offer("mutable")
        self.assertEqual(
            self._result_ids(self.client.get(self._url(self.watch))),
            [offer.id],
        )

        offer.subcategory = "Upratovanie"
        offer.save(update_fields=["subcategory"])
        self.assertEqual(
            self._result_ids(self.client.get(self._url(self.watch))),
            [],
        )

        offer.subcategory = BASE_SUBCATEGORY
        offer.is_hidden = True
        offer.save(update_fields=["subcategory", "is_hidden"])
        self.assertEqual(
            self._result_ids(self.client.get(self._url(self.watch))),
            [],
        )

        offer.is_hidden = False
        offer.save(update_fields=["is_hidden"])
        self.assertEqual(
            self._result_ids(self.client.get(self._url(self.watch))),
            [offer.id],
        )

        offer.delete()
        self.assertEqual(
            self._result_ids(self.client.get(self._url(self.watch))),
            [],
        )

    def test_watch_edit_switches_live_result_set_without_creating_candidates(self):
        painting = self._create_offer("painting")
        cleaning = self._create_offer("cleaning", subcategory="Upratovanie")

        update_offer_watch(
            user=self.watcher,
            watch_id=self.watch.id,
            subcategory="Upratovanie",
        )
        response = self.client.get(self._url(self.watch))

        self.assertEqual(self._result_ids(response), [cleaning.id])
        self.assertNotIn(painting.id, self._result_ids(response))
        self.assertEqual(OfferWatchNotification.objects.count(), 0)

    def test_query_count_does_not_grow_with_number_of_results(self):
        self._create_offer("query-one")
        with CaptureQueriesContext(connection) as single_context:
            single_response = self.client.get(self._url(self.watch))
        for index in range(9):
            self._create_offer(f"query-many-{index}")
        with CaptureQueriesContext(connection) as many_context:
            many_response = self.client.get(self._url(self.watch))

        self.assertEqual(single_response.status_code, status.HTTP_200_OK)
        self.assertEqual(many_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(many_response.data["results"]), 10)
        self.assertLessEqual(len(many_context), len(single_context) + 1)

    def test_malformed_cursor_is_rejected(self):
        response = self.client.get(f"{self._url(self.watch)}?cursor=not-a-cursor")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
