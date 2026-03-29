import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from messaging.models import Conversation, ConversationParticipant, Message


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

    def test_open_conversation_is_idempotent(self):
        self.client.force_authenticate(user=self.u1)
        url = reverse("accounts:messaging_open")

        r1 = self.client.post(url, {"target_user_id": self.u2.id}, format="json")
        assert r1.status_code == status.HTTP_200_OK
        assert r1.data.get("created") is True
        convo_id = r1.data.get("id")
        assert convo_id is not None

        r2 = self.client.post(url, {"target_user_id": self.u2.id}, format="json")
        assert r2.status_code == status.HTTP_200_OK
        assert r2.data.get("created") is False
        assert r2.data.get("id") == convo_id

        assert Conversation.objects.count() == 1
        assert ConversationParticipant.objects.count() == 2

    def test_non_participant_cannot_read_messages(self):
        self.client.force_authenticate(user=self.u1)
        open_url = reverse("accounts:messaging_open")
        r = self.client.post(open_url, {"target_user_id": self.u2.id}, format="json")
        convo_id = int(r.data["id"])

        self.client.force_authenticate(user=self.u3)
        list_url = reverse("accounts:messaging_list_messages", kwargs={"conversation_id": convo_id})
        r2 = self.client.get(list_url)
        assert r2.status_code == status.HTTP_404_NOT_FOUND

    def test_non_participant_cannot_send_message(self):
        self.client.force_authenticate(user=self.u1)
        open_url = reverse("accounts:messaging_open")
        r = self.client.post(open_url, {"target_user_id": self.u2.id}, format="json")
        convo_id = int(r.data["id"])

        self.client.force_authenticate(user=self.u3)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo_id})
        r2 = self.client.post(send_url, {"text": "hi"}, format="json")
        assert r2.status_code == status.HTTP_404_NOT_FOUND
        assert Message.objects.count() == 0

    def test_mark_read_updates_last_read_at(self):
        self.client.force_authenticate(user=self.u1)
        open_url = reverse("accounts:messaging_open")
        r = self.client.post(open_url, {"target_user_id": self.u2.id}, format="json")
        convo_id = int(r.data["id"])

        # u2 sends a message
        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo_id})
        r2 = self.client.post(send_url, {"text": "Ahoj"}, format="json")
        assert r2.status_code == status.HTTP_201_CREATED

        # u1 marks as read
        self.client.force_authenticate(user=self.u1)
        read_url = reverse("accounts:messaging_mark_read", kwargs={"conversation_id": convo_id})
        r3 = self.client.post(read_url, {}, format="json")
        assert r3.status_code == status.HTTP_200_OK

        participant = ConversationParticipant.objects.get(conversation_id=convo_id, user=self.u1)
        assert participant.last_read_at is not None

    def test_conversation_list_exposes_server_timing_breakdown(self):
        self.client.force_authenticate(user=self.u1)
        open_url = reverse("accounts:messaging_open")
        opened = self.client.post(open_url, {"target_user_id": self.u2.id}, format="json")
        convo_id = int(opened.data["id"])

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo_id})
        assert self.client.post(send_url, {"text": "Ahoj"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
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
        self.client.force_authenticate(user=self.u1)
        open_url = reverse("accounts:messaging_open")
        opened = self.client.post(open_url, {"target_user_id": self.u2.id}, format="json")
        convo_id = int(opened.data["id"])

        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo_id})
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
        self.client.force_authenticate(user=self.u1)
        open_url = reverse("accounts:messaging_open")
        opened = self.client.post(open_url, {"target_user_id": self.u2.id}, format="json")
        convo_id = int(opened.data["id"])

        self.client.force_authenticate(user=self.u2)
        send_url = reverse("accounts:messaging_send_message", kwargs={"conversation_id": convo_id})
        assert self.client.post(send_url, {"text": "Ahoj"}, format="json").status_code == status.HTTP_201_CREATED

        self.client.force_authenticate(user=self.u1)
        read_url = reverse("accounts:messaging_mark_read", kwargs={"conversation_id": convo_id})
        first = self.client.post(read_url, {}, format="json")
        second = self.client.post(read_url, {}, format="json")

        assert first.status_code == status.HTTP_200_OK
        assert second.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert second.json()["code"] == "RATE_LIMITED"

