"""Bezpečné a bezvedľajšie párovanie kariet s uloženými sledovaniami."""

from django.db.models import Q, QuerySet

from accounts.models import OfferWatch, OfferWatchNotification, OfferedSkill
from accounts.search_visibility import searchable_user_q
from accounts.services.offer_watches import register_offer_watch_notification
from accounts.services.user_blocks import exclude_blocked_users


def _apply_watch_price_filter(
    queryset: QuerySet,
    *,
    watch: OfferWatch,
) -> QuerySet:
    if watch.price_min is None and watch.price_max is None:
        return queryset

    queryset = queryset.filter(
        price_from__isnull=False,
        price_negotiable=False,
        price_currency=watch.price_currency,
    )
    if watch.price_min is not None:
        queryset = queryset.filter(price_from__gte=watch.price_min)
    if watch.price_max is not None:
        queryset = queryset.filter(price_from__lte=watch.price_max)
    return queryset


def matching_offers_for_watch(*, watch: OfferWatch) -> QuerySet:
    """
    Vráť všetky aktuálne viditeľné karty zodpovedajúce sledovaniu.

    Čas vytvorenia karty sa tu zámerne neobmedzuje: používateľ má po uložení
    sledovania hneď vidieť aj staršie existujúce výsledky.
    """

    queryset = (
        OfferedSkill.objects.select_related("user")
        .filter(
            searchable_user_q("user__"),
            category=watch.category,
            subcategory=watch.subcategory,
            is_seeking=watch.is_seeking,
            country_code=watch.country_code,
            is_hidden=False,
        )
        .exclude(user_id=watch.user_id)
    )
    if watch.district_code:
        queryset = queryset.filter(district_code=watch.district_code)

    queryset = _apply_watch_price_filter(queryset, watch=watch)
    queryset = exclude_blocked_users(
        queryset,
        viewer_user_id=watch.user_id,
        user_id_field="user_id",
    )
    return queryset.order_by("-created_at", "-id")


def _load_matchable_offer(offer: OfferedSkill) -> OfferedSkill | None:
    if not getattr(offer, "pk", None):
        return None
    return (
        OfferedSkill.objects.select_related("user")
        .filter(
            searchable_user_q("user__"),
            pk=offer.pk,
            is_hidden=False,
        )
        .first()
    )


def _watch_price_query(offer: OfferedSkill) -> Q:
    no_price_filter = Q(
        price_min__isnull=True,
        price_max__isnull=True,
        price_currency="",
    )
    if offer.price_from is None or offer.price_negotiable:
        return no_price_filter

    priced_match = (
        Q(price_currency=offer.price_currency)
        & (Q(price_min__isnull=True) | Q(price_min__lte=offer.price_from))
        & (Q(price_max__isnull=True) | Q(price_max__gte=offer.price_from))
    )
    return no_price_filter | priced_match


def matching_watches_for_offer(*, offer: OfferedSkill) -> QuerySet:
    """
    Vráť sledovania, ktorým patrí kandidát na upozornenie o novej karte.

    updated_at je aktivačný cutoff: vytvorenie alebo úprava sledovania spätne
    nevytvára upozornenia na už existujúce karty.
    """

    matchable_offer = _load_matchable_offer(offer)
    if matchable_offer is None:
        return OfferWatch.objects.none()

    queryset = (
        OfferWatch.objects.select_related("user")
        .filter(
            category=matchable_offer.category,
            subcategory=matchable_offer.subcategory,
            is_seeking=matchable_offer.is_seeking,
            country_code=matchable_offer.country_code,
            updated_at__lt=matchable_offer.created_at,
            user__is_active=True,
            user__is_staff=False,
            user__is_superuser=False,
        )
        .filter(
            Q(district_code="")
            | Q(district_code=matchable_offer.district_code)
        )
        .filter(_watch_price_query(matchable_offer))
        .exclude(user_id=matchable_offer.user_id)
    )
    queryset = exclude_blocked_users(
        queryset,
        viewer_user_id=matchable_offer.user_id,
        user_id_field="user_id",
    )
    return queryset.order_by("user_id", "id")


def register_matches_for_new_offer(
    *,
    offer: OfferedSkill,
) -> list[OfferWatchNotification]:
    """
    Idempotentne ulož kandidátov; nič neposielaj a nespúšťaj automaticky.

    Viac zodpovedajúcich sledovaní jedného používateľa stále vytvorí najviac
    jedného kandidáta pre danú kartu.
    """

    created_candidates = []
    for watch in matching_watches_for_offer(offer=offer).iterator():
        candidate, created = register_offer_watch_notification(
            watch=watch,
            offer=offer,
        )
        if created:
            created_candidates.append(candidate)
    return created_candidates
