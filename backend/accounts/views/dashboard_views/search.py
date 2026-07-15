import logging
from decimal import Decimal, InvalidOperation
from time import perf_counter

from django.contrib.auth import get_user_model
from django.core.paginator import Paginator
from django.db import DatabaseError
from django.db.models import Case, IntegerField, Q, When
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.services.user_blocks import exclude_blocked_users
from swaply.rate_limiting import search_rate_limit

from ...models import OfferedSkill
from ...serializers import OfferedSkillSerializer
from ...viewer_location_cache import get_viewer_location_snapshot
from ..search_query_builders import (
    COUNTRY_LOCATION_MAPPING,
    SMART_KEYWORD_INDEX,
    _build_legacy_skills_page_qs,
    _build_only_my_location_filters,
    _build_projection_only_my_location_filters,
    _build_projection_skills_page_qs,
    _slice_page_ids,
)
from .utils import (
    _build_accent_insensitive_pattern,
    _sanitize_search_term,
    accent_insensitive_contains_q,
)

User = get_user_model()

logger = logging.getLogger("swaply")

# Horná hranica čísla stránky (ochrana pred obrovským OFFSET pri manuálnom/škodlivom
# requeste). Pri per_page≤50 to je max ~50k offset – dosť veľkorysé pre reálne stránkovanie.
MAX_DASHBOARD_SEARCH_PAGE = 1000


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
    visible_skills = exclude_blocked_users(
        OfferedSkill.objects.filter(pk__in=page_skill_ids),
        viewer_user_id=request.user.id,
        user_id_field="user_id",
    )
    optimized_qs = _skills_list_queryset(visible_skills).order_by(preserved_order)
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@search_rate_limit
def dashboard_search_view(request):
    """Dashboard search - vyhladavanie zrucnosti a pouzivatelov."""
    t_view0 = perf_counter()
    raw_query = (request.GET.get("q") or "").strip()
    raw_query = raw_query[:100]
    # location/district idú (rovnako ako q) do regex/ILIKE search termov – ohranič
    # ich dĺžku, aby extrémne dlhý vstup nespôsobil pomalý pattern matching.
    raw_location = (request.GET.get("location") or "").strip()[:100]
    raw_district = (request.GET.get("district") or "").strip()[:100]

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
                    "has_next_skills": False,
                    "has_next_users": False,
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
    # Ohranič page zdola aj zhora: extrémne vysoký page by inak spôsobil obrovský
    # OFFSET na skills vetve (zbytočný sken). Frontend stránkuje cez has_next (+1),
    # takže reálne stránkovanie tým neobmedzíme. (search_view klampuje analogicky.)
    page = max(1, min(page, MAX_DASHBOARD_SEARCH_PAGE))

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

    viewer_location = ("", "")
    viewer_location_ms = 0.0
    if only_my_location:
        t_viewer_loc0 = perf_counter()
        viewer_location = get_viewer_location_snapshot(request.user)
        viewer_location_ms = (perf_counter() - t_viewer_loc0) * 1000.0
    user_loc_q, skill_loc_q = _build_only_my_location_filters(viewer_location)
    projection_skill_loc_q = _build_projection_only_my_location_filters(
        viewer_location
    )

    # =========================
    # Skills search
    # =========================
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

    t_sk_page0 = perf_counter()
    try:
        projection_skills_page_qs = _build_projection_skills_page_qs(
            viewer_user_id=request.user.pk,
            raw_query=raw_query,
            skill_terms=skill_terms,
            country_filter=country_filter,
            offer_type=offer_type,
            price_min=price_min,
            price_max=price_max,
            projection_skill_loc_q=projection_skill_loc_q,
            only_my_location=only_my_location,
        )
        projection_skills_page_qs = exclude_blocked_users(
            projection_skills_page_qs,
            viewer_user_id=request.user.id,
            user_id_field="user_id",
        )
        page_skill_ids, has_next_skills = _slice_page_ids(
            projection_skills_page_qs,
            page=page,
            per_page=per_page,
            id_field="skill_id",
        )
    except DatabaseError:
        # Denormalizovaná projekcia zlyhala (napr. chýbajúca/poškodená tabuľka,
        # zámok, migrácia v behu). Aby search fungoval, prepneme na pomalší legacy
        # OfferedSkill dotaz – ale zalogujeme WARNING, nech tichý prepad na pomalšiu
        # cestu nezostane do budúcna neviditeľný (monitoring/alerty).
        logger.warning(
            "dashboard_search: projekcia DashboardSkillSearchProjection zlyhala "
            "(DatabaseError) – prepínam na legacy OfferedSkill dotaz.",
            exc_info=True,
        )
        legacy_skills_page_qs = _build_legacy_skills_page_qs(
            viewer_user=request.user,
            raw_query=raw_query,
            skill_terms=skill_terms,
            country_filter=country_filter,
            offer_type=offer_type,
            price_min=price_min,
            price_max=price_max,
            skill_loc_q=skill_loc_q,
            only_my_location=only_my_location,
        )
        legacy_skills_page_qs = exclude_blocked_users(
            legacy_skills_page_qs,
            viewer_user_id=request.user.id,
            user_id_field="user_id",
        )
        page_skill_ids, has_next_skills = _slice_page_ids(
            legacy_skills_page_qs,
            page=page,
            per_page=per_page,
        )
    t_sk_page1 = perf_counter()

    t_sk_load0 = perf_counter()
    skills_data, skills_page_timing = _serialize_search_skills_page(
        request, page_skill_ids
    )
    t_sk_load1 = perf_counter()

    # =========================
    # Users search
    # =========================
    # Vlastný profil je vždy viditeľný (aj neverejný / staff); ostatní musia byť
    # verejní a nie administrátorské účty – zhodne s verejným/global searchom.
    users_qs = User.objects.filter(is_active=True).filter(
        Q(pk=request.user.pk)
        | Q(is_public=True, is_staff=False, is_superuser=False)
    )
    users_qs = exclude_blocked_users(
        users_qs,
        viewer_user_id=request.user.id,
    )

    if user_terms:
        user_query = Q()
        for term in user_terms:
            pattern = _build_accent_insensitive_pattern(_sanitize_search_term(term))
            user_query |= (
                accent_insensitive_contains_q("first_name", term)
                | accent_insensitive_contains_q("last_name", term)
                | accent_insensitive_contains_q("username", term)
                | Q(location__iregex=pattern)
                | Q(district__iregex=pattern)
            )
        users_qs = users_qs.filter(user_query)

    if country_filter and country_filter in COUNTRY_LOCATION_MAPPING:
        # Rovnak\u00e9 mapovanie ako pre skills (modulov\u00e1 kon\u0161tanta) \u2013 \u017eiadny duplik\u00e1t.
        country_terms = COUNTRY_LOCATION_MAPPING[country_filter]
        user_country_query = Q()
        for term in country_terms:
            user_country_query |= Q(location__icontains=term) | Q(
                district__icontains=term
            )

        test_qs = users_qs.filter(user_country_query)
        if test_qs.exists():
            users_qs = users_qs.filter(user_country_query)

    if only_my_location and user_loc_q:
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
    has_next_users = users_page.has_next()

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
        dashboard_search_skills_count_base=0.0,
        dashboard_search_skills_count_exec=0.0,
        dashboard_search_skills_count=0.0,
        dashboard_search_skills_page_ids=(t_sk_page1 - t_sk_page0) * 1000.0,
        dashboard_search_skills_page_load=(t_sk_load1 - t_sk_load0) * 1000.0,
        **skills_page_timing,
        dashboard_search_viewer_location_load=viewer_location_ms,
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
                "total_skills": None,
                "total_users": total_users,
                "total_pages_skills": None,
                "total_pages_users": total_pages_users,
                "has_next_skills": has_next_skills,
                "has_next_users": has_next_users,
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
