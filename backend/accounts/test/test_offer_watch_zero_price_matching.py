"""Price matching regressions for normalized zero watch bounds in both directions."""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model

from accounts.models import OfferWatch, OfferedSkill
from accounts.services.offer_watch_matching import matching_offers_for_watch, matching_watches_for_offer
from accounts.services.offer_watches import create_offer_watch


@pytest.mark.django_db
@pytest.mark.parametrize("is_seeking", [False, True])
@pytest.mark.parametrize(
    ("minimum", "maximum", "expected"),
    [
        ("0", "0", {"free", "unspecified", "negotiable", "cent", "hundred", "over", "foreign"}),
        ("0", "100", {"free", "cent", "hundred"}),
        ("100", "0", {"hundred", "over"}),
        ("0.01", "0", {"cent", "hundred", "over"}),
    ],
)
def test_normalized_zero_matching_keeps_card_price_semantics(is_seeking, minimum, maximum, expected):
    """Live results and future notification matches agree without rewriting offer prices."""
    User = get_user_model()
    watcher = User.objects.create_user(username="zero-matcher", email="zero-matcher@example.com", is_verified=True)
    watch = create_offer_watch(
        user=watcher, category="Domácnosť a služby", subcategory="Maliarske práce",
        country_code="SK", district_code="", is_seeking=is_seeking,
        price_min=Decimal(minimum), price_max=Decimal(maximum), price_currency="€",
    )
    # Avoid relying on sub-millisecond clock precision for the strict activation cutoff.
    OfferWatch.objects.filter(pk=watch.pk).update(updated_at=watch.updated_at - timedelta(seconds=1))
    offers = {}
    for label, price, currency, negotiable in (
        ("free", "0", "€", False), ("unspecified", None, "", False),
        ("negotiable", None, "€", True), ("cent", "0.01", "€", False),
        ("hundred", "100", "€", False), ("over", "100.01", "€", False),
        ("foreign", "50", "$", False),
    ):
        owner = User.objects.create_user(
            username=f"zero-offer-{label}", email=f"zero-offer-{label}@example.com",
            is_verified=True, is_public=True,
        )
        offers[label] = OfferedSkill.objects.create(
            user=owner, category=watch.category, subcategory=watch.subcategory,
            country_code="SK", is_seeking=is_seeking, price_from=price,
            price_currency=currency, price_negotiable=negotiable,
        )
    live_ids = set(matching_offers_for_watch(watch=watch).values_list("pk", flat=True))
    assert live_ids == {offer.pk for label, offer in offers.items() if label in expected}
    for label, offer in offers.items():
        future_ids = set(matching_watches_for_offer(offer=offer).values_list("pk", flat=True))
        assert (watch.pk in future_ids) == (label in expected)
    offers["free"].refresh_from_db()
    offers["unspecified"].refresh_from_db()
    assert offers["free"].price_from == Decimal("0")
    assert offers["unspecified"].price_from is None
