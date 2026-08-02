"""Feed Fáza 2a – vytvorenie príspevku + čítacie endpointy.

Viditeľnosť (návrh z Fázy 1): verejný feed zobrazuje len autorov s
is_public=True; vlastné príspevky vidí autor vždy (aj so súkromným profilom).
Pre prihláseného sa vylučujú blokovaní – autor príspevku AJ pôvodný vlastník
zdieľaného obsahu (shared_owner; funguje aj na osirelom zdieľaní, vzor
review_hidden_from_user). Anonym: exclude_blocked_users je no-op.

Stránkovanie: DRF CursorPagination – appka číslované stránky používa pri
statických zoznamoch (recenzie/notifikácie), ale pre nekonečne scrollovaný
feed s priebežne pribúdajúcimi príspevkami by number-based spôsoboval
duplicity/preskoky; DRF cursor (opaque, position-based) je jediné stránkovanie
v DRF, ktoré to rieši, a appka už DRF pagination triedy používa (messaging).

Fotka voľného príspevku: príspevok vzniká NAJPRV (caption je povinný, fotka
voliteľná – validný stav), fotka sa naň pripája existujúcim upload flow
z Fázy 1 (upload-init/upload-complete berú post_id) – žiadny draft mechanizmus.
"""

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..feed_serializers import FeedPostSerializer
from ..models import FeedPost, FeedPostLike, FeedPostTag, OfferedSkill
from ..services.feed_tagging import apply_feed_post_tags
from ..services.user_blocks import exclude_blocked_users


