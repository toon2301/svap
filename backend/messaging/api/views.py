from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import connections
from django.db.models import Prefetch
from django.db.models import BooleanField, Case, F, OuterRef, Subquery, Value, When
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from time import perf_counter
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.utils.urls import remove_query_param, replace_query_param

from swaply.rate_limiting import (
    messaging_mark_read_rate_limit,
    messaging_open_rate_limit,
    messaging_send_rate_limit,
)

from ..models import Conversation, ConversationParticipant, Message
from ..services.conversations import SelfConversationNotAllowed, open_or_create_direct_conversation
from ..services.messages import NotParticipant, mark_conversation_read, send_message
from .serializers import (
    ConversationListItemSerializer,
    MarkReadSerializer,
    MessageSerializer,
    OpenConversationSerializer,
    SendMessageSerializer,
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

    if (
        'from "messaging_conversation"' in normalized
        and 'order by "messaging_conversation"."last_message_at" desc' in normalized
    ):
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


def _conversation_for_user_or_404(*, conversation_id: int, user) -> Conversation:
    return get_object_or_404(
        Conversation.objects.filter(participants__user=user).distinct(),
        id=conversation_id,
    )


def _conversation_participants_prefetch() -> Prefetch:
    return Prefetch(
        "participants",
        queryset=ConversationParticipant.objects.select_related("user"),
        to_attr="_prefetched_participants",
    )


def _conversation_list_queryset_for_user(user):
    """
    Conversations where the user is a participant, annotated for MVP UI:
    - other participant info via prefetch (serializer computes)
    - last message preview fields via subquery
    - last_read_at for current user via subquery
    - has_unread boolean
    """
    last_msg_qs = (
        Message.objects.filter(conversation_id=OuterRef("pk"))
        .order_by("-created_at", "-id")
    )
    last_read_qs = ConversationParticipant.objects.filter(
        conversation_id=OuterRef("pk"), user_id=user.id
    ).values("last_read_at")[:1]

    qs = (
        Conversation.objects.filter(participants__user=user)
        .distinct()
        .annotate(
            last_message_preview=Subquery(last_msg_qs.values("text")[:1]),
            last_message_sender_id=Subquery(last_msg_qs.values("sender_id")[:1]),
            last_message_is_deleted=Coalesce(
                Subquery(last_msg_qs.values("is_deleted")[:1]),
                Value(False),
                output_field=BooleanField(),
            ),
            last_read_at=Subquery(last_read_qs),
        )
        .annotate(
            has_unread=Case(
                # no last_message_at -> nothing to read
                When(last_message_at__isnull=True, then=Value(False)),
                # no last_read_at -> unread if there's a last_message_at
                When(last_read_at__isnull=True, then=Value(True)),
                # otherwise compare timestamps
                When(last_message_at__gt=F("last_read_at"), then=Value(True)),
                default=Value(False),
                output_field=BooleanField(),
            )
        )
    )
    return qs


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


class OpenConversationView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(messaging_open_rate_limit)
    def post(self, request):
        serializer = OpenConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_user_id = serializer.validated_data["target_user_id"]
        target = get_object_or_404(User, id=target_user_id, is_active=True)
        try:
            result = open_or_create_direct_conversation(actor=request.user, target=target)
        except SelfConversationNotAllowed:
            return Response(
                {"error": "Nemôžete začať konverzáciu sami so sebou."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Return as list-item shape so FE can render immediately.
        convo = (
            _conversation_list_queryset_for_user(request.user)
            .filter(id=result.conversation.id)
            .prefetch_related(_conversation_participants_prefetch())
            .first()
        ) or result.conversation
        data = ConversationListItemSerializer(convo, context={"request": request}).data
        data["created"] = result.created
        return Response(data, status=status.HTTP_200_OK)


class ConversationListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationListItemSerializer
    pagination_class = ConversationListPagination

    def get_queryset(self):
        qs = _conversation_list_queryset_for_user(self.request.user)
        # Ordering: newest activity first
        return qs.order_by("-last_message_at", "-updated_at", "-id").prefetch_related(
            _conversation_participants_prefetch()
        )

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


class MessagePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class MessageListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    pagination_class = MessagePagination

    def get_queryset(self):
        conversation_id = int(self.kwargs["conversation_id"])
        convo = _conversation_for_user_or_404(conversation_id=conversation_id, user=self.request.user)
        return (
            Message.objects.filter(conversation=convo)
            .select_related("sender")
            .order_by("-created_at", "-id")
        )


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(messaging_send_rate_limit)
    def post(self, request, conversation_id: int):
        convo = _conversation_for_user_or_404(conversation_id=conversation_id, user=request.user)
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = send_message(
                conversation=convo,
                sender=request.user,
                text=serializer.validated_data["text"],
            )
        except NotParticipant:
            # Do not leak existence; treat as not found
            return Response(status=status.HTTP_404_NOT_FOUND)

        return Response(
            MessageSerializer(result.message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
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

        return Response(
            {"conversation_id": convo.id, "last_read_at": participant.last_read_at},
            status=status.HTTP_200_OK,
        )

