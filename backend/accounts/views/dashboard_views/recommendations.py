from __future__ import annotations

import os
from time import time_ns

from django.core.cache import cache
from django.db.models import Case, F, IntegerField, Q, Value, When
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ...models import DashboardSkillSearchProjection, OfferedSkill
from ...viewer_location_cache import get_viewer_location_snapshot
from .search import SMART_KEYWORD_INDEX, _serialize_search_skills_page
from .utils import _build_accent_insensitive_pattern, _sanitize_search_term

DEFAULT_LIMIT = 10
MAX_LIMIT = 20
MAX_CANDIDATES = 80
MAX_TERMS_PER_SKILL = 12
PER_USER_LIMIT = 2

RECOMMENDATIONS_CACHE_TTL_SECONDS = int(
    os.getenv("DASHBOARD_RECOMMENDATIONS_CACHE_TTL_SECONDS", "120") or "120"
)
RECOMMENDATIONS_CACHE_VERSION_TTL_SECONDS = int(
    os.getenv("DASHBOARD_RECOMMENDATIONS_CACHE_VERSION_TTL_SECONDS", "86400")
    or "86400"
)
RECOMMENDATIONS_V2_ENABLED = (
    os.getenv("DASHBOARD_RECOMMENDATIONS_V2_ENABLED", "1").strip().lower()
    in {"1", "true", "yes", "on"}
)
RECOMMENDATIONS_ALGO_VERSION = "v2" if RECOMMENDATIONS_V2_ENABLED else "v1"

COMPLEMENTARY_SUBCATEGORY_SCORE = 60
COMPLEMENTARY_CATEGORY_SCORE = 42
EXACT_SUBCATEGORY_SCORE = 34
EXACT_CATEGORY_SCORE = 24
COMPLEMENTARY_RELATED_SCORE = 16
RELATED_SCORE = 10
DISTRICT_SCORE = 10
LOCATION_SCORE = 6
VERIFIED_SCORE = 5
FRESH_7D_SCORE = 4
FRESH_30D_SCORE = 2


def _parse_limit(raw_limit: str | None) -> int:
    try:
        limit = int(str(raw_limit or DEFAULT_LIMIT).strip())
    except (TypeError, ValueError):
        return DEFAULT_LIMIT
    return max(1, min(limit, MAX_LIMIT))


def _recommendations_cache_version_key(viewer_user_id: int) -> str:
    return f"dashboard_recommendations_version_v2:{int(viewer_user_id)}"


def _recommendations_cache_version(viewer_user_id: int) -> str:
    try:
        version = cache.get(_recommendations_cache_version_key(viewer_user_id))
    except Exception:
        version = None
    return str(version or "1")


def _recommendations_cache_key(*, viewer_user_id: int, limit: int) -> str:
    version = _recommendations_cache_version(viewer_user_id)
    return (
        f"dashboard_recommendations_ids:{RECOMMENDATIONS_ALGO_VERSION}:"
        f"{int(viewer_user_id)}:{int(limit)}:{version}"
    )


def invalidate_dashboard_recommendations_cache(viewer_user_id: int | None) -> None:
    if not viewer_user_id:
        return
    try:
        cache.set(
            _recommendations_cache_version_key(int(viewer_user_id)),
            str(time_ns()),
            timeout=RECOMMENDATIONS_CACHE_VERSION_TTL_SECONDS,
        )
    except Exception:
        pass


def _collect_skill_terms(skill: OfferedSkill) -> list[str]:
    raw_values: list[str] = []

    for value in (skill.category, skill.subcategory):
        if isinstance(value, str) and value.strip():
            raw_values.append(value.strip())
            raw_values.extend(token for token in value.replace(",", " ").split() if token)

    tags = getattr(skill, "tags", None)
    if isinstance(tags, list):
        for tag in tags:
            cleaned = str(tag).strip()
            if cleaned:
                raw_values.append(cleaned)

    terms: list[str] = []
    seen: set[str] = set()
    for raw in raw_values:
        key = raw.casefold()
        if key and key not in seen:
            seen.add(key)
            terms.append(raw)

        group = SMART_KEYWORD_INDEX.get(key)
        if not group:
            continue
        for synonym in group:
            synonym_key = synonym.casefold()
            if synonym_key and synonym_key not in seen:
                seen.add(synonym_key)
                terms.append(synonym)

        if len(terms) >= MAX_TERMS_PER_SKILL:
            break

    return terms[:MAX_TERMS_PER_SKILL]


