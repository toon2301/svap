"""
Helpery pre reviews views (vyčlenené z reviews.py kvôli dĺžke).

Agregát hodnotení, parsovanie stránkovania, anotácia like-stavu a payload pre
like toggle. Čisté funkcie bez väzby na request/view okrem parsovania query params.
"""

from decimal import Decimal

from django.db.models import Avg, Count, Exists, OuterRef, Q

from ..models import Review, ReviewLike

# Stránkovanie zoznamu recenzií (rovnaký vzor ako /search/).
REVIEWS_DEFAULT_PAGE_SIZE = 10
REVIEWS_MAX_PAGE_SIZE = 50


def _reviews_rating_stats(offer) -> dict:
    """Agregát hodnotení ponuky – priemer + rozdelenie podľa hviezd.

    Počíta sa cez VŠETKY recenzie (nezávisí od práve načítanej stránky), aby
    súhrn na frontende ostal správny aj pri stránkovaní. Rozsahy zodpovedajú
    zaokrúhleniu na celé hviezdy (krok hodnotenia je 0.5): <1.5→1, …, ≥4.5→5.
    """
    agg = Review.objects.filter(offer=offer).aggregate(
        average=Avg("rating"),
        b1=Count("id", filter=Q(rating__lt=Decimal("1.5"))),
        b2=Count("id", filter=Q(rating__gte=Decimal("1.5"), rating__lt=Decimal("2.5"))),
        b3=Count("id", filter=Q(rating__gte=Decimal("2.5"), rating__lt=Decimal("3.5"))),
        b4=Count("id", filter=Q(rating__gte=Decimal("3.5"), rating__lt=Decimal("4.5"))),
        b5=Count("id", filter=Q(rating__gte=Decimal("4.5"))),
    )
    average = agg["average"]
    return {
        "average": round(float(average), 2) if average is not None else 0.0,
        "breakdown": {
            "1": agg["b1"],
            "2": agg["b2"],
            "3": agg["b3"],
            "4": agg["b4"],
            "5": agg["b5"],
        },
    }


def _parse_reviews_page_params(request):
    """Spracuje ?page a ?page_size s rovnakými limitmi ako ostatné zoznamy."""
    try:
        page = int(str(request.query_params.get("page", "1")).strip())
    except (TypeError, ValueError):
        page = 1
    if page < 1:
        page = 1

    page_size = REVIEWS_DEFAULT_PAGE_SIZE
    raw_page_size = request.query_params.get("page_size")
    if raw_page_size is not None:
        try:
            page_size = int(str(raw_page_size).strip())
        except (TypeError, ValueError):
            page_size = REVIEWS_DEFAULT_PAGE_SIZE
    if page_size <= 0:
        page_size = REVIEWS_DEFAULT_PAGE_SIZE
    if page_size > REVIEWS_MAX_PAGE_SIZE:
        page_size = REVIEWS_MAX_PAGE_SIZE

    return page, page_size


def _reviews_with_like_state(queryset, user):
    queryset = queryset.annotate(likes_count=Count("likes", distinct=True))
    if getattr(user, "is_authenticated", False):
        return queryset.annotate(
            is_liked_by_me=Exists(
                ReviewLike.objects.filter(review_id=OuterRef("pk"), user_id=user.id)
            )
        )
    return queryset


def _offer_hidden_from_user(offer, user):
    is_owner = offer.user_id == getattr(user, "id", None)
    return not is_owner and (
        offer.is_hidden or not getattr(offer.user, "is_public", True)
    )


def _review_like_payload(*, review_id: int, user_id: int) -> dict:
    return {
        "review_id": review_id,
        "is_liked_by_me": ReviewLike.objects.filter(
            review_id=review_id,
            user_id=user_id,
        ).exists(),
        "likes_count": ReviewLike.objects.filter(review_id=review_id).count(),
    }
