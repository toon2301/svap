from decimal import Decimal

import pytest
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from accounts.models import OfferWatch, OfferWatchNotification, OfferedSkill
from accounts.services.offer_watches import (
    OfferWatchLimitReached,
    create_offer_watch,
    register_offer_watch_notification,
)


User = get_user_model()


def create_user(suffix):
    """Create a verified owner for isolated watch model tests."""
    return User.objects.create_user(
        username=f"watch-{suffix}",
        email=f"watch-{suffix}@example.com",
        password="StrongPass123",
        is_verified=True,
    )


def watch_fields(**overrides):
    """Build valid filters and omit currency only when both bounds are absent."""
    values = {
        "category": "Domácnosť a služby",
        "subcategory": "Maliarske práce",
        "is_seeking": False,
        "country_code": "SK",
        "district_code": "nitra",
        "price_min": Decimal("10.00"),
        "price_max": Decimal("100.00"),
        "price_currency": "€",
    }
    values.update(overrides)
    if (
        values["price_min"] is None
        and values["price_max"] is None
        and "price_currency" not in overrides
    ):
        values["price_currency"] = ""
    return values


def create_offer(user, **overrides):
    """Create a matching card fixture for candidate ownership checks."""
    values = {
        "category": "Domácnosť a služby",
        "subcategory": "Maliarske práce",
        "description": "",
        "detailed_description": "",
        "country_code": "SK",
        "district_code": "nitra",
        "district": "Nitra",
        "is_seeking": False,
    }
    values.update(overrides)
    return OfferedSkill.objects.create(user=user, **values)


@pytest.mark.django_db
def test_create_offer_watch_normalizes_location_and_assigns_first_free_slot():
    """Normalize location while allocating the first unused per-owner slot."""
    user = create_user("slots")
    first = create_offer_watch(
        user=user,
        **watch_fields(country_code=" sk ", district_code=" NITRA "),
    )
    third = OfferWatch.objects.create(user=user, slot=3, **watch_fields(subcategory="IT"))
    second = create_offer_watch(user=user, **watch_fields(subcategory="Upratovanie"))

    assert first.slot == 1
    assert first.country_code == "SK"
    assert first.district_code == "nitra"
    assert third.slot == 3
    assert second.slot == 2


@pytest.mark.django_db
def test_create_offer_watch_stores_canonical_district_code():
    """Store the canonical district identifier rather than a historical label."""
    user = create_user("canonical-district")

    watch = create_offer_watch(
        user=user,
        **watch_fields(country_code="CZ", district_code="Brno město"),
    )

    assert watch.district_code == "brno-mesto"


@pytest.mark.django_db
def test_create_offer_watch_rejects_sixth_watch():
    """Enforce the five-watch service limit without creating a sixth row."""
    user = create_user("limit")
    for index in range(5):
        create_offer_watch(
            user=user,
            **watch_fields(subcategory=f"Podkategória {index}"),
        )

    with pytest.raises(OfferWatchLimitReached):
        create_offer_watch(user=user, **watch_fields(subcategory="Šiesta"))

    assert OfferWatch.objects.filter(user=user).count() == 5


@pytest.mark.django_db
def test_database_slot_constraints_enforce_maximum_and_unique_position():
    """Reject reused and out-of-range slots even when validation is bypassed."""
    user = create_user("db-slots")
    OfferWatch.objects.create(user=user, slot=1, **watch_fields())

    with pytest.raises(IntegrityError), transaction.atomic():
        OfferWatch.objects.create(
            user=user,
            slot=1,
            **watch_fields(subcategory="Iná podkategória"),
        )
    with pytest.raises(IntegrityError), transaction.atomic():
        OfferWatch.objects.create(
            user=user,
            slot=6,
            **watch_fields(subcategory="Mimo limitu"),
        )


@pytest.mark.django_db
@pytest.mark.parametrize(
    "overrides",
    [
        {"country_code": "ZZ"},
        {"price_min": Decimal("-1.00")},
        {"price_max": Decimal("-1.00")},
        {"price_min": Decimal("101.00"), "price_max": Decimal("100.00")},
    ],
)
def test_database_rejects_invalid_country_and_price_ranges(overrides):
    """Keep database protection for unsupported countries and invalid ranges."""
    user = create_user(f"db-check-{len(str(overrides))}")

    with pytest.raises(IntegrityError), transaction.atomic():
        OfferWatch.objects.create(user=user, slot=1, **watch_fields(**overrides))


