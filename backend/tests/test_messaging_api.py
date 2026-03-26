import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from messaging.models import Conversation, ConversationParticipant, Message


User = get_user_model()


@pytest.mark.django_db
class TestMessagingApi(APITestCase):
    def setUp(self):
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

