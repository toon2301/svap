"""
Zdieľané query buildery pre vyhľadávanie zručností (dashboard + legacy fallback).

Vyčlenené z ``dashboard_views/search.py`` (kvôli dĺžke súboru a znovupoužiteľnosti).
Funkcie sú čisté (berú queryset/parametre, vracajú queryset/Q) – bez väzby na
view/request, takže ich logika ostáva identická naprieč volajúcimi.
"""

from __future__ import annotations

from django.db.models import Case, IntegerField, Q, When

from ..models import DashboardSkillSearchProjection, OfferedSkill
from ..search_visibility import searchable_projection_filters, searchable_user_q
from .dashboard_views.smart_search import SMART_KEYWORD_GROUPS
from .dashboard_views.utils import (
    _build_accent_insensitive_pattern,
    _remove_diacritics,
    _sanitize_search_term,
)

# Verejné search endpointy počítajú výsledky max do tejto hranice (capped count) –
# presné číslo do CAP, nad ňou frontend zobrazí "CAP+" (napr. "500+"). Vyhne sa
# drahému COUNT(*) na neindexovanom/veľkom výsledku.
SEARCH_COUNT_CAP = 500


def capped_count(queryset) -> tuple[int, bool]:
    """Spočíta výsledky max do SEARCH_COUNT_CAP+1 a vráti (count, is_capped).

    LIMIT CAP+1 zastaví počítanie hneď ako je jasné, že výsledkov je viac než CAP,
    takže náklad je ohraničený namiesto plného skenu. Zachováva sémantiku
    `queryset.count()` (vrátane prípadných agregátov/group-by), len ohraničenú.
    """
    counted = queryset[: SEARCH_COUNT_CAP + 1].count()
    if counted > SEARCH_COUNT_CAP:
        return SEARCH_COUNT_CAP, True
    return counted, False


# Index pre smart search synonymá – mapuje slovo (s aj bez diakritiky) na skupinu.
SMART_KEYWORD_INDEX: dict[str, list[str]] = {}
for group in SMART_KEYWORD_GROUPS:
    lowered = [w.lower() for w in group]
    for word in lowered:
        # Mapuj aj diakriticke aj bezdiakriticke verzie na tu istu skupinu.
        SMART_KEYWORD_INDEX[word] = lowered
        no_accents = _remove_diacritics(word)
        SMART_KEYWORD_INDEX[no_accents] = lowered


COUNTRY_LOCATION_MAPPING = {
    "SK": ["slovakia", "slovensko", "slovak"],
    "CZ": ["czech", "česko", "česká", "cesko", "ceska"],
    "PL": ["poland", "poľsko", "polsko", "polish"],
    "HU": ["hungary", "maďarsko", "madarsko", "hungarian"],
    "DE": ["germany", "nemecko", "deutschland", "german"],
    "AT": ["austria", "rakúsko", "rakusko", "österreich", "osterreich"],
}


def _build_only_my_location_filters(location_snapshot):
    user_loc_q = Q()
    skill_loc_q = Q()

    if location_snapshot[0]:
        user_loc_q |= Q(location__icontains=location_snapshot[0])
        skill_loc_q |= Q(location__icontains=location_snapshot[0]) | Q(
            user__location__icontains=location_snapshot[0]
        )
    if location_snapshot[1]:
        user_loc_q |= Q(district__icontains=location_snapshot[1])
        skill_loc_q |= Q(district__icontains=location_snapshot[1]) | Q(
            user__district__icontains=location_snapshot[1]
        )

    return user_loc_q, skill_loc_q


def _build_projection_only_my_location_filters(location_snapshot):
    skill_loc_q = Q()

    if location_snapshot[0]:
        skill_loc_q |= Q(skill_location__icontains=location_snapshot[0]) | Q(
            user_location__icontains=location_snapshot[0]
        )
    if location_snapshot[1]:
        skill_loc_q |= Q(skill_district__icontains=location_snapshot[1]) | Q(
            user_district__icontains=location_snapshot[1]
        )

    return skill_loc_q


def _build_skill_search_query(skill_terms, *, projection=False):
    skill_query = Q()
    for term in skill_terms:
        pattern = _build_accent_insensitive_pattern(_sanitize_search_term(term))
        if projection:
            skill_query |= (
                Q(category__iregex=pattern)
                | Q(subcategory__iregex=pattern)
                | Q(tags_text__icontains=term)
                | Q(skill_location__iregex=pattern)
                | Q(skill_district__iregex=pattern)
                | Q(user_location__iregex=pattern)
                | Q(user_district__iregex=pattern)
            )
        else:
            skill_query |= (
                Q(category__iregex=pattern)
                | Q(subcategory__iregex=pattern)
                | Q(tags__icontains=term)
                | Q(location__iregex=pattern)
                | Q(district__iregex=pattern)
                | Q(user__location__iregex=pattern)
                | Q(user__district__iregex=pattern)
            )
    return skill_query