@pytest.mark.django_db
@pytest.mark.parametrize("field", ["category", "subcategory"])
def test_database_rejects_empty_category_fields(field):
    """Require both category fields at the database boundary."""
    user = create_user(f"empty-{field}")

    with pytest.raises(IntegrityError), transaction.atomic():
        OfferWatch.objects.create(
            user=user,
            slot=1,
            **watch_fields(**{field: ""}),
        )


@pytest.mark.django_db
def test_duplicate_filters_are_rejected_even_when_optional_prices_are_null():
    """Make null-bound filter uniqueness independent of SQL null equality."""
    user = create_user("duplicate")
    filters = watch_fields(price_min=None, price_max=None)
    OfferWatch.objects.create(user=user, slot=1, **filters)

    with pytest.raises(IntegrityError), transaction.atomic():
        OfferWatch.objects.create(user=user, slot=2, **filters)


@pytest.mark.django_db
@pytest.mark.parametrize("currency", ["€", "Kč", "$", "zł", "Ft"])
def test_offer_watch_accepts_every_supported_price_currency(currency):
    """Trim and retain every supported currency for positive price bounds."""
    user = create_user(f"currency-{ord(currency[0])}")

    watch = create_offer_watch(
        user=user,
        **watch_fields(price_currency=f" {currency} "),
    )

    assert watch.price_currency == currency


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("price_min", "price_max"),
    [
        (Decimal("0.01"), None),
        (None, Decimal("100.00")),
        (Decimal("50.00"), Decimal("50.00")),
    ],
)
def test_offer_watch_accepts_valid_price_boundary_variants(price_min, price_max):
    """Retain positive one-sided bounds and inclusive equal-bound ranges."""
    user = create_user(f"price-boundary-{price_min}-{price_max}")

    watch = create_offer_watch(
        user=user,
        **watch_fields(
            price_min=price_min,
            price_max=price_max,
            price_currency="€",
        ),
    )

    assert watch.price_min == price_min
    assert watch.price_max == price_max
    assert watch.price_currency == "€"


@pytest.mark.django_db
def test_offer_watch_requires_supported_currency_for_price_filter():
    """Reject missing or unsupported currency on an active price filter."""
    user = create_user("currency-validation")

    for slot, currency in enumerate(("", "EUR"), start=1):
        watch = OfferWatch(
            user=user,
            slot=slot,
            **watch_fields(price_currency=currency),
        )

        with pytest.raises(ValidationError) as error:
            watch.full_clean()

        assert "price_currency" in error.value.message_dict


@pytest.mark.django_db
def test_offer_watch_removes_currency_when_price_filter_is_empty():
    """Clear irrelevant currency when neither price bound is present."""
    user = create_user("currency-without-price")

    watch = create_offer_watch(
        user=user,
        **watch_fields(price_min=None, price_max=None, price_currency="€"),
    )

    assert watch.price_currency == ""


@pytest.mark.django_db
@pytest.mark.parametrize(
    "overrides",
    [
        {"price_currency": ""},
        {"price_currency": "EUR"},
        {"price_min": None, "price_max": None, "price_currency": "€"},
    ],
)
def test_database_rejects_inconsistent_price_currency(overrides):
    """Enforce the relationship between nullable bounds and saved currency."""
    user = create_user(f"db-currency-{len(str(overrides))}")

    with pytest.raises(IntegrityError), transaction.atomic():
        OfferWatch.objects.create(
            user=user,
            slot=1,
            **watch_fields(**overrides),
        )


@pytest.mark.django_db
def test_same_price_range_in_different_currencies_is_not_a_duplicate():
    """Treat the currency as part of positive-range filter uniqueness."""
    user = create_user("currency-uniqueness")
    eur_watch = OfferWatch.objects.create(
        user=user,
        slot=1,
        **watch_fields(price_currency="€"),
    )
    czk_watch = OfferWatch.objects.create(
        user=user,
        slot=2,
        **watch_fields(price_currency="Kč"),
    )

    assert eur_watch.pk != czk_watch.pk


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("overrides", "error_field"),
    [
        ({"country_code": "ZZ"}, "country_code"),
        ({"country_code": "CZ", "district_code": "nitra"}, "district_code"),
        (
            {"country_code": "CZ", "district_code": "valasske-mezirici"},
            "district_code",
        ),
        ({"price_min": Decimal("-1.00")}, "price_min"),
        (
            {"price_min": Decimal("101.00"), "price_max": Decimal("100.00")},
            "price_max",
        ),
    ],
)
def test_offer_watch_validates_country_district_and_price_range(overrides, error_field):
    """Attach invalid location and price errors to the appropriate model field."""
    user = create_user(error_field + str(len(overrides)))
    watch = OfferWatch(user=user, slot=1, **watch_fields(**overrides))

    with pytest.raises(ValidationError) as error:
        watch.full_clean()

    assert error_field in error.value.message_dict


