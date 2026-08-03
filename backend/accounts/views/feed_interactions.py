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
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ..feed_serializers import FeedPostCommentSerializer
from ..models import FeedPost, FeedPostComment, FeedPostLike, FeedPostReport
from ..services.notifications import (
    create_feed_post_commented_notification,
    create_feed_post_liked_notification,
)
from ..services.user_blocks import lock_user_pair_for_update
from .feed_posts import visible_feed_posts
from .photo_reports import _validate_report_payload

logger = logging.getLogger(__name__)


class FeedCommentCursorPagination(CursorPagination):
    """Cursor ako feed (konzistentné), ale chronologicky NAHOR – komentáre sa
    čítajú od najstaršieho (vlákno), nové prichádzajú na koniec."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50
    ordering = ("created_at", "id")


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


def _create_comment(request, post: FeedPost) -> Response:
    text = str(request.data.get("text") or "").strip()
    if not text:
        return Response(
            {"error": "Komentar nesmie byt prazdny.", "code": "text_required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def notify_author_about_comment():
        try:
            create_feed_post_commented_notification(post=post, actor=request.user)
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
        with transaction.atomic():
            comment = FeedPostComment.objects.create(
                post=post, author=request.user, text=text
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

    queryset = FeedPostComment.objects.filter(post=post).select_related("author")
    paginator = FeedCommentCursorPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = FeedPostCommentSerializer(
        page,
        many=True,
        context={"request": request, "post_author_id": post.author_id},
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
