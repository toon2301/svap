"""Projection synchronization contracts for searchable descriptions and privacy flags."""

from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase

from accounts import search_projection as projection
from accounts.models import (
    DashboardSkillSearchProjection,
    OfferedSkill,
    OfferedSkillImage,
)

User = get_user_model()


class ProjectionDefaultsTests(SimpleTestCase):
    """Pure projection conversion normalizes optional content without adding data."""

    def _source(self, **overrides):
        """Represent all source fields without touching the database."""
        return SimpleNamespace(
            **{
                "pk": 17,
                "user_id": 23,
                "user": SimpleNamespace(
                    location="OwnerTown",
                    district="OwnerDistrict",
                    is_public=True,
                    is_verified=True,
                    is_active=True,
                    is_staff=True,
                    is_superuser=True,
                ),
                "category": "Craft",
                "subcategory": "Workshop",
                "description": "Short searchable description",
                "detailed_description": "Long searchable description",
                "tags": [" alpha ", "", " beta", "  "],
                "country_code": "SK",
                "district_code": "nitra",
                "location": "CardTown",
                "district": "CardDistrict",
                "is_hidden": True,
                "is_seeking": True,
                "price_from": Decimal("10.50"),
                "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
                **overrides,
            }
        )

    def test_defaults_copy_descriptions_and_all_existing_search_attributes(self):
        """Adding text fields preserves geography, ownership, ranking and visibility."""
        source = self._source()
        self.assertEqual(
            projection.build_dashboard_skill_search_projection_defaults(source),
            {
                "user_id": 23,
                "category": "Craft",
                "subcategory": "Workshop",
                "description": "Short searchable description",
                "detailed_description": "Long searchable description",
                "tags_text": "alpha beta",
                "country_code": "SK",
                "district_code": "nitra",
                "skill_location": "CardTown",
                "skill_district": "CardDistrict",
                "user_location": "OwnerTown",
                "user_district": "OwnerDistrict",
                "user_is_public": True,
                "user_is_verified": True,
                "user_is_active": True,
                "user_is_staff": True,
                "user_is_superuser": True,
                "is_hidden": True,
                "is_seeking": True,
                "price_from": Decimal("10.50"),
                "created_at": source.created_at,
            },
        )

    def test_optional_missing_or_empty_values_have_safe_projection_defaults(self):
        """Historical empty content cannot become a null text or a permissive flag."""
        source = self._source(
            user=SimpleNamespace(),
            description=None,
            detailed_description=None,
            country_code=None,
            district_code=None,
            location=None,
            district=None,
            tags=None,
            is_hidden=False,
            is_seeking=False,
            price_from=None,
        )
        defaults = projection.build_dashboard_skill_search_projection_defaults(source)
        for field in (
            "description",
            "detailed_description",
            "country_code",
            "district_code",
            "skill_location",
            "skill_district",
            "user_location",
            "user_district",
            "tags_text",
        ):
            self.assertEqual(defaults[field], "", field)
        for field in (
            "user_is_public",
            "user_is_verified",
            "user_is_active",
            "user_is_staff",
            "user_is_superuser",
            "is_hidden",
            "is_seeking",
        ):
            self.assertIs(defaults[field], False, field)
        self.assertIsNone(defaults["price_from"])

    def test_tag_conversion_ignores_non_list_containers_and_whitespace(self):
        """Malformed historical tags retain the established conservative behavior."""
        for tags in (None, "alpha", {"alpha": True}, ("alpha",), 1):
            with self.subTest(tags=tags):
                self.assertEqual(projection._tags_to_search_text(tags), "")
        self.assertEqual(projection._tags_to_search_text([]), "")
        self.assertEqual(projection._tags_to_search_text([" ", "alpha ", 2]), "alpha 2")

    def test_bulk_build_handles_empty_iterables_and_preserves_new_text_fields(self):
        """Bulk rebuilds produce unsaved projection objects with the same defaults."""
        self.assertEqual(
            projection.bulk_build_dashboard_skill_search_projection_objects(iter(())),
            [],
        )
        source = self._source()
        rows = projection.bulk_build_dashboard_skill_search_projection_objects(
            iter((source,))
        )
        self.assertEqual(len(rows), 1)
        self.assertIsNone(rows[0].pk)
        self.assertEqual(rows[0].skill_id, source.pk)
        self.assertEqual(rows[0].description, source.description)
        self.assertEqual(rows[0].detailed_description, source.detailed_description)


