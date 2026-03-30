import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from messaging.models import Conversation, ConversationParticipant, Message
from messaging.services.conversations import open_or_create_direct_conversation


User = get_user_model()


@pytest.mark.django_db
class TestMessagingApi(APITestCase):
    def setUp(self):
        cache.clear()
        self.u1 = User.objects.create_user(
            username="u1",
            email="u1@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
        )
        self.u2 = User.objects.create_user(
            username="u2",
            email="u2@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
        )
        self.u3 = User.objects.create_user(
            username="u3",
            email="u3@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
        )

    def tearDown(self):
        cache.clear()

    def _create_direct_conversation(self, actor, target) -> Conversation:
        result = open_or_create_direct_conversation(actor=actor, target=target)
        return result.conversation

    def test_open_conversation_returns_draft_without_creating_database_rows(self):
        self.client.force_authenticate(user=self.u1)
        url = reverse("accounts:messaging_open")

        response = self.client.post(url, {"target_user_id": self.u2.id}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] is None
        assert response.data["is_draft"] is True
        assert response.data["target_user_id"] == self.u2.id
        assert response.data["other_user"]["id"] == self.u2.id
        assert Conversation.objects.count() == 0
        assert ConversationParticipant.objects.count() == 0

    def test_open_conversation_keeps_old_empty_conversation_hidden(self):
        self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        url = reverse("accounts:messaging_open")
        response = self.client.post(url, {"target_user_id": self.u2.id}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] is None
        assert response.data["is_draft"] is True
        assert Conversation.objects.count() == 1
        assert ConversationParticipant.objects.count() == 2
        assert Message.objects.count() == 0

    def test_open_conversation_returns_existing_started_conversation(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        send_response = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        assert send_response.status_code == status.HTTP_201_CREATED

        open_url = reverse("accounts:messaging_open")
        open_response = self.client.post(open_url, {"target_user_id": self.u2.id}, format="json")

        assert open_response.status_code == status.HTTP_200_OK
        assert open_response.data["id"] == convo.id
        assert open_response.data["is_draft"] is False
        assert open_response.data["created"] is False

    def test_start_direct_message_creates_conversation_and_emits_realtime_event(self):
        self.client.force_authenticate(user=self.u1)
        url = reverse("accounts:messaging_send_direct_message")

        with patch("messaging.api.views.notify_user") as notify_user_mock:
            response = self.client.post(
                url,
                {"target_user_id": self.u2.id, "text": "Ahoj"},
                format="json",
            )

        assert response.status_code == status.HTTP_201_CREATED
        assert Conversation.objects.count() == 1
        assert ConversationParticipant.objects.count() == 2
        assert Message.objects.count() == 1
        assert response.data["conversation_created"] is True
        assert isinstance(response.data["conversation_id"], int)
        assert response.data["message"]["text"] == "Ahoj"

        notify_user_mock.assert_called_once()
        called_user_id, event = notify_user_mock.call_args.args
        assert called_user_id == self.u2.id
        assert event["type"] == "messaging_message"
        assert event["conversation_id"] == response.data["conversation_id"]
        assert event["message_id"] == response.data["message"]["id"]
        assert event["sender_id"] == self.u1.id
        assert isinstance(event["created_at"], str)

    def test_non_participant_cannot_read_messages(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u3)
        list_url = reverse("accounts:messaging_list_messages", kwargs={"conversation_id": convo.id})
        response = self.client.get(list_url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_non_participant_cannot_send_message(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u3)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        response = self.client.post(send_url, {"text": "hi"}, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert Message.objects.count() == 0

    def test_mark_read_updates_last_read_at(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        send_response = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        assert send_response.status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        read_url = reverse("accounts:messaging_mark_read", kwargs={"conversation_id": convo.id})
        read_response = self.client.post(read_url, {}, format="json")

        assert read_response.status_code == status.HTTP_200_OK
        participant = ConversationParticipant.objects.get(conversation_id=convo.id, user=self.u1)
        assert participant.last_read_at is not None

    def test_conversation_list_returns_only_started_conversations_with_other_user(self):
        empty_convo = self._create_direct_conversation(actor=self.u1, target=self.u2)
        started_convo = self._create_direct_conversation(actor=self.u1, target=self.u3)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": started_convo.id})
        send_response = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        assert send_response.status_code == status.HTTP_201_CREATED

        list_url = reverse("accounts:messaging_list_conversations")
        response = self.client.get(list_url)

        assert response.status_code == status.HTTP_200_OK
        results = response.data.get("results", [])
        assert len(results) == 1
        assert results[0]["id"] == started_convo.id
        assert results[0]["other_user"]["id"] == self.u3.id
        assert results[0]["other_user"]["display_name"]
        assert all(item["id"] != empty_convo.id for item in results)

    def test_conversation_list_exposes_server_timing_breakdown(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        assert self.client.post(send_url, {"text": "Ahoj"}, format="json").status_code == status.HTTP_201_CREATED

        list_url = reverse("accounts:messaging_list_conversations")
        response = self.client.get(list_url)

        assert response.status_code == status.HTTP_200_OK
        server_timing = response.headers.get("Server-Timing", "")
        assert "conversations_db_connect" in server_timing
        assert "conversations_sql" in server_timing
        assert "conversations_sql_count" in server_timing
        assert "conversations_sql_page" in server_timing
        assert "conversations_sql_prefetch_participants" in server_timing
        assert "conversations_sql_prefetch_users" in server_timing
        assert "conversations_serialize" in server_timing
        assert "conversations_total" in server_timing

    @override_settings(
        RATE_LIMITING_ENABLED=True,
        RATE_LIMIT_DISABLED=False,
        RATE_LIMIT_ALLOW_PATHS=[],
        RATE_LIMIT_OVERRIDES={
            "messaging_open": {"max_attempts": 1, "window_minutes": 1, "block_minutes": 1},
        },
    )
    def test_open_conversation_is_rate_limited_after_override_threshold(self):
        self.client.force_authenticate(user=self.u1)
        url = reverse("accounts:messaging_open")

        first = self.client.post(url, {"target_user_id": self.u2.id}, format="json")
        second = self.client.post(url, {"target_user_id": self.u3.id}, format="json")

        assert first.status_code == status.HTTP_200_OK
        assert first.data["is_draft"] is True
        assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert second.json()["code"] == "RATE_LIMITED"

    @override_settings(
        RATE_LIMITING_ENABLED=True,
        RATE_LIMIT_DISABLED=False,
        RATE_LIMIT_ALLOW_PATHS=[],
        RATE_LIMIT_OVERRIDES={
            "messaging_send": {"max_attempts": 1, "window_minutes": 1, "block_minutes": 1},
        },
    )
    def test_send_message_is_rate_limited_after_override_threshold(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u1)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        first = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        second = self.client.post(send_url, {"text": "Znova"}, format="json")

        assert first.status_code == status.HTTP_201_CREATED
        assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert second.json()["code"] == "RATE_LIMITED"

    @override_settings(
        RATE_LIMITING_ENABLED=True,
        RATE_LIMIT_DISABLED=False,
        RATE_LIMIT_ALLOW_PATHS=[],
        RATE_LIMIT_OVERRIDES={
            "messaging_mark_read": {"max_attempts": 1, "window_minutes": 1, "block_minutes": 1},
        },
    )
    def test_mark_read_is_rate_limited_after_override_threshold(self):
        convo = self._create_direct_conversation(actor=self.u1, target=self.u2)

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo.id})
        assert self.client.post(send_url, {"text": "Ahoj"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        read_url = reverse("accounts:messaging_mark_read", kwargs={"conversation_id": convo.id})
        first = self.client.post(read_url, {}, format="json")
        second = self.client.post(read_url, {}, format="json")

        assert first.status_code == status.HTTP_200_OK
        assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert second.json()["code"] == "RATE_LIMITED"
