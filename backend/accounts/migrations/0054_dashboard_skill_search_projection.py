from django.db import migrations, models


TRIGRAM_INDEX_SQL = (
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS {name} "
    "ON {table} USING gin ({column} gin_trgm_ops)"
)


def _tags_to_search_text(tags):
    if not isinstance(tags, list):
        return ""
    return " ".join(str(tag).strip() for tag in tags if str(tag).strip())


def backfill_dashboard_skill_search_projection(apps, schema_editor):
    OfferedSkill = apps.get_model("accounts", "OfferedSkill")
    Projection = apps.get_model("accounts", "DashboardSkillSearchProjection")

    batch = []
    for skill in OfferedSkill.objects.select_related("user").all().iterator(chunk_size=500):
        user = skill.user
        batch.append(
            Projection(
                skill_id=skill.pk,
                user_id=skill.user_id,
                category=skill.category,
                subcategory=skill.subcategory,
                tags_text=_tags_to_search_text(skill.tags),
                skill_location=skill.location or "",
                skill_district=skill.district or "",
                user_location=getattr(user, "location", "") or "",
                user_district=getattr(user, "district", "") or "",
                user_is_public=bool(getattr(user, "is_public", False)),
                user_is_verified=bool(getattr(user, "is_verified", False)),
                is_hidden=bool(skill.is_hidden),
                is_seeking=bool(skill.is_seeking),
                price_from=skill.price_from,
                created_at=skill.created_at,
            )
        )
        if len(batch) >= 500:
            Projection.objects.bulk_create(batch, batch_size=500, ignore_conflicts=True)
            batch = []

    if batch:
        Projection.objects.bulk_create(batch, batch_size=500, ignore_conflicts=True)


