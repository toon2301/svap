"""Transakčné operácie nad uloženými sledovaniami."""

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction

from accounts.models import (
    MAX_OFFER_WATCHES_PER_USER,
    OfferWatch,
    OfferWatchNotification,
)


class OfferWatchLimitReached(Exception):
    """Používateľ už obsadil všetkých päť pozícií sledovania."""


class OfferWatchDuplicate(Exception):
    """Rovnaká kombinácia filtrov už používateľovi patrí."""


class OfferWatchNotFound(Exception):
    """Sledovanie neexistuje alebo nepatrí danému používateľovi."""


OFFER_WATCH_MUTABLE_FIELDS = (
    "category",
    "subcategory",
    "is_seeking",
    "country_code",
    "district_code",
    "price_min",
    "price_max",
    "price_currency",
)


def offer_watches_for_user(*, user):
    """Return only watches owned by the current user in model ordering."""

    return OfferWatch.objects.filter(user=user)


def get_offer_watch(*, user, watch_id: int) -> OfferWatch:
    try:
        return offer_watches_for_user(user=user).get(pk=watch_id)
    except OfferWatch.DoesNotExist as exc:
        raise OfferWatchNotFound from exc


def _has_duplicate_watch(*, watch: OfferWatch) -> bool:
    queryset = OfferWatch.objects.filter(
        user_id=watch.user_id,
        category=watch.category,
        subcategory=watch.subcategory,
        is_seeking=watch.is_seeking,
        country_code=watch.country_code,
        district_code=watch.district_code,
        price_min=watch.price_min,
        price_max=watch.price_max,
        price_currency=watch.price_currency,
    )
    if watch.pk:
        queryset = queryset.exclude(pk=watch.pk)
    return queryset.exists()


def _validate_watch(watch: OfferWatch) -> None:
    try:
        watch.full_clean()
    except ValidationError as exc:
        if _has_duplicate_watch(watch=watch):
            raise OfferWatchDuplicate from exc
        raise


@transaction.atomic
def create_offer_watch(*, user, **watch_fields) -> OfferWatch:
    """
    Vytvorí sledovanie v prvej voľnej pozícii.

    Zámok používateľa serializuje súbežné vytváranie a spolu s databázovým
    unikátnym obmedzením zabraňuje prekročeniu limitu piatich sledovaní.
    """

    get_user_model().objects.select_for_update().get(pk=user.pk)
    occupied_slots = set(
        OfferWatch.objects.filter(user=user).values_list("slot", flat=True)
    )
    slot = next(
        (
            candidate
            for candidate in range(1, MAX_OFFER_WATCHES_PER_USER + 1)
            if candidate not in occupied_slots
        ),
        None,
    )
    if slot is None:
        raise OfferWatchLimitReached

    watch = OfferWatch(user=user, slot=slot, **watch_fields)
    _validate_watch(watch)
    watch.save()
    return watch


@transaction.atomic
def update_offer_watch(*, user, watch_id: int, **watch_fields) -> OfferWatch:
    """Update one owned watch while preserving its slot and no-op timestamp."""

    get_user_model().objects.select_for_update().get(pk=user.pk)
    try:
        watch = OfferWatch.objects.select_for_update().get(
            pk=watch_id,
            user=user,
        )
    except OfferWatch.DoesNotExist as exc:
        raise OfferWatchNotFound from exc

    before = {
        field: getattr(watch, field)
        for field in OFFER_WATCH_MUTABLE_FIELDS
    }
    for field, value in watch_fields.items():
        if field in OFFER_WATCH_MUTABLE_FIELDS:
            setattr(watch, field, value)

    _validate_watch(watch)
    changed_fields = [
        field
        for field in OFFER_WATCH_MUTABLE_FIELDS
        if getattr(watch, field) != before[field]
    ]
    if not changed_fields:
        return watch

    watch.save(update_fields=[*changed_fields, "updated_at"])
    return watch


@transaction.atomic
def delete_offer_watch(*, user, watch_id: int) -> None:
    """Delete one owned watch under the same per-user mutation lock."""

    get_user_model().objects.select_for_update().get(pk=user.pk)
    try:
        watch = OfferWatch.objects.select_for_update().get(
            pk=watch_id,
            user=user,
        )
    except OfferWatch.DoesNotExist as exc:
        raise OfferWatchNotFound from exc
    watch.delete()


def register_offer_watch_notification(*, watch, offer):
    """
    Bezpečne zaregistruje najviac jednu budúcu notifikáciu na kartu a používateľa.

    Viac sledovaní toho istého používateľa môže zodpovedať rovnakej karte.
    Unikátne databázové obmedzenie preto zámerne nie je viazané na sledovanie.
    """

    if watch.user_id == offer.user_id:
        return None, False
    return OfferWatchNotification.objects.get_or_create(
        user_id=watch.user_id,
        offer=offer,
        defaults={"watch": watch},
    )
