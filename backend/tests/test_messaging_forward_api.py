from io import BytesIO
import shutil
import tempfile
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from messaging.models import Conversation, Message
from messaging.services.conversations import open_or_create_direct_conversation


User = get_user_model()


@pytest.mark.django_db
class TestMessagingForwardApi(APITestCase):
    def setUp(self):
        cache.clear()
        self.temp_media_root = tempfile.mkdtemp()
        self.media_override = override_settings(
            MEDIA_ROOT=self.temp_media_root,
            SAFESEARCH_ENABLED=False,
        )
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.addCleanup(lambda: shutil.rmtree(self.temp_media_root, ignore_errors=True))
        self.push_delay_patcher = patch(
            "messaging.services.push_enqueue.deliver_message_push_task.delay",
            return_value=None,
        )
        self.push_delay_patcher.start()
        self.addCleanup(self.push_delay_patcher.stop)
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

    def _sample_image_upload(self, name: str = "chat.png") -> SimpleUploadedFile:
        buffer = BytesIO()
        Image.new("RGB", (2, 2), (255, 0, 0)).save(buffer, format="PNG")
        return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")

    def _send_source_message(self, source_convo: Conversation, payload, *, format="json"):
        self.client.force_authenticate(user=self.u1)
        return self.client.post(
            reverse(
                "accounts:messaging_send_message",
                kwargs={"conversation_id": source_convo.id},
            ),
            payload,
            format=format,
        )

    def _forward_url(self, source_convo: Conversation, message_id: int) -> str:
        return reverse(
            "accounts:messaging_forward_message",
            kwargs={"conversation_id": source_convo.id, "message_id": message_id},
        )

    def test_forward_text_message_to_existing_and_new_direct_recipients(self):
        source_convo = self._create_direct_conversation(actor=self.u1, target=self.u2)
        source_response = self._send_source_message(source_convo, {"text": "Ahoj dalej"})
        assert source_response.status_code == status.HTTP_201_CREATED

        with patch("messaging.api.forward_views.notify_user") as notify_user_mock:
            forward_response = self.client.post(
                self._forward_url(source_convo, source_response.data["id"]),
                {"recipient_user_ids": [self.u2.id, self.u3.id]},
                format="json",
            )

        assert forward_response.status_code == status.HTTP_200_OK
        assert forward_response.data["failed"] == []
        assert [item["user_id"] for item in forward_response.data["sent"]] == [
            self.u2.id,
            self.u3.id,
        ]
        assert Message.objects.filter(text="Ahoj dalej").count() == 3

        new_conversation = Conversation.objects.get(
            requested_by=self.u1,
            requested_to=self.u3,
        )
        assert new_conversation.request_status == Conversation.RequestStatus.PENDING
        notified_user_ids = [call.args[0] for call in notify_user_mock.call_args_list]
        assert notified_user_ids == [self.u2.id, self.u3.id]

    def test_forward_image_message_copies_attachment(self):
        source_convo = self._create_direct_conversation(actor=self.u1, target=self.u2)
        source_response = self._send_source_message(
            source_convo,
            {"image": self._sample_image_upload("source.png")},
            format="multipart",
        )
        assert source_response.status_code == status.HTTP_201_CREATED
        source_message = Message.objects.get(id=source_response.data["id"])

        forward_response = self.client.post(
            self._forward_url(source_convo, source_message.id),
            {"recipient_user_ids": [self.u3.id]},
            format="json",
        )

        assert forward_response.status_code == status.HTTP_200_OK
        assert forward_response.data["failed"] == []
        forwarded_message = Message.objects.get(
            id=forward_response.data["sent"][0]["message"]["id"],
        )
        assert bool(forwarded_message.image) is True
        assert bool(forwarded_message.image_thumbnail) is True
        assert forwarded_message.image.name != source_message.image.name
        assert forwarded_message.image_thumbnail.name != source_message.image_thumbnail.name

    def test_forward_message_respects_pending_request_limit(self):
        source_convo = self._create_direct_conversation(actor=self.u1, target=self.u2)
        source_response = self._send_source_message(source_convo, {"text": "Zdroj"})
        assert source_response.status_code == status.HTTP_201_CREATED

        first = self.client.post(
            reverse("accounts:messaging_send_direct_message"),
            {"target_user_id": self.u3.id, "text": "Prva"},
            format="json",
        )
        assert first.status_code == status.HTTP_201_CREATED
        second = self.client.post(
            reverse(
                "accounts:messaging_send_message",
                kwargs={"conversation_id": first.data["conversation_id"]},
            ),
            {"text": "Druha"},
            format="json",
        )
        assert second.status_code == status.HTTP_201_CREATED

        forward_response = self.client.post(
            self._forward_url(source_convo, source_response.data["id"]),
            {"recipient_user_ids": [self.u3.id]},
            format="json",
        )

        assert forward_response.status_code == status.HTTP_200_OK
        assert forward_response.data["sent"] == []
        assert forward_response.data["failed"] == [
            {"user_id": self.u3.id, "code": "message_request_pending"}
        ]
        assert Message.objects.filter(
            conversation_id=first.data["conversation_id"],
            sender=self.u1,
            message_type=Message.Type.USER,
        ).count() == 2

    def test_forward_deleted_message_returns_not_found(self):
        source_convo = self._create_direct_conversation(actor=self.u1, target=self.u2)
        message = Message.objects.create(
            conversation=source_convo,
            sender=self.u1,
            text="Zmazane",
            is_deleted=True,
        )

        self.client.force_authenticate(user=self.u1)
        response = self.client.post(
            self._forward_url(source_convo, message.id),
            {"recipient_user_ids": [self.u3.id]},
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
