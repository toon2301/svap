"""Testy pre code-review fixy v messaging (BOD 9 – participant count, BOD 10 – hidden unread)."""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from messaging.api.view_helpers_conversations import (
    _conversation_annotated_queryset_for_user,
)
from messaging.api.view_helpers_unread import (
    _total_unread_counts_for_users,
    _total_unread_messages_count_for_user,
)
from messaging.models import Conversation, ConversationParticipant, Message

User = get_user_model()


def _user(username):
    return User.objects.create_user(
        username=username, email=f"{username}@e.com", password="StrongPass123",
        is_verified=True, is_active=True,
    )


@pytest.mark.django_db
class TestGroupParticipantCount:
    def test_participant_count_accurate_for_group(self):
        # BOD 9: participant_count musí byť skutočný počet aktívnych členov (nie 1).
        u1, u2, u3 = _user("g1"), _user("g2"), _user("g3")
        convo = Conversation.objects.create(created_by=u1, is_group=True, name="G")
        ConversationParticipant.objects.create(
            conversation=convo, user=u1,
            role=ConversationParticipant.Role.OWNER,
            status=ConversationParticipant.Status.ACTIVE,
        )
        ConversationParticipant.objects.create(
            conversation=convo, user=u2, status=ConversationParticipant.Status.ACTIVE
        )
        ConversationParticipant.objects.create(
            conversation=convo, user=u3, status=ConversationParticipant.Status.ACTIVE
        )
        # Neaktívny člen sa nepočíta.
        ConversationParticipant.objects.create(
            conversation=convo, user=_user("g4"),
            status=ConversationParticipant.Status.LEFT,
        )

        row = _conversation_annotated_queryset_for_user(u1).get(id=convo.id)

        assert row.participant_count == 3
        # current-user anotácie ostali korektné (nedotknuté).
        assert row.current_user_role == ConversationParticipant.Role.OWNER
        assert row.current_user_status == ConversationParticipant.Status.ACTIVE


@pytest.mark.django_db
class TestHiddenConversationUnread:
    def _direct_convo_with_unread(self, viewer, sender):
        t0 = timezone.now()
        convo = Conversation.objects.create(
            created_by=sender,
            is_group=False,
            request_status=Conversation.RequestStatus.ACCEPTED,
            last_message_at=t0,
        )
        viewer_p = ConversationParticipant.objects.create(
            conversation=convo, user=viewer,
            status=ConversationParticipant.Status.ACTIVE,
        )
        ConversationParticipant.objects.create(
            conversation=convo, user=sender,
            status=ConversationParticipant.Status.ACTIVE,
        )
        Message.objects.create(conversation=convo, sender=sender, text="hi")
        return convo, viewer_p, t0

    def test_hidden_conversation_excluded_from_total_unread(self):
        # BOD 10: skrytá konverzácia sa nesmie počítať do total unread (badge).
        viewer, sender = _user("h1"), _user("h2")
        convo, viewer_p, t0 = self._direct_convo_with_unread(viewer, sender)

        # Baseline: 1 neprečítaná (viewer nič neprečítal).
        assert _total_unread_messages_count_for_user(viewer) == 1

        # viewer skryje konverzáciu PO poslednej správe -> už sa nepočíta.
        viewer_p.hidden_at = t0 + timedelta(seconds=10)
        viewer_p.save(update_fields=["hidden_at"])

        assert _total_unread_messages_count_for_user(viewer) == 0
        # Batch varianta musí dať IDENTICKÝ výsledok (invariant súboru).
        assert _total_unread_counts_for_users([viewer.id]).get(viewer.id, 0) == 0

    def test_hidden_but_resurfaced_by_new_message_counts_again(self):
        # Ak po skrytí príde novšia správa (last_message_at >= hidden_at), počíta sa.
        viewer, sender = _user("h3"), _user("h4")
        convo, viewer_p, t0 = self._direct_convo_with_unread(viewer, sender)

        viewer_p.hidden_at = t0 - timedelta(seconds=10)  # skryté PRED poslednou správou
        viewer_p.save(update_fields=["hidden_at"])

        # last_message_at (t0) >= hidden_at (t0-10s) -> konverzácia je opäť viditeľná.
        assert _total_unread_messages_count_for_user(viewer) == 1
