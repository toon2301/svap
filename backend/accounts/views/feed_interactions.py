"""Feed Fáza 2b – interakcie nad príspevkami: lajk, komentáre, nahlásenie.

Viditeľnosť: všetky endpointy idú cez visible_feed_posts (jediný zdroj pravdy
z Fázy 2a) – neviditeľný príspevok (súkromný autor/blok) vracia 404 bez
prezradenia existencie.

Lajk: presne vzor offer_like_view/portfolio_item_like_view – idempotentné
get_or_create pod lock_user_pair_for_update (blok-vs-lajk race), notifikácia
cez transaction.on_commit, dedup rieši create_feed_post_liked_notification.

Zmazanie komentára: autor komentára ALEBO autor príspevku. Appka priamy
precedens nemá (prvý komentárový model); najbližšie vzory sa líšia – recenziu
hodnotený zmazať nemôže (peer obsah), správu v konverzácii tiež nie. Komentár
ale žije na nástenke autora príspevku a Fáza 2b nemá report komentárov, takže
moderácia vlastného príspevku je jediná obrana proti zneužitiu – preto aj
vlastník „kontajnera".
"""

import logging

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Count, F, OuterRef, Prefetch, Q, Subquery, Value, Window
from django.db.models.functions import Coalesce, RowNumber
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..feed_serializers import FeedPostCommentSerializer, FeedUserSummarySerializer
from ..models import (
    FeedPost,
    FeedPostComment,
    FeedPostCommentLike,
    FeedPostLike,
    FeedPostReport,
    FeedPostTag,
)
from ..services.notifications import (
    create_feed_post_comment_liked_notification,
    create_feed_post_comment_reply_notification,
    create_feed_post_commented_notification,
    create_feed_post_liked_notification,
)
from ..services.user_blocks import (
    BlockedUserInteractionError,
    exclude_blocked_users,
    lock_user_pair_for_update,
    lock_users_and_ensure_interaction_allowed,
)
from .feed_posts import visible_feed_posts
from .photo_reports import _validate_report_payload

logger = logging.getLogger(__name__)

#: Koľko odpovedí sa načíta pod jeden komentár. Zvyšok je dostupný cez
#: `replies_count` – klient vie, že tam sú, aj keď ich zatiaľ nevidí.
FEED_REPLIES_PREVIEW_LIMIT = 10


