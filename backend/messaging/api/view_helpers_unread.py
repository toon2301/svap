"""
Unread-count helpery pre messaging (vyčlenené z view_helpers.py kvôli dĺžke).

Per-user aj dávkové (batch) výpočty počtu neprečítaných správ – konverzačné aj
celkové. Filtre musia ostať IDENTICKÉ naprieč per-user a batch variantmi.
"""

from __future__ import annotations

from django.db.models import Count, F, IntegerField, Q

from ..models import Conversation, ConversationParticipant, Message


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
        # System messages (e.g. "X created the group") are informational and must
        # not drive the unread badge — otherwise a group created with one invite
        # counts the system line + the invitation as 2 unread. See Message.Type.
        & ~Q(messages__message_type=Message.Type.SYSTEM)
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
    qs = (
        Message.objects.filter(conversation_id=conversation_id, is_deleted=False)
        .exclude(message_type=Message.Type.SYSTEM)
        .exclude(sender_id=user_id)
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
        )
        .filter(
            Q(conversation__is_group=True)
            | ~Q(conversation__request_status=Conversation.RequestStatus.DELETED)
        )
        .filter(
            # Vylúč skryté konverzácie (rovnaká podmienka ako sidebar): skrytá ostáva
            # skrytá, kým nepríde novšia správa (last_message_at >= hidden_at).
            Q(hidden_at__isnull=True)
            | Q(conversation__last_message_at__gte=F("hidden_at"))
        )
        .aggregate(
            total=Count(
                "conversation__messages",
                filter=Q(conversation__messages__is_deleted=False)
                & ~Q(conversation__messages__message_type=Message.Type.SYSTEM)
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
        )
        .filter(
            Q(conversation__is_group=True)
            | ~Q(conversation__request_status=Conversation.RequestStatus.DELETED)
        )
        .filter(
            # Vylúč skryté konverzácie (rovnaká podmienka ako sidebar): skrytá ostáva
            # skrytá, kým nepríde novšia správa (last_message_at >= hidden_at).
            Q(hidden_at__isnull=True)
            | Q(conversation__last_message_at__gte=F("hidden_at"))
        )
        .aggregate(
            total=Count(
                "conversation__messages",
                filter=Q(conversation__messages__is_deleted=False)
                & ~Q(conversation__messages__message_type=Message.Type.SYSTEM)
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


def _total_unread_counts_for_users(user_ids) -> dict[int, int]:
    """
    Dávkový ekvivalent _total_unread_messages_count_for_user_id pre viacero
    používateľov naraz – jeden GROUP BY user_id dotaz namiesto N samostatných.
    Vracia {user_id: total_unread_count}. Filter musí byť IDENTICKÝ s per-user
    verziou (rozdiel: sender porovnávame s F("user_id") namiesto literálu).
    """
    ids = [int(uid) for uid in user_ids]
    if not ids:
        return {}
    rows = (
        ConversationParticipant.objects.filter(
            user_id__in=ids,
            status__in=[
                ConversationParticipant.Status.ACTIVE,
                ConversationParticipant.Status.INVITED,
            ],
            conversation__last_message_at__isnull=False,
        )
        .filter(
            Q(conversation__is_group=True)
            | ~Q(conversation__request_status=Conversation.RequestStatus.DELETED)
        )
        .filter(
            # Vylúč skryté konverzácie – IDENTICKÝ filter ako per-user varianty
            # (inak by WS total_unread_count nesedel s badge cez REST).
            Q(hidden_at__isnull=True)
            | Q(conversation__last_message_at__gte=F("hidden_at"))
        )
        .values("user_id")
        .annotate(
            total=Count(
                "conversation__messages",
                filter=Q(conversation__messages__is_deleted=False)
                & ~Q(conversation__messages__message_type=Message.Type.SYSTEM)
                & ~Q(conversation__messages__sender_id=F("user_id"))
                & (
                    Q(last_read_at__isnull=True)
                    | Q(conversation__messages__created_at__gt=F("last_read_at"))
                ),
                distinct=True,
                output_field=IntegerField(),
            )
        )
    )
    return {int(row["user_id"]): int(row["total"] or 0) for row in rows}


def _conversation_unread_counts_for_users(*, conversation_id: int, user_ids) -> dict[int, int]:
    """
    Dávkový ekvivalent _conversation_unread_messages_count_for_user pre viacero
    používateľov v rovnakej konverzácii – jeden GROUP BY user_id dotaz.
    Vracia {user_id: conversation_unread_count}.
    """
    ids = [int(uid) for uid in user_ids]
    if not ids:
        return {}
    rows = (
        ConversationParticipant.objects.filter(
            conversation_id=conversation_id,
            user_id__in=ids,
            status__in=[
                ConversationParticipant.Status.ACTIVE,
                ConversationParticipant.Status.INVITED,
            ],
        )
        .values("user_id")
        .annotate(
            unread=Count(
                "conversation__messages",
                filter=Q(conversation__messages__is_deleted=False)
                & ~Q(conversation__messages__message_type=Message.Type.SYSTEM)
                & ~Q(conversation__messages__sender_id=F("user_id"))
                & (
                    Q(last_read_at__isnull=True)
                    | Q(conversation__messages__created_at__gt=F("last_read_at"))
                ),
                distinct=True,
                output_field=IntegerField(),
            )
        )
    )
    return {int(row["user_id"]): int(row["unread"] or 0) for row in rows}


def unread_payload_for_recipients(*, conversation_id: int, recipient_user_ids) -> dict[int, dict]:
    """
    Pripraví per-recipient WS payload časť (total + conversation unread count)
    pre všetkých príjemcov **dvomi** dotazmi namiesto ~3×N. Formát payloadu je
    nezmenený – len interný výpočet je dávkový.
    """
    recipient_ids = [int(uid) for uid in recipient_user_ids]
    if not recipient_ids:
        return {}
    totals = _total_unread_counts_for_users(recipient_ids)
    conversation_counts = _conversation_unread_counts_for_users(
        conversation_id=conversation_id, user_ids=recipient_ids
    )
    return {
        uid: {
            "total_unread_count": totals.get(uid, 0),
            "conversation_unread_count": conversation_counts.get(uid, 0),
        }
        for uid in recipient_ids
    }
