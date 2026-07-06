from django.db import migrations


# Expression GIN trigram indexy nad immutable_unaccent(lower(col)) – akcelerujú
# accent-insensitive `unaccent_lower__contains` (ILIKE) dotazy vo verejnom searchi.
EXPRESSION_INDEX_SQL = (
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS {name} "
    "ON {table} USING gin (immutable_unaccent(lower({column})) gin_trgm_ops)"
)

# (index_name, table, column)
_EXPRESSION_INDEXES = [
    ("acc_off_skill_cat_ua_idx", "accounts_offeredskill", "category"),
    ("acc_off_skill_subcat_ua_idx", "accounts_offeredskill", "subcategory"),
    ("acc_off_skill_desc_ua_idx", "accounts_offeredskill", "description"),
    ("acc_user_first_name_ua_idx", "accounts_user", "first_name"),
    ("acc_user_last_name_ua_idx", "accounts_user", "last_name"),
    ("acc_user_username_ua_idx", "accounts_user", "username"),
    ("acc_user_company_name_ua_idx", "accounts_user", "company_name"),
    ("acc_user_slug_ua_idx", "accounts_user", "slug"),
]

# IMMUTABLE wrapper nad unaccent: built-in unaccent(text) je len STABLE, a na STABLE
# funkcii nemožno postaviť index. 2-argumentová forma unaccent('unaccent', $1) s
# explicitným slovníkom je deterministická, takže wrapper smie byť IMMUTABLE.
CREATE_IMMUTABLE_UNACCENT_SQL = (
    "CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text "
    "LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT "
    "AS $$ SELECT unaccent('unaccent', $1) $$"
)


def create_unaccent_search_indexes(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    with schema_editor.connection.cursor() as cursor:
        cursor.execute("CREATE EXTENSION IF NOT EXISTS unaccent")
        cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        cursor.execute(CREATE_IMMUTABLE_UNACCENT_SQL)
        for name, table, column in _EXPRESSION_INDEXES:
            cursor.execute(
                EXPRESSION_INDEX_SQL.format(name=name, table=table, column=column)
            )


def drop_unaccent_search_indexes(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    with schema_editor.connection.cursor() as cursor:
        for name, _table, _column in _EXPRESSION_INDEXES:
            cursor.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {name}")
        # Wrapper dropneme až po indexoch (závisia od neho). Extension neodstraňujeme
        # – môže ju používať iný kód.
        cursor.execute("DROP FUNCTION IF EXISTS immutable_unaccent(text)")


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("accounts", "0085_projection_user_visibility_flags"),
    ]

    operations = [
        migrations.RunPython(
            create_unaccent_search_indexes,
            reverse_code=drop_unaccent_search_indexes,
        ),
    ]
