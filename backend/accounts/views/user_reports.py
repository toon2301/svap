"""
User report view pre Swaply
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.contrib.auth import get_user_model

from swaply.rate_limiting import api_rate_limit

from ..models import UserReport

User = get_user_model()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def user_report_view(request, user_id: int):
    """
    POST: Nahlásenie používateľa.
    Iba prihlásený používateľ môže nahlásiť iného používateľa.
    Používateľ nemôže nahlásiť sám seba.
    Používateľ môže nahlásiť konkrétneho používateľa iba raz.
    """
    try:
        reported_user = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return Response(
            {"error": "Používateľ nebol nájdený"}, status=status.HTTP_404_NOT_FOUND
        )

    # Používateľ nemôže nahlásiť sám seba
    if reported_user.id == request.user.id:
        return Response(
            {"error": "Nemôžeš nahlásiť sám seba."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Používateľ môže nahlásiť konkrétneho používateľa iba raz
    if UserReport.objects.filter(
        reported_user=reported_user, reported_by=request.user
    ).exists():
        return Response(
            {"error": "Tohoto používateľa si už nahlásil."},
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

    UserReport.objects.create(
        reported_user=reported_user,
        reported_by=request.user,
        reason=reason,
        description=description,
    )

    return Response(
        {"message": "Používateľ bol nahlásený."},
        status=status.HTTP_201_CREATED,
    )