class FeedCommentCursorPagination(CursorPagination):
    """Cursor ako feed (konzistentné), ale chronologicky NAHOR – komentáre sa
    čítajú od najstaršieho (vlákno), nové prichádzajú na koniec."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50
    ordering = ("created_at", "id")
    #: Nastaví view, keď sa celkový počet líši od stránkovaného querysetu.
    forced_total_count: int | None = None

    def paginate_queryset(self, queryset, request, view=None):
        """Count počíta LEN pri prvom načítaní (request bez cursoru).

        CursorPagination count zámerne nepočíta – tu ho FE potrebuje, aby číslo
        pri ikone komentárov vychádzalo z toho istého načítania ako zoznam.
        Pri pokračovacích stránkach je však zbytočný a DRAHÝ: queryset je
        anotovaný ``Count("likes")``, takže `.count()` sa zabalí do subquery
        nad joinom komentárov a lajkov (nie prostý index count). Počítať ho pri
        každom „načítaj ďalšie" znamená opakovane skenovať celé vlákno –
        práca rastie s počtom stránok, teda kvadraticky s veľkosťou vlákna.
        FE ho pri donačítavaní aj tak zahadzuje.
        """
        self.total_count = None
        if request.query_params.get(self.cursor_query_param) is None:
            # `total_count` sa nastavuje zvonku (view), keď sa počet líši od
            # veľkosti stránkovaného querysetu – zoznam nesie len vrcholové
            # komentáre, ale číslo pri ikone musí zahŕňať aj odpovede.
            self.total_count = (
                self.forced_total_count
                if self.forced_total_count is not None
                else queryset.count()
            )
        return super().paginate_queryset(queryset, request, view=view)

    def get_paginated_response(self, data):
        response = super().get_paginated_response(data)
        # Pri cursor requestoch pole ZÁMERNE chýba (nie None) – klient si tak
        # nemôže omylom prepísať správny počet nulou.
        if self.total_count is not None:
            response.data["count"] = self.total_count
        return response


def _liked_comment_ids(viewer, comments) -> set[int]:
    """ID komentárov lajknutých viewerom – 1 dotaz na stránku, anonym → set().

    Rovnaký vzor ako _liked_post_ids vo feed_posts (žiadne N+1).
    """
    if not getattr(viewer, "is_authenticated", False) or not comments:
        return set()
    return set(
        FeedPostCommentLike.objects.filter(
            user=viewer, comment_id__in=[comment.id for comment in comments]
        ).values_list("comment_id", flat=True)
    )


def _get_visible_post(request, post_id: int) -> FeedPost | None:
    return (
        visible_feed_posts(
            request.user,
            queryset=FeedPost.objects.select_related("author"),
        )
        .filter(pk=post_id)
        .first()
    )


def _post_not_found() -> Response:
    return Response(
        {"error": "Prispevok nebol najdeny."}, status=status.HTTP_404_NOT_FOUND
    )


def _like_payload(*, post_id: int, user_id: int) -> dict:
    return {
        "post_id": post_id,
        "is_liked_by_me": FeedPostLike.objects.filter(
            post_id=post_id, user_id=user_id
        ).exists(),
        "likes_count": FeedPostLike.objects.filter(post_id=post_id).count(),
    }


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def feed_post_like_view(request, post_id: int):
    """POST: lajk (idempotentné). DELETE: odlajkovanie. Self-like povolený."""
    post = _get_visible_post(request, post_id)
    if post is None:
        return _post_not_found()

    if request.method == "POST":

        def notify_author_about_like():
            try:
                create_feed_post_liked_notification(post=post, actor=request.user)
            except Exception:
                logger.exception(
                    "Feed post like notification dispatch failed",
                    extra={
                        "post_id": getattr(post, "id", None),
                        "author_id": getattr(post, "author_id", None),
                        "actor_id": getattr(request.user, "id", None),
                    },
                )

        with transaction.atomic():
            lock_user_pair_for_update(
                first_user_id=request.user.id,
                second_user_id=post.author_id,
            )
            # Re-check pod zámkom – blok/sprivátnenie tesne pred lajkom.
            post = _get_visible_post(request, post_id)
            if post is None:
                return _post_not_found()
            _, created = FeedPostLike.objects.get_or_create(
                post=post,
                user=request.user,
            )
            if created:
                transaction.on_commit(notify_author_about_like)

        payload = _like_payload(post_id=post.id, user_id=request.user.id)
        return Response(
            payload,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    FeedPostLike.objects.filter(post=post, user=request.user).delete()
    payload = _like_payload(post_id=post.id, user_id=request.user.id)
    return Response(payload, status=status.HTTP_200_OK)


def _comment_like_payload(*, comment_id: int, user_id: int) -> dict:
    return {
        "comment_id": comment_id,
        "is_liked_by_me": FeedPostCommentLike.objects.filter(
            comment_id=comment_id, user_id=user_id
        ).exists(),
        "likes_count": FeedPostCommentLike.objects.filter(
            comment_id=comment_id
        ).count(),
    }


def _comment_not_found() -> Response:
    return Response(
        {"error": "Komentar nebol najdeny."}, status=status.HTTP_404_NOT_FOUND
    )


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def feed_post_comment_like_view(request, post_id: int, comment_id: int):
    """POST: lajk komentára (idempotentné). DELETE: odlajkovanie.

    Presne vzor feed_post_like_view: komentár musí byť na VIDITEĽNOM príspevku
    (inak 404 bez prezradenia existencie), get_or_create pod zámkom dvojice
    (blok-vs-lajk race), notifikácia až cez transaction.on_commit.

    Zamyká sa dvojica s AUTOROM KOMENTÁRA – on je príjemcom notifikácie a jeho
    blok je to, čo lajk zablokuje; autor príspevku tu rolu nehrá.
    """
    post = _get_visible_post(request, post_id)
    if post is None:
        return _post_not_found()

    comment = (
        FeedPostComment.objects.select_related("author")
        .filter(pk=comment_id, post=post)
        .first()
    )
    if comment is None:
        return _comment_not_found()

    if request.method == "POST":

        def notify_author_about_like():
            try:
                create_feed_post_comment_liked_notification(
                    comment=comment, actor=request.user
                )
            except Exception:
                logger.exception(
                    "Feed comment like notification dispatch failed",
                    extra={
                        "post_id": getattr(post, "id", None),
                        "comment_id": getattr(comment, "id", None),
                        "author_id": getattr(comment, "author_id", None),
                        "actor_id": getattr(request.user, "id", None),
                    },
                )

        with transaction.atomic():
            # Blok voči AUTOROVI KOMENTÁRA – viditeľnosť príspevku ho nepokrýva:
            # príspevok môže patriť tretej strane, s ktorou blok neexistuje,
            # takže `visible_feed_posts` ho prepustí. Bez tejto kontroly by
            # vzájomne blokovaní vedeli lajkovať (a notifikovať) cez cudziu
            # nástenku. Rovnaký helper ako messaging.
            try:
                lock_users_and_ensure_interaction_allowed(
                    first_user_id=request.user.id,
                    second_user_id=comment.author_id,
                )
            except BlockedUserInteractionError:
                return _comment_not_found()

            # Re-check pod zámkom – sprivátnenie tesne pred lajkom.
            if _get_visible_post(request, post_id) is None:
                return _post_not_found()

            # Zamknutý riadok komentára, a ďalej sa pracuje UŽ S NÍM: medzi
            # prvým načítaním a zápisom ho autor mohol zmazať. `notify_...`
            # číta `comment` z tohto scope, takže dostane rovnakú inštanciu.
            comment = (
                FeedPostComment.objects.select_for_update()
                .select_related("author")
                .filter(pk=comment_id, post_id=post_id)
                .first()
            )
            if comment is None:
                return _comment_not_found()

            _, created = FeedPostCommentLike.objects.get_or_create(
                comment=comment,
                user=request.user,
            )
            if created:
                transaction.on_commit(notify_author_about_like)

        payload = _comment_like_payload(
            comment_id=comment.id, user_id=request.user.id
        )
        return Response(
            payload,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    FeedPostCommentLike.objects.filter(comment=comment, user=request.user).delete()
    payload = _comment_like_payload(comment_id=comment.id, user_id=request.user.id)
    return Response(payload, status=status.HTTP_200_OK)


def _create_comment(request, post: FeedPost) -> Response:
    text = str(request.data.get("text") or "").strip()
    if not text:
        return Response(
            {"error": "Komentar nesmie byt prazdny.", "code": "text_required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Odpoveď na komentár – voliteľná. Rodiča overíme TU, aby chyba bola
    # zrozumiteľná; model to isté kontroluje ešte raz ako poslednú poistku.
    parent = None
    raw_parent_id = request.data.get("parent_comment_id")
    if raw_parent_id not in (None, ""):
        try:
            parent_id = int(raw_parent_id)
        except (TypeError, ValueError):
            return Response(
                {
                    "error": "Neplatny komentar na odpoved.",
                    "code": "reply_parent_invalid",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        parent = (
            FeedPostComment.objects.select_related("author")
            .filter(pk=parent_id, post=post)
            .first()
        )
        if parent is None:
            return Response(
                {
                    "error": "Komentar na odpoved nebol najdeny.",
                    "code": "reply_parent_missing",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        if parent.parent_comment_id is not None:
            return Response(
                {
                    "error": "Na odpoved sa uz odpovedat neda.",
                    "code": "reply_depth_exceeded",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    def notify_author_about_comment():
        try:
            # Odpoveď upozorní autora RODIČOVSKÉHO komentára; bežný komentár
            # autora príspevku. Nikdy oboje za tú istú udalosť.
            if parent is not None:
                create_feed_post_comment_reply_notification(
                    comment=comment, actor=request.user
                )
                return
            create_feed_post_commented_notification(
                post=post, actor=request.user, comment=comment
            )
        except Exception:
            logger.exception(
                "Feed post comment notification dispatch failed",
                extra={
                    "post_id": getattr(post, "id", None),
                    "author_id": getattr(post, "author_id", None),
                    "actor_id": getattr(request.user, "id", None),
                },
            )

    try:
        # JEDNA transakcia pre zámok, zápis aj registráciu notifikácie.
        # Keby bol blok overený vo vlastnej transakcii, jej commit by zámok
        # dvojice uvoľnil ešte pred zápisom – medzitým vzniknutý blok by
        # odpoveď prepustil. `on_commit` sa tak zároveň viaže na commit TEJTO
        # transakcie, takže notifikácia odíde až po skutočnom uložení.
        with transaction.atomic():
            if parent is not None:
                # Blok voči AUTOROVI KOMENTÁRA. Viditeľnosť príspevku ho
                # nepokrýva: príspevok môže patriť tretej strane, s ktorou blok
                # neexistuje, takže `visible_feed_posts` ho prepustí. Bez tejto
                # kontroly by si vzájomne blokovaní vedeli cez odpoveď posielať
                # notifikácie. Rovnaký helper aj rovnaká odpoveď (404) ako pri
                # lajku komentára.
                try:
                    lock_users_and_ensure_interaction_allowed(
                        first_user_id=request.user.id,
                        second_user_id=parent.author_id,
                    )
                except BlockedUserInteractionError:
                    return _comment_not_found()

            comment = FeedPostComment.objects.create(
                post=post, author=request.user, text=text, parent_comment=parent
            )
            transaction.on_commit(notify_author_about_comment)
    except ValidationError as exc:
        # Model vynucuje limit 500 znakov (ensure_text_within_limit).
        return Response(
            {"error": " ".join(exc.messages), "code": getattr(exc, "code", None)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = FeedPostCommentSerializer(
        comment,
        context={"request": request, "post_author_id": post.author_id},
    )
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@api_rate_limit
def feed_post_comments_view(request, post_id: int):
    """GET: chronologický zoznam komentárov (verejný). POST: nový komentár."""
    post = _get_visible_post(request, post_id)
    if post is None:
        return _post_not_found()

    if request.method == "POST":
        if not request.user.is_authenticated:
            return Response(
                {"error": "Prihlasenie je povinne."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return _create_comment(request, post)

    # Count bez distinct je tu bezpečný: v dotaze je JEDINÝ „many" vzťah, takže
    # nevzniká krížový join ako pri lajkoch × komentároch vo feede.
    # Stránkujú sa LEN vrcholové komentáre; odpovede prídu vnorené v nich,
    # takže kurzor ostáva stabilný a stránka má predvídateľnú veľkosť.
    #
    # Odpovedí sa načíta najviac FEED_REPLIES_PREVIEW_LIMIT na komentár. Bez
    # stropu by jeden komentár s tisíckami odpovedí stiahol celé vlákno do
    # jednej odpovede API. Reže sa NA ÚROVNI DB (window funkcia číslujúca
    # odpovede v rámci rodiča), nie až v Pythone – inak by sa riadky aj tak
    # museli všetky načítať a strop by nič neušetril.
    #
    # Nič sa nestráca: `replies_count` nesie skutočný počet, takže klient vie,
    # že je ich viac. Endpoint na dotiahnutie zvyšku zámerne nepridávam –
    # zadanie ho nežiada a dnešné vlákna sú krátke.
    ranked_replies = FeedPostComment.objects.annotate(
        _reply_rank=Window(
            expression=RowNumber(),
            partition_by=[F("parent_comment_id")],
            order_by=[F("created_at").asc(), F("id").asc()],
        )
    ).filter(_reply_rank__lte=FEED_REPLIES_PREVIEW_LIMIT)

    replies_prefetch = Prefetch(
        "replies",
        queryset=FeedPostComment.objects.filter(
            pk__in=ranked_replies.values("pk")
        )
        .select_related("author")
        .annotate(_likes_count=Count("likes"))
        .order_by("created_at", "id"),
    )
    queryset = (
        FeedPostComment.objects.filter(post=post, parent_comment__isnull=True)
        .select_related("author")
        # Subquery, nie druhý Count: dva „many" vzťahy v jednom dotaze sa
        # spoja krížom (lajky × odpovede) – rovnaký dôvod, pre aký existuje
        # `_related_count_subquery` vo feed_posts.
        .annotate(
            _likes_count=Count("likes"),
            _replies_count=Coalesce(
                Subquery(
                    FeedPostComment.objects.filter(parent_comment=OuterRef("pk"))
                    .order_by()
                    .values("parent_comment")
                    .annotate(total=Count("pk"))
                    .values("total")[:1]
                ),
                Value(0),
            ),
        )
        .prefetch_related(replies_prefetch)
    )
    paginator = FeedCommentCursorPagination()
    # Číslo pri ikone počíta VŠETKY komentáre vrátane odpovedí – rovnako ako
    # `comments_count` na karte príspevku, inak by sa tie dve čísla rozišli.
    #
    # Počíta sa LEN pri prvom načítaní, rovnako ako doteraz: pri pokračovacích
    # stránkach je `count` zbytočný a jeho volanie by zrušilo optimalizáciu,
    # kvôli ktorej paginator existuje.
    if request.query_params.get(paginator.cursor_query_param) is None:
        paginator.forced_total_count = FeedPostComment.objects.filter(
            post=post
        ).count()
    page = paginator.paginate_queryset(queryset, request)
    # Odpovede sa serializujú vnorene, takže do dotazu na „čo mám lajknuté"
    # musia ísť AJ ich id. Inak by každá odpoveď dostala is_liked_by_me=False
    # a klik na už lajknutú by poslal ďalší lajk namiesto odlajkovania.
    # Jeden spoločný zoznam pre obe úrovne = jeden dotaz, žiadne N+1.
    page_with_replies = [
        comment
        for root in (page or [])
        for comment in (root, *root.replies.all())
    ]
    serializer = FeedPostCommentSerializer(
        page,
        many=True,
        context={
            "request": request,
            "post_author_id": post.author_id,
            "liked_feed_comment_ids": _liked_comment_ids(
                request.user, page_with_replies
            ),
        },
    )
    return paginator.get_paginated_response(serializer.data)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def feed_post_comment_delete_view(request, post_id: int, comment_id: int):
    """Zmazanie komentára – autor komentára alebo autor príspevku (viď hlavičku)."""
    post = _get_visible_post(request, post_id)
    if post is None:
        return _post_not_found()

    comment = FeedPostComment.objects.filter(pk=comment_id, post=post).first()
    if comment is None:
        return Response(
            {"error": "Komentar nebol najdeny."}, status=status.HTTP_404_NOT_FOUND
        )

    if request.user.id not in (comment.author_id, post.author_id):
        # Komentár je na viditeľnom príspevku (existenciu netajíme) → 403.
        return Response(
            {"error": "Na zmazanie komentara nemas opravnenie."},
            status=status.HTTP_403_FORBIDDEN,
        )

    comment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def feed_post_self_tag_view(request, post_id: int):
    """Odstránenie VLASTNÉHO označenia v príspevku.

    Súkromná akcia označeného – príspevok ostáva, mizne len jeho tag. Preto
    ani žiadna notifikácia: autora ani nikoho iného sa to netýka.

    Cudzie označenie sa cez tento endpoint odstrániť nedá a ani sa neprezradí,
    či existuje: filter je natvrdo viazaný na ``request.user``, takže autor
    príspevku (ani ktokoľvek iný) dostane rovnaké 404 ako pri neexistujúcom
    tagu. Zámerne 404, nie 403 – 403 by potvrdilo, že tam cudzí tag je.
    """
    post = _get_visible_post(request, post_id)
    if post is None:
        return _post_not_found()

    deleted, _ = FeedPostTag.objects.filter(
        post=post, tagged_user=request.user
    ).delete()
    if not deleted:
        # Nikdy označený nebol, alebo si to už odstránil – opakovanie nemá
        # padať, len povedať, že tam nič nie je.
        return Response(
            {"error": "Oznacenie nebolo najdene."}, status=status.HTTP_404_NOT_FOUND
        )

    # 204 ako feed_post_comment_delete_view – zhodný vzor pre jednoduché DELETE.
    return Response(status=status.HTTP_204_NO_CONTENT)


class FeedLikersCursorPagination(CursorPagination):
    """Najnovší lajk prvý – rovnaký cursor vzor ako zvyšok feedu."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50
    ordering = ("-created_at", "-id")


