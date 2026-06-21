"""
GDPR – v messagingu sa anonymizovaný (zmazaný) používateľ serializuje s
is_deleted=True a prázdnym menom/slugom/avatarom, takže ho frontend zobrazí ako
preložené "Zmazaný používateľ" (v zozname aj v hlavičke detailu) a neodkazuje
na neexistujúci profil.
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.account_deletion import anonymize_user
from messaging.services.conversations import open_or_create_direct_conversation

User = get_user_model()


@pytest.mark.django_db
@override_settings(SAFESEARCH_ENABLED=False)
class TestDeletedPeerSerialization(APITestCase):
    def setUp(self):
        cache.clear()
        self.me = User.objects.create_user(
            username="me", email="me@example.com", password="StrongPass123",
            is_verified=True, is_active=True,
        )
        self.peer = User.objects.create_user(
            username="peer", email="peer@example.com", password="StrongPass123",
            first_name="Peter", last_name="Pan", is_verified=True, is_active=True,
        )
        self.conversation = open_or_create_direct_conversation(
            actor=self.me, target=self.peer
        ).conversation

    def tearDown(self):
        cache.clear()

    def _results(self, response):
        return response.data.get("results", response.data)

    def _send(self, sender, text):
        self.client.force_authenticate(user=sender)
        url = reverse(
            "accounts:messaging_send_message",
            kwargs={"conversation_id": self.conversation.id},
        )
        return self.client.post(url, {"text": text}, format="json")

    def test_conversation_list_marks_deleted_peer(self):
        self._send(self.me, "ahoj")
        anonymize_user(self.peer)

        self.client.force_authenticate(user=self.me)
        resp = self.client.get(reverse("accounts:messaging_list_conversations"))
        rows = self._results(resp)
        row = next(r for r in rows if r["id"] == self.conversation.id)
        other = row["other_user"]
        assert other["is_deleted"] is True
        assert other["display_name"] == ""
        assert other["slug"] is None
        assert other["avatar_url"] is None

    def test_live_peer_not_marked_deleted(self):
        self._send(self.me, "ahoj")

        self.client.force_authenticate(user=self.me)
        resp = self.client.get(reverse("accounts:messaging_list_conversations"))
        row = next(r for r in self._results(resp) if r["id"] == self.conversation.id)
        other = row["other_user"]
        assert other.get("is_deleted") is False
        assert other["display_name"] == "Peter Pan"

    def test_message_sender_marked_deleted(self):
        self._send(self.peer, "sprava od peera")
        anonymize_user(self.peer)

        self.client.force_authenticate(user=self.me)
        url = reverse(
            "accounts:messaging_list_messages",
            kwargs={"conversation_id": self.conversation.id},
        )
        resp = self.client.get(url)
        messages = self._results(resp)
        peer_msg = next(m for m in messages if m["text"] == "sprava od peera")
        assert peer_msg["sender"]["is_deleted"] is True
        assert peer_msg["sender"]["display_name"] == ""
