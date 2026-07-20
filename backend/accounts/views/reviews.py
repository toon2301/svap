"""
Reviews views pre Swaply
"""

import logging
from decimal import Decimal

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db import IntegrityError, transaction
from django.db.models import Avg, Count, Exists, OuterRef, Q
from django.utils import timezone

from swaply.rate_limiting import api_rate_limit

from ..models import (
    OfferedSkill,
    Review,
    ReviewLike,
    ReviewReport,
    REVIEWABLE_SKILL_REQUEST_STATUSES,
    SkillRequest,
    exclude_block_terminated_requests,
)
from ..serializers import ReviewSerializer
from ..services.offer_visibility import offer_owner_blocked_from_user
from ..services.user_blocks import (
    lock_user_pair_for_update,
    lock_users_for_update,
    user_block_exists_between,
)
from ..services.notifications import (
    create_review_created_notification,
    create_review_liked_notification,
    create_review_reply_notification,
)
from .review_helpers import (
    _offer_hidden_from_user,
    _parse_reviews_page_params,
    _review_like_payload,
    _reviews_rating_stats,
    _reviews_with_like_state,
)
from .skill_requests import _skill_requests_cache_invalidate_for_user

logger = logging.getLogger(__name__)


def _offer_not_found():
    return Response(
        {"error": "Ponuka nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def reviews_list_view(request, offer_id):
    """
    GET: Zoznam recenzií pre ponuku (offer_id)
    POST: Vytvorenie novej recenzie pre ponuku

    Bezpečnostné pravidlá:
    - Používateľ nemôže recenzovať vlastnú ponuku
    - Používateľ môže recenzovať jednu ponuku len raz
    - Len autentifikovaný používateľ môže pridať recenziu
    """
    try:
        offer = OfferedSkill.objects.select_related("user").get(id=offer_id)
    except OfferedSkill.DoesNotExist:
        return Response(
            {"error": "Ponuka nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
        )

    # Kontrola, či ponuka nie je skrytá alebo z privátneho profilu (pre GET)
    if request.method == "GET":
        if _offer_hidden_from_user(offer, request.user):
            return Response(
                {"error": "Ponuka nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
            )

    elif offer_owner_blocked_from_user(offer, request.user):
        return _offer_not_found()

    if request.method == "GET":
        # Stránkovaný zoznam recenzií pre túto ponuku (najnovšie prvé).
        reviews = _reviews_with_like_state(
            Review.objects.filter(offer=offer).select_related("reviewer"),
            request.user,
        ).order_by("-created_at", "-id")

        page, page_size = _parse_reviews_page_params(request)
        paginator = Paginator(reviews, page_size)
        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page = 1
            page_obj = paginator.page(page)
        except EmptyPage:
            page = paginator.num_pages if paginator.num_pages > 0 else 1
            page_obj = paginator.page(page) if paginator.num_pages > 0 else []

        items = list(page_obj) if page_obj else []
        serializer = ReviewSerializer(items, many=True, context={"request": request})
        return Response(
            {
                "results": serializer.data,
                "total": paginator.count,
                "page": page,
                "page_size": page_size,
                "total_pages": paginator.num_pages,
                # Súhrn hodnotení cez všetky recenzie (pre korektný priemer/breakdown
                # nezávisle od stránky).
                "stats": _reviews_rating_stats(offer),
            },
            status=status.HTTP_200_OK,
        )

    elif request.method == "POST":
        # Bezpečnostná kontrola: používateľ nemôže recenzovať vlastnú ponuku
        if offer.user_id == request.user.id:
            return Response(
                {"error": "Nemôžeš recenzovať vlastnú ponuku."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Review is allowed only after the exchange has been closed.
        has_reviewable_request = exclude_block_terminated_requests(
            SkillRequest.objects.filter(
                requester=request.user, offer=offer,
                status__in=REVIEWABLE_SKILL_REQUEST_STATUSES,
            )
        ).exists()
        if not has_reviewable_request:
            return Response(
                {
                    "error": (
                        "Recenziu môžeš pridať až po dokončení alebo "
                        "predčasnom ukončení výmeny."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Kontrola, či používateľ už recenzoval túto ponuku
        existing_review = Review.objects.filter(
            reviewer=request.user, offer=offer
        ).first()
        if existing_review:
            return Response(
                {"error": "Už si recenzoval túto ponuku."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validácia a vytvorenie recenzie
        serializer = ReviewSerializer(data=request.data, context={"request": request})

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Uloženie recenzie s reviewerom a ponukou
        try:
            with transaction.atomic():
                lock_user_pair_for_update(
                    first_user_id=request.user.id,
                    second_user_id=offer.user_id,
                )
                if offer_owner_blocked_from_user(offer, request.user):
                    return _offer_not_found()
                review = serializer.save(reviewer=request.user, offer=offer)
        except IntegrityError:
            if Review.objects.filter(reviewer=request.user, offer=offer).exists():
                return Response(
                    {"error": "Už si recenzoval túto ponuku."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            raise

        def notify_offer_owner_about_review():
            try:
                create_review_created_notification(review=review, actor=request.user)
            except Exception:
                logger.exception(
                    "Review notification dispatch failed",
                    extra={
                        "review_id": getattr(review, "id", None),
                        "offer_id": getattr(offer, "id", None),
                        "owner_id": getattr(offer, "user_id", None),
                        "reviewer_id": getattr(request.user, "id", None),
                    },
                )

        transaction.on_commit(notify_offer_owner_about_review)
        transaction.on_commit(
            lambda: _skill_requests_cache_invalidate_for_user(request.user)
        )

        # Vrátenie vytvorenej recenzie
        response_serializer = ReviewSerializer(review, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def review_detail_view(request, review_id):
    """
    GET: Detail recenzie (viditeľný pre všetkých autentifikovaných)
    PUT/PATCH: Aktualizácia recenzie (len vlastník recenzie)
    DELETE: Odstránenie recenzie (len vlastník recenzie)
    """
    try:
        review = _reviews_with_like_state(
            Review.objects.select_related("reviewer", "offer", "offer__user").filter(
                id=review_id
            ),
            request.user,
        ).get()
    except Review.DoesNotExist:
        return Response(
            {"error": "Recenzia nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
        )

    is_owner = review.reviewer_id == request.user.id

    if request.method == "GET":
        # Kontrola, či ponuka nie je skrytá alebo z privátneho profilu
        offer = review.offer
        if _offer_hidden_from_user(offer, request.user):
            return Response(
                {"error": "Recenzia nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = ReviewSerializer(review, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    # PUT/PATCH/DELETE len vlastník recenzie
    if not is_owner:
        return Response(
            {"error": "Nemáš oprávnenie upravovať túto recenziu."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method in ["PUT", "PATCH"]:
        serializer = ReviewSerializer(
            review,
            data=request.data,
            partial=request.method == "PATCH",
            context={"request": request},
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "DELETE":
        reviewer = review.reviewer
        review.delete()
        transaction.on_commit(lambda: _skill_requests_cache_invalidate_for_user(reviewer))
        return Response(
            {"message": "Recenzia bola odstránená"}, status=status.HTTP_204_NO_CONTENT
        )


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def review_like_view(request, review_id):
    """
    POST: Pridanie "páči sa mi" na recenziu.
    DELETE: Odobratie "páči sa mi" z recenzie.

    Endpoint je idempotentný: opakovaný POST nechá like zapnutý,
    opakovaný DELETE nechá like vypnutý.
    """
    try:
        review = Review.objects.select_related("reviewer", "offer", "offer__user").get(
            id=review_id
        )
    except Review.DoesNotExist:
        return Response(
            {"error": "Recenzia nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
        )

    if _offer_hidden_from_user(review.offer, request.user):
        return Response(
            {"error": "Recenzia nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
        )

    def notify_reviewer_about_like():
        try:
            create_review_liked_notification(review=review, actor=request.user)
        except Exception:
            logger.exception(
                "Review like notification dispatch failed",
                extra={
                    "review_id": getattr(review, "id", None),
                    "offer_id": getattr(review, "offer_id", None),
                    "reviewer_id": getattr(review, "reviewer_id", None),
                    "actor_id": getattr(request.user, "id", None),
                },
            )

    with transaction.atomic():
        lock_users_for_update(
            user_ids=(
                request.user.id,
                review.offer.user_id,
                review.reviewer_id,
            )
        )
        try:
            review.refresh_from_db()
        except Review.DoesNotExist:
            return Response(
                {"error": "Recenzia nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
            )
        if _offer_hidden_from_user(
            review.offer, request.user
        ) or user_block_exists_between(
            first_user_id=request.user.id,
            second_user_id=review.reviewer_id,
        ):
            return Response(
                {"error": "Recenzia nebola nájdená"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.method == "POST":
            _, created = ReviewLike.objects.get_or_create(
                review=review,
                user=request.user,
            )
            if created:
                transaction.on_commit(notify_reviewer_about_like)
        else:
            ReviewLike.objects.filter(review=review, user=request.user).delete()

    payload = _review_like_payload(review_id=review.id, user_id=request.user.id)
    if request.method == "POST":
        return Response(
            payload,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def review_report_view(request, review_id):
    """
    POST: Nahlásenie recenzie.
    Iba prihlásený používateľ môže nahlásiť recenziu.
    Používateľ nemôže nahlásiť vlastnú recenziu.
    Používateľ môže nahlásiť konkrétnu recenziu iba raz.
    """
    try:
        review = Review.objects.select_related("reviewer").get(id=review_id)
    except Review.DoesNotExist:
        return Response(
            {"error": "Recenzia nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
        )

    # Používateľ nemôže nahlásiť vlastnú recenziu
    if review.reviewer_id == request.user.id:
        return Response(
            {"error": "Nemôžeš nahlásiť vlastnú recenziu."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Používateľ môže nahlásiť konkrétnu recenziu iba raz
    if ReviewReport.objects.filter(review=review, reported_by=request.user).exists():
        return Response(
            {"error": "Túto recenziu si už nahlásil."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validácia body: reason (povinné), description (nepovinné)
    reason = request.data.get("reason")
    if reason is None or (isinstance(reason, str) and not reason.strip()):
        return Response(
            {"error": "Pole reason je povinné a nesmie byť prázdne."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    reason = reason.strip() if isinstance(reason, str) else str(reason)
    if len(reason) > 100:
        return Response(
            {"error": "Dôvod môže mať maximálne 100 znakov."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    description = request.data.get("description", "")
    if description is None:
        description = ""
    description = description.strip() if isinstance(description, str) else str(description)
    if len(description) > 2000:
        return Response(
            {"error": "Popis môže mať maximálne 2000 znakov."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    ReviewReport.objects.create(
        review=review,
        reported_by=request.user,
        reason=reason,
        description=description,
    )

    return Response(
        {"message": "Recenzia bola nahlásená."},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def review_respond_view(request, review_id):
    """
    POST: Vytvorenie alebo úprava odpovede vlastníka ponuky na recenziu.
    Iba vlastník ponuky (review.offer.user == request.user) môže odpovedať.
    """
    try:
        review = Review.objects.select_related("reviewer", "offer", "offer__user").get(
            id=review_id
        )
    except Review.DoesNotExist:
        return Response(
            {"error": "Recenzia nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
        )

    # Iba vlastník ponuky môže odpovedať
    if review.offer.user_id != request.user.id:
        return Response(
            {"error": "Nemáš oprávnenie odpovedať na túto recenziu."},
            status=status.HTTP_403_FORBIDDEN,
        )

    owner_response = request.data.get("owner_response")
    if owner_response is None or (isinstance(owner_response, str) and not owner_response.strip()):
        return Response(
            {"error": "Pole owner_response je povinné a nesmie byť prázdne."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    owner_response = owner_response.strip() if isinstance(owner_response, str) else str(owner_response)
    if len(owner_response) > 700:
        return Response(
            {"error": "Odpoveď môže mať maximálne 700 znakov."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        lock_user_pair_for_update(
            first_user_id=request.user.id,
            second_user_id=review.reviewer_id,
        )
        if user_block_exists_between(
            first_user_id=request.user.id,
            second_user_id=review.reviewer_id,
        ):
            return Response(
                {"error": "Recenzia nebola nájdená"},
                status=status.HTTP_404_NOT_FOUND,
            )

        review.refresh_from_db(
            fields=["owner_response", "owner_responded_at", "updated_at"]
        )
        had_owner_response = bool((review.owner_response or "").strip())
        review.owner_response = owner_response
        review.owner_responded_at = timezone.now()
        review.save(
            update_fields=["owner_response", "owner_responded_at", "updated_at"]
        )

        if not had_owner_response:

            def notify_reviewer_about_reply():
                try:
                    create_review_reply_notification(review=review, actor=request.user)
                except Exception:
                    logger.exception(
                        "Review reply notification dispatch failed",
                        extra={
                            "review_id": getattr(review, "id", None),
                            "offer_id": getattr(review, "offer_id", None),
                            "reviewer_id": getattr(review, "reviewer_id", None),
                            "owner_id": getattr(request.user, "id", None),
                        },
                    )

            transaction.on_commit(notify_reviewer_about_reply)

    serializer = ReviewSerializer(review, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)
