"""Authenticated API for managing the current user's blocked accounts."""

from django.contrib.auth import get_user_model
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import UserBlock
from accounts.name_normalization import get_canonical_display_name
from accounts.services.user_blocks import (
    create_user_block,
    delete_user_block,
    outgoing_user_blocks,
)
from swaply.rate_limiting import api_rate_limit

User = get_user_model()


def _is_available_target(user) -> bool:
    return bool(user.is_active and not user.is_staff and not user.is_superuser)


class BlockedUserListItemSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="blocked_user_id", read_only=True)
    username = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    is_available = serializers.SerializerMethodField()

    class Meta:
        model = UserBlock
        fields = ["id", "username", "display_name", "avatar_url", "is_available"]

    def get_username(self, obj):
        user = obj.blocked_user
        return user.username if _is_available_target(user) else None

    def get_display_name(self, obj):
        user = obj.blocked_user
        if not _is_available_target(user):
            return None
        return get_canonical_display_name(
            user_type=user.user_type,
            first_name=user.first_name,
            last_name=user.last_name,
            company_name=user.company_name,
            username=user.username,
        )

    def get_avatar_url(self, obj):
        user = obj.blocked_user
        if not _is_available_target(user):
            return None
        try:
            if user.avatar and hasattr(user.avatar, "url"):
                url = user.avatar.url
                request = self.context.get("request")
                return request.build_absolute_uri(url) if request else url
        except (ValueError, OSError):
            return None
        return None

    def get_is_available(self, obj):
        return _is_available_target(obj.blocked_user)


class BlockedUsersPagination(CursorPagination):
    page_size = 20
    ordering = ("-created_at", "-id")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def blocked_users_view(request):
    """List only blocks created by the authenticated user."""
    paginator = BlockedUsersPagination()
    page = paginator.paginate_queryset(
        outgoing_user_blocks(blocker=request.user),
        request,
    )
    serializer = BlockedUserListItemSerializer(
        page,
        many=True,
        context={"request": request},
    )
    return paginator.get_paginated_response(serializer.data)


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
@api_rate_limit
def user_block_detail_view(request, user_id: int):
    """Create or remove the caller's directional block idempotently."""
    if request.method == "DELETE":
        deleted = delete_user_block(
            blocker=request.user,
            blocked_user_id=user_id,
        )
        return Response(
            {"user_id": user_id, "is_blocked": False, "deleted": deleted},
            status=status.HTTP_200_OK,
        )

    if user_id == request.user.id:
        return Response(
            {"error": "cannot_block_self"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    existing = UserBlock.objects.select_related("blocked_user").filter(
        blocker=request.user,
        blocked_user_id=user_id,
    ).first()
    if existing is not None:
        create_user_block(
            blocker=request.user,
            blocked_user=existing.blocked_user,
        )
        return Response(
            {"user_id": user_id, "is_blocked": True, "created": False},
            status=status.HTTP_200_OK,
        )

    try:
        target_user = User.objects.get(
            pk=user_id,
            is_active=True,
            is_staff=False,
            is_superuser=False,
        )
    except User.DoesNotExist:
        return Response(
            {"error": "user_not_found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    _, created = create_user_block(
        blocker=request.user,
        blocked_user=target_user,
    )
    return Response(
        {"user_id": user_id, "is_blocked": True, "created": created},
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )
