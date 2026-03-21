"""
Global public search endpoint:
- returns both users and offers
- isolated from existing /api/auth/search/ implementation
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Case, IntegerField, Q, Value, When
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..models import OfferedSkill
from ..serializers import OfferedSkillSearchSerializer

User = get_user_model()

USERS_LIMIT = 20
OFFERS_LIMIT = 20
MAX_Q_LEN = 100


class SearchUserResultSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "display_name",
            "slug",
            "user_type",
            "location",
            "district",
            "is_verified",
            "avatar_url",
        ]

    def get_avatar_url(self, obj):
        try:
            if getattr(obj, "avatar", None) and hasattr(obj.avatar, "url"):
                request = self.context.get("request")
                url = obj.avatar.url
                return request.build_absolute_uri(url) if request else url
        except Exception:
            return None
        return None


def _split_terms(q: str) -> list[str]:
    return [term for term in q.replace(",", " ").split() if term]


@api_view(["GET"])
@permission_classes([AllowAny])
@api_rate_limit
def global_search_view(request):
    """
    GET /api/auth/search/global/?q=...

    Response:
    {
      "users": [...],
      "offers": [...],
      "users_count": number,
      "offers_count": number
    }
    """
    q = (request.query_params.get("q") or "").strip()
    if len(q) > MAX_Q_LEN:
        return Response(
            {"error": f"Parameter q môže mať maximálne {MAX_Q_LEN} znakov."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not q:
        return Response(
            {"users": [], "offers": [], "users_count": 0, "offers_count": 0},
            status=status.HTTP_200_OK,
        )

    terms = _split_terms(q)

    # =========================
    # Users search (public + active only)
    # =========================
    users_qs = (
        User.objects.filter(is_active=True, is_public=True)
        .exclude(is_staff=True)
        .exclude(is_superuser=True)
    )
    # NOTE: keep DB-portable lookups only (no regex operators).
    if terms:
        uq = Q()
        for term in terms:
            uq |= (
                Q(first_name__icontains=term)
                | Q(last_name__icontains=term)
                | Q(username__icontains=term)
                | Q(company_name__icontains=term)
                | Q(slug__icontains=term)
                | Q(location__icontains=term)
                | Q(district__icontains=term)
            )
        users_qs = users_qs.filter(uq)

    users_qs = users_qs.annotate(
        relevance=Case(
            When(username__icontains=q, then=Value(4)),
            When(slug__icontains=q, then=Value(3)),
            When(company_name__icontains=q, then=Value(3)),
            When(first_name__icontains=q, then=Value(2)),
            When(last_name__icontains=q, then=Value(2)),
            When(location__icontains=q, then=Value(1)),
            When(district__icontains=q, then=Value(1)),
            default=Value(0),
            output_field=IntegerField(),
        )
    ).order_by("-relevance", "-is_verified", "-updated_at")

    users_count = users_qs.count()
    users = list(users_qs[:USERS_LIMIT])
    users_data = SearchUserResultSerializer(
        users, many=True, context={"request": request}
    ).data

    # =========================
    # Offers search (existing OfferedSkill search logic; unhidden only)
    # =========================
    offers_qs = (
        OfferedSkill.objects.filter(is_hidden=False, user__is_active=True, user__is_public=True)
        .select_related("user")
    )
    if q:
        offers_qs = offers_qs.filter(
            Q(category__icontains=q)
            | Q(subcategory__icontains=q)
            | Q(description__icontains=q)
            | Q(detailed_description__icontains=q)
            | Q(tags__icontains=q)
        )

    # Keep relevance_score for OfferedSkillSearchSerializer compatibility.
    offers_qs = offers_qs.annotate(
        relevance_score=(
            Case(When(tags__icontains=q, then=Value(3)), default=Value(0), output_field=IntegerField())
            + Case(
                When(subcategory__icontains=q, then=Value(2)),
                default=Value(0),
                output_field=IntegerField(),
            )
            + Case(When(category__icontains=q, then=Value(2)), default=Value(0), output_field=IntegerField())
            + Case(
                When(description__icontains=q, then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
            + Case(
                When(detailed_description__icontains=q, then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
    ).order_by("-relevance_score", "-created_at")

    offers_count = offers_qs.count()
    offers = list(offers_qs[:OFFERS_LIMIT])
    offers_data = OfferedSkillSearchSerializer(
        offers, many=True, context={"request": request}
    ).data

    return Response(
        {
            "users": users_data,
            "offers": offers_data,
            "users_count": users_count,
            "offers_count": offers_count,
        },
        status=status.HTTP_200_OK,
    )

