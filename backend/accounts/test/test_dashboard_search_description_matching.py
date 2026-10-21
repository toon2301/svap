"""Endpoint regressions for description matches in both dashboard search paths."""

from contextlib import nullcontext
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import DatabaseError
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import OfferedSkill, UserBlock
from accounts.search_projection import sync_dashboard_skill_search_projection

User = get_user_model()
TOKEN = "zebramap"


class DashboardDescriptionMatchingTests(APITestCase):
    """Descriptions broaden matching without bypassing existing filters or privacy."""

    def setUp(self):
        """Use only local test records and an authenticated unrelated viewer."""
        cache.clear()
        self.sequence = 0
        self.viewer = self._owner()
        self.client.force_authenticate(user=self.viewer)
        self.url = reverse("accounts:dashboard_search")

    def _owner(self, **overrides):
        """Create an owner with no accidental match in their public profile text."""
        self.sequence += 1
        values = {
            "username": f"description_owner_{self.sequence}",
            "email": f"description-owner-{self.sequence}@example.com",
            "password": None,
            "is_public": True,
            **overrides,
        }
        return User.objects.create_user(**values)

    def _skill(self, *, owner=None, **overrides):
        """Create one card whose default match occurs only in its short description."""
        self.sequence += 1
        return OfferedSkill.objects.create(
            **{
                "user": owner or self._owner(),
                "category": "Craft",
                "subcategory": f"Speciality {self.sequence}",
                "description": f"Service {TOKEN}",
                "detailed_description": "A longer explanation",
                "country_code": "SK",
                "district_code": "nitra",
                "district": "Nitra",
                "location": "",
                "price_from": Decimal("20.00"),
                **overrides,
            }
        )

    def _search(self, *, legacy=False, **params):
        """Exercise the real endpoint, optionally forcing its database fallback."""
        fallback = (
            patch(
                "accounts.views.dashboard_views.search._build_projection_skills_page_qs",
                side_effect=DatabaseError("test projection unavailable"),
            )
            if legacy
            else nullcontext()
        )
        with (
            fallback,
            self.assertLogs("swaply", level="WARNING") if legacy else nullcontext(),
        ):
            response = self.client.get(self.url, {"q": TOKEN, **params})
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def _ids(self, **params):
        """Return card IDs while retaining serializer assertions in the endpoint."""
        return [item["id"] for item in self._search(**params)["skills"]]

    def test_all_existing_fields_and_both_descriptions_remain_searchable(self):
        """A matching row is returned regardless of the supported text field."""
        expected = []
        fields = (
            "category",
            "subcategory",
            "description",
            "detailed_description",
            "location",
            "district",
            "tags",
            "user_location",
            "user_district",
        )
        for field in fields:
            values = {"description": "", "detailed_description": ""}
            if field.startswith("user_"):
                owner = self._owner(**{field.removeprefix("user_"): TOKEN})
                card = self._skill(owner=owner, **values)
            else:
                values[field] = [TOKEN] if field == "tags" else TOKEN
                card = self._skill(**values)
            expected.append(card.id)
        self._skill(description="", detailed_description="")

        for legacy in (False, True):
            with self.subTest(legacy=legacy):
                self.assertCountEqual(self._ids(legacy=legacy), expected)

    def test_description_matching_ignores_case_and_ascii_query_accents(self):
        """The established accent-insensitive pattern applies to each new field."""
        short = self._skill(description="ŽILINA and práca", detailed_description="")
        detailed = self._skill(description="", detailed_description="Žilina workshop")
        self._skill(description="Unrelated", detailed_description="Other work")
        for legacy in (False, True):
            with self.subTest(legacy=legacy):
                self.assertCountEqual(
                    self._ids(q="ziLiNa", legacy=legacy), [short.id, detailed.id]
                )

    def test_regex_and_sql_special_characters_are_literal(self):
        """An expanded description search must not turn user text into regex syntax."""
        literal = "a+b[1].*%_"
        matching = self._skill(description=literal, detailed_description="")
        self._skill(description="aaab1zz other unrelated text", detailed_description="")
        for legacy in (False, True):
            with self.subTest(legacy=legacy):
                self.assertEqual(self._ids(q=literal, legacy=legacy), [matching.id])

    def test_maximum_length_descriptions_are_not_truncated_before_search(self):
        """A match at the end of either supported text limit is still discoverable."""
        short = self._skill(
            description="x" * (150 - len(TOKEN)) + TOKEN,
            detailed_description="",
        )
        detailed = self._skill(
            description="",
            detailed_description="x" * (1000 - len(TOKEN)) + TOKEN,
        )
        for legacy in (False, True):
            with self.subTest(legacy=legacy):
                self.assertCountEqual(self._ids(legacy=legacy), [short.id, detailed.id])

    def test_description_match_respects_type_country_district_and_price(self):
        """All scalar and canonical geography restrictions still narrow new matches."""
        offer = self._skill(price_from=Decimal("10.50"))
        demand = self._skill(is_seeking=True, price_from=Decimal("10.50"))
        self._skill(
            country_code="CZ", district_code="brno-mesto", district="Brno-město"
        )
        self._skill(district_code="zilina", district="Žilina")
        self._skill(price_from=Decimal("10.49"))
        self._skill(price_from=Decimal("10.51"))
        self._skill(price_from=None)
        filters = {
            "country": "sk",
            "district_code": " NITRA ",
            "price_min": "10,50",
            "price_max": "10.50",
        }
        for legacy in (False, True):
            for card_type, expected in (
                ("offer", [offer.id]),
                ("seeking", [demand.id]),
                ("", [demand.id, offer.id]),
            ):
                with self.subTest(legacy=legacy, card_type=card_type):
                    self.assertCountEqual(
                        self._ids(legacy=legacy, offer_type=card_type, **filters),
                        expected,
                    )
            self.assertEqual(self._ids(legacy=legacy, country="IT"), [])

    def test_only_my_location_still_matches_card_or_owner_location(self):
        """Description matches retain the existing OR-based local-area rule."""
        self.viewer.location = "Nitra"
        self.viewer.district = "Nitra"
        self.viewer.save(update_fields=["location", "district"])
        card_location = self._skill(location="Nitra", district="", district_code="")
        card_district = self._skill()
        owner_location = self._skill(
            owner=self._owner(location="Nitra"),
            location="",
            district="",
            district_code="",
        )
        self._skill(location="Brno", district="Brno-město", district_code="brno-mesto")
        for legacy in (False, True):
            with self.subTest(legacy=legacy):
                self.assertCountEqual(
                    self._ids(legacy=legacy, only_my_location="1"),
                    [card_location.id, card_district.id, owner_location.id],
                )

    def test_description_matches_exclude_hidden_private_admin_inactive_and_own_cards(
        self,
    ):
        """No new text match may expose a card excluded by existing visibility rules."""
        public = self._skill()
        self._skill(is_hidden=True)
        self._skill(owner=self.viewer)
        for flags in (
            {"is_public": False},
            {"is_active": False},
            {"is_staff": True},
            {"is_superuser": True},
        ):
            self._skill(owner=self._owner(**flags))
        for legacy in (False, True):
            with self.subTest(legacy=legacy):
                self.assertEqual(self._ids(legacy=legacy), [public.id])

    def test_blocks_in_both_directions_remove_matching_cards(self):
        """The newly matched description does not circumvent either block direction."""
        public = self._skill()
        outgoing = self._skill()
        incoming = self._skill()
        UserBlock.objects.create(blocker=self.viewer, blocked_user=outgoing.user)
        UserBlock.objects.create(blocker=incoming.user, blocked_user=self.viewer)
        for legacy in (False, True):
            with self.subTest(legacy=legacy):
                self.assertEqual(self._ids(legacy=legacy), [public.id])

    def test_serialization_rechecks_visibility_when_projection_is_stale(self):
        """A stale public projection cannot disclose a now-private real card owner."""
        public = self._skill()
        stale = self._skill()
        User.objects.filter(pk=stale.user_id).update(is_public=False)
        self.assertEqual(self._ids(), [public.id])

    def test_multiple_matching_fields_or_terms_do_not_duplicate_cards(self):
        """OR matching across both descriptions produces one card, not joined copies."""
        card = self._skill(
            category=TOKEN,
            description=f"{TOKEN} otherword",
            detailed_description=TOKEN,
            tags=[TOKEN, "otherword"],
        )
        for legacy in (False, True):
            with self.subTest(legacy=legacy):
                self.assertEqual(
                    self._ids(legacy=legacy, q=f"{TOKEN}, otherword"), [card.id]
                )

    def test_existing_ranking_stays_ahead_of_description_only_matches(self):
        """Adding descriptions expands recall without changing established relevance."""
        description = self._skill()
        location = self._skill(location=TOKEN)
        tags = self._skill(tags=[TOKEN])
        category = self._skill(category=TOKEN)
        for legacy in (False, True):
            with self.subTest(legacy=legacy):
                self.assertEqual(
                    self._ids(legacy=legacy),
                    [category.id, tags.id, location.id, description.id],
                )

    def test_description_results_paginate_without_gaps_duplicates_or_exact_count(self):
        """Sentinel pagination preserves complete ordering while avoiding COUNT scans."""
        cards = [self._skill() for _ in range(5)]
        start = timezone.now() - timedelta(days=1)
        for index, card in enumerate(cards):
            OfferedSkill.objects.filter(pk=card.pk).update(
                created_at=start + timedelta(minutes=index)
            )
            sync_dashboard_skill_search_projection(skill_id=card.pk)
        for legacy in (False, True):
            received = []
            for page in range(1, 4):
                data = self._search(legacy=legacy, page=page, per_page=2)
                received.extend(item["id"] for item in data["skills"])
                self.assertEqual(data["pagination"]["has_next_skills"], page < 3)
                self.assertIsNone(data["pagination"]["total_skills"])
            self.assertEqual(received, [card.id for card in reversed(cards)])
            self.assertEqual(len(received), len(set(received)))

    def test_edits_and_clearing_descriptions_change_search_results_immediately(self):
        """Post-save projection sync reflects text changes instead of stale content."""
        card = self._skill()
        self.assertEqual(self._ids(), [card.id])
        card.description = ""
        card.detailed_description = "anotherdescriptiontoken"
        card.save(update_fields=["description", "detailed_description"])
        self.assertEqual(self._ids(), [])
        self.assertEqual(self._ids(q="anotherdescriptiontoken"), [card.id])
        card.detailed_description = ""
        card.save(update_fields=["detailed_description"])
        self.assertEqual(self._ids(q="anotherdescriptiontoken"), [])

    def test_unmatched_descriptions_and_anonymous_requests_do_not_leak_data(self):
        """No-match responses stay empty and the dashboard endpoint stays private."""
        self._skill(description="Unrelated", detailed_description="Different")
        for legacy in (False, True):
            self.assertEqual(self._ids(legacy=legacy), [])
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url, {"q": TOKEN})
        self.assertEqual(response.status_code, 401)
