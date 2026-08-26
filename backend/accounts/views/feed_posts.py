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

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..feed_serializers import FeedPostSerializer
from ..models import FeedPost, OfferedSkill
from ..services.feed_share_visibility import SHARE_REASON_MESSAGES
from ..services.feed_tagging import apply_feed_post_tags
from ..services.notifications import create_feed_post_shared_notification
from ..services.user_blocks import user_block_exists_between

# Dotazová vrstva žije vo `feed_post_queries`; re-export tu je zámerný, aby
# importy `from .feed_posts import visible_feed_posts` (a spol.) inde v appke
# ostali platné aj po rozdelení.
from .feed_post_queries import (  # noqa: F401
    COUNTRY_FEED_RANK_BOOST,
    LOCAL_FEED_RANK_BOOST,
    FeedCursorPagination,
    FeedLocalityCursorPagination,
    _annotated_queryset,
    _feed_rank_expression,
    _liked_post_ids,
    _paginated_response,
    _related_count_subquery,
    _serializer_context,
    visible_feed_posts,
)

logger = logging.getLogger(__name__)


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


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([AllowAny])
@api_rate_limit
def feed_post_detail_view(request, post_id: int):
    """GET: permalink. PATCH: úprava textu. DELETE: zmazanie vlastného príspevku.

    Viditeľnosť je pre obe metódy rovnaká ako v zozname. AllowAny s ručnou
    kontrolou prihlásenia pri zapisovacej metóde je vzor už použitý pri
    ``feed_post_comments_view`` – GET musí ostať verejný.

    Upravovať aj mazať smie IBA autor, presne podľa ``can_manage`` v serializeri
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

    if request.method == "PATCH":
        if not request.user.is_authenticated:
            return Response(
                {"error": "Prihlasenie je povinne."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        # Import až tu: `feed_edits` si berie helpery z tohto modulu, takže
        # import na úrovni súboru by uzavrel kruh.
        from .feed_edits import edit_feed_post

        return edit_feed_post(request, post)

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
