from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.services.settings import (
    apply_dashboard_settings_patch,
    build_dashboard_settings_payload,
)
from swaply.rate_limiting import api_rate_limit


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_profile_view(request):
    """Dashboard profile detail and updates."""
    request.user.refresh_from_db()
    user = request.user

    if request.method == "GET":
        profile_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "user_type": user.user_type,
            "phone": user.phone,
            "bio": user.bio,
            "avatar": user.avatar.url if user.avatar else None,
            "location": user.location,
            "company_name": user.company_name,
            "website": user.website,
            "linkedin": user.linkedin,
            "facebook": user.facebook,
            "instagram": user.instagram,
            "is_verified": user.is_verified,
            "is_public": user.is_public,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "profile_completeness": user.profile_completeness,
        }
        return Response(profile_data, status=status.HTTP_200_OK)

    from ...serializers import UserProfileSerializer

    serializer = UserProfileSerializer(
        user,
        data=request.data,
        partial=request.method == "PATCH",
    )

    if serializer.is_valid():
        serializer.save()
        return Response(
            {
                "message": "Profil bol uspesne aktualizovany",
                "user": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        {"error": "Neplatne udaje", "details": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_settings_view(request):
    """Dashboard settings backed by real persisted preferences where available."""
    if request.method == "GET":
        return Response(
            build_dashboard_settings_payload(request.user),
            status=status.HTTP_200_OK,
        )

    settings_data = apply_dashboard_settings_patch(request.user, request.data)
    return Response(
        {
            "message": "Nastavenia boli uspesne aktualizovane",
            "settings": settings_data,
        },
        status=status.HTTP_200_OK,
    )
