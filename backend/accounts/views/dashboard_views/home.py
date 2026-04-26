from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ...models import FavoriteUser
from ...serializers import UserProfileSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_home_view(request):
    """Dashboard home - zÃ¡kladnÃ© Å¡tatistiky a informÃ¡cie"""
    user = request.user
    favorites_count = FavoriteUser.objects.filter(user=user).count()

    stats = {
        "skills_count": 0,  # PoÄet zruÄnostÃ­ pouÅ¾Ã­vateÄ¾a
        "active_exchanges": 0,  # AktÃ­vne vÃ½meny
        "completed_exchanges": 0,  # DokonÄenÃ© vÃ½meny
        "favorites_count": favorites_count,
        "profile_completeness": user.profile_completeness,
    }

    # PoslednÃ© aktivity (zatiaÄ¾ prÃ¡zdne)
    recent_activities = []

    # User pre dashboard SSR/initial state musÃ­ obsahovaÅ¥ aj privacy flagy (napr. contact_email_visible),
    # inak sa po reloade UI prepÃ­naÄe resetujÃº na defaulty.
    user_data = UserProfileSerializer(user, context={"request": request}).data

    resp = Response(
        {
            "stats": stats,
            "recent_activities": recent_activities,
            "user": user_data,
        },
        status=status.HTTP_200_OK,
    )
    return resp
