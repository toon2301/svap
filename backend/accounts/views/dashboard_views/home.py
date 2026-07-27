from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit

from ...models import FavoriteUser
from ...serializers import UserProfileSerializer
from ...services.user_blocks import exclude_blocked_users
from .dashboard_stats import (
    active_exchanges_count,
    average_rating,
    completed_exchanges_count,
    profile_completion_rate,
    profile_likes_count,
    skills_count,
)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_home_view(request):
    """Dashboard home - reálne štatistiky prihláseného používateľa."""
    user = request.user
    favorites_count = exclude_blocked_users(
        FavoriteUser.objects.filter(user=user),
        viewer_user_id=user.id,
        user_id_field="favorite_user_id",
    ).count()

    stats = {
        "skills_count": skills_count(user),  # počet vlastných ponúk
        "active_exchanges": active_exchanges_count(user),  # neterminálne výmeny
        "completed_exchanges": completed_exchanges_count(user),  # dokončené výmeny
        # completion_rate/average_rating: None keď zatiaľ nie sú dáta (FE zobrazí "—").
        "completion_rate": profile_completion_rate(user),
        "average_rating": average_rating(user),
        "favorites_count": favorites_count,
        "profile_likes_count": profile_likes_count(user),
        "profile_completeness": user.profile_completeness,
    }

    # Posledné aktivity (feed) – samostatná neskoršia fáza.
    recent_activities = []

    # User pre dashboard SSR/initial state musí obsahovať aj privacy flagy (napr.
    # contact_email_visible), inak sa po reloade UI prepínače resetujú na defaulty.
    user_data = UserProfileSerializer(user, context={"request": request}).data

    return Response(
        {
            "stats": stats,
            "recent_activities": recent_activities,
            "user": user_data,
        },
        status=status.HTTP_200_OK,
    )
