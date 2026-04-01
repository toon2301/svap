from __future__ import annotations

from django.db.models import Case, IntegerField, Q, Value, When
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ...models import DashboardSkillSearchProjection, OfferedSkill
from ...viewer_location_cache import get_viewer_location_snapshot
from .search import (
    SMART_KEYWORD_INDEX,
    _build_projection_only_my_location_filters,
    _serialize_search_skills_page,
)
from .utils import _build_accent_insensitive_pattern, _sanitize_search_term

DEFAULT_LIMIT = 10
MAX_LIMIT = 20
MAX_CANDIDATES = 60
MAX_TERMS_PER_SKILL = 12
PER_USER_LIMIT = 2


def _parse_limit(raw_limit: str | None) -> int:
    try:
        limit = int(str(raw_limit or DEFAULT_LIMIT).strip())
    except (TypeError, ValueError):
        return DEFAULT_LIMIT
    return max(1, min(limit, MAX_LIMIT))


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


def _build_personalization_queries(viewer_skills: list[OfferedSkill]) -> tuple[Q, Q, bool]:
    related_q = Q()
    complementary_q = Q()
    has_personal_terms = False

    for viewer_skill in viewer_skills:
        terms = _collect_skill_terms(viewer_skill)
        if not terms:
            continue

        skill_related_q = _build_projection_similarity_q(terms)
        related_q |= skill_related_q
        complementary_q |= skill_related_q & Q(is_seeking=not bool(viewer_skill.is_seeking))
        has_personal_terms = True

    return related_q, complementary_q, has_personal_terms


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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_recommendations_view(request):
    limit = _parse_limit(request.GET.get("limit"))

    viewer_location = get_viewer_location_snapshot(request.user)
    projection_location_q = _build_projection_only_my_location_filters(viewer_location)

    viewer_skills = list(
        OfferedSkill.objects.filter(user=request.user, is_hidden=False).only(
            "category",
            "subcategory",
            "tags",
            "is_seeking",
        )[:10]
    )
    related_q, complementary_q, has_personal_terms = _build_personalization_queries(
        viewer_skills
    )

    base_qs = DashboardSkillSearchProjection.objects.filter(user_is_public=True, is_hidden=False)
    base_qs = base_qs.exclude(user_id=request.user.pk)

    if viewer_location[0] or viewer_location[1]:
        locality_rank = Case(
            When(projection_location_q, then=Value(1)),
            default=Value(0),
            output_field=IntegerField(),
        )
    else:
        locality_rank = Value(0, output_field=IntegerField())

    if has_personal_terms:
        personalization_rank = Case(
            When(complementary_q, then=Value(3)),
            When(related_q, then=Value(2)),
            default=Value(0),
            output_field=IntegerField(),
        )
    else:
        personalization_rank = Value(0, output_field=IntegerField())

    ranked_qs = base_qs.annotate(
        personalization_rank=personalization_rank,
        locality_rank=locality_rank,
    ).order_by(
        "-personalization_rank",
        "-locality_rank",
        "-user_is_verified",
        "-created_at",
    )

    candidate_rows = list(
        ranked_qs.values_list("skill_id", "user_id")[: max(limit * 6, MAX_CANDIDATES)]
    )
    selected_skill_ids = _select_diverse_skill_ids(candidate_rows, limit=limit)
    skills_data, _ = _serialize_search_skills_page(request, selected_skill_ids)

    return Response({"skills": skills_data}, status=status.HTTP_200_OK)
