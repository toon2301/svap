from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import connections
from django.db.models import (
    BooleanField,
    Case,
    Count,
    Exists,
    F,
    IntegerField,
    OuterRef,
    Q,
    Subquery,
    Value,
    When,
)
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

from accounts.models import OfferedSkill
from accounts.realtime import notify_user
from swaply.rate_limiting import (
    messaging_mark_read_rate_limit,
    messaging_open_rate_limit,
    messaging_send_rate_limit,
)

from ..models import Conversation, ConversationParticipant, Message
from ..services.conversations import (
    SelfConversationNotAllowed,
    find_direct_conversation,
    send_direct_message,
)
from ..services.messages import NotParticipant, mark_conversation_read, send_message
from .serializers import (
    ConversationListItemSerializer,
    MarkReadSerializer,
    MessageSerializer,
    OpenConversationSerializer,
    SendMessageSerializer,
    StartDirectMessageSerializer,
    serialize_user_brief,
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


def _conversation_unread_count_expression_for_user(user):
    return Count(
        "messages",
        filter=Q(participants__user=user)
        & ~Q(messages__sender_id=user.id)
        & (
            Q(participants__last_read_at__isnull=True)
            | Q(messages__created_at__gt=F("participants__last_read_at"))
        ),
        distinct=True,
        output_field=IntegerField(),
    )


def _conversation_unread_messages_count_for_user(*, conversation_id: int, user_id: int) -> int:
    participant = (
        ConversationParticipant.objects.filter(
            conversation_id=conversation_id, user_id=user_id
        )
        .values("last_read_at")
        .first()
    )
    if participant is None:
        return 0

    last_read_at = participant.get("last_read_at")
    qs = Message.objects.filter(conversation_id=conversation_id).exclude(sender_id=user_id)
    if last_read_at is not None:
        qs = qs.filter(created_at__gt=last_read_at)
    return int(qs.count())


def _total_unread_messages_count_for_user(user) -> int:
    total = (
        ConversationParticipant.objects.filter(
            user=user,
            conversation__last_message_at__isnull=False,
        ).aggregate(
            total=Count(
                "conversation__messages",
                filter=~Q(conversation__messages__sender_id=user.id)
                & (
                    Q(last_read_at__isnull=True)
                    | Q(conversation__messages__created_at__gt=F("last_read_at"))
                ),
                distinct=True,
                output_field=IntegerField(),
            )
        )["total"]
        or 0
    )
    return int(total)


def _total_unread_messages_count_for_user_id(user_id: int) -> int:
    total = (
        ConversationParticipant.objects.filter(
            user_id=user_id,
            conversation__last_message_at__isnull=False,
        ).aggregate(
            total=Count(
                "conversation__messages",
                filter=~Q(conversation__messages__sender_id=user_id)
                & (
                    Q(last_read_at__isnull=True)
                    | Q(conversation__messages__created_at__gt=F("last_read_at"))
                ),
                distinct=True,
                output_field=IntegerField(),
            )
        )["total"]
        or 0
    )
    return int(total)


def _peer_last_read_at_for_conversation(*, conversation_id: int, user_id: int):
    return (
        ConversationParticipant.objects.filter(conversation_id=conversation_id)
        .exclude(user_id=user_id)
        .values_list("last_read_at", flat=True)
        .first()
    )


def _has_requestable_offers_for_user_id(user_id: int | None) -> bool:
    if not user_id:
        return False

    return OfferedSkill.objects.filter(
        user_id=user_id,
        is_hidden=False,
        is_seeking=False,
        user__is_active=True,
        user__is_public=True,
    ).exists()


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
    other_participant_qs = ConversationParticipant.objects.filter(
        conversation_id=OuterRef("pk")
    ).exclude(user_id=user.id)

    qs = (
        Conversation.objects.filter(participants__user=user, last_message_at__isnull=False)
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
            other_user_id=Subquery(other_participant_qs.values("user_id")[:1]),
            other_user_first_name=Subquery(other_participant_qs.values("user__first_name")[:1]),
            other_user_last_name=Subquery(other_participant_qs.values("user__last_name")[:1]),
            other_user_company_name=Subquery(
                other_participant_qs.values("user__company_name")[:1]
            ),
            other_user_username=Subquery(other_participant_qs.values("user__username")[:1]),
            other_user_slug=Subquery(other_participant_qs.values("user__slug")[:1]),
            other_user_type=Subquery(other_participant_qs.values("user__user_type")[:1]),
            other_user_avatar_name=Subquery(other_participant_qs.values("user__avatar")[:1]),
        )
        .annotate(
            has_requestable_offers=Exists(
                OfferedSkill.objects.filter(
                    user_id=OuterRef("other_user_id"),
                    is_hidden=False,
                    is_seeking=False,
                    user__is_active=True,
                    user__is_public=True,
                )
            ),
            unread_count=_conversation_unread_count_expression_for_user(user),
        )
        .annotate(
            has_unread=Case(
                When(unread_count__gt=0, then=Value(True)),
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
            convo = (
                _conversation_list_queryset_for_user(request.user)
                .filter(id=existing.id)
                .first()
            ) or existing
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
            "last_read_at": None,
            "has_unread": False,
            "unread_count": 0,
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

    def get_queryset(self):
        qs = _conversation_list_queryset_for_user(self.request.user)
        # Ordering: newest activity first
        return qs.order_by("-last_message_at", "-updated_at", "-id")

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

    def get_conversation(self) -> Conversation:
        conversation = getattr(self, "_conversation", None)
        if conversation is None:
            conversation_id = int(self.kwargs["conversation_id"])
            conversation = _conversation_for_user_or_404(
                conversation_id=conversation_id,
                user=self.request.user,
            )
            self._conversation = conversation
        return conversation

    def get_queryset(self):
        convo = self.get_conversation()
        return (
            Message.objects.filter(conversation=convo)
            .select_related("sender")
            .order_by("-created_at", "-id")
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        peer_last_read_at = _peer_last_read_at_for_conversation(
            conversation_id=self.get_conversation().id,
            user_id=request.user.id,
        )
        peer_last_read_at_value = (
            peer_last_read_at.isoformat() if peer_last_read_at is not None else None
        )

        if page is not None:
            response = self.get_paginated_response(serializer.data)
            response.data["peer_last_read_at"] = peer_last_read_at_value
            return response

        return Response(
            {
                "results": serializer.data,
                "peer_last_read_at": peer_last_read_at_value,
            }
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

        event = {
            "type": "messaging_message",
            "conversation_id": convo.id,
            "message_id": result.message.id,
            "sender_id": request.user.id,
            "created_at": result.message.created_at.isoformat(),
        }
        for participant_id in result.recipient_user_ids:
            notify_user(
                participant_id,
                {
                    **event,
                    "total_unread_count": _total_unread_messages_count_for_user_id(
                        participant_id
                    ),
                    "conversation_unread_count": _conversation_unread_messages_count_for_user(
                        conversation_id=convo.id,
                        user_id=participant_id,
                    ),
                },
            )

        return Response(
            MessageSerializer(result.message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class StartDirectMessageView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(messaging_send_rate_limit)
    def post(self, request):
        serializer = StartDirectMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_user_id = serializer.validated_data["target_user_id"]
        target = get_object_or_404(User, id=target_user_id, is_active=True)

        try:
            result = send_direct_message(
                actor=request.user,
                target=target,
                text=serializer.validated_data["text"],
            )
        except SelfConversationNotAllowed:
            return Response(
                {"error": "NemÃ´Å¾ete zaÄaÅ¥ konverzÃ¡ciu sami so sebou."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event = {
            "type": "messaging_message",
            "conversation_id": result.conversation.id,
            "message_id": result.message.id,
            "sender_id": request.user.id,
            "created_at": result.message.created_at.isoformat(),
        }
        for participant_id in result.recipient_user_ids:
            notify_user(
                participant_id,
                {
                    **event,
                    "total_unread_count": _total_unread_messages_count_for_user_id(
                        participant_id
                    ),
                    "conversation_unread_count": _conversation_unread_messages_count_for_user(
                        conversation_id=result.conversation.id,
                        user_id=participant_id,
                    ),
                },
            )

        return Response(
            {
                "conversation_id": result.conversation.id,
                "conversation_created": result.created_conversation,
                "message": MessageSerializer(
                    result.message, context={"request": request}
                ).data,
            },
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
        recipient_ids = ConversationParticipant.objects.filter(conversation=convo).exclude(
            user_id=request.user.id
        ).values_list("user_id", flat=True)
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