def _apply_skill_country_filter(qs, country_filter, *, projection=False):
    country_terms = COUNTRY_LOCATION_MAPPING.get(country_filter)
    if not country_terms:
        return qs

    country_query = Q()
    for term in country_terms:
        if projection:
            country_query |= Q(user_location__icontains=term) | Q(
                user_district__icontains=term
            )
        else:
            country_query |= Q(user__location__icontains=term) | Q(
                user__district__icontains=term
            )

    test_qs = qs.filter(country_query)
    if test_qs.exists():
        return qs.filter(country_query)
    return qs


def _apply_skill_search_scalar_filters(qs, *, offer_type, price_min, price_max):
    if offer_type == "offer":
        qs = qs.filter(is_seeking=False)
    elif offer_type == "seeking":
        qs = qs.filter(is_seeking=True)

    if price_min is not None:
        qs = qs.filter(price_from__gte=price_min)
    if price_max is not None:
        qs = qs.filter(price_from__lte=price_max)

    return qs


def _slice_page_ids(qs, *, page: int, per_page: int, id_field: str = "id"):
    """
    Slice one page plus one sentinel row to determine whether a next page exists.

    This avoids exact COUNT(*) on the skills branch, which is the main source of
    production latency for dashboard search.
    """

    safe_page = max(int(page or 1), 1)
    safe_per_page = max(int(per_page or 1), 1)
    offset = (safe_page - 1) * safe_per_page
    raw_ids = list(
        qs.values_list(id_field, flat=True)[offset : offset + safe_per_page + 1]
    )
    has_next = len(raw_ids) > safe_per_page
    return raw_ids[:safe_per_page], has_next


def _build_projection_skills_page_qs(
    *,
    viewer_user_id,
    raw_query,
    skill_terms,
    country_filter,
    offer_type,
    price_min,
    price_max,
    projection_skill_loc_q,
    only_my_location,
):
    skills_qs = DashboardSkillSearchProjection.objects.filter(
        **searchable_projection_filters()
    )
    skills_qs = skills_qs.exclude(user_id=viewer_user_id)
    skills_qs = skills_qs.filter(is_hidden=False)

    if skill_terms:
        skills_qs = skills_qs.filter(
            _build_skill_search_query(skill_terms, projection=True)
        )

    if country_filter:
        skills_qs = _apply_skill_country_filter(
            skills_qs,
            country_filter,
            projection=True,
        )

    skills_qs = _apply_skill_search_scalar_filters(
        skills_qs,
        offer_type=offer_type,
        price_min=price_min,
        price_max=price_max,
    )

    if only_my_location and projection_skill_loc_q:
        skills_qs = skills_qs.filter(projection_skill_loc_q)

    if raw_query:
        return skills_qs.annotate(
            relevance=Case(
                When(category__icontains=raw_query, then=3),
                When(subcategory__icontains=raw_query, then=3),
                When(tags_text__icontains=raw_query, then=2),
                When(skill_location__icontains=raw_query, then=1),
                When(skill_district__icontains=raw_query, then=1),
                default=0,
                output_field=IntegerField(),
            )
        ).order_by("-relevance", "-user_is_verified", "-created_at")

    return skills_qs.order_by("-user_is_verified", "-created_at")


def _build_legacy_skills_page_qs(
    *,
    viewer_user,
    raw_query,
    skill_terms,
    country_filter,
    offer_type,
    price_min,
    price_max,
    skill_loc_q,
    only_my_location,
):
    skills_qs = OfferedSkill.objects.select_related("user").filter(
        searchable_user_q("user__")
    )
    skills_qs = skills_qs.exclude(user=viewer_user)
    skills_qs = skills_qs.filter(is_hidden=False)

    if skill_terms:
        skills_qs = skills_qs.filter(_build_skill_search_query(skill_terms))

    if country_filter:
        skills_qs = _apply_skill_country_filter(skills_qs, country_filter)

    skills_qs = _apply_skill_search_scalar_filters(
        skills_qs,
        offer_type=offer_type,
        price_min=price_min,
        price_max=price_max,
    )

    if only_my_location and skill_loc_q:
        skills_qs = skills_qs.filter(skill_loc_q)

    if raw_query:
        return skills_qs.annotate(
            relevance=Case(
                When(category__icontains=raw_query, then=3),
                When(subcategory__icontains=raw_query, then=3),
                When(tags__icontains=raw_query, then=2),
                When(location__icontains=raw_query, then=1),
                When(district__icontains=raw_query, then=1),
                default=0,
                output_field=IntegerField(),
            )
        ).order_by("-relevance", "-user__is_verified", "-created_at")

    return skills_qs.order_by("-user__is_verified", "-created_at")