def create_projection_trigram_indexes(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    statements = [
        "CREATE EXTENSION IF NOT EXISTS pg_trgm",
        TRIGRAM_INDEX_SQL.format(
            name="acc_dash_skill_proj_cat_trgm_idx",
            table="accounts_dashboardskillsearchprojection",
            column="category",
        ),
        TRIGRAM_INDEX_SQL.format(
            name="acc_dash_skill_proj_subcat_trgm_idx",
            table="accounts_dashboardskillsearchprojection",
            column="subcategory",
        ),
        TRIGRAM_INDEX_SQL.format(
            name="acc_dash_skill_proj_tags_trgm_idx",
            table="accounts_dashboardskillsearchprojection",
            column="tags_text",
        ),
        TRIGRAM_INDEX_SQL.format(
            name="acc_dash_skill_proj_sloc_trgm_idx",
            table="accounts_dashboardskillsearchprojection",
            column="skill_location",
        ),
        TRIGRAM_INDEX_SQL.format(
            name="acc_dash_skill_proj_sdist_trgm_idx",
            table="accounts_dashboardskillsearchprojection",
            column="skill_district",
        ),
        TRIGRAM_INDEX_SQL.format(
            name="acc_dash_skill_proj_uloc_trgm_idx",
            table="accounts_dashboardskillsearchprojection",
            column="user_location",
        ),
        TRIGRAM_INDEX_SQL.format(
            name="acc_dash_skill_proj_udist_trgm_idx",
            table="accounts_dashboardskillsearchprojection",
            column="user_district",
        ),
    ]

    with schema_editor.connection.cursor() as cursor:
        for statement in statements:
            cursor.execute(statement)


def drop_projection_trigram_indexes(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    statements = [
        "DROP INDEX CONCURRENTLY IF EXISTS acc_dash_skill_proj_cat_trgm_idx",
        "DROP INDEX CONCURRENTLY IF EXISTS acc_dash_skill_proj_subcat_trgm_idx",
        "DROP INDEX CONCURRENTLY IF EXISTS acc_dash_skill_proj_tags_trgm_idx",
        "DROP INDEX CONCURRENTLY IF EXISTS acc_dash_skill_proj_sloc_trgm_idx",
        "DROP INDEX CONCURRENTLY IF EXISTS acc_dash_skill_proj_sdist_trgm_idx",
        "DROP INDEX CONCURRENTLY IF EXISTS acc_dash_skill_proj_uloc_trgm_idx",
        "DROP INDEX CONCURRENTLY IF EXISTS acc_dash_skill_proj_udist_trgm_idx",
    ]

    with schema_editor.connection.cursor() as cursor:
        for statement in statements:
            cursor.execute(statement)


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("accounts", "0053_add_search_trigram_indexes"),
    ]

    operations = [
        migrations.CreateModel(
            name="DashboardSkillSearchProjection",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("category", models.CharField(max_length=100, verbose_name="KategÃ³ria")),
                ("subcategory", models.CharField(max_length=100, verbose_name="PodkategÃ³ria")),
                (
                    "tags_text",
                    models.TextField(
                        blank=True,
                        default="",
                        verbose_name="Tagy pre vyhÄ¾adÃ¡vanie",
                    ),
                ),
                (
                    "skill_location",
                    models.CharField(
                        blank=True,
                        max_length=35,
                        verbose_name="Miesto zruÄnosti",
                    ),
                ),
                (
                    "skill_district",
                    models.CharField(
                        blank=True,
                        max_length=100,
                        verbose_name="Okres zruÄnosti",
                    ),
                ),
                (
                    "user_location",
                    models.CharField(
                        blank=True,
                        max_length=25,
                        verbose_name="Lokalita pouÅ¾Ã­vateÄ¾a",
                    ),
                ),
                (
                    "user_district",
                    models.CharField(
                        blank=True,
                        max_length=100,
                        verbose_name="Okres pouÅ¾Ã­vateÄ¾a",
                    ),
                ),
                ("user_is_public", models.BooleanField(default=True, verbose_name="VerejnÃ½ profil")),
                ("user_is_verified", models.BooleanField(default=False, verbose_name="OverenÃ½ profil")),
                ("is_hidden", models.BooleanField(default=False, verbose_name="SkrytÃ¡ zruÄnosÅ¥")),
                ("is_seeking", models.BooleanField(default=False, verbose_name="HÄ¾adÃ¡m")),
                (
                    "price_from",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        max_digits=10,
                        null=True,
                        verbose_name="Cena od",
                    ),
                ),
                ("created_at", models.DateTimeField(verbose_name="VytvorenÃ©")),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="AktualizovanÃ©"),
                ),
                (
                    "skill",
                    models.OneToOneField(
                        on_delete=models.deletion.CASCADE,
                        related_name="dashboard_search_projection",
                        to="accounts.offeredskill",
                        verbose_name="ZruÄnosÅ¥",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="dashboard_skill_search_projections",
                        to="accounts.user",
                        verbose_name="PouÅ¾Ã­vateÄ¾",
                    ),
                ),
            ],
            options={
                "verbose_name": "Dashboard search projekcia zruÄnosti",
                "verbose_name_plural": "Dashboard search projekcie zruÄnostÃ­",
                "indexes": [
                    models.Index(
                        fields=["is_hidden", "user_is_public", "-user_is_verified", "-created_at"],
                        name="acc_dash_skill_proj_sort_idx",
                    ),
                    models.Index(
                        fields=[
                            "is_hidden",
                            "user_is_public",
                            "is_seeking",
                            "-user_is_verified",
                            "-created_at",
                        ],
                        name="acc_dsh_skl_prj_type_idx",
                    ),
                    models.Index(
                        fields=["user", "-created_at"],
                        name="acc_dash_skill_proj_user_idx",
                    ),
                ],
            },
        ),
        migrations.RunPython(
            backfill_dashboard_skill_search_projection,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            create_projection_trigram_indexes,
            reverse_code=drop_projection_trigram_indexes,
        ),
    ]
