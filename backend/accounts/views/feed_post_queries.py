"""Dotazová vrstva feed príspevkov – viditeľnosť, anotácie a stránkovanie.

Vyčlenené z ``feed_posts``: rovnaký krok ako pri komentároch
(``feed_comment_queries``). Zoraďovanie podľa blízkosti, anotované počty,
prefetch a stránkovacie triedy tvoria súvislý celok, ktorý s HTTP vrstvou
nesúvisí – a ``feed_posts`` prerastal 500 riadkov.

Správanie sa nemení, ide o presun kódu. ``feed_posts`` mená re-exportuje,
takže importy inde v appke ostávajú platné.
"""

import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import (
    Case,
    Count,
    DateTimeField,
    F,
    IntegerField,
    OuterRef,
    Prefetch,
    Q,
    Subquery,
    Value,
    When,
)
from django.db.models.functions import Coalesce
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response

from ..district_registry import (
    get_country_district_labels,
    normalize_district_text as _normalize_district_text,
    resolve_country_from_district_label,
)
from ..feed_serializers import FeedPostSerializer
from ..models import (
    FeedPost,
    FeedPostComment,
    FeedPostImage,
    FeedPostLike,
    FeedPostTag,
)
from ..services.user_blocks import exclude_blocked_users

logger = logging.getLogger(__name__)

User = get_user_model()


