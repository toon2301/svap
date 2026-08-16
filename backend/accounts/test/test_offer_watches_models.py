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
    return User.objects.create_user(
        username=f"watch-{suffix}",
        email=f"watch-{suffix}@example.com",
        password="StrongPass123",
        is_verified=True,
    )


def watch_fields(**overrides):
    values = {
        "category": "Domácnosť a služby",
        "subcategory": "Maliarske práce",
        "is_seeking": False,
        "country_code": "SK",
        "district_code": "nitra",
        "price_min": Decimal("10.00"),
        "price_max": Decimal("100.00"),
    }
    values.update(overrides)
    return values


def create_offer(user, **overrides):
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
    user = create_user("canonical-district")

    watch = create_offer_watch(
        user=user,
        **watch_fields(country_code="CZ", district_code="Brno město"),
    )

    assert watch.district_code == "brno-mesto"


@pytest.mark.django_db
def test_create_offer_watch_rejects_sixth_watch():
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
    user = create_user(f"db-check-{len(str(overrides))}")

    with pytest.raises(IntegrityError), transaction.atomic():
        OfferWatch.objects.create(user=user, slot=1, **watch_fields(**overrides))


@pytest.mark.django_db
@pytest.mark.parametrize("field", ["category", "subcategory"])
def test_database_rejects_empty_category_fields(field):
    user = create_user(f"empty-{field}")

    with pytest.raises(IntegrityError), transaction.atomic():
        OfferWatch.objects.create(
            user=user,
            slot=1,
            **watch_fields(**{field: ""}),
        )


@pytest.mark.django_db
def test_duplicate_filters_are_rejected_even_when_optional_prices_are_null():
    user = create_user("duplicate")
    filters = watch_fields(price_min=None, price_max=None)
    OfferWatch.objects.create(user=user, slot=1, **filters)

    with pytest.raises(IntegrityError), transaction.atomic():
        OfferWatch.objects.create(user=user, slot=2, **filters)


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
    user = create_user(error_field + str(len(overrides)))
    watch = OfferWatch(user=user, slot=1, **watch_fields(**overrides))

    with pytest.raises(ValidationError) as error:
        watch.full_clean()

    assert error_field in error.value.message_dict


@pytest.mark.django_db
def test_offer_watch_accepts_country_without_curated_districts():
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
    user = create_user("self")
    watch = create_offer_watch(user=user, **watch_fields())
    offer = create_offer(user)

    candidate, created = register_offer_watch_notification(watch=watch, offer=offer)

    assert candidate is None
    assert created is False
    assert OfferWatchNotification.objects.count() == 0


@pytest.mark.django_db
def test_notification_candidate_model_rejects_own_offer():
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
    assert OfferWatch in admin.site._registry
    assert OfferWatchNotification in admin.site._registry
