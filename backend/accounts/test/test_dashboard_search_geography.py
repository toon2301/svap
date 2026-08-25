from importlib import import_module
from unittest.mock import patch

from django.apps import apps as django_apps
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import DatabaseError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import DashboardSkillSearchProjection, OfferedSkill


User = get_user_model()


class DashboardSearchGeographyTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.viewer = User.objects.create_user(
            username="geo_viewer",
            email="geo-viewer@example.com",
            password="StrongPass123",
            user_type="individual",
        )
        self.client.force_authenticate(user=self.viewer)
        self.url = reverse("accounts:dashboard_search")
        self.owner_index = 0

    def _create_skill(
        self,
        *,
        country_code="",
        district_code="",
        district="",
        location="",
    ):
        self.owner_index += 1
        owner = User.objects.create_user(
            username=f"geo_owner_{self.owner_index}",
            email=f"geo-owner-{self.owner_index}@example.com",
            password="StrongPass123",
            user_type="individual",
            is_public=True,
        )
        return OfferedSkill.objects.create(
            user=owner,
            category="Painter",
            subcategory="Interiors",
            description="Painting service",
            country_code=country_code,
            district_code=district_code,
            district=district,
            location=location,
            is_hidden=False,
        )

    def _skill_ids(self, **params):
        response = self.client.get(self.url, {"q": "Painter", **params})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return {item["id"] for item in response.data["skills"]}

    def test_country_filter_is_exact_and_never_falls_back_to_global(self):
        sk_skill = self._create_skill(
            country_code="SK",
            district_code="nitra",
            district="Nitra",
        )
        cz_skill = self._create_skill(
            country_code="CZ",
            district_code="hlavni-mesto-praha",
            district="Hlavní město Praha",
        )
        it_skill = self._create_skill(country_code="IT", location="Roma")
        legacy_skill = self._create_skill()

        self.assertEqual(self._skill_ids(country="CZ"), {cz_skill.id})
        self.assertEqual(self._skill_ids(country="IT"), {it_skill.id})
        self.assertEqual(self._skill_ids(country="DE"), set())
        self.assertEqual(
            self._skill_ids(),
            {sk_skill.id, cz_skill.id, it_skill.id, legacy_skill.id},
        )

    def test_district_filter_uses_canonical_code_within_country(self):
        nitra_skill = self._create_skill(
            country_code="SK",
            district_code="nitra",
            district="Nitra",
        )
        self._create_skill(
            country_code="SK",
            district_code="zilina",
            district="Žilina",
        )
        self._create_skill(
            country_code="CZ",
            district_code="nitra",
            district="Nitra",
        )

        self.assertEqual(
            self._skill_ids(country="sk", district_code=" NITRA "),
            {nitra_skill.id},
        )

    def test_invalid_geography_parameters_are_rejected(self):
        invalid_params = (
            {"country": "ZZ"},
            {"country": "USA"},
            {"district_code": "nitra"},
            {"country": "CZ", "district_code": "nitra"},
            {"country": "CZ", "district_code": "valasske-mezirici"},
            {"country": "SK", "district_code": "n" * 81},
        )

        for params in invalid_params:
            with self.subTest(params=params):
                response = self.client.get(self.url, {"q": "Painter", **params})
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(response.data, {"error": "Invalid query parameter."})

    def test_country_filter_does_not_guess_user_country_from_profile_text(self):
        matching_user = User.objects.create_user(
            username="country_profile_match",
            email="country-profile-match@example.com",
            password="StrongPass123",
            user_type="individual",
            is_public=True,
            location="Slovensko",
        )

        response = self.client.get(
            self.url,
            {"q": "country_profile_match", "country": "CZ"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(matching_user.id, {item["id"] for item in response.data["users"]})

    @patch(
        "accounts.views.dashboard_views.search._build_projection_skills_page_qs",
        side_effect=DatabaseError("projection unavailable"),
    )
    def test_legacy_fallback_uses_the_same_exact_country_filter(self, _projection):
        self._create_skill(country_code="SK", district_code="nitra", district="Nitra")
        cz_skill = self._create_skill(
            country_code="CZ",
            district_code="hlavni-mesto-praha",
            district="Hlavní město Praha",
        )

        with self.assertLogs("swaply", level="WARNING"):
            skill_ids = self._skill_ids(country="CZ")

        self.assertEqual(skill_ids, {cz_skill.id})

    def test_projection_syncs_geography_when_skill_changes(self):
        skill = self._create_skill(
            country_code="SK",
            district_code="nitra",
            district="Nitra",
        )
        projection = DashboardSkillSearchProjection.objects.get(skill=skill)
        self.assertEqual(projection.country_code, "SK")
        self.assertEqual(projection.district_code, "nitra")

        skill.country_code = "CZ"
        skill.district_code = "brno-mesto"
        skill.district = "Brno-město"
        skill.save(update_fields=["country_code", "district_code", "district"])

        projection.refresh_from_db()
        self.assertEqual(projection.country_code, "CZ")
        self.assertEqual(projection.district_code, "brno-mesto")

    def test_migration_backfill_copies_existing_skill_geography(self):
        skill = self._create_skill(
            country_code="SK",
            district_code="nitra",
            district="Nitra",
        )
        DashboardSkillSearchProjection.objects.filter(skill=skill).update(
            country_code="",
            district_code="",
        )
        migration = import_module(
            "accounts.migrations.0114_dashboard_search_projection_geography"
        )

        migration.backfill_projection_geography(django_apps, schema_editor=None)

        projection = DashboardSkillSearchProjection.objects.get(skill=skill)
        self.assertEqual(projection.country_code, "SK")
        self.assertEqual(projection.district_code, "nitra")