class FeedCursorPagination(CursorPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50
    # Sekundárny -id rieši zhodné created_at (deterministické poradie).
    ordering = ("-created_at", "-id")


class FeedLocalityCursorPagination(FeedCursorPagination):
    """Hlavný feed: najprv rovnaký okres, potom chronologicky zvyšok.

    Zoradenie ide cez JEDNO pole ``feed_rank`` zámerne. DRF CursorPagination
    filtruje kurzor len podľa ``ordering[0]`` (pagination.py: ``order =
    self.ordering[0]`` → ``__lt``/``__gt``), takže dvojica ``("-is_local",
    "-created_at")`` by kurzor postavila na boolean s dvoma hodnotami a
    stránkovanie by sa rozsypalo (duplicity/preskoky). ``feed_rank`` je
    monotónny datetime, ktorý obe úrovne spája do jednej – kurzor tak ostáva
    stabilný a poradie je pritom dvojúrovňové.
    """

    ordering = ("-feed_rank", "-id")


# Posun „do budúcnosti" pre lokálne príspevky. 100 rokov je bezpečne viac než
# rozptyl reálnych created_at, takže každý lokálny príspevok je nad každým
# nelokálnym, a vnútri oboch skupín ostáva chronológia nedotknutá.
LOCAL_FEED_RANK_BOOST = timedelta(days=36500)
# Stredná vrstva: rovnaká krajina, iný okres. Musí byť VÝRAZNE menší než
# okresný bonus, ale zároveň väčší než rozptyl reálnych ``created_at`` – inak
# by starý príspevok z krajiny prepadol pod čerstvý zo sveta. 10 rokov spĺňa
# oboje: je 10× menší než okresný (90-ročný odstup medzi vrstvami) a zároveň
# rádovo viac, než koľko má appka histórie.
COUNTRY_FEED_RANK_BOOST = timedelta(days=3650)


def _feed_rank_expression(viewer):
    """Zoraďovací kľúč: created_at + bonus podľa blízkosti autora.

    Tri vrstvy v JEDNOM sortovateľnom poli (cursor vie radiť len podľa
    jedného): okres > krajina > zvyšok sveta, s chronológiou zachovanou
    vnútri každej vrstvy.

    Anonym aj prihlásený bez vyplneného okresu dostanú čistý ``created_at`` –
    teda presne pôvodné chronologické poradie, žiadne uprednostňovanie.
    Okres sa berie z AUTORA príspevku (``author__district``) pre všetky typy
    vrátane zdieľaní – rozhoduje, kto zdieľal, nie odkiaľ je pôvodná ponuka.

    Krajina sa ODVODZUJE z názvu okresu cez register (``User`` ju neukladá).
    Porovnáva sa preto zoznamom labelov danej krajiny, nie kódom – a keď sa
    krajina odvodiť nedá (neznámy alebo vo viacerých krajinách rovnaký názov),
    stredná vrstva jednoducho odpadne a ostane pôvodné dvojvrstvové správanie.
    """
    district = ""
    if getattr(viewer, "is_authenticated", False):
        district = (getattr(viewer, "district", "") or "").strip()
    if not district:
        return F("created_at")

    # Aj okresná vrstva porovnáva bez ohľadu na veľkosť písmen a diakritiku:
    # obe strany sú voľný text, takže „Kosice I" vs. „Košice I" je ten istý
    # okres a rozdielny zápis nemá dôvod bonus zrušiť.
    district_forms = {district.lower(), _normalize_district_text(district)}
    branches = [
        When(
            author__district__lower__in=tuple(form for form in district_forms if form),
            then=F("created_at") + Value(LOCAL_FEED_RANK_BOOST),
        )
    ]

    country_code = resolve_country_from_district_label(district)
    country_districts = (
        get_country_district_labels(country_code) if country_code else ()
    )
    if country_districts:
        # Case vyhodnocuje vetvy v poradí, takže zhoda okresu vyššie vyhráva
        # nad zhodou krajiny – žiadny príspevok nedostane oba bonusy.
        branches.append(
            When(
                # `__lower` zrovná veľkosť písmen na strane DB, diakritiku
                # rieši samotný zoznam (obsahuje aj tvar bez mäkčeňov) –
                # ``User.district`` je voľný text, takže presné porovnanie by
                # inak zapísaný, ale rovnaký okres minulo.
                author__district__lower__in=country_districts,
                then=F("created_at") + Value(COUNTRY_FEED_RANK_BOOST),
            )
        )

    return Case(
        *branches,
        default=F("created_at"),
        output_field=DateTimeField(),
    )


def _related_count_subquery(model):
    """Korelovaný COUNT väzieb jedného príspevku.

    Prečo nie ``Count("likes", distinct=True)``: dva nezávislé „many" vzťahy
    v jednom dotaze sa spoja krížom, takže DB najprv vyrobí lajky × komentáre
    riadkov a až potom ich deduplikuje. Čísla sú síce správne (to zabezpečí
    ``distinct``), ale pri populárnom príspevku (1000 lajkov × 100 komentárov)
    je to 100k riadkov na jeden príspevok. Subquery počíta každý vzťah zvlášť,
    takže hlavný dotaz ostáva jeden riadok na príspevok.

    ``order_by()`` je nutné: modely majú Meta.ordering a tie stĺpce by inak
    pribudli do GROUP BY a rozbili agregáciu na jeden riadok.
    ``Coalesce`` drží 0 pre príspevky bez väzieb (subquery by vrátila NULL).
    """
    return Coalesce(
        Subquery(
            model.objects.filter(post=OuterRef("pk"))
            .order_by()
            .values("post")
            .annotate(count=Count("pk"))
            .values("count"),
            output_field=IntegerField(),
        ),
        Value(0),
    )


def _annotated_queryset():
    """Spoločný queryset so všetkým, čo serializér číta – bez N+1."""
    return (
        FeedPost.objects.select_related(
            "author",
            "shared_offer",
            "shared_portfolio_item",
            "shared_feed_post",
            "shared_owner",
        )
        .prefetch_related(
            Prefetch(
                "tags",
                queryset=FeedPostTag.objects.select_related("tagged_user").order_by(
                    "created_at", "id"
                ),
            ),
            # Fotky serializuje get_images – bez prefetchu by to bolo N+1.
            Prefetch(
                "images",
                queryset=FeedPostImage.objects.order_by("order", "id"),
            ),
        )
        .annotate(
            _likes_count=_related_count_subquery(FeedPostLike),
            _comments_count=_related_count_subquery(FeedPostComment),
        )
    )


def visible_feed_posts(viewer, *, queryset=None):
    """Feed viditeľnosť: verejní autori (+ vlastné posty), bez blokovaných.

    Jediný zdroj pravdy pre viditeľnosť príspevku – používa ho zoznam, detail,
    profilové zoznamy aj obrázkové proxy views (tie si podávajú vlastný ľahký
    queryset bez anotácií a prefetchov, ktoré na streamovanie súboru netreba).
    """
    viewer_id = viewer.id if getattr(viewer, "is_authenticated", False) else None

    qs = _annotated_queryset() if queryset is None else queryset
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


def _paginated_response(request, queryset, *, paginator=None):
    paginator = paginator or FeedCursorPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = FeedPostSerializer(
        page, many=True, context=_serializer_context(request, page)
    )
    return paginator.get_paginated_response(serializer.data)