def _likers_response(request, queryset):
    """Zoznam ľudí, čo dali lajk – bez skrytých a bez blokovaných.

    Súkromný účet sa v zozname NEZOBRAZÍ. Appka ho dôsledne skrýva všade inde
    (profil, vyhľadávanie, feed), takže lajk na verejnom príspevku nesmie byť
    dierou, ktorou sa jeho meno a avatar dostanú von. Výnimka je jediná a tá
    istá ako pri ``visible_feed_posts``: SÁM SEBA vidí prihlásený vždy.

    Blok sa filtruje OBOJSMERNE a rovnakým helperom ako inde v appke; pre
    anonyma je oboje no-op v tom zmysle, že nemá identitu – vidí teda len
    verejné účty a nikoho nevyfiltruje blok.

    Obe pravidlá sa uplatnia PRED stránkovaním, inak by stránky mali rôznu
    veľkosť podľa toho, koľko sa z nich vyhodí.
    """
    viewer_id = request.user.id if request.user.is_authenticated else None

    visible = Q(user__is_public=True, user__is_active=True)
    if viewer_id:
        visible |= Q(user_id=viewer_id)
    queryset = queryset.select_related("user").filter(visible)

    queryset = exclude_blocked_users(
        queryset,
        viewer_user_id=viewer_id,
        user_id_field="user_id",
    )
    paginator = FeedLikersCursorPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = FeedUserSummarySerializer(
        [like.user for like in page],
        many=True,
        context={"request": request},
    )
    return paginator.get_paginated_response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
