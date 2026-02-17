from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_home_view(request):
    """Dashboard home - základné štatistiky a informácie"""
    user = request.user

    # Základné štatistiky (zatiaľ mock data, neskôr sa nahradí skutočnými dátami)
    stats = {
        "skills_count": 0,  # Počet zručností používateľa
        "active_exchanges": 0,  # Aktívne výmeny
        "completed_exchanges": 0,  # Dokončené výmeny
        "favorites_count": 0,  # Počet obľúbených používateľov
        "profile_completeness": user.profile_completeness,
    }

    # Posledné aktivity (zatiaľ prázdne)
    recent_activities = []

    return Response(
        {
            "stats": stats,
            "recent_activities": recent_activities,
            "user": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "username": user.username,
                "profile_completeness": user.profile_completeness,
                "slug": getattr(user, "slug", None),
            },
        },
        status=status.HTTP_200_OK,
    )
