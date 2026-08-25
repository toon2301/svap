"""Lajky príspevkov a komentárov + zoznamy tých, čo lajkli.

Vyčlenené z ``feed_interactions`` – správanie nezmenené.

Lajk: presne vzor offer_like_view/portfolio_item_like_view – idempotentné
get_or_create pod lock_user_pair_for_update (blok-vs-lajk race), notifikácia
cez transaction.on_commit, dedup rieši create_feed_post_liked_notification.
"""

import logging

from django.db import transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..feed_serializers import FeedUserSummarySerializer
from ..models import (
    FeedPostComment,
    FeedPostCommentLike,
    FeedPostLike,
)
from ..services.notifications import (
    create_feed_post_comment_liked_notification,
    create_feed_post_liked_notification,
)
from ..services.user_blocks import (
    BlockedUserInteractionError,
    exclude_blocked_users,
    lock_user_pair_for_update,
    lock_users_and_ensure_interaction_allowed,
)
from .feed_interaction_helpers import (
    _comment_not_found,
    _get_visible_post,
    _post_not_found,
)

logger = logging.getLogger(__name__)


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