def _build_projection_similarity_q(terms: list[str]) -> Q:
    similarity_q = Q()
    for term in terms:
        pattern = _build_accent_insensitive_pattern(_sanitize_search_term(term))
        similarity_q |= (
            Q(category__iregex=pattern)
            | Q(subcategory__iregex=pattern)
            | Q(tags_text__icontains=term)
        )
    return similarity_q


def _build_projection_exact_match_q(field_name: str, value: str) -> Q:
    cleaned = str(value or "").strip()
    if not cleaned:
        return Q()
    pattern = _build_accent_insensitive_pattern(_sanitize_search_term(cleaned))
    return Q(**{f"{field_name}__iregex": f"^{pattern}$"})


def _build_locality_match_queries(viewer_location: tuple[str, str]) -> tuple[Q, Q]:
    viewer_city, viewer_district = viewer_location
    district_q = Q()
    location_q = Q()

    if viewer_district:
        district_q = Q(skill_district__icontains=viewer_district) | Q(
            user_district__icontains=viewer_district
        )
    if viewer_city:
        location_q = Q(skill_location__icontains=viewer_city) | Q(
            user_location__icontains=viewer_city
        )

    return location_q, district_q


def _build_personalization_queries(
    viewer_skills: list[OfferedSkill],
) -> tuple[Q, Q, Q, Q, Q, Q, bool]:
    complementary_subcategory_q = Q()
    complementary_category_q = Q()
    exact_subcategory_q = Q()
    exact_category_q = Q()
    related_q = Q()
    complementary_related_q = Q()
    has_personal_terms = False

    for viewer_skill in viewer_skills:
        opposite_type_q = Q(is_seeking=not bool(viewer_skill.is_seeking))

        exact_sub_q = _build_projection_exact_match_q(
            "subcategory",
            getattr(viewer_skill, "subcategory", ""),
        )
        if exact_sub_q:
            exact_subcategory_q |= exact_sub_q
            complementary_subcategory_q |= exact_sub_q & opposite_type_q
            has_personal_terms = True

        exact_cat_q = _build_projection_exact_match_q(
            "category",
            getattr(viewer_skill, "category", ""),
        )
        if exact_cat_q:
            exact_category_q |= exact_cat_q
            complementary_category_q |= exact_cat_q & opposite_type_q
            has_personal_terms = True

        terms = _collect_skill_terms(viewer_skill)
        if not terms:
            continue

        skill_related_q = _build_projection_similarity_q(terms)
        related_q |= skill_related_q
        complementary_related_q |= skill_related_q & opposite_type_q
        has_personal_terms = True

    return (
        complementary_subcategory_q,
        complementary_category_q,
        exact_subcategory_q,
        exact_category_q,
        related_q,
        complementary_related_q,
        has_personal_terms,
    )


def _select_diverse_skill_ids(
    rows: list[tuple[int, int]],
    *,
    limit: int,
    per_user_limit: int = PER_USER_LIMIT,
) -> list[int]:
    selected_skill_ids: list[int] = []
    user_counts: dict[int, int] = {}

    for skill_id, user_id in rows:
        if user_counts.get(user_id, 0) >= per_user_limit:
            continue
        user_counts[user_id] = user_counts.get(user_id, 0) + 1
        selected_skill_ids.append(skill_id)
        if len(selected_skill_ids) >= limit:
            break

    return selected_skill_ids


def _legacy_ranked_queryset(
    *,
    base_qs,
    viewer_location: tuple[str, str],
    complementary_related_q: Q,
    related_q: Q,
    has_personal_terms: bool,
):
    location_q, district_q = _build_locality_match_queries(viewer_location)
    locality_q = district_q | location_q

    if viewer_location[0] or viewer_location[1]:
        locality_rank = Case(
            When(locality_q, then=Value(1)),
            default=Value(0),
            output_field=IntegerField(),
        )
    else:
        locality_rank = Value(0, output_field=IntegerField())

    if has_personal_terms:
        personalization_rank = Case(
            When(complementary_related_q, then=Value(3)),
            When(related_q, then=Value(2)),
            default=Value(0),
            output_field=IntegerField(),
        )
    else:
        personalization_rank = Value(0, output_field=IntegerField())

    return base_qs.annotate(
        personalization_rank=personalization_rank,
        locality_rank=locality_rank,
    ).order_by(
        "-personalization_rank",
        "-locality_rank",
        "-user_is_verified",
        "-created_at",
    )