class FeedCursorPagination(CursorPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50
    # Sekundárny -id rieši zhodné created_at (deterministické poradie).
    ordering = ("-created_at", "-id")


def _annotated_queryset():
    """Spoločný queryset so všetkým, čo serializér číta – bez N+1."""
    return (
        FeedPost.objects.select_related(
            "author",
            "shared_offer",
            "shared_portfolio_item",
            "shared_owner",
        )
        .prefetch_related(
            Prefetch(
                "tags",
                queryset=FeedPostTag.objects.select_related("tagged_user").order_by(
                    "created_at", "id"
                ),
            )
        )
        .annotate(
            _likes_count=Count("likes", distinct=True),
            _comments_count=Count("comments", distinct=True),
        )
    )


def _visible_queryset(viewer):
    """Feed viditeľnosť: verejní autori (+ vlastné posty), bez blokovaných."""
    viewer_id = viewer.id if getattr(viewer, "is_authenticated", False) else None

    qs = _annotated_queryset()
    author_visible = Q(author__is_public=True, author__is_active=True)
    if viewer_id:
        author_visible |= Q(author_id=viewer_id)
    qs = qs.filter(author_visible)

    # Blokovanie voči autorovi AJ voči vlastníkovi zdieľaného obsahu
    # (shared_owner prežíva aj zmazanie originálu – presne na toto tam je).
    qs = exclude_blocked_users(qs, viewer_user_id=viewer_id, user_id_field="author_id")
    qs = exclude_blocked_users(
        qs, viewer_user_id=viewer_id, user_id_field="shared_owner_id"
    )
    return qs


def _liked_post_ids(viewer, posts) -> set[int]:
    """ID príspevkov lajknutých viewerom – 1 dotaz na stránku, anonym → {}."""
    if not getattr(viewer, "is_authenticated", False) or not posts:
        return set()
    return set(
        FeedPostLike.objects.filter(
            user=viewer, post_id__in=[post.id for post in posts]
        ).values_list("post_id", flat=True)
    )


def _serializer_context(request, posts):
    return {
        "request": request,
        "liked_feed_post_ids": _liked_post_ids(request.user, posts),
    }


def _paginated_response(request, queryset):
    paginator = FeedCursorPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = FeedPostSerializer(
        page, many=True, context=_serializer_context(request, page)
    )
    return paginator.get_paginated_response(serializer.data)


def _validation_error_response(exc: ValidationError) -> Response:
    return Response(
        {"error": " ".join(exc.messages), "code": getattr(exc, "code", None)},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _bad_request(message: str, code: str) -> Response:
    return Response(
        {"error": message, "code": code}, status=status.HTTP_400_BAD_REQUEST
    )


def _parse_optional_id(value):
    """None pre chýbajúce/nevalidné, inak kladný int."""
    if value in (None, ""):
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _create_feed_post(request) -> Response:
    post_type = str(request.data.get("post_type") or "").strip()
    if post_type not in FeedPost.PostType.values:
        return _bad_request("Neplatny typ prispevku.", "invalid_post_type")

    caption = str(request.data.get("caption") or "").strip()
    offer_id = _parse_optional_id(request.data.get("shared_offer_id"))
    item_id = _parse_optional_id(request.data.get("shared_portfolio_item_id"))

    # Kombinácie typ ↔ zdroj odmietni skôr, než by ich zrazil DB constraint
    # (IntegrityError by bola nič nehovoriaca 500-ka).
    if post_type == FeedPost.PostType.FREE_POST:
        if offer_id or item_id:
            return _bad_request(
                "Volny prispevok nemoze zdielat obsah.", "unexpected_shared_source"
            )
        if not caption:
            return _bad_request(
                "Volny prispevok musi mat text.", "caption_required"
            )
    elif post_type == FeedPost.PostType.SHARED_OFFER:
        if item_id:
            return _bad_request(
                "Zdielanie ponuky nemoze niest portfolio.", "unexpected_shared_source"
            )
        if not offer_id:
            return _bad_request(
                "Chyba shared_offer_id.", "shared_source_required"
            )
    else:  # SHARED_PORTFOLIO_ITEM
        if offer_id:
            return _bad_request(
                "Zdielanie portfolia nemoze niest ponuku.", "unexpected_shared_source"
            )
        if not item_id:
            return _bad_request(
                "Chyba shared_portfolio_item_id.", "shared_source_required"
            )

    shared_offer = None
    shared_item = None
    if offer_id:
        shared_offer = OfferedSkill.objects.filter(pk=offer_id).first()
        if shared_offer is None:
            return _bad_request("Zdielana ponuka neexistuje.", "shared_source_missing")
    if item_id:
        from portfolio.models import PortfolioItem

        shared_item = PortfolioItem.objects.filter(pk=item_id).first()
        if shared_item is None:
            return _bad_request(
                "Zdielana polozka portfolia neexistuje.", "shared_source_missing"
            )

    tagged_user_ids = request.data.get("tagged_user_ids") or []
    if not isinstance(tagged_user_ids, (list, tuple)):
        return _bad_request(
            "tagged_user_ids musi byt zoznam.", "invalid_tagged_user_ids"
        )

    try:
        # Atomicky: keď zlyhá tagovanie (blokovanie/limit), príspevok sa
        # NEvytvorí – klient opraví zoznam a pošle celé znova.
        with transaction.atomic():
            post = FeedPost.objects.create(
                author=request.user,
                post_type=post_type,
                caption=caption,
                shared_offer=shared_offer,
                shared_portfolio_item=shared_item,
            )
            apply_feed_post_tags(post, tagged_user_ids)
    except ValidationError as exc:
        # Modelová validácia (viditeľnosť zdieľania, dĺžka textu) a tagovanie
        # (blokovanie, limit) – zrozumiteľná 400-ka s kódom, nie 500.
        return _validation_error_response(exc)

    created = _annotated_queryset().get(pk=post.pk)
    serializer = FeedPostSerializer(
        created, context=_serializer_context(request, [created])
    )
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@api_rate_limit
def feed_posts_view(request):
    """GET: verejný chronologický feed. POST: vytvorenie príspevku (len auth)."""
    if request.method == "POST":
        if not request.user.is_authenticated:
            return Response(
                {"error": "Prihlasenie je povinne."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return _create_feed_post(request)

    return _paginated_response(request, _visible_queryset(request.user))


@api_view(["GET"])
@permission_classes([AllowAny])
@api_rate_limit
def feed_post_detail_view(request, post_id: int):
    """Permalink na príspevok – rovnaké pravidlá viditeľnosti ako zoznam."""
    post = _visible_queryset(request.user).filter(pk=post_id).first()
    if post is None:
        return Response(
            {"error": "Prispevok nebol najdeny."}, status=status.HTTP_404_NOT_FOUND
        )
    serializer = FeedPostSerializer(post, context=_serializer_context(request, [post]))
    return Response(serializer.data, status=status.HTTP_200_OK)


def _profile_posts_queryset(request, user_id: int, *, tagged: bool):
    """Queryset pre profilové sekcie („moje" / „označený").

    Vlastník vidí svoje príspevky vždy; pre iných platia feed pravidlá
    (is_public autora, blokovanie) – súkromný/blokovaný profil = prázdny
    zoznam, žiadny únik informácií.
    """
    viewer = request.user
    viewer_id = viewer.id if getattr(viewer, "is_authenticated", False) else None

    if tagged:
        qs = _visible_queryset(viewer).filter(tags__tagged_user_id=user_id)
        # unique(post, tagged_user) ⇒ join vyrobí max 1 riadok na príspevok.
        return qs

    if viewer_id == int(user_id):
        return _annotated_queryset().filter(author_id=user_id)
    return _visible_queryset(viewer).filter(author_id=user_id)


@api_view(["GET"])
@permission_classes([AllowAny])
@api_rate_limit
def feed_user_posts_view(request, user_id: int):
    """Príspevky, ktoré používateľ vytvoril (profilová sekcia)."""
    return _paginated_response(
        request, _profile_posts_queryset(request, user_id, tagged=False)
    )


@api_view(["GET"])
@permission_classes([AllowAny])
@api_rate_limit
def feed_user_tagged_posts_view(request, user_id: int):
    """Príspevky, kde je používateľ označený (profilová sekcia)."""
    return _paginated_response(
        request, _profile_posts_queryset(request, user_id, tagged=True)
    )
