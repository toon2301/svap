from __future__ import annotations

from time import perf_counter

from django.contrib.auth import get_user_model
from django.db import connections
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.utils.urls import remove_query_param, replace_query_param

from swaply.rate_limiting import (
    messaging_mark_read_rate_limit,
    messaging_open_rate_limit,
)
from ..models import ConversationParticipant
from ..services.conversations import SelfConversationNotAllowed, find_direct_conversation
from ..services.messages import (
    NotParticipant,
    hide_conversation_for_user,
    mark_conversation_read,
    set_conversation_pinned_state_for_user,
)
from .conversation_search import apply_conversation_list_search
from .notification_dispatch import notify_user
from .serializers import (
    ConversationListItemSerializer,
    ConversationListQuerySerializer,
    ConversationPinStateSerializer,
    MarkReadSerializer,
    OpenConversationSerializer,
    serialize_user_brief,
)
from .view_helpers import (
    _can_open_direct_target,
    _conversation_list_queryset_for_user,
    _conversation_for_user_or_404,
    _has_requestable_offers_for_user_id,
    _total_unread_messages_count_for_user,
)

User = get_user_model()


def _record_messaging_timing(request, **entries) -> None:
    """Best-effort Server-Timing enrichment for messaging views."""
    try:
        base_req = getattr(request, "_request", request)
        st = getattr(base_req, "_server_timing", None)
        if not isinstance(st, dict):
            st = {}
        st.update(entries)
        base_req._server_timing = st
    except Exception:
        pass


def _classify_conversations_sql(sql: str) -> str:
    normalized = " ".join(str(sql).lower().split())

    if (
        'select count(*) from (select distinct "messaging_conversation"' in normalized
        and 'from "messaging_conversation"' in normalized
    ):
        return "count"

    if 'from "messaging_conversation"' in normalized and " order by " in normalized:
        return "page"

    if (
        'from "messaging_conversationparticipant"' in normalized
        and 'where "messaging_conversationparticipant"."conversation_id" in' in normalized
    ):
        return "prefetch_participants"

    if (
        'from "accounts_user"' in normalized
        and 'where "accounts_user"."id" in' in normalized
    ):
        return "prefetch_users"

    return "other"


class _ConversationsQueryTimingCollector:
    def __init__(self) -> None:
        self.timings = {
            "count": 0.0,
            "page": 0.0,
            "prefetch_participants": 0.0,
            "prefetch_users": 0.0,
            "other": 0.0,
        }

    def __call__(self, execute, sql, params, many, context):
        t0 = perf_counter()
        try:
            return execute(sql, params, many, context)
        finally:
            bucket = _classify_conversations_sql(sql)
            self.timings[bucket] = self.timings.get(bucket, 0.0) + (
                (perf_counter() - t0) * 1000.0
            )


class ConversationListPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        self.request = request
        self.page_size_value = self.get_page_size(request) or self.page_size
        page_number = request.query_params.get(self.page_query_param, 1)

        try:
            self.page_number = int(page_number)
        except (TypeError, ValueError):
            raise NotFound("Invalid page.")

        if self.page_number < 1:
            raise NotFound("Invalid page.")

        offset = (self.page_number - 1) * self.page_size_value
        limit = offset + self.page_size_value + 1
        items = list(queryset[offset:limit])

        self.has_next = len(items) > self.page_size_value
        self.has_previous = self.page_number > 1

        if self.has_next:
            items = items[: self.page_size_value]

        return items

    def get_next_link(self):
        if not getattr(self, "has_next", False):
            return None
        url = self.request.build_absolute_uri()
        return replace_query_param(url, self.page_query_param, self.page_number + 1)

    def get_previous_link(self):
        if not getattr(self, "has_previous", False):
            return None

        url = self.request.build_absolute_uri()
        if self.page_number <= 2:
            return remove_query_param(url, self.page_query_param)
        return replace_query_param(url, self.page_query_param, self.page_number - 1)

    def get_paginated_response(self, data):
        return Response(
            {
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )


class UnreadMessagesSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {"count": _total_unread_messages_count_for_user(request.user)},
            status=status.HTTP_200_OK,
        )


