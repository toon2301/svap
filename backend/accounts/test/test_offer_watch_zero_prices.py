"""Regressions for zero watch bounds, without changing prices on offer cards."""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import OfferWatch
from accounts.services.offer_watches import create_offer_watch


@pytest.fixture
def watcher(db):
    """Provide a verified watch owner in the isolated test database."""
    return get_user_model().objects.create_user(
        username="zero-watch-owner", email="zero-watch@example.com", is_verified=True,
    )


@pytest.fixture
def api(watcher):
    """Authenticate requests as the fixture owner without a real login."""
    client = APIClient()
    client.force_authenticate(watcher)
    return client


def watch_fields(**overrides):
    """Build a valid price-filter payload with only explicitly changed fields."""
    return {
        "category": "Domácnosť a služby", "subcategory": "Maliarske práce",
        "is_seeking": False, "country_code": "SK", "district_code": "",
        "price_min": None, "price_max": None, "price_currency": "",
        **overrides,
    }


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("minimum", "maximum", "expected_min", "expected_max"),
    [
        ("0", "0", None, None), ("00", "0.00", None, None),
        (" 0.00 ", None, None, None), (None, "0.00", None, None),
        ("0", "100", None, "100.00"), ("100", "0", "100.00", None),
        ("0.01", "0", "0.01", None), ("0", "0.01", None, "0.01"),
        (0, 0, None, None),
    ],
)
def test_post_normalizes_zero_before_range_validation(api, minimum, maximum, expected_min, expected_max):
    """POST treats valid zeros as absent bounds but retains every positive cent."""
    response = api.post(
        reverse("accounts:offer_watches"),
        watch_fields(price_min=minimum, price_max=maximum, price_currency="€"),
        format="json",
    )
    assert response.status_code == 201, response.data
    assert response.data["price_min"] == expected_min
    assert response.data["price_max"] == expected_max
    assert response.data["price_currency"] == ("" if expected_min is None and expected_max is None else "€")
    saved = OfferWatch.objects.get(pk=response.data["id"])
    assert saved.price_min == (Decimal(expected_min) if expected_min is not None else None)
    assert saved.price_max == (Decimal(expected_max) if expected_max is not None else None)


@pytest.mark.django_db
def test_zero_only_post_needs_no_currency(api):
    """A zero-only request is an unpriced watch, not a currency validation error."""
    response = api.post(
        reverse("accounts:offer_watches"), watch_fields(price_min="0", price_max="0"), format="json",
    )
    assert response.status_code == 201
    assert response.data["price_currency"] == ""


@pytest.mark.django_db
@pytest.mark.parametrize("currency", ["€", "Kč", "$", "zł", "Ft"])
def test_model_clears_currency_with_zero_bounds(watcher, currency):
    """Direct validated model writes share the API's zero-bound contract."""
    watch = create_offer_watch(
        user=watcher,
        **watch_fields(price_min=Decimal("0.00"), price_max=Decimal("0.00"), price_currency=currency),
    )
    assert watch.price_min is None and watch.price_max is None
    assert watch.price_currency == ""


@pytest.mark.django_db
@pytest.mark.parametrize("field", ["price_min", "price_max"])
def test_zero_patch_on_empty_bound_is_semantic_noop(watcher, api, field):
    """Normalizing null to zero and back must not move the notification cutoff."""
    watch = create_offer_watch(user=watcher, **watch_fields())
    response = api.patch(
        reverse("accounts:offer_watch_detail", args=[watch.pk]), {field: "0.00"}, format="json",
    )
    assert response.status_code == 200
    assert OfferWatch.objects.get(pk=watch.pk).updated_at == watch.updated_at
    assert response.data[field] is None


@pytest.mark.django_db
def test_partial_patch_clears_last_bound_and_currency(watcher, api):
    """A partial update clears the saved currency when its last bound becomes zero."""
    watch = create_offer_watch(user=watcher, **watch_fields(price_min=Decimal("10"), price_currency="$"))
    response = api.patch(
        reverse("accounts:offer_watch_detail", args=[watch.pk]), {"price_min": "0"}, format="json",
    )
    assert response.status_code == 200
    assert response.data["price_min"] is None and response.data["price_max"] is None
    assert response.data["price_currency"] == ""


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("field", "expected_min", "expected_max"),
    [("price_min", None, "200.00"), ("price_max", "100.00", None)],
)
def test_zero_partial_patch_preserves_the_other_positive_bound(watcher, api, field, expected_min, expected_max):
    """Merge a partial zero update before range checks, keeping the untouched bound."""
    watch = create_offer_watch(
        user=watcher, **watch_fields(price_min=Decimal("100"), price_max=Decimal("200"), price_currency="$"),
    )
    response = api.patch(
        reverse("accounts:offer_watch_detail", args=[watch.pk]), {field: "0"}, format="json",
    )
    assert response.status_code == 200
    assert (response.data["price_min"], response.data["price_max"], response.data["price_currency"]) == (
        expected_min, expected_max, "$",
    )


@pytest.mark.django_db
def test_zero_minimum_is_duplicate_of_existing_one_sided_range(watcher, api):
    """A zero minimum cannot create a second copy of the same upper-only range."""
    original = create_offer_watch(user=watcher, **watch_fields(price_max=Decimal("100"), price_currency="€"))
    response = api.post(
        reverse("accounts:offer_watches"),
        watch_fields(price_min="0", price_max="100", price_currency="€"), format="json",
    )
    assert response.status_code == 400 and response.data["code"] == "duplicate_offer_watch"
    assert OfferWatch.objects.count() == 1
    assert OfferWatch.objects.get(pk=original.pk).updated_at == original.updated_at


@pytest.mark.django_db
def test_normalized_duplicate_post_and_patch_preserve_original(watcher, api):
    """Zero normalization cannot bypass duplicate protection or destroy either row."""
    first = create_offer_watch(user=watcher, **watch_fields())
    second = create_offer_watch(user=watcher, **watch_fields(price_min=Decimal("10"), price_currency="€"))
    post = api.post(
        reverse("accounts:offer_watches"), watch_fields(price_min="0", price_currency="€"), format="json",
    )
    patch = api.patch(
        reverse("accounts:offer_watch_detail", args=[second.pk]), {"price_min": "0"}, format="json",
    )
    assert post.status_code == patch.status_code == 400
    assert post.data["code"] == patch.data["code"] == "duplicate_offer_watch"
    assert OfferWatch.objects.count() == 2
    assert OfferWatch.objects.get(pk=first.pk).updated_at == first.updated_at
    unchanged = OfferWatch.objects.get(pk=second.pk)
    assert unchanged.price_min == Decimal("10")
    assert unchanged.updated_at == second.updated_at


@pytest.mark.django_db
@pytest.mark.parametrize("field", ["price_min", "price_max"])
def test_unvalidated_orm_cannot_store_zero_bound(watcher, field):
    """Database constraints reject literal zero if model validation was bypassed."""
    with pytest.raises(IntegrityError), transaction.atomic():
        OfferWatch.objects.create(user=watcher, slot=1, **watch_fields(**{field: 0, "price_currency": "€"}))


@pytest.mark.django_db
@pytest.mark.parametrize("value", ["-1", "0.000", "0,00", "NaN", "100000000"])
def test_invalid_api_price_is_not_erased(api, value):
    """Malformed, negative, and over-limit API prices remain rejected after normalization."""
    response = api.post(
        reverse("accounts:offer_watches"), watch_fields(price_min=value, price_currency="€"), format="json",
    )
    assert response.status_code == 400
    assert "price_min" in response.data
    assert not OfferWatch.objects.exists()
