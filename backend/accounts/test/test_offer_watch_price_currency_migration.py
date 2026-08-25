import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


MIGRATE_FROM = ("accounts", "0114_dashboard_search_projection_geography")
MIGRATE_TO = ("accounts", "0115_offer_watch_price_currency")


@pytest.mark.django_db(transaction=True)
def test_migration_backfills_only_existing_price_filtered_watches():
    executor = MigrationExecutor(connection)
    executor.migrate([MIGRATE_FROM])
    old_apps = executor.loader.project_state([MIGRATE_FROM]).apps

    User = old_apps.get_model("accounts", "User")
    OfferWatch = old_apps.get_model("accounts", "OfferWatch")
    user = User.objects.create(
        username="watch-currency-migration",
        email="watch-currency-migration@example.com",
    )
    common_fields = {
        "user_id": user.pk,
        "category": "Domácnosť a služby",
        "is_seeking": False,
        "country_code": "SK",
        "district_code": "",
    }
    priced = OfferWatch.objects.create(
        slot=1,
        subcategory="Maliarske práce",
        price_min="10.00",
        price_max="100.00",
        **common_fields,
    )
    unpriced = OfferWatch.objects.create(
        slot=2,
        subcategory="Upratovanie",
        price_min=None,
        price_max=None,
        **common_fields,
    )

    executor = MigrationExecutor(connection)
    executor.migrate([MIGRATE_TO])
    new_apps = executor.loader.project_state([MIGRATE_TO]).apps
    MigratedOfferWatch = new_apps.get_model("accounts", "OfferWatch")

    assert (
        MigratedOfferWatch.objects.get(pk=priced.pk).price_currency
        == "€"
    )
    assert MigratedOfferWatch.objects.get(pk=unpriced.pk).price_currency == ""