class OpenConversationView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(messaging_open_rate_limit)
    def post(self, request):
        serializer = OpenConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_user_id = serializer.validated_data["target_user_id"]
        target = get_object_or_404(User, id=target_user_id, is_active=True)
        if not _can_open_direct_target(actor=request.user, target=target):
            return Response(status=status.HTTP_404_NOT_FOUND)
        try:
            existing = find_direct_conversation(
                actor=request.user,
                target=target,
                require_started=True,
            )
        except SelfConversationNotAllowed:
            return Response(
                {"error": "Nemôžete začať konverzáciu sami so sebou."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if existing is not None:
            convo = _conversation_list_queryset_for_user(request.user).filter(id=existing.id).first()
            if convo is not None:
                data = ConversationListItemSerializer(convo, context={"request": request}).data
                data["created"] = False
                data["is_draft"] = False
                data["target_user_id"] = target.id
                return Response(data, status=status.HTTP_200_OK)

        data = {
            "id": None,
            "other_user": serialize_user_brief(target, request),
            "has_requestable_offers": _has_requestable_offers_for_user_id(target.id),
            "last_message_at": None,
            "last_message_preview": None,
            "last_message_sender_id": None,
            "last_message_is_deleted": False,
            "last_message_has_image": False,
            "last_read_at": None,
            "has_unread": False,
            "unread_count": 0,
            "is_pinned": False,
            "updated_at": None,
            "created": False,
            "is_draft": True,
            "target_user_id": target.id,
        }
        return Response(data, status=status.HTTP_200_OK)


class ConversationListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationListItemSerializer
    pagination_class = ConversationListPagination

    def get_validated_query_params(self):
        serializer = getattr(self, "_validated_query_params", None)
        if serializer is None:
            serializer = ConversationListQuerySerializer(data=self.request.query_params)
            serializer.is_valid(raise_exception=True)
            self._validated_query_params = serializer
        return serializer

    def get_queryset(self):
        qs = _conversation_list_queryset_for_user(self.request.user)
        search_query = self.get_validated_query_params().validated_data.get("search", "")
        qs = apply_conversation_list_search(qs, search_query)
        # Ordering: pinned conversations first, then newest activity.
        return qs.order_by("-is_pinned", "-last_message_at", "-updated_at", "-id")

    def list(self, request, *args, **kwargs):
        conn = connections["default"]
        was_none = False
        try:
            was_none = conn.connection is None
        except Exception:
            was_none = False

        t_total0 = perf_counter()

        t_conn0 = perf_counter()
        try:
            conn.ensure_connection()
        except Exception:
            # fail-open: queryset evaluation below will surface any real DB issue
            pass
        db_connect_ms = (perf_counter() - t_conn0) * 1000.0

        queryset = self.filter_queryset(self.get_queryset())
        query_collector = _ConversationsQueryTimingCollector()

        t_sql0 = perf_counter()
        with conn.execute_wrapper(query_collector):
            page = self.paginate_queryset(queryset)
            items = page if page is not None else list(queryset)
        conversations_sql_ms = (perf_counter() - t_sql0) * 1000.0

        t_ser0 = perf_counter()
        serializer = self.get_serializer(items, many=True)
        if page is not None:
            response = self.get_paginated_response(serializer.data)
        else:
            response = Response(serializer.data)
        conversations_serialize_ms = (perf_counter() - t_ser0) * 1000.0
        conversations_total_ms = (perf_counter() - t_total0) * 1000.0

        _record_messaging_timing(
            request,
            conversations_db_connect=db_connect_ms,
            conversations_sql=conversations_sql_ms,
            conversations_sql_count=query_collector.timings.get("count", 0.0),
            conversations_sql_page=query_collector.timings.get("page", 0.0),
            conversations_sql_prefetch_participants=query_collector.timings.get(
                "prefetch_participants", 0.0
            ),
            conversations_sql_prefetch_users=query_collector.timings.get(
                "prefetch_users", 0.0
            ),
            conversations_sql_other=query_collector.timings.get("other", 0.0),
            conversations_db=db_connect_ms + conversations_sql_ms,
            conversations_serialize=conversations_serialize_ms,
            conversations_total=conversations_total_ms,
            db_conn_new_conversations=0.1 if was_none else 0.0,
        )
        return response


class HideConversationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id: int):
        convo = _conversation_for_user_or_404(conversation_id=conversation_id, user=request.user)

        try:
            result = hide_conversation_for_user(
                conversation=convo,
                user=request.user,
            )
        except NotParticipant:
            return Response(status=status.HTTP_404_NOT_FOUND)

        total_unread_count = _total_unread_messages_count_for_user(request.user)

        return Response(
            {
                "conversation_id": convo.id,
                "hidden_at": result.participant.hidden_at,
                "conversation_unread_count": 0,
                "total_unread_count": total_unread_count,
            },
            status=status.HTTP_200_OK,
        )


class ConversationPinStateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id: int):
        convo = _conversation_for_user_or_404(conversation_id=conversation_id, user=request.user)
        serializer = ConversationPinStateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = set_conversation_pinned_state_for_user(
                conversation=convo,
                user=request.user,
                is_pinned=serializer.validated_data["is_pinned"],
            )
        except NotParticipant:
            return Response(status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "conversation_id": convo.id,
                "is_pinned": bool(result.participant.pinned_at),
            },
            status=status.HTTP_200_OK,
        )


class MarkConversationReadView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(messaging_mark_read_rate_limit)
    def post(self, request, conversation_id: int):
        convo = _conversation_for_user_or_404(conversation_id=conversation_id, user=request.user)
        serializer = MarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            participant = mark_conversation_read(conversation=convo, user=request.user)
        except NotParticipant:
            return Response(status=status.HTTP_404_NOT_FOUND)

        total_unread_count = _total_unread_messages_count_for_user(request.user)
        notify_user(
            request.user.id,
            {
                "type": "messaging_read",
                "conversation_id": convo.id,
                "conversation_unread_count": 0,
                "total_unread_count": total_unread_count,
            },
        )
        peer_read_event = {
            "type": "messaging_peer_read",
            "conversation_id": convo.id,
            "reader_id": request.user.id,
            "peer_last_read_at": (
                participant.last_read_at.isoformat()
                if participant.last_read_at is not None
                else None
            ),
        }
        recipient_ids = (
            ConversationParticipant.objects.filter(
                conversation=convo,
                status=ConversationParticipant.Status.ACTIVE,
            )
            .exclude(user_id=request.user.id)
            .values_list("user_id", flat=True)
        )
        for participant_id in recipient_ids:
            notify_user(int(participant_id), peer_read_event)

        return Response(
            {
                "conversation_id": convo.id,
                "last_read_at": participant.last_read_at,
                "conversation_unread_count": 0,
                "total_unread_count": total_unread_count,
            },
            status=status.HTTP_200_OK,
        )
