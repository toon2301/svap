"""Transakčné operácie nad uloženými sledovaniami."""

from django.contrib.auth import get_user_model
from django.db import transaction

from accounts.models import (
    MAX_OFFER_WATCHES_PER_USER,
    OfferWatch,
    OfferWatchNotification,
)


class OfferWatchLimitReached(Exception):
    """Používateľ už obsadil všetkých päť pozícií sledovania."""


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
    watch.full_clean()
    watch.save()
    return watch


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
