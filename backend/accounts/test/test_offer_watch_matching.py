from datetime import timedelta
from decimal import Decimal

import pytest

from accounts.models import (
    OfferWatch,
    OfferWatchNotification,
    OfferedSkill,
    UserBlock,
)
from accounts.services.offer_watch_matching import (
    matching_offers_for_watch,
    matching_watches_for_offer,
    register_matches_for_new_offer,
)
from accounts.services.offer_watches import create_offer_watch


BASE_CATEGORY = "Domácnosť a služby"
BASE_SUBCATEGORY = "Maliarske práce"


def create_user(suffix, **overrides):
    from django.contrib.auth import get_user_model

    values = {
        "username": f"watch-match-{suffix}",
        "email": f"watch-match-{suffix}@example.com",
        "password": "StrongPass123",
        "is_verified": True,
        "is_public": True,
    }
    values.update(overrides)
    return get_user_model().objects.create_user(**values)


def create_watch(user, **overrides):
    values = {
        "category": BASE_CATEGORY,
        "subcategory": BASE_SUBCATEGORY,
        "is_seeking": False,
        "country_code": "SK",
        "district_code": "",
        "price_min": None,
        "price_max": None,
        "price_currency": "",
    }
    values.update(overrides)
    return create_offer_watch(user=user, **values)


def create_offer(owner, **overrides):
    values = {
        "category": BASE_CATEGORY,
        "subcategory": BASE_SUBCATEGORY,
        "description": "",
        "detailed_description": "",
        "country_code": "SK",
        "district_code": "nitra",
        "district": "Nitra",
        "is_seeking": False,
        "price_from": None,
        "price_currency": "",
        "price_negotiable": False,
    }
    values.update(overrides)
    return OfferedSkill.objects.create(user=owner, **values)


def set_watches_before_offer(*watches, offer):
    OfferWatch.objects.filter(pk__in=[watch.pk for watch in watches]).update(
        updated_at=offer.created_at - timedelta(seconds=1)
    )


@pytest.mark.django_db
def test_live_results_require_exact_category_subcategory_type_and_country():
    watcher = create_user("live-exact-watcher")
    watch = create_watch(watcher)
    matching = create_offer(create_user("live-exact-match"))
    create_offer(
        create_user("live-wrong-category"),
        category="Remeslá",
    )
    create_offer(
        create_user("live-wrong-subcategory"),
        subcategory="Upratovanie",
    )
    create_offer(
        create_user("live-wrong-type"),
        is_seeking=True,
    )
    create_offer(
        create_user("live-wrong-country"),
        country_code="CZ",
        district_code="brno-mesto",
        district="Brno-město",
    )

    assert list(
        matching_offers_for_watch(watch=watch).values_list("id", flat=True)
    ) == [matching.id]


@pytest.mark.django_db
def test_district_watch_is_exact_but_empty_district_covers_entire_country():
    watcher = create_user("district-watcher")
    country_watch = create_watch(watcher)
    district_watch = create_watch(watcher, district_code="nitra")
    nitra = create_offer(create_user("district-nitra"))
    bratislava = create_offer(
        create_user("district-bratislava"),
        district_code="bratislava-i",
        district="Bratislava I",
    )
    without_district = create_offer(
        create_user("district-empty"),
        district_code="",
        district="",
    )

    assert set(
        matching_offers_for_watch(watch=country_watch).values_list(
            "id", flat=True
        )
    ) == {nitra.id, bratislava.id, without_district.id}
    assert list(
        matching_offers_for_watch(watch=district_watch).values_list(
            "id", flat=True
        )
    ) == [nitra.id]


@pytest.mark.django_db
def test_price_watch_matches_inclusive_range_only_in_the_same_currency():
    watcher = create_user("price-watcher")
    unpriced_watch = create_watch(watcher)
    priced_watch = create_watch(
        watcher,
        price_min=Decimal("10.00"),
        price_max=Decimal("100.00"),
        price_currency="€",
    )
    minimum = create_offer(
        create_user("price-min"),
        price_from=Decimal("10.00"),
        price_currency="€",
    )
    middle = create_offer(
        create_user("price-middle"),
        price_from=Decimal("50.00"),
        price_currency="€",
    )
    maximum = create_offer(
        create_user("price-max"),
        price_from=Decimal("100.00"),
        price_currency="€",
    )
    below = create_offer(
        create_user("price-below"),
        price_from=Decimal("9.99"),
        price_currency="€",
    )
    above = create_offer(
        create_user("price-above"),
        price_from=Decimal("100.01"),
        price_currency="€",
    )
    other_currency = create_offer(
        create_user("price-currency"),
        price_from=Decimal("50.00"),
        price_currency="Ft",
    )
    without_price = create_offer(create_user("price-empty"))
    negotiable = create_offer(
        create_user("price-negotiable"),
        price_from=Decimal("50.00"),
        price_currency="€",
        price_negotiable=True,
    )
    all_offers = {
        minimum.id,
        middle.id,
        maximum.id,
        below.id,
        above.id,
        other_currency.id,
        without_price.id,
        negotiable.id,
    }

    assert set(
        matching_offers_for_watch(watch=unpriced_watch).values_list(
            "id", flat=True
        )
    ) == all_offers
    assert set(
        matching_offers_for_watch(watch=priced_watch).values_list(
            "id", flat=True
        )
    ) == {minimum.id, middle.id, maximum.id}


