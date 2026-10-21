"""Add source-card descriptions to the dashboard's flattened search schema."""

from django.db import migrations, models


class Migration(migrations.Migration):
    """Commit the small schema change before the non-atomic backfill/index build."""

    dependencies = [("accounts", "0123_normalize_offer_watch_zero_prices")]

    operations = [
        migrations.AddField(
            model_name="dashboardskillsearchprojection",
            name="description",
            field=models.TextField(
                blank=True, default="", max_length=150, verbose_name="Popis"
            ),
        ),
        migrations.AddField(
            model_name="dashboardskillsearchprojection",
            name="detailed_description",
            field=models.TextField(
                blank=True,
                default="",
                max_length=1000,
                verbose_name="Podrobný popis",
            ),
        ),
    ]
