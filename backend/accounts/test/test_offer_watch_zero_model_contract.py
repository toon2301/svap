"""Model validation and administration regressions around zero-bound normalization."""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from accounts.models import OfferWatch, OfferWatchMatchOutbox, OfferWatchNotification, OfferedSkill


@pytest.fixture
def owner(db):
    """Create an owner without authenticating or contacting any external service."""
    return get_user_model().objects.create_user(username="zero-contract", email="zero-contract@example.com")


def fields(**overrides):
    """Provide canonical unpriced criteria for direct model validation."""
    return {
        "category": "Domácnosť a služby", "subcategory": "Maliarske práce",
        "country_code": "SK", "district_code": "nitra", "is_seeking": False,
        "price_min": 0, "price_max": 0, "price_currency": "€", **overrides,
    }


@pytest.mark.django_db
@pytest.mark.parametrize("field", ["category", "subcategory"])
def test_zero_normalization_does_not_remove_required_category_errors(owner, field):
    """Reject missing selections even when the price bounds normalize successfully."""
    watch = OfferWatch(user=owner, slot=1, **fields(**{field: ""}))
    with pytest.raises(ValidationError) as error:
        watch.full_clean()
    assert field in error.value.message_dict
    assert not OfferWatch.objects.exists()


@pytest.mark.django_db
@pytest.mark.parametrize("is_seeking", [False, True])
def test_normalized_watch_remains_readable_in_administration(owner, is_seeking):
    """Display the correct watched card type without a zero price restriction."""
    watch = OfferWatch(user=owner, slot=1, **fields(is_seeking=is_seeking))
    watch.full_clean()
    watch.save()
    assert "Maliarske práce" in str(watch)
    assert ("Dopyt" if is_seeking else "Ponuka") in str(watch)


@pytest.mark.django_db
def test_optional_watch_candidate_and_outbox_keep_existing_model_contract(owner):
    """Preserve valid deduplication candidates and readable outbox administration."""
    offer_owner = get_user_model().objects.create_user(username="zero-contract-offer", email="zero-contract-offer@example.com")
    offer = OfferedSkill.objects.create(
        user=offer_owner, category="Domácnosť a služby", subcategory="Maliarske práce",
    )
    candidate = OfferWatchNotification(user=owner, offer=offer)
    candidate.full_clean()
    candidate.save()
    assert f"offer #{offer.pk}" in str(candidate)
    outbox = OfferWatchMatchOutbox.objects.create(offer=offer)
    assert str(offer.pk) in str(outbox)


@pytest.mark.django_db
def test_district_is_replaced_only_after_successful_canonical_resolution(owner):
    """Leave the valid district code intact if its canonical resolver has no replacement."""
    watch = OfferWatch(user=owner, slot=1, **fields())
    with patch("accounts.models.offer_watches.resolve_offer_district_code", return_value=("", "")):
        watch.full_clean()
    assert watch.district_code == "nitra"
    assert watch.price_min is None and watch.price_max is None
