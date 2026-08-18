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

import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
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
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

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
    OfferedSkill,
)
from ..services.feed_share_visibility import SHARE_REASON_MESSAGES
from ..services.feed_tagging import apply_feed_post_tags
from ..services.notifications import create_feed_post_shared_notification
from ..services.user_blocks import exclude_blocked_users, user_block_exists_between


logger = logging.getLogger(__name__)


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


def _validation_error_code(exc: ValidationError):
    """Kód z ValidationError – aj keď je zabalená do error_dict (per-pole)."""
    code = getattr(exc, "code", None)
    if code:
        return code
    error_dict = getattr(exc, "error_dict", None)
    if error_dict:
        for errors in error_dict.values():
            for error in errors:
                nested = getattr(error, "code", None)
                if nested:
                    return nested
    return None


def _validation_error_response(exc: ValidationError) -> Response:
    code = _validation_error_code(exc)
    # Neviditeľný CUDZÍ zdroj zdieľania musí vyzerať rovnako ako neexistujúci –
    # inak by sa dalo z rozdielu v odpovedi vyčítať, ktoré ID existujú
    # (enumeration). Vlastný obsah sem nespadne: self-share kontrolu obchádza.
    if code in SHARE_REASON_MESSAGES:
        return _shared_source_missing_response()
    return Response(
        {"error": " ".join(exc.messages), "code": code},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _bad_request(message: str, code: str) -> Response:
    return Response(
        {"error": message, "code": code}, status=status.HTTP_400_BAD_REQUEST
    )


def _shared_source_missing_response() -> Response:
    """Jednotná odpoveď pre „zdroj neexistuje ALEBO naň nemáš prístup"."""
    return _bad_request(
        "Zdielany obsah nie je dostupny.", "shared_source_missing"
    )


def _parse_optional_id(value):
    """None pre chýbajúce/nevalidné, inak kladný int."""
    # bool je podtrieda int – bez tejto vetvy by sa True ticho stalo ID 1.
    if value in (None, "") or isinstance(value, bool):
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _notify_shared_owner(post, actor) -> None:
    """Notifikuj vlastníka koreňového obsahu, že ho niekto zdieľal ďalej.

    Zlyhanie notifikácie nesmie zhodiť už vytvorený príspevok – rovnaký vzor
    ako notify_*_about_like vo feed_interactions.
    """
    try:
        create_feed_post_shared_notification(post=post, actor=actor)
    except Exception:
        logger.exception(
            "Feed post share notification dispatch failed",
            extra={
                "post_id": getattr(post, "id", None),
                "shared_owner_id": getattr(post, "shared_owner_id", None),
                "actor_id": getattr(actor, "id", None),
            },
        )


def _parse_bool(value) -> bool:
    """Tolerantné čítanie príznaku – JSON pošle bool, multipart reťazec."""
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ("1", "true", "yes", "on")


def _create_feed_post(request) -> Response:
    post_type = str(request.data.get("post_type") or "").strip()
    if post_type not in FeedPost.PostType.values:
        return _bad_request("Neplatny typ prispevku.", "invalid_post_type")

    caption = str(request.data.get("caption") or "").strip()
    offer_id = _parse_optional_id(request.data.get("shared_offer_id"))
    item_id = _parse_optional_id(request.data.get("shared_portfolio_item_id"))
    post_id = _parse_optional_id(request.data.get("shared_feed_post_id"))
    provided_sources = [value for value in (offer_id, item_id, post_id) if value]

    # Kombinácie typ ↔ zdroj odmietni skôr, než by ich zrazil DB constraint
    # (IntegrityError by bola nič nehovoriaca 500-ka).
    if len(provided_sources) > 1:
        return _bad_request(
            "Zdielat mozno len jeden zdroj naraz.", "unexpected_shared_source"
        )
    if post_type == FeedPost.PostType.FREE_POST:
        if provided_sources:
            return _bad_request(
                "Volny prispevok nemoze zdielat obsah.", "unexpected_shared_source"
            )
        # Text ALEBO fotka – prázdny príspevok nie.
        #
        # Fotku v tomto okamihu overiť NEDÁ SA: príspevok musí existovať skôr,
        # než sa naň dá naviazať (S3 kľúč obsahuje post_id), takže pri INSERTe
        # je fotiek vždy nula. Klient preto posiela ZÁMER – hneď po vytvorení
        # spustí upload. Nie je to nepriestrelné (klient môže klamať a fotku
        # nikdy nepridať), je to vedomá dôvera v rámci existujúceho flow:
        # vynútiť to inak by znamenalo obrátiť poradie vzniku príspevku a
        # uploadu, čo je architektonická zmena mimo tohto rozsahu. Proti
        # objemovému zneužitiu stojí ``api_rate_limit`` nad týmto endpointom.
        if not caption and not _parse_bool(request.data.get("will_attach_photo")):
            return _bad_request(
                "Volny prispevok musi mat text alebo fotku.", "caption_required"
            )
    elif post_type == FeedPost.PostType.SHARED_OFFER:
        if not offer_id:
            return _bad_request(
                "Chyba shared_offer_id.", "shared_source_required"
            )
    elif post_type == FeedPost.PostType.SHARED_PORTFOLIO_ITEM:
        if not item_id:
            return _bad_request(
                "Chyba shared_portfolio_item_id.", "shared_source_required"
            )
    else:  # SHARED_FEED_POST
        if not post_id:
            return _bad_request(
                "Chyba shared_feed_post_id.", "shared_source_required"
            )

    shared_offer = None
    shared_item = None
    shared_post = None
    if offer_id:
        shared_offer = OfferedSkill.objects.filter(pk=offer_id).first()
        if shared_offer is None:
            return _shared_source_missing_response()
    if item_id:
        from portfolio.models import PortfolioItem

        shared_item = PortfolioItem.objects.filter(pk=item_id).first()
        if shared_item is None:
            return _shared_source_missing_response()
    if post_id:
        # Zdroj musí byť pre zdieľajúceho viditeľný – neviditeľný príspevok
        # vráti rovnakú hlášku ako neexistujúci (ochrana proti enumeration).
        shared_post = (
            visible_feed_posts(
                request.user,
                queryset=FeedPost.objects.select_related("author", "shared_owner"),
            )
            .filter(pk=post_id)
            .first()
        )
        if shared_post is None:
            return _shared_source_missing_response()

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
                shared_feed_post=shared_post,
            )
            apply_feed_post_tags(post, tagged_user_ids)
            if post.post_type != FeedPost.PostType.FREE_POST:
                transaction.on_commit(
                    lambda created_post=post: _notify_shared_owner(
                        created_post, request.user
                    )
                )
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
    """GET: verejný feed (lokálne prvé, potom chronologicky). POST: nový príspevok.

    Uprednostnenie okresu platí LEN pre hlavný feed – profilové zoznamy ostávajú
    čisto chronologické (tam je autor jeden, takže lokalita nič nerozlišuje).
    """
    if request.method == "POST":
        if not request.user.is_authenticated:
            return Response(
                {"error": "Prihlasenie je povinne."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return _create_feed_post(request)

    queryset = visible_feed_posts(request.user).annotate(
        feed_rank=_feed_rank_expression(request.user)
    )
    return _paginated_response(
        request, queryset, paginator=FeedLocalityCursorPagination()
    )


@api_view(["GET", "DELETE"])
@permission_classes([AllowAny])
@api_rate_limit
def feed_post_detail_view(request, post_id: int):
    """GET: permalink na príspevok. DELETE: zmazanie vlastného príspevku.

    Viditeľnosť je pre obe metódy rovnaká ako v zozname. AllowAny s ručnou
    kontrolou prihlásenia pri zapisovacej metóde je vzor už použitý pri
    ``feed_post_comments_view`` – GET musí ostať verejný.

    Mazať smie IBA autor, presne podľa ``can_manage`` v serializeri
    (``viewer_id == author_id``); iný vzťah k príspevku právo nedáva.
    Súvisiace záznamy (fotky, lajky, komentáre, tagy, nahlásenia) idú
    CASCADE-om z Fázy 1; zdieľania cudzích autorov majú ``SET_NULL``, takže
    prežijú ako „obsah už nie je dostupný" a nezmiznú spolu s originálom.
    """
    post = visible_feed_posts(request.user).filter(pk=post_id).first()
    if post is None:
        return Response(
            {"error": "Prispevok nebol najdeny."}, status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "DELETE":
        if not request.user.is_authenticated:
            return Response(
                {"error": "Prihlasenie je povinne."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if post.author_id != request.user.id:
            # Príspevok je viditeľný, existenciu netajíme → 403, rovnako ako
            # pri zmazaní cudzieho komentára.
            return Response(
                {"error": "Na zmazanie prispevku nemas opravnenie."},
                status=status.HTTP_403_FORBIDDEN,
            )
        post.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = FeedPostSerializer(post, context=_serializer_context(request, [post]))
    return Response(serializer.data, status=status.HTTP_200_OK)


def _profile_user_visible(viewer, user_id: int) -> bool:
    """Smie viewer vôbec vidieť profilové zoznamy tohto používateľa?

    Pri „moje príspevky" to zabezpečí filter na autora, ale pri „označený" je
    cieľový používateľ INÝ než autori príspevkov – bez tejto kontroly by sa
    dala vyčítať história označení súkromného alebo blokujúceho používateľa
    cez príspevky verejných autorov.
    """
    viewer_id = viewer.id if getattr(viewer, "is_authenticated", False) else None
    if viewer_id == int(user_id):
        return True

    target = (
        get_user_model()
        .objects.filter(pk=user_id)
        .only("id", "is_public", "is_active")
        .first()
    )
    if target is None or not target.is_public or not target.is_active:
        return False
    if viewer_id and user_block_exists_between(
        first_user_id=viewer_id, second_user_id=int(user_id)
    ):
        return False
    return True


def _profile_posts_queryset(request, user_id: int, *, tagged: bool):
    """Queryset pre profilové sekcie („moje" / „označený").

    Vlastník vidí svoje príspevky vždy; pre iných platia feed pravidlá
    (is_public autora, blokovanie) – súkromný/blokovaný profil = prázdny
    zoznam, žiadny únik informácií.
    """
    viewer = request.user
    viewer_id = viewer.id if getattr(viewer, "is_authenticated", False) else None

    # Nedostupný profil vracia prázdny zoznam – rovnako ako neexistujúce ID,
    # aby sa z odpovede nedal odvodiť dôvod (súkromie/blok/neexistencia).
    if not _profile_user_visible(viewer, user_id):
        return FeedPost.objects.none()

    if tagged:
        # unique(post, tagged_user) ⇒ join vyrobí max 1 riadok na príspevok.
        return visible_feed_posts(viewer).filter(tags__tagged_user_id=user_id)

    if viewer_id == int(user_id):
        return _annotated_queryset().filter(author_id=user_id)
    return visible_feed_posts(viewer).filter(author_id=user_id)


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
