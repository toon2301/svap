from decimal import Decimal

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from accounts.models import (
    Notification,
    OfferWatch,
    OfferWatchNotification,
    OfferedSkill,
)
from accounts.services.offer_watches import (
    OfferWatchLimitReached,
    create_offer_watch,
    register_offer_watch_notification,
)

User = get_user_model()
PREFIX = "__svaply_phase2_"

User.objects.filter(username__startswith=PREFIX).delete()


def make_user(name):
    return User.objects.create_user(
        username=f"{PREFIX}{name}",
        email=f"{PREFIX}{name}@example.com",
        password="StrongPass123",
        is_verified=True,
    )


def filters(subcategory, **overrides):
    data = {
        "category": "Domácnosť a služby",
        "subcategory": subcategory,
        "is_seeking": False,
        "country_code": "SK",
        "district_code": "nitra",
        "price_min": Decimal("10.00"),
        "price_max": Decimal("100.00"),
        "price_currency": "€",
    }
    data.update(overrides)
    if (
        data["price_min"] is None
        and data["price_max"] is None
        and "price_currency" not in overrides
    ):
        data["price_currency"] = ""
    return data


def make_offer(user, subcategory):
    return OfferedSkill.objects.create(
        user=user,
        category="Domácnosť a služby",
        subcategory=subcategory,
        description="Test",
        detailed_description="",
        country_code="SK",
        district_code="nitra",
        district="Nitra",
        is_seeking=False,
    )


def expect_exception(label, exception_type, action):
    try:
        action()
    except exception_type:
        print(f"PASS: {label}")
    else:
        raise AssertionError(
            f"FAIL: {label} nevyhodil {exception_type.__name__}"
        )


def expect_integrity(label, action):
    try:
        with transaction.atomic():
            action()
    except IntegrityError:
        print(f"PASS: {label}")
    else:
        raise AssertionError(
            f"FAIL: {label} nevyhodil IntegrityError"
        )


