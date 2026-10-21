"""Historical backfill and backend-specific index contracts for search text."""

from importlib import import_module
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.db import connection
from django.db.migrations.loader import MigrationLoader
from django.db.models import QuerySet
from django.test import SimpleTestCase, TestCase
from django.test.utils import CaptureQueriesContext

from accounts.models import DashboardSkillSearchProjection, OfferedSkill
from accounts.search_projection import (
    bulk_build_dashboard_skill_search_projection_objects,
)

User = get_user_model()
schema_migration = import_module(
    "accounts.migrations.0124_dashboard_search_projection_descriptions"
)
data_migration = import_module(
    "accounts.migrations.0125_dashboard_search_description_indexes"
)


class SearchDescriptionMigrationContractTests(SimpleTestCase):
    """Concurrent PostgreSQL DDL must be retryable and a safe no-op on SQLite."""

    def _editor(self, vendor="postgresql"):
        """Supply a nonexecuting database cursor to inspect backend-specific SQL."""
        database = MagicMock(vendor=vendor, alias="migration_alias")
        cursor = database.cursor.return_value.__enter__.return_value
        cursor.fetchone.return_value = None
        return SimpleNamespace(connection=database), cursor

    def test_schema_and_data_work_are_separate_with_bounded_nullable_safe_text(self):
        """The short schema transaction commits before resumable data/index work."""
        self.assertTrue(schema_migration.Migration.atomic)
        self.assertFalse(data_migration.Migration.atomic)
        self.assertEqual(
            data_migration.Migration.dependencies,
            [("accounts", "0124_dashboard_search_projection_descriptions")],
        )
        fields = {
            operation.name: operation.field
            for operation in schema_migration.Migration.operations
        }
        self.assertEqual(set(fields), {"description", "detailed_description"})
        for field_name, max_length in (
            ("description", 150),
            ("detailed_description", 1000),
        ):
            self.assertEqual(fields[field_name].max_length, max_length)
            self.assertEqual(fields[field_name].default, "")
            self.assertTrue(fields[field_name].blank)
            self.assertFalse(fields[field_name].null)
        self.assertEqual(data_migration.BATCH_SIZE, 500)

    def test_postgresql_builds_only_two_concurrent_projection_trigram_indexes(self):
        """The description predicates get GIN indexes without indexing unrelated tables."""
        editor, cursor = self._editor()
        data_migration.create_description_trigram_indexes(None, editor)
        sql = [call.args[0] for call in cursor.execute.call_args_list]
        self.assertIn("CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public", sql)
        creates = [query for query in sql if query.startswith("CREATE INDEX")]
        self.assertEqual(len(creates), 2)
        for name, column in data_migration.DESCRIPTION_INDEXES:
            self.assertIn(
                f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {name} "
                f"ON accounts_dashboardskillsearchprojection USING gin ({column} public.gin_trgm_ops)",
                creates,
            )
        self.assertFalse(any("accounts_offeredskill" in query for query in sql))

    def test_invalid_interrupted_indexes_are_removed_before_rebuilding(self):
        """A retry repairs PostgreSQL's invalid leftover instead of silently skipping it."""
        editor, cursor = self._editor()
        cursor.fetchone.side_effect = [(False,), (True,)]
        data_migration.create_description_trigram_indexes(None, editor)
        sql = [call.args[0] for call in cursor.execute.call_args_list]
        invalid_name = data_migration.DESCRIPTION_INDEXES[0][0]
        valid_name = data_migration.DESCRIPTION_INDEXES[1][0]
        self.assertIn(f"DROP INDEX CONCURRENTLY IF EXISTS {invalid_name}", sql)
        self.assertNotIn(f"DROP INDEX CONCURRENTLY IF EXISTS {valid_name}", sql)
        self.assertLess(
            sql.index(f"DROP INDEX CONCURRENTLY IF EXISTS {invalid_name}"),
            next(
                index
                for index, query in enumerate(sql)
                if query.startswith("CREATE INDEX") and invalid_name in query
            ),
        )

    def test_reverse_drops_only_owned_indexes_and_preserves_shared_extension(self):
        """Rolling back must not remove pg_trgm used by other search migrations."""
        editor, cursor = self._editor()
        data_migration.drop_description_trigram_indexes(None, editor)
        self.assertEqual(
            [call.args[0] for call in cursor.execute.call_args_list],
            [
                f"DROP INDEX CONCURRENTLY IF EXISTS {name}"
                for name, _column in data_migration.DESCRIPTION_INDEXES
            ],
        )

    def test_sqlite_and_other_backends_never_execute_postgresql_ddl(self):
        """Local/test databases are not asked to create extensions or concurrent indexes."""
        for vendor in ("sqlite", "mysql"):
            editor, _cursor = self._editor(vendor)
            data_migration.create_description_trigram_indexes(None, editor)
            data_migration.drop_description_trigram_indexes(None, editor)
            editor.connection.cursor.assert_not_called()

    def test_backfill_uses_only_supplied_historical_models_on_selected_database(self):
        """Database routers cannot redirect a historical migration into the default DB."""
        historical_projection = MagicMock()
        historical_source = MagicMock()
        apps = MagicMock()
        apps.get_model.side_effect = [historical_projection, historical_source]
        queryset = historical_projection.objects.using.return_value
        queryset.order_by.return_value.values_list.return_value.first.return_value = (
            None
        )
        editor, _cursor = self._editor("sqlite")
        data_migration.backfill_projection_descriptions(apps, editor)
        self.assertEqual(
            apps.get_model.call_args_list[0].args,
            ("accounts", "DashboardSkillSearchProjection"),
        )
        self.assertEqual(
            apps.get_model.call_args_list[1].args, ("accounts", "OfferedSkill")
        )
        historical_projection.objects.using.assert_called_once_with("migration_alias")
        historical_source.objects.using.assert_called_once_with("migration_alias")


