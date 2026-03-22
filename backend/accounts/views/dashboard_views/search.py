from decimal import Decimal, InvalidOperation
from time import perf_counter

from django.contrib.auth import get_user_model
from django.core.paginator import Paginator
from django.db.models import Case, IntegerField, Q, When
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ...models import OfferedSkill
from ...serializers import OfferedSkillSerializer
from .smart_search import SMART_KEYWORD_GROUPS
from .utils import (
    _build_accent_insensitive_pattern,
    _remove_diacritics,
    _sanitize_search_term,
)

User = get_user_model()


# Index pre smart search - presunute z dashboard.py bez zmeny spravania
SMART_KEYWORD_INDEX = {}
for group in SMART_KEYWORD_GROUPS:
    lowered = [w.lower() for w in group]
    for word in lowered:
        # Mapuj aj diakriticke aj bezdiakriticke verzie na tu istu skupinu.
        SMART_KEYWORD_INDEX[word] = lowered
        no_accents = _remove_diacritics(word)
        SMART_KEYWORD_INDEX[no_accents] = lowered


def _serialize_search_skills_page(request, page_skill_ids):
    """
    Serialize only the current page with the optimized skills queryset/context.

    The page is first sliced on plain skill ids and then loaded once via the
    optimized queryset, which avoids fetching the full page of skills twice.
    """
    page_skill_ids = list(page_skill_ids)
    if not page_skill_ids:
        return [], {
            "dashboard_search_skills_queryset_load": 0.0,
            "dashboard_search_skills_context": 0.0,
            "dashboard_search_skills_serialize": 0.0,
        }

    from ..skills import _skills_list_context, _skills_list_queryset

    t_qs0 = perf_counter()
    preserved_order = Case(
        *[When(pk=pk, then=position) for position, pk in enumerate(page_skill_ids)],
        output_field=IntegerField(),
    )
    optimized_qs = _skills_list_queryset(
        OfferedSkill.objects.filter(pk__in=page_skill_ids)
    ).order_by(preserved_order)
    optimized_skills = list(optimized_qs)
    t_qs1 = perf_counter()

    t_ctx0 = perf_counter()
    serializer_context = {
        "request": request,
        **_skills_list_context(request, page_skill_ids),
    }
    t_ctx1 = perf_counter()

    t_ser0 = perf_counter()
    data = OfferedSkillSerializer(
        optimized_skills,
        many=True,
        context=serializer_context,
    ).data
    t_ser1 = perf_counter()

    return data, {
        "dashboard_search_skills_queryset_load": (t_qs1 - t_qs0) * 1000.0,
        "dashboard_search_skills_context": (t_ctx1 - t_ctx0) * 1000.0,
        "dashboard_search_skills_serialize": (t_ser1 - t_ser0) * 1000.0,
    }


def _record_dashboard_search_timing(request, **entries) -> None:
    try:
        base_req = getattr(request, "_request", request)
        st = getattr(base_req, "_server_timing", None)
        if not isinstance(st, dict):
            st = {}
        st.update(entries)
        base_req._server_timing = st
    except Exception:
        pass


