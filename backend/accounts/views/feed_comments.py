"""Komentáre a odpovede – zoznam, vytvorenie, úprava, zmazanie.

Vyčlenené z ``feed_interactions`` – správanie nezmenené.

Zmazanie komentára: autor komentára ALEBO autor príspevku. Appka priamy
precedens nemá (prvý komentárový model); najbližšie vzory sa líšia – recenziu
hodnotený zmazať nemôže (peer obsah), správu v konverzácii tiež nie. Komentár
ale žije na nástenke autora príspevku, takže moderácia vlastného príspevku je
jediná obrana proti zneužitiu – preto aj vlastník „kontajnera".
"""

import logging

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..feed_serializers import FeedPostCommentSerializer
from ..models import (
    FeedPost,
    FeedPostComment,
)
from ..services.notifications import (
    create_feed_post_comment_reply_notification,
    create_feed_post_commented_notification,
)
from ..services.user_blocks import (
    BlockedUserInteractionError,
    lock_users_and_ensure_interaction_allowed,
)
from .feed_comment_queries import (
    FEED_REPLIES_PREVIEW_LIMIT,
    FeedCommentCursorPagination,
    _liked_comment_ids,
    post_comments_queryset,
)
from .feed_edits import edit_feed_comment
from .feed_interaction_helpers import (
    _comment_not_found,
    _get_visible_post,
    _post_not_found,
)

logger = logging.getLogger(__name__)


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

    queryset = post_comments_queryset(post)

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


@api_view(["GET"])
@permission_classes([AllowAny])
@api_rate_limit
def feed_post_comment_replies_view(request, post_id: int, comment_id: int):
    """Ďalšie odpovede jedného komentára – pokračovanie za úvodným náhľadom.

    Zoznam komentárov nesie pod každým komentárom len prvých
    ``FEED_REPLIES_PREVIEW_LIMIT`` odpovedí; zvyšok si klient vyžiada tu.

    Pokračovanie rieši parameter ``after`` (id poslednej odpovede, ktorú klient
    už má). Kotva sa prekladá na presne to isté porovnanie, aké používa kurzor
    – ``(created_at, id)`` – takže sa nič nezduplikuje ani nevynechá, aj keď
    má viac odpovedí rovnaký čas vzniku. Bez ``after`` sa vracia od začiatku.

    Stránkovanie samotné ide cez ``FeedCommentCursorPagination``, tú istú
    triedu ako zoznam komentárov, takže tvar odpovede aj správanie ``count``
    sú konzistentné so zvyškom appky.
    """
    post = _get_visible_post(request, post_id)
    if post is None:
        return _post_not_found()

    parent = FeedPostComment.objects.filter(
        pk=comment_id, post=post, parent_comment__isnull=True
    ).first()
    if parent is None:
        # Aj odpoveď (ktorá vlastné odpovede mať nemôže) skončí tu – klient sa
        # z nej nedozvie, či komentár neexistuje alebo len nie je vrcholový.
        return _comment_not_found()

    replies = (
        FeedPostComment.objects.filter(parent_comment=parent)
        .select_related("author")
        .annotate(_likes_count=Count("likes"))
        .order_by("created_at", "id")
    )

    after_id = request.query_params.get("after")
    if after_id:
        # Kotva musí byť číslo – nečíselné id by inak spadlo až v dotaze ako
        # 500-ka. Rovnaké spracovanie ako `parent_comment_id` v _create_comment.
        try:
            after_pk = int(after_id)
        except (TypeError, ValueError):
            return Response(
                {
                    "error": "Neplatna kotva pokracovania.",
                    "code": "reply_anchor_invalid",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        anchor = FeedPostComment.objects.filter(
            pk=after_pk, parent_comment=parent
        ).first()
        if anchor is None:
            return Response(
                {
                    "error": "Kotva pokracovania nebola najdena.",
                    "code": "reply_anchor_missing",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        replies = replies.filter(
            Q(created_at__gt=anchor.created_at)
            | Q(created_at=anchor.created_at, id__gt=anchor.id)
        )

    paginator = FeedCommentCursorPagination()
    page = paginator.paginate_queryset(replies, request)
    serializer = FeedPostCommentSerializer(
        page,
        many=True,
        context={
            "request": request,
            "post_author_id": post.author_id,
            "liked_feed_comment_ids": _liked_comment_ids(request.user, page),
        },
    )
    return paginator.get_paginated_response(serializer.data)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def feed_post_comment_detail_view(request, post_id: int, comment_id: int):
    """PATCH: úprava textu (len autor komentára). DELETE: zmazanie (viď hlavičku).

    Právomoci sa ZÁMERNE líšia – prepisovať cudzí text nesmie ani autor
    príspevku, hoci ho zmazať smie. Podrobnosti a validácia sú vo
    ``feed_edits``.
    """
    post = _get_visible_post(request, post_id)
    if post is None:
        return _post_not_found()

    comment = FeedPostComment.objects.filter(pk=comment_id, post=post).first()
    if comment is None:
        return Response(
            {"error": "Komentar nebol najdeny."}, status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "PATCH":
        return edit_feed_comment(request, post, comment)

    if request.user.id not in (comment.author_id, post.author_id):
        # Komentár je na viditeľnom príspevku (existenciu netajíme) → 403.
        return Response(
            {"error": "Na zmazanie komentara nemas opravnenie."},
            status=status.HTTP_403_FORBIDDEN,
        )

    comment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
