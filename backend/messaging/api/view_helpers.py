from __future__ import annotations

from django.db.models import (
    BooleanField,
    Case,
    Count,
    Exists,
    F,
    IntegerField,
    OuterRef,
    Prefetch,
    Q,
    Subquery,
    Value,
    When,
)
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404

from accounts.models import OfferedSkill
from ..models import Conversation, ConversationParticipant, Message
from ..services.conversations import SelfConversationNotAllowed, find_direct_conversation
from .serializers import ConversationListItemSerializer, MessageSerializer


def _conversation_for_user_or_404(*, conversation_id: int, user) -> Conversation:
    participant_qs = ConversationParticipant.objects.filter(
        conversation_id=OuterRef("pk"),
        user_id=user.id,
        status__in=[
            ConversationParticipant.Status.ACTIVE,
            ConversationParticipant.Status.INVITED,
        ],
    )

    return get_object_or_404(
        Conversation.objects.filter(
            participants__user=user,
            participants__status__in=[
                ConversationParticipant.Status.ACTIVE,
                ConversationParticipant.Status.INVITED,
            ],
        )
        .annotate(
            participant_hidden_at=Subquery(participant_qs.values("hidden_at")[:1]),
        )
        .filter(
            Q(participant_hidden_at__isnull=True)
            | Q(last_message_at__gt=F("participant_hidden_at"))
        )
        .distinct(),
        id=conversation_id,
    )


def _conversation_unread_count_expression_for_user(user):
    return Count(
        "messages",
        filter=Q(participants__user=user)
        & Q(
            participants__status__in=[
                ConversationParticipant.Status.ACTIVE,
                ConversationParticipant.Status.INVITED,
            ]
        )
        & Q(messages__is_deleted=False)
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
            conversation_id=conversation_id,
            user_id=user_id,
            status__in=[
                ConversationParticipant.Status.ACTIVE,
                ConversationParticipant.Status.INVITED,
            ],
        )
        .values("last_read_at")
        .first()
    )
    if participant is None:
        return 0

    last_read_at = participant.get("last_read_at")
    qs = Message.objects.filter(conversation_id=conversation_id, is_deleted=False).exclude(
        sender_id=user_id
    )
    if last_read_at is not None:
        qs = qs.filter(created_at__gt=last_read_at)
    return int(qs.count())