class SearchDescriptionBackfillTests(TestCase):
    """Execute the data operation against historical model classes and an isolated DB."""

    @classmethod
    def setUpClass(cls):
        """Load historical state without migrating or changing the test schema."""
        super().setUpClass()
        cls.historical_apps = (
            MigrationLoader(connection)
            .project_state(
                [("accounts", "0124_dashboard_search_projection_descriptions")]
            )
            .apps
        )

    @classmethod
    def setUpTestData(cls):
        """Create only reusable fixture records inside Django's data isolation."""
        cls.owner = User.objects.create_user(
            username="backfill_owner",
            email="backfill-owner@example.com",
            password=None,
            is_public=True,
        )

    def _backfill(self):
        """Run exactly the real migration callable against its selected connection."""
        data_migration.backfill_projection_descriptions(
            self.historical_apps, SimpleNamespace(connection=connection)
        )

    def _cards(self, count):
        """Bulk-create sources and stale projections, avoiding fixture signal noise."""
        cards = OfferedSkill.objects.bulk_create(
            [
                OfferedSkill(
                    user=self.owner,
                    category="Craft",
                    subcategory=f"Backfill {index}",
                    description=f"Short {index}",
                    detailed_description=f"Long {index}",
                    country_code="SK",
                    district_code="nitra",
                )
                for index in range(count)
            ]
        )
        rows = bulk_build_dashboard_skill_search_projection_objects(cards)
        for row in rows:
            row.description = "Old short"
            row.detailed_description = "Old long"
        DashboardSkillSearchProjection.objects.bulk_create(rows)
        return cards

    def test_empty_projection_table_finishes_without_updates(self):
        """An empty deployment does not enter the batching loop or issue data writes."""
        with CaptureQueriesContext(connection) as captured:
            self._backfill()
        self.assertEqual(len(captured), 1)
        self.assertFalse(DashboardSkillSearchProjection.objects.exists())

    def test_backfill_copies_every_row_across_batch_boundary_and_preserves_other_fields(
        self,
    ):
        """The row beyond batch 500 is processed, with no source N+1 or lost geography."""
        cards = self._cards(501)
        with CaptureQueriesContext(connection) as captured:
            self._backfill()
        actual = dict(
            DashboardSkillSearchProjection.objects.values_list(
                "skill_id", "description"
            )
        )
        self.assertEqual(actual, {card.pk: card.description for card in cards})
        self.assertEqual(
            dict(
                DashboardSkillSearchProjection.objects.values_list(
                    "skill_id", "detailed_description"
                )
            ),
            {card.pk: card.detailed_description for card in cards},
        )
        self.assertFalse(
            DashboardSkillSearchProjection.objects.exclude(
                country_code="SK", district_code="nitra"
            ).exists()
        )
        updates = [item["sql"] for item in captured if item["sql"].startswith("UPDATE")]
        self.assertEqual(len(updates), 2)
        self.assertTrue(all("SELECT" in query for query in updates))
        self.assertLess(len(captured), 20)

    def test_backfill_handles_pk_gaps_blank_text_and_repeat_runs(self):
        """Keyset traversal and reruns work after deletions and explicit text clearing."""
        cards = self._cards(3)
        cards[1].delete()
        OfferedSkill.objects.filter(pk=cards[0].pk).update(
            description="", detailed_description=""
        )
        self._backfill()
        self._backfill()
        self.assertEqual(DashboardSkillSearchProjection.objects.count(), 2)
        row = DashboardSkillSearchProjection.objects.get(skill_id=cards[0].pk)
        self.assertEqual((row.description, row.detailed_description), ("", ""))
        row = DashboardSkillSearchProjection.objects.get(skill_id=cards[2].pk)
        self.assertEqual(
            (row.description, row.detailed_description), ("Short 2", "Long 2")
        )

    def test_source_changes_before_batch_selection_are_read_from_live_sql(self):
        """The UPDATE reads live source text, not a Python snapshot loaded before locking."""
        card = self._cards(1)[0]
        historical_projection = self.historical_apps.get_model(
            "accounts", "DashboardSkillSearchProjection"
        )
        original = QuerySet.select_for_update
        changed = []

        def change_source_before_selection(queryset, *args, **kwargs):
            """Deterministically simulate an edit just before taking a batch row lock."""
            if queryset.model is historical_projection and not changed:
                OfferedSkill.objects.filter(pk=card.pk).update(
                    description="Newest short", detailed_description="Newest long"
                )
                changed.append(True)
            return original(queryset, *args, **kwargs)

        with patch.object(
            QuerySet, "select_for_update", change_source_before_selection
        ):
            self._backfill()
        row = DashboardSkillSearchProjection.objects.get(skill_id=card.pk)
        self.assertEqual(
            (row.description, row.detailed_description), ("Newest short", "Newest long")
        )