class ProjectionDescriptionSyncTests(TestCase):
    """All entry points refresh both new text fields, including clearing text."""

    def setUp(self):
        """Create one source card and its normal post-save projection."""
        self.owner = User.objects.create_user(
            username="projection_owner",
            email="projection-owner@example.com",
            password=None,
            is_public=True,
        )
        self.skill = OfferedSkill.objects.create(
            user=self.owner,
            category="Craft",
            subcategory="Workshop",
            description="First short",
            detailed_description="First long",
        )

    def _projection(self):
        """Read the current stored projection rather than a stale Python instance."""
        return DashboardSkillSearchProjection.objects.get(skill_id=self.skill.pk)

    def test_creation_and_partial_saves_copy_and_clear_both_descriptions(self):
        """Post-save synchronization handles existing cards and explicit blank edits."""
        self.assertEqual(self._projection().description, "First short")
        self.assertEqual(self._projection().detailed_description, "First long")
        self.skill.description = "Updated short"
        self.skill.detailed_description = ""
        self.skill.save(update_fields=["description", "detailed_description"])
        self.assertEqual(self._projection().description, "Updated short")
        self.assertEqual(self._projection().detailed_description, "")
        self.skill.description = ""
        self.skill.save(update_fields=["description"])
        self.assertEqual(self._projection().description, "")

    def test_sync_by_id_creates_missing_projection_and_updates_existing_row(self):
        """The repair/rebuild API fetches current source text when only an ID is given."""
        DashboardSkillSearchProjection.objects.filter(skill=self.skill).delete()
        projection.sync_dashboard_skill_search_projection(skill_id=self.skill.pk)
        self.assertEqual(self._projection().description, "First short")
        OfferedSkill.objects.filter(pk=self.skill.pk).update(
            description="Direct edit", detailed_description="Changed long"
        )
        projection.sync_dashboard_skill_search_projection(skill_id=self.skill.pk)
        row = self._projection()
        self.assertEqual(
            (row.description, row.detailed_description), ("Direct edit", "Changed long")
        )

    def test_missing_skill_sync_is_a_noop_or_removes_orphaned_projection(self):
        """No-ID and deleted-source calls cannot create arbitrary projection records."""
        with self.assertNumQueries(0):
            projection.sync_dashboard_skill_search_projection()
        missing_id = self.skill.pk + 10000
        with patch.object(
            DashboardSkillSearchProjection.objects,
            "filter",
            wraps=DashboardSkillSearchProjection.objects.filter,
        ) as filtered:
            projection.sync_dashboard_skill_search_projection(skill_id=missing_id)
            filtered.assert_called_once_with(skill_id=missing_id)
        self.assertEqual(DashboardSkillSearchProjection.objects.count(), 1)

    def test_owner_refresh_by_id_and_instance_retains_description_text(self):
        """Profile edits update visibility without dropping copied card content."""
        self.owner.location = "Nitra"
        self.owner.is_public = False
        self.owner.save(update_fields=["location", "is_public"])
        projection.sync_dashboard_skill_search_projections_for_user(
            user_id=self.owner.pk
        )
        row = self._projection()
        self.assertFalse(row.user_is_public)
        self.assertEqual(row.user_location, "Nitra")
        self.assertEqual(row.description, "First short")
        projection.sync_dashboard_skill_search_projections_for_user(user=self.owner)
        self.assertEqual(self._projection().detailed_description, "First long")

    def test_missing_owner_refresh_does_not_touch_existing_rows(self):
        """Missing IDs and nonexistent owners return safely without a rebuild."""
        with self.assertNumQueries(0):
            projection.sync_dashboard_skill_search_projections_for_user()
        projection.sync_dashboard_skill_search_projections_for_user(
            user_id=self.owner.pk + 10000
        )
        self.assertEqual(self._projection().description, "First short")

    def test_owner_with_no_cards_and_deleted_card_have_no_projection(self):
        """Empty rebuilds and model cascades leave no orphaned searchable text."""
        owner_id = self.owner.pk
        self.skill.delete()
        projection.sync_dashboard_skill_search_projections_for_user(user_id=owner_id)
        self.assertFalse(DashboardSkillSearchProjection.objects.exists())

    def test_model_display_labels_remain_unchanged(self):
        """The schema addition leaves existing model display methods intact."""
        self.assertEqual(
            str(self.skill), f"{self.owner.display_name} - Craft → Workshop"
        )
        self.assertEqual(
            str(self._projection()), f"Search projection pre skill_id={self.skill.id}"
        )
        image = OfferedSkillImage(skill=self.skill)
        self.assertEqual(str(image), f"Obrázok #None pre {self.skill}")