try:
    # 1. Limit piatich a prideľovanie pozícií
    slot_user = make_user("slots")

    watches = [
        create_offer_watch(
            user=slot_user,
            **filters(f"Pozícia {index}"),
        )
        for index in range(1, 6)
    ]

    assert [watch.slot for watch in watches] == [1, 2, 3, 4, 5]

    expect_exception(
        "šieste sledovanie cez službu",
        OfferWatchLimitReached,
        lambda: create_offer_watch(
            user=slot_user,
            **filters("Šieste sledovanie"),
        ),
    )

    watches[2].delete()

    replacement = create_offer_watch(
        user=slot_user,
        **filters("Náhrada tretej pozície"),
    )

    assert replacement.slot == 3
    assert OfferWatch.objects.filter(user=slot_user).count() == 5

    print("PASS: uvoľnená pozícia sa znovu použila")

    # 2. Normalizácia krajiny a okresu
    location_user = make_user("location")

    normalized = create_offer_watch(
        user=location_user,
        **filters(
            "Brnianske sledovanie",
            country_code=" cz ",
            district_code="Brno město",
        ),
    )

    assert normalized.country_code == "CZ"
    assert normalized.district_code == "brno-mesto"

    print("PASS: krajina a okres sa uložili kanonicky")

    no_district = create_offer_watch(
        user=location_user,
        **filters(
            "Celá krajina",
            district_code="",
            price_min=None,
            price_max=None,
        ),
    )

    assert no_district.district_code == ""

    print("PASS: okres je voliteľný")

    # 3. Cenové hranice
    price_user = make_user("prices")

    create_offer_watch(
        user=price_user,
        **filters(
            "Bez ceny",
            price_min=None,
            price_max=None,
        ),
    )

    create_offer_watch(
        user=price_user,
        **filters(
            "Iba minimum",
            price_min=Decimal("0.00"),
            price_max=None,
        ),
    )

    create_offer_watch(
        user=price_user,
        **filters(
            "Iba maximum",
            price_min=None,
            price_max=Decimal("100.00"),
        ),
    )

    create_offer_watch(
        user=price_user,
        **filters(
            "Rovnaké hranice",
            price_min=Decimal("50.00"),
            price_max=Decimal("50.00"),
        ),
    )

    print("PASS: všetky platné cenové varianty")

    # 4. Neplatné vstupy
    invalid_user = make_user("invalid")

    invalid_cases = [
        (
            "nepodporovaná krajina",
            filters(
                "US",
                country_code="US",
            ),
        ),
        (
            "okres z inej krajiny",
            filters(
                "CZ okres",
                country_code="CZ",
                district_code="nitra",
            ),
        ),
        (
            "záporné minimum",
            filters(
                "Negatívne min",
                price_min=Decimal("-1.00"),
            ),
        ),
        (
            "záporné maximum",
            filters(
                "Negatívne max",
                price_max=Decimal("-1.00"),
            ),
        ),
        (
            "minimum väčšie než maximum",
            filters(
                "Obrátená cena",
                price_min=Decimal("101.00"),
                price_max=Decimal("100.00"),
            ),
        ),
        (
            "prázdna kategória",
            filters(
                "Bez kategórie",
                category="   ",
            ),
        ),
        (
            "prázdna podkategória",
            filters("   "),
        ),
    ]

    for label, values in invalid_cases:
        expect_exception(
            label,
            ValidationError,
            lambda values=values: create_offer_watch(
                user=invalid_user,
                **values,
            ),
        )

    assert OfferWatch.objects.filter(user=invalid_user).count() == 0

    # 5. Databázové poistky bez služby
    raw_user = make_user("raw")

    expect_integrity(
        "databáza odmietla slot 6",
        lambda: OfferWatch.objects.create(
            user=raw_user,
            slot=6,
            **filters("Mimo slotu"),
        ),
    )

    expect_integrity(
        "databáza odmietla US",
        lambda: OfferWatch.objects.create(
            user=raw_user,
            slot=1,
            **filters(
                "US DB",
                country_code="US",
            ),
        ),
    )

    expect_integrity(
        "databáza odmietla zápornú cenu",
        lambda: OfferWatch.objects.create(
            user=raw_user,
            slot=1,
            **filters(
                "Negatívna DB",
                price_min=Decimal("-1.00"),
            ),
        ),
    )

    expect_integrity(
        "databáza odmietla obrátený rozsah",
        lambda: OfferWatch.objects.create(
            user=raw_user,
            slot=1,
            **filters(
                "Rozsah DB",
                price_min=Decimal("200.00"),
                price_max=Decimal("100.00"),
            ),
        ),
    )

    expect_integrity(
        "databáza odmietla prázdnu kategóriu",
        lambda: OfferWatch.objects.create(
            user=raw_user,
            slot=1,
            **filters(
                "Prázdna DB",
                category="",
            ),
        ),
    )

    # 6. Duplicity a povolené rozdiely
    duplicate_user = make_user("duplicate")

    base_values = filters(
        "Maliarske práce",
        district_code="",
        price_min=None,
        price_max=None,
    )

    base_watch = create_offer_watch(
        user=duplicate_user,
        **base_values,
    )

    expect_exception(
        "rovnaký filter cez službu",
        ValidationError,
        lambda: create_offer_watch(
            user=duplicate_user,
            **base_values,
        ),
    )

    expect_integrity(
        "rovnaký filter priamo v databáze",
        lambda: OfferWatch.objects.create(
            user=duplicate_user,
            slot=5,
            **base_values,
        ),
    )

    type_watch = create_offer_watch(
        user=duplicate_user,
        **{
            **base_values,
            "is_seeking": True,
        },
    )

    district_watch = create_offer_watch(
        user=duplicate_user,
        **{
            **base_values,
            "district_code": "nitra",
        },
    )

    price_watch = create_offer_watch(
        user=duplicate_user,
        **{
            **base_values,
            "price_min": Decimal("1.00"),
        },
    )

    assert type_watch.pk
    assert district_watch.pk
    assert price_watch.pk

    print("PASS: typ, okres alebo cena vytvárajú odlišné sledovanie")

    other_user = make_user("other")

    other_watch = create_offer_watch(
        user=other_user,
        **base_values,
    )

    assert other_watch.pk

    print("PASS: rovnaký filter je povolený inému používateľovi")

    # 7. Jedna notifikácia na používateľa a kartu
    owner = make_user("owner")

    offer = make_offer(
        owner,
        "Ponuka pre sledovanie",
    )

    first_candidate, first_created = register_offer_watch_notification(
        watch=base_watch,
        offer=offer,
    )

    second_candidate, second_created = register_offer_watch_notification(
        watch=type_watch,
        offer=offer,
    )

    assert first_created is True
    assert second_created is False
    assert first_candidate.pk == second_candidate.pk
    assert first_candidate.notified_at is None

    assert OfferWatchNotification.objects.filter(
        user=duplicate_user,
        offer=offer,
    ).count() == 1

    print("PASS: dve sledovania vytvorili iba jedného kandidáta")

    other_candidate, other_created = register_offer_watch_notification(
        watch=other_watch,
        offer=offer,
    )

    assert other_created is True
    assert other_candidate.user_id == other_user.id

    print("PASS: iný používateľ dostal vlastného kandidáta")

    owner_watch = create_offer_watch(
        user=owner,
        **filters(
            "Vlastná ponuka",
            district_code="",
        ),
    )

    own_candidate, own_created = register_offer_watch_notification(
        watch=owner_watch,
        offer=offer,
    )

    assert own_candidate is None
    assert own_created is False

    print("PASS: vlastná karta nevytvorila kandidáta")

    # 8. Jadro matcheru sa bez explicitného volania nespúšťa
    notification_count = Notification.objects.filter(
        user__in=[
            duplicate_user,
            other_user,
        ]
    ).count()

    unrelated_offer = make_offer(
        owner,
        "Bez automatického matchera",
    )

    assert not OfferWatchNotification.objects.filter(
        offer=unrelated_offer
    ).exists()

    assert Notification.objects.filter(
        user__in=[
            duplicate_user,
            other_user,
        ]
    ).count() == notification_count

    print("PASS: automatické párovanie a reálne notifikácie nie sú aktívne")

    # 9. Mazanie a GDPR
    base_watch.delete()

    first_candidate.refresh_from_db()

    assert first_candidate.watch_id is None

    print("PASS: zmazanie sledovania zachovalo deduplikačný záznam")

    first_candidate_id = first_candidate.id
    other_candidate_id = other_candidate.id

    offer.delete()

    assert not OfferWatchNotification.objects.filter(
        id__in=[
            first_candidate_id,
            other_candidate_id,
        ]
    ).exists()

    print("PASS: zmazanie karty odstránilo kandidátov")

    delete_user = make_user("delete")

    delete_watch = create_offer_watch(
        user=delete_user,
        **filters("GDPR sledovanie"),
    )

    delete_offer = make_offer(
        owner,
        "GDPR ponuka",
    )

    delete_candidate, _ = register_offer_watch_notification(
        watch=delete_watch,
        offer=delete_offer,
    )

    delete_watch_id = delete_watch.id
    delete_candidate_id = delete_candidate.id

    delete_user.delete()

    assert not OfferWatch.objects.filter(
        id=delete_watch_id
    ).exists()

    assert not OfferWatchNotification.objects.filter(
        id=delete_candidate_id
    ).exists()

    print("PASS: zmazanie používateľa odstránilo jeho dáta")

    # 10. Admin
    assert OfferWatch in admin.site._registry
    assert OfferWatchNotification in admin.site._registry

    print("PASS: oba modely sú registrované v Django admine")

    print("\nVŠETKY MANUÁLNE TESTY FÁZY 2 PREŠLI")

finally:
    User.objects.filter(
        username__startswith=PREFIX
    ).delete()
