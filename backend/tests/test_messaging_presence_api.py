import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from messaging.models import Conversation, ConversationParticipant
from messaging.services.presence import get_message_presence_for_users

User = get_user_model()


@pytest.mark.django_db
class TestMessagingPresenceApi(APITestCase):
    def setUp(self):
        cache.clear()
        self.u1 = User.objects.create_user(
            username="presence-u1",
            email="presence-u1@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
        )
        self.u2 = User.objects.create_user(
            username="presence-u2",
            email="presence-u2@example.com",
            password="StrongPass123",
            is_verified=True,
            is_active=True,
        )
        self.conversation = Conversation.objects.create(created_by=self.u1)
        ConversationParticipant.objects.create(
            conversation=self.conversation,
            user=self.u1,
        )
        ConversationParticipant.objects.create(
            conversation=self.conversation,
            user=self.u2,
        )
        self.url = reverse("accounts:messaging_presence")

    def tearDown(self):
        cache.clear()

    def test_presence_heartbeat_stores_visible_active_conversation(self):
        self.client.force_authenticate(user=self.u1)

        response = self.client.post(
            self.url,
            {
                "visible": True,
                "active_conversation_id": self.conversation.id,
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["ok"] is True
        presence = get_message_presence_for_users(user_ids=[self.u1.id])[self.u1.id]
        assert presence["visible"] is True
        assert presence["active_conversation_id"] == self.conversation.id
        assert isinstance(presence["seen_at"], int)

    def test_presence_heartbeat_clears_active_conversation_when_hidden(self):
        self.client.force_authenticate(user=self.u1)

        response = self.client.post(
            self.url,
            {
                "visible": False,
                "active_conversation_id": self.conversation.id,
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        presence = get_message_presence_for_users(user_ids=[self.u1.id])[self.u1.id]
        assert presence["visible"] is False
        assert presence["active_conversation_id"] is None

    def test_presence_heartbeat_rejects_foreign_conversation(self):
        foreign_conversation = Conversation.objects.create(created_by=self.u2)
        ConversationParticipant.objects.create(
            conversation=foreign_conversation,
            user=self.u2,
        )

        self.client.force_authenticate(user=self.u1)
        response = self.client.post(
            self.url,
            {
                "visible": True,
                "active_conversation_id": foreign_conversation.id,
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert get_message_presence_for_users(user_ids=[self.u1.id]) == {}
