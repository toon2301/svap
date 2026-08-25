from decimal import Decimal

from django.db import migrations, models
import django.db.models.functions.comparison


SUPPORTED_PRICE_CURRENCIES = ("€", "Kč", "$", "zł", "Ft")
LEGACY_PRICE_CURRENCY = "€"


def backfill_offer_watch_price_currency(apps, schema_editor):
    OfferWatch = apps.get_model("accounts", "OfferWatch")
    OfferWatch.objects.filter(
        models.Q(price_min__isnull=False) | models.Q(price_max__isnull=False)
    ).update(price_currency=LEGACY_PRICE_CURRENCY)


def clear_offer_watch_price_currency(apps, schema_editor):
    OfferWatch = apps.get_model("accounts", "OfferWatch")
    OfferWatch.objects.update(price_currency="")


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0114_dashboard_search_projection_geography"),
    ]

    operations = [
        migrations.AddField(
            model_name="offerwatch",
            name="price_currency",
            field=models.CharField(
                blank=True,
                default="",
                max_length=8,
                verbose_name="Mena",
            ),
        ),
        migrations.RunPython(
            backfill_offer_watch_price_currency,
            clear_offer_watch_price_currency,
        ),
        migrations.RemoveConstraint(
            model_name="offerwatch",
            name="acc_watch_unique_filters",
        ),
        migrations.AddConstraint(
            model_name="offerwatch",
            constraint=models.CheckConstraint(
                check=(
                    models.Q(
                        price_min__isnull=True,
                        price_max__isnull=True,
                        price_currency="",
                    )
                    | (
                        (
                            models.Q(price_min__isnull=False)
                            | models.Q(price_max__isnull=False)
                        )
                        & models.Q(
                            price_currency__in=SUPPORTED_PRICE_CURRENCIES
                        )
                    )
                ),
                name="acc_watch_price_currency",
            ),
        ),
        migrations.AddConstraint(
            model_name="offerwatch",
            constraint=models.UniqueConstraint(
                models.F("user"),
                models.F("category"),
                models.F("subcategory"),
                models.F("is_seeking"),
                models.F("country_code"),
                models.F("district_code"),
                django.db.models.functions.comparison.Coalesce(
                    "price_min", models.Value(Decimal("-1.00"))
                ),
                django.db.models.functions.comparison.Coalesce(
                    "price_max", models.Value(Decimal("-1.00"))
                ),
                models.F("price_currency"),
                name="acc_watch_unique_filters",
            ),
        ),
    ]
