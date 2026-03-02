"""
Isolated public search endpoint (no coupling to existing search views).
"""

from decimal import Decimal, InvalidOperation

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Avg, Case, IntegerField, Q, Value, When
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ..models import OfferedSkill
from ..serializers import OfferedSkillSerializer


def _parse_decimal(value: str | None) -> Decimal | None:
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    try:
        return Decimal(s)
    except (InvalidOperation, ValueError):
        return None


def _invalid_param():
    return Response(
        {"error": "Invalid query parameter."},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def search_view(request):
    """
    GET /api/auth/search/
    """
    qs = (
        OfferedSkill.objects.filter(is_hidden=False)
        .select_related("user")
    )

    # q (max 100)
    q = (request.query_params.get("q") or "").strip()
    if len(q) > 100:
        return Response(
            {"error": "Parameter q môže mať maximálne 100 znakov."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if q:
        qs = qs.filter(
            Q(category__icontains=q)
            | Q(subcategory__icontains=q)
            | Q(description__icontains=q)
            | Q(detailed_description__icontains=q)
            | Q(tags__icontains=q)
        )

    # type: offer|seeking
    type_param = (request.query_params.get("type") or "").strip().lower()
    if type_param == "offer":
        qs = qs.filter(is_seeking=False)
    elif type_param == "seeking":
        qs = qs.filter(is_seeking=True)

    # user_type: business|individual
    user_type = (request.query_params.get("user_type") or "").strip().lower()
    if user_type == "business":
        qs = qs.filter(user__user_type="company")
    elif user_type == "individual":
        qs = qs.filter(user__user_type="individual")

    # price_min / price_max
    raw_price_min = request.query_params.get("price_min")
    raw_price_max = request.query_params.get("price_max")
    price_min = _parse_decimal(raw_price_min)
    price_max = _parse_decimal(raw_price_max)
    if raw_price_min is not None and price_min is None:
        return _invalid_param()
    if raw_price_max is not None and price_max is None:
        return _invalid_param()
    if price_min is not None:
        qs = qs.filter(price_from__gte=price_min)
    if price_max is not None:
        qs = qs.filter(price_from__lte=price_max)

    # min_rating (optional param; strict parsing if provided)
    raw_min_rating = request.query_params.get("min_rating")
    min_rating = _parse_decimal(raw_min_rating)
    if raw_min_rating is not None and min_rating is None:
        return _invalid_param()

    # district + locality_priority
    district = (request.query_params.get("district") or "").strip()
    if district:
        qs = qs.annotate(
            locality_priority=Case(
                When(district=district, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        )
    else:
        qs = qs.annotate(locality_priority=Value(1, output_field=IntegerField()))

    needs_avg_rating = (request.query_params.get("sort") or "").strip().lower() == "rating_desc" or min_rating is not None
    if needs_avg_rating:
        qs = qs.annotate(_avg_rating=Coalesce(Avg("reviews__rating"), 0.0))
        if min_rating is not None:
            qs = qs.filter(_avg_rating__gte=min_rating)

    # sort whitelist
    sort = (request.query_params.get("sort") or "").strip().lower()
    if sort == "rating_desc":
        qs = qs.order_by("locality_priority", "-_avg_rating")
    elif sort == "newest":
        qs = qs.order_by("locality_priority", "-created_at")
    elif sort == "price_asc":
        qs = qs.order_by("locality_priority", "price_from", "-created_at")
    elif sort == "price_desc":
        qs = qs.order_by("locality_priority", "-price_from", "-created_at")
    else:
        qs = qs.order_by("locality_priority", "-created_at")

    # pagination: page, page_size
    raw_page = request.query_params.get("page")
    if raw_page is None:
        page = 1
    else:
        try:
            page = int(str(raw_page).strip())
        except Exception:
            return _invalid_param()
        if page < 1:
            return _invalid_param()

    raw_page_size = request.query_params.get("page_size")
    if raw_page_size is None:
        page_size = 12
    else:
        try:
            page_size = int(str(raw_page_size).strip())
        except Exception:
            return _invalid_param()
        if page_size <= 0:
            return _invalid_param()
    if page_size > 50:
        page_size = 50

    paginator = Paginator(qs, page_size)
    try:
        page_obj = paginator.page(page)
    except PageNotAnInteger:
        page = 1
        page_obj = paginator.page(page)
    except EmptyPage:
        page = paginator.num_pages if paginator.num_pages > 0 else 1
        page_obj = paginator.page(page) if paginator.num_pages > 0 else []

    items = list(page_obj) if page_obj else []
    serializer = OfferedSkillSerializer(items, many=True, context={"request": request})

    return Response(
        {
            "results": serializer.data,
            "total": paginator.count,
            "page": page,
            "page_size": page_size,
            "total_pages": paginator.num_pages,
        },
        status=status.HTTP_200_OK,
    )

