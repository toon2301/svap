from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ...models import OfferedSkill
from ...serializers import OfferedSkillSerializer

User = get_user_model()

def _not_found():
    # Neodhaľuj, či profil existuje alebo je privátny.
    return Response({"error": "Používateľ nebol nájdený"}, status=status.HTTP_404_NOT_FOUND)


def _enforce_public_or_owner(request, user) -> Response | None:
    is_owner = bool(getattr(request.user, "is_authenticated", False) and user.id == request.user.id)
    if not is_owner and not getattr(user, "is_public", True):
        return _not_found()
    return None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_user_profile_detail_view(request, user_id: int):
    """
    Read‑only detail profilu iného používateľa pre dashboard / vyhľadávanie.
    """
    try:
        user = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return _not_found()

    privacy_resp = _enforce_public_or_owner(request, user)
    if privacy_resp is not None:
        return privacy_resp

    from ...serializers import UserProfileSerializer

    serializer = UserProfileSerializer(user, context={"request": request})

    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_user_profile_detail_by_slug_view(request, slug: str):
    """
    Read‑only detail profilu iného používateľa podľa slug-u.
    """
    try:
        user = User.objects.get(slug=slug, is_active=True)
    except User.DoesNotExist:
        return _not_found()

    privacy_resp = _enforce_public_or_owner(request, user)
    if privacy_resp is not None:
        return privacy_resp

    from ...serializers import UserProfileSerializer

    serializer = UserProfileSerializer(user, context={"request": request})

    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_user_skills_view(request, user_id: int):
    """
    Read‑only zoznam zručností (ponúk) iného používateľa pre dashboard / vyhľadávanie.
    """
    try:
        user = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return _not_found()

    privacy_resp = _enforce_public_or_owner(request, user)
    if privacy_resp is not None:
        return privacy_resp

    skills_qs = OfferedSkill.objects.filter(user_id=user_id).order_by("-updated_at")
    # Pre cudzí profil filtruj skryté karty, pre vlastný profil zobraz všetky
    if user_id != request.user.id:
        skills_qs = skills_qs.filter(is_hidden=False)
    serializer = OfferedSkillSerializer(
        skills_qs, many=True, context={"request": request}
    )
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_user_skills_by_slug_view(request, slug: str):
    """
    Read‑only zoznam zručností iného používateľa podľa slug-u.
    """
    try:
        user = User.objects.get(slug=slug, is_active=True)
    except User.DoesNotExist:
        return _not_found()

    privacy_resp = _enforce_public_or_owner(request, user)
    if privacy_resp is not None:
        return privacy_resp

    skills_qs = OfferedSkill.objects.filter(user_id=user.id).order_by("-updated_at")
    # Pre cudzí profil filtruj skryté karty, pre vlastný profil zobraz všetky
    if user.id != request.user.id:
        skills_qs = skills_qs.filter(is_hidden=False)
    serializer = OfferedSkillSerializer(
        skills_qs, many=True, context={"request": request}
    )
    return Response(serializer.data, status=status.HTTP_200_OK)
