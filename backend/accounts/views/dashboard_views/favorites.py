from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from swaply.rate_limiting import api_rate_limit


@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_favorites_view(request):
    """Dashboard favorites - správa obľúbených používateľov a zručností"""
    if request.method == "GET":
        # Zatiaľ vrátime prázdne obľúbené, neskôr sa implementuje skutočná funkcionalita
        favorites = {
            "users": [],
            "skills": [],
        }

        return Response(favorites, status=status.HTTP_200_OK)

    elif request.method == "POST":
        # Pridanie do obľúbených
        item_type = request.data.get("type")  # 'user' alebo 'skill'
        item_id = request.data.get("id")

        if not item_type or not item_id:
            return Response(
                {"error": "Chýbajú povinné parametre: type a id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Tu sa neskôr implementuje skutočné pridávanie do obľúbených
        # Napríklad: FavoriteUser.objects.create(user=request.user, favorite_user_id=item_id)

        return Response(
            {
                "message": "Položka bola pridaná do obľúbených",
                "type": item_type,
                "id": item_id,
            },
            status=status.HTTP_201_CREATED,
        )

    elif request.method == "DELETE":
        # Odstránenie z obľúbených
        item_type = request.data.get("type")
        item_id = request.data.get("id")

        if not item_type or not item_id:
            return Response(
                {"error": "Chýbajú povinné parametre: type a id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Tu sa neskôr implementuje skutočné odstraňovanie z obľúbených

        return Response(
            {
                "message": "Položka bola odstránená z obľúbených",
                "type": item_type,
                "id": item_id,
            },
            status=status.HTTP_200_OK,
        )