def _build_only_my_location_filters(profile_user):
    user_loc_q = Q()
    skill_loc_q = Q()

    if getattr(profile_user, "location", None):
        user_loc_q |= Q(location__icontains=profile_user.location)
        skill_loc_q |= Q(location__icontains=profile_user.location) | Q(
            user__location__icontains=profile_user.location
        )
    if getattr(profile_user, "district", None):
        user_loc_q |= Q(district__icontains=profile_user.district)
        skill_loc_q |= Q(district__icontains=profile_user.district) | Q(
            user__district__icontains=profile_user.district
        )

    return user_loc_q, skill_loc_q


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_search_view(request):
    """Dashboard search - vyhladavanie zrucnosti a pouzivatelov."""
    t_view0 = perf_counter()
    raw_query = (request.GET.get("q") or "").strip()
    raw_query = raw_query[:100]
    raw_location = (request.GET.get("location") or "").strip()
    raw_district = (request.GET.get("district") or "").strip()

    offer_type = ((request.GET.get("offer_type") or "").strip().lower())
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
    country_filter = ((request.GET.get("country") or "").strip().upper())

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

    base_terms = [term for term in raw_query.replace(",", " ").split() if term]

    location_terms = []
    if raw_district:
        location_terms.append(raw_district)
    if raw_location and raw_location not in location_terms:
        location_terms.append(raw_location)

    skill_terms = set()
    for term in base_terms + location_terms:
        normalized = term.strip()
        if not normalized:
            continue
        skill_terms.add(normalized)
        group = SMART_KEYWORD_INDEX.get(normalized.lower())
        if group:
            for group_term in group:
                skill_terms.add(group_term)

    user_terms = set()
    for term in base_terms + location_terms:
        normalized = term.strip()
        if normalized:
            user_terms.add(normalized)

    # =========================
    # Skills search
    # =========================
    skills_qs = OfferedSkill.objects.select_related("user").filter(user__is_public=True)
    skills_qs = skills_qs.exclude(user=request.user)
    skills_qs = skills_qs.filter(is_hidden=False)

    if skill_terms:
        skill_query = Q()
        for term in skill_terms:
            pattern = _build_accent_insensitive_pattern(_sanitize_search_term(term))
            skill_query |= (
                Q(category__iregex=pattern)
                | Q(subcategory__iregex=pattern)
                | Q(tags__icontains=term)
                | Q(location__iregex=pattern)
                | Q(district__iregex=pattern)
                | Q(user__location__iregex=pattern)
                | Q(user__district__iregex=pattern)
            )
        skills_qs = skills_qs.filter(skill_query)

    if offer_type == "offer":
        skills_qs = skills_qs.filter(is_seeking=False)
    elif offer_type == "seeking":
        skills_qs = skills_qs.filter(is_seeking=True)

    if country_filter:
        country_location_mapping = {
            "SK": ["slovakia", "slovensko", "slovak"],
            "CZ": ["czech", "\u010desko", "\u010desk\u00e1", "cesko", "ceska"],
            "PL": ["poland", "po\u013esko", "polsko", "polish"],
            "HU": ["hungary", "ma\u010farsko", "madarsko", "hungarian"],
            "DE": ["germany", "nemecko", "deutschland", "german"],
            "AT": ["austria", "rak\u00fasko", "rakusko", "\u00f6sterreich", "osterreich"],
        }

        if country_filter in country_location_mapping:
            country_terms = country_location_mapping[country_filter]
            country_query = Q()
            for term in country_terms:
                country_query |= Q(user__location__icontains=term) | Q(
                    user__district__icontains=term
                )

            test_qs = skills_qs.filter(country_query)
            if test_qs.exists():
                skills_qs = skills_qs.filter(country_query)

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

    if only_my_location:
        _, skill_loc_q = _build_only_my_location_filters(request.user)
        if skill_loc_q:
            skills_qs = skills_qs.filter(skill_loc_q)

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

    t_sk_count0 = perf_counter()
    skills_paginator = Paginator(skills_qs.values_list("id", flat=True), per_page)
    total_skills = skills_paginator.count
    total_pages_skills = skills_paginator.num_pages
    t_sk_count1 = perf_counter()

    t_sk_page0 = perf_counter()
    skills_page = skills_paginator.get_page(page)
    page_skill_ids = list(skills_page.object_list)
    t_sk_page1 = perf_counter()

    t_sk_load0 = perf_counter()
    skills_data, skills_page_timing = _serialize_search_skills_page(
        request, page_skill_ids
    )
    t_sk_load1 = perf_counter()

    # =========================
    # Users search
    # =========================
    users_qs = User.objects.filter(is_active=True)

    if user_terms:
        user_query = Q()
        for term in user_terms:
            pattern = _build_accent_insensitive_pattern(_sanitize_search_term(term))
            user_query |= (
                Q(first_name__iregex=pattern)
                | Q(last_name__iregex=pattern)
                | Q(username__iregex=pattern)
                | Q(location__iregex=pattern)
                | Q(district__iregex=pattern)
            )
        users_qs = users_qs.filter(user_query)

    if country_filter:
        country_location_mapping = {
            "SK": ["slovakia", "slovensko", "slovak"],
            "CZ": ["czech", "\u010desko", "\u010desk\u00e1", "cesko", "ceska"],
            "PL": ["poland", "po\u013esko", "polsko", "polish"],
            "HU": ["hungary", "ma\u010farsko", "madarsko", "hungarian"],
            "DE": ["germany", "nemecko", "deutschland", "german"],
            "AT": ["austria", "rak\u00fasko", "rakusko", "\u00f6sterreich", "osterreich"],
        }

        if country_filter in country_location_mapping:
            country_terms = country_location_mapping[country_filter]
            user_country_query = Q()
            for term in country_terms:
                user_country_query |= Q(location__icontains=term) | Q(
                    district__icontains=term
                )

            test_qs = users_qs.filter(user_country_query)
            if test_qs.exists():
                users_qs = users_qs.filter(user_country_query)

    if only_my_location:
        user_loc_q, _ = _build_only_my_location_filters(request.user)
        if user_loc_q:
            users_qs = users_qs.filter(user_loc_q)

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

    t_users_count0 = perf_counter()
    users_paginator = Paginator(users_qs, per_page)
    total_users = users_paginator.count
    total_pages_users = users_paginator.num_pages
    t_users_count1 = perf_counter()

    t_users_page0 = perf_counter()
    users_page = users_paginator.get_page(page)
    t_users_page1 = perf_counter()

    t_users_load0 = perf_counter()
    page_users = list(users_page.object_list)
    t_users_load1 = perf_counter()

    t_users_serialize0 = perf_counter()
    users_data = []
    for user in page_users:
        avatar_url = None
        try:
            if getattr(user, "avatar", None) and hasattr(user.avatar, "url"):
                url = user.avatar.url
                avatar_url = request.build_absolute_uri(url) if request else url
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
    t_users_serialize1 = perf_counter()

    _record_dashboard_search_timing(
        request,
        dashboard_search_skills_count=(t_sk_count1 - t_sk_count0) * 1000.0,
        dashboard_search_skills_page_ids=(t_sk_page1 - t_sk_page0) * 1000.0,
        dashboard_search_skills_page_load=(t_sk_load1 - t_sk_load0) * 1000.0,
        **skills_page_timing,
        dashboard_search_users_count=(t_users_count1 - t_users_count0) * 1000.0,
        dashboard_search_users_page=(t_users_page1 - t_users_page0) * 1000.0,
        dashboard_search_users_page_load=(t_users_load1 - t_users_load0) * 1000.0,
        dashboard_search_users_serialize=(
            t_users_serialize1 - t_users_serialize0
        )
        * 1000.0,
    )

    t_resp0 = perf_counter()
    response = Response(
        {
            "skills": skills_data,
            "users": users_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_skills": total_skills,
                "total_users": total_users,
                "total_pages_skills": total_pages_skills,
                "total_pages_users": total_pages_users,
            },
        },
        status=status.HTTP_200_OK,
    )
    t_resp1 = perf_counter()

    _record_dashboard_search_timing(
        request,
        dashboard_search_response_build=(t_resp1 - t_resp0) * 1000.0,
        dashboard_search_view_total=(t_resp1 - t_view0) * 1000.0,
    )
    return response