def _total_unread_messages_count_for_user(user) -> int:
    total = (
        ConversationParticipant.objects.filter(
            user=user,
            status__in=[
                ConversationParticipant.Status.ACTIVE,
                ConversationParticipant.Status.INVITED,
            ],
            conversation__last_message_at__isnull=False,
        ).aggregate(
            total=Count(
                "conversation__messages",
                filter=Q(conversation__messages__is_deleted=False)
                & ~Q(conversation__messages__sender_id=user.id)
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
            status__in=[
                ConversationParticipant.Status.ACTIVE,
                ConversationParticipant.Status.INVITED,
            ],
            conversation__last_message_at__isnull=False,
        ).aggregate(
            total=Count(
                "conversation__messages",
                filter=Q(conversation__messages__is_deleted=False)
                & ~Q(conversation__messages__sender_id=user_id)
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


def _participant_hidden_at_for_conversation(*, conversation_id: int, user_id: int):
    return (
        ConversationParticipant.objects.filter(
            conversation_id=conversation_id,
            user_id=user_id,
            status__in=[
                ConversationParticipant.Status.ACTIVE,
                ConversationParticipant.Status.INVITED,
            ],
        )
        .values_list("hidden_at", flat=True)
        .first()
    )


def _participant_status_for_conversation(*, conversation_id: int, user_id: int):
    return (
        ConversationParticipant.objects.filter(
            conversation_id=conversation_id,
            user_id=user_id,
            status__in=[
                ConversationParticipant.Status.ACTIVE,
                ConversationParticipant.Status.INVITED,
            ],
        )
        .values_list("status", flat=True)
        .first()
    )


def _pinned_message_for_conversation(*, conversation: Conversation) -> Message | None:
    pinned_message_id = getattr(conversation, "pinned_message_id", None)
    if pinned_message_id is None:
        return None

    return (
        Message.objects.select_related("sender")
        .filter(
            conversation_id=conversation.id,
            id=pinned_message_id,
            is_deleted=False,
        )
        .first()
    )


def _serialize_pinned_message(*, request, conversation: Conversation):
    pinned_message = _pinned_message_for_conversation(conversation=conversation)
    if pinned_message is None:
        return None
    return MessageSerializer(pinned_message, context={"request": request}).data


def _serialize_conversation_for_user(*, request, conversation_id: int):
    conversation = _conversation_list_queryset_for_user(request.user).filter(id=conversation_id).first()
    if conversation is None:
        return None
    return ConversationListItemSerializer(conversation, context={"request": request}).data


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


def _can_open_direct_target(*, actor, target) -> bool:
    if getattr(actor, "id", None) == getattr(target, "id", None):
        return True
    if getattr(target, "is_staff", False) or getattr(target, "is_superuser", False):
        return False
    if getattr(target, "is_public", False):
        return True
    try:
        return find_direct_conversation(
            actor=actor,
            target=target,
            require_started=True,
        ) is not None
    except SelfConversationNotAllowed:
        return True


def _conversation_list_queryset_for_user(user):
    """
    Conversations where the user is a participant, annotated for MVP UI:
    - other participant info via prefetch (serializer computes)
    - last message preview fields via subquery
    - last_read_at for current user via subquery
    - has_unread boolean
    """
    participant_qs = ConversationParticipant.objects.filter(
        conversation_id=OuterRef("pk"),
        user_id=user.id,
        status__in=[
            ConversationParticipant.Status.ACTIVE,
            ConversationParticipant.Status.INVITED,
        ],
    )
    last_msg_qs = Message.objects.filter(conversation_id=OuterRef("pk")).order_by(
        "-created_at", "-id"
    )
    other_participant_qs = ConversationParticipant.objects.filter(
        conversation_id=OuterRef("pk"),
        status=ConversationParticipant.Status.ACTIVE,
    ).exclude(user_id=user.id)

    qs = (
        Conversation.objects.filter(
            participants__user=user,
            participants__status__in=[
                ConversationParticipant.Status.ACTIVE,
                ConversationParticipant.Status.INVITED,
            ],
        )
        .distinct()
        .annotate(
            participant_hidden_at=Subquery(participant_qs.values("hidden_at")[:1]),
            participant_pinned_at=Subquery(participant_qs.values("pinned_at")[:1]),
            current_user_role=Subquery(participant_qs.values("role")[:1]),
            current_user_status=Subquery(participant_qs.values("status")[:1]),
            participant_count=Count(
                "participants",
                filter=Q(participants__status=ConversationParticipant.Status.ACTIVE),
                distinct=True,
            ),
            last_message_preview=Subquery(last_msg_qs.values("text")[:1]),
            last_message_sender_id=Subquery(last_msg_qs.values("sender_id")[:1]),
            last_message_is_deleted=Coalesce(
                Subquery(last_msg_qs.values("is_deleted")[:1]),
                Value(False),
                output_field=BooleanField(),
            ),
            last_message_has_image=Coalesce(
                Subquery(
                    last_msg_qs.annotate(
                        has_image=Case(
                            When(
                                Q(image__isnull=True) | Q(image=""),
                                then=Value(False),
                            ),
                            default=Value(True),
                            output_field=BooleanField(),
                        )
                    ).values("has_image")[:1]
                ),
                Value(False),
                output_field=BooleanField(),
            ),
            last_message_type=Subquery(last_msg_qs.values("message_type")[:1]),
            last_read_at=Subquery(participant_qs.values("last_read_at")[:1]),
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
            is_pinned=Case(
                When(participant_pinned_at__isnull=False, then=Value(True)),
                default=Value(False),
                output_field=BooleanField(),
            ),
            has_unread=Case(
                When(unread_count__gt=0, then=Value(True)),
                default=Value(False),
                output_field=BooleanField(),
            )
        )
        .prefetch_related(
            Prefetch(
                "participants",
                queryset=ConversationParticipant.objects.filter(
                    status__in=[
                        ConversationParticipant.Status.ACTIVE,
                        ConversationParticipant.Status.INVITED,
                    ],
                )
                .select_related("user")
                .only(
                    "id",
                    "conversation_id",
                    "user_id",
                    "role",
                    "status",
                    "joined_at",
                    "user__id",
                    "user__first_name",
                    "user__last_name",
                    "user__company_name",
                    "user__username",
                    "user__slug",
                    "user__user_type",
                    "user__avatar",
                )
                .order_by("role", "status", "joined_at", "id"),
                to_attr="_prefetched_participants",
            )
        )
    )
    return qs.filter(last_message_at__isnull=False).filter(
        Q(participant_hidden_at__isnull=True)
        | Q(last_message_at__gt=F("participant_hidden_at"))
    )