@pytest.mark.django_db
def test_one_sided_price_filters_apply_their_configured_boundary_only():
    watcher = create_user("price-one-sided-watcher")
    minimum_watch = create_watch(
        watcher,
        price_min=Decimal("50.00"),
        price_currency="€",
    )
    maximum_watch = create_watch(
        watcher,
        price_max=Decimal("50.00"),
        price_currency="€",
    )
    low = create_offer(
        create_user("price-one-sided-low"),
        price_from=Decimal("30.00"),
        price_currency="€",
    )
    boundary = create_offer(
        create_user("price-one-sided-boundary"),
        price_from=Decimal("50.00"),
        price_currency="€",
    )
    high = create_offer(
        create_user("price-one-sided-high"),
        price_from=Decimal("70.00"),
        price_currency="€",
    )

    assert set(
        matching_offers_for_watch(watch=minimum_watch).values_list(
            "id", flat=True
        )
    ) == {boundary.id, high.id}
    assert set(
        matching_offers_for_watch(watch=maximum_watch).values_list(
            "id", flat=True
        )
    ) == {low.id, boundary.id}


@pytest.mark.django_db
def test_live_results_enforce_visibility_ownership_and_blocks_both_ways():
    watcher = create_user("visibility-watcher")
    watch = create_watch(watcher)
    visible = create_offer(create_user("visibility-visible"))
    create_offer(watcher)
    create_offer(create_user("visibility-hidden"), is_hidden=True)
    create_offer(create_user("visibility-private", is_public=False))
    create_offer(create_user("visibility-inactive", is_active=False))
    create_offer(create_user("visibility-staff", is_staff=True))
    create_offer(create_user("visibility-admin", is_superuser=True))
    outgoing_owner = create_user("visibility-outgoing")
    incoming_owner = create_user("visibility-incoming")
    create_offer(outgoing_owner)
    create_offer(incoming_owner)
    UserBlock.objects.create(blocker=watcher, blocked_user=outgoing_owner)
    UserBlock.objects.create(blocker=incoming_owner, blocked_user=watcher)

    assert list(
        matching_offers_for_watch(watch=watch).values_list("id", flat=True)
    ) == [visible.id]


@pytest.mark.django_db
def test_live_results_are_ordered_newest_first_with_stable_id_tiebreaker():
    watcher = create_user("ordering-watcher")
    watch = create_watch(watcher)
    oldest = create_offer(create_user("ordering-oldest"))
    middle = create_offer(create_user("ordering-middle"))
    newest = create_offer(create_user("ordering-newest"))
    common_time = newest.created_at
    OfferedSkill.objects.filter(pk=oldest.pk).update(
        created_at=common_time - timedelta(days=1)
    )
    OfferedSkill.objects.filter(pk__in=[middle.pk, newest.pk]).update(
        created_at=common_time
    )
    tied = sorted([middle.id, newest.id], reverse=True)

    assert list(
        matching_offers_for_watch(watch=watch).values_list("id", flat=True)
    ) == [*tied, oldest.id]


@pytest.mark.django_db
def test_reverse_matcher_applies_all_exact_filters_symmetrically():
    exact_country = create_watch(create_user("reverse-country"))
    exact_district = create_watch(
        create_user("reverse-district"),
        district_code="nitra",
    )
    exact_price = create_watch(
        create_user("reverse-price"),
        price_min=Decimal("40.00"),
        price_max=Decimal("60.00"),
        price_currency="€",
    )
    wrong_district = create_watch(
        create_user("reverse-wrong-district"),
        district_code="bratislava-i",
    )
    wrong_currency = create_watch(
        create_user("reverse-wrong-currency"),
        price_min=Decimal("40.00"),
        price_max=Decimal("60.00"),
        price_currency="Ft",
    )
    wrong_category = create_watch(
        create_user("reverse-wrong-category"),
        category="Remeslá",
    )
    wrong_type = create_watch(
        create_user("reverse-wrong-type"),
        is_seeking=True,
    )
    wrong_country = create_watch(
        create_user("reverse-wrong-country"),
        country_code="CZ",
    )
    offer = create_offer(
        create_user("reverse-owner"),
        price_from=Decimal("50.00"),
        price_currency="€",
    )
    all_watches = (
        exact_country,
        exact_district,
        exact_price,
        wrong_district,
        wrong_currency,
        wrong_category,
        wrong_type,
        wrong_country,
    )
    set_watches_before_offer(*all_watches, offer=offer)

    assert set(
        matching_watches_for_offer(offer=offer).values_list("id", flat=True)
    ) == {exact_country.id, exact_district.id, exact_price.id}