@api_rate_limit
def feed_post_likers_view(request, post_id: int):
    """Kto dal lajk príspevku. Verejné rovnako ako samotný príspevok."""
    post = _get_visible_post(request, post_id)
    if post is None:
        return _post_not_found()
    return _likers_response(request, FeedPostLike.objects.filter(post=post))


@api_view(["GET"])
@permission_classes([AllowAny])
@api_rate_limit
def feed_post_comment_likers_view(request, post_id: int, comment_id: int):
    """Kto dal lajk komentáru. Viditeľný musí byť príspevok AJ komentár."""
    post = _get_visible_post(request, post_id)
    if post is None:
        return _post_not_found()
    comment = FeedPostComment.objects.filter(pk=comment_id, post=post).first()
    if comment is None:
        return _comment_not_found()
    return _likers_response(
        request, FeedPostCommentLike.objects.filter(comment=comment)
    )


def _report_duplicate_response() -> Response:
    return Response(
        {"error": "Tento prispevok si uz nahlasil."},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def feed_post_report_view(request, post_id: int):
    """Nahlásenie príspevku – bez notifikácie (len admin queue), 1× na usera."""
    post = _get_visible_post(request, post_id)
    if post is None:
        return _post_not_found()

    reason, description, error_response = _validate_report_payload(request)
    if error_response is not None:
        return error_response

    if FeedPostReport.objects.filter(post=post, reported_by=request.user).exists():
        return _report_duplicate_response()

    try:
        with transaction.atomic():
            FeedPostReport.objects.create(
                post=post,
                reported_by=request.user,
                reason=reason,
                description=description,
            )
    except IntegrityError:
        # Race dvoch requestov – UniqueConstraint je posledná poistka.
        return _report_duplicate_response()

    return Response(
        {"message": "Prispevok bol nahlaseny."}, status=status.HTTP_201_CREATED
    )
