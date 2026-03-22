from django.db import migrations


TRIGRAM_INDEX_SQL = (
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS {name} "
    "ON {table} USING gin ({column} gin_trgm_ops)"
)


def create_search_trigram_indexes(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    statements = [
        "CREATE EXTENSION IF NOT EXISTS pg_trgm",
        TRIGRAM_INDEX_SQL.format(
            name="acc_off_skill_loc_trgm_idx",
            table="accounts_offeredskill",
            column="location",
        ),
        TRIGRAM_INDEX_SQL.format(
            name="acc_off_skill_dist_trgm_idx",
            table="accounts_offeredskill",
            column="district",
        ),
        TRIGRAM_INDEX_SQL.format(
            name="acc_user_loc_trgm_idx",
            table="accounts_user",
            column="location",
        ),
        TRIGRAM_INDEX_SQL.format(
            name="acc_user_dist_trgm_idx",
            table="accounts_user",
            column="district",
        ),
    ]

    with schema_editor.connection.cursor() as cursor:
        for statement in statements:
            cursor.execute(statement)


def drop_search_trigram_indexes(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    statements = [
        "DROP INDEX CONCURRENTLY IF EXISTS acc_off_skill_loc_trgm_idx",
        "DROP INDEX CONCURRENTLY IF EXISTS acc_off_skill_dist_trgm_idx",
        "DROP INDEX CONCURRENTLY IF EXISTS acc_user_loc_trgm_idx",
        "DROP INDEX CONCURRENTLY IF EXISTS acc_user_dist_trgm_idx",
    ]

    with schema_editor.connection.cursor() as cursor:
        for statement in statements:
            cursor.execute(statement)


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("accounts", "0052_visibility_defaults_true"),
    ]

    operations = [
        migrations.RunPython(
            create_search_trigram_indexes,
            reverse_code=drop_search_trigram_indexes,
        ),
    ]