def _ranked_recommendations_queryset(*, base_qs, viewer_location, personalization_queries):
    (
        complementary_subcategory_q,
        complementary_category_q,
        exact_subcategory_q,
        exact_category_q,
        related_q,
        complementary_related_q,
        has_personal_terms,
    ) = personalization_queries

    if not RECOMMENDATIONS_V2_ENABLED:
        return _legacy_ranked_queryset(
            base_qs=base_qs,
            viewer_location=viewer_location,
            complementary_related_q=complementary_related_q,
            related_q=related_q,
            has_personal_terms=has_personal_terms,
        )

    location_q, district_q = _build_locality_match_queries(viewer_location)
    now = timezone.now()

    match_score = Value(0, output_field=IntegerField())
    if has_personal_terms:
        match_score = Case(
            When(complementary_subcategory_q, then=Value(COMPLEMENTARY_SUBCATEGORY_SCORE)),
            When(complementary_category_q, then=Value(COMPLEMENTARY_CATEGORY_SCORE)),
            When(exact_subcategory_q, then=Value(EXACT_SUBCATEGORY_SCORE)),
            When(exact_category_q, then=Value(EXACT_CATEGORY_SCORE)),
            When(complementary_related_q, then=Value(COMPLEMENTARY_RELATED_SCORE)),
            When(related_q, then=Value(RELATED_SCORE)),
            default=Value(0),
            output_field=IntegerField(),
        )

    if district_q and location_q:
        locality_score = Case(
            When(district_q, then=Value(DISTRICT_SCORE)),
            When(location_q, then=Value(LOCATION_SCORE)),
            default=Value(0),
            output_field=IntegerField(),
        )
    elif district_q:
        locality_score = Case(
            When(district_q, then=Value(DISTRICT_SCORE)),
            default=Value(0),
            output_field=IntegerField(),
        )
    elif location_q:
        locality_score = Case(
            When(location_q, then=Value(LOCATION_SCORE)),
            default=Value(0),
            output_field=IntegerField(),
        )
    else:
        locality_score = Value(0, output_field=IntegerField())
    verified_score = Case(
        When(user_is_verified=True, then=Value(VERIFIED_SCORE)),
        default=Value(0),
        output_field=IntegerField(),
    )
    freshness_score = Case(
        When(created_at__gte=now - timezone.timedelta(days=7), then=Value(FRESH_7D_SCORE)),
        When(created_at__gte=now - timezone.timedelta(days=30), then=Value(FRESH_30D_SCORE)),
        default=Value(0),
        output_field=IntegerField(),
    )

    return (
        base_qs.annotate(
            match_score=match_score,
            locality_score=locality_score,
            verified_score=verified_score,
            freshness_score=freshness_score,
        )
        .annotate(
            recommendation_score=F("match_score")
            + F("locality_score")
            + F("verified_score")
            + F("freshness_score")
        )
        .order_by(
            "-recommendation_score",
            "-match_score",
            "-locality_score",
            "-verified_score",
            "-freshness_score",
            "-created_at",
        )
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_recommendations_view(request):
    limit = _parse_limit(request.GET.get("limit"))
    cache_key = _recommendations_cache_key(viewer_user_id=request.user.pk, limit=limit)

    selected_skill_ids: list[int] | None = None
    if RECOMMENDATIONS_CACHE_TTL_SECONDS > 0:
        try:
            cached_value = cache.get(cache_key)
        except Exception:
            cached_value = None
        if isinstance(cached_value, list) and all(
            isinstance(skill_id, int) for skill_id in cached_value
        ):
            selected_skill_ids = cached_value

    if selected_skill_ids is None:
        viewer_location = get_viewer_location_snapshot(request.user)
        viewer_skills = list(
            OfferedSkill.objects.filter(user=request.user, is_hidden=False)
            .only(
                "id",
                "category",
                "subcategory",
                "tags",
                "is_seeking",
            )
            .order_by("-updated_at")[:10]
        )
        personalization_queries = _build_personalization_queries(viewer_skills)

        base_qs = DashboardSkillSearchProjection.objects.filter(
            user_is_public=True,
            is_hidden=False,
        ).exclude(user_id=request.user.pk)

        ranked_qs = _ranked_recommendations_queryset(
            base_qs=base_qs,
            viewer_location=viewer_location,
            personalization_queries=personalization_queries,
        )
        candidate_rows = list(
            ranked_qs.values_list("skill_id", "user_id")[: max(limit * 8, MAX_CANDIDATES)]
        )
        selected_skill_ids = _select_diverse_skill_ids(candidate_rows, limit=limit)

        if RECOMMENDATIONS_CACHE_TTL_SECONDS > 0:
            try:
                cache.set(
                    cache_key,
                    selected_skill_ids,
                    timeout=RECOMMENDATIONS_CACHE_TTL_SECONDS,
                )
            except Exception:
                pass

    skills_data, _ = _serialize_search_skills_page(request, selected_skill_ids)
    return Response({"skills": skills_data}, status=status.HTTP_200_OK)