@pytest.mark.django_db
def test_offer_watch_accepts_country_without_curated_districts():
    """Allow supported countries even when no curated district list exists."""
    user = create_user("universal-country")
    watch = OfferWatch(
        user=user,
        slot=1,
        **watch_fields(country_code=" us ", district_code=""),
    )

    watch.full_clean()
    watch.save()

    assert watch.country_code == "US"


@pytest.mark.django_db
def test_notification_candidate_is_unique_per_user_and_offer_across_watches():
    """Deduplicate overlapping watches by recipient and card, not by watch."""
    owner = create_user("owner")
    watcher = create_user("recipient")
    watch_a = create_offer_watch(user=watcher, **watch_fields())
    watch_b = create_offer_watch(
        user=watcher,
        **watch_fields(subcategory="Maľovanie interiéru"),
    )
    offer = create_offer(owner)

    first, first_created = register_offer_watch_notification(
        watch=watch_a,
        offer=offer,
    )
    second, second_created = register_offer_watch_notification(
        watch=watch_b,
        offer=offer,
    )

    assert first_created is True
    assert second_created is False
    assert second.pk == first.pk
    assert second.watch_id == watch_a.pk
    assert OfferWatchNotification.objects.filter(user=watcher, offer=offer).count() == 1


@pytest.mark.django_db
def test_own_offer_does_not_create_notification_candidate():
    """Do not register a candidate for the recipient's own card."""
    user = create_user("self")
    watch = create_offer_watch(user=user, **watch_fields())
    offer = create_offer(user)

    candidate, created = register_offer_watch_notification(watch=watch, offer=offer)

    assert candidate is None
    assert created is False
    assert OfferWatchNotification.objects.count() == 0


@pytest.mark.django_db
def test_notification_candidate_model_rejects_own_offer():
    """Enforce own-card exclusion when a candidate is validated directly."""
    user = create_user("self-model")
    watch = create_offer_watch(user=user, **watch_fields())
    candidate = OfferWatchNotification(
        user=user,
        watch=watch,
        offer=create_offer(user),
    )

    with pytest.raises(ValidationError) as error:
        candidate.full_clean()

    assert "offer" in error.value.message_dict


@pytest.mark.django_db
def test_notification_candidate_rejects_watch_owned_by_different_user():
    """Require the candidate's watch to belong to its recipient."""
    owner = create_user("candidate-owner")
    first_watcher = create_user("candidate-first")
    second_watcher = create_user("candidate-second")
    watch = create_offer_watch(user=first_watcher, **watch_fields())
    candidate = OfferWatchNotification(
        user=second_watcher,
        watch=watch,
        offer=create_offer(owner),
    )

    with pytest.raises(ValidationError) as error:
        candidate.full_clean()

    assert "watch" in error.value.message_dict


@pytest.mark.django_db
def test_watch_deletion_preserves_dedupe_candidate_but_offer_deletion_removes_it():
    """Preserve deduplication on watch deletion and cascade it on card deletion."""
    owner = create_user("delete-owner")
    watcher = create_user("delete-watcher")
    watch = create_offer_watch(user=watcher, **watch_fields())
    offer = create_offer(owner)
    candidate, _ = register_offer_watch_notification(watch=watch, offer=offer)

    watch.delete()
    candidate.refresh_from_db()
    assert candidate.watch_id is None

    offer.delete()
    assert not OfferWatchNotification.objects.filter(pk=candidate.pk).exists()


@pytest.mark.django_db
def test_user_deletion_removes_watch_and_notification_candidate():
    """Cascade owner deletion to watches and their candidate history."""
    owner = create_user("gdpr-owner")
    watcher = create_user("gdpr-watcher")
    watch = create_offer_watch(user=watcher, **watch_fields())
    candidate, _ = register_offer_watch_notification(
        watch=watch,
        offer=create_offer(owner),
    )

    watcher.delete()

    assert not OfferWatch.objects.filter(pk=watch.pk).exists()
    assert not OfferWatchNotification.objects.filter(pk=candidate.pk).exists()


@pytest.mark.django_db
def test_offer_watch_models_are_registered_in_admin():
    """Expose watch and candidate models to the existing administration registry."""
    assert OfferWatch in admin.site._registry
    assert OfferWatchNotification in admin.site._registry
