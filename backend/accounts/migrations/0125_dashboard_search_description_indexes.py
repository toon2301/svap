"""Backfill searchable descriptions and index them without a long table lock."""

from django.db import migrations, models, transaction
from django.db.models.functions import Coalesce


BATCH_SIZE = 500
DESCRIPTION_INDEXES = (
    ("acc_dash_skill_proj_desc_trgm_idx", "description"),
    ("acc_dash_skill_proj_detail_trgm_idx", "detailed_description"),
)


def backfill_projection_descriptions(apps, schema_editor):
    """Copy live source text in bounded, row-locked batches on the migrated DB."""
    alias = schema_editor.connection.alias
    Projection = apps.get_model("accounts", "DashboardSkillSearchProjection")
    OfferedSkill = apps.get_model("accounts", "OfferedSkill")
    projections = Projection.objects.using(alias)
    sources = OfferedSkill.objects.using(alias).filter(pk=models.OuterRef("skill_id"))
    upper_pk = projections.order_by("-pk").values_list("pk", flat=True).first()
    if upper_pk is None:
        return

    last_pk = 0
    while True:
        with transaction.atomic(using=alias):
            # Lock only projection rows, then read source text in the subsequent
            # UPDATE's fresh snapshot. Never overwrite a newer edit with text
            # cached in Python before waiting for another writer's row lock.
            batch_ids = list(
                projections.filter(pk__gt=last_pk, pk__lte=upper_pk)
                .order_by("pk")
                .select_for_update()
                .values_list("pk", flat=True)[:BATCH_SIZE]
            )
            if not batch_ids:
                return
            projections.filter(pk__in=batch_ids).update(
                description=Coalesce(
                    models.Subquery(sources.values("description")[:1]),
                    models.Value(""),
                ),
                detailed_description=Coalesce(
                    models.Subquery(sources.values("detailed_description")[:1]),
                    models.Value(""),
                ),
            )
            last_pk = batch_ids[-1]


def _drop_invalid_description_index(cursor, name):
    """Remove an interrupted concurrent build so retrying can create a valid index."""
    cursor.execute(
        "SELECT indisvalid FROM pg_index WHERE indexrelid = to_regclass(%s)",
        [name],
    )
    existing = cursor.fetchone()
    if existing is not None and not existing[0]:
        cursor.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {name}")


def create_description_trigram_indexes(apps, schema_editor):
    """Build PostgreSQL regex-compatible GIN indexes without blocking card writes."""
    if schema_editor.connection.vendor != "postgresql":
        return

    with schema_editor.connection.cursor() as cursor:
        cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public")
        for name, column in DESCRIPTION_INDEXES:
            _drop_invalid_description_index(cursor, name)
            cursor.execute(
                f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {name} "
                "ON accounts_dashboardskillsearchprojection "
                f"USING gin ({column} public.gin_trgm_ops)"
            )


def drop_description_trigram_indexes(apps, schema_editor):
    """Reverse only this migration's indexes, leaving shared extensions intact."""
    if schema_editor.connection.vendor != "postgresql":
        return

    with schema_editor.connection.cursor() as cursor:
        for name, _column in DESCRIPTION_INDEXES:
            cursor.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {name}")


class Migration(migrations.Migration):
    """Use short data transactions followed by PostgreSQL concurrent index builds."""

    atomic = False
    dependencies = [("accounts", "0124_dashboard_search_projection_descriptions")]
    operations = [
        migrations.RunPython(
            backfill_projection_descriptions,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            create_description_trigram_indexes,
            reverse_code=drop_description_trigram_indexes,
        ),
    ]
