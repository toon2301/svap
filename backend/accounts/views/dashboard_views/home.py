from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ...serializers import UserProfileSerializer


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

    # User pre dashboard SSR/initial state musí obsahovať aj privacy flagy (napr. contact_email_visible),
    # inak sa po reloade UI prepínače resetujú na defaulty.
    user_data = UserProfileSerializer(user, context={"request": request}).data

    resp = Response(
        {
            "stats": stats,
            "recent_activities": recent_activities,
            "user": user_data,
        },
        status=status.HTTP_200_OK,
    )
    # Dashboard home často slúži ako SSR/initial payload pre dashboard – nesmie sa cachovať.
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    resp["Vary"] = "Cookie"
    return resp
