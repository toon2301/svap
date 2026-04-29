from __future__ import annotations

from time import time

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import FavoriteUser
from messaging.models import Conversation, ConversationParticipant
from messaging.services.presence import (
    MESSAGE_PRESENCE_FRESH_SECONDS,
    get_message_presence_for_users,
)
from swaply.rate_limiting import api_rate_limit

from .serializers import serialize_user_brief

User = get_user_model()

MAX_CANDIDATES = 30
MAX_QUERY_LENGTH = 100


class GroupMemberCandidatesQuerySerializer(serializers.Serializer):
    q = serializers.CharField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        max_length=MAX_QUERY_LENGTH,
    )
    conversation_id = serializers.IntegerField(required=False, min_value=1)


def _normalize_query(value: str | None) -> str:
    return " ".join((value or "").split())


def _ordered_unique(values) -> list[int]:
    seen: set[int] = set()
    result: list[int] = []
    for value in values:
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            continue
        if parsed <= 0 or parsed in seen:
            continue
        seen.add(parsed)
        result.append(parsed)
    return result


def _existing_group_member_ids(*, conversation: Conversation | None) -> set[int]:
    if conversation is None:
        return set()
    return set(
        ConversationParticipant.objects.filter(
            conversation=conversation,
            status__in=[
                ConversationParticipant.Status.ACTIVE,
                ConversationParticipant.Status.INVITED,
            ],
        ).values_list("user_id", flat=True)
    )


def _direct_contact_user_ids(*, user) -> list[int]:
    rows = (
        ConversationParticipant.objects.filter(
            conversation__participants__user=user,
            conversation__participants__status=ConversationParticipant.Status.ACTIVE,
            conversation__is_group=False,
            conversation__last_message_at__isnull=False,
            status=ConversationParticipant.Status.ACTIVE,
        )
        .exclude(user_id=user.id)
        .order_by("-conversation__last_message_at", "-conversation_id")
        .values_list("user_id", flat=True)[: MAX_CANDIDATES * 2]
    )
    return _ordered_unique(rows)


def _favorite_user_ids(*, user) -> list[int]:
    rows = (
        FavoriteUser.objects.filter(user=user, favorite_user__is_active=True)
        .order_by("-created_at", "-id")
        .values_list("favorite_user_id", flat=True)[: MAX_CANDIDATES * 2]
    )
    return _ordered_unique(rows)


def _candidate_queryset_for_search(*, query: str, current_user_id: int, excluded_ids: set[int]):
    qs = (
        User.objects.filter(is_active=True, is_public=True)
        .exclude(id=current_user_id)
        .exclude(id__in=excluded_ids)
        .exclude(is_staff=True)
        .exclude(is_superuser=True)
    )

    for term in query.split(" "):
        qs = qs.filter(
            Q(first_name__icontains=term)
            | Q(last_name__icontains=term)
            | Q(username__icontains=term)
            | Q(company_name__icontains=term)
        )

    return qs.order_by("-is_verified", "first_name", "last_name", "username", "id")[:MAX_CANDIDATES]


def _candidate_queryset_for_suggestions(*, user, excluded_ids: set[int]):
    direct_ids = _direct_contact_user_ids(user=user)
    favorite_ids = _favorite_user_ids(user=user)
    candidate_ids = _ordered_unique(direct_ids + favorite_ids)
    candidate_ids = [candidate_id for candidate_id in candidate_ids if candidate_id not in excluded_ids]
    if not candidate_ids:
        return []

    users_by_id = {
        candidate.id: candidate
        for candidate in User.objects.filter(id__in=candidate_ids, is_active=True).only(
            "id",
            "first_name",
            "last_name",
            "company_name",
            "username",
            "slug",
            "user_type",
            "avatar",
        )
    }
    return [users_by_id[user_id] for user_id in candidate_ids if user_id in users_by_id][:MAX_CANDIDATES]


def _presence_status_by_user_id(*, user_ids) -> dict[int, str]:
    now = int(time())
    presence = get_message_presence_for_users(user_ids=user_ids)
    result: dict[int, str] = {}
    for user_id in user_ids:
        payload = presence.get(user_id)
        seen_at = payload.get("seen_at") if isinstance(payload, dict) else None
        result[user_id] = (
            "online"
            if payload
            and payload.get("visible") is True
            and isinstance(seen_at, int)
            and now - seen_at <= MESSAGE_PRESENCE_FRESH_SECONDS
            else "unknown"
        )
    return result


class GroupMemberCandidatesView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(api_rate_limit)
    def get(self, request):
        serializer = GroupMemberCandidatesQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        conversation = None
        conversation_id = serializer.validated_data.get("conversation_id")
        if conversation_id is not None:
            conversation = get_object_or_404(
                Conversation.objects.filter(
                    id=conversation_id,
                    is_group=True,
                    participants__user=request.user,
                    participants__status=ConversationParticipant.Status.ACTIVE,
                ).distinct()
            )

        excluded_ids = _existing_group_member_ids(conversation=conversation)
        excluded_ids.add(int(request.user.id))
        query = _normalize_query(serializer.validated_data.get("q"))
        candidates = (
            list(
                _candidate_queryset_for_search(
                    query=query,
                    current_user_id=request.user.id,
                    excluded_ids=excluded_ids,
                )
            )
            if query
            else _candidate_queryset_for_suggestions(user=request.user, excluded_ids=excluded_ids)
        )
        presence_by_user_id = _presence_status_by_user_id(
            user_ids=[candidate.id for candidate in candidates]
        )

        results = []
        for candidate in candidates:
            results.append(
                {
                    **serialize_user_brief(candidate, request),
                    "presence_status": presence_by_user_id.get(candidate.id, "unknown"),
                }
            )

        return Response({"results": results}, status=status.HTTP_200_OK)
