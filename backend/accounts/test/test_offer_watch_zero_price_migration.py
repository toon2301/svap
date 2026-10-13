"""Historical zero-price migration safety, uniqueness, and retention checks."""

import importlib
from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.utils import timezone


MIGRATE_FROM = ("accounts", "0122_alter_user_avatar_upload_to")
MIGRATE_TO = ("accounts", "0123_normalize_offer_watch_zero_prices")


@pytest.fixture
def historical_apps(transactional_db):
    """Roll back only the isolated test schema and always restore its latest leaves."""
    executor = MigrationExecutor(connection)
    latest = executor.loader.graph.leaf_nodes()
    executor.migrate([MIGRATE_FROM])
    apps = executor.loader.project_state([MIGRATE_FROM]).apps
    try:
        yield apps
    finally:
        # Remove only this test's temporary watches before reapplying normalization.
        apps.get_model("accounts", "OfferWatch").objects.all().delete()
        MigrationExecutor(connection).migrate(latest)


def create_historical_watch(apps, *, slot=1, user=None, **overrides):
    """Create a legacy row using only models from the pre-migration state."""
    if user is None:
        user = apps.get_model("accounts", "User").objects.create(
            username=f"zero-migration-{slot}", email=f"zero-migration-{slot}@example.com",
        )
    return apps.get_model("accounts", "OfferWatch").objects.create(
        **{
            "user_id": user.pk, "slot": slot, "category": "Domácnosť a služby",
            "subcategory": "Maliarske práce", "is_seeking": False,
            "country_code": "SK", "district_code": "", "price_min": "0.00",
            "price_max": "0.00", "price_currency": "€", **overrides,
        }
    )


@pytest.mark.parametrize(
    ("minimum", "maximum", "currency", "expected_min", "expected_max", "expected_currency"),
    [
        ("0", "0", "€", None, None, ""),
        ("0", "0", "$", None, None, ""),
        ("0", "0", "Kč", None, None, ""),
        ("0", "0", "zł", None, None, ""),
        ("0", "0", "Ft", None, None, ""),
        ("0", None, "€", None, None, ""),
        (None, "0", "$", None, None, ""),
        ("0", "100", "Kč", None, Decimal("100"), "Kč"),
        ("0.01", None, "€", Decimal("0.01"), None, "€"),
        (None, None, "", None, None, ""),
    ],
)
def test_migration_normalizes_only_zero_bounds_and_preserves_activation(
    historical_apps, minimum, maximum, currency, expected_min, expected_max, expected_currency,
):
    """Keep identity, slot, and notification cutoff while clearing only zero bounds."""
    watch = create_historical_watch(
        historical_apps, price_min=minimum, price_max=maximum, price_currency=currency,
    )
    past = timezone.now() - timedelta(days=3)
    historical_apps.get_model("accounts", "OfferWatch").objects.filter(pk=watch.pk).update(updated_at=past)
    watch.refresh_from_db()
    MigrationExecutor(connection).migrate([MIGRATE_TO])
    watch.refresh_from_db()
    assert (watch.price_min, watch.price_max, watch.price_currency) == (
        expected_min, expected_max, expected_currency,
    )
    assert watch.slot == 1 and watch.updated_at == past
    assert watch.created_at < timezone.now()

    module = importlib.import_module("accounts.migrations.0123_normalize_offer_watch_zero_prices")
    module.normalize_zero_watch_prices(historical_apps, SimpleNamespace(connection=connection))
    watch.refresh_from_db()
    assert watch.updated_at == past  # The data step is idempotent, with no auto_now writes.


@pytest.mark.parametrize(
    ("first_prices", "second_prices"),
    [
        (("0", "0", "€"), (None, None, "")),
        (("0", "0", "€"), ("0", "0", "$")),
        (("0", "100", "€"), (None, "100", "€")),
        ((None, "0", "€"), (None, None, "")),
        (("0", None, "€"), (None, None, "")),
    ],
)
def test_migration_stops_before_any_write_when_normalization_would_duplicate(
    historical_apps, first_prices, second_prices,
):
    """Fail closed on normalized collisions without merging or deleting any watch."""
    User = historical_apps.get_model("accounts", "User")
    Watch = historical_apps.get_model("accounts", "OfferWatch")
    user = User.objects.create(username="zero-conflict", email="zero-conflict@example.com")
    create_historical_watch(historical_apps, user=user, subcategory="Bez konfliktu")
    first = create_historical_watch(
        historical_apps, user=user, slot=2,
        price_min=first_prices[0], price_max=first_prices[1], price_currency=first_prices[2],
    )
    create_historical_watch(
        historical_apps, user=user, slot=3,
        price_min=second_prices[0], price_max=second_prices[1], price_currency=second_prices[2],
    )
    before = list(Watch.objects.order_by("id").values())
    with pytest.raises(RuntimeError, match="duplicate OfferWatch filters") as error:
        MigrationExecutor(connection).migrate([MIGRATE_TO])
    assert str(first.pk) in str(error.value)
    assert "@example.com" not in str(error.value)
    assert list(Watch.objects.order_by("id").values()) == before
    assert MIGRATE_TO not in MigrationExecutor(connection).loader.applied_migrations


def test_migration_keeps_free_offers_and_notification_deduplication(historical_apps):
    """Leave genuine free card prices, candidate history, and outbox records intact."""
    watch = create_historical_watch(historical_apps)
    User = historical_apps.get_model("accounts", "User")
    Offer = historical_apps.get_model("accounts", "OfferedSkill")
    Candidate = historical_apps.get_model("accounts", "OfferWatchNotification")
    Outbox = historical_apps.get_model("accounts", "OfferWatchMatchOutbox")
    Notification = historical_apps.get_model("accounts", "Notification")
    owner = User.objects.create(username="free-card-owner", email="free-card-owner@example.com")
    free = Offer.objects.create(user_id=owner.pk, category=watch.category, subcategory=watch.subcategory, price_from="0")
    unspecified = Offer.objects.create(user_id=watch.user_id, category="Iná", subcategory="Bez ceny", price_from=None)
    candidate = Candidate.objects.create(user_id=watch.user_id, watch_id=watch.pk, offer_id=free.pk)
    Candidate.objects.filter(pk=candidate.pk).update(notified_at=candidate.matched_at, processed_at=candidate.matched_at)
    Outbox.objects.create(offer_id=free.pk, attempt_count=7)
    candidates_before = list(Candidate.objects.values())
    outboxes_before = list(Outbox.objects.values())
    created_at = watch.created_at

    MigrationExecutor(connection).migrate([MIGRATE_TO])

    free.refresh_from_db()
    unspecified.refresh_from_db()
    watch.refresh_from_db()
    assert free.price_from == Decimal("0") and unspecified.price_from is None
    assert free.price_negotiable is False
    assert watch.created_at == created_at
    assert list(Candidate.objects.values()) == candidates_before
    assert list(Outbox.objects.values()) == outboxes_before
    assert not Notification.objects.exists()


def test_normalized_equal_filters_are_allowed_for_different_users(historical_apps):
    """Migration uniqueness remains scoped to the owner, not all application users."""
    first = create_historical_watch(historical_apps, slot=1)
    second = create_historical_watch(historical_apps, slot=2)
    MigrationExecutor(connection).migrate([MIGRATE_TO])
    for watch in (first, second):
        watch.refresh_from_db()
        assert watch.price_min is None and watch.price_max is None


@pytest.mark.parametrize("overrides", [
    {"is_seeking": True}, {"district_code": "nitra"}, {"country_code": "CZ"},
    {"subcategory": "Upratovanie"}, {"category": "Remeslá"},
])
def test_distinct_non_price_criteria_do_not_trigger_migration_collisions(historical_apps, overrides):
    """Do not conflate distinct type, location, or category selections for one owner."""
    first = create_historical_watch(historical_apps)
    user = historical_apps.get_model("accounts", "User").objects.get(pk=first.user_id)
    second = create_historical_watch(historical_apps, user=user, slot=2, **overrides)
    MigrationExecutor(connection).migrate([MIGRATE_TO])
    for watch in (first, second):
        watch.refresh_from_db()
        assert watch.price_min is None and watch.price_max is None
    assert historical_apps.get_model("accounts", "OfferWatch").objects.count() == 2


def test_schema_rollback_does_not_invent_former_zero_values(historical_apps):
    """Rollback restores permissive checks but keeps canonical null data, without guessing."""
    watch = create_historical_watch(historical_apps)
    executor = MigrationExecutor(connection)
    executor.migrate([MIGRATE_TO])
    executor = MigrationExecutor(connection)
    executor.migrate([MIGRATE_FROM])
    watch.refresh_from_db()
    assert (watch.price_min, watch.price_max, watch.price_currency) == (None, None, "")
