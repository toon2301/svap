from django.db import migrations, models


def backfill_projection_geography(apps, schema_editor):
    Projection = apps.get_model("accounts", "DashboardSkillSearchProjection")

    batch = []
    projections = Projection.objects.select_related("skill").all()
    for projection in projections.iterator(chunk_size=500):
        projection.country_code = projection.skill.country_code or ""
        projection.district_code = projection.skill.district_code or ""
        batch.append(projection)
        if len(batch) >= 500:
            Projection.objects.bulk_update(
                batch,
                ["country_code", "district_code"],
                batch_size=500,
            )
            batch = []

    if batch:
        Projection.objects.bulk_update(
            batch,
            ["country_code", "district_code"],
            batch_size=500,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0113_feed_post_caption_optional"),
    ]

    operations = [
        migrations.AddField(
            model_name="dashboardskillsearchprojection",
            name="country_code",
            field=models.CharField(
                blank=True,
                default="",
                max_length=2,
                verbose_name="Krajina zručnosti",
            ),
        ),
        migrations.AddField(
            model_name="dashboardskillsearchprojection",
            name="district_code",
            field=models.CharField(
                blank=True,
                default="",
                max_length=80,
                verbose_name="Kód okresu zručnosti",
            ),
        ),
        migrations.RunPython(
            backfill_projection_geography,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AddIndex(
            model_name="dashboardskillsearchprojection",
            index=models.Index(
                fields=["country_code", "district_code"],
                name="acc_dsh_skl_prj_geo_idx",
            ),
        ),
    ]
