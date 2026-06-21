from django.contrib.auth import get_user_model
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import FavoriteUser
from accounts.name_normalization import get_canonical_display_name
from swaply.rate_limiting import api_rate_limit

User = get_user_model()


class FavoriteMutationSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=("user",))
    id = serializers.IntegerField(min_value=1)


class FavoriteUserListItemSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="favorite_user_id", read_only=True)
    slug = serializers.CharField(source="favorite_user.slug", read_only=True, allow_null=True)
    avatar_url = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = FavoriteUser
        fields = ["id", "slug", "avatar_url", "display_name"]

    def get_avatar_url(self, obj):
        favorite_user = getattr(obj, "favorite_user", None)
        if favorite_user is None:
            return None
        try:
            if favorite_user.avatar and hasattr(favorite_user.avatar, "url"):
                url = favorite_user.avatar.url
                request = self.context.get("request")
                return request.build_absolute_uri(url) if request else url
        except Exception:
            return None
        return None

    def get_display_name(self, obj):
        favorite_user = getattr(obj, "favorite_user", None)
        if favorite_user is None:
            return ""
        return get_canonical_display_name(
            user_type=favorite_user.user_type,
            first_name=favorite_user.first_name,
            last_name=favorite_user.last_name,
            company_name=favorite_user.company_name,
            username=favorite_user.username,
        )


def _favorite_users_queryset(owner):
    return (
        FavoriteUser.objects.filter(
            user=owner,
            favorite_user__is_active=True,
            favorite_user__is_public=True,
            favorite_user__is_staff=False,
            favorite_user__is_superuser=False,
        )
        .select_related("favorite_user")
        .only(
            "id",
            "created_at",
            "favorite_user__id",
            "favorite_user__slug",
            "favorite_user__avatar",
            "favorite_user__first_name",
            "favorite_user__last_name",
            "favorite_user__company_name",
            "favorite_user__username",
            "favorite_user__user_type",
        )
    )


@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_favorites_view(request):
    """Dashboard favorites - sprÃ¡va obÄ¾ÃºbenÃ½ch pouÅ¾Ã­vateÄ¾ov."""
    if request.method == "GET":
        users = FavoriteUserListItemSerializer(
            _favorite_users_queryset(request.user),
            many=True,
            context={"request": request},
        ).data
        return Response({"users": users, "skills": []}, status=status.HTTP_200_OK)

    serializer = FavoriteMutationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    item_type = serializer.validated_data["type"]
    item_id = serializer.validated_data["id"]

    if item_type != "user":
        return Response(
            {"error": "PodporovanÃ© sÃº iba obÄ¾ÃºbenÃ­ pouÅ¾Ã­vatelia."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if int(item_id) == int(request.user.id):
        return Response(
            {"error": "NemÃ´Å¾ete si pridaÅ¥ vlastnÃ½ profil do obÄ¾ÃºbenÃ½ch."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        target_user = User.objects.only(
            "id",
            "is_active",
            "is_public",
            "is_staff",
            "is_superuser",
        ).get(
            id=item_id,
            is_active=True,
            is_public=True,
            is_staff=False,
            is_superuser=False,
        )
    except User.DoesNotExist:
        return Response(
            {"error": "PouÅ¾Ã­vateÄ¾ nebol nÃ¡jdenÃ½."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "POST":
        _, created = FavoriteUser.objects.get_or_create(
            user=request.user,
            favorite_user=target_user,
        )
        return Response(
            {
                "message": "PouÅ¾Ã­vateÄ¾ bol pridanÃ½ do obÄ¾ÃºbenÃ½ch.",
                "type": item_type,
                "id": item_id,
                "is_favorited": True,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    FavoriteUser.objects.filter(user=request.user, favorite_user=target_user).delete()
    return Response(
        {
            "message": "PouÅ¾Ã­vateÄ¾ bol odstrÃ¡nenÃ½ z obÄ¾ÃºbenÃ½ch.",
            "type": item_type,
            "id": item_id,
            "is_favorited": False,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def dashboard_favorite_user_detail_view(request, user_id: int):
    """
    Odstránenie používateľa z obľúbených – položku identifikuje user_id z URL,
    teda čisté DELETE bez tela (DELETE s telom je v prehliadačoch nespoľahlivé).
    Idempotentné: odobranie neexistujúcej obľúbenej položky vráti tiež 200.
    """
    FavoriteUser.objects.filter(
        user=request.user, favorite_user_id=user_id
    ).delete()
    return Response(
        {
            "message": "Používateľ bol odstránený z obľúbených.",
            "type": "user",
            "id": user_id,
            "is_favorited": False,
        },
        status=status.HTTP_200_OK,
    )
