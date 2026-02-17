"""
Reviews views pre Swaply
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from swaply.rate_limiting import api_rate_limit

from ..models import Review, OfferedSkill
from ..serializers import ReviewSerializer


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
        is_owner = offer.user_id == request.user.id
        if not is_owner and (
            offer.is_hidden or not getattr(offer.user, "is_public", True)
        ):
            return Response(
                {"error": "Ponuka nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
            )

    if request.method == "GET":
        # Zoznam všetkých recenzií pre túto ponuku
        reviews = (
            Review.objects.filter(offer=offer)
            .select_related("reviewer")
            .order_by("-created_at")
        )
        serializer = ReviewSerializer(reviews, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == "POST":
        # Bezpečnostná kontrola: používateľ nemôže recenzovať vlastnú ponuku
        if offer.user_id == request.user.id:
            return Response(
                {"error": "Nemôžeš recenzovať vlastnú ponuku."},
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
        review = serializer.save(reviewer=request.user, offer=offer)

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
        review = Review.objects.select_related("reviewer", "offer").get(id=review_id)
    except Review.DoesNotExist:
        return Response(
            {"error": "Recenzia nebola nájdená"}, status=status.HTTP_404_NOT_FOUND
        )

    is_owner = review.reviewer_id == request.user.id

    if request.method == "GET":
        # Kontrola, či ponuka nie je skrytá alebo z privátneho profilu
        offer = review.offer
        offer_is_owner = offer.user_id == request.user.id
        if not offer_is_owner and (
            offer.is_hidden or not getattr(offer.user, "is_public", True)
        ):
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
        review.delete()
        return Response(
            {"message": "Recenzia bola odstránená"}, status=status.HTTP_204_NO_CONTENT
        )
