from decimal import Decimal, InvalidOperation

from django.contrib.auth import get_user_model
from django.core.paginator import Paginator
from django.db.models import Q, Case, When, IntegerField
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ...models import OfferedSkill
from ...serializers import OfferedSkillSerializer
from .smart_search import SMART_KEYWORD_GROUPS
from .utils import _remove_diacritics, _build_accent_insensitive_pattern

User = get_user_model()


# Index pre smart search – presunuté z dashboard.py bez zmeny správania
SMART_KEYWORD_INDEX = {}
for group in SMART_KEYWORD_GROUPS:
    lowered = [w.lower() for w in group]
    for word in lowered:
        # Mapuj aj diakritické aj bezdiakritické verzie na tú istú skupinu
        SMART_KEYWORD_INDEX[word] = lowered
        no_accents = _remove_diacritics(word)
        SMART_KEYWORD_INDEX[no_accents] = lowered


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_search_view(request):
    """Dashboard search - vyhľadávanie zručností a používateľov"""
    # Základné parametre vyhľadávania
    raw_query = (request.GET.get("q") or "").strip()
    raw_location = (request.GET.get("location") or "").strip()
    raw_district = (request.GET.get("district") or "").strip()

    # Pokročilé filtre pre ponuky
    offer_type = (
        (request.GET.get("offer_type") or "").strip().lower()
    )  # 'offer' | 'seeking' | ''
    only_my_location = (request.GET.get("only_my_location") or "").strip().lower() in (
        "1",
        "true",
        "yes",
    )

    if not raw_query and not only_my_location:
        return Response(
            {
                "skills": [],
                "users": [],
                "pagination": {
                    "page": 1,
                    "per_page": 20,
                    "total_skills": 0,
                    "total_users": 0,
                    "total_pages_skills": 0,
                    "total_pages_users": 0,
                },
            },
            status=status.HTTP_200_OK,
        )

    price_min_raw = (request.GET.get("price_min") or "").strip()
    price_max_raw = (request.GET.get("price_max") or "").strip()

    # Filter podľa krajiny
    country_filter = (
        (request.GET.get("country") or "").strip().upper()
    )  # 'SK' | 'CZ' | 'PL' | etc.

    # Paginácia – bezpečné limity
    try:
        page = int(request.GET.get("page", 1))
    except (TypeError, ValueError):
        page = 1

    try:
        per_page = int(request.GET.get("per_page", 20))
    except (TypeError, ValueError):
        per_page = 20

    if per_page < 1:
        per_page = 20
    per_page = min(per_page, 50)

    # Rozdelenie query na jednotlivé výrazy (napr. "auto upratovanie")
    base_terms = [term for term in raw_query.replace(",", " ").split() if term]

    # Location parametre môžu dopĺňať dotaz (napr. ak by bol samostatný input)
    location_terms = []
    if raw_district:
        location_terms.append(raw_district)
    if raw_location and raw_location not in location_terms:
        location_terms.append(raw_location)

    # Základné vyhľadávacie termíny pre zručnosti – query + prípadná lokalita
    skill_terms = set()
    for term in base_terms + location_terms:
        normalized = term.strip()
        if not normalized:
            continue
        skill_terms.add(normalized)
        # Smart search – ak term zodpovedá niektorej synonymickej skupine, pridaj aj jej členov
        group = SMART_KEYWORD_INDEX.get(normalized.lower())
        if group:
            for g in group:
                skill_terms.add(g)

    # Termíny pre používateľov – meno / username / lokalita
    user_terms = set()
    for term in base_terms + location_terms:
        normalized = term.strip()
        if normalized:
            user_terms.add(normalized)

    # =========================
    #  Vyhľadávanie v zručnostiach (OfferedSkill)
    # =========================
    skills_qs = OfferedSkill.objects.select_related("user").filter(user__is_public=True)
    # Vylúčiť vlastné ponuky používateľa z výsledkov vyhľadávania
    skills_qs = skills_qs.exclude(user=request.user)
    # Vylúčiť skryté karty
    skills_qs = skills_qs.filter(is_hidden=False)

    if skill_terms:
        skill_query = Q()
        for term in skill_terms:
            pattern = _build_accent_insensitive_pattern(term)
            # Hľadanie podľa kategórie, podkategórie, tagov a lokality (miesto + okres)
            skill_query |= (
                Q(category__iregex=pattern)
                | Q(subcategory__iregex=pattern)
                | Q(tags__icontains=term)  # JSON pole – ponecháme icontains
                | Q(location__iregex=pattern)
                | Q(district__iregex=pattern)
                | Q(user__location__iregex=pattern)
                | Q(user__district__iregex=pattern)
            )
        skills_qs = skills_qs.filter(skill_query)

    # Filter: typ ponuky (PONÚKAM / HĽADÁM)
    if offer_type == "offer":
        skills_qs = skills_qs.filter(is_seeking=False)
    elif offer_type == "seeking":
        skills_qs = skills_qs.filter(is_seeking=True)

    # Filter: krajina používateľa
    # POZNÁMKA: Country filter je menej prísny - aplikuje sa len ak by vracal výsledky
    # Ak country filter vracia prázdne výsledky, preskočí sa (nefiltruje sa)
    if country_filter:
        country_location_mapping = {
            "SK": ["slovakia", "slovensko", "slovak"],
            "CZ": ["czech", "česko", "česká", "ceska"],
            "PL": ["poland", "poľsko", "polsko", "polish"],
            "HU": ["hungary", "maďarsko", "madarska", "hungarian"],
            "DE": ["germany", "nemecko", "deutschland", "german"],
            "AT": ["austria", "rakúsko", "rakusko", "österreich"],
        }

        if country_filter in country_location_mapping:
            country_terms = country_location_mapping[country_filter]
            country_query = Q()
            for term in country_terms:
                country_query |= Q(user__location__icontains=term) | Q(
                    user__district__icontains=term
                )

            # Skontroluj, či country filter vracia nejaké výsledky
            # Ak nie, neaplikuj ho (nefiltruj podľa krajiny)
            test_qs = skills_qs.filter(country_query)
            if test_qs.exists():
                # Country filter vracia výsledky, aplikuj ho
                skills_qs = skills_qs.filter(country_query)
            # Ak country filter nevracia výsledky, preskoč ho (nefiltruj)

    # Filter: cena od / do
    price_min = None
    price_max = None
    if price_min_raw:
        try:
            price_min = Decimal(price_min_raw.replace(",", "."))
        except InvalidOperation:
            price_min = None
    if price_max_raw:
        try:
            price_max = Decimal(price_max_raw.replace(",", "."))
        except InvalidOperation:
            price_max = None

    if price_min is not None:
        skills_qs = skills_qs.filter(price_from__gte=price_min)
    if price_max is not None:
        skills_qs = skills_qs.filter(price_from__lte=price_max)

    # Uprednostniť overených používateľov, novšie a relevantnejšie ponuky
    if raw_query:
        skills_qs = skills_qs.annotate(
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
    else:
        skills_qs = skills_qs.order_by("-user__is_verified", "-created_at")

    skills_paginator = Paginator(skills_qs, per_page)
    skills_page = skills_paginator.get_page(page)

    skills_data = OfferedSkillSerializer(
        skills_page.object_list,
        many=True,
        context={"request": request},
    ).data

    # =========================
    #  Vyhľadávanie v používateľoch (User)
    #  (dočasne neobmedzujeme na is_public, aby sa dali nájsť všetci testovací používatelia)
    # =========================
    users_qs = User.objects.filter(is_active=True)

    if user_terms:
        user_query = Q()
        for term in user_terms:
            pattern = _build_accent_insensitive_pattern(term)
            # Hľadanie podľa mena, username a lokality (bez emailu / job title / firmy)
            user_query |= (
                Q(first_name__iregex=pattern)
                | Q(last_name__iregex=pattern)
                | Q(username__iregex=pattern)
                | Q(location__iregex=pattern)
                | Q(district__iregex=pattern)
            )
        users_qs = users_qs.filter(user_query)

    # Filter: krajina používateľa
    # POZNÁMKA: Country filter je menej prísny - aplikuje sa len ak by vracal výsledky
    # Ak country filter vracia prázdne výsledky, preskočí sa (nefiltruje sa)
    if country_filter:
        country_location_mapping = {
            "SK": ["slovakia", "slovensko", "slovak"],
            "CZ": ["czech", "česko", "česká", "ceska"],
            "PL": ["poland", "poľsko", "polsko", "polish"],
            "HU": ["hungary", "maďarsko", "madarska", "hungarian"],
            "DE": ["germany", "nemecko", "deutschland", "german"],
            "AT": ["austria", "rakúsko", "rakusko", "österreich"],
        }

        if country_filter in country_location_mapping:
            country_terms = country_location_mapping[country_filter]
            user_country_query = Q()
            for term in country_terms:
                user_country_query |= Q(location__icontains=term) | Q(
                    district__icontains=term
                )

            # Skontroluj, či country filter vracia nejaké výsledky
            # Ak nie, neaplikuj ho (nefiltruj podľa krajiny)
            test_qs = users_qs.filter(user_country_query)
            if test_qs.exists():
                # Country filter vracia výsledky, aplikuj ho
                users_qs = users_qs.filter(user_country_query)
            # Ak country filter nevracia výsledky, preskoč ho (nefiltruj)

    # Filter: len v mojej lokalite (podľa profilu)
    if only_my_location:
        profile_loc_q = Q()
        profile_user = request.user
        if getattr(profile_user, "location", None):
            profile_loc_q |= Q(location__icontains=profile_user.location)
        if getattr(profile_user, "district", None):
            profile_loc_q |= Q(district__icontains=profile_user.district)

        if profile_loc_q:
            users_qs = users_qs.filter(profile_loc_q)

        skill_loc_q = Q()
        if getattr(profile_user, "location", None):
            skill_loc_q |= Q(location__icontains=profile_user.location) | Q(
                user__location__icontains=profile_user.location
            )
        if getattr(profile_user, "district", None):
            skill_loc_q |= Q(district__icontains=profile_user.district) | Q(
                user__district__icontains=profile_user.district
            )
        if skill_loc_q:
            skills_qs = skills_qs.filter(skill_loc_q)

    # Overení, aktívnejší a relevantnejší používatelia vyššie
    if raw_query:
        users_qs = users_qs.annotate(
            relevance=Case(
                When(username__icontains=raw_query, then=3),
                When(first_name__icontains=raw_query, then=2),
                When(last_name__icontains=raw_query, then=2),
                When(location__icontains=raw_query, then=1),
                When(district__icontains=raw_query, then=1),
                default=0,
                output_field=IntegerField(),
            )
        ).order_by("-relevance", "-is_verified", "-updated_at")
    else:
        users_qs = users_qs.order_by("-is_verified", "-updated_at")

    users_paginator = Paginator(users_qs, per_page)
    users_page = users_paginator.get_page(page)

    # Serializácia používateľov – jednoduché, bezpečné pole
    users_data = []
    for user in users_page.object_list:
        avatar_url = None
        try:
            if getattr(user, "avatar", None) and hasattr(user.avatar, "url"):
                url = user.avatar.url
                if request:
                    avatar_url = request.build_absolute_uri(url)
                else:
                    avatar_url = url
        except Exception:
            avatar_url = None

        users_data.append(
            {
                "id": user.id,
                "display_name": user.display_name,
                "district": user.district,
                "location": user.location,
                "is_verified": user.is_verified,
                "avatar_url": avatar_url,
                "slug": getattr(user, "slug", None),
            }
        )

    results = {
        "skills": skills_data,
        "users": users_data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_skills": skills_paginator.count,
            "total_users": users_paginator.count,
            "total_pages_skills": skills_paginator.num_pages,
            "total_pages_users": users_paginator.num_pages,
        },
    }

    return Response(results, status=status.HTTP_200_OK)