@pytest.mark.django_db
@pytest.mark.parametrize(
    "offer_overrides",
    [
        {},
        {
            "price_from": Decimal("50.00"),
            "price_currency": "€",
            "price_negotiable": True,
        },
    ],
)
def test_reverse_price_matcher_sends_unpriced_cards_only_to_unpriced_watch(
    offer_overrides,
):
    watcher = create_user(
        f"reverse-unpriced-{int(bool(offer_overrides))}"
    )
    unpriced_watch = create_watch(watcher)
    priced_watch = create_watch(
        watcher,
        price_min=Decimal("10.00"),
        price_max=Decimal("100.00"),
        price_currency="€",
    )
    offer = create_offer(
        create_user(f"reverse-unpriced-owner-{int(bool(offer_overrides))}"),
        **offer_overrides,
    )
    set_watches_before_offer(unpriced_watch, priced_watch, offer=offer)

    assert list(
        matching_watches_for_offer(offer=offer).values_list("id", flat=True)
    ) == [unpriced_watch.id]


@pytest.mark.django_db
def test_reverse_matcher_uses_creation_or_last_edit_as_notification_cutoff():
    owner = create_user("cutoff-owner")
    old_offer = create_offer(owner)
    watcher = create_user("cutoff-watcher")
    watch = create_watch(watcher)

    assert matching_watches_for_offer(offer=old_offer).count() == 0
    assert matching_offers_for_watch(watch=watch).filter(pk=old_offer.pk).exists()

    new_offer = create_offer(
        create_user("cutoff-new-owner"),
    )
    set_watches_before_offer(watch, offer=new_offer)
    assert matching_watches_for_offer(offer=new_offer).filter(pk=watch.pk).exists()

    OfferWatch.objects.filter(pk=watch.pk).update(
        updated_at=new_offer.created_at + timedelta(seconds=1)
    )
    assert not matching_watches_for_offer(offer=new_offer).exists()


@pytest.mark.django_db
def test_reverse_matcher_excludes_ineligible_recipients_and_blocked_pairs():
    owner = create_user("recipient-owner")
    normal_watch = create_watch(create_user("recipient-normal"))
    private_watch = create_watch(
        create_user("recipient-private", is_public=False)
    )
    inactive_user = create_user("recipient-inactive")
    inactive_watch = create_watch(inactive_user)
    inactive_user.is_active = False
    inactive_user.save(update_fields=["is_active"])
    staff_watch = create_watch(create_user("recipient-staff", is_staff=True))
    blocked_user = create_user("recipient-blocked")
    blocked_watch = create_watch(blocked_user)
    UserBlock.objects.create(blocker=blocked_user, blocked_user=owner)
    offer = create_offer(owner)
    all_watches = (
        normal_watch,
        private_watch,
        inactive_watch,
        staff_watch,
        blocked_watch,
    )
    set_watches_before_offer(*all_watches, offer=offer)

    assert set(
        matching_watches_for_offer(offer=offer).values_list("id", flat=True)
    ) == {normal_watch.id, private_watch.id}


@pytest.mark.django_db
def test_hidden_private_or_unsaved_offer_has_no_notification_matches():
    watcher = create_user("invalid-offer-watcher")
    watch = create_watch(watcher)
    hidden = create_offer(create_user("invalid-offer-hidden"), is_hidden=True)
    private = create_offer(
        create_user("invalid-offer-private", is_public=False)
    )
    set_watches_before_offer(watch, offer=hidden)

    assert not matching_watches_for_offer(offer=hidden).exists()
    assert not matching_watches_for_offer(offer=private).exists()
    assert not matching_watches_for_offer(
        offer=OfferedSkill(user=create_user("invalid-offer-unsaved"))
    ).exists()


@pytest.mark.django_db
def test_explicit_registration_is_idempotent_and_dedupes_multiple_watches():
    owner = create_user("register-owner")
    first_user = create_user("register-first")
    first_country_watch = create_watch(first_user)
    first_district_watch = create_watch(first_user, district_code="nitra")
    second_watch = create_watch(create_user("register-second"))
    offer = create_offer(owner)
    set_watches_before_offer(
        first_country_watch,
        first_district_watch,
        second_watch,
        offer=offer,
    )

    assert OfferWatchNotification.objects.count() == 0
    first_result = register_matches_for_new_offer(offer=offer)
    second_result = register_matches_for_new_offer(offer=offer)

    assert len(first_result) == 2
    assert second_result == []
    assert OfferWatchNotification.objects.filter(offer=offer).count() == 2
    assert (
        OfferWatchNotification.objects.filter(
            offer=offer,
            user=first_user,
        ).count()
        == 1
    )


@pytest.mark.django_db
def test_registration_does_not_run_automatically_or_include_existing_offer():
    owner = create_user("manual-owner")
    existing_offer = create_offer(owner)
    watch = create_watch(create_user("manual-watcher"))

    assert OfferWatchNotification.objects.count() == 0
    assert register_matches_for_new_offer(offer=existing_offer) == []
    assert OfferWatchNotification.objects.count() == 0
    assert matching_offers_for_watch(watch=watch).filter(
        pk=existing_offer.pk
    ).exists()
